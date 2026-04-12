// packages/frontend/src/pages/ManualPage.jsx
import { useState, useEffect } from 'react';
import { useWs }  from '../context/WsContext';
import { ActuatorCard, SectionHeader, Spinner, ErrorBanner } from '../components/ui/index.jsx';
import api from '../api/api';
import { PELTIER_COOLDOWN_MS } from '../utils/constants';

const ACTUATORS = [
  { key: 'pump1',       icon: '💧', name: 'Pump 1',        desc: 'Submersible · Plant 1' },
  { key: 'pump2',       icon: '💧', name: 'Pump 2',        desc: 'Submersible · Plant 2' },
  { key: 'peristaltic', icon: '🧪', name: 'Peristaltic',   desc: 'NPK Solution Pump' },
  { key: 'peltier',     icon: '❄',  name: 'Peltier',       desc: 'Thermoelectric Cooling' },
  { key: 'peltierFan',  icon: '🌀', name: 'Peltier Fan',   desc: 'Heatsink cooling fan' },
  { key: 'intakeFan',   icon: '🌀', name: 'Intake Fan',    desc: '12V · Humidity control' },
  { key: 'exhaustFan',  icon: '💨', name: 'Exhaust Fan',   desc: '12V · Humidity control' },
  { key: 'mister',      icon: '🌫', name: 'Mister',        desc: '5V · Increases humidity' },
];

export default function ManualPage() {
  const { actuatorState: wsState } = useWs();

  const [state,    setState]    = useState({});
  const [loading,  setLoading]  = useState(true);
  const [toggling, setToggling] = useState('');  // key of the actuator being toggled
  const [err,      setErr]      = useState('');
  const [autoOn,   setAutoOn]   = useState(false);
  const [peltierCooldown, setPeltierCooldown] = useState(0); // seconds remaining

  // ── Fetch current actuator state ─────────────────────────────────
  useEffect(() => {
    Promise.all([
      api.get('/actuators'),
      api.get('/automation'),
    ]).then(([actRes, autoRes]) => {
      setState(actRes.data);
      setAutoOn(autoRes.data.automationEnabled);
      updateCooldown(actRes.data.peltierLastOffAt);
    }).catch(() => setErr('Failed to load actuator state'))
      .finally(() => setLoading(false));
  }, []);

  // ── Merge live WebSocket updates into local state ─────────────────
  useEffect(() => {
    if (wsState && Object.keys(wsState).length) {
      setState(prev => ({ ...prev, ...wsState }));
    }
  }, [wsState]);

  // ── Peltier cooldown countdown ────────────────────────────────────
  function updateCooldown(lastOffAt) {
    if (!lastOffAt) { setPeltierCooldown(0); return; }
    const elapsed  = Date.now() - new Date(lastOffAt).getTime();
    const remaining = Math.max(0, Math.ceil((PELTIER_COOLDOWN_MS - elapsed) / 1000));
    setPeltierCooldown(remaining);
    if (remaining > 0) {
      const t = setInterval(() => {
        setPeltierCooldown(r => { if (r <= 1) { clearInterval(t); return 0; } return r - 1; });
      }, 1000);
    }
  }

  // ── Toggle an actuator ────────────────────────────────────────────
  async function toggle(key) {
    if (autoOn) { setErr('Disable automation mode before using manual controls'); return; }
    setToggling(key); setErr('');
    try {
      const { data } = await api.post(`/actuators/${key}`, { on: !state[key] });
      setState(s => ({ ...s, ...data }));
    } catch (e) {
      const msg = e.response?.data?.error || 'Toggle failed';
      setErr(msg);
      // If Peltier cooldown error, update the cooldown counter
      if (e.response?.data?.cooldownRemaining) {
        setPeltierCooldown(e.response.data.cooldownRemaining);
      }
    } finally { setToggling(''); }
  }

  // ── All off ───────────────────────────────────────────────────────
  async function allOff() {
    setErr('');
    try {
      await api.post('/actuators/all-off');
      setState(s => {
        const off = {};
        Object.keys(s).forEach(k => { if (typeof s[k] === 'boolean') off[k] = false; });
        return { ...s, ...off };
      });
    } catch (e) { setErr(e.response?.data?.error || 'All-off failed'); }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      {autoOn && (
        <div className="notif-banner warn mb-2">
          ⚙ Automation is ON. Disable it on the Automation page to access manual controls.
        </div>
      )}
      {!autoOn && (
        <div className="notif-banner error mb-2">
          🔴 Manual mode active — All actuators auto-off when automation is re-enabled.
        </div>
      )}

      <ErrorBanner message={err} onDismiss={() => setErr('')} />

      <SectionHeader
        title="Actuator Controls"
        action="⚡ All Off"
        onAction={allOff}
        actionStyle={{ borderColor: 'rgba(255,77,106,.3)', color: 'var(--bc-danger)', background: 'rgba(255,77,106,.08)' }}
      />

      <div className="grid-auto">
        {ACTUATORS.map(a => {
          const isPeltier = a.key === 'peltier';
          const locked    = isPeltier && peltierCooldown > 0;
          const lockMsg   = locked ? `${Math.floor(peltierCooldown/60)}m ${peltierCooldown%60}s cooldown` : '';

          return (
            <ActuatorCard
              key={a.key}
              icon={a.icon}
              name={a.name}
              desc={a.desc}
              on={!!state[a.key]}
              locked={locked}
              lockMsg={lockMsg}
              loading={toggling === a.key}
              onToggle={() => toggle(a.key)}
            />
          );
        })}
      </div>
    </div>
  );
}

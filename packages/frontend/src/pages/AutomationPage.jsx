// packages/frontend/src/pages/AutomationPage.jsx
// v1.1 — adds draggable priority order UI, logged on save.
import { useState, useEffect, useRef } from 'react';
import { Toggle, SectionHeader, Spinner, ErrorBanner } from '../components/ui/index.jsx';
import api from '../api/api';
import { TARGET_BOUNDS, VALID_PRIORITY_ITEMS, PRIORITY_LABELS } from '../utils/constants';

const PARAMS = [
  { key: 'temperature',   icon: '🌡', label: 'Temperature',    unit: '°C',  desc: 'Peltier activates when above target' },
  { key: 'humidity',      icon: '🌫', label: 'Humidity',       unit: '%',   desc: 'Fans activate when above target' },
  { key: 'soilMoisture1', icon: '💧', label: 'Soil Moisture 1',unit: '%',   desc: 'Pump 1 activates when below target' },
  { key: 'soilMoisture2', icon: '💧', label: 'Soil Moisture 2',unit: '%',   desc: 'Pump 2 activates when below target' },
  { key: 'nitrogen',      icon: '🧪', label: 'Nitrogen (N)',   unit: 'ppm', desc: 'Peristaltic pump for NPK solution' },
  { key: 'phosphorus',    icon: '🧪', label: 'Phosphorus (P)', unit: 'ppm', desc: 'Peristaltic pump for NPK solution' },
  { key: 'potassium',     icon: '🧪', label: 'Potassium (K)',  unit: 'ppm', desc: 'Peristaltic pump for NPK solution' },
];

// ── DragSortList — drag-and-drop priority reordering ─────────────────
function DragSortList({ order, onChange }) {
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  function handleDragStart(i) { dragItem.current = i; }
  function handleDragEnter(i) { dragOver.current = i; }

  function handleDragEnd() {
    const next = [...order];
    const dragged = next.splice(dragItem.current, 1)[0];
    next.splice(dragOver.current, 0, dragged);
    dragItem.current = null;
    dragOver.current = null;
    onChange(next);
  }

  // Touch support for mobile
  const touchStart = useRef(null);
  function handleTouchStart(e, i) {
    touchStart.current = i;
    dragItem.current = i;
  }
  function handleTouchEnd(e, i) {
    if (dragItem.current !== null && dragItem.current !== i) {
      const next = [...order];
      const dragged = next.splice(dragItem.current, 1)[0];
      next.splice(i, 0, dragged);
      dragItem.current = null;
      onChange(next);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {order.map((item, i) => (
        <div
          key={item}
          draggable
          onDragStart={() => handleDragStart(i)}
          onDragEnter={() => handleDragEnter(i)}
          onDragEnd={handleDragEnd}
          onDragOver={e => e.preventDefault()}
          onTouchStart={e => handleTouchStart(e, i)}
          onTouchEnd={e => handleTouchEnd(e, i)}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '11px 14px',
            background: 'var(--bc-card2)',
            border: '1px solid var(--bc-border2)',
            borderRadius: 'var(--bc-radius, 8px)',
            cursor: 'grab', userSelect: 'none',
            transition: 'background .15s, box-shadow .15s',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 0 0 2px var(--bc-accent3)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          {/* Drag handle */}
          <span style={{ color: 'var(--bc-text3)', fontSize: 16, lineHeight: 1 }}>⠿</span>
          {/* Priority number badge */}
          <div style={{
            width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
            background: 'var(--bc-dim)', border: '1px solid var(--bc-accent3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-accent)',
          }}>
            {i + 1}
          </div>
          <span style={{ fontSize: 18 }}>{PRIORITY_LABELS[item]?.icon || '⚙'}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{PRIORITY_LABELS[item]?.label || item}</div>
            <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-text3)', marginTop: 1 }}>
              {PRIORITY_LABELS[item]?.desc || ''}
            </div>
          </div>
          <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', letterSpacing: 1 }}>
            DRAG
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AutomationPage() {
  const [settings,     setSettings]     = useState(null);
  const [targets,      setTargets]      = useState({});
  const [enabled,      setEnabled]      = useState({});
  const [autoMode,     setAutoMode]     = useState(true);
  const [priorityOrder,setPriorityOrder]= useState([...VALID_PRIORITY_ITEMS]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [savingPri,    setSavingPri]    = useState(false);
  const [toggling,     setToggling]     = useState(false);
  const [err,          setErr]          = useState('');
  const [saved,        setSaved]        = useState(false);
  const [priSaved,     setPriSaved]     = useState(false);
  const [valErrors,    setValErrors]    = useState({});

  // ── Fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    api.get('/automation')
      .then(({ data }) => {
        setSettings(data);
        setTargets({ ...data.targets });
        setEnabled({ ...data.enabled });
        setAutoMode(data.automationEnabled);
        if (Array.isArray(data.priorityOrder) && data.priorityOrder.length === 4) {
          setPriorityOrder(data.priorityOrder);
        }
      })
      .catch(() => setErr('Failed to load automation settings'))
      .finally(() => setLoading(false));
  }, []);

  // ── Target validation ────────────────────────────────────────────
  function validateTarget(key, val) {
    const raw    = parseFloat(val);
    const bounds = TARGET_BOUNDS[key];
    if (isNaN(raw))                                         return 'Must be a number';
    if (bounds && (raw < bounds.min || raw > bounds.max))   return `Must be ${bounds.min}–${bounds.max}`;
    return '';
  }
  function handleTargetChange(key, val) {
    setTargets(t => ({ ...t, [key]: val }));
    setValErrors(e => ({ ...e, [key]: validateTarget(key, val) }));
  }

  // ── Save targets ─────────────────────────────────────────────────
  async function saveAll() {
    const errs = {};
    for (const p of PARAMS) {
      const e = validateTarget(p.key, targets[p.key]);
      if (e) errs[p.key] = e;
    }
    if (Object.keys(errs).length) { setValErrors(errs); return; }
    setSaving(true); setErr('');
    try {
      const numTargets = Object.fromEntries(
        Object.entries(targets).map(([k, v]) => [k, parseFloat(v)])
      );
      await api.put('/automation', { targets: numTargets, enabled });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setErr(e.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  }

  // ── Save priority order ──────────────────────────────────────────
  async function savePriority() {
    setSavingPri(true); setErr('');
    try {
      await api.put('/automation/priority', { priorityOrder });
      setPriSaved(true);
      setTimeout(() => setPriSaved(false), 2500);
    } catch (e) {
      setErr(e.response?.data?.error || 'Failed to save priority order');
    } finally { setSavingPri(false); }
  }

  // ── Toggle automation mode ────────────────────────────────────────
  async function toggleMode() {
    setToggling(true); setErr('');
    try {
      const { data } = await api.post('/automation/mode', { enabled: !autoMode });
      setAutoMode(data.automationEnabled);
    } catch (e) {
      setErr(e.response?.data?.error || 'Mode change failed');
    } finally { setToggling(false); }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <ErrorBanner message={err} onDismiss={() => setErr('')} />
      {saved    && <div className="notif-banner ok mb-2">✓ Target values saved</div>}
      {priSaved && <div className="notif-banner ok mb-2">✓ Priority order saved & sent to Arduino</div>}

      {/* ── Mode toggle ───────────────────────────────────────────── */}
      <div className="card mb-2" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div className="card-title" style={{ marginBottom: 4 }}>Automation Mode</div>
          <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 'clamp(9px,1.2vw,11px)', color: 'var(--bc-text2)' }}>
            {autoMode
              ? 'Arduino is maintaining all targets automatically. Disable to use manual control.'
              : '⚠ Automation OFF — manual mode active. All actuators stop when re-enabled.'}
          </div>
        </div>
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <Toggle on={autoMode} onChange={toggleMode} disabled={toggling} />
          <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: autoMode ? 'var(--bc-accent)' : 'var(--bc-text3)', marginTop: 5, letterSpacing: 1 }}>
            {toggling ? '…' : autoMode ? 'ENABLED' : 'DISABLED'}
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ gap: 16, alignItems: 'start' }}>

        {/* ── Left: Target values ──────────────────────────────────── */}
        <div>
          <SectionHeader title="Target Values" action={saving ? '…' : '💾 Save All'} onAction={saveAll} />
          <div className="card">
            {PARAMS.map((p, idx) => {
              const bounds = TARGET_BOUNDS[p.key];
              return (
                <div key={p.key} style={{
                  display: 'flex', alignItems: 'center',
                  padding: '12px 0',
                  borderBottom: idx < PARAMS.length - 1 ? '1px solid var(--bc-border)' : 'none',
                  gap: 10, flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{p.icon}</span>
                  <div style={{ flex: 1, minWidth: 100 }}>
                    <div style={{ fontSize: 'clamp(11px,1.4vw,13px)', fontWeight: 700 }}>{p.label}</div>
                    <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 'clamp(8px,1.1vw,10px)', color: 'var(--bc-text3)' }}>{p.desc}</div>
                    {valErrors[p.key] && (
                      <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-danger)', marginTop: 2 }}>
                        {valErrors[p.key]}
                      </div>
                    )}
                  </div>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <input
                      className="input"
                      type="number"
                      value={targets[p.key] ?? ''}
                      onChange={e => handleTargetChange(p.key, e.target.value)}
                      min={bounds?.min} max={bounds?.max}
                      step={p.unit === '°C' ? 0.5 : 1}
                      style={{
                        width: 80, textAlign: 'center',
                        borderColor: valErrors[p.key] ? 'var(--bc-danger)' : undefined,
                        paddingRight: 28,
                      }}
                    />
                    <span style={{
                      fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)',
                      position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                      pointerEvents: 'none',
                    }}>
                      {p.unit}
                    </span>
                  </div>
                  <Toggle
                    on={!!enabled[p.key]}
                    onChange={v => setEnabled(e => ({ ...e, [p.key]: v }))}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: Priority order ────────────────────────────────── */}
        <div>
          <SectionHeader
            title="Automation Priority Order"
            action={savingPri ? '…' : '💾 Save Order'}
            onAction={savePriority}
          />
          <div className="card" style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 'clamp(8px,1.1vw,10px)', color: 'var(--bc-text3)', marginBottom: 14, lineHeight: 1.6 }}>
              Drag items to reorder. The Arduino will address the top item first when multiple conditions need correcting simultaneously.
            </div>
            <DragSortList order={priorityOrder} onChange={setPriorityOrder} />
          </div>

          {/* NPK failsafe info card */}
          <div className="card">
            <div className="card-title">NPK Imbalance Failsafe</div>
            <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 'clamp(9px,1.1vw,10px)', color: 'var(--bc-text2)', lineHeight: 1.7 }}>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--bc-accent)' }}>● Threshold tracking</span> — Each nutrient (N, P, K) is tracked independently. When one reaches its target, it is logged.
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ color: 'var(--bc-warn)' }}>● Imbalance alert</span> — If one nutrient has been at its target for 5+ minutes while another is still below, a warning is sent. Check your reservoir solution ratio.
              </div>
              <div>
                <span style={{ color: 'var(--bc-danger)' }}>● Overdose alert</span> — If any nutrient exceeds its target by more than 20% for 5 consecutive readings, a notification is sent.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

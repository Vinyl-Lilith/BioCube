// packages/frontend/src/pages/DashboardPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useWs }  from '../context/WsContext';
import { SensorCard, SectionHeader, Spinner, ErrorBanner } from '../components/ui/index.jsx';
import SensorChart from '../components/charts/SensorChart';
import api from '../api/api';

export default function DashboardPage() {
  const { sensors, actuatorState, connected, piOnline } = useWs();

  const [exportFrom,  setExportFrom]  = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); });
  const [exportTo,    setExportTo]    = useState(() => new Date().toISOString().slice(0,10));
  const [exporting,   setExporting]   = useState('');  // 'excel'|'chart'|''
  const [exportErr,   setExportErr]   = useState('');
  const [chartData,   setChartData]   = useState([]);
  const [chartLoading,setChartLoading]= useState(false);
  const [chartType,   setChartType]   = useState('line'); // 'line' | 'bar'
  const [camEnlarged, setCamEnlarged] = useState(false);
  const imgRef = useRef(null);
  const videoRef = useRef(null);

  // ── Snap a photo from the live feed ──────────────────────────────
  function snapPhoto() {
    const img = imgRef.current;
    if (!img) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width  = img.naturalWidth  || img.width  || 640;
      canvas.height = img.naturalHeight || img.height || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const link = document.createElement('a');
      link.download = `biocube_snap_${new Date().toISOString().replace(/[:.]/g,'-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (_) {
      // Fallback: open the stream URL in a new tab for saving
      window.open(img.src, '_blank');
    }
  }

  // ── Derive trends from last 2 readings (we track previous) ──────────
  const [prevSensors, setPrevSensors] = useState(null);
  useEffect(() => {
    if (sensors) setPrevSensors(prev => prev !== sensors ? prev : null);
  }, [sensors]);

  function trend(key) {
    if (!sensors || !prevSensors) return 'ok';
    const diff = sensors[key] - prevSensors[key];
    if (diff >  0.3) return 'up';
    if (diff < -0.3) return 'down';
    return 'ok';
  }

  // ── Load chart data whenever date range changes ───────────────────
  useEffect(() => {
    loadChartData();
  }, [exportFrom, exportTo]);

  async function loadChartData() {
    if (!exportFrom || !exportTo) return;
    setChartLoading(true);
    try {
      const { data } = await api.get(`/sensors/export/chart?from=${exportFrom}&to=${exportTo}`);
      setChartData(data);
    } catch { setChartData([]); }
    finally { setChartLoading(false); }
  }

  // ── Excel download ─────────────────────────────────────────────────
  async function downloadExcel() {
    if (!exportFrom || !exportTo) { setExportErr('Select a date range'); return; }
    setExporting('excel'); setExportErr('');
    try {
      const res = await api.get(`/sensors/export/excel?from=${exportFrom}&to=${exportTo}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a'); a.href = url;
      a.download = `biocube_${exportFrom}_to_${exportTo}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setExportErr(e.response?.data?.error || 'Export failed'); }
    finally { setExporting(''); }
  }

  const S = sensors || {};
  const ss = S.sensorStatus || {};

  return (
    <div>
      {/* ── Sensor health banners ─────────────────────────────────── */}
      {!piOnline  && <div className="notif-banner error">🔴 Raspberry Pi offline — sensor data may be stale</div>}
      {ss.dht22_1 === false && <div className="notif-banner warn">⚠ DHT22 Sensor 1 offline — temperature/humidity may be partial</div>}
      {ss.dht22_2 === false && <div className="notif-banner warn">⚠ DHT22 Sensor 2 offline — temperature/humidity may be partial</div>}
      {ss.soil1   === false && <div className="notif-banner warn">⚠ Soil Moisture Sensor 1 offline</div>}
      {ss.soil2   === false && <div className="notif-banner warn">⚠ Soil Moisture Sensor 2 offline</div>}
      {ss.npk     === false && <div className="notif-banner error">⚠ NPK Sensor offline — NPK values unavailable</div>}
      {!connected           && <div className="notif-banner warn">○ Reconnecting to server…</div>}

      {/* ── Live sensor readings ─────────────────────────────────── */}
      <SectionHeader title="Live Sensor Readings" action="↻ Live" />

      <div className="grid-auto mb-2">
        <SensorCard label="Temperature"    value={S.temperature?.toFixed(1)}    unit="°C" sub="Avg 2× DHT22"  trend={trend('temperature')}    color="green"  offline={ss.dht22_1===false && ss.dht22_2===false} />
        <SensorCard label="Humidity"       value={S.humidity?.toFixed(0)}       unit="%"  sub="Relative humidity" trend={trend('humidity')}    color="amber"  offline={ss.dht22_1===false && ss.dht22_2===false} />
        <SensorCard label="Soil Moisture 1" value={S.soilMoisture1?.toFixed(0)} unit="%"  sub="Plant 1"        trend={trend('soilMoisture1')} color="teal"   offline={ss.soil1===false} />
        <SensorCard label="Soil Moisture 2" value={S.soilMoisture2?.toFixed(0)} unit="%"  sub="Plant 2"        trend={trend('soilMoisture2')} color="blue"   offline={ss.soil2===false} />
      </div>

      {/* ── NPK row ──────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        {[
          { letter: 'N', label: 'Nitrogen',    val: S.nitrogen,    color: 'var(--bc-accent)',    bar: (S.nitrogen||0)/10 },
          { letter: 'P', label: 'Phosphorus',  val: S.phosphorus,  color: 'var(--bc-warn)',      bar: (S.phosphorus||0)/10 },
          { letter: 'K', label: 'Potassium',   val: S.potassium,   color: 'var(--bc-secondary)', bar: (S.potassium||0)/10 },
        ].map(n => (
          <div key={n.letter} className="card" style={{ flex: 1, textAlign: 'center', opacity: ss.npk===false ? .5 : 1 }}>
            <div style={{ fontSize: 30, fontWeight: 800, color: n.color, lineHeight: 1 }}>{n.letter}</div>
            <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', letterSpacing: 1.5, margin: '4px 0' }}>{n.label}</div>
            <div style={{ height: 4, background: 'var(--bc-bg3)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: `${Math.min(100, n.bar)}%`, background: n.color, borderRadius: 2, transition: 'width .4s' }} />
            </div>
            <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 14, color: n.color }}>
              {ss.npk === false ? '—' : (n.val != null ? `${n.val} ppm` : '—')}
            </div>
          </div>
        ))}
      </div>

      {/* ── Webcam + System status ────────────────────────────────── */}
      <div className="grid-2 mb-2">
        {/* Webcam */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ position: 'relative', background: 'var(--bc-bg3)', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'zoom-in' }}
               onDoubleClick={() => setCamEnlarged(true)}>
            {/* Scan line animation */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 2,
              background: 'linear-gradient(90deg, transparent, var(--bc-accent), transparent)',
              animation: 'scanLine 2.5s linear infinite',
            }} />
            <style>{`@keyframes scanLine { 0% { top:0 } 100% { top:100% } }`}</style>
            <img
              ref={imgRef}
              src={import.meta.env.VITE_STREAM_URL || `${import.meta.env.VITE_API_URL}/stream`}
              alt="Greenhouse webcam feed"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', top: 0, left: 0 }}
              onError={e => {
  setTimeout(() => {
    e.target.src = e.target.src; // force reload
  }, 3000); // retry after 3 seconds
}}
              crossOrigin="anonymous"
            />
            <div style={{ fontSize: 40, opacity: .25, position: 'relative', zIndex: 1 }}>📷</div>
            <div style={{ position: 'absolute', bottom: 8, left: 10, fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-accent)', opacity: .7, zIndex: 2 }}>
              CAM_01 · AUTO-ROTATED
            </div>
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-danger)', zIndex: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--bc-danger)', animation: 'pulse 1s infinite' }} />
              LIVE
              <style>{`@keyframes pulse { 0%,100%{opacity:1}50%{opacity:.2} }`}</style>
            </div>
          </div>
          <div style={{ padding: '10px 14px', display: 'flex', gap: 8, borderTop: '1px solid var(--bc-border)', alignItems: 'center' }}>
            <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => setCamEnlarged(true)}>⛶ Enlarge</button>
            <button className="btn" style={{ fontSize: 11, padding: '5px 12px' }} onClick={snapPhoto}>📸 Snap</button>
            <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', marginLeft: 'auto' }}>Double-click to fullscreen</span>
          </div>
        </div>

        {/* System status */}
        <div className="card">
          <div className="card-title">System Status</div>
          {[
            { icon: '❄', label: 'Peltier Cooling', key: 'peltier' },
            { icon: '💧', label: 'Pump 1',          key: 'pump1' },
            { icon: '💧', label: 'Pump 2',          key: 'pump2' },
            { icon: '🌀', label: 'Intake Fan',       key: 'intakeFan' },
            { icon: '💨', label: 'Exhaust Fan',      key: 'exhaustFan' },
            { icon: '🌫', label: 'Mister',           key: 'mister' },
          ].map(r => (
            <div key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--bc-border)' }}>
              <span style={{ fontSize: 14 }}>{r.icon}</span>
              <span style={{ flex: 1, fontSize: 12 }}>{r.label}</span>
              <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: actuatorState[r.key] ? 'var(--bc-accent)' : 'var(--bc-text3)' }}>
                {actuatorState[r.key] ? '● ACTIVE' : '○ IDLE'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Data export + Chart ───────────────────────────────────── */}
      <div className="card mb-2">
        <div className="card-title">Data Export & Chart</div>
        <ErrorBanner message={exportErr} onDismiss={() => setExportErr('')} />

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-text3)' }}>From:</span>
          <input type="date" className="input" value={exportFrom} onChange={e => setExportFrom(e.target.value)} style={{ width: 150 }} />
          <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-text3)' }}>To:</span>
          <input type="date" className="input" value={exportTo}   onChange={e => setExportTo(e.target.value)}   style={{ width: 150 }} />
          <button className="btn btn-primary" onClick={downloadExcel} disabled={exporting === 'excel'} style={{ fontSize: 11, padding: '6px 14px' }}>
            {exporting === 'excel' ? '…' : '📊 Excel'}
          </button>
        </div>

        {/* Chart type selector */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          {['line','bar'].map(t => (
            <button key={t} className={`btn ${chartType===t?'btn-primary':''}`} onClick={() => setChartType(t)} style={{ fontSize: 11, padding: '4px 12px' }}>
              {t === 'line' ? '📈 Line' : '📉 Bar'}
            </button>
          ))}
        </div>

        {chartLoading ? <Spinner /> : <SensorChart data={chartData} type={chartType} />}
      </div>

      {/* ── Enlarged webcam overlay ───────────────────────────────── */}
      {camEnlarged && (
        <div
          onClick={() => setCamEnlarged(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, cursor: 'zoom-out',
          }}
        >
          <img
            ref={imgRef}
            src={import.meta.env.VITE_STREAM_URL || `${import.meta.env.VITE_API_URL}/stream`}
            alt="Webcam fullscreen"
            crossOrigin="anonymous"
            style={{ maxWidth: '90vw', maxHeight: '80vh', borderRadius: 8, display: 'block' }}
            onError={e => {
  setTimeout(() => {
    e.target.src = e.target.src; // force reload
  }, 3000); // retry after 3 seconds
}}
          />
          <div
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', gap: 12, marginTop: 16 }}
          >
            <button
              className="btn btn-primary"
              onClick={snapPhoto}
              style={{ fontSize: 13, padding: '8px 20px' }}
            >
              📸 Snap Photo
            </button>
            <button
              className="btn"
              onClick={() => setCamEnlarged(false)}
              style={{ fontSize: 13, padding: '8px 20px' }}
            >
              ✕ Close
            </button>
          </div>
          <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'rgba(255,255,255,.3)', marginTop: 10 }}>
            Click outside to close
          </div>
        </div>
      )}
    </div>
  );
}

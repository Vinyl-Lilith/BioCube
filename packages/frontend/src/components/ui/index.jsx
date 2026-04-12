// packages/frontend/src/components/ui/index.jsx
// Small, pure-UI components reused across all pages.

/* ── Toggle ─────────────────────────────────────────────────────────── */
export function Toggle({ on, onChange, disabled }) {
  return (
    <button
      className={`toggle ${on ? '' : 'off'}`}
      onClick={() => !disabled && onChange(!on)}
      disabled={disabled}
      aria-pressed={on}
      title={on ? 'ON — click to disable' : 'OFF — click to enable'}
    />
  );
}

/* ── SensorCard ──────────────────────────────────────────────────────── */
export function SensorCard({ label, value, unit, sub, trend, color = 'green', offline }) {
  const colorClass = { green: '', amber: 'amber', teal: 'teal', blue: 'blue' }[color] || '';
  const trendClass = { up: 'trend-up', down: 'trend-down', ok: 'trend-ok' }[trend] || 'trend-ok';

  return (
    <div className={`sensor-card ${colorClass}`} style={{ opacity: offline ? 0.5 : 1 }}>
      <div className="sensor-label">{label}</div>
      {offline ? (
        <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 12, color: 'var(--bc-danger)', marginTop: 6 }}>
          ⚠ Sensor Offline
        </div>
      ) : (
        <>
          <div className="sensor-value">
            {value ?? '—'} <span className="sensor-unit">{unit}</span>
          </div>
          {sub  && <div className="sensor-sub">{sub}</div>}
          {trend && <span className={`sensor-trend ${trendClass}`}>{trend === 'up' ? '▲ Rising' : trend === 'down' ? '▼ Falling' : '● Stable'}</span>}
        </>
      )}
    </div>
  );
}

/* ── SectionHeader ────────────────────────────────────────────────────── */
export function SectionHeader({ title, action, onAction, actionStyle }) {
  return (
    <div className="section-head">
      <h2>{title}</h2>
      {action && (
        <button
          className="btn btn-primary"
          onClick={onAction}
          style={{ fontSize: 11, padding: '5px 12px', ...actionStyle }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

/* ── ActuatorCard ─────────────────────────────────────────────────────── */
export function ActuatorCard({ icon, name, desc, on, locked, lockMsg, onToggle, loading }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 16 }}>
      <div style={{ fontSize: 30, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{name}</div>
      <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-text3)', marginBottom: 12 }}>{desc}</div>
      {locked ? (
        <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-warn)', padding: '6px 10px', background: 'rgba(255,179,64,.1)', borderRadius: 5, border: '1px solid rgba(255,179,64,.3)' }}>
          ⏱ {lockMsg}
        </div>
      ) : (
        <button
          className={`btn ${on ? 'btn-primary' : ''}`}
          onClick={onToggle}
          disabled={loading}
          style={{ width: '100%', justifyContent: 'center', fontSize: 12,
            borderColor: on ? 'var(--bc-accent3)' : undefined,
            color: on ? 'var(--bc-accent)' : undefined,
          }}
        >
          {loading ? '…' : on ? '⬛ ON' : '▶ Turn On'}
        </button>
      )}
    </div>
  );
}

/* ── LogEntry ─────────────────────────────────────────────────────────── */
export function LogEntry({ level = 'info', time, source, message }) {
  const colors = { ok: 'var(--bc-accent)', info: 'var(--bc-info)', warn: 'var(--bc-warn)', error: 'var(--bc-danger)' };
  return (
    <div style={{
      borderLeft: `2px solid ${colors[level] || colors.info}`,
      padding: '7px 12px', marginBottom: 6,
    }}>
      <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', marginBottom: 2 }}>
        {time} {source && `· ${source}`}
      </div>
      <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-text2)', lineHeight: 1.5 }}>
        {message}
      </div>
    </div>
  );
}

/* ── FormGroup ─────────────────────────────────────────────────────────── */
export function FormGroup({ label, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <label style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, letterSpacing: 1, color: 'var(--bc-text3)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
          {label}
        </label>
      )}
      {children}
      {error && (
        <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-danger)', marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}

/* ── PasswordInput ────────────────────────────────────────────────────── */
import { useState } from 'react';
export function PasswordInput({ value, onChange, placeholder = '••••••••', name }) {
  const [show, setShow] = useState(false);
  return (
    <div className="input-wrap">
      <input
        className="input"
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        name={name}
        autoComplete="off"
      />
      <button className="eye-btn" onClick={() => setShow(s => !s)} type="button" tabIndex={-1}>
        {show ? '🙈' : '👁'}
      </button>
    </div>
  );
}

/* ── Spinner ──────────────────────────────────────────────────────────── */
export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%',
        border: '3px solid var(--bc-border2)',
        borderTopColor: 'var(--bc-accent)',
        animation: 'spin .7s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ── ErrorBanner ──────────────────────────────────────────────────────── */
export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="notif-banner error" style={{ marginBottom: 16 }}>
      <span style={{ flex: 1 }}>⚠ {message}</span>
      {onDismiss && <button onClick={onDismiss} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>}
    </div>
  );
}

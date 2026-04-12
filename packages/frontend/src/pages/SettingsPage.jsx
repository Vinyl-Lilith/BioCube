// packages/frontend/src/pages/SettingsPage.jsx
import { useState } from 'react';
import { useAuth }  from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { FormGroup, PasswordInput, ErrorBanner } from '../components/ui/index.jsx';
import api from '../api/api';

export default function SettingsPage() {
  const { user, updateUser, mustChangePwd, setMustChangePwd } = useAuth();
  const { themeName, setTheme, themes } = useTheme();

  // ── Username state ────────────────────────────────────────────────
  const [username,    setUsername]    = useState(user?.username || '');
  const [unameErr,    setUnameErr]    = useState('');
  const [unameSaving, setUnameSaving] = useState(false);
  const [unameSaved,  setUnameSaved]  = useState(false);

  // ── Password state ────────────────────────────────────────────────
  const [pwdForm,   setPwdForm]   = useState({ current: '', newPwd: '', confirm: '' });
  const [pwdErrors, setPwdErrors] = useState({});
  const [pwdErr,    setPwdErr]    = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved,  setPwdSaved]  = useState(false);

  // ── Username save ─────────────────────────────────────────────────
  async function saveUsername(e) {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) { setUnameErr('Username is required'); return; }
    if (!/^[a-zA-Z0-9_-]{3,30}$/.test(trimmed)) { setUnameErr('3–30 chars, letters/numbers/_/-'); return; }
    setUnameSaving(true); setUnameErr('');
    try {
      const { data } = await api.put('/settings/username', { username: trimmed });
      updateUser({ username: data.username });
      setUnameSaved(true);
      setTimeout(() => setUnameSaved(false), 2500);
    } catch (e) {
      setUnameErr(e.response?.data?.error || 'Failed to update username');
    } finally { setUnameSaving(false); }
  }

  // ── Password save ─────────────────────────────────────────────────
  function validatePwd() {
    const errs = {};
    if (!pwdForm.current) errs.current = 'Current password is required';
    if (!pwdForm.newPwd)  errs.newPwd  = 'New password is required';
    else if (pwdForm.newPwd.length < 8)        errs.newPwd = 'At least 8 characters';
    else if (!/[A-Z]/.test(pwdForm.newPwd))    errs.newPwd = 'Needs at least one uppercase letter';
    else if (!/[0-9]/.test(pwdForm.newPwd))    errs.newPwd = 'Needs at least one number';
    if (pwdForm.newPwd !== pwdForm.confirm) errs.confirm = 'Passwords do not match';
    setPwdErrors(errs);
    return !Object.keys(errs).length;
  }

  async function savePassword(e) {
    e.preventDefault();
    if (!validatePwd()) return;
    setPwdSaving(true); setPwdErr('');
    try {
      await api.post('/auth/change-password', {
        currentPassword: pwdForm.current,
        newPassword:     pwdForm.newPwd,
        confirmPassword: pwdForm.confirm,
      });
      setPwdForm({ current: '', newPwd: '', confirm: '' });
      setPwdSaved(true);
      setMustChangePwd(false);
      setTimeout(() => setPwdSaved(false), 3000);
    } catch (e) {
      setPwdErr(e.response?.data?.error || 'Failed to update password');
    } finally { setPwdSaving(false); }
  }

  // ── Theme save ────────────────────────────────────────────────────
  async function pickTheme(name) {
    setTheme(name);
    try { await api.put('/settings/theme', { theme: name }); } catch (_) {}
  }

  return (
    <div>
      {mustChangePwd && (
        <div className="notif-banner error mb-2">
          ⚠ You must set a new password before continuing.
        </div>
      )}

      <div className="grid-2">

        {/* ── Left column: Account + Password ─────────────────────── */}
        <div>
          {/* Username */}
          <div className="card mb-2">
            <div className="card-title">Account</div>
            {unameSaved && <div className="notif-banner ok mb-1">✓ Username updated</div>}
            <form onSubmit={saveUsername}>
              <FormGroup label="Username" error={unameErr}>
                <input className="input" value={username} onChange={e => { setUsername(e.target.value); setUnameErr(''); }} />
              </FormGroup>
              <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', marginBottom: 12 }}>
                Old username becomes available for others after you change it.
              </div>
              <button className="btn btn-primary" type="submit" disabled={unameSaving}>
                {unameSaving ? '…' : 'Save Username'}
              </button>
            </form>
          </div>

          {/* Password */}
          <div className="card">
            <div className="card-title">Password</div>
            {pwdSaved && <div className="notif-banner ok mb-1">✓ Password updated</div>}
            <ErrorBanner message={pwdErr} onDismiss={() => setPwdErr('')} />
            <form onSubmit={savePassword}>
              <FormGroup label="Current Password" error={pwdErrors.current}>
                <PasswordInput value={pwdForm.current} onChange={e => setPwdForm(f => ({ ...f, current: e.target.value }))} />
              </FormGroup>
              <FormGroup label="New Password" error={pwdErrors.newPwd}>
                <PasswordInput value={pwdForm.newPwd} onChange={e => setPwdForm(f => ({ ...f, newPwd: e.target.value }))} placeholder="min 8 chars, 1 uppercase, 1 number" />
              </FormGroup>
              <FormGroup label="Confirm New Password" error={pwdErrors.confirm}>
                <PasswordInput value={pwdForm.confirm} onChange={e => setPwdForm(f => ({ ...f, confirm: e.target.value }))} />
              </FormGroup>
              <button className="btn btn-primary" type="submit" disabled={pwdSaving}>
                {pwdSaving ? '…' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* ── Right column: Themes ──────────────────────────────────── */}
        <div>
          <div className="card">
            <div className="card-title">Interface Theme</div>
            <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', marginBottom: 14 }}>
              Saved to your account · applies on all your devices
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 8 }}>
              {Object.entries(themes).map(([key, theme]) => (
                <div
                  key={key}
                  onClick={() => pickTheme(key)}
                  title={theme.name}
                  style={{
                    borderRadius: 8, overflow: 'hidden', cursor: 'pointer',
                    border: `2px solid ${themeName === key ? 'white' : 'transparent'}`,
                    boxShadow: themeName === key ? `0 0 14px ${theme.dot}66` : '0 1px 4px rgba(0,0,0,.3)',
                    transition: 'all .15s',
                    transform: themeName === key ? 'scale(1.04)' : 'scale(1)',
                  }}
                >
                  {/* Color preview */}
                  <div style={{
                    height: 40,
                    background: `linear-gradient(135deg, ${theme['--bc-bg']}, ${theme['--bc-card2'] || theme['--bc-card']})`,
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                    padding: '0 5px 4px', position: 'relative',
                  }}>
                    {/* Accent dots */}
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[theme['--bc-accent'], theme['--bc-secondary'] || theme['--bc-accent2'], theme['--bc-warn']].map((c, i) => (
                        <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: c, flexShrink: 0 }} />
                      ))}
                    </div>
                    {themeName === key && (
                      <span style={{ fontSize: 9, color: 'white', textShadow: '0 0 4px rgba(0,0,0,.8)' }}>✓</span>
                    )}
                  </div>
                  {/* Name bar */}
                  <div style={{
                    background: theme['--bc-card2'] || theme['--bc-bg2'] || '#111',
                    padding: '4px 5px',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 'clamp(7px, 1vw, 9px)',
                    letterSpacing: .5,
                    color: theme['--bc-text2'] || '#aaa',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}>
                    {theme.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

// packages/frontend/src/pages/LoginPage.jsx
// Handles Login, Signup, and Forgot Password flows on one screen.
// Tab switching: 'login' | 'signup' | 'forgot'

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FormGroup, PasswordInput, ErrorBanner, Spinner } from '../components/ui/index.jsx';
import api from '../api/api';

const PREVIEW_STATS = [
  { val: '24.3°C', lbl: 'TEMP' },
  { val: '68%',    lbl: 'HUMIDITY' },
  { val: '42%',    lbl: 'SOIL 1' },
  { val: '38%',    lbl: 'SOIL 2' },
];

export default function LoginPage() {
  const { login, signup, recoverWithToken } = useAuth();
  const navigate = useNavigate();

  const [tab,      setTab]      = useState('login');   // 'login' | 'signup' | 'forgot'
  const [forgotStep, setForgotStep] = useState('choose'); // 'choose' | 'fuzzy' | 'admin' | 'done'
  const [forgotMethod, setForgotMethod] = useState('fuzzy'); // 'fuzzy' | 'admin'

  const [form,    setForm]    = useState({ username: '', password: '', confirm: '', attempt: '', message: '' });
  const [errors,  setErrors]  = useState({});
  const [apiErr,  setApiErr]  = useState('');
  const [loading, setLoading] = useState(false);
  const [recovToken, setRecovToken] = useState('');

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })); setApiErr(''); };

  // ── Client-side validation ────────────────────────────────────────
  function validate() {
    const errs = {};
    if (!form.username.trim()) errs.username = 'Username is required';
    else if (!/^[a-zA-Z0-9_-]{3,30}$/.test(form.username.trim())) errs.username = '3–30 chars, letters/numbers/_/-';

    if (tab !== 'forgot') {
      if (!form.password) errs.password = 'Password is required';
      else if (form.password.length < 8) errs.password = 'At least 8 characters';
      else if (!/[A-Z]/.test(form.password)) errs.password = 'Needs at least one uppercase letter';
      else if (!/[0-9]/.test(form.password)) errs.password = 'Needs at least one number';
    }
    if (tab === 'signup') {
      if (form.password !== form.confirm) errs.confirm = 'Passwords do not match';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  // ── Submit handlers ───────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await login(form.username.trim(), form.password);
      navigate('/');
    } catch (err) {
      setApiErr(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  }

  async function handleSignup(e) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await signup(form.username.trim(), form.password);
      navigate('/');
    } catch (err) {
      setApiErr(err.response?.data?.error || 'Signup failed.');
    } finally { setLoading(false); }
  }

  async function handleFuzzy(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.attempt) { setApiErr('Fill in both fields'); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/forgot/fuzzy', { username: form.username.trim(), attempt: form.attempt });
      if (data.match) {
        setRecovToken(data.recoveryToken);
        setForgotStep('done');
      } else {
        setApiErr('Password did not match. Try "Message Admin" instead.');
      }
    } catch (err) {
      setApiErr(err.response?.data?.error || 'Verification failed.');
    } finally { setLoading(false); }
  }

  async function handleAdminRequest(e) {
    e.preventDefault();
    if (!form.username.trim() || !form.message.trim()) { setApiErr('Fill in all fields'); return; }
    if (form.message.length > 1000) { setApiErr('Message too long (max 1000 characters)'); return; }
    setLoading(true);
    try {
      await api.post('/auth/forgot/admin-request', { username: form.username.trim(), message: form.message });
      setForgotStep('done');
    } catch (err) {
      setApiErr(err.response?.data?.error || 'Submission failed.');
    } finally { setLoading(false); }
  }

  async function handleUseRecovToken(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await recoverWithToken(recovToken);
      navigate('/settings'); // Force them to the settings page to set a new password
    } catch (err) {
      setApiErr(err.response?.data?.error || 'Recovery token failed.');
    } finally { setLoading(false); }
  }

  // ── Shared input style ────────────────────────────────────────────
  const IS = { marginBottom: 0 }; // Input style override

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bc-bg)' }}>

      {/* ── Left brand panel ──────────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 48,
        background: 'linear-gradient(135deg, var(--bc-bg) 0%, var(--bc-bg2) 100%)',
        borderRight: '1px solid var(--bc-border)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, var(--bc-dim) 0%, transparent 70%)',
          top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
          pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', textAlign: 'center', zIndex: 1 }}>
          <div style={{
            width: 88, height: 88, margin: '0 auto 18px',
            background: 'linear-gradient(135deg, var(--bc-accent3), var(--bc-accent))',
            borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 44, boxShadow: '0 0 48px var(--bc-glow)',
          }}>🌿</div>
          <div style={{ fontSize: 46, fontWeight: 800, color: 'var(--bc-accent)', letterSpacing: 3, lineHeight: 1 }}>BioCube</div>
          <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)', letterSpacing: 3, marginTop: 6 }}>SMART GREENHOUSE SYSTEM</div>

          {/* Live stats preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 40, maxWidth: 260 }}>
            {PREVIEW_STATS.map(s => (
              <div key={s.lbl} style={{ background: 'var(--bc-dim)', border: '1px solid var(--bc-border)', borderRadius: 8, padding: '12px 8px', textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 18, fontWeight: 500, color: 'var(--bc-accent)' }}>{s.val}</div>
                <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', letterSpacing: 1.5, marginTop: 2 }}>{s.lbl}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────── */}
      <div style={{ width: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div style={{ width: '100%' }}>

          {/* ── Tab switcher (Login / Signup) ── */}
          {tab !== 'forgot' && (
            <div style={{ display: 'flex', gap: 0, marginBottom: 28, background: 'var(--bc-bg3)', borderRadius: 8, padding: 3 }}>
              {['login', 'signup'].map(t => (
                <button key={t} onClick={() => { setTab(t); setApiErr(''); setErrors({}); }}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: tab === t ? 'var(--bc-card)' : 'transparent',
                    color: tab === t ? 'var(--bc-accent)' : 'var(--bc-text3)',
                    fontFamily: 'var(--bc-font-display)', fontWeight: 700, fontSize: 13,
                    boxShadow: tab === t ? '0 0 12px var(--bc-glow)' : 'none',
                    transition: 'all .15s',
                  }}>
                  {t === 'login' ? 'Sign In' : 'Create Account'}
                </button>
              ))}
            </div>
          )}

          <ErrorBanner message={apiErr} onDismiss={() => setApiErr('')} />

          {/* ══════════ LOGIN FORM ══════════ */}
          {tab === 'login' && (
            <form onSubmit={handleLogin}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Welcome back</h2>
              <p style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)', marginBottom: 24 }}>SIGN IN TO YOUR BIOCUBE ACCOUNT</p>

              <FormGroup label="Username" error={errors.username}>
                <input className="input" value={form.username} onChange={e => set('username', e.target.value)} placeholder="your_username" />
              </FormGroup>
              <FormGroup label="Password" error={errors.password}>
                <PasswordInput value={form.password} onChange={e => set('password', e.target.value)} />
              </FormGroup>
              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 16 }}>
                <button type="button" onClick={() => { setTab('forgot'); setForgotStep('choose'); setApiErr(''); }}
                  style={{ background: 'none', border: 'none', fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-accent3)', cursor: 'pointer' }}>
                  Forgot password?
                </button>
              </div>
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 14 }}>
                {loading ? <Spinner /> : 'Sign In →'}
              </button>
            </form>
          )}

          {/* ══════════ SIGNUP FORM ══════════ */}
          {tab === 'signup' && (
            <form onSubmit={handleSignup}>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Create account</h2>
              <p style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)', marginBottom: 24 }}>FIRST ACCOUNT BECOMES HEAD ADMIN</p>

              <FormGroup label="Username" error={errors.username}>
                <input className="input" value={form.username} onChange={e => set('username', e.target.value)} placeholder="choose_a_username" />
              </FormGroup>
              <FormGroup label="Password" error={errors.password}>
                <PasswordInput value={form.password} onChange={e => set('password', e.target.value)} placeholder="min 8 chars, 1 uppercase, 1 number" />
              </FormGroup>
              <FormGroup label="Confirm Password" error={errors.confirm}>
                <PasswordInput value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="repeat password" />
              </FormGroup>
              <button className="btn btn-primary" type="submit" disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: 12, fontSize: 14, marginTop: 4 }}>
                {loading ? <Spinner /> : 'Create Account →'}
              </button>
            </form>
          )}

          {/* ══════════ FORGOT PASSWORD ══════════ */}
          {tab === 'forgot' && (
            <div>
              <button onClick={() => { setTab('login'); setForgotStep('choose'); setApiErr(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--bc-text3)', cursor: 'pointer', fontFamily: 'var(--bc-font-mono)', fontSize: 11, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
                ← Back to Login
              </button>
              <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 4 }}>Recover Access</h2>
              <p style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)', marginBottom: 24 }}>CHOOSE YOUR RECOVERY METHOD</p>

              {/* Method chooser */}
              {forgotStep === 'choose' && (
                <>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
                    {[
                      { key: 'fuzzy', icon: '🔑', label: 'Last Password', desc: 'Try your last known password' },
                      { key: 'admin', icon: '📬', label: 'Message Admin', desc: 'Request admin assistance' },
                    ].map(m => (
                      <div key={m.key}
                        onClick={() => setForgotMethod(m.key)}
                        style={{
                          flex: 1, padding: 14, borderRadius: 8, cursor: 'pointer', textAlign: 'center',
                          border: `1px solid ${forgotMethod === m.key ? 'var(--bc-accent)' : 'var(--bc-border2)'}`,
                          background: forgotMethod === m.key ? 'var(--bc-dim)' : 'var(--bc-bg3)',
                          transition: 'all .15s',
                        }}>
                        <div style={{ fontSize: 24, marginBottom: 6 }}>{m.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: forgotMethod === m.key ? 'var(--bc-accent)' : 'var(--bc-text)' }}>{m.label}</div>
                        <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', marginTop: 3 }}>{m.desc}</div>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', padding: 11 }}
                    onClick={() => setForgotStep(forgotMethod)}>
                    Continue →
                  </button>
                </>
              )}

              {/* Fuzzy match step */}
              {forgotStep === 'fuzzy' && (
                <form onSubmit={handleFuzzy}>
                  <FormGroup label="Username">
                    <input className="input" value={form.username} onChange={e => set('username', e.target.value)} placeholder="your_username" />
                  </FormGroup>
                  <FormGroup label="Last Password You Remember">
                    <PasswordInput value={form.attempt} onChange={e => set('attempt', e.target.value)} placeholder="best guess…" />
                  </FormGroup>
                  <p style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-text3)', marginBottom: 16, lineHeight: 1.6 }}>
                    If your attempt matches your last password, you'll be let in and prompted to set a new one.
                  </p>
                  <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
                    {loading ? '…' : 'Verify →'}
                  </button>
                </form>
              )}

              {/* Admin message step */}
              {forgotStep === 'admin' && (
                <form onSubmit={handleAdminRequest}>
                  <FormGroup label="Username">
                    <input className="input" value={form.username} onChange={e => set('username', e.target.value)} placeholder="your_username" />
                  </FormGroup>
                  <FormGroup label="Explain Your Situation">
                    <textarea className="input" value={form.message} onChange={e => set('message', e.target.value)}
                      placeholder="e.g. I've been locked out for 3 days, my last username was…"
                      rows={5} style={{ resize: 'vertical', fontFamily: 'var(--bc-font-mono)', fontSize: 11 }} maxLength={1000} />
                    <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', marginTop: 3, textAlign: 'right' }}>
                      {form.message.length}/1000
                    </div>
                  </FormGroup>
                  <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
                    {loading ? '…' : 'Submit Request →'}
                  </button>
                </form>
              )}

              {/* Done state */}
              {forgotStep === 'done' && forgotMethod === 'admin' && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Request Submitted</div>
                  <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)', lineHeight: 1.7 }}>
                    An admin will review your request. Once approved, you will be given a recovery token to log in and set a new password.
                  </div>
                  <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => { setTab('login'); setForgotStep('choose'); }}>
                    Back to Login
                  </button>
                </div>
              )}

              {forgotStep === 'done' && forgotMethod === 'fuzzy' && (
                <form onSubmit={handleUseRecovToken} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>Password Matched!</div>
                  <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)', marginBottom: 20, lineHeight: 1.7 }}>
                    Click below to access your account. You will be prompted to set a new password immediately.
                  </div>
                  <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center', padding: 11 }}>
                    {loading ? '…' : 'Enter Account →'}
                  </button>
                </form>
              )}
            </div>
          )}

        </div>
      </div>

    </div>
  );
}

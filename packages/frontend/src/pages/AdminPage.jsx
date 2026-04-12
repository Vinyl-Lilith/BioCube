// packages/frontend/src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import { LogEntry, SectionHeader, Spinner, ErrorBanner } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { ROLES, STATUS } from '../utils/constants';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

export default function AdminPage() {
  const { user } = useAuth();
  const isHeadAdmin = user?.role === ROLES.HEAD_ADMIN;

  const [users,     setUsers]     = useState([]);
  const [requests,  setRequests]  = useState([]);
  const [actLogs,   setActLogs]   = useState([]);
  const [sysLogs,   setSysLogs]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [err,       setErr]       = useState('');
  const [logFilter, setLogFilter] = useState('all');

  useEffect(() => {
    Promise.all([
      api.get('/admin/users'),
      api.get('/admin/requests'),
      api.get('/admin/logs/activity'),
      api.get('/admin/logs/system'),
    ]).then(([u, r, a, s]) => {
      setUsers(u.data);
      setRequests(r.data);
      setActLogs(a.data);
      setSysLogs(s.data);
    }).catch(() => setErr('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  // ── User actions ─────────────────────────────────────────────────
  async function setStatus(userId, status) {
    try {
      const { data } = await api.put(`/admin/users/${userId}/status`, { status });
      setUsers(u => u.map(x => x._id === userId ? { ...x, status: data.status } : x));
    } catch (e) { setErr(e.response?.data?.error || 'Action failed'); }
  }

  async function setRole(userId, role) {
    try {
      const { data } = await api.put(`/admin/users/${userId}/role`, { role });
      setUsers(u => u.map(x => x._id === userId ? { ...x, role: data.role } : x));
    } catch (e) { setErr(e.response?.data?.error || 'Role change failed'); }
  }

  async function handleRequest(reqId, action) {
    try {
      await api.post(`/admin/requests/${reqId}/${action}`);
      setRequests(r => r.filter(x => x._id !== reqId));
    } catch (e) { setErr(e.response?.data?.error || 'Failed'); }
  }

  // ── Role badge style ──────────────────────────────────────────────
  function roleBadge(role) {
    const map = {
      head_admin: { bg: 'rgba(61,255,122,.2)', color: 'var(--bc-accent)',  border: 'var(--bc-accent3)', text: 'HEAD ADMIN' },
      admin:      { bg: 'rgba(77,184,255,.15)',color: 'var(--bc-info)',    border: 'rgba(77,184,255,.3)', text: 'ADMIN' },
      user:       { bg: 'var(--bc-dim)',        color: 'var(--bc-text2)',   border: 'var(--bc-border2)',  text: 'USER' },
    };
    const s = map[role] || map.user;
    return (
      <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 10, padding: '2px 8px', fontFamily: 'var(--bc-font-mono)', fontSize: 9 }}>
        {s.text}
      </span>
    );
  }

  function statusBadge(status) {
    const map = {
      active:     { color: 'var(--bc-accent)',  text: 'Active' },
      restricted: { color: 'var(--bc-warn)',    text: 'Restricted' },
      banned:     { color: 'var(--bc-danger)',  text: 'Banned' },
    };
    const s = map[status] || map.active;
    return <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: s.color }}>{s.text}</span>;
  }

  const filteredActLogs = logFilter === 'all' ? actLogs : actLogs.filter(l => l.page === logFilter);

  if (loading) return <Spinner />;

  return (
    <div>
      <ErrorBanner message={err} onDismiss={() => setErr('')} />

      <div className="grid-2">

        {/* ── Left column ─────────────────────────────────────────── */}
        <div>
          {/* User table */}
          <SectionHeader title="User Management" />
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bc-border)' }}>
                    {['Username','Role','Status','Actions'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--bc-font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--bc-text3)', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const isProtected = u.role === ROLES.HEAD_ADMIN || u.role === ROLES.ADMIN;
                    return (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--bc-border)' }}>
                        <td style={{ padding: '10px 12px', color: 'var(--bc-text)' }}>{u.username}</td>
                        <td style={{ padding: '10px 12px' }}>{roleBadge(u.role)}</td>
                        <td style={{ padding: '10px 12px' }}>{statusBadge(u.status)}</td>
                        <td style={{ padding: '10px 12px' }}>
                          {isProtected ? (
                            <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)' }}>Protected</span>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                              {u.status === STATUS.BANNED
                                ? <button className="btn" style={{ fontSize: 9, padding: '2px 8px' }} onClick={() => setStatus(u._id, STATUS.ACTIVE)}>Unban</button>
                                : <button className="btn btn-danger" style={{ fontSize: 9, padding: '2px 8px' }} onClick={() => setStatus(u._id, STATUS.BANNED)}>Ban</button>
                              }
                              {isHeadAdmin && u.role === ROLES.USER && (
                                <button className="btn" style={{ fontSize: 9, padding: '2px 8px' }} onClick={() => setRole(u._id, ROLES.ADMIN)}>Promote</button>
                              )}
                              {isHeadAdmin && u.role === ROLES.ADMIN && (
                                <button className="btn" style={{ fontSize: 9, padding: '2px 8px' }} onClick={() => setRole(u._id, ROLES.USER)}>Demote</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pending recovery requests */}
          {requests.length > 0 && (
            <>
              <SectionHeader title={`Pending Approvals (${requests.length})`} />
              {requests.map(r => (
                <div key={r._id} className="card" style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>📬</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{r.username}</div>
                      <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-text3)', marginTop: 2 }}>{fmtTime(r.createdAt)}</div>
                      <div style={{ fontSize: 12, color: 'var(--bc-text2)', marginTop: 6, lineHeight: 1.5 }}>{r.message}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-primary" style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => handleRequest(r._id, 'approve')}>✓ Approve</button>
                      <button className="btn btn-danger"  style={{ fontSize: 11, padding: '5px 12px' }} onClick={() => handleRequest(r._id, 'deny')}>✗ Deny</button>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── Right column ─────────────────────────────────────────── */}
        <div>
          {/* Activity log */}
          <SectionHeader title="24hr Activity Log" />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {['all','manual','automation','admin','settings'].map(f => (
              <button key={f} className="btn" onClick={() => setLogFilter(f)}
                style={{ fontSize: 10, padding: '3px 10px', borderColor: logFilter===f ? 'var(--bc-accent)' : undefined, color: logFilter===f ? 'var(--bc-accent)' : undefined, background: logFilter===f ? 'var(--bc-dim)' : undefined }}>
                {f}
              </button>
            ))}
          </div>
          <div className="card" style={{ maxHeight: 280, overflowY: 'auto', marginBottom: 16 }}>
            {filteredActLogs.length === 0
              ? <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)', padding: 8 }}>No activity</div>
              : filteredActLogs.map(l => (
                  <LogEntry key={l._id} level="ok" time={fmtTime(l.createdAt)} source={l.username} message={l.action} />
                ))
            }
          </div>

          {/* System log */}
          <SectionHeader title="System Error Log" />
          <div className="card" style={{ maxHeight: 300, overflowY: 'auto' }}>
            {sysLogs.length === 0
              ? <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)', padding: 8 }}>No system events</div>
              : sysLogs.map(l => (
                  <LogEntry key={l._id} level={l.level} time={fmtTime(l.createdAt)} source={l.source.toUpperCase()} message={l.message} />
                ))
            }
          </div>
        </div>

      </div>
    </div>
  );
}

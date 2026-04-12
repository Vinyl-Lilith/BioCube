// packages/frontend/src/pages/AdminPage.jsx
import { useState, useEffect } from 'react';
import { LogEntry, SectionHeader, Spinner, ErrorBanner } from '../components/ui/index.jsx';
import { useAuth } from '../context/AuthContext';
import api from '../api/api';
import { ROLES, STATUS, RESTRICTABLE_PAGES } from '../utils/constants';

function fmtTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

// ── RestrictModal ─────────────────────────────────────────────────────
// Shows a checklist of pages to restrict/unrestrict for a user.
function RestrictModal({ target, onClose, onSave }) {
  const current = target.restrictedPages || [];
  const [pages, setPages] = useState([...current]);
  const [saving, setSaving] = useState(false);

  function toggle(page) {
    setPages(prev =>
      prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]
    );
  }

  async function save() {
    setSaving(true);
    await onSave(pages);
    setSaving(false);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(4px)',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{ width: 320, padding: 24 }}
      >
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
          Restrict Pages
        </div>
        <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-text3)', marginBottom: 16 }}>
          {target.username} — check pages to block access
        </div>

        {RESTRICTABLE_PAGES.map(page => (
          <label
            key={page}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 0', borderBottom: '1px solid var(--bc-border)',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={pages.includes(page)}
              onChange={() => toggle(page)}
              style={{ accentColor: 'var(--bc-accent)', width: 14, height: 14 }}
            />
            <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{page}</span>
            <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)', marginLeft: 'auto' }}>
              {pages.includes(page) ? 'BLOCKED' : 'allowed'}
            </span>
          </label>
        ))}

        <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={saving}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            {saving ? '…' : '💾 Save'}
          </button>
          <button className="btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ConfirmModal ──────────────────────────────────────────────────────
function ConfirmModal({ message, danger, onConfirm, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, backdropFilter: 'blur(4px)',
      }}
    >
      <div onClick={e => e.stopPropagation()} className="card" style={{ width: 300, padding: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Confirm Action</div>
        <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text2)', marginBottom: 20, lineHeight: 1.6 }}>
          {message}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            Confirm
          </button>
          <button className="btn" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { user: me } = useAuth();
  const isHeadAdmin = me?.role === ROLES.HEAD_ADMIN;

  const [users,       setUsers]       = useState([]);
  const [requests,    setRequests]    = useState([]);
  const [actLogs,     setActLogs]     = useState([]);
  const [sysLogs,     setSysLogs]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [err,         setErr]         = useState('');
  const [logFilter,   setLogFilter]   = useState('all');

  // Modal state
  const [restrictTarget, setRestrictTarget] = useState(null); // user obj
  const [confirmAction,  setConfirmAction]  = useState(null); // { message, danger, fn }

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

  // ── Actions ───────────────────────────────────────────────────────
  async function doStatus(userId, status) {
    try {
      const { data } = await api.put(`/admin/users/${userId}/status`, { status });
      setUsers(u => u.map(x => x._id === userId ? { ...x, status: data.status } : x));
    } catch (e) { setErr(e.response?.data?.error || 'Action failed'); }
  }

  async function doRole(userId, role) {
    try {
      const { data } = await api.put(`/admin/users/${userId}/role`, { role });
      setUsers(u => u.map(x => x._id === userId ? { ...x, role: data.role } : x));
    } catch (e) { setErr(e.response?.data?.error || 'Role change failed'); }
  }

  async function doRestrict(userId, pages) {
    try {
      const { data } = await api.put(`/admin/users/${userId}/restrict`, { pages });
      setUsers(u => u.map(x => x._id === userId
        ? { ...x, restrictedPages: data.restrictedPages, status: data.status }
        : x
      ));
      setRestrictTarget(null);
    } catch (e) { setErr(e.response?.data?.error || 'Restrict failed'); setRestrictTarget(null); }
  }

  async function doDelete(userId) {
    try {
      await api.delete(`/admin/users/${userId}`);
      setUsers(u => u.filter(x => x._id !== userId));
      setConfirmAction(null);
    } catch (e) { setErr(e.response?.data?.error || 'Delete failed'); setConfirmAction(null); }
  }

  async function handleRequest(reqId, action) {
    try {
      await api.post(`/admin/requests/${reqId}/${action}`);
      setRequests(r => r.filter(x => x._id !== reqId));
    } catch (e) { setErr(e.response?.data?.error || 'Failed'); }
  }

  // ── Permission helper: what can the current viewer do to this user ──
  function getPermissions(target) {
    // Can't act on yourself
    if (target._id === me?._id) return { none: true };
    // Nobody touches head admin
    if (target.role === ROLES.HEAD_ADMIN) return { none: true };

    if (isHeadAdmin) {
      // Head admin can do everything to admins and users
      return {
        canBan:      true,
        canRestrict: true,
        canPromote:  target.role === ROLES.USER,
        canDemote:   target.role === ROLES.ADMIN,
        canDelete:   true,
      };
    }

    // Regular admin — only acts on plain users
    if (target.role === ROLES.ADMIN) return { none: true, adminProtected: true };

    return {
      canBan:      true,
      canRestrict: true,
      canPromote:  false,
      canDemote:   false,
      canDelete:   false,
    };
  }

  // ── Badges ────────────────────────────────────────────────────────
  function roleBadge(role) {
    const map = {
      head_admin: { bg: 'rgba(61,255,122,.2)',  color: 'var(--bc-accent)', border: 'var(--bc-accent3)',       text: 'HEAD ADMIN' },
      admin:      { bg: 'rgba(77,184,255,.15)', color: 'var(--bc-info)',   border: 'rgba(77,184,255,.3)',      text: 'ADMIN' },
      user:       { bg: 'var(--bc-dim)',         color: 'var(--bc-text2)',  border: 'var(--bc-border2)',        text: 'USER' },
    };
    const s = map[role] || map.user;
    return (
      <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}`, borderRadius: 10, padding: '2px 8px', fontFamily: 'var(--bc-font-mono)', fontSize: 9, whiteSpace: 'nowrap' }}>
        {s.text}
      </span>
    );
  }

  function statusBadge(u) {
    if (u.status === STATUS.BANNED)     return <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-danger)' }}>Banned</span>;
    if (u.status === STATUS.RESTRICTED) return <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-warn)' }}>Restricted</span>;
    return <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 10, color: 'var(--bc-accent)' }}>Active</span>;
  }

  const filteredActLogs = logFilter === 'all' ? actLogs : actLogs.filter(l => l.page === logFilter);

  if (loading) return <Spinner />;

  return (
    <div>
      <ErrorBanner message={err} onDismiss={() => setErr('')} />

      {/* Modals */}
      {restrictTarget && (
        <RestrictModal
          target={restrictTarget}
          onClose={() => setRestrictTarget(null)}
          onSave={pages => doRestrict(restrictTarget._id, pages)}
        />
      )}
      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          danger={confirmAction.danger}
          onConfirm={confirmAction.fn}
          onClose={() => setConfirmAction(null)}
        />
      )}

      <div className="grid-2">

        {/* ── Left column ─────────────────────────────────────────── */}
        <div>
          <SectionHeader title="User Management" />
          <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--bc-border)' }}>
                    {['Username', 'Role', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontFamily: 'var(--bc-font-mono)', fontSize: 9, letterSpacing: 1.5, color: 'var(--bc-text3)', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => {
                    const perms = getPermissions(u);
                    return (
                      <tr key={u._id} style={{ borderBottom: '1px solid var(--bc-border)' }}>
                        {/* Username */}
                        <td style={{ padding: '10px 12px', color: 'var(--bc-text)', fontWeight: 600 }}>
                          {u.username}
                          {u.restrictedPages?.length > 0 && (
                            <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 8, color: 'var(--bc-warn)', marginTop: 2 }}>
                              🚫 {u.restrictedPages.join(', ')}
                            </div>
                          )}
                        </td>

                        {/* Role */}
                        <td style={{ padding: '10px 12px' }}>{roleBadge(u.role)}</td>

                        {/* Status */}
                        <td style={{ padding: '10px 12px' }}>{statusBadge(u)}</td>

                        {/* Actions */}
                        <td style={{ padding: '8px 12px' }}>
                          {perms.none ? (
                            <span style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 9, color: 'var(--bc-text3)' }}>
                              {perms.adminProtected ? 'Admin — protected' : '—'}
                            </span>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>

                              {/* Ban / Unban */}
                              {perms.canBan && (
                                u.status === STATUS.BANNED
                                  ? (
                                    <button
                                      className="btn"
                                      style={{ fontSize: 9, padding: '3px 8px' }}
                                      onClick={() => setConfirmAction({
                                        message: `Unban ${u.username}? They will regain full access.`,
                                        danger: false,
                                        fn: () => doStatus(u._id, STATUS.ACTIVE),
                                      })}
                                    >
                                      Unban
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn-danger"
                                      style={{ fontSize: 9, padding: '3px 8px' }}
                                      onClick={() => setConfirmAction({
                                        message: `Ban ${u.username}? They will be locked out immediately.`,
                                        danger: true,
                                        fn: () => doStatus(u._id, STATUS.BANNED),
                                      })}
                                    >
                                      Ban
                                    </button>
                                  )
                              )}

                              {/* Restrict */}
                              {perms.canRestrict && (
                                <button
                                  className="btn"
                                  style={{ fontSize: 9, padding: '3px 8px' }}
                                  onClick={() => setRestrictTarget(u)}
                                >
                                  {u.restrictedPages?.length > 0 ? '🚫 Restrictions' : 'Restrict'}
                                </button>
                              )}

                              {/* Promote */}
                              {perms.canPromote && (
                                <button
                                  className="btn"
                                  style={{ fontSize: 9, padding: '3px 8px' }}
                                  onClick={() => setConfirmAction({
                                    message: `Promote ${u.username} to Admin? They will gain admin privileges.`,
                                    danger: false,
                                    fn: () => doRole(u._id, ROLES.ADMIN),
                                  })}
                                >
                                  Promote
                                </button>
                              )}

                              {/* Demote */}
                              {perms.canDemote && (
                                <button
                                  className="btn"
                                  style={{ fontSize: 9, padding: '3px 8px' }}
                                  onClick={() => setConfirmAction({
                                    message: `Demote ${u.username} to User? They will lose admin access.`,
                                    danger: true,
                                    fn: () => doRole(u._id, ROLES.USER),
                                  })}
                                >
                                  Demote
                                </button>
                              )}

                              {/* Delete — head admin only */}
                              {perms.canDelete && (
                                <button
                                  className="btn btn-danger"
                                  style={{ fontSize: 9, padding: '3px 8px' }}
                                  onClick={() => setConfirmAction({
                                    message: `Permanently delete ${u.username}'s account? This cannot be undone.`,
                                    danger: true,
                                    fn: () => doDelete(u._id),
                                  })}
                                >
                                  Delete
                                </button>
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
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
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
          <SectionHeader title="24hr Activity Log" />
          <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
            {['all', 'manual', 'automation', 'admin', 'settings'].map(f => (
              <button
                key={f}
                className="btn"
                onClick={() => setLogFilter(f)}
                style={{
                  fontSize: 10, padding: '3px 10px',
                  borderColor: logFilter === f ? 'var(--bc-accent)' : undefined,
                  color:       logFilter === f ? 'var(--bc-accent)' : undefined,
                  background:  logFilter === f ? 'var(--bc-dim)'    : undefined,
                }}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="card" style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 16 }}>
            {filteredActLogs.length === 0
              ? <div style={{ fontFamily: 'var(--bc-font-mono)', fontSize: 11, color: 'var(--bc-text3)', padding: 8 }}>No activity</div>
              : filteredActLogs.map(l => (
                  <LogEntry key={l._id} level="ok" time={fmtTime(l.createdAt)} source={l.username} message={l.action} />
                ))
            }
          </div>

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

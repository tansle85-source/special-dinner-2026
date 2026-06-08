import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LuckyDrawWheel from './LuckyDrawWheel';
import FeedbackModule from './FeedbackModule';
import ClaimScanner from './ClaimScanner';

const SITE_VERSION = "v2.1.0";

// Shows the server-side build version so admin can confirm latest code is running
const VersionBadge = () => {
  const [ver, setVer] = React.useState('...');
  React.useEffect(() => {
    axios.get('/api/version').then(r => setVer(r.data.version)).catch(() => setVer('?'));
  }, []);
  return <span style={{ fontWeight:800, color:'#0A8276' }}>{SITE_VERSION} (srv: {ver})</span>;
};

// ── Admin Users Management Panel ─────────────────────────────────────────────
const AdminUsersPanel = ({ token, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'admin' });
  const [editPwd, setEditPwd] = useState({}); // { [id]: newPassword }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const headers = { 'x-admin-token': token };

  const load = async () => {
    try {
      const [u, s] = await Promise.all([
        axios.get('/api/admin/users', { headers }),
        axios.get('/api/admin/sessions', { headers }),
      ]);
      setUsers(u.data);
      setSessions(s.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const flash = (text) => { setMsg(text); setTimeout(() => setMsg(''), 3000); };

  const createUser = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post('/api/admin/users', newUser, { headers });
      flash(`✅ User "${newUser.username}" created`);
      setNewUser({ username: '', password: '', role: 'admin' });
      load();
    } catch (err) { flash('❌ ' + (err.response?.data?.error || err.message)); }
    finally { setBusy(false); }
  };

  const changePassword = async (id) => {
    const pwd = editPwd[id];
    if (!pwd || pwd.length < 4) return flash('❌ Password must be at least 4 characters');
    setBusy(true);
    try {
      await axios.put(`/api/admin/users/${id}`, { password: pwd }, { headers });
      flash('✅ Password updated');
      setEditPwd(p => ({ ...p, [id]: '' }));
    } catch (err) { flash('❌ ' + (err.response?.data?.error || err.message)); }
    finally { setBusy(false); }
  };

  const deleteUser = async (id, username) => {
    if (!window.confirm(`Delete user "${username}"? This cannot be undone.`)) return;
    try {
      await axios.delete(`/api/admin/users/${id}`, { headers });
      flash(`✅ User "${username}" deleted`);
      load();
    } catch (err) { flash('❌ ' + (err.response?.data?.error || err.message)); }
  };

  const fieldStyle = { width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' };

  return (
    <div style={{ padding: '0 1rem', fontFamily: "'Outfit', sans-serif" }}>
      {/* Header */}
      <div className="card shadow-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 0.3rem' }}>👤 Admin User Management</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Manage who can access the admin panel. Logged in as <strong>{currentUser?.username}</strong> ({currentUser?.role})</p>
        {msg && <div style={{ marginTop: '0.75rem', padding: '0.6rem 1rem', borderRadius: '10px', background: msg.startsWith('✅') ? '#ecfdf5' : '#fef2f2', color: msg.startsWith('✅') ? '#065f46' : '#b91c1c', fontWeight: 700, fontSize: '0.85rem' }}>{msg}</div>}
      </div>

      {/* Active Sessions */}
      <div className="card shadow-card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ margin: 0 }}>🟢 Active Sessions ({sessions.length})</h3>
          <button onClick={load} style={{ background: '#f1f5f9', border: 'none', padding: '0.45rem 1rem', borderRadius: '8px', fontWeight: 700, color: '#475569', cursor: 'pointer', fontSize: '0.85rem' }}>↻ Refresh</button>
        </div>
        {sessions.length === 0 ? <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>No active sessions</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr style={{ background: '#f8fafc' }}>
              {['Username', 'Role', 'Logged In At', 'Token'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>)}
            </tr></thead>
            <tbody>{sessions.map((s, i) => (
              <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                <td style={{ padding: '0.6rem 0.75rem', fontWeight: 700 }}>{s.username}</td>
                <td style={{ padding: '0.6rem 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>{s.role}</td>
                <td style={{ padding: '0.6rem 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>{new Date(s.loginTime).toLocaleString()}</td>
                <td style={{ padding: '0.6rem 0.75rem', color: '#94a3b8', fontSize: '0.8rem', fontFamily: 'monospace' }}>{s.tokenHint}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>

      {/* Users List */}
      <div className="card shadow-card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>🔑 Admin Accounts ({users.length})</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f8fafc' }}>
            {['Username', 'Role', 'Created', 'Last Login', 'Change Password', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.6rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>)}
          </tr></thead>
          <tbody>{users.map(u => (
            <tr key={u.id} style={{ borderTop: '1px solid #f1f5f9' }}>
              <td style={{ padding: '0.7rem 0.75rem', fontWeight: 800 }}>
                {u.username} {u.username === currentUser?.username && <span style={{ background: '#ecfdf5', color: '#059669', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '99px', marginLeft: '6px' }}>YOU</span>}
              </td>
              <td style={{ padding: '0.7rem 0.75rem' }}>
                <span style={{ background: u.role === 'superadmin' ? 'rgba(124,58,237,0.1)' : 'rgba(10,130,118,0.1)', color: u.role === 'superadmin' ? '#7c3aed' : '#0A8276', fontWeight: 800, fontSize: '0.75rem', padding: '3px 10px', borderRadius: '99px' }}>{u.role}</span>
              </td>
              <td style={{ padding: '0.7rem 0.75rem', color: '#64748b', fontSize: '0.82rem' }}>{new Date(u.created_at).toLocaleDateString()}</td>
              <td style={{ padding: '0.7rem 0.75rem', color: '#64748b', fontSize: '0.82rem' }}>{u.last_login ? new Date(u.last_login).toLocaleString() : '—'}</td>
              <td style={{ padding: '0.7rem 0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="password" placeholder="New password" value={editPwd[u.id] || ''}
                    onChange={e => setEditPwd(p => ({ ...p, [u.id]: e.target.value }))}
                    style={{ ...fieldStyle, width: '150px', padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                  />
                  <button disabled={busy} onClick={() => changePassword(u.id)} style={{ background: '#0A8276', color: 'white', border: 'none', borderRadius: '8px', padding: '0.4rem 0.75rem', fontWeight: 800, cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>Save</button>
                </div>
              </td>
              <td style={{ padding: '0.7rem 0.75rem' }}>
                {u.username !== 'admin' && (
                  <button disabled={busy} onClick={() => deleteUser(u.id, u.username)} style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '8px', padding: '0.4rem 0.75rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' }}>🗑 Delete</button>
                )}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {/* Create User */}
      <div className="card shadow-card">
        <h3 style={{ margin: '0 0 1rem' }}>➕ Add New Admin User</h3>
        <form onSubmit={createUser} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Username</label>
            <input required style={fieldStyle} placeholder="username" value={newUser.username} onChange={e => setNewUser(p => ({ ...p, username: e.target.value }))} />
          </div>
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Password</label>
            <input required type="password" style={fieldStyle} placeholder="min 4 chars" value={newUser.password} onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))} />
          </div>
          <div style={{ minWidth: '130px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>Role</label>
            <select style={{ ...fieldStyle }} value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}>
              <option value="admin">admin</option>
              <option value="superadmin">superadmin</option>
            </select>
          </div>
          <button type="submit" disabled={busy} style={{ background: 'linear-gradient(135deg,#0A8276,#0369a1)', color: 'white', border: 'none', borderRadius: '10px', padding: '0.7rem 1.5rem', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem', whiteSpace: 'nowrap' }}>
            {busy ? 'Creating…' : '+ Create User'}
          </button>
        </form>
      </div>
    </div>
  );
};
// ─────────────────────────────────────────────────────────────────────────────

const Admin = () => {
  // Auth State
  const [authToken, setAuthToken] = useState(() => sessionStorage.getItem('adminToken') || null);
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  // Navigation State
  const [activeModule, setActiveModule] = useState('lucky-draw'); 
  const [activeSubTab, setActiveSubTab] = useState('conduct');
  const [activeBdSubTab, setActiveBdSubTab] = useState('submissions'); // New
  const [performanceRankType, setPerformanceRankType] = useState('general');

  // Data State
  const [employees, setEmployees] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [performanceResults, setPerformanceResults] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [performanceStatus, setPerformanceStatus] = useState({ voting_status: 'CLOSED' });
  const [bestDressStatus, setBestDressStatus] = useState('CLOSED');
  const [bestDressNominees, setBestDressNominees] = useState([]);
  const [bdSubmissions, setBdSubmissions] = useState([]);
  const [aiCriteria, setAiCriteria] = useState('Elegance and sophistication of the outfit. Style and colour coordination. Appropriateness for a formal gala dinner. Overall presentation and confidence shown in the photo.');
  const [showBdStage, setShowBdStage] = useState(false);
  const [bdStageIndex, setBdStageIndex] = useState(0);

  
  // UI State
  const [loading, setLoading] = useState(false);
  const [showStageView, setShowStageView] = useState(false);
  const [viewingPhoto, setViewingPhoto] = useState(null); // New
  const [aiRankProgress, setAiRankProgress] = useState(null); // New: { current, total, name }
  const [exportProgress, setExportProgress] = useState({ status: 'idle', current: 0, total: 0 });
  const [drawResult, setDrawResult] = useState(null);
  const [selectedPrizeId, setSelectedPrizeId] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [lastWinner, setLastWinner] = useState(null); 
  const [batchDrawResults, setBatchDrawResults] = useState([]);
  const [showBatchSummary, setShowBatchSummary] = useState(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingSub, setEditingSub] = useState(null); // { id, name, department, gender }

  const getSubmissionRank = (sub) => {
    if (sub.ai_score === null || sub.ai_score === undefined) return '—';
    const sameGenderSubs = bdSubmissions
      .filter(s => s.gender === sub.gender && s.ai_score !== null && s.ai_score !== undefined)
      .sort((a, b) => b.ai_score - a.ai_score || a.id.localeCompare(b.id));
    const rankIndex = sameGenderSubs.findIndex(s => s.id === sub.id);
    return rankIndex !== -1 ? `#${rankIndex + 1}` : '—';
  };

  const getNomineeRank = (nominee) => {
    if (nominee.ai_score === null || nominee.ai_score === undefined) return '—';
    const sameGenderNominees = bestDressNominees
      .filter(n => n.gender === nominee.gender && n.ai_score !== null && n.ai_score !== undefined)
      .sort((a, b) => b.ai_score - a.ai_score || a.id.localeCompare(b.id));
    const rankIndex = sameGenderNominees.findIndex(n => n.id === nominee.id);
    return rankIndex !== -1 ? `#${rankIndex + 1}` : '—';
  };

  const sortResults = (list, query) => {
    if (!query) return list;
    const q = query.toLowerCase();
    return [...list].sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      const idA = String(a.id || "").toLowerCase();
      const idB = String(b.id || "").toLowerCase();

      // 1. Exact Name Match
      if (nameA === q && nameB !== q) return -1;
      if (nameA !== q && nameB === q) return 1;

      // 2. Starts with Query
      const startsA = nameA.startsWith(q);
      const startsB = nameB.startsWith(q);
      if (startsA && !startsB) return -1;
      if (!startsA && startsB) return 1;

      // 3. Exact ID Match
      if (idA === q && idB !== q) return -1;
      if (idA !== q && idB === q) return 1;

      // 4. Alphabetical fallback
      return nameA.localeCompare(nameB);
    });
  };

  // Derived Session Stats
  const sessionPrizes = selectedSession ? (Array.isArray(prizes) ? prizes : []).filter(p => p.session === selectedSession) : [];
  const totalQuantity = sessionPrizes.reduce((sum, p) => sum + p.quantity, 0);
  const currentWinners = (Array.isArray(employees) ? employees : []).filter(e => sessionPrizes.some(p => p.name === e.won_prize)).length;
  const remainingToDraw = totalQuantity - currentWinners;

  // Bypass confirmations for automated browser test
  useEffect(() => {
    if (window.location.search.includes('bypassConfirm=true')) {
      window.confirm = () => true;
      window.alert = () => true;
    }
  }, []);

  // Verify auth token on mount
  useEffect(() => {
    const token = sessionStorage.getItem('adminToken');
    if (!token) { setAuthLoading(false); return; }
    axios.get('/api/admin/verify', { headers: { 'x-admin-token': token } })
      .then(r => { setAuthToken(token); setAuthUser(r.data); setAuthLoading(false); })
      .catch(() => { sessionStorage.removeItem('adminToken'); setAuthToken(null); setAuthLoading(false); });
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginBusy(true);
    try {
      const r = await axios.post('/api/admin/login', loginForm);
      sessionStorage.setItem('adminToken', r.data.token);
      setAuthToken(r.data.token);
      setAuthUser({ username: r.data.username, role: r.data.role });
    } catch (err) {
      setLoginError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    try { await axios.post('/api/admin/logout', {}, { headers: { 'x-admin-token': authToken } }); } catch {}
    sessionStorage.removeItem('adminToken');
    setAuthToken(null);
    setAuthUser(null);
  };

  useEffect(() => {
    fetchAllData();
  }, [activeModule]);

  // Debounced Save AI Criteria
  useEffect(() => {
    if (!aiCriteria) return;
    const timer = setTimeout(() => {
      axios.post('/api/best-dress/status', { criteria: aiCriteria });
    }, 1200);
    return () => clearTimeout(timer);
  }, [aiCriteria]);

  // Poll Photo Export Status if processing on load
  useEffect(() => {
    let interval;
    const checkStatus = async () => {
      try {
        const res = await axios.get('/api/best-dress/export-status');
        setExportProgress(res.data);
        if (res.data.status === 'processing') {
          if (!interval) {
            interval = setInterval(async () => {
              const resPoll = await axios.get('/api/best-dress/export-status');
              setExportProgress(resPoll.data);
              if (resPoll.data.status !== 'processing') {
                clearInterval(interval);
                interval = null;
                if (resPoll.data.status === 'completed' && resPoll.data.zipUrl) {
                  window.open(resPoll.data.zipUrl, '_blank');
                }
              }
            }, 1000);
          }
        }
      } catch (err) {
        console.error("Export status check failed", err);
      }
    };
    checkStatus();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  const handleExportPhotos = async () => {
    if (exportProgress.status === 'processing') return;
    try {
      setExportProgress({ status: 'processing', current: 0, total: bdSubmissions.length });
      await axios.post('/api/best-dress/export-start');
      
      const interval = setInterval(async () => {
        try {
          const res = await axios.get('/api/best-dress/export-status');
          setExportProgress(res.data);
          if (res.data.status !== 'processing') {
            clearInterval(interval);
            if (res.data.status === 'completed') {
              if (res.data.zipUrl) {
                window.open(res.data.zipUrl, '_blank');
                alert('🎉 Photos successfully exported and zipped! Download starting...');
              } else {
                alert('No photos found to export.');
              }
            } else if (res.data.status === 'failed') {
              alert('❌ Export failed: ' + res.data.error);
            }
          }
        } catch (pollErr) {
          clearInterval(interval);
          alert('Export polling error: ' + pollErr.message);
        }
      }, 1000);
    } catch (err) {
      alert('Failed to start export: ' + (err.response?.data?.error || err.message));
      setExportProgress({ status: 'idle', current: 0, total: 0 });
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [empRes, prizeRes, perfRes, feedRes, critRes, partRes, pStatRes, bdStatRes, bdNomRes, bdSubRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/prizes'),
        axios.get('/api/performance/results'),
        axios.get('/api/feedback/status'), 
        axios.get('/api/performance/criteria'),
        axios.get('/api/performance/participants'),
        axios.get('/api/performance/status'),
        axios.get('/api/best-dress/status'),
        axios.get('/api/best-dress/nominees'),
        axios.get('/api/best-dress/submissions'),
      ]);
      setEmployees(empRes.data);
      setPrizes(prizeRes.data);
      setPerformanceResults(perfRes.data);
      setFeedbacks(feedRes.data);
      setCriteria(critRes.data);
      setParticipants(partRes.data);
      setPerformanceStatus(pStatRes.data);
      setBestDressStatus(bdStatRes.data.best_dress_status);
      setAiCriteria(bdStatRes.data.best_dress_ai_criteria || 'Elegance and sophistication of the outfit. Style and colour coordination. Appropriateness for a formal gala dinner. Overall presentation and confidence shown in the photo.');
      setBestDressNominees(bdNomRes.data);
      setBdSubmissions(bdSubRes.data || []);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };


  const handleFileUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const endpoint = type === 'employees' ? '/api/upload' : '/api/upload-prizes';
    try {
      setLoading(true);
      setUploadStatus('Uploading...');
      const res = await axios.post(endpoint, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setUploadStatus(`Success: ${res.data.count} records processed`);
      
      // Smart sync: only fetch what's needed
      if (type === 'employees') {
        const empRes = await axios.get('/api/employees');
        setEmployees(empRes.data);
      } else {
        const prizeRes = await axios.get('/api/prizes');
        setPrizes(prizeRes.data);
      }
    } catch (err) { 
      const errMsg = err.response?.data || err.message;
      setUploadStatus(`Error: ${errMsg}`); 
      console.error("Upload failed", err);
    } finally { setLoading(false); e.target.value = null; }
  };

  const conductDraw = async () => {
    if (!selectedPrizeId) return alert("Select a prize");
    try {
      const res = await axios.post('/api/draw', { prizeId: selectedPrizeId });
      setDrawResult(res.data);
      setShowStageView(true);
    } catch (err) { alert(err.response?.data?.error || "Draw failed"); }
  };

  const handleNextDraw = async () => {
    if (!selectedSession) return alert("Please choose a session first");
    try {
      setLoading(true);
      // Find the next available prize in this session locally to prepare the stage
      const sessionPrizes = prizes.filter(p => p.session === selectedSession).sort((a,b) => b.rank - a.rank);
      let targetPrize = null;
      for (const p of sessionPrizes) {
        if (getDrawnCount(p.name) < p.quantity) {
          targetPrize = p;
          break;
        }
      }
      
      if (!targetPrize) return alert("No more prizes in this session");
      
      // We don't call the draw API yet - we just set the target prize and open the wheel
      setDrawResult({ prize: targetPrize, winner: null });
      setShowStageView(true);
    } catch (err) {
      console.error(err);
      alert("Failed to prepare next draw");
    } finally {
      setLoading(false);
    }
  };

  const handlePublishWinner = async (winner) => {
    try {
      setLoading(true);
      await axios.post('/api/draw/publish', { 
        winnerId: winner.id, 
        prizeName: drawResult.prize.name 
      });
      
      // Cleanup
      setShowStageView(false);
      setLastWinner(winner);
      setDrawResult(null);
      fetchAllData();
    } catch (err) {
      alert("Publish failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleRedraw = async () => {
    if (!lastWinner) return alert("No recent winner to redraw");
    if (!window.confirm(`Mark ${lastWinner.name} as NO-SHOW and draw again?`)) return;
    
    try {
      setLoading(true);
      const res = await axios.post('/api/draw/redraw', { 
        winnerId: lastWinner.id, 
        prizeName: drawResult?.prize?.name 
      });
      setDrawResult({ prize: drawResult.prize, winner: res.data.winner });
      setLastWinner(res.data.winner);
      setShowStageView(true);
      fetchAllData();
    } catch (err) {
      alert("Redraw failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrawAll = async () => {
    if (!selectedSession) return alert("Please choose a session first");
    if (!window.confirm(`Draw ALL remaining prizes for ${selectedSession}?`)) return;
    try {
      setLoading(true);
      const res = await axios.post('/api/draw/session-all', { session: selectedSession });
      if (res.data.success) {
        setIsProcessingBatch(true);
        setBatchDrawResults(res.data.winners || []);
        
        // Simulate the "Process" drawing
        setTimeout(() => {
          setIsProcessingBatch(false);
          setShowBatchSummary(true);
          fetchAllData();
        }, 3000); 
      }
    } catch (err) {
      alert("Batch draw failed: " + (err.response?.data || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (!selectedSession) return alert("Please choose a session first");
    if (!window.confirm(`Reset ALL winners for ${selectedSession} only?`)) return;
    try {
      setLoading(true);
      await axios.post('/api/draw/session-reset', { session: selectedSession });
      fetchAllData();
      alert("Session reset successfully");
    } catch (err) {
      alert("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const handleManualClaim = async (winnerId) => {
    try {
      setLoading(true);
      await axios.post('/api/draw/claim', { winnerId });
      fetchAllData();
    } catch (err) {
      alert(err.response?.data?.error || "Claim failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUnclaim = async (winnerId) => {
    if (!window.confirm("Undo claim for this winner?")) return;
    try {
      setLoading(true);
      await axios.post('/api/draw/unclaim', { winnerId });
      fetchAllData();
    } catch (err) {
      alert("Unclaim failed");
    } finally {
      setLoading(false);
    }
  };

  const saveItem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const isEmployee = activeModule === 'employees';
    const isPerformance = activeModule === 'performance';
    
    let data;
    if (isEmployee) {
      data = { name: formData.get('name'), department: formData.get('department'), won_prize: editingItem?.won_prize || null };
    } else if (isPerformance) {
      data = { 
        name: formData.get('name'), 
        song_name: formData.get('song_name'), 
        department: formData.get('department'),
        sequence: parseInt(formData.get('sequence') || 0)
      };
    } else {
      data = { session: formData.get('session'), rank: parseInt(formData.get('rank')), name: formData.get('name'), quantity: parseInt(formData.get('quantity')) };
    }

    const endpoint = isEmployee ? '/api/employees' : (isPerformance ? '/api/performance/participants' : '/api/prizes');
    try {
      if (editingItem) await axios.put(`${endpoint}/${editingItem.id}`, data);
      else await axios.post(endpoint, data);
      setIsModalOpen(false); fetchAllData();
    } catch (err) { alert("Save failed"); }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Confirm deletion?")) return;
    const endpoint = activeModule === 'employees' ? '/api/employees' : '/api/prizes';
    await axios.delete(`${endpoint}/${id}`);
    fetchAllData();
  };

  const getDrawnCount = (prizeName) => {
    return (employees || []).filter(e => e.won_prize === prizeName).length;
  };

  const SidebarItem = ({ id, label, icon }) => (
    <button className={`sidebar-item ${activeModule === id ? 'active' : ''}`} onClick={() => setActiveModule(id)}>
      <span className="icon">{icon}</span><span className="label">{label}</span>
    </button>
  );

  // ── Login Screen ────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0f172a', fontFamily:"'Outfit',sans-serif" }}>
        <div style={{ color:'#64748b', fontSize:'1.1rem' }}>Verifying session…</div>
      </div>
    );
  }

  if (!authToken) {
    return (
      <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Outfit',sans-serif" }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
          .login-input { width:100%; padding:0.85rem 1rem; border-radius:12px; border:1.5px solid #334155; background:#1e293b; color:#f1f5f9; font-size:1rem; font-family:inherit; outline:none; transition:border 0.2s; box-sizing:border-box; }
          .login-input:focus { border-color:#0A8276; }
          .login-btn { width:100%; padding:0.9rem; border-radius:12px; border:none; background:linear-gradient(135deg,#0A8276,#0369a1); color:white; font-size:1rem; font-weight:800; cursor:pointer; font-family:inherit; transition:opacity 0.2s; }
          .login-btn:hover { opacity:0.9; }
          .login-btn:disabled { opacity:0.5; cursor:not-allowed; }
        `}</style>
        <div style={{ background:'#1e293b', borderRadius:'24px', padding:'3rem 2.5rem', width:'100%', maxWidth:'400px', boxShadow:'0 25px 60px rgba(0,0,0,0.5)', border:'1px solid #334155' }}>
          <div style={{ textAlign:'center', marginBottom:'2rem' }}>
            <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🔐</div>
            <h1 style={{ color:'#f1f5f9', fontSize:'1.6rem', fontWeight:900, letterSpacing:'-0.5px' }}>Admin Login</h1>
            <p style={{ color:'#64748b', fontSize:'0.85rem', marginTop:'0.3rem' }}>2026 Infineon Appreciation Dinner</p>
          </div>
          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
            <div>
              <label style={{ color:'#94a3b8', fontSize:'0.8rem', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:'0.4rem' }}>Username</label>
              <input id="admin-username" className="login-input" type="text" autoComplete="username" value={loginForm.username} onChange={e => setLoginForm(f => ({...f, username: e.target.value}))} placeholder="admin" required />
            </div>
            <div>
              <label style={{ color:'#94a3b8', fontSize:'0.8rem', fontWeight:700, letterSpacing:'1px', textTransform:'uppercase', display:'block', marginBottom:'0.4rem' }}>Password</label>
              <input id="admin-password" className="login-input" type="password" autoComplete="current-password" value={loginForm.password} onChange={e => setLoginForm(f => ({...f, password: e.target.value}))} placeholder="••••••••" required />
            </div>
            {loginError && <div style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'10px', padding:'0.65rem 1rem', color:'#f87171', fontSize:'0.85rem', fontWeight:600 }}>⚠ {loginError}</div>}
            <button id="admin-login-btn" className="login-btn" type="submit" disabled={loginBusy}>{loginBusy ? 'Signing in…' : 'Sign In'}</button>
          </form>
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="modern-admin-layout">
      <aside className="modern-sidebar">
        <div className="sidebar-header">
          <div className="brand">Event<span>Admin</span></div>
          <div className="env-pill">Production</div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-group">
            <div className="group-label">Core Management</div>
            <SidebarItem id="lucky-draw" label="Lucky Draw" icon="🎪" />
          </div>
          <div className="nav-group">
            <div className="group-label">Event Features</div>
            <SidebarItem id="performance" label="Performance" icon="🎭" />
            <SidebarItem id="best-dress" label="Best Dress" icon="👗" />
            <SidebarItem id="feedback" label="Guest Feedback" icon="💬" />
          </div>
          <div className="nav-group">
            <div className="group-label">System</div>
            <SidebarItem id="admin-users" label="Admin Users" icon="👤" />
          </div>
        </nav>
        <div className="sidebar-footer">
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem', padding:'0.6rem 0.75rem', background:'rgba(10,130,118,0.12)', borderRadius:'10px', marginBottom:'0.75rem' }}>
            <span style={{ fontSize:'1.1rem' }}>👤</span>
            <div style={{ flex:1, overflow:'hidden' }}>
              <div style={{ color:'#0A8276', fontWeight:800, fontSize:'0.82rem', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>{authUser?.username || 'admin'}</div>
              <div style={{ color:'#64748b', fontSize:'0.68rem', textTransform:'uppercase', letterSpacing:'1px' }}>{authUser?.role || 'admin'}</div>
            </div>
            <button onClick={handleLogout} title="Logout" style={{ background:'none', border:'none', cursor:'pointer', color:'#ef4444', fontSize:'1rem', padding:'2px' }}>⏏</button>
          </div>
          <Link to="/" className="back-link">← Back to Dashboard</Link>
          <div className="site-version">Revision: {SITE_VERSION}</div>
        </div>
      </aside>

      <main className="modern-content">
        <header className="content-header">
          <div className="header-info">
            <h1>{activeModule.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h1>
            <p>2026 Infineon Penang Appreciation Dinner Admin Panel · <VersionBadge /></p>
          </div>
          <div className="header-actions">
            <div className="upload-indicator">{uploadStatus}</div>
            <button className="refresh-btn" onClick={fetchAllData}>↻ Sync Data</button>
          </div>
        </header>

        {loading && <div className="loading-bar"></div>}

        <div className="scroll-container">
          {activeModule === 'lucky-draw' && (
            <div className="module-grid" style={{ display:'flex', flexDirection:'column', gap:'2rem' }}>

              {/* === UPLOAD SECTION === */}
              <div style={{ display:'flex', gap:'2rem', flexWrap:'wrap' }}>

                {/* Upload Winners Results */}
                <div className="card shadow-card" style={{ flex:1, minWidth:'280px' }}>
                  <h3 style={{ marginBottom:'0.4rem' }}>🏆 Upload Winners Result</h3>
                  <p style={{ color:'#64748b', fontSize:'0.85rem', marginBottom:'1.25rem' }}>
                    Upload CSV with columns: <strong>name, prize, department</strong>.<br/>
                    Uploading to a session will clear that session's previous results.
                  </p>
                  
                  <div style={{ display:'flex', gap:'1rem', flexWrap:'wrap' }}>
                    <label style={{ flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', background:'#0A8276', color:'white', padding:'0.65rem 1.2rem', borderRadius:'10px', cursor:'pointer', fontWeight:700, fontSize:'0.9rem', textAlign:'center' }}>
                      📤 Session 1 Winners
                      <input type="file" accept=".csv" style={{ display:'none' }}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          if (!confirm('This will REPLACE Session 1 winners. Continue?')) { e.target.value=''; return; }
                          const fd = new FormData();
                          fd.append('file', file);
                          fd.append('session', 'Session 1');
                          try {
                            setLoading(true);
                            setUploadStatus('Publishing Session 1 results…');
                            const r = await axios.post('/api/upload-winners', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
                            setUploadStatus(`✅ ${r.data.matched} Session 1 winners published`);
                            fetchAllData();
                          } catch(err) { setUploadStatus('❌ ' + (err.response?.data || err.message)); }
                          finally { setLoading(false); e.target.value = ''; }
                        }}
                      />
                    </label>

                    <label style={{ flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'0.5rem', background:'#1e293b', color:'white', padding:'0.65rem 1.2rem', borderRadius:'10px', cursor:'pointer', fontWeight:700, fontSize:'0.9rem', textAlign:'center' }}>
                      📤 Session 2 Winners
                      <input type="file" accept=".csv" style={{ display:'none' }}
                        onChange={async (e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          if (!confirm('This will REPLACE Session 2 winners. Continue?')) { e.target.value=''; return; }
                          const fd = new FormData();
                          fd.append('file', file);
                          fd.append('session', 'Session 2');
                          try {
                            setLoading(true);
                            setUploadStatus('Publishing Session 2 results…');
                            const r = await axios.post('/api/upload-winners', fd, { headers:{ 'Content-Type':'multipart/form-data' } });
                            setUploadStatus(`✅ ${r.data.matched} Session 2 winners published`);
                            fetchAllData();
                          } catch(err) { setUploadStatus('❌ ' + (err.response?.data || err.message)); }
                          finally { setLoading(false); e.target.value = ''; }
                        }}
                      />
                    </label>
                  </div>
                  {uploadStatus && <p style={{ marginTop:'0.75rem', fontSize:'0.82rem', color:'#0A8276', fontWeight:700 }}>{uploadStatus}</p>}
                </div>
              </div>

              {/* === WINNERS TABLE === */}
              <div className="card shadow-card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'1rem' }}>
                  <div>
                    <h3 style={{ margin:0 }}>🎁 Published Results ({employees.filter(e => e.won_prize).length} winners)</h3>
                    <p style={{ color:'#64748b', fontSize:'0.82rem', margin:'4px 0 0' }}>Employees will see these results when they search their name on the front page.</p>
                  </div>
                  <button
                    style={{ background:'rgba(239,68,68,0.08)', color:'#ef4444', border:'1px solid #ef4444', padding:'0.5rem 1rem', borderRadius:'8px', fontWeight:700, cursor:'pointer', fontSize:'0.85rem' }}
                    onClick={async () => {
                      if (!confirm('Clear ALL winner results? Employees will no longer see prizes.')) return;
                      await axios.post('/api/reset-draw');
                      fetchAllData();
                      setUploadStatus('');
                    }}
                  >⚠️ Clear All Results</button>
                </div>

                <input
                  type="text"
                  placeholder="Search by name or department…"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  style={{ width:'100%', padding:'0.75rem 1rem', borderRadius:'10px', border:'1px solid #e2e8f0', fontSize:'0.95rem', marginBottom:'1.25rem', boxSizing:'border-box' }}
                />

                <table className="modern-table">
                  <thead><tr><th>NAME</th><th>DEPARTMENT</th><th>PRIZE WON</th></tr></thead>
                  <tbody>
                    {employees
                      .filter(e => e.won_prize)
                      .filter(e =>
                        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (e.department && e.department.toLowerCase().includes(searchTerm.toLowerCase())) ||
                        (e.won_prize && e.won_prize.toLowerCase().includes(searchTerm.toLowerCase()))
                      )
                      .map(e => (
                        <tr key={e.id}>
                          <td className="bold">{e.name}</td>
                          <td style={{ color:'#64748b' }}>{e.department}</td>
                          <td>
                             <span style={{ background:'rgba(10,130,118,0.1)', color:'#0A8276', padding:'3px 10px', borderRadius:'99px', fontWeight:800, fontSize:'0.82rem' }}>{e.won_prize}</span>
                             {e.prize_session && <span style={{ marginLeft:'0.5rem', background:'#f1f5f9', color:'#64748b', padding:'3px 10px', borderRadius:'99px', fontWeight:800, fontSize:'0.75rem' }}>{e.prize_session}</span>}
                          </td>
                        </tr>
                      ))
                    }
                    {employees.filter(e => e.won_prize).length === 0 && (
                      <tr><td colSpan="3" style={{ textAlign:'center', color:'#94a3b8', padding:'3rem' }}>No results yet. Upload a Winners CSV above to publish results.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Performance and other modules remain the same as previous logic but with consistent styling */}
          {activeModule === 'performance' && (
            <div className="performance-module">
              <div className="tabs-strip">
                <button className={activeSubTab === 'p-entries' ? 'active' : ''} onClick={() => setActiveSubTab('p-entries')}>Participants</button>
                <button className={activeSubTab === 'p-config' ? 'active' : ''} onClick={() => setActiveSubTab('p-config')}>Voting Config</button>
                <button className={activeSubTab === 'p-results' ? 'active' : ''} onClick={() => setActiveSubTab('p-results')}>Rankings</button>
              </div>

              {activeSubTab === 'p-entries' && (
                <div className="card shadow-card">
                  <div className="card-header-actions">
                    <h3>Performance Entries ({participants.length})</h3>
                    <button className="modern-add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>+ Add Performer</button>
                  </div>
                  <table className="modern-table">
                    <thead><tr><th>SEQ</th><th>NAME</th><th>SONG</th><th>DEPT</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                      {participants.map(p => (
                        <tr key={p.id}>
                          <td className="bold" style={{ color: '#0A8276' }}>#{p.sequence || 0}</td>
                          <td className="bold">{p.name}</td>
                          <td className="text-teal">{p.song_name}</td>
                          <td>{p.department}</td>
                          <td>
                            <button onClick={() => { setEditingItem(p); setIsModalOpen(true); }} className="table-btn">Edit</button>
                            <button onClick={async () => { if(confirm('Delete?')) { await axios.delete(`/api/performance/participants/${p.id}`); fetchAllData(); } }} className="table-btn" style={{color: '#f43f5e'}}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeSubTab === 'p-config' && (
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div className="card shadow-card" style={{ flex: 1 }}>
                    <h3>Voting Master Switch</h3>
                    <div style={{ margin: '2rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div className={`status-pill ${performanceStatus?.voting_status === 'OPEN' ? 'open' : 'closed'}`}>
                        {performanceStatus?.voting_status === 'OPEN' ? '🟢 VOTING OPEN' : '🔴 VOTING CLOSED'}
                      </div>
                      <button 
                        className={`modern-add-btn ${performanceStatus?.voting_status === 'OPEN' ? 'danger-btn' : ''}`}
                        onClick={async () => {
                          const newStatus = performanceStatus?.voting_status === 'OPEN' ? 'CLOSED' : 'OPEN';
                          await axios.post('/api/performance/status', { status: newStatus });
                          fetchAllData();
                        }}
                      >
                        {performanceStatus?.voting_status === 'OPEN' ? 'Stop Voting Now' : 'Start Performance Voting'}
                      </button>
                      <button 
                        className="table-btn" 
                        style={{ color: '#f43f5e', border: '1px solid #f43f5e', padding: '0.6rem 1rem', borderRadius: '8px' }}
                        onClick={async () => {
                          if (confirm('⚠️ WARNING: This will DELETE ALL GUEST VOTES and RESET MANUAL SCORES to 0. Are you sure?')) {
                            await axios.post('/api/performance/reset');
                            fetchAllData();
                            alert('All performance data has been reset.');
                          }
                        }}
                      >
                        Reset ALL Scores
                      </button>
                    </div>
                  </div>
                  <div className="card shadow-card" style={{ flex: 1 }}>
                    <h3>Scoring Criteria</h3>
                    <table className="modern-table">
                      <thead><tr><th>CATEGORY</th><th>ACTION</th></tr></thead>
                      <tbody>
                        {criteria.map(c => (
                          <tr key={c.id}>
                            <td>
                              <input 
                                className="inline-edit-input"
                                defaultValue={c.name}
                                onBlur={async (e) => {
                                  await axios.put(`/api/performance/criteria/${c.id}`, { name: e.target.value });
                                  fetchAllData();
                                }}
                              />
                            </td>
                            <td style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Auto-saves on blur</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeSubTab === 'p-results' && (
                <div className="card shadow-card">
                  <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap' }}>
                    <div>
                      <h3 style={{ margin:0 }}>Performance Rankings</h3>
                      <p style={{ margin:'4px 0 0', color:'#94a3b8', fontSize:'0.82rem', fontWeight:600 }}>
                        {performanceRankType === 'general' ? 'Overall = Guest Score + Admin Score' : 'Ranked by Average Costume Score only'}
                      </p>
                    </div>
                    <div style={{ display:'flex', gap:'4px', background:'#f1f5f9', padding:'4px', borderRadius:'10px' }}>
                      <button 
                        onClick={() => setPerformanceRankType('general')}
                        style={{ padding:'0.5rem 1rem', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'0.85rem', transition:'0.2s', background: performanceRankType === 'general' ? '#0A8276' : 'transparent', color: performanceRankType === 'general' ? 'white' : '#64748b' }}
                      >
                        General Rank
                      </button>
                      <button 
                        onClick={() => setPerformanceRankType('costume')}
                        style={{ padding:'0.5rem 1rem', border:'none', borderRadius:'8px', cursor:'pointer', fontWeight:700, fontSize:'0.85rem', transition:'0.2s', background: performanceRankType === 'costume' ? '#0A8276' : 'transparent', color: performanceRankType === 'costume' ? 'white' : '#64748b' }}
                      >
                        Costume Ranking
                      </button>
                    </div>
                  </div>

                  <table className="modern-table">
                    {performanceRankType === 'general' ? (
                      <thead>
                        <tr>
                          <th>RANK</th>
                          <th>PERFORMER</th>
                          <th style={{color:'#0A8276'}}>GUEST SCORE</th>
                          <th>ADMIN SCORE</th>
                          <th>OVERALL</th>
                          <th>VOTES</th>
                        </tr>
                      </thead>
                    ) : (
                      <thead>
                        <tr>
                          <th>RANK</th>
                          <th>PERFORMER</th>
                          <th style={{color:'#0A8276'}}>COSTUME (Avg)</th>
                          <th>ADMIN SCORE</th>
                          <th>OVERALL</th>
                          <th>VOTES</th>
                        </tr>
                      </thead>
                    )}
                    <tbody>
                      {Array.isArray(performanceResults) && [...performanceResults]
                        .sort((a, b) => {
                          const s1A = parseFloat(a.s1) || 0;
                          const s2A = parseFloat(a.s2) || 0;
                          const s3A = parseFloat(a.costume_score) || 0;
                          const scoreA = performanceRankType === 'general' ? ((s1A + s2A) * 7) : (s3A * 7);
                          const totalA = scoreA + (parseFloat(a.manual_score) || 0);

                          const s1B = parseFloat(b.s1) || 0;
                          const s2B = parseFloat(b.s2) || 0;
                          const s3B = parseFloat(b.costume_score) || 0;
                          const scoreB = performanceRankType === 'general' ? ((s1B + s2B) * 7) : (s3B * 7);
                          const totalB = scoreB + (parseFloat(b.manual_score) || 0);
                          
                          return totalB - totalA;
                        })
                        .map((r, i) => {
                          const s1 = parseFloat(r.s1) || 0;
                          const s2 = parseFloat(r.s2) || 0;
                          const s3 = parseFloat(r.costume_score) || 0;
                          const baseScore = performanceRankType === 'general' ? ((s1 + s2) * 7) : (s3 * 7);
                          const overall = (baseScore + (parseFloat(r.manual_score) || 0)).toFixed(2);
                          
                          return (
                            <tr key={r.id || i}>
                              <td style={{fontWeight: 900, color: '#94a3b8'}}>#{i+1}</td>
                              <td>
                                <div className="bold">{r.name}</div>
                                <div style={{fontSize: '0.8rem', color: '#64748b', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                  <span>{r.song_name}</span>
                                  {r.sequence !== undefined && r.sequence !== null && (
                                    <span style={{ background: '#f1f5f9', color: '#64748b', padding: '2px 6px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                                      Seq #{r.sequence}
                                    </span>
                                  )}
                                </div>
                              </td>
                              
                              <td className="bold text-teal">
                                {performanceRankType === 'general' ? baseScore.toFixed(2) : ((parseFloat(r.costume_score) || 0) * 7).toFixed(2)}
                              </td>

                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <input 
                                    type="number" 
                                    step="any"
                                    className="inline-edit-input" 
                                    style={{ width: '80px', border: '1px solid #e2e8f0', textAlign: 'center' }}
                                    value={r.manual_score || 0}
                                    onChange={async (e) => {
                                      const newVal = parseFloat(e.target.value) || 0;
                                      const updatedResults = performanceResults.map(item => {
                                        if (item.id === r.id) {
                                          return { ...item, manual_score: newVal };
                                        }
                                        return item;
                                      });
                                      setPerformanceResults(updatedResults);
                                      
                                      clearTimeout(window.perfSaveTimeout);
                                      window.perfSaveTimeout = setTimeout(async () => {
                                        try {
                                          await axios.put(`/api/performance/participants/${r.id}/manual-score`, { score: newVal });
                                        } catch (err) { console.error("Auto-save failed", err); }
                                      }, 500);
                                    }}
                                  />
                                </div>
                              </td>
                              <td className="bold" style={{fontSize: '1.2rem', color: '#0a8276'}}>{overall}</td>
                              <td>{r.vote_count}</td>
                            </tr>
                          );
                        })
                      }
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeModule === 'best-dress' && (
            <div className="best-dress-module">
              <div className="tabs-strip">
                <button className={activeBdSubTab === 'config' ? 'active' : ''} onClick={() => setActiveBdSubTab('config')}>Setup & Config</button>
                <button className={activeBdSubTab === 'submissions' ? 'active' : ''} onClick={() => setActiveBdSubTab('submissions')}>Photo Submissions ({bdSubmissions.length})</button>
                <button className={activeBdSubTab === 'finalists' ? 'active' : ''} onClick={() => setActiveBdSubTab('finalists')}>Voting Finalists ({bestDressNominees.length})</button>
              </div>

              {activeBdSubTab === 'config' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  <div style={{ display: 'flex', gap: '2rem' }}>
                    <div className="card shadow-card" style={{ flex: 1 }}>
                      <h3>Best Dress Status</h3>
                      <div style={{ margin: '1rem 0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className={`status-pill ${bestDressStatus === 'CLOSED' ? 'closed' : 'open'}`}>
                          {bestDressStatus === 'CLOSED' && '🔴 CLOSED'}
                          {bestDressStatus === 'NOMINATING' && '🟡 NOMINATING'}
                          {bestDressStatus === 'VOTING' && '🟢 VOTING LIVE'}
                        </div>
                        <select 
                          value={bestDressStatus} 
                          className="modern-select"
                          style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontWeight: 700 }}
                          onChange={async (e) => {
                            const newStat = e.target.value;
                            await axios.post('/api/best-dress/status', { status: newStat });
                            setBestDressStatus(newStat);
                            fetchAllData();
                          }}
                        >
                          <option value="CLOSED">CLOSED</option>
                          <option value="NOMINATING">NOMINATING</option>
                          <option value="VOTING">VOTING</option>
                        </select>
                        <button 
                          className="table-btn" 
                          style={{ color: '#f43f5e', border: '1px solid #f43f5e' }}
                          onClick={async () => {
                            if (confirm('RESET ALL Best Dress nominations and votes? This cannot be undone.')) {
                              await axios.post('/api/best-dress/reset');
                              fetchAllData();
                            }
                          }}
                        >
                          Reset All
                        </button>
                      </div>
                    </div>
                    <div className="card shadow-card" style={{ flex: 1 }}>
                      <h3>Quick Add Finalist</h3>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <input id="new-nominee" className="modern-input" placeholder="Enter name..." />
                        <button className="modern-add-btn" onClick={async () => {
                          const name = document.getElementById('new-nominee').value;
                          if (!name) return;
                          await axios.post('/api/best-dress/nominees', { name });
                          document.getElementById('new-nominee').value = '';
                          fetchAllData();
                        }}>Add</button>
                      </div>
                    </div>
                  </div>

                  <div className="card shadow-card" style={{ background:'linear-gradient(135deg,#f5f3ff,#ede9fe)', border:'1px solid #c4b5fd' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', gap:'1rem' }}>
                      <div style={{ fontSize:'2rem' }}>🤖</div>
                      <div style={{ flex:1 }}>
                        <h4 style={{ margin:'0 0 4px', color:'#6d28d9', fontWeight:800 }}>AI Judging Criteria</h4>
                        <p style={{ margin:'0 0 8px', fontSize:'0.78rem', color:'#7c3aed' }}>Gemini will score each photo based on these criteria. Edit to customise what the AI looks for.</p>
                        <textarea
                          value={aiCriteria}
                          onChange={e => setAiCriteria(e.target.value)}
                          rows={3}
                          style={{ width:'100%', borderRadius:'10px', border:'1px solid #c4b5fd', padding:'0.6rem 0.75rem', fontFamily:'Outfit,sans-serif', fontSize:'0.82rem', color:'#1D1D1D', resize:'vertical', boxSizing:'border-box', background:'#fff' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeBdSubTab === 'submissions' && (
                <div className="card shadow-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                    <div>
                      <h3 style={{ margin:0 }}>Photo Submissions ({bdSubmissions.length})</h3>
                      <p style={{ color:'#64748b', fontSize:'0.8rem', margin:'4px 0 0' }}>Click a photo to view full size. Click AI Rank to auto-select top 3M + 3F.</p>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                      {aiRankProgress && (
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:'0.75rem', fontWeight:800, color:'#0A8276' }}>AI Ranking: {aiRankProgress.current} / {aiRankProgress.total}</div>
                          <div style={{ width:'120px', height:'6px', background:'#e2e8f0', borderRadius:'3px', marginTop:'4px', overflow:'hidden' }}>
                            <div style={{ width: `${(aiRankProgress.current / aiRankProgress.total) * 100}%`, height:'100%', background:'#0A8276', transition:'width 0.3s' }} />
                          </div>
                        </div>
                      )}
                      {exportProgress.status === 'processing' && (
                        <div style={{ textAlign:'right', marginRight:'1rem' }}>
                          <div style={{ fontSize:'0.75rem', fontWeight:800, color:'#0A8276' }}>Exporting: {exportProgress.current} / {exportProgress.total}</div>
                          <div style={{ width:'120px', height:'6px', background:'#e2e8f0', borderRadius:'3px', marginTop:'4px', overflow:'hidden' }}>
                            <div style={{ width: `${(exportProgress.current / (exportProgress.total || 1)) * 100}%`, height:'100%', background:'#0A8276', transition:'width 0.3s' }} />
                          </div>
                        </div>
                      )}
                      <button
                        className="modern-add-btn"
                        style={{ background:'#1e293b' }}
                        onClick={() => setShowBdStage(true)}
                      >📺 Live Stage View</button>
                      <button
                        className="modern-add-btn"
                        disabled={exportProgress.status === 'processing'}
                        style={{ background:'#0a8276', color:'white', opacity: exportProgress.status === 'processing' ? 0.6 : 1 }}
                        onClick={handleExportPhotos}
                      >
                        {exportProgress.status === 'processing' ? '📥 Exporting...' : '📥 Export & Download'}
                      </button>
                      <button
                        className="modern-add-btn"
                        disabled={!!aiRankProgress}
                        style={{ background:'rgba(239,68,68,0.08)', color:'#ef4444', border:'1px solid #ef4444', opacity: aiRankProgress ? 0.6 : 1 }}
                        onClick={async () => {
                          if (!confirm('Are you sure you want to reset all AI scores and reasoning? This will also clear current AI-promoted finalists.')) return;
                          try {
                            await axios.post('/api/best-dress/reset-ai-rank');
                            fetchAllData();
                            alert('AI Ranks and finalists have been reset.');
                          } catch (e) {
                            alert('Reset failed: ' + (e.response?.data?.error || e.message));
                          }
                        }}
                      >🔄 Reset AI Rank</button>
                      <button
                        className="modern-add-btn"
                        disabled={!!aiRankProgress}
                        style={{ background:'linear-gradient(135deg,#7c3aed,#0A8276)', whiteSpace:'nowrap', opacity: aiRankProgress ? 0.6 : 1 }}
                        onClick={async () => {
                          const subsWithPhotos = bdSubmissions.filter(s => s.has_photo || s.photo_data);
                          if (subsWithPhotos.length === 0) return alert('No photos to rank');
                          if (!confirm(`Run AI ranking for ${subsWithPhotos.length} photos? This will replace current finalists.`)) return;
                          
                          try {
                            setAiRankProgress({ current: 0, total: subsWithPhotos.length, name: 'Starting...' });
                            
                            // Process each photo individually for real progress tracking
                            for (let i = 0; i < subsWithPhotos.length; i++) {
                              const sub = subsWithPhotos[i];
                              setAiRankProgress({ current: i + 1, total: subsWithPhotos.length, name: sub.name });
                              
                              let success = false;
                              let attempts = 0;
                              const maxAttempts = 5;
                              
                              while (!success && attempts < maxAttempts) {
                                try {
                                  await axios.post('/api/best-dress/ai-score-single', { id: sub.id, criteria: aiCriteria });
                                  success = true;
                                } catch (innerErr) {
                                  attempts++;
                                  const isRateLimit = innerErr.response?.status === 429;
                                  if (isRateLimit && attempts < maxAttempts) {
                                    const retryAfter = innerErr.response?.data?.retryAfter || 30;
                                    setAiRankProgress({ 
                                      current: i + 1, 
                                      total: subsWithPhotos.length, 
                                      name: `Waiting ${retryAfter}s (Rate Limit)...` 
                                    });
                                    await new Promise(r => setTimeout(r, (retryAfter + 1) * 1000));
                                  } else {
                                    console.error(`Failed to score ${sub.name}:`, innerErr);
                                    break;
                                  }
                                }
                              }
                              // Small delay to stay under Gemini 15 RPM limit (one req every 4s minimum, using 5s to be safe)
                              await new Promise(r => setTimeout(r, 5000));
                            }
                            
                            setAiRankProgress({ current: subsWithPhotos.length, total: subsWithPhotos.length, name: 'Finalizing...' });
                            await axios.post('/api/best-dress/ai-promote');
                            
                            setTimeout(() => {
                              setAiRankProgress(null);
                              fetchAllData();
                              alert('✅ AI Ranking Complete! Top finalists have been promoted.');
                            }, 800);
                          } catch(e) { 
                            setAiRankProgress(null);
                            alert('AI Rank failed: ' + (e.response?.data?.error || e.message)); 
                          }
                        }}
                      >{aiRankProgress ? '⌛ Processing...' : 'AI Rank (Gemini)'}</button>
                    </div>
                  </div>
                  
                  {/* Criteria Summary in Submissions Tab */}
                  <div style={{ marginBottom:'1.5rem', background:'#f0f9ff', padding:'0.75rem 1rem', borderRadius:'12px', border:'1px solid #e0f2fe', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:'0.75rem', color:'#0369a1', fontStyle:'italic' }}>
                      <strong>AI Criteria:</strong> {aiCriteria.length > 80 ? aiCriteria.substring(0, 80) + '...' : aiCriteria}
                    </div>
                    <button 
                      onClick={() => setActiveBdSubTab('config')}
                      style={{ background:'white', border:'1px solid #bae6fd', padding:'4px 10px', borderRadius:'6px', fontSize:'0.7rem', fontWeight:700, color:'#0369a1', cursor:'pointer' }}
                    >Edit Prompt</button>
                  </div>

                  {/* Shortlist Counter Summary */}
                  <div style={{ marginBottom:'1.5rem', background:'#fffbeb', padding:'0.75rem 1.25rem', borderRadius:'12px', border:'1px solid #fef3c7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div style={{ fontSize:'0.9rem', color:'#d97706', fontWeight:800 }}>
                      👑 Shortlisted Finalists: <span style={{ color:'#b45309' }}>{bestDressNominees.filter(n => n.gender === 'Female').length} Females</span>, <span style={{ color:'#b45309' }}>{bestDressNominees.filter(n => n.gender === 'Male').length} Males</span>
                    </div>
                    <div style={{ fontSize:'0.75rem', color:'#78350f', fontStyle:'italic' }}>
                      Committee pick goal: Top 3 Male + 3 Female
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'1.5rem', maxHeight:'650px', overflowY:'auto', padding:'4px' }}>
                    {bdSubmissions.map(sub => (
                      <div key={sub.id} style={{ background:'#f8fafc', borderRadius:'20px', padding:'1rem', border:'1px solid #e2e8f0', textAlign:'center', transition:'0.2s' }}>
                        <div 
                          style={{ cursor:'pointer', position:'relative', borderRadius:'14px', overflow:'hidden', marginBottom:'0.75rem', height:'160px', background:'#e2e8f0', display:'flex', alignItems:'center', justifyContent:'center' }}
                          onClick={() => sub.has_photo && setViewingPhoto(`/api/photos/bd/sub/${sub.id}`)}
                        >
                          {sub.has_photo
                            ? <img src={`/api/photos/bd/sub/${sub.id}`} alt={sub.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <span style={{ fontSize:'2.5rem' }}>📷</span>
                          }
                          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.2)', opacity:0, transition:'0.2s', display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontSize:'0.8rem', fontWeight:800 }} className="photo-hover">VIEW FULL</div>
                        </div>
                        <div style={{ fontWeight:800, fontSize:'0.9rem', color:'#1e293b', marginBottom:'2px' }}>{sub.name}</div>
                        <div style={{ fontSize:'0.75rem', color:'#64748b' }}>{sub.department}</div>
                        <div style={{ marginTop:'6px' }}>
                          <span style={{ background: sub.gender==='Female' ? 'rgba(236,72,153,0.1)' : 'rgba(99,102,241,0.1)', color: sub.gender==='Female' ? '#db2777' : '#4f46e5', padding:'3px 10px', borderRadius:'99px', fontSize:'0.72rem', fontWeight:700 }}>
                            {sub.gender}
                          </span>
                        </div>
                        
                        <div style={{ marginTop:'10px', padding:'8px', background:'white', borderRadius:'12px', border:'1px solid #f1f5f9' }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'4px' }}>
                            <span style={{ fontSize:'0.7rem', color:'#94a3b8', fontWeight:700 }}>AI RANK</span>
                            <span style={{ fontSize:'0.85rem', color:'#0A8276', fontWeight:900 }}>{getSubmissionRank(sub)}</span>
                          </div>
                          <div style={{ fontSize:'0.68rem', color:'#64748b', fontStyle:'italic', lineHeight:1.3, textAlign:'left', minHeight:'32px' }}>
                            {sub.ai_reasoning || 'No feedback yet...'}
                          </div>
                        </div>

                        {(() => {
                          const isShortlisted = bestDressNominees.some(n => n.submission_id === sub.id);
                          return (
                            <button
                              onClick={async () => {
                                try {
                                  if (isShortlisted) {
                                    await axios.post('/api/best-dress/unshortlist', { submissionId: sub.id });
                                  } else {
                                    await axios.post('/api/best-dress/shortlist', { submissionId: sub.id });
                                  }
                                  fetchAllData();
                                } catch (err) {
                                  alert('Failed to update shortlist');
                                }
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                borderRadius: '10px',
                                border: isShortlisted ? 'none' : '1px solid #d97706',
                                background: isShortlisted ? 'linear-gradient(135deg,#f59e0b,#d97706)' : 'white',
                                color: isShortlisted ? 'white' : '#d97706',
                                fontSize: '0.8rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                marginTop: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px',
                                boxShadow: isShortlisted ? '0 4px 10px rgba(217, 119, 6, 0.2)' : 'none',
                                transition: '0.2s'
                              }}
                            >
                              {isShortlisted ? '★ Shortlisted' : '☆ Shortlist'}
                            </button>
                          );
                        })()}

                        <div style={{ display:'flex', gap:'6px', marginTop:'12px' }}>
                          <label style={{ flex:1, padding:'6px', borderRadius:'10px', border:'1px solid #bbf7d0', background:'#f0fdf4', color:'#15803d', fontSize:'0.72rem', fontWeight:700, cursor:'pointer', textAlign:'center' }}>
                            📷
                            <input type="file" accept="image/*" style={{ display:'none' }}
                              onChange={async (e) => {
                                const file = e.target.files[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  try {
                                    await axios.patch(`/api/best-dress/submissions/${sub.id}/photo`, { photo_data: ev.target.result });
                                    fetchAllData();
                                  } catch(err) { alert('Photo upload failed'); }
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          <button
                            onClick={() => setEditingSub({ id: sub.id, name: sub.name, department: sub.department, gender: sub.gender, ai_reasoning: sub.ai_reasoning })}
                            style={{ flex:1, padding:'6px', borderRadius:'10px', border:'1px solid #bae6fd', background:'#f0f9ff', color:'#0369a1', fontSize:'0.72rem', fontWeight:700, cursor:'pointer' }}
                          >✏️</button>
                          <button
                            onClick={async () => {
                              if (!confirm(`Delete ${sub.name}'s submission?`)) return;
                              await axios.delete(`/api/best-dress/submissions/${sub.id}`);
                              fetchAllData();
                            }}
                            style={{ flex:1, padding:'6px', borderRadius:'10px', border:'1px solid #fca5a5', background:'#fef2f2', color:'#ef4444', fontSize:'0.72rem', fontWeight:700, cursor:'pointer' }}
                          >🗑️</button>
                        </div>
                      </div>
                    ))}
                    {bdSubmissions.length === 0 && <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#94a3b8', padding:'3rem' }}>No submissions yet</div>}
                  </div>
                </div>
              )}

              {activeBdSubTab === 'finalists' && (
                <div className="card shadow-card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                    <div>
                      <h3 style={{ marginBottom:'0.5rem' }}>Voting Finalists ({bestDressNominees.length})</h3>
                      <p style={{ color: '#64748b', fontSize: '0.85rem', margin:0 }}>These are the finalists shown to guests for voting.</p>
                    </div>
                    <button
                      onClick={() => window.open('/bestdress/announce', '_blank')}
                      style={{ padding:'0.75rem 1.25rem', borderRadius:'12px', border:'none',
                        background:'linear-gradient(135deg,#7c3aed,#4f46e5)',
                        color:'white', fontWeight:800, fontSize:'0.9rem', cursor:'pointer' }}
                    >🖥️ Open Announce Page ↗</button>
                  </div>

                  <table className="modern-table">
                    <thead><tr><th>Photo</th><th>Finalist</th><th>Category</th><th>AI Rank</th><th>AI Feedback</th><th>Votes</th><th>Actions</th></tr></thead>
                    <tbody>
                      {bestDressNominees.map(n => (
                        <tr key={n.id}>
                          <td>
                            {n.has_photo ? (
                              <div 
                                style={{ width:'50px', height:'50px', borderRadius:'8px', overflow:'hidden', cursor:'pointer', background:'#f1f5f9' }}
                                onClick={() => setViewingPhoto(`/api/photos/bd/vote/${n.id}`)}
                              >
                                <img src={`/api/photos/bd/vote/${n.id}`} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                              </div>
                            ) : (
                              <label style={{ display:'flex', width:'50px', height:'50px', borderRadius:'8px', overflow:'hidden', cursor:'pointer', background:'#f1f5f9', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', border:'1px dashed #cbd5e1', boxSizing:'border-box' }}>
                                📷
                                <input type="file" accept="image/*" style={{ display:'none' }}
                                  onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const reader = new FileReader();
                                    reader.onload = async (ev) => {
                                      try {
                                        await axios.patch(`/api/best-dress/finalists/${n.id}/photo`, { photo_data: ev.target.result });
                                        fetchAllData();
                                      } catch(err) { alert('Photo upload failed'); }
                                    };
                                    reader.readAsDataURL(file);
                                    e.target.value = '';
                                  }}
                                />
                              </label>
                            )}
                          </td>
                          <td className="bold">{n.nominee_name}<br/><span style={{ color:'#94a3b8', fontSize:'0.75rem', fontWeight:400 }}>{n.department}</span></td>
                          <td><span style={{ padding:'2px 8px', borderRadius:'99px', fontSize:'0.72rem', fontWeight:700, background: n.gender==='Female'?'#fce7f3':'#dbeafe', color: n.gender==='Female'?'#be185d':'#1d4ed8' }}>{n.gender || '—'}</span></td>
                          <td style={{ fontWeight:800, color:'#0A8276', fontSize:'0.85rem' }}>{getNomineeRank(n)}</td>
                          <td style={{ maxWidth:'220px' }}>
                            <textarea
                              style={{ 
                                width: '100%', 
                                fontSize: '0.75rem', 
                                color: '#64748b', 
                                lineHeight: 1.4,
                                border: '1px solid transparent',
                                background: 'transparent',
                                resize: 'vertical',
                                padding: '4px',
                                borderRadius: '4px',
                                fontFamily: 'inherit',
                                boxSizing: 'border-box'
                              }}
                              rows={2}
                              key={n.id}
                              defaultValue={n.ai_reasoning || ''}
                              onFocus={(e) => {
                                e.target.style.border = '1px solid #0A8276';
                                e.target.style.background = 'white';
                              }}
                              onBlur={async (e) => {
                                e.target.style.border = '1px solid transparent';
                                e.target.style.background = 'transparent';
                                const newVal = e.target.value;
                                if (newVal === (n.ai_reasoning || '')) return;
                                try {
                                  await axios.put(`/api/best-dress/finalists/${n.id}/reasoning`, { reasoning: newVal });
                                  fetchAllData();
                                } catch (err) {
                                  alert('Failed to save reasoning');
                                }
                              }}
                              placeholder="Enter feedback..."
                            />
                          </td>
                          <td className="text-teal" style={{fontWeight: 900, fontSize:'1.1rem'}}>{n.vote_count}</td>
                          <td>
                            <label className="table-btn" style={{ color:'#0a8276', cursor:'pointer', marginRight:'8px', display:'inline-block', fontWeight:800 }}>
                              Upload Photo
                              <input type="file" accept="image/*" style={{ display:'none' }}
                                onChange={async (e) => {
                                  const file = e.target.files[0];
                                  if (!file) return;
                                  const reader = new FileReader();
                                  reader.onload = async (ev) => {
                                    try {
                                      await axios.patch(`/api/best-dress/finalists/${n.id}/photo`, { photo_data: ev.target.result });
                                      fetchAllData();
                                    } catch(err) { alert('Photo upload failed'); }
                                  };
                                  reader.readAsDataURL(file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                            <button onClick={async () => { if(confirm('Remove finalist?')) { await axios.delete(`/api/best-dress/nominees/${n.id}`); fetchAllData(); } }} className="table-btn" style={{color:'#f43f5e'}}>Remove</button>
                          </td>
                        </tr>
                      ))}
                      {bestDressNominees.length === 0 && <tr><td colSpan="7" style={{textAlign:'center', color:'#94a3b8', padding:'3rem'}}>No finalists added yet. Go to Submissions tab and run AI Rank.</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}




          {activeModule === 'feedback' && <FeedbackModule />}


        </div>
      </main>

      {isModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content card">
                <h3>{editingItem ? "Edit " : "Add "} {activeModule === 'employees' ? "Employee" : (activeModule === 'performance' ? "Performer" : "Prize")}</h3>
                <form onSubmit={saveItem}>
                  {activeModule === 'employees' && (
                    <><label>Name</label><input name="name" defaultValue={editingItem?.name} required /><label>Department</label><input name="department" defaultValue={editingItem?.department} required /></>
                  )}
                  {activeModule === 'performance' && (
                    <>
                      <label>Name</label><input name="name" defaultValue={editingItem?.name} required />
                      <label>Song Name</label><input name="song_name" defaultValue={editingItem?.song_name} required />
                      <label>Department</label><input name="department" defaultValue={editingItem?.department} required />
                      <label>Sequence Lineup Order</label><input name="sequence" type="number" defaultValue={editingItem?.sequence || 0} required />
                    </>
                  )}
                  {activeModule === 'lucky-draw' && (
                    <><label>Session</label><input name="session" defaultValue={editingItem?.session || "Session 1"} required /><label>Rank</label><input name="rank" type="number" defaultValue={editingItem?.rank || 0} required /><label>Prize Name</label><input name="name" defaultValue={editingItem?.name} required /><label>Quantity</label><input name="quantity" type="number" defaultValue={editingItem?.quantity || 1} required /></>
                  )}
                  <div className="modal-actions"><button type="submit" className="save-btn">Save Changes</button><button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button></div>
                </form>
              </div>
            </div>
          )}

      {showStageView && drawResult && (
        <LuckyDrawWheel 
          prize={drawResult.prize} 
          onFinish={handlePublishWinner} 
          onClose={() => { setShowStageView(false); setDrawResult(null); }} 
        />
      )}

      {/* Best Dress Live Stage View - Direct Full Screen */}
      {showBdStage && bdSubmissions.length > 0 && (
        <div style={{ position:'fixed', top:0, left:0, width:'100vw', height:'100vh', background:'#0f172a', zIndex:5000, display:'flex', flexDirection:'column', color:'white', fontFamily:'Outfit, sans-serif' }}>
          <header style={{ padding:'2rem 4rem', display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(0,0,0,0.3)' }}>
            <div>
              <h1 style={{ fontSize:'2.5rem', fontWeight:900, margin:0, background:'linear-gradient(to right, #fbbf24, #f59e0b)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Best Dress 2026</h1>
              <p style={{ margin:0, color:'#94a3b8', fontWeight:700 }}>LIVE GALLERY • {bdStageIndex + 1} / {bdSubmissions.length}</p>
            </div>
            <button 
              onClick={() => setShowBdStage(false)}
              style={{ background:'#f43f5e', color:'white', border:'none', borderRadius:'12px', padding:'0.8rem 1.5rem', fontWeight:800, cursor:'pointer' }}
            >Close Stage View</button>
          </header>

          <main style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', position:'relative', overflow:'hidden' }}>
             {/* Navigation Buttons */}
             <button 
               onClick={() => setBdStageIndex(prev => (prev > 0 ? prev - 1 : bdSubmissions.length - 1))}
               style={{ position:'absolute', left:'2rem', background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%', width:'80px', height:'80px', fontSize:'2rem', color:'white', cursor:'pointer', zIndex:10 }}
             >‹</button>
             <button 
               onClick={() => setBdStageIndex(prev => (prev < bdSubmissions.length - 1 ? prev + 1 : 0))}
               style={{ position:'absolute', right:'2rem', background:'rgba(255,255,255,0.1)', border:'none', borderRadius:'50%', width:'80px', height:'80px', fontSize:'2rem', color:'white', cursor:'pointer', zIndex:10 }}
             >›</button>

             {/* Main Photo Card */}
             <div style={{ width:'80%', height:'85%', display:'flex', gap:'3rem', alignItems:'center' }}>
                <div style={{ flex:1, height:'100%', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <img 
                    src={bdSubmissions[bdStageIndex].photo_data} 
                    style={{ maxHeight:'100%', maxWidth:'100%', borderRadius:'24px', boxShadow:'0 40px 100px rgba(0,0,0,0.6)', border:'4px solid rgba(255,255,255,0.1)' }} 
                  />
                </div>
                <div style={{ width:'400px', display:'flex', flexDirection:'column', gap:'1.5rem' }}>
                   <div style={{ background:'rgba(255,255,255,0.05)', padding:'2rem', borderRadius:'24px', border:'1px solid rgba(255,255,255,0.1)' }}>
                      <span style={{ background:'#0A8276', padding:'6px 12px', borderRadius:'8px', fontSize:'0.8rem', fontWeight:800, textTransform:'uppercase' }}>{bdSubmissions[bdStageIndex].gender}</span>
                      <h2 style={{ fontSize:'3.5rem', fontWeight:900, margin:'1rem 0 0.5rem' }}>{bdSubmissions[bdStageIndex].name}</h2>
                      <p style={{ fontSize:'1.5rem', color:'#94a3b8', fontWeight:600, margin:0 }}>{bdSubmissions[bdStageIndex].department}</p>
                   </div>
                   
                   {bdSubmissions[bdStageIndex].ai_score && (
                     <div style={{ background:'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(10,130,118,0.2))', padding:'2rem', borderRadius:'24px', border:'1px solid rgba(139,92,246,0.3)' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                          <span style={{ fontWeight:800, color:'#c4b5fd' }}>AI RANK</span>
                          <span style={{ fontSize:'2.5rem', fontWeight:900, color:'#fbbf24' }}>{getSubmissionRank(bdSubmissions[bdStageIndex])}</span>
                        </div>
                        <p style={{ margin:0, fontSize:'1.1rem', fontStyle:'italic', color:'#e2e8f0', lineHeight:1.6 }}>"{bdSubmissions[bdStageIndex].ai_reasoning}"</p>
                     </div>
                   )}
                </div>
             </div>
          </main>
          
          <footer style={{ padding:'2rem', background:'rgba(0,0,0,0.2)', display:'flex', gap:'1rem', overflowX:'auto', justifyContent:'center' }}>
             {bdSubmissions.map((sub, idx) => (
                <img 
                  key={sub.id}
                  src={sub.photo_data}
                  onClick={() => setBdStageIndex(idx)}
                  style={{ width:'80px', height:'80px', objectFit:'cover', borderRadius:'12px', cursor:'pointer', border: bdStageIndex === idx ? '3px solid #fbbf24' : '3px solid transparent', opacity: bdStageIndex === idx ? 1 : 0.5, transition:'0.2s' }}
                />
             ))}
          </footer>
        </div>
      )}

      {/* ── Admin Users Module ─────────────────────────────────────────────────── */}
      {activeModule === 'admin-users' && (
        <AdminUsersPanel token={authToken} currentUser={authUser} />
      )}

      {/* Full Photo Modal - Direct Full Screen */}
      {viewingPhoto && (
        <div className="modal-overlay" onClick={() => setViewingPhoto(null)} style={{ zIndex: 2000, background: 'rgba(0,0,0,0.92)' }}>
          <div className="modal-content" style={{ width: '100vw', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', background: 'transparent', padding: 0, border: 'none', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             <button style={{ position: 'fixed', top: '20px', right: '20px', background: '#f43f5e', color: 'white', border: 'none', borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer', fontWeight: 900, fontSize: '1.2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)', zIndex: 2001 }}>✕</button>
             <img src={viewingPhoto} style={{ maxWidth: '95%', maxHeight: '95%', borderRadius: '8px', boxShadow: '0 0 100px rgba(0,0,0,0.5)', objectFit: 'contain' }} />
          </div>
        </div>
      )}

      <style>{`
        .photo-hover:hover { opacity: 1 !important; }
        .status-pill { padding: 4px 12px; border-radius: 99px; font-weight: 800; font-size: 0.8rem; }
        .status-pill.open { background: #ecfdf5; color: #10b981; }
        .status-pill.closed { background: #fef2f2; color: #ef4444; }
        .danger-btn { background: #f43f5e !important; }
        .inline-edit-input { width: 100%; padding: 4px 8px; border: 1px solid transparent; border-radius: 4px; font-weight: 600; cursor: pointer; transition: 0.3s; }
        .inline-edit-input:hover { background: #f1f5f9; border-color: #e2e8f0; }
        .text-teal { color: #0a8276; font-weight: 700; }
        
        .modern-admin-layout { display: flex; height: 100vh; background: #f8fafc; font-family: 'Inter', sans-serif; color: #1e293b; }
        .modern-sidebar { width: 280px; background: white; border-right: 1px solid #e2e8f0; display: flex; flex-direction: column; padding: 2rem 1.5rem; box-shadow: 4px 0 20px rgba(0,0,0,0.02); }
        .sidebar-header { margin-bottom: 3rem; }
        .brand { font-size: 1.5rem; font-weight: 900; letter-spacing: -1px; }
        .brand span { color: var(--primary); }
        .env-pill { display: inline-block; padding: 2px 8px; background: #f1f5f9; color: #64748b; font-size: 0.7rem; font-weight: 800; border-radius: 4px; margin-top: 5px; }
        .sidebar-nav { flex: 1; }
        .nav-group { margin-bottom: 2rem; }
        .group-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 1px; margin-bottom: 1rem; padding-left: 0.5rem; }
        .sidebar-item { width: 100%; text-align: left; padding: 0.8rem 1rem; border: none; background: transparent; display: flex; align-items: center; gap: 1rem; cursor: pointer; border-radius: 12px; transition: 0.2s; color: #475569; font-weight: 600; font-size: 0.95rem; margin-bottom: 0.25rem; }
        .sidebar-item:hover { background: #f1f5f9; color: #1e293b; }
        .sidebar-item.active { background: rgba(10, 130, 118, 0.1); color: var(--primary); }
        .sidebar-footer { border-top: 1px solid #e2e8f0; padding-top: 1.5rem; }
        .back-link { font-size: 0.85rem; color: #64748b; text-decoration: none; font-weight: 600; display: block; margin-bottom: 0.5rem; }
        .site-version { font-size: 0.7rem; color: #94a3b8; font-weight: 800; }
        .modern-content { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .content-header { padding: 2rem 3rem; background: white; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .content-header h1 { font-size: 1.75rem; font-weight: 800; }
        .header-actions { display: flex; gap: 1rem; align-items: center; }
        .refresh-btn { background: #f1f5f9; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700; color: #475569; cursor: pointer; }
        .scroll-container { flex: 1; overflow-y: auto; padding: 2rem 3rem; }
        .card { background: white; border-radius: 16px; padding: 2rem; margin-bottom: 2rem; border: 1px solid #e2e8f0; }
        .shadow-card { box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02); }
        .tabs-strip { display: flex; gap: 0.5rem; background: #f1f5f9; padding: 0.4rem; border-radius: 12px; margin-bottom: 2rem; width: fit-content; }
        .tabs-strip button { background: transparent; border: none; padding: 0.6rem 1.5rem; border-radius: 8px; font-weight: 700; color: #64748b; cursor: pointer; }
        .tabs-strip button.active { background: white; color: #1e293b; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .btn-group { display: flex; gap: 1rem; }
        .secondary-btn { background: #f1f5f9; color: #475569; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.9rem; border: 1px solid #e2e8f0; }
        .modern-add-btn { background: #1e293b; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
        .modern-table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
        .modern-table th { text-align: left; padding: 1rem; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; }
        .modern-table td { padding: 1.25rem 1rem; border-top: 1px solid #f1f5f9; }
        .pill { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; font-weight: 800; }
        .pill.done { background: #dcfce7; color: #166534; }
        .pill.pending { background: #f1f5f9; color: #64748b; }
        .pill.drawn { background: rgba(10, 130, 118, 0.1); color: var(--primary); }
        .pill.eligible { background: #fffbeb; color: #b45309; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { width: 100%; max-width: 500px; }
        .modal-content label { display: block; margin: 1rem 0 0.5rem; font-weight: 700; }
        .modal-content input { width: 100%; padding: 0.8rem; border: 1px solid #e2e8f0; border-radius: 8px; }
        .modal-actions { display: flex; gap: 1rem; margin-top: 2rem; }
        .save-btn { background: var(--primary); color: white; flex: 1; padding: 1rem; border-radius: 8px; font-weight: 700; border: none; cursor: pointer; }
        .draw-selector-box.rank-flow { display: flex; flex-direction: column; gap: 2rem; }
        .input-row { display: flex; flex-direction: column; gap: 0.5rem; }
        .input-row label { font-size: 0.8rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .btn-next .icon { margin-right: 12px; font-size: 1.2rem; }
        .btn-redraw .icon { margin-right: 12px; font-size: 1.2rem; }
        .btn-next { background: #0a7065; color: white; border: none; padding: 1.2rem 2.5rem; border-radius: 99px; font-size: 1.2rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 220px; transition: 0.3s; box-shadow: 0 10px 20px rgba(10, 112, 101, 0.15); }
        .btn-next:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 25px rgba(10, 112, 101, 0.25); }
        .btn-draw-main:not(:disabled) { animation: pulse-glow 2s infinite; border: none; }
        .btn-draw-main:hover:not(:disabled) { transform: scale(1.05) translateY(-5px); box-shadow: 0 25px 50px rgba(10, 130, 118, 0.4); }
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 0 0 rgba(10, 130, 118, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(10, 130, 118, 0); }
          100% { box-shadow: 0 0 0 0 rgba(10, 130, 118, 0); }
        }
        .btn-redraw { background: #df3d4e; color: white; border: none; padding: 1.2rem 2.5rem; border-radius: 99px; font-size: 1.2rem; font-weight: 800; cursor: pointer; min-width: 220px; transition: 0.3s; box-shadow: 0 10px 20px rgba(223, 61, 78, 0.15); display: flex; align-items: center; justify-content: center; }
        .btn-redraw:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 25px rgba(223, 61, 78, 0.25); }
        .btn-batch { background: #1e293b; color: white; border: none; padding: 1.2rem 2.5rem; border-radius: 99px; font-size: 1.2rem; font-weight: 800; cursor: pointer; min-width: 220px; transition: 0.3s; box-shadow: 0 10px 20px rgba(30, 41, 59, 0.15); display: flex; align-items: center; justify-content: center; }
        .btn-batch:hover:not(:disabled) { transform: translateY(-3px); box-shadow: 0 15px 25px rgba(30, 41, 59, 0.25); }
        .btn-batch .icon { margin-right: 12px; font-size: 1.2rem; }
        .control-buttons { display: flex; gap: 1.5rem; }
        .giant-launch-btn, .batch-draw-btn { display: none; } /* Replaced by the new unified buttons */
        @keyframes progress { from { width: 0%; } to { width: 100%; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

      {/* Edit Submission Modal */}
      {editingSub && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ background:'white', borderRadius:'20px', padding:'2rem', width:'360px', maxWidth:'90vw', boxShadow:'0 25px 50px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin:'0 0 1.5rem', fontSize:'1.2rem', fontWeight:800 }}>Edit Submission</h3>

            <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:'4px', textTransform:'uppercase' }}>Full Name</label>
            <input
              value={editingSub.name}
              onChange={e => setEditingSub(p => ({ ...p, name: e.target.value }))}
              style={{ width:'100%', padding:'0.6rem 0.9rem', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontSize:'0.95rem', marginBottom:'1rem', boxSizing:'border-box' }}
            />

            <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:'4px', textTransform:'uppercase' }}>Department</label>
            <input
              value={editingSub.department}
              onChange={e => setEditingSub(p => ({ ...p, department: e.target.value }))}
              style={{ width:'100%', padding:'0.6rem 0.9rem', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontSize:'0.95rem', marginBottom:'1rem', boxSizing:'border-box' }}
            />

            <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:'8px', textTransform:'uppercase' }}>Category</label>
            <div style={{ display:'flex', gap:'0.75rem', marginBottom:'1rem' }}>
              {['Male','Female'].map(g => (
                <button key={g} onClick={() => setEditingSub(p => ({ ...p, gender: g }))}
                  style={{ flex:1, padding:'0.6rem', borderRadius:'10px', fontWeight:700, fontSize:'0.9rem', cursor:'pointer',
                    border: editingSub.gender === g ? '2px solid #0A8276' : '2px solid #e2e8f0',
                    background: editingSub.gender === g ? 'rgba(10,130,118,0.08)' : 'white',
                    color: editingSub.gender === g ? '#0A8276' : '#64748b' }}
                >{g === 'Male' ? '👔' : '👗'} {g}</button>
              ))}
            </div>

            <label style={{ display:'block', fontSize:'0.75rem', fontWeight:700, color:'#64748b', marginBottom:'4px', textTransform:'uppercase' }}>AI Feedback</label>
            <textarea
              value={editingSub.ai_reasoning || ''}
              onChange={e => setEditingSub(p => ({ ...p, ai_reasoning: e.target.value }))}
              rows={3}
              style={{ width:'100%', padding:'0.6rem 0.9rem', borderRadius:'10px', border:'1.5px solid #e2e8f0', fontSize:'0.95rem', marginBottom:'1.5rem', fontFamily:'inherit', boxSizing:'border-box', resize:'vertical' }}
            />

            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button
                onClick={() => setEditingSub(null)}
                style={{ flex:1, padding:'0.75rem', borderRadius:'10px', border:'1.5px solid #e2e8f0', background:'white', fontWeight:700, cursor:'pointer', color:'#64748b' }}
              >Cancel</button>
              <button
                onClick={async () => {
                  try {
                    await axios.put(`/api/best-dress/submissions/${editingSub.id}`, {
                      name: editingSub.name, department: editingSub.department, gender: editingSub.gender, ai_reasoning: editingSub.ai_reasoning
                    });
                    setEditingSub(null);
                    fetchAllData();
                  } catch(e) { alert('Save failed: ' + (e.response?.data?.error || e.message)); }
                }}
                style={{ flex:1, padding:'0.75rem', borderRadius:'10px', border:'none', background:'#0A8276', color:'white', fontWeight:800, cursor:'pointer' }}
              >Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

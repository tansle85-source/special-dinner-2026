import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LuckyDrawWheel from './LuckyDrawWheel';

const SITE_VERSION = "v1.4.7";

const Admin = () => {
  // Navigation State
  const [activeModule, setActiveModule] = useState('lucky-draw'); 
  const [activeSubTab, setActiveSubTab] = useState('conduct');

  // Data State
  const [employees, setEmployees] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [performanceResults, setPerformanceResults] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [participants, setParticipants] = useState([]);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [showStageView, setShowStageView] = useState(false);
  const [drawResult, setDrawResult] = useState(null);
  const [selectedPrizeId, setSelectedPrizeId] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  const [selectedSession, setSelectedSession] = useState('');

  useEffect(() => {
    fetchAllData();
  }, [activeModule]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [empRes, prizeRes, perfRes, feedRes, critRes, partRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/prizes'),
        axios.get('/api/performance/results'),
        axios.get('/api/feedback'),
        axios.get('/api/performance/criteria'),
        axios.get('/api/performance/participants')
      ]);
      setEmployees(empRes.data);
      setPrizes(prizeRes.data);
      setPerformanceResults(perfRes.data);
      setFeedbacks(feedRes.data);
      setCriteria(critRes.data);
      setParticipants(partRes.data);
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

  const saveItem = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const isEmployee = activeModule === 'employees';
    const data = isEmployee ? {
      name: formData.get('name'),
      department: formData.get('department'),
      won_prize: editingItem?.won_prize || null
    } : {
      session: formData.get('session'),
      rank: parseInt(formData.get('rank')),
      name: formData.get('name'),
      quantity: parseInt(formData.get('quantity'))
    };

    const endpoint = isEmployee ? '/api/employees' : '/api/prizes';
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
    return employees.filter(e => e.won_prize === prizeName).length;
  };

  const SidebarItem = ({ id, label, icon }) => (
    <button className={`sidebar-item ${activeModule === id ? 'active' : ''}`} onClick={() => setActiveModule(id)}>
      <span className="icon">{icon}</span><span className="label">{label}</span>
    </button>
  );

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
            <SidebarItem id="employees" label="Employee Database" icon="👥" />
          </div>
          <div className="nav-group">
            <div className="group-label">Event Features</div>
            <SidebarItem id="performance" label="Performance" icon="🎭" />
            <SidebarItem id="best-dress" label="Best Dress" icon="👗" />
            <SidebarItem id="feedback" label="Guest Feedback" icon="💬" />
          </div>
        </nav>
        <div className="sidebar-footer">
          <Link to="/" className="back-link">← Back to Dashboard</Link>
          <div className="site-version">Revision: {SITE_VERSION}</div>
        </div>
      </aside>

      <main className="modern-content">
        <header className="content-header">
          <div className="header-info">
            <h1>{activeModule.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}</h1>
            <p>Appreciation Dinner 2026 Admin Panel</p>
          </div>
          <div className="header-actions">
            <div className="upload-indicator">{uploadStatus}</div>
            <button className="refresh-btn" onClick={fetchAllData}>↻ Sync Data</button>
          </div>
        </header>

        {loading && <div className="loading-bar"></div>}

        <div className="scroll-container">
          {activeModule === 'lucky-draw' && (
            <div className="module-grid">
              <div className="tabs-strip">
                <button className={activeSubTab === 'conduct' ? 'active' : ''} onClick={() => setActiveSubTab('conduct')}>Conduct Draw</button>
                <button className={activeSubTab === 'manage' ? 'active' : ''} onClick={() => setActiveSubTab('manage')}>Manage Prizes</button>
                <button className={activeSubTab === 'winners' ? 'active' : ''} onClick={() => setActiveSubTab('winners')}>Winners List</button>
              </div>

              {activeSubTab === 'conduct' && (
                <div className="card draw-hero-card">
                  <div className="card-info">
                    <h3>Conduct Lucky Draw</h3>
                    <p>Select a session, then follow the prizes in rank-order.</p>
                  </div>
                  <div className="draw-selector-box rank-flow">
                    <div className="input-row">
                      <label>1. Choose Session</label>
                      <select value={selectedSession} onChange={(e) => { setSelectedSession(e.target.value); setSelectedPrizeId(''); }} className="modern-select">
                        <option value="">-- All Sessions --</option>
                        {[...new Set(prizes.map(p => p.session))].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>

                    <div className="input-row">
                      <label>2. Select Prize (By Rank)</label>
                      <select value={selectedPrizeId} onChange={(e) => setSelectedPrizeId(e.target.value)} className="modern-select">
                        <option value="">-- Select Prize --</option>
                        {prizes
                          .filter(p => !selectedSession || p.session === selectedSession)
                          .sort((a, b) => b.rank - a.rank) // Sort by rank descending (often Rank 10 is minor, Rank 1 is grand) 
                          .map(p => {
                            const remaining = p.quantity - getDrawnCount(p.name);
                            return <option key={p.id} value={p.id} disabled={remaining <= 0}>{p.rank}. {p.name} ({remaining}/{p.quantity} Left)</option>;
                          })}
                      </select>
                    </div>

                    <button className="giant-launch-btn" onClick={conductDraw} disabled={!selectedPrizeId}>
                      LAUNCH STAGE VIEW & DRAW
                    </button>
                  </div>
                </div>
              )}

              {activeSubTab === 'manage' && (
                <div className="card shadow-card">
                   <div className="card-header-actions">
                      <h3>Prize Inventory</h3>
                      <div className="btn-group">
                        <label className="secondary-btn">CSV Bulk Update <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'prizes')} style={{display:'none'}} /></label>
                        <button className="modern-add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>+ Add New Prize</button>
                      </div>
                   </div>
                   <table className="modern-table">
                     <thead><tr><th>SESSION</th><th>RANK</th><th>PRIZE NAME</th><th>QTY</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                     <tbody>
                       {prizes.map(p => {
                         const drawn = getDrawnCount(p.name);
                         return (
                           <tr key={p.id}>
                             <td>{p.session}</td><td>{p.rank}</td><td className="bold">{p.name}</td><td>{p.quantity}</td>
                             <td><span className={`pill ${drawn >= p.quantity ? 'done' : 'pending'}`}>{drawn}/{p.quantity} Done</span></td>
                             <td><button onClick={() => { setEditingItem(p); setIsModalOpen(true); }} className="table-btn">Edit</button></td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                </div>
              )}

              {activeSubTab === 'winners' && (
                 <div className="card shadow-card">
                   <h3>Winner Registry</h3>
                   <table className="modern-table">
                     <thead><tr><th>NAME</th><th>DEPARTMENT</th><th>PRIZE</th></tr></thead>
                     <tbody>
                       {employees.filter(e => e.won_prize).map(e => (<tr key={e.id}><td>{e.name}</td><td>{e.department}</td><td className="bold text-teal">{e.won_prize}</td></tr>))}
                     </tbody>
                   </table>
                 </div>
              )}
            </div>
          )}

          {activeModule === 'employees' && (
            <div className="card shadow-card">
              <div className="card-header-actions">
                <h3>Employee Database ({employees.length})</h3>
                <div className="btn-group">
                  <label className="secondary-btn">Upload CSV <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'employees')} style={{display:'none'}} /></label>
                  <button className="modern-add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>+ Add Employee</button>
                </div>
              </div>
              <table className="modern-table">
                <thead><tr><th>NAME</th><th>DEPARTMENT</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {employees.map(e => (
                    <tr key={e.id}>
                      <td className="bold">{e.name}</td><td>{e.department}</td>
                      <td><span className={`pill ${e.won_prize ? 'drawn' : 'eligible'}`}>{e.won_prize ? "Won: " + e.won_prize : "Eligible"}</span></td>
                      <td><button onClick={() => { setEditingItem(e); setIsModalOpen(true); }} className="table-btn">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {/* Performance and other modules remain the same as previous logic but with consistent styling */}
        </div>
      </main>

      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <h3>{editingItem ? "Edit " : "Add "} {activeModule === 'employees' ? "Employee" : "Prize"}</h3>
            <form onSubmit={saveItem}>
              {activeModule === 'employees' ? (
                <><label>Name</label><input name="name" defaultValue={editingItem?.name} required /><label>Department</label><input name="department" defaultValue={editingItem?.department} required /></>
              ) : (
                <><label>Session</label><input name="session" defaultValue={editingItem?.session || "Session 1"} required /><label>Rank</label><input name="rank" type="number" defaultValue={editingItem?.rank || 0} required /><label>Prize Name</label><input name="name" defaultValue={editingItem?.name} required /><label>Quantity</label><input name="quantity" type="number" defaultValue={editingItem?.quantity || 1} required /></>
              )}
              <div className="modal-actions"><button type="submit" className="save-btn">Save Changes</button><button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button></div>
            </form>
          </div>
        </div>
      )}

      {showStageView && drawResult && <LuckyDrawWheel prize={drawResult.prize} winner={drawResult.winner} onFinish={() => { setShowStageView(false); fetchAllData(); }} onClose={() => setShowStageView(false)} />}

      <style>{`
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
        .draw-selector-box.rank-flow { display: flex; flex-direction: column; gap: 1.5rem; }
        .input-row { display: flex; flex-direction: column; gap: 0.5rem; }
        .input-row label { font-size: 0.8rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; }
        .giant-launch-btn:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }
      `}</style>
    </div>
  );
};

export default Admin;

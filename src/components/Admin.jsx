import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LuckyDrawWheel from './LuckyDrawWheel';

const Admin = () => {
  // Navigation State
  const [activeModule, setActiveModule] = useState('lucky-draw'); // lucky-draw, employees, performance, best-dress, feedback
  const [activeSubTab, setActiveSubTab] = useState('conduct'); // conduct, manage, winners

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
  const [editingItem, setEditingItem] = useState(null); // Used for both prizes and employees
  const [isModalOpen, setIsModalOpen] = useState(false);

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

  // --- Handlers for Prizes ---
  const savePrize = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      session: formData.get('session'),
      rank: parseInt(formData.get('rank')),
      name: formData.get('name'),
      quantity: parseInt(formData.get('quantity'))
    };

    try {
      if (editingItem) {
        await axios.put(`/api/prizes/${editingItem.id}`, data);
      } else {
        await axios.post('/api/prizes', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchAllData();
    } catch (err) { alert("Save failed"); }
  };

  const deletePrize = async (id) => {
    if (window.confirm("Delete this prize?")) {
      await axios.delete(`/api/prizes/${id}`);
      fetchAllData();
    }
  };

  // --- Handlers for Employees ---
  const saveEmployee = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      name: formData.get('name'),
      department: formData.get('department'),
      won_prize: editingItem?.won_prize || null
    };

    try {
      if (editingItem) {
        await axios.put(`/api/employees/${editingItem.id}`, data);
      } else {
        await axios.post('/api/employees', data);
      }
      setIsModalOpen(false);
      setEditingItem(null);
      fetchAllData();
    } catch (err) { alert("Save failed"); }
  };

  const deleteEmployee = async (id) => {
    if (window.confirm("Delete this employee?")) {
      await axios.delete(`/api/employees/${id}`);
      fetchAllData();
    }
  };

  // --- Lucky Draw Logic ---
  const conductDraw = async () => {
    if (!selectedPrizeId) return alert("Select a prize");
    try {
      const res = await axios.post('/api/draw', { prizeId: selectedPrizeId });
      setDrawResult(res.data);
      setShowStageView(true);
    } catch (err) { alert(err.response?.data?.error || "Draw failed"); }
  };

  const resetDraws = async () => {
    if (window.confirm("Reset all winners?")) {
      await axios.post('/api/reset-draw');
      fetchAllData();
    }
  };

  // --- Render Helpers ---
  const renderModuleHeader = (title, icon) => (
    <div className="module-header">
      <h2><span>{icon}</span> {title}</h2>
      <hr />
    </div>
  );

  return (
    <div className="admin-layout">
      {/* Sidebar Navigation */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">Event Admin</div>
        <nav className="sidebar-nav">
          <button className={activeModule === 'lucky-draw' ? 'active' : ''} onClick={() => setActiveModule('lucky-draw')}>🎪 Lucky Draw</button>
          <button className={activeModule === 'employees' ? 'active' : ''} onClick={() => setActiveModule('employees')}>👥 Employee DB</button>
          <button className={activeModule === 'performance' ? 'active' : ''} onClick={() => setActiveModule('performance')}>🎭 Performance</button>
          <button className={activeModule === 'best-dress' ? 'active' : ''} onClick={() => setActiveModule('best-dress')}>👗 Best Dress</button>
          <button className={activeModule === 'feedback' ? 'active' : ''} onClick={() => setActiveModule('feedback')}>💬 Feedback</button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        {loading && <div className="loading-overlay">Loading...</div>}

        {/* --- LUCKY DRAW MODULE --- */}
        {activeModule === 'lucky-draw' && (
          <div className="module-content">
            {renderModuleHeader("Lucky Draw Management", "🎪")}
            
            <div className="admin-tabs">
              <button className={activeSubTab === 'conduct' ? 'active' : ''} onClick={() => setActiveSubTab('conduct')}>Conduct Draw</button>
              <button className={activeSubTab === 'manage' ? 'active' : ''} onClick={() => setActiveSubTab('manage')}>Manage Prizes</button>
              <button className={activeSubTab === 'winners' ? 'active' : ''} onClick={() => setActiveSubTab('winners')}>Winners List</button>
            </div>

            {activeSubTab === 'conduct' && (
              <div className="conduct-panel card">
                <h3>Conduct Lucky Draw</h3>
                <div className="draw-controls">
                  <select value={selectedPrizeId} onChange={(e) => setSelectedPrizeId(e.target.value)} className="admin-select">
                    <option value="">-- Select Prize --</option>
                    {prizes.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.session}) - {p.quantity - employees.filter(e => e.won_prize === p.name).length} Left</option>
                    ))}
                  </select>
                  <button className="draw-big-btn" onClick={conductDraw}>Open Stage View & Draw</button>
                </div>
                <button className="reset-btn" onClick={resetDraws}>Reset All Draws</button>
              </div>
            )}

            {activeSubTab === 'manage' && (
              <div className="manage-panel">
                <div className="panel-header">
                  <h3>Prize Inventory</h3>
                  <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>+ Add Prize</button>
                </div>
                <table className="admin-table">
                  <thead>
                    <tr><th>Session</th><th>Rank</th><th>Prize Name</th><th>Qty</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {prizes.map(p => (
                      <tr key={p.id}>
                        <td>{p.session}</td><td>{p.rank}</td><td className="bold">{p.name}</td><td>{p.quantity}</td>
                        <td>
                          <button onClick={() => { setEditingItem(p); setIsModalOpen(true); }}>Edit</button>
                          <button onClick={() => deletePrize(p.id)} className="text-red">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeSubTab === 'winners' && (
              <div className="winners-panel">
                <h3>Lucky Winners</h3>
                <table className="admin-table">
                  <thead>
                    <tr><th>Name</th><th>Dept</th><th>Prize</th></tr>
                  </thead>
                  <tbody>
                    {employees.filter(e => e.won_prize).map(e => (
                      <tr key={e.id}><td>{e.name}</td><td>{e.department}</td><td>{e.won_prize}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* --- EMPLOYEES MODULE --- */}
        {activeModule === 'employees' && (
          <div className="module-content">
            {renderModuleHeader("Employee Database", "👥")}
            <div className="panel-header">
              <h3>Database Records ({employees.length})</h3>
              <button className="add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>+ Add Employee</button>
            </div>
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Department</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {employees.map(e => (
                  <tr key={e.id}>
                    <td className="bold">{e.name}</td><td>{e.department}</td>
                    <td>{e.won_prize ? "Won: " + e.won_prize : "Eligible"}</td>
                    <td>
                      <button onClick={() => { setEditingItem(e); setIsModalOpen(true); }}>Edit</button>
                      <button onClick={() => deleteEmployee(e.id)} className="text-red">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- PERFORMANCE MODULE --- */}
        {activeModule === 'performance' && (
          <div className="module-content">
            {renderModuleHeader("Performance Voting", "🎭")}
            <div className="perf-grid">
              <div className="card">
                <h3>Criteria Management</h3>
                {criteria.map(c => (
                  <div key={c.id} className="edit-row">
                    <input defaultValue={c.name} onBlur={async (e) => {
                      await axios.put(`/api/performance/criteria/${c.id}`, { name: e.target.value });
                    }} />
                  </div>
                ))}
              </div>
              <div className="card">
                <h3>Participants</h3>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const data = new FormData(e.target);
                  await axios.post('/api/performance/participants', { name: data.get('name'), department: data.get('dept') });
                  e.target.reset(); fetchAllData();
                }} className="mini-form">
                  <input name="name" placeholder="Name" required />
                  <input name="dept" placeholder="Dept" required />
                  <button type="submit">Add Nominee</button>
                </form>
                <ul className="mini-list">
                  {participants.map(p => (
                    <li key={p.id}>{p.name} ({p.department}) <button onClick={async () => { await axios.delete(`/api/performance/participants/${p.id}`); fetchAllData(); }}>×</button></li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="card" style={{ marginTop: '2rem' }}>
              <h3>Leaderboard Results</h3>
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Dept</th><th>Crit 1</th><th>Crit 2</th><th>Crit 3</th><th>Avg</th></tr>
                </thead>
                <tbody>
                  {performanceResults.map((r, i) => (
                    <tr key={i}><td>{r.name}</td><td>{r.department}</td><td>{Number(r.s1).toFixed(1)}</td><td>{Number(r.s2).toFixed(1)}</td><td>{Number(r.s3).toFixed(1)}</td><td className="bold">{Number(r.total).toFixed(1)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- BEST DRESS --- */}
        {activeModule === 'best-dress' && (
          <div className="module-content">
             {renderModuleHeader("Best Dress Table Results", "👗")}
             <p>Simple voting data will appear here.</p>
          </div>
        )}

        {/* --- FEEDBACK --- */}
        {activeModule === 'feedback' && (
          <div className="module-content">
             {renderModuleHeader("Guest Feedback", "💬")}
             <div className="feedback-list">
               {feedbacks.map((f, i) => (
                 <div key={i} className="feedback-item card">
                    <div className="rate">Rating: {f.rating}/5</div>
                    <p>{f.comment}</p>
                    <small>{new Date(f.created_at).toLocaleString()}</small>
                 </div>
               ))}
               {feedbacks.length === 0 && <p>No feedback received yet.</p>}
             </div>
          </div>
        )}

      </main>

      {/* --- MODAL FOR ADD/EDIT --- */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content card">
            <h3>{editingItem ? "Edit " : "Add "} {activeModule === 'prizes' || (activeModule === 'lucky-draw' && activeSubTab === 'manage') ? "Prize" : "Employee"}</h3>
            <form onSubmit={activeModule === 'employees' ? saveEmployee : savePrize}>
              {activeModule === 'employees' ? (
                <>
                  <label>Name</label><input name="name" defaultValue={editingItem?.name} required />
                  <label>Department</label><input name="department" defaultValue={editingItem?.department} required />
                </>
              ) : (
                <>
                  <label>Session</label><input name="session" defaultValue={editingItem?.session || "Session 1"} required />
                  <label>Rank</label><input name="rank" type="number" defaultValue={editingItem?.rank || 0} required />
                  <label>Prize Name</label><input name="name" defaultValue={editingItem?.name} required />
                  <label>Quantity</label><input name="quantity" type="number" defaultValue={editingItem?.quantity || 1} required />
                </>
              )}
              <div className="modal-actions">
                <button type="submit" className="save-btn">Save Changes</button>
                <button type="button" onClick={() => setIsModalOpen(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- STAGE VIEW WHEEL --- */}
      {showStageView && drawResult && (
        <LuckyDrawWheel 
          prize={drawResult.prize}
          winner={drawResult.winner}
          onFinish={() => { setShowStageView(false); fetchAllData(); }}
          onClose={() => setShowStageView(false)}
        />
      )}

      <style>{`
        .admin-layout { display: flex; min-height: 100vh; background: #f1f5f9; }
        .admin-sidebar { width: 260px; background: #1e293b; color: white; padding: 2rem 1rem; }
        .sidebar-brand { font-size: 1.5rem; font-weight: 800; margin-bottom: 3rem; color: var(--primary); padding-left: 1rem; }
        .sidebar-nav button { display: block; width: 100%; text-align: left; padding: 1rem; background: transparent; border: none; color: #94a3b8; font-weight: 600; cursor: pointer; border-radius: 8px; margin-bottom: 0.5rem; }
        .sidebar-nav button.active { background: var(--primary); color: white; }
        .admin-main { flex: 1; padding: 3rem; position: relative; }
        .card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
        .admin-tabs { display: flex; gap: 1rem; margin-bottom: 2rem; }
        .admin-tabs button { background: transparent; border-bottom: 3px solid transparent; padding: 0.5rem 1rem; font-weight: 700; cursor: pointer; color: #64748b; }
        .admin-tabs button.active { border-bottom-color: var(--primary); color: var(--primary); }
        .admin-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; margin-top: 1rem; }
        .admin-table th { background: #f8fafc; text-align: left; padding: 1rem; font-size: 0.8rem; color: #64748b; text-transform: uppercase; }
        .admin-table td { padding: 1rem; border-bottom: 1px solid #f1f5f9; }
        .bold { font-weight: 700; }
        .panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .add-btn { background: var(--primary); color: white; padding: 0.5rem 1rem; border-radius: 8px; font-weight: 700; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { width: 100%; max-width: 500px; }
        .modal-content label { display: block; margin: 1rem 0 0.5rem; font-weight: 700; }
        .modal-content input { width: 100%; padding: 0.8rem; border: 1px solid #e2e8f0; border-radius: 8px; }
        .modal-actions { display: flex; gap: 1rem; margin-top: 2rem; }
        .save-btn { background: var(--primary); color: white; flex: 1; padding: 1rem; border-radius: 8px; font-weight: 700; }
        .text-red { color: #ef4444; margin-left: 1rem; }
        .perf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; }
        .mini-form { display: flex; gap: 0.5rem; margin-top: 1rem; }
        .mini-form input { flex: 1; padding: 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; }
        .edit-row input { width: 100%; padding: 0.5rem; margin-bottom: 0.5rem; border: 1px solid #e2e8f0; border-radius: 4px; }
        .draw-controls { display: flex; gap: 1rem; margin: 2rem 0; }
        .draw-big-btn { flex: 1; background: var(--primary); color: white; padding: 1.5rem; border-radius: 12px; font-size: 1.2rem; font-weight: 800; }
      `}</style>
    </div>
  );
};

export default Admin;

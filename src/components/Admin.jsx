import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LuckyDrawWheel from './LuckyDrawWheel';
import ClaimScanner from './ClaimScanner';

const SITE_VERSION = "v1.5.0";

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
  const [performanceStatus, setPerformanceStatus] = useState({ voting_status: 'CLOSED' });
  const [bestDressStatus, setBestDressStatus] = useState('CLOSED');
  const [bestDressNominees, setBestDressNominees] = useState([]);
  const [bdSubmissions, setBdSubmissions] = useState([]);

  
  // UI State
  const [loading, setLoading] = useState(false);
  const [showStageView, setShowStageView] = useState(false);
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
  const sessionPrizes = selectedSession ? prizes.filter(p => p.session === selectedSession) : [];
  const totalQuantity = sessionPrizes.reduce((sum, p) => sum + p.quantity, 0);
  const currentWinners = (employees || []).filter(e => sessionPrizes.some(p => p.name === e.won_prize)).length;
  const remainingToDraw = totalQuantity - currentWinners;

  useEffect(() => {
    fetchAllData();
  }, [activeModule]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [empRes, prizeRes, perfRes, feedRes, critRes, partRes, pStatRes, bdStatRes, bdNomRes, bdSubRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/prizes'),
        axios.get('/api/performance/results'),
        axios.get('/api/feedback'),
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
      data = { name: formData.get('name'), song_name: formData.get('song_name'), department: formData.get('department') };
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
            <SidebarItem id="lucky-draw-claim" label="Lucky Draw Claim" icon="🎁" />
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

              {activeSubTab === 'conduct' && (() => {
                const sessionPrizes = prizes.filter(p => p.session === selectedSession);
                const totalQuantity = sessionPrizes.reduce((sum, p) => sum + p.quantity, 0);
                const currentWinners = (employees || []).filter(e => sessionPrizes.some(p => p.name === e.won_prize)).length;
                const remainingToDraw = totalQuantity - currentWinners;

                return (
                  <div className="hero-draw-card" style={{ padding: '3rem', margin: '2rem 0', background: 'white' }}>
                    {showStageView && drawResult ? (
                      <LuckyDrawWheel 
                        prize={drawResult.prize} 
                        winner={drawResult.winner} 
                        isInline={true}
                        onFinish={() => {}}
                        onClose={() => { setShowStageView(false); fetchAllData(); }}
                      />
                    ) : (
                      <div className="ready-state" style={{ textAlign: 'center' }}>
                        <div className="input-row" style={{ maxWidth: '400px', margin: '0 auto 2.5rem' }}>
                          <select value={selectedSession} onChange={(e) => { setSelectedSession(e.target.value); setSelectedPrizeId(''); }} className="modern-select" style={{ padding: '1rem', fontSize: '1.1rem', borderRadius: '12px', width: '100%', border: '2px solid #e2e8f0', fontWeight: 700 }}>
                            <option value="">-- Choose Session to Begin --</option>
                            {[...new Set(prizes.map(p => p.session))].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        
                        <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Ready for the next draw?</h2>
                        <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '3rem' }}>{selectedSession ? `Remaining Prizes: ${remainingToDraw}` : 'Select a session above to view prize counts and start the draw.'}</p>
                        
                        <div className="draw-actions" style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', opacity: selectedSession ? 1 : 0.5, pointerEvents: selectedSession ? 'auto' : 'none' }}>
                          <button className="btn-redraw" onClick={handleRedraw} disabled={loading || !lastWinner} style={{ background: 'rgba(223, 61, 78, 0.08)', color: '#df3d4e', border: '2px solid #df3d4e', padding: '1.25rem 2.5rem', borderRadius: '99px', fontSize: '1.25rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="icon">🔄</span> Redraw
                          </button>
                          <button className="btn-draw-main" onClick={handleNextDraw} disabled={!selectedSession || loading || remainingToDraw <= 0} style={{ background: 'linear-gradient(135deg, #0a8276 0%, #0d9488 100%)', color: 'white', border: 'none', padding: '1.25rem 3.5rem', borderRadius: '99px', fontSize: '1.5rem', fontWeight: 900, cursor: 'pointer', boxShadow: '0 20px 40px rgba(10, 130, 118, 0.25)', display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <span className="icon">🎁</span> NEXT PRIZE
                          </button>
                          <button className="btn-draw-batch" onClick={handleDrawAll} disabled={!selectedSession || loading || remainingToDraw <= 0} style={{ background: '#1e293b', color: 'white', border: 'none', padding: '1.25rem 2.5rem', borderRadius: '99px', fontSize: '1.25rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span className="icon">📋</span> Batch Draw
                          </button>
                        </div>
                      
                      <div className="secondary-actions" style={{ marginTop: '3rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', alignItems: 'center' }}>
                        <div className="manual-pick-box" style={{ background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#64748b' }}>MANUAL:</span>
                          <select value={selectedPrizeId} onChange={(e) => setSelectedPrizeId(e.target.value)} className="modern-select" style={{ border: 'none', background: 'transparent', fontWeight: 700 }}>
                            <option value="">Quick Pick Prize...</option>
                            {prizes.filter(p => !selectedSession || p.session === selectedSession).map(p => (
                               <option key={p.id} value={p.id} disabled={(p.quantity - getDrawnCount(p.name)) <= 0}>{p.rank}. {p.name}</option>
                            ))}
                          </select>
                          {selectedPrizeId && <button className="secondary-btn" onClick={conductDraw} style={{ padding: '0.4rem 0.8rem' }}>Go</button>}
                        </div>
                      </div>

                      {isProcessingBatch && (
                        <div className="batch-process-view" style={{ marginTop: '3rem', padding: '3rem', background: '#f8fafc', borderRadius: '24px', textAlign: 'center' }}>
                          <div className="spinner-large" style={{ fontSize: '4rem', animation: 'spin 1s linear infinite' }}>🎲</div>
                          <h2 style={{ fontSize: '2rem', fontWeight: 900, marginTop: '1.5rem' }}>Drawing {selectedSession} Winners...</h2>
                          <p style={{ color: '#0a8276', fontWeight: 800, fontSize: '1.2rem', marginTop: '1rem' }}>Processing prize algorithm for {batchDrawResults.length} items</p>
                          <div className="progress-bar-container" style={{ width: '100%', maxWidth: '400px', height: '8px', background: '#e2e8f0', borderRadius: '4px', margin: '2rem auto', overflow: 'hidden' }}>
                            <div className="progress-fill" style={{ width: '100%', height: '100%', background: '#0a8276', animation: 'progress 3s linear' }}></div>
                          </div>
                        </div>
                      )}

                      {showBatchSummary && !isProcessingBatch && (
                        <div className="batch-results-overlay" style={{ marginTop: '3rem', borderTop: '2px dashed #e2e8f0', paddingTop: '3rem' }}>
                          <div className="batch-header" style={{ marginBottom: '2rem' }}>
                             <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎊</div>
                             <h2 style={{ fontSize: '2.5rem', fontWeight: 900 }}>Grand Draw Success!</h2>
                             <p style={{ fontSize: '1.2rem', color: '#0a8276', fontWeight: 800 }}>Successfully drawn {batchDrawResults.length} winners for {selectedSession}</p>
                          </div>
                          <div className="batch-winner-scroller" style={{ maxHeight: '400px', overflowY: 'auto', background: '#f8fafc', borderRadius: '16px', padding: '2rem' }}>
                             <table className="clean-table">
                               <thead>
                                 <tr><th>WINNER NAME</th><th>PRIZE WON</th></tr>
                               </thead>
                               <tbody>
                                 {batchDrawResults.map((res, idx) => (
                                   <tr key={idx}>
                                     <td style={{ fontWeight: 800, color: '#1e293b' }}>{res.winner}</td>
                                     <td style={{ fontWeight: 600, color: '#64748b' }}>{res.prize}</td>
                                   </tr>
                                 ))}
                               </tbody>
                             </table>
                          </div>
                          <button className="btn-next" style={{ marginTop: '2rem', margin: '2rem auto 0' }} onClick={() => setShowBatchSummary(false)}>Got it, Close Summary</button>
                        </div>
                      )}
                    </div>
                    )}
                  </div>
                );
              })()}

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
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                     <h3>Winner Registry</h3>
                     {selectedSession && (
                       <button className="btn-reset session-reset-btn" onClick={handleResetSession} style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>
                         ⚠️ Reset {selectedSession} Winners
                       </button>
                     )}
                   </div>
                   <div style={{ marginBottom: '1.5rem', padding: '0 1rem' }}>
                      <input 
                        type="text" 
                        placeholder="Search winners by name or department..." 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        style={{ width: '100%', padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem' }}
                      />
                   </div>
                   <table className="modern-table">
                     <thead><tr><th>NAME</th><th>DEPARTMENT</th><th>PRIZE</th><th>CLAIM STATUS</th><th>ACTIONS</th></tr></thead>
                     <tbody>
                       {sortResults(
                         employees
                           .filter(e => e.won_prize)
                           .filter(e => !selectedSession || prizes.find(p => p.name === e.won_prize)?.session === selectedSession)
                           .filter(e => 
                             e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (e.department && e.department.toLowerCase().includes(searchTerm.toLowerCase()))
                           ), 
                         searchTerm
                       ).map(e => (
                         <tr key={e.id}>
                           <td>{e.name}</td>
                           <td>{e.department}</td>
                           <td className="bold text-teal">{e.won_prize}</td>
                           <td>
                             {e.is_claimed ? (
                               <span className="pill done">Claimed</span>
                             ) : (
                               <span className="pill pending">Unclaimed</span>
                             )}
                           </td>
                           <td>
                             {!e.is_claimed ? (
                               <button onClick={() => handleManualClaim(e.id)} className="table-btn claim-btn" style={{ color: '#059669', borderColor: '#059669' }}>Confirm Claim</button>
                             ) : (
                               <button onClick={() => handleUnclaim(e.id)} className="table-btn" style={{ color: '#94a3b8' }}>Undo</button>
                             )}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
           )}

          {activeModule === 'lucky-draw-claim' && (
            <div className="claims-module">
              <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '400px' }}>
                  <div className="card shadow-card">
                    <h3>Scan Winner QR</h3>
                    <p style={{ color: '#64748b', marginBottom: '2rem' }}>Focus the winner's QR code in the camera frame to auto-claim the prize.</p>
                    <ClaimScanner onClaimSuccess={fetchAllData} />
                  </div>
                </div>
                <div style={{ flex: 1.5, minWidth: '400px' }}>
                  <div className="card shadow-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                      <h3>Claim Status ({employees.filter(e => e.won_prize && e.is_claimed).length} / {employees.filter(e => e.won_prize).length})</h3>
                      <div className="progress-mini" style={{ width: '150px', height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ width: `${(employees.filter(e => e.won_prize && e.is_claimed).length / Math.max(1, employees.filter(e => e.won_prize).length)) * 100}%`, height: '100%', background: '#10b981' }}></div>
                      </div>
                    </div>
                    <div className="winner-scroll-list" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                      <table className="modern-table">
                        <thead><tr><th>NAME</th><th>PRIZE</th><th>STATUS</th></tr></thead>
                        <tbody>
                          {employees.filter(e => e.won_prize).map(e => (
                            <tr key={e.id}>
                              <td>{e.name}</td>
                              <td className="bold">{e.won_prize}</td>
                              <td>
                                {e.is_claimed ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ color: '#10b981', fontWeight: 800 }}>✅ CLAIMED</span>
                                    <button onClick={() => handleUnclaim(e.id)} className="table-btn" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>Undo</button>
                                  </div>
                                ) : (
                                  <button onClick={() => handleManualClaim(e.id)} className="table-btn" style={{ color: '#0a8276', borderColor: '#0a8276' }}>Click to Claim</button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeModule === 'employees' && (
            <div className="card shadow-card">
              <div className="card-header-actions" style={{ padding: '2rem 2rem 1rem' }}>
                <h3>Employee Database ({employees.length})</h3>
                <div className="btn-group">
                  <label className="secondary-btn">CSV Bulk Update <input type="file" accept=".csv" onChange={(e) => handleFileUpload(e, 'employees')} style={{display:'none'}} /></label>
                  <button className="modern-add-btn" onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>+ Add Employee</button>
                </div>
              </div>
              <div style={{ padding: '0 2rem 1.5rem' }}>
                 <input 
                   type="text" 
                   placeholder="Search employees by name, ID or department..." 
                   value={searchTerm} 
                   onChange={(e) => setSearchTerm(e.target.value)} 
                   style={{ width: '100%', padding: '0.8rem 1.2rem', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '1rem' }}
                 />
              </div>
              <table className="modern-table">
                <thead><tr><th>NAME</th><th>DEPARTMENT</th><th>STATUS</th><th>ACTIONS</th></tr></thead>
                <tbody>
                  {sortResults(
                    employees.filter(e => 
                      e.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                      (e.id && String(e.id).toLowerCase().includes(searchTerm.toLowerCase())) ||
                      e.department.toLowerCase().includes(searchTerm.toLowerCase())
                    ), 
                    searchTerm
                  ).map(e => (
                    <tr key={e.id}>
                      <td className="bold">{e.name}</td><td>{e.department}</td>
                      <td>
                        {e.won_prize ? (
                          <span className="pill drawn">Won: {e.won_prize}</span>
                        ) : (
                          <span className="pill eligible">Eligible</span>
                        )}
                      </td>
                      <td><button onClick={() => { setEditingItem(e); setIsModalOpen(true); }} className="table-btn">Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                    <thead><tr><th>NAME</th><th>SONG</th><th>DEPT</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                      {participants.map(p => (
                        <tr key={p.id}>
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
                  <h3>Real-time Leaderboard (70% Guest / 30% Admin)</h3>
                  <table className="modern-table">
                    <thead>
                      <tr>
                        <th>RANK</th>
                        <th>PERFORMER</th>
                        <th>GUEST (70%)</th>
                        <th>ADMIN LK1 (30%)</th>
                        <th>OVERALL</th>
                        <th>VOTES</th>
                      </tr>
                    </thead>
                    <tbody>
                      {performanceResults.map((r, i) => (
                        <tr key={r.id || i}>
                          <td style={{fontWeight: 900, color: '#94a3b8'}}>#{i+1}</td>
                          <td>
                            <div className="bold">{r.name}</div>
                            <div style={{fontSize: '0.8rem', color: '#64748b'}}>{r.song_name}</div>
                          </td>
                          <td className="bold text-teal">{r.guest_portion}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input 
                                type="number" 
                                min="0" 
                                max="100"
                                className="inline-edit-input" 
                                style={{ width: '80px', border: '1px solid #e2e8f0', textAlign: 'center' }}
                                defaultValue={r.manual_score}
                                onBlur={async (e) => {
                                  await axios.put(`/api/performance/participants/${r.id}/manual-score`, { score: e.target.value });
                                  fetchAllData();
                                }}
                              />
                              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>/ 100</span>
                            </div>
                          </td>
                          <td className="bold" style={{fontSize: '1.2rem', color: '#0a8276'}}>{r.total}</td>
                          <td>{r.vote_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeModule === 'best-dress' && (
            <div className="best-dress-module">
              <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
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

              <div style={{ display: 'flex', gap: '2rem' }}>
                {/* Photo Submissions */}
                <div className="card shadow-card" style={{ flex: 2 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                    <div>
                      <h3 style={{ margin:0 }}>Photo Submissions ({bdSubmissions.length})</h3>
                      <p style={{ color:'#64748b', fontSize:'0.8rem', margin:'4px 0 0' }}>All photos submitted by employees. Click AI Rank to auto-select top 3M + 3F.</p>
                    </div>
                    <button
                      className="modern-add-btn"
                      style={{ background:'linear-gradient(135deg,#7c3aed,#0A8276)', whiteSpace:'nowrap' }}
                      onClick={async () => {
                        if (!confirm('Run AI ranking? This will score all photos and replace current finalists with top 3 Male + top 3 Female.')) return;
                        try {
                          setLoading(true);
                          const res = await axios.post('/api/best-dress/ai-rank');
                          alert(`AI Ranking Done!\n${res.data.selected.map(s => `${s.gender}: ${s.name} (Score: ${s.score})`).join('\n')}`);
                          fetchAllData();
                        } catch(e) { alert('AI Rank failed: ' + (e.response?.data?.error || e.message)); }
                        finally { setLoading(false); }
                      }}
                    >AI Rank (Gemini)</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(160px, 1fr))', gap:'1rem', maxHeight:'500px', overflowY:'auto' }}>
                    {bdSubmissions.map(sub => (
                      <div key={sub.id} style={{ background:'#f8fafc', borderRadius:'16px', padding:'0.75rem', border:'1px solid #e2e8f0', textAlign:'center' }}>
                        {sub.photo_path
                          ? <img src={`/api/photos/bd/${sub.photo_path}`} alt={sub.name} style={{ width:'100%', height:'120px', objectFit:'cover', borderRadius:'12px', marginBottom:'0.5rem' }} />
                          : <div style={{ width:'100%', height:'120px', background:'#e2e8f0', borderRadius:'12px', marginBottom:'0.5rem', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'2rem' }}>No Photo</div>
                        }
                        <div style={{ fontWeight:800, fontSize:'0.85rem', color:'#1e293b', marginBottom:'2px' }}>{sub.name}</div>
                        <div style={{ fontSize:'0.72rem', color:'#64748b' }}>{sub.department}</div>
                        <div style={{ marginTop:'4px' }}>
                          <span style={{ background: sub.gender==='Female' ? 'rgba(236,72,153,0.1)' : 'rgba(99,102,241,0.1)', color: sub.gender==='Female' ? '#db2777' : '#4f46e5', padding:'2px 8px', borderRadius:'99px', fontSize:'0.7rem', fontWeight:700 }}>
                            {sub.gender}
                          </span>
                        </div>
                        {sub.ai_score != null && <div style={{ marginTop:'4px', fontSize:'0.7rem', color:'#0A8276', fontWeight:700 }}>AI: {sub.ai_score}/100</div>}
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete ${sub.name}'s submission?`)) return;
                            try { await axios.delete(`/api/best-dress/submissions/${sub.id}`); fetchAllData(); }
                            catch(e) { alert('Delete failed'); }
                          }}
                          style={{ marginTop:'6px', width:'100%', padding:'4px', borderRadius:'8px', border:'1px solid #fca5a5', background:'#fef2f2', color:'#ef4444', fontSize:'0.7rem', fontWeight:700, cursor:'pointer' }}
                        >Delete</button>
                      </div>
                    ))}
                    {bdSubmissions.length === 0 && <div style={{ gridColumn:'1/-1', textAlign:'center', color:'#94a3b8', padding:'2rem' }}>No submissions yet</div>}
                  </div>
                </div>

                {/* Finalists & Voting Standings */}
                <div className="card shadow-card" style={{ flex: 1 }}>
                  <h3>Voting Finalists</h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>These names appear on the guest voting page during the VOTING phase.</p>
                  <table className="modern-table">
                    <thead><tr><th>FINALIST</th><th>VOTES</th><th>ACTIONS</th></tr></thead>
                    <tbody>
                      {bestDressNominees.map(n => (
                        <tr key={n.id}>
                          <td className="bold">{n.nominee_name}</td>
                          <td className="text-teal" style={{fontWeight: 900}}>{n.vote_count}</td>
                          <td>
                            <button onClick={async () => { if(confirm('Remove finalist?')) { await axios.delete(`/api/best-dress/nominees/${n.id}`); fetchAllData(); } }} className="table-btn" style={{color:'#f43f5e'}}>Delete</button>
                          </td>
                        </tr>
                      ))}
                      {bestDressNominees.length === 0 && <tr><td colSpan="3" style={{textAlign:'center', color:'#94a3b8'}}>No finalists added yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}




          {activeModule === 'guest-feedback' && (
            <div className="card shadow-card">
              <h3>Guest Feedback ({feedbacks.length})</h3>
              <div className="feedback-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
                {feedbacks.map(f => (
                  <div key={f.id} className="feedback-bubble" style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#fbbf24', fontSize: '1.2rem', marginBottom: '0.5rem' }}>{'★'.repeat(f.rating)}</div>
                    <p style={{ color: '#1e293b', fontWeight: 600 }}>{f.comment}</p>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '1rem' }}>{new Date(f.created_at).toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      <style>{`
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
    </div>
  );
};

export default Admin;

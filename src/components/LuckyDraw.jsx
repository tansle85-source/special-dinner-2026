import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LuckyDrawWheel from './LuckyDrawWheel';

const LuckyDraw = () => {
  const [employees, setEmployees] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [activeSession, setActiveSession] = useState('Session 1');
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWheel, setShowWheel] = useState(false);
  const [currentDraw, setCurrentDraw] = useState(null); // { prize, winner }
  const [lastWinner, setLastWinner] = useState(null); // To enable Redraw

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [empRes, prizeRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/prizes')
      ]);
      setEmployees(empRes.data);
      setPrizes(prizeRes.data);
    } catch (err) {
      console.error('Data sync failed', err);
    }
  };

  const handleNextDraw = async () => {
    try {
      setLoading(true);
      const res = await axios.post('/api/draw/next', { session: activeSession });
      setCurrentDraw(res.data);
      setLastWinner(res.data.winner);
      setShowWheel(true);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Draw failed");
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
        prizeName: currentDraw?.prize?.name 
      });
      setCurrentDraw({ prize: currentDraw.prize, winner: res.data.winner });
      setLastWinner(res.data.winner);
      setShowWheel(true); // Restart wheel animation
      fetchData();
    } catch (err) {
      alert("Redraw failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDrawAll = async () => {
    if (!window.confirm(`Draw ALL remaining prizes for ${activeSession}?`)) return;
    try {
      setLoading(true);
      await axios.post('/api/draw/session-all', { session: activeSession });
      fetchData();
    } catch (err) {
      alert("Batch draw failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSession = async () => {
    if (!window.confirm(`Reset ALL winners for ${activeSession} only?`)) return;
    try {
      setLoading(true);
      await axios.post('/api/draw/session-reset', { session: activeSession });
      fetchData();
    } catch (err) {
      alert("Reset failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
        setIsFullscreen(false);
      }
    }
  };

  // Logic: Get winners specifically for current session
  const sessionPrizes = (prizes || []).filter(p => p.session === activeSession);
  const winnersForSession = [];
  sessionPrizes.forEach(prize => {
    const winners = (employees || []).filter(e => e.won_prize === prize.name);
    winners.forEach(w => winnersForSession.push({ ...w, prizeName: prize.name, rank: prize.rank }));
    
    // Add pending slots
    const remaining = prize.quantity - winners.length;
    for (let i = 0; i < remaining; i++) {
      winnersForSession.push({ name: '-', department: '-', prizeName: prize.name, rank: prize.rank, isPending: true });
    }
  });

  const eligibleEmployees = (employees || []).filter(e => !e.won_prize && e.checked_in);
  const uniqueSessions = [...new Set((prizes || []).map(p => p.session))].sort();

  return (
    <div className="professional-layout">
      {/* Sidebar - Simple version with focus on Lucky Draw */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h2>Appreciation <span>Night 2026</span></h2>
          <p className="muted" style={{ fontSize: '0.7rem', fontWeight: 800 }}>Control Center 2026</p>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-group">
            <div className="group-label" style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '10px', fontWeight: 800 }}>Events</div>
            <a href="#" className="nav-item active"><span className="icon">🎡</span> Lucky Draw</a>
          </div>
        </nav>
        <div className="sidebar-footer">
          <Link to="/admin" className="nav-item"><span className="icon">⚙️</span> Admin Dashboard</Link>
          <a href="#" className="nav-item" onClick={() => window.location.href='/'}><span className="icon">🏠</span> Back to Home</a>
        </div>
      </aside>

      {/* Main Area */}
      <main className="main-area">
        <header className="top-bar">
          <div className="page-breadcrumb">
             <span style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>Pages / Lucky Draw</span>
             <h1 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Live Draw Console</h1>
          </div>
          <div className="header-meta">
            <Link to="/admin" className="btn-admin-dash">Admin Dashboard</Link>
            <button className="btn-fullscreen" onClick={toggleFullscreen}>
               {isFullscreen ? "Exit Fullscreen" : "⛶ Fullscreen"}
            </button>
          </div>
        </header>

        <div className="content-scroll">
          {/* Sub Header */}
          <div className="draw-sub-header" style={{ marginBottom: '2.5rem' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900 }}>Live Lucky Draw</h1>
            <p style={{ color: '#64748b', fontWeight: 600 }}>Roll for winners in real-time | <span style={{ color: '#0a8276', fontWeight: 800 }}>{eligibleEmployees.length} potential candidates</span></p>
          </div>

          {/* Session Selector Pills */}
          <div className="session-pill-bar">
            {uniqueSessions.map(session => (
              <button 
                key={session}
                className={`session-pill ${activeSession === session ? 'active' : ''}`}
                onClick={() => setActiveSession(session)}
              >
                {session}
              </button>
            ))}
          </div>

          {/* Large Hero Draw Card */}
          <div className="hero-draw-card">
            {showWheel && currentDraw ? (
              <LuckyDrawWheel 
                prize={currentDraw.prize} 
                winner={currentDraw.winner} 
                isInline={true}
                onFinish={() => {}}
                onClose={() => setShowWheel(false)}
              />
            ) : (
              <div className="ready-state">
                <h2 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: '0.5rem' }}>Ready for the next draw?</h2>
                <p style={{ color: '#64748b', fontSize: '1.1rem', marginBottom: '3rem' }}>Select a session and click Spin Wheel</p>
                <div className="draw-actions" style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
                  <button className="btn-draw-main" onClick={handleNextDraw} disabled={loading}>
                    <span className="icon">🎁</span> Next Prize
                  </button>
                  <button className="btn-draw-batch" onClick={handleDrawAll} disabled={loading}>
                    <span className="icon">📋</span> Draw All ({winnersForSession.filter(w => w.isPending).length})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Split Table Grid */}
          <div className="registry-split">
            {/* Winners Pillar */}
            <div className="registry-card">
              <div className="card-header">
                <h3>🏆 Session Winners</h3>
                <div className="header-btns" style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-reset-small" onClick={handleResetSession}>Reset</button>
                  <button className="btn-icon" onClick={fetchData} title="Refresh Data">↻</button>
                </div>
              </div>
              <div className="table-scroller" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                <table className="clean-table">
                  <thead>
                    <tr><th>RANK</th><th>PRIZE</th><th>WINNER</th><th>STATUS</th></tr>
                  </thead>
                  <tbody>
                    {winnersForSession.map((w, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 800, color: '#94a3b8' }}>{w.rank}</td>
                        <td style={{ fontWeight: 700 }}>{w.prizeName}</td>
                        <td>
                          {w.isPending ? '-' : w.name}
                          {!w.isPending && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{w.department}</div>}
                        </td>
                        <td>
                          <span className={`status-tag ${w.isPending ? 'pending' : 'drawn'}`}>
                            {w.isPending ? 'Pending' : 'Drawn'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {winnersForSession.length === 0 && (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontStyle: 'italic' }}>No prizes found for this session.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Eligibility Pillar */}
            <div className="registry-card">
              <div className="card-header">
                <h3>👥 Eligible Pool ({eligibleEmployees.length})</h3>
                <div className="header-btns">
                  <button className="btn-icon" onClick={handleRedraw} disabled={!lastWinner} title="Redraw last winner">🔄</button>
                </div>
              </div>
              <div className="table-scroller" style={{ maxHeight: '450px', overflowY: 'auto' }}>
                <table className="clean-table">
                  <thead>
                    <tr><th>NAME</th><th>DEPARTMENT</th></tr>
                  </thead>
                  <tbody>
                    {eligibleEmployees.slice(0, 100).map(e => (
                      <tr key={e.id}>
                        <td style={{ fontWeight: 700 }}>{e.name}</td>
                        <td style={{ color: '#64748b' }}>{e.department}</td>
                      </tr>
                    ))}
                    {eligibleEmployees.length > 100 && (
                      <tr><td colSpan="2" style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8' }}>... and {eligibleEmployees.length - 100} more members</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LuckyDraw;
    </div>
  );
};

export default LuckyDraw;

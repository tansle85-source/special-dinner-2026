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

  const eligibleEmployees = (employees || []).filter(e => !e.won_prize);
  const uniqueSessions = [...new Set((prizes || []).map(p => p.session))].sort();

  return (
    <div className="premium-dashboard">
      <header className="dashboard-header-bar">
        <div className="brand-stack">
          <div className="year-logo">2026</div>
          <nav className="main-nav">
            <a href="#" className="active">Lucky Draw</a>
            <a href="#">Table Selection</a>
            <a href="#">Guest Check-in</a>
          </nav>
        </div>
        <div className="header-actions">
          <Link to="/admin" className="admin-btn">Admin Dashboard</Link>
          <button className="fullscreen-btn" onClick={toggleFullscreen}>
             {isFullscreen ? "Exit Fullscreen" : "⛶ Fullscreen"}
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="top-banner">
          <div className="banner-text">
            <h1>Live Lucky Draw</h1>
            <p>Roll for winners in real-time | <span>{eligibleEmployees.length}</span> potential candidates</p>
          </div>
        </div>

        <div className="session-tab-container">
          <div className="session-tabs-row">
            {uniqueSessions.map(s => (
              <button key={s} className={`sess-tab ${activeSession === s ? 'active' : ''}`} onClick={() => setActiveSession(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <section className="hero-control-area card">
          <div className="hero-content">
            {showWheel && currentDraw ? (
              <LuckyDrawWheel 
                isInline={true}
                prize={currentDraw.prize}
                winner={currentDraw.winner}
                onFinish={() => {}}
                onClose={() => setShowWheel(false)}
              />
            ) : (
              <>
                <div className="ready-state">
                   <div className="placeholder-wheel">🎡</div>
                   <p className="status-msg">Ready to draw...</p>
                </div>
              </>
            )}
            
            <div className="control-buttons">
              <button className="btn-redraw" onClick={handleRedraw} disabled={loading || !lastWinner}>
                 Redraw (No Show)
              </button>
              <button className="btn-next" onClick={handleNextDraw} disabled={loading}>
                 Next Prize
              </button>
              <button className="btn-batch" onClick={handleDrawAll} disabled={loading}>
                 Draw All ({winnersForSession.filter(w => w.isPending).length})
              </button>
            </div>
          </div>
        </section>

        <div className="split-grid">
          <div className="grid-column winners-column">
            <div className="column-header">
              <h3>🏆 Session Winners</h3>
              <div className="header-tools">
                <button className="btn-reset" onClick={handleResetSession} title="Reset current session">Reset</button>
                <button className="btn-refresh" onClick={fetchData}>↻</button>
              </div>
            </div>
            <div className="card table-card">
              <table className="data-table">
                <thead><tr><th>RANK</th><th>PRIZE</th><th>WINNER</th><th>STATUS</th></tr></thead>
                <tbody>
                  {winnersForSession.map((w, i) => (
                    <tr key={i} className={w.isPending ? 'pending' : 'drawn'}>
                      <td className="rank-cell">{w.rank}</td>
                      <td className="prize-cell">{w.prizeName}</td>
                      <td className="winner-name">
                        {w.isPending ? '-' : w.name}
                        {!w.isPending && <div className="winner-dept">{w.department}</div>}
                      </td>
                      <td>
                        <span className={`status-pill ${w.isPending ? 'pending' : 'drawn'}`}>
                          {w.isPending ? 'Pending' : 'Drawn'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {winnersForSession.length === 0 && (
                    <tr><td colSpan="4" className="empty-msg">No prizes configured for this session.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid-column eligible-column">
             <div className="column-header">
                <h3>👥 Eligible ({eligibleEmployees.length})</h3>
             </div>
             <div className="card table-card">
                <table className="data-table">
                  <thead><tr><th>NAME</th><th>DEPARTMENT</th></tr></thead>
                  <tbody>
                    {eligibleEmployees.slice(0, 50).map(e => (
                      <tr key={e.id}>
                        <td className="bold">{e.name}</td>
                        <td className="muted">{e.department}</td>
                      </tr>
                    ))}
                    {eligibleEmployees.length > 50 && (
                      <tr className="more-row"><td colSpan="2">... and {eligibleEmployees.length - 50} more candidates</td></tr>
                    )}
                  </tbody>
                </table>
             </div>
          </div>
        </div>
      </main>

      <style>{`
        .premium-dashboard { min-height: 100vh; background: #f0f4f8; font-family: 'Inter', sans-serif; color: #1e293b; padding-bottom: 4rem; }
        .dashboard-header-bar { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 4rem; background: #fff; border-bottom: 1px solid #e1e7ef; }
        .brand-stack { display: flex; align-items: center; gap: 3rem; }
        .year-logo { font-size: 1.5rem; font-weight: 900; color: #0a8276; }
        .main-nav { display: flex; gap: 2rem; }
        .main-nav a { text-decoration: none; color: #64748b; font-weight: 600; font-size: 0.95rem; }
        .main-nav a.active { color: #1e293b; position: relative; }
        .main-nav a.active::after { content: ''; position: absolute; bottom: -8px; left: 0; width: 100%; height: 2px; background: #0a8276; }
        .admin-btn { background: #0a8276; color: white; text-decoration: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700; font-size: 0.9rem; margin-right: 1rem; }
        .fullscreen-btn { border: 1px solid #e1e7ef; background: white; padding: 0.6rem 1.2rem; border-radius: 8px; cursor: pointer; font-weight: 700; color: #64748b; }
        
        .dashboard-main { max-width: 1400px; margin: 0 auto; padding: 3rem 4rem; }
        .top-banner h1 { font-size: 2.5rem; font-weight: 800; margin-bottom: 0.5rem; }
        .top-banner p { color: #64748b; font-weight: 500; }
        .top-banner p span { color: #0a8276; font-weight: 800; }
        
        .session-tab-container { margin: 2.5rem 0; display: flex; justify-content: center; }
        .session-tabs-row { background: #e1e7ef; padding: 0.5rem; border-radius: 12px; display: flex; gap: 0.5rem; }
        .sess-tab { border: none; padding: 0.8rem 2.5rem; border-radius: 8px; background: transparent; color: #64748b; font-weight: 700; cursor: pointer; transition: 0.2s; }
        .sess-tab.active { background: white; color: #0a8276; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .hero-control-area { text-align: center; padding: 4rem 2rem; margin-bottom: 3rem; background: white; }
        .hero-content h2 { font-size: 2.2rem; font-weight: 800; margin-bottom: 1rem; }
        .hero-content p { color: #64748b; margin-bottom: 2.5rem; }
        .control-buttons { display: flex; gap: 1.5rem; justify-content: center; }
        .btn-next { background: #0a8276; color: white; border: none; padding: 1.2rem 3rem; border-radius: 50px; font-size: 1.2rem; font-weight: 800; cursor: pointer; display: flex; align-items: center; justify-content: center; min-width: 220px; transition: 0.3s; }
        .btn-next:hover { transform: scale(1.05); }
        .btn-batch { background: #1e293b; color: white; border: none; padding: 1.2rem 3rem; border-radius: 50px; font-size: 1.1rem; font-weight: 800; cursor: pointer; min-width: 220px; }
        .btn-redraw { background: #e11d48; color: white; border: none; padding: 1.2rem 3rem; border-radius: 50px; font-size: 1.1rem; font-weight: 800; cursor: pointer; min-width: 220px; }
        .btn-redraw:disabled { background: #fda4af; }
        
        .ready-state { padding: 3rem 0; animation: bounce 4s infinite ease-in-out; }
        .placeholder-wheel { font-size: 5rem; margin-bottom: 1rem; opacity: 0.3; }
        .status-msg { font-size: 1.2rem; font-weight: 600; color: #64748b; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .split-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 3rem; align-items: start; }
        .column-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .column-header h3 { font-size: 1.2rem; font-weight: 800; }
        .header-tools { display: flex; gap: 0.8rem; }
        .btn-reset { background: #ef4444; color: white; border: none; padding: 0.4rem 1rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
        .btn-refresh { background: #e1e7ef; border: none; width: 32px; height: 32px; border-radius: 6px; font-weight: 800; cursor: pointer; }
        
        .card { background: white; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.03); border: 1px solid #e1e7ef; }
        .table-card { padding: 1rem; }
        .data-table { width: 100%; border-collapse: collapse; }
        .data-table th { text-align: left; padding: 1rem; color: #94a3b8; font-size: 0.8rem; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; }
        .data-table td { padding: 1.2rem 1rem; border-bottom: 1px solid #f1f5f9; }
        .rank-cell { font-weight: 800; color: #94a3b8; }
        .prize-cell { font-weight: 700; color: #1e293b; }
        .winner-name { font-weight: 700; }
        .winner-dept { font-size: 0.75rem; color: #64748b; font-weight: 500; }
        .status-pill { padding: 4px 12px; border-radius: 99px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
        .status-pill.drawn { background: #dcfce7; color: #166534; }
        .status-pill.pending { background: #f1f5f9; color: #64748b; }
        .bold { font-weight: 700; }
        .muted { color: #64748b; font-size: 0.95rem; }
        .empty-msg { text-align: center; padding: 2rem; color: #94a3b8; font-style: italic; }
        
        button:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
};

export default LuckyDraw;

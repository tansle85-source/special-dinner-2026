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
    <div className="professional-layout public-view">
      {/* Main Area - No Sidebar for Public */}
      <main className="main-area" style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <header className="top-bar" style={{ justifyContent: 'center' }}>
          <div className="sidebar-logo" style={{ marginBottom: 0, textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem' }}>Appreciation <span>Night 2026</span></h2>
          </div>
        </header>

        <div className="content-scroll" style={{ padding: '4rem', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
          {/* Sub Header */}
          <div className="draw-sub-header" style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '0.5rem' }}>Lucky Draw Results</h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: 600 }}>Check the winners for each session below.</p>
          </div>

          {/* Session Selector Pills */}
          <div className="session-pill-bar" style={{ margin: '0 auto 3rem' }}>
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

          {/* Winners Pillar - Full Width for Public */}
          <div className="registry-card shadow-card">
            <div className="card-header" style={{ padding: '2rem 3rem' }}>
              <h3 style={{ fontSize: '1.4rem' }}>🏆 {activeSession} Winners</h3>
              <div className="header-btns">
                 <button className="btn-fullscreen" onClick={toggleFullscreen}>
                   {isFullscreen ? "Exit Fullscreen" : "⛶ Fullscreen"}
                 </button>
              </div>
            </div>
            <div className="table-scroller" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="clean-table" style={{ fontSize: '1.1rem' }}>
                <thead>
                  <tr><th style={{ padding: '20px 30px' }}>RANK</th><th>PRIZE</th><th>WINNER</th><th>DEPARTMENT</th></tr>
                </thead>
                <tbody>
                  {winnersForSession.map((w, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 900, color: '#94a3b8', padding: '20px 30px' }}>{w.rank}</td>
                      <td style={{ fontWeight: 800 }}>{w.prizeName}</td>
                      <td style={{ fontWeight: 700, color: w.isPending ? '#94a3b8' : '#1e293b' }}>
                        {w.isPending ? 'Pending Draw...' : w.name}
                      </td>
                      <td style={{ color: '#64748b' }}>
                         {w.isPending ? '-' : w.department}
                      </td>
                    </tr>
                  ))}
                  {winnersForSession.length === 0 && (
                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', fontStyle: 'italic' }}>Results will appear here once the draw begins.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LuckyDraw;

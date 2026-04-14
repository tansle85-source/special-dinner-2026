import React, { useState, useEffect } from 'react';
import axios from 'axios';

const LuckyDraw = () => {
  const [employees, setEmployees] = useState([]);
  const [prizes, setPrizes] = useState([]);
  const [activeSession, setActiveSession] = useState('Session 1');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all data for the live dashboard
  useEffect(() => {
    fetchDashboardData();
    // Refresh the dashboard every 5 seconds to show live updates during the event!
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [empRes, prizeRes] = await Promise.all([
        axios.get('/api/employees'),
        axios.get('/api/prizes')
      ]);
      setEmployees(empRes.data);
      setPrizes(prizeRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    }
  };

  // Calculations
  const eligibleCount = employees.filter(e => !e.won_prize).length;
  
  // Extract unique sessions from prizes
  const sessions = Array.from(new Set(prizes.map(p => p.session))).sort();
  if (sessions.length === 0) sessions.push('Session 1');

  // We want to list every single *drawn* prize and *pending* prize for the active session
  // Since a prize can have multiple quantities (e.g. 5 headphones), we want to show 5 rows.
  const tableRows = [];
  const sessionPrizes = prizes.filter(p => p.session === activeSession).sort((a, b) => a.rank - b.rank);
  
  sessionPrizes.forEach(prize => {
    // Find all winners for this specific prize
    const winners = employees.filter(e => e.won_prize === prize.name);
    
    // Create a row for every winner
    winners.forEach(winner => {
      tableRows.push({
        prizeId: prize.id,
        rank: prize.rank,
        prizeName: prize.name,
        winnerName: winner.name,
        department: winner.department,
        status: 'Drawn'
      });
    });

    // Create remaining "Pending" rows until we hit the quantity
    const remaining = prize.quantity - winners.length;
    for (let i = 0; i < remaining; i++) {
      tableRows.push({
        prizeId: prize.id,
        rank: prize.rank,
        prizeName: prize.name,
        winnerName: '-',
        department: '-',
        status: 'Pending'
      });
    }
  });

  // Filter based on search query
  const filteredRows = tableRows.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.winnerName.toLowerCase().includes(q) || 
      row.department.toLowerCase().includes(q) ||
      row.prizeName.toLowerCase().includes(q)
    );
  });

  const drawnCountForSession = tableRows.filter(r => r.status === 'Drawn').length;

  return (
    <div className="lucky-draw-dashboard">
      <div className="dashboard-header">
        <h1>Lucky Draw Winners</h1>
        <p>Watch as winners are drawn by the administrators!</p>
        <div className="eligible-counter">
          Current Eligible (Checked-in): <strong>{eligibleCount}</strong>
        </div>
      </div>

      <div className="session-tabs">
        {sessions.map(sess => (
          <button 
            key={sess} 
            className={`session-tab ${activeSession === sess ? 'active' : ''}`}
            onClick={() => setActiveSession(sess)}
          >
            {sess}
          </button>
        ))}
      </div>

      <div className="dashboard-card">
        <div className="card-header">
          <div className="card-title">
            <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>🏆</span> 
            Lucky Winners
          </div>
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search by Name, ID, or Dept..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="search-icon-btn">🔍 Search</button>
          </div>
        </div>

        <div className="table-container">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>RANK</th>
                <th>PRIZE</th>
                <th>WINNER</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row, idx) => (
                  <tr key={idx} className={row.status === 'Drawn' ? 'drawn-row' : 'pending-row'}>
                    <td className="rank-col">{row.rank}</td>
                    <td className="prize-col">{row.prizeName}</td>
                    <td className="winner-col">
                      {row.winnerName !== '-' ? (
                        <div>
                          <div style={{ fontWeight: '700', color: 'var(--text-main)' }}>{row.winnerName}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{row.department}</div>
                        </div>
                      ) : (
                        <span style={{ color: '#d1d5db' }}>Awaiting draw...</span>
                      )}
                    </td>
                    <td>
                      <span className={`status-pill ${row.status === 'Drawn' ? 'drawn' : 'pending'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No prizes match your search for {activeSession}.
                  </td>
                </tr>
              )}
              {filteredRows.length === 0 && !searchQuery && tableRows.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No prizes configured for {activeSession}.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LuckyDraw;

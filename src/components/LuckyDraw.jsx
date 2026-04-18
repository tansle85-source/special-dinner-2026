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

  const [activeTab, setActiveTab] = useState('luckydraw'); // luckydraw, performance, feedback
  const [participants, setParticipants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [votingStatus, setVotingStatus] = useState({});

  useEffect(() => {
    if (activeTab === 'performance') fetchPerformanceData();
  }, [activeTab]);

  const fetchPerformanceData = async () => {
    const [partRes, critRes] = await Promise.all([
      axios.get('/api/performance/participants'),
      axios.get('/api/performance/criteria')
    ]);
    setParticipants(partRes.data);
    setCriteria(critRes.data);
  };

  const submitVote = async (participantId, scores) => {
    try {
      await axios.post('/api/performance/rate', {
        participant_id: participantId,
        score_1: scores[0],
        score_2: scores[1],
        score_3: scores[2]
      });
      setVotingStatus({...votingStatus, [participantId]: 'Voted!'});
    } catch (err) { alert("Vote failed"); }
  };

  return (
    <div className="lucky-draw-dashboard">
      <div className="dashboard-nav-tabs">
        <button className={activeTab === 'luckydraw' ? 'active' : ''} onClick={() => setActiveTab('luckydraw')}>🏆 Draw Results</button>
        <button className={activeTab === 'performance' ? 'active' : ''} onClick={() => setActiveTab('performance')}>🎭 Performance</button>
        <button className={activeTab === 'feedback' ? 'active' : ''} onClick={() => setActiveTab('feedback')}>💬 Feedback</button>
      </div>

      {activeTab === 'luckydraw' && (
        <>
          <div className="dashboard-header">
            <h1>Lucky Draw Winners</h1>
            <p>Watch rewards being drawn live!</p>
            <div className="eligible-counter">
              Remaining Eligible: <strong>{eligibleCount}</strong>
            </div>
          </div>

          <div className="session-tabs">
            {sessions.map(sess => (
              <button key={sess} className={`session-tab ${activeSession === sess ? 'active' : ''}`} onClick={() => setActiveSession(sess)}>{sess}</button>
            ))}
          </div>

          <div className="dashboard-card">
            <div className="card-header">
              <div className="card-title">Lucky Winners</div>
              <div className="search-box">
                <input type="text" placeholder="Search name/dept..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="table-container">
              <table className="dashboard-table">
                <thead><tr><th>PRIZE</th><th>WINNER</th><th>STATUS</th></tr></thead>
                <tbody>
                  {filteredRows.map((row, idx) => (
                    <tr key={idx} className={row.status === 'Drawn' ? 'drawn-row' : 'pending-row'}>
                      <td className="prize-col">{row.prizeName}</td>
                      <td className="winner-col">
                        {row.winnerName !== '-' ? (
                          <div>
                            <div className="bold">{row.winnerName}</div>
                            <div className="small-dept">{row.department}</div>
                          </div>
                        ) : <span className="muted">Pending...</span>}
                      </td>
                      <td><span className={`status-pill ${row.status.toLowerCase()}`}>{row.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'performance' && (
        <div className="performance-voting-view">
          <h2>Performance Voting</h2>
          <p>Rate each participant below (1-5 Excellence)</p>
          <div className="participants-list">
            {participants.map(p => (
              <div key={p.id} className="vote-card card">
                <h3>{p.name}</h3>
                <p>{p.department}</p>
                {votingStatus[p.id] ? (
                  <div className="voted-msg">✅ {votingStatus[p.id]}</div>
                ) : (
                  <div className="rating-inputs">
                    {criteria.map((c, i) => (
                      <div key={c.id} className="rating-row">
                        <label>{c.name}</label>
                        <div className="star-rating">
                          {[1,2,3,4,5].map(num => (
                            <button key={num} onClick={() => {
                              const currentScores = p.scores || [3,3,3];
                              currentScores[i] = num;
                              setParticipants(participants.map(part => part.id === p.id ? {...part, scores: currentScores} : part));
                            }} className={(p.scores?.[i] || 0) >= num ? 'active' : ''}>★</button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <button className="submit-vote-btn" onClick={() => submitVote(p.id, p.scores || [3,3,3])}>Submit Scores</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'feedback' && (
        <div className="feedback-view card">
          <h2>Event Feedback</h2>
          <p>Tell us how we did!</p>
          <form onSubmit={async (e) => {
            e.preventDefault();
            const data = new FormData(e.target);
            await axios.post('/api/feedback', { comment: data.get('comment'), rating: data.get('rating') });
            alert("Thank you!"); e.target.reset();
          }}>
            <label>Rating (1-5)</label>
            <input name="rating" type="number" min="1" max="5" defaultValue="5" required />
            <label>Comment</label>
            <textarea name="comment" required></textarea>
            <button type="submit" className="submit-vote-btn">Send Feedback</button>
          </form>
        </div>
      )}

      <style>{`
        .dashboard-nav-tabs { display: flex; gap: 0.5rem; margin-bottom: 2rem; background: white; padding: 0.5rem; border-radius: 99px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); }
        .dashboard-nav-tabs button { flex: 1; border: none; background: transparent; padding: 0.8rem; border-radius: 99px; font-weight: 700; color: var(--text-muted); }
        .dashboard-nav-tabs button.active { background: var(--primary); color: white; }
        .card { background: white; padding: 1.5rem; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 1.5rem; }
        .bold { font-weight: 700; }
        .small-dept { font-size: 0.8rem; color: var(--text-muted); }
        .muted { color: #d1d5db; }
        .vote-card h3 { color: var(--primary); margin-bottom: 0.5rem; }
        .rating-row { display: flex; justify-content: space-between; align-items: center; margin: 1rem 0; }
        .star-rating button { background: none; border: none; font-size: 1.5rem; color: #e2e8f0; cursor: pointer; }
        .star-rating button.active { color: #facc15; }
        .submit-vote-btn { width: 100%; background: var(--primary); color: white; border: none; padding: 1rem; border-radius: 8px; font-weight: 700; margin-top: 1rem; }
        .feedback-view textarea { width: 100%; height: 100px; padding: 1rem; border: 1px solid var(--border); border-radius: 8px; margin: 1rem 0; }
        .voted-msg { font-weight: 700; color: var(--primary); margin-top: 1rem; }
      `}</style>
    </div>
  );
};

export default LuckyDraw;

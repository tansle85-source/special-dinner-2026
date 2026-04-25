import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PerformanceVoting = ({ defaultTab = 'performance' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [participants, setParticipants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [status, setStatus] = useState('CLOSED');
  const [bdStatus, setBdStatus] = useState('CLOSED');
  const [loading, setLoading] = useState(true);
  const [voterId, setVoterId] = useState('');
  
  // Performance Voting State
  const [myRatings, setMyRatings] = useState({}); 
  
  // Best Dress State
  const [bdNominees, setBdNominees] = useState([]);
  const [myBdNomination, setMyBdNomination] = useState(null);
  const [myBdVote, setMyBdVote] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let vid = localStorage.getItem('performance_voter_id');
    if (!vid) {
      vid = crypto.randomUUID();
      localStorage.setItem('performance_voter_id', vid);
    }
    setVoterId(vid);
    fetchData(vid);
  }, []);

  const fetchData = async (vid) => {
    const timeout = setTimeout(() => setLoading(false), 5000); // 5s safety fallback
    try {
      const [pRes, cRes, sRes, bdStatRes, bdNomRes, empRes] = await Promise.all([
        axios.get('/api/performance/participants'),
        axios.get('/api/performance/criteria'),
        axios.get('/api/performance/status'),
        axios.get('/api/best-dress/status'),
        axios.get('/api/best-dress/nominees'),
        axios.get('/api/employees')
      ]);
      
      setParticipants(pRes.data);
      setCriteria(cRes.data);
      setStatus(sRes.data.voting_status);
      setBdStatus(bdStatRes.data.best_dress_status);
      setBdNominees(bdNomRes.data);
      setEmployees(empRes.data);

      const [myRatingsRes, myNomRes, myVoteRes] = await Promise.all([
        axios.get(`/api/performance/my-ratings/${vid}`),
        axios.get(`/api/best-dress/my-nomination/${vid}`),
        axios.get(`/api/best-dress/my-vote/${vid}`)
      ]);
      
      setMyRatings(myRatingsRes.data);
      setMyBdNomination(myNomRes.data);
      setMyBdVote(myVoteRes.data?.nominee_id);
      
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      clearTimeout(timeout);
      setLoading(false);
    }
  };


  const handlePerformanceVote = async (participantId, scores) => {
    if (status !== 'OPEN') return;
    setSubmitting(true);
    try {
      await axios.post('/api/performance/rate', {
        participant_id: participantId,
        voter_id: voterId,
        score_1: scores[0],
        score_2: scores[1],
        score_3: scores[2]
      });
      
      const updatedRatings = { ...myRatings, [participantId]: scores };
      setMyRatings(updatedRatings);
      
      setMessage('Rating saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNominate = async (employee) => {
    if (bdStatus !== 'NOMINATING') return;
    setSubmitting(true);
    try {
      await axios.post('/api/best-dress/nominate', {
        employee_id: employee.id,
        nominee_name: employee.name,
        voter_id: voterId
      });
      setMyBdNomination({ nominee_name: employee.name, employee_id: employee.id });
      setSearchQuery('');
      setMessage('Nomination submitted!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Nomination failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBestDressVote = async (nomineeId) => {
    if (bdStatus !== 'VOTING') return;
    setSubmitting(true);
    try {
      await axios.post('/api/best-dress/vote', {
        nominee_id: nomineeId,
        voter_id: voterId
      });
      setMyBdVote(nomineeId);
      setMessage('Vote recorded!');
      setTimeout(() => setMessage(''), 3000);
      // Refresh nominees to get updated counts if needed, though usually counts are hidden from guests
      const res = await axios.get('/api/best-dress/nominees');
      setBdNominees(res.data);
    } catch (err) {
      alert(err.response?.data?.error || "Voting failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="voting-container loading">Loading...</div>;

  const filteredEmployees = searchQuery.length > 1 
    ? employees.filter(e => e.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  return (
    <div className="voting-page" id="dinner-voting-app">
      <header className="page-header">
        <div className="brand-logo">{activeTab === 'performance' ? '🎭' : '👗'}</div>
        <h1>
          {activeTab === 'performance' ? 'Performance ' : 'Best Dress '}
          <span className="text-ocean">{activeTab === 'performance' ? 'Voting' : 'Award'}</span>
        </h1>
        
        <div className="tabs-container">
          <button className={`tab-btn ${activeTab === 'performance' ? 'active' : ''}`} onClick={() => setActiveTab('performance')}>Performance</button>
          <button className={`tab-btn ${activeTab === 'best-dress' ? 'active' : ''}`} onClick={() => setActiveTab('best-dress')}>Best Dress</button>
        </div>
      </header>

      <main className="content-area">
        {activeTab === 'performance' && (
          <>
            <div className={`status-badge ${status === 'OPEN' ? 'is-active' : 'is-closed'}`}>
              {status === 'OPEN' ? 'VOTING IS LIVE' : 'VOTING CLOSED'}
            </div>
            {status === 'CLOSED' ? (
              <div className="empty-state">
                <div className="empty-icon">⏳</div>
                <h2>Performance voting is off</h2>
                <p>The host will announce when it's time to rate the performers.</p>
              </div>
            ) : (
              <div className="performers-list">
                {participants.map(p => (
                  <PerformerCard 
                    key={p.id} 
                    performer={p} 
                    criteria={criteria} 
                    onVote={handlePerformanceVote} 
                    previousScores={myRatings[p.id]}
                    disabled={submitting}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'best-dress' && (
          <div className="best-dress-section">
            <div className={`status-badge ${bdStatus !== 'CLOSED' ? 'is-active' : 'is-closed'}`}>
              {bdStatus === 'CLOSED' ? 'PHASE CLOSED' : (bdStatus === 'NOMINATING' ? 'NOMINATION OPEN' : 'VOTING LIVE')}
            </div>

            {bdStatus === 'CLOSED' && (
              <div className="empty-state">
                <div className="empty-icon">👗</div>
                <h2>Best Dress Award</h2>
                <p>Nominations and voting will begin shortly. Dress to impress!</p>
              </div>
            )}

            {bdStatus === 'NOMINATING' && (
              <div className="nomination-box">
                {myBdNomination ? (
                  <div className="already-nominated card">
                    <div className="check-icon">✓</div>
                    <h3>Nomination Submitted</h3>
                    <p>You nominated <span className="highlight">{myBdNomination.nominee_name}</span></p>
                    <button className="text-link" onClick={() => setMyBdNomination(null)}>Change Nomination</button>
                  </div>
                ) : (
                  <div className="nominate-form card">
                    <h3>Who is the best dressed?</h3>
                    <p className="hint">Search for a colleague below to nominate them.</p>
                    <div className="search-wrapper">
                      <input 
                        type="text" 
                        className="modern-input" 
                        placeholder="Type name here..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {filteredEmployees.length > 0 && (
                        <div className="search-results">
                          {filteredEmployees.map(e => (
                            <div key={e.id} className="result-item" onClick={() => handleNominate(e)}>
                              <div className="e-name">{e.name}</div>
                              <div className="e-dept">{e.department}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {bdStatus === 'VOTING' && (
              <div className="voting-list">
                <h3>Select Finalist</h3>
                <p className="hint">Choose your winner from the finalists below!</p>
                <div className="nominees-grid">
                  {bdNominees.map(n => (
                    <div 
                      key={n.id} 
                      className={`nominee-vote-card ${myBdVote === n.id ? 'selected' : ''}`}
                      onClick={() => handleBestDressVote(n.id)}
                    >
                      <div className="nominee-name">{n.nominee_name}</div>
                      {myBdVote === n.id && <div className="vote-indicator">My Choice</div>}
                    </div>
                  ))}
                  {bdNominees.length === 0 && <p className="empty-msg">Waiting for finalists to be announced...</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {message && <div className="success-popup">{message}</div>}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800&display=swap');

        :root {
          --ocean: #0a8276;
          --ocean-light: #f0fdfa;
          --ocean-deep: #065f46;
          --slate: #1e293b;
          --light: #f8fafc;
        }

        .voting-page { 
          min-height: 100vh; 
          background: white; 
          color: var(--slate); 
          padding: 2rem 1.5rem 5rem; 
          font-family: 'Outfit', sans-serif; 
          max-width: 600px;
          margin: 0 auto;
        }

        .page-header { text-align: center; margin-bottom: 2rem; }
        .brand-logo { font-size: 3rem; margin-bottom: 0.5rem; }
        .page-header h1 { font-size: 2rem; font-weight: 800; margin-bottom: 1.5rem; letter-spacing: -1px; }
        .text-ocean { color: var(--ocean); }
        
        .tabs-container { display: flex; background: #f1f5f9; padding: 0.4rem; border-radius: 16px; gap: 0.4rem; }
        .tab-btn { flex: 1; border: none; background: transparent; padding: 0.8rem; border-radius: 12px; font-weight: 800; color: #64748b; cursor: pointer; transition: 0.2s; font-size: 0.9rem; }
        .tab-btn.active { background: white; color: var(--ocean); box-shadow: 0 4px 12px rgba(0,0,0,0.05); }

        .status-badge { 
          display: block; 
          text-align: center;
          margin: 1rem auto 2rem; 
          padding: 6px 16px; 
          border-radius: 20px; 
          font-weight: 800; 
          font-size: 0.75rem; 
          letter-spacing: 0.5px;
          width: fit-content;
        }
        .status-badge.is-active { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; animation: soft-pulse 2s infinite; }
        .status-badge.is-closed { background: #f1f5f9; color: #64748b; }

        @keyframes soft-pulse {
          0% { box-shadow: 0 0 0 0 rgba(16, 101, 52, 0.2); }
          70% { box-shadow: 0 0 0 10px rgba(16, 101, 52, 0); }
          100% { box-shadow: 0 0 0 0 rgba(16, 101, 52, 0); }
        }

        .empty-state { text-align: center; padding: 4rem 2rem; background: var(--ocean-light); border-radius: 32px; border: 2px dashed #99f6e4; }
        .empty-icon { font-size: 4rem; margin-bottom: 1rem; }
        .empty-state h2 { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; }

        .card { background: white; border-radius: 24px; padding: 1.5rem; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        
        .search-wrapper { position: relative; margin-top: 1.5rem; }
        .modern-input { width: 100%; padding: 1rem 1.5rem; border-radius: 16px; border: 2px solid #f1f5f9; font-family: inherit; font-size: 1.1rem; font-weight: 600; outline: none; transition: 0.3s; }
        .modern-input:focus { border-color: var(--ocean); }
        
        .search-results { position: absolute; top: 110%; left: 0; right: 0; background: white; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 10px 30px rgba(0,0,0,0.1); z-index: 100; overflow: hidden; }
        .result-item { padding: 1rem 1.5rem; cursor: pointer; border-bottom: 1px solid #f1f5f9; transition: 0.2s; }
        .result-item:last-child { border-bottom: none; }
        .result-item:hover { background: var(--ocean-light); }
        .result-item .e-name { font-weight: 800; color: #1e293b; }
        .result-item .e-dept { font-size: 0.7rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; margin-top: 2px; }

        .nominees-grid { display: flex; flex-direction: column; gap: 1rem; margin-top: 1.5rem; }
        .nominee-vote-card { padding: 1.5rem; background: #f8fafc; border-radius: 20px; border: 2px solid transparent; cursor: pointer; transition: 0.3s; position: relative; }
        .nominee-vote-card:hover { border-color: #e2e8f0; }
        .nominee-vote-card.selected { background: var(--ocean-light); border-color: var(--ocean); }
        .nominee-name { font-size: 1.25rem; font-weight: 800; color: #1e293b; }
        .vote-indicator { position: absolute; right: 1.5rem; top: 50%; transform: translateY(-50%); background: var(--ocean); color: white; padding: 4px 12px; border-radius: 99px; font-size: 0.75rem; font-weight: 800; }

        .hint { color: #64748b; font-size: 0.9rem; font-weight: 600; }
        .highlight { color: var(--ocean); font-weight: 800; }
        .already-nominated { text-align: center; }
        .check-icon { font-size: 3rem; color: #10b981; margin-bottom: 1rem; }
        .text-link { background: none; border: none; color: #64748b; text-decoration: underline; font-weight: 600; margin-top: 1rem; cursor: pointer; }

        .performers-list { display: flex; flex-direction: column; gap: 1.5rem; }
        .performer-card { background: white; border-radius: 28px; padding: 1.75rem; border: 1px solid #e2e8f0; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
        .performer-card.voted { border-color: var(--ocean); background: var(--ocean-light); }
        .p-info { margin-bottom: 2rem; }
        .p-name { font-size: 1.5rem; font-weight: 800; }
        .p-song { font-size: 1.1rem; color: var(--ocean); font-weight: 600; margin-top: 0.2rem; }
        .p-dept { font-size: 0.75rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-top: 0.4rem; letter-spacing: 1px; }

        .rating-block { margin-bottom: 1.5rem; }
        .criteria-label { font-weight: 800; color: #475569; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.8rem; display: block; }
        .stars-container { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
        .star-item { aspect-ratio: 1; border-radius: 14px; border: 2px solid #f1f5f9; background: #f8fafc; color: #94a3b8; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .star-item.selected { background: var(--ocean); color: white; border-color: var(--ocean); transform: translateY(-2px); box-shadow: 0 8px 20px rgba(10, 130, 118, 0.3); }

        .submit-btn { width: 100%; padding: 1.25rem; border-radius: 18px; background: var(--ocean); border: none; color: white; font-size: 1.1rem; font-weight: 800; cursor: pointer; margin-top: 1rem; transition: 0.3s; box-shadow: 0 10px 20px rgba(10, 130, 118, 0.15); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .submit-btn.is-update { background: white; color: var(--ocean); border: 2px solid var(--ocean); box-shadow: none; }

        .success-popup { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: #111827; color: white; padding: 1rem 2rem; border-radius: 99px; font-weight: 800; box-shadow: 0 20px 40px rgba(0,0,0,0.3); z-index: 1000; display: flex; align-items: center; gap: 10px; animation: slide-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes slide-up { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      `}</style>
    </div>
  );
};

const PerformerCard = ({ performer, criteria, onVote, previousScores, disabled }) => {
  const [scores, setScores] = useState(previousScores || [0, 0, 0]);

  const updateVal = (idx, val) => {
    if (disabled) return;
    const next = [...scores];
    next[idx] = val;
    setScores(next);
  };

  const isComplete = scores.every(s => s > 0);
  const isChanged = !previousScores || JSON.stringify(scores) !== JSON.stringify(previousScores);

  return (
    <div className={`performer-card ${previousScores ? 'voted' : ''}`}>
      <div className="p-info">
        <div className="p-name">{performer.name}</div>
        <div className="p-song">🎤 {performer.song_name}</div>
        <div className="p-dept">{performer.department}</div>
      </div>

      {criteria.map((c, i) => (
        <div className="rating-block" key={c.id}>
          <label className="criteria-label">{c.name}</label>
          <div className="stars-container">
            {[1, 2, 3, 4, 5].map(star => (
              <div 
                key={star} 
                className={`star-item ${scores[i] === star ? 'selected' : ''}`}
                onClick={() => updateVal(i, star)}
              >
                {star}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button 
        className={`submit-btn ${previousScores ? 'is-update' : ''}`}
        disabled={!isComplete || !isChanged || disabled}
        onClick={() => onVote(performer.id, scores)}
      >
        {disabled ? 'Saving...' : (previousScores ? 'Update Rating' : 'Submit Rating')}
      </button>
      
      {previousScores && !isChanged && (
        <div style={{ textAlign: 'center', fontSize: '0.8rem', color: '#0a8276', fontWeight: 800, marginTop: '1rem' }}>
          ✓ COMPLETED
        </div>
      )}
    </div>
  );
};

export default PerformanceVoting;

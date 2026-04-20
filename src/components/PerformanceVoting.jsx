import React, { useEffect, useState } from 'react';
import axios from 'axios';

const PerformanceVoting = () => {
  const [participants, setParticipants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [status, setStatus] = useState('CLOSED');
  const [loading, setLoading] = useState(true);
  const [voterId, setVoterId] = useState('');
  // Map of participantId -> scores array [s1, s2, s3]
  const [myRatings, setMyRatings] = useState({}); 
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let vid = localStorage.getItem('performance_voter_id');
    if (!vid) {
      vid = crypto.randomUUID();
      localStorage.setItem('performance_voter_id', vid);
    }
    setVoterId(vid);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        axios.get('/api/performance/participants'),
        axios.get('/api/performance/criteria'),
        axios.get('/api/performance/status')
      ]);
      setParticipants(pRes.data);
      setCriteria(cRes.data);
      setStatus(sRes.data.voting_status);

      // Load previous ratings from localStorage to show "Voted" state immediately
      const savedRatings = JSON.parse(localStorage.getItem(`ratings_${voterId}`) || '{}');
      setMyRatings(savedRatings);
    } catch (err) {
      console.error("Fetch failed", err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (participantId, scores) => {
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
      localStorage.setItem(`ratings_${voterId}`, JSON.stringify(updatedRatings));
      
      setMessage('Rating saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="voting-container loading">Loading...</div>;

  return (
    <div className="voting-page" id="performance-voting-app">
      <header className="page-header">
        <div className="brand-logo">🎭</div>
        <h1>Performance <span className="text-ocean">Voting</span></h1>
        <p className="subtitle">Rate the talents on a scale of 1 to 5</p>
        
        <div className={`status-badge ${status === 'OPEN' ? 'is-active' : 'is-closed'}`}>
          {status === 'OPEN' ? 'VOTING IS LIVE' : 'VOTING CLOSED'}
        </div>
      </header>

      {status === 'CLOSED' ? (
        <div className="empty-state">
          <div className="empty-icon">⏳</div>
          <h2>Voting is currently off</h2>
          <p>The host will announce when it's time to rate the performers. Stay tuned!</p>
        </div>
      ) : (
        <div className="performers-list">
          {participants.length === 0 ? (
            <div className="empty-state">No performers listed yet.</div>
          ) : (
            participants.map(p => (
              <PerformerCard 
                key={p.id} 
                performer={p} 
                criteria={criteria} 
                onVote={handleVote} 
                previousScores={myRatings[p.id]}
                disabled={submitting}
              />
            ))
          )}
        </div>
      )}

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

        .page-header { text-align: center; margin-bottom: 3rem; position: relative; }
        .brand-logo { font-size: 3rem; margin-bottom: 0.5rem; }
        .page-header h1 { font-size: 2.2rem; font-weight: 800; margin-bottom: 0.5rem; letter-spacing: -1px; color: #111827; }
        .text-ocean { color: var(--ocean); }
        .subtitle { color: #64748b; font-weight: 500; font-size: 1.1rem; }
        
        .status-badge { 
          display: inline-block; 
          margin-top: 1.5rem; 
          padding: 6px 16px; 
          border-radius: 20px; 
          font-weight: 800; 
          font-size: 0.8rem; 
          letter-spacing: 0.5px;
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

        .performers-list { display: flex; flex-direction: column; gap: 1.5rem; }
        
        .performer-card { 
          background: white; 
          border-radius: 28px; 
          padding: 1.75rem; 
          border: 1px solid #e2e8f0; 
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }
        .performer-card:hover { border-color: var(--ocean); transform: translateY(-2px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
        .performer-card.voted { border-color: var(--ocean); background: var(--ocean-light); }

        .p-info { margin-bottom: 2rem; }
        .p-name { font-size: 1.5rem; font-weight: 800; color: #111827; }
        .p-song { font-size: 1.1rem; color: var(--ocean); font-weight: 600; margin-top: 0.2rem; }
        .p-dept { font-size: 0.75rem; color: #94a3b8; font-weight: 800; text-transform: uppercase; margin-top: 0.4rem; letter-spacing: 1px; }

        .rating-block { margin-bottom: 1.5rem; }
        .criteria-label { font-weight: 800; color: #475569; font-size: 0.85rem; text-transform: uppercase; margin-bottom: 0.8rem; display: block; }
        
        .stars-container { 
          display: grid; 
          grid-template-columns: repeat(5, 1fr); 
          gap: 8px; 
        }
        
        .star-item { 
          aspect-ratio: 1; 
          border-radius: 14px; 
          border: 2px solid #f1f5f9; 
          background: #f8fafc; 
          color: #94a3b8; 
          font-weight: 800; 
          font-size: 1.2rem;
          cursor: pointer; 
          display: flex; 
          align-items: center; 
          justify-content: center;
          transition: all 0.2s; 
        }
        .star-item.selected { 
          background: var(--ocean); 
          color: white; 
          border-color: var(--ocean); 
          transform: translateY(-2px) scale(1.05);
          box-shadow: 0 8px 20px rgba(10, 130, 118, 0.3);
        }

        .submit-btn { 
          width: 100%; 
          padding: 1.25rem; 
          border-radius: 18px; 
          background: var(--ocean); 
          border: none; 
          color: white; 
          font-size: 1.1rem; 
          font-weight: 800; 
          cursor: pointer; 
          margin-top: 1rem; 
          transition: 0.3s; 
          box-shadow: 0 10px 20px rgba(10, 130, 118, 0.15);
        }
        .submit-btn:hover:not(:disabled) { background: var(--ocean-deep); transform: translateY(-2px); }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .submit-btn.is-update { background: white; color: var(--ocean); border: 2px solid var(--ocean); box-shadow: none; }

        .success-popup { 
          position: fixed; 
          bottom: 2rem; 
          left: 50%; 
          transform: translateX(-50%); 
          background: #111827; 
          color: white; 
          padding: 1rem 2rem; 
          border-radius: 99px; 
          font-weight: 800; 
          box-shadow: 0 20px 40px rgba(0,0,0,0.3); 
          z-index: 1000; 
          display: flex;
          align-items: center;
          gap: 10px;
          animation: slide-up 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes slide-up { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }

        /* Responsive Fixes */
        @media (max-width: 480px) {
          .star-item { font-size: 1rem; border-radius: 10px; }
          .p-name { font-size: 1.3rem; }
          .submit-btn { padding: 1rem; }
        }
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

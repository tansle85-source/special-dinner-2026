import React, { useEffect, useState } from 'react';
import axios from 'axios';
const PerformanceVoting = () => {
  const [participants, setParticipants] = useState([]);
  const [criteria, setCriteria] = useState([]);
  const [status, setStatus] = useState('CLOSED');
  const [loading, setLoading] = useState(true);
  const [voterId, setVoterId] = useState('');
  const [votedIds, setVotedIds] = useState([]); // Array of participant IDs this user has already voted for
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // 1. Manage Voter ID (Mobile Code)
    let vid = localStorage.getItem('performance_voter_id');
    if (!vid) {
      // Use native crypto API for UUID (secure and no extra dependency)
      vid = crypto.randomUUID();
      localStorage.setItem('performance_voter_id', vid);
    }
    setVoterId(vid);

    // 2. Fetch Initial Data
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

      // Check results to see who we've already voted for
      // (Alternatively, store voted IDs in localStorage for faster UI feedback)
      const localVoted = JSON.parse(localStorage.getItem('voted_performers') || '[]');
      setVotedIds(localVoted);
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
      
      const newVoted = [...votedIds, participantId];
      setVotedIds(newVoted);
      localStorage.setItem('voted_performers', JSON.stringify(newVoted));
      setMessage('Vote submitted successfully! Thank you.');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      alert(err.response?.data?.error || "Submit failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="voting-container loading">Loading Performers...</div>;

  return (
    <div className="voting-page">
      <header className="page-header">
        <h1>Talent Performance</h1>
        <div className={`status-tag ${status === 'OPEN' ? 'open' : 'closed'}`}>
          {status === 'OPEN' ? 'VOTING IS OPEN' : 'VOTING CLOSED'}
        </div>
        <p className="subtitle">Rate your favorite performances!</p>
      </header>

      {status === 'CLOSED' ? (
        <div className="closed-banner">
          <div className="icon">⏳</div>
          <h2>Voting is currently closed.</h2>
          <p>Please wait for the host to announce the start of the voting session.</p>
        </div>
      ) : (
        <div className="performers-grid">
          {participants.length === 0 ? (
            <p>No performers registered yet.</p>
          ) : (
            participants.map(p => (
              <PerformerCard 
                key={p.id} 
                performer={p} 
                criteria={criteria} 
                onVote={handleVote} 
                voted={votedIds.includes(p.id)}
                disabled={submitting}
              />
            ))
          )}
        </div>
      )}

      {message && <div className="success-toast">{message}</div>}

      <style>{`
        .voting-page { min-height: 100vh; background: #0f172a; color: white; padding: 2rem 1rem; font-family: 'Inter', sans-serif; }
        .page-header { text-align: center; margin-bottom: 3rem; }
        .page-header h1 { font-size: 2.5rem; font-weight: 900; margin-bottom: 1rem; letter-spacing: -1px; }
        .status-tag { display: inline-block; padding: 0.5rem 1.5rem; border-radius: 99px; font-weight: 800; font-size: 0.9rem; margin-bottom: 1rem; }
        .status-tag.open { background: #10b981; color: white; animation: pulse 2s infinite; }
        .status-tag.closed { background: #334155; color: #94a3b8; }
        @keyframes pulse { 0% { transform: scale(1); } 50% { transform: scale(1.05); } 100% { transform: scale(1); } }
        .subtitle { color: #94a3b8; font-size: 1.1rem; }

        .closed-banner { max-width: 500px; margin: 5rem auto; text-align: center; padding: 3rem; background: #1e293b; border-radius: 24px; border: 1px solid #334155; }
        .closed-banner .icon { font-size: 4rem; marginBottom: 1.5rem; }
        .closed-banner h2 { font-size: 1.8rem; margin-bottom: 1rem; }

        .performers-grid { max-width: 800px; margin: 0 auto; display: flex; flex-direction: column; gap: 2rem; }
        .performer-card { background: #1e293b; border-radius: 24px; padding: 2rem; border: 1px solid #334155; transition: 0.3s; }
        .performer-card.voted { opacity: 0.7; border-color: #10b981; }
        .p-info { margin-bottom: 2rem; border-bottom: 1px solid #334155; padding-bottom: 1.5rem; }
        .p-name { font-size: 1.8rem; font-weight: 800; color: #10b981; }
        .p-song { font-size: 1.2rem; color: #cbd5e1; font-weight: 600; margin-top: 0.2rem; }
        .p-dept { font-size: 0.9rem; color: #64748b; font-weight: 700; text-transform: uppercase; margin-top: 0.5rem; }

        .rating-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; }
        .criteria-label { font-weight: 700; color: #cbd5e1; }
        .stars-container { display: flex; gap: 0.5rem; }
        .star-btn { width: 40px; height: 40px; border-radius: 10px; border: 1px solid #334155; background: transparent; color: white; font-weight: 800; cursor: pointer; transition: 0.2s; }
        .star-btn.active { background: #10b981; border-color: #10b981; transform: scale(1.1); box-shadow: 0 0 15px rgba(16, 185, 129, 0.3); }
        .star-btn:hover { border-color: #10b981; }

        .submit-vote-btn { width: 100%; padding: 1.2rem; border-radius: 15px; background: #10b981; border: none; color: white; font-size: 1.1rem; font-weight: 900; cursor: pointer; margin-top: 1rem; transition: 0.3s; }
        .submit-vote-btn:disabled { background: #334155; cursor: not-allowed; }
        .voted-badge { text-align: center; color: #10b981; font-weight: 800; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 12px; margin-top: 1rem; }

        .success-toast { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); background: #10b981; color: white; padding: 1rem 2rem; border-radius: 99px; font-weight: 800; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 1000; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translate(-50%, 100%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
      `}</style>
    </div>
  );
};

const PerformerCard = ({ performer, criteria, onVote, voted, disabled }) => {
  const [scores, setScores] = useState([0, 0, 0]);

  const setRating = (idx, val) => {
    if (voted || disabled) return;
    const newScores = [...scores];
    newScores[idx] = val;
    setScores(newScores);
  };

  const isFormValid = scores.every(s => s > 0);

  return (
    <div className={`performer-card ${voted ? 'voted' : ''}`}>
      <div className="p-info">
        <div className="p-name">{performer.name}</div>
        <div className="p-song">🎵 {performer.song_name}</div>
        <div className="p-dept">{performer.department}</div>
      </div>

      {!voted ? (
        <>
          {criteria.map((c, i) => (
            <div className="rating-row" key={c.id}>
              <div className="criteria-label">{c.name}</div>
              <div className="stars-container">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star} 
                    className={`star-btn ${scores[i] === star ? 'active' : ''}`}
                    onClick={() => setRating(i, star)}
                  >
                    {star}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <button 
            className="submit-vote-btn" 
            disabled={!isFormValid || disabled}
            onClick={() => onVote(performer.id, scores)}
          >
            {disabled ? 'Submitting...' : 'Submit Rating'}
          </button>
        </>
      ) : (
        <div className="voted-badge">✓ SUCCESSFULY RATED</div>
      )}
    </div>
  );
};

export default PerformanceVoting;

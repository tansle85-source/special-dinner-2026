import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const GuestFeedback = () => {
  const navigate = useNavigate();
  const [rating, setRating]   = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!rating) return alert('Please select a rating first.');
    try {
      setLoading(true);
      await axios.post('/api/feedback', { rating, comment });
      setSubmitted(true);
    } catch { alert('Submission failed, please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#1D1D1D', fontFamily:'Outfit,sans-serif', display:'flex', flexDirection:'column', alignItems:'center' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        .fb-star { font-size:2.5rem; cursor:pointer; transition:transform 0.15s ease; }
        .fb-star:hover { transform:scale(1.2); }
        textarea { resize:none; font-family:Outfit,sans-serif; }
      `}</style>

      {/* Back */}
      <div style={{ width:'100%', maxWidth:'480px', padding:'1.25rem 1.5rem 0' }}>
        <button onClick={() => navigate('/')} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:'Outfit,sans-serif', fontWeight:700, fontSize:'0.9rem', padding:0 }}>
          ← Back
        </button>
      </div>

      <div style={{ width:'100%', maxWidth:'480px', padding:'2rem 1.5rem 4rem' }}>
        <div style={{ fontSize:'2.5rem', textAlign:'center', marginBottom:'1rem' }}>💬</div>
        <h1 style={{ color:'white', fontSize:'2rem', fontWeight:900, textAlign:'center', marginBottom:'0.4rem' }}>Guest Feedback</h1>
        <p style={{ color:'rgba(255,255,255,0.5)', textAlign:'center', fontSize:'0.9rem', marginBottom:'2.5rem' }}>How's the event so far? Let us know!</p>

        {submitted ? (
          <div style={{ background:'rgba(10,130,118,0.12)', border:'1.5px solid #0A8276', borderRadius:'20px', padding:'3rem 2rem', textAlign:'center' }}>
            <div style={{ fontSize:'3rem' }}>🎉</div>
            <p style={{ color:'white', fontWeight:800, fontSize:'1.3rem', marginTop:'1rem' }}>Thank you!</p>
            <p style={{ color:'rgba(255,255,255,0.6)', marginTop:'0.4rem', fontSize:'0.9rem' }}>Your feedback has been recorded.</p>
            <button onClick={() => navigate('/')} style={{ marginTop:'2rem', background:'#0A8276', color:'white', border:'none', padding:'0.8rem 2rem', borderRadius:'12px', fontFamily:'Outfit,sans-serif', fontWeight:800, fontSize:'1rem', cursor:'pointer' }}>
              Back to Home
            </button>
          </div>
        ) : (
          <div style={{ background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.08)', borderRadius:'24px', padding:'2rem' }}>
            {/* Star Rating */}
            <p style={{ color:'rgba(255,255,255,0.7)', fontWeight:700, marginBottom:'1rem', fontSize:'0.95rem' }}>Overall Rating</p>
            <div style={{ display:'flex', gap:'0.5rem', justifyContent:'center', marginBottom:'2rem' }}>
              {[1,2,3,4,5].map(n => (
                <span key={n} className="fb-star" onClick={() => setRating(n)}
                  style={{ filter: n <= rating ? 'none' : 'grayscale(1) opacity(0.3)' }}>
                  ⭐
                </span>
              ))}
            </div>

            {/* Comment */}
            <p style={{ color:'rgba(255,255,255,0.7)', fontWeight:700, marginBottom:'0.75rem', fontSize:'0.95rem' }}>Comments (optional)</p>
            <textarea
              rows={4}
              placeholder="Share your thoughts…"
              value={comment}
              onChange={e => setComment(e.target.value)}
              style={{
                width:'100%', padding:'0.9rem 1rem', borderRadius:'14px',
                border:'1.5px solid rgba(255,255,255,0.1)',
                background:'rgba(255,255,255,0.06)', color:'white',
                fontSize:'0.95rem', outline:'none',
              }}
            />

            <button
              onClick={handleSubmit}
              disabled={loading || !rating}
              style={{
                marginTop:'1.5rem', width:'100%', padding:'1rem',
                background: rating ? 'linear-gradient(135deg,#b45309,#fbbf24)' : 'rgba(255,255,255,0.1)',
                color: rating ? 'white' : 'rgba(255,255,255,0.3)',
                border:'none', borderRadius:'14px',
                fontFamily:'Outfit,sans-serif', fontWeight:800, fontSize:'1rem',
                cursor: rating ? 'pointer' : 'default',
                transition:'all 0.2s',
              }}
            >
              {loading ? 'Submitting…' : '✉️ Submit Feedback'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GuestFeedback;

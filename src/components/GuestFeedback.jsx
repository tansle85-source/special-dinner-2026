import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

/* ── shared style ── mirrors BestDress / LuckyDraw ───────────────── */
const s = {
  page:    { minHeight:'100vh', background:'#FFFFFF', fontFamily:"'Outfit',sans-serif", color:'#1D1D1D', paddingBottom:'5rem' },
  header:  { textAlign:'center', padding:'2.5rem 1.5rem 1.5rem', background:'#b45309' },
  title:   { fontSize:'2.2rem', fontWeight:800, margin:'0.5rem 0 0', letterSpacing:'-1px', color:'#FFFFFF' },
  sub:     { color:'rgba(255,255,255,0.85)', marginTop:'0.25rem', fontSize:'0.85rem', fontWeight:600 },
  body:    { padding:'1rem', maxWidth:'560px', margin:'0 auto' },
  card:    { background:'#FFFFFF', borderRadius:'24px', border:'1px solid #e8e8e8', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', padding:'1.75rem', marginBottom:'1rem' },
  h2:      { fontSize:'1.2rem', fontWeight:800, margin:'0 0 0.3rem', color:'#1D1D1D' },
  muted:   { color:'#6b7280', lineHeight:1.6, fontSize:'0.9rem', margin:0 },
  label:   { display:'block', fontSize:'0.72rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'0.5rem' },
  input:   { width:'100%', padding:'0.9rem 1.1rem', background:'#f5f5f5', border:'1px solid #e0e0e0', borderRadius:'12px', color:'#1D1D1D', fontSize:'1rem', fontFamily:"'Outfit',sans-serif", fontWeight:600, outline:'none', resize:'none' },
  btn:     { width:'100%', padding:'1.1rem', background:'linear-gradient(135deg,#b45309,#fbbf24)', border:'none', borderRadius:'14px', color:'#FFFFFF', fontSize:'1.05rem', fontWeight:800, cursor:'pointer', marginTop:'0.5rem', fontFamily:"'Outfit',sans-serif", boxShadow:'0 8px 24px rgba(180,83,9,0.3)' },
  btnDis:  { width:'100%', padding:'1.1rem', background:'#f1f5f9', border:'none', borderRadius:'14px', color:'#94a3b8', fontSize:'1.05rem', fontWeight:800, cursor:'not-allowed', marginTop:'0.5rem', fontFamily:"'Outfit',sans-serif" },
};

const SESSION_KEY = 'feedback_session_id';

const GuestFeedback = () => {
  const navigate = useNavigate();
  const [status, setStatus]       = useState('loading');
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers]     = useState({});   // { [question_id]: { text, rating } }
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  const sessionId = (() => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) { id = crypto.randomUUID(); localStorage.setItem(SESSION_KEY, id); }
    return id;
  })();

  useEffect(() => {
    Promise.allSettled([
      axios.get('/api/feedback/status'),
      axios.get('/api/feedback/questions'),
    ]).then(([s, q]) => {
      setStatus(s.status === 'fulfilled' ? s.value.data.status : 'CLOSED');
      if (q.status === 'fulfilled') setQuestions(q.value.data);
    });
  }, []);

  const setAnswer = (qid, field, val) =>
    setAnswers(a => ({ ...a, [qid]: { ...a[qid], [field]: val } }));

  const allAnswered = questions.length > 0 && questions.every(q => {
    const a = answers[q.id];
    if (q.type === 'rating') return a?.rating > 0;
    return a?.text?.trim().length > 0;
  });

  const handleSubmit = async () => {
    if (!allAnswered) return;
    try {
      setSubmitting(true);
      const payload = questions.map(q => ({
        question_id: q.id,
        answer_text: answers[q.id]?.text || null,
        rating: answers[q.id]?.rating || null,
      }));
      await axios.post('/api/feedback/submit', { session_id: sessionId, answers: payload });
      setSubmitted(true);
    } catch { alert('Submission failed, please try again.'); }
    finally { setSubmitting(false); }
  };

  /* ── Loading ── */
  if (status === 'loading') return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap'); * { box-sizing:border-box; }`}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#9ca3af', fontFamily:'Outfit,sans-serif' }}>Loading…</div>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        * { box-sizing:border-box; }
        .fb-star { font-size:2.2rem; cursor:pointer; transition:transform 0.15s ease; user-select:none; }
        .fb-star:hover { transform:scale(1.25); }
        textarea { resize:vertical; font-family:'Outfit',sans-serif; }
      `}</style>

      {/* Header */}
      <header style={s.header}>
        <div style={{ fontSize:'3.5rem' }}>💬</div>
        <h1 style={s.title}>Guest Feedback</h1>
        <p style={s.sub}>Appreciation Night 2026</p>
      </header>

      <div style={s.body}>

        {/* Back button */}
        <button onClick={() => navigate('/')}
          style={{ background:'none', border:'none', color:'#0A8276', fontFamily:'Outfit,sans-serif', fontWeight:700, fontSize:'0.9rem', padding:'1rem 0 0', cursor:'pointer' }}>
          ← Back to Home
        </button>

        {/* CLOSED */}
        {status === 'CLOSED' && (
          <div style={{ ...s.card, textAlign:'center', marginTop:'1rem' }}>
            <div style={{ fontSize:'3.5rem' }}>⏳</div>
            <h2 style={{ ...s.h2, marginTop:'0.75rem', textAlign:'center' }}>Feedback Not Open Yet</h2>
            <p style={{ ...s.muted, textAlign:'center', marginTop:'0.4rem' }}>The committee will open feedback soon. Please check back later.</p>
          </div>
        )}

        {/* SUBMITTED */}
        {status === 'OPEN' && submitted && (
          <div style={{ ...s.card, textAlign:'center', marginTop:'1rem', border:'1.5px solid rgba(180,83,9,0.3)', background:'rgba(251,191,36,0.05)' }}>
            <div style={{ fontSize:'4rem' }}>🎉</div>
            <h2 style={{ ...s.h2, marginTop:'0.75rem', textAlign:'center' }}>Thank You!</h2>
            <p style={{ ...s.muted, textAlign:'center', marginTop:'0.4rem' }}>Your feedback has been recorded. We appreciate your input!</p>
            <button onClick={() => navigate('/')}
              style={{ ...s.btn, marginTop:'1.5rem' }}>← Back to Home</button>
          </div>
        )}

        {/* FORM */}
        {status === 'OPEN' && !submitted && (
          <>
            {questions.length === 0 ? (
              <div style={{ ...s.card, textAlign:'center', marginTop:'1rem' }}>
                <div style={{ fontSize:'2.5rem' }}>📋</div>
                <p style={{ ...s.muted, marginTop:'0.75rem' }}>Questions are being set up. Please check back soon.</p>
              </div>
            ) : (
              <div style={{ marginTop:'1rem' }}>
                <div style={{ ...s.card, marginBottom:'0.5rem' }}>
                  <h2 style={s.h2}>Share Your Thoughts</h2>
                  <p style={s.muted}>Please answer all questions below, then press Submit.</p>
                </div>

                {questions.map((q, i) => (
                  <div key={q.id} style={s.card}>
                    <label style={s.label}>Question {i + 1}</label>
                    <p style={{ fontWeight:700, fontSize:'1rem', marginBottom:'1rem', color:'#1D1D1D' }}>{q.question_text}</p>

                    {q.type === 'rating' ? (
                      <div style={{ display:'flex', gap:'0.4rem', justifyContent:'center' }}>
                        {[1,2,3,4,5].map(n => (
                          <span
                            key={n}
                            className="fb-star"
                            onClick={() => setAnswer(q.id, 'rating', n)}
                            style={{ filter: n <= (answers[q.id]?.rating || 0) ? 'none' : 'grayscale(1) opacity(0.3)' }}
                          >⭐</span>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        placeholder="Type your answer here…"
                        value={answers[q.id]?.text || ''}
                        onChange={e => setAnswer(q.id, 'text', e.target.value)}
                        style={s.input}
                      />
                    )}
                  </div>
                ))}

                <button
                  onClick={handleSubmit}
                  disabled={submitting || !allAnswered}
                  style={allAnswered && !submitting ? s.btn : s.btnDis}
                >
                  {submitting ? 'Submitting…' : allAnswered ? '✉️ Submit Feedback' : 'Answer all questions to submit'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default GuestFeedback;

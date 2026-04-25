import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FeedbackModule = () => {
  const [fbStatus, setFbStatus] = useState('CLOSED');
  const [fbQuestions, setFbQuestions] = useState([]);
  const [fbResponses, setFbResponses] = useState({ questions: [], total: 0 });
  const [fbTab, setFbTab] = useState('questions');
  const [newQ, setNewQ] = useState({ text: '', type: 'text' });
  const [editingQ, setEditingQ] = useState(null);

  useEffect(() => {
    axios.get('/api/feedback/status').then(r => setFbStatus(r.data.status)).catch(() => {});
    axios.get('/api/feedback/questions').then(r => setFbQuestions(r.data)).catch(() => {});
    axios.get('/api/feedback/responses').then(r => setFbResponses(r.data)).catch(() => {});
  }, []);

  const toggleStatus = async () => {
    const next = fbStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    await axios.put('/api/feedback/status', { status: next });
    setFbStatus(next);
  };

  const addQuestion = async () => {
    if (!newQ.text.trim()) return;
    const r = await axios.post('/api/feedback/questions', { question_text: newQ.text, type: newQ.type });
    setFbQuestions(q => [...q, { id: r.data.id, question_text: newQ.text, type: newQ.type }]);
    setNewQ({ text: '', type: 'text' });
  };

  const saveEdit = async () => {
    await axios.put(`/api/feedback/questions/${editingQ.id}`, { question_text: editingQ.question_text, type: editingQ.type });
    setFbQuestions(q => q.map(x => x.id === editingQ.id ? editingQ : x));
    setEditingQ(null);
  };

  const deleteQ = async (id) => {
    if (!confirm('Delete this question?')) return;
    await axios.delete(`/api/feedback/questions/${id}`);
    setFbQuestions(q => q.filter(x => x.id !== id));
  };

  const clearResponses = async () => {
    if (!confirm('Clear ALL responses? This cannot be undone.')) return;
    await axios.delete('/api/feedback/responses');
    setFbResponses(prev => ({ questions: prev.questions.map(q => ({...q, answers:[]})), total: 0 }));
  };

  const pill = (type) => type === 'rating'
    ? { bg: 'rgba(251,191,36,0.15)', color: '#b45309', label: 'Rating' }
    : { bg: 'rgba(99,102,241,0.1)', color: '#4f46e5', label: 'Text' };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      {/* Header card: status + tab switcher */}
      <div className="card shadow-card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h3 style={{ margin:0 }}>Guest Feedback</h3>
          <p style={{ color:'#64748b', fontSize:'0.82rem', margin:'4px 0 0' }}>
            {fbResponses.total} response{fbResponses.total !== 1 ? 's' : ''} received
          </p>
        </div>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center' }}>
          {/* Tab switcher */}
          <div style={{ display:'flex', borderRadius:'10px', overflow:'hidden', border:'1.5px solid #e2e8f0' }}>
            {['questions','responses'].map(t => (
              <button key={t} onClick={() => setFbTab(t)}
                style={{ padding:'0.5rem 1rem', border:'none', fontWeight:700, fontSize:'0.82rem', cursor:'pointer',
                  background: fbTab === t ? '#0A8276' : 'white', color: fbTab === t ? 'white' : '#64748b',
                  fontFamily:'Outfit,sans-serif' }}>
                {t === 'questions' ? 'Questions' : 'Responses'}
              </button>
            ))}
          </div>
          {/* Open/Close toggle */}
          <button onClick={toggleStatus}
            style={{ padding:'0.5rem 1.1rem', borderRadius:'10px', border:'none', fontWeight:800, fontSize:'0.82rem',
              cursor:'pointer', fontFamily:'Outfit,sans-serif',
              background: fbStatus === 'OPEN' ? '#ef4444' : '#0A8276', color:'white' }}>
            {fbStatus === 'OPEN' ? 'Close Feedback' : 'Open Feedback'}
          </button>
        </div>
      </div>

      {/* ── QUESTIONS TAB ─────────────────────────────────── */}
      {fbTab === 'questions' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

          {/* Add question */}
          <div className="card shadow-card">
            <h4 style={{ margin:'0 0 1rem', fontWeight:800 }}>Add Question</h4>
            <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
              <input
                placeholder="Type your question here..."
                value={newQ.text}
                onChange={e => setNewQ(q => ({...q, text: e.target.value}))}
                onKeyDown={e => e.key === 'Enter' && addQuestion()}
                style={{ flex:1, minWidth:'200px', padding:'0.75rem 1rem', borderRadius:'10px',
                  border:'1.5px solid #e2e8f0', fontSize:'0.92rem', fontFamily:'Outfit,sans-serif', outline:'none' }}
              />
              <select value={newQ.type} onChange={e => setNewQ(q => ({...q, type: e.target.value}))}
                style={{ padding:'0.75rem', borderRadius:'10px', border:'1.5px solid #e2e8f0',
                  fontFamily:'Outfit,sans-serif', fontWeight:700, color:'#1D1D1D', outline:'none' }}>
                <option value="text">Text Answer</option>
                <option value="rating">Star Rating (1-5)</option>
              </select>
              <button onClick={addQuestion}
                style={{ padding:'0.75rem 1.4rem', background:'#0A8276', color:'white', border:'none',
                  borderRadius:'10px', fontWeight:800, cursor:'pointer', fontSize:'0.9rem', fontFamily:'Outfit,sans-serif' }}>
                Add
              </button>
            </div>
          </div>

          {/* Question list */}
          <div className="card shadow-card">
            <h4 style={{ margin:'0 0 1rem', fontWeight:800 }}>Questions ({fbQuestions.length})</h4>
            {fbQuestions.length === 0
              ? <p style={{ color:'#94a3b8', textAlign:'center', padding:'2rem' }}>No questions yet. Add one above.</p>
              : fbQuestions.map((q, i) => (
                <div key={q.id} style={{ display:'flex', alignItems:'center', gap:'0.75rem', padding:'0.85rem',
                  background:'#f8fafc', borderRadius:'12px', marginBottom:'0.5rem', border:'1px solid #e2e8f0' }}>
                  <span style={{ color:'#94a3b8', fontWeight:700, fontSize:'0.8rem', minWidth:'22px' }}>Q{i+1}</span>
                  {editingQ?.id === q.id ? (
                    <>
                      <input value={editingQ.question_text}
                        onChange={e => setEditingQ(x => ({...x, question_text: e.target.value}))}
                        style={{ flex:1, padding:'0.5rem', borderRadius:'8px', border:'1.5px solid #0A8276',
                          fontFamily:'Outfit,sans-serif', fontSize:'0.9rem', outline:'none' }} />
                      <select value={editingQ.type} onChange={e => setEditingQ(x => ({...x, type: e.target.value}))}
                        style={{ padding:'0.5rem', borderRadius:'8px', border:'1.5px solid #e2e8f0',
                          fontFamily:'Outfit,sans-serif', fontWeight:700 }}>
                        <option value="text">Text</option>
                        <option value="rating">Rating</option>
                      </select>
                      <button onClick={saveEdit}
                        style={{ padding:'0.4rem 0.9rem', background:'#0A8276', color:'white', border:'none',
                          borderRadius:'8px', fontWeight:700, cursor:'pointer', fontSize:'0.8rem', fontFamily:'Outfit,sans-serif' }}>
                        Save
                      </button>
                      <button onClick={() => setEditingQ(null)}
                        style={{ padding:'0.4rem 0.9rem', background:'#f1f5f9', border:'none',
                          borderRadius:'8px', fontWeight:700, cursor:'pointer', fontSize:'0.8rem', fontFamily:'Outfit,sans-serif' }}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span style={{ flex:1, fontWeight:600, fontSize:'0.9rem' }}>{q.question_text}</span>
                      <span style={{ fontSize:'0.72rem', padding:'2px 8px', borderRadius:'99px', fontWeight:700,
                        background: pill(q.type).bg, color: pill(q.type).color }}>
                        {pill(q.type).label}
                      </span>
                      <button onClick={() => setEditingQ({...q})}
                        style={{ padding:'0.4rem 0.8rem', background:'#f0f9ff', border:'1px solid #bae6fd',
                          borderRadius:'8px', color:'#0369a1', fontWeight:700, cursor:'pointer', fontSize:'0.75rem', fontFamily:'Outfit,sans-serif' }}>
                        Edit
                      </button>
                      <button onClick={() => deleteQ(q.id)}
                        style={{ padding:'0.4rem 0.8rem', background:'#fef2f2', border:'1px solid #fca5a5',
                          borderRadius:'8px', color:'#ef4444', fontWeight:700, cursor:'pointer', fontSize:'0.75rem', fontFamily:'Outfit,sans-serif' }}>
                        Del
                      </button>
                    </>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── RESPONSES TAB ─────────────────────────────────── */}
      {fbTab === 'responses' && (
        <div className="card shadow-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
            <h4 style={{ margin:0, fontWeight:800 }}>Responses ({fbResponses.total})</h4>
            <button onClick={clearResponses}
              style={{ padding:'0.4rem 0.9rem', background:'rgba(239,68,68,0.08)', border:'1px solid #ef4444',
                borderRadius:'8px', color:'#ef4444', fontWeight:700, cursor:'pointer', fontSize:'0.8rem', fontFamily:'Outfit,sans-serif' }}>
              Clear All
            </button>
          </div>

          {!fbResponses.questions?.length
            ? <p style={{ color:'#94a3b8', textAlign:'center', padding:'2rem' }}>No responses yet.</p>
            : fbResponses.questions.map((q, i) => (
              <div key={q.id} style={{ marginBottom:'1.5rem', background:'#f8fafc', borderRadius:'14px',
                padding:'1rem', border:'1px solid #e2e8f0' }}>
                <div style={{ fontWeight:800, marginBottom:'0.75rem', color:'#1D1D1D', fontSize:'0.9rem' }}>
                  Q{i+1}: {q.question_text}
                  <span style={{ marginLeft:'0.5rem', fontSize:'0.72rem', padding:'2px 8px', borderRadius:'99px',
                    background:'rgba(10,130,118,0.1)', color:'#0A8276', fontWeight:700 }}>
                    {q.answers?.length || 0} answers
                  </span>
                </div>

                {q.type === 'rating' ? (
                  <div style={{ display:'flex', gap:'1.25rem', flexWrap:'wrap' }}>
                    {[1,2,3,4,5].map(star => {
                      const count = q.answers?.filter(a => a.rating === star).length || 0;
                      const pct = q.answers?.length ? Math.round(count / q.answers.length * 100) : 0;
                      return (
                        <div key={star} style={{ textAlign:'center' }}>
                          <div style={{ fontWeight:800, fontSize:'0.95rem' }}>{'*'.repeat(star)} ({star})</div>
                          <div style={{ fontWeight:900, fontSize:'1.4rem', color:'#1D1D1D' }}>{count}</div>
                          <div style={{ color:'#64748b', fontSize:'0.75rem' }}>{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ maxHeight:'180px', overflowY:'auto', display:'flex', flexDirection:'column', gap:'0.4rem' }}>
                    {!q.answers?.length
                      ? <span style={{ color:'#94a3b8', fontSize:'0.85rem' }}>No answers yet</span>
                      : q.answers.map((a, j) => (
                        <div key={j} style={{ background:'white', padding:'0.5rem 0.75rem', borderRadius:'8px',
                          border:'1px solid #e2e8f0', fontSize:'0.85rem', color:'#1e293b' }}>
                          "{a.answer_text}"
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
};

export default FeedbackModule;

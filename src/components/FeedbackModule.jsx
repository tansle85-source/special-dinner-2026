import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FeedbackModule = () => {
  const [fbStatus, setFbStatus] = useState('CLOSED');
  const [fbQuestions, setFbQuestions] = useState([]);
  const [fbResponses, setFbResponses] = useState({ questions: [], total: 0 });
  const [fbTab, setFbTab] = useState('questions');
  const [newQ, setNewQ] = useState({ text: '', type: 'text', options: '' });
  const [editingQ, setEditingQ] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  useEffect(() => {
    const fetchData = () => {
      axios.get('/api/feedback/status').then(r => setFbStatus(r.data.status)).catch(() => {});
      axios.get('/api/feedback/questions').then(r => setFbQuestions(r.data)).catch(() => {});
      axios.get('/api/feedback/responses').then(r => setFbResponses(r.data)).catch(() => {});
    };
    fetchData();
    const interval = setInterval(fetchData, 10000); // Auto-refresh results every 10s
    return () => clearInterval(interval);
  }, []);

  const toggleStatus = async () => {
    const next = fbStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
    await axios.put('/api/feedback/status', { status: next });
    setFbStatus(next);
  };

  const addQuestion = async () => {
    if (!newQ.text.trim()) return;
    const r = await axios.post('/api/feedback/questions', { 
      question_text: newQ.text, 
      type: newQ.type,
      options: newQ.type === 'choice' ? newQ.options : null
    });
    setFbQuestions(q => [...q, { id: r.data.id, question_text: newQ.text, type: newQ.type, options: newQ.options }]);
    setNewQ({ text: '', type: 'text', options: '' });
  };

  const saveEdit = async () => {
    await axios.put(`/api/feedback/questions/${editingQ.id}`, { 
      question_text: editingQ.question_text, 
      type: editingQ.type,
      options: editingQ.type === 'choice' ? editingQ.options : null
    });
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
    setAiSummary(null);
  };

  // Test if AI is working
  const testAI = async () => {
    setAiTestResult('Testing...');
    try {
      const res = await axios.post('/api/test-ai');
      setAiTestResult({ ok: true, msg: res.data.response });
    } catch (e) {
      setAiTestResult({ ok: false, msg: e.response?.data?.error || e.message });
    }
  };

  // AI analyze all feedback
  const analyzeWithAI = async () => {
    if (fbResponses.total === 0) return alert('No responses to analyze yet.');
    setAiLoading(true);
    setAiSummary(null);
    try {
      const res = await axios.post('/api/feedback/ai-analyze');
      setAiSummary(res.data.summary);
    } catch (e) {
      setAiSummary('Error: ' + (e.response?.data?.error || e.message));
    } finally {
      setAiLoading(false);
    }
  };

  const pill = (type) => {
    if (type === 'rating') return { bg: 'rgba(251,191,36,0.15)', color: '#b45309', label: 'Rating' };
    if (type === 'choice') return { bg: 'rgba(16,185,129,0.1)', color: '#059669', label: 'Choice' };
    return { bg: 'rgba(99,102,241,0.1)', color: '#4f46e5', label: 'Text' };
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>

      {/* Header card: status + tab switcher */}
      <div className="card shadow-card" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'1rem' }}>
        <div>
          <h3 style={{ margin:0, display:'flex', alignItems:'center', gap:'0.75rem' }}>
            Event Survey & Feedback 
            <span style={{ fontSize:'0.7rem', padding:'2px 8px', borderRadius:'6px', background:'#f1f5f9', color:'#64748b', fontWeight:700 }}>
              {fbResponses.total} RESPONDENTS
            </span>
          </h3>
        </div>
        <div style={{ display:'flex', gap:'0.75rem', alignItems:'center', flexWrap:'wrap' }}>
          {/* Tab switcher */}
          <div style={{ display:'flex', borderRadius:'10px', overflow:'hidden', border:'1.5px solid #e2e8f0' }}>
            {['questions','responses'].map(t => (
              <button key={t} onClick={() => setFbTab(t)}
                style={{ padding:'0.5rem 1rem', border:'none', fontWeight:700, fontSize:'0.82rem', cursor:'pointer',
                  background: fbTab === t ? '#0A8276' : 'white', color: fbTab === t ? 'white' : '#64748b',
                  fontFamily:'Outfit,sans-serif' }}>
                {t === 'questions' ? 'Manage Questions' : 'Live Results'}
              </button>
            ))}
          </div>

          <button onClick={toggleStatus}
            style={{ padding:'0.5rem 1.1rem', borderRadius:'10px', border:'none', fontWeight:800, fontSize:'0.82rem',
              cursor:'pointer', fontFamily:'Outfit,sans-serif',
              background: fbStatus === 'OPEN' ? '#ef4444' : '#0A8276', color:'white' }}>
            {fbStatus === 'OPEN' ? 'Stop Survey' : 'Start Survey'}
          </button>
        </div>
      </div>

      {/* AI Test Result Banner */}
      {aiTestResult && (
        <div style={{
          padding:'0.85rem 1.25rem', borderRadius:'14px',
          background: aiTestResult === 'Testing...' ? '#f8fafc' : (aiTestResult.ok ? 'linear-gradient(135deg,#f0fdf4,#dcfce7)' : 'linear-gradient(135deg,#fef2f2,#fee2e2)'),
          border: aiTestResult === 'Testing...' ? '1.5px solid #e2e8f0' : (aiTestResult.ok ? '1.5px solid #86efac' : '1.5px solid #fca5a5'),
          display:'flex', alignItems:'flex-start', gap:'0.75rem'
        }}>
          <span style={{ fontSize:'1.4rem' }}>{aiTestResult === 'Testing...' ? '⏳' : (aiTestResult.ok ? '✅' : '❌')}</span>
          <div>
            <div style={{ fontWeight:800, fontSize:'0.85rem', color: aiTestResult === 'Testing...' ? '#64748b' : (aiTestResult.ok ? '#15803d' : '#dc2626') }}>
              {aiTestResult === 'Testing...' ? 'Testing Gemini connection...' : (aiTestResult.ok ? 'AI is working!' : 'AI connection failed')}
            </div>
            {aiTestResult.msg && (
              <div style={{ fontSize:'0.8rem', color:'#475569', marginTop:'3px', fontStyle:'italic' }}>
                {aiTestResult.ok ? `Gemini says: "${aiTestResult.msg}"` : aiTestResult.msg}
              </div>
            )}
          </div>
          <button onClick={() => setAiTestResult(null)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:'#94a3b8', fontSize:'1.1rem' }}>✕</button>
        </div>
      )}

      {/* ── QUESTIONS TAB ─────────────────────────────────── */}
      {fbTab === 'questions' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>

          <div className="card shadow-card">
            <h4 style={{ margin:'0 0 1rem', fontWeight:800 }}>Add New Survey Question</h4>
            <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
              <div style={{ display:'flex', gap:'0.75rem', flexWrap:'wrap' }}>
                <input
                  placeholder="Question text (e.g. What was your favorite moment?)"
                  value={newQ.text}
                  onChange={e => setNewQ(q => ({...q, text: e.target.value}))}
                  style={{ flex:1, minWidth:'200px', padding:'0.75rem 1rem', borderRadius:'10px',
                    border:'1.5px solid #e2e8f0', fontSize:'0.92rem', fontFamily:'Outfit,sans-serif', outline:'none' }}
                />
                <select value={newQ.type} onChange={e => setNewQ(q => ({...q, type: e.target.value}))}
                  style={{ padding:'0.75rem', borderRadius:'10px', border:'1.5px solid #e2e8f0',
                    fontFamily:'Outfit,sans-serif', fontWeight:700, color:'#1D1D1D', outline:'none' }}>
                  <option value="text">Open Text Answer</option>
                  <option value="rating">Star Rating (1-5)</option>
                  <option value="choice">Multiple Choice</option>
                </select>
                <button onClick={addQuestion}
                  style={{ padding:'0.75rem 1.4rem', background:'#0A8276', color:'white', border:'none',
                    borderRadius:'10px', fontWeight:800, cursor:'pointer', fontSize:'0.9rem', fontFamily:'Outfit,sans-serif' }}>
                  Add Question
                </button>
              </div>

              {newQ.type === 'choice' && (
                <div style={{ background:'#f1f5f9', padding:'1rem', borderRadius:'10px', border:'1px dashed #cbd5e1' }}>
                  <label style={{ fontSize:'0.75rem', fontWeight:800, color:'#475569', display:'block', marginBottom:'0.5rem' }}>
                    ENTER OPTIONS (Separated by commas)
                  </label>
                  <input
                    placeholder="e.g. Photo Booth, Food, Performance, Floor Games"
                    value={newQ.options}
                    onChange={e => setNewQ(q => ({...q, options: e.target.value}))}
                    style={{ width:'100%', padding:'0.6rem 0.8rem', borderRadius:'8px', border:'1.5px solid #cbd5e1', fontSize:'0.85rem', fontFamily:'Outfit,sans-serif' }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-card">
            <h4 style={{ margin:'0 0 1rem', fontWeight:800 }}>Manage Questions ({fbQuestions.length})</h4>
            {fbQuestions.length === 0
              ? <p style={{ color:'#94a3b8', textAlign:'center', padding:'2rem' }}>No questions yet. Add one above.</p>
              : fbQuestions.map((q, i) => (
                <div key={q.id} style={{ padding:'1rem', background:'#f8fafc', borderRadius:'12px', marginBottom:'0.75rem', border:'1px solid #e2e8f0' }}>
                  {editingQ?.id === q.id ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
                      <div style={{ display:'flex', gap:'0.75rem' }}>
                        <input value={editingQ.question_text}
                          onChange={e => setEditingQ(x => ({...x, question_text: e.target.value}))}
                          style={{ flex:1, padding:'0.5rem 0.75rem', borderRadius:'8px', border:'1.5px solid #0A8276', outline:'none' }} />
                        <select value={editingQ.type} onChange={e => setEditingQ(x => ({...x, type: e.target.value}))}
                          style={{ padding:'0.5rem', borderRadius:'8px', border:'1.5px solid #e2e8f0', fontWeight:700 }}>
                          <option value="text">Text</option>
                          <option value="rating">Rating</option>
                          <option value="choice">Choice</option>
                        </select>
                      </div>
                      {editingQ.type === 'choice' && (
                        <input value={editingQ.options || ''} 
                          placeholder="Options (comma separated)"
                          onChange={e => setEditingQ(x => ({...x, options: e.target.value}))}
                          style={{ padding:'0.5rem 0.75rem', borderRadius:'8px', border:'1.5px solid #e2e8f0' }} />
                      )}
                      <div style={{ display:'flex', gap:'0.5rem' }}>
                        <button onClick={saveEdit} style={{ padding:'0.5rem 1rem', background:'#0A8276', color:'white', border:'none', borderRadius:'8px', fontWeight:700 }}>Save Changes</button>
                        <button onClick={() => setEditingQ(null)} style={{ padding:'0.5rem 1rem', background:'#f1f5f9', border:'none', borderRadius:'8px', fontWeight:700 }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                      <span style={{ color:'#94a3b8', fontWeight:700, fontSize:'0.85rem' }}>Q{i+1}</span>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:700, fontSize:'0.95rem', color:'#1e293b' }}>{q.question_text}</div>
                        {q.type === 'choice' && <div style={{ fontSize:'0.75rem', color:'#64748b', marginTop:'4px' }}>Options: {q.options}</div>}
                      </div>
                      <span style={{ fontSize:'0.72rem', padding:'2px 10px', borderRadius:'99px', fontWeight:800, background: pill(q.type).bg, color: pill(q.type).color }}>
                        {pill(q.type).label.toUpperCase()}
                      </span>
                      <button onClick={() => setEditingQ({...q})} className="table-btn">Edit</button>
                      <button onClick={() => deleteQ(q.id)} className="table-btn" style={{ color:'#ef4444' }}>Delete</button>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* ── RESPONSES TAB (LIVE RESULTS) ─────────────────── */}
      {fbTab === 'responses' && (
        <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'1.25rem' }}>
            <div className="card shadow-card" style={{ background:'linear-gradient(135deg,#f0fdfa,#ccfbf1)', border:'1.5px solid #5eead4' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <span style={{ fontSize:'2.5rem' }}>📝</span>
                <div>
                  <div style={{ fontSize:'1.8rem', fontWeight:900, color:'#0f766e' }}>{fbResponses.total}</div>
                  <div style={{ fontWeight:800, color:'#134e4a', fontSize:'0.8rem', textTransform:'uppercase' }}>Total Respondents</div>
                </div>
              </div>
            </div>

            <div className="card shadow-card" style={{ background:'linear-gradient(135deg,#f5f3ff,#ede9fe)', border:'1.5px solid #c4b5fd', cursor:'pointer' }} onClick={analyzeWithAI}>
              <div style={{ display:'flex', alignItems:'center', gap:'1rem' }}>
                <span style={{ fontSize:'2.5rem' }}>🤖</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:800, color:'#6d28d9' }}>AI Analysis</div>
                  <div style={{ fontSize:'0.78rem', color:'#7c3aed' }}>{aiLoading ? 'Analyzing...' : 'Click to generate AI summary'}</div>
                </div>
              </div>
            </div>
          </div>

          {aiSummary && (
            <div className="card shadow-card" style={{ borderLeft:'5px solid #7c3aed' }}>
               <h4 style={{ margin:'0 0 0.75rem', color:'#7c3aed', fontWeight:900 }}>GEMINI AI SUMMARY</h4>
               <div style={{ fontSize:'0.9rem', lineHeight:1.6, color:'#1e293b', whiteSpace:'pre-wrap' }}>{aiSummary}</div>
            </div>
          )}

          <div className="card shadow-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'2rem' }}>
              <h4 style={{ margin:0, fontWeight:900, fontSize:'1.2rem', color:'#1e293b' }}>Live Survey Results</h4>
              <div style={{ display:'flex', gap:'0.75rem' }}>
                <button onClick={() => window.open('/api/feedback/export', '_blank')} className="table-btn">Export CSV</button>
                <button onClick={clearResponses} className="table-btn" style={{ color:'#ef4444' }}>Reset Data</button>
              </div>
            </div>

            {!fbResponses.questions?.length
              ? <p style={{ color:'#94a3b8', textAlign:'center', padding:'2rem' }}>No responses yet.</p>
              : fbResponses.questions.map((q, i) => (
                <div key={q.id} style={{ marginBottom:'2.5rem', paddingBottom:'2rem', borderBottom:'1px solid #f1f5f9' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'0.75rem', marginBottom:'1.5rem' }}>
                    <span style={{ background:'#0A8276', color:'white', width:'28px', height:'28px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:'0.8rem' }}>{i+1}</span>
                    <h5 style={{ margin:0, fontSize:'1.1rem', fontWeight:800, color:'#1e293b' }}>{q.question_text}</h5>
                  </div>

                  {q.type === 'choice' ? (
                    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem', paddingLeft:'2.5rem' }}>
                      {(q.options || '').split(',').map(opt => {
                        const trimmed = opt.trim();
                        const count = q.answers?.filter(a => a.answer_text === trimmed).length || 0;
                        const pct = q.answers?.length ? Math.round((count / q.answers.length) * 100) : 0;
                        
                        return (
                          <div key={trimmed}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'0.4rem', fontSize:'0.9rem', fontWeight:700, color:'#475569' }}>
                              <span>{trimmed}</span>
                              <span>{pct}% ({count})</span>
                            </div>
                            <div style={{ width:'100%', height:'12px', background:'#f1f5f9', borderRadius:'99px', overflow:'hidden' }}>
                              <div style={{ width: `${pct}%`, height:'100%', background: pct > 50 ? '#0A8276' : '#94a3b8', transition:'width 0.5s ease-out' }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : q.type === 'rating' ? (
                    <div style={{ display:'flex', gap:'1.5rem', flexWrap:'wrap', paddingLeft:'2.5rem' }}>
                      {[1,2,3,4,5].map(star => {
                        const count = q.answers?.filter(a => a.rating === star).length || 0;
                        const pct = q.answers?.length ? Math.round(count / q.answers.length * 100) : 0;
                        return (
                          <div key={star} style={{ textAlign:'center', minWidth:'80px' }}>
                            <div style={{ fontWeight:800, fontSize:'0.85rem', color:'#b45309', marginBottom:'4px' }}>{'★'.repeat(star)}</div>
                            <div style={{ fontSize:'1.5rem', fontWeight:900, color:'#1e293b' }}>{count}</div>
                            <div style={{ color:'#94a3b8', fontSize:'0.7rem', fontWeight:700 }}>{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div style={{ paddingLeft:'2.5rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>
                      <div style={{ fontSize:'0.75rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', marginBottom:'0.5rem' }}>Latest Comments</div>
                      {q.answers?.slice(0,5).map((a, j) => (
                        <div key={j} style={{ background:'#f8fafc', padding:'0.75rem', borderRadius:'10px', border:'1px solid #e2e8f0', fontSize:'0.85rem' }}>
                          "{a.answer_text}"
                        </div>
                      ))}
                      {q.answers?.length > 5 && <div style={{ fontSize:'0.75rem', color:'#0A8276', fontWeight:700, cursor:'pointer' }}>+ {q.answers.length - 5} more...</div>}
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default FeedbackModule;

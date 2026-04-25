import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = { timeout: 8000 };

const BestDress = () => {
  const [phase, setPhase] = useState('loading');
  const [finalists, setFinalists] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [gender, setGender] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);

  const voterId = (() => {
    let id = localStorage.getItem('bd_voter_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('bd_voter_id', id); }
    return id;
  })();

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [s, f, v, sub] = await Promise.allSettled([
        axios.get('/api/best-dress/status', API),
        axios.get('/api/best-dress/nominees', API),
        axios.get(`/api/best-dress/my-vote/${voterId}`, API),
        axios.get(`/api/best-dress/my-submission/${voterId}`, API),
      ]);
      setPhase(s.status === 'fulfilled' ? s.value.data.best_dress_status : 'CLOSED');
      if (f.status === 'fulfilled') setFinalists(f.value.data);
      if (v.status === 'fulfilled') setMyVote(v.value.data?.nominee_id);
      if (sub.status === 'fulfilled' && sub.value.data) setAlreadySubmitted(true);
    } catch { setPhase('CLOSED'); }
  };

  const showToast = (msg, color = '#1e293b') => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3500);
  };

  const onPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhoto(file);
    const r = new FileReader();
    r.onloadend = () => setPreview(r.result);
    r.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!name.trim()) return showToast('Enter your name', '#ef4444');
    if (!dept.trim()) return showToast('Enter your department', '#ef4444');
    if (!gender) return showToast('Select Male or Female', '#ef4444');
    if (!photo) return showToast('Please take/upload a photo', '#ef4444');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('department', dept.trim());
      fd.append('gender', gender);
      fd.append('voter_id', voterId);
      fd.append('photo', photo);
      await axios.post('/api/best-dress/submit', fd, { timeout: 20000 });
      setSubmitted(true);
    } catch (e) {
      showToast(e.response?.data?.error || 'Submission failed', '#ef4444');
    } finally { setSubmitting(false); }
  };

  const handleVote = async (id) => {
    try {
      await axios.post('/api/best-dress/vote', { nominee_id: id, voter_id: voterId }, API);
      setMyVote(id);
      showToast('Vote recorded! 🎉', '#7c3aed');
      const r = await axios.get('/api/best-dress/nominees', API);
      setFinalists(r.data);
    } catch (e) { showToast(e.response?.data?.error || 'Vote failed', '#ef4444'); }
  };

  if (phase === 'loading') return (
    <div style={s.page}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div style={s.spinner}></div>
        <p style={{ color:'rgba(255,255,255,0.5)', marginTop:'1rem', fontFamily:'Outfit,sans-serif' }}>Loading...</p>
      </div>
      <Styles />
    </div>
  );

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={{ fontSize:'3.5rem' }}>👗</div>
        <h1 style={s.title}>Best Dress Award</h1>
        <p style={{ color:'rgba(255,255,255,0.45)', marginTop:'0.25rem', fontSize:'0.85rem' }}>Appreciation Night 2026</p>
        <span style={{ ...s.badge, ...(phase==='NOMINATING'?s.badgeGreen:phase==='VOTING'?s.badgeGold:s.badgeGray) }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background: phase==='NOMINATING'?'#22c55e':phase==='VOTING'?'#fbbf24':'#6b7280', display:'inline-block', marginRight:6 }}></span>
          {phase==='CLOSED'?'Coming Soon':phase==='NOMINATING'?'Submissions Open':'VOTING LIVE'}
        </span>
      </header>

      <div style={{ padding:'0 1rem' }}>
        {/* CLOSED */}
        {phase === 'CLOSED' && (
          <div style={s.card}>
            <div style={{ fontSize:'4rem', textAlign:'center' }}>⏳</div>
            <h2 style={s.h2}>Get Ready!</h2>
            <p style={s.muted}>Best Dress submissions will open soon. Dress to impress tonight!</p>
          </div>
        )}

        {/* NOMINATING — form */}
        {phase === 'NOMINATING' && !submitted && !alreadySubmitted && (
          <div style={s.card}>
            <h2 style={s.h2}>Submit Your Look</h2>
            <p style={{ ...s.muted, marginBottom:'1.5rem' }}>Nominate yourself! Fill your details and upload a photo.</p>

            <div style={s.photoBox} onClick={() => fileRef.current?.click()}>
              {preview
                ? <img src={preview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                : <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:'2.5rem' }}>📷</div>
                    <p style={{ color:'rgba(255,255,255,0.45)', fontSize:'0.85rem', marginTop:'0.5rem' }}>Tap to take / upload photo</p>
                  </div>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={onPhoto} />

            <Field label="Full Name">
              <input style={s.input} placeholder="Your full name" value={name} onChange={e=>setName(e.target.value)} />
            </Field>
            <Field label="Department">
              <input style={s.input} placeholder="e.g. BE DEV, Finance…" value={dept} onChange={e=>setDept(e.target.value)} />
            </Field>
            <Field label="Category">
              <div style={{ display:'flex', gap:'0.75rem' }}>
                {['Male','Female'].map(g => (
                  <div key={g} style={{ ...s.gBtn, ...(gender===g ? (g==='Male'?s.gBtnM:s.gBtnF) : {}) }} onClick={()=>setGender(g)}>
                    {g==='Male'?'👔':'👗'} {g}
                  </div>
                ))}
              </div>
            </Field>

            <button style={{ ...s.btn, opacity:submitting?0.6:1 }} onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting…' : 'Submit My Look ✨'}
            </button>
          </div>
        )}

        {/* Already submitted */}
        {phase === 'NOMINATING' && (submitted || alreadySubmitted) && (
          <div style={{ ...s.card, textAlign:'center' }}>
            <div style={{ fontSize:'4.5rem' }}>🎉</div>
            <h2 style={{ ...s.h2, marginTop:'0.75rem' }}>You're In!</h2>
            <p style={s.muted}>Your submission has been received. Our AI judge will shortlist the top finalists. Stay tuned!</p>
          </div>
        )}

        {/* VOTING */}
        {phase === 'VOTING' && (
          <>
            <h2 style={{ ...s.h2, textAlign:'center', marginBottom:'0.25rem' }}>Vote for the Best!</h2>
            <p style={{ ...s.muted, textAlign:'center', marginBottom:'1.5rem' }}>Tap a finalist to cast your vote</p>
            {['Female','Male'].map(g => {
              const list = finalists.filter(f=>f.gender===g);
              if (!list.length) return null;
              return (
                <div key={g}>
                  <div style={{ ...s.gHeader, ...(g==='Female'?{}:{ background:'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(99,102,241,0.2))' }) }}>
                    {g==='Female'?'👗':'👔'} Best Dressed {g}
                  </div>
                  {list.map(n => <FinalistCard key={n.id} item={n} myVote={myVote} onVote={handleVote} />)}
                </div>
              );
            })}
            {finalists.length === 0 && <div style={s.card}><p style={{ ...s.muted, textAlign:'center' }}>Finalists will be announced shortly…</p></div>}
          </>
        )}
      </div>

      {toast && <div style={{ ...s.toast, background:toast.color }}>{toast.msg}</div>}
      <Styles />
    </div>
  );
};

const Field = ({ label, children }) => (
  <div style={{ marginBottom:'1.25rem' }}>
    <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'rgba(255,255,255,0.45)', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'0.5rem' }}>{label}</label>
    {children}
  </div>
);

const FinalistCard = ({ item, myVote, onVote }) => {
  const voted = myVote === item.id;
  return (
    <div onClick={()=>onVote(item.id)} style={{ ...s.fCard, ...(voted?s.fVoted:{}) }}>
      {item.photo_path && <img src={`/uploads/bd/${item.photo_path}`} alt="" style={s.fImg} />}
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:800, fontSize:'1.05rem' }}>{item.nominee_name}</div>
        <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.8rem', marginTop:'2px' }}>{item.department}</div>
      </div>
      {voted && <span style={{ background:'#0A8276', color:'#FFFFFF', padding:'4px 12px', borderRadius:'99px', fontSize:'0.75rem', fontWeight:700 }}>My Choice ✓</span>}
    </div>
  );
};

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes slideUp { from { opacity:0; transform:translate(-50%,16px); } to { opacity:1; transform:translate(-50%,0); } }
  `}</style>
);

const s = {
  page: { minHeight:'100vh', background:'#1D1D1D', fontFamily:"'Outfit',sans-serif", color:'#FFFFFF', paddingBottom:'5rem' },
  header: { textAlign:'center', padding:'2.5rem 1.5rem 1.5rem', background:'linear-gradient(180deg, #0A8276 0%, #1D1D1D 100%)' },
  title: { fontSize:'2.2rem', fontWeight:800, margin:'0.5rem 0 0', letterSpacing:'-1px', color:'#FFFFFF' },
  badge: { display:'inline-flex', alignItems:'center', padding:'5px 14px', borderRadius:'99px', border:'1px solid', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', marginTop:'0.75rem' },
  badgeGreen: { background:'rgba(10,130,118,0.2)', borderColor:'#0A8276', color:'#0A8276' },
  badgeGold:  { background:'rgba(10,130,118,0.3)', borderColor:'#0A8276', color:'#FFFFFF' },
  badgeGray:  { background:'rgba(255,255,255,0.08)', borderColor:'rgba(255,255,255,0.2)', color:'rgba(255,255,255,0.5)' },
  card: { background:'#2a2a2a', borderRadius:'24px', border:'1px solid rgba(10,130,118,0.3)', padding:'1.75rem', marginBottom:'1rem' },
  h2: { fontSize:'1.4rem', fontWeight:800, margin:'0.5rem 0', color:'#FFFFFF' },
  muted: { color:'rgba(255,255,255,0.55)', lineHeight:1.6, fontSize:'0.9rem', margin:0 },
  photoBox: { width:'100%', height:'210px', borderRadius:'18px', border:'2px dashed rgba(10,130,118,0.5)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', overflow:'hidden', marginBottom:'1.5rem', background:'rgba(10,130,118,0.05)' },
  input: { width:'100%', padding:'0.9rem 1.1rem', background:'#1D1D1D', border:'1px solid rgba(10,130,118,0.4)', borderRadius:'12px', color:'#FFFFFF', fontSize:'1rem', fontFamily:"'Outfit',sans-serif", fontWeight:600, outline:'none' },
  gBtn: { flex:1, padding:'0.9rem', borderRadius:'12px', border:'2px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.55)', textAlign:'center', fontWeight:700, cursor:'pointer', fontSize:'0.95rem' },
  gBtnM: { border:'2px solid #0A8276', background:'rgba(10,130,118,0.2)', color:'#FFFFFF' },
  gBtnF: { border:'2px solid #0A8276', background:'rgba(10,130,118,0.25)', color:'#FFFFFF' },
  btn: { width:'100%', padding:'1.1rem', background:'#0A8276', border:'none', borderRadius:'14px', color:'#FFFFFF', fontSize:'1.05rem', fontWeight:800, cursor:'pointer', marginTop:'0.5rem', fontFamily:"'Outfit',sans-serif", boxShadow:'0 8px 24px rgba(10,130,118,0.4)' },
  spinner: { width:36, height:36, border:'3px solid rgba(10,130,118,0.2)', borderTop:'3px solid #0A8276', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  toast: { position:'fixed', bottom:'2rem', left:'50%', transform:'translateX(-50%)', padding:'0.9rem 1.75rem', borderRadius:'99px', fontWeight:700, whiteSpace:'nowrap', zIndex:999, animation:'slideUp 0.3s ease', color:'#FFFFFF', boxShadow:'0 10px 30px rgba(0,0,0,0.4)', fontFamily:"'Outfit',sans-serif" },
  gHeader: { padding:'0.7rem 1.1rem', borderRadius:'14px', background:'rgba(10,130,118,0.2)', border:'1px solid rgba(10,130,118,0.3)', fontWeight:800, fontSize:'0.85rem', marginBottom:'0.75rem', letterSpacing:'0.5px', color:'#FFFFFF' },
  fCard: { display:'flex', alignItems:'center', gap:'1rem', background:'#2a2a2a', borderRadius:'18px', border:'2px solid rgba(10,130,118,0.2)', padding:'0.9rem 1rem', marginBottom:'0.75rem', cursor:'pointer' },
  fVoted: { border:'2px solid #0A8276', background:'rgba(10,130,118,0.15)' },
  fImg: { width:56, height:56, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid #0A8276' },
};


export default BestDress;

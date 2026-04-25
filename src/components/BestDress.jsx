import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const API = { timeout: 8000 };

const BestDress = () => {
  const [phase, setPhase] = useState('loading');
  const [finalists, setFinalists] = useState([]);
  const [myVote, setMyVote] = useState(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);
  const [name, setName] = useState('');
  const [dept, setDept] = useState('');
  const [gender, setGender] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [toast, setToast] = useState(null);
  const fileRef = useRef(null);
  const cameraRef = useRef(null);


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
      if (sub.status === 'fulfilled' && sub.value.data) {
        const cnt = sub.value.data.count || 0;
        setSubmitCount(cnt);
        if (cnt >= 1) setAlreadySubmitted(true);
      }
    } catch { setPhase('CLOSED'); }
  };

  const showToast = (msg, color = '#1e293b') => {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3500);
  };

  const onPhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Compress image using canvas before uploading
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const MAX = 1200;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else { width = Math.round(width * MAX / height); height = MAX; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        const compressed = new File([blob], 'photo.jpg', { type: 'image/jpeg' });
        setPhoto(compressed);
        setPreview(canvas.toDataURL('image/jpeg', 0.85));
      }, 'image/jpeg', 0.85);
    };
    img.src = objectUrl;
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
      setSubmitCount(c => c + 1);
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
        <p style={{ color:'#0A8276', marginTop:'1rem', fontFamily:'Outfit,sans-serif' }}>Loading...</p>
      </div>
      <Styles />
    </div>
  );

  return (
    <div style={s.page}>
      <header style={s.header}>
        <div style={{ fontSize:'3.5rem' }}>👗</div>
        <h1 style={s.title}>Best Dress Award</h1>
        <p style={{ color:'rgba(255,255,255,0.85)', marginTop:'0.25rem', fontSize:'0.85rem', fontWeight:600 }}>Appreciation Night 2026</p>
        <span style={{ ...s.badge, ...(phase==='NOMINATING'?s.badgeGreen:phase==='VOTING'?s.badgeGold:s.badgeGray) }}>
          <span style={{ width:7, height:7, borderRadius:'50%', background: phase==='NOMINATING'?'#fff':phase==='VOTING'?'#fff':'rgba(255,255,255,0.4)', display:'inline-block', marginRight:6 }}></span>
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

            <div style={s.photoBox}>
              {preview
                ? <div style={{ position:'relative', width:'100%', height:'100%' }}>
                    <img src={preview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <button onClick={()=>setPreview(null)} style={{ position:'absolute', top:8, right:8, background:'rgba(0,0,0,0.5)', color:'white', border:'none', borderRadius:'99px', padding:'4px 10px', fontSize:'0.75rem', cursor:'pointer' }}>✕ Redo</button>
                  </div>
                : <div style={{ textAlign:'center', padding:'1rem' }}>
                    <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>📸</div>
                    <div style={{ display:'flex', gap:'0.75rem', justifyContent:'center' }}>
                      <button onClick={()=>cameraRef.current?.click()} style={s.photoBtn}>📷 Camera</button>
                      <button onClick={()=>fileRef.current?.click()} style={s.photoBtn}>🖼️ Gallery</button>
                    </div>
                    <p style={{ color:'#9ca3af', fontSize:'0.8rem', marginTop:'0.75rem' }}>iPhone · Android · Any device</p>
                  </div>
              }
            </div>
            {/* Camera input — opens camera */}
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display:'none' }} onChange={onPhoto} />
            {/* Gallery input — opens photo library */}
            <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onPhoto} />


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

        {/* NOMINATING — already submitted */}
        {phase === 'NOMINATING' && (submitted || alreadySubmitted) && (
          <div style={{ ...s.card, textAlign:'center' }}>
            <div style={{ fontSize:'4.5rem' }}>{submitCount >= 2 ? '🎉' : '✅'}</div>
            <h2 style={{ ...s.h2, marginTop:'0.75rem' }}>
              {submitCount >= 2 ? "Both submitted!" : "You're In!"}
            </h2>
            <p style={s.muted}>
              {submitCount >= 2
                ? 'Max 2 submissions reached. Our AI judge will shortlist the top finalists. Stay tuned!'
                : 'First submission received! You can submit one more person from this device.'}
            </p>
            {submitCount < 2 && (
              <button
                style={{ ...s.btn, marginTop:'1.25rem', background:'#0A8276' }}
                onClick={() => {
                  setSubmitted(false);
                  setAlreadySubmitted(false);
                  setName(''); setDept(''); setGender(''); setPhoto(null); setPreview(null);
                }}
              >Submit Another Person ➕</button>
            )}
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
    <label style={{ display:'block', fontSize:'0.72rem', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'0.5rem' }}>{label}</label>
    {children}
  </div>
);


const FinalistCard = ({ item, myVote, onVote }) => {
  const voted = myVote === item.id;
  return (
    <div onClick={()=>onVote(item.id)} style={{ ...s.fCard, ...(voted?s.fVoted:{}) }}>
      {item.photo_path && <img src={`/api/photos/bd/${item.photo_path}`} alt="" style={s.fImg} />}
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:800, fontSize:'1.05rem' }}>{item.nominee_name}</div>
        <div style={{ color:'#6b7280', fontSize:'0.8rem', marginTop:'2px' }}>{item.department}</div>

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
  page: { minHeight:'100vh', background:'#FFFFFF', fontFamily:"'Outfit',sans-serif", color:'#1D1D1D', paddingBottom:'5rem' },
  header: { textAlign:'center', padding:'2.5rem 1.5rem 1.5rem', background:'#0A8276' },
  title: { fontSize:'2.2rem', fontWeight:800, margin:'0.5rem 0 0', letterSpacing:'-1px', color:'#FFFFFF' },
  badge: { display:'inline-flex', alignItems:'center', padding:'5px 14px', borderRadius:'99px', border:'1px solid', fontSize:'0.72rem', fontWeight:700, letterSpacing:'0.5px', textTransform:'uppercase', marginTop:'0.75rem' },
  badgeGreen: { background:'rgba(255,255,255,0.2)', borderColor:'rgba(255,255,255,0.6)', color:'#FFFFFF' },
  badgeGold:  { background:'rgba(255,255,255,0.2)', borderColor:'rgba(255,255,255,0.6)', color:'#FFFFFF' },
  badgeGray:  { background:'rgba(255,255,255,0.1)', borderColor:'rgba(255,255,255,0.3)', color:'rgba(255,255,255,0.7)' },
  card: { background:'#FFFFFF', borderRadius:'24px', border:'1px solid #e8e8e8', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', padding:'1.75rem', marginBottom:'1rem' },
  h2: { fontSize:'1.4rem', fontWeight:800, margin:'0.5rem 0', color:'#1D1D1D' },
  muted: { color:'#6b7280', lineHeight:1.6, fontSize:'0.9rem', margin:0 },
  photoBox: { width:'100%', minHeight:'170px', borderRadius:'18px', border:'2px dashed rgba(10,130,118,0.35)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', marginBottom:'1.5rem', background:'#f9fafb' },
  photoBtn: { padding:'0.6rem 1.1rem', borderRadius:'10px', border:'1.5px solid #0A8276', background:'#FFFFFF', color:'#0A8276', fontWeight:700, cursor:'pointer', fontSize:'0.85rem', fontFamily:"'Outfit',sans-serif" },
  input: { width:'100%', padding:'0.9rem 1.1rem', background:'#f5f5f5', border:'1px solid #e0e0e0', borderRadius:'12px', color:'#1D1D1D', fontSize:'1rem', fontFamily:"'Outfit',sans-serif", fontWeight:600, outline:'none' },
  gBtn: { flex:1, padding:'0.9rem', borderRadius:'12px', border:'2px solid #e0e0e0', background:'#f5f5f5', color:'#9ca3af', textAlign:'center', fontWeight:700, cursor:'pointer', fontSize:'0.95rem' },
  gBtnM: { border:'2px solid #0A8276', background:'rgba(10,130,118,0.08)', color:'#0A8276' },
  gBtnF: { border:'2px solid #0A8276', background:'rgba(10,130,118,0.08)', color:'#0A8276' },
  btn: { width:'100%', padding:'1.1rem', background:'#0A8276', border:'none', borderRadius:'14px', color:'#FFFFFF', fontSize:'1.05rem', fontWeight:800, cursor:'pointer', marginTop:'0.5rem', fontFamily:"'Outfit',sans-serif", boxShadow:'0 8px 24px rgba(10,130,118,0.3)' },
  spinner: { width:36, height:36, border:'3px solid rgba(10,130,118,0.2)', borderTop:'3px solid #0A8276', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
  toast: { position:'fixed', bottom:'2rem', left:'50%', transform:'translateX(-50%)', padding:'0.9rem 1.75rem', borderRadius:'99px', fontWeight:700, whiteSpace:'nowrap', zIndex:999, animation:'slideUp 0.3s ease', color:'#FFFFFF', boxShadow:'0 10px 30px rgba(0,0,0,0.2)', fontFamily:"'Outfit',sans-serif" },
  gHeader: { padding:'0.7rem 1.1rem', borderRadius:'14px', background:'rgba(10,130,118,0.08)', border:'1px solid rgba(10,130,118,0.2)', fontWeight:800, fontSize:'0.85rem', marginBottom:'0.75rem', letterSpacing:'0.5px', color:'#0A8276' },
  fCard: { display:'flex', alignItems:'center', gap:'1rem', background:'#FFFFFF', borderRadius:'18px', border:'2px solid #e8e8e8', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'0.9rem 1rem', marginBottom:'0.75rem', cursor:'pointer' },
  fVoted: { border:'2px solid #0A8276', background:'rgba(10,130,118,0.06)' },
  fImg: { width:56, height:56, borderRadius:'50%', objectFit:'cover', flexShrink:0, border:'2px solid #0A8276' },
};




export default BestDress;

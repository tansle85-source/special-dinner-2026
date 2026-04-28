import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

/* ── shared style object — mirrors BestDress.jsx ─────────────────── */
const s = {
  page:    { minHeight:'100vh', background:'#FFFFFF', fontFamily:"'Outfit',sans-serif", color:'#1D1D1D', paddingBottom:'5rem' },
  header:  { textAlign:'center', padding:'2.5rem 1.5rem 1.5rem', background:'#0A8276' },
  title:   { fontSize:'2.2rem', fontWeight:800, margin:'0.5rem 0 0', letterSpacing:'-1px', color:'#FFFFFF' },
  sub:     { color:'rgba(255,255,255,0.85)', marginTop:'0.25rem', fontSize:'0.85rem', fontWeight:600 },
  body:    { padding:'1rem', maxWidth:'600px', margin:'0 auto' },
  card:    { background:'#FFFFFF', borderRadius:'24px', border:'1px solid #e8e8e8', boxShadow:'0 2px 16px rgba(0,0,0,0.07)', padding:'1.75rem', marginBottom:'1rem' },
  h2:      { fontSize:'1.4rem', fontWeight:800, margin:'0.5rem 0', color:'#1D1D1D' },
  muted:   { color:'#6b7280', lineHeight:1.6, fontSize:'0.9rem', margin:0 },
  input:   { width:'100%', padding:'0.9rem 1.1rem', background:'#f5f5f5', border:'1px solid #e0e0e0', borderRadius:'12px', color:'#1D1D1D', fontSize:'1rem', fontFamily:"'Outfit',sans-serif", fontWeight:600, outline:'none' },
  btn:     { width:'100%', padding:'1.1rem', background:'#0A8276', border:'none', borderRadius:'14px', color:'#FFFFFF', fontSize:'1.05rem', fontWeight:800, cursor:'pointer', marginTop:'0.5rem', fontFamily:"'Outfit',sans-serif", boxShadow:'0 8px 24px rgba(10,130,118,0.3)' },
  wRow:    { display:'flex', alignItems:'center', justifyContent:'space-between', background:'#FFFFFF', borderRadius:'18px', border:'2px solid #e8e8e8', boxShadow:'0 2px 8px rgba(0,0,0,0.05)', padding:'0.9rem 1rem', marginBottom:'0.75rem' },
  prize:   { background:'rgba(10,130,118,0.1)', color:'#0A8276', padding:'4px 14px', borderRadius:'99px', fontSize:'0.78rem', fontWeight:800, whiteSpace:'nowrap' },
  gHeader: { padding:'0.7rem 1.1rem', borderRadius:'14px', background:'rgba(10,130,118,0.08)', border:'1px solid rgba(10,130,118,0.2)', fontWeight:800, fontSize:'0.85rem', marginBottom:'0.75rem', letterSpacing:'0.5px', color:'#0A8276' },
  spinner: { width:36, height:36, border:'3px solid rgba(10,130,118,0.2)', borderTop:'3px solid #0A8276', borderRadius:'50%', animation:'spin 0.8s linear infinite' },
};

const LuckyDraw = () => {
  const [query, setQuery]           = useState('');
  const [allEmployees, setAllEmployees] = useState([]);
  const [results, setResults]       = useState([]);
  const [searched, setSearched]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    axios.get('/api/employees')
      .then(r => { setAllEmployees(r.data || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const winners = allEmployees.filter(e => e.won_prize);

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) { setSearched(false); setResults([]); return; }
    setResults(allEmployees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.department && e.department.toLowerCase().includes(q))
    ));
    setSearched(true);
  };

  const handleClear = () => {
    setQuery(''); setResults([]); setSearched(false);
    inputRef.current?.focus();
  };

  if (loading) return (
    <div style={s.page}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap'); @keyframes spin { to { transform:rotate(360deg); } }`}</style>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100vh' }}>
        <div style={s.spinner} />
        <p style={{ color:'#0A8276', marginTop:'1rem', fontFamily:'Outfit,sans-serif' }}>Loading…</p>
      </div>
    </div>
  );

  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        * { box-sizing:border-box; }
        @keyframes spin { to { transform:rotate(360deg); } }
        .ld-search-wrap { display:flex; gap:0; background:white; border-radius:14px; border:1.5px solid #e0e0e0; overflow:hidden; }
        .ld-search-wrap:focus-within { border-color:#0A8276; box-shadow:0 0 0 3px rgba(10,130,118,0.12); }
        .ld-input { flex:1; border:none; outline:none; padding:0.9rem 1.1rem; font-size:1rem; font-family:Outfit,sans-serif; font-weight:600; color:#1D1D1D; background:#f5f5f5; }
        .ld-input::placeholder { color:#9ca3af; font-weight:500; }
        .ld-clear { border:none; padding:0 0.8rem; background:#f5f5f5; color:#9ca3af; font-size:1rem; cursor:pointer; }
        .ld-btn { border:none; padding:0 1.3rem; background:#0A8276; color:white; font-family:Outfit,sans-serif; font-weight:800; font-size:0.9rem; cursor:pointer; }
        .ld-btn:hover { background:#076b61; }
        .ld-winner-row:hover { border-color:#0A8276 !important; background:rgba(10,130,118,0.04) !important; }
      `}</style>

      {/* Header — identical to BestDress */}
      <header style={s.header}>
        <div style={{ fontSize:'3.5rem' }}>🎁</div>
        <h1 style={s.title}>Lucky Draw</h1>
        <p style={s.sub}>Appreciation Night 2026</p>
      </header>

      <div style={s.body}>

        {/* Search card */}
        <div style={{ ...s.card, marginTop:'1.25rem' }}>
          <h2 style={{ ...s.h2, marginBottom:'0.5rem' }}>Search Your Name</h2>
          <p style={{ ...s.muted, marginBottom:'1rem' }}>Type your name below to check if you've won a prize tonight.</p>
          <div className="ld-search-wrap">
            <input
              ref={inputRef}
              className="ld-input"
              placeholder="Enter your name…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              autoComplete="off"
            />
            {searched && <button className="ld-clear" onClick={handleClear}>✕</button>}
            <button className="ld-btn" onClick={handleSearch}>Search</button>
          </div>

          {/* Search results */}
          {searched && (
            <div style={{ marginTop:'1rem' }}>
              {results.length === 0
                ? <div style={{ textAlign:'center', padding:'1.5rem', color:'#9ca3af' }}>
                    <div style={{ fontSize:'2rem' }}>🔍</div>
                    <p style={{ fontWeight:700, color:'#475569', marginTop:'0.5rem' }}>No match found</p>
                    <p style={{ fontSize:'0.82rem', marginTop:'0.25rem' }}>Try a different spelling</p>
                  </div>
                : results.map(e => (
                  <div key={e.id} className="ld-winner-row" style={{ ...s.wRow, marginTop:'0.5rem', transition:'all 0.15s', border: e.won_prize ? '2px solid #0A8276' : '2px solid #e8e8e8', background: e.won_prize ? 'rgba(10,130,118,0.05)' : '#FFFFFF' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'0.75rem' }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background: e.won_prize ? 'rgba(10,130,118,0.12)' : '#f1f5f9', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem', flexShrink:0 }}>
                        {e.won_prize ? '🏆' : '👤'}
                      </div>
                      <div>
                        <div style={{ fontWeight:800, fontSize:'0.95rem' }}>{e.name}</div>
                        <div style={{ color:'#6b7280', fontSize:'0.78rem', marginTop:'1px' }}>{e.department}</div>
                      </div>
                    </div>
                    {e.won_prize
                      ? <span style={s.prize}>🎉 {e.won_prize}</span>
                      : <span style={{ color:'#9ca3af', fontSize:'0.78rem', fontWeight:600 }}>Not drawn yet</span>
                    }
                  </div>
                ))
              }
            </div>
          )}
        </div>

        {/* Winners list */}
        <div style={s.card}>
          <h2 style={{ ...s.h2, marginBottom:'0.25rem' }}>
            Winner List
            <span style={{ marginLeft:'0.6rem', background:'rgba(10,130,118,0.1)', color:'#0A8276', padding:'2px 10px', borderRadius:'99px', fontSize:'0.75rem', fontWeight:800 }}>{winners.length}</span>
          </h2>
          <p style={{ ...s.muted, marginBottom:'1.25rem' }}>All published lucky draw results for tonight.</p>

          {winners.length === 0 ? (
            <div style={{ textAlign:'center', padding:'2.5rem 1rem' }}>
              <div style={{ fontSize:'3rem' }}>🎲</div>
              <p style={{ fontWeight:700, color:'#475569', marginTop:'0.75rem' }}>Draw has not started yet</p>
              <p style={{ color:'#9ca3af', fontSize:'0.85rem', marginTop:'0.3rem' }}>Results will appear here once published.</p>
            </div>
          ) : (
            winners.map(e => (
              <div key={e.id} className="ld-winner-row" style={{ ...s.wRow, transition:'all 0.15s' }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:'0.95rem' }}>{e.name}</div>
                  <div style={{ color:'#6b7280', fontSize:'0.78rem', marginTop:'1px' }}>{e.department}</div>
                </div>
                <span style={s.prize}>{e.won_prize}</span>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default LuckyDraw;

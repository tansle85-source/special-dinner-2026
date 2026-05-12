import React, { useState, useEffect } from 'react';
import axios from 'axios';

const C = { 
  teal: '#0A8276', 
  gold: '#b45309',
  white: '#FFFFFF', 
  dark: '#1e293b',
  bg: '#f8fafc'
};

const BestDressAnnounce = () => {
  const [finalists, setFinalists] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVotes, setShowVotes] = useState(false);

  useEffect(() => {
    fetchFinalists();
    const t = setInterval(fetchFinalists, 15000);
    return () => clearInterval(t);
  }, []);

  const fetchFinalists = () => {
    axios.get('/api/best-dress/finalists').then(r => {
      setFinalists(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const females = finalists.filter(f => f.gender === 'Female').slice(0, 3);
  const males   = finalists.filter(f => f.gender === 'Male').slice(0, 3);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.white, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif' }}>
      <div style={{ color:C.teal, fontSize:'1.5rem', fontWeight:700 }}>Loading finalists…</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'Outfit,sans-serif', color:C.dark, position:'relative', overflowX:'hidden', paddingBottom:'4rem' }}>

      {/* Decorative Elements */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'400px', background:`linear-gradient(180deg, ${C.teal}11 0%, transparent 100%)`, pointerEvents:'none' }} />

      {/* Controls */}
      <div style={{ position:'fixed', top:'1.5rem', right:'1.5rem', zIndex:100, display:'flex', gap:'0.75rem' }}>
        <button onClick={() => setShowVotes(!showVotes)} style={btn(showVotes ? C.teal : '#cbd5e1', showVotes ? 'white' : '#475569')}>
          {showVotes ? '🔒 Hide Votes' : '👁️ Show Votes'}
        </button>
        <button onClick={toggleFullscreen} style={btn(C.teal, 'white')}>
          {isFullscreen ? '⊠ Exit' : '⛶ Fullscreen'}
        </button>
      </div>

      <div style={{ position:'relative', zIndex:1, padding:'4rem 2rem' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'4rem' }}>
          <div style={{ fontSize:'3.5rem', marginBottom:'1rem' }}>🏆</div>
          <h1 style={{
            fontSize:'clamp(2.5rem, 6vw, 4rem)',
            fontWeight:900, margin:0,
            letterSpacing:'-1.5px',
            color: C.teal
          }}>
            Best Dress Finalists
          </h1>
          <p style={{ color:'#64748b', fontSize:'1.1rem', marginTop:'0.5rem', fontWeight:600 }}>
            Appreciation Night 2026 • Live Rankings
          </p>
          <div style={{ width:'60px', height:'4px', background:C.teal, margin:'1.5rem auto', borderRadius:'99px' }} />
        </div>

        {finalists.length === 0 ? (
          <div style={{ textAlign:'center', color:'#94a3b8', fontSize:'1.2rem', marginTop:'8rem' }}>
            Waiting for results from the judges...
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(500px, 1fr))', gap:'2.5rem', maxWidth:'1400px', margin:'0 auto' }}>
             <AnnounceSection title="Best Dressed Female" emoji="👗" items={females} accent={C.teal} showVotes={showVotes} />
             <AnnounceSection title="Best Dressed Male"   emoji="👔" items={males}   accent={C.teal} showVotes={showVotes} />
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        @keyframes fadeInSlide { from { opacity:0; transform: translateY(15px); } to { opacity:1; transform: translateY(0); } }
        .announce-card { transition: 0.3s; }
        .announce-card:hover { transform: translateY(-3px); box-shadow: 0 20px 40px rgba(0,0,0,0.1) !important; }
      `}</style>
    </div>
  );
};

const btn = (bg, color) => ({
  padding:'0.6rem 1.2rem', borderRadius:'12px', border:'none',
  background: bg, color: color,
  fontFamily:'Outfit,sans-serif', fontWeight:800, fontSize:'0.85rem', cursor:'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: '0.2s'
});

const AnnounceSection = ({ title, emoji, items, accent, showVotes }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
    <div style={{ 
      display:'flex', alignItems:'center', gap:'0.75rem', 
      padding:'0.5rem 0', borderBottom:`3px solid ${accent}`
    }}>
      <span style={{ fontSize:'2rem' }}>{emoji}</span>
      <h2 style={{ fontSize:'1.75rem', fontWeight:900, margin:0, color:C.dark }}>{title}</h2>
    </div>

    {items.map((item, i) => (
      <div key={item.id} className="announce-card" style={{
        background: C.white,
        borderRadius:'24px',
        border: `1px solid #e2e8f0`,
        padding:'1.25rem',
        display:'flex',
        gap:'1.5rem',
        animation:`fadeInSlide 0.5s ease ${i*0.15}s both`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)'
      }}>
        <div style={{ width:'140px', height:'180px', flexShrink:0, borderRadius:'16px', overflow:'hidden', border:`1px solid #f1f5f9` }}>
          <img 
            src={`/api/photos/bd/vote/${item.id}`} 
            style={{ width:'100%', height:'100%', objectFit:'cover' }} 
            onError={e => { e.target.src = 'https://via.placeholder.com/140x180?text=No+Photo'; }}
          />
        </div>
        
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ marginBottom:'0.75rem' }}>
            <h3 style={{ fontSize:'1.6rem', fontWeight:900, margin:0, color:C.dark }}>{item.nominee_name}</h3>
            <p style={{ fontSize:'0.95rem', color:C.teal, margin:'2px 0 0', fontWeight:700 }}>{item.department}</p>
          </div>

          {item.ai_reasoning && (
            <div style={{ background:'#f8fafc', padding:'0.75rem 1rem', borderRadius:'12px', borderLeft:`4px solid ${accent}` }}>
               <p style={{ margin:0, fontSize:'0.85rem', color:'#475569', fontStyle:'italic', lineHeight:1.5 }}>"{item.ai_reasoning}"</p>
            </div>
          )}

          {showVotes && (
            <div style={{ marginTop:'1rem', display:'flex', alignItems:'center', gap:'0.5rem' }}>
               <span style={{ fontSize:'0.7rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'1px' }}>Votes:</span>
               <span style={{ fontSize:'1.25rem', fontWeight:900, color:C.teal }}>{item.vote_count}</span>
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

export default BestDressAnnounce;

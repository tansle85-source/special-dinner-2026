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
    <div style={{ height:'100vh', background:C.bg, fontFamily:'Outfit,sans-serif', color:C.dark, position:'relative', overflow:'hidden', display:'flex', flexDirection:'column' }}>

      {/* Decorative Elements */}
      <div style={{ position:'fixed', top:0, left:0, right:0, height:'200px', background:`linear-gradient(180deg, ${C.teal}11 0%, transparent 100%)`, pointerEvents:'none' }} />

      {/* Controls */}
      <div style={{ position:'fixed', top:'1rem', right:'1rem', zIndex:100, display:'flex', gap:'0.5rem' }}>
        <button onClick={() => setShowVotes(!showVotes)} style={btn(showVotes ? C.teal : '#cbd5e1', showVotes ? 'white' : '#475569')}>
          {showVotes ? '🔒' : '👁️'}
        </button>
        <button onClick={toggleFullscreen} style={btn(C.teal, 'white')}>
          {isFullscreen ? '⊠' : '⛶'}
        </button>
      </div>

      <div style={{ flex:1, padding:'1.5rem 2rem', display:'flex', flexDirection:'column', zIndex:1 }}>
        {/* Header - Compact */}
        <div style={{ textAlign:'center', marginBottom:'1rem' }}>
          <h1 style={{ fontSize:'clamp(2.5rem, 8vw, 4rem)', fontWeight:900, margin:0, color: C.teal, letterSpacing:'-2px', textTransform:'uppercase' }}>
            Best Dress Finalists
          </h1>
          <p style={{ color:'#64748b', fontSize:'1rem', margin:0, fontWeight:800, letterSpacing:'2px' }}>
            Appreciation Night 2026
          </p>
        </div>

        {finalists.length === 0 ? (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'#94a3b8', fontSize:'1.2rem' }}>
            Waiting for results...
          </div>
        ) : (
          <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'2rem', maxWidth:'1600px', margin:'0 auto', width:'100%', minHeight:0 }}>
             <AnnounceSection title="Best Dressed Female" emoji="👗" items={females} accent={C.teal} showVotes={showVotes} />
             <AnnounceSection title="Best Dressed Male"   emoji="👔" items={males}   accent={C.teal} showVotes={showVotes} />
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        @keyframes fadeInSlide { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }
        .announce-card { transition: 0.3s; }
      `}</style>
    </div>
  );
};

const btn = (bg, color) => ({
  width:'40px', height:'40px', padding:0, borderRadius:'10px', border:'none',
  background: bg, color: color,
  fontFamily:'Outfit,sans-serif', fontWeight:800, fontSize:'1.1rem', cursor:'pointer',
  display:'flex', alignItems:'center', justifyContent:'center',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)', transition: '0.2s'
});

const AnnounceSection = ({ title, emoji, items, accent, showVotes }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'0.75rem', height:'100%' }}>
    <div style={{ 
      display:'flex', alignItems:'center', gap:'0.5rem', 
      paddingBottom:'0.5rem', borderBottom:`2px solid ${accent}44`
    }}>
      <span style={{ fontSize:'1.5rem' }}>{emoji}</span>
      <h2 style={{ fontSize:'1.3rem', fontWeight:800, margin:0, color:C.dark }}>{title}</h2>
    </div>

    <div style={{ flex:1, display:'flex', flexDirection:'column', gap:'0.75rem', justifyContent:'space-between', paddingBottom:'1rem' }}>
      {items.map((item, i) => (
        <div key={item.id} className="announce-card" style={{
          background: C.white,
          borderRadius:'16px',
          border: `1px solid #e2e8f0`,
          padding:'0.75rem 1rem',
          display:'flex',
          gap:'1rem',
          flex: 1,
          maxHeight:'calc(33vh - 80px)',
          animation:`fadeInSlide 0.5s ease ${i*0.1}s both`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <div style={{ height:'100%', aspectRatio:'3/4', flexShrink:0, borderRadius:'12px', overflow:'hidden', border:`1px solid #f1f5f9` }}>
            <img 
              src={`/api/photos/bd/vote/${item.id}`} 
              style={{ width:'100%', height:'100%', objectFit:'cover' }} 
              onError={e => { e.target.src = 'https://via.placeholder.com/100x130?text=Photo'; }}
            />
          </div>
          
          <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center', overflow:'hidden' }}>
            <div style={{ marginBottom:'0.4rem' }}>
              <h3 style={{ fontSize:'1.2rem', fontWeight:900, margin:0, color:C.dark, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{item.nominee_name}</h3>
              <p style={{ fontSize:'0.8rem', color:C.teal, margin:'0', fontWeight:800 }}>{item.department}</p>
            </div>

            {item.ai_reasoning && (
              <div style={{ background:'#f8fafc', padding:'0.5rem 0.75rem', borderRadius:'10px', borderLeft:`3px solid ${accent}`, overflow:'hidden' }}>
                 <p style={{ margin:0, fontSize:'0.75rem', color:'#475569', fontStyle:'italic', lineHeight:1.3, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                   "{item.ai_reasoning}"
                 </p>
              </div>
            )}

            {showVotes && (
              <div style={{ marginTop:'0.4rem', display:'flex', alignItems:'center', gap:'0.4rem' }}>
                 <span style={{ fontSize:'0.6rem', fontWeight:800, color:'#94a3b8', textTransform:'uppercase' }}>Votes:</span>
                 <span style={{ fontSize:'1.1rem', fontWeight:900, color:C.teal }}>{item.vote_count}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default BestDressAnnounce;

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const C = { 
  teal: '#0A8276', 
  gold: '#fbbf24',
  white: '#FFFFFF', 
  dark: '#0f172a',
  cardBg: 'rgba(30, 41, 59, 0.7)'
};

const BestDressAnnounce = () => {
  const [finalists, setFinalists] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVotes, setShowVotes] = useState(false);

  useEffect(() => {
    fetchFinalists();
    const t = setInterval(fetchFinalists, 10000);
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
    <div style={{ minHeight:'100vh', background:C.dark, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif' }}>
      <div style={{ color:C.teal, fontSize:'1.5rem', fontWeight:700 }}>Loading finalists…</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:C.dark, fontFamily:'Outfit,sans-serif', color:C.white, position:'relative', overflowX:'hidden', paddingBottom:'4rem' }}>

      {/* Decorative Gradients */}
      <div style={{ position:'fixed', top:'-10%', left:'-5%', width:'50vw', height:'50vw', borderRadius:'50%', background:`radial-gradient(circle, ${C.teal}33 0%, transparent 70%)`, pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:'-10%', right:'-5%', width:'40vw', height:'40vw', borderRadius:'50%', background:`radial-gradient(circle, ${C.gold}22 0%, transparent 70%)`, pointerEvents:'none' }} />

      {/* Controls */}
      <div style={{ position:'fixed', top:'1.5rem', right:'1.5rem', zIndex:100, display:'flex', gap:'0.75rem' }}>
        <button onClick={() => setShowVotes(!showVotes)} style={btn(showVotes ? C.gold : '#334155', showVotes ? '#1e293b' : 'white')}>
          {showVotes ? '🔒 Hide Votes' : '👁️ Show Votes'}
        </button>
        <button onClick={toggleFullscreen} style={btn(C.teal, 'white')}>
          {isFullscreen ? '⊠ Exit' : '⛶ Fullscreen'}
        </button>
      </div>

      <div style={{ position:'relative', zIndex:1, padding:'4rem 2rem' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'4rem' }}>
          <h1 style={{
            fontSize:'clamp(2.5rem, 6vw, 4.5rem)',
            fontWeight:900, margin:0,
            letterSpacing:'-2px',
            background: `linear-gradient(to right, ${C.white}, ${C.teal}, ${C.gold})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            Best Dress Finalists
          </h1>
          <p style={{ color:'#94a3b8', fontSize:'1.1rem', marginTop:'1rem', fontWeight:600, letterSpacing:'1px', textTransform:'uppercase' }}>
            Appreciation Night 2026 • Live Rankings
          </p>
        </div>

        {finalists.length === 0 ? (
          <div style={{ textAlign:'center', color:'#64748b', fontSize:'1.5rem', marginTop:'8rem' }}>
            Waiting for AI Ranking results...
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(500px, 1fr))', gap:'3rem', maxWidth:'1600px', margin:'0 auto' }}>
             <AnnounceSection title="Best Dressed Female" emoji="👗" items={females} accent={C.teal} showVotes={showVotes} />
             <AnnounceSection title="Best Dressed Male"   emoji="👔" items={males}   accent={C.gold} showVotes={showVotes} />
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        @keyframes fadeInScale { from { opacity:0; transform:scale(0.95) translateY(20px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .gala-card:hover { transform: translateY(-5px); border-color: rgba(255,255,255,0.3) !important; }
      `}</style>
    </div>
  );
};

const btn = (bg, color) => ({
  padding:'0.6rem 1.2rem', borderRadius:'12px', border:'none',
  background: bg, color: color,
  fontFamily:'Outfit,sans-serif', fontWeight:800, fontSize:'0.9rem', cursor:'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.2)', transition: '0.2s'
});

const AnnounceSection = ({ title, emoji, items, accent, showVotes }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:'1.5rem' }}>
    <div style={{ 
      display:'flex', alignItems:'center', gap:'1rem', 
      padding:'1rem 2rem', background:'rgba(255,255,255,0.03)', 
      borderRadius:'20px', border:`1px solid ${accent}44` 
    }}>
      <span style={{ fontSize:'2.5rem' }}>{emoji}</span>
      <h2 style={{ fontSize:'2rem', fontWeight:900, margin:0, color:accent }}>{title}</h2>
    </div>

    {items.map((item, i) => (
      <div key={item.id} className="gala-card" style={{
        background: C.cardBg,
        borderRadius:'24px',
        border: `1px solid rgba(255,255,255,0.1)`,
        backdropFilter: 'blur(10px)',
        padding:'1.5rem',
        display:'flex',
        gap:'1.5rem',
        animation:`fadeInScale 0.6s ease ${i*0.2}s both`,
        transition:'0.3s'
      }}>
        <div style={{ width:'160px', height:'200px', flexShrink:0, borderRadius:'16px', overflow:'hidden', border:`2px solid ${accent}33` }}>
          <img 
            src={`/api/photos/bd/vote/${item.id}`} 
            style={{ width:'100%', height:'100%', objectFit:'cover' }} 
            onError={e => { e.target.src = 'https://via.placeholder.com/160x200?text=No+Photo'; }}
          />
        </div>
        
        <div style={{ flex:1, display:'flex', flexDirection:'column', justifyContent:'center' }}>
          <div style={{ marginBottom:'1rem' }}>
            <h3 style={{ fontSize:'1.8rem', fontWeight:900, margin:0, color:C.white }}>{item.nominee_name}</h3>
            <p style={{ fontSize:'1.1rem', color:'#94a3b8', margin:'4px 0 0', fontWeight:600 }}>{item.department}</p>
          </div>

          {item.ai_reasoning && (
            <div style={{ background:'rgba(0,0,0,0.2)', padding:'1rem', borderRadius:'12px', borderLeft:`4px solid ${accent}` }}>
               <p style={{ margin:0, fontSize:'0.9rem', color:'#cbd5e1', fontStyle:'italic', lineHeight:1.5 }}>"{item.ai_reasoning}"</p>
            </div>
          )}

          {showVotes && (
            <div style={{ marginTop:'1rem', display:'flex', alignItems:'center', gap:'0.75rem' }}>
               <span style={{ fontSize:'0.8rem', fontWeight:800, color:accent, textTransform:'uppercase', letterSpacing:'1px' }}>Current Votes:</span>
               <span style={{ fontSize:'1.5rem', fontWeight:900, color:C.white }}>{item.vote_count}</span>
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

export default BestDressAnnounce;

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const C = { teal: '#0A8276', white: '#FFFFFF', dark: '#1D1D1D' };

const BestDressAnnounce = () => {
  const [finalists, setFinalists] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    axios.get('/api/best-dress/finalists').then(r => {
      setFinalists(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));

    const t = setInterval(() => {
      axios.get('/api/best-dress/finalists').then(r => setFinalists(r.data)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, []);

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
  const rankLabel = i => ['🥇','🥈','🥉'][i] || `#${i+1}`;

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#FFFFFF', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif' }}>
      <div style={{ color:C.teal, fontSize:'1.5rem', fontWeight:700 }}>Loading finalists…</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#FFFFFF', fontFamily:'Outfit,sans-serif', position:'relative', overflow:'hidden' }}>

      {/* Subtle teal glow spots */}
      <div style={{ position:'fixed', top:'-10%', left:'-5%', width:'40vw', height:'40vw', borderRadius:'50%', background:`radial-gradient(circle, ${C.teal}22 0%, transparent 70%)`, pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'-10%', right:'-5%', width:'35vw', height:'35vw', borderRadius:'50%', background:`radial-gradient(circle, ${C.teal}18 0%, transparent 70%)`, pointerEvents:'none', zIndex:0 }} />

      {/* Sparkles */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        {[...Array(24)].map((_,i) => (
          <div key={i} style={{
            position:'absolute',
            width: Math.random()*3+1+'px', height: Math.random()*3+1+'px',
            borderRadius:'50%',
            background: Math.random() > 0.5 ? `${C.teal}cc` : 'rgba(255,255,255,0.5)',
            top: Math.random()*100+'%', left: Math.random()*100+'%',
            animation:`twinkle ${Math.random()*3+2}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* Controls */}
      <div style={{ position:'fixed', top:'1rem', right:'1rem', zIndex:100, display:'flex', gap:'0.5rem' }}>
        <button onClick={() => window.location.reload()} style={btn('#2a2a2a')}>↻ Refresh</button>
        <button onClick={toggleFullscreen} style={btn(C.teal)}>
          {isFullscreen ? '⊠ Exit' : '⛶ Fullscreen'}
        </button>
      </div>

      <div style={{ position:'relative', zIndex:1, padding:'2.5rem 1.5rem 4rem' }}>

        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'3rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.75rem' }}>👗✨👔</div>
          <h1 style={{
            color: C.dark,
            fontSize:'clamp(2rem,5vw,4rem)',
            fontWeight:900, margin:0,
            letterSpacing:'-1.5px',
          }}>
            Best Dress Finalists
          </h1>
          <div style={{ width:'80px', height:'3px', background:C.teal, margin:'1rem auto 0.5rem', borderRadius:'99px' }} />
          <p style={{ color:'#64748b', fontSize:'1rem', margin:0, fontWeight:500 }}>
            Appreciation Night 2026 · Selected by AI
          </p>
        </div>

        {finalists.length === 0 ? (
          <div style={{ textAlign:'center', color:'#94a3b8', fontSize:'1.2rem', marginTop:'4rem' }}>
            No finalists yet. Run AI Rank from the admin panel first.
          </div>
        ) : (
          <div style={{ display:'flex', gap:'2.5rem', justifyContent:'center', flexWrap:'wrap', maxWidth:'1400px', margin:'0 auto' }}>
            <Section title="Best Dressed Female" emoji="👗" items={females} rankLabel={rankLabel} accent={C.teal} accentAlt="#0cb89e" label="F" />
            <Section title="Best Dressed Male"   emoji="👔" items={males}   rankLabel={rankLabel} accent={C.teal} accentAlt="#076b61" label="M" />
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        @keyframes twinkle  { from { opacity:0.15; transform:scale(0.8); } to { opacity:0.9; transform:scale(1.3); } }
        @keyframes floatIn  { from { opacity:0; transform:translateY(32px); } to { opacity:1; transform:translateY(0); } }
        @keyframes scorebar { from { width:0%; } to { width:var(--score); } }
      `}</style>
    </div>
  );
};

const btn = (bg) => ({
  padding:'0.5rem 1rem', borderRadius:'10px', border:'none',
  background: bg, color:'#FFFFFF',
  fontFamily:'Outfit,sans-serif', fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
});

const Section = ({ title, emoji, items, rankLabel, accent, accentAlt }) => (
  <div style={{ flex:'1', minWidth:'300px', maxWidth:'580px' }}>
    {/* Section header */}
    <div style={{
      textAlign:'center', marginBottom:'1.5rem',
      background:`linear-gradient(135deg, ${accent}12, ${accentAlt}18)`,
      borderRadius:'20px', padding:'1.25rem',
      border:`1.5px solid ${accent}44`,
    }}>
      <div style={{ fontSize:'2.8rem', lineHeight:1 }}>{emoji}</div>
      <h2 style={{ color: C.dark, margin:'0.5rem 0 0', fontSize:'1.6rem', fontWeight:900, letterSpacing:'-0.5px' }}>{title}</h2>
    </div>

    {/* Cards */}
    <div style={{ display:'flex', flexDirection:'column', gap:'1rem' }}>
      {items.length === 0
        ? <div style={{ color:'rgba(255,255,255,0.3)', textAlign:'center', padding:'2rem' }}>No finalists yet</div>
        : items.map((item, i) => (
          <div key={item.id} style={{
            background:'#FFFFFF',
            borderRadius:'18px',
            border:`1.5px solid ${accent}33`,
            overflow:'hidden',
            animation:`floatIn 0.55s ease ${i*0.18}s both`,
            boxShadow:`0 4px 20px rgba(0,0,0,0.08)`,
          }}>
            <div style={{ display:'flex', alignItems:'stretch' }}>
              {/* Photo */}
              <div style={{ width:'140px', flexShrink:0, position:'relative', background:'#f1f5f9' }}>
                {item.has_photo
                  ? <img src={`/api/photos/bd/vote/${item.id}`} alt={item.nominee_name}
                      style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:'170px', display:'block' }}
                      onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                    />
                  : null}
                <div style={{ width:'100%', minHeight:'170px', background:`${accent}18`, display: item.has_photo ? 'none' : 'flex', alignItems:'center', justifyContent:'center', fontSize:'3.5rem' }}>
                  {emoji}
                </div>
              </div>

              {/* Info */}
              <div style={{ flex:1, padding:'1.25rem 1.25rem 1rem', display:'flex', flexDirection:'column', gap:'0.5rem' }}>

                {/* Name & dept */}
                <div>
                  <div style={{ color: C.dark, fontWeight:900, fontSize:'1.3rem', lineHeight:1.2 }}>{item.nominee_name}</div>
                  <div style={{ color:accent, fontWeight:700, fontSize:'0.82rem', marginTop:'3px', letterSpacing:'0.3px' }}>{item.department}</div>
                </div>

                {item.ai_reasoning && (
                  <div style={{
                    background:`${accent}0f`,
                    borderRadius:'10px',
                    padding:'0.55rem 0.75rem',
                    borderLeft:`3px solid ${accent}`,
                  }}>
                    <div style={{ color:accent, fontSize:'0.63rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'3px' }}>🤖 AI Judge</div>
                    <div style={{ color:'#475569', fontSize:'0.8rem', lineHeight:1.5, fontStyle:'italic' }}>
                      "{item.ai_reasoning}"
                    </div>
                  </div>
                )}


                {/* Votes */}
                <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'auto' }}>
                  <span style={{ color:'#94a3b8', fontSize:'0.75rem' }}>Votes</span>
                  <span style={{ color: C.dark, fontWeight:900, fontSize:'1.1rem' }}>{item.vote_count}</span>
                </div>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  </div>
);

export default BestDressAnnounce;

import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BestDressAnnounce = () => {
  const [finalists, setFinalists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    axios.get('/api/best-dress/finalists').then(r => {
      setFinalists(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Auto-refresh every 30s
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

  const rankLabel = (i) => ['🥇','🥈','🥉'][i] || `#${i+1}`;

  if (loading) return (
    <div style={{ minHeight:'100vh', background:'#0f0f1a', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Outfit,sans-serif' }}>
      <div style={{ color:'white', fontSize:'1.5rem' }}>Loading finalists…</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0f0f1a 0%,#1a0a2e 50%,#0d1b2a 100%)', fontFamily:'Outfit,sans-serif', position:'relative', overflow:'hidden' }}>
      {/* Sparkle background */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0 }}>
        {[...Array(30)].map((_,i) => (
          <div key={i} style={{
            position:'absolute',
            width: Math.random()*4+1+'px', height: Math.random()*4+1+'px',
            borderRadius:'50%', background:'rgba(255,255,255,0.6)',
            top: Math.random()*100+'%', left: Math.random()*100+'%',
            animation:`twinkle ${Math.random()*3+2}s infinite alternate`,
          }} />
        ))}
      </div>

      {/* Controls */}
      <div style={{ position:'fixed', top:'1rem', right:'1rem', zIndex:100, display:'flex', gap:'0.5rem' }}>
        <button onClick={() => window.location.reload()} style={btnStyle}>↻ Refresh</button>
        <button onClick={toggleFullscreen} style={{ ...btnStyle, background:'rgba(124,58,237,0.8)' }}>
          {isFullscreen ? '⊠ Exit' : '⛶ Fullscreen'}
        </button>
      </div>

      <div style={{ position:'relative', zIndex:1, padding:'2rem 1rem 3rem' }}>
        {/* Header */}
        <div style={{ textAlign:'center', marginBottom:'3rem' }}>
          <div style={{ fontSize:'3rem', marginBottom:'0.5rem' }}>👗✨👔</div>
          <h1 style={{ color:'white', fontSize:'clamp(1.8rem,5vw,3.5rem)', fontWeight:900, margin:0, letterSpacing:'-1px', textShadow:'0 0 40px rgba(167,139,250,0.6)' }}>
            Best Dress Finalists
          </h1>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:'1rem', marginTop:'0.5rem', fontWeight:500 }}>
            Appreciation Night 2026 · Selected by AI
          </p>
        </div>

        {finalists.length === 0 ? (
          <div style={{ textAlign:'center', color:'rgba(255,255,255,0.5)', fontSize:'1.2rem', marginTop:'4rem' }}>
            No finalists yet. Run AI Rank from the admin panel first.
          </div>
        ) : (
          <div style={{ display:'flex', gap:'3rem', justifyContent:'center', flexWrap:'wrap', maxWidth:'1400px', margin:'0 auto' }}>
            {/* Female Section */}
            <Section title="Best Dressed Female" emoji="👗" color="#ec4899" items={females} rankLabel={rankLabel} />
            {/* Male Section */}
            <Section title="Best Dressed Male" emoji="👔" color="#60a5fa" items={males} rankLabel={rankLabel} />
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        @keyframes twinkle { from { opacity:0.2; transform:scale(0.8); } to { opacity:1; transform:scale(1.2); } }
        @keyframes floatIn { from { opacity:0; transform:translateY(40px); } to { opacity:1; transform:translateY(0); } }
        @keyframes shimmer { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
      `}</style>
    </div>
  );
};

const btnStyle = {
  padding:'0.5rem 1rem', borderRadius:'10px', border:'none',
  background:'rgba(255,255,255,0.15)', color:'white',
  fontFamily:'Outfit,sans-serif', fontWeight:700, fontSize:'0.85rem', cursor:'pointer',
  backdropFilter:'blur(10px)',
};

const Section = ({ title, emoji, color, items, rankLabel }) => (
  <div style={{ flex:'1', minWidth:'300px', maxWidth:'560px' }}>
    {/* Section header */}
    <div style={{
      textAlign:'center', marginBottom:'1.5rem',
      background:`linear-gradient(135deg, ${color}22, ${color}44)`,
      borderRadius:'20px', padding:'1rem',
      border:`1px solid ${color}55`,
    }}>
      <div style={{ fontSize:'2.5rem' }}>{emoji}</div>
      <h2 style={{ color:'white', margin:'0.25rem 0 0', fontSize:'1.5rem', fontWeight:800 }}>{title}</h2>
    </div>

    {/* Cards */}
    <div style={{ display:'flex', flexDirection:'column', gap:'1.25rem' }}>
      {items.length === 0
        ? <div style={{ color:'rgba(255,255,255,0.4)', textAlign:'center', padding:'2rem' }}>No finalists yet</div>
        : items.map((item, i) => (
          <div key={item.id} style={{
            background:'rgba(255,255,255,0.06)',
            backdropFilter:'blur(20px)',
            borderRadius:'20px',
            border:`1px solid ${color}44`,
            overflow:'hidden',
            animation:`floatIn 0.6s ease ${i*0.15}s both`,
            boxShadow:`0 8px 32px rgba(0,0,0,0.3), 0 0 0 1px ${color}22`,
          }}>
            <div style={{ display:'flex', alignItems:'stretch' }}>
              {/* Photo */}
              <div style={{ width:'130px', flexShrink:0, position:'relative' }}>
                {item.photo_data
                  ? <img src={`/api/photos/bd/vote/${item.id}`} alt={item.nominee_name}
                      style={{ width:'100%', height:'100%', objectFit:'cover', minHeight:'160px' }} />
                  : <div style={{ width:'100%', minHeight:'160px', background:`${color}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'3rem' }}>
                      {emoji}
                    </div>
                }
                {/* Rank badge */}
                <div style={{
                  position:'absolute', top:'8px', left:'8px',
                  background:'rgba(0,0,0,0.7)', borderRadius:'99px',
                  padding:'2px 8px', fontSize:'1.1rem', fontWeight:800,
                }}>{rankLabel(i)}</div>
              </div>

              {/* Info */}
              <div style={{ flex:1, padding:'1.25rem', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
                <div>
                  <div style={{ color:'white', fontWeight:900, fontSize:'1.25rem', lineHeight:1.2 }}>{item.nominee_name}</div>
                  <div style={{ color:color, fontWeight:700, fontSize:'0.85rem', marginTop:'4px' }}>{item.department}</div>
                </div>

                {item.ai_reasoning && (
                  <div style={{
                    marginTop:'0.75rem',
                    background:'rgba(255,255,255,0.06)',
                    borderRadius:'10px',
                    padding:'0.6rem 0.75rem',
                    borderLeft:`3px solid ${color}`,
                  }}>
                    <div style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'3px' }}>🤖 AI Judge</div>
                    <div style={{ color:'rgba(255,255,255,0.85)', fontSize:'0.82rem', lineHeight:1.5, fontStyle:'italic' }}>
                      "{item.ai_reasoning}"
                    </div>
                  </div>
                )}

                {item.ai_score != null && (
                  <div style={{ marginTop:'0.6rem', display:'flex', alignItems:'center', gap:'8px' }}>
                    <div style={{ flex:1, height:'4px', borderRadius:'99px', background:'rgba(255,255,255,0.1)' }}>
                      <div style={{ width:`${item.ai_score}%`, height:'100%', borderRadius:'99px', background:`linear-gradient(90deg, ${color}, white)`, animation:'shimmer 2s infinite' }} />
                    </div>
                    <div style={{ color:color, fontWeight:800, fontSize:'0.8rem', whiteSpace:'nowrap' }}>{item.ai_score}/100</div>
                  </div>
                )}

                <div style={{ marginTop:'0.6rem', display:'flex', alignItems:'center', gap:'6px' }}>
                  <span style={{ color:'rgba(255,255,255,0.5)', fontSize:'0.78rem' }}>Votes:</span>
                  <span style={{ color:'white', fontWeight:800, fontSize:'1rem' }}>{item.vote_count}</span>
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

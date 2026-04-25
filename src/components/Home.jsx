import React from 'react';
import { useNavigate } from 'react-router-dom';

const modules = [
  {
    id: 'luckydraw',
    icon: '🎁',
    label: 'Lucky Draw',
    desc: 'Check if you won a prize tonight',
    path: '/luckydraw',
    gradient: 'linear-gradient(135deg, #0A8276 0%, #0fd9c0 100%)',
    light: 'rgba(10,130,118,0.08)',
    border: 'rgba(10,130,118,0.25)',
    text: '#0A8276',
  },
  {
    id: 'bestdress',
    icon: '👗',
    label: 'Best Dress',
    desc: 'Submit & vote for the best outfit',
    path: '/bestdress',
    gradient: 'linear-gradient(135deg, #be185d 0%, #f472b6 100%)',
    light: 'rgba(219,39,119,0.07)',
    border: 'rgba(219,39,119,0.2)',
    text: '#be185d',
  },
  {
    id: 'voting',
    icon: '🎤',
    label: 'Performance',
    desc: 'Rate the performers on stage',
    path: '/voting',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)',
    light: 'rgba(109,40,217,0.07)',
    border: 'rgba(109,40,217,0.2)',
    text: '#7c3aed',
  },
  {
    id: 'feedback',
    icon: '💬',
    label: 'Guest Feedback',
    desc: 'Share your thoughts with us',
    path: '/feedback',
    gradient: 'linear-gradient(135deg, #b45309 0%, #fbbf24 100%)',
    light: 'rgba(180,83,9,0.07)',
    border: 'rgba(180,83,9,0.2)',
    text: '#b45309',
  },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight:'100vh', background:'#FFFFFF', fontFamily:"'Outfit',sans-serif", display:'flex', flexDirection:'column', alignItems:'center' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }

        .home-card {
          cursor:pointer;
          border-radius:20px;
          padding:2rem 1.25rem 1.75rem;
          display:flex; flex-direction:column; align-items:center; text-align:center;
          border:1.5px solid;
          background:#FFFFFF;
          box-shadow:0 2px 16px rgba(0,0,0,0.06);
          transition:transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.22s ease;
          position:relative; overflow:hidden;
        }
        .home-card:hover { transform:translateY(-5px) scale(1.025); box-shadow:0 12px 40px rgba(0,0,0,0.12); }
        .home-card:active { transform:scale(0.97); }

        .card-icon { font-size:2.8rem; margin-bottom:0.9rem; transition:transform 0.22s ease; }
        .home-card:hover .card-icon { transform:scale(1.15); }

        .card-label { font-size:1.1rem; font-weight:900; letter-spacing:-0.2px; margin-bottom:0.35rem; color:#1D1D1D; }
        .card-desc  { color:#6b7280; font-size:0.78rem; font-weight:500; line-height:1.45; }

        .card-arrow {
          margin-top:1.25rem; width:34px; height:34px; border-radius:50%;
          display:flex; align-items:center; justify-content:center;
          color:white; font-size:0.9rem; font-weight:800;
          transition:transform 0.2s ease;
        }
        .home-card:hover .card-arrow { transform:translateX(4px); }

        @media (max-width:480px) {
          .home-card { padding:1.5rem 1rem 1.25rem; }
          .card-label { font-size:1rem; }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign:'center', padding:'3rem 1.5rem 1.75rem', width:'100%', maxWidth:'560px' }}>
        <div style={{ fontSize:'2.5rem', marginBottom:'0.5rem' }}>🎊</div>
        <h1 style={{ color:'#1D1D1D', fontSize:'clamp(1.8rem,6vw,2.6rem)', fontWeight:900, letterSpacing:'-1px', lineHeight:1.1 }}>
          Appreciation Night
        </h1>
        <p style={{ color:'#0A8276', fontWeight:800, fontSize:'1rem', marginTop:'0.3rem', letterSpacing:'3px', textTransform:'uppercase' }}>
          2026
        </p>
        <p style={{ color:'#9ca3af', fontSize:'0.85rem', marginTop:'0.6rem', fontWeight:500 }}>
          Choose a module below to get started
        </p>
      </div>

      {/* 2×2 Grid */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'0.9rem', padding:'0 1.25rem 3rem', width:'100%', maxWidth:'480px' }}>
        {modules.map(m => (
          <div
            key={m.id}
            className="home-card"
            onClick={() => navigate(m.path)}
            style={{ borderColor: m.border, background: m.light }}
          >
            {/* Top accent bar */}
            <div style={{ position:'absolute', top:0, left:0, right:0, height:'4px', background: m.gradient, borderRadius:'20px 20px 0 0' }} />

            <div className="card-icon">{m.icon}</div>
            <div className="card-label">{m.label}</div>
            <div className="card-desc">{m.desc}</div>
            <div className="card-arrow" style={{ background: m.gradient }}>→</div>
          </div>
        ))}
      </div>

      <p style={{ color:'#d1d5db', fontSize:'0.72rem', paddingBottom:'2rem' }}>
        eventjor.com · Appreciation Night 2026
      </p>
    </div>
  );
};

export default Home;

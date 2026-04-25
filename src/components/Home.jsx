import React from 'react';
import { useNavigate } from 'react-router-dom';

const modules = [
  {
    id: 'luckydraw',
    icon: '🎁',
    label: 'Lucky Draw',
    desc: 'Check if you won a prize tonight',
    path: '/luckydraw',
    color: '#0A8276',
    gradient: 'linear-gradient(135deg, #0A8276 0%, #0fd9c0 100%)',
    glow: 'rgba(10,130,118,0.35)',
  },
  {
    id: 'bestdress',
    icon: '👗',
    label: 'Best Dress',
    desc: 'Submit & vote for the best outfit',
    path: '/bestdress',
    color: '#db2777',
    gradient: 'linear-gradient(135deg, #be185d 0%, #f472b6 100%)',
    glow: 'rgba(219,39,119,0.35)',
  },
  {
    id: 'voting',
    icon: '🎤',
    label: 'Performance',
    desc: 'Rate the performers on stage',
    path: '/voting',
    color: '#7c3aed',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #a78bfa 100%)',
    glow: 'rgba(124,58,237,0.35)',
  },
  {
    id: 'feedback',
    icon: '💬',
    label: 'Guest Feedback',
    desc: 'Share your thoughts with us',
    path: '/feedback',
    color: '#d97706',
    gradient: 'linear-gradient(135deg, #b45309 0%, #fbbf24 100%)',
    glow: 'rgba(217,119,6,0.35)',
  },
];

const Home = () => {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1D1D1D',
      fontFamily: 'Outfit, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .home-card {
          cursor: pointer;
          border-radius: 24px;
          padding: 2.5rem 1.5rem 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border: 1.5px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.04);
          backdrop-filter: blur(12px);
          transition: transform 0.22s cubic-bezier(.34,1.56,.64,1), box-shadow 0.22s ease;
          position: relative;
          overflow: hidden;
        }
        .home-card::before {
          content: '';
          position: absolute; inset: 0;
          opacity: 0;
          transition: opacity 0.22s ease;
          border-radius: 24px;
        }
        .home-card:hover {
          transform: translateY(-6px) scale(1.03);
        }
        .home-card:hover::before { opacity: 1; }
        .home-card:active { transform: scale(0.97); }

        .card-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          filter: drop-shadow(0 4px 12px rgba(0,0,0,0.3));
          transition: transform 0.22s ease;
        }
        .home-card:hover .card-icon { transform: scale(1.15); }

        .card-label {
          color: white;
          font-size: 1.25rem;
          font-weight: 900;
          letter-spacing: -0.3px;
          margin-bottom: 0.4rem;
        }
        .card-desc {
          color: rgba(255,255,255,0.6);
          font-size: 0.82rem;
          font-weight: 500;
          line-height: 1.4;
        }
        .card-arrow {
          margin-top: 1.5rem;
          width: 36px; height: 36px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 1rem;
          transition: transform 0.2s ease;
          flex-shrink: 0;
        }
        .home-card:hover .card-arrow { transform: translateX(4px); }

        @media (max-width: 480px) {
          .home-card { padding: 2rem 1rem 1.5rem; }
          .card-label { font-size: 1.1rem; }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: 'center', padding: '3.5rem 1.5rem 2rem', width: '100%', maxWidth: '560px' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎊</div>
        <h1 style={{ color: 'white', fontSize: 'clamp(1.8rem,6vw,2.6rem)', fontWeight: 900, letterSpacing: '-1px', lineHeight: 1.1 }}>
          Appreciation Night
        </h1>
        <p style={{ color: '#0A8276', fontWeight: 800, fontSize: '1.1rem', marginTop: '0.3rem', letterSpacing: '2px', textTransform: 'uppercase' }}>
          2026
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem', marginTop: '0.75rem', fontWeight: 500 }}>
          Choose a module below to get started
        </p>
      </div>

      {/* 2×2 Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '1rem',
        padding: '0 1.25rem 3rem',
        width: '100%',
        maxWidth: '480px',
      }}>
        {modules.map(m => (
          <div
            key={m.id}
            className="home-card"
            onClick={() => navigate(m.path)}
            style={{ '--glow': m.glow }}
          >
            <style>{`
              #card-${m.id}::before {
                background: ${m.gradient};
                opacity: 0;
              }
            `}</style>
            {/* Coloured top accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: '4px',
              background: m.gradient,
              borderRadius: '24px 24px 0 0',
            }} />

            <div className="card-icon">{m.icon}</div>
            <div className="card-label">{m.label}</div>
            <div className="card-desc">{m.desc}</div>
            <div className="card-arrow" style={{ background: m.gradient, color: 'white' }}>→</div>
          </div>
        ))}
      </div>

      <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.75rem', paddingBottom: '2rem' }}>
        eventjor.com · Powered by Infineon Technologies
      </p>
    </div>
  );
};

export default Home;

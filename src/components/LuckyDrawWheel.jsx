import React, { useState, useEffect, useRef } from 'react';

const LuckyDrawWheel = ({ prize, onFinish, onClose, isInline = false }) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [namesPool, setNamesPool] = useState([]);
  const [winner, setWinner] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Load ALL eligible names for the wheel
  useEffect(() => {
    const fetchNames = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/eligible-employees');
        const data = await res.json();
        // The user wants ALL eligible names on the wheel
        setNamesPool(data || []);
      } catch (err) {
        console.error("Failed to load wheel names");
      } finally {
        setLoading(false);
      }
    };
    fetchNames();
  }, []);

  const startSpin = () => {
    if (spinning || namesPool.length === 0) return;
    
    // Pick a winner locally from the pool
    const selectedWinner = namesPool[Math.floor(Math.random() * namesPool.length)];
    setWinner(selectedWinner);
    setSpinning(true);
    
    // Find index to calculate rotation
    const winnerIndex = namesPool.indexOf(selectedWinner);
    const segmentAngle = 360 / namesPool.length;
    
    const baseRotation = 360 * 10; // 10 full spins
    const landAngle = (360 - (winnerIndex * segmentAngle)) - (segmentAngle / 2);
    const totalRotation = baseRotation + landAngle;
    
    setRotation(totalRotation);

    setTimeout(() => {
      setSpinning(false);
    }, 7000); 
  };

  const publishWinner = () => {
    if (winner) {
      onFinish(winner);
    }
  };

  if (loading) return <div className="wheel-overlay" style={{ background: 'white', color: '#1e293b' }}>Loading Eligible Pool...</div>;

  return (
    <div className={isInline ? "wheel-inline" : "wheel-overlay"}>
      <div className="wheel-container">
        {!isInline && <button className="close-wheel-btn" onClick={onClose} style={{ color: '#64748b' }}>✕ Close</button>}
        
        <div className="wheel-stage-header">
          {!isInline && <h2 style={{ color: '#94a3b8' }}>DRAWING FOR:</h2>}
          <div className="wheel-prize-tag" style={{ color: '#0a8276' }}>{prize?.name || "Lucky Prize"}</div>
        </div>

        <div className={`wheel-wrapper ${isInline ? 'inline-size' : ''}`} style={{ borderColor: '#e2e8f0', background: '#fff' }}>
          <div className="wheel-pointer" style={{ color: '#0a8276' }}>▼</div>
          <div 
            className="wheel-circle" 
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 7s cubic-bezier(0.1, 0, 0.1, 1)' : 'none'
            }}
          >
            {namesPool.map((emp, i) => {
              const angle = (360 / namesPool.length) * i;
              // Visual optimization: if pool is huge, don't render every line to keep it clean, but kept for "all names" requirement
              return (
                <div 
                  key={emp.id} 
                  className="wheel-segment"
                  style={{ 
                    transform: `rotate(${angle}deg)`,
                    backgroundColor: i % 2 === 0 ? '#0a8276' : '#0d9488',
                    borderLeft: namesPool.length > 50 ? 'none' : '1px solid rgba(255,255,255,0.1)'
                  }}
                >
                  {namesPool.length <= 100 && <span className="segment-text" style={{ color: 'white' }}>{emp.name}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="wheel-controls">
          {!spinning && rotation === 0 && (
            <button className="spin-launch-btn" onClick={startSpin} style={{ background: '#0a8276' }}>SPIN NOW</button>
          )}
          {!spinning && rotation > 0 && winner && (
            <div className="announcement-card">
              <h3 style={{ color: '#64748b' }}>🎉 PROSPECTIVE WINNER 🎉</h3>
              <div className="winner-big-name" style={{ color: '#0a8276' }}>{winner.name}</div>
              <div className="winner-big-dept" style={{ color: '#64748b' }}>{winner.department}</div>
              
              <div className="publish-actions" style={{ marginTop: '2.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button className="publish-btn" onClick={publishWinner} style={{ background: '#0a8276', color: 'white', border: 'none', padding: '1rem 3rem', borderRadius: '12px', fontSize: '1.25rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px rgba(10, 130, 118, 0.2)' }}>
                  OFFICIAL PUBLISH
                </button>
                <button className="redraw-btn" onClick={() => { setRotation(0); setWinner(null); }} style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', padding: '1rem 2rem', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
                  Respin / Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .wheel-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: white;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #1e293b;
        }
        .wheel-inline {
          position: relative;
          background: transparent;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 0;
        }
        .wheel-container {
          width: 100%;
          max-width: 900px;
          text-align: center;
          position: relative;
        }
        .close-wheel-btn {
          position: absolute;
          top: -20px;
          right: 20px;
          background: #f1f5f9;
          border: none;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 700;
        }
        .wheel-stage-header h2 {
          font-size: 1.2rem;
          color: #94a3b8;
          margin-bottom: 0.5rem;
          letter-spacing: 4px;
        }
        .wheel-prize-tag {
          font-size: 2.2rem;
          font-weight: 900;
          margin-bottom: 2rem;
          text-transform: uppercase;
        }
        .wheel-wrapper {
          position: relative;
          width: 400px;
          height: 400px;
          margin: 0 auto;
          border-radius: 50%;
          border: 10px solid #f1f5f9;
          box-shadow: 0 15px 40px rgba(0,0,0,0.1);
          overflow: visible;
        }
        .wheel-wrapper.inline-size {
          width: 320px;
          height: 320px;
        }
        .wheel-pointer {
          position: absolute;
          top: -25px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 2.5rem;
          z-index: 10;
        }
        .wheel-circle {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
          background: #f8fafc;
        }
        .wheel-segment {
          position: absolute;
          width: 50%;
          height: 50%;
          top: 0;
          left: 50%;
          transform-origin: 0% 100%;
        }
        .segment-text {
          position: absolute;
          right: 12px;
          transform: rotate(75deg);
          font-weight: 700;
          font-size: 0.6rem;
          max-width: 90px;
          white-space: nowrap;
          text-align: right;
        }
        .wheel-controls {
          margin-top: 2rem;
          min-height: 100px;
        }
        .spin-launch-btn {
          color: white;
          border: none;
          padding: 1.2rem 3.5rem;
          font-size: 1.5rem;
          font-weight: 900;
          border-radius: 99px;
          cursor: pointer;
          transition: 0.3s;
          box-shadow: 0 10px 30px rgba(10, 130, 118, 0.2);
        }
        .spin-launch-btn:hover { transform: scale(1.05); }
        .winner-big-name {
          font-size: 3rem;
          font-weight: 900;
          margin: 0.4rem 0;
        }
        .winner-big-dept {
          font-size: 1.2rem;
        }
        .publish-btn:hover { transform: translateY(-2px); filter: brightness(1.1); }
      `}</style>
    </div>
  );
};

export default LuckyDrawWheel;

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
    <div className={isInline ? "wheel-inline" : "wheel-overlay"} id="wheel-stage-root">
      <div className={`wheel-container ${!isInline ? 'split-layout' : ''}`}>
        {!isInline && (
          <div className="wheel-stage-actions">
            <button className="stage-btn fs-btn" onClick={() => document.getElementById('wheel-stage-root').requestFullscreen()}>🖥️ Full Screen</button>
            <button className="stage-btn close-btn" onClick={onClose}>✕ Exit</button>
          </div>
        )}
        
        <div className="wheel-left-panel">
          <div className="wheel-stage-header">
            <div className="wheel-prize-tag">{prize?.name || "Lucky Prize"}</div>
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

        </div>

        <div className="wheel-right-panel">
          <div className="status-indicator">
            {spinning ? '🥁 Spinning...' : (rotation > 0 ? '🎊 WE HAVE A WINNER! 🎊' : 'READY TO DRAW')}
          </div>

          <div className="prize-detail-card">
            <label>CURRENT PRIZE</label>
            <div className="prize-name">{prize?.name}</div>
            <div className="prize-session">Session: {prize?.session}</div>
          </div>

          <div className="wheel-controls">
            {!spinning && rotation === 0 && (
              <button className="spin-launch-btn highlight" onClick={startSpin}>START SPINNING</button>
            )}
            {!spinning && rotation > 0 && winner && (
              <div className="announcement-side-card">
                <div className="winner-details">
                  <label>WINNER NAME</label>
                  <div className="winner-big-name">{winner.name}</div>
                  <label>DEPARTMENT</label>
                  <div className="winner-big-dept">{winner.department}</div>
                </div>
                
                <div className="publish-actions">
                  <button className="publish-btn" onClick={publishWinner}>
                    CONFIRM & PUBLISH
                  </button>
                  <button className="redraw-btn" onClick={() => { setRotation(0); setWinner(null); }}>
                    CANCEL / RESPIN
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .wheel-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: #0f172a;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-family: 'Inter', sans-serif;
        }
        .wheel-container.split-layout {
          display: flex;
          width: 95%;
          max-width: 1400px;
          height: 85vh;
          background: rgba(30, 41, 59, 0.7);
          backdrop-filter: blur(20px);
          border-radius: 40px;
          border: 1px solid rgba(255,255,255,0.1);
          overflow: hidden;
          box-shadow: 0 50px 100px rgba(0,0,0,0.5);
        }
        .wheel-left-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 4rem;
          border-right: 1px solid rgba(255,255,255,0.1);
        }
        .wheel-right-panel {
          flex: 0.8;
          display: flex;
          flex-direction: column;
          padding: 4rem;
          text-align: left;
          background: rgba(15, 23, 42, 0.3);
        }
        .wheel-stage-actions {
          position: absolute;
          top: 2rem;
          right: 2rem;
          display: flex;
          gap: 1rem;
        }
        .stage-btn {
          padding: 0.8rem 1.5rem;
          border-radius: 12px;
          font-weight: 800;
          cursor: pointer;
          border: none;
          transition: 0.3s;
        }
        .fs-btn { background: rgba(255,255,255,0.1); color: white; }
        .close-btn { background: #ef4444; color: white; }
        .status-indicator {
          font-size: 0.9rem;
          font-weight: 900;
          letter-spacing: 2px;
          color: #94a3b8;
          margin-bottom: 2rem;
        }
        .prize-detail-card label, .winner-details label {
          display: block;
          font-size: 0.75rem;
          font-weight: 900;
          color: #94a3b8;
          letter-spacing: 1px;
          margin-bottom: 0.5rem;
        }
        .prize-name {
          font-size: 2.5rem;
          font-weight: 900;
          margin-bottom: 0.5rem;
          line-height: 1.1;
        }
        .prize-session { color: #0a8276; font-weight: 800; font-size: 1.2rem; }
        .winner-details { margin-top: 3rem; animation: slideIn 0.5s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateX(30px); } to { opacity: 1; transform: translateX(0); } }
        .winner-big-name { font-size: 3.5rem; font-weight: 900; color: #10b981; margin-bottom: 0.5rem; line-height: 1; text-shadow: 0 0 30px rgba(16, 185, 129, 0.3); }
        .winner-big-dept { font-size: 1.5rem; color: #cbd5e1; font-weight: 600; }
        .publish-actions { margin-top: 4rem; display: flex; flex-direction: column; gap: 1rem; }
        .publish-btn { background: #10b981; color: white; border: none; padding: 1.5rem; border-radius: 16px; font-size: 1.25rem; font-weight: 900; cursor: pointer; transition: 0.3s; }
        .publish-btn:hover { transform: scale(1.02); box-shadow: 0 20px 40px rgba(16, 185, 129, 0.4); }
        .redraw-btn { background: transparent; color: #94a3b8; border: 1px solid #334155; padding: 1rem; border-radius: 12px; font-weight: 700; cursor: pointer; }
        .spin-launch-btn.highlight {
          width: 100%;
          background: linear-gradient(135deg, #0a8276 0%, #0d9488 100%);
          height: 80px;
          font-size: 1.5rem;
          margin-top: 3rem;
          animation: pulse 2s infinite;
        }
        @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(10, 130, 118, 0.4); } 70% { box-shadow: 0 0 0 20px rgba(10, 130, 118, 0); } 100% { box-shadow: 0 0 0 0 rgba(10, 130, 118, 0); } }
        .wheel-wrapper { width: 500px; height: 500px; border: 15px solid #1e293b; }
        .wheel-circle { background: #1e293b; }
        .wheel-prize-tag { display: none; } /* Shown in right panel info */
      `}</style>
    </div>
  );
};

export default LuckyDrawWheel;

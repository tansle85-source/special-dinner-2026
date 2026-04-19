import React, { useState, useEffect, useRef } from 'react';

const LuckyDrawWheel = ({ prize, winner, onFinish, onClose, isInline = false }) => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [namesPool, setNamesPool] = useState([]);
  const wheelRef = useRef(null);

  // Load a pool of names for the wheel segments
  useEffect(() => {
    const fetchNames = async () => {
      try {
        const res = await fetch('/api/eligible-employees');
        const allNames = await res.json();
        
        // Pick 19 random names + the actual winner to make 20 segments
        let pool = (allNames || [])
          .filter(n => n !== (winner?.name || "Winner"))
          .sort(() => 0.5 - Math.random())
          .slice(0, 19);
          
        pool.push(winner?.name || "Winner");
        // Shuffle the winner into the pool
        pool = pool.sort(() => 0.5 - Math.random());
        setNamesPool(pool);
      } catch (err) {
        console.error("Failed to load wheel names");
      }
    };
    fetchNames();
  }, [winner]);

  const startSpin = () => {
    if (spinning) return;
    
    setSpinning(true);
    
    // Find the winner's index in the pool
    const winnerIndex = namesPool.indexOf(winner.name);
    const segmentAngle = 360 / namesPool.length;
    
    // Calculate rotation to land on the winner
    // Landing spot = (360 - (index * segmentAngle)) + (extra full rotations)
    // We subtract the half segment to center the pointer
    const baseRotation = 360 * 10; // 10 full spins
    const landAngle = (360 - (winnerIndex * segmentAngle)) - (segmentAngle / 2);
    const totalRotation = baseRotation + landAngle;
    
    setRotation(totalRotation);

    setTimeout(() => {
      setSpinning(false);
      onFinish();
    }, 7000); // 7 second spin
  };

  return (
    <div className={isInline ? "wheel-inline" : "wheel-overlay"}>
      <div className="wheel-container">
        {!isInline && <button className="close-wheel-btn" onClick={onClose}>✕ Close</button>}
        
        {(!isInline || (spinning || rotation > 0)) && (
          <div className="wheel-stage-header">
            {isInline ? null : <h2>DRAWING FOR:</h2>}
            <div className="wheel-prize-tag">{prize?.name || "Loading..."}</div>
          </div>
        )}

        <div className={`wheel-wrapper ${isInline ? 'inline-size' : ''}`}>
          <div className="wheel-pointer">▼</div>
          <div 
            className="wheel-circle" 
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 7s cubic-bezier(0.1, 0, 0.1, 1)' : 'none'
            }}
          >
            {namesPool.map((name, i) => {
              const angle = (360 / namesPool.length) * i;
              return (
                <div 
                  key={i} 
                  className="wheel-segment"
                  style={{ 
                    transform: `rotate(${angle}deg)`,
                    backgroundColor: i % 2 === 0 ? 'var(--primary)' : '#086d63'
                  }}
                >
                  <span className="segment-text">{name}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="wheel-controls">
          {!spinning && rotation === 0 && (
            <button className="spin-launch-btn" onClick={startSpin}>SPIN NOW</button>
          )}
          {!spinning && rotation > 0 && (
            <div className="announcement-card">
              <h3>🎉 CONGRATULATIONS! 🎉</h3>
              <div className="winner-big-name">{winner.name}</div>
              <div className="winner-big-dept">{winner.department}</div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .wheel-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(circle, #1e293b 0%, #020617 100%);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        .wheel-inline {
          position: relative;
          background: transparent;
          color: inherit;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem 0;
        }
        .wheel-inline .segment-text { color: white; }
        .wheel-inline .wheel-prize-tag { color: var(--primary); font-size: 1.5rem; margin-bottom: 1rem; }
        .wheel-inline .wheel-pointer { color: #0a8276; }
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
          background: rgba(255,255,255,0.1);
          border: none;
          color: white;
          padding: 8px 16px;
          border-radius: 8px;
          cursor: pointer;
        }
        .wheel-stage-header h2 {
          font-size: 1.5rem;
          color: #94a3b8;
          margin-bottom: 0.5rem;
          letter-spacing: 4px;
        }
        .wheel-prize-tag {
          font-size: 3rem;
          font-weight: 900;
          color: var(--primary);
          text-shadow: 0 0 20px rgba(10, 130, 118, 0.5);
          margin-bottom: 3rem;
          text-transform: uppercase;
        }
        .wheel-wrapper {
          position: relative;
          width: 500px;
          height: 500px;
          margin: 0 auto;
          border-radius: 50%;
          border: 10px solid #cbd5e1;
          box-shadow: 0 0 50px rgba(0,0,0,0.5), 0 0 20px var(--primary);
        }
        .wheel-wrapper.inline-size {
          width: 320px;
          height: 320px;
          border-width: 6px;
        }
        .wheel-pointer {
          position: absolute;
          top: -35px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 3rem;
          color: #f59e0b;
          z-index: 10;
          filter: drop-shadow(0 0 5px rgba(0,0,0,0.5));
        }
        .wheel-inline .wheel-pointer {
          top: -25px;
          font-size: 2.2rem;
        }
        .wheel-circle {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          position: relative;
          overflow: hidden;
        }
        .wheel-segment {
          position: absolute;
          width: 50%;
          height: 50%;
          top: 0;
          left: 50%;
          transform-origin: 0% 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          border-left: 1px solid rgba(255,255,255,0.1);
        }
        .segment-text {
          position: absolute;
          right: 15px;
          transform: rotate(70deg);
          font-weight: 700;
          font-size: 0.75rem;
          max-width: 80px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-align: right;
          color: white;
        }
        .wheel-inline .segment-text {
          font-size: 0.55rem;
          right: 8px;
        }
        .wheel-controls {
          margin-top: 2rem;
          min-height: 80px;
        }
        .wheel-inline .wheel-controls { margin-top: 1rem; }
        .spin-launch-btn {
          background: #f59e0b;
          color: white;
          border: none;
          padding: 1.5rem 4rem;
          font-size: 2rem;
          font-weight: 900;
          border-radius: 99px;
          cursor: pointer;
          box-shadow: 0 10px 30px rgba(245, 158, 11, 0.4);
          transition: 0.3s;
        }
        .wheel-inline .spin-launch-btn { display: none; } /* Hidden in dashboard mode because the Next Prize button triggers it */
        .spin-launch-btn:hover {
          transform: scale(1.1);
          box-shadow: 0 15px 40px rgba(245, 158, 11, 0.6);
        }
        .announcement-card {
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .wheel-inline .announcement-card h3 { display: none; }
        .winner-big-name {
          font-size: 4rem;
          font-weight: 900;
          color: #facc15;
          text-shadow: 0 0 20px rgba(250, 204, 21, 0.5);
        }
        .wheel-inline .winner-big-name {
          font-size: 2rem;
          color: #0a8276;
          text-shadow: none;
        }
        .winner-big-dept {
          font-size: 1.5rem;
          color: #94a3b8;
        }
        .wheel-inline .winner-big-dept { font-size: 1rem; }
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LuckyDrawWheel;

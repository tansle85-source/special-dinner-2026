import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const LuckyDraw = () => {
  const [query, setQuery]         = useState('');
  const [results, setResults]     = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [searched, setSearched]   = useState(false);
  const [loading, setLoading]     = useState(true);
  const inputRef = useRef(null);

  // Load employee list once
  useEffect(() => {
    axios.get('/api/employees').then(r => {
      setAllEmployees(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    const found = allEmployees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.department && e.department.toLowerCase().includes(q))
    );
    setResults(found);
    setSearched(true);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setSearched(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'Outfit, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .ld-header {
          background: linear-gradient(135deg, #0A8276 0%, #0cb89e 100%);
          padding: 2.5rem 1.5rem 3.5rem;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .ld-header::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.12), transparent 60%);
          pointer-events: none;
        }
        .ld-search-wrap {
          position: relative;
          margin-top: -1.75rem;
          max-width: 560px;
          margin-left: auto; margin-right: auto;
          z-index: 10;
          padding: 0 1rem;
        }
        .ld-search-box {
          display: flex;
          gap: 0;
          background: white;
          border-radius: 16px;
          box-shadow: 0 12px 40px rgba(10,130,118,0.2);
          overflow: hidden;
        }
        .ld-input {
          flex: 1;
          border: none;
          padding: 1rem 1.25rem;
          font-size: 1rem;
          font-family: Outfit, sans-serif;
          font-weight: 600;
          color: #1D1D1D;
          outline: none;
          background: transparent;
        }
        .ld-input::placeholder { color: #94a3b8; font-weight: 500; }
        .ld-btn {
          border: none;
          padding: 0 1.4rem;
          background: #0A8276;
          color: white;
          font-family: Outfit, sans-serif;
          font-weight: 800;
          font-size: 0.95rem;
          cursor: pointer;
          transition: background 0.2s;
        }
        .ld-btn:hover { background: #076b61; }
        .ld-clear {
          border: none; padding: 0 0.9rem;
          background: #f1f5f9; color: #64748b;
          font-family: Outfit, sans-serif; font-weight: 700; font-size: 1rem;
          cursor: pointer;
        }

        .ld-results { max-width: 560px; margin: 2rem auto; padding: 0 1rem; }

        .ld-card {
          background: white;
          border-radius: 16px;
          margin-bottom: 1rem;
          padding: 1.25rem 1.5rem;
          border: 1.5px solid #e2e8f0;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .ld-card.winner {
          border-color: #0A8276;
          background: linear-gradient(135deg, rgba(10,130,118,0.04), rgba(12,184,158,0.06));
          box-shadow: 0 4px 20px rgba(10,130,118,0.12);
        }
        .ld-avatar {
          width: 48px; height: 48px; border-radius: 50%;
          background: #e2e8f0;
          display: flex; align-items: center; justify-content: center;
          font-size: 1.4rem; flex-shrink: 0;
        }
        .ld-avatar.win { background: rgba(10,130,118,0.12); }
        .ld-name { font-weight: 800; font-size: 1.05rem; color: #1D1D1D; }
        .ld-dept { font-size: 0.82rem; color: #64748b; margin-top: 2px; }
        .ld-prize-label {
          margin-left: auto; flex-shrink: 0;
          background: #0A8276; color: white;
          padding: 0.4rem 0.9rem;
          border-radius: 99px;
          font-size: 0.8rem; font-weight: 800;
          text-align: center;
          max-width: 160px;
        }
        .ld-no-prize {
          margin-left: auto; flex-shrink: 0;
          color: #94a3b8; font-size: 0.82rem; font-weight: 600;
        }

        .ld-empty {
          text-align: center; padding: 3rem 1rem;
        }
        .ld-hint {
          max-width: 560px; margin: 1.5rem auto 0;
          padding: 0 1rem;
          text-align: center;
          color: #94a3b8; font-size: 0.85rem;
        }
      `}</style>

      {/* Header */}
      <div className="ld-header">
        <div style={{ fontSize:'2.5rem', marginBottom:'0.75rem' }}>🎁</div>
        <h1 style={{ color:'white', fontSize:'clamp(1.6rem,5vw,2.4rem)', fontWeight:900, letterSpacing:'-0.5px' }}>
          Lucky Draw
        </h1>
        <p style={{ color:'rgba(255,255,255,0.85)', marginTop:'0.4rem', fontSize:'0.95rem', fontWeight:500 }}>
          Appreciation Night 2026 · Search your name to check results
        </p>
      </div>

      {/* Search Box */}
      <div className="ld-search-wrap">
        <div className="ld-search-box">
          <input
            ref={inputRef}
            className="ld-input"
            placeholder="Enter your name or department…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            autoComplete="off"
          />
          {searched && (
            <button className="ld-clear" onClick={handleClear} title="Clear">✕</button>
          )}
          <button className="ld-btn" onClick={handleSearch}>Search</button>
        </div>
      </div>

      {/* Results */}
      <div className="ld-results">
        {loading && (
          <div style={{ textAlign:'center', color:'#94a3b8', paddingTop:'2rem' }}>Loading…</div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="ld-empty">
            <div style={{ fontSize:'3rem' }}>🔍</div>
            <p style={{ color:'#475569', fontWeight:700, marginTop:'1rem' }}>No match found</p>
            <p style={{ color:'#94a3b8', fontSize:'0.88rem', marginTop:'0.4rem' }}>Try a different name or partial spelling</p>
          </div>
        )}

        {!loading && searched && results.length > 0 && (
          <>
            <p style={{ color:'#64748b', fontSize:'0.85rem', marginBottom:'1rem', fontWeight:600 }}>
              Found {results.length} result{results.length > 1 ? 's' : ''}
            </p>
            {results.map(e => (
              <div key={e.id} className={`ld-card ${e.won_prize ? 'winner' : ''}`}>
                <div className={`ld-avatar ${e.won_prize ? 'win' : ''}`}>
                  {e.won_prize ? '🏆' : '👤'}
                </div>
                <div>
                  <div className="ld-name">{e.name}</div>
                  <div className="ld-dept">{e.department}</div>
                </div>
                {e.won_prize
                  ? <div className="ld-prize-label">🎉 {e.won_prize}</div>
                  : <div className="ld-no-prize">Not drawn yet</div>
                }
              </div>
            ))}
          </>
        )}

        {!searched && !loading && (
          <div className="ld-hint">
            Type your name above and press <strong>Search</strong> to find out if you've won a prize tonight 🎊
          </div>
        )}
      </div>
    </div>
  );
};

export default LuckyDraw;

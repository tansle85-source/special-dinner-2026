import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const LuckyDraw = () => {
  const [query, setQuery]           = useState('');
  const [allEmployees, setAllEmployees] = useState([]);
  const [results, setResults]       = useState([]);
  const [searched, setSearched]     = useState(false);
  const [loading, setLoading]       = useState(true);
  const inputRef = useRef(null);

  useEffect(() => {
    axios.get('/api/employees').then(r => {
      setAllEmployees(r.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const winners = allEmployees.filter(e => e.won_prize);

  const handleSearch = () => {
    const q = query.trim().toLowerCase();
    if (!q) { setSearched(false); setResults([]); return; }
    setResults(allEmployees.filter(e =>
      e.name.toLowerCase().includes(q) ||
      (e.department && e.department.toLowerCase().includes(q))
    ));
    setSearched(true);
  };

  const handleClear = () => {
    setQuery(''); setResults([]); setSearched(false);
    inputRef.current?.focus();
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:'Outfit, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        body { margin:0; }

        .ld-header {
          background: linear-gradient(135deg, #0A8276 0%, #0cb89e 100%);
          padding: 2.5rem 1.5rem 4rem;
          text-align: center;
          position: relative;
        }
        .ld-header::before {
          content:'';
          position:absolute; inset:0;
          background: radial-gradient(ellipse at 30% 50%, rgba(255,255,255,0.1), transparent 60%);
          pointer-events:none;
        }
        .ld-search-wrap {
          max-width: 560px;
          margin: -1.75rem auto 0;
          padding: 0 1rem;
          position: relative;
          z-index: 10;
        }
        .ld-search-box {
          display:flex; background:white;
          border-radius:16px;
          box-shadow: 0 12px 40px rgba(10,130,118,0.2);
          overflow:hidden;
        }
        .ld-input {
          flex:1; border:none; outline:none;
          padding: 1rem 1.25rem;
          font-size: 1rem; font-family:Outfit,sans-serif;
          font-weight:600; color:#1D1D1D;
        }
        .ld-input::placeholder { color:#94a3b8; font-weight:500; }
        .ld-btn {
          border:none; padding:0 1.4rem;
          background:#0A8276; color:white;
          font-family:Outfit,sans-serif; font-weight:800; font-size:0.95rem;
          cursor:pointer; transition:background 0.2s;
        }
        .ld-btn:hover { background:#076b61; }
        .ld-clear {
          border:none; padding:0 0.9rem;
          background:#f1f5f9; color:#64748b;
          font-family:Outfit,sans-serif; font-weight:700; font-size:1rem; cursor:pointer;
        }

        .ld-body { max-width:640px; margin:0 auto; padding:2rem 1rem 4rem; }

        /* Search results */
        .ld-card {
          background:white; border-radius:14px; margin-bottom:0.75rem;
          padding:1rem 1.25rem; border:1.5px solid #e2e8f0;
          box-shadow:0 2px 8px rgba(0,0,0,0.04);
          display:flex; align-items:center; gap:1rem;
        }
        .ld-card.winner { border-color:#0A8276; background:linear-gradient(135deg,rgba(10,130,118,0.04),rgba(12,184,158,0.06)); }
        .ld-avatar { width:44px;height:44px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:1.3rem;flex-shrink:0; }
        .ld-avatar.win { background:rgba(10,130,118,0.12); }
        .ld-prize-pill { margin-left:auto; background:#0A8276; color:white; padding:3px 12px; border-radius:99px; font-size:0.78rem; font-weight:800; flex-shrink:0; }
        .ld-no-prize { margin-left:auto; color:#94a3b8; font-size:0.8rem; font-weight:600; }

        /* Full winner list */
        .wl-section { margin-top:2rem; }
        .wl-title {
          font-size:1.1rem; font-weight:800; color:#1D1D1D;
          margin-bottom:1rem; padding-bottom:0.5rem;
          border-bottom:2px solid #0A8276;
          display:flex; align-items:center; gap:0.5rem;
        }
        .wl-count { background:#0A8276; color:white; padding:1px 9px; border-radius:99px; font-size:0.75rem; }
        .wl-row {
          display:flex; align-items:center; justify-content:space-between;
          padding:0.85rem 1rem; background:white; border-radius:12px;
          border:1px solid #e2e8f0; margin-bottom:0.5rem;
          box-shadow:0 1px 4px rgba(0,0,0,0.03);
        }
        .wl-name { font-weight:800; font-size:0.95rem; color:#1D1D1D; }
        .wl-dept { font-size:0.78rem; color:#64748b; margin-top:1px; }
        .wl-prize { background:rgba(10,130,118,0.1); color:#0A8276; padding:3px 12px; border-radius:99px; font-size:0.78rem; font-weight:800; }
        .wl-empty { text-align:center; color:#94a3b8; padding:3rem 1rem; }
      `}</style>

      {/* Header */}
      <div className="ld-header">
        <div style={{ fontSize:'2.5rem', marginBottom:'0.6rem' }}>🎁</div>
        <h1 style={{ color:'white', fontSize:'clamp(1.7rem,5vw,2.5rem)', fontWeight:900, margin:0, letterSpacing:'-0.5px' }}>
          Lucky Draw
        </h1>
        <p style={{ color:'rgba(255,255,255,0.85)', margin:'0.4rem 0 0', fontSize:'0.95rem', fontWeight:500 }}>
          Appreciation Night 2026 · Search your name to check results
        </p>
      </div>

      {/* Search box */}
      <div className="ld-search-wrap">
        <div className="ld-search-box">
          <input
            ref={inputRef}
            className="ld-input"
            placeholder="Search your name…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            autoComplete="off"
          />
          {searched && <button className="ld-clear" onClick={handleClear}>✕</button>}
          <button className="ld-btn" onClick={handleSearch}>Search</button>
        </div>
      </div>

      <div className="ld-body">
        {loading && <div style={{ textAlign:'center', color:'#94a3b8', paddingTop:'2rem' }}>Loading…</div>}

        {/* === SEARCH RESULTS === */}
        {!loading && searched && (
          <>
            <p style={{ color:'#64748b', fontSize:'0.85rem', marginBottom:'0.75rem', fontWeight:600, marginTop:'1.5rem' }}>
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}"
            </p>
            {results.length === 0
              ? <div style={{ textAlign:'center', padding:'2rem', color:'#94a3b8' }}>
                  <div style={{ fontSize:'2.5rem' }}>🔍</div>
                  <p style={{ fontWeight:700, color:'#475569', marginTop:'0.5rem' }}>No match found</p>
                </div>
              : results.map(e => (
                <div key={e.id} className={`ld-card ${e.won_prize ? 'winner' : ''}`}>
                  <div className={`ld-avatar ${e.won_prize ? 'win' : ''}`}>{e.won_prize ? '🏆' : '👤'}</div>
                  <div>
                    <div style={{ fontWeight:800, fontSize:'1rem', color:'#1D1D1D' }}>{e.name}</div>
                    <div style={{ fontSize:'0.8rem', color:'#64748b', marginTop:'2px' }}>{e.department}</div>
                  </div>
                  {e.won_prize
                    ? <div className="ld-prize-pill">🎉 {e.won_prize}</div>
                    : <div className="ld-no-prize">Not drawn yet</div>
                  }
                </div>
              ))
            }
            <div style={{ height:'1.5rem' }} />
          </>
        )}

        {/* === WINNER LIST === */}
        {!loading && (
          <div className="wl-section">
            <div className="wl-title">
              🏆 Winner List
              <span className="wl-count">{winners.length}</span>
            </div>

            {winners.length === 0
              ? <div className="wl-empty">
                  <div style={{ fontSize:'3rem' }}>🎲</div>
                  <p style={{ fontWeight:700, color:'#475569', marginTop:'0.5rem' }}>Draw has not started yet</p>
                  <p style={{ fontSize:'0.85rem', marginTop:'0.3rem' }}>Results will appear here once published.</p>
                </div>
              : winners.map(e => (
                <div key={e.id} className="wl-row">
                  <div>
                    <div className="wl-name">{e.name}</div>
                    <div className="wl-dept">{e.department}</div>
                  </div>
                  <div className="wl-prize">{e.won_prize}</div>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  );
};

export default LuckyDraw;

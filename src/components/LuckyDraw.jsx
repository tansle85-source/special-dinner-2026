import React, { useState } from 'react';
import axios from 'axios';

const LuckyDraw = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const res = await axios.get(`/api/search?query=${encodeURIComponent(query)}`);
      setResults(res.data);
      setHasSearched(true);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lucky-draw-container">
      <div className="search-header">
        <h1>Did You Win?</h1>
        <p>Enter your full name to check if you are a lucky winner!</p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <input 
          type="text" 
          placeholder="Search by your name..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="btn search-btn" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="search-results">
        {hasSearched && results.length === 0 && (
          <div className="glass-card result-card empty-result">
            <p>No employee found matching "{query}". Please try your full name.</p>
          </div>
        )}

        {results.map((emp, idx) => (
          <div key={idx} className={`glass-card result-card ${emp.won_prize ? 'winner-card' : ''}`}>
            <h3>{emp.name}</h3>
            <p className="dept">{emp.department}</p>
            
            {emp.won_prize ? (
              <div className="winner-announcement">
                <div className="confetti">🎉</div>
                <h2 className="prize-won-text">Winner!</h2>
                <p className="prize-name">{emp.won_prize}</p>
              </div>
            ) : (
              <div className="no-prize">
                <p>No prize won yet. Keep your fingers crossed! 🤞</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LuckyDraw;

import React, { useState } from 'react';
import LuckyDraw from './components/LuckyDraw';
import Admin from './components/Admin';

const App = () => {
  const [view, setView] = useState('luckydraw'); // 'luckydraw' or 'admin'

  return (
    <div className="app-container">
      {/* Top Header - Visible always, but Admin hidden on mobile via CSS */}
      <nav className="top-nav">
        <div className="logo">Dinner<span>2026</span></div>
        <div className="nav-links desktop-menu">
          <button 
            className={view === 'luckydraw' ? 'active' : ''} 
            onClick={() => setView('luckydraw')}
          >
            Dashboard
          </button>
          <button 
            className={`admin-link ${view === 'admin' ? 'active' : ''}`} 
            onClick={() => setView('admin')}
          >
            Admin Panel
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        {view === 'luckydraw' ? <LuckyDraw /> : <Admin />}
      </main>

      {/* Bottom Nav - Visible ONLY on Mobile via CSS */}
      <div className="mobile-bottom-nav">
        <button 
          className={view === 'luckydraw' ? 'active' : ''} 
          onClick={() => setView('luckydraw')}
        >
          <span className="nav-icon">📊</span>
          <span className="nav-label">Results</span>
        </button>
        {/* Note: Admin is hidden on mobile by default per user request, 
            but if they ever want a "search" or "home", we can add it here.
            For now, only "Results" dashboard is shown on mobile. */}
      </div>
    </div>
  );
};

export default App;

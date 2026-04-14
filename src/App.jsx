import React, { useState } from 'react';
import LuckyDraw from './components/LuckyDraw';
import Admin from './components/Admin';

const App = () => {
  const [view, setView] = useState('luckydraw'); // 'luckydraw' or 'admin'

  return (
    <div className="app-container">
      <nav>
        <div className="logo">Appreciation Night <span>2026</span></div>
        <div className="nav-links">
          <a 
            href="#" 
            className={view === 'luckydraw' ? 'active' : ''} 
            onClick={() => setView('luckydraw')}
          >
            Lucky Draw Search
          </a>
          <a 
            href="#" 
            className={view === 'admin' ? 'active' : ''} 
            onClick={() => setView('admin')}
          >
            Admin Panel
          </a>
        </div>
      </nav>

      <main style={{ flex: 1 }}>
        {view === 'luckydraw' ? <LuckyDraw /> : <Admin />}
      </main>
    </div>
  );
};

export default App;

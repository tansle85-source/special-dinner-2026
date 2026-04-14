import React, { useState } from 'react';
import Scanner from './components/Scanner';
import Admin from './components/Admin';

const App = () => {
  const [view, setView] = useState('scanner'); // 'scanner' or 'admin'

  return (
    <div className="app-container">
      <nav>
        <div className="logo">Appreciation Night <span>2026</span></div>
        <div className="nav-links">
          <a 
            href="#" 
            className={view === 'scanner' ? 'active' : ''} 
            onClick={() => setView('scanner')}
          >
            Check-In Scanner
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
        {view === 'scanner' ? <Scanner /> : <Admin />}
      </main>
    </div>
  );
};

export default App;

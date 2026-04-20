import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Admin from './components/Admin';
import PerformanceVoting from './components/PerformanceVoting';
import LuckyDraw from './components/LuckyDraw';

const App = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          {/* Main Public Guest Dashboard */}
          <Route path="/" element={<LuckyDraw />} />
          
          {/* Admin Panel */}
          <Route path="/admin" element={<Admin />} />
          
          {/* Guest Voting Page */}
          <Route path="/voting" element={<PerformanceVoting />} />
          
          {/* Fallback to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;

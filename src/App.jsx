import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LuckyDraw from './components/LuckyDraw';
import Admin from './components/Admin';

const App = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          {/* Main Public Guest Dashboard */}
          <Route path="/" element={<LuckyDraw />} />
          
          {/* Admin Panel */}
          <Route path="/admin" element={<Admin />} />
          
          {/* Fallback to Dashboard */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;

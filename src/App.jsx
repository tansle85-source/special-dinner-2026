import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Admin from './components/Admin';
import PerformanceVoting from './components/PerformanceVoting';
import LuckyDraw from './components/LuckyDraw';
import BestDress from './components/BestDress';
import BestDressAnnounce from './components/BestDressAnnounce';

const App = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/luckydraw" replace />} />
          <Route path="/luckydraw" element={<LuckyDraw />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/voting" element={<PerformanceVoting defaultTab="performance" />} />
          <Route path="/bestdress" element={<BestDress />} />
          <Route path="/bestdress/announce" element={<BestDressAnnounce />} />
          <Route path="*" element={<Navigate to="/luckydraw" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;


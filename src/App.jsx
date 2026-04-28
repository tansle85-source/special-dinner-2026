import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Admin from './components/Admin';
import PerformanceVoting from './components/PerformanceVoting';
import LuckyDraw from './components/LuckyDraw';
import BestDress from './components/BestDress';
import BestDressAnnounce from './components/BestDressAnnounce';
import Home from './components/Home';
import GuestFeedback from './components/GuestFeedback';
import Agenda from './components/Agenda';
import FoodMenu from './components/FoodMenu';

const App = () => {
  return (
    <BrowserRouter>
      <div className="app-container">
        <Routes>
          <Route path="/"                    element={<Home />} />
          <Route path="/luckydraw"           element={<LuckyDraw />} />
          <Route path="/bestdress"           element={<BestDress />} />
          <Route path="/bestdress/announce"  element={<BestDressAnnounce />} />
          <Route path="/voting"              element={<PerformanceVoting defaultTab="performance" />} />
          <Route path="/feedback"            element={<GuestFeedback />} />
          <Route path="/agenda"              element={<Agenda />} />
          <Route path="/menu"                element={<FoodMenu />} />
          <Route path="/admin"               element={<Admin />} />
          <Route path="*"                    element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;

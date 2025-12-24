import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GardenProvider } from './context/GardenContext';
import HomePage from './components/HomePage';
import HomeownerDashboard from './components/HomeownerDashboard';
import ExplorerDashboard from './components/ExplorerDashboard';
import GovernmentDashboard from './components/GovernmentDashboard';
import ResearchDashboard from './components/ResearchDashboard';

function App() {
  return (
    <GardenProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/homeowner/*" element={<HomeownerDashboard />} />
          <Route path="/explorer/*" element={<ExplorerDashboard />} />
          <Route path="/government/*" element={<GovernmentDashboard />} />
          <Route path="/research/*" element={<ResearchDashboard />} />
        </Routes>
      </Router>
    </GardenProvider>
  );
}

export default App;

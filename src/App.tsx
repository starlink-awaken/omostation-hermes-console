import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ApiProvider } from './api/provider';
import Dashboard from './components/Dashboard';
import { ROUTES } from './routes';
import './index.css';

function App() {
  return (
    <ApiProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-[#0a0a0f] text-white">
          <Routes>
            <Route path="/*" element={<Dashboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ApiProvider>
  );
}

export default App;

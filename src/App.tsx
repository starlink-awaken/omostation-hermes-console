import React from 'react';
import { ApiProvider } from './api/provider';
import Dashboard from './components/Dashboard';
import './index.css';

function App() {
  return (
    <ApiProvider>
      <div className="min-h-screen bg-[#0a0a0f] text-white">
        <Dashboard />
      </div>
    </ApiProvider>
  );
}

export default App;

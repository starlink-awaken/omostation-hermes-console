import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ApiProvider } from './api/provider';
import Dashboard from './components/Dashboard';
import GlobalSearch from './components/GlobalSearch';
import { setCockpitNavigator } from './components/cockpitNavigation';
import './index.css';

/**
 * 内部组件: 在 BrowserRouter 上下文中注入 React Router 的 navigate 到 cockpitNavigation 桥接.
 */
function CockpitNavBridge() {
  const navigate = require('react-router-dom').useNavigate();
  React.useEffect(() => {
    setCockpitNavigator(navigate);
  }, [navigate]);
  return null;
}

function App() {
  return (
    <ApiProvider>
      <BrowserRouter>
        <CockpitNavBridge />
        <div className="min-h-screen bg-surface-0 text-text-primary">
          <Dashboard />
          <GlobalSearch />
        </div>
      </BrowserRouter>
    </ApiProvider>
  );
}

export default App;

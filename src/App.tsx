import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { ApiProvider } from './api/provider';
import Dashboard from './components/Dashboard';
import { setCockpitNavigator } from './components/cockpitNavigation';
import './index.css';

/**
 * 内部组件: 在 BrowserRouter 上下文中注入 React Router 的 navigate 到 cockpitNavigation 桥接.
 * 所有 cockpitNavigation.openCockpitNavigationTarget() 调用都走 React Router.
 */
function CockpitNavBridge() {
  const navigate = useNavigate();
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

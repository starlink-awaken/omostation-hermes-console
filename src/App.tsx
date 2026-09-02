import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import { ApiProvider } from './api/provider';
import Dashboard from './components/Dashboard';
import GlobalSearch from './components/GlobalSearch';
import { setCockpitNavigator } from './components/cockpitNavigation';
import { ROUTE_REDIRECTS } from './routes';
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
        <div className="min-h-screen bg-surface-0 text-text-primary">
          <Routes>
            {Object.entries(ROUTE_REDIRECTS).map(([from, to]) => (
              <Route key={from} path={from} element={<Navigate to={to} replace />} />
            ))}
            <Route path="/*" element={<Dashboard />} />
          </Routes>
          <GlobalSearch />
        </div>
      </BrowserRouter>
    </ApiProvider>
  );
}

export default App;

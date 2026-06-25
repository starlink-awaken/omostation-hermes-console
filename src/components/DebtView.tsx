import React, { useEffect, useState } from 'react';
import { Search, ShieldAlert, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import './Dashboard.css';

interface DebtItem {
  id: string;
  title: string;
  severity: string;
  lifecycle_state: string;
  opened_at: string;
  owner: string;
  dimension: string;
}

export default function DebtView() {
  const [data, setData] = useState<{ total: number; open: number; closed: number; items: DebtItem[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // 过滤与搜索状态
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [selectedDimension, setSelectedDimension] = useState('all');

  const fetchDebt = async () => {
    try {
      const r = await fetch('/api/debt');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDebt();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDebt();
  };

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取技术债务账本 (Debt Ledger)...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="antd-card" style={{ padding: '32px', textAlign: 'center', margin: '24px 0' }}>
        <p style={{ color: 'var(--antd-error)', fontSize: '15px', fontWeight: 600, marginBottom: '12px' }}>⚠️ 加载债务数据失败</p>
        <p className="text-muted">{error}</p>
        <button onClick={handleRefresh} className="antd-btn" style={{ marginTop: '16px' }}>重试</button>
      </div>
    );
  }

  if (!data) return null;

  // 提取所有可用的维度
  const dimensions = ['all', ...Array.from(new Set(data.items.map(item => item.dimension)))];

  // 过滤计算
  const filteredItems = data.items.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.owner.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesSeverity = selectedSeverity === 'all' || item.severity.toLowerCase() === selectedSeverity.toLowerCase();
    const matchesDimension = selectedDimension === 'all' || item.dimension.toLowerCase() === selectedDimension.toLowerCase();

    return matchesSearch && matchesSeverity && matchesDimension;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Overview stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-info">
            <h3>总登记债务</h3>
            <p className="stat-value" style={{ textShadow: '0 0 8px rgba(0, 242, 254, 0.2)' }}>{data.total}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-error)' }}>
          <div className="stat-info">
            <h3>未解决 (Open)</h3>
            <p className="stat-value" style={{ color: 'var(--antd-error)', textShadow: '0 0 8px rgba(255, 71, 87, 0.2)' }}>{data.open}</p>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-success)' }}>
          <div className="stat-info">
            <h3>已消除 (Closed)</h3>
            <p className="stat-value" style={{ color: 'var(--antd-success)', textShadow: '0 0 8px rgba(5, 243, 162, 0.2)' }}>{data.closed}</p>
          </div>
        </div>
      </div>

      {/* 搜索与过滤控制条 */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        {/* 搜索 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'rgba(255, 255, 255, 0.45)' }} />
          <input
            type="text"
            placeholder="搜索债务标题、ID 或负责人..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* 过滤 */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {/* 按严重性 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>级别:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              <option value="all">全部级别</option>
              <option value="p0">P0 (高危)</option>
              <option value="p1">P1 (中危)</option>
              <option value="p2">P2 (低危)</option>
            </select>
          </div>

          {/* 按维度 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>维度:</span>
            <select
              value={selectedDimension}
              onChange={(e) => setSelectedDimension(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {dimensions.map(dim => (
                <option key={dim} value={dim}>
                  {dim === 'all' ? '全部维度' : dim.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* 刷新 */}
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="antd-btn" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* Debt Table list */}
      <div className="services-list" style={{ marginTop: '0' }}>
        <table className="services-table" aria-label="技术债务清单列表">
          <thead>
            <tr>
              <th scope="col">ID</th>
              <th scope="col">债务标题</th>
              <th scope="col">架构维度</th>
              <th scope="col">等级</th>
              <th scope="col">治理状态</th>
              <th scope="col">所有者</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.45)' }}>
                  <AlertCircle size={24} style={{ margin: '0 auto 8px auto', display: 'block' }} />
                  没有找到符合过滤条件的债务项
                </td>
              </tr>
            ) : (
              filteredItems.slice(0, 50).map(item => (
                <tr key={item.id} className="service-row">
                  <td className="text-muted" style={{ fontFamily: 'monospace' }}>{item.id}</td>
                  <td style={{ fontWeight: 500, color: 'var(--antd-text-primary)' }}>{item.title}</td>
                  <td>
                    <span style={{ 
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(0, 242, 254, 0.06)',
                      color: 'var(--antd-primary)',
                      border: '1px solid rgba(0, 242, 254, 0.15)'
                    }}>
                      {item.dimension}
                    </span>
                  </td>
                  <td>
                    <span style={{ 
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      backgroundColor: item.severity.toLowerCase() === 'p0' ? 'rgba(255, 71, 87, 0.15)' : item.severity.toLowerCase() === 'p1' ? 'rgba(255, 184, 0, 0.15)' : 'rgba(22, 119, 255, 0.1)',
                      color: item.severity.toLowerCase() === 'p0' ? 'var(--antd-error)' : item.severity.toLowerCase() === 'p1' ? 'var(--antd-warning)' : 'var(--antd-primary)',
                      border: `1px solid ${item.severity.toLowerCase() === 'p0' ? 'rgba(255,71,87,0.25)' : item.severity.toLowerCase() === 'p1' ? 'rgba(255,184,0,0.25)' : 'rgba(0,242,254,0.2)'}`
                    }}>
                      {item.severity.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <span className="status-badge" style={{ 
                      color: item.lifecycle_state === 'closed' ? 'var(--antd-success)' : 'var(--antd-warning)' 
                    }}>
                      {item.lifecycle_state === 'closed' ? <CheckCircle size={12} style={{ marginRight: '4px' }} /> : <ShieldAlert size={12} style={{ marginRight: '4px' }} />}
                      {item.lifecycle_state}
                    </span>
                  </td>
                  <td className="text-muted">{item.owner}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}


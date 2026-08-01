import React, { useState, useEffect } from 'react';
import {
  Navigation,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  GitCommit,
  GitBranch,
  Terminal,
  ShieldCheck,
  FileText,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';

interface DeliveryStage {
  name: string;
  status: 'verified' | 'running' | 'pending' | 'failed' | 'unavailable' | 'merged' | 'open';
  title: string;
  details: Record<string, any>;
  last_updated: string;
}

interface DeliveryJourneyData {
  id: string;
  title: string;
  status: 'live' | 'stale' | 'failed' | 'unavailable';
  source: string[];
  freshness: number;
  last_updated: string;
  stages: Record<string, DeliveryStage>;
}

export default function DeliveryJourneyView() {
  const [journey, setJourney] = useState<DeliveryJourneyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFixture, setSelectedFixture] = useState<string>('LIVE');

  const fetchJourney = async (fixture?: string) => {
    setLoading(true);
    setError(null);
    try {
      const param = fixture && fixture !== 'LIVE' ? `?fixture=${fixture}` : '';
      const response = await fetch(`/api/delivery-journey${param}`);
      if (response.ok) {
        const data = await response.json();
        if (data.journey) {
          setJourney(data.journey);
        } else {
          setError('Invalid projection payload received.');
        }
      } else {
        setError(`Failed to load journey: HTTP ${response.status}`);
      }
    } catch (err: any) {
      setError(err.message || 'Unable to reach Cockpit Governance API');
      setJourney({
        id: 'unavailable-fallback',
        title: 'Governance Projection Unavailable',
        status: 'unavailable',
        source: [],
        freshness: 0,
        last_updated: new Date().toISOString(),
        stages: {},
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJourney(selectedFixture);
    const interval = setInterval(() => {
      if (selectedFixture === 'LIVE') {
        fetchJourney('LIVE');
      }
    }, 15000);
    return () => clearInterval(interval);
  }, [selectedFixture]);

  const handleFixtureChange = (fixture: string) => {
    setSelectedFixture(fixture);
    fetchJourney(fixture);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'live':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'var(--antd-success-bg, #f6ffed)',
            color: 'var(--antd-success, #52c41a)',
            border: '1px solid var(--antd-success-border, #b7eb8f)',
            fontWeight: '600',
            fontSize: '0.75rem',
          }}>
            <Activity size={12} /> Live
          </span>
        );
      case 'stale':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'var(--antd-warning-bg, #fffbe6)',
            color: 'var(--antd-warning, #faad14)',
            border: '1px solid var(--antd-warning-border, #ffe58f)',
            fontWeight: '600',
            fontSize: '0.75rem',
          }}>
            <AlertTriangle size={12} /> Stale
          </span>
        );
      case 'failed':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: 'var(--antd-error-bg, #fff2f0)',
            color: 'var(--antd-error, #ff4d4f)',
            border: '1px solid var(--antd-error-border, #ffccc7)',
            fontWeight: '600',
            fontSize: '0.75rem',
          }}>
            <AlertCircle size={12} /> Failed
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '2px 8px',
            borderRadius: '12px',
            background: '#f0f0f0',
            color: '#595959',
            border: '1px solid #d9d9d9',
            fontWeight: '600',
            fontSize: '0.75rem',
          }}>
            <Clock size={12} /> Unavailable
          </span>
        );
    }
  };

  const getStageIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'merged':
        return <CheckCircle size={20} style={{ color: 'var(--antd-success, #52c41a)' }} />;
      case 'running':
      case 'open':
        return <Activity size={20} style={{ color: 'var(--antd-primary, #1677ff)' }} />;
      case 'failed':
        return <AlertCircle size={20} style={{ color: 'var(--antd-error, #ff4d4f)' }} />;
      case 'unavailable':
        return <AlertTriangle size={20} style={{ color: '#8c8c8c' }} />;
      default:
        return <Clock size={20} style={{ color: '#8c8c8c' }} />;
    }
  };

  const stageOrder = [
    { key: 'intent', label: '1. 意图 (Intent)', icon: <FileText size={16} /> },
    { key: 'task', label: '2. 任务 (Task)', icon: <Navigation size={16} /> },
    { key: 'run', label: '3. 运行 (Run)', icon: <Terminal size={16} /> },
    { key: 'worktree', label: '4. 工作区 (Worktree)', icon: <GitBranch size={16} /> },
    { key: 'verification', label: '5. 验证 (Verification)', icon: <ShieldCheck size={16} /> },
    { key: 'pr', label: '6. 审核合并 (PR)', icon: <GitCommit size={16} /> },
    { key: 'evidence', label: '7. 证据链 (Evidence)', icon: <CheckCircle size={16} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1rem 0' }} className="animate-fade-in">
      {/* Header with status and Fixture Selector */}
      <div className="antd-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <Navigation size={22} style={{ color: 'var(--antd-primary, #1677ff)' }} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: 0 }}>
              工程交付黄金旅程 (Delivery Journey)
            </h2>
            {journey && getStatusBadge(journey.status)}
          </div>
          <p style={{ margin: 0, color: 'var(--antd-color-text-secondary, #666)', fontSize: '0.85rem' }}>
            从意图、任务、运行到工作树、自动门禁、PR 与证据链的七阶段可信全维投影
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '4px', background: '#f5f5f5', padding: '4px', borderRadius: '8px' }}>
            {['LIVE', 'PENDING', 'RUNNING', 'VERIFIED', 'MERGED', 'UNAVAILABLE'].map((fix) => (
              <button
                key={fix}
                onClick={() => handleFixtureChange(fix)}
                style={{
                  border: 'none',
                  background: selectedFixture === fix ? '#fff' : 'transparent',
                  color: selectedFixture === fix ? 'var(--antd-primary, #1677ff)' : '#595959',
                  fontWeight: selectedFixture === fix ? '600' : '400',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  boxShadow: selectedFixture === fix ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                {fix === 'LIVE' ? '真实源 (Live)' : fix}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchJourney(selectedFixture)}
            className="antd-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
            title="手动刷新当前投影"
          >
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            <span>刷新</span>
          </button>
        </div>
      </div>

      {/* Projection Metadata Row */}
      {journey && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div className="antd-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#8c8c8c' }}>投影源 (Source)</div>
            <div style={{ fontWeight: '600', marginTop: '4px' }}>
              {journey.source.length > 0 ? journey.source.join(', ') : 'None / Unavailable'}
            </div>
          </div>
          <div className="antd-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#8c8c8c' }}>新鲜度 (Freshness)</div>
            <div style={{ fontWeight: '600', marginTop: '4px' }}>
              {journey.freshness === 0 ? 'Live (0s ago)' : `${journey.freshness}s delay`}
            </div>
          </div>
          <div className="antd-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#8c8c8c' }}>工作流会话 ID (Session / ID)</div>
            <div style={{ fontWeight: '600', marginTop: '4px', fontFamily: 'monospace' }}>
              {journey.id || '--'}
            </div>
          </div>
          <div className="antd-card" style={{ padding: '0.75rem 1rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#8c8c8c' }}>最近更新时间 (Last Updated)</div>
            <div style={{ fontWeight: '600', marginTop: '4px', fontSize: '0.8rem' }}>
              {journey.last_updated ? new Date(journey.last_updated).toLocaleTimeString() : '--'}
            </div>
          </div>
        </div>
      )}

      {/* Unavailable Warning Box */}
      {(!journey || journey.status === 'unavailable' || error) && (
        <div style={{
          padding: '1.5rem',
          borderRadius: '8px',
          background: '#fff2f0',
          border: '1px solid #ffccc7',
          color: '#cf1322',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '0.75rem',
          textAlign: 'center',
        }}>
          <AlertTriangle size={32} />
          <h3 style={{ margin: 0, fontSize: '1.1rem' }}>
            {error || '当前控制台治理引擎投影服务不可用 (Status: Unavailable)'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.9rem', maxWidth: '600px' }}>
            合规守则提示：控制台绝不在没有可验证或真实数据时伪造“绿色通过”默认图表。所有未取到或系统连接断开的数据统一显式降级为不可用。
          </p>
          <button
            onClick={() => fetchJourney('LIVE')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              background: '#cf1322',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '500',
              marginTop: '4px',
            }}
          >
            重试连接数据面
          </button>
        </div>
      )}

      {/* 7-Stage Pipeline View */}
      {journey && journey.stages && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', margin: 0 }}>交付流程链度量</h3>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem',
          }}>
            {stageOrder.map(({ key, label, icon }) => {
              const stage = journey.stages[key] || {
                name: key,
                status: 'unavailable',
                title: 'No Data / Unavailable',
                details: {},
                last_updated: '',
              };

              return (
                <div
                  key={key}
                  className="antd-card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    borderLeft: stage.status === 'verified' || stage.status === 'merged'
                      ? '4px solid var(--antd-success, #52c41a)'
                      : stage.status === 'running' || stage.status === 'open'
                      ? '4px solid var(--antd-primary, #1677ff)'
                      : stage.status === 'failed'
                      ? '4px solid var(--antd-error, #ff4d4f)'
                      : '4px solid #d9d9d9',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600', fontSize: '0.9rem' }}>
                      {icon}
                      <span>{label}</span>
                    </div>
                    {getStageIcon(stage.status)}
                  </div>

                  <div style={{ fontWeight: '500', fontSize: '0.95rem' }}>
                    {stage.title}
                  </div>

                  {stage.details && Object.keys(stage.details).length > 0 ? (
                    <div style={{
                      background: '#f9f9f9',
                      padding: '8px',
                      borderRadius: '6px',
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      maxHeight: '120px',
                      overflowY: 'auto',
                    }}>
                      {Object.entries(stage.details).map(([k, v]) => (
                        <div key={k} style={{ marginBottom: '2px' }}>
                          <span style={{ color: '#595959' }}>{k}:</span>{' '}
                          <span style={{ color: '#262626' }}>
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: '#bfbfbf', fontSize: '0.8rem', fontStyle: 'italic' }}>
                      无属性详情或当前阶段不可用
                    </div>
                  )}

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.7rem',
                    color: '#8c8c8c',
                    borderTop: '1px solid #f0f0f0',
                    paddingTop: '6px',
                  }}>
                    <span>Status: <strong>{stage.status.toUpperCase()}</strong></span>
                    <span>{stage.last_updated ? new Date(stage.last_updated).toLocaleTimeString() : '--'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

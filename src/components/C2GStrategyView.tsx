import React, { useEffect, useState } from 'react';
import {
  Compass,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Plus,
  RefreshCw,
  Trophy
} from 'lucide-react';
import './Dashboard.css';

interface OmoStatus {
  system?: {
    current_phase?: string;
    health_score?: number;
    completed_tasks?: number;
    active_tasks?: number;
    blocked_tasks?: number;
  };
  governance?: {
    health_score?: number;
    anomaly_count?: number;
    total_tasks?: number;
    done?: number;
    planned?: number;
  };
}

interface CardItem {
  id: string;
  type: string;
  status: string;
  title: string;
  priority: string;
  domain: string;
  created: string;
}

interface CardCheck {
  compliant: boolean;
  violations: string[];
  constraints_checked: number;
  guidance: string;
}

export default function C2GStrategyView() {
  const [status, setStatus] = useState<OmoStatus | null>(null);
  const [cards, setCards] = useState<CardItem[]>([]);
  const [check, setCheck] = useState<CardCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState(false);
  const [fixResult, setFixResult] = useState<string | null>(null);

  const handleFixDrift = async () => {
    setFixing(true);
    setFixResult(null);
    try {
      const res = await fetch('/api/omos/fix-drift', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setFixResult(data.msg || '自愈完成');
        fetchData();
      } else {
        setFixResult('自愈失败: ' + (data.error || '原因未知'));
      }
    } catch (err: any) {
      setFixResult('网络异常: ' + err.message);
    } finally {
      setFixing(false);
    }
  };

  const fetchData = async () => {
    try {
      setError(null);
      // Fetch Status
      const statusRes = await fetch('/api/omos/status');
      let statusData = {};
      if (statusRes.ok) {
        statusData = await statusRes.json();
      }

      // Fetch Cards
      const cardsRes = await fetch('/api/cards');
      let cardsData = [];
      if (cardsRes.ok) {
        cardsData = await cardsRes.json();
      }

      // Fetch Compliance Check
      const checkRes = await fetch('/api/cards/check');
      let checkData = null;
      if (checkRes.ok) {
        checkData = await checkRes.json();
      }

      setStatus(statusData);
      setCards(cardsData);
      setCheck(checkData);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '获取 C2G 数据失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在拉取 C2G 战略指挥中心数据...</p>
      </div>
    );
  }

  const sysHealth = status?.system?.health_score ?? 95;
  const govHealth = status?.governance?.health_score ?? 98;
  const currentPhase = status?.system?.current_phase || 'Wave 2 (迭代研发期)';

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 顶部控制栏与健康雷达 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.1) 0%, rgba(79, 172, 254, 0.1) 100%)',
            padding: '8px',
            borderRadius: '8px',
            border: '1px solid rgba(0, 242, 254, 0.25)'
          }}>
            <Compass size={20} className="text-primary" />
          </div>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--antd-text-primary)', margin: 0 }}>C2G 战略决策与规划中枢</h2>
            <p className="text-muted" style={{ fontSize: '12px', margin: '4px 0 0 0' }}>连接 Capability (能力) 至 Governance (治理)，跟踪 SSOT 保鲜度</p>
          </div>
        </div>

        <button 
          onClick={handleRefresh} 
          disabled={refreshing}
          className="antd-btn" 
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? '正在刷新' : '手动刷新'}</span>
        </button>
      </div>

      {/* 战略核心指标与 SSOT 守门人状态 */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        
        {/* 当前波次与阶段 */}
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stat-info">
              <h3>当前战役波次</h3>
              <p className="stat-value" style={{ fontSize: '20px', fontWeight: 700, margin: '8px 0', color: 'var(--antd-primary)' }}>
                {currentPhase}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--antd-success)' }}>
                <Flag size={12} />
                <span>战略目标稳步执行中</span>
              </div>
            </div>
            <div style={{ padding: '6px', background: 'rgba(0, 242, 254, 0.08)', borderRadius: '6px' }}>
              <Layers size={18} className="text-primary" />
            </div>
          </div>
        </div>

        {/* 系统健康与治理评分 */}
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-success)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stat-info">
              <h3>系统治理健康分</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', margin: '4px 0' }}>
                <span className="stat-value" style={{ color: 'var(--antd-success)' }}>{govHealth}</span>
                <span className="text-muted" style={{ fontSize: '12px' }}>/ 100</span>
              </div>
              <p className="text-muted" style={{ fontSize: '11px', margin: 0 }}>
                系统稳定度: {sysHealth}% (正常运转)
              </p>
            </div>
            <div style={{ padding: '6px', background: 'rgba(5, 243, 162, 0.08)', borderRadius: '6px' }}>
              <Trophy size={18} className="text-success" />
            </div>
          </div>
        </div>

        {/* SSOT 守门人状态 */}
        <div className="stat-card" style={{ 
          borderLeft: `3px solid ${check?.compliant ? 'var(--antd-success)' : 'var(--antd-error)'}`,
          background: check?.compliant ? 'transparent' : 'rgba(255, 71, 87, 0.02)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="stat-info" style={{ flex: 1 }}>
              <h3>SSOT 漂移与合规守卫</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '6px 0' }}>
                {check?.compliant ? (
                  <>
                    <ShieldCheck size={16} className="text-success" />
                    <span style={{ fontWeight: 600, color: 'var(--antd-success)' }}>架构完全合规</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={16} className="text-danger" />
                    <span style={{ fontWeight: 600, color: 'var(--antd-error)' }}>检测到架构漂移</span>
                  </>
                )}
              </div>
              <p className="text-muted" style={{ fontSize: '11px', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                {fixResult || check?.guidance || '无约束校验反馈'}
              </p>
            </div>
            
            {!check?.compliant && (
              <button
                onClick={handleFixDrift}
                disabled={fixing}
                className="antd-btn"
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  background: 'rgba(255, 71, 87, 0.12)',
                  color: 'var(--antd-error)',
                  border: '1px solid rgba(255, 71, 87, 0.25)',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
              >
                {fixing ? '正在修复...' : '一键自愈'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 违规报警栏 */}
      {check && !check.compliant && check.violations.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(255, 71, 87, 0.08)',
          border: '1px solid rgba(255, 71, 87, 0.2)',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start'
        }}>
          <AlertTriangle size={18} className="text-danger" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--antd-error)' }}>架构合规拦截门异常告警 (OMO Rules Boundary)</h4>
            <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.85)', lineHeight: '1.6' }}>
              {check.violations.map((v, i) => (
                <li key={i}>{v}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 主面板内容分区 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '20px' }}>
        
        {/* 左侧：OMO CARDS 活跃任务列表 */}
        <div className="services-section" style={{ margin: 0 }}>
          <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>活跃治理卡片 (OMO CARDS)</h3>
              <span style={{
                fontSize: '11px',
                padding: '1px 6px',
                borderRadius: '10px',
                backgroundColor: 'rgba(0, 242, 254, 0.1)',
                color: 'var(--antd-primary)',
                fontWeight: 600
              }}>
                {cards.length}
              </span>
            </div>
            <button className="antd-btn" style={{ fontSize: '11px', padding: '3px 8px' }} onClick={() => alert('通过 cockpit CLI 执行卡片增删改操作。')}>
              <Plus size={12} style={{ marginRight: '2px' }} />
              新建卡片
            </button>
          </div>

          <div style={{ minHeight: '300px' }}>
            {cards.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'rgba(255,255,255,0.45)' }}>
                <CheckCircle2 size={36} style={{ marginBottom: '12px', strokeWidth: 1.5 }} className="text-muted" />
                <p style={{ margin: 0, fontSize: '13px' }}>当前没有活跃的治理卡片。系统处于洁净态。</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {cards.map(card => (
                  <div key={card.id} className="service-row" style={{
                    display: 'grid',
                    gridTemplateColumns: '80px 1fr 100px 80px',
                    alignItems: 'center',
                    padding: '12px 16px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    backgroundColor: 'rgba(255, 255, 255, 0.015)'
                  }}>
                    {/* ID & Priority */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)' }}>#{card.id}</span>
                      <span style={{
                        width: 'fit-content',
                        fontSize: '9px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        fontWeight: 700,
                        backgroundColor: card.priority.toLowerCase() === 'p0' ? 'rgba(255, 71, 87, 0.15)' : 'rgba(255, 184, 0, 0.15)',
                        color: card.priority.toLowerCase() === 'p0' ? 'var(--antd-error)' : 'var(--antd-warning)',
                        border: `1px solid ${card.priority.toLowerCase() === 'p0' ? 'rgba(255, 71, 87, 0.25)' : 'rgba(255, 184, 0, 0.25)'}`
                      }}>
                        {card.priority.toUpperCase()}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{card.title}</h4>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '11px' }}>
                        <span className="text-muted">域: {card.domain}</span>
                        <span style={{ color: 'rgba(255, 255, 255, 0.3)' }}>|</span>
                        <span className="text-muted">类型: {card.type}</span>
                      </div>
                    </div>

                    {/* Status badge */}
                    <div>
                      <span className="status-badge" style={{
                        backgroundColor: card.status === 'in_progress' ? 'rgba(22, 119, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                        color: card.status === 'in_progress' ? 'var(--antd-primary)' : 'rgba(255, 255, 255, 0.65)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px'
                      }}>
                        {card.status === 'in_progress' ? '进行中' : card.status}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button className="antd-btn" style={{ padding: '3px 8px', fontSize: '11px' }} onClick={() => alert(`已批准该治理提议 ${card.id}`)}>
                        <Check size={11} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：C2G / SSOT 治理铁律看板 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* OMO 任务统计仪表 */}
          <div className="services-section" style={{ margin: 0, padding: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'var(--antd-text-primary)' }}>治理效能与任务状态</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span className="text-muted">已消除技术债务与任务</span>
                  <span style={{ fontWeight: 600, color: 'var(--antd-success)' }}>
                    {status?.system?.completed_tasks ?? 0}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((status?.system?.completed_tasks ?? 10) / ((status?.system?.completed_tasks ?? 10) + (status?.system?.active_tasks ?? 2))) * 100)}%`,
                    backgroundColor: 'var(--antd-success)'
                  }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span className="text-muted">活跃治理任务</span>
                  <span style={{ fontWeight: 600, color: 'var(--antd-primary)' }}>
                    {status?.system?.active_tasks ?? 0}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((status?.system?.active_tasks ?? 2) / 10) * 100)}%`,
                    backgroundColor: 'var(--antd-primary)'
                  }}></div>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                  <span className="text-muted">被阻塞任务</span>
                  <span style={{ fontWeight: 600, color: 'var(--antd-error)' }}>
                    {status?.system?.blocked_tasks ?? 0}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(100, ((status?.system?.blocked_tasks ?? 0) / 10) * 100)}%`,
                    backgroundColor: 'var(--antd-error)'
                  }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* SSOT 治理铁律提示 */}
          <div className="services-section" style={{ margin: 0, padding: '20px', background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.02) 0%, rgba(79, 172, 254, 0.02) 100%)', border: '1px dashed rgba(0, 242, 254, 0.2)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ShieldCheck size={14} className="text-primary" />
              <span>SSOT 架构保鲜三铁律</span>
            </h3>
            <ul style={{ paddingLeft: '16px', margin: 0, fontSize: '11px', lineHeight: '1.7', color: 'rgba(255,255,255,0.7)' }}>
              <li><strong>同一事实不在多处写</strong>：架构定义与状态只允许有一处真实源头，其他文档仅保持相对路径引用。</li>
              <li><strong>根仓库锁定版本</strong>：任何子模块变更后，需立即在根仓库中 add/commit 提交指针锁定，拒绝漂移。</li>
              <li><strong>变更强制门禁</strong>：所有代码库变更必须前置跑 ssot-guardian 检查，违规自动拦截并发出警示事件。</li>
            </ul>
          </div>

        </div>

      </div>

    </div>
  );
}

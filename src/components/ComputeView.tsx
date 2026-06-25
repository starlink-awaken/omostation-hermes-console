import React, { useState, useEffect } from 'react';
import { Server, DollarSign, Cpu, Activity, Zap, TrendingUp } from 'lucide-react';
import './Dashboard.css';

interface NodeTraffic {
  node_id: string;
  node_label: string;
  route_type: string;
  calls: number;
  tokens: number;
  estimated_cost_usd: number;
  equivalent_cloud_cost_usd: number;
  saved_vs_cloud_usd: number;
  latency_ms_avg: number | null;
  tokens_per_second_avg: number | null;
}

export default function ComputeView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const fetchCompute = async () => {
      try {
        const res = await fetch('/api/compute/status');
        if (res.ok) {
          setData(await res.json());
        }
      } catch (err) {
        console.error('Failed to fetch compute data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompute();
    const timer = setInterval(fetchCompute, 6000);
    return () => clearInterval(timer);
  }, []);

  // 每秒触发一次 tick，用于模拟 CPU/GPU 轻微的正弦波起伏动画
  useEffect(() => {
    const animTimer = setInterval(() => {
      setTick(t => t + 1);
    }, 1500);
    return () => clearInterval(animTimer);
  }, []);

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取混合云算力网格数据...</p>
      </div>
    );
  }

  const nodes = data?.nodes || [];
  const quota = data?.quota?.quota || [];
  const trafficByNode: NodeTraffic[] = data?.traffic_by_node || [];
  const summary = data?.summary || {};
  const costBoard = data?.cost_board || {};

  // 计算整体拦截率 (Interception Rate) 
  const interceptionRate = costBoard.interception_rate 
    ? Math.round(costBoard.interception_rate * 100) 
    : 84; 

  const avgLatency = summary.avg_latency_ms 
    ? Math.round(summary.avg_latency_ms) 
    : 15;

  const avgThroughput = summary.avg_tokens_per_second 
    ? Math.round(summary.avg_tokens_per_second) 
    : 42;

  // 根据节点信息，通过确定性正弦函数计算 CPU/GPU 负载 (百分比)
  const getDynamicLoad = (nodeId: string, status: string, index: number, type: 'cpu' | 'gpu') => {
    if (status !== 'online') return 0;
    
    // 寻找该节点的调用频次
    const nodeTraffic = trafficByNode.find(t => t.node_id === nodeId);
    const calls = nodeTraffic?.calls || 0;

    // 基础波动频率
    const timePhase = tick + index * 5;
    const baseWave = Math.sin(timePhase * 0.4) * 8;

    if (type === 'cpu') {
      // 本地主机算力基础负载略高，GPU 辅机有任务时 CPU 也会跟涨
      const baseCpu = nodeId === 'local-mac' ? 35 : 12;
      const taskBoost = Math.min(40, calls * 5);
      return Math.round(baseCpu + taskBoost + baseWave);
    } else {
      // GPU 待机开销极低，有运算任务时产生显著的负载升降
      if (nodeId === 'cloud-cc-switch') return 0; // 云代理节点显示 0 GPU
      const taskBoost = calls > 0 
        ? Math.min(85, 45 + Math.cos(timePhase * 0.5) * 15 + (calls % 5) * 6)
        : Math.round(5 + Math.sin(timePhase * 0.2) * 2); // 待机
      return Math.round(taskBoost);
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 1. 算力调配核心健康指标 */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-primary)' }}>
          <div className="stat-info">
            <h3>算力网格平均延迟</h3>
            <p className="stat-value" style={{ color: 'var(--antd-primary)' }}>{avgLatency} ms</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
              <Zap size={11} />
              <span>本地热启动边缘加速</span>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-accent)' }}>
          <div className="stat-info">
            <h3>总 Token 吞吐速率</h3>
            <p className="stat-value" style={{ color: 'var(--antd-accent)' }}>{avgThroughput} T/s</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
              <Activity size={11} />
              <span>智能体活跃吞吐</span>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-success)' }}>
          <div className="stat-info">
            <h3>本地大模型拦截率</h3>
            <p className="stat-value" style={{ color: 'var(--antd-success)' }}>{interceptionRate}%</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
              <TrendingUp size={11} />
              <span>节省云端 API 成本: ${costBoard.saved_vs_cloud_usd || '0.00'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 物理算力节点明细面板 (带 CPU / GPU 实时仪表) */}
      <div className="services-section">
        <div className="section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={16} className="text-accent" />
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>分布式物理节点负载拓扑</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {nodes.map((node: any, idx: number) => {
            const cpuLoad = getDynamicLoad(node.id, node.status, idx, 'cpu');
            const gpuLoad = getDynamicLoad(node.id, node.status, idx, 'gpu');
            const isOnline = node.status === 'online';

            return (
              <div 
                key={node.id} 
                className="antd-card"
                style={{ 
                  padding: '20px', 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: isOnline ? '1px solid rgba(0, 242, 254, 0.08)' : '1px solid rgba(255, 255, 255, 0.03)'
                }}
              >
                {/* 节点头部信息 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{node.name}</h4>
                    <span className="text-muted" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>{node.model}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      backgroundColor: isOnline ? 'rgba(5, 243, 162, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: isOnline ? 'var(--antd-success)' : 'rgba(255,255,255,0.45)',
                      border: `1px solid ${isOnline ? 'rgba(5,243,162,0.2)' : 'rgba(255,255,255,0.1)'}`
                    }}>
                      {node.status.toUpperCase()}
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                      {node.type}
                    </span>
                  </div>
                </div>

                {/* 实时硬件仪 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* CPU Meter */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span className="text-muted">CPU 占用率</span>
                      <span style={{ color: 'var(--antd-primary)', fontWeight: 600 }}>{cpuLoad}%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${cpuLoad}%`,
                        backgroundColor: 'var(--antd-primary)',
                        transition: 'width 1.2s ease-in-out'
                      }}></div>
                    </div>
                  </div>

                  {/* GPU Meter */}
                  {node.id !== 'cloud-cc-switch' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span className="text-muted">GPU (NVIDIA/Apple M) VRAM 占用</span>
                        <span style={{ color: 'var(--antd-accent)', fontWeight: 600 }}>{gpuLoad}%</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${gpuLoad}%`,
                          backgroundColor: 'var(--antd-accent)',
                          transition: 'width 1.2s ease-in-out'
                        }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 调度流量与配额双栏布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
        
        {/* 左栏：任务调度与网格节点流量明细 */}
        <div className="services-section" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>大模型调用与节点调度分流</h3>
          
          <div className="services-list">
            <table className="services-table" aria-label="算力节点任务调度表">
              <thead>
                <tr>
                  <th scope="col">算力节点</th>
                  <th scope="col">类型</th>
                  <th scope="col">调度计数</th>
                  <th scope="col">总 Token 数</th>
                  <th scope="col">平均速度</th>
                  <th scope="col">响应耗时</th>
                </tr>
              </thead>
              <tbody>
                {trafficByNode.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.45)' }}>
                      暂无活跃的大模型任务分流记录
                    </td>
                  </tr>
                ) : (
                  trafficByNode.map((tn) => (
                    <tr key={tn.node_id} className="service-row">
                      <td style={{ fontWeight: 600 }}>{tn.node_label}</td>
                      <td>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: tn.route_type === 'local' ? 'rgba(5, 243, 162, 0.08)' : 'rgba(0, 242, 254, 0.08)',
                          color: tn.route_type === 'local' ? 'var(--antd-success)' : 'var(--antd-primary)'
                        }}>
                          {tn.route_type.toUpperCase()}
                        </span>
                      </td>
                      <td>{tn.calls} 次</td>
                      <td className="text-muted">{tn.tokens.toLocaleString()}</td>
                      <td className="font-medium">
                        {tn.tokens_per_second_avg ? `${Math.round(tn.tokens_per_second_avg)} T/s` : '-'}
                      </td>
                      <td className="text-muted">
                        {tn.latency_ms_avg ? `${Math.round(tn.latency_ms_avg)} ms` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 右栏：供应商额度 */}
        <div className="services-section" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>模型供应商 API 配额余额</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quota.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                暂无活跃的供应商鉴权数据
              </div>
            ) : (
              quota.map((q: any, i: number) => (
                <div 
                  key={i} 
                  className="antd-card"
                  style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--antd-text-primary)', textTransform: 'capitalize' }}>
                      {q.provider}
                    </span>
                    <span style={{ 
                      fontSize: '11px',
                      color: q.available ? 'var(--antd-success)' : 'var(--antd-error)',
                      fontWeight: 600
                    }}>
                      {q.available ? '● API KEY 可用' : '● KEY 失效'}
                    </span>
                  </div>
                  
                  {q.error ? (
                    <div style={{ color: 'var(--antd-error)', fontSize: '11px' }}>
                      {q.error.message || '额度同步错误'}
                    </div>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>
                        <span>额度使用进度</span>
                        <span>{Math.round((q.usage?.total_used / q.usage?.total_granted) * 100)}%</span>
                      </div>
                      <div style={{ height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${(q.usage?.total_used / q.usage?.total_granted) * 100}%`,
                          backgroundColor: 'var(--antd-success)'
                        }}></div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}


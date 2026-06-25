import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle, Clock, XCircle, Play, FileText, AlertTriangle } from 'lucide-react';

interface WorkflowRecord {
  id: string;
  task: string;
  status: string;
  created: string;
  updated: string;
}

interface WorkflowDetail {
  workflow_id: string;
  task_description: string;
  status: string;
  nodes: {
    id: string;
    task_type: string;
    status: string;
    output: string;
  }[];
}

export default function WorkflowsView() {
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWf, setSelectedWf] = useState<WorkflowDetail | null>(null);

  const fetchWorkflows = async () => {
    try {
      const res = await fetch('/api/metaos/workflows');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          setWorkflows(data.workflows);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
    const interval = setInterval(fetchWorkflows, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadDetail = async (id: string) => {
    try {
      const res = await fetch(`/api/metaos/workflows/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok') {
          setSelectedWf(data.workflow);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/metaos/workflows/${id}/approve`, { method: 'POST' });
      if (res.ok) {
        alert('审批通过，已放行！');
        loadDetail(id);
        fetchWorkflows();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle size={16} style={{ color: 'var(--antd-success)' }} />;
      case 'running': return <Activity size={16} style={{ color: 'var(--antd-primary)' }} />;
      case 'awaiting_approval': return <AlertTriangle size={16} style={{ color: 'var(--antd-warning)' }} />;
      default: return <XCircle size={16} style={{ color: 'var(--antd-error)' }} />;
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }} className="animate-fade-in">
      {/* List */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
        <div className="section-header" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={20} style={{ color: 'var(--antd-primary)' }} />
          <h2 style={{ fontSize: '1.2rem', margin: 0 }}>MetaOS 工作流历史</h2>
        </div>
        {loading ? (
          <div className="loading-state" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true"></div>
            <p>加载中...</p>
          </div>
        ) : workflows.length === 0 ? (
          <p style={{ color: 'var(--antd-text-secondary)', textAlign: 'center', marginTop: '2rem' }}>暂无记录。</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }} role="list" aria-label="工作流历史列表">
            {workflows.map(wf => (
              <div 
                key={wf.id} 
                className="antd-input" 
                role="listitem"
                tabIndex={0}
                style={{ 
                  padding: '1rem', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.5rem',
                  height: 'auto',
                  border: selectedWf?.workflow_id === wf.id ? '1px solid var(--antd-primary)' : '1px solid var(--antd-border-color)',
                  boxShadow: selectedWf?.workflow_id === wf.id ? 'var(--tech-cyan-glow)' : 'none',
                  background: selectedWf?.workflow_id === wf.id ? 'rgba(0, 242, 254, 0.05)' : 'rgba(6, 9, 19, 0.6)'
                }}
                onClick={() => loadDetail(wf.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { loadDetail(wf.id); } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, color: 'var(--antd-text-primary)', fontFamily: 'monospace' }}>{wf.id.substring(0, 12)}...</span>
                  {getStatusIcon(wf.status)}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--antd-text-secondary)' }}>
                  {wf.task ? (wf.task.length > 50 ? wf.task.substring(0, 50) + '...' : wf.task) : '未提供目标描述 (系统自动生成的测试流)'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--antd-text-secondary)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={12} /> {new Date(wf.created).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail & HITL */}
      <div className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
        {selectedWf ? (
          <>
            <div className="section-header" style={{ marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} style={{ color: 'var(--antd-primary)' }} />
              <h2 style={{ fontSize: '1.2rem', margin: 0 }}>工作流详情 & 人机协作 (HITL)</h2>
            </div>
            
            <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '1rem', borderRadius: 'var(--antd-radius-lg)', border: '1px solid var(--antd-border-color)' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--antd-text-primary)' }}>目标任务</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--antd-text-secondary)', margin: 0 }}>{selectedWf.task_description}</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1rem', color: 'var(--antd-text-primary)' }}>节点追踪</h3>
              {(selectedWf.nodes || []).map(n => (
                <div key={n.id} style={{ 
                  padding: '1rem', 
                  background: 'rgba(0,0,0,0.3)', 
                  borderRadius: 'var(--antd-radius-md)',
                  border: '1px solid var(--antd-border-color)',
                  borderLeft: n.status === 'awaiting_approval' ? '3px solid var(--antd-warning)' : '1px solid var(--antd-border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--antd-text-primary)' }}>{n.id} <span style={{ color: 'var(--antd-text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>({n.task_type})</span></span>
                    {getStatusIcon(n.status)}
                  </div>
                  {n.status === 'awaiting_approval' ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--antd-warning-bg)', padding: '0.75rem', borderRadius: 'var(--antd-radius-md)', border: '1px solid rgba(255, 184, 0, 0.2)' }}>
                      <span style={{ color: 'var(--antd-warning)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={14} /> 触发 RED 门控：需人工授权执行
                      </span>
                      <button 
                        className="antd-btn antd-btn-primary" 
                        style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem', height: '28px', color: 'var(--antd-warning)', borderColor: 'var(--antd-warning)' }}
                        onClick={() => handleApprove(selectedWf.workflow_id)}
                      >
                        授权放行
                      </button>
                    </div>
                  ) : n.output ? (
                    <div style={{ fontSize: '0.8rem', fontFamily: 'monospace', color: 'var(--antd-text-secondary)', background: 'rgba(0,0,0,0.4)', padding: '0.5rem', borderRadius: 'var(--antd-radius-md)', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                      {n.output}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--antd-text-secondary)' }}>
            <Activity size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>请在左侧选择工作流以查看详情</p>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Briefcase, GitPullRequest, Code, Play, RefreshCw, Send, Terminal, ShieldAlert, Cpu } from 'lucide-react';
import './Dashboard.css';

interface SkillItem {
  id: string;
  name: string;
  description: string;
  source: string;
  path: string;
}

interface WorkflowItem {
  name: string;
  description: string;
  steps: number;
}

export default function AssetsView() {
  const [activeSubTab, setActiveSubTab] = useState<'skills' | 'pipelines' | 'workflows'>('skills');
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [pipelines, setPipelines] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // 管线执行表单
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [pipelineGoal, setPipelineGoal] = useState('分析代码库是否有高风险的技术债');
  const [pipelineOutput, setPipelineOutput] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  // 工作流执行测试
  const [wfTesting, setWfTesting] = useState<Record<string, boolean>>({});
  const [wfTestResults, setWfTestResults] = useState<Record<string, any>>({});

  const fetchData = async () => {
    try {
      // 1. 获取 Skills
      const skillsRes = await fetch('/api/ecos/skills');
      if (skillsRes.ok) {
        const data = await skillsRes.json();
        setSkills(data.skills || []);
      }

      // 2. 获取 Pipelines
      const pipelinesRes = await fetch('/api/pipelines');
      if (pipelinesRes.ok) {
        const data = await pipelinesRes.json();
        setPipelines(data.pipelines || []);
        if (data.pipelines && data.pipelines.length > 0 && !selectedPipeline) {
          setSelectedPipeline(data.pipelines[0]);
        }
      }

      // 3. 获取 Workflows
      const workflowsRes = await fetch('/api/ecos/workflows');
      if (workflowsRes.ok) {
        const data = await workflowsRes.json();
        setWorkflows(data.workflows || []);
      }
    } catch (e) {
      console.error('Failed to fetch assets data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 管线调度
  const handleRunPipeline = async () => {
    if (!selectedPipeline || !pipelineGoal) return;
    setPipelineRunning(true);
    setPipelineError(null);
    setPipelineOutput(null);

    try {
      const res = await fetch('/api/pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: selectedPipeline,
          goal: pipelineGoal
        })
      });

      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setPipelineOutput(data.result || '管线执行完毕，无输出');
      } else {
        setPipelineError(data.error || '管线执行失败');
      }
    } catch (err: any) {
      setPipelineError(err.message || '网络通讯异常');
    } finally {
      setPipelineRunning(false);
    }
  };

  // 工作流测试运行
  const handleTestWorkflow = async (name: string) => {
    setWfTesting(prev => ({ ...prev, [name]: true }));
    try {
      const res = await fetch(`/api/ecos/workflow/test?name=${encodeURIComponent(name)}`, {
        method: 'POST'
      });
      const data = await res.json();
      setWfTestResults(prev => ({ ...prev, [name]: data }));
    } catch (err: any) {
      setWfTestResults(prev => ({ ...prev, [name]: { error: err.message } }));
    } finally {
      setWfTesting(prev => ({ ...prev, [name]: false }));
    }
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在索引底层技术资产（自动化工作流、管线与自定义技能）...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* 资产类型页签控制 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        paddingBottom: '12px'
      }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setActiveSubTab('skills')}
            className={`antd-btn ${activeSubTab === 'skills' ? 'btn-primary' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Code size={14} />
            <span>智能体开发技能 ({skills.length})</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('pipelines')}
            className={`antd-btn ${activeSubTab === 'pipelines' ? 'btn-primary' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <Terminal size={14} />
            <span>工具管线 (Pipelines: {pipelines.length})</span>
          </button>
          
          <button
            onClick={() => setActiveSubTab('workflows')}
            className={`antd-btn ${activeSubTab === 'workflows' ? 'btn-primary' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
          >
            <GitPullRequest size={14} />
            <span>自动化工作流 ({workflows.length})</span>
          </button>
        </div>

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

      {/* 技能资产库面板 */}
      {activeSubTab === 'skills' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {skills.length === 0 ? (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)' }}>
              未扫描到已装载技能
            </div>
          ) : (
            skills.map(skill => (
              <div key={skill.id} className="antd-card" style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '20px',
                background: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                transition: 'transform 0.2s, box-shadow 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{skill.name}</h4>
                    <span style={{
                      fontSize: '10px',
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: skill.source.startsWith('plugin') ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255,255,255,0.06)',
                      color: skill.source.startsWith('plugin') ? 'var(--antd-primary)' : 'rgba(255,255,255,0.65)',
                      border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                      {skill.source.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '12px', margin: '4px 0 12px 0', minHeight: '36px', lineHeight: '1.5' }}>
                    {skill.description || '自定义开发辅助技能'}
                  </p>
                </div>
                <div style={{
                  borderTop: '1px solid rgba(255,255,255,0.05)',
                  paddingTop: '10px',
                  fontSize: '11px',
                  fontFamily: 'monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  color: 'rgba(255,255,255,0.35)'
                }} title={skill.path}>
                  路径: {skill.path.replace(/\/Users\/[^\/]+/g, '~')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 工具管线面板 */}
      {activeSubTab === 'pipelines' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px' }}>
          
          {/* 左栏：管线配置与选择 */}
          <div className="services-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>工具链管线快速调度</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                  选择工具管线
                </label>
                <select
                  value={selectedPipeline}
                  onChange={(e) => setSelectedPipeline(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    outline: 'none'
                  }}
                >
                  {pipelines.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', display: 'block', marginBottom: '6px' }}>
                  战役目标 / 目的描述 (Goal)
                </label>
                <input
                  type="text"
                  value={pipelineGoal}
                  onChange={(e) => setPipelineGoal(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <button
                onClick={handleRunPipeline}
                disabled={pipelineRunning || !selectedPipeline}
                className="antd-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  background: 'var(--antd-primary)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  marginTop: '6px'
                }}
              >
                <Play size={14} />
                <span>{pipelineRunning ? '管线调度执行中...' : '调度工具管线'}</span>
              </button>
            </div>
          </div>

          {/* 右栏：执行日志与输出 */}
          <div className="services-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>调度终端日志 (Terminal Output)</h3>
            
            <div style={{
              flex: 1,
              backgroundColor: '#05070a',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '12px',
              fontFamily: 'monospace',
              fontSize: '12px',
              color: '#d1d9e0',
              overflowY: 'auto',
              minHeight: '260px',
              maxHeight: '400px',
              whiteSpace: 'pre-wrap'
            }}>
              {pipelineRunning && (
                <div style={{ color: 'var(--antd-primary)' }} className="blink-fast">
                  ⚙️ Agora Pipeline: 正在调度子进程执行该管线，载入上下文...
                </div>
              )}
              {pipelineError && (
                <div style={{ color: 'var(--antd-error)' }}>
                  ⚠️ 执行失败: {pipelineError}
                </div>
              )}
              {pipelineOutput && (
                <div>{pipelineOutput}</div>
              )}
              {!pipelineRunning && !pipelineError && !pipelineOutput && (
                <div style={{ color: 'rgba(255,255,255,0.3)' }}>
                  等待管线调度。启动后，子系统反馈的流输出将在此滚动呈递。
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* 自动化工作流面板 */}
      {activeSubTab === 'workflows' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {workflows.length === 0 ? (
            <div className="antd-card" style={{ padding: '32px', textAlign: 'center' }}>
              <p className="text-muted">暂无已装载的自动化工作流</p>
            </div>
          ) : (
            workflows.map(wf => (
              <div key={wf.name} className="service-row" style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 140px',
                alignItems: 'center',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.05)',
                backgroundColor: 'rgba(255,255,255,0.015)'
              }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{wf.name}</h4>
                  <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                    {wf.description || '分布式网格任务自动化编排工作流'}
                  </p>
                </div>
                
                <div className="text-muted" style={{ fontSize: '12px' }}>
                  任务节点数: {wf.steps || 0}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => handleTestWorkflow(wf.name)}
                    disabled={wfTesting[wf.name]}
                    className="antd-btn"
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Play size={12} />
                    <span>{wfTesting[wf.name] ? '测试中' : '测试运行'}</span>
                  </button>
                </div>

                {/* 展开测试结果 */}
                {wfTestResults[wf.name] && (
                  <div style={{ gridColumn: 'span 3', marginTop: '12px' }}>
                    <pre style={{
                      padding: '12px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#00f2fe',
                      fontSize: '11px',
                      overflowX: 'auto',
                      maxHeight: '180px',
                      margin: 0
                    }}>
                      {JSON.stringify(wfTestResults[wf.name], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}

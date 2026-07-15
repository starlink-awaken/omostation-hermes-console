import { useEffect, useMemo, useState } from 'react';
import { Briefcase, ClipboardCheck, Code, Cpu, GitPullRequest, Play, RefreshCw, Route, ShieldAlert, Terminal } from 'lucide-react';
import './Dashboard.css';
import ActionSurfacePanel from './ActionSurfacePanel';
import KnowledgeExecutionWorkbench from './KnowledgeExecutionWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

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

interface AssetsViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type AssetClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesAssetsFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export default function AssetsView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: AssetsViewProps) {
  const [activeSubTab, setActiveSubTab] = useState<'skills' | 'pipelines' | 'workflows'>('skills');
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [pipelines, setPipelines] = useState<string[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [pipelineGoal, setPipelineGoal] = useState('分析代码库是否有高风险的技术债');
  const [pipelineOutput, setPipelineOutput] = useState<string | null>(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  const [wfTesting, setWfTesting] = useState<Record<string, boolean>>({});
  const [wfTestResults, setWfTestResults] = useState<Record<string, any>>({});

  const fetchData = async () => {
    try {
      const read = async (url: string, label: string) => {
        const response = await fetch(url);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error || `${label}不可用`);
        return payload;
      };
      const results = await Promise.allSettled([
        read('/api/ecos/skills', '技能索引'),
        read('/api/pipelines', '工具管线'),
        read('/api/ecos/workflows', '自动化工作流'),
      ]);
      const failures: string[] = [];
      const [skillsResult, pipelinesResult, workflowsResult] = results;
      if (skillsResult.status === 'fulfilled') setSkills(skillsResult.value.skills || []);
      else failures.push(skillsResult.reason?.message || '技能索引不可用');
      if (pipelinesResult.status === 'fulfilled') {
        const pipelinesData = pipelinesResult.value;
        setPipelines(pipelinesData.pipelines || []);
        if (pipelinesData.pipelines?.length > 0 && !selectedPipeline) setSelectedPipeline(pipelinesData.pipelines[0]);
      } else failures.push(pipelinesResult.reason?.message || '工具管线不可用');
      if (workflowsResult.status === 'fulfilled') setWorkflows(workflowsResult.value.workflows || []);
      else failures.push(workflowsResult.reason?.message || '自动化工作流不可用');
      setDataError(failures.length ? `资产数据部分不可用：${failures.join('；')}` : null);
    } catch (e) {
      console.error('Failed to fetch assets data:', e);
      setDataError(e instanceof Error ? e.message : '技术资产数据不可用');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    if (!focusTaskQuery) return;
    if (skills.some((skill) => matchesAssetsFocusQuery([skill.id, skill.name, skill.description, skill.source, skill.path], focusTaskQuery))) {
      setActiveSubTab('skills');
      return;
    }
    if (pipelines.some((pipeline) => matchesAssetsFocusQuery([pipeline], focusTaskQuery))) {
      setActiveSubTab('pipelines');
      return;
    }
    if (workflows.some((workflow) => matchesAssetsFocusQuery([workflow.name, workflow.description], focusTaskQuery))) {
      setActiveSubTab('workflows');
    }
  }, [focusTaskQuery, pipelines, skills, workflows]);

  const handleRefresh = () => {
    setRefreshing(true);
    void fetchData();
  };

  const handleRunPipeline = async () => {
    if (!selectedPipeline || !pipelineGoal) return;
    setPipelineRunning(true);
    setPipelineError(null);
    setPipelineOutput(null);

    try {
      const res = await fetch('/api/cockpit/engine/queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          engine: 'pipeline',
          pipeline: selectedPipeline,
          task: pipelineGoal,
        }),
      });

      const data = await res.json();
      if (res.ok && data.executes === false) {
        setPipelineOutput(`已登记为任务 ${data.id || '待定'}，请到任务中心审批后执行。`);
        if (data.id) onOpenTarget?.({ tab: 'TaskCenter', taskQuery: data.id });
      } else {
        setPipelineError(data.detail || data.error || '管线任务承接失败');
      }
    } catch (err: any) {
      setPipelineError(err.message || '网络通讯异常');
    } finally {
      setPipelineRunning(false);
    }
  };

  const handleTestWorkflow = async (name: string) => {
    setWfTesting((prev) => ({ ...prev, [name]: true }));
    try {
      const res = await fetch(`/api/ecos/workflow/test?name=${encodeURIComponent(name)}`, {
        method: 'POST',
      });
      const data = await res.json();
      setWfTestResults((prev) => ({ ...prev, [name]: data }));
    } catch (err: any) {
      setWfTestResults((prev) => ({ ...prev, [name]: { error: err.message } }));
    } finally {
      setWfTesting((prev) => ({ ...prev, [name]: false }));
    }
  };

  const pluginSkills = useMemo(() => skills.filter((skill) => skill.source.startsWith('plugin')), [skills]);
  const localSkills = useMemo(() => skills.filter((skill) => !skill.source.startsWith('plugin')), [skills]);
  const testedWorkflowCount = useMemo(
    () => Object.values(wfTestResults).filter((result) => result && !result.error).length,
    [wfTestResults],
  );

  const actionItems = useMemo(() => {
    const items = [
      {
        id: 'protocol-governance',
        title: '协议与技能治理',
        detail: `优先治理 ${localSkills.length} 个本地技能，避免资产只在磁盘里堆着。`,
        actionLabel: '进入协议面',
        actionType: 'navigate' as const,
        actionValue: 'Protocol',
      },
      {
        id: 'workflow-runtime',
        title: '实时工作流编排',
        detail: `把 ${workflows.length} 条自动化工作流接回 MetaOS 运行视图和 HITL。`,
        actionLabel: '进入工作流',
        actionType: 'navigate' as const,
        actionValue: 'Workflows',
      },
      {
        id: 'task-handoff',
        title: '资产补位任务',
        detail: '把缺失的技能说明、管线目标和测试结果转成任务中心承接。',
        actionLabel: '进入任务中心',
        actionType: 'navigate' as const,
        actionValue: 'TaskCenter',
      },
    ];
    return items;
  }, [localSkills.length, workflows.length]);

  const assetBacklog = useMemo(() => ({
    skillItems: (localSkills.length ? localSkills : skills).slice(0, 3),
    pipelineItems: (pipelines.length ? pipelines : selectedPipeline ? [selectedPipeline] : []).slice(0, 3),
    workflowItems: workflows.slice(0, 3),
  }), [localSkills, pipelines, selectedPipeline, skills, workflows]);

  const assetClosureRows = useMemo<AssetClosureRow[]>(() => {
    const firstLocalSkill = assetBacklog.skillItems[0];
    const firstPipeline = assetBacklog.pipelineItems[0] || selectedPipeline;
    const firstWorkflow = assetBacklog.workflowItems[0];

    return [
      {
        id: 'knowledge-assets',
        title: '知识供给入资产',
        summary: '知识页补好的上下文，最终得落到技能、管线和工作流资产上，不然知识供给就是空转。',
        signal: focusTaskQuery && matchesAssetsFocusQuery(['knowledge', 'memory', 'context', 'research', '资产'], focusTaskQuery)
          ? `当前焦点 ${focusTaskQuery}`
          : `技能 ${skills.length} · 管线 ${pipelines.length}`,
        nextAction: '先回知识页确认上下文供给，再回来核对资产是否真的拿到可执行输入。',
        statusTone: skills.length > 0 || pipelines.length > 0 ? 'degraded' : 'online',
        objectTarget: { tab: 'Knowledge', taskQuery: focusTaskQuery || 'knowledge-assets' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'knowledge-assets' },
      },
      {
        id: 'protocol-skills',
        title: '技能治理到协议',
        summary: '本地技能不是堆在磁盘里就算完成，最终要回协议面补描述、边界和治理位置。',
        signal: localSkills.length > 0 ? `待治理 ${localSkills.length}` : `插件技能 ${pluginSkills.length}`,
        nextAction: firstLocalSkill
          ? `优先治理 ${firstLocalSkill.name}，补使用边界、协议归类和复用说明。`
          : '当前没有本地技能待治理，抽查一条插件技能的治理归属。',
        statusTone: localSkills.length > 0 ? 'degraded' : 'online',
        objectTarget: { tab: 'Protocol', taskQuery: firstLocalSkill?.id || 'skills' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstLocalSkill?.id || 'skills' },
      },
      {
        id: 'pipeline-output',
        title: '管线试跑与输出复核',
        summary: '管线至少要跑出一轮明确输出，才能判断它到底是日用能力还是一条摆设命令。',
        signal: firstPipeline ? `待试跑 ${assetBacklog.pipelineItems.length}` : '暂无管线',
        nextAction: firstPipeline
          ? `给 ${firstPipeline} 一个明确目标，跑一轮输出，再决定是否继续沉成正式能力。`
          : '当前没有可调度管线，先补齐最小可运行管线清单。',
        statusTone: firstPipeline ? 'degraded' : 'online',
        objectTarget: { tab: 'Assets', taskQuery: firstPipeline || 'pipelines' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstPipeline || 'pipelines' },
      },
      {
        id: 'workflow-runtime',
        title: '工作流验收到运行面',
        summary: '资产层工作流跑完以后，还要回运行页看真实编排、授权链和 HITL，不然只是假通过。',
        signal: firstWorkflow ? `待验收 ${assetBacklog.workflowItems.length}` : `已验收 ${testedWorkflowCount}`,
        nextAction: firstWorkflow
          ? `回运行面核对 ${firstWorkflow.name} 的真实节点状态、授权链和最近测试结果。`
          : '当前没有待验收工作流，抽查已测试结果是否还和运行态一致。',
        statusTone: firstWorkflow ? 'degraded' : 'online',
        objectTarget: { tab: 'Workflows', taskQuery: firstWorkflow?.name || 'workflows' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstWorkflow?.name || 'workflows' },
      },
    ];
  }, [
    assetBacklog.pipelineItems,
    assetBacklog.skillItems,
    assetBacklog.workflowItems,
    focusTaskQuery,
    localSkills.length,
    pipelines.length,
    pluginSkills.length,
    selectedPipeline,
    skills.length,
    testedWorkflowCount,
  ]);

  const focusedAssetCard = useMemo(() => {
    const matchedSkill = skills.find((skill) => (
      matchesAssetsFocusQuery([skill.id, skill.name, skill.description, skill.source, skill.path], focusTaskQuery)
    ));
    if (matchedSkill) {
      return {
        kicker: '技能资产',
        title: matchedSkill.name,
        detail: matchedSkill.description || `${matchedSkill.source.toUpperCase()} · ${matchedSkill.path}`,
        objectTarget: { tab: 'Assets', taskQuery: matchedSkill.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedSkill.id },
      };
    }

    const matchedPipeline = pipelines.find((pipeline) => matchesAssetsFocusQuery([pipeline], focusTaskQuery));
    if (matchedPipeline) {
      return {
        kicker: '工具管线',
        title: matchedPipeline,
        detail: '优先给这条管线一个明确目标并执行一轮，再决定是否能日用。',
        objectTarget: { tab: 'Assets', taskQuery: matchedPipeline },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedPipeline },
      };
    }

    const matchedWorkflow = workflows.find((workflow) => (
      matchesAssetsFocusQuery([workflow.name, workflow.description], focusTaskQuery)
    ));
    if (matchedWorkflow) {
      return {
        kicker: '资产级工作流',
        title: matchedWorkflow.name,
        detail: matchedWorkflow.description || `节点 ${matchedWorkflow.steps || 0}，继续回运行页核对真实编排与授权链。`,
        objectTarget: { tab: 'Workflows', taskQuery: matchedWorkflow.name },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedWorkflow.name },
      };
    }

    const matchedClosure = assetClosureRows.find((row) => (
      matchesAssetsFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '资产闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'Assets') {
      return {
        kicker: '当前页面',
        title: '技术资产库',
        detail: '这页负责把技能、管线和工作流沉淀收成可治理、可试跑、可承接的统一资产面。',
        objectTarget: { tab: 'SystemMap', pageId: 'Assets' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Assets' },
      };
    }

    return null;
  }, [assetClosureRows, focusPageId, focusTaskQuery, pipelines, skills, workflows]);

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
      <KnowledgeExecutionWorkbench currentPage="Assets" onNavigate={onNavigate} />

      {dataError && (
        <div className="shell-data-banner" role="alert">
          <span>{dataError}，当前清单不代表资产为 0。</span>
          <button type="button" onClick={handleRefresh}>重试</button>
        </div>
      )}

      <section className="antd-card" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div className="section-header" style={{ marginBottom: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18 }}>技术资产总览</h2>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
              把技能、管线和工作流从“静态清单”收成可治理、可试跑、可承接的统一资产面。
            </p>
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

        <div className="stats-grid">
          {[
            ['本地技能', localSkills.length, <Briefcase key="briefcase" size={20} />],
            ['插件技能', pluginSkills.length, <Cpu key="cpu" size={20} />],
            ['工具管线', pipelines.length, <Terminal key="terminal" size={20} />],
            ['自动化工作流', workflows.length, <GitPullRequest key="workflow" size={20} />],
          ].map(([label, value, icon]) => (
            <div key={String(label)} className="stat-card">
              <div className="stat-icon-wrapper pulse-accent">{icon}</div>
              <div className="stat-info">
                <h3>{label}</h3>
                <p className="stat-value">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ActionSurfacePanel
        title="资产处理区"
        subtitle="先治理本地技能，再试跑工具管线，最后把自动化工作流送回运行面验收。"
        statusText={workflows.length ? `${workflows.length} 条资产级工作流` : '等待资产数据'}
        items={actionItems}
        onNavigate={onNavigate}
      />

      {focusedAssetCard && (
        <section className="services-section overview-ops-panel" aria-label="当前资产承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前资产承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成资产面当前该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedAssetCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedAssetCard.title}</strong>
              <p>{focusedAssetCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开资产焦点对象 ${focusedAssetCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedAssetCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Briefcase size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开资产焦点任务 ${focusedAssetCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedAssetCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <ShieldAlert size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>资产承接工作台</h2>
            <p className="text-muted">哪些资产缺治理、哪些需要试跑、哪些已经该进入运行和任务闭环，一眼看清。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">待治理技能 {localSkills.length}</span>
            <span className="status-badge degraded">待试跑管线 {pipelines.length}</span>
            <span className="status-badge online">已验收工作流 {testedWorkflowCount}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>技能治理</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>本地技能先补描述、归类和协议位置，再谈复用。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => onNavigate?.('Protocol')}>
                <ShieldAlert size={14} />
                <span>进入协议面</span>
              </button>
            </div>
            {assetBacklog.skillItems.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有可治理技能。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {assetBacklog.skillItems.map((skill) => (
                  <button
                    key={`skill-${skill.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`治理技能 ${skill.name}`}
                    onClick={() => onNavigate?.('Protocol')}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{skill.name}</strong>
                      <p>{skill.description || '待补技能描述与使用边界。'}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>{skill.source.toUpperCase()} · {skill.path}</span>
                    </div>
                    <Code size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>管线试跑</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>别只知道管线名，至少给它一轮目标和输出，再决定是否能日用。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => setActiveSubTab('pipelines')}>
                <Terminal size={14} />
                <span>打开管线面</span>
              </button>
            </div>
            {assetBacklog.pipelineItems.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>暂无可调度管线。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {assetBacklog.pipelineItems.map((pipeline) => (
                  <button
                    key={`pipeline-${pipeline}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`试跑管线 ${pipeline}`}
                    onClick={() => {
                      setSelectedPipeline(pipeline);
                      setActiveSubTab('pipelines');
                    }}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{pipeline}</strong>
                      <p>{selectedPipeline === pipeline && pipelineOutput ? '已存在最近一次输出，可继续复核。' : '优先给它一个明确目标并执行一轮。'}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        {selectedPipeline === pipeline && pipelineOutput ? pipelineOutput.slice(0, 90) : pipelineGoal}
                      </span>
                    </div>
                    <Play size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>工作流验收</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>资产层 workflow 试跑完以后，回到运行页看实际编排与授权链。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => onNavigate?.('Workflows')}>
                <GitPullRequest size={14} />
                <span>进入工作流页</span>
              </button>
            </div>
            {assetBacklog.workflowItems.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>暂无可验收工作流。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {assetBacklog.workflowItems.map((workflow) => (
                  <button
                    key={`workflow-${workflow.name}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`处理工作流 ${workflow.name}`}
                    onClick={() => onNavigate?.('Workflows')}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{workflow.name}</strong>
                      <p>{workflow.description || '回运行页检查真实节点状态与 HITL。'}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        节点 {workflow.steps || 0} · {wfTestResults[workflow.name]?.error ? '最近测试失败' : wfTestResults[workflow.name] ? '最近测试已返回结果' : '尚未跑测试'}
                      </span>
                    </div>
                    <GitPullRequest size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>
        </div>
      </section>

      <section className="services-section" role="region" aria-label="资产闭环总表">
        <div className="section-header">
          <div>
            <h2>资产闭环总表</h2>
            <p className="text-muted">把知识供给、技能治理、管线试跑和工作流验收并排摆出来，资产页才不只是清单和测试按钮。</p>
          </div>
          <span className="status-badge online">{assetClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {assetClosureRows.map((row) => (
            <article
              key={`asset-closure-${row.id}`}
              className="antd-card"
              style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 15 }}>{row.title}</strong>
                  <span className={`status-badge ${row.statusTone}`}>{row.signal}</span>
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{row.summary}</p>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <small className="text-muted">下一步</small>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>{row.nextAction}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开资产闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ClipboardCheck size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开资产闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>打开任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: '12px',
        }}
      >
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

      {activeSubTab === 'skills' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {skills.length === 0 ? (
            <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.4)' }}>
              未扫描到已装载技能
            </div>
          ) : (
            skills.map((skill) => (
              <div
                key={skill.id}
                className="antd-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  background: 'rgba(255, 255, 255, 0.015)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '8px',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{skill.name}</h4>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        backgroundColor: skill.source.startsWith('plugin') ? 'rgba(0, 242, 254, 0.1)' : 'rgba(255,255,255,0.06)',
                        color: skill.source.startsWith('plugin') ? 'var(--antd-primary)' : 'rgba(255,255,255,0.65)',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
                      }}
                    >
                      {skill.source.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-muted" style={{ fontSize: '12px', margin: '4px 0 12px 0', minHeight: '36px', lineHeight: '1.5' }}>
                    {skill.description || '自定义开发辅助技能'}
                  </p>
                </div>
                <div
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    paddingTop: '10px',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'rgba(255,255,255,0.35)',
                  }}
                  title={skill.path}
                >
                  路径: {skill.path.replace(/\/Users\/[^\/]+/g, '~')}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeSubTab === 'pipelines' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr', gap: '20px' }}>
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
                    outline: 'none',
                  }}
                >
                  {pipelines.map((pipeline) => (
                    <option key={pipeline} value={pipeline}>{pipeline}</option>
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
                    outline: 'none',
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
                  marginTop: '6px',
                }}
              >
                <Play size={14} />
                <span>{pipelineRunning ? '正在承接任务...' : '承接工具管线任务'}</span>
              </button>
            </div>
          </div>

          <div className="services-section" style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>任务承接结果</h3>

            <div
              style={{
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
                whiteSpace: 'pre-wrap',
              }}
            >
              {pipelineRunning && (
                <div style={{ color: 'var(--antd-primary)' }} className="blink-fast">
                  任务会先进入 OMO 计划队列，审批后再由任务中心派发执行。
                </div>
              )}
              {pipelineError && (
                <div style={{ color: 'var(--antd-error)' }}>
                  ⚠️ 执行失败: {pipelineError}
                </div>
              )}
              {pipelineOutput && <div>{pipelineOutput}</div>}
              {!pipelineRunning && !pipelineError && !pipelineOutput && (
                <div style={{ color: 'rgba(255,255,255,0.3)' }}>
                  等待管线承接。提交后可从任务中心查看审批、派发和执行证据。
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'workflows' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {workflows.length === 0 ? (
            <div className="antd-card" style={{ padding: '32px', textAlign: 'center' }}>
              <p className="text-muted">暂无已装载的自动化工作流</p>
            </div>
          ) : (
            workflows.map((workflow) => (
              <div
                key={workflow.name}
                className="service-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 140px',
                  alignItems: 'center',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.05)',
                  backgroundColor: 'rgba(255,255,255,0.015)',
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{workflow.name}</h4>
                  <p className="text-muted" style={{ margin: '4px 0 0 0', fontSize: '12px' }}>
                    {workflow.description || '分布式网格任务自动化编排工作流'}
                  </p>
                </div>

                <div className="text-muted" style={{ fontSize: '12px' }}>
                  任务节点数: {workflow.steps || 0}
                </div>

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => void handleTestWorkflow(workflow.name)}
                    disabled={wfTesting[workflow.name]}
                    className="antd-btn"
                    style={{
                      fontSize: '11px',
                      padding: '4px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Play size={12} />
                    <span>{wfTesting[workflow.name] ? '测试中' : '测试运行'}</span>
                  </button>
                </div>

                {wfTestResults[workflow.name] && (
                  <div style={{ gridColumn: 'span 3', marginTop: '12px' }}>
                    <pre
                      style={{
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: '#00f2fe',
                        fontSize: '11px',
                        overflowX: 'auto',
                        maxHeight: '180px',
                        margin: 0,
                      }}
                    >
                      {JSON.stringify(wfTestResults[workflow.name], null, 2)}
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

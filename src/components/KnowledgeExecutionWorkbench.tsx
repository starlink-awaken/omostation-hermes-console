import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bot, ClipboardCheck, ClipboardList, GitBranch, PlayCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface TaskItem {
  id: string;
  title?: string;
  status?: string;
  priority?: string;
  read_only?: boolean;
  source?: {
    type?: string;
    title?: string;
  };
}

interface WorkflowRecord {
  id: string;
  task?: string;
  status?: string;
  updated?: string;
}

interface WorkflowPayload {
  status?: string;
  workflows?: WorkflowRecord[];
  total?: number;
}

interface SkillItem {
  id: string;
  name?: string;
}

interface WorkflowDefinition {
  name?: string;
  description?: string;
  steps?: number;
}

interface PipelinePayload {
  pipelines?: string[];
}

interface SystemMapLite {
  usage_paths?: Array<{
    id: string;
    title?: string;
    intent?: string;
    steps?: string[];
  }>;
  playbooks?: Array<{
    id: string;
    title?: string;
    goal?: string;
    frequency?: string;
  }>;
  gaps?: Array<{
    id: string;
    title?: string;
    severity?: string;
    next?: string;
  }>;
  roadmap?: {
    items?: Array<{
      id: string;
      title?: string;
      priority?: string;
      problem?: string;
    }>;
  };
}

interface KnowledgeExecutionWorkbenchProps {
  currentPage: string;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

type ExecutionRouteCard = {
  id: string;
  title: string;
  objectTab: string;
  taskTab: string;
  tone: 'online' | 'degraded' | 'offline';
  signal: string;
  summary: string;
  nextAction: string;
  current: boolean;
};

const EXECUTION_STEPS = [
  {
    id: 'Knowledge',
    title: '先定问题',
    summary: '从知识中枢确认缺口、路径和目标范围。',
  },
  {
    id: 'Assets',
    title: '选能力',
    summary: '挑合适的技能、管线和自动化工作流。',
  },
  {
    id: 'Workflows',
    title: '跑自动化',
    summary: '看编排状态，处理等待审批或失败节点。',
  },
  {
    id: 'TaskCenter',
    title: '落任务',
    summary: '把结论沉到任务、草稿和后续动作。',
  },
];

async function fetchJson<T>(url: string, fallback: T, label: string): Promise<{ data: T; error: string | null }> {
  try {
    const response = await fetch(url);
    if (!response) {
      return { data: fallback, error: `${label}：请求无响应` };
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { data: fallback, error: `${label} HTTP ${response.status}` };
    }
    return { data: payload as T, error: null };
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return { data: fallback, error: `${label}：${error instanceof Error ? error.message : '请求失败'}` };
  }
}

function formatPriority(priority?: string) {
  switch (priority) {
    case 'critical':
      return '紧急';
    case 'high':
      return '高优';
    case 'medium':
      return '中优';
    case 'low':
      return '低优';
    default:
      return '未标记';
  }
}

function formatTaskStatus(status?: string) {
  switch (status) {
    case 'in_progress':
      return '进行中';
    case 'pending':
      return '待处理';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    case 'cancelled':
      return '已取消';
    default:
      return '未知';
  }
}

export default function KnowledgeExecutionWorkbench({
  currentPage,
  onNavigate,
  onOpenTarget,
}: KnowledgeExecutionWorkbenchProps) {
  const openWorkbenchTarget = (tab: string, taskQuery?: string) => {
    openCockpitNavigationTarget({
      tab: tab as CockpitNavigationTarget['tab'],
      taskQuery: taskQuery || currentPage,
    }, onNavigate, onOpenTarget);
  };
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [workflowTotal, setWorkflowTotal] = useState(0);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [pipelines, setPipelines] = useState<string[]>([]);
  const [workflowDefinitions, setWorkflowDefinitions] = useState<WorkflowDefinition[]>([]);
  const [systemMap, setSystemMap] = useState<SystemMapLite>({});
  const [sourceErrors, setSourceErrors] = useState<string[]>([]);
  const [refreshToken, setRefreshToken] = useState(0);
  const [taskPending, setTaskPending] = useState(false);
  const [taskNotice, setTaskNotice] = useState<string | null>(null);
  const [taskError, setTaskError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      const [
        taskPayload,
        workflowPayload,
        skillPayload,
        pipelinePayload,
        workflowDefinitionPayload,
        systemMapPayload,
      ] = await Promise.all([
        fetchJson<{ items?: TaskItem[] }>(
          '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80',
          { items: [] },
          '任务池',
        ),
        fetchJson<WorkflowPayload>(
          '/api/metaos/workflows?limit=100&offset=0',
          { status: 'error', workflows: [], total: 0 },
          '工作流记录',
        ),
        fetchJson<{ skills?: SkillItem[] }>('/api/ecos/skills', { skills: [] }, '技能目录'),
        fetchJson<PipelinePayload>('/api/pipelines', { pipelines: [] }, '管线目录'),
        fetchJson<{ workflows?: WorkflowDefinition[] }>('/api/ecos/workflows', { workflows: [] }, '工作流目录'),
        fetchJson<SystemMapLite>('/api/cockpit/system-map', {}, '系统地图'),
      ]);

      if (!active) {
        return;
      }

      setTasks(taskPayload.data.items || []);
      setWorkflows(workflowPayload.data.workflows || []);
      setWorkflowTotal(typeof workflowPayload.data.total === 'number' ? workflowPayload.data.total : (workflowPayload.data.workflows || []).length);
      setSkills(skillPayload.data.skills || []);
      setPipelines(pipelinePayload.data.pipelines || []);
      setWorkflowDefinitions(workflowDefinitionPayload.data.workflows || []);
      setSystemMap(systemMapPayload.data || {});
      setSourceErrors([taskPayload.error, workflowPayload.error, skillPayload.error, pipelinePayload.error, workflowDefinitionPayload.error, systemMapPayload.error]
        .filter((error): error is string => Boolean(error)));
    };

    void load();
    return () => {
      active = false;
    };
  }, [refreshToken]);

  const summary = useMemo(() => {
    const pendingTasks = tasks.filter((task) => task.status === 'pending').length;
    const runningTasks = tasks.filter((task) => task.status === 'in_progress').length;
    const draftTasks = tasks.filter((task) => task.read_only).length;
    const approvalCount = workflows.filter((workflow) => workflow.status === 'awaiting_approval').length;
    const runningWorkflows = workflows.filter((workflow) => workflow.status === 'running').length;
    const latestTask = [...tasks]
      .sort((left, right) => {
        const leftIsPriority = left.priority === 'critical' || left.priority === 'high';
        const rightIsPriority = right.priority === 'critical' || right.priority === 'high';
        if (leftIsPriority !== rightIsPriority) {
          return leftIsPriority ? -1 : 1;
        }
        if ((left.status === 'in_progress') !== (right.status === 'in_progress')) {
          return left.status === 'in_progress' ? -1 : 1;
        }
        return 0;
      })[0];
    const latestWorkflow = workflows[0];
    const usagePath = systemMap.usage_paths?.[0];
    const playbook = systemMap.playbooks?.[0];
    const gap = systemMap.gaps?.[0];
    const roadmapItem = systemMap.roadmap?.items?.[0];

    let nextAction = '去资产页挑能力，补一条能直接执行的路径。';
    let nextTab = 'Assets';
    if (approvalCount > 0) {
      nextAction = `有 ${approvalCount} 条工作流在等人工放行，先去处理编排门控。`;
      nextTab = 'Workflows';
    } else if (pendingTasks + runningTasks > 0 || draftTasks > 0) {
      nextAction = `任务池里还有 ${pendingTasks + runningTasks} 条执行项，外加 ${draftTasks} 条只读草稿。`;
      nextTab = 'TaskCenter';
    } else if ((systemMap.gaps || []).length > 0 || (systemMap.usage_paths || []).length > 0) {
      nextAction = '先回知识中枢收敛缺口，再决定走哪条执行路径。';
      nextTab = 'Knowledge';
    }

    return {
      pendingTasks,
      runningTasks,
      draftTasks,
      approvalCount,
      runningWorkflows,
      latestTask,
      latestWorkflow,
      usagePath,
      playbook,
      gap,
      roadmapItem,
      nextAction,
      nextTab,
    };
  }, [systemMap, tasks, workflows]);

  const workbenchTitle =
    currentPage === 'Knowledge'
      ? '知识到执行工作台'
      : currentPage === 'Assets'
        ? '资产到执行工作台'
        : currentPage === 'Workflows'
          ? '工作流到执行工作台'
          : '任务到执行工作台';

  const executionRoutes = useMemo<ExecutionRouteCard[]>(() => {
    const capabilityCount = skills.length + pipelines.length + workflowDefinitions.length;
    const knowledgeSignal = `${systemMap.usage_paths?.length || 0} 路径 · ${(systemMap.playbooks || []).length} 清单 · ${(systemMap.gaps || []).length} 缺口`;
    const capabilitySignal = `${skills.length} 技能 · ${pipelines.length} 管线 · ${workflowDefinitions.length} 工作流`;
    const workflowSignal = `${summary.approvalCount} 待审批 · ${summary.runningWorkflows} 运行中`;
    const taskSignal = `${summary.pendingTasks + summary.runningTasks} 执行项 · ${summary.draftTasks} 草稿`;

    return [
      {
        id: 'Knowledge',
        title: '知识锚点',
        objectTab: 'Knowledge',
        taskTab: 'TaskCenter',
        tone: (systemMap.usage_paths || []).length > 0 || (systemMap.gaps || []).length > 0 ? 'degraded' : 'offline',
        signal: knowledgeSignal,
        summary: summary.usagePath?.title || summary.gap?.title || '先把高频路径、清单和缺口收进知识面。',
        nextAction: summary.usagePath?.intent || summary.gap?.next || '补一条稳定使用路径，再决定往哪个对象面分发。',
        current: currentPage === 'Knowledge',
      },
      {
        id: 'Assets',
        title: '能力与自动化',
        objectTab: 'Assets',
        taskTab: 'TaskCenter',
        tone: capabilityCount > 0 ? 'online' : 'offline',
        signal: capabilitySignal,
        summary: skills[0]?.name || workflowDefinitions[0]?.name || pipelines[0] || '能力目录还偏薄。',
        nextAction: capabilityCount > 0
          ? '把当前路径挂到合适的技能、管线或自动化工作流上。'
          : '先补技能说明、管线入口和工作流定义，避免知识页只能描述问题。',
        current: currentPage === 'Assets',
      },
      {
        id: 'Workflows',
        title: '执行编排',
        objectTab: 'Workflows',
        taskTab: 'TaskCenter',
        tone: summary.approvalCount > 0 || summary.runningWorkflows > 0 ? 'degraded' : workflows.length > 0 ? 'online' : 'offline',
        signal: workflowSignal,
        summary: summary.latestWorkflow?.task || summary.latestWorkflow?.id || '还没有最近工作流记录。',
        nextAction: summary.approvalCount > 0
          ? `先处理 ${summary.approvalCount} 条待审批工作流，别让路径卡在人工门控。`
          : summary.latestWorkflow
            ? '核对最近一次编排是否真的承接了知识面和资产面的意图。'
            : '至少产出一条可回放的工作流样本，让自动化层有实证。',
        current: currentPage === 'Workflows',
      },
      {
        id: 'TaskCenter',
        title: '任务落地',
        objectTab: 'TaskCenter',
        taskTab: 'TaskCenter',
        tone: summary.pendingTasks + summary.runningTasks + summary.draftTasks > 0 ? 'degraded' : 'online',
        signal: taskSignal,
        summary: summary.latestTask?.title || summary.roadmapItem?.title || '当前还没有在途任务。',
        nextAction: summary.latestTask
          ? '回任务中心收口对象入口、证据字段和真正的下一步。'
          : summary.roadmapItem?.problem || '把路线图或操作清单继续沉到任务中心。',
        current: currentPage === 'TaskCenter',
      },
    ];
  }, [currentPage, pipelines, skills, summary, systemMap.gaps, systemMap.playbooks, systemMap.usage_paths, workflowDefinitions, workflows.length]);

  const executionTaskDraft = useMemo(() => {
    const source = summary.gap || summary.roadmapItem || summary.usagePath;
    const title = summary.gap?.title
      ? `补齐执行能力：${summary.gap.title}`
      : summary.roadmapItem?.title
        ? `落地执行路线：${summary.roadmapItem.title}`
        : summary.usagePath?.title
          ? `落地使用路径：${summary.usagePath.title}`
          : '建立知识到任务执行样本';
    const description = summary.gap?.next
      || summary.roadmapItem?.problem
      || summary.usagePath?.intent
      || '把知识、能力、工作流和任务中心串成一条可回放的执行链路。';
    return {
      title,
      description,
      priority: summary.gap?.severity === 'high' || summary.gap?.severity === 'critical' ? 'high' : 'medium',
      sourceType: summary.gap ? 'capability_gap' : summary.roadmapItem ? 'roadmap' : summary.usagePath ? 'usage_path' : 'execution_sample',
      sourceId: source?.id || currentPage,
    };
  }, [currentPage, summary.gap, summary.roadmapItem, summary.usagePath]);

  const createExecutionTask = async () => {
    setTaskPending(true);
    setTaskNotice(null);
    setTaskError(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: executionTaskDraft.title,
          description: executionTaskDraft.description,
          priority: executionTaskDraft.priority,
          risk_level: 'L1',
          evidence_required: ['知识或路线图对象', '能力/工作流执行证据', 'TaskCenter closeout'],
          tags: ['knowledge-execution', executionTaskDraft.sourceType],
          source: {
            type: `cockpit.knowledge-execution.${executionTaskDraft.sourceType}`,
            id: executionTaskDraft.sourceId,
            title: executionTaskDraft.title,
            target: { tab: currentPage, taskQuery: executionTaskDraft.sourceId },
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '执行任务登记失败');
      setTaskNotice(`已登记执行任务：${payload.title || executionTaskDraft.title}`);
      if (payload.id) openWorkbenchTarget('TaskCenter', String(payload.id));
    } catch (requestError) {
      setTaskError(requestError instanceof Error ? requestError.message : '执行任务登记失败');
    } finally {
      setTaskPending(false);
    }
  };

  return (
    <section className="knowledge-execution-workbench cockpit-card">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h2>{workbenchTitle}</h2>
          <p className="text-muted">
            把知识中枢、能力资产、自动化编排和任务落地串成一条日常可操作的路径。
          </p>
        </div>
        <button type="button" className="cockpit-btn small" onClick={() => setRefreshToken((value) => value + 1)}>
          <RefreshCw size={13} />
          <span>重新加载</span>
        </button>
      </div>

      {sourceErrors.length > 0 && (
        <div className="overview-inline-error" role="alert">
          <AlertTriangle size={16} />
          <div>
            <strong>执行闭环数据不完整</strong>
            <span>{sourceErrors.join('；')}，当前空状态不代表没有能力或任务。</span>
          </div>
          <button type="button" className="cockpit-btn" onClick={() => setRefreshToken((value) => value + 1)}>重试</button>
        </div>
      )}

      <div className="knowledge-execution-summary">
        <div className="knowledge-execution-card">
          <span>知识锚点</span>
          <strong>{systemMap.usage_paths?.length || 0} 条路径</strong>
          <small>操作清单 {(systemMap.playbooks || []).length} · 能力缺口 {(systemMap.gaps || []).length}</small>
        </div>
        <div className="knowledge-execution-card">
          <span>资产目录</span>
          <strong>{skills.length + pipelines.length + workflowDefinitions.length} 项能力</strong>
          <small>技能 {skills.length} · 管线 {pipelines.length} · 工作流 {workflowDefinitions.length}</small>
        </div>
        <div className="knowledge-execution-card">
          <span>执行编排</span>
          <strong>{summary.approvalCount} 条待审批</strong>
          <small>运行中 {summary.runningWorkflows} · 历史 {workflows.length}/{workflowTotal}</small>
        </div>
        <button
          type="button"
          className="knowledge-execution-card knowledge-execution-card-wide"
          onClick={() => openWorkbenchTarget(summary.nextTab, summary.latestTask?.id || summary.latestWorkflow?.id)}
        >
          <span>建议下一步</span>
          <strong>{summary.nextAction}</strong>
          <small>点击进入 {summary.nextTab}</small>
        </button>
      </div>

      <section className="services-section" role="region" aria-label="执行任务登记" style={{ marginTop: 16 }}>
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>执行任务登记</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              当前路径、能力缺口或路线图项还没有在途任务时，直接登记正式执行项，避免只看汇总不落地。
            </p>
          </div>
          <span className="status-badge degraded">可直接落任务</span>
        </div>
        <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{executionTaskDraft.title}</strong>
            <p>{executionTaskDraft.description}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="cockpit-btn"
              disabled={taskPending}
              aria-label={`登记执行任务 ${executionTaskDraft.title}`}
              onClick={() => { void createExecutionTask(); }}
            >
              <ClipboardCheck size={14} />
              <span>{taskPending ? '登记中...' : '登记正式任务'}</span>
            </button>
            {taskNotice && <span role="status" aria-live="polite" className="text-muted">{taskNotice}</span>}
            {taskError && <span role="alert">{taskError}</span>}
          </div>
        </article>
      </section>

      <div className="knowledge-execution-path">
        {EXECUTION_STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`knowledge-execution-step ${currentPage === step.id ? 'active' : ''}`}
            onClick={() => openWorkbenchTarget(step.id)}
          >
            <span>{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <small>{step.summary}</small>
            </div>
            <small>{step.id}</small>
          </button>
        ))}
      </div>

      <section className="services-section" role="region" aria-label="执行闭环总表" style={{ marginTop: 16 }}>
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>执行闭环总表</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把知识、能力、编排和任务四层承接面放到一张表里，先看该回哪个对象面，再决定落到哪个任务面。
            </p>
          </div>
          <span className="status-badge degraded">
            闭环面 {executionRoutes.filter((route) => route.tone !== 'offline').length} / {executionRoutes.length}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {executionRoutes.map((route) => (
            <article key={route.id} className="cockpit-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ fontSize: 15 }}>{route.title}</strong>
                  <span className={`status-badge ${route.current ? 'online' : route.tone}`}>
                    {route.current ? '当前页' : route.tone === 'online' ? '可用' : route.tone === 'degraded' ? '待收口' : '待补'}
                  </span>
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>{route.signal}</p>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>当前对象</span>
                  <strong>{route.summary}</strong>
                  <small className="text-muted" style={{ fontSize: 12 }}>{route.nextAction}</small>
                </div>
                <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>回写路径</span>
                  <strong>{route.objectTab} {'->'} {route.taskTab}</strong>
                  <small className="text-muted" style={{ fontSize: 12 }}>先看对象面，再把动作沉到任务面。</small>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  type="button"
                  className="cockpit-btn small"
                  aria-label={`打开闭环对象 ${route.title}`}
                  onClick={() => openWorkbenchTarget(route.objectTab, route.id)}
                >
                  <BookOpen size={13} />
                  <span>看对象</span>
                </button>
                <button
                  type="button"
                  className="cockpit-btn small"
                  aria-label={`打开闭环任务 ${route.title}`}
                  onClick={() => openWorkbenchTarget(route.taskTab, route.id)}
                >
                  <ClipboardList size={13} />
                  <span>看任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="knowledge-execution-grid">
        <div className="knowledge-execution-panel">
          <div className="knowledge-execution-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={16} />
              知识入口
            </strong>
            <small>{systemMap.usage_paths?.length || 0} 条使用路径</small>
          </div>
          <div className="knowledge-execution-list">
            {summary.usagePath ? (
              <button
                type="button"
                className="knowledge-execution-item"
                onClick={() => openWorkbenchTarget('Knowledge', summary.usagePath?.id || summary.usagePath?.title)}
              >
                <strong>{summary.usagePath.title || '未命名路径'}</strong>
                <span>{summary.usagePath.intent || '先回到知识中枢确认这条路径的目标。'}</span>
                <small>步骤 {(summary.usagePath.steps || []).length}</small>
              </button>
            ) : (
              <div className="knowledge-execution-item knowledge-execution-empty">
                <strong>还没有高频路径</strong>
                <span>建议先把日常巡检、专项修复和复盘链路整理成可复用路径。</span>
              </div>
            )}
            {summary.playbook && (
              <button
                type="button"
                className="knowledge-execution-item"
                onClick={() => openWorkbenchTarget('TaskCenter', summary.playbook?.id || summary.playbook?.title)}
              >
                <strong>{summary.playbook.title || '操作清单'}</strong>
                <span>{summary.playbook.goal || '把知识页里的清单转成任务草稿。'}</span>
                <small>{summary.playbook.frequency || '按需执行'}</small>
              </button>
            )}
            {summary.gap && (
              <button
                type="button"
                className="knowledge-execution-item"
                onClick={() => openWorkbenchTarget('Knowledge', summary.gap?.id || summary.gap?.title)}
              >
                <strong>{summary.gap.title || '能力缺口'}</strong>
                <span>{summary.gap.next || '回知识中枢梳理缺口。'}</span>
                <small>{summary.gap.severity || '未标记'}</small>
              </button>
            )}
          </div>
        </div>

        <div className="knowledge-execution-panel">
          <div className="knowledge-execution-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bot size={16} />
              能力与自动化
            </strong>
            <small>技能 {skills.length} · 工作流 {workflowDefinitions.length}</small>
          </div>
          <div className="knowledge-execution-list">
            {skills.slice(0, 2).map((skill) => (
              <button
                key={skill.id}
                type="button"
                className="knowledge-execution-item"
                onClick={() => openWorkbenchTarget('Assets', skill.id)}
              >
                <strong>{skill.name || skill.id}</strong>
                <span>去资产页看这个能力适合挂在哪条执行路径上。</span>
                <small>技能资产</small>
              </button>
            ))}
            {workflowDefinitions.slice(0, 1).map((workflow) => (
              <button
                key={workflow.name}
                type="button"
                className="knowledge-execution-item"
                onClick={() => openWorkbenchTarget('Workflows', workflow.name)}
              >
                <strong>{workflow.name || '自动化工作流'}</strong>
                <span>{workflow.description || '查看这个工作流的节点编排与回放结果。'}</span>
                <small>{workflow.steps || 0} 个节点</small>
              </button>
            ))}
            {!skills.length && !workflowDefinitions.length && (
              <div className="knowledge-execution-item knowledge-execution-empty">
                <strong>能力面还偏薄</strong>
                <span>建议优先给高频路径补技能说明、管线入口和工作流测试按钮。</span>
              </div>
            )}
          </div>
        </div>

        <div className="knowledge-execution-panel">
          <div className="knowledge-execution-panel-head">
            <strong style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch size={16} />
              执行与落地
            </strong>
            <small>任务 {tasks.length} · 编排历史 {workflows.length}/{workflowTotal}</small>
          </div>
          <div className="knowledge-execution-list">
            {summary.latestWorkflow && (
              <button
                type="button"
                className="knowledge-execution-item"
                onClick={() => openWorkbenchTarget('Workflows', summary.latestWorkflow?.id)}
              >
                <strong>{summary.latestWorkflow.task || summary.latestWorkflow.id}</strong>
                <span>最新工作流状态：{summary.latestWorkflow.status || '未知'}。</span>
                <small>{summary.latestWorkflow.updated || '刚刚更新'}</small>
              </button>
            )}
            {summary.latestTask && (
              <button
                type="button"
                className="knowledge-execution-item"
                onClick={() => openWorkbenchTarget('TaskCenter', summary.latestTask?.id)}
              >
                <strong>{summary.latestTask.title || summary.latestTask.id}</strong>
                <span>
                  {formatTaskStatus(summary.latestTask.status)} · {formatPriority(summary.latestTask.priority)}
                  {summary.latestTask.read_only ? ' · 只读草稿' : ''}
                </span>
                <small>{summary.latestTask.source?.title || summary.latestTask.source?.type || '任务池'}</small>
              </button>
            )}
            {summary.roadmapItem && (
              <button
                type="button"
                className="knowledge-execution-item"
                onClick={() => openWorkbenchTarget('SystemMap', summary.roadmapItem?.id || summary.roadmapItem?.title)}
              >
                <strong>{summary.roadmapItem.title || '路线图项'}</strong>
                <span>{summary.roadmapItem.problem || '回系统地图看这条能力补齐路线。'}</span>
                <small>{summary.roadmapItem.priority || '未标优先级'}</small>
              </button>
            )}
            {!summary.latestWorkflow && !summary.latestTask && (
              <div className="knowledge-execution-item knowledge-execution-empty">
                <strong>还没有闭环证据</strong>
                <span>先产出一条从知识页出发、落到任务中心的完整执行样本。</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="knowledge-execution-actions">
        <button type="button" className="cockpit-btn" onClick={() => openWorkbenchTarget('Knowledge')}>
          <BookOpen size={14} />
          <span>去知识中枢</span>
        </button>
        <button type="button" className="cockpit-btn" onClick={() => openWorkbenchTarget('Assets')}>
          <PlayCircle size={14} />
          <span>去资产页</span>
        </button>
        <button type="button" className="cockpit-btn" onClick={() => openWorkbenchTarget('Workflows')}>
          <GitBranch size={14} />
          <span>去工作流</span>
        </button>
        <button type="button" className="cockpit-btn" onClick={() => openWorkbenchTarget('TaskCenter')}>
          <ClipboardList size={14} />
          <span>去任务中心</span>
        </button>
      </div>
    </section>
  );
}

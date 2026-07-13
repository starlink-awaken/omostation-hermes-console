import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Bot, ClipboardList, GitBranch, PlayCircle } from 'lucide-react';

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
}

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

async function fetchJson<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response || !response.ok) {
      return fallback;
    }
    return (await response.json()) as T;
  } catch (error) {
    console.error(`Failed to fetch ${url}:`, error);
    return fallback;
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
}: KnowledgeExecutionWorkbenchProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [workflows, setWorkflows] = useState<WorkflowRecord[]>([]);
  const [skills, setSkills] = useState<SkillItem[]>([]);
  const [pipelines, setPipelines] = useState<string[]>([]);
  const [workflowDefinitions, setWorkflowDefinitions] = useState<WorkflowDefinition[]>([]);
  const [systemMap, setSystemMap] = useState<SystemMapLite>({});

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
        ),
        fetchJson<{ status?: string; workflows?: WorkflowRecord[] }>(
          '/api/metaos/workflows',
          { status: 'error', workflows: [] },
        ),
        fetchJson<{ skills?: SkillItem[] }>('/api/ecos/skills', { skills: [] }),
        fetchJson<PipelinePayload>('/api/pipelines', { pipelines: [] }),
        fetchJson<{ workflows?: WorkflowDefinition[] }>('/api/ecos/workflows', { workflows: [] }),
        fetchJson<SystemMapLite>('/api/cockpit/system-map', {}),
      ]);

      if (!active) {
        return;
      }

      setTasks(taskPayload.items || []);
      setWorkflows(workflowPayload.workflows || []);
      setSkills(skillPayload.skills || []);
      setPipelines(pipelinePayload.pipelines || []);
      setWorkflowDefinitions(workflowDefinitionPayload.workflows || []);
      setSystemMap(systemMapPayload || {});
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

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

  return (
    <section className="knowledge-execution-workbench antd-card">
      <div className="section-header" style={{ marginBottom: 0 }}>
        <div>
          <h2>{workbenchTitle}</h2>
          <p className="text-muted">
            把知识中枢、能力资产、自动化编排和任务落地串成一条日常可操作的路径。
          </p>
        </div>
      </div>

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
          <small>运行中 {summary.runningWorkflows} · 历史 {workflows.length}</small>
        </div>
        <button
          type="button"
          className="knowledge-execution-card knowledge-execution-card-wide"
          onClick={() => onNavigate?.(summary.nextTab)}
        >
          <span>建议下一步</span>
          <strong>{summary.nextAction}</strong>
          <small>点击进入 {summary.nextTab}</small>
        </button>
      </div>

      <div className="knowledge-execution-path">
        {EXECUTION_STEPS.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`knowledge-execution-step ${currentPage === step.id ? 'active' : ''}`}
            onClick={() => onNavigate?.(step.id)}
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
                onClick={() => onNavigate?.('Knowledge')}
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
                onClick={() => onNavigate?.('TaskCenter')}
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
                onClick={() => onNavigate?.('Knowledge')}
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
                onClick={() => onNavigate?.('Assets')}
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
                onClick={() => onNavigate?.('Workflows')}
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
            <small>任务 {tasks.length} · 编排历史 {workflows.length}</small>
          </div>
          <div className="knowledge-execution-list">
            {summary.latestWorkflow && (
              <button
                type="button"
                className="knowledge-execution-item"
                onClick={() => onNavigate?.('Workflows')}
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
                onClick={() => onNavigate?.('TaskCenter')}
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
                onClick={() => onNavigate?.('SystemMap')}
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
        <button type="button" className="antd-btn" onClick={() => onNavigate?.('Knowledge')}>
          <BookOpen size={14} />
          <span>去知识中枢</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => onNavigate?.('Assets')}>
          <PlayCircle size={14} />
          <span>去资产页</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => onNavigate?.('Workflows')}>
          <GitBranch size={14} />
          <span>去工作流</span>
        </button>
        <button type="button" className="antd-btn" onClick={() => onNavigate?.('TaskCenter')}>
          <ClipboardList size={14} />
          <span>去任务中心</span>
        </button>
      </div>
    </section>
  );
}

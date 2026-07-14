import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Loader,
  Pause,
  Play,
  X,
  Eye,
  RefreshCw,
  Copy,
} from 'lucide-react';
import ActionSurfacePanel from './ActionSurfacePanel';
import KnowledgeExecutionWorkbench from './KnowledgeExecutionWorkbench';

interface DomainAppSnapshot {
  id: string;
  name: string;
  domain: { id: string; name: string };
  runtime: {
    status: string;
    launch?: { status?: string; url?: string | null };
    api?: { status?: string; url?: string | null };
  };
  security_summary?: { posture?: string };
  auth?: { type?: string };
  freshness?: { status?: string | null };
  commands?: { start?: string | null; verify?: string[] };
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  created_at: string;
  updated_at: string;
  assignee?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  tags?: string[];
  read_only?: boolean;
  source?: {
    type: string;
    id: string;
    title: string;
  };
  draft?: {
    kind: string;
    copy_text: string;
    step_count: number;
    guard: string;
    evidence_fields?: {
      label?: string;
      value?: string;
      step_id?: string;
      page_id?: string;
      evidence?: string;
      done_when?: string;
    }[];
  };
}

type TaskStatus = 'all' | 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
type DraftSourceType =
  | 'system_map_project_portfolio'
  | 'system_map_verification_ready'
  | 'system_map_playbook'
  | 'system_map_domain_app'
  | 'system_map_capability_gap'
  | 'system_map_page_maturity';
type DraftLaneFilter = 'all' | DraftSourceType;

interface TaskNavigationTarget {
  tab: string;
  projectId?: string | null;
  usagePathId?: string | null;
  gapId?: string | null;
  taskQuery?: string;
}

interface IncomingTaskDraft {
  title: string;
  description: string;
  tags: string[];
  checklist: string[];
  copyText: string;
  sourceTarget: TaskNavigationTarget;
}

interface TaskCenterPageProps {
  initialSearchQuery?: string;
  incomingDraft?: IncomingTaskDraft | null;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: TaskNavigationTarget) => void;
}

function sourceTypeLabel(type?: string): string {
  if (type === 'system_map_project_portfolio') return '项目组合';
  if (type === 'system_map_verification_ready') return '验证补证';
  if (type === 'system_map_playbook') return '操作清单';
  if (type === 'system_map_domain_app') return '领域应用';
  if (type === 'system_map_capability_gap') return '能力缺口';
  if (type === 'system_map_page_maturity') return '页面能力';
  return '草稿来源';
}

const DRAFT_SOURCE_ORDER: DraftSourceType[] = [
  'system_map_verification_ready',
  'system_map_capability_gap',
  'system_map_page_maturity',
  'system_map_domain_app',
  'system_map_project_portfolio',
  'system_map_playbook',
];

function isDraftSourceType(value?: string): value is DraftSourceType {
  return DRAFT_SOURCE_ORDER.includes(value as DraftSourceType);
}

function sourceTypeDescription(type: DraftSourceType): string {
  if (type === 'system_map_verification_ready') return '优先把已有验证命令补成正式证据。';
  if (type === 'system_map_capability_gap') return '先补状态面、命令、探针和入口缺口。';
  if (type === 'system_map_page_maturity') return '把页面从 watch/gap 推到可日用。';
  if (type === 'system_map_domain_app') return '处理领域挂载、运行态和安全门。';
  if (type === 'system_map_project_portfolio') return '聚焦组合里最该先修的项目。';
  return '把跨页操作清单顺成一条可执行路径。';
}

function sourceTypeHint(type: DraftSourceType): string {
  if (type === 'system_map_verification_ready') return '建议入口：SystemMap / TaskCenter';
  if (type === 'system_map_capability_gap') return '建议入口：SystemMap 修复台';
  if (type === 'system_map_page_maturity') return '建议入口：来源页面';
  if (type === 'system_map_domain_app') return '建议入口：应用中心';
  if (type === 'system_map_project_portfolio') return '建议入口：项目态势';
  return '建议入口：执行页面';
}

function sourceTypeSearchKeyword(type: DraftSourceType): string {
  if (type === 'system_map_verification_ready') return '验证';
  if (type === 'system_map_capability_gap') return '缺口';
  if (type === 'system_map_page_maturity') return '页面';
  if (type === 'system_map_domain_app') return '领域';
  if (type === 'system_map_project_portfolio') return '项目';
  return '清单';
}

function sourceTypeDefaultTarget(type: DraftSourceType, task?: Task | null): TaskNavigationTarget {
  if (type === 'system_map_domain_app') {
    return { tab: 'DomainApps', taskQuery: task?.source?.id || '领域' };
  }
  if (type === 'system_map_capability_gap') {
    return { tab: 'SystemMap', gapId: task?.source?.id || null };
  }
  if (type === 'system_map_page_maturity') {
    return { tab: task?.source?.id || 'SystemMap' };
  }
  if (type === 'system_map_playbook') {
    const target = task ? resolveTaskTarget(task) : null;
    return { tab: target?.tab || 'SystemMap' };
  }
  return { tab: 'SystemMap', projectId: task?.source?.id || null };
}

function resolveTaskTarget(task: Task): TaskNavigationTarget | null {
  if (!task.read_only || !task.source?.type) return null;
  if (task.source.type === 'system_map_project_portfolio') {
    return { tab: 'SystemMap', projectId: task.source.id };
  }
  if (task.source.type === 'system_map_verification_ready') {
    return { tab: 'SystemMap', projectId: task.source.id };
  }
  if (task.source.type === 'system_map_domain_app') {
    return { tab: 'DomainApps', taskQuery: task.source.id };
  }
  if (task.source.type === 'system_map_capability_gap') {
    return { tab: 'SystemMap', gapId: task.source.id };
  }
  if (task.source.type === 'system_map_page_maturity') {
    return { tab: task.source.id || 'SystemMap' };
  }
  if (task.source.type === 'system_map_playbook') {
    const pageIds = (task.draft?.evidence_fields || [])
      .map((field) => field.page_id)
      .filter(Boolean) as string[];
    const preferredPage = pageIds.find((pageId) => pageId !== 'Home' && pageId !== 'SystemMap') || pageIds[0];
    return { tab: preferredPage || 'SystemMap' };
  }
  return null;
}

function sourceActionLabel(task: Task): string {
  if (!task.source?.type) return '打开来源';
  if (task.source.type === 'system_map_project_portfolio') return '查看项目态势';
  if (task.source.type === 'system_map_verification_ready') return '打开补证项目';
  if (task.source.type === 'system_map_domain_app') return '打开应用中心';
  if (task.source.type === 'system_map_capability_gap') return '查看能力缺口';
  if (task.source.type === 'system_map_page_maturity') return '打开来源页面';
  if (task.source.type === 'system_map_playbook') return '打开执行页面';
  return '打开来源';
}

function sourceCompletionHint(task: Task): string {
  if (!task.source?.type) return '确认任务完成定义，再继续承接。';
  if (task.source.type === 'system_map_project_portfolio') return '目标是把项目从组合阻塞里移出，并补齐最近状态证据。';
  if (task.source.type === 'system_map_verification_ready') return '目标是把已有验证命令跑成正式 workflow / closeout 证据。';
  if (task.source.type === 'system_map_domain_app') return '目标是把领域挂载的运行态、安全门和入口状态收口。';
  if (task.source.type === 'system_map_capability_gap') return '目标是让缺口回到页面、命令、探针和入口都可见。';
  if (task.source.type === 'system_map_page_maturity') return '目标是把页面从 gap/watch 推到可日用。';
  if (task.source.type === 'system_map_playbook') return '目标是让执行路径、证据和 done_when 形成完整闭环。';
  return '回来源面继续完成闭环。';
}

export default function TaskCenterPage({
  initialSearchQuery = '',
  incomingDraft = null,
  onNavigate,
  onOpenTarget,
}: TaskCenterPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [domainApps, setDomainApps] = useState<DomainAppSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<TaskStatus>('all');
  const [activeSourceFilter, setActiveSourceFilter] = useState<DraftLaneFilter>('all');
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [actionPending, setActionPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [incomingDraftNotice, setIncomingDraftNotice] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const [tasksResult, domainAppsResult] = await Promise.allSettled([
          fetch('/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true'),
          fetch('/api/domain-apps'),
        ]);

        if (tasksResult.status === 'fulfilled' && tasksResult.value.ok) {
          const data = await tasksResult.value.json();
          setTasks(data.items || []);
        }

        if (domainAppsResult.status === 'fulfilled' && domainAppsResult.value.ok) {
          const data = await domainAppsResult.value.json();
          setDomainApps(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
    const interval = setInterval(fetchTasks, 30000);
    return () => clearInterval(interval);
  }, [refreshToken]);

  useEffect(() => {
    setSearchQuery(initialSearchQuery);
    setActiveSourceFilter(isDraftSourceType(initialSearchQuery) ? initialSearchQuery : 'all');
  }, [initialSearchQuery]);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-muted" />;
      case 'in_progress':
        return <Loader size={16} className="text-primary spinning" />;
      case 'completed':
        return <CheckCircle size={16} className="text-success" />;
      case 'failed':
        return <AlertCircle size={16} className="text-danger" />;
      case 'cancelled':
        return <X size={16} className="text-muted" />;
      default:
        return <Clock size={16} className="text-muted" />;
    }
  };

  const getStatusText = (status: Task['status']) => {
    switch (status) {
      case 'pending': return '待处理';
      case 'in_progress': return '进行中';
      case 'completed': return '已完成';
      case 'failed': return '失败';
      case 'cancelled': return '已取消';
      default: return '未知';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'pending': return '#95a5a6';
      case 'in_progress': return '#3498db';
      case 'completed': return '#27ae60';
      case 'failed': return '#e74c3c';
      case 'cancelled': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return '#95a5a6';
      case 'medium': return '#3498db';
      case 'high': return '#f39c12';
      case 'critical': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const getPriorityText = (priority: Task['priority']) => {
    switch (priority) {
      case 'low': return '低';
      case 'medium': return '中';
      case 'high': return '高';
      case 'critical': return '紧急';
      default: return '未知';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (activeSourceFilter !== 'all' && task.source?.type !== activeSourceFilter) return false;
    if (searchQuery) {
      const haystack = [
        task.id,
        task.title,
        task.description || '',
        task.source?.type || '',
        task.source?.id || '',
        task.source?.title || '',
        ...(task.tags || []),
      ].join(' ').toLowerCase();
      if (!haystack.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  const getStatusStats = () => {
    return {
      pending: tasks.filter(t => t.status === 'pending').length,
      in_progress: tasks.filter(t => t.status === 'in_progress').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
    };
  };

  const stats = getStatusStats();

  const draftCount = tasks.filter(t => t.read_only).length;
  const playbookDraftCount = tasks.filter(t => t.read_only && t.source?.type === 'system_map_playbook').length;
  const projectDraftCount = tasks.filter(t => t.read_only && t.source?.type === 'system_map_project_portfolio').length;
  const verificationReadyDraftCount = tasks.filter(t => t.read_only && t.source?.type === 'system_map_verification_ready').length;
  const domainAppDraftCount = tasks.filter(t => t.read_only && t.source?.type === 'system_map_domain_app').length;
  const capabilityGapDraftCount = tasks.filter(t => t.read_only && t.source?.type === 'system_map_capability_gap').length;
  const pageMaturityDraftCount = tasks.filter(t => t.read_only && t.source?.type === 'system_map_page_maturity').length;
  const draftTasks = tasks.filter((task) => task.read_only && isDraftSourceType(task.source?.type));
  const laneSummaries = DRAFT_SOURCE_ORDER.map((type) => {
    const laneTasks = draftTasks
      .filter((task) => task.source?.type === type)
      .sort((left, right) => {
        const priorityWeight = (priority?: Task['priority']) => (
          priority === 'critical' ? 4
            : priority === 'high' ? 3
              : priority === 'medium' ? 2
                : priority === 'low' ? 1
                  : 0
        );
        return priorityWeight(right.priority) - priorityWeight(left.priority);
      });
    const topTask = laneTasks[0] || null;
    const topTaskTarget = topTask ? resolveTaskTarget(topTask) : null;
    const evidenceCount = laneTasks.reduce((total, task) => total + (task.draft?.evidence_fields?.length || 0), 0);
    const sourceIds = Array.from(new Set(laneTasks.map((task) => task.source?.id).filter(Boolean) as string[]));
    return {
      type,
      title: sourceTypeLabel(type),
      count: laneTasks.length,
      description: sourceTypeDescription(type),
      hint: sourceTypeHint(type),
      keyword: sourceTypeSearchKeyword(type),
      topTask,
      topTaskTarget: topTaskTarget || sourceTypeDefaultTarget(type, topTask),
      evidenceCount,
      sourceIds,
      nextAction: topTask?.description || sourceCompletionHint(topTask || { source: { type, id: '', title: '' } } as Task),
    };
  });
  const activeLane = activeSourceFilter === 'all'
    ? null
    : laneSummaries.find((lane) => lane.type === activeSourceFilter) || null;
  const routingSummary = {
    populated: laneSummaries.filter((lane) => lane.count > 0).length,
    evidence: laneSummaries.reduce((total, lane) => total + lane.evidenceCount, 0),
    mapped: laneSummaries.filter((lane) => lane.topTaskTarget?.tab && lane.count > 0).length,
  };
  const focusTasks = [...filteredTasks]
    .sort((left, right) => {
      const weight = (priority?: Task['priority']) => (
        priority === 'critical' ? 4
          : priority === 'high' ? 3
            : priority === 'medium' ? 2
              : priority === 'low' ? 1
                : 0
      );
      return weight(right.priority) - weight(left.priority);
    })
    .slice(0, 4);
  const focusTask = selectedTask || focusTasks[0] || null;
  const focusTaskTarget = focusTask ? resolveTaskTarget(focusTask) : null;
  const focusTaskRelatedApp = focusTask?.source?.type === 'system_map_domain_app'
    ? domainApps.find((app) => app.id === focusTask.source?.id) || null
    : null;
  const selectedDomainApp = selectedTask?.source?.type === 'system_map_domain_app'
    ? domainApps.find((app) => app.id === selectedTask.source?.id) || null
    : null;
  const closeLoopGroups = [
    {
      id: 'map',
      title: '系统地图修复',
      description: '项目组合、验证补证和能力缺口统一回系统地图收口。',
      keyword: '验证',
      targetTab: 'SystemMap',
      tasks: draftTasks.filter((task) => (
        task.source?.type === 'system_map_project_portfolio'
        || task.source?.type === 'system_map_verification_ready'
        || task.source?.type === 'system_map_capability_gap'
      )),
    },
    {
      id: 'page',
      title: '页面补位',
      description: '页面成熟度和执行清单一起回来源页面继续补位。',
      keyword: '页面',
      targetTab: 'SystemMap',
      tasks: draftTasks.filter((task) => (
        task.source?.type === 'system_map_page_maturity'
        || task.source?.type === 'system_map_playbook'
      )),
    },
    {
      id: 'domain',
      title: '领域挂载',
      description: '领域应用类任务统一回应用中心看运行态和安全门。',
      keyword: '领域',
      targetTab: 'DomainApps',
      tasks: draftTasks.filter((task) => task.source?.type === 'system_map_domain_app'),
    },
    {
      id: 'live',
      title: '在途执行',
      description: '真实任务留在任务中心推进，避免只处理只读草稿。',
      keyword: 'pending',
      targetTab: 'TaskCenter',
      tasks: tasks.filter((task) => !task.read_only && (task.status === 'pending' || task.status === 'in_progress')),
    },
  ] as const;
  const domainDraftHandoffs = closeLoopGroups
    .find((group) => group.id === 'domain')
    ?.tasks.slice(0, 3)
    .map((task) => ({
      task,
      target: resolveTaskTarget(task),
      appKey: task.source?.id || task.title || task.id,
      sourceTitle: task.source?.title || task.description || '领域应用态势',
      nextAction: task.description || sourceCompletionHint(task),
    })) || [];
  const sourceBandRows = closeLoopGroups.map((group) => {
    const firstTask = group.tasks[0] || null;
    const target = firstTask ? resolveTaskTarget(firstTask) : null;
    const relatedLane = firstTask?.source?.type
      ? laneSummaries.find((lane) => lane.type === firstTask.source?.type) || null
      : null;
    const tone = group.tasks.length === 0 ? 'online' : group.id === 'live' ? 'degraded' : 'warning';

    return {
      id: group.id,
      title: group.title,
      tone,
      count: group.tasks.length,
      summary: group.description,
      signal: relatedLane
        ? `${relatedLane.title} · ${relatedLane.count} 条`
        : group.id === 'live'
          ? `真实任务 ${group.tasks.length} 条`
          : `目标面 ${group.targetTab}`,
      nextAction: firstTask?.description || sourceCompletionHint(firstTask || { status: 'pending' } as Task),
      objectTarget: target || { tab: group.targetTab, taskQuery: group.keyword },
      taskTarget: group.targetTab === 'TaskCenter'
        ? { tab: 'TaskCenter', taskQuery: group.keyword }
        : { tab: 'TaskCenter', taskQuery: firstTask?.source?.id || group.keyword },
    };
  });
  const taskActionItems = [
    {
      id: 'task-system-map',
      title: '回系统地图核对缺口',
      detail: '把读写草稿、页面成熟度和能力缺口统一挂回系统地图收口。',
      actionLabel: '进入系统地图',
      actionType: 'navigate' as const,
      actionValue: 'SystemMap',
    },
    {
      id: 'task-domain-apps',
      title: '回应用中心处理领域项',
      detail: '领域应用类草稿和挂载问题，优先回应用中心看运行态和安全门。',
      actionLabel: '进入应用中心',
      actionType: 'navigate' as const,
      actionValue: 'DomainApps',
    },
    {
      id: 'task-protocol',
      title: '回协议面补执行约束',
      detail: '涉及桥接、证据和工作流约束的任务，继续回协议面补执行边界。',
      actionLabel: '进入协议面',
      actionType: 'navigate' as const,
      actionValue: 'Protocol',
    },
  ];

  const copyTaskDraft = async (task: Task) => {
    if (!task.draft?.copy_text) return;
    await navigator.clipboard.writeText(task.draft.copy_text);
  };

  const openTaskSource = (task: Task) => {
    const target = resolveTaskTarget(task);
    if (!target) return;
    if (onOpenTarget) {
      onOpenTarget(target);
      return;
    }
    onNavigate?.(target.tab);
  };

  const runTaskAction = async (taskId: string, action: 'pause' | 'resume' | 'cancel', nextStatus: Task['status']) => {
    setActionPending(taskId);
    setActionError(null);
    setActionNotice(null);
    try {
      const response = await fetch(`/api/tasks/${taskId}/${action}`, { method: 'POST' });
      let payload: { error?: string } = {};
      try {
        payload = await response.json();
      } catch {
        // Some control-plane responses intentionally have no JSON body.
      }
      if (!response.ok) throw new Error(payload.error || response.statusText || '控制面拒绝了这次操作');
      setTasks((currentTasks) => currentTasks.map((task) => (
        task.id === taskId ? { ...task, status: nextStatus } : task
      )));
      setSelectedTask((currentTask) => currentTask?.id === taskId ? { ...currentTask, status: nextStatus } : currentTask);
      setActionNotice(`任务已${action === 'pause' ? '暂停' : action === 'resume' ? '恢复' : '取消'}。`);
    } catch (error) {
      console.error('Failed to pause task:', error);
      setActionError(`任务操作失败：${error instanceof Error ? error.message : '请稍后重试。'}`);
    }
    finally {
      setActionPending(null);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes} 分钟前`;
    if (hours < 24) return `${hours} 小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="task-center-page">
      <KnowledgeExecutionWorkbench currentPage="TaskCenter" onNavigate={onNavigate} />

      <ActionSurfacePanel
        title="任务动作区"
        subtitle="先看高优先任务，再决定回系统地图、应用中心还是协议面承接，避免任务页只剩筛选列表。"
        statusText={`${filteredTasks.length} 条任务 / ${draftCount} 条草稿 / ${stats.in_progress} 条进行中`}
        items={taskActionItems}
        onNavigate={onNavigate}
      />

      {incomingDraft && (
        <section className="services-section" role="region" aria-label="外部送达任务草稿">
          <div className="section-header">
            <div>
              <h2>外部送达任务草稿</h2>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                这份草稿从 cockpit 其他页面直接送来。你可以先复制、按标题过滤，再决定回来源页还是继续把它落成正式任务。
              </p>
            </div>
            <span className="status-badge degraded">跨页草稿</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>{incomingDraft.title}</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                  {incomingDraft.description}
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {incomingDraft.tags.map((tag) => (
                  <span key={tag} className="status-badge degraded">{tag}</span>
                ))}
              </div>
            </article>

            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>建议步骤</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                  先顺着这几步补位，再把结果沉回正式任务或证据。
                </p>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {incomingDraft.checklist.slice(0, 3).map((item, index) => (
                  <div key={`${incomingDraft.title}-${index}`} style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                    <span className="text-muted" style={{ fontSize: 12 }}>{`步骤 ${index + 1}`}</span>
                    <strong style={{ fontSize: 13 }}>{item}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>承接动作</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                  直接给你复制、过滤和回来源的入口，不让草稿只停在说明文字。
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  className="antd-btn small"
                  aria-label={`复制外部送达任务草稿 ${incomingDraft.title}`}
                  onClick={async () => {
                    await navigator.clipboard.writeText(incomingDraft.copyText);
                    setIncomingDraftNotice(`已复制外部草稿：${incomingDraft.title}`);
                  }}
                >
                  <Copy size={13} />
                  <span>复制草稿</span>
                </button>
                <button
                  className="antd-btn small"
                  aria-label={`按草稿过滤任务 ${incomingDraft.title}`}
                  onClick={() => setSearchQuery(incomingDraft.title)}
                >
                  <RefreshCw size={13} />
                  <span>按标题过滤</span>
                </button>
                <button
                  className="antd-btn small"
                  aria-label={`打开外部草稿来源 ${incomingDraft.title}`}
                  onClick={() => {
                    if (onOpenTarget) {
                      onOpenTarget(incomingDraft.sourceTarget);
                      return;
                    }
                    onNavigate?.(incomingDraft.sourceTarget.tab);
                  }}
                >
                  <Eye size={13} />
                  <span>回来源页</span>
                </button>
              </div>
              {incomingDraftNotice && (
                <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{incomingDraftNotice}</p>
              )}
            </article>
          </div>
        </section>
      )}

      <section className="services-section" role="region" aria-label="执行路由架构总表">
        <div className="section-header">
          <div>
            <h2>执行路由架构总表</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把每类草稿任务的来源车道、对象入口、证据密度和下一步摊开，先决定该回哪个对象面，再继续筛任务。
            </p>
          </div>
          <span className="status-badge degraded">
            路由车道 {routingSummary.populated} / {laneSummaries.length}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: '活跃车道', value: `${routingSummary.populated}`, helper: '当前至少有一条任务的来源类型。', tone: 'degraded' },
            { label: '对象入口', value: `${routingSummary.mapped}`, helper: '已经能直达对象面的来源车道。', tone: routingSummary.mapped === routingSummary.populated ? 'online' : 'degraded' },
            { label: '来源证据', value: `${routingSummary.evidence}`, helper: '草稿里累计带上的 evidence 字段数。', tone: 'online' },
            { label: '当前筛选', value: activeLane ? activeLane.title : '全部', helper: activeLane ? activeLane.hint : '还未锁定某条处理车道。', tone: activeLane ? 'degraded' : 'online' },
          ].map((item) => (
            <article key={item.label} className="antd-card" style={{ padding: 16, display: 'grid', gap: 6 }}>
              <span className="text-muted" style={{ fontSize: 12 }}>{item.label}</span>
              <strong style={{ fontSize: 20 }}>{item.value}</strong>
              <small className={`text-muted ${item.tone}`} style={{ fontSize: 12 }}>{item.helper}</small>
            </article>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {laneSummaries.map((lane) => (
            <article key={`route-${lane.type}`} className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <strong style={{ fontSize: 15 }}>{lane.title}</strong>
                  <span className={`status-badge ${lane.count > 0 ? 'degraded' : 'online'}`}>待处理 {lane.count}</span>
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>{lane.description}</p>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>对象入口</span>
                  <strong>{lane.topTaskTarget.tab}</strong>
                  <small className="text-muted" style={{ fontSize: 12 }}>{lane.hint}</small>
                </div>
                <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>代表对象</span>
                  <strong>{lane.sourceIds.slice(0, 2).join(' · ') || '当前没有对象'}</strong>
                  <small className="text-muted" style={{ fontSize: 12 }}>
                    证据 {lane.evidenceCount} 条 · {lane.topTask?.title || '继续等待来源草稿进入这条车道'}
                  </small>
                </div>
                <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>下一步</span>
                  <strong style={{ fontSize: 13, lineHeight: 1.5 }}>{lane.nextAction}</strong>
                  <small className="text-muted" style={{ fontSize: 12 }}>过滤词：{lane.keyword}</small>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  className="antd-btn small"
                  aria-label={`打开执行路由 ${lane.title}`}
                  onClick={() => {
                    if (lane.topTask) {
                      openTaskSource(lane.topTask);
                      return;
                    }
                    if (onOpenTarget) {
                      onOpenTarget(lane.topTaskTarget);
                      return;
                    }
                    onNavigate?.(lane.topTaskTarget.tab);
                  }}
                >
                  <Eye size={13} />
                  <span>看对象</span>
                </button>
                <button
                  className="antd-btn small"
                  aria-label={`过滤执行路由 ${lane.title}`}
                  onClick={() => {
                    setActiveSourceFilter(lane.type);
                    setSearchQuery(lane.keyword);
                    if (lane.topTask) setSelectedTask(lane.topTask);
                  }}
                >
                  <RefreshCw size={13} />
                  <span>过滤任务</span>
                </button>
                {lane.topTask && (
                  <button
                    className="antd-btn small"
                    aria-label={`查看执行路由代表任务 ${lane.title}`}
                    onClick={() => setSelectedTask(lane.topTask as Task)}
                  >
                    <Copy size={13} />
                    <span>看代表任务</span>
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section" role="region" aria-label="任务来源带总表">
        <div className="section-header">
          <div>
            <h2>任务来源带总表</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              先看任务属于系统地图修复、页面补位、领域挂载还是在途执行，再决定回哪个面继续收口，不让任务中心重新变成杂物堆。
            </p>
          </div>
          <span className="status-badge degraded">
            来源带 {sourceBandRows.filter((row) => row.count > 0).length}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {sourceBandRows.map((row) => (
            <article key={row.id} className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                  <strong style={{ fontSize: 15 }}>{row.title}</strong>
                  <span className={`status-badge ${row.tone}`}>待处理 {row.count}</span>
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>{row.summary}</p>
              </div>
              <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                <span className="text-muted" style={{ fontSize: 12 }}>当前信号</span>
                <strong>{row.signal}</strong>
                <small className="text-muted" style={{ fontSize: 12 }}>{row.nextAction}</small>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                <button
                  className="antd-btn small"
                  aria-label={`打开来源带 ${row.title}`}
                  onClick={() => {
                    if (onOpenTarget) {
                      onOpenTarget(row.objectTarget);
                      return;
                    }
                    onNavigate?.(row.objectTarget.tab);
                  }}
                >
                  <Eye size={13} />
                  <span>看对象</span>
                </button>
                <button
                  className="antd-btn small"
                  aria-label={`打开来源带任务 ${row.title}`}
                  onClick={() => {
                    if (onOpenTarget) {
                      onOpenTarget(row.taskTarget);
                      return;
                    }
                    if (row.taskTarget.tab === 'TaskCenter' && row.taskTarget.taskQuery) {
                      setSearchQuery(row.taskTarget.taskQuery);
                      return;
                    }
                    onNavigate?.(row.taskTarget.tab);
                  }}
                >
                  <RefreshCw size={13} />
                  <span>看任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {focusTask && (
        <section className="services-section" role="region" aria-label="当前任务来源工作台">
          <div className="section-header">
            <div>
              <h2>当前任务来源工作台</h2>
              <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                把当前焦点任务的来源、完成定义、证据和回跳入口放到列表前面，避免选中任务后还得自己找它应该回哪一页收口。
              </p>
            </div>
            <span className={`status-badge ${focusTask.read_only ? 'degraded' : 'online'}`}>
              {focusTask.read_only ? sourceTypeLabel(focusTask.source?.type) : '真实任务'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>{focusTask.title}</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                  {focusTask.source?.title || focusTask.description || '当前任务还缺来源说明。'}
                </p>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>来源类型</span>
                  <strong>{focusTask.source?.type ? `${sourceTypeLabel(focusTask.source.type)} · ${focusTask.source.id}` : '运行任务'}</strong>
                  <small className="text-muted" style={{ fontSize: 12 }}>{sourceCompletionHint(focusTask)}</small>
                </div>
                <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>验收线索</span>
                  <strong>{focusTask.draft?.evidence_fields?.length || 0} 条证据字段</strong>
                  <small className="text-muted" style={{ fontSize: 12 }}>{focusTask.draft?.guard || '继续补执行证据和完成定义。'}</small>
                </div>
              </div>
            </article>

            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>闭环入口</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                  不让任务停在队列里，直接给出应该回去的页面或对象。
                </p>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {focusTaskTarget && (
                  <button
                    className="antd-btn small"
                    aria-label="打开当前任务来源工作台入口"
                    onClick={() => openTaskSource(focusTask)}
                  >
                    <Eye size={13} />
                    <span>{sourceActionLabel(focusTask)}</span>
                  </button>
                )}
                {focusTask.read_only && focusTask.draft?.copy_text && (
                  <button
                    className="antd-btn small"
                    aria-label="复制当前任务来源草稿"
                    onClick={() => { void copyTaskDraft(focusTask); }}
                  >
                    <Copy size={13} />
                    <span>复制草稿</span>
                  </button>
                )}
                {focusTask.source?.type === 'system_map_domain_app' && (
                  <button
                    className="antd-btn small"
                    aria-label="按领域重新过滤当前任务"
                    onClick={() => {
                      setActiveSourceFilter('system_map_domain_app');
                      setSearchQuery(focusTask.source?.id || focusTask.source?.title || '');
                    }}
                  >
                    <RefreshCw size={13} />
                    <span>按对象过滤</span>
                  </button>
                )}
              </div>
            </article>

            <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>相关对象快照</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                  任务如果已经对应到领域对象，就把运行态、安全态和入口顺手带上。
                </p>
              </div>
              {focusTaskRelatedApp ? (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                    <span className="text-muted" style={{ fontSize: 12 }}>领域对象</span>
                    <strong>{focusTaskRelatedApp.name} · {focusTaskRelatedApp.domain.name}</strong>
                    <small className="text-muted" style={{ fontSize: 12 }}>
                      运行 {focusTaskRelatedApp.runtime.status || 'unknown'} · 安全 {focusTaskRelatedApp.security_summary?.posture || 'unknown'} · 认证 {focusTaskRelatedApp.auth?.type || '未登记'}
                    </small>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                      className="antd-btn small"
                      aria-label="打开当前任务相关应用"
                      onClick={() => {
                        if (onOpenTarget) {
                          onOpenTarget({ tab: 'DomainApps', taskQuery: focusTaskRelatedApp.id });
                          return;
                        }
                        onNavigate?.('DomainApps');
                      }}
                    >
                      <Eye size={13} />
                      <span>打开应用</span>
                    </button>
                    {focusTaskRelatedApp.commands?.start && (
                      <button
                        className="antd-btn small"
                        aria-label="复制当前任务相关应用启动命令"
                        onClick={() => navigator.clipboard.writeText(focusTaskRelatedApp.commands?.start || '')}
                      >
                        <Copy size={13} />
                        <span>复制启动命令</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="home-focus-empty">当前焦点任务没有直接绑定领域对象。</div>
              )}
            </article>
          </div>
        </section>
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>任务承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把高优先任务、可回写入口和草稿承接页放在列表前面，让任务页先给出下一步而不是只给你一堆卡片。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">待处理 {stats.pending}</span>
            <span className="status-badge online">进行中 {stats.in_progress}</span>
            <span className="status-badge degraded">草稿 {draftCount}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>高优先任务</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先挑最该承接的任务，再决定是直接处理、打开来源还是继续分流。</p>
            </div>
            {focusTasks.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有可承接任务。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {focusTasks.map((task) => (
                  <button
                    key={`focus-${task.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看任务 ${task.title}`}
                    onClick={() => setSelectedTask(task)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{task.title}</strong>
                      <p>{getPriorityText(task.priority)}优先级 · {getStatusText(task.status)}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>{task.source?.title || task.description || '点击后在右侧详情面继续承接。'}</span>
                    </div>
                    <Eye size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>回写去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>任务页只是队列，真正闭环还得继续回系统地图、应用中心和协议面。</p>
            </div>
            {[
              { id: 'SystemMap', label: '系统地图', reason: '回看缺口、页面和项目入口。', aria: '打开任务承接到系统地图' },
              { id: 'DomainApps', label: '应用中心', reason: '处理领域应用和外部挂载问题。', aria: '打开任务承接到应用中心' },
              { id: 'Protocol', label: '协议面', reason: '补约束、桥接和执行流程。', aria: '打开任务承接到协议面' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => onNavigate?.(page.id)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.label}</strong>
                  <p>{page.reason}</p>
                </div>
                <RefreshCw size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>领域任务承接台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把家庭驾驶舱、family-hub、OPC 这类领域草稿单独拉出来，直接给入口对象、承接页面和下一步，避免领域任务混在大队列里失焦。
            </p>
          </div>
          <span className={`status-badge ${domainDraftHandoffs.length > 0 ? 'degraded' : 'online'}`}>
            领域草稿 {domainDraftHandoffs.length}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {domainDraftHandoffs.map(({ task, target, appKey, sourceTitle, nextAction }) => (
            <article key={`domain-handoff-${task.id}`} className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>{task.title}</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>{sourceTitle}</p>
              </div>

              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>承接对象</span>
                  <strong>{appKey}</strong>
                  <small className="text-muted" style={{ fontSize: 12 }}>建议入口：应用中心</small>
                </div>
                <div style={{ display: 'grid', gap: 4, padding: 12, border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                  <span className="text-muted" style={{ fontSize: 12 }}>下一步</span>
                  <strong style={{ fontSize: 13, lineHeight: 1.5 }}>{nextAction}</strong>
                  <small className="text-muted" style={{ fontSize: 12 }}>{sourceCompletionHint(task)}</small>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {target ? (
                  <button
                    className="antd-btn small"
                    aria-label={`打开领域承接 ${appKey}`}
                    onClick={() => openTaskSource(task)}
                  >
                    <Eye size={13} />
                    <span>{sourceActionLabel(task)}</span>
                  </button>
                ) : null}
                <button
                  className="antd-btn small"
                  aria-label={`查看领域任务 ${task.title}`}
                  onClick={() => setSelectedTask(task)}
                >
                  <RefreshCw size={13} />
                  <span>查看任务</span>
                </button>
                {task.read_only && task.draft?.copy_text ? (
                  <button
                    className="antd-btn small"
                    aria-label={`复制领域草稿 ${appKey}`}
                    onClick={() => { void copyTaskDraft(task); }}
                  >
                    <Copy size={13} />
                    <span>复制草稿</span>
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {domainDraftHandoffs.length === 0 && (
            <div className="home-focus-empty">当前没有待承接的领域应用草稿</div>
          )}
        </div>
      </section>

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>任务闭环控制台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把任务按闭环去向拆成系统地图修复、页面补位、领域挂载和在途执行四条带，先决定该回哪个面继续推进。
            </p>
          </div>
          <span className="status-badge degraded">
            闭环组 {closeLoopGroups.filter((group) => group.tasks.length > 0).length}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {closeLoopGroups.map((group) => (
            <article key={group.id} className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gap: 6 }}>
                <strong style={{ fontSize: 15 }}>{group.title}</strong>
                <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>{group.description}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span className={`status-badge ${group.tasks.length > 0 ? 'degraded' : 'online'}`}>待处理 {group.tasks.length}</span>
                <small className="text-muted">{group.targetTab}</small>
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {group.tasks.slice(0, 3).map((task) => (
                  <button
                    key={`${group.id}-${task.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看闭环任务 ${task.title}`}
                    onClick={() => setSelectedTask(task)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{task.title}</strong>
                      <p>{task.source?.id || getStatusText(task.status)}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>{task.description || sourceCompletionHint(task)}</span>
                    </div>
                    <Eye size={14} />
                  </button>
                ))}
                {group.tasks.length === 0 && (
                  <div className="home-focus-empty">当前没有这一类待处理任务</div>
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 'auto' }}>
                <button
                  className="antd-btn small"
                  aria-label={`打开闭环入口 ${group.title}`}
                  onClick={() => {
                    if (group.targetTab === 'TaskCenter') {
                      setFilterStatus('pending');
                      return;
                    }
                    onNavigate?.(group.targetTab);
                  }}
                >
                  <Eye size={13} />
                  <span>打开入口</span>
                </button>
                <button
                  className="antd-btn small"
                  aria-label={`过滤闭环任务 ${group.title}`}
                  onClick={() => {
                    setSearchQuery(group.keyword);
                    if (group.id === 'domain') setActiveSourceFilter('system_map_domain_app');
                    if (group.id === 'page') setActiveSourceFilter('system_map_page_maturity');
                    if (group.id === 'map') setActiveSourceFilter('system_map_verification_ready');
                  }}
                >
                  <RefreshCw size={13} />
                  <span>过滤队列</span>
                </button>
              </div>
            </article>
          ))}
        </div>

        {focusTask && (
          <div className="task-lane-focus" style={{ marginTop: 16 }}>
            <div>
              <strong>当前闭环焦点</strong>
              <span>{focusTask.title}</span>
              <small>{sourceCompletionHint(focusTask)}</small>
            </div>
            <div className="task-lane-focus-actions">
              {focusTask.read_only && focusTask.draft?.copy_text && (
                <button
                  className="antd-btn small"
                  aria-label="复制当前闭环草稿"
                  onClick={() => { void copyTaskDraft(focusTask); }}
                >
                  <Copy size={13} />
                  <span>复制草稿</span>
                </button>
              )}
              {resolveTaskTarget(focusTask) && (
                <button
                  className="antd-btn small"
                  aria-label="打开当前闭环来源"
                  onClick={() => openTaskSource(focusTask)}
                >
                  <Eye size={13} />
                  <span>{sourceActionLabel(focusTask)}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 任务统计 */}
      <section className="task-stats">
        <div className="stats-grid">
          <div className="stat-card">
            <Clock size={24} className="text-muted" />
            <div className="stat-info">
              <h3>待处理</h3>
              <p className="stat-value">{stats.pending}</p>
            </div>
          </div>
          <div className="stat-card">
            <Loader size={24} className="text-primary" />
            <div className="stat-info">
              <h3>进行中</h3>
              <p className="stat-value">{stats.in_progress}</p>
            </div>
          </div>
          <div className="stat-card">
            <CheckCircle size={24} className="text-success" />
            <div className="stat-info">
              <h3>已完成</h3>
              <p className="stat-value">{stats.completed}</p>
            </div>
          </div>
          <div className="stat-card">
            <AlertCircle size={24} className="text-danger" />
            <div className="stat-info">
              <h3>失败</h3>
              <p className="stat-value">{stats.failed}</p>
            </div>
          </div>
          <div className="stat-card">
            <Copy size={24} className="text-primary" />
            <div className="stat-info">
              <h3>操作草稿</h3>
              <p className="stat-value">{draftCount}</p>
              <span className="task-stat-subline">清单 {playbookDraftCount} · 项目 {projectDraftCount} · 验证 {verificationReadyDraftCount} · 领域 {domainAppDraftCount} · 缺口 {capabilityGapDraftCount} · 页面 {pageMaturityDraftCount}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="services-section task-lane-section">
        <div className="section-header">
          <div>
            <h2 style={{ margin: 0, fontSize: 16 }}>处理车道</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把草稿按验证、缺口、页面、领域、项目和清单分车道，先决定处理面，再进入具体任务。
            </p>
          </div>
          {activeLane ? (
            <button
              className="antd-btn small"
              aria-label="清除当前车道筛选"
              onClick={() => setActiveSourceFilter('all')}
            >
              <X size={13} />
              <span>清除筛选</span>
            </button>
          ) : null}
        </div>
        <div className="task-lane-grid">
          {laneSummaries.map((lane) => (
            <button
              key={lane.type}
              className={`task-lane-card ${activeSourceFilter === lane.type ? 'active' : ''}`}
              aria-label={`切换车道 ${lane.title}`}
              onClick={() => {
                setActiveSourceFilter(lane.type);
                if (lane.topTask) setSelectedTask(lane.topTask);
              }}
              title={lane.description}
            >
              <span>{lane.title}</span>
              <strong>{lane.count}</strong>
              <small>{lane.description}</small>
              <em>{lane.topTask?.source?.id || lane.topTask?.title || lane.hint}</em>
            </button>
          ))}
        </div>
        {activeLane && (
          <div className="task-lane-focus">
            <div>
              <strong>{activeLane.title}</strong>
              <span>{activeLane.description}</span>
              <small>{activeLane.hint}</small>
            </div>
            <div className="task-lane-focus-actions">
              <button
                className="antd-btn small"
                aria-label={`打开当前车道 ${activeLane.title} 的搜索`}
                onClick={() => setSearchQuery(activeLane.keyword)}
              >
                <RefreshCw size={13} />
                <span>带关键字过滤</span>
              </button>
              {activeLane.topTask && resolveTaskTarget(activeLane.topTask) && (
                <button
                  className="antd-btn small"
                  aria-label={`打开当前车道入口 ${activeLane.title}`}
                  onClick={() => openTaskSource(activeLane.topTask as Task)}
                >
                  <Eye size={13} />
                  <span>{sourceActionLabel(activeLane.topTask)}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 过滤器 */}
      <div className="task-filters">
        <div className="filter-group">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as TaskStatus)}
          >
            <option value="all">全部状态</option>
            <option value="pending">待处理</option>
            <option value="in_progress">进行中</option>
            <option value="completed">已完成</option>
            <option value="failed">失败</option>
            <option value="cancelled">已取消</option>
          </select>
        </div>
        <div className="filter-group">
          <input
            type="text"
            placeholder="搜索任务..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button
          className="btn btn-outline"
          aria-label="刷新任务"
          onClick={() => setRefreshToken((value) => value + 1)}
        >
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      {actionError && (
        <div role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', border: '1px solid rgba(255, 71, 87, 0.35)', borderRadius: 'var(--antd-radius-md)', background: 'rgba(255, 71, 87, 0.08)', color: 'var(--antd-error)' }}>
          <span>{actionError}</span>
          <button className="btn btn-sm btn-outline" aria-label="关闭任务操作错误" onClick={() => setActionError(null)}><X size={14} /></button>
        </div>
      )}
      {actionNotice && (
        <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', border: '1px solid rgba(82, 196, 26, 0.35)', borderRadius: 'var(--antd-radius-md)', background: 'rgba(82, 196, 26, 0.08)', color: 'var(--antd-success)' }}>
          <span>{actionNotice}</span>
          <button className="btn btn-sm btn-outline" aria-label="关闭任务操作提示" onClick={() => setActionNotice(null)}><X size={14} /></button>
        </div>
      )}

      {/* 任务列表 */}
      <div className="tasks-list">
        {filteredTasks.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={48} className="text-success" />
            <h3>暂无任务</h3>
            <p>所有任务已完成</p>
          </div>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`task-card ${selectedTask?.id === task.id ? 'selected' : ''}`}
              onClick={() => setSelectedTask(task)}
            >
              <div className="task-header">
                <div className="task-id">{task.id}</div>
                <div className="task-priority">
                  <span
                    className="priority-badge"
                    style={{ 
                      color: getPriorityColor(task.priority),
                      borderColor: getPriorityColor(task.priority),
                    }}
                  >
                    {getPriorityText(task.priority)}
                  </span>
                </div>
              </div>
              <div className="task-title">{task.title}</div>
              {task.read_only && (
                <div className="task-draft-banner">
                  只读草稿 · {task.draft?.step_count ?? 0} 项 · {task.source?.title || 'SystemMap'}
                </div>
              )}
              {task.read_only && task.source?.type && (
                <div className="task-source-line">
                  <span>{sourceTypeLabel(task.source.type)}</span>
                  <strong>{task.source.id}</strong>
                </div>
              )}
              {task.description && (
                <div className="task-description">{task.description}</div>
              )}
              <div className="task-meta">
                <div className="task-status">
                  {getStatusIcon(task.status)}
                  <span style={{ color: getStatusColor(task.status) }}>
                    {getStatusText(task.status)}
                  </span>
                </div>
                {task.status === 'in_progress' && (
                  <div className="task-progress">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${task.progress}%` }}
                      />
                    </div>
                    <span>{task.progress}%</span>
                  </div>
                )}
                <div className="task-time">{formatTime(task.updated_at)}</div>
              </div>
              {task.tags && task.tags.length > 0 && (
                <div className="task-tags">
                  {task.tags.map((tag, index) => (
                    <span key={index} className="tag">{tag}</span>
                  ))}
                </div>
              )}
              <div className="task-actions">
                {task.read_only && task.draft?.copy_text && (
                  <button
                    className="btn btn-sm btn-outline"
                    aria-label="复制任务草稿"
                    onClick={(e) => { e.stopPropagation(); void copyTaskDraft(task); }}
                  >
                    <Copy size={14} />
                  </button>
                )}
                {task.read_only && resolveTaskTarget(task) && (
                  <button
                    className="btn btn-sm btn-outline"
                    aria-label={sourceActionLabel(task)}
                    onClick={(e) => { e.stopPropagation(); openTaskSource(task); }}
                  >
                    <Eye size={14} />
                  </button>
                )}
                {!task.read_only && task.status === 'in_progress' && (
                  <button
                    className="btn btn-sm btn-outline"
                    aria-label="暂停任务"
                    disabled={actionPending === task.id}
                    onClick={(e) => { e.stopPropagation(); void runTaskAction(task.id, 'pause', 'pending'); }}
                  >
                    <Pause size={14} />
                  </button>
                )}
                {!task.read_only && task.status === 'pending' && (
                  <button
                    className="btn btn-sm btn-outline"
                    aria-label="恢复任务"
                    disabled={actionPending === task.id}
                    onClick={(e) => { e.stopPropagation(); void runTaskAction(task.id, 'resume', 'in_progress'); }}
                  >
                    <Play size={14} />
                  </button>
                )}
                {!task.read_only && (task.status === 'pending' || task.status === 'in_progress') && (
                  <button
                    className="btn btn-sm btn-outline"
                    aria-label="取消任务"
                    disabled={actionPending === task.id}
                    onClick={(e) => { e.stopPropagation(); void runTaskAction(task.id, 'cancel', 'cancelled'); }}
                  >
                    <X size={14} />
                  </button>
                )}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={(e) => { e.stopPropagation(); setSelectedTask(task); }}
                >
                  <Eye size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 任务详情 */}
      {selectedTask && (
        <div className="task-detail-panel">
          <div className="detail-header">
            <h3>{selectedTask.title}</h3>
            <button className="btn btn-sm btn-outline" onClick={() => setSelectedTask(null)}>
              <X size={14} />
            </button>
          </div>
          <div className="detail-content">
            <div className="detail-row">
              <span className="detail-label">ID:</span>
              <span>{selectedTask.id}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">状态:</span>
              <span style={{ color: getStatusColor(selectedTask.status) }}>
                {getStatusText(selectedTask.status)}
              </span>
            </div>
            <div className="detail-row">
              <span className="detail-label">优先级:</span>
              <span style={{ color: getPriorityColor(selectedTask.priority) }}>
                {getPriorityText(selectedTask.priority)}
              </span>
            </div>
            {selectedTask.description && (
              <div className="detail-row">
                <span className="detail-label">描述:</span>
                <span>{selectedTask.description}</span>
              </div>
            )}
            {selectedTask.read_only && selectedTask.draft && (
              <>
                <div className="detail-row">
                  <span className="detail-label">来源:</span>
                  <span>{selectedTask.source?.title || selectedTask.source?.id}</span>
                </div>
                {selectedTask.source?.type && (
                  <div className="detail-row">
                    <span className="detail-label">来源类型:</span>
                    <span>{sourceTypeLabel(selectedTask.source.type)} · {selectedTask.source.id}</span>
                  </div>
                )}
                <div className="detail-row">
                  <span className="detail-label">安全门:</span>
                  <span>{selectedTask.draft.guard}</span>
                </div>
                {selectedTask.draft.evidence_fields && selectedTask.draft.evidence_fields.length > 0 && (
                  <div className="detail-row task-evidence-detail">
                    <span className="detail-label">证据:</span>
                    <div className="task-evidence-list">
                      {selectedTask.draft.evidence_fields.map((field) => (
                        <span key={`${field.label}-${field.value}`}>
                          <strong>{field.label}</strong>
                          <small>{field.value}</small>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedDomainApp && (
                  <>
                    <div className="detail-row">
                      <span className="detail-label">领域对象快照:</span>
                      <span>{selectedDomainApp.name} · {selectedDomainApp.domain.name}</span>
                    </div>
                    <div className="detail-row task-evidence-detail">
                      <span className="detail-label">对象状态:</span>
                      <div className="task-evidence-list">
                        <span>
                          <strong>运行态</strong>
                          <small>{selectedDomainApp.runtime.status || 'unknown'}</small>
                        </span>
                        <span>
                          <strong>安全态</strong>
                          <small>{selectedDomainApp.security_summary?.posture || 'unknown'}</small>
                        </span>
                        <span>
                          <strong>认证</strong>
                          <small>{selectedDomainApp.auth?.type || '未登记'}</small>
                        </span>
                        <span>
                          <strong>新鲜度</strong>
                          <small>{selectedDomainApp.freshness?.status || '未登记'}</small>
                        </span>
                      </div>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">对象动作:</span>
                      <div className="task-detail-actions">
                        {(selectedDomainApp.runtime.launch?.url || selectedDomainApp.runtime.api?.url) && (
                          <a
                            className="btn btn-sm btn-outline"
                            href={selectedDomainApp.runtime.launch?.url || selectedDomainApp.runtime.api?.url || '#'}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Eye size={14} />
                            打开对象入口
                          </a>
                        )}
                        {selectedDomainApp.commands?.start && (
                          <button className="btn btn-sm btn-outline" onClick={() => navigator.clipboard.writeText(selectedDomainApp.commands?.start || '')}>
                            <Copy size={14} />
                            复制启动命令
                          </button>
                        )}
                        {selectedDomainApp.commands?.verify?.[0] && (
                          <button className="btn btn-sm btn-outline" onClick={() => navigator.clipboard.writeText(selectedDomainApp.commands?.verify?.join('\n') || '')}>
                            <Copy size={14} />
                            复制验证命令
                          </button>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <div className="detail-row">
                  <span className="detail-label">材料:</span>
                  <div className="task-detail-actions">
                    <button className="btn btn-sm btn-outline" onClick={() => { void copyTaskDraft(selectedTask); }}>
                      <Copy size={14} />
                      复制任务草稿
                    </button>
                    {resolveTaskTarget(selectedTask) && (
                      <button className="btn btn-sm btn-outline" onClick={() => openTaskSource(selectedTask)}>
                        <Eye size={14} />
                        {sourceActionLabel(selectedTask)}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
            {selectedTask.assignee && (
              <div className="detail-row">
                <span className="detail-label">负责人:</span>
                <span>{selectedTask.assignee}</span>
              </div>
            )}
            <div className="detail-row">
              <span className="detail-label">创建时间:</span>
              <span>{new Date(selectedTask.created_at).toLocaleString('zh-CN')}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">更新时间:</span>
              <span>{new Date(selectedTask.updated_at).toLocaleString('zh-CN')}</span>
            </div>
            {selectedTask.status === 'in_progress' && (
              <div className="detail-row">
                <span className="detail-label">进度:</span>
                <div className="progress-bar" style={{ flex: 1 }}>
                  <div
                    className="progress-fill"
                    style={{ width: `${selectedTask.progress}%` }}
                  />
                </div>
                <span>{selectedTask.progress}%</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

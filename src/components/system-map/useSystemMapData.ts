import { useCallback, useState } from 'react';
import type { DraftTask, ProjectAction, ProjectItem, RoadmapItem, SourceRef, SourcePreview, SystemMapPayload } from './types';
import { SYSTEM_MAP_DRAFT_TASKS_URL, sourceTarget } from './utils';

type SystemMapData = {
  systemMap: SystemMapPayload | null;
  draftTasks: DraftTask[];
  loading: boolean;
  error: string;
  activeSourceRef: SourceRef | null;
  sourcePreview: SourcePreview | null;
  sourceLoading: boolean;
  sourceError: string;
  actionNotice: string;
  actionError: string;
  bulkTriagePending: boolean;
  pendingActionKey: string | null;
  load: () => Promise<void>;
  inspectSourceRef: (ref: SourceRef) => Promise<void>;
  queueProjectAction: (projectId: string, action: ProjectAction) => Promise<void>;
  queuePageOperatorAction: (pageId: string, action: { id: string; kind?: string; label?: string }) => Promise<void>;
  queuePageRoadmap: (roadmap: RoadmapItem) => Promise<void>;
  promoteDraftTask: (task: DraftTask) => Promise<void>;
  queueProjectTriageCommand: (command: ProjectAction) => Promise<void>;
  queueVerificationTriage: (commandId?: 'verification-rerun' | 'verification-find-evidence') => Promise<void>;
  queueRuntimeTriage: () => Promise<void>;
  executeVerificationTriage: () => Promise<void>;
  executeRuntimeTriage: () => Promise<void>;
  queueCoverageDrafts: () => Promise<void>;
  setActiveSourceRef: (ref: SourceRef | null) => void;
  setSourcePreview: (preview: SourcePreview | null) => void;
  setSourceLoading: (loading: boolean) => void;
  setSourceError: (error: string) => void;
  setActionNotice: (notice: string) => void;
  setActionError: (error: string) => void;
  setBulkTriagePending: (pending: boolean) => void;
  setPendingActionKey: (key: string | null) => void;
  setSystemMap: (map: SystemMapPayload | null) => void;
  setDraftTasks: (tasks: DraftTask[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string) => void;
};

type UseSystemMapDataOptions = {
  onOpenTarget?: (target: { tab: string; taskQuery?: string; gapId?: string; projectId?: string }) => void;
};

export function useSystemMapData({ onOpenTarget }: UseSystemMapDataOptions = {}): SystemMapData {
  const [systemMap, setSystemMap] = useState<SystemMapPayload | null>(null);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeSourceRef, setActiveSourceRef] = useState<SourceRef | null>(null);
  const [sourcePreview, setSourcePreview] = useState<SourcePreview | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [sourceError, setSourceError] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [actionError, setActionError] = useState('');
  const [bulkTriagePending, setBulkTriagePending] = useState(false);
  const [pendingActionKey, setPendingActionKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [systemMapResult, draftTaskResult] = await Promise.allSettled([
        fetch('/api/cockpit/system-map'),
        fetch(SYSTEM_MAP_DRAFT_TASKS_URL),
      ]);

      if (systemMapResult.status !== 'fulfilled' || !systemMapResult.value.ok) {
        throw new Error('系统地图读取失败');
      }

      const nextSystemMap = await systemMapResult.value.json() as SystemMapPayload;
      setSystemMap(nextSystemMap);

      if (draftTaskResult.status === 'fulfilled' && draftTaskResult.value.ok) {
        const payload = await draftTaskResult.value.json();
        setDraftTasks(payload.items || []);
      } else {
        setDraftTasks([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '系统地图读取失败');
      setDraftTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const inspectSourceRef = useCallback(async (ref: SourceRef) => {
    const target = sourceTarget(ref);
    setActiveSourceRef(ref);
    setSourceLoading(true);
    setSourceError('');
    setSourcePreview(null);
    try {
      const res = await fetch(`/api/cockpit/source-ref?target=${encodeURIComponent(target)}&context=4`);
      if (!res.ok) throw new Error('来源预览读取失败');
      setSourcePreview(await res.json());
    } catch (err) {
      setSourceError(err instanceof Error ? err.message : '来源预览读取失败');
    } finally {
      setSourceLoading(false);
    }
  }, []);

  const queueProjectAction = useCallback(async (projectId: string, action: ProjectAction) => {
    const pendingKey = `project:${projectId}:${action.id}`;
    if (pendingActionKey || bulkTriagePending) return;
    setPendingActionKey(pendingKey);
    setActionNotice('');
    setActionError('');
    try {
      const response = await fetch(
        `/api/cockpit/projects/${encodeURIComponent(projectId)}/actions/${encodeURIComponent(action.id)}/queue`,
        { method: 'POST' },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '项目动作承接失败');
      setActionNotice(`已登记为计划任务：${payload.title || action.label}`);
      await load();
      if (onOpenTarget) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: payload.id });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '项目动作承接失败');
    } finally {
      setPendingActionKey(null);
    }
  }, [bulkTriagePending, load, onOpenTarget, pendingActionKey]);

  const queuePageOperatorAction = useCallback(async (pageId: string, action: { id: string; kind?: string; label?: string }) => {
    const actionId = action.id;
    const pendingKey = `page:${pageId}:${actionId}`;
    if (pendingActionKey || bulkTriagePending) return;
    setPendingActionKey(pendingKey);
    setActionNotice('');
    setActionError('');
    try {
      const response = await fetch(
        `/api/cockpit/pages/${encodeURIComponent(pageId)}/actions/${encodeURIComponent(actionId)}/queue`,
        { method: 'POST' },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '页面动作承接失败');
      setActionNotice(`已登记为计划任务：${payload.title || action.label || actionId}`);
      await load();
      if (onOpenTarget && payload.id) onOpenTarget({ tab: 'TaskCenter', taskQuery: payload.id });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '页面动作承接失败');
    } finally {
      setPendingActionKey(null);
    }
  }, [bulkTriagePending, load, onOpenTarget, pendingActionKey]);

  const queuePageRoadmap = useCallback(async (roadmap: RoadmapItem) => {
    if (pendingActionKey || bulkTriagePending) return;
    const pendingKey = `roadmap:${roadmap.id}`;
    setPendingActionKey(pendingKey);
    setActionNotice('');
    setActionError('');
    try {
      const response = await fetch(`/api/cockpit/roadmap/${encodeURIComponent(roadmap.id)}/queue`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '路线图任务承接失败');
      setActionNotice(`已登记页面路线图任务：${payload.title || roadmap.title}`);
      if (onOpenTarget && payload.id) onOpenTarget({ tab: 'TaskCenter', taskQuery: payload.id });
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '路线图任务承接失败');
    } finally {
      setPendingActionKey(null);
    }
  }, [bulkTriagePending, onOpenTarget, pendingActionKey]);

  const promoteDraftTask = useCallback(async (task: DraftTask) => {
    if (!task.read_only || !task.source?.type || pendingActionKey || bulkTriagePending) return;
    setPendingActionKey(`draft:${task.id}`);
    setActionNotice('');
    setActionError('');
    try {
      const response = await fetch(`/api/tasks/drafts/${encodeURIComponent(task.id)}/promote`, { method: 'POST' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '任务草稿承接失败');
      setActionNotice(`已承接为正式计划任务：${payload.title || task.title}`);
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '任务草稿承接失败');
    } finally {
      setPendingActionKey(null);
    }
  }, [bulkTriagePending, load, pendingActionKey]);

  const queueProjectTriageCommand = useCallback(async (command: ProjectAction) => {
    const projectId = command.project_id;
    if (!projectId) return;
    const pendingKey = `triage:${projectId}:${command.id}`;
    if (pendingActionKey || bulkTriagePending) return;
    setPendingActionKey(pendingKey);
    setActionNotice('');
    setActionError('');
    try {
      const response = await fetch(
        `/api/cockpit/projects/${encodeURIComponent(projectId)}/triage/${encodeURIComponent(command.id)}/queue`,
        { method: 'POST' },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '排查命令承接失败');
      setActionNotice(`已登记为计划任务：${payload.title || command.label}`);
      await load();
      if (onOpenTarget) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: payload.id });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '排查命令承接失败');
    } finally {
      setPendingActionKey(null);
    }
  }, [bulkTriagePending, load, onOpenTarget, pendingActionKey]);

  const queueVerificationTriage = useCallback(async (commandId: 'verification-rerun' | 'verification-find-evidence' = 'verification-rerun') => {
    const evidenceOnly = commandId === 'verification-find-evidence';
    setActionNotice('');
    setActionError('');
    setBulkTriagePending(true);
    try {
      const response = await fetch('/api/cockpit/triage/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'verification',
          command_id: commandId,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || (evidenceOnly ? '验证证据补录承接失败' : '验证缺口承接失败'));
      const summary = payload.summary || {};
      const actionLabel = evidenceOnly ? '验证证据补录' : '验证缺口';
      setActionNotice(`已批量承接${actionLabel}：${summary.queued || 0} 条，跳过 ${summary.skipped || 0} 条，失败 ${summary.errors || 0} 条。`);
      await load();
      if (onOpenTarget && (summary.queued || 0) > 0) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '验证缺口承接失败');
    } finally {
      setBulkTriagePending(false);
    }
  }, [load, onOpenTarget]);

  const queueRuntimeTriage = useCallback(async () => {
    setActionNotice('');
    setActionError('');
    setBulkTriagePending(true);
    try {
      const response = await fetch('/api/cockpit/triage/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'runtime' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '运行探针承接失败');
      const summary = payload.summary || {};
      setActionNotice(`已批量承接运行探针：${summary.queued || 0} 条，跳过 ${summary.skipped || 0} 条，失败 ${summary.errors || 0} 条。`);
      await load();
      if (onOpenTarget && (summary.queued || 0) > 0) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '运行探针承接失败');
    } finally {
      setBulkTriagePending(false);
    }
  }, [load, onOpenTarget]);

  const executeVerificationTriage = useCallback(async () => {
    setActionNotice('');
    setActionError('');
    setBulkTriagePending(true);
    try {
      const response = await fetch('/api/cockpit/triage/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 8 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '批量验证执行失败');
      const summary = payload.summary || {};
      setActionNotice(`批量验证完成：通过 ${summary.succeeded || 0} 条，已归档 ${summary.archived || 0} 条，失败 ${summary.failed || 0} 条${summary.archive_errors ? `，归档异常 ${summary.archive_errors} 条` : ''}，候选 ${summary.candidates || 0} 条。`);
      await load();
      if (onOpenTarget && (summary.selected || 0) > 0) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '批量验证执行失败');
    } finally {
      setBulkTriagePending(false);
    }
  }, [load, onOpenTarget]);

  const executeRuntimeTriage = useCallback(async () => {
    setActionNotice('');
    setActionError('');
    setBulkTriagePending(true);
    try {
      const response = await fetch('/api/cockpit/triage/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'runtime', limit: 8 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '运行探针执行失败');
      const summary = payload.summary || {};
      setActionNotice(`运行探针完成：通过 ${summary.succeeded || 0} 条，已归档 ${summary.archived || 0} 条，失败 ${summary.failed || 0} 条${summary.archive_errors ? `，归档异常 ${summary.archive_errors} 条` : ''}，已批准候选 ${summary.candidates || 0} 条。`);
      await load();
      if (onOpenTarget && (summary.selected || 0) > 0) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: 'cockpit-triage-' });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '运行探针执行失败');
    } finally {
      setBulkTriagePending(false);
    }
  }, [load, onOpenTarget]);

  const queueCoverageDrafts = useCallback(async () => {
    setActionNotice('');
    setActionError('');
    setBulkTriagePending(true);
    try {
      const response = await fetch('/api/cockpit/coverage/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'all', limit: 40 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.detail || response.statusText || '全站缺口承接失败');
      const summary = payload.summary || {};
      setActionNotice(`已批量承接全站缺口：${summary.queued || 0} 条，跳过 ${summary.skipped || 0} 条，失败 ${summary.errors || 0} 条。`);
      await load();
      if (onOpenTarget && (summary.queued || 0) > 0) {
        onOpenTarget({ tab: 'TaskCenter', taskQuery: 'cockpit-' });
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '全站缺口承接失败');
    } finally {
      setBulkTriagePending(false);
    }
  }, [load, onOpenTarget]);

  return {
    systemMap,
    draftTasks,
    loading,
    error,
    activeSourceRef,
    sourcePreview,
    sourceLoading,
    sourceError,
    actionNotice,
    actionError,
    bulkTriagePending,
    pendingActionKey,
    load,
    inspectSourceRef,
    queueProjectAction,
    queuePageOperatorAction,
    queuePageRoadmap,
    promoteDraftTask,
    queueProjectTriageCommand,
    queueVerificationTriage,
    queueRuntimeTriage,
    executeVerificationTriage,
    executeRuntimeTriage,
    queueCoverageDrafts,
    setActiveSourceRef,
    setSourcePreview,
    setSourceLoading,
    setSourceError,
    setActionNotice,
    setActionError,
    setBulkTriagePending,
    setPendingActionKey,
    setSystemMap,
    setDraftTasks,
    setLoading,
    setError,
  };
}

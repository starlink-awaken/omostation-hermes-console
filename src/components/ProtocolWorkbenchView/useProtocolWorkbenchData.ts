import { useEffect, useState } from 'react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';
import { type ProtocolPayload, EMPTY_PAYLOAD } from './types';
import { fetchJson } from './utils';

export function useProtocolWorkbenchData(
  onNavigate: ((tab: string) => void) | undefined,
  onOpenTarget: ((target: CockpitNavigationTarget) => void) | undefined,
) {
  const [payload, setPayload] = useState<ProtocolPayload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [protocolDraftNotice, setProtocolDraftNotice] = useState<string | null>(null);
  const [protocolTaskPending, setProtocolTaskPending] = useState(false);
  const [protocolTaskError, setProtocolTaskError] = useState<string | null>(null);
  const [protocolQuery, setProtocolQuery] = useState('');
  const [protocolStatusFilter, setProtocolStatusFilter] = useState('all');
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    const result = await fetchJson<ProtocolPayload>(
      `/api/cockpit/protocol-hub?limit=20&offset=${offset}`,
      EMPTY_PAYLOAD,
      '协议工作台',
    );
    setPayload((current) => append
      ? { ...result.data, recent_workflows: [...current.recent_workflows, ...result.data.recent_workflows] }
      : result.data);
    setSourceError(result.error);
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const createProtocolTask = async (taskDraft: {
    title: string;
    description: string;
    copyText: string;
    objectTarget: CockpitNavigationTarget;
    taskTarget: CockpitNavigationTarget;
  }, surfaceId: string) => {
    setProtocolTaskPending(true);
    setProtocolTaskError(null);
    setProtocolDraftNotice(null);
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: taskDraft.title,
          description: taskDraft.description,
          priority: 'high',
          risk_level: 'L1',
          evidence_required: ['协议定义或元模型快照', '工作流运行证据', '桥接或治理处理结果', 'task closeout'],
          tags: ['protocol', 'governance'],
          source: {
            type: 'cockpit.protocol-workbench',
            id: surfaceId,
            title: '协议工作台',
            target: taskDraft.objectTarget,
          },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || response.statusText || '协议任务登记失败');
      setProtocolDraftNotice(`已登记协议治理任务：${result.title || taskDraft.title}`);
      if (result.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: result.id }, onNavigate, onOpenTarget);
    } catch (taskError) {
      setProtocolTaskError(taskError instanceof Error ? taskError.message : '协议任务登记失败');
    } finally {
      setProtocolTaskPending(false);
    }
  };

  return {
    payload,
    loading,
    refreshing,
    protocolDraftNotice,
    protocolTaskPending,
    protocolTaskError,
    protocolQuery,
    setProtocolQuery,
    protocolStatusFilter,
    setProtocolStatusFilter,
    sourceError,
    loadingMore,
    load,
    createProtocolTask,
  };
}

export type UseProtocolWorkbenchDataReturn = ReturnType<typeof useProtocolWorkbenchData>;

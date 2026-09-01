import { useEffect, useState } from 'react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';
import { type ResearchDetailPayload, type ResearchHubPayload, EMPTY_PAYLOAD } from './types';
import { fetchJson } from './utils';

export function useResearchHubData(
  onNavigate: ((tab: string) => void) | undefined,
  onOpenTarget: ((target: CockpitNavigationTarget) => void) | undefined,
) {
  const [payload, setPayload] = useState<ResearchHubPayload>(EMPTY_PAYLOAD);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [researchStatusFilter, setResearchStatusFilter] = useState('all');
  const [selectedResearchId, setSelectedResearchId] = useState<number | null>(null);
  const [researchDetail, setResearchDetail] = useState<ResearchDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [queueingResearchId, setQueueingResearchId] = useState<number | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [sourceError, setSourceError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    const result = await fetchJson<ResearchHubPayload>(
      `/api/cockpit/research-hub?limit=20&offset=${offset}`,
      EMPTY_PAYLOAD,
      '研究中枢',
    );
    setPayload((current) => append
      ? { ...result.data, recent: [...current.recent, ...result.data.recent] }
      : result.data);
    setSourceError(result.error);
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  };

  const queueResearchTask = async (researchId: number) => {
    setQueueingResearchId(researchId);
    setQueueError(null);
    try {
      const response = await fetch(`/api/cockpit/research/${researchId}/queue`, { method: 'POST' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || result.error || '研究任务承接失败');
      if (result.id) {
        await load();
        openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: result.id }, onNavigate, onOpenTarget);
      } else {
        setQueueError('研究任务承接接口已返回成功，但没有任务 ID，无法定位后续任务。');
      }
    } catch (error) {
      setQueueError(error instanceof Error ? error.message : '研究任务承接失败');
    } finally {
      setQueueingResearchId(null);
    }
  };

  const openDetail = async (researchId: number) => {
    setSelectedResearchId(researchId);
    setResearchDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    const result = await fetchJson<ResearchDetailPayload>(
      `/api/cockpit/research-hub/${researchId}`,
      { status: 'error', timeline: [], dossier: { parents: [], children: [], publications: [] } },
      '研究对象详情',
    );
    const data = result.data;
    if (result.error || data.status !== 'ok' || !data.item) {
      setDetailError(result.error || '研究对象详情暂时读取失败，请稍后重试。');
    } else {
      setResearchDetail(data);
    }
    setDetailLoading(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);

  const closeDetail = () => {
    setSelectedResearchId(null);
    setResearchDetail(null);
    setDetailError(null);
  };

  return {
    payload,
    loading,
    refreshing,
    researchQuery,
    setResearchQuery,
    researchStatusFilter,
    setResearchStatusFilter,
    selectedResearchId,
    researchDetail,
    detailLoading,
    detailError,
    queueingResearchId,
    queueError,
    setQueueError,
    sourceError,
    loadingMore,
    load,
    queueResearchTask,
    openDetail,
    closeDetail,
  };
}

export type UseResearchHubDataReturn = ReturnType<typeof useResearchHubData>;

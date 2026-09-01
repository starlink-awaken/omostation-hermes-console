import { useEffect, useMemo, useState } from 'react';
import { apiFetch, apiPost } from '../../api/client';
import {
  type DomainApp,
  type DomainAppsPayload,
  type DomainAttentionFilter,
  type DomainAttentionItem,
  type DomainBuildRow,
  type DomainRouteCard,
  type OpcWorkspace,
  type SystemMapPayload,
  EMPTY_OPC_WORKSPACE,
  DOMAIN_SURFACE_PAGE_IDS,
} from './types';
import {
  attentionReasons,
  domainBuildStatusClass,
  matchesDomainApp,
  nextActionForApp,
} from './utils';

export function useDomainAppsData(
  taskQuery: string | undefined,
  onNavigate: ((tab: string) => void) | undefined,
  onOpenTarget: ((target: { tab: string; taskQuery?: string; pageId?: string; projectId?: string }) => void) | undefined,
) {
  const [apps, setApps] = useState<DomainAppsPayload | null>(null);
  const [opc, setOpc] = useState<OpcWorkspace | null>(null);
  const [domainBuildRows, setDomainBuildRows] = useState<DomainBuildRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attentionFilter, setAttentionFilter] = useState<DomainAttentionFilter>('all');
  const [appQuery, setAppQuery] = useState('');
  const [appDomainFilter, setAppDomainFilter] = useState('all');
  const [appRuntimeFilter, setAppRuntimeFilter] = useState('all');
  const [focusedAppId, setFocusedAppId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionPendingKey, setActionPendingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [appsResult, opcResult, systemMapResult] = await Promise.allSettled([
        apiFetch<DomainAppsPayload>('/api/domain-apps'),
        apiFetch<OpcWorkspace>('/api/opc/workspace'),
        apiFetch<SystemMapPayload>('/api/cockpit/system-map'),
      ]);
      const failures: string[] = [];
      if (appsResult.status !== 'fulfilled' || !appsResult.value.ok) {
        failures.push(appsResult.status === 'fulfilled' ? (appsResult.value.error || '领域应用清单读取失败') : '领域应用清单读取失败');
      }
      if (opcResult.status !== 'fulfilled' || !opcResult.value.ok) {
        failures.push(opcResult.status === 'fulfilled' ? (opcResult.value.error || 'OPC 工作区读取失败') : 'OPC 工作区读取失败');
      }
      if (systemMapResult.status !== 'fulfilled' || !systemMapResult.value.ok) {
        failures.push('系统地图补充数据读取失败');
      }
      if (failures.length > 0) setError(failures.join('；'));
      if (appsResult.status !== 'fulfilled' || !appsResult.value.ok) {
        throw new Error(failures[0] || '领域应用清单读取失败');
      }
      const systemMapPayload = systemMapResult.status === 'fulfilled' && systemMapResult.value.ok ? systemMapResult.value.data : null;
      const pagesById = new globalThis.Map<string, { id: string; title?: string }>(
        ((systemMapPayload?.cockpit_pages || []) as Array<{ id?: string; title?: string }>)
          .filter((page): page is { id: string; title?: string } => Boolean(page.id))
          .map((page) => [page.id, page] as const),
      );
      const projectRows = ((systemMapPayload?.project_portfolio?.priority_projects || []) as SystemMapPayload['project_portfolio']['priority_projects'])
        .filter((project) => project.cockpit_page && DOMAIN_SURFACE_PAGE_IDS.has(project.cockpit_page))
        .slice(0, 4)
        .map((project) => {
          const page = pagesById.get(project.cockpit_page || '');
          return {
            id: `domain-build-project-${project.id}`,
            kind: 'project' as const,
            title: project.id,
            meta: `${project.layer || '项目'} · 入口 ${page?.title || project.cockpit_page || '系统地图'} · ${project.score ?? 0}%`,
            summary: project.primary_gap || project.next_action || '先回项目覆盖面确认领域入口、任务和安全门是否接通。',
            nextAction: project.next_action || '先从项目面确认领域相关项目的下一步。',
            statusClass: domainBuildStatusClass(project.status),
            entryTarget: { tab: project.cockpit_page || 'DomainApps' },
            coverageTarget: { tab: 'SystemMap', projectId: project.id },
            taskTarget: { tab: 'TaskCenter', taskQuery: project.id },
          };
        });
      const roadmapRows = ((systemMapPayload?.roadmap?.items || []) as SystemMapPayload['roadmap']['items'])
        .filter((item) => item.cockpit_page && DOMAIN_SURFACE_PAGE_IDS.has(item.cockpit_page) && item.status !== 'shipped')
        .slice(0, 4)
        .map((item) => {
          const page = pagesById.get(item.cockpit_page || '');
          return {
            id: `domain-build-roadmap-${item.id}`,
            kind: 'roadmap' as const,
            title: item.title || item.id,
            meta: `${item.priority || '路线图'} · 入口 ${page?.title || item.cockpit_page || '系统地图'} · ${item.status || 'planned'}`,
            summary: item.problem || '先确认这条领域路线图应该落在哪个入口页和任务收口面。',
            nextAction: item.problem || '进入系统地图继续看路线图承接。',
            statusClass: domainBuildStatusClass(item.status),
            entryTarget: { tab: item.cockpit_page || 'DomainApps' },
            coverageTarget: { tab: 'SystemMap', pageId: item.cockpit_page || 'DomainApps' },
            taskTarget: { tab: 'TaskCenter', taskQuery: item.id || item.title || 'roadmap' },
          };
        });
      setApps(appsResult.value.data);
      setOpc(opcResult.status === 'fulfilled' && opcResult.value.ok ? opcResult.value.data : EMPTY_OPC_WORKSPACE);
      setDomainBuildRows([...projectRows, ...roadmapRows]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '领域应用数据读取失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, []);

  useEffect(() => {
    if (!apps?.items.length) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusedAppId(null);
      return;
    }
    const matchedApp = apps.items.find((app) => matchesDomainApp(app, taskQuery || ''));
    if (matchedApp) {
      setFocusedAppId(matchedApp.id);
      return;
    }
    setFocusedAppId((current) => {
      if (current && apps.items.some((app) => app.id === current)) return current;
      const attentionFallback = apps.items.find((app) => attentionReasons(app).length > 0);
      return attentionFallback?.id || apps.items[0]?.id || null;
    });
  }, [apps, taskQuery]);

  const openTaskCenter = (query: string) => {
    if (onOpenTarget) {
      onOpenTarget({ tab: 'TaskCenter', taskQuery: query });
      return;
    }
    onNavigate?.('TaskCenter');
  };

  const openSystemMap = () => {
    if (onOpenTarget) {
      onOpenTarget({ tab: 'SystemMap' });
      return;
    }
    onNavigate?.('SystemMap');
  };

  const queueDomainAction = async (app: DomainApp, action: DomainApp['actions'][number]) => {
    const pendingKey = `queue:${app.id}:${action.id}`;
    if (actionPendingKey) return;
    setActionPendingKey(pendingKey);
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await apiPost<{ id?: string; detail?: string }>(`/api/cockpit/domain-apps/${app.id}/actions/${action.id}/queue`, {});
      if (!res.ok) throw new Error(res.error || '领域应用动作登记失败');
      setActionNotice(`已登记"${action.label}"，任务中心将负责后续审批与留证。`);
      await load();
      if (res.data?.id) openTaskCenter(res.data.id);
      else setActionError('领域应用动作已返回成功，但没有任务 ID，无法定位后续审批。');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '领域应用动作登记失败');
    } finally {
      setActionPendingKey(null);
    }
  };

  const executeDomainVerification = async (app: DomainApp) => {
    if (!window.confirm(`将执行 ${app.name} 登记的低风险验证命令，并写入 OMO 执行证据。继续吗？`)) return;
    if (actionPendingKey) return;
    setActionPendingKey(`verify:${app.id}`);
    setActionNotice(null);
    setActionError(null);
    try {
      const res = await apiPost<{ id?: string; exit_code?: number; detail?: string }>(`/api/cockpit/domain-apps/${app.id}/verify`, {});
      if (!res.ok) throw new Error(res.error || '领域应用验证执行失败');
      setActionNotice(`验证完成：${app.name} exit ${res.data?.exit_code ?? 'unknown'}，已写入任务证据。`);
      await load();
      if (res.data?.id) openTaskCenter(res.data.id);
      else setActionError('验证已返回结果，但没有任务 ID，无法定位执行证据。');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '领域应用验证执行失败');
    } finally {
      setActionPendingKey(null);
    }
  };

  const actionPendingFor = (app: DomainApp, action: DomainApp['actions'][number]) => (
    actionPendingKey === `queue:${app.id}:${action.id}`
  );

  const verificationPendingFor = (app: DomainApp) => actionPendingKey === `verify:${app.id}`;

  return {
    apps,
    opc,
    domainBuildRows,
    loading,
    error,
    attentionFilter,
    setAttentionFilter,
    appQuery,
    setAppQuery,
    appDomainFilter,
    setAppDomainFilter,
    appRuntimeFilter,
    setAppRuntimeFilter,
    focusedAppId,
    setFocusedAppId,
    actionNotice,
    actionError,
    load,
    openTaskCenter,
    openSystemMap,
    queueDomainAction,
    executeDomainVerification,
    actionPendingFor,
    verificationPendingFor,
  };
}

export type UseDomainAppsDataReturn = ReturnType<typeof useDomainAppsData>;

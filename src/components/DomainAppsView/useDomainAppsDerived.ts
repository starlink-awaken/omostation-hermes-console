import { useMemo } from 'react';
import {
  type DomainApp,
  type DomainAppsPayload,
  type DomainAttentionFilter,
  type DomainAttentionItem,
  type DomainRouteCard,
} from './types';
import {
  attentionReasons,
  badgeClass,
  capabilityText,
  contractStatusText,
  entryText,
  healthLabels,
  nextActionForApp,
  riskText,
  runtimeLabels,
  securityText,
  verifyText,
} from './utils';

type FocusSignal = { id: string; label: string; detail: string };

export function useDomainAppsDerived(
  apps: { items: DomainApp[]; summary: DomainAppsPayload['summary'] } | null,
  opc: { exists: boolean; positioning?: { summary: string }; weekly_priorities: { title: string; detail: string }[]; ssot_root: string } | null,
  domainBuildRows: { kind: string; statusClass: string }[],
  appQuery: string,
  appDomainFilter: string,
  appRuntimeFilter: string,
  attentionFilter: DomainAttentionFilter,
  focusedAppId: string | null,
  taskQuery: string | undefined,
) {
  const attentionItems = useMemo<DomainAttentionItem[]>(() => {
    if (!apps) return [];
    return apps.items
      .filter((app) => {
        const query = appQuery.trim().toLowerCase();
        if (appDomainFilter !== 'all' && app.domain.id !== appDomainFilter) return false;
        if (appRuntimeFilter !== 'all' && app.runtime.status !== appRuntimeFilter) return false;
        if (!query) return true;
        return [app.id, app.name, app.domain.id, app.domain.name, app.integration_mode]
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .map((app) => {
        const reasons = attentionReasons(app);
        if (reasons.length === 0) return null;
        const filterTags: DomainAttentionFilter[] = [];
        if (app.runtime.status === 'stopped') filterTags.push('runtime');
        if (app.security_summary.posture !== 'passed') filterTags.push('security');
        if (app.risk_level === 'high') filterTags.push('high_risk');
        return {
          app,
          reasons,
          nextAction: nextActionForApp(app),
          filterTags,
        };
      })
      .filter((item): item is DomainAttentionItem => Boolean(item));
  }, [appDomainFilter, appQuery, appRuntimeFilter, apps]);

  const filteredApps = useMemo(() => {
    if (!apps) return [];
    const query = appQuery.trim().toLowerCase();
    return apps.items.filter((app) => {
      if (appDomainFilter !== 'all' && app.domain.id !== appDomainFilter) return false;
      if (appRuntimeFilter !== 'all' && app.runtime.status !== appRuntimeFilter) return false;
      if (!query) return true;
      return [app.id, app.name, app.domain.id, app.domain.name, app.integration_mode]
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [appDomainFilter, appQuery, appRuntimeFilter, apps]);

  const appDomainOptions = useMemo(
    () => Object.entries((apps?.items || []).reduce<Record<string, string>>((domains, app) => {
      domains[app.domain.id] = app.domain.name;
      return domains;
    }, {})).sort((left, right) => left[1].localeCompare(right[1])),
    [apps],
  );

  const attentionCounts = useMemo(() => ({
    all: attentionItems.length,
    runtime: attentionItems.filter((item) => item.filterTags.includes('runtime')).length,
    security: attentionItems.filter((item) => item.filterTags.includes('security')).length,
    high_risk: attentionItems.filter((item) => item.filterTags.includes('high_risk')).length,
  }), [attentionItems]);

  const filteredAttentionItems = useMemo(() => {
    if (attentionFilter === 'all') return attentionItems;
    return attentionItems.filter((item) => item.filterTags.includes(attentionFilter));
  }, [attentionFilter, attentionItems]);

  const focusedApp = useMemo(
    () => filteredApps.find((app) => app.id === focusedAppId) || null,
    [filteredApps, focusedAppId],
  );

  const focusSignals = useMemo((): FocusSignal[] => {
    if (!focusedApp) return [];
    const signals: FocusSignal[] = [];
    if (focusedApp.runtime.status === 'stopped') {
      signals.push({
        id: 'runtime',
        label: '运行面未就绪',
        detail: focusedApp.commands.start || '需要拉起服务，或者确认它应该只按需启动。',
      });
    }
    focusedApp.security_checks
      .filter((check) => check.status !== 'passed')
      .slice(0, 3)
      .forEach((check) => {
        signals.push({
          id: check.id,
          label: check.title,
          detail: check.next_action || check.detail,
        });
      });
    if (focusedApp.risk_level === 'high') {
      signals.push({
        id: 'risk',
        label: '高风险挂载',
        detail: '优先检查认证、写入边界和真实数据暴露面，再决定是否继续内嵌。',
      });
    }
    if (signals.length === 0) {
      signals.push({
        id: 'steady',
        label: '当前没有阻断项',
        detail: nextActionForApp(focusedApp),
      });
    }
    return signals.slice(0, 4);
  }, [focusedApp]);

  const focusLaunchUrl = focusedApp?.links.launch_url || focusedApp?.runtime.launch.url || null;
  const focusApiUrl = focusedApp?.links.api_url || focusedApp?.runtime.api.url || null;
  const focusVerifyCommand = focusedApp?.commands.verify?.join('\n') || '';
  const focusCapabilities = focusedApp
    ? [...focusedApp.capabilities.read, ...focusedApp.capabilities.write].filter(Boolean)
    : [];

  const contractSummary = useMemo(() => {
    const items = apps?.items || [];
    return {
      ssotReady: items.filter((app) => app.paths.ssot_root?.exists).length,
      entryReady: items.filter((app) => Boolean(app.links.launch_url || app.runtime.launch.url || app.links.api_url || app.runtime.api.url)).length,
      verifyReady: items.filter((app) => app.commands.verify.length > 0).length,
      authReady: items.filter((app) => Boolean(app.auth.type)).length,
      writeDeclared: items.filter((app) => app.capabilities.write.length > 0).length,
      freshnessReady: items.filter((app) => Boolean(app.freshness.status)).length,
    };
  }, [apps]);

  const domainBuildSummary = useMemo(() => ({
    total: domainBuildRows.length,
    projects: domainBuildRows.filter((row) => row.kind === 'project').length,
    roadmap: domainBuildRows.filter((row) => row.kind === 'roadmap').length,
    attention: domainBuildRows.filter((row) => row.statusClass !== 'online').length,
  }), [domainBuildRows]);

  const domainRouteCards: DomainRouteCard[] = useMemo(() => {
    if (!apps || !opc) return [];
    const cards: DomainRouteCard[] = filteredApps.map((app) => {
      const launchUrl = app.links.launch_url || app.runtime.launch.url || app.links.api_url || app.runtime.api.url || null;
      return {
        id: `route-${app.id}`,
        title: app.name,
        subtitle: `${app.domain.name} · ${app.integration_mode}`,
        summary: app.notes[0] || `${app.name} 继续保持 ${app.domain.name} 为事实 SSOT，Cockpit 只负责入口、状态和任务承接。`,
        entryValue: entryText(app),
        ssotValue: app.paths.ssot_root?.path || app.domain.name,
        handoffValue: app.id,
        nextAction: nextActionForApp(app),
        primaryActionLabel: '查看应用剖面',
        primaryAction: () => {},
        secondaryActionLabel: '去任务承接',
        secondaryAction: () => {},
        launchUrl,
      };
    });
    cards.push({
      id: 'route-opc-workspace-summary',
      title: 'OPC 作战台',
      subtitle: opc.exists ? 'OPC · SSOT 聚合视图' : 'OPC · 待补入口',
      summary: opc.positioning?.summary || 'OPC 保持领域 SSOT，Cockpit 负责入口、状态、周动作和发布承接。',
      entryValue: 'DomainApps / TaskCenter',
      ssotValue: opc.ssot_root || '@OPC',
      handoffValue: opc.weekly_priorities[0]?.title || '本周三件事 / 发布节奏 / 核心指标',
      nextAction: opc.weekly_priorities[0]?.detail || '进入 OPC 作战台整理本周动作和排期。',
      primaryActionLabel: '查看 OPC 作战台',
      primaryAction: () => {},
      secondaryActionLabel: '去任务承接',
      secondaryAction: () => {},
      launchUrl: null,
    });
    return cards;
  }, [apps, opc, filteredApps]);

  return {
    attentionItems,
    filteredApps,
    appDomainOptions,
    attentionCounts,
    filteredAttentionItems,
    focusedApp,
    focusSignals,
    focusLaunchUrl,
    focusApiUrl,
    focusVerifyCommand,
    focusCapabilities,
    contractSummary,
    domainBuildSummary,
    domainRouteCards,
  };
}


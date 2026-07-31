/**
 * Migrated HomePage using React Query hooks.
 * 
 * This replaces the manual useState + useEffect pattern with React Query hooks.
 * Benefits:
 * - Automatic caching and deduplication
 * - Background refetching
 * - Loading/error states
 * - Request cancellation
 */

import React, { useState, useMemo } from 'react';
import { ArrowRight, ClipboardCheck, Layers3, Map, Route, ShieldAlert } from 'lucide-react';
import HealthSummarySection from './home/HealthSummarySection';
import AlertFeedSection from './home/AlertFeedSection';
import MetricsTrendSection from './home/MetricsTrendSection';
import RecentTasksSection from './home/RecentTasksSection';
import GovernanceOverviewSection from './home/GovernanceOverviewSection';
import QuickActionsSection from './home/QuickActionsSection';
import { COCKPIT_WORK_MODES } from './cockpitWorkModes';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import { COCKPIT_PAGE_REGISTRY } from './cockpitPageRegistry';
import SummaryTileGrid from './common/SummaryTileGrid';
import { useHomePageData } from '../api/homePageDataHook';

// ── Types ──

interface HomePageProps {
  onTabChange: (tab: string) => void;
  onOpenTarget: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
}

// ── Component ──

export default function HomePageMigratedV2({
  onTabChange,
  onOpenTarget,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
}: HomePageProps) {
  const [metricsRange, setMetricsRange] = useState<string>('24h');
  
  // Use the combined hook for all HomePage data
  const {
    healthSummary,
    alerts,
    tasks,
    metricsTrend,
    thoughts,
    systemMap,
    draftTasks,
    readOnlyDrafts,
    cockpitPages,
    featureDomains,
    roadmapItems,
    portfolio,
    summary,
    systemSummary,
    isLoading,
    homeError,
    failedSources,
  } = useHomePageData(metricsRange);

  // Loading state
  if (isLoading) {
    return (
      <div className="home-page">
        <div className="loading-state" role="status" aria-label="首页加载中">
          <div className="spinner" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  // Process data for child components
  const operatingFocus = {
    status: summary?.status || 'unknown',
    score: summary?.score || 0,
    blocked: summary?.blocked || 0,
    atRisk: summary?.at_risk || 0,
    watch: summary?.watch || 0,
    healthy: summary?.healthy || 0,
    runtimeGapProjects: systemMap.project_focus?.summary?.runtime_gap || 0,
    verificationGapProjects: systemMap.project_focus?.summary?.verification_gap || 0,
    verificationReadyProjects: systemMap.project_focus?.summary?.verification_ready || 0,
    readyAndRunningProjects: systemMap.project_focus?.summary?.ready_and_running || 0,
    priorityProjects: (portfolio?.priority_projects || []).slice(0, 5),
    totalDrafts: readOnlyDrafts.length,
    projectDrafts: readOnlyDrafts.filter((item) => item.source?.type === 'system_map_project_portfolio').length,
    verificationDrafts: readOnlyDrafts.filter((item) => item.source?.type === 'system_map_verification_ready').length,
    playbookDrafts: readOnlyDrafts.filter((item) => item.source?.type === 'system_map_playbook').length,
    domainAppDrafts: readOnlyDrafts.filter((item) => item.source?.type === 'system_map_domain_app').length,
    capabilityGapDrafts: readOnlyDrafts.filter((item) => item.source?.type === 'system_map_capability_gap').length,
    pageMaturityDrafts: readOnlyDrafts.filter((item) => item.source?.type === 'system_map_page_maturity').length,
    actionDrafts: [],
    weakestDimensions: (portfolio?.weakest_dimensions || []).slice(0, 3).map((dimension) => ({
      id: dimension.id,
      title: dimension.title,
      status: dimension.status,
      score: dimension.score || 0,
      failed: dimension.failed || 0,
      warning: dimension.warning || 0,
      nextAction: dimension.attention_projects?.[0]?.next_action || dimension.description || '进入系统地图查看修复台。',
      attentionProjects: dimension.attention_projects || [],
    })),
    domainAttention: (systemMap.domain_apps?.attention_items || []).slice(0, 3).map((item) => ({
      id: item.id,
      name: item.name || item.id,
      runtimeStatus: item.runtime_status || 'unknown',
      riskLevel: item.risk_level || 'unknown',
      securityPosture: item.security_posture || 'unknown',
      nextAction: item.next_action || '进入应用中心查看详情。',
    })),
  };

  const siteArchitecture = {
    projects: systemSummary?.projects || 0,
    pages: systemSummary?.cockpit_pages || cockpitPages.length || 0,
    domains: systemSummary?.feature_domains || featureDomains.length || 0,
    usagePaths: systemMap.usage_paths?.length || 0,
    playbooks: systemMap.playbooks?.length || 0,
    roadmapItems: systemSummary?.roadmap_items || systemMap.roadmap?.items?.length || 0,
    projectCoverageScore: systemSummary?.project_coverage_score || 0,
    pageMaturityScore: systemSummary?.page_maturity_score || 0,
    domainAppScore: systemSummary?.domain_app_score || 0,
    pageReady: systemSummary?.page_maturity_ready || 0,
    pageWatch: systemSummary?.page_maturity_watch || 0,
    capabilityWarnings: systemMap.project_capability_coverage?.summary?.warning_cells || 0,
    capabilityFailures: systemMap.project_capability_coverage?.summary?.failed_cells || 0,
    domainRunning: systemMap.domain_apps?.summary?.running || 0,
    externalMounts: systemMap.domain_apps?.summary?.external_mounts || 0,
    highRiskDomainApps: systemMap.domain_apps?.summary?.high_risk || 0,
    blockedProjects: systemSummary?.blocked_projects || summary?.blocked || 0,
    projectsNeedingAction: systemSummary?.projects_needing_action || 0,
    pageGroups: [],
    featureDomains,
    roadmapLanes: (systemMap.roadmap?.lanes || []).map((lane) => ({
      id: lane.id,
      title: lane.title,
      count: lane.items?.length || 0,
    })),
    laneSummaries: [],
  };

  return (
    <div className="home-page">
      {/* Error banner for partial failures */}
      {homeError && (
        <div
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 16px',
            border: '1px solid rgba(255, 71, 87, 0.35)',
            borderRadius: 'var(--cockpit-radius-md)',
            background: 'rgba(255, 71, 87, 0.08)',
            color: 'var(--cockpit-error)',
          }}
        >
          <span>{homeError}</span>
        </div>
      )}

      {/* System Health Summary */}
      <HealthSummarySection
        healthScore={healthSummary.health_score}
        healthScoreChange={healthSummary.health_score_change}
        activeServices={healthSummary.active_services}
        totalServices={healthSummary.total_services}
        activeTasks={healthSummary.active_tasks}
        activeTasksSource={healthSummary.active_tasks_source}
        todayRequests={healthSummary.today_requests}
        todayRequestsChange={healthSummary.today_requests_change}
        dataQuality={healthSummary.data_quality}
        degradedReasons={healthSummary.degraded_reasons}
      />

      {/* Alert Feed */}
      <AlertFeedSection alerts={alerts} onTabChange={onTabChange} />

      {/* Metrics Trend */}
      <MetricsTrendSection
        healthScoreData={metricsTrend.health_score}
        requestsData={metricsTrend.requests}
        errorRateData={metricsTrend.error_rate}
        dataQuality={metricsTrend.data_quality}
        degradedReasons={metricsTrend.degraded_reasons}
        timeRange={metricsRange}
        onTimeRangeChange={setMetricsRange}
      />

      {/* Recent Tasks */}
      <RecentTasksSection tasks={tasks} onTabChange={onTabChange} />

      {/* Governance Overview */}
      <GovernanceOverviewSection
        systemMap={systemMap}
        draftTasks={draftTasks}
        onTabChange={onTabChange}
        onOpenTarget={onOpenTarget}
      />

      {/* Quick Actions */}
      <QuickActionsSection onTabChange={onTabChange} />
    </div>
  );
}

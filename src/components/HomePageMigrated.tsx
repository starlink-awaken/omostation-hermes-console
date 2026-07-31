/**
 * Migration Example: HomePage with React Query
 * 
 * This shows how to migrate HomePage from manual fetch to React Query hooks.
 * The full HomePage is 3,392 lines, so this shows the key data fetching pattern.
 */

import React, { useState } from 'react';
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
import { useHomePageData, type HomePageData } from '../api/homePageHooks';

// ── Types ──

interface HomePageProps {
  onTabChange: (tab: string) => void;
  onOpenTarget: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
}

// ── Component ──

export default function HomePageMigrated({
  onTabChange,
  onOpenTarget,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
}: HomePageProps) {
  const [metricsRange, setMetricsRange] = useState<string>('7d');
  
  // Use the combined hook for all HomePage data
  const {
    healthSummary,
    alerts,
    tasks,
    metricsTrend,
    thoughts,
    systemMap,
    draftTasks,
    isLoading,
    error,
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

  // Error state (partial - some data may still be available)
  const hasPartialData = healthSummary.health_score > 0 || alerts.length > 0 || tasks.length > 0;

  return (
    <div className="home-page">
      {/* Error banner for partial failures */}
      {error && (
        <div 
          role="alert" 
          aria-label="首页数据状态"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 16,
            padding: '12px 16px',
            border: '1px solid rgba(255, 184, 0, 0.35)',
            borderRadius: 'var(--cockpit-radius-md)',
            background: 'rgba(255, 184, 0, 0.08)',
            color: 'var(--cockpit-warning)',
            fontSize: 14,
          }}
        >
          <ShieldAlert size={16} />
          <span>{error}</span>
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

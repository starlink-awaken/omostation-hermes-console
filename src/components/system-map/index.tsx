import React, { useEffect, useState } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';
import '../Dashboard.css';
import type { PageMaturityFilter, SystemMapPayload } from './types';
import { normalizeSearchText } from './utils';
import { useSystemMapData } from './useSystemMapData';
import { useSystemMapLayout } from './useSystemMapLayout';
import SystemMapToolbar from './SystemMapToolbar';
import SystemMapFilters from './SystemMapFilters';
import SystemMapDetailPanel from './SystemMapDetailPanel';
import SystemMapGraph from './SystemMapGraph';
import SourceInspector from './SourceInspector';

type SystemMapViewProps = {
  onNavigate: (tab: string) => void;
  onOpenTarget?: (target: { tab: string; taskQuery?: string; gapId?: string; projectId?: string }) => void;
  focusProjectId?: string | null;
  focusUsagePathId?: string | null;
  focusGapId?: string | null;
  focusCoverageDimensionId?: string | null;
  focusPageId?: string | null;
  focusFeatureDomainId?: string | null;
  focusTaskQuery?: string;
};

export default function SystemMapView({
  onNavigate,
  onOpenTarget,
  focusProjectId,
  focusUsagePathId,
  focusGapId,
  focusCoverageDimensionId,
  focusPageId,
  focusFeatureDomainId,
  focusTaskQuery,
}: SystemMapViewProps) {
  const data = useSystemMapData({ onOpenTarget });
  const {
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
  } = data;

  const [projectFilter, setProjectFilter] = useState('all');
  const [coverageFilter, setCoverageFilter] = useState('all');
  const [portfolioFilter, setPortfolioFilter] = useState('all');
  const [projectLayerFilter, setProjectLayerFilter] = useState('all');
  const [projectPageFilter, setProjectPageFilter] = useState('all');
  const [projectQuery, setProjectQuery] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedUsagePathId, setSelectedUsagePathId] = useState<string | null>(null);
  const [selectedGapId, setSelectedGapId] = useState<string | null>(null);
  const [selectedPageMaturityId, setSelectedPageMaturityId] = useState<string | null>(null);
  const [pageMaturityFilter, setPageMaturityFilter] = useState<PageMaturityFilter>('all');
  const [selectedFeatureDomainId, setSelectedFeatureDomainId] = useState<string | null>(null);

  const layout = useSystemMapLayout({
    systemMap,
    draftTasks,
    projectFilter,
    coverageFilter,
    portfolioFilter,
    projectLayerFilter,
    projectPageFilter,
    projectQuery,
    selectedProjectId,
    selectedUsagePathId,
    selectedGapId,
    selectedPageMaturityId,
    pageMaturityFilter,
    selectedFeatureDomainId,
    selectedProjectIds,
  });

  const {
    pagesById,
    projectLayerOptions,
    projectPageOptions,
    projectFocusOptions,
    coverageFilterOptions,
    coverageDimensions,
    activeCoverage,
    activePortfolioBucket,
    projectEntryRows,
    projectEntrySummary,
    activeRepairDimension,
    dimensionRepairRows,
    filteredProjects,
    coverageMatrixRows,
    filteredProjectIds,
    selectedVisibleProjectIds,
    filteredTriageQueues,
    filteredTriageCommandCount,
    visibleCommandCount,
    runtimeProbeSummary,
    selectedProject,
    activeUsagePath,
    activeUsagePlaybooks,
    activeUsageDomains,
    activeUsageRoadmap,
    activeUsageProjects,
    activeUsageTouchesDomainApps,
    activeUsageTriageCommands,
    activeUsageDrafts,
    selectedGap,
    pageMaturity,
    pageMaturitySummary,
    visiblePageMaturity,
    selectedPageMaturity,
    selectedPageGapSignals,
    selectedPagePlaybooks,
    selectedPageDrafts,
    selectedFeatureDomain,
    selectedFeaturePage,
    selectedFeatureProjects,
    selectedFeatureUsagePaths,
    selectedFeaturePlaybooks,
    selectedFeatureRoadmapItems,
    selectedFeaturePageMaturity,
    selectedFeatureDrafts,
    selectedFeatureSignals,
    gapClosureRows,
    selectedGapClosureRow,
    selectedProjectUsagePaths,
    selectedProjectPlaybooks,
    selectedProjectDrafts,
    systemMapWorkbenchRows,
    capabilityBuildBacklog,
    buildControlTower,
  } = layout;

  const activeSourceTarget = activeSourceRef ? (activeSourceRef.target || `${activeSourceRef.path}${activeSourceRef.line ? `:${activeSourceRef.line}` : ''}`) : '';

  // Seed initial selections when data loads
  useEffect(() => {
    if (!systemMap) return;
    setSelectedUsagePathId((current) => current || systemMap.usage_paths?.[0]?.id || null);
    setSelectedFeatureDomainId((current) => current || systemMap.feature_domains?.[0]?.id || null);
    const firstPage = systemMap.page_maturity?.items?.find((item) => item.status !== 'ready')
      || systemMap.page_maturity?.items?.[0]
      || systemMap.cockpit_pages?.[0];
    setSelectedPageMaturityId((current) => current || firstPage?.page_id || firstPage?.page?.id || firstPage?.id || null);
  }, [systemMap]);

  // Load data on mount
  useEffect(() => {
    load();
  }, []);

  // Sync focus props to state
  useEffect(() => { if (focusProjectId) setSelectedProjectId(focusProjectId); }, [focusProjectId]);
  useEffect(() => { if (focusUsagePathId) setSelectedUsagePathId(focusUsagePathId); }, [focusUsagePathId]);
  useEffect(() => { if (focusGapId) setSelectedGapId(focusGapId); }, [focusGapId]);
  useEffect(() => { if (focusCoverageDimensionId) setCoverageFilter(focusCoverageDimensionId); }, [focusCoverageDimensionId]);
  useEffect(() => { if (focusPageId) setSelectedPageMaturityId(focusPageId); }, [focusPageId]);
  useEffect(() => { if (focusFeatureDomainId) setSelectedFeatureDomainId(focusFeatureDomainId); }, [focusFeatureDomainId]);

  // Task query search
  useEffect(() => {
    if (!systemMap || !focusTaskQuery?.trim()) return;
    if (focusProjectId || focusUsagePathId || focusGapId || focusCoverageDimensionId || focusPageId || focusFeatureDomainId) return;
    const query = normalizeSearchText(focusTaskQuery);
    if (!query) return;

    const project = systemMap.projects.find((item) => [
      item.id, item.layer, item.stack, item.role, item.operational?.next_action, ...(item.operational?.risks || []),
    ].some((value) => normalizeSearchText(String(value || '')).includes(query)));
    if (project) { setSelectedProjectId(project.id); return; }

    const page = systemMap.cockpit_pages.find((item) => [item.id, item.title, item.purpose, ...(item.dimensions || [])]
      .some((value) => normalizeSearchText(String(value || '')).includes(query)));
    if (page) { setSelectedPageMaturityId(page.id); return; }

    const usagePath = (systemMap.usage_paths || []).find((item) => [item.id, item.title, item.intent]
      .some((value) => normalizeSearchText(String(value || '')).includes(query)));
    if (usagePath) { setSelectedUsagePathId(usagePath.id); return; }

    const gap = (systemMap.gaps || []).find((item) => [item.id, item.title, item.evidence, item.next]
      .some((value) => normalizeSearchText(String(value || '')).includes(query)));
    if (gap) { setSelectedGapId(gap.id); return; }

    const featureDomain = (systemMap.feature_domains || []).find((item) => [item.id, item.title, item.english]
      .some((value) => normalizeSearchText(String(value || '')).includes(query)));
    if (featureDomain) setSelectedFeatureDomainId(featureDomain.id);
  }, [focusCoverageDimensionId, focusFeatureDomainId, focusGapId, focusPageId, focusProjectId, focusTaskQuery, focusUsagePathId, systemMap]);

  // Sync feature domain selection
  useEffect(() => {
    const domains = systemMap?.feature_domains || [];
    if (!domains.length) return;
    if (selectedFeatureDomainId && domains.some((domain) => domain.id === selectedFeatureDomainId)) return;
    const usagePreferred = activeUsageDomains[0];
    const fallback = usagePreferred || domains[0];
    setSelectedFeatureDomainId(fallback?.id || null);
  }, [activeUsageDomains, selectedFeatureDomainId, systemMap]);

  // Sync page maturity selection
  useEffect(() => {
    if (!pageMaturity.length) return;
    if (selectedPageMaturityId && pageMaturity.some((item) => item.page.id === selectedPageMaturityId)) return;
    const preferred = pageMaturity.find((item) => item.status !== 'ready') || pageMaturity[0];
    setSelectedPageMaturityId(preferred?.page.id || null);
  }, [pageMaturity, selectedPageMaturityId]);

  useEffect(() => {
    if (!visiblePageMaturity.length || visiblePageMaturity.some((item) => item.page.id === selectedPageMaturityId)) return;
    setSelectedPageMaturityId(visiblePageMaturity[0].page.id);
  }, [selectedPageMaturityId, visiblePageMaturity]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在生成 Cockpit 系统地图...</p>
      </div>
    );
  }

  if (error || !systemMap) {
    return (
      <div className="system-map-error" role="alert">
        <ShieldAlert size={18} />
        <span>{error || '系统地图不可用'}</span>
        <button type="button" className="antd-btn" onClick={() => void load()}>
          <RefreshCw size={14} />
          <span>重试系统地图</span>
        </button>
      </div>
    );
  }

  return (
    <div className="system-map-page animate-fade-in">
      <SystemMapToolbar systemMap={systemMap} onRefresh={load} />

      {(actionNotice || actionError) && (
        <div className={`system-map-action-feedback ${actionError ? 'error' : 'success'}`} role={actionError ? 'alert' : 'status'}>
          {actionError || actionNotice}
        </div>
      )}

      <SourceInspector activeRef={activeSourceRef} preview={sourcePreview} loading={sourceLoading} error={sourceError} />

      <SystemMapDetailPanel
        systemMap={systemMap}
        selectedGap={selectedGap}
        selectedGapClosureRow={selectedGapClosureRow}
        selectedProject={selectedProject}
        selectedProjectUsagePaths={selectedProjectUsagePaths}
        selectedProjectPlaybooks={selectedProjectPlaybooks}
        selectedProjectDrafts={selectedProjectDrafts}
        selectedPageMaturity={selectedPageMaturity}
        selectedPagePlaybooks={selectedPagePlaybooks}
        selectedPageDrafts={selectedPageDrafts}
        selectedFeatureDomain={selectedFeatureDomain}
        selectedFeaturePage={selectedFeaturePage}
        selectedFeatureUsagePaths={selectedFeatureUsagePaths}
        selectedFeaturePlaybooks={selectedFeaturePlaybooks}
        selectedFeatureRoadmapItems={selectedFeatureRoadmapItems}
        selectedFeatureDrafts={selectedFeatureDrafts}
        selectedFeatureSignals={selectedFeatureSignals}
        activeSourceTarget={activeSourceTarget}
        pendingActionKey={pendingActionKey}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onInspect={inspectSourceRef}
        onFocusCoverage={(dimensionId) => setCoverageFilter(dimensionId)}
        onFocusUsagePath={(usagePathId) => setSelectedUsagePathId(usagePathId)}
        onFocusPageMaturity={(pageId) => setSelectedPageMaturityId(pageId)}
        onQueueAction={queueProjectAction}
        onQueueTriageCommand={queueProjectTriageCommand}
        onSetSelectedProjectId={setSelectedProjectId}
        onSetSelectedGapId={setSelectedGapId}
        onSetSelectedPageMaturityId={setSelectedPageMaturityId}
        onSetSelectedUsagePathId={setSelectedUsagePathId}
        draftTasks={draftTasks}
      />

      <SystemMapGraph
        systemMap={systemMap}
        draftTasks={draftTasks}
        gapClosureRows={gapClosureRows}
        systemMapWorkbenchRows={systemMapWorkbenchRows}
        activeUsagePath={activeUsagePath}
        activeUsagePlaybooks={activeUsagePlaybooks}
        activeUsageDomains={activeUsageDomains}
        activeUsageRoadmap={activeUsageRoadmap}
        activeUsageProjects={activeUsageProjects}
        activeUsageTriageCommands={activeUsageTriageCommands}
        activeUsageDrafts={activeUsageDrafts}
        projectEntryRows={projectEntryRows}
        projectEntrySummary={projectEntrySummary}
        activeRepairDimension={activeRepairDimension}
        dimensionRepairRows={dimensionRepairRows}
        filteredProjects={filteredProjects}
        coverageMatrixRows={coverageMatrixRows}
        filteredTriageQueues={filteredTriageQueues}
        filteredTriageCommandCount={filteredTriageCommandCount}
        visibleCommandCount={visibleCommandCount}
        runtimeProbeSummary={runtimeProbeSummary}
        pageMaturity={pageMaturity}
        pageMaturitySummary={pageMaturitySummary}
        visiblePageMaturity={visiblePageMaturity}
        selectedFeatureDomain={selectedFeatureDomain}
        selectedFeatureDomainId={selectedFeatureDomainId}
        capabilityBuildBacklog={capabilityBuildBacklog}
        buildControlTower={buildControlTower}
        activeSourceTarget={activeSourceTarget}
        pendingActionKey={pendingActionKey}
        bulkTriagePending={bulkTriagePending}
        selectedVisibleProjectIds={selectedVisibleProjectIds}
        coverageDimensions={coverageDimensions}
        activeCoverage={activeCoverage}
        activePortfolioBucket={activePortfolioBucket}
        projectLayerOptions={projectLayerOptions}
        projectPageOptions={projectPageOptions}
        projectLayerFilter={projectLayerFilter}
        projectPageFilter={projectPageFilter}
        activeCoverage={activeCoverage}
        projectFilter={projectFilter}
        pageMaturityFilter={pageMaturityFilter}
        onSetPageMaturityFilter={setPageMaturityFilter}
        onSetProjectLayerFilter={setProjectLayerFilter}
        onSetProjectPageFilter={setProjectPageFilter}
        onSetPortfolioFilter={(bucketId) => { setPortfolioFilter(bucketId); setProjectFilter('all'); setCoverageFilter('all'); setProjectQuery(''); }}
        onSetProjectFilter={setProjectFilter}
        onSetProjectQuery={setProjectQuery}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onInspect={inspectSourceRef}
        onSetSelectedProjectId={setSelectedProjectId}
        onSetSelectedGapId={setSelectedGapId}
        onSetSelectedUsagePathId={setSelectedUsagePathId}
        onSetSelectedPageMaturityId={setSelectedPageMaturityId}
        onSetSelectedFeatureDomainId={setSelectedFeatureDomainId}
        onSetCoverageFilter={setCoverageFilter}
        onQueueProjectAction={queueProjectAction}
        onQueueProjectTriageCommand={queueProjectTriageCommand}
        onPromoteDraftTask={promoteDraftTask}
        onQueuePageOperatorAction={queuePageOperatorAction}
        onQueueCoverageDrafts={queueCoverageDrafts}
        onQueueVerificationTriage={queueVerificationTriage}
        onQueueRuntimeTriage={queueRuntimeTriage}
        onExecuteVerificationTriage={executeVerificationTriage}
        onExecuteRuntimeTriage={executeRuntimeTriage}
        onSetSelectedProjectIds={setSelectedProjectIds}
      />
    </div>
  );
}

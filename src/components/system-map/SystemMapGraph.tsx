import React from 'react';
import type {
  CapabilityGapClosureRow,
  CockpitNavigationTarget,
  DraftTask,
  FeatureDomain,
  PageMaturity,
  ProjectAction,
  ProjectItem,
  ProjectPortfolioPriority,
  ProjectTriageQueue,
  RoadmapItem,
  SourceRef,
  SystemMapPayload,
  SystemMapWorkbenchRow,
  UsagePath,
} from './types';
import SystemMapSummary from './SystemMapSummary';
import GapClosureSection from './GapClosureSection';
import WorkbenchSection from './WorkbenchSection';
import UsagePathConsole from './UsagePathConsole';
import PortfolioSection from './PortfolioSection';
import DimensionWorkbench from './DimensionWorkbench';
import BuildControlSection from './BuildControlSection';
import RoadmapSection from './RoadmapSection';
import PageMaturitySection from './PageMaturitySection';
import OperationPlaybooks from './OperationPlaybooks';
import DomainCoverage from './DomainCoverage';
import TriageMatrixSection from './TriageMatrixSection';

type SystemMapGraphProps = {
  systemMap: SystemMapPayload;
  draftTasks: DraftTask[];
  gapClosureRows: CapabilityGapClosureRow[];
  systemMapWorkbenchRows: SystemMapWorkbenchRow[];
  activeUsagePath: UsagePath | null;
  activeUsagePlaybooks: SystemMapPayload['playbooks'];
  activeUsageDomains: FeatureDomain[];
  activeUsageRoadmap: RoadmapItem[];
  activeUsageProjects: ProjectItem[];
  activeUsageTriageCommands: ProjectAction[];
  activeUsageDrafts: DraftTask[];
  projectEntryRows: { priority: ProjectPortfolioPriority; project: ProjectItem; page: SystemMapPayload['cockpit_pages'][number] | null; primaryDimension: ProjectItem['portfolio']['non_ready_dimensions'][number] | null; draft: DraftTask | null; draftTarget: { tab: string; taskQuery: string; draftKey?: string } }[];
  projectEntrySummary: { mapped: number; drafts: number; blocked: number };
  activeRepairDimension: SystemMapPayload['project_capability_coverage']['dimension_summary'][number] | null;
  dimensionRepairRows: { attention: SystemMapPayload['project_capability_coverage']['dimension_summary'][number]['attention_projects'][number]; project: ProjectItem; check?: ProjectItem['coverage_checks'][number]; commands: ProjectAction[] }[];
  filteredProjects: ProjectItem[];
  coverageMatrixRows: { project: ProjectItem; checks: ProjectItem['coverage_checks']; ready: number; warning: number; failed: number }[];
  filteredTriageQueues: ProjectTriageQueue[];
  filteredTriageCommandCount: number;
  runtimeProbeSummary: { runtimeProjects: number; stopped: number; pendingApproval: number; approved: number; commands: number };
  pageMaturity: PageMaturity[];
  pageMaturitySummary: { ready: number; watch: number; gap: number; tracked: number; untracked: number; roadmapShipped: number };
  visiblePageMaturity: PageMaturity[];
  selectedFeatureDomain: FeatureDomain | null;
  selectedFeatureDomainId: string | null;
  capabilityBuildBacklog: {
    pagesWithoutUsage: PageMaturity[];
    pagesWithoutDomain: PageMaturity[];
    plannedRoadmapItems: RoadmapItem[];
    gapItems: SystemMapPayload['gaps'];
    domainAttention: SystemMapPayload['domain_apps']['attention_items'];
    actionableDrafts: DraftTask[];
  };
  buildControlTower: {
    pageItems: PageMaturity[];
    domainContractItems: SystemMapPayload['domain_apps']['items'];
    verificationItems: ({ kind: 'draft'; task: DraftTask; project: ProjectItem | null } | { kind: 'project'; project: ProjectPortfolioPriority })[];
    priorityItems: ({ kind: 'project'; project: ProjectPortfolioPriority } | { kind: 'roadmap'; roadmap: RoadmapItem })[];
  };
  activeSourceTarget: string;
  pendingActionKey: string | null;
  bulkTriagePending: boolean;
  selectedVisibleProjectIds: string[];
  coverageDimensions: { id: string; title: string; description: string }[];
  activeCoverage?: { id: string; title: string; description: string } | undefined;
  activePortfolioBucket: SystemMapPayload['project_portfolio']['buckets'][number] | null;
  projectLayerOptions: string[];
  projectPageOptions: { id: string; title: string }[];
  projectLayerFilter: string;
  projectPageFilter: string;
  projectFilter: string;
  pageMaturityFilter: string;
  onSetPageMaturityFilter: (filter: string) => void;
  onSetProjectLayerFilter: (filter: string) => void;
  onSetProjectPageFilter: (filter: string) => void;
  onSetPortfolioFilter: (bucketId: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onInspect: (ref: SourceRef) => void;
  onSetSelectedProjectId: (id: string | null) => void;
  onSetSelectedGapId: (id: string | null) => void;
  onSetSelectedUsagePathId: (id: string | null) => void;
  onSetSelectedPageMaturityId: (id: string | null) => void;
  onSetSelectedFeatureDomainId: (id: string | null) => void;
  onSetCoverageFilter: (dimensionId: string) => void;
  onSetProjectFilter: (filter: string) => void;
  onSetProjectQuery: (query: string) => void;
  onQueueProjectAction: (projectId: string, action: ProjectAction) => void;
  onQueueProjectTriageCommand: (command: ProjectAction) => void;
  onPromoteDraftTask: (task: DraftTask) => void;
  onQueuePageOperatorAction: (pageId: string, action: { id: string; kind?: string; label?: string }) => void;
  onQueueCoverageDrafts: () => void;
  onQueueVerificationTriage: (commandId?: 'verification-rerun' | 'verification-find-evidence', projectIds?: string[]) => void;
  onQueueRuntimeTriage: () => void;
  onExecuteVerificationTriage: () => void;
  onExecuteRuntimeTriage: () => void;
  onSetSelectedProjectIds: (ids: string[]) => void;
  visibleCommandCount: number;
  onNavigate: (target: string) => void;
};

function SystemMapGraph({
  systemMap,
  draftTasks,
  gapClosureRows,
  systemMapWorkbenchRows,
  activeUsagePath,
  activeUsagePlaybooks,
  activeUsageDomains,
  activeUsageRoadmap,
  activeUsageProjects,
  activeUsageTriageCommands,
  activeUsageDrafts,
  projectEntryRows,
  projectEntrySummary,
  activeRepairDimension,
  dimensionRepairRows,
  filteredProjects,
  coverageMatrixRows,
  filteredTriageQueues,
  filteredTriageCommandCount,
  visibleCommandCount,
  runtimeProbeSummary,
  pageMaturity,
  pageMaturitySummary,
  visiblePageMaturity,
  selectedFeatureDomain,
  selectedFeatureDomainId,
  capabilityBuildBacklog,
  buildControlTower,
  activeSourceTarget,
  pendingActionKey,
  bulkTriagePending,
  selectedVisibleProjectIds,
  coverageDimensions,
  activeCoverage,
  activePortfolioBucket,
  projectLayerOptions,
  projectPageOptions,
  projectLayerFilter,
  projectPageFilter,
  projectFilter,
  pageMaturityFilter,
  onSetProjectLayerFilter,
  onSetProjectPageFilter,
  onSetPageMaturityFilter,
  onSetPortfolioFilter,
  onNavigate,
  onOpenTarget,
  onInspect,
  onSetSelectedProjectId,
  onSetSelectedGapId,
  onSetSelectedUsagePathId,
  onSetSelectedPageMaturityId,
  onSetSelectedFeatureDomainId,
  onSetCoverageFilter,
  onSetProjectFilter,
  onSetProjectQuery,
  onQueueProjectAction,
  onQueueProjectTriageCommand,
  onPromoteDraftTask,
  onQueueCoverageDrafts,
  onQueueVerificationTriage,
  onQueueRuntimeTriage,
  onExecuteVerificationTriage,
  onExecuteRuntimeTriage,
  onSetSelectedProjectIds,
  onQueuePageOperatorAction,
}: SystemMapGraphProps) {
  return (
    <>
      <SystemMapSummary systemMap={systemMap} />

      <GapClosureSection
        gapClosureRows={gapClosureRows}
        draftTasks={draftTasks}
        onSetSelectedGapId={onSetSelectedGapId}
        onSetSelectedProjectId={onSetSelectedProjectId}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <WorkbenchSection
        systemMapWorkbenchRows={systemMapWorkbenchRows}
        draftTasks={draftTasks}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <UsagePathConsole
        systemMap={systemMap}
        activeUsagePath={activeUsagePath}
        activeUsagePlaybooks={activeUsagePlaybooks}
        activeUsageDomains={activeUsageDomains}
        activeUsageRoadmap={activeUsageRoadmap}
        activeUsageProjects={activeUsageProjects}
        activeUsageTriageCommands={activeUsageTriageCommands}
        activeUsageDrafts={activeUsageDrafts}
        draftTasks={draftTasks}
        pendingActionKey={pendingActionKey}
        bulkTriagePending={bulkTriagePending}
        activeSourceTarget={activeSourceTarget}
        onSetSelectedUsagePathId={onSetSelectedUsagePathId}
        onSetSelectedProjectId={onSetSelectedProjectId}
        onPromoteDraftTask={onPromoteDraftTask}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onInspect={onInspect}
      />

      <PortfolioSection
        systemMap={systemMap}
        projectEntryRows={projectEntryRows}
        projectEntrySummary={projectEntrySummary}
        onSetPortfolioFilter={onSetPortfolioFilter}
        onSetCoverageFilter={onSetCoverageFilter}
        onSetSelectedProjectId={onSetSelectedProjectId}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <DimensionWorkbench
        systemMap={systemMap}
        activeRepairDimension={activeRepairDimension}
        dimensionRepairRows={dimensionRepairRows}
        onSetCoverageFilter={onSetCoverageFilter}
        onSetSelectedProjectId={onSetSelectedProjectId}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <BuildControlSection
        capabilityBuildBacklog={capabilityBuildBacklog}
        buildControlTower={buildControlTower}
        draftTasks={draftTasks}
        onSetSelectedPageMaturityId={onSetSelectedPageMaturityId}
        onSetSelectedGapId={onSetSelectedGapId}
        onSetSelectedProjectId={onSetSelectedProjectId}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <RoadmapSection
        systemMap={systemMap}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onInspect={onInspect}
        activeSourceTarget={activeSourceTarget}
      />

      <PageMaturitySection
        pageMaturity={pageMaturity}
        pageMaturitySummary={pageMaturitySummary}
        visiblePageMaturity={visiblePageMaturity}
        pageMaturityFilter={pageMaturityFilter}
        activeSourceTarget={activeSourceTarget}
        onSetSelectedPageMaturityId={onSetSelectedPageMaturityId}
        onSetPageMaturityFilter={onSetPageMaturityFilter}
        onQueuePageOperatorAction={onQueuePageOperatorAction}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onInspect={onInspect}
      />

      <OperationPlaybooks
        systemMap={systemMap}
        activeSourceTarget={activeSourceTarget}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onInspect={onInspect}
      />

      <DomainCoverage
        systemMap={systemMap}
        selectedFeatureDomainId={selectedFeatureDomainId}
        activeSourceTarget={activeSourceTarget}
        onSetSelectedFeatureDomainId={onSetSelectedFeatureDomainId}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onInspect={onInspect}
      />

      <TriageMatrixSection
        systemMap={systemMap}
        filteredProjects={filteredProjects}
        coverageMatrixRows={coverageMatrixRows}
        filteredTriageQueues={filteredTriageQueues}
        filteredTriageCommandCount={filteredTriageCommandCount}
        runtimeProbeSummary={runtimeProbeSummary}
        coverageDimensions={coverageDimensions}
        activeCoverage={activeCoverage}
        activePortfolioBucket={activePortfolioBucket}
        projectLayerOptions={projectLayerOptions}
        projectPageOptions={projectPageOptions}
        projectLayerFilter={projectLayerFilter}
        projectPageFilter={projectPageFilter}
        projectFilter={projectFilter}
        selectedVisibleProjectIds={selectedVisibleProjectIds}
        visibleCommandCount={visibleCommandCount}
        pendingActionKey={pendingActionKey}
        bulkTriagePending={bulkTriagePending}
        activeSourceTarget={activeSourceTarget}
        onSetProjectLayerFilter={onSetProjectLayerFilter}
        onSetProjectPageFilter={onSetProjectPageFilter}
        onSetCoverageFilter={onSetCoverageFilter}
        onSetProjectFilter={onSetProjectFilter}
        onSetSelectedProjectId={onSetSelectedProjectId}
        onSetSelectedGapId={onSetSelectedGapId}
        onSetSelectedProjectIds={onSetSelectedProjectIds}
        onQueueProjectAction={onQueueProjectAction}
        onQueueProjectTriageCommand={onQueueProjectTriageCommand}
        onQueueCoverageDrafts={onQueueCoverageDrafts}
        onQueueVerificationTriage={onQueueVerificationTriage}
        onQueueRuntimeTriage={onQueueRuntimeTriage}
        onExecuteVerificationTriage={onExecuteVerificationTriage}
        onExecuteRuntimeTriage={onExecuteRuntimeTriage}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onInspect={onInspect}
      />
    </>
  );
}

export default SystemMapGraph;

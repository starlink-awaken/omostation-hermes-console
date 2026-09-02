import React from 'react';
import { ArrowRight, Map as MapIcon, Route, Sparkles } from 'lucide-react';
import '../Dashboard.css';
import ActionSurfacePanel from '../ActionSurfacePanel';
import { COCKPIT_WORK_MODES } from '../cockpitWorkModes';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import { useGuideData, GUIDE_GROUPS } from './useGuideData';
import { useGuideComputations } from './useGuideComputations';
import { GuideUsagePath } from './GuideUsagePath';
import { GuideTaskList } from './GuideTaskList';
import { GuidePlaybook } from './GuidePlaybook';
import { GuideGapSection, GuideMissingCapabilitySection, GuideProblemEntrySection } from './GuideGapSection';
import { GuideClosureSection } from './GuideClosureSection';
import { GuidePageCoverageSection } from './GuidePageCoverageSection';
import {
  GuideFeatureDomainSection,
  GuideDimensionSection,
  GuideProjectEntrySection,
  GuideObjectCoverageSection,
} from './GuideCoverageTables';
import { GuideExecutionChainSection } from './GuideExecutionChainSection';
import { GuideRoleSection } from './GuideRoleSection';
import { GuideArchitectureSection } from './GuideArchitectureSection';
import { guideDraftTypeLabel, pageCoverageStatusClass, pageCoverageStatusText } from './guideHelpers';

interface CockpitGuideViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
}

// Re-export for external consumers (e.g., CockpitGuideView.tsx)
export { guideDraftTypeLabel };

export default function CockpitGuideView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
}: CockpitGuideViewProps) {
  const {
    metrics,
    metricsError,
    pendingDraftId,
    draftActionNotice,
    draftActionError,
    setGuideRetryToken,
    promoteFeaturedDraft,
    GUIDE_PATHS,
    GUIDE_PAGES_BY_ID,
  } = useGuideData();

  const {
    summaryCards,
    coverageSummary,
    usageCoverageSummary,
    architectureLaneRows,
    architectureLaneSummary,
    coverageGroups,
    featureDomainCoverageSummary,
    dimensionCoverageSummary,
    projectEntryRows,
    projectEntrySummary,
    objectCoverageRows,
    objectCoverageSummary,
    missingCapabilityRows,
    missingCapabilitySummary,
    executionChainRows,
    roleWorkbenchRows,
    focusedGuideCard,
    problemEntryCards,
  } = useGuideComputations({
    metrics,
    GUIDE_GROUPS,
    GUIDE_PAGES_BY_ID,
    focusPageId,
    focusProjectId,
    focusTaskQuery,
  });

  const staticPageCount = GUIDE_GROUPS.reduce((total, group) => total + group.pages.length, 0);

  return (
    <div className="cockpit-guide-page">
      <section className="cockpit-guide-band antd-card" aria-label="Cockpit 导览总览">
        <div className="cockpit-guide-band-head">
          <div>
            <small>Guide</small>
            <h2>全站导览</h2>
            <p>把 cockpit 从"很多页面"整理成"可理解、可上手、可闭环"的工作台。</p>
          </div>
          <div className="cockpit-guide-band-badge">
            <Sparkles size={16} />
            <span>先定路径，再下钻页面</span>
          </div>
        </div>
        <div className="cockpit-guide-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.id} className="cockpit-guide-summary-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      {metricsError && (
        <div className="shell-data-banner" role="alert">
          <span>{metricsError}，当前导览覆盖数据可能不完整。</span>
          <button type="button" onClick={() => setGuideRetryToken((token) => token + 1)}>
            重试
          </button>
        </div>
      )}

      {(draftActionNotice || draftActionError) && (
        <div className={`shell-data-banner ${draftActionError ? 'error' : ''}`} role={draftActionError ? 'alert' : 'status'}>
          <span>{draftActionError || draftActionNotice}</span>
        </div>
      )}

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>功能架构工作带总表</h2>
            <p className="text-muted">把入口、运行、智能、治理、开发工具和领域应用六条工作带拉平，看每一带有没有页面、使用链、能力域和补位动作。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{architectureLaneSummary.total}</strong> 条工作带</span>
          <span><strong>{architectureLaneSummary.ready}</strong> 条已接通</span>
          <span><strong>{architectureLaneSummary.attention}</strong> 条待补位</span>
          <span><strong>{architectureLaneSummary.usageConnected}</strong> 条已挂使用链</span>
          <span><strong>{architectureLaneSummary.roadmapLinked}</strong> 条已挂路线图</span>
        </div>
        <div className="cockpit-guide-coverage-list">
          {architectureLaneRows.map((row) => (
            <div key={row.id} className={`cockpit-guide-coverage-row ${pageCoverageStatusClass(row.status)}`}>
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.signal}</small>
                </div>
                <span className={`cockpit-guide-coverage-status ${pageCoverageStatusClass(row.status)}`}>
                  {pageCoverageStatusText(row.status)}
                </span>
              </div>
              <p>{row.summary}</p>
              <div className="cockpit-guide-coverage-meta">
                <span>页面 {row.pageCount} 个</span>
                <span>使用链 {row.usageCount} 条</span>
                <span>能力域 {row.domainCount} 个</span>
                <span>草稿 {row.draftCount} 条</span>
                <span>待处理 {row.attentionCount} 项</span>
              </div>
              <div className="cockpit-guide-coverage-next">
                <strong>下一步</strong>
                <p>{row.nextAction}</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开工作带 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>看工作带</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开工作带任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看补位任务</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ActionSurfacePanel
        title="推荐起手动作"
        subtitle="你不用记住全部页面，按目标选一条路径就够了。"
        statusText={metrics.attentionPages > 0 ? `${metrics.attentionPages} 页待补位` : '导览已接通'}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        items={[
          {
            id: 'guide-home',
            title: '从首页开始值守',
            detail: '健康、告警、任务是最稳的日常入口。',
            actionLabel: '打开首页',
            actionType: 'navigate',
            actionValue: 'Home',
            actionTarget: { tab: 'Home', taskQuery: focusTaskQuery || metrics.pageAttentionItems[0]?.page_id || 'CockpitGuide' },
          },
          {
            id: 'guide-map',
            title: '从系统地图看缺口',
            detail: '当你觉得 cockpit 还缺功能，就去系统地图看页面、能力域和路线图。',
            actionLabel: '打开系统地图',
            actionType: 'navigate',
            actionValue: 'SystemMap',
            actionTarget: { tab: 'SystemMap', taskQuery: focusTaskQuery || metrics.weakestDimensions[0]?.id || 'CockpitGuide' },
          },
          {
            id: 'guide-domain',
            title: '从应用中心进领域',
            detail: '家庭驾驶舱、OPC、family-hub 先做挂载，不直接并入 cockpit。',
            actionLabel: '打开应用中心',
            actionType: 'navigate',
            actionValue: 'DomainApps',
            actionTarget: { tab: 'DomainApps', taskQuery: focusTaskQuery || metrics.domainAttention[0]?.id || 'CockpitGuide' },
          },
          {
            id: 'guide-task',
            title: '从任务中心承接动作',
            detail: '研究、治理、页面补位最后都要沉到任务中心。',
            actionLabel: '打开任务中心',
            actionType: 'navigate',
            actionValue: 'TaskCenter',
            actionTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || metrics.closureDrafts[0]?.sourceId || metrics.closureDrafts[0]?.id || 'CockpitGuide' },
          },
        ]}
      />

      {focusedGuideCard && (
        <section className="cockpit-guide-section" aria-label="当前导览承接焦点">
          <div className="section-header">
            <div>
              <h2>当前导览承接焦点</h2>
              <p className="text-muted">导览页先把你刚定位到的对象和任务承接摆出来，再决定往系统地图、应用中心还是任务中心继续下钻。</p>
            </div>
            <button className="antd-btn small" onClick={() => onNavigate?.('SystemMap')} aria-label="回系统地图继续定位">
              <MapIcon size={13} />
              <span>回系统地图</span>
            </button>
          </div>
          <div className="cockpit-guide-focus-grid">
            <article className="cockpit-guide-focus-card">
              <div className="cockpit-guide-focus-head">
                <strong>{focusedGuideCard.title}</strong>
                <span>{focusedGuideCard.meta}</span>
              </div>
              <div className="cockpit-guide-focus-list">
                <div className="cockpit-guide-focus-item" style={{ cursor: 'default' }}>
                  <div>
                    <strong>当前状态</strong>
                    <small>{focusedGuideCard.state}</small>
                  </div>
                  <p>{focusedGuideCard.nextAction}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  type="button"
                  className="antd-btn small"
                  aria-label={`打开导览焦点对象 ${focusedGuideCard.title}`}
                  onClick={() => openCockpitNavigationTarget(focusedGuideCard.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={13} />
                  <span>看对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn small"
                  aria-label={`打开导览焦点任务 ${focusedGuideCard.title}`}
                  onClick={() => openCockpitNavigationTarget(focusedGuideCard.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={13} />
                  <span>看任务承接</span>
                </button>
              </div>
            </article>
          </div>
        </section>
      )}

      <GuideGapSection metrics={metrics} onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      <GuideMissingCapabilitySection
        missingCapabilityRows={missingCapabilityRows}
        missingCapabilitySummary={missingCapabilitySummary}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideProblemEntrySection
        problemEntryCards={problemEntryCards}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideUsagePath paths={GUIDE_PATHS} onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      <GuidePlaybook
        metrics={metrics}
        usageCoverageSummary={usageCoverageSummary}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideRoleSection
        roleWorkbenchRows={roleWorkbenchRows}
        workModes={COCKPIT_WORK_MODES}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideTaskList
        metrics={metrics}
        pendingDraftId={pendingDraftId}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        onPromoteDraft={promoteFeaturedDraft}
      />

      <GuideClosureSection metrics={metrics} onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      <GuidePageCoverageSection
        coverageGroups={coverageGroups}
        coverageSummary={coverageSummary}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideFeatureDomainSection
        featureDomainRows={metrics.featureDomainRows}
        featureDomainCoverageSummary={featureDomainCoverageSummary}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideDimensionSection
        dimensionRows={metrics.dimensionCoverageRows}
        dimensionCoverageSummary={dimensionCoverageSummary}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideProjectEntrySection
        projectEntryRows={projectEntryRows}
        projectEntrySummary={projectEntrySummary}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideObjectCoverageSection
        objectCoverageRows={objectCoverageRows}
        objectCoverageSummary={objectCoverageSummary}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideExecutionChainSection
        executionChainRows={executionChainRows}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />

      <GuideArchitectureSection
        GUIDE_GROUPS={GUIDE_GROUPS}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
      />
    </div>
  );
}

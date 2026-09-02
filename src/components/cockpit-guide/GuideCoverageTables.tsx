import React from 'react';
import { Compass, Map as MapIcon, Route } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import { pageCoverageStatusClass, pageCoverageStatusText, guideDraftTypeLabel } from './guideHelpers';

interface FeatureDomainRow {
  id: string;
  title: string;
  english?: string;
  cockpitPage?: string;
  status: string;
  providerCount: number;
  capabilityCount: number;
  linkedPages: string[];
  usagePaths: string[];
  capabilityItems: string[];
  nextAction: string;
  taskQuery: string;
  missingCockpitPage: boolean;
  missingCapabilityItems: boolean;
}

interface GuideFeatureDomainSectionProps {
  featureDomainRows: FeatureDomainRow[];
  featureDomainCoverageSummary: {
    total: number;
    ready: number;
    watch: number;
    gap: number;
    withUsagePath: number;
    withCapabilityItems: number;
  };
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideFeatureDomainSection({
  featureDomainRows,
  featureDomainCoverageSummary,
  onNavigate,
  onOpenTarget,
}: GuideFeatureDomainSectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>能力域能力总表</h2>
          <p className="text-muted">按能力域看主入口、provider 页面、能力项、使用路径和任务承接，直接回答"这个能力到底够不够用、挂没挂对"。</p>
        </div>
      </div>
      <div className="cockpit-guide-coverage-summary">
        <span><strong>{featureDomainCoverageSummary.total}</strong> 个能力域</span>
        <span><strong>{featureDomainCoverageSummary.ready}</strong> 已接通</span>
        <span><strong>{featureDomainCoverageSummary.watch}</strong> 待收口</span>
        <span><strong>{featureDomainCoverageSummary.gap}</strong> 待补位</span>
        <span><strong>{featureDomainCoverageSummary.withUsagePath}</strong> 已入路径</span>
        <span><strong>{featureDomainCoverageSummary.withCapabilityItems}</strong> 已定义能力项</span>
      </div>
      <div className="cockpit-guide-coverage-list">
        {featureDomainRows.map((row) => (
          <div key={`feature-domain-row-${row.id}`} className={`cockpit-guide-coverage-row ${pageCoverageStatusClass(row.status)}`}>
            <div className="cockpit-guide-coverage-row-head">
              <div>
                <strong>{row.title}</strong>
                <small>{row.id} · {pageCoverageStatusText(row.status)} · 主入口 {row.cockpitPage || '未登记'}</small>
              </div>
              <span className={`cockpit-guide-coverage-status ${pageCoverageStatusClass(row.status)}`}>
                {pageCoverageStatusText(row.status)}
              </span>
            </div>
            <p>{row.english || '进入系统地图查看该能力域的页面、能力项和 provider 映射。'}</p>
            <div className="cockpit-guide-coverage-meta">
              <span>页面 {row.linkedPages.length} 个</span>
              <span>能力项 {row.capabilityCount} 个</span>
              <span>使用路径 {row.usagePaths.length} 条</span>
              <span>provider {row.providerCount} 个</span>
            </div>
            <div className="cockpit-guide-coverage-tags">
              {row.linkedPages.slice(0, 2).map((item) => (
                <span key={`${row.id}-page-${item}`}>页面 · {item}</span>
              ))}
              {row.capabilityItems.slice(0, 2).map((item) => (
                <span key={`${row.id}-cap-${item}`}>能力项 · {item}</span>
              ))}
              {row.usagePaths.slice(0, 1).map((item) => (
                <span key={`${row.id}-usage-${item}`}>路径 · {item}</span>
              ))}
              {row.missingCockpitPage && <em>待挂主入口</em>}
              {row.missingCapabilityItems && <em>待补能力项</em>}
            </div>
            <div className="cockpit-guide-coverage-next">
              <strong>下一步</strong>
              <p>{row.nextAction}</p>
            </div>
            <div className="cockpit-guide-coverage-actions">
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开能力域能力 ${row.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', featureDomainId: row.id }, onNavigate, onOpenTarget)}
              >
                <MapIcon size={14} />
                <span>看能力域</span>
              </button>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开能力域任务 ${row.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>看任务承接</span>
              </button>
            </div>
          </div>
        ))}
        {featureDomainRows.length === 0 && (
          <div className="cockpit-guide-focus-empty">当前还没有能力域能力数据。</div>
        )}
      </div>
    </section>
  );
}

interface DimensionRow {
  id: string;
  title: string;
  description: string;
  status: string;
  score: number | null;
  ready: number;
  warning: number;
  failed: number;
  attentionProjects: Array<{ id: string; status?: string; nextAction?: string }>;
  nextAction: string;
  taskQuery: string;
}

interface GuideDimensionSectionProps {
  dimensionRows: DimensionRow[];
  dimensionCoverageSummary: {
    total: number;
    ready: number;
    warning: number;
    failed: number;
    attentionProjects: number;
  };
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

function dimensionStatusClass(status: string) {
  if (status === 'ready') return 'ready';
  if (status === 'warning' || status === 'watch') return 'watch';
  return 'gap';
}

function dimensionStatusText(status: string) {
  if (status === 'ready') return '已接通';
  if (status === 'warning' || status === 'watch') return '待收口';
  return '待修复';
}

export function GuideDimensionSection({
  dimensionRows,
  dimensionCoverageSummary,
  onNavigate,
  onOpenTarget,
}: GuideDimensionSectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>维度覆盖总表</h2>
          <p className="text-muted">把跨项目的运行、验证、入口、命令等维度直接拉平，看清哪条能力链在掉分，而不是只盯页面。</p>
        </div>
      </div>
      <div className="cockpit-guide-coverage-summary">
        <span><strong>{dimensionCoverageSummary.total}</strong> 条维度</span>
        <span><strong>{dimensionCoverageSummary.ready}</strong> 已接通</span>
        <span><strong>{dimensionCoverageSummary.warning}</strong> 待收口</span>
        <span><strong>{dimensionCoverageSummary.failed}</strong> 待修复</span>
        <span><strong>{dimensionCoverageSummary.attentionProjects}</strong> 个注意项目</span>
      </div>
      <div className="cockpit-guide-coverage-list">
        {dimensionRows.map((row) => (
          <div key={`dimension-row-${row.id}`} className={`cockpit-guide-coverage-row ${dimensionStatusClass(row.status)}`}>
            <div className="cockpit-guide-coverage-row-head">
              <div>
                <strong>{row.title}</strong>
                <small>{row.id} · {dimensionStatusText(row.status)} · {row.score ?? 0}%</small>
              </div>
              <span className={`cockpit-guide-coverage-status ${dimensionStatusClass(row.status)}`}>
                {dimensionStatusText(row.status)}
              </span>
            </div>
            <p>{row.description}</p>
            <div className="cockpit-guide-coverage-meta">
              <span>就绪 {row.ready} 项</span>
              <span>预警 {row.warning} 项</span>
              <span>失败 {row.failed} 项</span>
              <span>注意项目 {row.attentionProjects.length} 个</span>
            </div>
            <div className="cockpit-guide-coverage-tags">
              {row.attentionProjects.slice(0, 3).map((project) => (
                <span key={`${row.id}-attention-${project.id}`}>项目 · {project.id}</span>
              ))}
              {row.attentionProjects.length === 0 && (
                <em>当前没有显式注意项目</em>
              )}
            </div>
            <div className="cockpit-guide-coverage-next">
              <strong>下一步</strong>
              <p>{row.nextAction}</p>
            </div>
            <div className="cockpit-guide-coverage-actions">
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开维度覆盖 ${row.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', coverageDimensionId: row.id }, onNavigate, onOpenTarget)}
              >
                <MapIcon size={14} />
                <span>看维度覆盖</span>
              </button>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开维度任务 ${row.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>看修复任务</span>
              </button>
            </div>
          </div>
        ))}
        {dimensionRows.length === 0 && (
          <div className="cockpit-guide-focus-empty">当前还没有维度覆盖数据。</div>
        )}
      </div>
    </section>
  );
}

interface ProjectEntryRow {
  id: string;
  title: string;
  statusClass: string;
  statusText: string;
  layer: string;
  score: number;
  entryPageId: string;
  entryPageTitle: string;
  entryPageGroup: string;
  relatedDimensions: string[];
  relatedDrafts: Array<{ id: string; sourceType: string }>;
  nextAction: string;
  summary: string;
  entryTarget: CockpitNavigationTarget;
  coverageTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface GuideProjectEntrySectionProps {
  projectEntryRows: ProjectEntryRow[];
  projectEntrySummary: {
    total: number;
    mapped: number;
    atRisk: number;
    blocked: number;
    withDrafts: number;
  };
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideProjectEntrySection({
  projectEntryRows,
  projectEntrySummary,
  onNavigate,
  onOpenTarget,
}: GuideProjectEntrySectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>项目入口总表</h2>
          <p className="text-muted">把重点项目直接翻译成 cockpit 的入口页、项目覆盖面和任务承接入口，不再让"项目该从哪进"埋在矩阵和对象卡片里。</p>
        </div>
      </div>
      <div className="cockpit-guide-coverage-summary">
        <span><strong>{projectEntrySummary.total}</strong> 个重点项目</span>
        <span><strong>{projectEntrySummary.mapped}</strong> 个已映射入口页</span>
        <span><strong>{projectEntrySummary.atRisk}</strong> 个项目风险</span>
        <span><strong>{projectEntrySummary.blocked}</strong> 个项目阻塞</span>
        <span><strong>{projectEntrySummary.withDrafts}</strong> 个带承接草稿</span>
      </div>
      <div className="cockpit-guide-coverage-list">
        {projectEntryRows.map((row) => (
          <div key={`project-entry-${row.id}`} className={`cockpit-guide-coverage-row ${row.statusClass}`}>
            <div className="cockpit-guide-coverage-row-head">
              <div>
                <strong>{row.title}</strong>
                <small>{row.layer} · 入口 {row.entryPageTitle} · {row.score}%</small>
              </div>
              <span className={`cockpit-guide-coverage-status ${row.statusClass}`}>
                {row.statusText}
              </span>
            </div>
            <p>{row.summary}</p>
            <div className="cockpit-guide-coverage-meta">
              <span>入口页 {row.entryPageTitle}</span>
              <span>工作带 {row.entryPageGroup}</span>
              <span>承接草稿 {row.relatedDrafts.length} 条</span>
              <span>关联维度 {row.relatedDimensions.length} 条</span>
            </div>
            <div className="cockpit-guide-coverage-tags">
              {row.relatedDimensions.map((item) => (
                <span key={`${row.id}-dimension-${item}`}>维度 · {item}</span>
              ))}
              {row.relatedDrafts.slice(0, 2).map((draft) => (
                <span key={`${row.id}-draft-${draft.id}`}>草稿 · {guideDraftTypeLabel(draft.sourceType)}</span>
              ))}
              {row.relatedDimensions.length === 0 && row.relatedDrafts.length === 0 && (
                <em>当前还没有显式关联维度或草稿</em>
              )}
            </div>
            <div className="cockpit-guide-coverage-next">
              <strong>下一步</strong>
              <p>{row.nextAction}</p>
            </div>
            <div className="cockpit-guide-coverage-actions">
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开项目入口 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.entryTarget, onNavigate, onOpenTarget)}
              >
                <Compass size={14} />
                <span>进入口页</span>
              </button>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开项目覆盖 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.coverageTarget, onNavigate, onOpenTarget)}
              >
                <MapIcon size={14} />
                <span>看项目面</span>
              </button>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开项目任务 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>看任务</span>
              </button>
            </div>
          </div>
        ))}
        {projectEntryRows.length === 0 && (
          <div className="cockpit-guide-focus-empty">当前还没有重点项目入口数据。</div>
        )}
      </div>
    </section>
  );
}

interface ObjectCoverageRow {
  id: string;
  kind: string;
  title: string;
  statusClass: string;
  statusText: string;
  meta: string;
  summary: string;
  nextAction: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface GuideObjectCoverageSectionProps {
  objectCoverageRows: ObjectCoverageRow[];
  objectCoverageSummary: {
    total: number;
    projects: number;
    domains: number;
    drafts: number;
    ready: number;
  };
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideObjectCoverageSection({
  objectCoverageRows,
  objectCoverageSummary,
  onNavigate,
  onOpenTarget,
}: GuideObjectCoverageSectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>对象承接总表</h2>
          <p className="text-muted">把项目、领域对象和任务草稿放到同一层看，直接决定该回对象页还是回任务中心，不再分散在几块卡片里找。</p>
        </div>
      </div>
      <div className="cockpit-guide-coverage-summary">
        <span><strong>{objectCoverageSummary.total}</strong> 个对象</span>
        <span><strong>{objectCoverageSummary.projects}</strong> 个项目</span>
        <span><strong>{objectCoverageSummary.domains}</strong> 个领域对象</span>
        <span><strong>{objectCoverageSummary.drafts}</strong> 条草稿</span>
        <span><strong>{objectCoverageSummary.ready}</strong> 个稳定对象</span>
      </div>
      <div className="cockpit-guide-coverage-list">
        {objectCoverageRows.map((row) => (
          <div key={row.id} className={`cockpit-guide-coverage-row ${row.statusClass}`}>
            <div className="cockpit-guide-coverage-row-head">
              <div>
                <strong>{row.title}</strong>
                <small>{row.kind} · {row.meta}</small>
              </div>
              <span className={`cockpit-guide-coverage-status ${row.statusClass}`}>
                {row.statusText}
              </span>
            </div>
            <p>{row.summary}</p>
            <div className="cockpit-guide-coverage-next">
              <strong>下一步</strong>
              <p>{row.nextAction}</p>
            </div>
            <div className="cockpit-guide-coverage-actions">
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开对象承接 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
              >
                <Compass size={14} />
                <span>看对象</span>
              </button>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开对象任务 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>看任务</span>
              </button>
            </div>
          </div>
        ))}
        {objectCoverageRows.length === 0 && (
          <div className="cockpit-guide-focus-empty">当前还没有对象承接数据。</div>
        )}
      </div>
    </section>
  );
}

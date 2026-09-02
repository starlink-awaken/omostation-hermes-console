import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  ClipboardCheck,
  ExternalLink,
  Search,
  Send,
  Server,
  ShieldAlert,
  X,
} from 'lucide-react';
import type {
  CapabilityGapClosureRow,
  CockpitNavigationTarget,
  PageMaturity,
  ProjectAction,
  ProjectItem,
  ProjectPortfolioPriority,
  ProjectTriageQueue,
  SourceRef,
  SystemMapPayload,
} from './types';
import {
  closeoutText,
  copyText,
  coverageCountLabel,
  coverageStatusText,
  draftSourceLabel,
  openSystemMapTarget,
  pageMaturityStatusText,
  portfolioStatusText,
  projectStatusText,
  runtimeProfileText,
  runtimeStatusText,
  shortDate,
  statusClass,
  verifyText,
  withTaskDraftHandoff,
} from './utils';
import SourceRefList from './SourceRefList';
import ProjectActionList from './ProjectActionList';
import ProjectTriageQueues from './ProjectTriageQueues';

type CoverageMatrixRow = {
  project: ProjectItem;
  checks: ProjectItem['coverage_checks'];
  ready: number;
  warning: number;
  failed: number;
};

type TriageMatrixSectionProps = {
  systemMap: SystemMapPayload;
  filteredProjects: ProjectItem[];
  coverageMatrixRows: CoverageMatrixRow[];
  filteredTriageQueues: ProjectTriageQueue[];
  filteredTriageCommandCount: number;
  runtimeProbeSummary: { runtimeProjects: number; stopped: number; pendingApproval: number; approved: number; commands: number };
  coverageDimensions: { id: string; title: string; description: string }[];
  activeCoverage?: { id: string; title: string; description: string } | undefined;
  activePortfolioBucket: SystemMapPayload['project_portfolio']['buckets'][number] | null;
  projectLayerOptions: string[];
  projectPageOptions: { id: string; title: string }[];
  projectLayerFilter: string;
  projectPageFilter: string;
  projectFilter: string;
  selectedVisibleProjectIds: string[];
  visibleCommandCount: number;
  pendingActionKey: string | null;
  bulkTriagePending: boolean;
  activeSourceTarget: string;
  onSetProjectLayerFilter: (filter: string) => void;
  onSetProjectPageFilter: (filter: string) => void;
  onSetPortfolioFilter: (bucketId: string) => void;
  onSetCoverageFilter: (dimensionId: string) => void;
  onSetProjectFilter: (filter: string) => void;
  onSetSelectedProjectId: (id: string | null) => void;
  onSetSelectedGapId: (id: string | null) => void;
  onSetSelectedProjectIds: (ids: string[]) => void;
  onQueueProjectAction: (projectId: string, action: ProjectAction) => void;
  onQueueProjectTriageCommand: (command: ProjectAction) => void;
  onQueueCoverageDrafts: () => void;
  onQueueVerificationTriage: (commandId?: 'verification-rerun' | 'verification-find-evidence', projectIds?: string[]) => void;
  onQueueRuntimeTriage: () => void;
  onExecuteVerificationTriage: () => void;
  onExecuteRuntimeTriage: () => void;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onInspect: (ref: SourceRef) => void;
};

function TriageMatrixSection({
  systemMap,
  filteredProjects,
  coverageMatrixRows,
  filteredTriageQueues,
  filteredTriageCommandCount,
  runtimeProbeSummary,
  coverageDimensions,
  activeCoverage,
  activePortfolioBucket,
  projectLayerOptions,
  projectPageOptions,
  projectLayerFilter,
  projectPageFilter,
  projectFilter,
  selectedVisibleProjectIds,
  visibleCommandCount,
  pendingActionKey,
  bulkTriagePending,
  activeSourceTarget,
  onSetProjectLayerFilter,
  onSetProjectPageFilter,
  onSetCoverageFilter,
  onSetProjectFilter,
  onSetSelectedProjectId,
  onSetSelectedGapId,
  onSetSelectedProjectIds,
  onQueueProjectAction,
  onQueueProjectTriageCommand,
  onQueueCoverageDrafts,
  onQueueVerificationTriage,
  onQueueRuntimeTriage,
  onExecuteVerificationTriage,
  onExecuteRuntimeTriage,
  onNavigate,
  onOpenTarget,
  onInspect,
}: TriageMatrixSectionProps) {
  const pagesById = new Map(systemMap.cockpit_pages.map((p) => [p.id, p]));

  return (
    <>
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>排查命令队列</h2><p className="text-muted">把运行探针、验证证据和项目清单缺口转换成可复制命令，仍由人确认后执行。</p></div>
          <div className="system-map-section-actions">
            <button className="antd-btn antd-btn-primary" aria-label="批量承接全站缺口" disabled={bulkTriagePending} onClick={onQueueCoverageDrafts} title="把项目组合、领域应用、能力缺口和页面成熟度草稿统一登记为 OMO 计划任务"><ClipboardCheck size={13} /><span>{bulkTriagePending ? '正在承接' : '承接全站缺口'}</span></button>
            <button className="antd-btn antd-btn-primary" aria-label="批量承接验证缺口" disabled={bulkTriagePending || systemMap.project_triage.summary.verification_commands === 0} onClick={() => onQueueVerificationTriage('verification-rerun', selectedVisibleProjectIds.length > 0 ? selectedVisibleProjectIds : undefined)} title="只登记已有验证命令为 OMO 计划任务，不会直接执行"><ClipboardCheck size={13} /><span>{bulkTriagePending ? '正在承接' : '承接验证缺口'}</span></button>
            <button className="antd-btn antd-btn-primary" aria-label="批量承接验证证据补录" disabled={bulkTriagePending || systemMap.project_triage.summary.verification_commands === 0} onClick={() => onQueueVerificationTriage('verification-find-evidence', selectedVisibleProjectIds.length > 0 ? selectedVisibleProjectIds : undefined)} title="只登记验证命令为 OMO 计划任务，补录证据，不会直接执行"><ClipboardCheck size={13} /><span>{bulkTriagePending ? '正在承接' : '承接证据补录'}</span></button>
            <button className="antd-btn" aria-label="批量承接运行探针" disabled={bulkTriagePending || systemMap.project_triage.summary.runtime_commands === 0} onClick={onQueueRuntimeTriage} title="优先登记端口检查；无端口时登记端口注册排查，不会直接执行"><Server size={13} /><span>{bulkTriagePending ? '正在承接' : '承接运行探针'}</span></button>
            <button className="antd-btn" aria-label="执行待补验证" disabled={bulkTriagePending || (systemMap.project_triage.queues.find((queue) => queue.id === 'verification')?.queued || 0) === 0} onClick={onExecuteVerificationTriage} title="顺序执行最多 8 条已承接且尚未通过的低风险验证；成功后自动归档执行证据，失败保留重试"><Send size={13} /><span>{bulkTriagePending ? '正在执行' : '执行待补验证'}</span></button>
            <button className="antd-btn" aria-label="执行已批准运行探针" disabled={bulkTriagePending || (systemMap.project_triage.queues.find((queue) => queue.id === 'runtime')?.queued || 0) === 0} onClick={onExecuteRuntimeTriage} title="只执行已经获批并恢复到 active 的运行探针，不会绕过审批"><Server size={13} /><span>{bulkTriagePending ? '正在执行' : '执行已批准探针'}</span></button>
            <span className="status-badge degraded"><ClipboardCheck size={13} />{selectedVisibleProjectIds.length > 0 ? `选中 ${selectedVisibleProjectIds.length} 个项目的验证缺口` : `${filteredTriageCommandCount} / ${systemMap.project_triage.summary.total_commands} · 已承接 ${systemMap.project_triage.summary.queued_commands || 0}`}</span>
          </div>
        </div>
        <div className="system-map-domain-app-summary" aria-label="运行探针处理状态">
          <span><strong>{runtimeProbeSummary.runtimeProjects}</strong> 个需运行探针项目</span>
          <span><strong>{runtimeProbeSummary.approved}</strong> 已授权待执行</span>
          <span><strong>{runtimeProbeSummary.commands}</strong> 条可承接探针命令</span>
        </div>
        <ProjectTriageQueues queues={filteredTriageQueues} onQueueCommand={onQueueProjectTriageCommand} onNavigate={onNavigate} onOpenTarget={onOpenTarget} pendingActionKey={pendingActionKey} />
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>能力覆盖矩阵</h2><p className="text-muted">按入口、文档、命令、清单、运行、验证、来源和动作检查每个项目的可用度。</p></div>
          <span className={`status-badge ${statusClass(systemMap.project_capability_coverage.summary.score >= 80 ? 'ready' : 'warning')}`}><ShieldAlert size={13} />{systemMap.project_capability_coverage.summary.score}%</span>
        </div>
        <div className="system-map-domain-app-summary" aria-label="覆盖率与证据进度">
          <span><strong>{systemMap.project_capability_coverage.summary.score}%</strong> 严格就绪</span>
          <span><strong>{systemMap.project_capability_coverage.summary.evidence_score ?? systemMap.project_capability_coverage.summary.score}%</strong> 证据进度</span>
          <span><strong>{systemMap.project_capability_coverage.summary.documented_cells ?? 0}</strong> 已有验证命令</span>
          <span><strong>{systemMap.project_capability_coverage.summary.failed_cells}</strong> 硬缺口</span>
        </div>
        <div className="system-map-coverage-grid">
          {systemMap.project_capability_coverage.dimension_summary.map((dimension) => (
            <button className={`system-map-coverage-card ${statusClass(dimension.status)}`} key={dimension.id} aria-label={`查看覆盖维度：${dimension.title}`} onClick={() => onSetCoverageFilter(dimension.id)} title={`${dimension.description} 点击后只看该维度未就绪项目。`}>
              <div className="system-map-coverage-head">
                <div><h3>{dimension.title}</h3><p>{dimension.description}</p></div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <strong>{dimension.score}%</strong>
                  <button type="button" className="antd-btn small" aria-label={`筛选覆盖维度：${dimension.title}`} onClick={(e) => { e.stopPropagation(); onSetCoverageFilter(dimension.id); }}>筛选</button>
                </div>
              </div>
              <div className="system-map-coverage-counts">
                <span className="online">{coverageCountLabel(dimension.id, 'ready')} {dimension.ready}</span>
                <span className="degraded">{coverageCountLabel(dimension.id, 'warning')} {dimension.warning}</span>
                <span className="offline">{coverageCountLabel(dimension.id, 'failed')} {dimension.failed}</span>
              </div>
              {dimension.id === 'verification' && (<div className="system-map-risk-line">证据进度 {dimension.evidence_score ?? dimension.score}%：已有命令可承接，执行并 closeout 后才算已验证。</div>)}
              {dimension.attention_projects.length > 0 && (
                <div className="system-map-coverage-attention">
                  {dimension.attention_projects.map((project) => (<span className={statusClass(project.status)} key={`${dimension.id}-${project.id}`} title={project.next_action}>{project.id}</span>))}
                </div>
              )}
            </button>
          ))}
        </div>
        {activeCoverage && activeCoverage.id !== 'all' && (
          <div className="system-map-coverage-active" aria-label="当前覆盖维度筛选">
            <span>覆盖维度：{activeCoverage.title}</span>
            <button className="antd-btn small" onClick={() => onSetCoverageFilter('all')} aria-label="清除覆盖维度筛选"><X size={12} /></button>
          </div>
        )}
        {systemMap.project_capability_coverage.weakest_dimensions.length > 0 && (
          <div className="system-map-coverage-weak">
            <strong>优先补：</strong>
            {systemMap.project_capability_coverage.weakest_dimensions.map((dimension) => (<span key={dimension.id}>{dimension.title} {dimension.score}%</span>))}
          </div>
        )}
      </section>

      <section className="services-section system-map-section" aria-label="项目能力维度交叉矩阵">
        <div className="section-header">
          <div><h2>项目 × 能力维度</h2><p className="text-muted">横向看每个项目的完整覆盖，点击单元格进入项目详情；选中项目后可把运行探针或验证动作限定在这组对象。</p></div>
          <div className="system-map-section-actions">
            <button className="antd-btn small" aria-label={selectedVisibleProjectIds.length === coverageMatrixRows.length ? '清除项目选择' : '全选当前筛选项目'} onClick={() => onSetSelectedProjectIds(selectedVisibleProjectIds.length === coverageMatrixRows.length ? [] : coverageMatrixRows.map((row) => row.project.id))}>
              <CheckCircle size={13} /><span>{selectedVisibleProjectIds.length === coverageMatrixRows.length ? '清除选择' : `全选项目 (${coverageMatrixRows.length})`}</span>
            </button>
            <select aria-label="按架构层级筛选项目" value={projectLayerFilter} onChange={(e) => onSetProjectLayerFilter(e.target.value)} className="antd-select small">
              {projectLayerOptions.map((layer) => (<option key={layer} value={layer}>{layer === 'all' ? '全部层级' : layer}</option>))}
            </select>
            <select aria-label="按 Cockpit 入口页筛选项目" value={projectPageFilter} onChange={(e) => onSetProjectPageFilter(e.target.value)} className="antd-select small">
              <option value="all">全部入口页</option>
              {projectPageOptions.map((page) => (<option key={page.id} value={page.id}>{page.title}</option>))}
            </select>
            {activePortfolioBucket ? (
              <React.Fragment>
                <span className="status-badge degraded">组合态势：{activePortfolioBucket.title}</span>
                <span className="status-badge online">显示 {coverageMatrixRows.length} / {systemMap.project_capability_coverage.matrix.length} · 命令 {visibleCommandCount}</span>
              </React.Fragment>
            ) : activeCoverage && activeCoverage.id !== 'all' ? (
              <span className="status-badge online">显示 {coverageMatrixRows.length} / {systemMap.project_capability_coverage.matrix.length} · 命令 {visibleCommandCount}</span>
            ) : projectFilter !== 'all' || projectLayerFilter !== 'all' || projectPageFilter !== 'all' ? (
              <span className="status-badge online">显示 {coverageMatrixRows.length} / {systemMap.project_capability_coverage.matrix.length}</span>
            ) : (
              <span className="status-badge online">{coverageMatrixRows.length} 项目 · {coverageDimensions.length} 维度 · 已选 {selectedVisibleProjectIds.length}</span>
            )}
          </div>
        </div>
        <div className="system-map-coverage-matrix-wrap">
          <table className="system-map-coverage-matrix">
            <thead>
              <tr>
                <th scope="col">项目</th>
                {coverageDimensions.map((dimension) => (<th scope="col" key={dimension.id} title={dimension.description}>{dimension.title}</th>))}
                <th scope="col">汇总</th>
              </tr>
            </thead>
            <tbody>
              {coverageMatrixRows.map((row) => (
                <tr key={row.project.id}>
                  <th scope="row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input type="checkbox" aria-label={`选择项目 ${row.project.id}`} checked={selectedVisibleProjectIds.includes(row.project.id)} onChange={() => onSetSelectedProjectIds((current: string[]) => current.includes(row.project.id) ? current.filter((projectId: string) => projectId !== row.project.id) : [...current, row.project.id])} />
                      <button type="button" className="system-map-coverage-matrix-project" aria-label={`从覆盖矩阵查看 ${row.project.id} 项目详情`} onClick={() => onSetSelectedProjectId(row.project.id)}>
                        <strong>{row.project.id}</strong><small>{row.project.layer} · {row.project.cockpit_page}</small>
                      </button>
                    </div>
                  </th>
                  {coverageDimensions.map((dimension) => {
                    const check = row.checks.find((item) => item.id === dimension.id);
                    const status = check?.status;
                    return (
                      <td key={`${row.project.id}-${dimension.id}`}>
                        <button type="button" className={`system-map-coverage-matrix-cell ${statusClass(status || 'unknown')}`} aria-label={`${row.project.id} ${dimension.title}：${coverageStatusText(status)}`} title={check ? `${check.detail} 下一步：${check.next_action}` : '该维度暂无检查结果'} onClick={() => { onSetCoverageFilter(dimension.id); onSetSelectedProjectId(row.project.id); }}>
                          <strong aria-hidden="true">{status === 'ready' ? '✓' : status === 'warning' ? '!' : status === 'failed' ? '×' : '—'}</strong>
                          <span>{coverageStatusText(status)}</span>
                        </button>
                      </td>
                    );
                  })}
                  <td>
                    <div className="system-map-coverage-matrix-total">
                      <strong>{row.ready}/{coverageDimensions.length}</strong>
                      <small>{row.failed ? `${row.failed} 个缺口` : row.warning ? `${row.warning} 个提醒` : '全部就绪'}</small>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {coverageMatrixRows.length === 0 && (<div className="system-map-project-empty"><Search size={15} /><span>当前筛选没有项目可展示</span></div>)}
        </div>
      </section>

      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>项目矩阵</h2><p className="text-muted">所有项目先能被定位，再按聚焦队列处理运行、验证和状态缺口。</p></div>
          <BookOpen size={18} className="text-muted" />
        </div>
        <div className="system-map-table-wrap">
          <table className="services-table">
            <thead>
              <tr><th>项目</th><th>层级</th><th>职责</th><th>入口</th><th>状态</th><th>运行</th><th>诊断</th><th>文档</th><th>命令</th><th>覆盖</th><th>动作</th><th>来源</th></tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => {
                const page = pagesById.get(project.cockpit_page);
                return (
                  <tr key={project.id}>
                    <td><button className="system-map-project-name-btn" onClick={() => onSetSelectedProjectId(project.id)} aria-label={`查看 ${project.id} 项目详情`}>{project.id}</button></td>
                    <td>{project.layer}</td>
                    <td>{project.role || project.stack}</td>
                    <td>{page ? (<button className="antd-btn system-map-table-btn" onClick={() => openSystemMapTarget({ tab: page.id, projectId: project.id }, onNavigate, onOpenTarget)}>{page.title}</button>) : '—'}</td>
                    <td>
                      <span className={`status-badge ${statusClass(project.operational.status)}`}>{projectStatusText(project.operational.status)}</span>
                      {project.operational.risks.length > 0 && (<div className="system-map-risk-line">{project.operational.risks.slice(0, 2).join(' / ')}</div>)}
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(project.runtime.status)}`}>{runtimeStatusText(project.runtime.status)}</span>
                      <div className="system-map-risk-line">{project.runtime.status === 'not_applicable' ? runtimeProfileText(project.runtime.profile) : runtimeStatusText(project.runtime.status)} · {project.runtime.probe_reason}</div>
                      {project.runtime.ports.length > 0 && (<div className="system-map-port-list">{project.runtime.ports.slice(0, 3).map((port) => (<span key={port.port} className={port.listening ? 'online' : 'offline'}>:{port.port}</span>))}</div>)}
                      <div className={`system-map-risk-line ${statusClass(project.runtime.latest_verification.status)}`}>
                        {verifyText(project.runtime.latest_verification.status)}
                        {project.runtime.latest_verification.ts ? ` · ${shortDate(project.runtime.latest_verification.ts)}` : ''}
                        {` · ${closeoutText(project.runtime.latest_verification.closeout_status)}`}
                      </div>
                    </td>
                    <td>
                      <div className="system-map-diagnostic-list">
                        {project.diagnostics.slice(0, 2).map((diagnostic) => (
                          <div className={`system-map-diagnostic ${statusClass(diagnostic.severity)}`} key={diagnostic.id}>
                            <strong>{diagnostic.title}</strong><small>{diagnostic.detail}</small><small>下一步：{diagnostic.next_action}</small>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      {project.operational.docs.present} / {project.operational.docs.expected}
                      {project.operational.manifests.length > 0 && (<div className="system-map-risk-line">{project.operational.manifests.map((item) => item.name).join(' / ')}</div>)}
                    </td>
                    <td>
                      {project.operational.commands.length > 0 ? (<div className="system-map-command-list">{project.operational.commands.slice(0, 2).map((command) => <code key={command}>{command}</code>)}</div>) : (<span className="text-muted">待登记</span>)}
                      <div className="system-map-risk-line">{project.operational.next_action}</div>
                    </td>
                    <td>
                      <span className={`status-badge ${statusClass(project.coverage)}`}>{project.coverage === 'native' ? '原生/可操作' : '定位/待补'}</span>
                      <div className="system-map-coverage-cell">
                        {project.coverage_checks.slice(0, 8).map((check) => (<span className={statusClass(check.status)} key={check.id} title={`${check.detail} 下一步：${check.next_action}`}>{check.title}</span>))}
                      </div>
                    </td>
                    <td>
                      <button className="system-map-project-action online" onClick={() => onSetSelectedProjectId(project.id)}><BookOpen size={12} /><span>详情</span></button>
                      <ProjectActionList actions={project.actions} onNavigate={onNavigate} onOpenTarget={onOpenTarget} projectId={project.id} onQueueAction={(action) => onQueueProjectAction(project.id, action)} pendingActionKey={pendingActionKey} />
                      {project.triage_commands.length > 0 && (
                        <div className="system-map-triage-inline">
                          <small>排查</small>
                          <ProjectActionList actions={project.triage_commands} onNavigate={onNavigate} onOpenTarget={onOpenTarget} projectId={project.id} onQueueAction={(action) => onQueueProjectTriageCommand(action)} pendingActionKey={pendingActionKey} />
                        </div>
                      )}
                    </td>
                    <td><SourceRefList refs={project.source_refs} compact onInspect={onInspect} activeTarget={activeSourceTarget} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredProjects.length === 0 && (<div className="system-map-project-empty"><Search size={15} /><span>当前筛选没有匹配项目</span></div>)}
        </div>
      </section>

      <section className="system-map-bottom-grid">
        <div className="services-section system-map-section">
          <div className="section-header">
            <div><h2>能力缺口</h2><p className="text-muted">把"感觉缺功能"翻译成可推进的下一步。</p></div>
            <ShieldAlert size={18} className="text-muted" />
          </div>
          <div className="system-map-gap-list">
            {systemMap.gaps.map((gap) => (
              <button className={`system-map-gap ${statusClass(gap.severity)}`} key={gap.id} onClick={() => onSetSelectedGapId(gap.id)} title={gap.next}>
                <span className={`status-badge ${statusClass(gap.severity)}`}>{gap.severity}</span>
                <div><h3>{gap.title}</h3><p>{gap.evidence}</p><strong>{gap.next}</strong></div>
              </button>
            ))}
          </div>
        </div>
        <div className="services-section system-map-section">
          <div className="section-header">
            <div><h2>权威读源</h2><p className="text-muted">页面只读这些 SSOT，不自己维护易漂移事实。</p></div>
            <ExternalLink size={18} className="text-muted" />
          </div>
          <div className="system-map-source-list">
            {Object.entries(systemMap.source_paths).map(([key, source]) => (
              <div className="system-map-source-row" key={key} title={source.path}>
                <span className={`status-badge ${source.exists ? 'online' : 'offline'}`}>{source.exists ? '可读' : '缺失'}</span>
                <div><strong>{key}</strong><small>{source.path}</small></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default TriageMatrixSection;

import React from 'react';
import { CheckCircle, ClipboardCheck, Copy } from 'lucide-react';
import type { CockpitNavigationTarget, ProjectAction, ProjectItem, SystemMapPayload } from './types';
import { copyText, statusClass } from './utils';

type DimensionWorkbenchProps = {
  systemMap: SystemMapPayload;
  activeRepairDimension: SystemMapPayload['project_capability_coverage']['dimension_summary'][number];
  dimensionRepairRows: {
    attention: SystemMapPayload['project_capability_coverage']['dimension_summary'][number]['attention_projects'][number];
    project: ProjectItem;
    check?: ProjectItem['coverage_checks'][number];
    commands: ProjectAction[];
  }[];
  onSetCoverageFilter: (dimensionId: string) => void;
  onSetSelectedProjectId: (id: string | null) => void;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
};

function DimensionWorkbench({
  systemMap,
  activeRepairDimension,
  dimensionRepairRows,
  onSetCoverageFilter,
  onSetSelectedProjectId,
  onNavigate,
  onOpenTarget,
}: DimensionWorkbenchProps) {
  if (!activeRepairDimension) return null;

  return (
    <section className="services-section system-map-section system-map-dimension-workbench" aria-label="项目维度修复台">
      <div className="section-header">
        <div><h2>项目维度修复台</h2><p className="text-muted">按最薄弱维度组织项目、下一步和排查命令，选中维度会同步过滤下方项目矩阵。</p></div>
        <button className="antd-btn" onClick={() => onOpenTarget?.({ tab: 'TaskCenter', coverageDimensionId: activeRepairDimension.id, taskQuery: activeRepairDimension.id })}><ClipboardCheck size={14} /><span>任务中心</span></button>
      </div>
      <div className="system-map-dimension-workbench-grid">
        <div className="system-map-dimension-picker" role="list" aria-label="项目覆盖维度">
          {systemMap.project_capability_coverage.dimension_summary.map((dimension) => (
            <button className={`system-map-dimension-choice ${activeRepairDimension.id === dimension.id ? 'active' : ''} ${statusClass(dimension.status)}`} key={dimension.id} onClick={() => onSetCoverageFilter(dimension.id)} title={dimension.description}>
              <span>{dimension.title}</span><strong>{dimension.score}%</strong><small>缺口 {dimension.failed} · 提醒 {dimension.warning}</small>
            </button>
          ))}
        </div>
        <article className={`system-map-dimension-active ${statusClass(activeRepairDimension.status)}`}>
          <div className="system-map-dimension-active-head">
            <div>
              <span className={`status-badge ${statusClass(activeRepairDimension.status)}`}>{activeRepairDimension.status}</span>
              <h3>{activeRepairDimension.title}</h3><p>{activeRepairDimension.description}</p>
            </div>
            <div className="system-map-dimension-kpis">
              <span><strong>{activeRepairDimension.score}%</strong> 维度分</span>
              <span><strong>{activeRepairDimension.ready}</strong> 就绪</span>
              <span><strong>{activeRepairDimension.warning}</strong> 提醒</span>
              <span><strong>{activeRepairDimension.failed}</strong> 缺口</span>
            </div>
          </div>
          <div className="system-map-dimension-projects">
            {dimensionRepairRows.length > 0 ? (
              dimensionRepairRows.slice(0, 6).map(({ attention, project, check, commands }) => (
                <div className={`system-map-dimension-project ${statusClass(attention.status)}`} key={`${activeRepairDimension.id}-${project.id}`}>
                  <button className="system-map-dimension-project-name" onClick={() => onSetSelectedProjectId(project.id)} aria-label={`查看 ${project.id} 维度修复详情`}>
                    <strong>{project.id}</strong><span>{project.layer} · {project.role || project.stack}</span>
                  </button>
                  <div className="system-map-dimension-project-body">
                    <span className={`status-badge ${statusClass(attention.status)}`}>{attention.status}</span>
                    <small>{check?.detail || attention.next_action}</small><strong>{check?.next_action || attention.next_action}</strong>
                  </div>
                  <div className="system-map-dimension-command-list">
                    {commands.length > 0 ? (
                      commands.slice(0, 2).map((command) => (
                        <button className={`system-map-dimension-command ${statusClass(command.risk)}`} disabled={!command.enabled} key={`${project.id}-${activeRepairDimension.id}-${command.id}`} onClick={() => void copyText(command.value)} title={command.guard}>
                          <Copy size={12} /><span><strong>{command.label}</strong><code>{command.value}</code></span>
                        </button>
                      ))
                    ) : (<span className="text-muted">暂无排查命令</span>)}
                  </div>
                </div>
              ))
            ) : (
              <div className="system-map-dimension-empty"><CheckCircle size={14} /><span>这个维度当前没有待处理项目</span></div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

export default DimensionWorkbench;

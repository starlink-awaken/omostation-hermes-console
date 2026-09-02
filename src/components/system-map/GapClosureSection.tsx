import React from 'react';
import { ArrowRight, ClipboardCheck, ShieldAlert } from 'lucide-react';
import type { CapabilityGapClosureRow, CockpitNavigationTarget, DraftTask } from './types';
import { openSystemMapTarget, statusClass, withTaskDraftHandoff } from './utils';

type GapClosureSectionProps = {
  gapClosureRows: CapabilityGapClosureRow[];
  draftTasks: DraftTask[];
  onSetSelectedGapId: (id: string | null) => void;
  onSetSelectedProjectId: (id: string | null) => void;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
};

function GapClosureSection({
  gapClosureRows,
  draftTasks,
  onSetSelectedGapId,
  onSetSelectedProjectId,
  onNavigate,
  onOpenTarget,
}: GapClosureSectionProps) {
  if (gapClosureRows.length === 0) return null;

  return (
    <section className="services-section system-map-section system-map-build-backlog" aria-label="能力缺口承接总表">
      <div className="section-header">
        <div>
          <h2>能力缺口承接总表</h2>
          <p className="text-muted">每个缺口都要能落到页面、项目或任务，不再只停在一句"缺功能"。</p>
        </div>
        <span className="status-badge degraded"><ShieldAlert size={13} />{gapClosureRows.length} 个显性缺口</span>
      </div>
      <div className="system-map-build-summary">
        <span><strong>{gapClosureRows.length}</strong> 缺口总数</span>
        <span><strong>{gapClosureRows.filter((row) => row.page).length}</strong> 已挂页面</span>
        <span><strong>{gapClosureRows.reduce((count, row) => count + row.projects.length, 0)}</strong> 待跟项目</span>
        <span><strong>{gapClosureRows.filter((row) => row.draft).length}</strong> 已有草稿</span>
      </div>
      <div className="system-map-gap-closure-grid">
        {gapClosureRows.map((row) => (
          <article className="system-map-gap-closure-card" key={row.gap.id}>
            <div className="dashboard-page-workbench-head">
              <div><span>能力缺口 · {row.scope}</span><strong>{row.gap.title}</strong></div>
              <em className={`status-badge ${statusClass(row.gap.severity)}`}>{row.gap.severity}</em>
            </div>
            <p>{row.gap.evidence}</p>
            <div className="system-map-page-focus-links system-map-gap-closure-links">
              <span>页面 {row.page?.page.title || '待挂'}</span>
              <span>项目 {row.projects[0]?.id || '待定'}</span>
              <span>任务 {row.draft ? '已承接' : '待承接'}</span>
            </div>
            <div className="dashboard-page-workbench-detail"><span>下一步</span><strong>{row.nextAction}</strong></div>
            <div className="dashboard-page-workbench-detail"><span>配套入口</span><strong>路径 {row.usagePaths.length} · 清单 {row.playbooks.length} · 路线图 {row.roadmapItems.length}</strong></div>
            <div className="dashboard-page-workbench-actions">
              <button type="button" className="antd-btn" onClick={() => onSetSelectedGapId(row.gap.id)}><span>定位缺口</span></button>
              {row.page && (<button type="button" className="antd-btn" onClick={() => openSystemMapTarget({ tab: row.page?.page.id || 'SystemMap', gapId: row.gap.id }, onNavigate, onOpenTarget)}><ArrowRight size={14} /><span>查看页面</span></button>)}
              {row.projects[0] && (<button type="button" className="antd-btn" onClick={() => onSetSelectedProjectId(row.projects[0].id)}><span>查看项目</span></button>)}
              <button type="button" className="antd-btn" onClick={() => openSystemMapTarget(withTaskDraftHandoff({ tab: 'TaskCenter', taskQuery: row.taskQuery }, draftTasks), onNavigate, onOpenTarget)}><ClipboardCheck size={14} /><span>打开任务</span></button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default GapClosureSection;

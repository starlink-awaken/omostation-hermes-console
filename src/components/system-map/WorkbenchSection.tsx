import React from 'react';
import { ArrowRight, ClipboardCheck } from 'lucide-react';
import type { CockpitNavigationTarget, DraftTask, SystemMapWorkbenchRow } from './types';
import { openSystemMapTarget, withTaskDraftHandoff } from './utils';

type WorkbenchSectionProps = {
  systemMapWorkbenchRows: SystemMapWorkbenchRow[];
  draftTasks: DraftTask[];
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
};

function WorkbenchSection({
  systemMapWorkbenchRows,
  draftTasks,
  onNavigate,
  onOpenTarget,
}: WorkbenchSectionProps) {
  if (systemMapWorkbenchRows.length === 0) return null;

  return (
    <section className="services-section system-map-section dashboard-page-workbench" role="region" aria-label="系统地图闭环工作台">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 style={{ fontSize: 16, margin: 0 }}>系统地图闭环工作台</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>把当前路径、页面、能力域、项目和缺口压成一层闭环动作面，方便从系统地图直接跳去真正的承接页。</p>
        </div>
        <span className="status-badge degraded">当前 {systemMapWorkbenchRows.length} 个闭环位</span>
      </div>
      <div className="dashboard-page-workbench-grid">
        {systemMapWorkbenchRows.map((row) => (
          <article key={row.id} className="dashboard-page-workbench-card" aria-label={`系统地图闭环 ${row.title}`}>
            <div className="dashboard-page-workbench-head">
              <div><span>{row.laneLabel}</span><strong>{row.title}</strong></div>
              <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
            </div>
            <p>{row.summary}</p>
            <div className="dashboard-page-workbench-detail"><span>下一步</span><strong>{row.nextAction}</strong></div>
            <div className="dashboard-page-workbench-detail"><span>验收线索</span><strong>{row.evidence}</strong></div>
            <div className="dashboard-page-workbench-actions">
              <button type="button" className="antd-btn" aria-label={`打开系统地图闭环对象 ${row.title}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff(row.primaryTarget, draftTasks), onNavigate, onOpenTarget)}><ArrowRight size={14} /><span>{row.primaryLabel}</span></button>
              {row.secondaryTarget && row.secondaryLabel && (
                <button type="button" className="antd-btn" aria-label={`打开系统地图闭环动作 ${row.title}`} onClick={() => openSystemMapTarget(withTaskDraftHandoff(row.secondaryTarget || { tab: 'SystemMap' }, draftTasks), onNavigate, onOpenTarget)}><ClipboardCheck size={14} /><span>{row.secondaryLabel}</span></button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default WorkbenchSection;

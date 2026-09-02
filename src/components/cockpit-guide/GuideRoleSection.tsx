import React from 'react';
import { ArrowRight, Route } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import { executionStepTarget } from './guideHelpers';

interface RoleWorkbenchRow {
  id: string;
  signal: string;
  summary: string;
  objectLabel: string;
  objectTarget: CockpitNavigationTarget;
  evidenceLabel: string;
  evidenceTarget: CockpitNavigationTarget;
}

interface WorkMode {
  id: string;
  role: string;
  title: string;
  summary: string;
  focus: string[];
  entry: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface GuideRoleSectionProps {
  roleWorkbenchRows: RoleWorkbenchRow[];
  workModes: WorkMode[];
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideRoleSection({
  roleWorkbenchRows,
  workModes,
  onNavigate,
  onOpenTarget,
}: GuideRoleSectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>按角色进入</h2>
          <p className="text-muted">同一个 cockpit，不同人进来的第一步不该一样。</p>
        </div>
      </div>
      <div className="cockpit-guide-mode-grid">
        {workModes.map((mode) => {
          const workbench = roleWorkbenchRows.find((row) => row.id === mode.id);
          return (
            <article key={mode.id} className={`cockpit-guide-mode-card ${mode.role}`}>
              <div className="cockpit-guide-mode-head">
                <span>{mode.role}</span>
                <strong>{mode.title}</strong>
              </div>
              <p>{mode.summary}</p>
              <div className="cockpit-guide-mode-focus">
                {mode.focus.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="cockpit-guide-step-chip"
                    aria-label={`打开角色步骤 ${mode.title} ${item}`}
                    onClick={() => openCockpitNavigationTarget(executionStepTarget(item, mode.entry), onNavigate, onOpenTarget)}
                  >
                    {item}
                  </button>
                ))}
              </div>
              {workbench && (
                <div className="cockpit-guide-mode-workbench">
                  <small>{workbench.signal}</small>
                  <p>{workbench.summary}</p>
                  <div className="cockpit-guide-mode-context">
                    <span>当前对象：{workbench.objectLabel}</span>
                    <span>证据入口：{workbench.evidenceLabel}</span>
                  </div>
                  <div className="cockpit-guide-mode-context-actions">
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`打开角色对象 ${mode.title}`}
                      onClick={() => openCockpitNavigationTarget(workbench.objectTarget, onNavigate, onOpenTarget)}
                    >
                      <ArrowRight size={14} />
                      <span>看当前对象</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`打开角色证据 ${mode.title}`}
                      onClick={() => openCockpitNavigationTarget(workbench.evidenceTarget, onNavigate, onOpenTarget)}
                    >
                      <Route size={14} />
                      <span>看证据入口</span>
                    </button>
                  </div>
                </div>
              )}
              <div className="cockpit-guide-mode-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开角色模式 ${mode.title}`}
                  onClick={() => openCockpitNavigationTarget(mode.entry, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>进入主入口</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开角色任务 ${mode.title}`}
                  onClick={() => openCockpitNavigationTarget(mode.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看承接任务</span>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

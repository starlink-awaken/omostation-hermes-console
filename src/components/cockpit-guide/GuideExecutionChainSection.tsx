import React from 'react';
import { ArrowRight, Route } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import { executionStepTarget } from './guideHelpers';

interface ExecutionChainRow {
  id: string;
  title: string;
  signal: string;
  summary: string;
  nextAction: string;
  steps: string[];
  primaryTarget: CockpitNavigationTarget;
  secondaryTarget: CockpitNavigationTarget;
}

interface GuideExecutionChainSectionProps {
  executionChainRows: ExecutionChainRow[];
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideExecutionChainSection({
  executionChainRows,
  onNavigate,
  onOpenTarget,
}: GuideExecutionChainSectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>执行闭环总表</h2>
          <p className="text-muted">把发现问题、定位对象、承接任务和补证入口整理成几条真的可走的工作流，避免 cockpit 只会展示不会推进。</p>
        </div>
      </div>
      <div className="cockpit-guide-coverage-list">
        {executionChainRows.map((row) => (
          <div key={row.id} className="cockpit-guide-coverage-row watch">
            <div className="cockpit-guide-coverage-row-head">
              <div>
                <strong>{row.title}</strong>
                <small>{row.signal}</small>
              </div>
              <span className="cockpit-guide-coverage-status watch">执行链</span>
            </div>
            <p>{row.summary}</p>
            <div className="cockpit-guide-coverage-tags">
              {row.steps.map((step) => (
                <button
                  key={`${row.id}-${step}`}
                  type="button"
                  className="cockpit-guide-step-chip"
                  aria-label={`打开执行步骤 ${row.title} ${step}`}
                  onClick={() => openCockpitNavigationTarget(executionStepTarget(step, row.primaryTarget), onNavigate, onOpenTarget)}
                >
                  {step}
                </button>
              ))}
            </div>
            <div className="cockpit-guide-coverage-next">
              <strong>下一步</strong>
              <p>{row.nextAction}</p>
            </div>
            <div className="cockpit-guide-coverage-actions">
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开执行主链 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.primaryTarget, onNavigate, onOpenTarget)}
              >
                <ArrowRight size={14} />
                <span>开主链</span>
              </button>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开执行证据 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.secondaryTarget, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>看证据/任务</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

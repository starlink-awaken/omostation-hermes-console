import React from 'react';
import { ArrowRight, Route } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { GuideMetrics } from './types';

function pageCoverageStatusClass(status: string) {
  if (status === 'ready') return 'ready';
  if (status === 'watch') return 'watch';
  return 'gap';
}

function pageCoverageStatusText(status: string) {
  if (status === 'ready') return '已接通';
  if (status === 'watch') return '待收口';
  return '待补位';
}

interface GuidePlaybookProps {
  metrics: GuideMetrics;
  usageCoverageSummary: {
    total: number;
    ready: number;
    attention: number;
    missingPlaybook: number;
    missingFeatureDomain: number;
  };
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuidePlaybook({ metrics, usageCoverageSummary, onNavigate, onOpenTarget }: GuidePlaybookProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>使用承接总表</h2>
          <p className="text-muted">把每条使用链实际连到的页面、清单、能力域和任务承接摆在一行里，看清哪些链条已经能用，哪些还只是概念。</p>
        </div>
      </div>
      <div className="cockpit-guide-coverage-summary">
        <span><strong>{usageCoverageSummary.total}</strong> 条使用链</span>
        <span><strong>{usageCoverageSummary.ready}</strong> 条已接通</span>
        <span><strong>{usageCoverageSummary.attention}</strong> 条待补位</span>
        <span><strong>{usageCoverageSummary.missingPlaybook}</strong> 条缺清单</span>
        <span><strong>{usageCoverageSummary.missingFeatureDomain}</strong> 条缺能力域</span>
      </div>
      <div className="cockpit-guide-coverage-list">
        {metrics.usageCoverageRows.map((row) => (
          <div key={row.id} className={`cockpit-guide-coverage-row ${pageCoverageStatusClass(row.status)}`}>
            <div className="cockpit-guide-coverage-row-head">
              <div>
                <strong>{row.title}</strong>
                <small>{pageCoverageStatusText(row.status)} · {row.score ?? 0}% · 页面 {row.pageCount} · 步骤 {row.stepCount}</small>
              </div>
              <span className={`cockpit-guide-coverage-status ${pageCoverageStatusClass(row.status)}`}>
                {pageCoverageStatusText(row.status)}
              </span>
            </div>
            <p>{row.intent}</p>
            <div className="cockpit-guide-coverage-meta">
              <span>页面 {row.pageCount} 个</span>
              <span>清单 {row.playbooks.length} 条</span>
              <span>能力域 {row.featureDomains.length} 个</span>
              <span>路线图 {row.roadmapTitles.length} 条</span>
            </div>
            <div className="cockpit-guide-coverage-tags">
              {row.linkedPages.slice(0, 3).map((item) => (
                <span key={`${row.id}-page-${item}`}>页面 · {item}</span>
              ))}
              {row.featureDomains.slice(0, 2).map((item) => (
                <em key={`${row.id}-domain-${item}`}>能力域 · {item}</em>
              ))}
              {row.linkedPages.length === 0 && (
                <em>当前没有挂上页面</em>
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
                aria-label={`打开使用链 ${row.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', usagePathId: row.id }, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>看使用链</span>
              </button>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开使用任务 ${row.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', usagePathId: row.id, taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
              >
                <ArrowRight size={14} />
                <span>看任务承接</span>
              </button>
            </div>
          </div>
        ))}
        {metrics.usageCoverageRows.length === 0 && (
          <div className="cockpit-guide-focus-empty">当前还没有可承接的使用链数据。</div>
        )}
      </div>
    </section>
  );
}

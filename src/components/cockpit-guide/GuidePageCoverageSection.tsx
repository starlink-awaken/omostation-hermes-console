import React from 'react';
import { ArrowRight, Compass, Map as MapIcon, Route } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { GuideGroup } from './types';
import { pageCoverageStatusClass, pageCoverageStatusText } from './guideHelpers';

interface GuidePageCoverageSectionProps {
  coverageGroups: Array<GuideGroup & { rows: Array<{
    id: string;
    title: string;
    purpose: string;
    whenToUse: string;
    status: string;
    score: number | null;
    usagePaths: string[];
    featureDomains: string[];
    playbooks: string[];
    roadmapTitles: string[];
    nextAction: string;
    taskQuery: string;
    missingSystemMapRegistration: boolean;
    missingUsagePath: boolean;
    missingFeatureDomain: boolean;
  }> }>;
  coverageSummary: {
    total: number;
    ready: number;
    watch: number;
    gap: number;
    withSystemMap: number;
    withUsagePath: number;
    withFeatureDomain: number;
  };
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuidePageCoverageSection({
  coverageGroups,
  coverageSummary,
  onNavigate,
  onOpenTarget,
}: GuidePageCoverageSectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>全站覆盖总表</h2>
          <p className="text-muted">按页面看职责、进入时机、路径挂载、能力域挂载和补位动作，避免"知道有页面但不知道怎么用"。</p>
        </div>
      </div>
      <div className="cockpit-guide-coverage-summary">
        <span><strong>{coverageSummary.total}</strong> 页总览</span>
        <span><strong>{coverageSummary.ready}</strong> 已接通</span>
        <span><strong>{coverageSummary.watch}</strong> 待收口</span>
        <span><strong>{coverageSummary.gap}</strong> 待补位</span>
        <span><strong>{coverageSummary.withSystemMap}</strong> 已登记总图</span>
        <span><strong>{coverageSummary.withUsagePath}</strong> 已入路径</span>
        <span><strong>{coverageSummary.withFeatureDomain}</strong> 已挂能力域</span>
      </div>
      <div className="cockpit-guide-coverage-groups">
        {coverageGroups.map((group) => (
          <article key={`coverage-${group.id}`} className="cockpit-guide-coverage-group">
            <div className="cockpit-guide-coverage-group-head">
              <div>
                <strong>{group.title}</strong>
                <small>{group.rows.length} 页 · {group.description}</small>
              </div>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开覆盖分组 ${group.title}`}
                onClick={() => openCockpitNavigationTarget(group.target, onNavigate, onOpenTarget)}
              >
                <Compass size={14} />
                <span>打开工作带</span>
              </button>
            </div>
            <div className="cockpit-guide-coverage-list">
              {group.rows.map((row) => (
                <div key={`coverage-row-${row.id}`} className={`cockpit-guide-coverage-row ${pageCoverageStatusClass(row.status)}`}>
                  <div className="cockpit-guide-coverage-row-head">
                    <div>
                      <strong>{row.title}</strong>
                      <small>{row.id} · {pageCoverageStatusText(row.status)} · {row.score ?? 0}%</small>
                    </div>
                    <span className={`cockpit-guide-coverage-status ${pageCoverageStatusClass(row.status)}`}>
                      {pageCoverageStatusText(row.status)}
                    </span>
                  </div>
                  <p>{row.purpose}</p>
                  <div className="cockpit-guide-coverage-meta">
                    <span>何时进入：{row.whenToUse}</span>
                    <span>{row.missingSystemMapRegistration ? '总图待登记' : '总图已登记'}</span>
                    <span>{row.missingUsagePath ? '未入使用路径' : `路径 ${row.usagePaths.length} 条`}</span>
                    <span>{row.missingFeatureDomain ? '未挂能力域' : `能力域 ${row.featureDomains.length} 个`}</span>
                    <span>{row.playbooks.length > 0 ? `清单 ${row.playbooks.length} 条` : '暂无清单承接'}</span>
                  </div>
                  <div className="cockpit-guide-coverage-tags">
                    {row.usagePaths.slice(0, 2).map((item) => (
                      <span key={`${row.id}-usage-${item}`}>路径 · {item}</span>
                    ))}
                    {row.featureDomains.slice(0, 2).map((item) => (
                      <span key={`${row.id}-domain-${item}`}>能力域 · {item}</span>
                    ))}
                    {row.playbooks.slice(0, 1).map((item) => (
                      <span key={`${row.id}-playbook-${item}`}>清单 · {item}</span>
                    ))}
                    {row.roadmapTitles.slice(0, 1).map((item) => (
                      <span key={`${row.id}-roadmap-${item}`}>路线图 · {item}</span>
                    ))}
                    {row.missingSystemMapRegistration && <em>待登记总图</em>}
                    {row.missingUsagePath && <em>待补路径</em>}
                    {row.missingFeatureDomain && <em>待挂能力域</em>}
                  </div>
                  <div className="cockpit-guide-coverage-next">
                    <strong>下一步</strong>
                    <p>{row.nextAction}</p>
                  </div>
                  <div className="cockpit-guide-coverage-actions">
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`打开全站覆盖页面 ${row.title}`}
                      onClick={() => openCockpitNavigationTarget({ tab: row.id }, onNavigate, onOpenTarget)}
                    >
                      <ArrowRight size={14} />
                      <span>打开页面</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`查看全站覆盖 ${row.title}`}
                      onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: row.id }, onNavigate, onOpenTarget)}
                    >
                      <MapIcon size={14} />
                      <span>看系统覆盖</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`打开全站覆盖任务 ${row.title}`}
                      onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
                    >
                      <Route size={14} />
                      <span>看任务承接</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

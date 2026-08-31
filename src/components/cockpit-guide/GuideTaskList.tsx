import React from 'react';
import { ArrowRight, ClipboardCheck, Route } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { GuideMetrics } from './types';

interface GuideTaskListProps {
  metrics: GuideMetrics;
  pendingDraftId: string | null;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onPromoteDraft: (draft: GuideMetrics['featuredDrafts'][number]) => void;
}

export function GuideTaskList({ metrics, pendingDraftId, onNavigate, onOpenTarget, onPromoteDraft }: GuideTaskListProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>补位任务承接</h2>
          <p className="text-muted">把发现的问题直接沉到任务中心，不靠手动记忆。</p>
        </div>
      </div>
      <div className="cockpit-guide-task-grid">
        <article className="cockpit-guide-task-card">
          <div className="cockpit-guide-task-head">
            <strong>草稿车道</strong>
            <span>{metrics.draftSummary.total} 条</span>
          </div>
          <div className="cockpit-guide-task-lanes">
            <button
              type="button"
              className="cockpit-guide-task-lane"
              aria-label="打开任务车道 页面能力"
              onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_page_maturity' }, onNavigate, onOpenTarget)}
            >
              <strong>页面能力</strong>
              <small>{metrics.draftSummary.pageMaturity}</small>
            </button>
            <button
              type="button"
              className="cockpit-guide-task-lane"
              aria-label="打开任务车道 能力缺口"
              onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_capability_gap' }, onNavigate, onOpenTarget)}
            >
              <strong>能力缺口</strong>
              <small>{metrics.draftSummary.capabilityGap}</small>
            </button>
            <button
              type="button"
              className="cockpit-guide-task-lane"
              aria-label="打开任务车道 领域应用"
              onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_domain_app' }, onNavigate, onOpenTarget)}
            >
              <strong>领域应用</strong>
              <small>{metrics.draftSummary.domainApp}</small>
            </button>
            <button
              type="button"
              className="cockpit-guide-task-lane"
              aria-label="打开任务车道 项目组合"
              onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_project_portfolio' }, onNavigate, onOpenTarget)}
            >
              <strong>项目组合</strong>
              <small>{metrics.draftSummary.projectPortfolio}</small>
            </button>
          </div>
        </article>

        <article className="cockpit-guide-task-card">
          <div className="cockpit-guide-task-head">
            <strong>推荐先做</strong>
            <span>{metrics.featuredDrafts.length} 条</span>
          </div>
          <div className="cockpit-guide-task-list">
            {metrics.featuredDrafts.map((draft) => (
              <article
                key={draft.id}
                className="cockpit-guide-task-item"
              >
                <button
                  type="button"
                  className="cockpit-guide-task-item-main"
                  aria-label={`打开补位任务 ${draft.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: draft.sourceId }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{draft.title}</strong>
                    <small>{draft.sourceType}</small>
                  </div>
                </button>
                <p>{draft.description || `优先在任务中心承接 ${draft.sourceId}。`}</p>
                <div className="cockpit-guide-task-actions">
                  <button
                    type="button"
                    className="antd-btn small"
                    aria-label={`承接为正式计划任务 ${draft.title}`}
                    title="承接为正式计划任务"
                    disabled={Boolean(pendingDraftId)}
                    onClick={() => onPromoteDraft(draft)}
                  >
                    <ClipboardCheck size={13} />
                    <span>{pendingDraftId === draft.id ? '承接中' : '承接任务'}</span>
                  </button>
                </div>
              </article>
            ))}
            {metrics.featuredDrafts.length === 0 && (
              <div className="cockpit-guide-task-empty">当前没有需要承接的补位草稿。</div>
            )}
          </div>
        </article>

        <article className="cockpit-guide-task-card">
          <div className="cockpit-guide-closure-head">
            <strong>领域挂载闭环</strong>
            <span>{metrics.domainAttention.length} 项</span>
          </div>
          <div className="cockpit-guide-closure-list">
            {metrics.domainAttention.map((item) => (
              <div key={`domain-closure-${item.id}`} className="cockpit-guide-closure-item">
                <div className="cockpit-guide-closure-copy">
                  <strong>{item.name}</strong>
                  <small>{item.domainName || '领域对象'} · {item.runtimeStatus} · {item.securityPosture} · 新鲜度 {item.freshnessStatus}</small>
                  <p>{item.taskTitle || item.nextAction}</p>
                </div>
                <div className="cockpit-guide-closure-actions">
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={`打开领域对象 ${item.name}`}
                    onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: item.id }, onNavigate, onOpenTarget)}
                  >
                    <ArrowRight size={14} />
                    <span>看对象</span>
                  </button>
                  <button
                    type="button"
                    className="antd-btn secondary"
                    aria-label={`打开领域任务 ${item.name}`}
                    onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: item.taskQuery }, onNavigate, onOpenTarget)}
                  >
                    <Route size={14} />
                    <span>看任务</span>
                  </button>
                </div>
              </div>
            ))}
            {metrics.domainAttention.length === 0 && (
              <div className="cockpit-guide-closure-empty">当前没有待承接的领域挂载闭环。</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

import React from 'react';
import { ArrowRight, Route } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { GuideMetrics } from './types';

interface GuideClosureSectionProps {
  metrics: GuideMetrics;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideClosureSection({ metrics, onNavigate, onOpenTarget }: GuideClosureSectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>来源页回填与补证</h2>
          <p className="text-muted">每个能力缺口最终都要回来源页补功能，或者进补证草稿把证据补齐。</p>
        </div>
      </div>
      <div className="cockpit-guide-closure-grid">
        <article className="cockpit-guide-closure-card">
          <div className="cockpit-guide-closure-head">
            <strong>回来源页补能力</strong>
            <span>{metrics.pageAttentionItems.length} 页</span>
          </div>
          <div className="cockpit-guide-closure-list">
            {metrics.pageAttentionItems.map((item) => (
              <div key={`closure-page-${item.page_id}`} className="cockpit-guide-closure-item">
                <div className="cockpit-guide-closure-copy">
                  <strong>{item.page?.title || item.page_id}</strong>
                  <small>{item.status} · {item.score}%</small>
                  <p>{item.next_action}</p>
                </div>
                <div className="cockpit-guide-closure-actions">
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={`回来源页 ${item.page?.title || item.page_id}`}
                    onClick={() => openCockpitNavigationTarget({ tab: item.page_id }, onNavigate, onOpenTarget)}
                  >
                    <ArrowRight size={14} />
                    <span>回来源页</span>
                  </button>
                  <button
                    type="button"
                    className="antd-btn secondary"
                    aria-label={`打开页面补位任务 ${item.page?.title || item.page_id}`}
                    onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: item.page_id }, onNavigate, onOpenTarget)}
                  >
                    <Route size={14} />
                    <span>进任务</span>
                  </button>
                </div>
              </div>
            ))}
            {metrics.pageAttentionItems.length === 0 && (
              <div className="cockpit-guide-closure-empty">当前没有待回填来源页的页面。</div>
            )}
          </div>
        </article>

        <article className="cockpit-guide-closure-card">
          <div className="cockpit-guide-closure-head">
            <strong>补证入口</strong>
            <span>{metrics.draftSummary.verificationReady + metrics.draftSummary.playbook} 条</span>
          </div>
          <div className="cockpit-guide-closure-lanes">
            <button
              type="button"
              className="cockpit-guide-closure-lane"
              aria-label="打开补证车道 验证补证"
              onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_verification_ready' }, onNavigate, onOpenTarget)}
            >
              <strong>验证补证</strong>
              <small>{metrics.draftSummary.verificationReady}</small>
            </button>
            <button
              type="button"
              className="cockpit-guide-closure-lane"
              aria-label="打开补证车道 操作清单"
              onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_playbook' }, onNavigate, onOpenTarget)}
            >
              <strong>操作清单</strong>
              <small>{metrics.draftSummary.playbook}</small>
            </button>
          </div>
          <div className="cockpit-guide-closure-list">
            {metrics.closureDrafts.map((draft) => (
              <button
                key={`closure-draft-${draft.id}`}
                type="button"
                className="cockpit-guide-closure-draft"
                aria-label={`打开补证任务 ${draft.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: draft.sourceId }, onNavigate, onOpenTarget)}
              >
                <div>
                  <strong>{draft.title}</strong>
                  <small>{draft.sourceType}</small>
                </div>
                <p>{draft.description || `继续补齐 ${draft.sourceId} 的证据和步骤。`}</p>
              </button>
            ))}
            {metrics.closureDrafts.length === 0 && (
              <div className="cockpit-guide-closure-empty">当前没有需要补证的草稿。</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

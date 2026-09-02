import React from 'react';
import { ArrowRight, Route } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import type { CockpitNavigationTarget } from '../cockpitNavigation';
import type { GuideMetrics } from './types';

interface GuideGapSectionProps {
  metrics: GuideMetrics;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideGapSection({ metrics, onNavigate, onOpenTarget }: GuideGapSectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>当前缺口与补位</h2>
          <p className="text-muted">把"感觉还缺很多"拆成页面、能力、项目覆盖和路线图四类动作。</p>
        </div>
      </div>
      <div className="cockpit-guide-focus-grid">
        <article className="cockpit-guide-focus-card">
          <div className="cockpit-guide-focus-head">
            <strong>页面补位</strong>
            <span>{metrics.pageAttentionItems.length} 项</span>
          </div>
          <div className="cockpit-guide-focus-list">
            {metrics.pageAttentionItems.map((item) => (
              <button
                key={item.page_id}
                type="button"
                className="cockpit-guide-focus-item"
                aria-label={`打开页面补位 ${item.page?.title || item.page_id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: item.page_id }, onNavigate, onOpenTarget)}
              >
                <div>
                  <strong>{item.page?.title || item.page_id}</strong>
                  <small>{item.status} · {item.score}%</small>
                </div>
                <p>{item.next_action}</p>
              </button>
            ))}
            {metrics.pageAttentionItems.length === 0 && (
              <div className="cockpit-guide-focus-empty">当前没有待补页面。</div>
            )}
          </div>
        </article>

        <article className="cockpit-guide-focus-card">
          <div className="cockpit-guide-focus-head">
            <strong>能力缺口</strong>
            <span>{metrics.capabilityGaps.length} 项</span>
          </div>
          <div className="cockpit-guide-focus-list">
            {metrics.capabilityGaps.map((gap) => (
              <button
                key={gap.id}
                type="button"
                className="cockpit-guide-focus-item"
                aria-label={`打开能力缺口 ${gap.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', gapId: gap.id }, onNavigate, onOpenTarget)}
              >
                <div>
                  <strong>{gap.title}</strong>
                  <small>{gap.severity}</small>
                </div>
                <p>{gap.next || gap.evidence}</p>
              </button>
            ))}
            {metrics.capabilityGaps.length === 0 && (
              <div className="cockpit-guide-focus-empty">当前没有显式能力缺口。</div>
            )}
          </div>
        </article>

        <article className="cockpit-guide-focus-card">
          <div className="cockpit-guide-focus-head">
            <strong>项目覆盖短板</strong>
            <span>{metrics.weakestDimensions.length} 项</span>
          </div>
          <div className="cockpit-guide-focus-list">
            {metrics.weakestDimensions.map((dimension) => (
              <button
                key={dimension.id}
                type="button"
                className="cockpit-guide-focus-item"
                aria-label={`打开覆盖短板 ${dimension.title || dimension.id}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', coverageDimensionId: dimension.id }, onNavigate, onOpenTarget)}
              >
                <div>
                  <strong>{dimension.title || dimension.id}</strong>
                  <small>{dimension.score ?? 0}%</small>
                </div>
                <p>失败 {dimension.failed ?? 0} · 预警 {dimension.warning ?? 0}</p>
              </button>
            ))}
            {metrics.weakestDimensions.length === 0 && (
              <div className="cockpit-guide-focus-empty">当前没有覆盖短板数据。</div>
            )}
          </div>
        </article>

        <article className="cockpit-guide-focus-card">
          <div className="cockpit-guide-focus-head">
            <strong>领域挂载</strong>
            <span>{metrics.domainAttention.length} 项</span>
          </div>
          <div className="cockpit-guide-focus-list">
            {metrics.domainAttention.map((item) => (
              <button
                key={item.id}
                type="button"
                className="cockpit-guide-focus-item"
                aria-label={`打开领域挂载 ${item.name}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: item.id }, onNavigate, onOpenTarget)}
              >
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.runtimeStatus} · {item.securityPosture} · {item.riskLevel}</small>
                </div>
                <p>{item.nextAction}</p>
              </button>
            ))}
            {metrics.domainAttention.length === 0 && (
              <div className="cockpit-guide-focus-empty">
                {metrics.domainSummary.total > 0 ? '当前没有待承接的领域挂载。' : '当前还没有领域挂载数据。'}
              </div>
            )}
          </div>
        </article>

        <article className="cockpit-guide-focus-card">
          <div className="cockpit-guide-focus-head">
            <strong>路线图优先项</strong>
            <span>{metrics.roadmapItems.length} 项</span>
          </div>
          <div className="cockpit-guide-focus-list">
            {metrics.roadmapItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="cockpit-guide-focus-item"
                aria-label={`打开路线图优先项 ${item.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: item.cockpit_page }, onNavigate, onOpenTarget)}
              >
                <div>
                  <strong>{item.title}</strong>
                  <small>{item.priority} · {item.status}</small>
                </div>
                <p>{item.problem || `优先回到 ${item.cockpit_page} 承接实现。`}</p>
              </button>
            ))}
            {metrics.roadmapItems.length === 0 && (
              <div className="cockpit-guide-focus-empty">当前没有待跟进路线图条目。</div>
            )}
          </div>
        </article>
      </div>
    </section>
  );
}

interface GuideMissingCapabilitySectionProps {
  missingCapabilityRows: Array<{
    id: string;
    category: string;
    title: string;
    signal: string;
    summary: string;
    objectTarget: CockpitNavigationTarget;
    taskTarget: CockpitNavigationTarget;
  }>;
  missingCapabilitySummary: {
    total: number;
    page: number;
    evidence: number;
    domain: number;
    project: number;
    roadmap: number;
  };
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideMissingCapabilitySection({
  missingCapabilityRows,
  missingCapabilitySummary,
  onNavigate,
  onOpenTarget,
}: GuideMissingCapabilitySectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>能力缺失登记</h2>
          <p className="text-muted">把页面、证据、领域挂载、项目状态面和未来能力统一登记成一张缺口表，直接决定回对象还是回任务。</p>
        </div>
      </div>
      <div className="cockpit-guide-coverage-summary">
        <span><strong>{missingCapabilitySummary.total}</strong> 条登记</span>
        <span><strong>{missingCapabilitySummary.page}</strong> 条页面能力</span>
        <span><strong>{missingCapabilitySummary.evidence}</strong> 条证据链</span>
        <span><strong>{missingCapabilitySummary.domain}</strong> 条领域挂载</span>
        <span><strong>{missingCapabilitySummary.project + missingCapabilitySummary.roadmap}</strong> 条未来补位</span>
      </div>
      <div className="cockpit-guide-coverage-list">
        {missingCapabilityRows.map((row) => (
          <div key={row.id} className="cockpit-guide-coverage-row gap">
            <div className="cockpit-guide-coverage-row-head">
              <div>
                <strong>{row.title}</strong>
                <small>{row.category} · {row.signal}</small>
              </div>
              <span className="cockpit-guide-coverage-status gap">待补位</span>
            </div>
            <p>{row.summary}</p>
            <div className="cockpit-guide-coverage-next">
              <strong>承接方式</strong>
              <p>先看对象承接，再回任务中心补齐缺失链路。</p>
            </div>
            <div className="cockpit-guide-coverage-actions">
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开缺失能力对象 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
              >
                <ArrowRight size={14} />
                <span>看对象</span>
              </button>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开缺失能力任务 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>看任务</span>
              </button>
            </div>
          </div>
        ))}
        {missingCapabilityRows.length === 0 && (
          <div className="cockpit-guide-focus-empty">当前没有待登记的能力缺失项。</div>
        )}
      </div>
    </section>
  );
}

interface GuideProblemEntrySectionProps {
  problemEntryCards: Array<{
    id: string;
    title: string;
    signal: string;
    detail: string;
    primaryLabel: string;
    primaryTarget: CockpitNavigationTarget;
    secondaryLabel: string;
    secondaryTarget: CockpitNavigationTarget;
  }>;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function GuideProblemEntrySection({
  problemEntryCards,
  onNavigate,
  onOpenTarget,
}: GuideProblemEntrySectionProps) {
  return (
    <section className="cockpit-guide-section">
      <div className="section-header">
        <div>
          <h2>按问题定位</h2>
          <p className="text-muted">当你只知道"这里不够用"时，先按症状进，不用猜应该去哪个页面翻。</p>
        </div>
      </div>
      <div className="cockpit-guide-focus-grid">
        {problemEntryCards.map((card) => (
          <article key={card.id} className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>{card.title}</strong>
              <span>{card.signal}</span>
            </div>
            <div className="cockpit-guide-focus-list">
              <div className="cockpit-guide-focus-item" style={{ cursor: 'default' }}>
                <div>
                  <strong>当前信号</strong>
                  <small>{card.signal}</small>
                </div>
                <p>{card.detail}</p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开问题入口 ${card.title}`}
                onClick={() => openCockpitNavigationTarget(card.primaryTarget, onNavigate, onOpenTarget)}
              >
                <ArrowRight size={14} />
                <span>{card.primaryLabel}</span>
              </button>
              <button
                type="button"
                className="antd-btn secondary"
                aria-label={`打开问题任务 ${card.title}`}
                onClick={() => openCockpitNavigationTarget(card.secondaryTarget, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>{card.secondaryLabel}</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

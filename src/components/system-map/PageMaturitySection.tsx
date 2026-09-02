import React from 'react';
import { ArrowRight, CheckCircle, Layers, Search } from 'lucide-react';
import type { CockpitNavigationTarget, PageMaturity, SourceRef } from './types';
import { openSystemMapTarget, pageMaturityStatusText, statusClass } from './utils';
import SourceRefList from './SourceRefList';

type PageMaturitySectionProps = {
  pageMaturity: PageMaturity[];
  pageMaturitySummary: { ready: number; watch: number; gap: number; tracked: number; untracked: number; roadmapShipped: number };
  visiblePageMaturity: PageMaturity[];
  pageMaturityFilter: string;
  activeSourceTarget: string;
  onSetSelectedPageMaturityId: (id: string | null) => void;
  onSetPageMaturityFilter: (filter: string) => void;
  onQueuePageOperatorAction: (pageId: string, action: { id: string; kind?: string; label?: string }) => void;
  onNavigate: (target: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  onInspect: (ref: SourceRef) => void;
};

function PageMaturitySection({
  pageMaturity,
  pageMaturitySummary,
  visiblePageMaturity,
  pageMaturityFilter,
  activeSourceTarget,
  onSetSelectedPageMaturityId,
  onSetPageMaturityFilter,
  onQueuePageOperatorAction,
  onNavigate,
  onOpenTarget,
  onInspect,
}: PageMaturitySectionProps) {
  const [expandedPageActions, setExpandedPageActions] = React.useState(new Set<string>());

  return (
    <>
      <section className="services-section system-map-section">
        <div className="section-header">
          <div><h2>站点结构</h2><p className="text-muted">按人的使用场景组织，而不是按代码目录硬塞。</p></div>
          <span className="status-badge online"><CheckCircle size={13} /> 原生导航</span>
        </div>
        <div className="system-map-page-groups">
          {Array.from(new Map(pageMaturity.map((p) => [p.page.group, p.page.group])).entries()).map(([group]) => {
            const pages = pageMaturity.filter((p) => p.page.group === group);
            return (
              <article className="system-map-group" key={group}>
                <h3>{group}</h3>
                <div className="system-map-page-list">
                  {pages.map((item) => (
                    <button key={item.page.id} className="system-map-page-row" onClick={() => onOpenTarget?.({ tab: item.page.id, pageId: item.page.id })}>
                      <span><strong>{item.page.title}</strong><small>{item.page.purpose}</small></span><ArrowRight size={14} />
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="services-section system-map-section" aria-label="页面受控动作证据">
        <div className="section-header">
          <div><h2>页面能力成熟度</h2><p className="text-muted">按页面核对项目、能力域、使用路径、操作清单、路线图和受控动作，找出薄弱页面。</p></div>
          <div className="system-map-page-maturity-summary">
            <span className="online">可日用 {pageMaturitySummary.ready}</span>
            <span className="degraded">观察 {pageMaturitySummary.watch}</span>
            <span className="offline">待补 {pageMaturitySummary.gap}</span>
            <span className={pageMaturitySummary.untracked > 0 ? 'degraded' : 'online'}>路线图已追踪 {pageMaturitySummary.tracked}/{pageMaturity.length}</span>
            <span className={pageMaturitySummary.roadmapShipped < pageMaturity.length ? 'degraded' : 'online'}>路线图已交付 {pageMaturitySummary.roadmapShipped}/{pageMaturity.length}</span>
          </div>
        </div>
        <div role="group" aria-label="页面成熟度筛选" className="system-map-page-maturity-filter">
          <button className={`antd-btn small ${pageMaturityFilter === 'untracked' ? 'active' : ''}`} aria-label="筛选页面成熟度：未追踪" aria-pressed={pageMaturityFilter === 'untracked'} onClick={() => onSetPageMaturityFilter(pageMaturityFilter === 'untracked' ? 'all' : 'untracked')}>未追踪</button>
          <button className={`antd-btn small ${pageMaturityFilter === 'gap' ? 'active' : ''}`} aria-label="筛选页面成熟度：待补" aria-pressed={pageMaturityFilter === 'gap'} onClick={() => onSetPageMaturityFilter(pageMaturityFilter === 'gap' ? 'all' : 'gap')}>待补</button>
          <button className={`antd-btn small ${pageMaturityFilter === 'watch' ? 'active' : ''}`} aria-label="筛选页面成熟度：观察" aria-pressed={pageMaturityFilter === 'watch'} onClick={() => onSetPageMaturityFilter(pageMaturityFilter === 'watch' ? 'all' : 'watch')}>观察</button>
          <button className={`antd-btn small ${pageMaturityFilter === 'ready' ? 'active' : ''}`} aria-label="筛选页面成熟度：可日用" aria-pressed={pageMaturityFilter === 'ready'} onClick={() => onSetPageMaturityFilter(pageMaturityFilter === 'ready' ? 'all' : 'ready')}>可日用</button>
          <span className="text-muted">显示 {visiblePageMaturity.length} / {pageMaturity.length}</span>
        </div>
        <div className="system-map-page-maturity-grid">
          {visiblePageMaturity.map((item) => (
            <article className={`system-map-page-maturity-card ${statusClass(item.status)}`} key={item.page.id}>
              <div className="system-map-page-maturity-head">
                <div><h3>{item.page.title}</h3><small>{item.page.group} · {item.page.id}</small></div>
                <span className={`status-badge ${statusClass(item.status)}`}>{pageMaturityStatusText(item.status)} · {item.score}%</span>
              </div>
              <p>{item.page.purpose}</p>
              <div className="system-map-page-maturity-metrics">
                <span>项目 <strong>{item.projects.length}</strong></span>
                <span>能力域 <strong>{item.domains.length}</strong></span>
                <span>路径 <strong>{item.usagePaths.length}</strong></span>
                <span>清单 <strong>{item.playbookSteps.length}</strong></span>
                <span>路线图 <strong>{item.roadmapItems.length}</strong></span>
                <span>动作 <strong>{item.actions}</strong></span>
              </div>
              <div className="system-map-page-maturity-tags">
                {item.projects.slice(0, 4).map((project) => <em key={project.id}>{project.id}</em>)}
                {item.domains.slice(0, 3).map((domain) => <em key={domain.id}>{domain.title}</em>)}
                {item.usagePaths.slice(0, 2).map((path) => <em key={path.id}>{path.title}</em>)}
              </div>
              <strong className="system-map-page-maturity-next">{item.nextAction}</strong>
              <div className="system-map-page-maturity-card-actions">
                <button className="antd-btn" onClick={() => onSetSelectedPageMaturityId(item.page.id)}><span>查看剖面</span></button>
                <button className="antd-btn" onClick={() => onOpenTarget?.({ tab: item.page.id, pageId: item.page.id })}><ArrowRight size={14} /><span>进入页面</span></button>
              </div>
              {item.operatorActions.length > 0 && (
                <div className="system-map-page-actions">
                  {expandedPageActions.has(item.page.id) ? (
                    <>
                      <button className="antd-btn small" aria-label={`收起页面动作 ${item.page.title}`} onClick={() => setExpandedPageActions((prev) => { const next = new Set(prev); next.delete(item.page.id); return next; })}><span>收起页面动作 {item.page.title}</span></button>
                      {item.operatorActions.map((actionId) => {
                        const detail = item.operatorActionDetails.find((detail) => detail.id === actionId);
                        return (
                          <button key={actionId} className="antd-btn small" aria-label={`承接页面动作 ${actionId}`} onClick={() => onQueuePageOperatorAction(item.page.id, { id: actionId, label: detail?.label, kind: detail?.kind })} title={detail?.description || detail?.label || actionId}>
                            <span>{detail?.label || actionId}</span>
                          </button>
                        );
                      })}
                    </>
                  ) : (
                    <button className="antd-btn small" aria-label={`展开页面动作 ${item.page.title}`} onClick={() => setExpandedPageActions((prev) => new Set(prev).add(item.page.id))}>
                      <Layers size={13} /><span>展开页面动作 {item.page.title}（{item.operatorActions.length}）</span>
                    </button>
                  )}
                </div>
              )}
            </article>
          ))}
          {visiblePageMaturity.length === 0 && (<div className="system-map-project-empty"><Search size={15} /><span>当前筛选没有页面</span></div>)}
        </div>
      </section>
    </>
  );
}

export default PageMaturitySection;

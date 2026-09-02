import React from 'react';
import { AlertTriangle, BookOpen, ClipboardList, ExternalLink, GitBranch, RefreshCw } from 'lucide-react';
import { openCockpitNavigationTarget } from '../cockpitNavigation';
import { type ResearchItem } from './types';
import { shortTime, statusText } from './utils';

interface ResearchWorkbenchContext {
  contextCount: number;
  taskCount: number;
  publishCount: number;
  contextItems: ResearchItem[];
  taskItems: ResearchItem[];
  publishItems: ResearchItem[];
}

interface ResearchWorkbenchSectionProps {
  workbench: ResearchWorkbenchContext;
  knowledgeTarget: string;
  taskTarget: string;
  publicationTarget: string;
  researchObjectQuery: string | undefined;
  queueError: string | null;
  queueingResearchId: number | null;
  relatedPages: Array<{ id: string; title: string; reason: string }>;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: { tab: string; taskQuery?: string; pageId?: string }) => void;
  onQueueTask: (id: number) => void;
  onOpenDetail: (id: number) => void;
  onDismissQueueError: () => void;
}

export function ResearchWorkbenchSection({
  workbench,
  knowledgeTarget,
  taskTarget,
  publicationTarget,
  researchObjectQuery,
  queueError,
  queueingResearchId,
  relatedPages,
  onNavigate,
  onOpenTarget,
  onQueueTask,
  onOpenDetail,
  onDismissQueueError,
}: ResearchWorkbenchSectionProps) {
  return (
    <section className="services-section">
      <div className="section-header">
        <div>
          <h2>研究承接工作台</h2>
          <p className="text-muted">先补上下文，再落任务，最后回到发布与复盘，不让研究对象停在半空里。</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="status-badge degraded">待补上下文 {workbench.contextCount}</span>
          <span className="status-badge degraded">待落任务 {workbench.taskCount}</span>
          <span className="status-badge online">待发布回流 {workbench.publishCount}</span>
        </div>
      </div>
      {queueError && (
        <div className="overview-inline-error" role="alert" aria-live="polite" style={{ marginBottom: 12 }}>
          <AlertTriangle size={16} />
          <span>研究任务承接失败：{queueError}</span>
          <button type="button" className="antd-btn small" onClick={onDismissQueueError}>关闭</button>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>待补上下文</h3>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>标签、来源或负责人偏薄的对象，先补知识上下文。</p>
          </div>
          {workbench.contextItems.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>暂无待补位对象。</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {workbench.contextItems.map((item) => (
                <button
                  key={`context-${item.id}`}
                  type="button"
                  className="action-surface-item"
                  aria-label={`补上下文 ${item.topic}`}
                  onClick={() => openCockpitNavigationTarget({ tab: knowledgeTarget, taskQuery: String(item.id) }, onNavigate, onOpenTarget)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{item.topic}</strong>
                    <p>{item.summary || item.next_action}</p>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      来源 {item.source_count} · 标签 {item.tags.length} · {item.agent ? `Agent ${item.agent}` : '缺少负责人'}
                    </span>
                  </div>
                  <ClipboardList size={14} />
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>待落任务</h3>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>有追问、有下一步但还没进入执行闭环的对象，直接送去任务中心。</p>
          </div>
          {workbench.taskItems.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>暂无待落任务对象。</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {workbench.taskItems.map((item) => (
                <button
                  key={`task-${item.id}`}
                  type="button"
                  className="action-surface-item"
                  aria-label={`落任务 ${item.topic}`}
                  onClick={() => onQueueTask(item.id)}
                  disabled={queueingResearchId === item.id}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{item.topic}</strong>
                    <p>{item.next_action}</p>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      追问 {item.follow_up_count} · 最近事件 {item.last_event?.label || '暂无'}
                    </span>
                  </div>
                  {queueingResearchId === item.id ? <RefreshCw size={14} className="animate-spin" /> : <GitBranch size={14} />}
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="section-header" style={{ marginBottom: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>待发布与回流</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先看对象详情，再进入发布/总览面做回流和复盘。</p>
            </div>
            <button
              type="button"
              className="antd-btn"
              onClick={() => openCockpitNavigationTarget({ tab: publicationTarget, taskQuery: researchObjectQuery }, onNavigate, onOpenTarget)}
            >
              <BookOpen size={14} />
              <span>进入发布面</span>
            </button>
          </div>
          {workbench.publishItems.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>暂无待发布对象。</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {workbench.publishItems.map((item) => (
                <button
                  key={`publish-${item.id}`}
                  type="button"
                  className="action-surface-item"
                  aria-label={`查看发布承接 ${item.topic}`}
                  onClick={() => onOpenDetail(item.id)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{item.topic}</strong>
                    <p>{item.summary || item.next_action}</p>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      状态 {statusText(item.status)} · 最近 {shortTime(item.last_event?.created_at || item.created_at)}
                    </span>
                  </div>
                  <ExternalLink size={14} />
                </button>
              ))}
            </div>
          )}
        </article>
      </div>

      {relatedPages.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
          {relatedPages.map((page) => (
            <button
              key={page.id}
              type="button"
              className="action-surface-item"
              onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: researchObjectQuery }, onNavigate, onOpenTarget)}
              style={{ textAlign: 'left' }}
            >
              <div>
                <strong>{page.title}</strong>
                <p>{page.reason}</p>
              </div>
              <ClipboardList size={14} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

import React from 'react';
import { BookOpen, Bot, Copy, Database, FileText, GitBranch, Route, ShieldAlert } from 'lucide-react';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import {
  type KnowledgeClosureRow,
  type KnowledgeSurfaceCard,
  type KnowledgeSubTab,
  copyText,
} from './KnowledgeHubView.types';

interface FocusedKnowledgeCardSectionProps {
  kicker: string;
  title: string;
  detail: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function FocusedKnowledgeCardSection({
  kicker,
  title,
  detail,
  objectTarget,
  taskTarget,
  onNavigate,
  onOpenTarget,
}: FocusedKnowledgeCardSectionProps) {
  return (
    <section className="services-section overview-ops-panel" aria-label="当前知识承接焦点">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>当前知识承接焦点</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            把系统地图、页面审计或任务里丢过来的上下文，先翻成知识面应该承接的对象。
          </p>
        </div>
        <span className="status-badge online">{kicker}</span>
      </div>
      <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
        <div>
          <strong>{title}</strong>
          <p>{detail}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开知识焦点对象 ${title}`}
            onClick={() => openCockpitNavigationTarget(objectTarget, onNavigate, onOpenTarget)}
          >
            <Database size={14} />
            <span>打开对象</span>
          </button>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开知识焦点任务 ${title}`}
            onClick={() => openCockpitNavigationTarget(taskTarget, onNavigate, onOpenTarget)}
          >
            <GitBranch size={14} />
            <span>打开任务</span>
          </button>
        </div>
      </article>
    </section>
  );
}

interface KnowledgeSurfaceCardProps {
  surface: KnowledgeSurfaceCard;
  isActive: boolean;
  onSelect: (id: KnowledgeSubTab) => void;
}

function KnowledgeSurfaceCardItem({ surface, isActive, onSelect }: KnowledgeSurfaceCardProps) {
  return (
    <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
      <div style={{ display: 'grid', gap: 6 }}>
        <small className="text-muted" style={{ fontSize: 11, textTransform: 'uppercase' }}>{surface.id}</small>
        <strong style={{ fontSize: 15 }}>{surface.title}</strong>
        <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{surface.summary}</p>
      </div>
      <div style={{ minHeight: 54, padding: '10px 12px', borderRadius: 'var(--antd-radius-md)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <small className="text-muted" style={{ display: 'block', marginBottom: 4 }}>怎么用</small>
        <span style={{ fontSize: 12, lineHeight: 1.6 }}>{surface.detail}</span>
      </div>
      <button
        type="button"
        className="antd-btn small"
        aria-label={`切换知识子面板 ${surface.title}`}
        onClick={() => onSelect(surface.id)}
      >
        <Route size={13} />
        <span>{isActive ? '当前查看' : '切到此层'}</span>
      </button>
    </article>
  );
}

interface KnowledgeDimensionMapProps {
  surfaces: KnowledgeSurfaceCard[];
  filteredSurfaces: KnowledgeSurfaceCard[];
  subTab: KnowledgeSubTab;
  query: string;
  onQueryChange: (value: string) => void;
  onClearQuery: () => void;
  onSelectSurface: (id: KnowledgeSubTab) => void;
}

export function KnowledgeDimensionMap({
  surfaces,
  filteredSurfaces,
  subTab,
  query,
  onQueryChange,
  onClearQuery,
  onSelectSurface,
}: KnowledgeDimensionMapProps) {
  return (
    <section className="services-section" aria-label="知识维度地图">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>知识维度地图</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            把知识面的运行、记忆、智能体、校准和日志五个子面板直接摆出来，减少只看到旧看板却不知道怎么用的断层。
          </p>
        </div>
        <span className="status-badge online">显示 {filteredSurfaces.length}/{surfaces.length}</span>
      </div>
      <div role="region" aria-label="知识中枢筛选" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 16 }}>
        <input
          type="search"
          aria-label="搜索知识子面板和闭环"
          placeholder="运行、记忆、智能体、日志或闭环"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          style={{ flex: '1 1 260px', minWidth: 220 }}
        />
        {query && (
          <button type="button" className="antd-btn small" aria-label="清除知识中枢筛选" onClick={onClearQuery}>
            清除筛选
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {filteredSurfaces.map((surface) => (
          <KnowledgeSurfaceCardItem
            key={surface.id}
            surface={surface}
            isActive={surface.id === subTab}
            onSelect={onSelectSurface}
          />
        ))}
      </div>
      {filteredSurfaces.length === 0 && (
        <p className="text-muted" style={{ margin: '14px 0 0', fontSize: 13 }}>没有匹配的知识子面板，试试运行、记忆、智能体或日志。</p>
      )}
    </section>
  );
}

interface ActiveKnowledgeSurfacePanelProps {
  surface: KnowledgeSurfaceCard;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function ActiveKnowledgeSurfacePanel({
  surface,
  onNavigate,
  onOpenTarget,
}: ActiveKnowledgeSurfacePanelProps) {
  return (
    <section className="services-section" role="region" aria-label="当前知识子面板">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>当前知识子面板</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            先确认当前正在看的知识层，再把相关对象和任务送到真正的承接页。
          </p>
        </div>
        <span className="status-badge degraded">{surface.title}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{surface.title}</strong>
            <p>{surface.detail}</p>
          </div>
        </article>
        <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 10 }}>
          <div style={{ display: 'grid', gap: 4 }}>
            <strong style={{ fontSize: 15 }}>相关去向</strong>
            <small className="text-muted">这层最常见的对象承接与任务收口。</small>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开知识相关对象 ${surface.title}`}
              onClick={() => openCockpitNavigationTarget(surface.objectTarget, onNavigate, onOpenTarget)}
            >
              <BookOpen size={14} />
              <span>打开相关对象</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开知识相关任务 ${surface.title}`}
              onClick={() => openCockpitNavigationTarget(surface.taskTarget, onNavigate, onOpenTarget)}
            >
              <ShieldAlert size={14} />
              <span>打开承接任务</span>
            </button>
          </div>
        </article>
      </div>
    </section>
  );
}

interface KnowledgeTaskDraftSectionProps {
  title: string;
  description: string;
  checklist: string[];
  copyTextValue: string;
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
  pending: boolean;
  notice: string | null;
  error: string | null;
  onCreateTask: () => void;
  onCopyTask: () => void;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function KnowledgeTaskDraftSection({
  title,
  description,
  checklist,
  objectTarget,
  taskTarget,
  pending,
  notice,
  error,
  onCreateTask,
  onCopyTask,
  onNavigate,
  onOpenTarget,
}: KnowledgeTaskDraftSectionProps) {
  return (
    <section className="services-section" role="region" aria-label="知识补位任务">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>知识补位任务</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            把当前知识层直接翻成一条可复制、可送往任务中心的补位动作，避免知识面停在浏览状态。
          </p>
        </div>
        <span className="status-badge degraded">草稿就绪</span>
      </div>
      <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
        <div>
          <strong>{title}</strong>
          <p>{description}</p>
          <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
            {checklist.map((item, index) => (
              <small key={`${title}-${index}`} className="text-muted">{index + 1}. {item}</small>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
          <button
            type="button"
            className="antd-btn"
            disabled={pending}
            aria-label={`登记知识治理任务 ${title}`}
            onClick={() => { void onCreateTask(); }}
          >
            <ShieldAlert size={14} />
            <span>{pending ? '登记中...' : '登记正式任务'}</span>
          </button>
          <button
            type="button"
            className="antd-btn"
            aria-label={`复制知识补位任务 ${title}`}
            onClick={() => { void onCopyTask(); }}
          >
            <Copy size={14} />
            <span>复制补位任务</span>
          </button>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开知识补位对象 ${title}`}
            onClick={() => openCockpitNavigationTarget(objectTarget, onNavigate, onOpenTarget)}
          >
            <Bot size={14} />
            <span>打开相关对象</span>
          </button>
          <button
            type="button"
            className="antd-btn"
            aria-label={`打开知识补位任务 ${title}`}
            onClick={() => openCockpitNavigationTarget(taskTarget, onNavigate, onOpenTarget)}
          >
            <FileText size={14} />
            <span>送进任务中心</span>
          </button>
        </div>
      </article>
      {notice && (
        <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{notice}</p>
      )}
      {error && (
        <p role="alert" className="text-danger" style={{ margin: 0, fontSize: 12 }}>{error}</p>
      )}
    </section>
  );
}

interface KnowledgeClosureTableProps {
  rows: KnowledgeClosureRow[];
  filteredRows: KnowledgeClosureRow[];
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}

export function KnowledgeClosureTable({
  rows,
  filteredRows,
  onNavigate,
  onOpenTarget,
}: KnowledgeClosureTableProps) {
  return (
    <section className="services-section" role="region" aria-label="知识闭环总表">
      <div className="section-header">
        <div>
          <h2 style={{ margin: 0, fontSize: 16 }}>知识闭环总表</h2>
          <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            把研究回流、知识供给、智能体协议联动和日志收口并排摆出来，知识页才能真正承接站内上下文主轴。
          </p>
        </div>
        <span className="status-badge online">显示 {filteredRows.length}/{rows.length} 条闭环</span>
      </div>
      <div style={{ display: 'grid', gap: 12 }}>
        {filteredRows.map((row) => (
          <article
            key={`knowledge-closure-${row.id}`}
            className="antd-card"
            style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}
          >
            <div style={{ display: 'grid', gap: 6 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                <strong style={{ fontSize: 15 }}>{row.title}</strong>
                <span className={`status-badge ${row.statusTone}`}>{row.signal}</span>
              </div>
              <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{row.summary}</p>
            </div>
            <div style={{ display: 'grid', gap: 6 }}>
              <small className="text-muted">下一步</small>
              <span style={{ fontSize: 13, lineHeight: 1.6 }}>{row.nextAction}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开知识闭环对象 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
              >
                <Database size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开知识闭环任务 ${row.title}`}
                onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
              >
                <GitBranch size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        ))}
      </div>
      {filteredRows.length === 0 && (
        <p className="text-muted" style={{ margin: '14px 0 0', fontSize: 13 }}>没有匹配的知识闭环，换个关键词再试。</p>
      )}
    </section>
  );
}

import React, { type RefObject } from 'react';
import { Command, Download, Link2, Menu, RefreshCw, Search, X, Zap } from 'lucide-react';

interface SearchTarget {
  id: string;
  label: string;
  group: string;
  keywords: string[];
}

interface DashboardTopbarProps {
  mobileNavToggleRef: RefObject<HTMLButtonElement | null>;
  mobileNavOpen: boolean;
  onToggleMobileNav: () => void;
  globalSearchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  searchResults: SearchTarget[];
  activeSearchResultIndex: number;
  onSearchQueryChange: (query: string) => void;
  onSearchResultIndexChange: (index: number) => void;
  onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onSearchTargetSelect: (target: SearchTarget) => void;
  onRefresh: () => void;
  snapshotExportState: 'idle' | 'exporting' | 'success' | 'error';
  linkCopyState: 'idle' | 'success' | 'error';
  onCopyLink: () => void;
  onOpenCommandPalette: () => void;
  onOpenQuickActions: () => void;
}

export function DashboardTopbar({
  mobileNavToggleRef,
  mobileNavOpen,
  onToggleMobileNav,
  globalSearchInputRef,
  searchQuery,
  searchResults,
  activeSearchResultIndex,
  onSearchQueryChange,
  onSearchResultIndexChange,
  onSearchKeyDown,
  onSearchTargetSelect,
  onRefresh,
  snapshotExportState,
  linkCopyState,
  onCopyLink,
  onOpenCommandPalette,
  onOpenQuickActions,
}: DashboardTopbarProps) {
  return (
    <header className="topbar">
      <button
        type="button"
        className="topbar-btn mobile-nav-toggle"
        ref={mobileNavToggleRef}
        aria-label={mobileNavOpen ? '关闭主导航' : '打开主导航'}
        aria-expanded={mobileNavOpen}
        onClick={onToggleMobileNav}
      >
        {mobileNavOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
      </button>
      <div className="topbar-search-wrap" role="search">
        <div className="search-bar">
          <Search size={16} className="text-muted" aria-hidden="true" />
          <input
            ref={globalSearchInputRef}
            type="text"
            placeholder="搜索页面、项目、能力..."
            aria-label="全局搜索输入框"
            aria-controls="cockpit-global-search-results"
            aria-expanded={Boolean(searchQuery.trim())}
            aria-activedescendant={searchResults[activeSearchResultIndex] ? `cockpit-search-result-${searchResults[activeSearchResultIndex].id}` : undefined}
            value={searchQuery}
            onChange={(event) => {
              onSearchQueryChange(event.target.value);
              onSearchResultIndexChange(0);
            }}
            onKeyDown={onSearchKeyDown}
          />
        </div>
        {searchQuery.trim() && (
          <div id="cockpit-global-search-results" className="topbar-search-results" role="listbox" aria-label="全局搜索结果">
            {searchResults.length > 0 ? searchResults.map((target) => (
              <button
                key={target.id}
                id={`cockpit-search-result-${target.id}`}
                type="button"
                role="option"
                aria-selected={searchResults[activeSearchResultIndex]?.id === target.id}
                className="topbar-search-result"
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => onSearchResultIndexChange(searchResults.findIndex((item) => item.id === target.id))}
                onClick={() => onSearchTargetSelect(target)}
              >
                <span>{target.label}</span>
                <small>{target.group} · {target.keywords.slice(0, 3).join(' / ')}</small>
              </button>
            )) : (
              <div className="topbar-search-empty">没有匹配入口</div>
            )}
          </div>
        )}
      </div>
      <div className="topbar-actions">
        <button
          type="button"
          className="topbar-btn"
          aria-label="刷新当前页面数据"
          title="刷新当前页面数据"
          onClick={onRefresh}
        >
          <RefreshCw size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          className="topbar-btn topbar-export"
          aria-label="导出全站运行快照"
          title="导出全站运行快照"
          disabled={snapshotExportState === 'exporting'}
          onClick={() => { window.dispatchEvent(new Event('cockpit:export-snapshot')); }}
        >
          <Download size={16} aria-hidden="true" />
        </button>
        {snapshotExportState !== 'idle' && (
          <span className="text-muted" role="status" aria-live="polite">
            {snapshotExportState === 'exporting' ? '导出中...' : snapshotExportState === 'success' ? '快照已导出' : '快照导出失败'}
          </span>
        )}
        <button
          type="button"
          className="topbar-btn topbar-link"
          aria-label="复制当前页面链接"
          title="复制当前页面链接"
          onClick={() => { void onCopyLink(); }}
        >
          <Link2 size={16} aria-hidden="true" />
        </button>
        {linkCopyState !== 'idle' && (
          <span className="text-muted" role="status" aria-live="polite">
            {linkCopyState === 'success' ? '链接已复制' : '复制失败'}
          </span>
        )}
        <button
          className="topbar-btn"
          onClick={onOpenCommandPalette}
          title="命令面板 (Ctrl+K)"
        >
          <Command size={16} />
        </button>
        <button
          className="topbar-btn"
          onClick={onOpenQuickActions}
          title="快捷操作 (Ctrl+J)"
        >
          <Zap size={16} />
        </button>
      </div>
      <div className="user-profile" role="button" aria-label="个人中心，管理员" tabIndex={0}>
        <div className="avatar" aria-hidden="true">AD</div>
        <span>管理员</span>
      </div>
    </header>
  );
}

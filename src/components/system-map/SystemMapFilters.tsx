import React from 'react';
import { Search } from 'lucide-react';
import type { PageMaturityFilter, SystemMapPayload } from './types';
import { statusClass } from './utils';

type SystemMapFiltersProps = {
  systemMap: SystemMapPayload;
  projectQuery: string;
  projectLayerFilter: string;
  projectPageFilter: string;
  coverageFilter: string;
  pageMaturityFilter: PageMaturityFilter;
  pageMaturitySummary: { ready: number; watch: number; gap: number; tracked: number; untracked: number };
  pageMaturityLength: number;
  visiblePageMaturityLength: number;
  projectLayerOptions: string[];
  projectPageOptions: { id: string; title: string }[];
  coverageFilterOptions: (SystemMapPayload['project_capability_coverage']['dimension_summary'][number] & { id: string; title: string; description: string })[];
  activeCoverage: (SystemMapPayload['project_capability_coverage']['dimension_summary'][number] & { id: string; title: string; description: string }) | undefined;
  activePortfolioBucket: SystemMapPayload['project_portfolio']['buckets'][number] | null;
  filteredTriageCommandCount: number;
  onProjectQueryChange: (query: string) => void;
  onProjectLayerFilterChange: (layer: string) => void;
  onProjectPageFilterChange: (page: string) => void;
  onCoverageFilterChange: (dimensionId: string) => void;
  onPageMaturityFilterChange: (filter: PageMaturityFilter) => void;
  onPortfolioFilterClear: () => void;
};

function SystemMapFilters({
  systemMap,
  projectQuery,
  projectLayerFilter,
  projectPageFilter,
  coverageFilter,
  pageMaturityFilter,
  pageMaturitySummary,
  pageMaturityLength,
  visiblePageMaturityLength,
  projectLayerOptions,
  projectPageOptions,
  coverageFilterOptions,
  activeCoverage,
  activePortfolioBucket,
  filteredTriageCommandCount,
  onProjectQueryChange,
  onProjectLayerFilterChange,
  onProjectPageFilterChange,
  onCoverageFilterChange,
  onPageMaturityFilterChange,
  onPortfolioFilterClear,
}: SystemMapFiltersProps) {
  return (
    <>
      {/* Project tools */}
      <div className="system-map-project-tools">
        <label className="system-map-project-search">
          <Search size={14} />
          <input value={projectQuery} onChange={(event) => onProjectQueryChange(event.target.value)} placeholder="搜索项目、层级、职责或下一步" />
        </label>
        <label className="system-map-project-filter">
          <span>层级</span>
          <select aria-label="按架构层级筛选项目" value={projectLayerFilter} onChange={(event) => onProjectLayerFilterChange(event.target.value)}>
            <option value="all">全部层级</option>
            {projectLayerOptions.map((layer) => <option key={layer} value={layer}>{layer}</option>)}
          </select>
        </label>
        <label className="system-map-project-filter">
          <span>入口页</span>
          <select aria-label="按 Cockpit 入口页筛选项目" value={projectPageFilter} onChange={(event) => onProjectPageFilterChange(event.target.value)}>
            <option value="all">全部入口页</option>
            {projectPageOptions.map((page) => <option key={page.id} value={page.id}>{page.title}</option>)}
          </select>
        </label>
        <div className="system-map-project-filter-state">
          {activeCoverage && coverageFilter !== 'all' && (<span>覆盖维度：{activeCoverage.title}<button onClick={() => onCoverageFilterChange('all')}>清除</button></span>)}
          {activePortfolioBucket && (<span>组合态势：{activePortfolioBucket.title}<button onClick={onPortfolioFilterClear}>清除</button></span>)}
          <span className="text-muted">命令 {filteredTriageCommandCount}</span>
        </div>
      </div>

      {/* Coverage filter bar */}
      <div className="system-map-coverage-filterbar">
        {coverageFilterOptions.map((dimension) => (
          <button className={`system-map-coverage-filter ${coverageFilter === dimension.id ? 'active' : ''} ${statusClass(dimension.status)}`} key={dimension.id} aria-label={`筛选覆盖维度：${dimension.title}`} onClick={() => onCoverageFilterChange(dimension.id)} title={dimension.description}>
            <span>{dimension.title}</span><strong>{dimension.score}%</strong>
          </button>
        ))}
      </div>

      {/* Page maturity filter bar */}
      <div className="system-map-page-maturity-filterbar" role="group" aria-label="页面成熟度筛选">
        {(([
          ['all', '全部'],
          ['watch', '观察'],
          ['untracked', '未追踪'],
          ['tracked', '已追踪'],
          ['ready', '可日用'],
          ['gap', '待补齐'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" className={`system-map-coverage-filter ${pageMaturityFilter === value ? 'active' : ''}`} aria-label={`筛选页面成熟度：${label}`} aria-pressed={pageMaturityFilter === value} onClick={() => onPageMaturityFilterChange(value)}>
            {label}
            <strong>{value === 'all' ? pageMaturityLength : value === 'tracked' ? pageMaturitySummary.tracked : value === 'untracked' ? pageMaturitySummary.untracked : pageMaturitySummary[value as 'ready' | 'watch' | 'gap']}</strong>
          </button>
        )))}
        <span className="text-muted">显示 {visiblePageMaturityLength} / {pageMaturityLength}</span>
      </div>
    </>
  );
}

export default SystemMapFilters;

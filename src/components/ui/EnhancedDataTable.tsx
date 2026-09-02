/**
 * EnhancedDataTable — 增强版数据表格
 *
 * 功能：排序、筛选、分页、行选择、空态、加载态
 */
import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, Search, Filter } from 'lucide-react';
import { LoadingSkeleton } from './LoadingSkeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  selectedKeys?: Set<string>;
  onSelectionChange?: (keys: Set<string>) => void;
}

export function EnhancedDataTable<T>({
  data,
  columns,
  keyExtractor,
  loading = false,
  emptyMessage = '暂无数据',
  onRowClick,
  selectable = false,
  selectedKeys = new Set(),
  onSelectionChange,
}: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤 + 排序
  const processedData = useMemo(() => {
    let result = [...data];

    // 搜索过滤
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(item =>
        columns.some(col => {
          const val = col.render ? '' : (item as any)[col.key];
          return String(val).toLowerCase().includes(q);
        })
      );
    }

    // 排序
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = (a as any)[sortKey];
        const bVal = (b as any)[sortKey];
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [data, searchQuery, sortKey, sortDir, columns]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const toggleSelectAll = () => {
    if (!onSelectionChange) return;
    if (selectedKeys.size === processedData.length) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(processedData.map(keyExtractor)));
    }
  };

  if (loading) return <LoadingSkeleton lines={5} />;

  if (processedData.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  return (
    <div className="rounded-lg border border-border-subtle overflow-hidden">
      {/* 工具栏 */}
      <div className="flex items-center gap-3 p-3 border-b border-border-subtle bg-surface-1">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            type="text"
            placeholder="搜索..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-sm bg-surface-2 border border-border-subtle rounded-md text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <span className="text-xs text-text-tertiary">{processedData.length} 项</span>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-1 border-b border-border-subtle">
              {selectable && (
                <th className="w-10 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selectedKeys.size === processedData.length && processedData.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border-subtle"
                  />
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={`px-3 py-2 text-left text-text-tertiary font-medium ${col.sortable ? 'cursor-pointer hover:text-text-secondary' : ''} ${col.className || ''}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {processedData.map((item, i) => {
              const key = keyExtractor(item);
              const isSelected = selectedKeys.has(key);
              return (
                <tr
                  key={key}
                  className={`border-b border-border-subtle/50 ${isSelected ? 'bg-primary/5' : i % 2 ? 'bg-surface-0' : 'bg-surface-1/50'} ${onRowClick ? 'cursor-pointer hover:bg-surface-2' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
                  {selectable && (
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (!onSelectionChange) return;
                          const next = new Set(selectedKeys);
                          isSelected ? next.delete(key) : next.add(key);
                          onSelectionChange(next);
                        }}
                        className="rounded border-border-subtle"
                        onClick={e => e.stopPropagation()}
                      />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={`px-3 py-2 text-text-primary ${col.className || ''}`}>
                      {col.render ? col.render(item) : (item as any)[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

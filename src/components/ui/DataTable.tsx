/**
 * Reusable sortable / filterable table wrapper.
 *
 * Provides a standardised table surface with hover states, sticky header,
 * and optional per-column sort indicators. Designed for the cybertech
 * dark theme using CSS custom properties from index.css.
 *
 * Part of the shared design system (Phase 5).
 */
import React, { useState, useMemo } from 'react';
import './DataTable.css';

export type SortDirection = 'asc' | 'desc' | null;

export interface ColumnDef<T> {
  /** Unique key for this column */
  key: string;
  /** Header label */
  header: string;
  /** Render function for cell content */
  render: (row: T) => React.ReactNode;
  /** Whether this column is sortable */
  sortable?: boolean;
  /** Fixed width (CSS value) */
  width?: string;
  /** Custom header className */
  headerClassName?: string;
  /** Custom cell className (also receives row value) */
  cellClassName?: string | ((row: T) => string);
}

export interface DataTableProps<T> {
  /** Column definitions */
  columns: ColumnDef<T>[];
  /** Row data */
  data: T[];
  /** Optional row key extractor */
  rowKey?: (row: T, index: number) => string;
  /** Optional caption for accessibility */
  caption?: string;
  /** Empty state message */
  emptyMessage?: string;
  /** Optional additional CSS class on the wrapper */
  className?: string;
  /** Initial sort column key */
  defaultSortKey?: string;
  /** Initial sort direction */
  defaultSortDirection?: SortDirection;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  caption,
  emptyMessage = '暂无数据',
  className = '',
  defaultSortKey,
  defaultSortDirection = null,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(defaultSortKey ?? null);
  const [sortDir, setSortDir] = useState<SortDirection>(defaultSortDirection);

  const handleSort = (col: ColumnDef<T>) => {
    if (!col.sortable) return;
    if (sortKey === col.key) {
      // Cycle: asc -> desc -> null
      setSortDir((prev) => (prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'));
    } else {
      setSortKey(col.key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDir) return data;
    const sorted = [...data];
    sorted.sort((a, b) => {
      const aVal = columns.find((c) => c.key === sortKey)?.render(a) ?? '';
      const bVal = columns.find((c) => c.key === sortKey)?.render(b) ?? '';
      const aStr = String(aVal);
      const bStr = String(bVal);
      const cmp = aStr.localeCompare(bStr, 'zh-CN', { numeric: true });
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return sorted;
  }, [data, sortKey, sortDir, columns]);

  return (
    <div className={`data-table-wrapper ${className}`.trim()}>
      <table className="data-table" role="table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((col) => {
              const isSorted = sortKey === col.key;
              const headerClass = [
                'data-table-th',
                col.headerClassName ?? '',
                col.sortable ? 'data-table-th-sortable' : '',
                isSorted ? 'data-table-th-sorted' : '',
              ]
                .filter(Boolean)
                .join(' ');
              return (
                <th
                  key={col.key}
                  className={headerClass}
                  style={{ width: col.width }}
                  aria-sort={isSorted ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onClick={() => handleSort(col)}
                >
                  <span className="data-table-th-content">
                    {col.header}
                    {col.sortable && (
                      <span className="data-table-sort-icon" aria-hidden="true">
                        {isSorted && sortDir === 'asc' ? '▲' : isSorted && sortDir === 'desc' ? '▼' : '↕'}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedData.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="data-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            sortedData.map((row, rowIdx) => (
              <tr key={rowKey ? rowKey(row, rowIdx) : String(rowIdx)} className="data-table-row">
                {columns.map((col) => {
                  const cellClass = [
                    'data-table-td',
                    typeof col.cellClassName === 'function'
                      ? col.cellClassName(row)
                      : col.cellClassName ?? '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <td key={col.key} className={cellClass}>
                      {col.render(row)}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;

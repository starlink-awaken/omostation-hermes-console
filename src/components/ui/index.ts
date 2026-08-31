/**
 * Shared UI component barrel export.
 *
 * Import from `@/components/ui` to get all design-system primitives.
 */
export { default as PageHeader } from './PageHeader';
export type { PageHeaderProps } from './PageHeader';

export { default as StatusBadge } from './StatusBadge';
export type { StatusBadgeProps, StatusBadgeTone } from './StatusBadge';

export { default as LoadingSkeleton, SkeletonLines } from './LoadingSkeleton';
export type { SkeletonProps, SkeletonShape } from './LoadingSkeleton';

export { default as EmptyState } from './EmptyState';
export type { EmptyStateProps } from './EmptyState';

export { default as DataTable } from './DataTable';
export type { DataTableProps, ColumnDef, SortDirection } from './DataTable';

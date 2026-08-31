/**
 * Skeleton loading state component.
 *
 * Renders placeholder shimmer blocks while content is loading. Reuses
 * the `.skeleton` animation already defined in index.css. Supports line,
 * card, and circle shapes, plus a convenience "lines" multi-line helper.
 *
 * Part of the shared design system (Phase 5).
 */
import React from 'react';
import './LoadingSkeleton.css';

export type SkeletonShape = 'line' | 'card' | 'circle' | 'rect';

export interface SkeletonProps {
  /** Shape of the skeleton block */
  shape?: SkeletonShape;
  /** Width (CSS value). Defaults vary by shape. */
  width?: string | number;
  /** Height (CSS value). Defaults vary by shape. */
  height?: string | number;
  /** Optional additional CSS class */
  className?: string;
}

export function Skeleton({
  shape = 'line',
  width,
  height,
  className = '',
}: SkeletonProps) {
  const style: React.CSSProperties = {
    width: width ?? undefined,
    height: height ?? undefined,
  };
  return (
    <div
      className={`skeleton skeleton-${shape} ${className}`.trim()}
      style={style}
      aria-busy="true"
      aria-label="加载中"
    />
  );
}

/** Render N skeleton lines — common pattern for text placeholders. */
export function SkeletonLines({
  count = 3,
  className = '',
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`skeleton-lines ${className}`.trim()}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          shape="line"
          width={i === count - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export default Skeleton;

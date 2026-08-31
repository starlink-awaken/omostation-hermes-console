/**
 * Consistent status indicator component.
 *
 * Displays a small coloured badge representing one of the four standard
 * status tones: success, warning, error, info. Uses the cybertech dark
 * theme CSS custom properties defined in index.css.
 *
 * Part of the shared design system (Phase 5).
 */
import React from 'react';
import './StatusBadge.css';

export type StatusBadgeTone = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  /** Visual tone of the badge */
  tone?: StatusBadgeTone;
  /** Short label text inside the badge */
  label: string;
  /** Whether to show the leading dot indicator */
  dot?: boolean;
  /** Optional additional CSS class */
  className?: string;
}

const toneToClass: Record<StatusBadgeTone, string> = {
  success: 'status-badge-success',
  warning: 'status-badge-warning',
  error: 'status-badge-error',
  info: 'status-badge-info',
  neutral: 'status-badge-neutral',
};

export default function StatusBadge({
  tone = 'neutral',
  label,
  dot = true,
  className = '',
}: StatusBadgeProps) {
  const toneClass = toneToClass[tone];
  return (
    <span className={`status-badge ${toneClass} ${className}`.trim()}>
      {dot && <span className="status-badge-dot" aria-hidden="true" />}
      <span className="status-badge-label">{label}</span>
    </span>
  );
}

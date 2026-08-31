/**
 * Consistent empty state component.
 *
 * Displays an icon, message, and optional action button when a view has
 * no data to show. Replaces the various ad-hoc empty-state blocks that
 * previously duplicated styles across views.
 *
 * Part of the shared design system (Phase 5).
 */
import React from 'react';
import { Inbox } from 'lucide-react';
import './EmptyState.css';

export interface EmptyStateProps {
  /** Icon element (defaults to Inbox) */
  icon?: React.ReactNode;
  /** Primary heading */
  title?: string;
  /** Secondary description text */
  message: string;
  /** Optional action button / link */
  action?: React.ReactNode;
  /** Additional CSS class */
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  message,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`empty-state-container ${className}`.trim()} role="status">
      <div className="empty-state-icon" aria-hidden="true">
        {icon ?? <Inbox size={32} />}
      </div>
      {title && <h3 className="empty-state-title">{title}</h3>}
      <p className="empty-state-message">{message}</p>
      {action && <div className="empty-state-action">{action}</div>}
    </div>
  );
}

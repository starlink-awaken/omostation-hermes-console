/**
 * Standardized page header component.
 *
 * Provides a consistent page title, optional subtitle, and an optional
 * actions bar (buttons, links, etc.) across all cockpit views.
 *
 * Part of the shared design system (Phase 5).
 */
import React from 'react';
import './PageHeader.css';

export interface PageHeaderProps {
  /** Main page title */
  title: string;
  /** Optional subtitle / description */
  subtitle?: string;
  /** Optional action buttons or links */
  actions?: React.ReactNode;
  /** Optional breadcrumb content rendered above the title */
  breadcrumb?: React.ReactNode;
  /** Optional badge / status indicator rendered next to the title */
  badge?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumb,
  badge,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      {breadcrumb && <div className="page-header-breadcrumb">{breadcrumb}</div>}
      <div className="page-header-top">
        <div className="page-header-title-group">
          <h1 className="page-header-title">{title}</h1>
          {badge && <span className="page-header-badge">{badge}</span>}
        </div>
        {actions && <div className="page-header-actions">{actions}</div>}
      </div>
      {subtitle && <p className="page-header-subtitle">{subtitle}</p>}
    </header>
  );
}

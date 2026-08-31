import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PageHeader from '../PageHeader';

describe('PageHeader', () => {
  it('renders the title', () => {
    render(<PageHeader title="Dashboard" />);
    expect(screen.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeInTheDocument();
  });

  it('renders optional subtitle', () => {
    render(<PageHeader title="Dashboard" subtitle="系统总览" />);
    expect(screen.getByText('系统总览')).toBeInTheDocument();
  });

  it('renders optional actions', () => {
    render(
      <PageHeader
        title="Dashboard"
        actions={<button>刷新</button>}
      />,
    );
    expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();
  });

  it('renders optional badge', () => {
    render(
      <PageHeader
        title="Dashboard"
        badge={<span data-testid="badge">v2</span>}
      />,
    );
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });

  it('renders optional breadcrumb', () => {
    render(
      <PageHeader
        title="Dashboard"
        breadcrumb={<nav data-testid="crumb">Home / Page</nav>}
      />,
    );
    expect(screen.getByTestId('crumb')).toBeInTheDocument();
  });

  it('omits sections when props are absent', () => {
    const { container } = render(<PageHeader title="Dashboard" />);
    expect(container.querySelector('.page-header-subtitle')).toBeNull();
    expect(container.querySelector('.page-header-actions')).toBeNull();
    expect(container.querySelector('.page-header-badge')).toBeNull();
    expect(container.querySelector('.page-header-breadcrumb')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { CheckCircle } from 'lucide-react';
import EmptyState from '../EmptyState';

describe('EmptyState', () => {
  it('renders the message', () => {
    render(<EmptyState message="暂无告警" />);
    expect(screen.getByText('暂无告警')).toBeInTheDocument();
  });

  it('renders optional title', () => {
    render(<EmptyState title="无数据" message="暂无告警" />);
    expect(screen.getByRole('heading', { name: '无数据', level: 3 })).toBeInTheDocument();
  });

  it('renders optional action', () => {
    render(
      <EmptyState message="暂无告警" action={<button>刷新</button>} />,
    );
    expect(screen.getByRole('button', { name: '刷新' })).toBeInTheDocument();
  });

  it('renders default icon when none provided', () => {
    const { container } = render(<EmptyState message="暂无告警" />);
    expect(container.querySelector('.empty-state-icon')).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(
      <EmptyState
        message="暂无告警"
        icon={<CheckCircle data-testid="custom-icon" />}
      />,
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('has role=status for accessibility', () => {
    render(<EmptyState message="暂无告警" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

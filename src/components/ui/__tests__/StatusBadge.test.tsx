import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../StatusBadge';

describe('StatusBadge', () => {
  it('renders the label text', () => {
    render(<StatusBadge label="运行中" tone="success" />);
    expect(screen.getByText('运行中')).toBeInTheDocument();
  });

  it('applies the correct tone class for each tone', () => {
    const { rerender } = render(<StatusBadge label="ok" tone="success" />);
    expect(screen.getByText('ok').parentElement!.className).toContain('status-badge-success');

    rerender(<StatusBadge label="warn" tone="warning" />);
    expect(screen.getByText('warn').parentElement!.className).toContain('status-badge-warning');

    rerender(<StatusBadge label="err" tone="error" />);
    expect(screen.getByText('err').parentElement!.className).toContain('status-badge-error');

    rerender(<StatusBadge label="info" tone="info" />);
    expect(screen.getByText('info').parentElement!.className).toContain('status-badge-info');

    rerender(<StatusBadge label="neutral" tone="neutral" />);
    expect(screen.getByText('neutral').parentElement!.className).toContain('status-badge-neutral');
  });

  it('shows a dot by default', () => {
    render(<StatusBadge label="ok" />);
    expect(screen.getByText('ok').parentElement!.querySelector('.status-badge-dot')).toBeInTheDocument();
  });

  it('hides the dot when dot=false', () => {
    render(<StatusBadge label="ok" dot={false} />);
    expect(screen.getByText('ok').parentElement!.querySelector('.status-badge-dot')).toBeNull();
  });

  it('forwards additional className', () => {
    render(<StatusBadge label="ok" className="extra-class" />);
    expect(screen.getByText('ok').parentElement!.className).toContain('extra-class');
  });
});

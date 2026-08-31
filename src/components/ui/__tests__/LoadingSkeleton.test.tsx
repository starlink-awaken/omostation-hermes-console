import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Skeleton, { SkeletonLines } from '../LoadingSkeleton';

describe('Skeleton', () => {
  it('renders a line skeleton by default', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('.skeleton-line');
    expect(el).toBeInTheDocument();
    expect(el!.getAttribute('aria-busy')).toBe('true');
  });

  it('renders a card skeleton', () => {
    const { container } = render(<Skeleton shape="card" />);
    expect(container.querySelector('.skeleton-card')).toBeInTheDocument();
  });

  it('renders a circle skeleton', () => {
    const { container } = render(<Skeleton shape="circle" />);
    expect(container.querySelector('.skeleton-circle')).toBeInTheDocument();
  });

  it('renders a rect skeleton', () => {
    const { container } = render(<Skeleton shape="rect" />);
    expect(container.querySelector('.skeleton-rect')).toBeInTheDocument();
  });

  it('applies width and height inline styles', () => {
    const { container } = render(<Skeleton width="100px" height="20px" />);
    const el = container.querySelector('.skeleton') as HTMLElement;
    expect(el.style.width).toBe('100px');
    expect(el.style.height).toBe('20px');
  });
});

describe('SkeletonLines', () => {
  it('renders 3 lines by default', () => {
    const { container } = render(<SkeletonLines />);
    expect(container.querySelectorAll('.skeleton-line')).toHaveLength(3);
  });

  it('renders the requested number of lines', () => {
    const { container } = render(<SkeletonLines count={5} />);
    expect(container.querySelectorAll('.skeleton-line')).toHaveLength(5);
  });

  it('shortens the last line', () => {
    const { container } = render(<SkeletonLines count={2} />);
    const lines = container.querySelectorAll('.skeleton-line');
    expect((lines[1] as HTMLElement).style.width).toBe('60%');
  });
});

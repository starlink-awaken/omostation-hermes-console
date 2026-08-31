import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { DataTable, type ColumnDef } from '../DataTable';

interface Row {
  name: string;
  status: string;
  count: number;
}

const columns: ColumnDef<Row>[] = [
  { key: 'name', header: '名称', render: (r) => r.name, sortable: true },
  { key: 'status', header: '状态', render: (r) => r.status },
  { key: 'count', header: '数量', render: (r) => String(r.count), sortable: true },
];

const data: Row[] = [
  { name: 'Alpha', status: 'ok', count: 10 },
  { name: 'Beta', status: 'warn', count: 5 },
  { name: 'Gamma', status: 'err', count: 20 },
];

describe('DataTable', () => {
  it('renders column headers', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('名称')).toBeInTheDocument();
    expect(screen.getByText('状态')).toBeInTheDocument();
    expect(screen.getByText('数量')).toBeInTheDocument();
  });

  it('renders all rows', () => {
    render(<DataTable columns={columns} data={data} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('Gamma')).toBeInTheDocument();
  });

  it('renders empty message when no data', () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText('暂无数据')).toBeInTheDocument();
  });

  it('renders custom empty message', () => {
    render(<DataTable columns={columns} data={[]} emptyMessage="没有找到记录" />);
    expect(screen.getByText('没有找到记录')).toBeInTheDocument();
  });

  it('sorts ascending on first click of sortable column', () => {
    render(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText('名称').closest('th')!;
    fireEvent.click(nameHeader);
    const rows = screen.getAllByRole('row').slice(1); // skip header
    expect(rows[0].textContent).toContain('Alpha');
    expect(rows[1].textContent).toContain('Beta');
    expect(rows[2].textContent).toContain('Gamma');
  });

  it('sorts descending on second click', () => {
    render(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText('名称').closest('th')!;
    fireEvent.click(nameHeader); // asc
    fireEvent.click(nameHeader); // desc
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Gamma');
    expect(rows[1].textContent).toContain('Beta');
    expect(rows[2].textContent).toContain('Alpha');
  });

  it('clears sort on third click', () => {
    render(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText('名称').closest('th')!;
    fireEvent.click(nameHeader); // asc
    fireEvent.click(nameHeader); // desc
    fireEvent.click(nameHeader); // clear
    const rows = screen.getAllByRole('row').slice(1);
    // Original order restored
    expect(rows[0].textContent).toContain('Alpha');
    expect(rows[1].textContent).toContain('Beta');
    expect(rows[2].textContent).toContain('Gamma');
  });

  it('does not sort non-sortable columns', () => {
    render(<DataTable columns={columns} data={data} />);
    const statusHeader = screen.getByText('状态').closest('th')!;
    fireEvent.click(statusHeader);
    const rows = screen.getAllByRole('row').slice(1);
    expect(rows[0].textContent).toContain('Alpha');
  });

  it('sets aria-sort on sorted column', () => {
    render(<DataTable columns={columns} data={data} />);
    const nameHeader = screen.getByText('名称').closest('th')!;
    fireEvent.click(nameHeader);
    expect(nameHeader.getAttribute('aria-sort')).toBe('ascending');
  });

  it('uses rowKey for React keys', () => {
    const { container } = render(
      <DataTable columns={columns} data={data} rowKey={(r) => r.name} />,
    );
    expect(container.querySelectorAll('.data-table-row')).toHaveLength(3);
  });
});

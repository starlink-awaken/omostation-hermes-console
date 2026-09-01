/**
 * EventStream — 常驻 Agent 事件流表.
 *
 * 展示 events 数组的时间、类型、描述三列数据.
 */
import React from 'react';
import type { ColumnDef } from '../ui/DataTable';
import { DataTable } from '../ui/DataTable';

export interface ResidentEvent {
  timestamp?: string;
  type?: string;
  description?: string;
  [key: string]: unknown;
}

export interface EventStreamProps {
  events: ResidentEvent[];
}

function formatTimestamp(ts?: string): string {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return ts;
  }
}

const columns: ColumnDef<ResidentEvent>[] = [
  {
    key: 'timestamp',
    header: '时间',
    render: (row) => (
      <span className="text-xs text-text-secondary font-mono">
        {formatTimestamp(row.timestamp)}
      </span>
    ),
    width: '160px',
  },
  {
    key: 'type',
    header: '类型',
    render: (row) => (
      <span className="text-xs font-medium text-accent">
        {row.type ?? '—'}
      </span>
    ),
    width: '140px',
  },
  {
    key: 'description',
    header: '描述',
    render: (row) => (
      <span className="text-xs text-text-primary">
        {row.description ?? '—'}
      </span>
    ),
  },
];

export default function EventStream({ events }: EventStreamProps) {
  return (
    <DataTable
      columns={columns}
      data={events}
      emptyMessage="暂无事件"
      caption="常驻 Agent 事件流"
    />
  );
}

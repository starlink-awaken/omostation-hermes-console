/**
 * JourneysTimelineView — 交付旅程时间线 (T8-01).
 *
 * Vertical timeline of delivery journeys aggregated from:
 * - scene outcomes (scene-outcomes.jsonl)
 * - decision outcomes (agent-beliefs)
 * - adjudications (adjudications.jsonl)
 *
 * D1 rule: unconnected metrics show "未接入" instead of 0.
 */

import React, { useState } from 'react';
import { GitBranch, Filter, CheckCircle2, XCircle, Clock, Circle } from 'lucide-react';
import { useJourneysTimeline, type JourneyTimelineItem } from '../api/hooks';

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'accepted' || s === 'succeeded') return '#52c41a';
  if (s === 'rejected' || s === 'failed') return '#f5222d';
  if (s === 'revised' || s === 'running' || s === 'in_progress') return '#1890ff';
  if (s === 'pending') return '#888';
  return '#666';
}

function statusIcon(status: string) {
  const s = status.toLowerCase();
  if (s === 'accepted' || s === 'succeeded') return CheckCircle2;
  if (s === 'rejected' || s === 'failed') return XCircle;
  if (s === 'pending') return Clock;
  return Circle;
}

function sourceLabel(source: string): string {
  if (source === 'scene-outcome') return '场景结果';
  if (source === 'decision-outcome') return '决策结果';
  if (source === 'adjudication') return '人工裁决';
  return source;
}

function TimelineNode({ item }: { item: JourneyTimelineItem }) {
  const Icon = statusIcon(item.status);
  const color = statusColor(item.status);

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 0 }}>
      {/* Timeline rail */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: 24,
          flexShrink: 0,
        }}
      >
        <Icon style={{ width: 18, height: 18, color }} />
        <div
          style={{
            width: 2,
            flex: 1,
            background: '#1a1a2e',
            minHeight: 24,
          }}
        />
      </div>

      {/* Content */}
      <div className="antd-card" style={{ padding: 12, marginBottom: 12, flex: 1 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: 11,
                padding: '1px 6px',
                borderRadius: 4,
                background: `${color}22`,
                color,
                fontWeight: 'bold',
              }}
            >
              {sourceLabel(item.source)}
            </span>
            {item.scene_id && (
              <strong style={{ fontSize: 13 }}>{item.scene_id}</strong>
            )}
            <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>
              {item.journey_id}
            </span>
          </div>
          <span
            style={{
              fontSize: 12,
              fontWeight: 'bold',
              color,
            }}
          >
            {item.status}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: 11,
            color: '#666',
          }}
        >
          <span>{item.started_at || '未接入'}</span>
          {item.actor && <span>{item.actor}</span>}
        </div>
        {item.notes && (
          <p style={{ fontSize: 11, color: '#888', marginTop: 4, marginBottom: 0 }}>
            {item.notes}
          </p>
        )}
      </div>
    </div>
  );
}

export default function JourneysTimelineView() {
  const [sceneFilter, setSceneFilter] = useState('');

  const { data, isLoading } = useJourneysTimeline(
    sceneFilter ? { scene_id: sceneFilter } : undefined,
  );

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const successRate = data?.success_rate ?? 0;

  const sceneIds = Array.from(
    new Set(items.map((i) => i.scene_id).filter(Boolean)),
  ).sort();

  return (
    <div className="antd-page">
      <div className="antd-page-header">
        <h1>
          <GitBranch className="icon" /> 旅程时间线
        </h1>
        <p>交付旅程的 chronological 视图 — 跨场景的执行轨迹</p>
      </div>

      {/* Summary stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div className="antd-card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>总旅程</h3>
          <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            {total || '—'}
          </p>
        </div>
        <div className="antd-card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>成功率</h3>
          <p
            style={{
              fontSize: 28,
              fontWeight: 'bold',
              margin: 0,
              color: total > 0 ? (successRate >= 0.7 ? '#52c41a' : successRate >= 0.4 ? '#faad14' : '#f5222d') : '#888',
            }}
          >
            {total > 0 ? `${(successRate * 100).toFixed(0)}%` : '未接入'}
          </p>
        </div>
        <div className="antd-card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>数据源</h3>
          <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            {new Set(items.map((i) => i.source)).size || '—'}
          </p>
        </div>
      </div>

      {/* Scene filter */}
      <div
        className="antd-card"
        style={{
          padding: 12,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <Filter style={{ width: 16, height: 16, color: '#888' }} />
        <span style={{ fontSize: 13, color: '#888' }}>场景筛选:</span>
        <select
          className="antd-input"
          value={sceneFilter}
          onChange={(e) => setSceneFilter(e.target.value)}
          style={{ width: 200 }}
        >
          <option value="">全部</option>
          {sceneIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      {/* Timeline */}
      {isLoading ? (
        <div className="antd-card" style={{ padding: 24 }}>
          加载中...
        </div>
      ) : items.length === 0 ? (
        <div
          className="antd-card"
          style={{ padding: 32, textAlign: 'center', color: '#888' }}
        >
          <GitBranch style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.4 }} />
          <p>暂无旅程记录</p>
          <p style={{ fontSize: 12 }}>
            当场景执行并产出结果后，旅程会出现在这里
          </p>
        </div>
      ) : (
        <div style={{ paddingLeft: 8 }}>
          {items.map((item, i) => (
            <TimelineNode key={`${item.source}-${item.journey_id}-${i}`} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

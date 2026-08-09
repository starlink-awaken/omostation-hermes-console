/**
 * OutcomesView — 结果与校准面板 (T8-01).
 *
 * Three tabs:
 * - 待裁决队列: scene outcomes awaiting human adjudication
 * - 已裁决历史: adjudicated outcomes, newest first
 * - 校准曲线: per-scene calibration rollups + per-capability measurements
 *
 * D1 rule: unconnected metrics show "未接入" instead of 0.
 */

import React, { useState } from 'react';
import {
  Target,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Activity,
} from 'lucide-react';
import {
  useOutcomesSummary,
  useOutcomesPending,
  useOutcomesHistory,
  useOutcomesCalibration,
} from '../api/hooks';

type Tab = 'pending' | 'history' | 'calibration';

function TabButton({
  label,
  icon: Icon,
  active,
  onClick,
  badge,
}: {
  label: string;
  icon: React.FC<{ className?: string }>;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      className={`antd-tab ${active ? 'antd-tab-active' : ''}`}
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
    >
      <Icon className="icon" /> {label}
      {badge !== undefined && badge > 0 && (
        <span
          style={{
            background: '#f5222d',
            color: '#fff',
            borderRadius: 10,
            padding: '0 6px',
            fontSize: 11,
            minWidth: 18,
            textAlign: 'center',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function adjudicationColor(adj: string): string {
  if (adj === 'accepted') return '#52c41a';
  if (adj === 'rejected') return '#f5222d';
  if (adj === 'revised') return '#faad14';
  return '#888';
}

function adjudicationIcon(adj: string) {
  if (adj === 'accepted') return CheckCircle2;
  if (adj === 'rejected') return XCircle;
  if (adj === 'revised') return AlertTriangle;
  return Clock;
}

export default function OutcomesView() {
  const [activeTab, setActiveTab] = useState<Tab>('pending');

  const { data: summary } = useOutcomesSummary();
  const { data: pending = [], isLoading: pendingLoading } = useOutcomesPending();
  const { data: history = [], isLoading: historyLoading } = useOutcomesHistory();
  const { data: calibration, isLoading: calibrationLoading } = useOutcomesCalibration();

  return (
    <div className="antd-page">
      <div className="antd-page-header">
        <h1>
          <Target className="icon" /> 结果与校准
        </h1>
        <p>系统学得怎么样 — 决策裁决、校准曲线、交付结果一览</p>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div className="antd-card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>待裁决</h3>
          <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            {summary?.pending_count ?? '—'}
          </p>
        </div>
        <div className="antd-card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>已裁决</h3>
          <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            {summary?.history_count ?? '—'}
          </p>
        </div>
        <div className="antd-card" style={{ padding: 16 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>校准场景</h3>
          <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            {summary?.calibration_scenes ?? '—'}
          </p>
        </div>
        <div className="antd-card" style={{ padding: 16, borderLeft: '4px solid #722ed1' }}>
          <h3 style={{ margin: '0 0 4px', fontSize: 13, color: '#888' }}>知识引用率</h3>
          <p style={{ fontSize: 28, fontWeight: 'bold', margin: 0 }}>
            {summary?.knowledge_funnel?.status === 'live'
              ? summary.knowledge_funnel.citation_rate !== null
                ? `${(summary.knowledge_funnel.citation_rate * 100).toFixed(1)}%`
                : '—'
              : '未接入'}
          </p>
          <p style={{ fontSize: 11, color: '#999', margin: '4px 0 0' }}>
            {summary?.knowledge_funnel?.status === 'live'
              ? `召回 ${summary.knowledge_funnel.retrieved} · 引用 ${summary.knowledge_funnel.cited}`
              : '知识行动日志未激活'}
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="antd-tab-bar" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <TabButton
          label="待裁决队列"
          icon={Clock}
          active={activeTab === 'pending'}
          onClick={() => setActiveTab('pending')}
          badge={summary?.pending_count}
        />
        <TabButton
          label="已裁决历史"
          icon={CheckCircle2}
          active={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
        />
        <TabButton
          label="校准曲线"
          icon={TrendingUp}
          active={activeTab === 'calibration'}
          onClick={() => setActiveTab('calibration')}
        />
      </div>

      {/* Pending tab */}
      {activeTab === 'pending' && (
        <div>
          {pendingLoading ? (
            <div className="antd-card" style={{ padding: 24 }}>
              加载中...
            </div>
          ) : pending.length === 0 ? (
            <div
              className="antd-card"
              style={{ padding: 32, textAlign: 'center', color: '#888' }}
            >
              <Clock style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.4 }} />
              <p>暂无待裁决项</p>
              <p style={{ fontSize: 12 }}>
                当场景执行完成并等待人工裁决时，会出现在这里
              </p>
            </div>
          ) : (
            pending.map((item, i) => (
              <div
                key={`${item.scene_id}-${item.run_id}-${i}`}
                className="antd-card"
                style={{ padding: 16, marginBottom: 8 }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <strong>{item.scene_id}</strong>
                    <span style={{ marginLeft: 8, fontSize: 12, color: '#888' }}>
                      {item.run_id}
                    </span>
                  </div>
                  <span style={{ fontSize: 12, color: '#888' }}>{item.submitted_at}</span>
                </div>
                {item.notes && (
                  <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* History tab */}
      {activeTab === 'history' && (
        <div>
          {historyLoading ? (
            <div className="antd-card" style={{ padding: 24 }}>
              加载中...
            </div>
          ) : history.length === 0 ? (
            <div
              className="antd-card"
              style={{ padding: 32, textAlign: 'center', color: '#888' }}
            >
              <Activity style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.4 }} />
              <p>暂无裁决历史</p>
            </div>
          ) : (
            history.map((item, i) => {
              const AdjIcon = adjudicationIcon(item.adjudication);
              return (
                <div
                  key={`${item.scene_id}-${item.run_id}-${i}`}
                  className="antd-card"
                  style={{
                    padding: 16,
                    marginBottom: 8,
                    borderLeft: `4px solid ${adjudicationColor(item.adjudication)}`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <AdjIcon
                        style={{
                          width: 18,
                          height: 18,
                          color: adjudicationColor(item.adjudication),
                        }}
                      />
                      <strong>{item.scene_id}</strong>
                      <span style={{ fontSize: 12, color: '#888' }}>{item.run_id}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 'bold',
                          color: adjudicationColor(item.adjudication),
                        }}
                      >
                        {item.adjudication}
                      </span>
                      <span style={{ fontSize: 12, color: '#888' }}>
                        {item.adjudicated_at}
                      </span>
                    </div>
                  </div>
                  {item.notes && (
                    <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{item.notes}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Calibration tab */}
      {activeTab === 'calibration' && (
        <div>
          {calibrationLoading ? (
            <div className="antd-card" style={{ padding: 24 }}>
              加载中...
            </div>
          ) : (
            <div>
              {/* Per-scene calibration */}
              <h3 style={{ marginBottom: 12 }}>场景校准</h3>
              {calibration?.scenes.length === 0 ? (
                <div
                  className="antd-card"
                  style={{ padding: 24, textAlign: 'center', color: '#888' }}
                >
                  未接入
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: 16,
                    marginBottom: 24,
                  }}
                >
                  {calibration?.scenes.map((scene) => (
                    <div
                      key={scene.scene_id}
                      className="antd-card"
                      style={{ padding: 16 }}
                    >
                      <h4 style={{ margin: '0 0 8px', fontSize: 14 }}>
                        {scene.scene_id || '(unnamed)'}
                      </h4>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 28,
                            fontWeight: 'bold',
                            color:
                              scene.calibration >= 0.7
                                ? '#52c41a'
                                : scene.calibration >= 0.4
                                  ? '#faad14'
                                  : '#f5222d',
                          }}
                        >
                          {(scene.calibration * 100).toFixed(0)}%
                        </span>
                        <span style={{ fontSize: 12, color: '#888' }}>
                          {scene.accepted}/{scene.total}
                        </span>
                      </div>
                      {/* Calibration bar */}
                      <div
                        style={{
                          marginTop: 8,
                          height: 6,
                          background: '#1a1a2e',
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${scene.calibration * 100}%`,
                            height: '100%',
                            background:
                              scene.calibration >= 0.7
                                ? '#52c41a'
                                : scene.calibration >= 0.4
                                  ? '#faad14'
                                  : '#f5222d',
                            borderRadius: 3,
                            transition: 'width 0.3s',
                          }}
                        />
                      </div>
                      <p style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
                        更新: {scene.updated_at || '未接入'}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Per-capability calibration */}
              <h3 style={{ marginBottom: 12 }}>能力校准</h3>
              {calibration?.capabilities.length === 0 ? (
                <div
                  className="antd-card"
                  style={{ padding: 24, textAlign: 'center', color: '#888' }}
                >
                  未接入
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: 12,
                  }}
                >
                  {calibration?.capabilities.map((cap) => (
                    <div
                      key={cap.id}
                      className="antd-card"
                      style={{ padding: 12 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 12,
                            fontFamily: 'monospace',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '70%',
                          }}
                          title={cap.capability_ref}
                        >
                          {cap.capability_ref}
                        </span>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 'bold',
                            color:
                              cap.success_rate >= 0.7
                                ? '#52c41a'
                                : cap.success_rate >= 0.4
                                  ? '#faad14'
                                  : '#f5222d',
                          }}
                        >
                          {(cap.success_rate * 100).toFixed(0)}%
                        </span>
                      </div>
                      <span style={{ fontSize: 11, color: '#666' }}>
                        样本: {cap.sample_size} · {cap.measured_at || '未接入'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

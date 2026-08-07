/**
 * PilotReviewView - 试点复盘视图 (Phase 1.5 Week 4).
 *
 * 功能:
 * - 每周复盘报告 (准确率/时间节省/来源分布)
 * - 4周试点总结
 * - 连接器活动统计
 */

import React, { useState } from 'react';
import { BarChart3, TrendingUp, Clock, Target, Zap, FileText } from 'lucide-react';
import { useWeeklyReview, usePilotReport, useConnectorStats } from '../api/hooks';

export default function PilotReviewView() {
  const [weeks, setWeeks] = useState(1);
  const { data: review, isLoading: reviewLoading } = useWeeklyReview(weeks);
  const { data: pilot, isLoading: pilotLoading } = usePilotReport();
  const { data: connStats } = useConnectorStats();

  return (
    <div className="antd-page">
      <div className="antd-page-header">
        <h1><BarChart3 className="icon" /> 试点复盘</h1>
        <p>Phase 1.5 场景验证试点 - 每周复盘与统计</p>
      </div>

      {/* Weekly Review Section */}
      <div className="antd-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0 }}><TrendingUp className="icon" /> 每周复盘</h2>
          <select value={weeks} onChange={(e) => setWeeks(Number(e.target.value))} className="antd-input" style={{ width: 120 }}>
            <option value={1}>最近 1 周</option>
            <option value={2}>最近 2 周</option>
            <option value={3}>最近 3 周</option>
            <option value={4}>最近 4 周</option>
          </select>
        </div>

        {reviewLoading ? (
          <div>加载复盘数据中...</div>
        ) : review ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#f6ffed', padding: 12, borderRadius: 8, border: '1px solid #b7eb8f' }}>
                <div style={{ fontSize: 12, color: '#52c41a' }}>总意图</div>
                <div style={{ fontSize: 28, fontWeight: 'bold' }}>{review.summary.total_intents}</div>
              </div>
              <div style={{ background: '#fffbe6', padding: 12, borderRadius: 8, border: '1px solid #ffe58f' }}>
                <div style={{ fontSize: 12, color: '#faad14' }}>待审批</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#faad14' }}>{review.summary.pending}</div>
              </div>
              <div style={{ background: '#f6ffed', padding: 12, borderRadius: 8, border: '1px solid #b7eb8f' }}>
                <div style={{ fontSize: 12, color: '#52c41a' }}>已通过</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#52c41a' }}>{review.summary.approved}</div>
              </div>
              <div style={{ background: '#fff2f0', padding: 12, borderRadius: 8, border: '1px solid #ffccc7' }}>
                <div style={{ fontSize: 12, color: '#ff4d4f' }}>已拒绝</div>
                <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ff4d4f' }}>{review.summary.rejected}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
              <div style={{ background: '#e6f7ff', padding: 12, borderRadius: 8, border: '1px solid #91d5ff' }}>
                <Target className="icon" size={16} style={{ display: 'inline', marginRight: 4 }} />
                <span style={{ fontSize: 12, color: '#1890ff' }}>准确率</span>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#1890ff' }}>
                  {(review.summary.accuracy * 100).toFixed(1)}%
                </div>
              </div>
              <div style={{ background: '#f9f0ff', padding: 12, borderRadius: 8, border: '1px solid #d3adf7' }}>
                <Clock className="icon" size={16} style={{ display: 'inline', marginRight: 4 }} />
                <span style={{ fontSize: 12, color: '#722ed1' }}>节省时间</span>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#722ed1' }}>
                  {review.summary.time_saved_hours} 小时
                </div>
              </div>
              <div style={{ background: '#fff0f6', padding: 12, borderRadius: 8, border: '1px solid #ffadd2' }}>
                <Zap className="icon" size={16} style={{ display: 'inline', marginRight: 4 }} />
                <span style={{ fontSize: 12, color: '#eb2f96' }}>误报率</span>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: '#eb2f96' }}>
                  {(review.summary.false_positive_rate * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Distribution */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <h4>来源分布</h4>
                {Object.entries(review.distribution.by_source).map(([src, cnt]) => (
                  <div key={src} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span>{src}</span>
                    <span style={{ fontWeight: 'bold' }}>{cnt}</span>
                  </div>
                ))}
                {Object.keys(review.distribution.by_source).length === 0 && <span style={{ color: '#999' }}>暂无数据</span>}
              </div>
              <div>
                <h4>优先级分布</h4>
                {Object.entries(review.distribution.by_priority).map(([pri, cnt]) => (
                  <div key={pri} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontWeight: pri === 'P0' ? 'bold' : 'normal', color: pri === 'P0' ? '#f5222d' : '#666' }}>{pri}</span>
                    <span style={{ fontWeight: 'bold' }}>{cnt}</span>
                  </div>
                ))}
                {Object.keys(review.distribution.by_priority).length === 0 && <span style={{ color: '#999' }}>暂无数据</span>}
              </div>
            </div>

            {/* Daily Trend */}
            {Object.keys(review.daily_trend).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h4>每日趋势</h4>
                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 80 }}>
                  {Object.entries(review.daily_trend).slice(-14).map(([day, cnt]) => (
                    <div key={day} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{
                        background: '#1890ff',
                        height: `${Math.min(cnt * 10, 60)}px`,
                        borderRadius: '2px 2px 0 0',
                      }} />
                      <div style={{ fontSize: 8, color: '#999', marginTop: 2 }}>{day.slice(5)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>暂无复盘数据</div>
        )}
      </div>

      {/* Connector Activity */}
      {connStats && (
        <div className="antd-card" style={{ padding: 16, marginBottom: 16 }}>
          <h2><Zap className="icon" /> 连接器活动</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>总运行</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{connStats.total_runs}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>发现项</div>
              <div style={{ fontSize: 24, fontWeight: 'bold' }}>{connStats.total_found}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>导入项</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: '#52c41a' }}>{connStats.total_imported}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: '#999' }}>错误</div>
              <div style={{ fontSize: 24, fontWeight: 'bold', color: connStats.total_errors > 0 ? '#ff4d4f' : '#999' }}>{connStats.total_errors}</div>
            </div>
          </div>
        </div>
      )}

      {/* Pilot Report */}
      <div className="antd-card" style={{ padding: 16 }}>
        <h2><FileText className="icon" /> 试点总结报告</h2>
        {pilotLoading ? (
          <div>加载试点报告中...</div>
        ) : pilot ? (
          <div>
            <div style={{ marginBottom: 12 }}>
              <strong>{pilot.pilot_name}</strong> · {pilot.pilot_duration}
            </div>
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 14, color: '#666' }}>场景数: </span>
              <span style={{ fontSize: 20, fontWeight: 'bold' }}>{pilot.scenes.length}</span>
              <span style={{ fontSize: 14, color: '#666', marginLeft: 16 }}>总意图: </span>
              <span style={{ fontSize: 20, fontWeight: 'bold' }}>{pilot.total_intents}</span>
            </div>
            {pilot.scenes.map((s) => (
              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span>{s.name}</span>
                <span style={{ color: '#999' }}>{s.intent_count} 意图 · {s.journey_count} 旅程</span>
              </div>
            ))}
          </div>
        ) : (
          <div>暂无试点报告数据</div>
        )}
      </div>
    </div>
  );
}

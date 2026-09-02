/**
 * AuditDashboard — 命令评分卡看板主入口
 *
 * 展示全量命令 15 维质量评分：统计卡、维度均分条形图、
 * 低分 TOP-N 表、单命令详情面板（雷达图 + evidence + suggestion）。
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, AlertTriangle, Hash } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import { SkeletonLines } from '../ui/LoadingSkeleton';
import { apiFetch } from '../../api/client';
import DimensionBars from './DimensionBars';
import type { DimensionBarData } from './DimensionBars';
import LowScoreTable from './LowScoreTable';
import type { LowScoreItem } from './LowScoreTable';
import ScorecardDetail from './ScorecardDetail';
import type { ScorecardData } from './ScorecardDetail';

// ── API 类型 ──

interface SummaryResponse {
  available: boolean;
  dimensions: Record<string, string>;
  dimension_averages: Record<string, string | number>;
  total_cards: number;
  scored_cards: number;
  low_score_count: number;
  low_scores?: LowScoreItem[];
}

interface ScorecardResponse {
  available: boolean;
  scorecard: {
    cmd_path: string;
    name?: string;
    scores: Record<string, number>;
    evidence: Record<string, string>;
    suggestion: string;
  };
}

// ── 数据获取 ──

async function fetchSummary(): Promise<SummaryResponse> {
  const res = await apiFetch<SummaryResponse>('/api/command-audit/summary');
  if (!res.ok || !res.data) {
    throw new Error(res.error || '获取评分卡摘要失败');
  }
  return res.data;
}

async function fetchScorecard(cmdPath: string): Promise<ScorecardResponse> {
  const res = await apiFetch<ScorecardResponse>(
    `/api/command-audit/${encodeURIComponent(cmdPath)}`,
  );
  if (!res.ok || !res.data) {
    throw new Error(res.error || '获取评分卡详情失败');
  }
  return res.data;
}

// ── 主组件 ──

export default function AuditDashboard() {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  // 获取摘要
  const summaryQuery = useQuery({
    queryKey: ['command-audit', 'summary'],
    queryFn: fetchSummary,
    staleTime: 30000,
  });

  // 获取选中命令的详情
  const scorecardQuery = useQuery({
    queryKey: ['command-audit', 'scorecard', selectedPath],
    queryFn: () => fetchScorecard(selectedPath!),
    enabled: !!selectedPath,
    staleTime: 60000,
  });

  // ── 加载状态 ──
  if (summaryQuery.isLoading) {
    return (
      <div className="space-y-6" data-testid="audit-loading">
        <PageHeader title="命令评分卡" subtitle="全量命令 15 维质量评分看板" />
        <SkeletonLines count={6} />
      </div>
    );
  }

  // ── 错误状态 ──
  if (summaryQuery.isError) {
    return (
      <div data-testid="audit-error">
        <PageHeader title="命令评分卡" subtitle="全量命令 15 维质量评分看板" />
        <EmptyState
          icon={<AlertTriangle size={32} className="text-[var(--color-status-error)]" />}
          title="加载失败"
          message={summaryQuery.error?.message || '无法获取评分卡数据'}
          action={
            <button className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] text-sm transition-colors bg-[var(--color-accent)] text-white px-4 py-2 rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] transition-colors" onClick={() => summaryQuery.refetch()}>
              重试
            </button>
          }
        />
      </div>
    );
  }

  const summary = summaryQuery.data;

  // ── 空状态 ──
  if (!summary || !summary.available) {
    return (
      <div data-testid="audit-empty">
        <PageHeader title="命令评分卡" subtitle="全量命令 15 维质量评分看板" />
        <EmptyState
          icon={<BarChart3 size={32} />}
          title="暂无评分数据"
          message="评分卡服务当前不可用，请稍后重试"
        />
      </div>
    );
  }

  // ── 数据转换 ──
  const dimensionBars: DimensionBarData[] = Object.entries(summary.dimensions).map(
    ([key, label]) => ({
      key,
      label,
      score: Number(summary.dimension_averages[key] ?? 0),
    }),
  );

  const lowScores = summary.low_scores ?? [];

  // 评分卡详情数据
  let scorecardData: ScorecardData | null = null;
  if (scorecardQuery.data?.available) {
    const sc = scorecardQuery.data.scorecard;
    scorecardData = {
      cmd_path: sc.cmd_path,
      name: sc.name || sc.cmd_path,
      dimensions: Object.entries(summary.dimensions).map(([key, label]) => ({
        key,
        label,
        score: sc.scores[key] ?? 0,
        evidence: sc.evidence[key] || '',
      })),
      suggestion: sc.suggestion || '',
    };
  }

  // ── 渲染 ──
  return (
    <div className="space-y-6" data-testid="audit-dashboard">
      <PageHeader
        title="命令评分卡"
        subtitle="全量命令 15 维质量评分看板"
        badge={
          <span className="status-badge status-badge-info">
            {summary.scored_cards}/{summary.total_cards} 已评分
          </span>
        }
      />

      {/* 统计卡 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="总命令数"
          value={summary.total_cards}
          icon={<Hash size={18} />}
        />
        <StatCard
          label="已评分"
          value={summary.scored_cards}
          icon={<BarChart3 size={18} />}
          tone="success"
        />
        <StatCard
          label="低分命令"
          value={summary.low_score_count}
          icon={<AlertTriangle size={18} />}
          tone="warning"
        />
      </div>

      {/* 维度均分条形图 */}
      <DimensionBars data={dimensionBars} />

      {/* 低分表 + 详情面板 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LowScoreTable
          data={lowScores}
          onSelect={(path) => setSelectedPath(path)}
          selectedPath={selectedPath ?? undefined}
        />
        {selectedPath ? (
          scorecardQuery.isLoading ? (
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5">
              <SkeletonLines count={8} />
            </div>
          ) : scorecardData ? (
            <ScorecardDetail
              data={scorecardData}
              onClose={() => setSelectedPath(null)}
            />
          ) : (
            <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 flex items-center justify-center min-h-[200px]">
              <p className="text-sm text-[var(--color-text-tertiary)]">
                点击左侧命令查看详情
              </p>
            </div>
          )
        ) : (
          <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 flex items-center justify-center min-h-[200px]">
            <p className="text-sm text-[var(--color-text-tertiary)]">
              点击左侧命令查看详情
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── 子组件 ──

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone?: 'default' | 'success' | 'warning';
}

function StatCard({ label, value, icon, tone = 'default' }: StatCardProps) {
  const valueColor =
    tone === 'success'
      ? 'text-[var(--color-status-ok)]'
      : tone === 'warning'
        ? 'text-[var(--color-status-warn)]'
        : 'text-[var(--color-text-primary)]';

  return (
    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 flex items-center gap-4" data-testid={`stat-card-${label}`}>
      <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-accent-muted)] text-[var(--color-accent)]">
        {icon}
      </div>
      <div>
        <p className="text-xs text-[var(--color-text-tertiary)]">{label}</p>
        <p className={`text-2xl font-semibold ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}

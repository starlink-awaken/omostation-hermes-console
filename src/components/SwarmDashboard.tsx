/**
 * SwarmDashboard — Swarm 协同可观测面板 (D2 前端闭环).
 *
 * 消费 /api/swarm/status (D2 后端 cockpit PR #30), 让 swarm 12 agent 黑盒变可视.
 * 设计同 WorkflowsView: useQuery + 30s 轮询 (YAGNI, 不上 WebSocket).
 *
 * 显式降级哲学 (同后端 api_swarm.py): data_quality != complete 时显示降级提示,
 * 不白屏不伪造满分 — 后端数据源挂了就老实说挂了.
 */

import React from 'react';
import {
  Activity,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  fetchSwarmStatus,
  type SwarmDataQuality,
} from '../api/swarm';

// ── 数据质量徽章 (显式降级标识) ──

const QUALITY_MAP: Record<
  SwarmDataQuality,
  { color: string; icon: React.ElementType; label: string }
> = {
  complete: { color: 'text-green-600', icon: CheckCircle, label: '数据完整' },
  partial: { color: 'text-yellow-600', icon: AlertTriangle, label: '部分降级' },
  unavailable: { color: 'text-red-600', icon: AlertTriangle, label: '数据不可用' },
};

function DataQualityBadge({ quality }: { quality: SwarmDataQuality }) {
  const cfg = QUALITY_MAP[quality];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-sm ${cfg.color}`}>
      <Icon className="w-4 h-4" /> {cfg.label}
    </span>
  );
}

// ── 指标卡 ──

function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-sm mb-1">
        <Icon className="w-4 h-4" /> {label}
      </div>
      <div className="text-2xl font-semibold text-gray-900 dark:text-white">{value}</div>
      {hint && <div className="text-xs text-gray-400 mt-1">{hint}</div>}
    </div>
  );
}

// ── 主视图 ──

export default function SwarmDashboard() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['swarm-status'],
    queryFn: fetchSwarmStatus,
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });

  if (isLoading) {
    return <div className="p-6 text-gray-500">加载 swarm 状态...</div>;
  }

  // 显式降级: 数据全挂时老实说, 不伪造
  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-4 text-red-700 dark:text-red-400">
          <AlertTriangle className="w-5 h-5 inline mr-2" />
          swarm 状态获取失败 — 后端 <code>/api/swarm/status</code> 不可达
        </div>
      </div>
    );
  }

  const {
    workflow,
    window: win,
    claims,
    compliance,
    data_quality,
    degraded_reasons,
    recommended_next,
  } = data;

  return (
    <div className="p-6 space-y-6">
      {/* 标题 + 数据质量 + 刷新 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-6 h-6" /> Swarm 协同观测
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            agent 协同运行链路 · 工作流 · 窗口 · 声明 · 合规
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DataQualityBadge quality={data_quality} />
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-400 hover:text-gray-600"
            aria-label="刷新"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 降级原因 (显式列出, 不藏) */}
      {degraded_reasons.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg p-3">
          <div className="text-sm text-yellow-700 dark:text-yellow-400 font-medium mb-1">
            ⚠️ 降级原因:
          </div>
          <ul className="text-xs text-yellow-600 list-disc list-inside">
            {degraded_reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 指标卡 (4 核心) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Activity}
          label="活跃 Runs"
          value={workflow.active_count}
          hint={`总 ${workflow.run_count} · 当前 ${workflow.current_run_id || '-'}`}
        />
        <MetricCard
          icon={Lock}
          label="锁占用"
          value={workflow.lock_count}
          hint={workflow.stale_locks > 0 ? `⚠ ${workflow.stale_locks} stale` : '无 stale'}
        />
        <MetricCard
          icon={Users}
          label="活跃声明"
          value={claims.active_count}
          hint={claims.sessions.slice(0, 3).join(', ') || '-'}
        />
        <MetricCard
          icon={AlertTriangle}
          label="窗口冲突"
          value={win.conflict_count ?? '-'}
          hint={win.verdict || '-'}
        />
      </div>

      {/* 合规决策 + 建议下一步 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-gray-500">合规决策</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {compliance.decision || '-'}
              {compliance.ok && (
                <CheckCircle className="w-5 h-5 inline ml-2 text-green-600" />
              )}
            </div>
          </div>
          {recommended_next && (
            <div className="text-right">
              <div className="text-xs text-gray-400">建议下一步</div>
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {recommended_next}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 活跃 Runs 明细 */}
      {workflow.active_runs.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="text-sm text-gray-500 mb-2">活跃 Runs</div>
          <div className="space-y-1">
            {workflow.active_runs.map((id) => (
              <div
                key={id}
                className="text-sm font-mono text-gray-700 dark:text-gray-300"
              >
                {id}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

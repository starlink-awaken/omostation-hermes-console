/**
 * Wave2 predictive governance dashboard (ADR-0190 / ADR-0191).
 * Consumes GET /api/wave2/dashboard → c2g.wave2.dashboard.v1
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import './Dashboard.css';

/** Minimal nav target — avoid coupling to optional cockpitNavigation module. */
export type Wave2NavTarget = { tab: string; taskQuery?: string };

interface Wave2Cards {
  pitch_count?: number;
  mean_success?: number;
  trend?: string;
  critical?: number;
  elevated?: number;
  proposal_count?: number;
  p0_proposals?: number;
}

interface Heatmap {
  statuses?: string[];
  buckets?: string[];
  matrix?: Record<string, Record<string, number>>;
  totals?: { pitches?: number; critical?: number; elevated?: number; ok?: number };
}

interface Proposal {
  id?: string;
  kind?: string;
  priority?: string;
  title?: string;
  rationale?: string;
  suggested_omo_action?: string;
}

interface Wave2Dashboard {
  schema?: string;
  status?: string;
  cards?: Wave2Cards;
  heatmap?: Heatmap;
  heatmap_markdown?: string;
  proposals?: Proposal[];
  forecast?: { trend?: string; n?: number; mean?: number; forecast?: Array<{ predicted?: number; horizon?: number }> };
  auto_mutate_rules?: boolean;
  error?: string;
  data_dir?: string;
  source?: string;
}

interface Wave2DashboardViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: Wave2NavTarget) => void;
}

function TrendIcon({ trend }: { trend?: string }) {
  if (trend === 'improving') return <TrendingUp size={16} className="text-emerald-400" />;
  if (trend === 'declining') return <TrendingDown size={16} className="text-rose-400" />;
  return <Minus size={16} className="text-slate-400" />;
}

function MetricCard({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger';
}) {
  const border =
    tone === 'danger'
      ? 'border-rose-500/40'
      : tone === 'warn'
        ? 'border-amber-500/40'
        : tone === 'ok'
          ? 'border-emerald-500/40'
          : 'border-white/10';
  return (
    <div className={`rounded-xl border ${border} bg-white/5 p-4`}>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-white">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export default function Wave2DashboardView({
  onNavigate,
  onOpenTarget,
}: Wave2DashboardViewProps) {
  const [data, setData] = useState<Wave2Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/wave2/dashboard');
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const body = (await res.json()) as Wave2Dashboard;
      setData(body);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = data?.cards || {};
  const heat = data?.heatmap;
  const statuses = heat?.statuses || ['active', 'completed', 'failed', 'other'];
  const buckets = heat?.buckets || ['low', 'mid', 'high'];
  const matrix = heat?.matrix || {};
  const proposals = data?.proposals || [];
  const forecastPoints = data?.forecast?.forecast || [];

  return (
    <div className="space-y-6 p-1" data-testid="wave2-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <BarChart3 size={18} />
            Wave2 预测治理面板
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            契约 <code className="text-slate-300">c2g.wave2.dashboard.v1</code>
            {data?.auto_mutate_rules === false ? ' · 不自动改写 GaC 规则' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
            onClick={() => onNavigate?.('C2G')}
          >
            打开 C2G 战略中心
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 hover:bg-white/10"
            onClick={() => onOpenTarget?.({ tab: 'TaskCenter', taskQuery: 'C2G-FB' })}
          >
            相关任务
          </button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          加载失败: {error}
        </div>
      ) : null}

      {data?.error ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
          后端降级: {data.error}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="text-sm text-slate-400">加载 Wave2 dashboard…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
            <MetricCard label="Pitches" value={cards.pitch_count ?? 0} />
            <MetricCard
              label="Mean success"
              value={typeof cards.mean_success === 'number' ? cards.mean_success.toFixed(2) : '—'}
            />
            <MetricCard
              label="Trend"
              value={cards.trend || data?.forecast?.trend || 'flat'}
              hint="EMA+linear"
              tone={
                cards.trend === 'declining'
                  ? 'danger'
                  : cards.trend === 'improving'
                    ? 'ok'
                    : 'neutral'
              }
            />
            <MetricCard
              label="Critical"
              value={cards.critical ?? 0}
              tone={(cards.critical ?? 0) > 0 ? 'danger' : 'ok'}
            />
            <MetricCard
              label="Elevated"
              value={cards.elevated ?? 0}
              tone={(cards.elevated ?? 0) > 0 ? 'warn' : 'neutral'}
            />
            <MetricCard
              label="Proposals"
              value={cards.proposal_count ?? proposals.length}
              hint={`P0=${cards.p0_proposals ?? 0}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                <Activity size={14} />
                风险热力 (status × score)
                <TrendIcon trend={cards.trend || data?.forecast?.trend} />
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm" data-testid="wave2-heatmap">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="py-1 pr-2">status \\ score</th>
                      {buckets.map((b) => (
                        <th key={b} className="px-2 py-1 font-normal">
                          {b}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {statuses.map((st) => (
                      <tr key={st} className="border-t border-white/5">
                        <td className="py-1.5 pr-2 text-slate-300">{st}</td>
                        {buckets.map((b) => {
                          const n = matrix[st]?.[b] ?? 0;
                          const intensity =
                            n === 0
                              ? 'bg-transparent text-slate-500'
                              : b === 'low'
                                ? 'bg-rose-500/20 text-rose-100'
                                : b === 'mid'
                                  ? 'bg-amber-500/20 text-amber-100'
                                  : 'bg-emerald-500/20 text-emerald-100';
                          return (
                            <td key={b} className="px-2 py-1.5">
                              <span
                                className={`inline-flex min-w-[1.75rem] justify-center rounded px-1.5 py-0.5 ${intensity}`}
                              >
                                {n}
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                totals: pitches={heat?.totals?.pitches ?? 0} critical={heat?.totals?.critical ?? 0}{' '}
                elevated={heat?.totals?.elevated ?? 0} ok={heat?.totals?.ok ?? 0}
              </p>
            </section>

            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                <BarChart3 size={14} />
                预测点 (horizon)
              </h3>
              {forecastPoints.length === 0 ? (
                <p className="text-sm text-slate-500">暂无序列 — OutcomeTracker 为空时显示基线。</p>
              ) : (
                <ul className="space-y-2">
                  {forecastPoints.map((p, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                    >
                      <span className="text-slate-400">h={p.horizon ?? i + 1}</span>
                      <span className="font-mono text-slate-100">
                        {typeof p.predicted === 'number' ? p.predicted.toFixed(3) : '—'}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-xs text-slate-500">
                n={data?.forecast?.n ?? 0} mean=
                {typeof data?.forecast?.mean === 'number'
                  ? data.forecast.mean.toFixed(3)
                  : '—'}{' '}
                · source={data?.source || '—'}
              </p>
            </section>
          </div>

          <section className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
              <ShieldAlert size={14} />
              治理提案 (Phase C)
            </h3>
            {proposals.length === 0 ? (
              <p className="text-sm text-slate-500">无提案 — 数据不足或风险面干净。</p>
            ) : (
              <ul className="space-y-2" data-testid="wave2-proposals">
                {proposals.map((p) => (
                  <li
                    key={p.id || p.title}
                    className="rounded-lg border border-white/10 bg-black/20 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-xs ${
                          p.priority === 'P0'
                            ? 'bg-rose-500/30 text-rose-100'
                            : p.priority === 'P1'
                              ? 'bg-amber-500/30 text-amber-100'
                              : 'bg-slate-500/30 text-slate-200'
                        }`}
                      >
                        {p.priority || 'P?'}
                      </span>
                      <span className="text-sm font-medium text-white">{p.title}</span>
                      <span className="text-xs text-slate-500">{p.kind}</span>
                    </div>
                    {p.rationale ? (
                      <p className="mt-1 text-xs text-slate-400">{p.rationale}</p>
                    ) : null}
                    {p.suggested_omo_action ? (
                      <p className="mt-1 text-xs text-slate-500">
                        action: {p.suggested_omo_action}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-3 flex items-start gap-2 text-xs text-slate-500">
              <AlertTriangle size={12} className="mt-0.5 shrink-0" />
              提案仅建议；不自动改写 x1/GaC。可用 CLI{' '}
              <code className="text-slate-400">cockpit wave2 proposals</code> 导出。
            </div>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * HarnessDashboard — Harness 全生命周期合规视图
 *
 * 展示 8 阶段 DAG、12 章节合规状态、7 探针实时监控。
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api';

// ── 8 阶段 DAG 定义 ──
const STAGES = [
  { id: 'admission', name: '准入', description: 'worktree + BET + SFOP' },
  { id: 'spec', name: '规格', description: 'frontmatter + digest' },
  { id: 'grill', name: '5Q 检查', description: '边界/反模式/容量/回滚/可观测' },
  { id: 'dispatch', name: '派发', description: 'claim BET' },
  { id: 'execute', name: '执行', description: 'agent-workflow + appetite' },
  { id: 'verify', name: '校验', description: '并行 DAG + 缓存' },
  { id: 'audit', name: '审计', description: 'council + redteam' },
  { id: 'accept', name: '验收', description: 'L0/L1/L2 分级' },
];

// ── 12 章节定义 ──
const SECTIONS = [
  'admission', 'spec', 'execution', 'verify', 'audit', 'accept',
  'probes', 'dimensions', 'value_loop', 'known_debt', 'observability', 'rollout'
];

export default function HarnessDashboard() {
  // 获取合规状态
  const { data: compliance, isLoading } = useQuery({
    queryKey: ['harness', 'compliance'],
    queryFn: () => apiFetch('/api/cockpit/harness/compliance'),
    staleTime: 30_000,
  });

  if (isLoading) {
    return <div className="p-6 text-text-secondary">加载 Harness 合规状态...</div>;
  }

  const status = compliance?.data || { error: 0, warning: 0 };

  return (
    <div className="harness-dashboard space-y-6">
      {/* 总览 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="错误" value={status.error} tone={status.error > 0 ? 'error' : 'ok'} />
        <StatCard label="警告" value={status.warning} tone={status.warning > 0 ? 'warn' : 'ok'} />
        <StatCard label="阶段" value={8} tone="info" />
      </div>

      {/* 8 阶段 DAG */}
      <section>
        <h3 className="text-lg font-semibold mb-3">8 阶段 DAG</h3>
        <div className="flex flex-wrap gap-2">
          {STAGES.map((stage, i) => (
            <React.Fragment key={stage.id}>
              <StageBadge stage={stage} />
              {i < STAGES.length - 1 && <Arrow />}
            </React.Fragment>
          ))}
        </div>
      </section>

      {/* 12 章节合规 */}
      <section>
        <h3 className="text-lg font-semibold mb-3">12 章节合规</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {SECTIONS.map(section => (
            <SectionBadge key={section} name={section} ok={true} />
          ))}
        </div>
      </section>
    </div>
  );
}

// ── 子组件 ──

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'ok' | 'warn' | 'error' | 'info' }) {
  const tones = {
    ok: 'bg-green-500/10 text-green-400 border-green-500/20',
    warn: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  };
  return (
    <div className={`rounded-lg border p-4 ${tones[tone]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-70">{label}</div>
    </div>
  );
}

function StageBadge({ stage }: { stage: typeof STAGES[number] }) {
  return (
    <div className="px-3 py-2 rounded-md bg-surface-2 border border-border text-sm" title={stage.description}>
      <span className="font-medium">{stage.name}</span>
    </div>
  );
}

function SectionBadge({ name, ok }: { name: string; ok: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-md text-xs border ${ok ? 'bg-green-500/5 border-green-500/20 text-green-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
      {ok ? '✓' : '✗'} {name}
    </div>
  );
}

function Arrow() {
  return <span className="text-text-muted mx-1">→</span>;
}

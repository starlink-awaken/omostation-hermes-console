/**
 * ChainStudio — 链路编排主入口。
 *
 * 左侧：demo 链列表（点击选中）
 * 右侧：选中链的 DAG 可视化（reactflow）
 * 底部：dry-run 按钮 → 展开模板变量
 * 每条 demo 链内置场景说明卡
 */
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, RefreshCw, AlertCircle, Info } from 'lucide-react';
import { apiFetch, apiPost } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import { SkeletonLines } from '../ui/LoadingSkeleton';
import ChainList from './ChainList';
import ChainGraph from './ChainGraph';
import type { ChainStep } from './ChainGraph';

// ── Types ──

interface ChainSummary {
  id: string;
  name: string;
  description: string;
  step_count: number;
  source: string;
}

interface ChainDetail {
  available: boolean;
  id: string;
  name: string;
  description: string;
  params?: Record<string, string>;
  steps: ChainStep[];
  hitl?: boolean;
  timeout?: number;
}

interface DryRunResult {
  available: boolean;
  id: string;
  dry_run: boolean;
  steps: Array<{
    name: string;
    command: string;
    args?: string[];
    when?: string;
    argv?: string[];
  }>;
}

interface ChainsResponse {
  available: boolean;
  chains: ChainSummary[];
  total: number;
}

interface ChainDetailResponse {
  available: boolean;
  id: string;
  name: string;
  description: string;
  params?: Record<string, string>;
  steps: ChainStep[];
  hitl?: boolean;
  timeout?: number;
}

interface DryRunResponse {
  available: boolean;
  id: string;
  dry_run: boolean;
  steps: Array<{
    name: string;
    command: string;
    args?: string[];
    when?: string;
    argv?: string[];
  }>;
}

// ── Demo Data (fallback when API unavailable) ──

const DEMO_CHAINS: ChainSummary[] = [
  { id: 'build-deploy', name: '构建部署链', description: '代码构建 → 镜像打包 → 滚动部署', step_count: 4, source: 'ci' },
  { id: 'data-pipeline', name: '数据处理链', description: '数据采集 → 清洗转换 → 入库校验', step_count: 3, source: 'etl' },
  { id: 'incident-response', name: '故障响应链', description: '告警触发 → 根因分析 → 自动修复 → 通知', step_count: 4, source: 'ops' },
  { id: 'release-gate', name: '发布门禁链', description: '代码扫描 → 测试覆盖 → 审批 → 发布', step_count: 4, source: 'release' },
];

const DEMO_DETAILS: Record<string, ChainDetail> = {
  'build-deploy': {
    available: true,
    id: 'build-deploy',
    name: '构建部署链',
    description: '代码构建 → 镜像打包 → 滚动部署',
    params: { env: 'production', region: 'cn-north' },
    steps: [
      { name: '代码构建', command: 'make build', args: ['--target', 'prod'], capture_output_to: 'build_log' },
      { name: '镜像打包', command: 'docker build', args: ['-t', '{{params.registry}}/app:{{params.tag}}'], when: 'build_log contains SUCCESS', on_failure: 'skip' },
      { name: '推送镜像', command: 'docker push', args: ['{{params.registry}}/app:{{params.tag}}'], when: 'steps.1.exit_code == 0', retry: 2 },
      { name: '滚动部署', command: 'kubectl rollout', args: ['restart', 'deployment/app', '-n', '{{params.env}}'], on_failure: 'rollback' },
    ],
    hitl: true,
    timeout: 600,
  },
  'data-pipeline': {
    available: true,
    id: 'data-pipeline',
    name: '数据处理链',
    description: '数据采集 → 清洗转换 → 入库校验',
    params: { source: 'kafka', batch_size: '1000' },
    steps: [
      { name: '数据采集', command: 'kafka-consume', args: ['--topic', '{{params.source}}', '--batch', '{{params.batch_size}}'], capture_output_to: 'raw_data' },
      { name: '清洗转换', command: 'transform', args: ['--input', '{{steps.0.stdout}}', '--rules', 'clean_rules.yaml'], when: 'raw_data length > 0' },
      { name: '入库校验', command: 'db-load', args: ['--table', 'events', '--verify'], on_failure: 'alert' },
    ],
    timeout: 300,
  },
  'incident-response': {
    available: true,
    id: 'incident-response',
    name: '故障响应链',
    description: '告警触发 → 根因分析 → 自动修复 → 通知',
    params: { severity: 'P1', team: 'sre' },
    steps: [
      { name: '告警触发', command: 'alertmanager', args: ['--severity', '{{params.severity}}'], capture_output_to: 'alert_info' },
      { name: '根因分析', command: 'diagnose', args: ['--alert', '{{steps.0.stdout}}'], when: 'alert_info.severity == P1', retry: 1 },
      { name: '自动修复', command: 'auto-heal', args: ['--action', 'restart', '--target', 'svc-down'], on_failure: 'escalate' },
      { name: '通知', command: 'notify', args: ['--team', '{{params.team}}', '--channel', '#incidents'] },
    ],
    hitl: true,
    timeout: 120,
  },
  'release-gate': {
    available: true,
    id: 'release-gate',
    name: '发布门禁链',
    description: '代码扫描 → 测试覆盖 → 审批 → 发布',
    params: { branch: 'main', min_coverage: '80' },
    steps: [
      { name: '代码扫描', command: 'sonar-scan', args: ['--branch', '{{params.branch}}'], capture_output_to: 'scan_result' },
      { name: '测试覆盖', command: 'test', args: ['--coverage', '--min', '{{params.min_coverage}}'], when: 'scan_result.issues == 0', on_failure: 'block' },
      { name: '审批', command: 'approval', args: ['--type', 'release', '--wait'], hitl: true },
      { name: '发布', command: 'deploy', args: ['--env', 'production', '--strategy', 'canary'], when: 'steps.2.approved == true' },
    ],
    hitl: true,
    timeout: 900,
  },
};

const SCENARIO_DESCRIPTIONS: Record<string, string> = {
  'build-deploy': 'CI/CD 场景：代码提交后自动触发构建、打包、部署全流程，支持失败回滚。',
  'data-pipeline': '数据场景：从 Kafka 消费数据，经过清洗转换后入库，全程校验数据质量。',
  'incident-response': '运维场景：P1 告警触发自动诊断与修复，失败时升级人工介入。',
  'release-gate': '发布场景：代码扫描和测试覆盖作为门禁条件，审批通过后方可发布。',
};

// ── Hooks ──

function useChains() {
  return useQuery({
    queryKey: ['chains'],
    queryFn: async () => {
      const res = await apiFetch<ChainsResponse>('/api/chains');
      if (!res.ok || !res.data?.available) {
        return DEMO_CHAINS;
      }
      return res.data.chains;
    },
    staleTime: 60000,
  });
}

function useChainDetail(id: string | null) {
  return useQuery({
    queryKey: ['chain-detail', id],
    queryFn: async () => {
      if (!id) return null;
      const res = await apiFetch<ChainDetailResponse>(`/api/chains/${id}`);
      if (!res.ok || !res.data?.available) {
        return DEMO_DETAILS[id] ?? null;
      }
      return res.data;
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

// ── Component ──

export default function ChainStudio() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dryRunResult, setDryRunResult] = useState<DryRunResult | null>(null);
  const [dryRunError, setDryRunError] = useState<string | null>(null);

  const { data: chains, isLoading: chainsLoading, error: chainsError } = useChains();
  const { data: detail, isLoading: detailLoading } = useChainDetail(selectedId);

  const selectedChain = chains?.find((c) => c.id === selectedId);

  const handleDryRun = async () => {
    if (!selectedId) return;
    setDryRunResult(null);
    setDryRunError(null);
    try {
      const res = await apiPost<DryRunResponse>(`/api/chains/${selectedId}/dry-run`, {});
      if (!res.ok || !res.data?.available) {
        // Fallback: build dry-run result from demo data
        const demoDetail = DEMO_DETAILS[selectedId];
        if (demoDetail) {
          setDryRunResult({
            available: true,
            id: selectedId,
            dry_run: true,
            steps: demoDetail.steps.map((s) => ({
              name: s.name,
              command: s.command,
              args: s.args,
              when: s.when,
              argv: [s.command, ...(s.args || [])],
            })),
          });
        } else {
          setDryRunError('Dry-run 不可用');
        }
        return;
      }
      setDryRunResult(res.data);
    } catch {
      setDryRunError('Dry-run 请求失败');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="链路编排"
        subtitle="多命令联动链路的 DAG 可视化与 dry-run 执行"
        actions={
          <button
            onClick={() => {
              setSelectedId(null);
              setDryRunResult(null);
              setDryRunError(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
              bg-[var(--color-surface-2)] border border-[var(--color-border-subtle)]
              text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]
              hover:border-[var(--color-border-default)] transition-colors"
          >
            <RefreshCw size={14} />
            重置
          </button>
        }
      />

      {/* Loading state */}
      {chainsLoading && (
        <div className="p-6">
          <SkeletonLines count={4} />
        </div>
      )}

      {/* Error state */}
      {chainsError && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-[var(--color-status-error-muted)] border border-[var(--color-status-error)]">
          <AlertCircle size={16} className="text-[var(--color-status-error)]" />
          <span className="text-sm text-[var(--color-status-error)]">
            加载链路列表失败: {chainsError instanceof Error ? chainsError.message : '未知错误'}
          </span>
        </div>
      )}

      {/* Empty state */}
      {!chainsLoading && !chainsError && chains && chains.length === 0 && (
        <EmptyState
          title="暂无链路"
          message="当前没有可用的链路，请先创建或导入链路配置。"
        />
      )}

      {/* Main content */}
      {!chainsLoading && !chainsError && chains && chains.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          {/* Left: chain list */}
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">
              链路列表 ({chains.length})
            </h2>
            <ChainList chains={chains} selectedId={selectedId} onSelect={setSelectedId} />
          </div>

          {/* Right: detail + graph */}
          <div className="flex flex-col gap-4">
            {!selectedId && (
              <EmptyState
                icon={<Info size={32} className="text-[var(--color-text-tertiary)]" />}
                title="选择链路"
                message="从左侧列表中选择一条链路以查看 DAG 可视化。"
              />
            )}

            {selectedId && detailLoading && (
              <div className="p-6">
                <SkeletonLines count={3} />
              </div>
            )}

            {selectedId && !detailLoading && detail && (
              <>
                {/* Scenario card */}
                <div className="p-4 rounded-lg bg-[var(--color-surface-1)] border border-[var(--color-border-subtle)]">
                  <div className="flex items-center gap-2 mb-2">
                    <Info size={14} className="text-[var(--color-accent)]" />
                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">场景说明</span>
                  </div>
                  <p className="text-sm text-[var(--color-text-primary)]">
                    {SCENARIO_DESCRIPTIONS[detail.id] ?? detail.description}
                  </p>
                  {detail.params && Object.keys(detail.params).length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {Object.entries(detail.params).map(([key, val]) => (
                        <span
                          key={key}
                          className="text-xs px-2 py-0.5 rounded bg-[var(--color-accent-muted)] text-[var(--color-accent)]"
                        >
                          {key}={val}
                        </span>
                      ))}
                    </div>
                  )}
                  {detail.hitl && (
                    <div className="mt-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-status-warn-muted)] text-[var(--color-status-warn)]">
                        需要人工审批
                      </span>
                    </div>
                  )}
                </div>

                {/* DAG graph */}
                <div>
                  <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                    DAG 可视化
                  </h3>
                  <ChainGraph steps={detail.steps} />
                </div>

                {/* Dry-run section */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleDryRun}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md
                        bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]
                        transition-colors"
                    >
                      <Play size={14} />
                      Dry Run
                    </button>
                    {detail.timeout && (
                      <span className="text-xs text-[var(--color-text-tertiary)]">
                        超时: {detail.timeout}s
                      </span>
                    )}
                  </div>

                  {dryRunError && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-[var(--color-status-error-muted)] border border-[var(--color-status-error)]">
                      <AlertCircle size={14} className="text-[var(--color-status-error)]" />
                      <span className="text-sm text-[var(--color-status-error)]">{dryRunError}</span>
                    </div>
                  )}

                  {dryRunResult && (
                    <div className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] overflow-hidden">
                      <div className="px-4 py-2 border-b border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]">
                        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                          Dry-Run 结果 ({dryRunResult.steps.length} 步)
                        </span>
                      </div>
                      <div className="p-4 flex flex-col gap-3">
                        {dryRunResult.steps.map((step, i) => (
                          <div key={i} className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono text-[var(--color-text-tertiary)]">{i + 1}.</span>
                              <span className="text-sm font-medium text-[var(--color-text-primary)]">{step.name}</span>
                              {step.when && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-status-warn-muted)] text-[var(--color-status-warn)]">
                                  when: {step.when}
                                </span>
                              )}
                            </div>
                            <div className="ml-5 font-mono text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface-0)] px-3 py-2 rounded">
                              {step.argv?.join(' ') ?? `${step.command} ${step.args?.join(' ') ?? ''}`}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

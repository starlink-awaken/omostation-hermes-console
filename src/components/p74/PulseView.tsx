/**
 * PulseView — P74 治理脉搏（主入口）
 *
 * P74 工作流沉默治理：warn_count 统计 + 沉默工作流列表。
 * 通过 /api/p74 获取数据，不可达时显示 degraded 态。
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, WifiOff } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import { apiFetch } from '../../api/client';
import WarnList from './WarnList';
import type { WorkflowWarnItem } from './WarnList';

interface P74Response {
  available: boolean;
  warn_count: number;
  workflows: WorkflowWarnItem[];
  error?: string;
}

function useP74Data() {
  return useQuery({
    queryKey: ['p74'],
    queryFn: async () => {
      const res = await apiFetch<P74Response>('/api/p74');
      if (!res.ok) {
        return { available: false, warn_count: 0, workflows: [], error: res.error } as P74Response;
      }
      return res.data;
    },
    retry: false,
    staleTime: 30_000,
  });
}

export default function PulseView() {
  const { data, isLoading, isError } = useP74Data();

  const isDegraded = isError || !data || !data.available;

  return (
    <div className="space-y-6">
      <PageHeader
        title="治理脉搏"
        subtitle="P74 工作流沉默治理"
        badge={
          isDegraded ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-warn-muted px-2 py-0.5 text-xs text-status-warn">
              <WifiOff size={12} />
              降级
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-ok-muted px-2 py-0.5 text-xs text-status-ok">
              <Activity size={12} />
              监测中
            </span>
          )
        }
      />

      {isDegraded ? (
        <div className="space-y-6">
          <div className="rounded-md bg-accent-muted px-3 py-2 text-xs text-accent">
            ⚠️ 演示数据 — P74 服务不可用，显示示例数据供参考
          </div>
          {/* warn_count 统计卡 */}
          <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-accent" />
              <h3 className="text-sm font-medium text-secondary">告警统计</h3>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-text-primary">3</span>
              <span className="text-sm text-secondary">个沉默工作流</span>
            </div>
          </div>
          {/* 沉默工作流列表 */}
          <WarnList workflows={[
            { name: 'observer-audit-weekly', status: 'silent', days: 45, threshold: 30 },
            { name: 'governance-patrol', status: 'silent', days: 12, threshold: 7 },
            { name: 'adr-drift-check', status: 'silent', days: 60, threshold: 30 },
          ]} loading={false} />
        </div>
      ) : (
        <>
          {/* warn_count 统计卡 */}
          <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-accent" />
              <h3 className="text-sm font-medium text-secondary">告警统计</h3>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-semibold text-text-primary">
                {data?.warn_count ?? 0}
              </span>
              <span className="text-sm text-secondary">个沉默工作流</span>
            </div>
            {data?.warn_count && data.warn_count > 0 && (
              <div className="mt-3 rounded-md bg-status-error-muted px-3 py-2 text-xs text-status-error">
                存在 {data.warn_count} 个超过沉默阈值的工作流，建议尽快处理。
              </div>
            )}
          </div>

          {/* 沉默工作流列表 */}
          <WarnList workflows={data?.workflows ?? null} loading={isLoading} />
        </>
      )}
    </div>
  );
}

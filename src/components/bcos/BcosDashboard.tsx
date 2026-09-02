/**
 * BcosDashboard — BCOS 北极星仪表盘（主入口）
 *
 * 业务闭环系统：北极星价值度量 + 信号路由 + 进化引擎。
 * 通过 /api/bcos 获取数据，不可达时显示 degraded 态。
 */
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Compass, WifiOff } from 'lucide-react';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import { apiFetch } from '../../api/client';
import NorthStarCard from './NorthStarCard';
import type { NorthStarData } from './NorthStarCard';
import SignalFlow from './SignalFlow';
import type { SignalItem } from './SignalFlow';
import EvolutionPipeline from './EvolutionPipeline';
import type { EvolutionData } from './EvolutionPipeline';

interface BcosResponse {
  available: boolean;
  north_star?: NorthStarData;
  signals?: SignalItem[];
  evolution?: EvolutionData;
  error?: string;
}

function useBcosData() {
  return useQuery({
    queryKey: ['bcos'],
    queryFn: async () => {
      const res = await apiFetch<BcosResponse>('/api/bcos');
      if (!res.ok) {
        return { available: false, error: res.error } as BcosResponse;
      }
      return res.data;
    },
    retry: false,
    staleTime: 30_000,
  });
}

export default function BcosDashboard() {
  const { data, isLoading, isError } = useBcosData();

  const isDegraded = isError || !data || !data.available;

  return (
    <div className="space-y-6">
      <PageHeader
        title="BCOS 北极星"
        subtitle="业务闭环系统：北极星价值度量 + 信号路由 + 进化引擎"
        badge={
          isDegraded ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-warn-muted px-2 py-0.5 text-xs text-status-warn">
              <WifiOff size={12} />
              降级
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-status-ok-muted px-2 py-0.5 text-xs text-status-ok">
              <Compass size={12} />
              在线
            </span>
          )
        }
      />

      {isDegraded ? (
        <div className="space-y-6">
          <div className="rounded-md bg-accent-muted px-3 py-2 text-xs text-accent">
            ⚠️ 演示数据 — BCOS 服务不可用，显示示例数据供参考
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <NorthStarCard data={{ value: 85, trend: 'up', details: { coverage: 92, health: 78 } }} loading={false} />
            <SignalFlow signals={[{ type: 'signal', count: 12 }, { type: 'alert', count: 3 }, { type: 'proposal', count: 7 }]} loading={false} />
            <div className="lg:col-span-2">
              <EvolutionPipeline data={{ stage: 'evaluate', proposals: [{ id: 'p1', title: '示例提案 A' }, { id: 'p2', title: '示例提案 B' }] }} loading={false} />
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <NorthStarCard data={data?.north_star ?? null} loading={isLoading} />
          <SignalFlow signals={data?.signals ?? null} loading={isLoading} />
          <div className="lg:col-span-2">
            <EvolutionPipeline data={data?.evolution ?? null} loading={isLoading} />
          </div>
        </div>
      )}
    </div>
  );
}

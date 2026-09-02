/**
 * GovernanceSelfCheck — 治理自检面板
 *
 * 聚合 4 项治理检查：architecture-check / chaos-drill / canvas-serve / ssot-status
 */
import React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { CheckCircle, XCircle, AlertCircle, Loader2, Play, RefreshCw } from 'lucide-react';
import { apiFetch, apiPost } from '../../api';

interface CheckItem {
  id: string;
  name: string;
  status: 'PASS' | 'WARN' | 'FAIL' | 'PENDING';
  summary: string;
  details?: string;
  duration?: number;
}

interface SelfCheckResult {
  items: CheckItem[];
  overall: 'PASS' | 'WARN' | 'FAIL';
  timestamp: string;
}

const CHECK_DEFINITIONS = [
  { id: 'architecture-check', name: '架构漂移检查', description: '检测 SSOT 注册中心与实现之间的漂移' },
  { id: 'chaos-drill', name: '混沌演练', description: '验证系统在异常条件下的恢复能力' },
  { id: 'canvas-serve', name: '画布服务', description: '验证画布服务的完整性和一致性' },
  { id: 'ssot-status', name: 'SSOT 状态', description: '检查所有 SSOT 注册表的完整性和新鲜度' },
];

export default function GovernanceSelfCheck() {
  const { data: apiData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['governance', 'self-check'],
    queryFn: () => apiFetch('/api/cockpit/governance/self-check'),
    staleTime: 120_000,
  });

  const runCheck = useMutation({
    mutationFn: () => apiPost('/api/cockpit/governance/self-check/run', {}),
    onSuccess: () => refetch(),
  });

  const items = apiData?.data?.items || [];
  const overall = apiData?.data?.overall || 'PASS';
  const apiError = apiData?.ok === false ? apiData.error : null;
  const isLoadingOrPending = isLoading || runCheck.isPending;

  const getIcon = (status: CheckItem['status']) => {
    switch (status) {
      case 'PASS': return <CheckCircle size={16} className="text-green-400" />;
      case 'WARN': return <AlertCircle size={16} className="text-yellow-400" />;
      case 'FAIL': return <XCircle size={16} className="text-red-400" />;
      case 'PENDING': return <Loader2 size={16} className="text-blue-400 animate-spin" />;
    }
  };

  const getStatusBadge = (status: CheckItem['status']) => {
    const styles = {
      PASS: 'bg-green-500/10 text-green-400 border-green-500/20',
      WARN: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      FAIL: 'bg-red-500/10 text-red-400 border-red-500/20',
      PENDING: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    };
    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${styles[status]}`}>
        {status}
      </span>
    );
  };

  if (isError) {
    const errMsg = error instanceof Error ? error.message : '请求失败';
    return (
      <div className="governance-self-check p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-text-primary">治理自检</h2>
            <p className="text-sm text-text-secondary mt-1">一键运行全量治理检查，发现潜在风险</p>
          </div>
          <button
            onClick={() => runCheck.mutate()}
            disabled={runCheck.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {runCheck.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
            {runCheck.isPending ? '运行中...' : '运行检查'}
          </button>
        </div>
        <div className="text-center py-12">
          <XCircle size={48} className="mx-auto text-red-400 mb-3" />
          <p className="text-text-secondary">{errMsg}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="governance-self-check space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary">治理自检</h2>
          <p className="text-sm text-text-secondary mt-1">一键运行全量治理检查，发现潜在风险</p>
        </div>
        <button
          onClick={() => runCheck.mutate()}
          disabled={runCheck.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {runCheck.isPending ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {runCheck.isPending ? '运行中...' : '运行检查'}
        </button>
      </div>

      {apiError && !isLoadingOrPending && !items.length && (
        <div className="text-center py-12">
          <XCircle size={48} className="mx-auto text-red-400 mb-3" />
          <p className="text-text-secondary">{apiError}</p>
        </div>
      )}

      {isLoadingOrPending && !items.length && (
        <div className="text-center py-6 text-text-secondary">
          <Loader2 size={24} className="mx-auto animate-spin mb-2" />
          <p>加载中…</p>
        </div>
      )}

      {!isLoadingOrPending && items.length === 0 && (
        <div className="text-center py-12 text-text-tertiary">
          <p>暂无检查项</p>
        </div>
      )}

      {!isLoadingOrPending && (
        <>
          {/* 总览 */}
          <div className="grid grid-cols-4 gap-4">
            {['PASS', 'WARN', 'FAIL', 'PENDING'].map(status => {
              const count = items.filter(i => i.status === status).length;
              return (
                <div key={status} className="rounded-lg border border-border-subtle p-4 bg-surface-1">
                  <div className="text-2xl font-bold">{count}</div>
                  <div className="text-xs text-text-tertiary">{status}</div>
                </div>
              );
            })}
          </div>

          {/* 检查项列表 */}
          <div className="space-y-3">
            {CHECK_DEFINITIONS.map(def => {
              const item = items.find(i => i.id === def.id);
              return (
                <div key={def.id} className="rounded-lg border border-border-subtle p-4 bg-surface-1 hover:bg-surface-2 transition-colors" data-testid="self-check-item">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {item ? getIcon(item.status) : <Loader2 size={16} className="text-text-tertiary" />}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-text-primary">{def.name}</span>
                          {item && getStatusBadge(item.status)}
                        </div>
                        <p className="text-sm text-text-secondary mt-1">{def.description}</p>
                        {item?.summary && (
                          <p className="text-xs text-text-tertiary mt-2">{item.summary}</p>
                        )}
                        {item?.details && (
                          <details className="mt-2 text-xs text-text-tertiary">
                            <summary>更多详情</summary>
                            <p className="mt-1">{item.details}</p>
                          </details>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item?.duration && (
                        <span className="text-xs text-text-tertiary">{item.duration}ms</span>
                      )}
                      <button onClick={() => refetch()} className="p-1 hover:bg-surface-2 rounded" aria-label="刷新">
                        <RefreshCw size={12} className="text-text-tertiary" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* 底部状态 */}
      <div className="flex items-center justify-between text-xs text-text-tertiary pt-4 border-t border-border-subtle">
        <span>总体状态: {overall}</span>
        <span>最后更新: {apiData?.data?.timestamp || '从未'}</span>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Cpu, RefreshCw, Server, Shield, TrendingUp, Zap } from 'lucide-react';
import './Dashboard.css';
import ActionSurfacePanel from './ActionSurfacePanel';
import InfrastructureOpsWorkbench from './InfrastructureOpsWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface NodeTraffic {
  node_id: string;
  node_label: string;
  route_type: string;
  calls: number;
  tokens: number;
  estimated_cost_usd: number;
  equivalent_cloud_cost_usd: number;
  saved_vs_cloud_usd: number;
  latency_ms_avg: number | null;
  tokens_per_second_avg: number | null;
}

interface ComputeViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type ComputeClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesComputeFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export default function ComputeView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: ComputeViewProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [controlMessage, setControlMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [circuitBroken, setCircuitBroken] = useState<boolean>(false);
  const [dailyBudget, setDailyBudget] = useState<number | null>(null);
  const [wakeupNodeId, setWakeupNodeId] = useState<string | null>(null);
  const [nodeQuery, setNodeQuery] = useState('');
  const [nodeStatusFilter, setNodeStatusFilter] = useState<'all' | 'online' | 'degraded' | 'offline'>('all');
  // 本地生成 (经 /api/governance/compute/generate → BOS → omlx)
  const [genPrompt, setGenPrompt] = useState<string>('');
  const [genModel, setGenModel] = useState<string>('coder');
  const [genResult, setGenResult] = useState<string>('');
  const [genLoading, setGenLoading] = useState<boolean>(false);
  const [genQueueLoading, setGenQueueLoading] = useState<boolean>(false);
  const [genQueueMessage, setGenQueueMessage] = useState<string | null>(null);

  const runGenerate = async () => {
    if (!genPrompt.trim()) return;
    setGenLoading(true);
    setGenResult('');
    setGenQueueMessage(null);
    try {
      const res = await fetch('/api/governance/compute/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: genPrompt, model: genModel || 'coder' })
      });
      const json = await res.json();
      if (!res.ok) setGenResult('❌ ' + (json.detail || '请求失败'));
      else if (json.status === 'success') setGenResult(json.content || '(空)');
      else setGenResult('❌ ' + (json.error || '生成失败'));
    } catch (err: any) {
      setGenResult('❌ ' + (err.message || String(err)));
    } finally {
      setGenLoading(false);
    }
  };

  const queueGenerationResult = async () => {
    if (!genPrompt.trim() || !genResult || genResult.startsWith('❌')) return;
    setGenQueueLoading(true);
    setGenQueueMessage(null);
    try {
      const res = await fetch('/api/cockpit/compute/generation/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: genPrompt, model: genModel || 'coder', content: genResult }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || data.error || '结果登记失败');
      setGenQueueMessage(data.created === false ? '这份生成结果已经登记过。' : '生成结果已登记到任务中心。');
      if (data.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: data.id }, onNavigate, onOpenTarget);
    } catch (err: any) {
      setGenQueueMessage(`生成结果登记失败：${err.message || '请稍后重试。'}`);
    } finally {
      setGenQueueLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const fetchCompute = async () => {
      if (!cancelled) {
        setLoading(true);
        setError(null);
      }
      try {
        const res = await fetch('/api/governance/compute/status');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        if (cancelled) return;
        setData(json);
        setCircuitBroken(!!json.circuit_broken);
        setDailyBudget(json.daily_budget !== undefined ? json.daily_budget : null);
      } catch (err: any) {
        if (!cancelled) {
          setData(null);
          setError(`算力状态暂不可用：${err.message || '接口读取失败'}`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchCompute();
    const timer = setInterval(fetchCompute, 6000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refreshToken]);

  const toggleCircuitBreaker = async () => {
    const nextVal = !circuitBroken;
    setControlMessage(null);
    try {
      const res = await fetch('/api/cockpit/compute/control/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'circuit_break', broken: nextVal })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || result.error || '登记失败');
      setControlMessage({ tone: 'success', text: nextVal ? '熔断变更已登记，等待人工审批' : '恢复云端路由已登记，等待人工审批' });
      openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: result.id }, onNavigate, onOpenTarget);
    } catch (err: any) {
      setControlMessage({ tone: 'error', text: '修改熔断状态发生异常：' + err.message });
    }
  };

  const updateBudget = async (val: number) => {
    setControlMessage(null);
    try {
      const res = await fetch('/api/cockpit/compute/control/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'budget', budget: val })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.detail || result.error || '登记失败');
      setControlMessage({ tone: 'success', text: `每日预算 $${val} 变更已登记，等待人工审批` });
      openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: result.id }, onNavigate, onOpenTarget);
    } catch (err: any) {
      setControlMessage({ tone: 'error', text: '修改预算异常：' + err.message });
    }
  };

  const wakeupNode = async (node: any) => {
    if (!node?.id || node.status === 'online') return;
    const confirmed = window.confirm(`确认把节点“${node.name || node.id}”登记为唤醒任务？`);
    if (!confirmed) return;

    setWakeupNodeId(node.id);
    setControlMessage(null);
    try {
      const res = await fetch('/api/cockpit/compute/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation: 'wakeup', node_id: node.id }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || result.executes !== false) {
        throw new Error(result.message || result.detail || '节点唤醒失败');
      }
      setControlMessage({ tone: 'success', text: `已登记节点唤醒任务 ${result.id || ''}，请到任务中心审批后执行。` });
      if (result.id) onOpenTarget?.({ tab: 'TaskCenter', taskQuery: result.id });
    } catch (err: any) {
      setControlMessage({ tone: 'error', text: `节点唤醒失败：${err.message || '请求异常'}` });
    } finally {
      setWakeupNodeId(null);
    }
  };

  const nodes = data?.nodes || [];
  const quota = data?.quota?.quota || [];
  const trafficByNode: NodeTraffic[] = data?.traffic_by_node || [];
  const summary = data?.summary || {};
  const costBoard = data?.cost_board || {};
  const availableModels = data?.available_models || [];
  const filteredNodes = useMemo(() => {
    const query = nodeQuery.trim().toLowerCase();
    return nodes.filter((node: any) => {
      if (nodeStatusFilter !== 'all' && node.status !== nodeStatusFilter) return false;
      if (!query) return true;
      return [node.id, node.name, node.model, node.type, node.status]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query);
    });
  }, [nodeQuery, nodeStatusFilter, nodes]);
  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((node: any) => node.id)), [filteredNodes]);
  const filteredTrafficByNode = useMemo(() => trafficByNode.filter((traffic) => {
    if (filteredNodeIds.has(traffic.node_id)) return true;
    if (!nodeQuery.trim()) return false;
    return [traffic.node_id, traffic.node_label, traffic.route_type].join(' ').toLowerCase().includes(nodeQuery.trim().toLowerCase());
  }), [filteredNodeIds, nodeQuery, trafficByNode]);
  const filteredScheduledTasks = useMemo(() => (data?.scheduled_tasks || []).filter((task: any) => {
    if (filteredNodeIds.has(task.node_id)) return true;
    if (!nodeQuery.trim()) return false;
    return [task.task_id, task.task_name, task.node_id, task.engine, task.status].filter(Boolean).join(' ').toLowerCase().includes(nodeQuery.trim().toLowerCase());
  }), [data?.scheduled_tasks, filteredNodeIds, nodeQuery]);

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取混合云算力网格数据...</p>
      </div>
    );
  }

  // 计算整体拦截率 (Interception Rate) 
  const interceptionRate = costBoard.interception_rate === undefined
    ? null
    : Math.round(costBoard.interception_rate * 100);

  const avgLatency = summary.avg_latency_ms === undefined
    ? null
    : Math.round(summary.avg_latency_ms);

  const avgThroughput = summary.avg_tokens_per_second === undefined
    ? null
    : Math.round(summary.avg_tokens_per_second);

  const computeBacklog = (() => {
    const scheduledTasks = data?.scheduled_tasks || [];
    const saturatedNodes = nodes.filter((node: any) => node.status !== 'online' || (node.cpu_usage ?? 0) >= 70 || (node.gpu_usage ?? 0) >= 70);
    const providerRisks = quota.filter((provider: any) => {
      const usedPercent = provider.used_percent !== undefined
        ? provider.used_percent
        : provider.usage?.total_granted
          ? Math.round((provider.usage.total_used / provider.usage.total_granted) * 100)
          : 0;
      return !provider.available || usedPercent >= 80 || provider.error;
    });
    const hotRoutes = [...trafficByNode].sort((left, right) => (right.calls || 0) - (left.calls || 0)).slice(0, 3);
    return {
      scheduledTasks,
      saturatedNodes: (saturatedNodes.length ? saturatedNodes : nodes).slice(0, 3),
      providerRisks: (providerRisks.length ? providerRisks : quota).slice(0, 3),
      hotRoutes,
    };
  })();

  const computeActionItems = [
    {
      id: 'compute-observability',
      title: '回观测面看波动',
      detail: '当延迟、吞吐或熔断状态异常时，先回可观测面看整体异常信号。',
      actionLabel: '进入观测页',
      actionType: 'navigate' as const,
      actionValue: 'Observability',
    },
    {
      id: 'compute-mesh',
      title: '查网格路由与节点',
      detail: '分流不均或本地节点压力异常时，继续去 MCP 网格核对路由和下游服务。',
      actionLabel: '进入网格页',
      actionType: 'navigate' as const,
      actionValue: 'McpMesh',
    },
    {
      id: 'compute-tasks',
      title: '把算力问题挂任务',
      detail: '长期高压节点、预算风险和异常任务都应转进任务中心承接。',
      actionLabel: '进入任务中心',
      actionType: 'navigate' as const,
      actionValue: 'TaskCenter',
    },
  ];

  const saturatedNodeCount = nodes.filter((node: any) => (
    node.status !== 'online' || (node.cpu_usage ?? 0) >= 70 || (node.gpu_usage ?? 0) >= 70
  )).length;
  const providerRiskCount = quota.filter((provider: any) => {
    const usedPercent = provider.used_percent !== undefined
      ? provider.used_percent
      : provider.usage?.total_granted
        ? Math.round((provider.usage.total_used / provider.usage.total_granted) * 100)
        : 0;
    return !provider.available || usedPercent >= 80 || provider.error;
  }).length;
  const topSaturatedNode = saturatedNodeCount > 0 ? computeBacklog.saturatedNodes[0] : null;
  const topProviderRisk = providerRiskCount > 0 ? computeBacklog.providerRisks[0] : null;
  const topHotRoute = computeBacklog.hotRoutes[0] || null;
  const topScheduledTask = computeBacklog.scheduledTasks[0] || null;
  const localGenerateSignal = genResult
    ? `已生成 ${genModel || 'coder'}`
    : `模型 ${genModel || 'coder'}`;
  const computeClosureRows: ComputeClosureRow[] = [
    {
      id: 'node-mesh',
      title: '节点压力与网格排障',
      summary: '算力页最先要接住的，是高压节点和离线节点，不然 CPU/GPU 数字再全也只是报表。',
      signal: topSaturatedNode ? `高压 ${saturatedNodeCount}` : `节点稳定 ${nodes.length}`,
      nextAction: topSaturatedNode
        ? `先打开 ${topSaturatedNode.name} 对应的网格视图，确认路由、下游调用和资源占用。`
        : '当前没有明显高压节点，抽查网格链路是否还能承接一次节点排障。',
      statusTone: topSaturatedNode ? 'degraded' : 'online',
      objectTarget: { tab: 'McpMesh', taskQuery: String(topSaturatedNode?.id || topHotRoute?.node_id || 'compute-node-mesh') },
      taskTarget: { tab: 'TaskCenter', taskQuery: String(topSaturatedNode?.id || topSaturatedNode?.name || 'compute-node-mesh') },
    },
    {
      id: 'budget-governance',
      title: '预算熔断与供应商治理',
      summary: '供应商不可用、额度逼近阈值或熔断已拉闸时，要从算力页直接送进治理动作，而不是停在预算数字上。',
      signal: circuitBroken ? '熔断已开' : topProviderRisk ? `风险 ${providerRiskCount}` : '预算平稳',
      nextAction: circuitBroken
        ? '先确认熔断是否仍需保持，再把供应商治理动作沉到任务中心持续跟踪。'
        : topProviderRisk
          ? `围绕 ${topProviderRisk.provider || '当前供应商'} 核对额度、可用性和后续治理动作。`
          : '当前没有明显预算风险，抽查一次预算闸阀和供应商告警链路是否仍然可用。',
      statusTone: circuitBroken || topProviderRisk ? 'degraded' : 'online',
      objectTarget: { tab: 'Observability', taskQuery: String(topProviderRisk?.provider || 'compute-budget') },
      taskTarget: { tab: 'TaskCenter', taskQuery: String(topProviderRisk?.provider || 'compute-budget') },
    },
    {
      id: 'workflow-hotspots',
      title: '热点流量与工作流回挂',
      summary: '高频节点和调度热点最终要回工作流和全站路径，不然只能看到流量，还是不知道谁在持续烧算力。',
      signal: topHotRoute ? `热点 ${topHotRoute.calls}` : `调度 ${computeBacklog.scheduledTasks.length}`,
      nextAction: topHotRoute
        ? `继续追 ${topHotRoute.node_label} 的工作流来源，再回系统地图确认它挂在哪条使用路径上。`
        : topScheduledTask
          ? `打开 ${topScheduledTask.id || topScheduledTask.name || '调度任务'} 的运行链，确认它为什么会占住算力。`
          : '当前没有明显热点，抽查工作流与算力热点的互跳链路是否还能走通。',
      statusTone: topHotRoute || topScheduledTask ? 'degraded' : 'online',
      objectTarget: { tab: 'Workflows', taskQuery: String(topHotRoute?.node_id || topScheduledTask?.id || 'compute-workflow') },
      taskTarget: { tab: 'TaskCenter', taskQuery: String(topHotRoute?.node_id || topScheduledTask?.id || 'compute-workflow') },
    },
    {
      id: 'local-generation',
      title: '本地生成与实验验收',
      summary: '本地生成不该只停在输出框里，结果要带去沙箱复现，再沉到任务中心形成可验证动作。',
      signal: localGenerateSignal,
      nextAction: genResult
        ? '把这次生成结果带去沙箱验证，再决定是否沉成正式任务。'
        : '先发起一次本地生成，确认模型可用后再去沙箱和任务中心收口。',
      statusTone: genResult ? 'degraded' : 'online',
      objectTarget: { tab: 'Sandbox', taskQuery: '本地算力生成' },
      taskTarget: { tab: 'TaskCenter', taskQuery: '本地算力生成' },
    },
  ];

  const focusedComputeCard = (() => {
    const matchedNode = nodes.find((node: any) => (
      matchesComputeFocusQuery([
        String(node.id || ''),
        node.name,
        node.model,
        node.type,
        node.status,
      ], focusTaskQuery)
    ));
    if (matchedNode) {
      return {
        kicker: '算力节点',
        title: matchedNode.name || String(matchedNode.id || '未命名节点'),
        detail: `${matchedNode.status} · CPU ${matchedNode.cpu_usage ?? 0}% · GPU ${matchedNode.gpu_usage ?? 0}%`,
        objectTarget: { tab: 'Compute', taskQuery: String(matchedNode.id || matchedNode.name || 'Compute') },
        taskTarget: { tab: 'TaskCenter', taskQuery: String(matchedNode.id || matchedNode.name || 'Compute') },
      };
    }

    const matchedProvider = quota.find((provider: any) => (
      matchesComputeFocusQuery([
        provider.provider,
        provider.error,
        provider.available === false ? '不可用' : '可用',
      ], focusTaskQuery)
    ));
    if (matchedProvider) {
      const usedPercent = matchedProvider.used_percent !== undefined
        ? matchedProvider.used_percent
        : matchedProvider.usage?.total_granted
          ? Math.round((matchedProvider.usage.total_used / matchedProvider.usage.total_granted) * 100)
          : 0;
      return {
        kicker: '供应商风险',
        title: matchedProvider.provider || '未命名供应商',
        detail: matchedProvider.available === false ? '当前不可用，需要形成治理动作。' : `${usedPercent}% 已用，需要提前控预算与熔断。`,
        objectTarget: { tab: 'Compute', taskQuery: matchedProvider.provider || 'provider-risk' },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedProvider.provider || 'provider-risk' },
      };
    }

    const matchedRoute = trafficByNode.find((route) => (
      matchesComputeFocusQuery([route.node_id, route.node_label, route.route_type], focusTaskQuery)
    ));
    if (matchedRoute) {
      return {
        kicker: '分流热点',
        title: matchedRoute.node_label,
        detail: `${matchedRoute.calls} 次调用 · ${matchedRoute.tokens.toLocaleString()} tokens，继续核对这类热点挂在哪条使用路径上。`,
        objectTarget: { tab: 'Compute', taskQuery: matchedRoute.node_id },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedRoute.node_id },
      };
    }

    const matchedClosure = computeClosureRows.find((row) => (
      matchesComputeFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '算力闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'Compute') {
      return {
        kicker: '当前页面',
        title: '算力调配',
        detail: '这页负责把节点、配额、热点和熔断状态收拢成运行动作，不让算力问题只停在仪表盘上。',
        objectTarget: { tab: 'SystemMap', pageId: 'Compute' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Compute' },
      };
    }

    return null;
  })();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <InfrastructureOpsWorkbench currentPage="Compute" onNavigate={onNavigate} />

      {error && (
        <div className="overview-inline-error" role="alert">
          <AlertTriangle size={16} />
          <span>{error}</span>
          <button className="antd-btn small" aria-label="重试算力状态" onClick={() => setRefreshToken((value) => value + 1)}>
            <RefreshCw size={13} />
            <span>重试</span>
          </button>
        </div>
      )}

      <ActionSurfacePanel
        title="算力动作区"
        subtitle="先看延迟和预算，再决定去观测、网格还是任务面继续承接。"
        statusText={nodes.length ? `${nodes.length} 个算力节点` : '等待算力节点'}
        items={computeActionItems}
        onNavigate={onNavigate}
      />

      {focusedComputeCard && (
        <section className="services-section overview-ops-panel" aria-label="当前算力承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前算力承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，直接翻成算力面当前该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedComputeCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedComputeCard.title}</strong>
              <p>{focusedComputeCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开算力焦点对象 ${focusedComputeCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedComputeCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Cpu size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开算力焦点任务 ${focusedComputeCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedComputeCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <Shield size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" role="region" aria-label="算力闭环总表">
        <div className="section-header">
          <div>
            <h2>算力闭环总表</h2>
            <p className="text-muted">把节点排障、预算治理、热点回挂和本地生成验收四条线并排摊开，算力页才不只是看 CPU/GPU 和成本数字。</p>
          </div>
          <span className="status-badge online">{computeClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {computeClosureRows.map((row) => (
            <article
              key={`compute-closure-${row.id}`}
              className="antd-card"
              style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 15 }}>{row.title}</strong>
                  <span className={`status-badge ${row.statusTone}`}>{row.signal}</span>
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{row.summary}</p>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <small className="text-muted">下一步</small>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>{row.nextAction}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开算力闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <Server size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开算力闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Shield size={14} />
                  <span>打开任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>算力承接工作台</h2>
            <p className="text-muted">把高压节点、预算风险和任务分流直接翻成下一步动作，不再只看监控数字。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">高压节点 {computeBacklog.saturatedNodes.filter((node: any) => node.status !== 'online' || (node.cpu_usage ?? 0) >= 70 || (node.gpu_usage ?? 0) >= 70).length}</span>
            <span className="status-badge degraded">预算风险 {computeBacklog.providerRisks.filter((provider: any) => !provider.available || provider.error).length || computeBacklog.providerRisks.length}</span>
            <span className="status-badge online">调度任务 {computeBacklog.scheduledTasks.length}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>节点扩容与排障</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>CPU/GPU 压力大或节点离线时，先回观测面，再去网格核对分流。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => onNavigate?.('Observability')}>
                <Activity size={14} />
                <span>看观测页</span>
              </button>
            </div>
            {computeBacklog.saturatedNodes.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有需要处理的节点压力。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {computeBacklog.saturatedNodes.map((node: any) => (
                  <button
                    key={`node-${node.id}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`处理算力节点 ${node.name}`}
                    onClick={() => onNavigate?.('McpMesh')}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{node.name}</strong>
                      <p>{node.status} · CPU {node.cpu_usage == null ? '-' : `${node.cpu_usage}%`} · GPU {node.gpu_usage == null ? '-' : `${node.gpu_usage}%`}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>去网格页核对路由与下游调用。</span>
                    </div>
                    <Cpu size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>预算与供应商风险</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>当余额、可用性或已用额度接近阈值时，马上形成治理动作。</p>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {computeBacklog.providerRisks.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>当前没有明显的供应商风险。</p>
              ) : computeBacklog.providerRisks.map((provider: any, index: number) => {
                const usedPercent = provider.used_percent !== undefined
                  ? provider.used_percent
                  : provider.usage?.total_granted
                    ? Math.round((provider.usage.total_used / provider.usage.total_granted) * 100)
                    : 0;
                return (
                  <button
                    key={`provider-${provider.provider || index}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`处理供应商风险 ${provider.provider || index}`}
                    onClick={() => onNavigate?.('TaskCenter')}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{provider.provider || '未命名供应商'}</strong>
                      <p>{provider.available === false ? '不可用' : `${usedPercent}% 已用`}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>把预算与熔断风险送进任务中心承接。</span>
                    </div>
                    <Shield size={14} />
                  </button>
                )
              })}
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="section-header" style={{ marginBottom: 0 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 15 }}>调度与分流热点</h3>
                <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>高频任务和高调用节点要回工作流页、系统地图和网格继续验收。</p>
              </div>
              <button type="button" className="antd-btn" onClick={() => onNavigate?.('Workflows')}>
                <Zap size={14} />
                <span>看工作流页</span>
              </button>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {computeBacklog.hotRoutes.length === 0 ? (
                <p className="text-muted" style={{ margin: 0 }}>暂无活跃分流热点。</p>
              ) : computeBacklog.hotRoutes.map((route) => (
                <button
                  key={`route-${route.node_id}`}
                  type="button"
                  className="action-surface-item"
                  aria-label={`查看算力热点 ${route.node_label}`}
                  onClick={() => onNavigate?.('SystemMap')}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{route.node_label}</strong>
                    <p>{route.calls} 次调用 · {route.tokens.toLocaleString()} tokens</p>
                    <span className="text-muted" style={{ fontSize: 12 }}>回系统地图确认这类热点挂在哪条使用路径上。</span>
                  </div>
                  <TrendingUp size={14} />
                </button>
              ))}
            </div>
          </article>
        </div>
      </section>

      {/* 本地算力生成 — 经 BOS compute/generate → omlx 集群 */}
      <div className="antd-card" style={{ padding: '16px' }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--antd-text-primary)' }}>
          <Zap size={16} /> 本地算力生成
        </h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={genPrompt}
            onChange={(e) => setGenPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !genLoading) runGenerate(); }}
            placeholder="输入提示词，回车或点生成…"
            style={{ flex: 1, minWidth: '240px', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--antd-border, #d9d9d9)', background: 'var(--antd-bg-elevated, #fff)', color: 'var(--antd-text-primary)' }}
          />
          <select value={genModel} onChange={(e) => setGenModel(e.target.value)} style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--antd-border, #d9d9d9)' }}>
            <option value="coder">coder</option>
            <option value="reasoner">reasoner</option>
            <option value="mini-9b">mini-9b</option>
            <option value="mythos">mythos</option>
            <option value="vision">vision</option>
          </select>
          <button onClick={runGenerate} disabled={genLoading || !genPrompt.trim()} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: 'var(--antd-primary, #1677ff)', color: '#fff', cursor: genLoading ? 'default' : 'pointer', opacity: genLoading ? 0.6 : 1 }}>
            {genLoading ? '生成中…' : '生成'}
          </button>
        </div>
        {genResult && (
          <div style={{ marginTop: '12px', padding: '12px', borderRadius: '6px', background: 'var(--antd-bg-layout, #f5f5f5)', color: 'var(--antd-text-primary)', whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.6 }}>
            {genResult}
          </div>
        )}
        {genResult && !genResult.startsWith('❌') && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="antd-btn antd-btn-primary"
              aria-label="登记本地生成结果"
              disabled={genQueueLoading}
              onClick={() => void queueGenerationResult()}
            >
              <Shield size={14} />
              <span>{genQueueLoading ? '登记中...' : '登记生成结果'}</span>
            </button>
            {genQueueMessage && <span className="text-muted" role="status">{genQueueMessage}</span>}
          </div>
        )}
        <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--antd-text-secondary, #888)' }}>
          经网关路由到本地 omlx 集群 · 首次可能等数十秒(冷启动)
        </div>
      </div>

      {/* 0. 安全治理与熔断控制台 */}
      <div className="antd-card animate-fade-in" style={{
        padding: '20px 24px',
        background: 'linear-gradient(135deg, rgba(20, 20, 35, 0.4) 0%, rgba(10, 10, 20, 0.6) 100%)',
        backdropFilter: 'blur(20px)',
        border: circuitBroken ? '1px solid rgba(255, 69, 58, 0.3)' : '1px solid rgba(0, 242, 254, 0.15)',
        boxShadow: circuitBroken ? '0 0 25px rgba(255, 69, 58, 0.1)' : '0 0 25px rgba(0, 242, 254, 0.02)',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '24px',
        borderRadius: '12px',
        marginTop: '-8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '10px',
            backgroundColor: circuitBroken ? 'rgba(255, 69, 58, 0.1)' : 'rgba(5, 243, 162, 0.05)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${circuitBroken ? 'rgba(255, 69, 58, 0.3)' : 'rgba(5, 243, 162, 0.15)'}`
          }}>
            <Shield size={20} className={circuitBroken ? 'text-error animate-pulse' : 'text-success'} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--antd-text-primary)' }}>
              混合云智能体网格熔断闸阀
              <span className={`status-dot ${circuitBroken ? 'dot-down animate-pulse' : 'dot-ok'}`} style={{ width: '8px', height: '8px', display: 'inline-block' }}></span>
            </h3>
            <p className="text-muted" style={{ fontSize: '11px', marginTop: '4px', margin: 0 }}>
              {error
                ? '无法确认当前熔断和路由状态，请先恢复算力状态探测。'
                : circuitBroken
                ? '🚨 熔断器已拉闸：云端商业 API 访问已被强制中断，全力降级为本地离线推理网格' 
                : '🟢 全网健康监听中：当每日 API 消耗触发安全阀值或达到单日预算时将自动断路熔断'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '24px', minWidth: '320px', flex: 1, justifyContent: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, maxWidth: '240px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
              <span className="text-muted">单日 API 消费安全阀线</span>
              <strong style={{ color: 'var(--antd-accent)' }}>{dailyBudget === null ? '—' : `$${dailyBudget}`} / 天</strong>
            </div>
            <input 
              type="range" 
              min="50" 
              max="1000" 
              step="50"
              value={dailyBudget ?? 100}
              disabled={Boolean(error || !data)}
              onChange={(e) => setDailyBudget(Number(e.target.value))}
              onMouseUp={(e) => updateBudget(Number((e.target as HTMLInputElement).value))}
              onTouchEnd={(e) => updateBudget(Number((e.target as HTMLInputElement).value))}
              style={{
                width: '100%',
                accentColor: 'var(--antd-primary)',
                height: '4px',
                borderRadius: '2px',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.1)'
              }}
            />
          </div>

          <button 
            onClick={toggleCircuitBreaker}
            disabled={Boolean(error || !data)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              backgroundColor: error ? 'rgba(255, 255, 255, 0.05)' : circuitBroken ? 'rgba(255, 69, 58, 0.15)' : 'rgba(5, 243, 162, 0.1)',
              color: error ? 'var(--antd-text-secondary)' : circuitBroken ? 'var(--antd-error)' : 'var(--antd-success)',
              border: `1px solid ${error ? 'var(--antd-border-color)' : circuitBroken ? 'var(--antd-error)' : 'var(--antd-success)'}`,
              boxShadow: circuitBroken ? '0 0 10px rgba(255, 69, 58, 0.1)' : 'none'
            }}
          >
            {error ? '状态未知' : circuitBroken ? '🔐 闭合闸路 (恢复云端)' : '⚡️ 紧急拉闸 (强制熔断)'}
          </button>
        </div>
      </div>

      {controlMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '10px 14px',
            borderRadius: '6px',
            border: `1px solid ${controlMessage.tone === 'success' ? 'rgba(5, 243, 162, 0.35)' : 'rgba(255, 71, 87, 0.35)'}`,
            color: controlMessage.tone === 'success' ? 'var(--antd-success)' : 'var(--antd-error)',
            background: controlMessage.tone === 'success' ? 'rgba(5, 243, 162, 0.08)' : 'rgba(255, 71, 87, 0.08)',
            fontSize: '12px',
          }}
        >
          {controlMessage.text}
        </div>
      )}

      {/* 1. 算力调配核心健康指标 */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        
        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-primary)' }}>
          <div className="stat-info">
            <h3>算力网格平均延迟</h3>
            <p className="stat-value" style={{ color: 'var(--antd-primary)' }}>{avgLatency === null ? '—' : `${avgLatency} ms`}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
              <Zap size={11} />
              <span>本地热启动边缘加速</span>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-accent)' }}>
          <div className="stat-info">
            <h3>总 Token 吞吐速率</h3>
            <p className="stat-value" style={{ color: 'var(--antd-accent)' }}>{avgThroughput === null ? '—' : `${avgThroughput} T/s`}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
              <Activity size={11} />
              <span>智能体活跃吞吐</span>
            </div>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '3px solid var(--antd-success)' }}>
          <div className="stat-info">
            <h3>本地大模型拦截率</h3>
            <p className="stat-value" style={{ color: 'var(--antd-success)' }}>{interceptionRate === null ? '—' : `${interceptionRate}%`}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '4px' }}>
              <TrendingUp size={11} />
              <span>节省云端 API 成本: ${costBoard.saved_vs_cloud_usd || '0.00'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. 物理算力节点明细面板 (带 CPU / GPU 实时仪表) */}
      <div className="services-section">
        <div className="section-header" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Cpu size={16} className="text-accent" />
          <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>分布式物理节点负载拓扑</h3>
        </div>

        <section role="region" aria-label="算力对象筛选" style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 180px auto', gap: 10, alignItems: 'center', marginBottom: 16 }}>
          <input
            className="antd-input"
            type="search"
            aria-label="搜索算力节点"
            placeholder="节点名、模型、任务或路由"
            value={nodeQuery}
            onChange={(event) => setNodeQuery(event.target.value)}
          />
          <select className="antd-input" aria-label="按状态筛选算力节点" value={nodeStatusFilter} onChange={(event) => setNodeStatusFilter(event.target.value as typeof nodeStatusFilter)}>
            <option value="all">全部节点状态</option>
            <option value="online">在线</option>
            <option value="degraded">降级</option>
            <option value="offline">离线</option>
          </select>
          {(nodeQuery || nodeStatusFilter !== 'all') && (
            <button type="button" className="antd-btn" aria-label="清除算力对象筛选" onClick={() => { setNodeQuery(''); setNodeStatusFilter('all'); }}>
              清除筛选
            </button>
          )}
          <span className="text-muted" style={{ fontSize: 12, gridColumn: '1 / -1' }}>显示 {filteredNodes.length}/{nodes.length} 个节点 · 流量 {filteredTrafficByNode.length}/{trafficByNode.length} · 调度 {filteredScheduledTasks.length}/{(data?.scheduled_tasks || []).length}</span>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '16px' }}>
          {filteredNodes.map((node: any) => {
            const cpuLoad = node.cpu_usage;
            const gpuLoad = node.gpu_usage;
            const isOnline = node.status === 'online';

            return (
              <div 
                key={node.id} 
                className="antd-card"
                style={{ 
                  padding: '20px', 
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  border: isOnline ? '1px solid rgba(0, 242, 254, 0.08)' : '1px solid rgba(255, 255, 255, 0.03)'
                }}
              >
                {/* 节点头部信息 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--antd-text-primary)' }}>{node.name}</h4>
                    <span className="text-muted" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>{node.model}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: 600,
                      backgroundColor: isOnline ? 'rgba(5, 243, 162, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: isOnline ? 'var(--antd-success)' : 'rgba(255,255,255,0.45)',
                      border: `1px solid ${isOnline ? 'rgba(5,243,162,0.2)' : 'rgba(255,255,255,0.1)'}`
                    }}>
                      {node.status.toUpperCase()}
                    </span>
                    <span style={{ display: 'block', fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>
                      {node.type}
                    </span>
                    {node.status !== 'online' && (
                      <button
                        type="button"
                        className="antd-btn small"
                        aria-label={`唤醒节点 ${node.name}`}
                        onClick={() => void wakeupNode(node)}
                        disabled={wakeupNodeId === node.id}
                        style={{ marginTop: 8 }}
                      >
                        <Zap size={13} />
                        <span>{wakeupNodeId === node.id ? '唤醒中' : '唤醒节点'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 实时硬件仪 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* CPU Meter */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span className="text-muted">CPU 占用率</span>
                      <span style={{ color: 'var(--antd-primary)', fontWeight: 600 }}>{cpuLoad == null ? '-' : `${cpuLoad}%`}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${cpuLoad ?? 0}%`,
                        backgroundColor: cpuLoad == null ? 'var(--antd-text-muted)' : 'var(--antd-primary)',
                        transition: 'width 1.2s ease-in-out'
                      }}></div>
                    </div>
                  </div>

                  {/* GPU Meter */}
                  {node.id !== 'cloud-cc-switch' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span className="text-muted">GPU (NVIDIA/Apple M) VRAM 占用</span>
                        <span style={{ color: 'var(--antd-accent)', fontWeight: 600 }}>{gpuLoad == null ? '-' : `${gpuLoad}%`}</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${gpuLoad ?? 0}%`,
                          backgroundColor: gpuLoad == null ? 'var(--antd-text-muted)' : 'var(--antd-accent)',
                          transition: 'width 1.2s ease-in-out'
                        }}></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. 调度流量与配额双栏布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px' }}>
        
        {/* 左栏：任务调度与网格节点流量明细 */}
        <div className="services-section" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>大模型调用与节点调度分流</h3>
          
          <div className="services-list">
            <table className="services-table" aria-label="算力节点任务调度表">
              <thead>
                <tr>
                  <th scope="col">算力节点</th>
                  <th scope="col">类型</th>
                  <th scope="col">调度计数</th>
                  <th scope="col">总 Token 数</th>
                  <th scope="col">平均速度</th>
                  <th scope="col">响应耗时</th>
                </tr>
              </thead>
              <tbody>
                {filteredTrafficByNode.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.45)' }}>
                      暂无活跃的大模型任务分流记录
                    </td>
                  </tr>
                ) : (
                  filteredTrafficByNode.map((tn) => (
                    <tr key={tn.node_id} className="service-row">
                      <td style={{ fontWeight: 600 }}>{tn.node_label}</td>
                      <td>
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          backgroundColor: tn.route_type === 'local' ? 'rgba(5, 243, 162, 0.08)' : 'rgba(0, 242, 254, 0.08)',
                          color: tn.route_type === 'local' ? 'var(--antd-success)' : 'var(--antd-primary)'
                        }}>
                          {tn.route_type.toUpperCase()}
                        </span>
                      </td>
                      <td>{tn.calls} 次</td>
                      <td className="text-muted">{tn.tokens.toLocaleString()}</td>
                      <td className="font-medium">
                        {tn.tokens_per_second_avg ? `${Math.round(tn.tokens_per_second_avg)} T/s` : '-'}
                      </td>
                      <td className="text-muted">
                        {tn.latency_ms_avg ? `${Math.round(tn.latency_ms_avg)} ms` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 下部：实时任务调度追踪舱 */}
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={16} style={{ color: 'var(--antd-primary)' }} />
              <span>混合云大模型任务调度追踪舱 (Task Dispatcher Status)</span>
            </h3>
            <div className="services-list">
              <table className="services-table" aria-label="大模型任务调度表">
                <thead>
                  <tr>
                    <th scope="col">任务 ID</th>
                    <th scope="col">任务名称</th>
                    <th scope="col">调度节点</th>
                    <th scope="col">底层引擎</th>
                    <th scope="col">调度状态</th>
                    <th scope="col">进度</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScheduledTasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.45)' }}>
                        暂无处于激活调度态的任务
                      </td>
                    </tr>
                  ) : (
                    filteredScheduledTasks.map((task: any) => (
                      <tr key={task.task_id} className="service-row">
                        <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '11.5px' }}>{task.task_id}</td>
                        <td style={{ fontSize: '11.5px' }}>{task.task_name}</td>
                        <td>
                          <span style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10.5px',
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            color: 'rgba(255,255,255,0.75)'
                          }}>
                            {task.node_id}
                          </span>
                        </td>
                        <td className="text-muted" style={{ fontSize: '11px' }}>{task.engine}</td>
                        <td>
                          <span style={{
                            fontSize: '9.5px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            backgroundColor: task.status === 'running' ? 'rgba(22, 119, 255, 0.12)' : 'rgba(52, 199, 89, 0.1)',
                            color: task.status === 'running' ? 'var(--antd-primary)' : 'var(--antd-success)',
                            border: `1px solid ${task.status === 'running' ? 'rgba(22, 119, 255, 0.2)' : 'rgba(52, 199, 89, 0.15)'}`
                          }}>
                            {task.status.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '60px', height: '4px', borderRadius: '2px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                              <div style={{
                                height: '100%',
                                width: `${task.progress}%`,
                                backgroundColor: task.status === 'running' ? 'var(--antd-primary)' : 'var(--antd-success)'
                              }}></div>
                            </div>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--antd-text-secondary)' }}>{task.progress}%</span>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 右栏：供应商额度与余额余额 */}
        <div className="services-section" style={{ margin: 0 }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>模型供应商 API 配额与余额</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {quota.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                暂无活跃的供应商鉴权数据
              </div>
            ) : (
              quota.map((q: any, i: number) => {
                const usedPercent = q.used_percent !== undefined && q.used_percent !== null
                  ? q.used_percent
                  : q.usage?.total_granted
                    ? Math.round((q.usage.total_used / q.usage.total_granted) * 100)
                    : null;
                const balance = q.balance_usd !== undefined ? q.balance_usd : null;
                return (
                  <div 
                    key={i} 
                    className="antd-card"
                    style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--antd-text-primary)', textTransform: 'capitalize' }}>
                        {q.provider}
                      </span>
                      <span style={{ 
                        fontSize: '11px',
                        color: q.available ? 'var(--antd-success)' : 'var(--antd-error)',
                        fontWeight: 600
                      }}>
                        {q.available ? '● 额度正常' : '● KEY 失效'}
                      </span>
                    </div>
                    
                    {q.error ? (
                      <div style={{ color: 'var(--antd-error)', fontSize: '11px' }}>
                        {q.error.message || '额度同步错误'}
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px' }}>
                          <span>额度已用: <strong>{usedPercent === null ? '-' : `${usedPercent}%`}</strong></span>
                          {balance !== null && (
                            <span>可用余额: <strong style={{ color: 'var(--antd-success)' }}>${balance.toFixed(2)}</strong></span>
                          )}
                        </div>
                        <div style={{ height: '5px', borderRadius: '2.5px', backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%',
                            width: `${usedPercent ?? 0}%`,
                            backgroundColor: usedPercent === null
                              ? 'var(--antd-text-muted)'
                              : usedPercent > 80 ? 'var(--antd-error)' : usedPercent > 50 ? 'var(--antd-warning)' : 'var(--antd-success)'
                          }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* 4. 可用大语言模型状态与资源监控舱 */}
      <div className="services-section" style={{ marginTop: '8px' }}>
        <div className="section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Server size={16} className="text-primary" />
            <h3 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>可用大语言模型监控舱 (Available Models & Resources)</h3>
          </div>
          <span style={{
            fontSize: '11px',
            padding: '1px 6px',
            borderRadius: '10px',
            backgroundColor: 'rgba(0, 242, 254, 0.1)',
            color: 'var(--antd-primary)',
            fontWeight: 600
          }}>
            {availableModels.length} Models
          </span>
        </div>

        <div className="services-list">
          <table className="services-table" aria-label="可用模型列表">
            <thead>
              <tr>
                <th scope="col">模型名称</th>
                <th scope="col">提供商</th>
                <th scope="col">节点健康状态</th>
                <th scope="col">平均延迟 (p50)</th>
                <th scope="col">平均吞吐 (T/s)</th>
                <th scope="col">今日请求数</th>
              </tr>
            </thead>
            <tbody>
              {availableModels.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.45)' }}>
                    暂无可用的大语言模型资源
                  </td>
                </tr>
              ) : (
                availableModels.map((m: any, idx: number) => (
                  <tr key={idx} className="service-row">
                    <td style={{ fontWeight: 600, fontFamily: 'monospace', fontSize: '12.5px' }}>{m.model_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{m.provider}</td>
                    <td>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        backgroundColor: m.status === 'healthy' ? 'rgba(52, 199, 89, 0.1)' : m.status === 'degraded' ? 'rgba(255, 184, 0, 0.1)' : 'rgba(255, 69, 58, 0.1)',
                        color: m.status === 'healthy' ? 'var(--antd-success)' : m.status === 'degraded' ? 'var(--antd-warning)' : 'var(--antd-error)',
                        border: `1px solid ${m.status === 'healthy' ? 'rgba(52,199,89,0.2)' : m.status === 'degraded' ? 'rgba(255,184,0,0.2)' : 'rgba(255,69,58,0.2)'}`
                      }}>
                        {m.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="text-muted">
                      {m.latency_p50 ? `${m.latency_p50} ms` : '-'}
                    </td>
                    <td className="font-medium">
                      {m.tokens_per_second ? `${m.tokens_per_second} T/s` : '-'}
                    </td>
                    <td className="text-muted">
                      {m.calls_today === null || m.calls_today === undefined ? '-' : `${m.calls_today.toLocaleString()} 次`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

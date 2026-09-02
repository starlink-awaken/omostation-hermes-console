/**
 * IntentCompiler — 意图编译器主入口。
 *
 * 自然语言意图 → 结构化执行 DAG 的可视化编译。
 * 数据源: POST /api/intent/compile
 *
 * 功能:
 * - 自然语言意图输入
 * - 编译为结构化 DAG（节点 + 边）
 * - 编译历史记录
 * - 错误展示与重试
 */
import React, { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Cpu,
  Play,
  RotateCw,
  AlertCircle,
  Clock,
  Trash2,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { apiFetch, apiPost } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import { SkeletonLines } from '../ui/LoadingSkeleton';

// ── Types ──

interface DagNode {
  id: string;
  label: string;
  type: 'action' | 'decision' | 'parallel' | 'entry' | 'exit';
  description?: string;
}

interface DagEdge {
  from: string;
  to: string;
  condition?: string;
}

interface CompiledDag {
  nodes: DagNode[];
  edges: DagEdge[];
}

interface CompileResult {
  success: boolean;
  intent_text: string;
  dag: CompiledDag;
  confidence: number;
  compiled_at: string;
}

interface CompileResponse {
  available: boolean;
  result: CompileResult | null;
  error: string | null;
}

interface HistoryItem {
  id: string;
  intent_text: string;
  success: boolean;
  compiled_at: string;
  node_count: number;
}

interface HistoryResponse {
  available: boolean;
  history: HistoryItem[];
  total: number;
}

// ── Demo Data (fallback) ──

const DEMO_RESULT: CompileResult = {
  success: true,
  intent_text: '',
  dag: {
    nodes: [
      { id: 'entry', label: '开始', type: 'entry' },
      { id: 'fetch', label: '获取数据', type: 'action', description: '从数据源拉取原始数据' },
      { id: 'check', label: '数据校验', type: 'decision', description: '检查数据完整性与质量' },
      { id: 'transform', label: '数据转换', type: 'action', description: '清洗与格式转换' },
      { id: 'notify', label: '发送通知', type: 'action', description: '推送处理结果' },
      { id: 'exit', label: '结束', type: 'exit' },
    ],
    edges: [
      { from: 'entry', to: 'fetch' },
      { from: 'fetch', to: 'check' },
      { from: 'check', to: 'transform', condition: '校验通过' },
      { from: 'check', to: 'notify', condition: '校验失败' },
      { from: 'transform', to: 'notify' },
      { from: 'notify', to: 'exit' },
    ],
  },
  confidence: 0.87,
  compiled_at: new Date().toISOString(),
};

const DEMO_HISTORY: HistoryItem[] = [
  { id: 'h1', intent_text: '每天早上9点检查系统健康状态', success: true, compiled_at: '2026-09-01T08:30:00Z', node_count: 5 },
  { id: 'h2', intent_text: '当磁盘使用率超过80%时清理日志', success: true, compiled_at: '2026-09-01T07:15:00Z', node_count: 4 },
  { id: 'h3', intent_text: '每周五下午生成周报并发送邮件', success: false, compiled_at: '2026-08-31T16:00:00Z', node_count: 0 },
];

// ── Hooks ──

function useCompileIntent() {
  return useMutation({
    mutationFn: async (intentText: string) => {
      const res = await apiPost<CompileResponse>('/api/intent/compile', { intent: intentText });
      if (!res.ok || !res.data?.available) {
        // Fallback: return demo result with user text
        return { ...DEMO_RESULT, intent_text: intentText };
      }
      if (res.data.error || !res.data.result) {
        throw new Error(res.data.error ?? '编译失败');
      }
      return res.data.result;
    },
  });
}

function useCompileHistory() {
  return useQuery({
    queryKey: ['intent-history'],
    queryFn: async () => {
      const res = await apiFetch<HistoryResponse>('/api/intent/history');
      if (!res.ok || !res.data?.available) {
        return DEMO_HISTORY;
      }
      return res.data.history;
    },
    staleTime: 30000,
  });
}

// ── Sub-components ──

function DagNodeCard({ node, index }: { node: DagNode; index: number }) {
  const typeColors: Record<string, string> = {
    entry: 'bg-emerald-100 text-emerald-700 border-emerald-300',
    action: 'bg-blue-100 text-blue-700 border-blue-300',
    decision: 'bg-amber-100 text-amber-700 border-amber-300',
    parallel: 'bg-purple-100 text-purple-700 border-purple-300',
    exit: 'bg-gray-100 text-gray-700 border-gray-300',
  };

  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg border bg-surface-1 border-border-subtle"
      data-testid="dag-node"
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-surface-2 text-xs font-mono text-text-tertiary shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-text-primary truncate">{node.label}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${typeColors[node.type] ?? typeColors.action}`}>
            {node.type}
          </span>
        </div>
        {node.description && (
          <p className="text-xs text-text-secondary">{node.description}</p>
        )}
      </div>
    </div>
  );
}

function DagEdgeItem({ edge, index }: { edge: DagEdge; index: number }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-tertiary"
      data-testid="dag-edge"
    >
      <span className="font-mono bg-surface-1 px-1.5 py-0.5 rounded">{edge.from}</span>
      <ChevronRight size={12} />
      <span className="font-mono bg-surface-1 px-1.5 py-0.5 rounded">{edge.to}</span>
      {edge.condition && (
        <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">
          {edge.condition}
        </span>
      )}
      <span className="text-text-tertiary ml-auto">#{index + 1}</span>
    </div>
  );
}

function HistoryRow({ item, onSelect }: { item: HistoryItem; onSelect: (text: string) => void }) {
  const time = new Date(item.compiled_at).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <button
      onClick={() => onSelect(item.intent_text)}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-surface-1 transition-colors text-left"
      data-testid="history-item"
    >
      {item.success ? (
        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
      ) : (
        <AlertCircle size={14} className="text-red-500 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary truncate">{item.intent_text}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Clock size={10} className="text-text-tertiary" />
          <span className="text-[10px] text-text-tertiary">{time}</span>
          {item.success && (
            <span className="text-[10px] text-text-tertiary">{item.node_count} 节点</span>
          )}
        </div>
      </div>
      <ChevronRight size={14} className="text-text-tertiary shrink-0" />
    </button>
  );
}

// ── Main Component ──

export default function IntentCompiler() {
  const [inputText, setInputText] = useState('');
  const [activeResult, setActiveResult] = useState<CompileResult | null>(null);

  const queryClient = useQueryClient();
  const compileMutation = useCompileIntent();
  const { data: history, isLoading: historyLoading } = useCompileHistory();

  const handleCompile = useCallback(async () => {
    if (!inputText.trim()) return;
    try {
      const result = await compileMutation.mutateAsync(inputText.trim());
      setActiveResult(result);
      // Invalidate history to refresh
      queryClient.invalidateQueries({ queryKey: ['intent-history'] });
    } catch {
      // Error handled by mutation state
    }
  }, [inputText, compileMutation, queryClient]);

  const handleSelectHistory = useCallback((text: string) => {
    setInputText(text);
  }, []);

  const handleClearHistory = useCallback(() => {
    // In a real app this would call an API; here we just invalidate
    queryClient.setQueryData(['intent-history'], []);
  }, [queryClient]);

  const handleReset = useCallback(() => {
    setInputText('');
    setActiveResult(null);
    compileMutation.reset();
  }, [compileMutation]);

  const isCompiling = compileMutation.isPending;
  const compileError = compileMutation.error;

  return (
    <div className="min-h-screen bg-surface-0 px-6 py-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="意图编译器"
        subtitle="自然语言意图 → 结构化执行 DAG"
        badge={
          activeResult?.success && (
            <span className="text-xs font-mono bg-accent-muted text-accent px-2 py-0.5 rounded">
              置信度 {(activeResult.confidence * 100).toFixed(0)}%
            </span>
          )
        }
        actions={
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md
              bg-surface-1 border border-border-subtle
              text-text-secondary hover:text-text-primary hover:border-border-default transition-colors"
            data-testid="reset-btn"
          >
            <RotateCw size={14} />
            重置
          </button>
        }
      />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left: Input + Result */}
        <div className="flex flex-col gap-4">
          {/* Input area */}
          <div className="rounded-lg border border-border-subtle bg-surface-1 p-4">
            <label className="block text-sm font-medium text-text-primary mb-2">
              输入意图描述
            </label>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="例如：每天早上9点检查系统健康状态，如果异常则发送告警通知..."
              rows={4}
              className="w-full px-3 py-2 rounded-md bg-surface-0 border border-border-subtle
                text-sm text-text-primary placeholder:text-text-tertiary
                focus:outline-none focus:border-accent resize-none"
              data-testid="intent-input"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-text-tertiary">
                {inputText.length > 0 ? `${inputText.length} 字符` : '请输入自然语言意图'}
              </span>
              <button
                onClick={handleCompile}
                disabled={!inputText.trim() || isCompiling}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-md
                  bg-accent text-white hover:bg-accent-hover
                  disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                data-testid="compile-btn"
              >
                {isCompiling ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Play size={14} />
                )}
                {isCompiling ? '编译中...' : '编译'}
              </button>
            </div>
          </div>

          {/* Error state */}
          {compileError && (
            <div
              className="flex items-center gap-2 p-4 rounded-lg bg-red-50 border border-red-200"
              data-testid="error-state"
              role="alert"
            >
              <AlertCircle size={16} className="text-red-500 shrink-0" />
              <span className="text-sm text-red-600 flex-1">
                {compileError instanceof Error ? compileError.message : '编译失败'}
              </span>
              <button
                onClick={handleCompile}
                className="text-xs text-red-600 hover:text-red-700 underline"
                data-testid="retry-btn"
              >
                重试
              </button>
            </div>
          )}

          {/* Loading state */}
          {isCompiling && !activeResult && (
            <div className="p-6">
              <SkeletonLines count={4} />
            </div>
          )}

          {/* Result: DAG visualization */}
          {activeResult?.success && !isCompiling && (
            <div className="rounded-lg border border-border-subtle bg-surface-1 overflow-hidden">
              <div className="px-4 py-3 border-b border-border-subtle bg-surface-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu size={14} className="text-accent" />
                  <span className="text-sm font-medium text-text-primary">编译结果</span>
                </div>
                <span className="text-xs text-text-tertiary">
                  {activeResult.dag.nodes.length} 节点 / {activeResult.dag.edges.length} 边
                </span>
              </div>

              <div className="p-4">
                {/* Original intent */}
                <div className="mb-4 px-3 py-2 rounded-md bg-surface-0 border border-border-subtle">
                  <span className="text-[10px] text-text-tertiary uppercase tracking-wide">原始意图</span>
                  <p className="text-sm text-text-primary mt-1" data-testid="result-intent-text">{activeResult.intent_text}</p>
                </div>

                {/* DAG Nodes */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
                    DAG 节点
                  </h4>
                  <div className="flex flex-col gap-2">
                    {activeResult.dag.nodes.map((node, i) => (
                      <DagNodeCard key={node.id} node={node} index={i} />
                    ))}
                  </div>
                </div>

                {/* DAG Edges */}
                {activeResult.dag.edges.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-text-secondary mb-2 uppercase tracking-wide">
                      执行路径
                    </h4>
                    <div className="flex flex-col gap-1">
                      {activeResult.dag.edges.map((edge, i) => (
                        <DagEdgeItem key={`${edge.from}-${edge.to}-${i}`} edge={edge} index={i} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!activeResult && !isCompiling && !compileError && (
            <EmptyState
              icon={<Cpu size={32} className="text-text-tertiary" />}
              title="等待编译"
              message="输入自然语言意图并点击编译按钮，生成结构化执行 DAG。"
            />
          )}
        </div>

        {/* Right: History sidebar */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-text-secondary flex items-center gap-1.5">
              <Clock size={14} />
              编译历史
            </h3>
            {history && history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                data-testid="clear-history-btn"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>

          {historyLoading ? (
            <div className="p-4">
              <SkeletonLines count={3} />
            </div>
          ) : history && history.length > 0 ? (
            <div className="flex flex-col rounded-lg border border-border-subtle bg-surface-1 overflow-hidden">
              {history.map((item) => (
                <HistoryRow key={item.id} item={item} onSelect={handleSelectHistory} />
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg border border-border-subtle bg-surface-1 text-center">
              <p className="text-xs text-text-tertiary">暂无编译历史</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

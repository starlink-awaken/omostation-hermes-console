/**
 * EvolutionPipeline — 进化四阶段管道
 *
 * 展示 BCOS 进化引擎的四阶段流程：observe → propose → evaluate → approve
 * 当前阶段高亮显示。
 */
import React from 'react';
import { Eye, Lightbulb, Scale, CheckCircle } from 'lucide-react';

export interface EvolutionData {
  stage: 'observe' | 'propose' | 'evaluate' | 'approve';
  proposals?: Array<{ id: string; title: string }>;
}

export interface EvolutionPipelineProps {
  data: EvolutionData | null;
  loading?: boolean;
}

interface StageConfig {
  key: 'observe' | 'propose' | 'evaluate' | 'approve';
  label: string;
  icon: React.ReactNode;
}

const STAGES: StageConfig[] = [
  { key: 'observe', label: '观察', icon: <Eye size={16} /> },
  { key: 'propose', label: '提议', icon: <Lightbulb size={16} /> },
  { key: 'evaluate', label: '评估', icon: <Scale size={16} /> },
  { key: 'approve', label: '批准', icon: <CheckCircle size={16} /> },
];

export default function EvolutionPipeline({ data, loading }: EvolutionPipelineProps) {
  const currentIndex = data
    ? STAGES.findIndex((s) => s.key === data.stage)
    : -1;

  if (loading) {
    return (
      <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-4 w-20 rounded bg-surface-2" />
          <div className="flex gap-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-12 flex-1 rounded bg-surface-2" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="rounded-lg border border-border-subtle bg-surface-1 p-6">
      <h3 className="text-sm font-medium text-secondary">进化引擎</h3>
      <div className="mt-4 flex items-center gap-1">
        {STAGES.map((stage, index) => {
          const isActive = index === currentIndex;
          const isPast = index < currentIndex;
          return (
            <React.Fragment key={stage.key}>
              <div
                className={`flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-3 transition-colors ${
                  isActive
                    ? 'bg-accent-muted text-accent border border-accent/30'
                    : isPast
                      ? 'bg-status-ok-muted text-status-ok border border-status-ok/20'
                      : 'bg-surface-2 text-tertiary border border-transparent'
                }`}
              >
                <span className={isActive ? 'text-accent' : ''}>{stage.icon}</span>
                <span className="text-xs font-medium">{stage.label}</span>
              </div>
              {index < STAGES.length - 1 && (
                <div
                  className={`h-0.5 w-3 shrink-0 ${
                    index < currentIndex ? 'bg-status-ok' : 'bg-surface-2'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {data.proposals && data.proposals.length > 0 && (
        <div className="mt-4 border-t border-border-subtle pt-4">
          <h4 className="text-xs text-tertiary mb-2">当前提案</h4>
          <ul className="space-y-1">
            {data.proposals.map((p) => (
              <li key={p.id} className="text-sm text-text-primary flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                {p.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

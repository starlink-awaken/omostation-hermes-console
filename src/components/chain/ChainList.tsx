/**
 * ChainList — 链列表组件。
 *
 * 显示链名、描述、步骤数，支持选中高亮。
 */
import React from 'react';
import { GitBranch } from 'lucide-react';

export interface ChainSummary {
  id: string;
  name: string;
  description: string;
  step_count: number;
  source: string;
}

interface ChainListProps {
  chains: ChainSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function ChainList({ chains, selectedId, onSelect }: ChainListProps) {
  return (
    <div className="flex flex-col gap-2" role="listbox" aria-label="链路列表">
      {chains.map((chain) => {
        const isSelected = chain.id === selectedId;
        return (
          <button
            key={chain.id}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(chain.id)}
            className={`
              flex items-start gap-3 p-3 rounded-lg border text-left
              transition-colors duration-150 cursor-pointer
              ${isSelected
                ? 'bg-[var(--color-accent-muted)] border-[var(--color-accent)]'
                : 'bg-[var(--color-surface-1)] border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]'
              }
            `.trim()}
          >
            <div className={`mt-0.5 flex-shrink-0 ${isSelected ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-tertiary)]'}`}>
              <GitBranch size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium truncate ${isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'}`}>
                  {chain.name}
                </span>
                <span className="text-xs text-[var(--color-text-tertiary)] bg-[var(--color-surface-3)] px-1.5 py-0.5 rounded flex-shrink-0">
                  {chain.step_count} 步
                </span>
              </div>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1 line-clamp-2">
                {chain.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

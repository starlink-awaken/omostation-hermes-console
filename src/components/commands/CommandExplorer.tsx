/**
 * CommandExplorer — 命令全景浏览器
 *
 * 全量 CLI 命令浏览、搜索与帮助引导。
 * 数据源: GET /api/commands
 */
import React, { useState, useMemo } from 'react';
import { Search, Terminal, BookOpen, Lightbulb } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../api/client';
import PageHeader from '../ui/PageHeader';
import EmptyState from '../ui/EmptyState';
import { SkeletonLines } from '../ui/LoadingSkeleton';
import CommandCard from './CommandCard';
import type { Command } from './CommandCard';

// ── Types ──

interface CommandGroup {
  key: string;
  label: string;
  count: number;
}

interface GuideSection {
  title: string;
  description: string;
  commands?: string[];
}

interface Scenario {
  name: string;
  description: string;
  steps?: string[];
}

interface CommandsResponse {
  available: boolean;
  commands: Command[];
  groups: CommandGroup[];
  guide_sections: GuideSection[];
  scenarios: Scenario[];
  total: number;
}

// ── Component ──

export default function CommandExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('');

  const { data, isLoading, error } = useQuery<CommandsResponse, Error>({
    queryKey: ['commands'],
    queryFn: async () => {
      const res = await apiFetch<CommandsResponse>('/api/commands');
      if (!res.ok || !res.data) throw new Error(res.error ?? '获取命令数据失败');
      return res.data;
    },
  });

  const commands = data?.commands ?? [];
  const groups = data?.groups ?? [];
  const guideSections = data?.guide_sections ?? [];
  const scenarios = data?.scenarios ?? [];

  // 搜索 + 分类过滤
  const filteredCommands = useMemo(() => {
    let result = commands;
    if (activeGroup) {
      result = result.filter(c => c.category === activeGroup);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        c =>
          c.name.toLowerCase().includes(q) ||
          c.summary.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q),
      );
    }
    return result;
  }, [commands, searchQuery, activeGroup]);

  return (
    <div className="min-h-screen bg-surface-0 px-6 py-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="命令全景"
        subtitle="全量 CLI 命令浏览、搜索与帮助引导"
        badge={
          data?.available && (
            <span className="text-xs font-mono bg-accent-muted text-accent px-2 py-0.5 rounded">
              {data.total} commands
            </span>
          )
        }
      />

      {/* 搜索 + 分类过滤 */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="text"
            placeholder="搜索命令名、摘要或类别..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-md bg-surface-1 border border-border-subtle text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveGroup('')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeGroup === ''
                ? 'bg-accent text-white'
                : 'bg-surface-1 text-text-secondary hover:bg-surface-2'
            }`}
          >
            全部
          </button>
          {groups.map(g => (
            <button
              key={g.key}
              onClick={() => setActiveGroup(activeGroup === g.key ? '' : g.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeGroup === g.key
                  ? 'bg-accent text-white'
                  : 'bg-surface-1 text-text-secondary hover:bg-surface-2'
              }`}
            >
              {g.label} ({g.count})
            </button>
          ))}
        </div>
      </div>

      {/* 内容区 */}
      {isLoading ? (
        <div className="mt-6">
          <SkeletonLines count={5} />
        </div>
      ) : error ? (
        <div className="mt-6">
          <EmptyState
            icon={<Terminal size={32} className="text-status-error" />}
            title="加载失败"
            message={error.message || '无法获取命令数据'}
          />
        </div>
      ) : filteredCommands.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<Search size={32} />}
            title="无匹配命令"
            message="尝试调整搜索关键词或切换分类"
          />
        </div>
      ) : (
        <>
          {/* 命令卡列表 */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCommands.map(cmd => (
              <CommandCard key={cmd.name} command={cmd} />
            ))}
          </div>

          {/* 选型引导 */}
          {guideSections.length > 0 && (
            <section className="mt-10">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-4">
                <BookOpen size={20} className="text-accent" />
                选型引导
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {guideSections.map(section => (
                  <div
                    key={section.title}
                    className="rounded-lg border border-border-subtle bg-surface-2 p-4"
                  >
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
                      {section.title}
                    </h3>
                    <p className="text-xs text-text-secondary mb-2">{section.description}</p>
                    {section.commands && section.commands.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {section.commands.map(c => (
                          <code
                            key={c}
                            className="text-xs font-mono bg-surface-1 px-2 py-0.5 rounded text-text-tertiary"
                          >
                            {c}
                          </code>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 场景卡 */}
          {scenarios.length > 0 && (
            <section className="mt-8 mb-8">
              <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary mb-4">
                <Lightbulb size={20} className="text-status-warn" />
                典型场景
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {scenarios.map(scenario => (
                  <div
                    key={scenario.name}
                    className="rounded-lg border border-border-subtle bg-surface-2 p-4"
                  >
                    <h3 className="text-sm font-semibold text-text-primary mb-1">
                      {scenario.name}
                    </h3>
                    <p className="text-xs text-text-secondary mb-2">{scenario.description}</p>
                    {scenario.steps && scenario.steps.length > 0 && (
                      <ol className="text-xs text-text-tertiary list-decimal list-inside space-y-0.5">
                        {scenario.steps.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

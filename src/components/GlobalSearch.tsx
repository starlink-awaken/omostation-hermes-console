/**
 * GlobalSearch — 全局搜索组件
 *
 * 跨页面搜索：页面、任务、文档、命令
 * 快捷键: Ctrl+K 打开
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Command, FileText, Zap, Hash, X, Clock } from 'lucide-react';
import { apiFetch } from '../api';
import { ROUTES, getRouteById } from '../routes';

interface SearchResult {
  id: string;
  type: 'page' | 'task' | 'document' | 'command';
  title: string;
  subtitle?: string;
  path?: string;
  icon?: string;
}

interface SearchHistory {
  query: string;
  timestamp: number;
}

const HISTORY_KEY = 'cockpit-search-history';
const MAX_HISTORY = 10;

export default function GlobalSearch() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // 加载搜索历史
  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);

  // 保存搜索历史
  const saveHistory = (q: string) => {
    if (!q.trim()) return;
    const entry = { query: q, timestamp: Date.now() };
    const next = [entry, ...history.filter(h => h.query !== q)].slice(0, MAX_HISTORY);
    setHistory(next);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  // 搜索 API
  const { data: results, isLoading } = useQuery({
    queryKey: ['global-search', query],
    queryFn: () => apiFetch(`/api/cockpit/search?q=${encodeURIComponent(query)}`),
    enabled: query.length > 1,
    staleTime: 30_000,
  });

  // 本地页面搜索 (始终可用)
  const localResults = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return ROUTES
      .filter(r => !r.hidden)
      .filter(r =>
        r.label.toLowerCase().includes(q) ||
        r.path.toLowerCase().includes(q) ||
        (r.subtitle && r.subtitle.toLowerCase().includes(q))
      )
      .map(r => ({
        id: r.id,
        type: 'page' as const,
        title: r.label,
        subtitle: r.subtitle,
        path: r.path,
        icon: r.icon,
      }));
  }, [query]);

  // 合并结果
  const allResults = useMemo(() => {
    const apiResults = (results as SearchResult[]) || [];
    // 去重
    const seen = new Set<string>();
    return [...localResults, ...apiResults].filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [localResults, results]);

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  // 导航到结果
  const navigateTo = (result: SearchResult) => {
    if (result.type === 'page' && result.path) {
      navigate(result.path);
      saveHistory(query);
      setIsOpen(false);
      setQuery('');
    }
  };

  // 键盘导航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, allResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && allResults[selectedIndex]) {
      navigateTo(allResults[selectedIndex]);
    }
  };

  const getResultIcon = (type: SearchResult['type']) => {
    switch (type) {
      case 'page': return <Hash size={14} className="text-blue-400" />;
      case 'task': return <Zap size={14} className="text-yellow-400" />;
      case 'document': return <FileText size={14} className="text-green-400" />;
      case 'command': return <Command size={14} className="text-purple-400" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />

      {/* Search Panel */}
      <div className="relative w-full max-w-xl bg-surface-1 border border-border-subtle rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 p-4 border-b border-border-subtle">
          <Search size={18} className="text-text-tertiary" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="搜索页面、任务、文档..."
            className="flex-1 bg-transparent text-text-primary placeholder:text-text-tertiary outline-none text-sm"
          />
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-surface-2 rounded">
            <X size={14} className="text-text-tertiary" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {!query && history.length > 0 && (
            <div className="p-2">
              <div className="px-3 py-1.5 text-xs text-text-tertiary">最近搜索</div>
              {history.slice(0, 5).map((h, i) => (
                <button
                  key={i}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:bg-surface-2 rounded"
                  onClick={() => setQuery(h.query)}
                >
                  <Clock size={12} className="text-text-tertiary" />
                  {h.query}
                </button>
              ))}
            </div>
          )}

          {query && allResults.length === 0 && !isLoading && (
            <div className="p-8 text-center text-text-tertiary text-sm">
              未找到相关内容
            </div>
          )}

          {allResults.map((result, i) => (
            <button
              key={result.id}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm ${
                i === selectedIndex ? 'bg-primary/10' : 'hover:bg-surface-2'
              }`}
              onClick={() => navigateTo(result)}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              {getResultIcon(result.type)}
              <div className="flex-1 min-w-0">
                <div className="text-text-primary truncate">{result.title}</div>
                {result.subtitle && (
                  <div className="text-text-tertiary text-xs truncate">{result.subtitle}</div>
                )}
              </div>
              <span className="text-xs text-text-tertiary uppercase">{result.type}</span>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-border-subtle text-xs text-text-tertiary">
          <span>↑↓ 导航</span>
          <span>↵ 选择</span>
          <span>Esc 关闭</span>
        </div>
      </div>
    </div>
  );
}

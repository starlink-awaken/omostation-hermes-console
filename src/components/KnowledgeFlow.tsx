/**
 * KnowledgeFlow — 知识流动时间线 (Phase 49 T4).
 *
 * 显示 KOS 知识库最新动态:
 * - 最近索引的文档
 * - 知识搜索结果
 * - 知识统计
 */

import React, { useState, useEffect } from 'react';
import { Search, FileText, TrendingUp, Clock } from 'lucide-react';

interface KnowledgeItem {
  title: string;
  score?: number;
  snippet?: string;
}

interface KnowledgeStats {
  total: number;
  recent: KnowledgeItem[];
}

const BRAIN_API = '/api/brain';
const KNOWLEDGE_API = '/api/knowledge';

export const KnowledgeFlow: React.FC = () => {
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 加载欢迎消息中的知识统计
    fetch(`${BRAIN_API}/context`)
      .then((r) => r.json())
      .then((data) => {
        if (data.total_conversations !== undefined) {
          setStats({
            total: data.total_conversations || 0,
            recent: [],
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const resp = await fetch(`${KNOWLEDGE_API}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim(), limit: 10 }),
      });
      const data = await resp.json();
      if (data.status === 'ok' && data.result) {
        const items = data.result?.items || data.result?.results || [];
        setResults(Array.isArray(items) ? items : []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d14] rounded-xl border border-[#1a1a2e] overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1a1a2e]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">
            📚 知识流动
          </h2>
          {stats && (
            <span className="text-xs text-gray-500">
              {stats.total}+ 条知识索引
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mt-1">
          探索 KOS 知识库，发现与你工作相关的内容
        </p>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-[#1a1a2e]">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="搜索知识库..."
            className="flex-1 px-3 py-2 rounded-lg bg-[#1a1a2e] border border-[#2a2a4e] text-white placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {results.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 mb-3">
              找到 {results.length} 个相关知识
            </p>
            {results.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a4e] hover:border-blue-500/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-sm text-white font-medium flex-1">
                    <FileText className="w-3 h-3 inline mr-2 text-blue-400" />
                    {item.title || '未知文档'}
                  </h4>
                  {item.score !== undefined && typeof item.score === 'number' && (
                    <span className="text-xs text-gray-500 ml-2">
                      {(item.score * 100).toFixed(0)}%
                    </span>
                  )}
                </div>
                {item.snippet && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {item.snippet}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mt-12">
            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-lg">知识流动中心</p>
            <p className="text-sm mt-2">
              搜索上方框探索 5193+ 篇 KOS 知识文档
            </p>
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-md mx-auto">
              <div className="p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a4e]">
                <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">每日更新</p>
              </div>
              <div className="p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a4e]">
                <FileText className="w-5 h-5 text-green-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">5193+ 文档</p>
              </div>
              <div className="p-3 rounded-lg bg-[#1a1a2e] border border-[#2a2a4e]">
                <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                <p className="text-xs text-gray-400">智能推荐</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default KnowledgeFlow;

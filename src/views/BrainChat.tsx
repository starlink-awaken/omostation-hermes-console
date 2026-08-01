/**
 * BrainChat — 个人数字大脑 Web Chat UI (Phase 48 MVP).
 *
 * 功能:
 * - 发送问题 → POST /api/brain/ask → 显示回答 + 知识来源
 * - 查看记忆 → GET /api/brain/context
 * - 查看历史 → GET /api/brain/history
 */

import React, { useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ id: string; title: string; score?: number }>;
  suggestions?: KnowledgeSuggestion[];
  timestamp: string;
}

interface KnowledgeSuggestion {
  title: string;
  score?: number;
  snippet?: string;
}

interface AskResponse {
  answer: string;
  sources: Array<{ id: string; title: string; score?: number }>;
  fallback: boolean;
  knowledge_suggestions?: KnowledgeSuggestion[];
  memory_used?: { preferences: number; history: number };
}

const BRAIN_API = '/api/brain';

export const BrainChat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 加载历史
    fetch(`${BRAIN_API}/history?limit=30`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMessages(
            data.map((h: any) => ({
              id: h.id || Math.random().toString(),
              role: h.role,
              content: h.content,
              sources: h.sources,
              timestamp: h.created_at || '',
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const resp = await fetch(`${BRAIN_API}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: userMsg.content }),
      });
      const data: AskResponse = await resp.json();

      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: data.answer || '抱歉，暂时无法回答。',
        sources: data.sources,
        suggestions: data.knowledge_suggestions,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: 'assistant',
          content: '❌ 网络错误，请稍后重试。',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#0d0d14] rounded-xl border border-[#1a1a2e] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1a1a2e]">
        <h2 className="text-lg font-semibold text-white">
          🧠 个人数字大脑
        </h2>
        <button
          onClick={() => setShowContext(!showContext)}
          className="px-3 py-1 text-sm rounded-md bg-[#1a1a2e] text-gray-300 hover:bg-[#2a2a4e] transition-colors"
        >
          {showContext ? '隐藏记忆' : '查看记忆'}
        </button>
      </div>

      {/* Context panel */}
      {showContext && <ContextPanel />}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-12">
            <p className="text-4xl mb-4">🧠</p>
            <p className="text-lg">你好！我是你的个人数字大脑。</p>
            <p className="text-sm mt-2">
              问我任何问题，我会结合你的知识库和记忆来回答。
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-gray-400">
            <span className="animate-pulse">●</span>
            <span className="animate-pulse">●</span>
            <span className="animate-pulse">●</span>
            <span className="ml-2">思考中...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="px-5 py-4 border-t border-[#1a1a2e]"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入你的问题..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-[#1a1a2e] border border-[#2a2a4e] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            发送
          </button>
        </div>
      </form>
    </div>
  );
};

const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-[#1a1a2e] text-gray-200 border border-[#2a2a4e]'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {message.content}
        </p>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#2a2a4e]">
            <p className="text-xs text-gray-400 mb-1">📚 知识来源:</p>
            {message.sources.slice(0, 3).map((s, i) => (
              <p key={i} className="text-xs text-gray-400">
                • {s.title}
                {s.score !== undefined && typeof s.score === 'number'
                  ? ` (${(s.score * 100).toFixed(0)}%)`
                  : ''}
              </p>
            ))}
          </div>
        )}
        {/* 知识推荐 (Phase 49 T2) */}
        {message.suggestions && message.suggestions.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#2a2a4e]">
            <p className="text-xs text-blue-400 mb-1">💡 相关知识推荐:</p>
            {message.suggestions.slice(0, 3).map((s, i) => (
              <div key={i} className="text-xs text-gray-400 mb-1">
                <span className="text-blue-300">• {s.title}</span>
                {s.score !== undefined && typeof s.score === 'number' && (
                  <span className="text-gray-500 ml-1">{(s.score * 100).toFixed(0)}%</span>
                )}
                {s.snippet && (
                  <p className="text-gray-500 ml-3 truncate">{s.snippet}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ContextPanel: React.FC = () => {
  const [prefs, setPrefs] = useState<Array<{ key: string; value: string }>>([]);

  useEffect(() => {
    fetch(`${BRAIN_API}/context`)
      .then((r) => r.json())
      .then((data) => {
        if (data.preferences) setPrefs(data.preferences);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="px-5 py-3 bg-[#12121c] border-b border-[#1a1a2e]">
      <h3 className="text-sm font-medium text-gray-400 mb-2">
        📌 用户偏好 ({prefs.length})
      </h3>
      {prefs.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {prefs.slice(0, 8).map((p, i) => (
            <span
              key={i}
              className="px-2 py-1 text-xs rounded-md bg-[#1a1a2e] text-gray-300 border border-[#2a2a4e]"
            >
              {p.key}: {p.value}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-500">暂无记忆</p>
      )}
    </div>
  );
};

export default BrainChat;

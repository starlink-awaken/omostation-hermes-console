/**
 * LogViewerPage with React Query integration.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, Download, RefreshCw, Pause, Play, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

// ── Types ──

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

interface LogListResponse {
  items: LogEntry[];
}

// ── Hook ──

function useLogs() {
  return useQuery({
    queryKey: ['logs'],
    queryFn: async () => {
      const response = await apiFetch<LogListResponse>('/api/logs?limit=100');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch logs');
      }
      return response.data?.items || [];
    },
    staleTime: 10000,
    refetchInterval: 10000,
    retry: 3,
  });
}

// ── Component ──

type LogLevel = 'all' | 'debug' | 'info' | 'warning' | 'error' | 'fatal';

export default function LogViewerPageWithQuery() {
  const [isStreaming, setIsStreaming] = useState(true);
  const [filterLevel, setFilterLevel] = useState<LogLevel>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: logs, isLoading, error } = useLogs();

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'fatal':
      case 'error':
        return '#e74c3c';
      case 'warning':
        return '#f39c12';
      case 'info':
        return '#3498db';
      case 'debug':
        return '#95a5a6';
      default:
        return '#95a5a6';
    }
  };

  const getLevelBg = (level: LogEntry['level']) => {
    switch (level) {
      case 'fatal':
      case 'error':
        return 'rgba(255, 71, 87, 0.08)';
      case 'warning':
        return 'rgba(255, 184, 0, 0.08)';
      case 'info':
        return 'rgba(52, 152, 219, 0.08)';
      case 'debug':
        return 'rgba(149, 165, 166, 0.08)';
      default:
        return 'transparent';
    }
  };

  const displayLogs = logs || [];
  const sources = [...new Set(displayLogs.map((log) => log.source))];

  // Filter logs
  const filteredLogs = displayLogs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterSource !== 'all' && log.source !== filterSource) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>日志查看器</h1>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className={`antd-btn ${isStreaming ? 'antd-btn-primary' : ''}`}
            onClick={() => setIsStreaming(!isStreaming)}
            aria-label={isStreaming ? '暂停流' : '恢复流'}
          >
            {isStreaming ? <Pause size={14} /> : <Play size={14} />}
            <span>{isStreaming ? '暂停' : '恢复'}</span>
          </button>
          <button
            className="antd-btn"
            onClick={() => setAutoScroll(!autoScroll)}
            aria-label={autoScroll ? '关闭自动滚动' : '开启自动滚动'}
          >
            <RefreshCw size={14} className={autoScroll ? 'spinning' : ''} />
            <span>自动滚动</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <select
          value={filterLevel}
          onChange={(e) => setFilterLevel(e.target.value as LogLevel)}
          className="antd-input"
          aria-label="按级别过滤"
        >
          <option value="all">所有级别</option>
          <option value="fatal">致命</option>
          <option value="error">错误</option>
          <option value="warning">警告</option>
          <option value="info">信息</option>
          <option value="debug">调试</option>
        </select>
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value)}
          className="antd-input"
          aria-label="按来源过滤"
        >
          <option value="all">所有来源</option>
          {sources.map((source) => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="搜索日志..."
          className="antd-input"
          style={{ flex: 1 }}
          aria-label="搜索日志"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '8px' }} />
          <div>加载中...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div role="alert" style={{ 
          padding: '16px', 
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Search size={16} />
            <strong>日志加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Log List */}
      {!isLoading && (
        <div 
          ref={containerRef}
          style={{ 
            maxHeight: '600px', 
            overflow: 'auto',
            border: '1px solid var(--antd-border-color)',
            borderRadius: 'var(--antd-radius-md)',
          }}
        >
          {filteredLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
              <Search size={24} className="text-muted" style={{ marginBottom: '8px' }} />
              <div>暂无日志</div>
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div
                key={`${log.timestamp}-${index}`}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--antd-border-color)',
                  background: getLevelBg(log.level),
                  fontSize: '13px',
                  fontFamily: 'monospace',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <span style={{ 
                    color: getLevelColor(log.level), 
                    fontWeight: 600,
                    minWidth: '60px',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                  }}>
                    {log.level}
                  </span>
                  <span style={{ color: 'var(--antd-text-muted)', minWidth: '80px', fontSize: '12px' }}>
                    {log.source}
                  </span>
                  <span style={{ color: 'var(--antd-text-secondary)', minWidth: '180px', fontSize: '12px' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                  <span style={{ flex: 1, color: 'var(--antd-text-primary)', wordBreak: 'break-all' }}>
                    {log.message}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}

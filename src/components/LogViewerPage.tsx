/**
 * LogViewerPage — 日志查看器.
 *
 * 从 fullsite 移植的改进:
 *   - 分页加载 (load-more) + Map 去重
 *   - CSV 导出 (Blob + createObjectURL)
 *   - 流式暂停/恢复 (5s 轮询)
 *   - 三维筛选 (level + source + search)
 *   - 错误/热点源自动识别
 *   - 空数据/错误态 a11y
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Pause, Play, RefreshCw, Search, Trash2 } from 'lucide-react';

// ── Types ──

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  source: string;
  message: string;
  metadata?: Record<string, unknown>;
}

type LogLevel = 'all' | 'debug' | 'info' | 'warning' | 'error' | 'fatal';

interface LogListResponse {
  items: LogEntry[];
  total?: number;
  offset?: number;
  has_more?: boolean;
}

// ── Component ──

export default function LogViewerPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [logTotal, setLogTotal] = useState(0);
  const [logOffset, setLogOffset] = useState(0);
  const [logHasMore, setLogHasMore] = useState(false);
  const [logLoadingMore, setLogLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(true);
  const [filterLevel, setFilterLevel] = useState<LogLevel>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState('');
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshLogs = useCallback(async () => {
    try {
      const response = await fetch('/api/logs?limit=100');
      if (!response.ok) throw new Error('日志数据不可用');
      const data: LogListResponse = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setLogs(items);
      setLogTotal(typeof data.total === 'number' ? data.total : items.length);
      setLogOffset(typeof data.offset === 'number' ? data.offset + items.length : items.length);
      setLogHasMore(typeof data.has_more === 'boolean' ? data.has_more : items.length >= 100);
      setError('');
    } catch (err) {
      console.error('Failed to fetch logs:', err);
      setError(err instanceof Error ? err.message : '日志数据不可用');
    } finally {
      setLoading(false);
    }
  }, []);

  // 分页加载更多
  const loadMoreLogs = useCallback(async () => {
    if (logLoadingMore || !logHasMore) return;
    setLogLoadingMore(true);
    try {
      const response = await fetch(`/api/logs?limit=100&offset=${logOffset}`);
      if (!response.ok) throw new Error('更多日志数据不可用');
      const data: LogListResponse = await response.json();
      const items = Array.isArray(data.items) ? data.items : [];
      setLogs((current) => {
        const merged = new Map(current.map((log) => [`${log.timestamp}|${log.source}|${log.message}`, log]));
        items.forEach((log) => {
          merged.set(`${log.timestamp}|${log.source}|${log.message}`, log);
        });
        return [...merged.values()];
      });
      setLogTotal(typeof data.total === 'number' ? data.total : logTotal);
      setLogOffset(logOffset + items.length);
      setLogHasMore(typeof data.has_more === 'boolean' ? data.has_more : items.length >= 100);
    } catch (loadError) {
      console.error('Failed to load more logs:', loadError);
      setError(loadError instanceof Error ? loadError.message : '更多日志数据不可用');
    } finally {
      setLogLoadingMore(false);
    }
  }, [logHasMore, logLoadingMore, logOffset, logTotal]);

  useEffect(() => {
    void refreshLogs();
    if (!isStreaming) return undefined;
    const interval = setInterval(() => void refreshLogs(), 5000);
    return () => clearInterval(interval);
  }, [isStreaming, refreshLogs]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current && typeof logsEndRef.current.scrollIntoView === 'function') {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // CSV 导出
  const handleExport = () => {
    if (filteredLogs.length === 0) return;
    const header = 'timestamp,level,source,message\n';
    const rows = filteredLogs.map((log) => {
      const msg = log.message.replace(/"/g, '""');
      return `"${log.timestamp}","${log.level}","${log.source}","${msg}"`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cockpit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 清除日志
  const handleClear = () => {
    setLogs([]);
    setLogOffset(0);
    setLogHasMore(false);
    setIsStreaming(false);
  };

  const getLevelColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'debug': return '#95a5a6';
      case 'info': return '#3498db';
      case 'warning': return '#f39c12';
      case 'error': return '#e74c3c';
      case 'fatal': return '#c0392b';
      default: return '#95a5a6';
    }
  };

  const getLevelBgColor = (level: LogEntry['level']) => {
    switch (level) {
      case 'debug': return 'rgba(255, 255, 255, 0.02)';
      case 'info': return 'rgba(52, 152, 219, 0.04)';
      case 'warning': return 'rgba(243, 156, 18, 0.06)';
      case 'error': return 'rgba(231, 76, 60, 0.08)';
      case 'fatal': return 'rgba(192, 57, 43, 0.12)';
      default: return 'transparent';
    }
  };

  const displayLogs = logs || [];
  const sources = [...new Set(displayLogs.map((log) => log.source))];

  // 三维筛选
  const filteredLogs = displayLogs.filter((log) => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterSource !== 'all' && log.source !== filterSource) return false;
    if (searchQuery) {
      const searchableText = [
        log.timestamp,
        log.level,
        log.source,
        log.message,
        log.metadata ? JSON.stringify(log.metadata) : '',
      ].filter(Boolean).join(' ').toLowerCase();
      if (!searchableText.includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  // 错误/热点源自动识别
  const criticalLogs = filteredLogs.filter((log) => log.level === 'error' || log.level === 'fatal');
  const hotSources = [...new Set((criticalLogs.length ? criticalLogs : filteredLogs).map((log) => log.source))].slice(0, 3);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Search size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>日志查看器</h1>
          {logTotal > 0 && (
            <span style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
              ({logTotal} 条)
            </span>
          )}
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
            onClick={handleExport}
            aria-label="导出日志"
            disabled={filteredLogs.length === 0}
          >
            <Download size={14} />
            <span>导出 CSV</span>
          </button>
          <button
            className="antd-btn"
            onClick={handleClear}
            aria-label="清除日志"
          >
            <Trash2 size={14} />
            <span>清除</span>
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

      {/* 热点源提示 */}
      {hotSources.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
          <AlertTriangle size={14} style={{ color: criticalLogs.length > 0 ? 'var(--antd-warning)' : 'var(--antd-text-muted)' }} />
          <span>热点源: {hotSources.join(', ')}</span>
          {criticalLogs.length > 0 && (
            <span style={{ color: 'var(--antd-error)' }}>
              ({criticalLogs.length} 条错误)
            </span>
          )}
        </div>
      )}

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
        <span style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', whiteSpace: 'nowrap' }}>
          {filteredLogs.length}/{displayLogs.length} 条
        </span>
      </div>

      {/* Loading State */}
      {loading && logs.length === 0 && (
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
            <AlertTriangle size={16} />
            <strong>日志加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error}</div>
          <button
            className="antd-btn"
            style={{ marginTop: '8px' }}
            onClick={() => { setLoading(true); void refreshLogs(); }}
          >
            <RefreshCw size={14} />
            <span>重试</span>
          </button>
        </div>
      )}

      {/* Log List */}
      {!loading && !error && (
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
                key={`${log.timestamp}-${log.source}-${index}`}
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid var(--antd-border-color)',
                  background: getLevelBgColor(log.level),
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
          {/* 加载更多 */}
          {logHasMore && (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <button
                className="antd-btn"
                onClick={loadMoreLogs}
                disabled={logLoadingMore}
              >
                {logLoadingMore ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
          <div ref={logsEndRef} />
        </div>
      )}
    </div>
  );
}

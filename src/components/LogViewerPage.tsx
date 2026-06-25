import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, RefreshCw, Pause, Play, Trash2 } from 'lucide-react';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

type LogLevel = 'all' | 'debug' | 'info' | 'warning' | 'error' | 'fatal';

export default function LogViewerPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(true);
  const [filterLevel, setFilterLevel] = useState<LogLevel>('all');
  const [filterSource, setFilterSource] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const response = await fetch('/api/logs?limit=100');
        if (response.ok) {
          const data = await response.json();
          setLogs(data.items || []);
        }
      } catch (error) {
        console.error('Failed to fetch logs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();

    // 模拟实时日志流
    const interval = setInterval(() => {
      if (isStreaming) {
        const newLog: LogEntry = {
          timestamp: new Date().toISOString(),
          level: ['info', 'warning', 'error', 'debug'][Math.floor(Math.random() * 4)] as LogEntry['level'],
          source: ['agora', 'kairon', 'gbrain', 'runtime', 'cockpit'][Math.floor(Math.random() * 5)],
          message: `Log message ${Date.now()}`,
        };
        setLogs(prev => [...prev.slice(-999), newLog]);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isStreaming]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

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

  const filteredLogs = logs.filter(log => {
    if (filterLevel !== 'all' && log.level !== filterLevel) return false;
    if (filterSource !== 'all' && log.source !== filterSource) return false;
    if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleExport = () => {
    const csv = [
      'timestamp,level,source,message',
      ...filteredLogs.map(log => 
        `${log.timestamp},${log.level},${log.source},"${log.message}"`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setLogs([]);
  };

  const sources = [...new Set(logs.map(log => log.source))];

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div className="log-viewer-page">
      {/* 工具栏 */}
      <div className="log-toolbar">
        <div className="log-filters">
          <div className="filter-group">
            <Search size={16} />
            <input
              type="text"
              placeholder="搜索日志..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value as LogLevel)}
          >
            <option value="all">全部级别</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warning">Warning</option>
            <option value="error">Error</option>
            <option value="fatal">Fatal</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
          >
            <option value="all">全部来源</option>
            {sources.map(source => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>
        <div className="log-actions">
          <button
            className={`btn btn-sm ${isStreaming ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setIsStreaming(!isStreaming)}
          >
            {isStreaming ? <Pause size={14} /> : <Play size={14} />}
            {isStreaming ? '暂停' : '继续'}
          </button>
          <button
            className={`btn btn-sm ${autoScroll ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            <RefreshCw size={14} />
            自动滚动
          </button>
          <button className="btn btn-sm btn-outline" onClick={handleExport}>
            <Download size={14} />
            导出
          </button>
          <button className="btn btn-sm btn-outline" onClick={handleClear}>
            <Trash2 size={14} />
            清空
          </button>
        </div>
      </div>

      {/* 日志统计 */}
      <div className="log-stats">
        <span>总计: {filteredLogs.length} 条</span>
        <span>Debug: {filteredLogs.filter(l => l.level === 'debug').length}</span>
        <span>Info: {filteredLogs.filter(l => l.level === 'info').length}</span>
        <span>Warning: {filteredLogs.filter(l => l.level === 'warning').length}</span>
        <span>Error: {filteredLogs.filter(l => l.level === 'error').length}</span>
      </div>

      {/* 日志列表 */}
      <div className="log-container" ref={containerRef}>
        <table className="log-table">
          <thead>
            <tr>
              <th className="log-timestamp">时间</th>
              <th className="log-level">级别</th>
              <th className="log-source">来源</th>
              <th className="log-message">消息</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log, index) => (
              <tr
                key={index}
                style={{ backgroundColor: getLevelBgColor(log.level) }}
              >
                <td className="log-timestamp">
                  {new Date(log.timestamp).toLocaleTimeString('zh-CN')}
                </td>
                <td className="log-level">
                  <span
                    className="level-badge"
                    style={{ 
                      color: getLevelColor(log.level),
                      borderColor: getLevelColor(log.level),
                    }}
                  >
                    {log.level.toUpperCase()}
                  </span>
                </td>
                <td className="log-source">{log.source}</td>
                <td className="log-message">{log.message}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

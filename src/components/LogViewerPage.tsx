import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, Pause, Play, RefreshCw, Search, Trash2 } from 'lucide-react';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';
import RuntimeOpsWorkbench from './RuntimeOpsWorkbench';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal';
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

type LogLevel = 'all' | 'debug' | 'info' | 'warning' | 'error' | 'fatal';

interface LogViewerPageProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type LogClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesLogFocusQuery(values: Array<string | null | undefined>, query?: string | null) {
  if (!query) return false;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}

export default function LogViewerPage({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: LogViewerPageProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
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
      if (!response.ok) throw new Error('真实日志数据不可用');
      const data = await response.json();
      setLogs(data.items || []);
      setError('');
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      setError(error instanceof Error ? error.message : '真实日志数据不可用');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (!focusTaskQuery) return;
    const matchedSource = logs.find((log) => matchesLogFocusQuery([log.source], focusTaskQuery))?.source;
    if (matchedSource) {
      setFilterSource(matchedSource);
      return;
    }
    setSearchQuery(focusTaskQuery);
  }, [focusTaskQuery, logs]);

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
  const criticalLogs = filteredLogs.filter((log) => log.level === 'error' || log.level === 'fatal');
  const hotSources = [...new Set((criticalLogs.length ? criticalLogs : filteredLogs).map((log) => log.source))].slice(0, 3);
  const closureCriticalLogs = logs.filter((log) => log.level === 'error' || log.level === 'fatal');
  const closureHotSources = [...new Set((closureCriticalLogs.length ? closureCriticalLogs : logs).map((log) => log.source))].slice(0, 3);
  const firstCriticalLog = closureCriticalLogs[0] || logs[0] || null;
  const firstHotSource = closureHotSources[0] || null;
  const logClosureRows: LogClosureRow[] = [
    {
      id: 'alerts-correlation',
      title: '告警关联与异常定级',
      summary: '日志里看到 error/fatal 还不够，先回告警中心确认它是不是已经形成正式异常事件。',
      signal: firstCriticalLog ? `高优 ${closureCriticalLogs.length}` : '暂无高优错误',
      nextAction: firstCriticalLog
        ? `围绕 ${firstCriticalLog.source} 回告警中心核对事件级别和处理状态。`
        : '当前没有明显高优错误，抽查一次日志到告警中心的承接链是否还能走通。',
      statusTone: firstCriticalLog ? 'degraded' : 'online',
      objectTarget: { tab: 'AlertCenter', taskQuery: firstCriticalLog?.source || 'logs-alerts' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstCriticalLog?.source || 'logs-alerts' },
    },
    {
      id: 'performance-correlation',
      title: '性能波动与时间点追证',
      summary: '很多日志报错是性能抖动的结果，不把时间点带去性能页，容易一直在文字层面转圈。',
      signal: firstHotSource ? `来源 ${firstHotSource}` : `日志 ${filteredLogs.length}`,
      nextAction: firstHotSource
        ? `结合 ${firstHotSource} 的报错时间点去性能页看资源和延迟波动。`
        : '当前没有明显热点来源，抽查一次日志到性能页的时间点联动是否还可用。',
      statusTone: firstHotSource ? 'degraded' : 'online',
      objectTarget: { tab: 'Performance', taskQuery: firstHotSource || 'logs-performance' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstHotSource || 'logs-performance' },
    },
    {
      id: 'systemmap-handoff',
      title: '系统地图缺口回挂',
      summary: '重复错误不能只留在日志页，它们要回系统地图挂成全站缺口，才能进入真正的治理视角。',
      signal: firstCriticalLog ? `待回挂 ${closureCriticalLogs.length}` : '待抽查回挂',
      nextAction: firstCriticalLog
        ? `把 ${firstCriticalLog.source} 反复出现的问题回挂到系统地图，确认影响的是哪条路径和哪页。`
        : '当前没有明显重复错误，抽查一次日志到系统地图的缺口回挂链路。',
      statusTone: firstCriticalLog ? 'degraded' : 'online',
      objectTarget: { tab: 'SystemMap', pageId: 'LogViewer' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstCriticalLog?.source || 'LogViewer' },
    },
    {
      id: 'task-closeout',
      title: '任务承接与长期追踪',
      summary: '日志是证据，不是终点。真正需要反复看的错误源，最后都得沉进任务中心持续跟。',
      signal: firstHotSource ? `待承接 ${closureHotSources.length}` : '当前无热点源',
      nextAction: firstHotSource
        ? `把 ${firstHotSource} 相关的追查动作沉到任务中心，别靠人工记忆继续盯。`
        : '当前没有明显热点源，抽查一次日志问题到任务中心的 closeout 链路。',
      statusTone: firstHotSource ? 'degraded' : 'online',
      objectTarget: { tab: 'LogViewer', taskQuery: firstHotSource || 'logs-task-closeout' },
      taskTarget: { tab: 'TaskCenter', taskQuery: firstHotSource || 'logs-task-closeout' },
    },
  ];
  const focusedLogCard = (() => {
    const matchedLog = logs.find((log) => (
      matchesLogFocusQuery([log.source, log.level, log.message], focusTaskQuery)
    ));
    if (matchedLog) {
      return {
        kicker: '日志对象',
        title: matchedLog.source,
        detail: `${matchedLog.level.toUpperCase()} · ${matchedLog.message}`,
        objectTarget: { tab: 'LogViewer', taskQuery: matchedLog.source },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedLog.source },
      };
    }

    const matchedClosure = logClosureRows.find((row) => (
      matchesLogFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '日志闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'LogViewer') {
      return {
        kicker: '当前页面',
        title: '日志查看器',
        detail: '这页负责把错误源、外围告警和性能证据串起来，不只是无尽地刷日志列表。',
        objectTarget: { tab: 'SystemMap', pageId: 'LogViewer' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'LogViewer' },
      };
    }

    return null;
  })();
  const logActionItems = [
    {
      id: 'logs-alerts',
      title: '回告警中心核对异常',
      detail: '先确认这些错误是否已经形成告警事件，避免只在日志页单点排查。',
      actionLabel: '进入告警页',
      actionType: 'navigate' as const,
      actionValue: 'AlertCenter',
    },
    {
      id: 'logs-performance',
      title: '回性能页看波动',
      detail: '报错前后如果有性能抖动，直接回性能页看趋势和服务状态。',
      actionLabel: '进入性能页',
      actionType: 'navigate' as const,
      actionValue: 'Performance',
    },
    {
      id: 'logs-tasks',
      title: '挂任务继续治理',
      detail: '反复出现的错误源要转成任务承接，别只停在人工刷日志。',
      actionLabel: '进入任务中心',
      actionType: 'navigate' as const,
      actionValue: 'TaskCenter',
    },
  ];

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

  if (error) {
    return (
      <div className="log-viewer-page">
        <RuntimeOpsWorkbench currentPage="LogViewer" onNavigate={onNavigate} />
        <ActionSurfacePanel
          title="日志动作区"
          subtitle="日志暂不可用时，先回告警和性能页确认外围证据，再回来重试。"
          statusText="日志数据不可用"
          items={logActionItems}
          onNavigate={onNavigate}
        />
        <div role="alert" className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Search size={32} className="text-warning" />
          <h3>{error}</h3>
          <p>日志页只展示真实运行日志，不生成模拟内容。</p>
          <button className="btn btn-outline" onClick={() => { setLoading(true); void refreshLogs(); }}>重试日志读取</button>
        </div>
      </div>
    );
  }

  return (
    <div className="log-viewer-page">
      <RuntimeOpsWorkbench currentPage="LogViewer" onNavigate={onNavigate} />

      <ActionSurfacePanel
        title="日志动作区"
        subtitle="先聚焦错误源，再切告警和性能页确认外围证据，最后把重复问题挂任务。"
        statusText={filteredLogs.length ? `${filteredLogs.length} 条过滤后日志` : '等待日志样本'}
        items={logActionItems}
        onNavigate={onNavigate}
      />

      {focusedLogCard && (
        <section className="services-section overview-ops-panel" aria-label="当前日志承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前日志承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把搜索、告警或性能页带来的上下文，直接落到当前该追的日志源。
              </p>
            </div>
            <span className="status-badge online">{focusedLogCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedLogCard.title}</strong>
              <p>{focusedLogCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开日志焦点对象 ${focusedLogCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedLogCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Search size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开日志焦点任务 ${focusedLogCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedLogCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <AlertTriangle size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section" role="region" aria-label="日志闭环总表">
        <div className="section-header">
          <div>
            <h2>日志闭环总表</h2>
            <p className="text-muted">把告警定级、性能追证、系统地图回挂和任务承接并排摆出来，日志页才不只是滚动刷文本。</p>
          </div>
          <span className="status-badge online">{logClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {logClosureRows.map((row) => (
            <article
              key={`log-closure-${row.id}`}
              className="antd-card"
              style={{ padding: 18, display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(0, 1fr) auto', gap: 16, alignItems: 'center' }}
            >
              <div style={{ display: 'grid', gap: 6 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <strong style={{ fontSize: 15 }}>{row.title}</strong>
                  <span className={`status-badge ${row.statusTone}`}>{row.signal}</span>
                </div>
                <p className="text-muted" style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{row.summary}</p>
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                <small className="text-muted">下一步</small>
                <span style={{ fontSize: 13, lineHeight: 1.6 }}>{row.nextAction}</span>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开日志闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <Search size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开日志闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <AlertTriangle size={14} />
                  <span>打开任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2>日志承接工作台</h2>
            <p className="text-muted">把高优先级日志源、证据去向和后续承接页放一起，不让日志页只剩滚动表格。</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">错误级 {criticalLogs.length}</span>
            <span className="status-badge online">来源 {hotSources.length}</span>
            <span className="status-badge degraded">流式 {isStreaming ? 'on' : 'off'}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>高优先级日志源</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>优先处理出现 error/fatal 的来源，再回告警与性能页做交叉确认。</p>
            </div>
            {hotSources.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有可追踪日志源。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {hotSources.map((source) => (
                  <button
                    key={`source-${source}`}
                    type="button"
                    className="action-surface-item"
                    aria-label={`查看日志来源 ${source}`}
                    onClick={() => setFilterSource(source)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    <div>
                      <strong>{source}</strong>
                      <p>{filteredLogs.filter((log) => log.source === source).length} 条相关日志</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>点击后直接筛到该来源。</span>
                    </div>
                    <AlertTriangle size={14} />
                  </button>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>追证据去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>日志本身不够，需要继续回告警、性能和系统地图收口。</p>
            </div>
            {[
              { id: 'AlertCenter', label: '告警中心', reason: '确认是否已形成异常事件。', aria: '打开日志承接到告警页' },
              { id: 'Performance', label: '性能页', reason: '结合时间点看资源波动。', aria: '打开日志承接到性能页' },
              { id: 'SystemMap', label: '系统地图', reason: '把重复错误挂回全站缺口。', aria: '打开日志承接到系统地图' },
            ].map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={page.aria}
                onClick={() => onNavigate?.(page.id)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.label}</strong>
                  <p>{page.reason}</p>
                </div>
                <Search size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

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
        {filteredLogs.length === 0 && (
          <div className="empty-state" style={{ padding: 24 }}>
            <span>暂无真实日志</span>
          </div>
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  );
}

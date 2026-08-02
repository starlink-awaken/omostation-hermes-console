import { useEffect, useState } from 'react';
import HealthSummarySection from './home/HealthSummarySection';
import AlertFeedSection from './home/AlertFeedSection';
import MetricsTrendSection from './home/MetricsTrendSection';
import RecentTasksSection from './home/RecentTasksSection';
import GovernanceOverviewSection from './home/GovernanceOverviewSection';
import HomeFocusSection, { type HomeFocusPayload } from './home/HomeFocusSection';
import { openCockpitNavigationTarget } from './cockpitNavigation';
import type { HealthSummary, CockpitAlert, CockpitTask, DataPoint } from '../types/cockpit';

type DataQuality = 'loading' | 'complete' | 'partial' | 'unavailable';
type HomeSource = 'summary' | 'alerts' | 'tasks' | 'metrics' | 'thoughts' | 'focus';

interface HomePageProps {
  onTabChange?: (tab: string) => void;
}

interface Thought {
  role: string;
  name: string;
  avatar: string;
  content: string;
}

interface MetricsResponse {
  health_score?: DataPoint[];
  requests?: DataPoint[];
  error_rate?: DataPoint[];
}

interface ThoughtsResponse {
  status?: string;
  thoughts?: Thought[];
}

interface ReadSuccess<T> {
  ok: true;
  data: T;
}

interface ReadFailure {
  ok: false;
  source: HomeSource;
}

type ReadResult<T> = ReadSuccess<T> | ReadFailure;

const SOURCE_LABELS: Record<HomeSource, string> = {
  summary: '健康摘要',
  alerts: '告警列表',
  tasks: '任务列表',
  metrics: '指标趋势',
  thoughts: '心智探针',
  focus: '工作焦点',
};

async function readHomeSource<T>(source: HomeSource, url: string): Promise<ReadResult<T>> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { ok: false, source };
    }
    return { ok: true, data: await response.json() as T };
  } catch {
    return { ok: false, source };
  }
}

function ThoughtStreamSection({ thoughts }: { thoughts: Thought[] }) {
  if (thoughts.length === 0) return null;

  const roleColors: Record<string, string> = {
    builder: 'var(--antd-primary)',
    devil: 'var(--antd-error)',
    sage: 'var(--antd-warning)',
    keeper: 'var(--antd-success)',
  };

  return (
    <div className="services-section animate-fade-in" style={{ marginTop: 0, marginBottom: 24 }}>
      <div className="section-header" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--antd-text-secondary)', margin: 0 }}>
          <span aria-hidden="true">🧠</span>
          虚拟董事会心智探针 (Thought Streams)
        </h3>
        <span style={{ fontSize: 10.5, color: 'rgba(255,255,255,0.3)' }}>实时系统洞察与架构审查</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {thoughts.map((thought) => (
          <div
            key={thought.role}
            className="antd-card"
            style={{
              padding: '16px 20px',
              borderLeft: `3px solid ${roleColors[thought.role] || 'rgba(255,255,255,0.1)'}`,
              background: 'rgba(255,255,255,0.01)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--antd-text-primary)' }}>
                <span>{thought.avatar}</span>
                <span>{thought.name}</span>
              </span>
              <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>
                {thought.role}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.5, color: 'rgba(255,255,255,0.7)', wordBreak: 'break-all' }}>
              {thought.content}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage({ onTabChange }: HomePageProps) {
  void onTabChange;
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [alerts, setAlerts] = useState<CockpitAlert[]>([]);
  const [tasks, setTasks] = useState<CockpitTask[]>([]);
  const [healthScoreData, setHealthScoreData] = useState<DataPoint[]>([]);
  const [requestsData, setRequestsData] = useState<DataPoint[]>([]);
  const [errorRateData, setErrorRateData] = useState<DataPoint[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [focus, setFocus] = useState<HomeFocusPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [dataQuality, setDataQuality] = useState<DataQuality>('loading');
  const [sourceQuality, setSourceQuality] = useState<Record<HomeSource, DataQuality>>({
    summary: 'loading',
    alerts: 'loading',
    tasks: 'loading',
    metrics: 'loading',
    thoughts: 'loading',
    focus: 'loading',
  });
  const [degradedReasons, setDegradedReasons] = useState<string[]>([]);

  useEffect(() => {
    let disposed = false;

    const fetchData = async () => {
      setLoading(true);
      setDataQuality('loading');
      setSourceQuality({
        summary: 'loading',
        alerts: 'loading',
        tasks: 'loading',
        metrics: 'loading',
        thoughts: 'loading',
        focus: 'loading',
      });
      setDegradedReasons([]);
      setHealthSummary(null);
      setAlerts([]);
      setTasks([]);
      setHealthScoreData([]);
      setRequestsData([]);
      setErrorRateData([]);
      setThoughts([]);
      setFocus(null);
      const [summary, alertFeed, recentTasks, metrics, thoughtsFeed, focusPayload] = await Promise.all([
        readHomeSource<HealthSummary>('summary', '/api/health/summary'),
        readHomeSource<{ items?: CockpitAlert[] }>('alerts', '/api/alerts?limit=3&status=active'),
        readHomeSource<{ items?: CockpitTask[] }>('tasks', '/api/tasks?limit=3&sort=updated'),
        readHomeSource<MetricsResponse>('metrics', '/api/metrics/trend?range=24h'),
        readHomeSource<ThoughtsResponse>('thoughts', '/api/omos/thoughts'),
        readHomeSource<HomeFocusPayload>('focus', '/api/cockpit/system-map'),
      ]);

      if (disposed) return;

      const results: ReadResult<unknown>[] = [summary, alertFeed, recentTasks, metrics, thoughtsFeed, focusPayload];
      const failedSources = results
        .filter((result): result is ReadFailure => !result.ok)
        .map((result) => SOURCE_LABELS[result.source]);
      const successCount = results.length - failedSources.length;
      const nextQuality: DataQuality = failedSources.length === 0
        ? 'complete'
        : successCount === 0
          ? 'unavailable'
          : 'partial';
      const qualityFor = (result: ReadResult<unknown>): DataQuality => result.ok ? 'complete' : 'unavailable';

      setHealthSummary(summary.ok ? summary.data : null);
      setAlerts(alertFeed.ok ? alertFeed.data.items ?? [] : []);
      setTasks(recentTasks.ok ? recentTasks.data.items ?? [] : []);
      setHealthScoreData(metrics.ok ? metrics.data.health_score ?? [] : []);
      setRequestsData(metrics.ok ? metrics.data.requests ?? [] : []);
      setErrorRateData(metrics.ok ? metrics.data.error_rate ?? [] : []);
      setThoughts(thoughtsFeed.ok && thoughtsFeed.data.status === 'ok' ? thoughtsFeed.data.thoughts ?? [] : []);
      setFocus(focusPayload.ok ? focusPayload.data : null);
      setSourceQuality({
        summary: qualityFor(summary),
        alerts: qualityFor(alertFeed),
        tasks: qualityFor(recentTasks),
        metrics: qualityFor(metrics),
        thoughts: qualityFor(thoughtsFeed),
        focus: qualityFor(focusPayload),
      });
      setDataQuality(nextQuality);
      setDegradedReasons(failedSources);
      setLoading(false);
    };

    void fetchData();
    const interval = setInterval(() => void fetchData(), 30000);
    return () => {
      disposed = true;
      clearInterval(interval);
    };
  }, []);

  const homeMessage = loading
    ? '正在读取真实首页数据'
    : dataQuality === 'complete'
      ? null
      : dataQuality === 'partial'
        ? `首页部分数据暂不可用：${degradedReasons.join('、')}。未展示默认运行状态。`
        : '首页数据暂不可用，当前未展示模拟或默认运行状态。';

  return (
    <div className="home-page">
      {homeMessage && (
        <div className="shell-data-banner" role={loading ? 'status' : 'alert'}>
          {homeMessage}
        </div>
      )}

      <HomeFocusSection
        focus={focus}
        dataQuality={sourceQuality.focus}
        onOpenProject={(projectId) => openCockpitNavigationTarget({ tab: 'SystemMap', focusProjectId: projectId })}
        onViewTasks={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system-map-focus' })}
      />

      <HealthSummarySection
        healthScore={healthSummary?.health_score ?? 0}
        healthScoreChange={healthSummary?.health_score_change ?? 0}
        activeServices={healthSummary?.active_services ?? 0}
        totalServices={healthSummary?.total_services ?? 0}
        activeTasks={healthSummary?.active_tasks ?? 0}
        activeTasksSource={healthSummary ? healthSummary.active_tasks_source ?? 'omo' : 'unavailable'}
        todayRequests={healthSummary?.today_requests ?? 0}
        todayRequestsChange={healthSummary?.today_requests_change ?? 0}
        dataQuality={sourceQuality.summary}
        degradedReasons={sourceQuality.summary === 'unavailable' ? ['健康摘要不可用'] : []}
      />

      <ThoughtStreamSection thoughts={thoughts} />

      <AlertFeedSection
        alerts={alerts}
        dataQuality={sourceQuality.alerts}
        limit={3}
        onViewAll={() => openCockpitNavigationTarget({ tab: 'AlertCenter' })}
        onConfigureRules={() => openCockpitNavigationTarget({ tab: 'AlertCenter', alertTab: 'rules' })}
      />

      <MetricsTrendSection
        healthScoreData={healthScoreData}
        requestsData={requestsData}
        errorRateData={errorRateData}
        dataQuality={sourceQuality.metrics}
        degradedReasons={sourceQuality.metrics === 'unavailable' ? ['指标趋势不可用'] : []}
      />

      <RecentTasksSection
        tasks={tasks}
        dataQuality={sourceQuality.tasks}
        limit={3}
        onViewAll={() => openCockpitNavigationTarget({ tab: 'TaskCenter' })}
      />

      <GovernanceOverviewSection />
    </div>
  );
}

import { useEffect, useState } from 'react';
import HealthSummarySection from './home/HealthSummarySection';
import AlertFeedSection from './home/AlertFeedSection';
import MetricsTrendSection from './home/MetricsTrendSection';
import RecentTasksSection from './home/RecentTasksSection';
import GovernanceOverviewSection from './home/GovernanceOverviewSection';
import { openCockpitNavigationTarget } from './cockpitNavigation';
import type { HealthSummary, CockpitAlert, CockpitTask, DataPoint } from '../types/cockpit';

interface HomePageProps { onTabChange?: (tab: string) => void; }
type DataQuality = 'loading' | 'complete' | 'partial' | 'unavailable';
interface Thought { role: string; name: string; avatar: string; content: string; }

function ThoughtStreamSection({ thoughts }: { thoughts: Thought[] }) {
  if (!thoughts || thoughts.length === 0) return null;
  const roleColors: Record<string, string> = { builder: 'var(--antd-primary)', devil: 'var(--antd-error)', sage: 'var(--antd-warning)', keeper: 'var(--antd-success)' };
  return (
    <div className="services-section animate-fade-in" style={{ marginTop: '0px', marginBottom: '24px' }}>
      <div className="section-header" style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--antd-text-secondary)', margin: 0 }}>🧠 虚拟董事会心智探针 (Thought Streams)</h3>
        <span style={{ fontSize: '10.5px', color: 'rgba(255,255,255,0.3)' }}>实时系统洞察与架构审查</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {thoughts.map((thought) => (
          <div key={thought.role} className="antd-card" style={{ padding: '16px 20px', borderLeft: `3px solid ${roleColors[thought.role] || 'rgba(255,255,255,0.1)'}`, background: 'rgba(255,255,255,0.01)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--antd-text-primary)' }}><span>{thought.avatar}</span><span>{thought.name}</span></span>
              <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '3px', backgroundColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 600 }}>{thought.role}</span>
            </div>
            <p style={{ margin: 0, fontSize: '11.5px', lineHeight: '1.5', color: 'rgba(255,255,255,0.7)', wordBreak: 'break-all' }}>{thought.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HomePage(props: HomePageProps) {
  void props.onTabChange;
  const [healthSummary, setHealthSummary] = useState<HealthSummary | null>(null);
  const [alerts, setAlerts] = useState<CockpitAlert[]>([]);
  const [tasks, setTasks] = useState<CockpitTask[]>([]);
  const [healthScoreData, setHealthScoreData] = useState<DataPoint[]>([]);
  const [requestsData, setRequestsData] = useState<DataPoint[]>([]);
  const [errorRateData, setErrorRateData] = useState<DataPoint[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataQuality, setDataQuality] = useState<DataQuality>('loading');
  const [degradedReasons, setDegradedReasons] = useState<string[]>([]);
  const [homeError, setHomeError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setHomeError(null);
      const read = async (source: string, url: string) => {
        try {
          const response = await fetch(url);
          if (!response.ok) throw new Error(`${source}: HTTP ${response.status}`);
          return { source, data: await response.json(), ok: true };
        } catch (error) {
          console.error(`Failed to fetch ${source}:`, error);
          return { source, data: null, ok: false };
        }
      };
      try {
        const [summary, alertFeed, recentTasks, metrics, thoughtsFeed] = await Promise.all([
          read('健康摘要', '/api/health/summary'), read('告警列表', '/api/alerts?limit=3&status=active'), read('任务列表', '/api/tasks?limit=3&sort=updated'), read('指标趋势', '/api/metrics/trend?range=24h'), read('心智探针', '/api/omos/thoughts'),
        ]);
        const results = [summary, alertFeed, recentTasks, metrics, thoughtsFeed];
        const failures = results.filter((result) => !result.ok).map((result) => result.source);
        const successCount = results.length - failures.length;
        setHealthSummary(summary.ok ? summary.data : null);
        setAlerts(alertFeed.ok ? alertFeed.data?.items ?? [] : []);
        setTasks(recentTasks.ok ? recentTasks.data?.items ?? [] : []);
        setHealthScoreData(metrics.ok ? metrics.data?.health_score ?? [] : []);
        setRequestsData(metrics.ok ? metrics.data?.requests ?? [] : []);
        setErrorRateData(metrics.ok ? metrics.data?.error_rate ?? [] : []);
        setThoughts(thoughtsFeed.ok && thoughtsFeed.data?.status === 'ok' ? thoughtsFeed.data.thoughts ?? [] : []);
        const nextQuality: DataQuality = failures.length === 0 ? 'complete' : successCount === 0 ? 'unavailable' : 'partial';
        setDataQuality(nextQuality);
        setDegradedReasons(failures);
        setHomeError(nextQuality === 'complete' ? null : nextQuality === 'partial' ? '首页部分数据暂不可用，未展示默认运行状态。' : '首页数据暂不可用，当前未展示模拟或默认运行状态。');
      } catch (error) {
        console.error('Failed to fetch home data:', error);
        setHealthSummary(null); setAlerts([]); setTasks([]); setHealthScoreData([]); setRequestsData([]); setErrorRateData([]); setThoughts([]);
        setDataQuality('unavailable'); setDegradedReasons(['后端接口不可达']); setHomeError('首页数据暂不可用，当前未展示模拟或默认运行状态。');
      } finally { setLoading(false); }
    };
    void fetchData();
    const interval = setInterval(() => void fetchData(), 30000);
    return () => clearInterval(interval);
  }, []);

  const sectionQuality = loading ? 'loading' : dataQuality;
  return (
    <div className="home-page">
      {(loading || homeError) && <div className="shell-data-banner" role={homeError ? 'alert' : 'status'}>{loading ? '正在读取真实首页数据' : homeError}</div>}
      <HealthSummarySection healthScore={healthSummary?.health_score ?? 0} healthScoreChange={healthSummary?.health_score_change ?? 0} activeServices={healthSummary?.active_services ?? 0} totalServices={healthSummary?.total_services ?? 0} activeTasks={healthSummary?.active_tasks ?? 0} activeTasksSource={healthSummary?.active_tasks_source ?? (healthSummary ? 'omo' : 'unavailable')} todayRequests={healthSummary?.today_requests ?? 0} todayRequestsChange={healthSummary?.today_requests_change ?? 0} dataQuality={healthSummary ? dataQuality : 'unavailable'} degradedReasons={degradedReasons} />
      <ThoughtStreamSection thoughts={thoughts} />
      <AlertFeedSection alerts={alerts} dataQuality={sectionQuality} limit={3} onViewAll={() => openCockpitNavigationTarget({ tab: 'AlertCenter' })} onConfigureRules={() => openCockpitNavigationTarget({ tab: 'AlertCenter', alertTab: 'rules' })} />
      <MetricsTrendSection healthScoreData={healthScoreData} requestsData={requestsData} errorRateData={errorRateData} dataQuality={sectionQuality} degradedReasons={degradedReasons} />
      <RecentTasksSection tasks={tasks} dataQuality={sectionQuality} limit={3} onViewAll={() => openCockpitNavigationTarget({ tab: 'TaskCenter' })} />
      <GovernanceOverviewSection />
    </div>
  );
}

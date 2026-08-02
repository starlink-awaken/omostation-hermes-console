import { AlertTriangle, ArrowRight, CheckCircle2, Info } from 'lucide-react';

export interface HomeFocusQueue {
  id: string;
  title: string;
  severity: string;
  reason: string;
  count: number;
  project_ids?: string[];
}

export interface HomeFocusProject {
  id: string;
  cockpit_page?: string;
  score?: number;
  status?: string;
  primary_gap?: string;
  next_action?: string;
}

export interface HomeFocusPayload {
  generated_at?: string;
  project_focus?: {
    summary?: { needs_action?: number };
    queues?: HomeFocusQueue[];
  };
  project_portfolio?: {
    priority_projects?: HomeFocusProject[];
  };
}

interface HomeFocusSectionProps {
  focus: HomeFocusPayload | null;
  dataQuality: 'loading' | 'complete' | 'partial' | 'unavailable';
  onOpenProject: (projectId: string) => void;
  onViewTasks: () => void;
}

function severityLabel(severity: string): string {
  if (severity === 'high') return '优先处理';
  if (severity === 'medium') return '建议处理';
  return '持续观察';
}

export default function HomeFocusSection({ focus, dataQuality, onOpenProject, onViewTasks }: HomeFocusSectionProps) {
  const queues = (focus?.project_focus?.queues || []).filter((queue) => queue.count > 0).slice(0, 3);
  const projects = (focus?.project_portfolio?.priority_projects || []).slice(0, 3);
  const needsAction = focus?.project_focus?.summary?.needs_action;

  return (
    <section className="home-focus-section" aria-labelledby="home-focus-title">
      <div className="section-header" style={{ marginBottom: 12 }}>
        <div>
          <h2 id="home-focus-title" className="section-title" style={{ marginBottom: 4 }}>今天需要处理</h2>
          <p style={{ margin: 0, color: 'var(--antd-text-secondary)', fontSize: 12 }}>基于 SystemMap 的真实项目焦点、验证状态和下一步动作</p>
        </div>
        <button type="button" className="btn-link" onClick={onViewTasks}>
          打开任务中心 <ArrowRight size={14} aria-hidden="true" />
        </button>
      </div>

      {dataQuality !== 'complete' && (
        <div className="shell-data-banner" role={dataQuality === 'loading' ? 'status' : 'alert'}>
          {dataQuality === 'loading'
            ? '正在读取真实工作焦点'
            : dataQuality === 'partial'
              ? '工作焦点部分可用，未展示默认项目'
              : '工作焦点暂不可用，未展示默认项目'}
        </div>
      )}

      {dataQuality === 'complete' && queues.length === 0 && projects.length === 0 && (
        <div className="home-focus-empty" role="status">
          <CheckCircle2 size={18} className="text-success" aria-hidden="true" />
          <span>当前没有来自 SystemMap 的待处理项目。</span>
        </div>
      )}

      {dataQuality !== 'complete' && (
        <div className="home-focus-empty" role="status">
          <Info size={18} className="text-muted" aria-hidden="true" />
          <span>没有可展示的真实工作焦点。</span>
        </div>
      )}

      {dataQuality === 'complete' && (queues.length > 0 || projects.length > 0) && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: 'var(--antd-text-secondary)', fontSize: 12 }}>
            <AlertTriangle size={14} className={needsAction ? 'text-warning' : 'text-muted'} aria-hidden="true" />
            <span>{needsAction === undefined ? '待处理数量未提供' : `需要动作的项目：${needsAction}`}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {queues.map((queue) => (
              <article key={queue.id} className="antd-card" style={{ padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                  <strong style={{ fontSize: 13 }}>{queue.title}</strong>
                  <span className={`status-badge ${queue.severity === 'high' ? 'degraded' : 'online'}`}>
                    {severityLabel(queue.severity)} · {queue.count}
                  </span>
                </div>
                <p style={{ margin: '8px 0 0', color: 'var(--antd-text-secondary)', fontSize: 11, lineHeight: 1.5 }}>{queue.reason}</p>
              </article>
            ))}
          </div>

          {projects.length > 0 && (
            <div style={{ display: 'grid', gap: 8, marginTop: 12 }}>
              {projects.map((project) => (
                <div key={project.id} className="home-focus-project" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 12px', border: '1px solid var(--antd-border)', borderRadius: 6 }}>
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ display: 'block', fontSize: 12 }}>{project.id}</strong>
                    <span style={{ display: 'block', marginTop: 3, color: 'var(--antd-text-secondary)', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {project.next_action || project.primary_gap || '进入项目详情确认下一步。'}
                    </span>
                  </div>
                  <button type="button" className="btn-link" onClick={() => onOpenProject(project.id)}>
                    查看项目 <ArrowRight size={14} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

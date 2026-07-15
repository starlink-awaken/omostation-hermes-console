import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Shield, Lightbulb, CheckCircle2, Plus, Sparkles, Clock, Star, PlayCircle, Loader2, Award, ClipboardCheck, Route } from 'lucide-react';
import './Dashboard.css';
import PlatformControlWorkbench from './PlatformControlWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface Quest {
  id: number;
  title: string;
  type: 'responsibility' | 'wisdom' | string;
  reward: number;
  completed: number;
  assignee: string;
}

interface Profile {
  role: string;
  name: string;
  level: number;
  wisdomPoints: number;
  responsibilityPoints: number;
  inventory?: string;
}

interface PointLog {
  id: number;
  user: string;
  action: string;
  amount: number;
  timestamp: string;
}

interface QuestBoardProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

type QuestClosureRow = {
  id: string;
  title: string;
  summary: string;
  signal: string;
  nextAction: string;
  statusTone: 'online' | 'degraded';
  objectTarget: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
};

function matchesQuestFocusQuery(values: Array<string | number | null | undefined>, query?: string | null) {
  if (!query) return false;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}

export default function QuestBoard({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: QuestBoardProps) {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [qType, setQType] = useState('responsibility');
  const [reward, setReward] = useState(10);
  const [assignee, setAssignee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState<number | null>(null);
  const [actionFeedback, setActionFeedback] = useState<{ status: 'success' | 'error'; message: string } | null>(null);

  const fetchBoardData = async () => {
    try {
      const response = await fetch('/api/omos/quests');
      if (!response.ok) {
        throw new Error(`HTTP 异常 ${response.status}`);
      }
      const data = await response.json();
      if (data.status === 'ok') {
        setQuests(data.quests || []);
        setProfiles(data.profiles || []);
        setLogs(data.logs || []);
        if (data.profiles && data.profiles.length > 0 && !assignee) {
          setAssignee(data.profiles[0].role);
        }
      } else {
        throw new Error(data.error || '获取数据失败');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBoardData();
    const interval = setInterval(fetchBoardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateQuest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !assignee) return;

    setSubmitting(true);
    setActionFeedback(null);
    try {
      const params = new URLSearchParams({
        title: title.trim(),
        q_type: qType,
        reward: reward.toString(),
        assignee: assignee
      });
      const response = await fetch(`/api/omos/quests?${params.toString()}`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('创建任务接口异常');
      }
      const res = await response.json();
      if (res.status === 'ok') {
        setTitle('');
        setReward(10);
        setShowAddForm(false);
        await fetchBoardData();
        setActionFeedback({ status: 'success', message: '新冒险已创建并回流到积分看板。' });
      } else {
        setActionFeedback({ status: 'error', message: `创建失败：${res.error || '服务端未接受请求。'}` });
      }
    } catch (err: any) {
      setActionFeedback({ status: 'error', message: `创建任务发生错误：${err.message || '请稍后重试。'}` });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteQuest = async (questId: number) => {
    setCompletingId(questId);
    setActionFeedback(null);
    try {
      const response = await fetch(`/api/omos/quests/${questId}/complete`, {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('完成任务接口异常');
      }
      const res = await response.json();
      if (res.status === 'ok') {
        await fetchBoardData();
        setActionFeedback({ status: 'success', message: '任务已完成，积分和日志已刷新。' });
      } else {
        setActionFeedback({ status: 'error', message: `标记完成失败：${res.error || '服务端未接受请求。'}` });
      }
    } catch (err: any) {
      setActionFeedback({ status: 'error', message: `操作错误：${err.message || '请稍后重试。'}` });
    } finally {
      setCompletingId(null);
    }
  };

  const activeQuests = quests.filter(q => q.completed === 0);
  const completedQuests = quests.filter(q => q.completed === 1);
  const focusProfiles = [...profiles]
    .sort((left, right) => (right.responsibilityPoints + right.wisdomPoints) - (left.responsibilityPoints + left.wisdomPoints))
    .slice(0, 3);
  const questClosureRows = useMemo<QuestClosureRow[]>(() => {
    const firstActiveQuest = activeQuests[0];
    const firstCompletedQuest = completedQuests[0];
    const topProfile = focusProfiles[0];
    const latestLog = logs[0];
    return [
      {
        id: 'family-app',
        title: '家庭驾驶舱挂载',
        summary: '先回家庭驾驶舱看真实状态、周报和家庭数据，再决定激励动作是不是该继续推进。',
        signal: firstActiveQuest ? `活跃任务 ${firstActiveQuest.title}` : `成员 ${profiles.length} · 等待新任务`,
        nextAction: '去应用中心确认家庭驾驶舱入口、运行态和真实家庭数据面是不是还通着。',
        statusTone: firstActiveQuest ? 'degraded' : 'online',
        objectTarget: { tab: 'DomainApps', taskQuery: 'family-dashboard-app' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstActiveQuest?.title || 'family-dashboard-app' },
      },
      {
        id: 'task-center',
        title: '家庭任务正式收口',
        summary: '家庭任务一旦变成长期跟踪项，就不能只留在积分面，需要送进任务中心继续承接。',
        signal: activeQuests.length > 0 ? `待收口 ${activeQuests.length}` : `已完成 ${completedQuests.length}`,
        nextAction: '把当前最重要的家庭任务沉到任务中心，补追踪、责任人和后续检查。',
        statusTone: activeQuests.length > 0 ? 'degraded' : 'online',
        objectTarget: { tab: 'TaskCenter', taskQuery: firstActiveQuest?.title || firstCompletedQuest?.title || 'family' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstActiveQuest?.title || firstCompletedQuest?.title || 'family' },
      },
      {
        id: 'knowledge',
        title: '家庭规则知识沉淀',
        summary: '完成的家庭任务、积分日志和习惯模式，需要沉成长期可复用的规则和模板。',
        signal: latestLog ? `最近日志 ${latestLog.action}` : `已完成 ${completedQuests.length}`,
        nextAction: '把家庭规则、奖励模版和复盘经验整理进知识页，避免每次重新想一遍。',
        statusTone: completedQuests.length > 0 || logs.length > 0 ? 'degraded' : 'online',
        objectTarget: { tab: 'Knowledge', taskQuery: firstCompletedQuest?.title || latestLog?.action || 'family-rules' },
        taskTarget: { tab: 'TaskCenter', taskQuery: firstCompletedQuest?.title || latestLog?.action || 'family-rules' },
      },
      {
        id: 'settings',
        title: '奖励规则与配置',
        summary: '积分面要稳定可用，最终还得回设置页确认配置、实例接入和领域安全门。',
        signal: topProfile ? `${topProfile.name} Lv${topProfile.level}` : '等待成员配置',
        nextAction: '回设置页核对家庭相关挂载、安全门和控制面承接，避免积分规则漂在空中。',
        statusTone: profiles.length > 0 ? 'degraded' : 'online',
        objectTarget: { tab: 'Settings', taskQuery: topProfile?.name || 'QuestBoard' },
        taskTarget: { tab: 'TaskCenter', taskQuery: topProfile?.name || 'QuestBoard' },
      },
    ];
  }, [activeQuests, completedQuests, focusProfiles, logs, profiles.length]);
  const focusedQuestCard = (() => {
    const matchedQuest = quests.find((quest) => (
      matchesQuestFocusQuery([quest.id, quest.title, quest.type, quest.assignee, quest.reward], focusTaskQuery)
    ));
    if (matchedQuest) {
      return {
        kicker: '家庭任务',
        title: matchedQuest.title,
        detail: `${matchedQuest.type} · 奖励 ${matchedQuest.reward} · 指派 ${matchedQuest.assignee}`,
        objectTarget: { tab: 'QuestBoard', taskQuery: String(matchedQuest.id) },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedQuest.title },
      };
    }

    const matchedProfile = profiles.find((profile) => (
      matchesQuestFocusQuery([profile.role, profile.name, profile.level, profile.wisdomPoints, profile.responsibilityPoints], focusTaskQuery)
    ));
    if (matchedProfile) {
      return {
        kicker: '家庭成员',
        title: matchedProfile.name,
        detail: `责任 ${matchedProfile.responsibilityPoints} · 智慧 ${matchedProfile.wisdomPoints} · level ${matchedProfile.level}`,
        objectTarget: { tab: 'QuestBoard', taskQuery: matchedProfile.role },
        taskTarget: { tab: 'TaskCenter', taskQuery: matchedProfile.name },
      };
    }

    const matchedClosure = questClosureRows.find((row) => (
      matchesQuestFocusQuery([row.title, row.summary, row.signal, row.nextAction], focusTaskQuery)
    ));
    if (matchedClosure) {
      return {
        kicker: '家庭闭环',
        title: matchedClosure.title,
        detail: `${matchedClosure.signal} · ${matchedClosure.nextAction}`,
        objectTarget: matchedClosure.objectTarget,
        taskTarget: matchedClosure.taskTarget,
      };
    }

    if (focusPageId === 'QuestBoard') {
      return {
        kicker: '当前页面',
        title: '积分冒险',
        detail: '这页负责把家庭任务、成员积分和后续应用中心/任务中心/知识页承接串起来，不只是一个积分榜。',
        objectTarget: { tab: 'SystemMap', pageId: 'QuestBoard' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'QuestBoard' },
      };
    }

    return null;
  })();

  if (loading) {
    return (
      <div className="loading-state" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在读取 QuestBoard 积分系统...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="antd-card" style={{ padding: '32px', textAlign: 'center', margin: '24px 0' }}>
        <p style={{ color: 'var(--antd-error)', fontSize: '16px', marginBottom: '16px', fontWeight: 600 }}>⚠️ 积分系统加载失败</p>
        <p className="text-muted" style={{ marginBottom: '24px' }}>{error}</p>
        <button className="antd-btn antd-btn-primary" onClick={() => { setLoading(true); setError(null); fetchBoardData(); }}>
          重新连接
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <PlatformControlWorkbench currentPage="QuestBoard" onNavigate={onNavigate} />

      <ActionSurfacePanel
        title="家庭执行联动"
        subtitle="冒险板不再只是积分展示，直接把家庭任务和领域应用、任务中心连起来。"
        statusText={activeQuests.length > 0 ? `活跃冒险 ${activeQuests.length}` : '当前无活跃冒险'}
        onNavigate={onNavigate}
        items={[
          {
            id: 'domain-apps',
            title: '回家庭应用',
            detail: '需要看家庭真实数据、周报或驾驶舱状态时，直接跳去应用中心。',
            actionLabel: '去应用中心',
            actionType: 'navigate',
            actionValue: 'DomainApps',
          },
          {
            id: 'task-center',
            title: '沉到任务中心',
            detail: '当家庭侧任务需要进入更正式的治理或追踪时，回任务中心继续处理。',
            actionLabel: '去任务中心',
            actionType: 'navigate',
            actionValue: 'TaskCenter',
          },
          {
            id: 'knowledge',
            title: '回知识中枢',
            detail: '要沉淀家庭任务经验、规则或习惯时，回知识页整理成长期资产。',
            actionLabel: '去知识页',
            actionType: 'navigate',
            actionValue: 'Knowledge',
          },
          {
            id: 'copy-quest',
            title: '复制任务模板',
            detail: '先从一个固定模板起步，降低临时想任务时的摩擦。',
            actionLabel: '复制模板',
            actionType: 'copy',
            actionValue: '整理房间 / 类型: responsibility / 奖励: 15 / 指派: child',
          },
        ]}
      />

      {focusedQuestCard && (
        <section className="services-section overview-ops-panel" aria-label="当前家庭承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前家庭承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、搜索或任务带来的上下文，直接落到当前该承接的家庭任务或成员对象。
              </p>
            </div>
            <span className="status-badge online">{focusedQuestCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedQuestCard.title}</strong>
              <p>{focusedQuestCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开家庭焦点对象 ${focusedQuestCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedQuestCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Trophy size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开家庭焦点任务 ${focusedQuestCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedQuestCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <Shield size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>家庭承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把活跃任务、家庭成员积分焦点和后续入口放在看板前面，避免家庭页只剩积分展示。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">活跃 {activeQuests.length}</span>
            <span className="status-badge online">完成 {completedQuests.length}</span>
            <span className="status-badge degraded">成员 {profiles.length}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>活跃家庭任务</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先处理当前最重要的家庭任务，再决定是否沉到任务中心或应用中心。</p>
            </div>
            {activeQuests.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前没有活跃家庭任务。</p>
            ) : (
              <div style={{ display: 'grid', gap: 10 }}>
                {activeQuests.slice(0, 4).map((quest) => (
                  <div key={`quest-${quest.id}`} className="action-surface-item" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{quest.title}</strong>
                      <p>{quest.type} · 奖励 {quest.reward} · 指派 {quest.assignee}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>完成后会直接回流到积分日志和荣誉殿堂。</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>家庭去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>家庭任务不是孤立玩具，后续要回应用中心、任务中心和知识页继续沉淀。</p>
            </div>
            {focusProfiles.length > 0 && (
              <div style={{ display: 'grid', gap: 10 }}>
                {focusProfiles.map((profile) => (
                  <div key={`profile-${profile.role}`} className="action-surface-item" style={{ alignItems: 'flex-start' }}>
                    <div>
                      <strong>{profile.name}</strong>
                      <p>责任 {profile.responsibilityPoints} · 智慧 {profile.wisdomPoints}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>当前 level {profile.level}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {[
              { id: 'DomainApps', label: '应用中心', reason: '进入家庭驾驶舱和家庭数据面继续查看真实状态。', aria: '打开家庭承接到应用中心' },
              { id: 'TaskCenter', label: '任务中心', reason: '把家庭任务转成正式跟踪项。', aria: '打开家庭承接到任务中心' },
              { id: 'Knowledge', label: '知识页', reason: '沉淀家庭规则、模板和长期经验。', aria: '打开家庭承接到知识页' },
              { id: 'Settings', label: '设置页', reason: '核对家庭挂载配置、安全门和控制面承接。', aria: '打开家庭承接到设置页' },
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
                <Trophy size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      <section className="services-section" role="region" aria-label="家庭闭环总表">
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>家庭闭环总表</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把家庭驾驶舱、任务中心、知识沉淀和设置配置并排摆出来，保证积分面能接住真实家庭场景，不悬空。
            </p>
          </div>
          <span className="status-badge online">{questClosureRows.length} 条闭环</span>
        </div>
        <div style={{ display: 'grid', gap: 12 }}>
          {questClosureRows.map((row) => (
            <article
              key={row.id}
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
                  aria-label={`打开家庭闭环对象 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ClipboardCheck size={14} />
                  <span>打开对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开家庭闭环任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget(row.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>打开任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      
      {/* Top Header Block */}
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles className="text-warning animate-pulse" size={18} aria-hidden="true" />
            QuestBoard 积分冒险看板
          </h2>
          <p className="text-muted" style={{ fontSize: '13px', marginTop: '4px' }}>
            日常家庭任务与正向成长激励中枢。
          </p>
        </div>
        
        <button 
          className={`antd-btn ${showAddForm ? 'antd-btn-danger' : 'antd-btn-primary'}`}
          onClick={() => setShowAddForm(!showAddForm)}
          aria-expanded={showAddForm}
          aria-controls="quest-creation-form"
        >
          {showAddForm ? '取消发布' : <><Plus size={14} aria-hidden="true" /> 发布新冒险</>}
        </button>
      </div>

      {actionFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="antd-card"
          style={{
            padding: '0.75rem 1rem',
            color: actionFeedback.status === 'success' ? 'var(--antd-success)' : 'var(--antd-error)',
            border: `1px solid ${actionFeedback.status === 'success' ? 'rgba(5,243,162,0.2)' : 'rgba(255,71,87,0.2)'}`,
          }}
        >
          {actionFeedback.message}
        </div>
      )}

      {/* Quest Creation Form (AntD Form layout) */}
      {showAddForm && (
        <form 
          id="quest-creation-form"
          onSubmit={handleCreateQuest} 
          className="antd-card animate-fade-in" 
          style={{ 
            padding: '20px', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '16px', 
            alignItems: 'end',
            background: 'var(--antd-bg-container)'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="quest-title" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>冒险标题</label>
            <input 
              id="quest-title"
              type="text" 
              className="antd-input" 
              placeholder="例如：整理书架、倒垃圾、阅读半小时" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="quest-type" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>冒险类型</label>
            <select 
              id="quest-type"
              className="antd-input" 
              value={qType}
              onChange={e => setQType(e.target.value)}
              style={{ background: 'var(--antd-bg-elevated)', cursor: 'pointer' }}
            >
              <option value="responsibility">🛡️ 责任养成 (每日习惯/家务)</option>
              <option value="wisdom">🎩 智慧进阶 (学习/阅读/创意)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="quest-reward" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>积分奖励 (Points)</label>
            <input 
              id="quest-reward"
              type="number" 
              className="antd-input" 
              min="5" 
              max="200" 
              step="5"
              value={reward}
              onChange={e => setReward(parseInt(e.target.value) || 10)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label htmlFor="quest-assignee" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>冒险勇士 (Assignee)</label>
            <select 
              id="quest-assignee"
              className="antd-input" 
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              style={{ background: 'var(--antd-bg-elevated)', cursor: 'pointer' }}
              required
            >
              {profiles.map(p => (
                <option key={p.role} value={p.role}>
                  {p.name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <button 
            type="submit" 
            className="antd-btn antd-btn-primary" 
            disabled={submitting}
            style={{ height: '32px' }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : '立即发布'}
          </button>
        </form>
      )}

      {/* Leaderboard Cards Grid (AntD Card Style) */}
      <div className="stats-grid">
        {profiles.map((p) => (
          <div 
            key={p.role} 
            className="antd-card" 
            style={{ 
              padding: '20px', 
              position: 'relative', 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ position: 'absolute', right: '-12px', bottom: '-12px', opacity: 0.04, color: 'var(--antd-text-primary)' }} aria-hidden="true">
              <Trophy size={96} />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: '600', fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Award size={16} aria-hidden="true" className={p.role === 'child' ? 'text-warning' : 'text-accent'} />
                {p.name}
              </span>
              <span style={{ 
                fontSize: '11px', 
                backgroundColor: 'rgba(255,255,255,0.06)', 
                padding: '2px 8px', 
                borderRadius: '4px',
                color: 'var(--antd-text-secondary)'
              }}>
                Lvl {p.level || 1}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield size={16} aria-hidden="true" className="text-success" />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--antd-text-muted)' }}>责任积分</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--antd-success)' }}>{p.responsibilityPoints || 0}</div>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Lightbulb size={16} aria-hidden="true" className="text-warning" />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--antd-text-muted)' }}>智慧积分</div>
                  <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--antd-warning)' }}>{p.wisdomPoints || 0}</div>
                </div>
              </div>
            </div>

            {p.inventory && (
              <div style={{ 
                fontSize: '12px', 
                color: 'var(--antd-text-secondary)', 
                borderTop: '1px solid var(--antd-border-color)', 
                paddingTop: '8px',
                marginTop: '4px'
              }}>
                🎒 背包: {p.inventory}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Main Lists Column Divider */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', alignItems: 'start' }}>
        
        {/* Left Column: Active Quests */}
        <section aria-label="进行中的任务" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--antd-text-secondary)' }}>
            <PlayCircle size={16} aria-hidden="true" className="text-accent" />
            进行中的冒险 ({activeQuests.length})
          </h3>

          {activeQuests.length === 0 ? (
            <div className="antd-card" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--antd-text-secondary)' }}>
              <Star size={24} className="text-muted" style={{ marginBottom: '8px', opacity: 0.4 }} aria-hidden="true" />
              <p style={{ fontSize: '14px' }}>暂无正在进行的冒险。</p>
              <p style={{ fontSize: '12px', color: 'var(--antd-text-muted)', marginTop: '4px' }}>点击上方按钮发布一个新任务吧！</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {activeQuests.map(quest => (
                <div 
                  key={quest.id} 
                  className="antd-card" 
                  style={{ 
                    padding: '16px 20px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderLeft: quest.type === 'responsibility' ? '3px solid var(--antd-success)' : '3px solid var(--antd-warning)'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {quest.type === 'responsibility' ? (
                        <span style={{ 
                          backgroundColor: 'var(--antd-success-bg)', 
                          color: 'var(--antd-success)', 
                          fontSize: '11px', 
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Shield size={10} aria-hidden="true" /> 责任
                        </span>
                      ) : (
                        <span style={{ 
                          backgroundColor: 'var(--antd-warning-bg)', 
                          color: 'var(--antd-warning)', 
                          fontSize: '11px', 
                          padding: '1px 6px',
                          borderRadius: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <Lightbulb size={10} aria-hidden="true" /> 智慧
                        </span>
                      )}
                      
                      <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
                        专属: {profiles.find(p => p.role === quest.assignee)?.name || quest.assignee}
                      </span>
                    </div>
                    
                    <span style={{ fontWeight: '500', fontSize: '14px', color: 'var(--antd-text-primary)' }}>
                      {quest.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '11px', color: 'var(--antd-text-muted)' }}>金币奖励</span>
                      <span style={{ 
                        fontWeight: '600', 
                        fontSize: '16px', 
                        color: quest.type === 'responsibility' ? 'var(--antd-success)' : 'var(--antd-warning)'
                      }}>
                        +{quest.reward} PTS
                      </span>
                    </div>
                    
                    <button 
                      className="antd-btn antd-btn-primary"
                      disabled={completingId !== null}
                      onClick={() => handleCompleteQuest(quest.id)}
                      aria-label={`完成任务: ${quest.title}`}
                      style={{ height: '32px' }}
                    >
                      {completingId === quest.id ? (
                        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
                      ) : (
                        <><CheckCircle2 size={12} aria-hidden="true" /> 达成</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right Column: Timeline Logs & Hall of Fame */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Timeline Logs Card */}
          <section aria-label="积分变动日志" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--antd-text-secondary)' }}>
              <Clock size={16} aria-hidden="true" className="text-muted" />
              冒险日志
            </h3>
            
            <div className="antd-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '280px', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>暂无积分变动日志</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '12px', borderBottom: '1px solid var(--antd-border-color)', paddingBottom: '8px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ color: 'var(--antd-text-primary)', fontWeight: '500' }}>
                        {profiles.find(p => p.role === log.user)?.name || log.user}
                      </span>
                      <span className="text-muted" style={{ fontSize: '11px' }}>
                        {log.action}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ color: log.amount >= 0 ? 'var(--antd-success)' : 'var(--antd-error)', fontWeight: '600' }}>
                        {log.amount >= 0 ? `+${log.amount}` : log.amount}
                      </span>
                      <span className="text-muted" style={{ fontSize: '10px' }}>
                        {log.timestamp ? log.timestamp.split('T')[0] : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Hall of Fame Card */}
          <section aria-label="荣誉殿堂" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--antd-text-secondary)' }}>
              <Trophy size={16} aria-hidden="true" className="text-warning" />
              荣誉殿堂 ({completedQuests.length})
            </h3>
            
            <div className="antd-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {completedQuests.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>尚无已达成的冒险荣耀</p>
              ) : (
                completedQuests.map(quest => (
                  <div key={quest.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--antd-border-color)', opacity: 0.8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', textDecoration: 'line-through', color: 'var(--antd-text-secondary)' }}>
                        {quest.title}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--antd-text-muted)' }}>
                        达成: {profiles.find(p => p.role === quest.assignee)?.name || quest.assignee}
                      </span>
                    </div>
                    
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--antd-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      +{quest.reward} PTS <CheckCircle2 size={12} aria-hidden="true" />
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

      </div>

    </div>
  );
}

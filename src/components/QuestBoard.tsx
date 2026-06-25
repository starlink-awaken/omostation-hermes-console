import React, { useState, useEffect } from 'react';
import { Trophy, Shield, Lightbulb, CheckCircle2, Plus, Sparkles, Clock, Star, PlayCircle, Loader2, Award } from 'lucide-react';
import './Dashboard.css';

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

export default function QuestBoard() {
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
      } else {
        alert(`创建失败: ${res.error}`);
      }
    } catch (err: any) {
      alert(`创建任务发生错误: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteQuest = async (questId: number) => {
    setCompletingId(questId);
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
      } else {
        alert(`标记完成失败: ${res.error}`);
      }
    } catch (err: any) {
      alert(`操作错误: ${err.message}`);
    } finally {
      setCompletingId(null);
    }
  };

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

  const activeQuests = quests.filter(q => q.completed === 0);
  const completedQuests = quests.filter(q => q.completed === 1);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
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

import React, { useState, useEffect } from 'react';
import { Trophy, Shield, Lightbulb, CheckCircle2, Plus, Sparkles, Clock, Star, PlayCircle, Loader2, Award, ArrowUpRight } from 'lucide-react';
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
          // 默认选择第一个人物
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
    // 轮询以保持状态实时
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
      <div className="loading-state">
        <div className="spinner"></div>
        <p>正在读取 QuestBoard 积分系统...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel" style={{ padding: '2rem', textAlign: 'center', margin: '2rem 0' }}>
        <p style={{ color: 'var(--color-danger)', fontSize: '1.2rem', marginBottom: '1rem' }}>⚠️ 积分系统加载失败</p>
        <p className="text-muted">{error}</p>
        <button className="btn-glass" style={{ marginTop: '1.5rem' }} onClick={() => { setLoading(true); setError(null); fetchBoardData(); }}>
          重新连接
        </button>
      </div>
    );
  }

  const activeQuests = quests.filter(q => q.completed === 0);
  const completedQuests = quests.filter(q => q.completed === 1);

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div className="section-header">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Sparkles className="text-warning animate-pulse" size={20} />
            QuestBoard 积分冒险看板
          </h2>
          <p className="text-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
            通过日常任务培养宝宝的责任感与智慧。
          </p>
        </div>
        <button 
          className="btn-glass" 
          style={{ 
            borderColor: showAddForm ? 'var(--color-danger)' : 'var(--color-accent)', 
            color: showAddForm ? 'var(--color-danger)' : 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
          onClick={() => setShowAddForm(!showAddForm)}
        >
          {showAddForm ? '取消发布' : <><Plus size={16} /> 发布新冒险</>}
        </button>
      </div>

      {/* Add Quest Form Panel */}
      {showAddForm && (
        <form onSubmit={handleCreateQuest} className="glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem' }}>冒险标题</label>
            <input 
              type="text" 
              className="glass-input" 
              placeholder="例如：整理书架、倒垃圾、独立阅读半小时" 
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem' }}>冒险类型</label>
            <select 
              className="glass-input" 
              value={qType}
              onChange={e => setQType(e.target.value)}
              style={{ background: '#12141d', cursor: 'pointer' }}
            >
              <option value="responsibility">🛡️ 责任养成 (每日习惯/打扫)</option>
              <option value="wisdom">🎩 智慧进阶 (阅读/学习/创意)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem' }}>积分奖励 (Points)</label>
            <input 
              type="number" 
              className="glass-input" 
              min="5" 
              max="200" 
              step="5"
              value={reward}
              onChange={e => setReward(parseInt(e.target.value) || 10)}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label className="text-muted" style={{ fontSize: '0.85rem' }}>执行者</label>
            <select 
              className="glass-input" 
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              style={{ background: '#12141d', cursor: 'pointer' }}
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
            className="btn-glass" 
            disabled={submitting}
            style={{ 
              backgroundColor: 'var(--color-accent)', 
              borderColor: 'var(--color-accent)', 
              color: '#090a0f', 
              fontWeight: '600',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : '立即发布'}
          </button>
        </form>
      )}

      {/* Leaderboard Cards */}
      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        {profiles.map((p, idx) => (
          <div key={p.role} className="stat-card glass-panel" style={{ borderLeft: idx === 0 ? '4px solid var(--color-accent)' : '4px solid var(--color-success)', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: '-10px', bottom: '-10px', opacity: 0.05, color: '#fff' }}>
              <Trophy size={100} />
            </div>
            <div className="stat-info" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: '600', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Award size={18} className={p.role === 'child' ? 'text-warning' : 'text-accent'} />
                  {p.name}
                </span>
                <span className="badge" style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>
                  等级: Lvl {p.level || 1}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Shield size={16} className="text-success" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>责任积分</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-success)' }}>{p.responsibilityPoints || 0}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <Lightbulb size={16} className="text-warning" />
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>智慧积分</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '700', color: 'var(--color-warning)' }}>{p.wisdomPoints || 0}</div>
                  </div>
                </div>
              </div>
              {p.inventory && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  🎒 装备: {p.inventory}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Main Quest Lists (Active vs Completed) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'start' }}>
        
        {/* Left Column: Active Quests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <PlayCircle size={18} className="text-accent" />
            进行中的冒险 ({activeQuests.length})
          </h3>

          {activeQuests.length === 0 ? (
            <div className="glass-panel" style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
              <Star size={32} className="text-muted" style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <p>暂无正在进行的冒险。</p>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>点击右上角发布一个新任务吧！</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {activeQuests.map(quest => (
                <div 
                  key={quest.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '1.25rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderLeft: quest.type === 'responsibility' ? '4px solid var(--color-success)' : '4px solid var(--color-warning)',
                    transition: 'transform 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {quest.type === 'responsibility' ? (
                        <span className="badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-success)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Shield size={12} /> 责任
                        </span>
                      ) : (
                        <span className="badge" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Lightbulb size={12} /> 智慧
                        </span>
                      )}
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        分配给: {profiles.find(p => p.role === quest.assignee)?.name || quest.assignee}
                      </span>
                    </div>
                    <span style={{ fontWeight: '500', fontSize: '1rem', color: 'var(--color-text-primary)' }}>
                      {quest.title}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>金币奖励</span>
                      <span style={{ fontWeight: '700', fontSize: '1.2rem', color: quest.type === 'responsibility' ? 'var(--color-success)' : 'var(--color-warning)', display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
                        +{quest.reward} PTS
                      </span>
                    </div>
                    
                    <button 
                      className="btn-glass"
                      disabled={completingId !== null}
                      onClick={() => handleCompleteQuest(quest.id)}
                      style={{ 
                        borderColor: 'var(--color-success)', 
                        backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                        color: 'var(--color-success)',
                        padding: '0.5rem 0.85rem',
                        fontWeight: '600',
                        fontSize: '0.85rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      {completingId === quest.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <><CheckCircle2 size={14} /> 完成冒险</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Points Log & Completed Quests */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Logs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={18} className="text-muted" />
              冒险日志 (Point Logs)
            </h3>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
              {logs.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>暂无积分变动日志</p>
              ) : (
                logs.map(log => (
                  <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                      <span style={{ color: 'var(--color-text-primary)', fontWeight: '500' }}>
                        {profiles.find(p => p.role === log.user)?.name || log.user}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {log.action}
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <span style={{ color: log.amount >= 0 ? 'var(--color-success)' : 'var(--color-danger)', fontWeight: '600' }}>
                        {log.amount >= 0 ? `+${log.amount}` : log.amount}
                      </span>
                      <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                        {log.timestamp ? log.timestamp.split('T')[0] : ''}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Completed Quests List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Trophy size={18} className="text-warning" />
              荣誉殿堂 ({completedQuests.length})
            </h3>
            <div className="glass-panel" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
              {completedQuests.length === 0 ? (
                <p className="text-muted" style={{ fontSize: '0.85rem', textAlign: 'center', padding: '1rem 0' }}>尚无已达成的荣耀</p>
              ) : (
                completedQuests.map(quest => (
                  <div key={quest.id} style={{ display: 'flex', justifyItems: 'space-between', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.02)', opacity: 0.7 }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.85rem', textDecoration: 'line-through', color: 'var(--color-text-secondary)' }}>
                        {quest.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                        达成者: {profiles.find(p => p.role === quest.assignee)?.name || quest.assignee}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      +{quest.reward} PTS <CheckCircle2 size={12} />
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}

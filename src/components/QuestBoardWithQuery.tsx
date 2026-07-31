/**
 * QuestBoard with React Query integration.
 */

import React, { useState } from 'react';
import { Trophy, Shield, Lightbulb, CheckCircle2, Plus, Sparkles, Clock, Star, PlayCircle, Loader2, Award } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import './Dashboard.css';

// ── Types ──

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

interface QuestBoardData {
  quests: Quest[];
  profiles: Profile[];
  logs: PointLog[];
}

// ── Hook ──

function useQuestBoard() {
  return useQuery({
    queryKey: ['quest-board'],
    queryFn: async () => {
      const response = await apiFetch<QuestBoardData>('/api/omos/quests');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch quest board');
      }
      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

function useCompleteQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (questId: number) => {
      const response = await apiPost(`/api/omos/quests/${questId}/complete`, {});
      if (!response.ok) {
        throw new Error(response.error || 'Failed to complete quest');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quest-board'] });
    },
  });
}

function useAddQuest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; type: string; reward: number; assignee: string }) => {
      const response = await apiPost('/api/omos/quests', data);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to add quest');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quest-board'] });
    },
  });
}

// ── Component ──

export default function QuestBoardWithQuery() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [qType, setQType] = useState('responsibility');
  const [reward, setReward] = useState(10);
  const [assignee, setAssignee] = useState('');

  const { data, isLoading, error } = useQuestBoard();
  const completeMutation = useCompleteQuest();
  const addMutation = useAddQuest();

  const quests = data?.quests || [];
  const profiles = data?.profiles || [];
  const logs = data?.logs || [];

  const handleAddQuest = () => {
    if (!title.trim() || !assignee.trim()) return;
    
    addMutation.mutate(
      { title, type: qType, reward, assignee },
      {
        onSuccess: () => {
          setTitle('');
          setQType('responsibility');
          setReward(10);
          setAssignee('');
          setShowAddForm(false);
        },
      }
    );
  };

  const handleCompleteQuest = (questId: number) => {
    completeMutation.mutate(questId);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'responsibility':
        return <Shield size={16} className="text-primary" />;
      case 'wisdom':
        return <Lightbulb size={16} className="text-warning" />;
      default:
        return <Trophy size={16} className="text-muted" />;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'responsibility':
        return '责任';
      case 'wisdom':
        return '智慧';
      default:
        return '其他';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy size={20} aria-hidden="true" className="text-warning" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>积分冒险看板</h1>
        </div>
        <button
          className="antd-btn antd-btn-primary"
          onClick={() => setShowAddForm(!showAddForm)}
          aria-label="添加任务"
        >
          <Plus size={14} />
          <span>添加任务</span>
        </button>
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
            <Trophy size={16} />
            <strong>任务数据加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{error.message}</div>
        </div>
      )}

      {/* Add Quest Form */}
      {showAddForm && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>添加新任务</h2>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
                任务标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入任务标题..."
                className="antd-input"
                style={{ width: '100%' }}
                aria-label="任务标题"
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
                  类型
                </label>
                <select
                  value={qType}
                  onChange={(e) => setQType(e.target.value)}
                  className="antd-input"
                  style={{ width: '100%' }}
                  aria-label="任务类型"
                >
                  <option value="responsibility">责任</option>
                  <option value="wisdom">智慧</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
                  奖励积分
                </label>
                <input
                  type="number"
                  value={reward}
                  onChange={(e) => setReward(Number(e.target.value))}
                  min="1"
                  max="100"
                  className="antd-input"
                  style={{ width: '100%' }}
                  aria-label="奖励积分"
                />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', color: 'var(--antd-text-secondary)' }}>
                  负责人
                </label>
                <input
                  type="text"
                  value={assignee}
                  onChange={(e) => setAssignee(e.target.value)}
                  placeholder="输入负责人..."
                  className="antd-input"
                  style={{ width: '100%' }}
                  aria-label="负责人"
                />
              </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="antd-btn antd-btn-primary"
                onClick={handleAddQuest}
                disabled={addMutation.isPending || !title.trim() || !assignee.trim()}
                aria-label="提交任务"
              >
                {addMutation.isPending ? '提交中...' : '提交'}
              </button>
              <button
                className="antd-btn"
                onClick={() => setShowAddForm(false)}
                aria-label="取消"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profiles */}
      {profiles.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {profiles.map((profile) => (
            <div key={profile.name} className="antd-card" style={{ textAlign: 'center' }}>
              <Award size={24} className="text-warning" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 600, marginBottom: '4px' }}>{profile.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)', marginBottom: '8px' }}>
                {profile.role} · Lv.{profile.level}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--antd-primary)' }}>
                    {profile.wisdomPoints}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--antd-text-muted)' }}>智慧</div>
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--antd-success)' }}>
                    {profile.responsibilityPoints}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--antd-text-muted)' }}>责任</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quest List */}
      {quests.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Trophy size={16} aria-hidden="true" className="text-warning" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>任务列表</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              {quests.length} 个任务
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {quests.map((quest) => (
              <div
                key={quest.id}
                className="antd-card"
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  opacity: quest.completed ? 0.6 : 1,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  {getTypeIcon(quest.type)}
                  <div style={{ flex: 1 }}>
                    <div style={{ 
                      fontWeight: 500, 
                      marginBottom: '4px',
                      textDecoration: quest.completed ? 'line-through' : 'none',
                    }}>
                      {quest.title}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                      类型: {getTypeText(quest.type)} · 负责人: {quest.assignee}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 600,
                    color: 'var(--antd-warning)',
                  }}>
                    +{quest.reward}
                  </span>
                  {quest.completed ? (
                    <CheckCircle2 size={20} className="text-success" />
                  ) : (
                    <button
                      className="antd-btn small"
                      onClick={() => handleCompleteQuest(quest.id)}
                      disabled={completeMutation.isPending}
                      aria-label={`完成任务 ${quest.id}`}
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Point Log */}
      {logs.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={16} aria-hidden="true" className="text-info" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>积分日志</h2>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px',
                  fontSize: '13px',
                  borderBottom: '1px solid var(--antd-border-color)',
                }}
              >
                <div>
                  <span style={{ fontWeight: 500 }}>{log.user}</span>
                  <span style={{ color: 'var(--antd-text-secondary)', marginLeft: '8px' }}>{log.action}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    color: log.amount > 0 ? 'var(--antd-success)' : 'var(--antd-error)',
                    fontWeight: 600,
                  }}>
                    {log.amount > 0 ? '+' : ''}{log.amount}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
                    {new Date(log.timestamp).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

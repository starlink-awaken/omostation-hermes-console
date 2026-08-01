/**
 * C2GStrategyView with React Query integration.
 * 
 * This component uses React Query for data fetching,
 * replacing the manual useState + useEffect pattern.
 */

import React, { useState } from 'react';
import {
  Compass,
  Layers,
  ShieldCheck,
  ShieldAlert,
  Flag,
  CheckCircle2,
  AlertTriangle,
  Play,
  Check,
  Plus,
  RefreshCw,
  Trophy,
  X,
  Eye,
  FileCode,
  Sparkles
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch, apiPost } from '../api/client';
import './Dashboard.css';

// ── Types ──

interface OmoStatus {
  system?: {
    current_phase?: string;
    health_score?: number;
    completed_tasks?: number;
    active_tasks?: number;
    blocked_tasks?: number;
  };
  governance?: {
    health_score?: number;
    anomaly_count?: number;
    total_tasks?: number;
    done?: number;
    planned?: number;
  };
}

interface CardItem {
  id: string;
  type: string;
  status: string;
  title: string;
  priority: string;
  domain: string;
  created: string;
}

interface CardCheck {
  compliant: boolean;
  violations: string[];
  constraints_checked: number;
  guidance: string;
}

interface ProposalItem {
  id: string;
  type: string;
  debt_id: string;
  target_model?: string;
  scope?: string;
  status: string;
  created_at?: string;
  description?: string;
}

interface DirectIoViolation {
  file: string;
  line: number;
  detail: string;
}

// ── Hooks ──

function useOmoStatus() {
  return useQuery({
    queryKey: ['omo-status'],
    queryFn: async () => {
      const response = await apiFetch<OmoStatus>('/api/omo/status');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch OMO status');
      }
      return response.data;
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

function useCards() {
  return useQuery({
    queryKey: ['omo-cards'],
    queryFn: async () => {
      const response = await apiFetch<{ items: CardItem[] }>('/api/omo/cards');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch cards');
      }
      return response.data?.items || [];
    },
    staleTime: 30000,
    refetchInterval: 30000,
    retry: 3,
  });
}

function useCheckCard() {
  return useMutation({
    mutationFn: async (cardId: string) => {
      const response = await apiPost<CardCheck>('/api/omo/cards/check', { card_id: cardId });
      if (!response.ok) {
        throw new Error(response.error || 'Failed to check card');
      }
      return response.data;
    },
  });
}

function useProposals() {
  return useQuery({
    queryKey: ['omo-proposals'],
    queryFn: async () => {
      const response = await apiFetch<{ items: ProposalItem[] }>('/api/omo/proposals');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch proposals');
      }
      return response.data?.items || [];
    },
    staleTime: 60000,
    retry: 3,
  });
}

function useViolations() {
  return useQuery({
    queryKey: ['omo-violations'],
    queryFn: async () => {
      const response = await apiFetch<{ items: DirectIoViolation[] }>('/api/omo/violations');
      if (!response.ok) {
        throw new Error(response.error || 'Failed to fetch violations');
      }
      return response.data?.items || [];
    },
    staleTime: 60000,
    retry: 3,
  });
}

function useCreateProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { type: string; debt_id: string; description: string }) => {
      const response = await apiPost('/api/omo/proposals', data);
      if (!response.ok) {
        throw new Error(response.error || 'Failed to create proposal');
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['omo-proposals'] });
    },
  });
}

// ── Component ──

export default function C2GStrategyView() {
  const [selectedCard, setSelectedCard] = useState<CardItem | null>(null);
  const [checkResult, setCheckResult] = useState<CardCheck | null>(null);

  const { data: status, isLoading: statusLoading, error: statusError } = useOmoStatus();
  const { data: cards, isLoading: cardsLoading } = useCards();
  const { data: proposals, isLoading: proposalsLoading } = useProposals();
  const { data: violations, isLoading: violationsLoading } = useViolations();
  const checkMutation = useCheckCard();
  const createProposalMutation = useCreateProposal();

  const handleCheckCard = (card: CardItem) => {
    setSelectedCard(card);
    setCheckResult(null);
    checkMutation.mutate(card.id, {
      onSuccess: (data) => {
        setCheckResult(data || null);
      },
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return '#e74c3c';
      case 'high': return '#f39c12';
      case 'medium': return '#3498db';
      case 'low': return '#95a5a6';
      default: return '#95a5a6';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#e74c3c';
      case 'planned': return '#f39c12';
      case 'in_progress': return '#3498db';
      case 'done': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '活跃';
      case 'planned': return '计划';
      case 'in_progress': return '进行中';
      case 'done': return '完成';
      default: return '未知';
    }
  };

  const isLoading = statusLoading || cardsLoading || proposalsLoading || violationsLoading;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Compass size={20} aria-hidden="true" className="text-primary" />
          <h1 style={{ fontSize: '18px', margin: 0, fontWeight: 600 }}>C2G 战略决策中心</h1>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
          <div className="spinner" style={{ marginBottom: '8px' }} />
          <div>加载中...</div>
        </div>
      )}

      {/* Error State */}
      {statusError && (
        <div role="alert" style={{ 
          padding: '16px', 
          border: '1px solid rgba(255, 71, 87, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(255, 71, 87, 0.08)',
          color: 'var(--antd-error)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <AlertTriangle size={16} />
            <strong>OMO 状态加载失败</strong>
          </div>
          <div style={{ fontSize: '14px' }}>{statusError.message}</div>
        </div>
      )}

      {/* OMO Status */}
      {status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <Flag size={24} className="text-primary" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{status.system?.current_phase || 'N/A'}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>当前阶段</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <Trophy size={24} className="text-warning" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{status.system?.health_score || 0}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>系统健康分</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <CheckCircle2 size={24} className="text-success" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{status.system?.completed_tasks || 0}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>已完成任务</div>
          </div>
          <div className="antd-card" style={{ textAlign: 'center' }}>
            <ShieldAlert size={24} className="text-danger" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{status.system?.blocked_tasks || 0}</div>
            <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>阻塞任务</div>
          </div>
        </div>
      )}

      {/* CARDS */}
      <div className="antd-card">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Layers size={16} aria-hidden="true" className="text-primary" />
            <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>治理卡片 (CARDS)</h2>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
            {cards?.length || 0} 张卡片
          </span>
        </div>
        
        {cards && cards.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {cards.map((card) => (
              <div
                key={card.id}
                className="antd-card"
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                }}
                onClick={() => handleCheckCard(card)}
                role="button"
                tabIndex={0}
                aria-label={`检查卡片 ${card.title}`}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckCard(card)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <Layers size={16} className="text-muted" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>{card.title}</div>
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                      类型: {card.type} · 域: {card.domain}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getPriorityColor(card.priority),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getPriorityColor(card.priority)}15`,
                  }}>
                    {card.priority}
                  </span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500,
                    color: getStatusColor(card.status),
                    padding: '4px 8px',
                    borderRadius: '4px',
                    background: `${getStatusColor(card.status)}15`,
                  }}>
                    {getStatusText(card.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--antd-text-secondary)' }}>
            <CheckCircle2 size={24} className="text-success" style={{ marginBottom: '8px' }} />
            <div>暂无治理卡片</div>
          </div>
        )}
      </div>

      {/* Check Result */}
      {checkResult && selectedCard && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} aria-hidden="true" className={checkResult.compliant ? 'text-success' : 'text-error'} />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>合规检查结果</h2>
            </div>
            <button
              className="antd-btn small"
              onClick={() => setCheckResult(null)}
              aria-label="关闭"
            >
              <X size={14} />
            </button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 500 }}>卡片:</span>
              <span>{selectedCard.title}</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 500 }}>合规状态:</span>
              <span style={{ 
                color: checkResult.compliant ? 'var(--antd-success)' : 'var(--antd-error)',
                fontWeight: 500,
              }}>
                {checkResult.compliant ? '合规' : '不合规'}
              </span>
            </div>
            
            <div>
              <span style={{ fontWeight: 500 }}>检查约束数:</span>
              <span style={{ marginLeft: '8px' }}>{checkResult.constraints_checked}</span>
            </div>
            
            {checkResult.violations.length > 0 && (
              <div>
                <span style={{ fontWeight: 500, color: 'var(--antd-error)' }}>违规项:</span>
                <ul style={{ margin: '8px 0 0 20px', padding: 0 }}>
                  {checkResult.violations.map((violation, index) => (
                    <li key={index} style={{ fontSize: '13px', color: 'var(--antd-error)' }}>
                      {violation}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {checkResult.guidance && (
              <div>
                <span style={{ fontWeight: 500 }}>指导建议:</span>
                <div style={{ 
                  marginTop: '8px',
                  padding: '12px', 
                  background: 'rgba(0, 242, 254, 0.03)',
                  border: '1px solid rgba(0, 242, 254, 0.08)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}>
                  {checkResult.guidance}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Proposals */}
      {proposals && proposals.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileCode size={16} aria-hidden="true" className="text-info" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>治理提案</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              {proposals.length} 个提案
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {proposals.map((proposal) => (
              <div
                key={proposal.id}
                className="antd-card"
                style={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <FileCode size={16} className="text-muted" />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                      {proposal.debt_id}
                    </div>
                    {proposal.description && (
                      <div style={{ fontSize: '12px', color: 'var(--antd-text-secondary)' }}>
                        {proposal.description}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
                      类型: {proposal.type}
                      {proposal.target_model && <span> · 模型: {proposal.target_model}</span>}
                      {proposal.scope && <span> · 范围: {proposal.scope}</span>}
                    </div>
                  </div>
                </div>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: 500,
                  color: getStatusColor(proposal.status),
                  padding: '4px 8px',
                  borderRadius: '4px',
                  background: `${getStatusColor(proposal.status)}15`,
                }}>
                  {getStatusText(proposal.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Violations */}
      {violations && violations.length > 0 && (
        <div className="antd-card">
          <div className="section-header" style={{ marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} aria-hidden="true" className="text-error" />
              <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>直接 IO 违规</h2>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
              {violations.length} 个违规
            </span>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {violations.map((violation, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  background: 'rgba(255, 71, 87, 0.08)',
                  border: '1px solid rgba(255, 71, 87, 0.35)',
                  borderRadius: '4px',
                  fontSize: '13px',
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                  {violation.file}:{violation.line}
                </div>
                <div style={{ color: 'var(--antd-text-secondary)' }}>
                  {violation.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useMemo } from 'react';
import { Brain, Database, GitBranch } from 'lucide-react';
import { DashboardPage as GBrainDashboard } from './GBrain/GBrainDashboard';
import KnowledgeExecutionWorkbench from './KnowledgeExecutionWorkbench';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface KnowledgeHubViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

function matchesKnowledgeFocusQuery(values: Array<string | null | undefined>, query?: string) {
  const normalizedQuery = query?.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => value?.toLowerCase().includes(normalizedQuery));
}

export default function KnowledgeHubView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: KnowledgeHubViewProps) {
  const focusedKnowledgeCard = useMemo(() => {
    if (matchesKnowledgeFocusQuery(['research', 'study', 'publication', 'insight', '家庭系统研究'], focusTaskQuery)) {
      return {
        kicker: '研究回流',
        title: '研究对象与知识上下文',
        detail: '先回研究中枢确认对象，再把上下文、记忆和后续动作补齐到知识面。',
        objectTarget: { tab: 'Research', taskQuery: focusTaskQuery || 'research' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'research' },
      };
    }

    if (matchesKnowledgeFocusQuery(['knowledge', 'memory', 'context', 'kos', 'rag', '记忆', '知识', '上下文'], focusTaskQuery)) {
      return {
        kicker: '知识对象',
        title: '知识上下文承接',
        detail: '当前上下文更像知识、记忆或检索问题，先在知识中枢看是否具备可执行的上下文供给。',
        objectTarget: { tab: 'Knowledge', taskQuery: focusTaskQuery || 'knowledge' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'knowledge' },
      };
    }

    if (matchesKnowledgeFocusQuery(['asset', 'skill', 'workflow', 'protocol', 'engine', '技能', '工作流', '协议', '引擎'], focusTaskQuery)) {
      return {
        kicker: '执行链联动',
        title: '知识到执行链',
        detail: '当前上下文已经碰到资产、协议或工作流边界，先确认知识是否真的能支撑后续执行。',
        objectTarget: { tab: 'Assets', taskQuery: focusTaskQuery || 'assets' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'assets' },
      };
    }

    if (focusPageId === 'Knowledge') {
      return {
        kicker: '当前页面',
        title: '知识中枢',
        detail: '这页负责把记忆、检索、上下文和执行供给收成一个可观察、可承接的知识面。',
        objectTarget: { tab: 'SystemMap', pageId: 'Knowledge' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Knowledge' },
      };
    }

    return null;
  }, [focusPageId, focusTaskQuery]);

  return (
    <div className="gbrain-wrapper animate-fade-in">
      <KnowledgeExecutionWorkbench currentPage="Knowledge" onNavigate={onNavigate} />

      {focusedKnowledgeCard && (
        <section className="services-section overview-ops-panel" aria-label="当前知识承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前知识承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、页面审计或任务里丢过来的上下文，先翻成知识面应该承接的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedKnowledgeCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedKnowledgeCard.title}</strong>
              <p>{focusedKnowledgeCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开知识焦点对象 ${focusedKnowledgeCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedKnowledgeCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Database size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开知识焦点任务 ${focusedKnowledgeCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedKnowledgeCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <GitBranch size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <div className="services-section" style={{ padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Brain size={16} />
        <span className="text-muted" style={{ fontSize: 13 }}>
          知识中枢继续承接 gbrain 的检索、记忆与执行供给面。
        </span>
      </div>

      <GBrainDashboard />
    </div>
  );
}

import React from 'react';
import { AppWindow, CheckCircle, ExternalLink, FileText, RefreshCw, ShieldAlert } from 'lucide-react';
import '../Dashboard.css';
import GovernanceDomainWorkbench from '../GovernanceDomainWorkbench';
import ActionSurfacePanel from '../ActionSurfacePanel';
import { type CockpitNavigationTarget } from '../cockpitNavigation';
import { useDomainAppsData } from './useDomainAppsData';
import { useDomainAppsDerived } from './useDomainAppsDerived';
import { DomainAppCard } from './DomainAppCard';
import { DomainRouteCards } from './DomainRouteCards';
import { FocusAppPanel } from './FocusAppPanel';
import { AttentionWorkbench } from './AttentionWorkbench';
import { ContractMatrix } from './ContractMatrix';
import { DomainBuildEntry } from './DomainBuildEntry';
import { OpcWorkspacePanel } from './OpcWorkspacePanel';

interface DomainAppsViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  taskQuery?: string;
}

export default function DomainAppsView({ onNavigate, onOpenTarget, taskQuery }: DomainAppsViewProps) {
  const data = useDomainAppsData(taskQuery, onNavigate, onOpenTarget);
  const derived = useDomainAppsDerived(
    data.apps,
    data.opc,
    data.domainBuildRows,
    data.appQuery,
    data.appDomainFilter,
    data.appRuntimeFilter,
    data.attentionFilter,
    data.focusedAppId,
    taskQuery,
  );

  if (data.loading) {
    return (
      <div className="loading-state">
        <div className="spinner" aria-hidden="true"></div>
        <p>正在加载领域应用...</p>
      </div>
    );
  }

  if (!data.apps || !data.opc) {
    return (
      <div
        role="alert"
        style={{
          display: 'flex',
          gap: 8,
          alignItems: 'center',
          padding: 16,
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: 'var(--antd-radius-md)',
          background: 'rgba(239, 68, 68, 0.08)',
          color: 'var(--antd-error)',
        }}
      >
        <ShieldAlert size={18} />
        <span>{data.error || '领域应用数据不可用'}</span>
        <button type="button" className="antd-btn" onClick={() => void data.load()}>
          <RefreshCw size={14} aria-hidden="true" />
          <span>重试领域应用</span>
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <GovernanceDomainWorkbench currentPage="DomainApps" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      {data.error && (
        <div className="system-map-action-feedback error" role="alert">
          <ShieldAlert size={14} />
          <span>{data.error}</span>
          <button type="button" className="antd-btn small" onClick={() => void data.load()}>
            <RefreshCw size={13} aria-hidden="true" />
            <span>重试补充数据</span>
          </button>
        </div>
      )}

      <ActionSurfacePanel
        title="领域挂载执行区"
        subtitle="领域应用不只看运行态，直接联动家庭任务、治理和 OPC 作战台。"
        statusText={`ready ${data.apps.summary.ready} · attention ${data.apps.summary.security_warn + data.apps.summary.security_failed}`}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        items={[
          {
            id: 'tasks',
            title: '沉到任务中心',
            detail: '领域应用的安全门或运行问题需要继续跟踪时，回任务中心接住。',
            actionLabel: '去任务中心',
            actionType: 'navigate',
            actionValue: 'TaskCenter',
            actionTarget: { tab: 'TaskCenter', taskQuery: taskQuery || derived.filteredApps[0]?.id || 'DomainApps' },
          },
          {
            id: 'l4',
            title: '看域健康',
            detail: '如果问题已经扩散到领域层信号和状态，直接去 L4 健康页确认。',
            actionLabel: '去 L4 健康',
            actionType: 'navigate',
            actionValue: 'L4Health',
            actionTarget: { tab: 'L4Health', taskQuery: taskQuery || derived.filteredApps[0]?.domain.id || derived.filteredApps[0]?.id || 'DomainApps' },
          },
          {
            id: 'knowledge',
            title: '回知识中枢',
            detail: '领域应用经验和规范需要沉淀时，回知识页整理为长期资产。',
            actionLabel: '去知识页',
            actionType: 'navigate',
            actionValue: 'Knowledge',
            actionTarget: { tab: 'Knowledge', taskQuery: taskQuery || derived.filteredApps[0]?.id || 'DomainApps' },
          },
          {
            id: 'copy-opc',
            title: '复制 OPC 周目标模板',
            detail: '给 OPC 作战台整理本周动作时，直接从固定模板起步。',
            actionLabel: '复制模板',
            actionType: 'copy',
            actionValue: '本周三件事 / 发布节奏 / 核心指标 / 风险与下一步',
          },
        ]}
      />

      {(data.actionNotice || data.actionError) && (
        <div
          className={`system-map-action-feedback ${data.actionError ? 'error' : 'success'}`}
          role={data.actionError ? 'alert' : 'status'}
          style={{ marginTop: 16 }}
        >
          {data.actionError || data.actionNotice}
        </div>
      )}

      <DomainRouteCards
        cards={derived.domainRouteCards}
        onPrimaryAction={(card) => {
          if (card.id === 'route-opc-workspace-summary') {
            document.getElementById('opc-workspace')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          } else {
            data.setFocusedAppId(card.handoffValue);
          }
        }}
        onSecondaryAction={(card) => {
          if (card.id === 'route-opc-workspace-summary') {
            data.openTaskCenter('opc');
          } else {
            data.openTaskCenter(card.handoffValue);
          }
        }}
      />

      {derived.focusedApp && (
        <FocusAppPanel
          focusedApp={derived.focusedApp}
          focusSignals={derived.focusSignals}
          focusLaunchUrl={derived.focusLaunchUrl}
          focusApiUrl={derived.focusApiUrl}
          focusVerifyCommand={derived.focusVerifyCommand}
          focusCapabilities={derived.focusCapabilities}
          onOpenTaskCenter={data.openTaskCenter}
          onOpenSystemMap={data.openSystemMap}
        />
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success"><AppWindow size={20} /></div>
          <div className="stat-info">
            <h3>登记应用</h3>
            <p className="stat-value">{data.apps.summary.total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <h3>就绪</h3>
            <p className="stat-value">{data.apps.summary.ready}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-accent"><ExternalLink size={20} /></div>
          <div className="stat-info">
            <h3>运行中</h3>
            <p className="stat-value">{data.apps.summary.running} / {data.apps.summary.total}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-warning"><ShieldAlert size={20} /></div>
          <div className="stat-info">
            <h3>高风险</h3>
            <p className="stat-value">{data.apps.summary.high_risk}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-success"><CheckCircle size={20} /></div>
          <div className="stat-info">
            <h3>安全通过</h3>
            <p className="stat-value">{data.apps.summary.security_passed}</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper pulse-warning"><ShieldAlert size={20} /></div>
          <div className="stat-info">
            <h3>安全待处理</h3>
            <p className="stat-value">{data.apps.summary.security_warn + data.apps.summary.security_failed}</p>
          </div>
        </div>
      </div>

      <div className="section-header" style={{ marginTop: 8, marginBottom: 16 }}>
        <h2 style={{ fontSize: 16 }}>领域应用</h2>
        <button className="antd-btn" onClick={data.load}>
          <RefreshCw size={14} />
          <span>刷新</span>
        </button>
      </div>

      <section className="services-section" aria-label="领域应用筛选" style={{ marginBottom: 20 }}>
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>应用筛选</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              同一组筛选同时作用于关注工作台、合同矩阵、应用剖面和领域承接路径。
            </p>
          </div>
          <span className="status-badge online">显示 {derived.filteredApps.length} / {data.apps.items.length}</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'end' }}>
          <label style={{ display: 'grid', gap: 4, minWidth: 220 }}>
            <span className="text-muted" style={{ fontSize: 12 }}>关键词</span>
            <input
              aria-label="搜索领域应用"
              value={data.appQuery}
              onChange={(event) => data.setAppQuery(event.target.value)}
              placeholder="应用、领域或挂载方式"
            />
          </label>
          <label style={{ display: 'grid', gap: 4, minWidth: 180 }}>
            <span className="text-muted" style={{ fontSize: 12 }}>领域</span>
            <select aria-label="按领域筛选应用" value={data.appDomainFilter} onChange={(event) => data.setAppDomainFilter(event.target.value)}>
              <option value="all">全部领域</option>
              {derived.appDomainOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label style={{ display: 'grid', gap: 4, minWidth: 160 }}>
            <span className="text-muted" style={{ fontSize: 12 }}>运行态</span>
            <select aria-label="按运行态筛选应用" value={data.appRuntimeFilter} onChange={(event) => data.setAppRuntimeFilter(event.target.value)}>
              <option value="all">全部运行态</option>
              <option value="running">运行中</option>
              <option value="stopped">未运行</option>
              <option value="not_applicable">无需运行</option>
            </select>
          </label>
          {(data.appQuery || data.appDomainFilter !== 'all' || data.appRuntimeFilter !== 'all') && (
            <button
              className="antd-btn small"
              aria-label="清除领域应用筛选"
              onClick={() => {
                data.setAppQuery('');
                data.setAppDomainFilter('all');
                data.setAppRuntimeFilter('all');
              }}
            >
              清除筛选
            </button>
          )}
        </div>
      </section>

      <AttentionWorkbench
        filteredAttentionItems={derived.filteredAttentionItems}
        attentionCounts={derived.attentionCounts}
        attentionFilter={data.attentionFilter}
        onAttentionFilterChange={data.setAttentionFilter}
        onFocusApp={data.setFocusedAppId}
        onOpenTaskCenter={data.openTaskCenter}
        onQueueAction={data.queueDomainAction}
        onExecuteVerification={data.executeDomainVerification}
        isActionPending={data.actionPendingFor}
        verificationPendingFor={data.verificationPendingFor}
      />

      <ContractMatrix
        filteredApps={derived.filteredApps}
        appsTotal={data.apps.summary.total}
        contractSummary={derived.contractSummary}
        onFocusApp={data.setFocusedAppId}
        onOpenTaskCenter={data.openTaskCenter}
      />

      <DomainBuildEntry
        domainBuildRows={data.domainBuildRows}
        domainBuildSummary={derived.domainBuildSummary}
        onOpenTarget={onOpenTarget}
        onNavigate={onNavigate}
      />

      <div className="stats-grid domain-app-stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
        {derived.filteredApps.map((app) => (
          <div key={app.id} style={{ display: 'grid', gap: 8 }}>
            <DomainAppCard
              app={app}
              focused={app.id === data.focusedAppId}
              onQueueAction={(action) => void data.queueDomainAction(app, action)}
              onExecuteVerification={() => void data.executeDomainVerification(app)}
              isActionPending={(action) => data.actionPendingFor(app, action)}
              verificationPending={data.verificationPendingFor(app)}
            />
            <div className="home-focus-actions" style={{ marginTop: 0 }}>
              <button className="antd-btn small" onClick={() => data.setFocusedAppId(app.id)}>
                <FileText size={13} />
                <span>查看剖面</span>
              </button>
              <button className="antd-btn small" onClick={() => data.openTaskCenter(app.id)}>
                <AppWindow size={13} />
                <span>相关任务</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <OpcWorkspacePanel opc={data.opc} />
    </div>
  );
}


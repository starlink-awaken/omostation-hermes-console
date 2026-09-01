import React from 'react';
import { AppWindow, Copy, ExternalLink, FileText } from 'lucide-react';
import { type DomainApp } from './types';
import { badgeClass, healthLabels, nextActionForApp, riskText, runtimeLabels, securityText } from './utils';

type FocusSignal = { id: string; label: string; detail: string };

export function FocusAppPanel({
  focusedApp,
  focusSignals,
  focusLaunchUrl,
  focusApiUrl,
  focusVerifyCommand,
  focusCapabilities,
  onOpenTaskCenter,
  onOpenSystemMap,
}: {
  focusedApp: DomainApp;
  focusSignals: FocusSignal[];
  focusLaunchUrl: string | null;
  focusApiUrl: string | null;
  focusVerifyCommand: string;
  focusCapabilities: string[];
  onOpenTaskCenter: (query: string) => void;
  onOpenSystemMap: () => void;
}) {
  return (
    <>
      <section className="domain-app-focus-banner" role="region" aria-label="当前聚焦领域应用">
        <div>
          <span>来源任务已定位到领域应用</span>
          <strong>当前聚焦：{focusedApp.name}</strong>
          <small>{focusedApp.id} · {focusedApp.domain.name} · {nextActionForApp(focusedApp)}</small>
        </div>
        <button
          className="antd-btn small"
          onClick={() => document.getElementById(`domain-app-${focusedApp.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
        >
          <AppWindow size={13} />
          <span>查看应用卡片</span>
        </button>
      </section>

      <section className="services-section" role="region" aria-label="当前聚焦应用闭环">
        <div className="section-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>当前聚焦应用闭环</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              从应用剖面继续往任务、系统地图和真实入口走，别让领域应用停在"看见状态"这一步。
            </p>
          </div>
          <span className={`status-badge ${focusedApp.runtime.status === 'running' ? 'online' : 'degraded'}`}>
            {focusedApp.domain.name} · {focusedApp.runtime.status}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <strong style={{ fontSize: 15 }}>任务承接</strong>
              <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                先把 {focusedApp.name} 的风险、启动和验证动作沉到任务中心，后续才能留痕和跟踪。
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="antd-btn small" aria-label="打开聚焦应用任务" onClick={() => onOpenTaskCenter(focusedApp.id)}>
                <AppWindow size={13} />
                <span>按应用筛任务</span>
              </button>
              <button className="antd-btn small" aria-label="打开聚焦领域任务" onClick={() => onOpenTaskCenter(focusedApp.domain.name)}>
                <FileText size={13} />
                <span>按领域筛任务</span>
              </button>
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <strong style={{ fontSize: 15 }}>系统收口</strong>
              <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                应用挂载问题如果已经影响全站入口、能力域或治理视图，就回系统地图确认它的真实落点。
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <button className="antd-btn small" aria-label="打开聚焦应用系统地图" onClick={onOpenSystemMap}>
                <FileText size={13} />
                <span>回系统地图</span>
              </button>
              <button
                className="antd-btn small"
                aria-label="复制聚焦应用验证命令"
                onClick={() => void navigator.clipboard.writeText(focusVerifyCommand || focusedApp.commands.start || '')}
                disabled={!focusVerifyCommand && !focusedApp.commands.start}
              >
                <Copy size={13} />
                <span>复制命令</span>
              </button>
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 6 }}>
              <strong style={{ fontSize: 15 }}>真实入口</strong>
              <p className="text-muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                入口、API 和认证是否可用，最好在这里顺手验证，不要只停在文档登记。
              </p>
            </div>
            <div style={{ display: 'grid', gap: 8 }}>
              <small className="text-muted">认证 {focusedApp.auth.type || '未登记'} · 新鲜度 {String(focusedApp.freshness.status || '—')}</small>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {focusLaunchUrl && (
                  <a className="antd-btn small" aria-label="打开聚焦应用真实入口" href={focusLaunchUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} />
                    <span>打开应用入口</span>
                  </a>
                )}
                {focusApiUrl && (
                  <a className="antd-btn small" aria-label="打开聚焦应用真实接口" href={focusApiUrl} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} />
                    <span>打开 API 入口</span>
                  </a>
                )}
              </div>
            </div>
          </article>
        </div>
      </section>

      <section className="system-map-page-focus" role="region" aria-label="当前聚焦应用剖面">
        <div className="system-map-page-focus-head">
          <div>
            <span className={`status-badge ${badgeClass(focusedApp.health)}`}>
              {healthLabels[focusedApp.health] || focusedApp.health}
            </span>
            <h3>{focusedApp.name}</h3>
            <p>{focusedApp.domain.name} · {focusedApp.integration_mode} · {focusedApp.layer}</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <span className={`status-badge ${badgeClass(focusedApp.runtime.status)}`}>
              {runtimeLabels[focusedApp.runtime.status] || focusedApp.runtime.status}
            </span>
            <span className={`status-badge ${badgeClass(focusedApp.risk_level)}`}>
              {riskText(focusedApp.risk_level)}
            </span>
            <span className={`status-badge ${badgeClass(focusedApp.security_summary.posture)}`}>
              {securityText(focusedApp.security_summary.posture)}
            </span>
          </div>
        </div>

        <div className="system-map-page-focus-grid">
          <div className="system-map-page-focus-panel">
            <strong>运行与入口</strong>
            <div className="system-map-page-focus-links" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              <span>启动 {runtimeLabels[focusedApp.runtime.launch.status] || focusedApp.runtime.launch.status}</span>
              <span>API {runtimeLabels[focusedApp.runtime.api.status] || focusedApp.runtime.api.status}</span>
              <span>新鲜度 {String(focusedApp.freshness.status || '—')}</span>
              <span>认证 {focusedApp.auth.type || '—'}</span>
            </div>
            <small className="system-map-page-focus-next">
              {focusLaunchUrl || focusApiUrl ? '入口已登记，可直接打开验证。' : '入口未登记，先补 launch/api URL 再进入挂载。'}
            </small>
          </div>

          <div className="system-map-page-focus-panel">
            <strong>安全与风险</strong>
            <div className="system-map-page-focus-signals">
              {focusSignals.map((signal) => (
                <div key={signal.id} className="system-map-page-focus-signal">
                  <span>{signal.label}</span>
                  <small>{signal.detail}</small>
                </div>
              ))}
            </div>
          </div>

          <div className="system-map-page-focus-panel">
            <strong>边界与能力</strong>
            <div className="system-map-page-focus-signals">
              <div className="system-map-page-focus-signal">
                <span>SSOT 根</span>
                <small>{focusedApp.paths.ssot_root?.path || '未登记'}</small>
              </div>
              <div className="system-map-page-focus-signal">
                <span>应用根</span>
                <small>{focusedApp.paths.app_root?.path || '未登记'}</small>
              </div>
              <div className="system-map-page-focus-signal">
                <span>能力范围</span>
                <small>{focusCapabilities.length > 0 ? focusCapabilities.join(' · ') : '未登记读写能力'}</small>
              </div>
            </div>
          </div>

          <div className="system-map-page-focus-panel">
            <strong>验证与下一步</strong>
            <small className="system-map-page-focus-next">下一步：{nextActionForApp(focusedApp)}</small>
            <div className="system-map-page-focus-signals">
              <div className="system-map-page-focus-signal">
                <span>启动命令</span>
                <small>{focusedApp.commands.start || '未登记启动命令'}</small>
              </div>
              <div className="system-map-page-focus-signal">
                <span>验证命令</span>
                <small>{focusVerifyCommand || '未登记验证命令'}</small>
              </div>
            </div>
          </div>
        </div>

        <div className="system-map-page-focus-actions-grid">
          <button className="system-map-page-focus-action" onClick={() => onOpenTaskCenter(focusedApp.id)}>
            <span>任务中心</span>
            <small>按应用筛任务</small>
          </button>
          <button className="system-map-page-focus-action" onClick={() => onOpenTaskCenter(focusedApp.domain.name)}>
            <span>领域追踪</span>
            <small>按领域筛任务</small>
          </button>
          {focusLaunchUrl && (
            <a className="system-map-page-focus-action" href={focusLaunchUrl} target="_blank" rel="noreferrer">
              <span>打开应用</span>
              <small>{focusLaunchUrl}</small>
            </a>
          )}
          {focusApiUrl && (
            <a className="system-map-page-focus-action" href={focusApiUrl} target="_blank" rel="noreferrer">
              <span>打开 API</span>
              <small>{focusApiUrl}</small>
            </a>
          )}
          {focusedApp.commands.start && (
            <button className="system-map-page-focus-action" onClick={() => void navigator.clipboard.writeText(focusedApp.commands.start || '')}>
              <span>复制启动命令</span>
              <small>{focusedApp.commands.start}</small>
            </button>
          )}
          {focusVerifyCommand && (
            <button className="system-map-page-focus-action" onClick={() => void navigator.clipboard.writeText(focusVerifyCommand)}>
              <span>复制验证命令</span>
              <small>{focusedApp.commands.verify[0]}</small>
            </button>
          )}
        </div>
      </section>
    </>
  );
}

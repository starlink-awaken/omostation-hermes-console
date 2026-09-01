import React from 'react';
import { ClipboardCheck, Copy, Layers, Route } from 'lucide-react';
import { type ProtocolLayer, type ProtocolWorkflow } from './types';
import { type ProtocolPayload } from './types';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from '../cockpitNavigation';
import { copyText, shortTime, statusLabel } from './utils';

export function ProtocolEvidenceSection({
  payload,
  filteredCommands,
  filteredPages,
  workflowTarget,
  governanceTarget,
  assetsTarget,
  focusTaskQuery,
  onNavigate,
  onOpenTarget,
}: {
  payload: ProtocolPayload;
  filteredCommands: ProtocolPayload['commands'];
  filteredPages: ProtocolPayload['related_pages'];
  workflowTarget: string;
  governanceTarget: string;
  assetsTarget: string;
  focusTaskQuery?: string;
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
}) {
  const watchLayers = payload.layers.filter((layer) => layer.status !== 'ready');
  const activeRuns = payload.recent_workflows.filter((workflow) => workflow.status !== 'completed');
  const layerItems = (watchLayers.length ? watchLayers : payload.layers).slice(0, 3);

  return (
    <section className="services-section">
      <div className="section-header">
        <div>
          <h2>协议补证与承接</h2>
          <p className="text-muted">把待排查层、待补证据和承接页面放在一起，协议面才算能真正驱动执行。</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          <span className="status-badge degraded">观察层 {watchLayers.length}</span>
          <span className="status-badge degraded">未闭环运行 {activeRuns.length}</span>
          <span className="status-badge online">承接页 {payload.related_pages.length}</span>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="section-header" style={{ marginBottom: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>待排查协议层</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>先抓观察层，没有观察层时也给出当前最关键的一层入口。</p>
            </div>
            <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: workflowTarget, taskQuery: focusTaskQuery || 'Protocol' }, onNavigate, onOpenTarget)}>
              <Route size={14} />
              <span>看工作流页</span>
            </button>
          </div>
          {layerItems.length === 0 ? (
            <p className="text-muted" style={{ margin: 0 }}>暂无协议层数据。</p>
          ) : (
            <div style={{ display: 'grid', gap: 10 }}>
              {layerItems.map((layer) => (
                <button
                  key={`layer-${layer.id}`}
                  type="button"
                  className="action-surface-item"
                  aria-label={`排查协议层 ${layer.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: layer.status === 'ready' ? workflowTarget : assetsTarget, taskQuery: layer.id || layer.title || focusTaskQuery || 'Protocol' }, onNavigate, onOpenTarget)}
                  style={{ textAlign: 'left', width: '100%' }}
                >
                  <div>
                    <strong>{layer.title}</strong>
                    <p>{layer.next_action}</p>
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      {statusLabel(layer.status)} · {layer.facts[0] || layer.role}
                    </span>
                  </div>
                  <Layers size={14} />
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15 }}>待补证据</h3>
            <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>命令先复制，运行状态再回看，别让协议页只停在"看定义"。</p>
          </div>
          <div style={{ display: 'grid', gap: 10 }}>
            {filteredCommands.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的补证命令。</p>
            ) : filteredCommands.map((command) => (
              <button
                key={command.id}
                type="button"
                className="action-surface-item"
                onClick={() => void copyText(command.value)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{command.label}</strong>
                  <p>{command.detail}</p>
                  <code style={{ fontSize: 12, color: 'var(--antd-primary)' }}>{command.value}</code>
                </div>
                <Copy size={14} />
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {activeRuns.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>最近运行都已闭环，继续按清单巡检即可。</p>
            ) : activeRuns.map((workflow) => (
              <div key={`run-${workflow.id}`} className="action-surface-item" style={{ alignItems: 'center' }}>
                <div>
                  <strong>{workflow.task}</strong>
                  <p>{workflow.id} · {shortTime(workflow.updated_at)}</p>
                </div>
                <span className={`status-badge ${workflow.status === 'running' ? 'degraded' : 'offline'}`}>{workflow.status}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="section-header" style={{ marginBottom: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>承接页面与路线</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>协议层问题最后都要落到页面、路线图和治理面上。</p>
            </div>
            <button type="button" className="antd-btn" onClick={() => openCockpitNavigationTarget({ tab: governanceTarget, taskQuery: focusTaskQuery || 'Protocol' }, onNavigate, onOpenTarget)}>
              <ClipboardCheck size={14} />
              <span>看治理面</span>
            </button>
          </div>

          {(payload.roadmap_item || payload.playbook) && (
            <div style={{ display: 'grid', gap: 10 }}>
              {payload.roadmap_item && (
                <div className="action-surface-item">
                  <div>
                    <strong>{payload.roadmap_item.title || '路线图项'}</strong>
                    <p>{payload.roadmap_item.problem || '需要继续推进协议层收口。'}</p>
                  </div>
                  <span className="status-badge degraded">{payload.roadmap_item.priority || 'P?'}</span>
                </div>
              )}
              {payload.playbook && (
                <div className="action-surface-item">
                  <div>
                    <strong>{payload.playbook.title || '巡检清单'}</strong>
                    <p>{payload.playbook.goal || '保持协议层巡检节奏。'}</p>
                  </div>
                  <span className="status-badge online">Playbook</span>
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gap: 10 }}>
            {filteredPages.length === 0 ? (
              <p className="text-muted" style={{ margin: 0 }}>当前筛选下没有匹配的承接页面。</p>
            ) : filteredPages.map((page) => (
              <button
                key={page.id}
                type="button"
                className="action-surface-item"
                aria-label={`查看承接页面 ${page.title}`}
                onClick={() => openCockpitNavigationTarget({ tab: page.id, taskQuery: page.id || focusTaskQuery || 'Protocol' }, onNavigate, onOpenTarget)}
                style={{ textAlign: 'left', width: '100%' }}
              >
                <div>
                  <strong>{page.title}</strong>
                  <p>{page.reason}</p>
                </div>
                <ClipboardCheck size={14} />
              </button>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

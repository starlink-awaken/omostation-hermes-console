import React, { useState } from 'react';
import { Terminal, Play, Loader2, ShieldAlert, Copy } from 'lucide-react';
import './Dashboard.css';
import PlatformControlWorkbench from './PlatformControlWorkbench';
import ActionSurfacePanel from './ActionSurfacePanel';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface SandboxTerminalProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusTaskQuery?: string;
}

function matchesSandboxFocusQuery(values: Array<string | null | undefined>, query?: string | null) {
  if (!query) return false;
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedQuery));
}

export default function SandboxTerminal({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusTaskQuery,
}: SandboxTerminalProps) {
  const [code, setCode] = useState('print("Hello from eCOS Sandbox!")\n');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [isQueueingResult, setIsQueueingResult] = useState(false);

  const handleExecute = async () => {
    setIsRunning(true);
    setOutput('正在安全沙箱中执行...');
    
    try {
      const response = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setOutput(`错误: ${data.error || response.statusText}`);
        return;
      }

      if (data.success) {
        const duration = typeof data.duration_ms === 'number' ? `${data.duration_ms.toFixed(2)}ms` : '未提供';
        setOutput(`[执行成功] 耗时: ${duration}\n\n[标准输出]\n${data.stdout || '（无标准输出）'}\n\n[返回值]\n${JSON.stringify(data.output ?? null, null, 2)}`);
      } else {
        setOutput(`[执行被拦截或失败]\n\n${data.error}`);
      }
    } catch (err: any) {
      setOutput(`网络异常: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const queueSandboxResult = async () => {
    if (!code.trim() || !output.trim()) {
      setDraftNotice('请先完成一次沙箱实验，再登记结果。');
      return;
    }
    setIsQueueingResult(true);
    setDraftNotice(null);
    try {
      const response = await fetch('/api/cockpit/sandbox/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          output,
          title: `沙箱实验结果：${code.split('\n')[0]?.trim() || '未命名实验'}`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.detail || data.error || '结果登记失败');
      setDraftNotice(data.created === false ? '这份沙箱结果已经登记过。' : '沙箱结果已登记到任务中心。');
      if (data.id) openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: data.id }, onNavigate, onOpenTarget);
    } catch (error: any) {
      setDraftNotice(`沙箱结果登记失败：${error.message || '请稍后重试。'}`);
    } finally {
      setIsQueueingResult(false);
    }
  };

  const focusedSandboxCard = (() => {
    if (matchesSandboxFocusQuery([code, output], focusTaskQuery)) {
      return {
        kicker: '当前实验',
        title: focusTaskQuery || '沙箱实验',
        detail: output
          ? output.split('\n').slice(0, 2).join(' · ')
          : '当前焦点已经命中沙箱代码或输出，可以继续在这里验证并决定去向。',
        objectTarget: { tab: 'Sandbox', taskQuery: focusTaskQuery || 'Sandbox' },
        taskTarget: { tab: 'TaskCenter', taskQuery: focusTaskQuery || 'Sandbox' },
      };
    }

    if (focusPageId === 'Sandbox') {
      return {
        kicker: '当前页面',
        title: '隔离沙箱',
        detail: '这页负责把试验代码、运行输出和后续日志/引擎/任务承接串起来，不只是一个执行按钮。',
        objectTarget: { tab: 'SystemMap', pageId: 'Sandbox' },
        taskTarget: { tab: 'TaskCenter', taskQuery: 'Sandbox' },
      };
    }

    return null;
  })();
  const sandboxTaskDraft = (() => {
    const experimentTitle = focusTaskQuery || code.split('\n')[0]?.trim() || '沙箱实验';
    const title = `补齐沙箱实验 ${experimentTitle} 的收口`;
    const description = output
      ? `当前实验已经有输出，下一步要把结果带回日志、引擎或任务中心，而不是停在控制台里。`
      : '当前实验还没有稳定输出，先运行一次，再决定要回引擎、日志还是任务中心。';
    const checklist = [
      '先确认实验输出是否足够支持下一步判断',
      '如果实验异常，回日志页补完整证据',
      '如果实验通过，回引擎页或任务中心把动作落成正式承接',
    ];
    const copyText = [
      `标题: ${title}`,
      `实验对象: ${experimentTitle}`,
      `任务描述: ${description}`,
      '建议动作:',
      ...checklist.map((item, index) => `${index + 1}. ${item}`),
      '验收标准:',
      '- 沙箱输出已经被带到日志、引擎或任务中心之一',
      `- TaskCenter 可直接检索 ${experimentTitle} 的实验后续任务`,
      '- 沙箱页不再只是执行代码，而有明确收口去向',
    ].join('\n');

    return {
      title,
      description,
      checklist,
      copyText,
      engineTarget: { tab: 'Engines' },
      taskTarget: { tab: 'TaskCenter', taskQuery: experimentTitle },
    };
  })();

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <PlatformControlWorkbench currentPage="Sandbox" onNavigate={onNavigate} onOpenTarget={onOpenTarget} />

      <ActionSurfacePanel
        title="沙箱动作区"
        subtitle="先做小实验，再把结果带回调度、日志或任务中心，不用离开这个上下文自己找路。"
        statusText={isRunning ? '执行中' : '可立即验证'}
        onNavigate={onNavigate}
        onOpenTarget={onOpenTarget}
        items={[
          {
            id: 'copy-code',
            title: '复制当前代码',
            detail: '把当前片段带去别处复用，或者发给任务/工作流上下文。',
            actionLabel: '复制代码',
            actionType: 'copy',
            actionValue: code,
          },
          {
            id: 'engines',
            title: '回引擎页',
            detail: '验证通过后，直接回调度页把更大的任务真正跑起来。',
            actionLabel: '去引擎页',
            actionType: 'navigate',
            actionValue: 'Engines',
          },
          {
            id: 'logs',
            title: '看日志',
            detail: '执行失败或结果异常时，直接去日志页找更完整的上下文。',
            actionLabel: '去日志页',
            actionType: 'navigate',
            actionValue: 'LogViewer',
          },
          {
            id: 'tasks',
            title: '落到任务',
            detail: '实验确认后，回任务中心把下一步动作沉到正式任务或草稿。',
            actionLabel: '去任务中心',
            actionType: 'navigate',
            actionValue: 'TaskCenter',
          },
        ]}
      />

      {focusedSandboxCard && (
        <section className="services-section overview-ops-panel" aria-label="当前沙箱承接焦点">
          <div className="section-header">
            <div>
              <h2 style={{ margin: 0, fontSize: 16 }}>当前沙箱承接焦点</h2>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
                把系统地图、搜索或任务里丢过来的上下文，直接翻成眼下这个实验该继续验证的对象。
              </p>
            </div>
            <span className="status-badge online">{focusedSandboxCard.kicker}</span>
          </div>
          <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
            <div>
              <strong>{focusedSandboxCard.title}</strong>
              <p>{focusedSandboxCard.detail}</p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开沙箱焦点对象 ${focusedSandboxCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedSandboxCard.objectTarget, onNavigate, onOpenTarget)}
              >
                <Terminal size={14} />
                <span>打开对象</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开沙箱焦点任务 ${focusedSandboxCard.title}`}
                onClick={() => openCockpitNavigationTarget(focusedSandboxCard.taskTarget, onNavigate, onOpenTarget)}
              >
                <ShieldAlert size={14} />
                <span>打开任务</span>
              </button>
            </div>
          </article>
        </section>
      )}

      <section className="services-section">
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>沙箱承接工作台</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              先看当前试验状态，再决定回引擎、日志还是任务中心继续收口，不让沙箱只剩执行器。
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <span className="status-badge degraded">代码 {code.trim() ? 'ready' : 'empty'}</span>
            <span className="status-badge online">输出 {output ? 'captured' : 'pending'}</span>
            <span className={`status-badge ${isRunning ? 'degraded' : 'online'}`}>{isRunning ? '执行中' : '待执行'}</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>实验状态</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>把当前沙箱实验抽成状态卡，方便立刻决定下一步。</p>
            </div>
            <div className="action-surface-item" style={{ alignItems: 'flex-start' }}>
              <div>
                <strong>{isRunning ? '执行中' : '等待执行'}</strong>
                <p>{output ? output.split('\n').slice(0, 2).join(' · ') : '还没有输出，先运行一次或修改代码后再看结果。'}</p>
              </div>
            </div>
          </article>

          <article className="antd-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>实验去向</h3>
              <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>实验不是终点，结果要继续回引擎、日志或任务承接。</p>
            </div>
            {[
              { id: 'Engines', label: '引擎页', reason: '把实验扩大成真正的运行编排。', aria: '打开沙箱承接到引擎页' },
              { id: 'LogViewer', label: '日志页', reason: '执行异常或结果不稳时去追完整证据。', aria: '打开沙箱承接到日志页' },
              { id: 'TaskCenter', label: '任务中心', reason: '把实验结论沉到正式任务或草稿。', aria: '打开沙箱承接到任务中心' },
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
                <Terminal size={14} />
              </button>
            ))}
          </article>
        </div>
      </section>

      <section className="services-section" role="region" aria-label="沙箱补位任务">
        <div className="section-header">
          <div>
            <h2 style={{ fontSize: 16, margin: 0 }}>沙箱补位任务</h2>
            <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              把当前实验直接翻成下一步要追的任务，不让沙箱只剩执行代码这一锤子。
            </p>
          </div>
          <span className="status-badge degraded">任务草稿</span>
        </div>
        <article className="action-surface-item" style={{ alignItems: 'flex-start' }}>
          <div>
            <strong>{sandboxTaskDraft.title}</strong>
            <p>{sandboxTaskDraft.description}</p>
            <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
              {sandboxTaskDraft.checklist.map((item, index) => (
                <small key={`${sandboxTaskDraft.title}-${index}`} className="text-muted">{index + 1}. {item}</small>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              className="antd-btn"
              aria-label={`复制沙箱补位任务 ${sandboxTaskDraft.title}`}
              onClick={async () => {
                await navigator.clipboard.writeText(sandboxTaskDraft.copyText);
                setDraftNotice(`已复制沙箱补位任务：${sandboxTaskDraft.title}`);
              }}
            >
              <Copy size={14} />
              <span>复制补位任务</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开沙箱补位引擎 ${sandboxTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(sandboxTaskDraft.engineTarget, onNavigate, onOpenTarget)}
            >
              <Terminal size={14} />
              <span>回引擎页</span>
            </button>
            <button
              type="button"
              className="antd-btn"
              aria-label={`打开沙箱补位任务 ${sandboxTaskDraft.title}`}
              onClick={() => openCockpitNavigationTarget(sandboxTaskDraft.taskTarget, onNavigate, onOpenTarget)}
            >
              <ShieldAlert size={14} />
              <span>送进任务中心</span>
            </button>
            <button
              type="button"
              className="antd-btn antd-btn-primary"
              aria-label="登记当前沙箱结果"
              disabled={isQueueingResult || !output}
              onClick={() => void queueSandboxResult()}
            >
              <ShieldAlert size={14} />
              <span>{isQueueingResult ? '登记中...' : '登记实验结果'}</span>
            </button>
          </div>
        </article>
        {draftNotice && (
          <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{draftNotice}</p>
        )}
      </section>

      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Terminal size={18} aria-hidden="true" className="text-accent" />
          <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>运行时沙箱 (KEI 隔离)</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--antd-warning)', fontSize: '13px' }}>
          <ShieldAlert size={14} aria-hidden="true" />
          <span>AST 与进程级沙箱保护已启用</span>
        </div>
      </div>
      
      <div className="antd-card" style={{ padding: '20px' }}>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Editor */}
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="sandbox-code-editor" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>Python 待执行代码</label>
            <textarea 
              id="sandbox-code-editor"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{
                width: '100%',
                height: '300px',
                backgroundColor: 'rgba(6, 9, 19, 0.6)',
                border: '1px solid var(--antd-border-color)',
                borderRadius: 'var(--antd-radius-md)',
                padding: '12px',
                color: 'var(--antd-primary)',
                fontFamily: 'monospace',
                fontSize: '13px',
                resize: 'none',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              className="antd-textarea-focus"
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--antd-primary)';
                e.target.style.boxShadow = 'var(--tech-cyan-glow)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--antd-border-color)';
                e.target.style.boxShadow = 'none';
              }}
              spellCheck="false"
            />
            <button 
              className="antd-btn antd-btn-primary" 
              onClick={handleExecute} 
              disabled={isRunning}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '4px', width: 'fit-content' }}
              aria-label="在沙箱中执行代码"
            >
              {isRunning ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
              {isRunning ? '正在运行...' : '执行代码'}
            </button>
          </div>
          
          {/* Output Console */}
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label htmlFor="sandbox-output" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>控制台标准输出</label>
            <pre 
              id="sandbox-output"
              role="log"
              aria-live="polite"
              style={{
                flex: 1,
                minHeight: '300px',
                backgroundColor: 'rgba(6, 9, 19, 0.8)',
                border: '1px solid var(--antd-border-color)',
                borderRadius: 'var(--antd-radius-md)',
                padding: '12px',
                color: 'var(--antd-text-primary)',
                fontFamily: 'monospace',
                fontSize: '12px',
                whiteSpace: 'pre-wrap',
                overflowY: 'auto'
              }}
            >
              {output || '等待代码执行...'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

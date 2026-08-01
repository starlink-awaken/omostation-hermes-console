/**
 * SandboxTerminal — 运行时沙箱 (KEI 隔离).
 *
 * 从 fullsite 移植的改进:
 *   - 复制输出到剪贴板 (Clipboard API)
 *   - 空输出/null 安全渲染
 *   - 错误类型收窄 (instanceof Error)
 *   - 草稿通知系统 (success/warning)
 *   - 队列结果到 TaskCenter
 */

import React, { useState } from 'react';
import { Check, ClipboardCopy, Loader2, Play, ShieldAlert, Terminal } from 'lucide-react';
import './Dashboard.css';

export default function SandboxTerminal() {
  const [code, setCode] = useState('print("Hello from eCOS Sandbox!")\n');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleExecute = async () => {
    setIsRunning(true);
    setOutput('正在安全沙箱中执行...');
    setDraftNotice(null);

    try {
      const response = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setOutput(`错误: ${data.error || response.statusText}`);
        return;
      }

      if (data.success) {
        const stdout = data.stdout || '（无标准输出）';
        const duration = typeof data.duration_ms === 'number' ? data.duration_ms.toFixed(2) : 'N/A';
        setOutput(`[执行成功] 耗时: ${duration}ms\n\n[标准输出]\n${stdout}\n\n[返回值]\n${JSON.stringify(data.output ?? null, null, 2)}`);
        setDraftNotice('执行成功');
      } else {
        setOutput(`[执行被拦截或失败]\n\n${data.error || '未知错误'}`);
        setDraftNotice(data.error || '执行失败');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '请求失败';
      setOutput(`网络异常: ${message}`);
    } finally {
      setIsRunning(false);
    }
  };

  // 复制输出到剪贴板
  const handleCopyOutput = async () => {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard 不可用 (隐私模式/非 HTTPS)
    }
  };

  // 队列结果到 TaskCenter
  const handleQueueResult = async () => {
    if (!output || isRunning) return;
    setDraftNotice('正在入队...');
    try {
      const response = await fetch('/api/cockpit/sandbox/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, output }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.created === false) {
        setDraftNotice('该结果已入队，无需重复提交');
      } else if (response.ok) {
        setDraftNotice('已入队到任务中心');
      } else {
        setDraftNotice('入队失败，请稍后重试');
      }
    } catch {
      setDraftNotice('入队请求失败');
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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

      {/* 草稿通知 */}
      {draftNotice && (
        <div style={{
          padding: '8px 12px',
          borderRadius: 'var(--antd-radius-md)',
          background: draftNotice.includes('成功') || draftNotice.includes('入队')
            ? 'rgba(0, 242, 254, 0.06)'
            : 'rgba(255, 184, 0, 0.06)',
          border: `1px solid ${draftNotice.includes('成功') || draftNotice.includes('入队')
            ? 'rgba(0, 242, 254, 0.2)'
            : 'rgba(255, 184, 0, 0.2)'}`,
          fontSize: '13px',
          color: draftNotice.includes('成功') || draftNotice.includes('入队')
            ? 'var(--antd-primary)'
            : 'var(--antd-warning)',
        }}>
          {draftNotice}
        </div>
      )}

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
                transition: 'all 0.2s',
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
              spellCheck={false}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="antd-btn antd-btn-primary"
                onClick={handleExecute}
                disabled={isRunning}
                style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', width: 'fit-content' }}
                aria-label="在沙箱中执行代码"
              >
                {isRunning ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Play size={12} aria-hidden="true" />}
                {isRunning ? '正在运行...' : '执行代码'}
              </button>
              <button
                className="antd-btn"
                onClick={handleQueueResult}
                disabled={!output || isRunning}
                aria-label="队列结果到任务中心"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Play size={12} />
                <span>入队</span>
              </button>
            </div>
          </div>

          {/* Output Console */}
          <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label htmlFor="sandbox-output" style={{ fontSize: '13px', color: 'var(--antd-text-secondary)' }}>控制台标准输出</label>
              <button
                className="antd-btn small"
                onClick={handleCopyOutput}
                disabled={!output}
                aria-label="复制输出"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                {copied ? <Check size={12} /> : <ClipboardCopy size={12} />}
                <span>{copied ? '已复制' : '复制'}</span>
              </button>
            </div>
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
                overflowY: 'auto',
                margin: 0,
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

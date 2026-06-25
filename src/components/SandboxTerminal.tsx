import React, { useState } from 'react';
import { Terminal, Play, Loader2, ShieldAlert } from 'lucide-react';
import './Dashboard.css';

export default function SandboxTerminal() {
  const [code, setCode] = useState('print("Hello from eCOS Sandbox!")\n');
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

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
        setOutput(`[执行成功] 耗时: ${data.duration_ms.toFixed(2)}ms\n\n[标准输出]\n${data.stdout}\n\n[返回值]\n${JSON.stringify(data.output, null, 2)}`);
      } else {
        setOutput(`[执行被拦截或失败]\n\n${data.error}`);
      }
    } catch (err: any) {
      setOutput(`网络异常: ${err.message}`);
    } finally {
      setIsRunning(false);
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

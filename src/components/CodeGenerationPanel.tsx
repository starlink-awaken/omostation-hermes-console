/**
 * CodeGenerationPanel — 本地代码生成交互面板.
 */

import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import { useGenerateCode } from './useComputeQueries';

export default function CodeGenerationPanel() {
  const [genPrompt, setGenPrompt] = useState('');
  const [genModel, setGenModel] = useState('coder');
  const [genResult, setGenResult] = useState('');

  const generateMutation = useGenerateCode();

  const runGenerate = () => {
    if (!genPrompt.trim()) return;
    setGenResult('');
    generateMutation.mutate(
      { prompt: genPrompt, model: genModel },
      {
        onSuccess: (data) => {
          if (data?.status === 'success') {
            setGenResult(data.content || '(空)');
          } else {
            setGenResult('❌ ' + (data?.error || '生成失败'));
          }
        },
        onError: (error) => {
          setGenResult('❌ ' + error.message);
        },
      }
    );
  };

  return (
    <div className="antd-card">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Zap size={16} aria-hidden="true" className="text-warning" />
          <h2 style={{ fontSize: '15px', margin: 0, fontWeight: 600 }}>本地代码生成</h2>
        </div>
        <span style={{ fontSize: '12px', color: 'var(--antd-text-muted)' }}>
          经 /api/governance/compute/generate → BOS → omlx
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={genModel}
            onChange={(e) => setGenModel(e.target.value)}
            className="antd-input"
            style={{ width: '120px' }}
            aria-label="选择模型"
          >
            <option value="coder">coder</option>
            <option value="fast">fast</option>
            <option value="precise">precise</option>
          </select>
          <input
            type="text"
            value={genPrompt}
            onChange={(e) => setGenPrompt(e.target.value)}
            placeholder="输入提示词..."
            className="antd-input"
            style={{ flex: 1 }}
            aria-label="输入提示词"
            onKeyDown={(e) => e.key === 'Enter' && runGenerate()}
          />
          <button
            className="antd-btn antd-btn-primary"
            onClick={runGenerate}
            disabled={generateMutation.isPending || !genPrompt.trim()}
            aria-label="生成代码"
          >
            {generateMutation.isPending ? '生成中...' : '生成'}
          </button>
        </div>

        {genResult && (
          <div style={{
            padding: '12px',
            background: genResult.startsWith('❌') ? 'rgba(255, 71, 87, 0.08)' : 'rgba(0, 242, 254, 0.03)',
            border: `1px solid ${genResult.startsWith('❌') ? 'rgba(255, 71, 87, 0.35)' : 'rgba(0, 242, 254, 0.08)'}`,
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
            color: genResult.startsWith('❌') ? 'var(--antd-error)' : 'var(--antd-text-primary)',
          }}>
            {genResult}
          </div>
        )}
      </div>
    </div>
  );
}

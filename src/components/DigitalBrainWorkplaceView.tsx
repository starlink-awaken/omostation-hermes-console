import React, { useState } from 'react';
import './dashboard-views.css';

interface WorkplaceTask {
  id: string;
  title: str;
  deadline: str;
  targetUnits: string[];
  docDraft: string;
  speech: string;
  summaryReport: string;
  status: 'parsed' | 'ready_for_approval' | 'approved' | 'completed';
}

export const DigitalBrainWorkplaceView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workplace' | 'family' | 'health' | 'swarm'>('workplace');
  const [inputText, setInputText] = useState(
    '关于开展卫健系统医疗数据收集与公文汇总的通知：请各下属单位于本周五 17:00 前上报相关表格数据。'
  );

  const [task, setTask] = useState<WorkplaceTask>({
    id: 'task-wp-10086',
    title: '关于开展卫健系统医疗数据收集与公文汇总的通知',
    deadline: '本周五 17:00 前',
    targetUnits: ['一区卫健局', '二区卫健局', '直属第一医院'],
    docDraft: `【转发通知草稿】\n各下属单位：现将上级《关于开展卫健系统医疗数据收集与公文汇总的通知》转发给你们，请于本周五 17:00 前填写附件表格反馈。\n附件：1. 原始通知 2. 数据收集表`,
    speech: '领导您好，关于上级《数据收集通知》，数字大脑已拟定下发公文与模版，拟今日发至各下属单位，请审阅。',
    summaryReport: '【数据收集终局报告】上报完成率 3/3 (100%)，梳理汇总数据 35 条，无缺失项。建议汇总提交上级单位。',
    status: 'ready_for_approval',
  });

  const handleApprove = () => {
    setTask((prev) => ({ ...prev, status: 'completed' }));
  };

  return (
    <div style={{ padding: '24px', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)',
          borderRadius: '16px',
          padding: '24px 32px',
          marginBottom: '24px',
          boxShadow: '0 10px 25px -5px rgba(67, 56, 202, 0.3)',
          border: '1px solid rgba(129, 140, 248, 0.2)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 800, color: '#ffffff' }}>
              🧠 Cybernetic LifeOS 数字大脑工作台
            </h1>
            <p style={{ margin: '8px 0 0 0', color: '#c7d2fe', fontSize: '14px' }}>
              基于心智模型与常驻 Agent 蜂群的自动化决策、政企公文流与长尾领域自主进化引擎
            </p>
          </div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              padding: '8px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 600,
              color: '#818cf8',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            🟢 Swarm Active (4 Nodes Alive)
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          {[
            { id: 'workplace', label: '🏢 Workplace 公文自动化' },
            { id: 'family', label: '🏡 Family & Edu 儿童教育' },
            { id: 'health', label: '💪 Health & LifeOS 精力' },
            { id: 'swarm', label: '📡 Swarm Agent 蜂群监控' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                background: activeTab === tab.id ? '#6366f1' : 'rgba(255, 255, 255, 0.08)',
                color: activeTab === tab.id ? '#ffffff' : '#a5b4fc',
                border: 'none',
                padding: '8px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === 'workplace' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
          {/* Left Column: Task Input & Notice Parsing */}
          <div
            style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #334155',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#38bdf8', fontSize: '18px' }}>
              📥 上级通知 / 邮件文本智能分诊
            </h3>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              rows={4}
              style={{
                width: '100%',
                background: '#0f172a',
                border: '1px solid #475569',
                borderRadius: '8px',
                padding: '12px',
                color: '#f8fafc',
                fontSize: '14px',
                marginBottom: '16px',
              }}
            />
            <button
              style={{
                background: 'linear-gradient(90deg, #0284c7 0%, #0369a1 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              ⚡️ 调起 Workplace Agent 自动拆解
            </button>

            <div style={{ marginTop: '24px', borderTop: '1px solid #334155', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#a855f7' }}>📌 解析要素与三级授权状态</h4>
              <div style={{ fontSize: '14px', lineHeight: '1.8', color: '#cbd5e1' }}>
                <div><strong>任务 ID:</strong> {task.id}</div>
                <div><strong>截止时间:</strong> <span style={{ color: '#f43f5e' }}>{task.deadline}</span></div>
                <div><strong>下发单位:</strong> {task.targetUnits.join(', ')}</div>
                <div>
                  <strong>授权等级:</strong>{' '}
                  <span style={{ background: '#3b82f6', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '12px' }}>
                    Tier 2 (一键 Approve 确认)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Generated Artifacts & One-Click Approve */}
          <div
            style={{
              background: '#1e293b',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #334155',
            }}
          >
            <h3 style={{ margin: '0 0 16px 0', color: '#4ade80', fontSize: '18px' }}>
              📝 自动拟定公文草稿与下级催收卡片
            </h3>

            <div
              style={{
                background: '#0f172a',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '13px',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                color: '#e2e8f0',
                border: '1px solid #334155',
                marginBottom: '16px',
              }}
            >
              {task.docDraft}
            </div>

            <div
              style={{
                background: '#131c31',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                color: '#fbbf24',
                marginBottom: '20px',
                borderLeft: '4px solid #f59e0b',
              }}
            >
              <strong>🗣️ 预演领导汇报话术：</strong> "{task.speech}"
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>当前状态：</strong>
                {task.status === 'completed' ? (
                  <span style={{ color: '#4ade80', fontWeight: 700 }}>✅ 已批准发送并完成汇总上报</span>
                ) : (
                  <span style={{ color: '#f59e0b', fontWeight: 700 }}>⏳ 待人类一键 Approve 审批</span>
                )}
              </div>
              {task.status !== 'completed' && (
                <button
                  onClick={handleApprove}
                  style={{
                    background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(34, 197, 94, 0.4)',
                  }}
                >
                  🚀 Approve 批准自动发送与催收
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab !== 'workplace' && (
        <div
          style={{
            background: '#1e293b',
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center',
            color: '#94a3b8',
          }}
        >
          <h3>🚧 {activeTab.toUpperCase()} 领域 Agent 面板正在分阶段 (Phase 2-3) 热加载中...</h3>
          <p>已绑定 MOS 心智模型与保鲜规则，即将接通动态可视化数据表。</p>
        </div>
      )}
    </div>
  );
};

export default DigitalBrainWorkplaceView;

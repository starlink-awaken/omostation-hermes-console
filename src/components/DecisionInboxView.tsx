/**
 * DecisionInboxView — 决策收件箱视图 (Phase 1.5).
 *
 * 功能:
 * - 收件箱概览 (总意图数/待审批数/来源分布)
 * - 场景列表与详情
 * - 待审批队列 (approve/reject)
 * - 快速摄入 (添加意图到场景)
 */

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Inbox,
  Plus,
  RefreshCw,
  List,
  BarChart3,
  ClipboardList,
  Edit3,
  EyeOff,
} from 'lucide-react';
import {
  useDecisionInboxScenes,
  useInboxSummary,
  useApprovalQueue,
  useApproveIntent,
  useRejectIntent,
  useAddIntent,
  useCreateScene,
  type DecisionInboxScene,
  type ApprovalQueueItem,
} from '../api/hooks';

// ── Tab switcher ──

type Tab = 'overview' | 'scenes' | 'queue' | 'intake';

function TabButton({ id, label, icon: Icon, active, onClick }: {
  id: Tab; label: string; icon: React.FC<{ className?: string }>; active: boolean; onClick: () => void;
}) {
  return (
    <button
      className={`antd-tab ${active ? 'antd-tab-active' : ''}`}
      onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px' }}
    >
      <Icon className="icon" /> {label}
    </button>
  );
}

// ── Main View ──

export default function DecisionInboxView() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [selectedSceneId, setSelectedSceneId] = useState<string>('');
  const [editingIntentId, setEditingIntentId] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');

  const { data: scenes = [], isLoading: scenesLoading } = useDecisionInboxScenes();
  const { data: summary, isLoading: summaryLoading } = useInboxSummary();
  const { data: queueData, isLoading: queueLoading } = useApprovalQueue();
  const approve = useApproveIntent();
  const reject = useRejectIntent();
  const addIntent = useAddIntent(selectedSceneId);
  const createScene = useCreateScene();

  const [newSceneName, setNewSceneName] = useState('');
  const [newIntentContent, setNewIntentContent] = useState('');
  const [newIntentSource, setNewIntentSource] = useState('manual');
  const [newIntentPriority, setNewIntentPriority] = useState('P3');

  const queue = (queueData?.queue ?? []).slice(0, 5);

  const handleApprove = (item: ApprovalQueueItem) => {
    approve.mutate({ intent_id: item.intent_id, reviewer: 'human', note: 'Approved via cockpit-ui' });
  };

  const handleApproveWithEdit = (item: ApprovalQueueItem) => {
    if (!editedContent.trim()) return;
    approve.mutate({ intent_id: item.intent_id, reviewer: 'human', note: 'Approved with edit via cockpit-ui', outcome_metric: editedContent });
    setEditingIntentId(null);
    setEditedContent('');
  };

  const handleIgnore = (item: ApprovalQueueItem) => {
    reject.mutate({ intent_id: item.intent_id, reviewer: 'human', note: 'Ignored via cockpit-ui' });
  };

  const startEdit = (item: ApprovalQueueItem) => {
    setEditingIntentId(item.intent_id);
    setEditedContent(item.raw_content);
  };

  const cancelEdit = () => {
    setEditingIntentId(null);
    setEditedContent('');
  };

  const handleCreateScene = () => {
    if (!newSceneName.trim()) return;
    createScene.mutate({ name: newSceneName });
    setNewSceneName('');
  };

  const handleAddIntent = () => {
    if (!newIntentContent.trim() || !selectedSceneId) return;
    addIntent.mutate({ source: newIntentSource, raw_content: newIntentContent, priority: newIntentPriority });
    setNewIntentContent('');
  };

  return (
    <div className="antd-page">
      <div className="antd-page-header">
        <h1><Inbox className="icon" /> 决策收件箱</h1>
        <p>场景卡驱动的决策生命周期管理 — 从摄入到审批的全链路</p>
      </div>

      {/* Tab bar */}
      <div className="antd-tab-bar" style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        <TabButton id="overview" label="概览" icon={BarChart3} active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
        <TabButton id="scenes" label="场景列表" icon={List} active={activeTab === 'scenes'} onClick={() => setActiveTab('scenes')} />
        <TabButton id="queue" label={`待审批 (${queue.length})`} icon={ClipboardList} active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} />
        <TabButton id="intake" label="快速摄入" icon={Plus} active={activeTab === 'intake'} onClick={() => setActiveTab('intake')} />
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div>
          {summaryLoading ? (
            <div className="antd-card" style={{ padding: 24 }}>加载概览中...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div className="antd-card" style={{ padding: 16 }}>
                <h3>场景数</h3>
                <p style={{ fontSize: 32, fontWeight: 'bold' }}>{summary?.scene_count ?? 0}</p>
              </div>
              <div className="antd-card" style={{ padding: 16 }}>
                <h3>总意图</h3>
                <p style={{ fontSize: 32, fontWeight: 'bold' }}>{summary?.total_intents ?? 0}</p>
              </div>
              <div className="antd-card" style={{ padding: 16, borderLeft: '4px solid #faad14' }}>
                <h3>待审批</h3>
                <p style={{ fontSize: 32, fontWeight: 'bold', color: '#faad14' }}>{summary?.pending_intents ?? 0}</p>
              </div>
              <div className="antd-card" style={{ padding: 16 }}>
                <h3>来源分布</h3>
                <pre style={{ fontSize: 12 }}>{JSON.stringify(summary?.by_source ?? {}, null, 2)}</pre>
              </div>
            </div>
          )}
          {queue.length > 0 && (
            <div className="antd-card" style={{ marginTop: 16, padding: 16 }}>
              <h3>待处理事项</h3>
              {queue.slice(0, 5).map((item) => (
                <div key={item.intent_id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <span>{item.raw_content.slice(0, 60)}</span>
                  <span style={{ fontWeight: 'bold', color: item.priority === 'P0' ? '#f5222d' : '#1890ff' }}>{item.priority}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scenes tab */}
      {activeTab === 'scenes' && (
        <div>
          <div className="antd-card" style={{ padding: 16, marginBottom: 16 }}>
            <h3>创建新场景</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className="antd-input"
                placeholder="场景名称"
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                style={{ flex: 1 }}
              />
              <button className="antd-btn antd-btn-primary" onClick={handleCreateScene}>创建</button>
            </div>
          </div>
          {scenesLoading ? (
            <div className="antd-card" style={{ padding: 24 }}>加载场景中...</div>
          ) : scenes.length === 0 ? (
            <div className="antd-card" style={{ padding: 24, textAlign: 'center' }}>暂无场景，创建一个开始</div>
          ) : (
            scenes.map((scene) => (
              <div key={scene.id} className="antd-card" style={{ padding: 16, marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ margin: 0 }}>{scene.name}</h3>
                  <span style={{ fontSize: 12, color: '#888' }}>{scene.priority} · {scene.status}</span>
                </div>
                <p style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{scene.description}</p>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {scene.journeys.length} 个旅程 · 总意图: {scene.journeys.reduce((acc, j) => acc + j.intents.length, 0)}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Approval Queue tab */}
      {activeTab === 'queue' && (
        <div>
          {queueLoading ? (
            <div className="antd-card" style={{ padding: 24 }}>加载审批队列中...</div>
          ) : queue.length === 0 ? (
            <div className="antd-card" style={{ padding: 24, textAlign: 'center' }}>暂无待审批事项</div>
          ) : (
            <div>
              <p style={{ marginBottom: 8, color: '#888' }}>共 {queue.length} 项待审批</p>
              {queue.map((item) => (
                <div key={item.intent_id} className="antd-card" style={{ padding: 16, marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>{item.scene_name}</span>
                        <span style={{ fontSize: 12, background: '#f0f0f0', padding: '2px 6px', borderRadius: 4 }}>{item.source}</span>
                        <span style={{ fontWeight: 'bold', color: item.priority === 'P0' ? '#f5222d' : '#1890ff' }}>{item.priority}</span>
                      </div>
                      <p style={{ marginTop: 4, fontSize: 14 }}>{item.raw_content}</p>
                      <div style={{ fontSize: 12, color: '#999' }}>
                        证据: {item.evidence_count} 条 · 创建: {item.created_at.slice(0, 19)}
                      </div>
                    </div>
                     <div style={{ display: 'flex', gap: 4, marginLeft: 16, flexDirection: 'column' }}>
                       {editingIntentId === item.intent_id ? (
                         <>
                           <textarea
                             className="antd-input"
                             value={editedContent}
                             onChange={(e) => setEditedContent(e.target.value)}
                             rows={3}
                             style={{ minWidth: 200, marginBottom: 4 }}
                           />
                           <div style={{ display: 'flex', gap: 4 }}>
                             <button
                               className="antd-btn antd-btn-primary"
                               style={{ background: '#52c41a', borderColor: '#52c41a' }}
                               onClick={() => handleApproveWithEdit(item)}
                               disabled={approve.isPending}
                             >
                               <CheckCircle2 className="icon" size={14} /> 确认改后采纳
                             </button>
                             <button
                               className="antd-btn"
                               onClick={cancelEdit}
                             >
                               取消
                             </button>
                           </div>
                         </>
                       ) : (
                         <>
                           <div style={{ display: 'flex', gap: 4 }}>
                             <button
                               className="antd-btn antd-btn-primary"
                               style={{ background: '#52c41a', borderColor: '#52c41a' }}
                               onClick={() => handleApprove(item)}
                               disabled={approve.isPending}
                             >
                               <CheckCircle2 className="icon" size={14} /> 采纳
                             </button>
                             <button
                               className="antd-btn"
                               style={{ borderColor: '#1890ff', color: '#1890ff' }}
                               onClick={() => startEdit(item)}
                               disabled={approve.isPending}
                             >
                               <Edit3 className="icon" size={14} /> 改后采纳
                             </button>
                             <button
                               className="antd-btn"
                               style={{ borderColor: '#ff4d4f', color: '#ff4d4f' }}
                               onClick={() => handleIgnore(item)}
                               disabled={reject.isPending}
                             >
                               <EyeOff className="icon" size={14} /> 忽略
                             </button>
                           </div>
                           <button
                             className="antd-btn"
                             style={{ borderColor: '#ff4d4f', color: '#ff4d4f', marginTop: 4 }}
                             onClick={() => handleReject(item)}
                             disabled={reject.isPending}
                           >
                             <XCircle className="icon" size={14} /> 拒绝
                           </button>
                         </>
                       )}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Intake tab */}
      {activeTab === 'intake' && (
        <div>
          <div className="antd-card" style={{ padding: 16, marginBottom: 16 }}>
            <h3>选择场景</h3>
            <select
              className="antd-input"
              value={selectedSceneId}
              onChange={(e) => setSelectedSceneId(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">-- 选择场景 --</option>
              {scenes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="antd-card" style={{ padding: 16 }}>
            <h3>快速摄入</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <select
                className="antd-input"
                value={newIntentSource}
                onChange={(e) => setNewIntentSource(e.target.value)}
                style={{ width: 120 }}
              >
                <option value="manual">手动</option>
                <option value="email">邮件</option>
                <option value="message">消息</option>
                <option value="file">文件</option>
                <option value="oa">OA</option>
                <option value="sms">短信</option>
              </select>
              <select
                className="antd-input"
                value={newIntentPriority}
                onChange={(e) => setNewIntentPriority(e.target.value)}
                style={{ width: 100 }}
              >
                <option value="P0">P0 紧急</option>
                <option value="P1">P1 重要</option>
                <option value="P2">P2 一般</option>
                <option value="P3" selected>P3 低</option>
              </select>
            </div>
            <textarea
              className="antd-input"
              placeholder="输入内容..."
              value={newIntentContent}
              onChange={(e) => setNewIntentContent(e.target.value)}
              rows={4}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <button
              className="antd-btn antd-btn-primary"
              onClick={handleAddIntent}
              disabled={!selectedSceneId || !newIntentContent.trim() || addIntent.isPending}
              style={{ marginTop: 8 }}
            >
              <Plus className="icon" size={14} /> 添加意图
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

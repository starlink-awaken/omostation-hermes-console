import React from 'react';
import { Plus, FileText, Search, Terminal, Network, Settings } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}

interface QuickActionsSectionProps {
  actions?: QuickAction[];
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'create-task',
    label: '创建任务',
    icon: <Plus size={20} />,
    onClick: () => console.log('创建任务'),
  },
  {
    id: 'view-logs',
    label: '查看日志',
    icon: <FileText size={20} />,
    onClick: () => console.log('查看日志'),
  },
  {
    id: 'search-knowledge',
    label: '搜索知识',
    icon: <Search size={20} />,
    onClick: () => console.log('搜索知识'),
  },
  {
    id: 'open-terminal',
    label: '打开终端',
    icon: <Terminal size={20} />,
    onClick: () => console.log('打开终端'),
  },
  {
    id: 'view-topology',
    label: '查看拓扑',
    icon: <Network size={20} />,
    onClick: () => console.log('查看拓扑'),
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: <Settings size={20} />,
    onClick: () => console.log('系统设置'),
  },
];

export default function QuickActionsSection({
  actions = DEFAULT_ACTIONS,
}: QuickActionsSectionProps) {
  return (
    <section className="quick-actions-section">
      <h2 className="section-title">快速入口</h2>
      <div className="quick-actions-grid">
        {actions.map((action) => (
          <button
            key={action.id}
            className="quick-action-btn"
            onClick={action.onClick}
          >
            <div className="quick-action-icon">{action.icon}</div>
            <span className="quick-action-label">{action.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

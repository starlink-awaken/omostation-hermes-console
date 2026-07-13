import React, { useState } from 'react';
import { 
  Plus, 
  FileText, 
  Search, 
  Terminal, 
  Network, 
  Settings,
  Bell,
  RefreshCw,
  Download,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
  category?: string;
}

interface QuickActionsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  actions?: QuickAction[];
}

const DEFAULT_ACTIONS: QuickAction[] = [
  {
    id: 'task-center',
    label: '打开任务中心',
    icon: <Plus size={16} />,
    shortcut: 'Ctrl+N',
    action: () => window.location.hash = '#tasks',
    category: '任务',
  },
  {
    id: 'view-logs',
    label: '查看日志',
    icon: <FileText size={16} />,
    shortcut: 'Ctrl+L',
    action: () => window.location.hash = '#logs',
    category: '开发',
  },
  {
    id: 'search',
    label: '全局搜索',
    icon: <Search size={16} />,
    shortcut: 'Ctrl+K',
    action: () => window.dispatchEvent(new Event('cockpit:focus-search')),
    category: '通用',
  },
  {
    id: 'open-terminal',
    label: '打开终端',
    icon: <Terminal size={16} />,
    shortcut: 'Ctrl+`',
    action: () => window.location.hash = '#sandbox',
    category: '开发',
  },
  {
    id: 'view-topology',
    label: '查看拓扑',
    icon: <Network size={16} />,
    action: () => window.location.hash = '#topology',
    category: '监控',
  },
  {
    id: 'alerts',
    label: '查看告警',
    icon: <Bell size={16} />,
    shortcut: 'Ctrl+A',
    action: () => window.location.hash = '#alerts',
    category: '监控',
  },
  {
    id: 'refresh',
    label: '刷新数据',
    icon: <RefreshCw size={16} />,
    shortcut: 'Ctrl+R',
    action: () => window.location.reload(),
    category: '通用',
  },
  {
    id: 'export',
    label: '导出运行快照',
    icon: <Download size={16} />,
    action: () => window.dispatchEvent(new Event('cockpit:export-snapshot')),
    category: '数据',
  },
  {
    id: 'settings',
    label: '系统设置',
    icon: <Settings size={16} />,
    shortcut: 'Ctrl+,',
    action: () => window.location.hash = '#settings',
    category: '系统',
  },
];

export default function QuickActionsPanel({
  isOpen,
  onClose,
  actions = DEFAULT_ACTIONS,
}: QuickActionsPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActions = actions.filter(action =>
    action.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    action.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 按类别分组
  const groupedActions = filteredActions.reduce((groups, action) => {
    const category = action.category || '其他';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(action);
    return groups;
  }, {} as Record<string, QuickAction[]>);

  if (!isOpen) return null;

  return (
    <div className="quick-actions-overlay" onClick={onClose}>
      <div className="quick-actions-panel" onClick={e => e.stopPropagation()}>
        <div className="quick-actions-header">
          <h3>快捷操作</h3>
          <input
            type="text"
            placeholder="搜索操作..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="quick-actions-content">
          {Object.entries(groupedActions).map(([category, categoryActions]) => (
            <div key={category} className="quick-actions-group">
              <div className="quick-actions-group-title">{category}</div>
              <div className="quick-actions-list">
                {categoryActions.map(action => (
                  <button
                    key={action.id}
                    className="quick-action-item"
                    onClick={() => {
                      action.action();
                      onClose();
                    }}
                  >
                    <div className="quick-action-icon">{action.icon}</div>
                    <div className="quick-action-info">
                      <div className="quick-action-label">{action.label}</div>
                      {action.shortcut && (
                        <div className="quick-action-shortcut">{action.shortcut}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Hook for managing quick actions
export function useQuickActions() {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen(prev => !prev);

  return { isOpen, open, close, toggle };
}

import React, { useEffect, useRef, useState } from 'react';
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
    shortcut: 'Ctrl+Shift+F',
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
    action: () => window.dispatchEvent(new Event('cockpit:refresh-page')),
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
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      // 每次打开都从完整操作集开始，避免把上次筛选上下文带进来。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchQuery('');
      setSelectedIndex(0);
      inputRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

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

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (filteredActions.length > 0) setSelectedIndex((current) => Math.min(current + 1, filteredActions.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (filteredActions.length > 0) setSelectedIndex((current) => Math.max(current - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const action = filteredActions[selectedIndex];
      if (action) {
        action.action();
        onClose();
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="quick-actions-overlay" onClick={onClose}>
      <div
        className="quick-actions-panel"
        role="dialog"
        aria-modal="true"
        aria-label="快捷操作"
        onClick={e => e.stopPropagation()}
      >
        <div className="quick-actions-header">
          <h3>快捷操作</h3>
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索操作..."
            aria-label="快捷操作搜索"
            aria-controls="cockpit-quick-actions-list"
            aria-activedescendant={filteredActions[selectedIndex] ? `quick-action-${filteredActions[selectedIndex].id}` : undefined}
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div id="cockpit-quick-actions-list" className="quick-actions-content" role="listbox" aria-label="可用快捷操作">
          {filteredActions.length === 0 && (
            <div className="quick-actions-empty">没有找到匹配的操作</div>
          )}
          {Object.entries(groupedActions).map(([category, categoryActions]) => (
            <div key={category} className="quick-actions-group">
              <div className="quick-actions-group-title">{category}</div>
              <div className="quick-actions-list">
                {categoryActions.map(action => {
                  const actionIndex = filteredActions.findIndex((item) => item.id === action.id);
                  return (
                  <button
                    key={action.id}
                    id={`quick-action-${action.id}`}
                    type="button"
                    role="option"
                    aria-selected={actionIndex === selectedIndex}
                    className="quick-action-item"
                    onMouseEnter={() => setSelectedIndex(actionIndex)}
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
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

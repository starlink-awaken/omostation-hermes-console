import React from 'react';
import { AppWindow, BookOpen, FileText, Map, Network, Plus, Search, Settings, Terminal, Compass, Cpu, Command } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  tabKey: string;
  description: string;
}

interface QuickActionsSectionProps {
  onTabChange?: (tab: string) => void;
}

const ACTIONS: QuickAction[] = [
  {
    id: 'system-map',
    label: '系统地图',
    icon: <Map size={20} />,
    tabKey: 'SystemMap',
    description: '按层级、项目、能力域和路径理解整个 Cockpit',
  },
  {
    id: 'domain-apps',
    label: '领域应用中心',
    icon: <AppWindow size={20} />,
    tabKey: 'DomainApps',
    description: '进入家庭驾驶舱、OPC 作战台与 family-hub',
  },
  {
    id: 'c2g-center',
    label: 'C2G 战略决策',
    icon: <Compass size={20} />,
    tabKey: 'C2G',
    description: '战役波次规划与 OMO CARDS 治理',
  },
  {
    id: 'compute-grid',
    label: '分布式算力调配',
    icon: <Cpu size={20} />,
    tabKey: 'Compute',
    description: '监控分布式 CPU/GPU 负载与分流',
  },
  {
    id: 'create-task',
    label: '任务治理中心',
    icon: <Plus size={20} />,
    tabKey: 'TaskCenter',
    description: '查看并管理 OMO 规划与活跃任务',
  },
  {
    id: 'view-logs',
    label: '可观测日志流',
    icon: <FileText size={20} />,
    tabKey: 'LogViewer',
    description: '实时微服务环境调试及日志过滤',
  },
  {
    id: 'search-knowledge',
    label: '分布式知识中枢',
    icon: <Search size={20} />,
    tabKey: 'Knowledge',
    description: '分布式跨域知识检索与记忆摄取',
  },
  {
    id: 'research-hub',
    label: '研究中枢',
    icon: <BookOpen size={20} />,
    tabKey: 'Research',
    description: '发起研究、追问、发布与后续动作承接',
  },
  {
    id: 'protocol-workbench',
    label: '协议工作台',
    icon: <Command size={20} />,
    tabKey: 'Protocol',
    description: '巡检 ecos、model-driven 与协议层桥接',
  },
  {
    id: 'open-terminal',
    label: '隔离安全沙箱',
    icon: <Terminal size={20} />,
    tabKey: 'Sandbox',
    description: '进入安全沙箱终端执行命令与自愈',
  },
  {
    id: 'view-topology',
    label: '全局服务拓扑',
    icon: <Network size={20} />,
    tabKey: 'Topology',
    description: '可视化 eCOS 节点调用流向与网格状态',
  },
  {
    id: 'settings',
    label: '系统底层配置',
    icon: <Settings size={20} />,
    tabKey: 'Settings',
    description: '微服务网格路由与 API Token 参数',
  },
];

export default function QuickActionsSection({ onTabChange }: QuickActionsSectionProps) {
  return (
    <section className="quick-actions-section">
      <h2 className="section-title" style={{ fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>系统导航与快速入口</h2>
      <div className="quick-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {ACTIONS.map((action) => (
          <button
            key={action.id}
            className="quick-action-btn"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              textAlign: 'left',
              cursor: 'pointer',
              transition: 'all 0.2s',
              gap: '8px'
            }}
            onClick={() => onTabChange && onTabChange(action.tabKey)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(22, 119, 255, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(22, 119, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div className="quick-action-icon" style={{ 
              color: 'var(--cockpit-primary)', 
              backgroundColor: 'rgba(22, 119, 255, 0.1)', 
              padding: '8px', 
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {action.icon}
            </div>
            <div>
              <span className="quick-action-label" style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--cockpit-text-primary)', display: 'block' }}>
                {action.label}
              </span>
              <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', marginTop: '4px', display: 'block', lineHeight: '1.4' }}>
                {action.description}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

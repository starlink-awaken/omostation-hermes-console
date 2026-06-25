import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Server, 
  Cpu, 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Settings, 
  Terminal, 
  GitCommit, 
  Network, 
  Trophy,
  LayoutDashboard,
  Heart,
  Bell
} from 'lucide-react';
import SandboxTerminal from './SandboxTerminal';
import MemoryInjector from './MemoryInjector';
import EnginesView from './EnginesView';
import SettingsView from './SettingsView';
import WorkflowsView from './WorkflowsView';
import TopologyView from './TopologyView';
import ComputeView from './ComputeView';
import { DashboardPage as GBrainDashboard } from './GBrain/GBrainDashboard';
import DebtView from './DebtView';
import ObservabilityView from './ObservabilityView';
import QuestBoard from './QuestBoard';
import L4HealthView from './L4HealthView';
import HomePage from './HomePage';
import AlertCenterPage from './AlertCenterPage';
import './Dashboard.css';

interface Service {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'degraded';
  uptime: string;
  latency: string;
}

const mockServices: Service[] = [
  { id: '1', name: 'Agora Mesh', status: 'online', uptime: '99.9%', latency: '12ms' },
  { id: '2', name: 'Minerva Research', status: 'online', uptime: '99.5%', latency: '45ms' },
  { id: '3', name: 'SharedBrain Bridge', status: 'offline', uptime: '0%', latency: '-' },
  { id: '4', name: 'LLM Gateway', status: 'degraded', uptime: '98.2%', latency: '850ms' },
  { id: '5', name: 'KOS Substrate', status: 'online', uptime: '100%', latency: '2ms' },
];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('Overview');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch real data from Agora API
    const fetchServices = async () => {
      try {
        const response = await fetch('/api/services');
        if (response.ok) {
          const data = await response.json();
          // Transform data format to match UI expected props
          const formattedServices: Service[] = data.map((item: any) => ({
            id: item.name,
            name: item.name,
            status: item.circuit === '断路' ? 'offline' : item.circuit === '半开' ? 'degraded' : 'online',
            uptime: item.uptime || 'N/A',
            latency: item.latency || '-',
          }));
          setServices(formattedServices.length > 0 ? formattedServices : mockServices);
        } else {
          setServices(mockServices);
        }
      } catch (error) {
        console.error('Failed to fetch services:', error);
        setServices(mockServices);
      } finally {
        setLoading(false);
      }
    };
    
    fetchServices();
    const interval = setInterval(fetchServices, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <CheckCircle size={14} aria-hidden="true" className="text-success" />;
      case 'offline': return <XCircle size={14} aria-hidden="true" className="text-danger" />;
      case 'degraded': return <AlertTriangle size={14} aria-hidden="true" className="text-warning" />;
      default: return null;
    }
  };

  const getHeroContent = () => {
    switch (activeTab) {
      case 'Home':
        return { title: '首页 (Home)', subtitle: '系统健康总览、实时告警、关键指标趋势。' };
      case 'Overview':
        return { title: '概览中心 (Overview)', subtitle: '实时监控 eCOS v5 微服务环境，掌握集群全貌。' };
      case 'Topology':
        return { title: '全局服务拓扑 (Topology)', subtitle: '可视化服务间的调用流向与网格状态。' };
      case 'Compute':
        return { title: '算力调配大盘 (Compute)', subtitle: '查看分布式节点 CPU/GPU 使用率与任务调度。' };
      case 'Engines':
        return { title: '引擎调度总线 (Engines)', subtitle: '管理 Kairon, Gbrain 等底层知识与智能引擎。' };
      case 'Knowledge':
        return { title: '分布式知识中枢 (Knowledge)', subtitle: '跨域检索与记忆摄取管线的状态和监控。' };
      case 'Sandbox':
        return { title: '隔离安全沙箱 (Sandbox)', subtitle: '在线执行测试或运行未校验的任务指令。' };
      case 'Workflows':
        return { title: 'MetaOS 工作流编排 (Workflows)', subtitle: '实时跟踪与干预自治 Agent 的运行链路。' };
      case 'Settings':
        return { title: '系统底层设置 (Settings)', subtitle: '配置网格路由、API Token 与治理阈值。' };
      case 'Debt':
        return { title: '技术债务治理舱 (Debt)', subtitle: '全自动审计技术债务评分，追踪高危风险。' };
      case 'QuestBoard':
        return { title: '积分冒险看板 (QuestBoard)', subtitle: '让家庭充满正向激励与智慧成长，打通 Quest 生态。' };
      case 'Observability':
        return { title: '系统运行可观测 (Observability)', subtitle: '多维度链路日志与可观测性分析面板。' };
      case 'L4Health':
        return { title: 'L4 域健康监控 (L4 Health)', subtitle: '实时监控 L4 域健康状态、趋势分析和风险评估。' };
      case 'AlertCenter':
        return { title: '告警中心 (Alert Center)', subtitle: '统一告警管理、规则配置、告警历史。' };
      default:
        return { title: '控制台', subtitle: 'eCOS 管理面板' };
    }
  };

  const hero = getHeroContent();

  return (
    <div className="dashboard-container">
      {/* Skip Navigation link for screen readers (a11y) */}
      <a href="#main-content" className="sr-only-focusable" style={{
        position: 'absolute',
        top: '-100px',
        left: '20px',
        background: 'var(--antd-primary)',
        color: '#fff',
        padding: '8px 16px',
        zIndex: 100,
        borderRadius: 'var(--antd-radius-md)',
        transition: 'top 0.2s',
        textDecoration: 'none'
      }}
      onFocus={(e) => e.target.style.top = '10px'}
      onBlur={(e) => e.target.style.top = '-100px'}
      >
        跳过导航，直接进入主要内容
      </a>

      {/* Sider Navigation Sidebar (AntD Style) */}
      <aside role="complementary" aria-label="控制台侧边栏" className="sidebar">
        <div className="sidebar-header">
          <div className="logo-box" aria-hidden="true">
            <Activity size={18} />
          </div>
          <h2>Cockpit Console</h2>
        </div>
        
        <nav aria-label="控制台主导航" className="sidebar-nav" role="menu">
          {/* Group 1: 首页 */}
          <div className="nav-group-title" id="group-home">首页</div>
          <button 
            role="menuitem"
            aria-describedby="group-home"
            aria-selected={activeTab === 'Home'}
            className={`nav-item ${activeTab === 'Home' ? 'active' : ''}`}
            onClick={() => setActiveTab('Home')}
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            <span>首页</span>
          </button>

          {/* Group 2: 运行大盘 */}
          <div className="nav-group-title" id="group-monitoring">运行大盘</div>
          <button 
            role="menuitem"
            aria-describedby="group-monitoring"
            aria-selected={activeTab === 'Overview'}
            className={`nav-item ${activeTab === 'Overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('Overview')}
          >
            <LayoutDashboard size={16} aria-hidden="true" />
            <span>概览中心</span>
          </button>
          <button 
            role="menuitem"
            aria-describedby="group-monitoring"
            aria-selected={activeTab === 'Topology'}
            className={`nav-item ${activeTab === 'Topology' ? 'active' : ''}`}
            onClick={() => setActiveTab('Topology')}
          >
            <Network size={16} aria-hidden="true" />
            <span>全局拓扑</span>
          </button>
          <button 
            role="menuitem"
            aria-describedby="group-monitoring"
            aria-selected={activeTab === 'Compute'}
            className={`nav-item ${activeTab === 'Compute' ? 'active' : ''}`}
            onClick={() => setActiveTab('Compute')}
          >
            <Cpu size={16} aria-hidden="true" />
            <span>算力调配</span>
          </button>

          {/* Group 2: 知识与引擎 */}
          <div className="nav-group-title" id="group-intelligence">智能与知识</div>
          <button 
            role="menuitem"
            aria-describedby="group-intelligence"
            aria-selected={activeTab === 'Knowledge'}
            className={`nav-item ${activeTab === 'Knowledge' ? 'active' : ''}`}
            onClick={() => setActiveTab('Knowledge')}
          >
            <Database size={16} aria-hidden="true" />
            <span>知识中枢</span>
          </button>
          <button 
            role="menuitem"
            aria-describedby="group-intelligence"
            aria-selected={activeTab === 'Engines'}
            className={`nav-item ${activeTab === 'Engines' ? 'active' : ''}`}
            onClick={() => setActiveTab('Engines')}
          >
            <Cpu size={16} aria-hidden="true" />
            <span>引擎调度</span>
          </button>
          <button 
            role="menuitem"
            aria-describedby="group-intelligence"
            aria-selected={activeTab === 'Workflows'}
            className={`nav-item ${activeTab === 'Workflows' ? 'active' : ''}`}
            onClick={() => setActiveTab('Workflows')}
          >
            <GitCommit size={16} aria-hidden="true" />
            <span>MetaOS 工作流</span>
          </button>

          {/* Group 3: 治理与可观测 */}
          <div className="nav-group-title" id="group-governance">系统治理</div>
          <button 
            role="menuitem"
            aria-describedby="group-governance"
            aria-selected={activeTab === 'AlertCenter'}
            className={`nav-item ${activeTab === 'AlertCenter' ? 'active' : ''}`}
            onClick={() => setActiveTab('AlertCenter')}
          >
            <Bell size={16} aria-hidden="true" />
            <span>告警中心</span>
          </button>
          <button 
            role="menuitem"
            aria-describedby="group-governance"
            aria-selected={activeTab === 'L4Health'}
            className={`nav-item ${activeTab === 'L4Health' ? 'active' : ''}`}
            onClick={() => setActiveTab('L4Health')}
          >
            <Heart size={16} aria-hidden="true" />
            <span>L4 域健康</span>
          </button>
          <button 
            role="menuitem"
            aria-describedby="group-governance"
            aria-selected={activeTab === 'Sandbox'}
            className={`nav-item ${activeTab === 'Sandbox' ? 'active' : ''}`}
            onClick={() => setActiveTab('Sandbox')}
          >
            <Terminal size={16} aria-hidden="true" />
            <span>隔离沙箱</span>
          </button>
          <button 
            role="menuitem"
            aria-describedby="group-governance"
            aria-selected={activeTab === 'Debt'}
            className={`nav-item ${activeTab === 'Debt' ? 'active' : ''}`}
            onClick={() => setActiveTab('Debt')}
          >
            <AlertTriangle size={16} aria-hidden="true" />
            <span>债务治理</span>
          </button>
          <button 
            role="menuitem"
            aria-describedby="group-governance"
            aria-selected={activeTab === 'Observability'}
            className={`nav-item ${activeTab === 'Observability' ? 'active' : ''}`}
            onClick={() => setActiveTab('Observability')}
          >
            <Activity size={16} aria-hidden="true" />
            <span>运行可观测</span>
          </button>

          {/* Group 4: 积分养成游戏化 */}
          <div className="nav-group-title" id="group-gamification">亲子冒险</div>
          <button 
            role="menuitem"
            aria-describedby="group-gamification"
            aria-selected={activeTab === 'QuestBoard'}
            className={`nav-item ${activeTab === 'QuestBoard' ? 'active' : ''}`}
            onClick={() => setActiveTab('QuestBoard')}
            style={{ fontWeight: '500' }}
          >
            <Trophy size={16} aria-hidden="true" className="text-warning" />
            <span>积分冒险 (Quest)</span>
          </button>

          {/* Group 5: 系统配置 */}
          <div className="nav-group-title" id="group-config">系统配置</div>
          <button 
            role="menuitem"
            aria-describedby="group-config"
            aria-selected={activeTab === 'Settings'}
            className={`nav-item ${activeTab === 'Settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('Settings')}
          >
            <Settings size={16} aria-hidden="true" />
            <span>底层设置</span>
          </button>
        </nav>
      </aside>

      {/* Main Content Area (a11y skip target) */}
      <main id="main-content" tabIndex={-1} className="main-content" style={{ outline: 'none' }}>
        <header className="topbar">
          <div className="search-bar" role="search">
            <Search size={16} className="text-muted" aria-hidden="true" />
            <input type="text" placeholder="搜索服务、模型、智能体..." aria-label="全局搜索输入框" />
          </div>
          <div className="user-profile" role="button" aria-label="个人中心，管理员" tabIndex={0}>
            <div className="avatar" aria-hidden="true">AD</div>
            <span>管理员</span>
          </div>
        </header>

        <div className="content-area">
          {/* Keyed hero section triggers smooth fade transition upon menu selection */}
          <div key={activeTab} className="hero-section animate-fade-in">
            <h1 className="hero-title">{hero.title}</h1>
            <p className="hero-subtitle">{hero.subtitle}</p>
          </div>

          {activeTab === 'Home' && (
            <HomePage />
          )}

          {activeTab === 'Overview' && (
            <>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon-wrapper pulse-success" aria-hidden="true">
                    <Server size={20} />
                  </div>
                  <div className="stat-info">
                    <h3>活跃服务数</h3>
                    <p className="stat-value">24 / 28</p>
                  </div>
                </div>
                
                <div className="stat-card">
                  <div className="stat-icon-wrapper pulse-accent" aria-hidden="true">
                    <Cpu size={20} />
                  </div>
                  <div className="stat-info">
                    <h3>大模型请求数</h3>
                    <p className="stat-value">12.4k</p>
                  </div>
                </div>
              </div>

              <div className="services-section">
                <div className="section-header" style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '16px' }}>核心服务节点</h2>
                  <button className="antd-btn">查看全部</button>
                </div>
                
                <div className="services-list">
                  {loading ? (
                    <div className="loading-state">
                      <div className="spinner" aria-hidden="true"></div>
                      <p>正在连接 Agora 服务网格...</p>
                    </div>
                  ) : (
                    <table className="services-table">
                      <thead>
                        <tr>
                          <th scope="col">服务名称</th>
                          <th scope="col">运行状态</th>
                          <th scope="col">正常运行时间</th>
                          <th scope="col">响应延迟</th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map(svc => (
                          <tr key={svc.id} className="service-row">
                            <td className="font-medium" style={{ fontWeight: 500 }}>{svc.name}</td>
                            <td>
                              <span className={`status-badge ${svc.status}`}>
                                {getStatusIcon(svc.status)}
                                <span style={{ marginLeft: '4px' }}>{svc.status}</span>
                              </span>
                            </td>
                            <td className="text-muted">{svc.uptime}</td>
                            <td className="text-muted">{svc.latency}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'Topology' && (
            <TopologyView />
          )}

          {activeTab === 'Compute' && (
            <ComputeView />
          )}

          {activeTab === 'Engines' && (
            <EnginesView />
          )}

          {activeTab === 'Knowledge' && (
            <div className="gbrain-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <GBrainDashboard />
              <MemoryInjector />
            </div>
          )}

          {activeTab === 'Workflows' && (
            <WorkflowsView />
          )}

          {activeTab === 'Sandbox' && (
            <SandboxTerminal />
          )}

          {activeTab === 'Settings' && (
            <SettingsView />
          )}

          {activeTab === 'Debt' && (
            <DebtView />
          )}

          {activeTab === 'QuestBoard' && (
            <QuestBoard />
          )}

          {activeTab === 'Observability' && (
            <ObservabilityView />
          )}

          {activeTab === 'L4Health' && (
            <L4HealthView />
          )}

          {activeTab === 'AlertCenter' && (
            <AlertCenterPage />
          )}
        </div>
      </main>
    </div>
  );
}

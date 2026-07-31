import type { CockpitNavigationTarget } from './cockpitNavigation';

// ── Hero content ──

export function getHeroContent(activeTab: string): { title: string; subtitle: string } {
  switch (activeTab) {
    case 'Home':
      return { title: '首页 (Home)', subtitle: '系统健康总览、实时告警、关键指标趋势。' };
    case 'Guide':
      return { title: '站内导览 (Guide)', subtitle: '把 cockpit 的页面、工作带、推荐入口和使用路径梳理成一个可上手的总览。' };
    case 'SystemMap':
      return { title: '系统地图 (System Map)', subtitle: '把 Cockpit 的页面、项目层级、功能域、使用路径和能力缺口串成一个可操作总图。' };
    case 'Overview':
      return { title: '概览中心 (Overview)', subtitle: '实时监控 eCOS v6 微服务环境，掌握集群全貌。' };
    case 'McpMesh':
      return { title: 'BOS URI & MCP 网格 (McpMesh)', subtitle: '分布式新实例动态注册与基于域路由的 BOS URI 在线解析调试。' };
    case 'Topology':
      return { title: '全局服务拓扑 (Topology)', subtitle: '可视化服务间的调用流向与网格状态。' };
    case 'Compute':
      return { title: '算力调配大盘 (Compute)', subtitle: '查看分布式节点 CPU/GPU 使用率与任务调度。' };
    case 'Research':
      return { title: '研究中枢 (Research)', subtitle: '把 cockpit research 的发起、追问、发布和后续任务承接整理成可操作入口。' };
    case 'Engines':
      return { title: '引擎调度总线 (Engines)', subtitle: '管理 Kairon, Gbrain 等底层知识与智能引擎。' };
    case 'Assets':
      return { title: '技术资产资产库 (Assets)', subtitle: '集中索引自动化工作流 (Workflows)、工具管线 (Pipelines) 与智能体自定义开发技能 (Custom Skills)。' };
    case 'Protocol':
      return { title: '协议工作台 (Protocol)', subtitle: '把 ecos、model-driven、workflow 和治理桥接能力拉成一张可巡检、可跳转、可复制命令的协议操作面。' };
    case 'Knowledge':
      return { title: '分布式知识中枢 (Knowledge)', subtitle: '跨域检索与记忆摄取管线的状态和监控。' };
    case 'GBrainAdmin':
      return { title: 'GBrain 管理控制面 (GBrain Admin)', subtitle: '管理智能体接入、访问凭证、模型校准与请求审计；受保护操作由 GBrain 自己的登录边界承接。' };
    case 'Sandbox':
      return { title: '隔离安全沙箱 (Sandbox)', subtitle: '在线执行测试或运行未校验的任务指令。' };
    case 'Workflows':
      return { title: 'MetaOS 工作流编排 (Workflows)', subtitle: '实时跟踪与干预自治 Agent 的运行链路。' };
    case 'Settings':
      return { title: '系统底层设置 (Settings)', subtitle: '配置网格路由、API Token 与治理阈值。' };
    case 'Debt':
      return { title: '技术债务治理舱 (Debt)', subtitle: '全自动审计技术债务评分，追踪高危风险。' };
    case 'C2G':
      return { title: 'C2G 战略决策中心 (C2G)', subtitle: '跟踪系统从战役目标 (Goals) 到治理卡片 (OMO CARDS) 的全生命周期，守护 SSOT 保鲜。' };
    case 'QuestBoard':
      return { title: '积分冒险看板 (QuestBoard)', subtitle: '让家庭充满正向激励与智慧成长，打通 Quest 生态。' };
    case 'DomainApps':
      return { title: '领域应用中心 (Domain Apps)', subtitle: '统一挂载家庭驾驶舱、OPC 作战台和 family-hub 服务，保持 L4 SSOT 边界。' };
    case 'Observability':
      return { title: '系统运行可观测 (Observability)', subtitle: '多维度链路日志与可观测性分析面板。' };
    case 'L4Health':
      return { title: 'L4 域健康监控 (L4 Health)', subtitle: '实时监控 L4 域健康状态、趋势分析和风险评估。' };
    case 'AlertCenter':
      return { title: '告警中心 (Alert Center)', subtitle: '统一告警管理、规则配置、告警历史。' };
    case 'LogViewer':
      return { title: '日志查看器 (Log Viewer)', subtitle: '实时日志流、搜索、过滤、导出。' };
    case 'TaskCenter':
      return { title: '任务中心 (Task Center)', subtitle: '任务统一管理、状态跟踪、操作控制。' };
    case 'Performance':
      return { title: '性能监控 (Performance)', subtitle: 'CPU/内存/磁盘/网络实时监控。' };
    default:
      return { title: '控制台', subtitle: 'eCOS 管理面板' };
  }
}

// ── Breadcrumb ──

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export function getBreadcrumbItems(
  activeTab: string,
  activeGroupLabel: string | null,
  onNavigate: (tab: string) => void,
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [{ label: '首页', onClick: () => onNavigate('Home') }];
  if (activeGroupLabel) {
    items.push({ label: activeGroupLabel });
  }
  const hero = getHeroContent(activeTab);
  items.push({ label: hero.title.split(' (')[0] });
  return items;
}

// ── Navigation helpers ──

export function buildNavigationTarget(
  base: Partial<CockpitNavigationTarget>,
  overrides?: Partial<CockpitNavigationTarget>,
): CockpitNavigationTarget {
  return {
    tab: base.tab || 'Home',
    ...base,
    ...overrides,
  } as CockpitNavigationTarget;
}

// ── Maturity status ──

export function maturityStatusText(status: string): string {
  if (status === 'ready') return '就绪';
  if (status === 'watch') return '观察';
  if (status === 'gap') return '缺口';
  return '未知';
}

export function pageContextStatusClass(status?: string): string {
  if (status === 'ready') return 'status-ready';
  if (status === 'watch') return 'status-watch';
  if (status === 'gap') return 'status-gap';
  return 'status-unknown';
}

export function pageContextChecklistStatusClass(status: string): string {
  if (status === 'linked') return 'checklist-linked';
  if (status === 'missing') return 'checklist-missing';
  return 'checklist-unknown';
}

// ── Search helpers ──

export function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
}

export function tokenizeSearchText(value: string): string[] {
  return normalizeSearchText(value)
    .split(/[\s\-_/.]+/)
    .filter((token) => token.length > 0);
}

export function expandSearchAliases(terms: string[]): string[] {
  const aliases: Record<string, string[]> = {
    'gbrain': ['gbrain', '智能体', 'agent', 'admin'],
    'kos': ['kos', '知识', 'knowledge', '检索'],
    'mcp': ['mcp', 'bos', 'agora', '路由'],
    'task': ['task', '任务', '执行'],
    'alert': ['alert', '告警', '规则'],
    'log': ['log', '日志', 'debug'],
    'workflow': ['workflow', 'metaos', '编排', 'agent'],
    'debt': ['debt', '债务', '质量'],
    'l4': ['l4', '域', '健康'],
    'quest': ['quest', '积分', '家庭'],
    'sandbox': ['sandbox', '终端', '执行'],
    'settings': ['settings', '配置', 'token', '端口'],
  };
  const expanded = new Set(terms);
  for (const term of terms) {
    for (const [key, values] of Object.entries(aliases)) {
      if (values.some((v) => v.includes(term) || term.includes(v))) {
        values.forEach((v) => expanded.add(v));
      }
    }
  }
  return [...expanded];
}

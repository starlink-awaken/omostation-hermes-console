export interface CockpitPageRegistryItem {
  id: string;
  title: string;
  group: string;
  purpose: string;
}

export const COCKPIT_PAGE_REGISTRY: CockpitPageRegistryItem[] = [
  { id: 'Home', title: '首页', group: '入口', purpose: '健康、告警、任务、指标趋势的日常总览。' },
  { id: 'Guide', title: '站内导览', group: '入口', purpose: '把页面、工作带和推荐入口梳成上手总览。' },
  { id: 'SystemMap', title: '系统地图', group: '入口', purpose: '按页面、项目、能力域和使用路径解释整个 Cockpit。' },
  { id: 'Overview', title: '概览中心', group: '运行大盘', purpose: '查看服务节点、运行状态和集群概貌。' },
  { id: 'McpMesh', title: '网格与 MCP', group: '运行大盘', purpose: '查看网格连接、MCP 接入和 URI 解析。' },
  { id: 'Topology', title: '全局拓扑', group: '运行大盘', purpose: '查看服务调用流向与拓扑结构。' },
  { id: 'Compute', title: '算力调配', group: '运行大盘', purpose: '查看节点算力、GPU/CPU 使用率与任务调度。' },
  { id: 'Research', title: '研究中枢', group: '智能与知识', purpose: '承接研究发起、追问、发布和后续任务。' },
  { id: 'Knowledge', title: '知识中枢', group: '智能与知识', purpose: '查看知识与检索能力状态。' },
  { id: 'Engines', title: '引擎调度', group: '智能与知识', purpose: '管理 Kairon、Gbrain 等智能引擎。' },
  { id: 'Assets', title: '技术资产库', group: '智能与知识', purpose: '索引工作流、工具管线与智能体技能资产。' },
  { id: 'Protocol', title: '协议工作台', group: '智能与知识', purpose: '查看协议层、元模型和治理桥接。' },
  { id: 'Workflows', title: 'MetaOS 工作流', group: '智能与知识', purpose: '跟踪自治 Agent 工作流运行链路。' },
  { id: 'C2G', title: 'C2G 战略中心', group: '系统治理', purpose: '跟踪战略、治理卡片与事实保鲜闭环。' },
  { id: 'AlertCenter', title: '告警中心', group: '系统治理', purpose: '统一管理告警、规则和历史。' },
  { id: 'L4Health', title: 'L4 域健康', group: '系统治理', purpose: '查看 L4 域健康状态与风险。' },
  { id: 'Debt', title: '技术债务', group: '系统治理', purpose: '追踪高风险技术债务与治理优先级。' },
  { id: 'Observability', title: '运行可观测', group: '系统治理', purpose: '查看链路日志与可观测信号。' },
  { id: 'LogViewer', title: '日志查看器', group: '开发工具', purpose: '实时日志流、搜索、过滤和导出。' },
  { id: 'TaskCenter', title: '任务中心', group: '开发工具', purpose: '统一管理任务、草稿和承接动作。' },
  { id: 'Performance', title: '性能监控', group: '开发工具', purpose: '查看 CPU、内存、网络与系统性能。' },
  { id: 'Sandbox', title: '隔离沙箱', group: '开发工具', purpose: '隔离执行验证、复现和临时实验。' },
  { id: 'QuestBoard', title: '积分冒险', group: '领域应用', purpose: '承接家庭成长激励与积分任务。' },
  { id: 'DomainApps', title: '应用中心', group: '领域应用', purpose: '统一挂载家庭驾驶舱、OPC 作战台和领域服务。' },
  { id: 'Settings', title: '底层设置', group: '系统配置', purpose: '配置网格路由、凭据和治理阈值。' },
];

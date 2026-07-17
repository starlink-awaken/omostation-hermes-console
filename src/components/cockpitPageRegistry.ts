export interface CockpitPageRegistryItem {
  id: string;
  title: string;
  group: string;
  purpose: string;
  whenToUse: string;
  dimensions: string[];
}

export const COCKPIT_PAGE_REGISTRY: CockpitPageRegistryItem[] = [
  { id: 'Home', title: '首页', group: '入口', purpose: '健康、告警、任务、指标趋势的日常总览。', whenToUse: '每天先看这里。', dimensions: ['健康', '告警', '任务', '运行'] },
  { id: 'Guide', title: '站内导览', group: '入口', purpose: '把页面、工作带和推荐入口梳成上手总览。', whenToUse: '第一次进入或迷路时。', dimensions: ['导览', '路径', '架构'] },
  { id: 'SystemMap', title: '系统地图', group: '入口', purpose: '按页面、项目、能力域和使用路径解释整个 Cockpit。', whenToUse: '想知道 cockpit 还缺什么时。', dimensions: ['页面', '项目', '能力域', '路径'] },
  { id: 'Overview', title: '概览中心', group: '运行大盘', purpose: '查看服务节点、运行状态和集群概貌。', whenToUse: '每天巡检、出问题先看。', dimensions: ['服务', '运行态', '集群'] },
  { id: 'McpMesh', title: '网格与 MCP', group: '运行大盘', purpose: '查看网格连接、MCP 接入和 URI 解析。', whenToUse: '怀疑入口或路由异常时。', dimensions: ['网格', 'MCP', '路由'] },
  { id: 'Topology', title: '全局拓扑', group: '运行大盘', purpose: '查看服务调用流向与拓扑结构。', whenToUse: '排查影响范围时。', dimensions: ['拓扑', '依赖', '流量'] },
  { id: 'Compute', title: '算力调配', group: '运行大盘', purpose: '查看节点算力、GPU/CPU 使用率与任务调度。', whenToUse: '推理或调度卡住时。', dimensions: ['算力', '节点', '调度'] },
  { id: 'Research', title: '研究中枢', group: '智能与知识', purpose: '承接研究发起、追问、发布和后续任务。', whenToUse: '做内容、研究、产品推演时。', dimensions: ['研究', '知识', '发布'] },
  { id: 'Knowledge', title: '知识中枢', group: '智能与知识', purpose: '查看知识与检索能力状态。', whenToUse: '想知道知识是否能支撑动作时。', dimensions: ['知识', '检索', '记忆'] },
  { id: 'Engines', title: '引擎调度', group: '智能与知识', purpose: '管理 Kairon、Gbrain 等智能引擎。', whenToUse: '排查能力供给层时。', dimensions: ['引擎', '模型', '供给'] },
  { id: 'Assets', title: '技术资产库', group: '智能与知识', purpose: '索引工作流、工具管线与智能体技能资产。', whenToUse: '找现成能力而不是重造轮子。', dimensions: ['工作流', '管线', '技能'] },
  { id: 'Protocol', title: '协议工作台', group: '智能与知识', purpose: '查看协议层、元模型和治理桥接。', whenToUse: '做协议层梳理和巡检时。', dimensions: ['协议', '模型', '治理'] },
  { id: 'Workflows', title: 'MetaOS 工作流', group: '智能与知识', purpose: '跟踪自治 Agent 工作流运行链路。', whenToUse: '验证流程有没有真正闭环时。', dimensions: ['Agent', '工作流', '验证'] },
  { id: 'C2G', title: 'C2G 战略中心', group: '系统治理', purpose: '跟踪战略、治理卡片与事实保鲜闭环。', whenToUse: '要看优先级和治理承接时。', dimensions: ['战略', '治理', 'SSOT'] },
  { id: 'AlertCenter', title: '告警中心', group: '系统治理', purpose: '统一管理告警、规则和历史。', whenToUse: 'P0/P1 先从这里落点。', dimensions: ['告警', '规则', '历史'] },
  { id: 'L4Health', title: 'L4 域健康', group: '系统治理', purpose: '查看 L4 域健康状态与风险。', whenToUse: '比单页看得更全时。', dimensions: ['域健康', '风险', '趋势'] },
  { id: 'Debt', title: '技术债务', group: '系统治理', purpose: '追踪高风险技术债务与治理优先级。', whenToUse: '规划补位和治理投入时。', dimensions: ['技术债', '风险', '优先级'] },
  { id: 'Observability', title: '运行可观测', group: '系统治理', purpose: '查看链路日志与可观测信号。', whenToUse: '需要证据而不是直觉时。', dimensions: ['可观测', '指标', '链路'] },
  { id: 'LogViewer', title: '日志查看器', group: '开发工具', purpose: '实时日志流、搜索、过滤和导出。', whenToUse: '看错误细节时。', dimensions: ['日志', '检索', '证据'] },
  { id: 'TaskCenter', title: '任务中心', group: '开发工具', purpose: '统一管理任务、草稿和承接动作。', whenToUse: '需要把发现变成任务时。', dimensions: ['任务', '草稿', '承接'] },
  { id: 'Performance', title: '性能监控', group: '开发工具', purpose: '查看 CPU、内存、网络与系统性能。', whenToUse: '系统慢、负载高时。', dimensions: ['性能', '资源', '服务'] },
  { id: 'Sandbox', title: '隔离沙箱', group: '开发工具', purpose: '隔离执行验证、复现和临时实验。', whenToUse: '先试再动生产面时。', dimensions: ['沙箱', '验证', '实验'] },
  { id: 'QuestBoard', title: '积分冒险', group: '领域应用', purpose: '承接家庭成长激励与积分任务。', whenToUse: '家庭互动和任务激励时。', dimensions: ['家庭', '积分', '成长'] },
  { id: 'DomainApps', title: '应用中心', group: '领域应用', purpose: '统一挂载家庭驾驶舱、OPC 作战台和领域服务。', whenToUse: '要进入家庭驾驶舱或 OPC 时。', dimensions: ['领域应用', '运行态', '挂载'] },
  { id: 'Settings', title: '底层设置', group: '系统配置', purpose: '配置网格路由、凭据和治理阈值。', whenToUse: '准备挂载新应用或修配置时。', dimensions: ['配置', '凭据', '阈值'] },
];

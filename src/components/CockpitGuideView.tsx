import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Compass, LayoutDashboard, Map as MapIcon, Route, Sparkles } from 'lucide-react';
import ActionSurfacePanel from './ActionSurfacePanel';
import { COCKPIT_WORK_MODES } from './cockpitWorkModes';
import { openCockpitNavigationTarget, type CockpitNavigationTarget } from './cockpitNavigation';

interface CockpitGuideViewProps {
  onNavigate?: (tab: string) => void;
  onOpenTarget?: (target: CockpitNavigationTarget) => void;
  focusPageId?: string | null;
  focusProjectId?: string | null;
  focusTaskQuery?: string;
}

interface GuidePage {
  id: string;
  title: string;
  purpose: string;
  whenToUse: string;
}

interface GuideGroup {
  id: string;
  title: string;
  description: string;
  summary: string;
  target: CockpitNavigationTarget;
  pages: GuidePage[];
}

interface GuidePath {
  id: string;
  title: string;
  tag: string;
  description: string;
  steps: string[];
  target: CockpitNavigationTarget;
  actionLabel: string;
}

interface GuideMetrics {
  usagePaths: number;
  playbooks: number;
  featureDomains: number;
  attentionPages: number;
  projectCoverageScore: number | null;
  domainSummary: {
    total: number;
    running: number;
    highRisk: number;
    externalMounts: number;
    score: number | null;
  };
  domainAttention: Array<{
    id: string;
    name: string;
    domainName?: string;
    runtimeStatus: string;
    securityPosture: string;
    riskLevel: string;
    freshnessStatus?: string;
    nextAction: string;
    taskTitle?: string;
    taskQuery: string;
  }>;
  pageAttentionItems: Array<{
    page_id: string;
    score: number;
    status: 'watch' | 'gap' | string;
    next_action: string;
    page?: { title?: string };
  }>;
  capabilityGaps: Array<{
    id: string;
    severity: string;
    title: string;
    evidence: string;
    next: string;
  }>;
  weakestDimensions: Array<{
    id: string;
    title?: string;
    score?: number;
    failed?: number;
    warning?: number;
  }>;
  roadmapItems: Array<{
    id: string;
    priority: string;
    status: string;
    title: string;
    cockpit_page: string;
    problem?: string;
  }>;
  draftSummary: {
    total: number;
    capabilityGap: number;
    pageMaturity: number;
    domainApp: number;
    projectPortfolio: number;
    playbook: number;
    verificationReady: number;
  };
  featuredDrafts: Array<{
    id: string;
    title: string;
    sourceType: string;
    sourceId: string;
    description?: string;
  }>;
  closureDrafts: Array<{
    id: string;
    title: string;
    sourceType: string;
    sourceId: string;
    description?: string;
  }>;
  pageCoverageRows: Array<{
    id: string;
    title: string;
    groupId: string;
    groupTitle: string;
    purpose: string;
    whenToUse: string;
    status: string;
    score: number | null;
    usagePaths: string[];
    featureDomains: string[];
    playbooks: string[];
    roadmapTitles: string[];
    nextAction: string;
    taskQuery: string;
    missingUsagePath: boolean;
    missingFeatureDomain: boolean;
  }>;
  dimensionCoverageRows: Array<{
    id: string;
    title: string;
    description: string;
    status: string;
    score: number | null;
    ready: number;
    warning: number;
    failed: number;
    attentionProjects: Array<{
      id: string;
      status?: string;
      nextAction?: string;
    }>;
    nextAction: string;
    taskQuery: string;
  }>;
}

interface ProblemEntryCard {
  id: string;
  title: string;
  signal: string;
  detail: string;
  primaryLabel: string;
  primaryTarget: CockpitNavigationTarget;
  secondaryLabel: string;
  secondaryTarget: CockpitNavigationTarget;
}

const GUIDE_GROUPS: GuideGroup[] = [
  {
    id: 'entry',
    title: '入口总览',
    description: '先用导览和系统地图定路径，再从首页进入日常值守。',
    summary: '把第一次使用、导航总图、领域挂载入口放在最前面。',
    target: { tab: 'SystemMap' },
    pages: [
      { id: 'Home', title: '首页', purpose: '健康总览、告警摘要、待办入口。', whenToUse: '每天先看这里。' },
      { id: 'Guide', title: '站内导览', purpose: '解释 cockpit 的页面分工、入口路径和推荐使用法。', whenToUse: '第一次进入或迷路时。' },
      { id: 'SystemMap', title: '系统地图', purpose: '串起页面、项目、能力域、路线图和缺口。', whenToUse: '想知道 cockpit 还缺什么时。' },
      { id: 'DomainApps', title: '应用中心', purpose: '挂载家庭驾驶舱、OPC、family-hub 等领域应用。', whenToUse: '要进入具体 L4 领域时。' },
    ],
  },
  {
    id: 'runtime',
    title: '运行大盘',
    description: '覆盖服务健康、网格路由、拓扑关系和算力调配。',
    summary: '这是面向运行态的主工作区，适合做状态确认和问题定位。',
    target: { tab: 'Overview' },
    pages: [
      { id: 'Overview', title: '概览中心', purpose: '看整体运行态势和关键指标。', whenToUse: '每天巡检、出问题先看。' },
      { id: 'McpMesh', title: '网格与 MCP', purpose: '看路由、实例注册和 BOS URI 解析。', whenToUse: '怀疑入口或路由异常时。' },
      { id: 'Topology', title: '全局拓扑', purpose: '看服务之间怎么连、依赖谁。', whenToUse: '排查影响范围时。' },
      { id: 'Compute', title: '算力调配', purpose: '看 CPU/GPU、模型节点和成本侧压力。', whenToUse: '推理或调度卡住时。' },
    ],
  },
  {
    id: 'intelligence',
    title: '智能与知识',
    description: '承接研究、知识、引擎、资产、协议和工作流编排。',
    summary: '这是把“知道什么”和“怎么执行”接起来的工作带。',
    target: { tab: 'Knowledge' },
    pages: [
      { id: 'Research', title: '研究中枢', purpose: '发起研究、推进发布、承接后续行动。', whenToUse: '做内容、研究、产品推演时。' },
      { id: 'Knowledge', title: '知识中枢', purpose: '看知识检索、记忆摄取和执行衔接。', whenToUse: '想知道知识是否能支撑动作时。' },
      { id: 'Engines', title: '引擎调度', purpose: '看 Kairon、Gbrain 等底层引擎状态。', whenToUse: '排查能力供给层时。' },
      { id: 'Assets', title: '技术资产库', purpose: '看技能、管线、工作流资产沉淀。', whenToUse: '找现成能力而不是重造轮子。' },
      { id: 'Protocol', title: '协议工作台', purpose: '看 ecos、workflow、model-driven 的桥接。', whenToUse: '做协议层梳理和巡检时。' },
      { id: 'Workflows', title: 'MetaOS 工作流', purpose: '看 agent workflow 的链路和执行。', whenToUse: '验证流程有没有真正闭环时。' },
    ],
  },
  {
    id: 'governance',
    title: '系统治理',
    description: '覆盖战略、告警、L4 域健康、债务和可观测。',
    summary: '这是从风险、治理、质量和演进角度看 cockpit 的面。',
    target: { tab: 'C2G' },
    pages: [
      { id: 'C2G', title: 'C2G 战略中心', purpose: '把目标、治理卡片、计划和执行接起来。', whenToUse: '要看优先级和治理承接时。' },
      { id: 'AlertCenter', title: '告警中心', purpose: '统一处理活跃告警、历史和规则。', whenToUse: 'P0/P1 先从这里落点。' },
      { id: 'L4Health', title: 'L4 域健康', purpose: '看各领域是否真正健康、哪里在掉分。', whenToUse: '比单页看得更全时。' },
      { id: 'Debt', title: '技术债务', purpose: '看质量风险和欠账优先级。', whenToUse: '规划补位和治理投入时。' },
      { id: 'Observability', title: '运行可观测', purpose: '看链路、日志汇总和系统可见性。', whenToUse: '需要证据而不是直觉时。' },
    ],
  },
  {
    id: 'devtools',
    title: '开发工具',
    description: '给排查、执行、性能分析和隔离实验提供落点。',
    summary: '这是从“发现问题”到“动手验证”的操作面。',
    target: { tab: 'TaskCenter' },
    pages: [
      { id: 'LogViewer', title: '日志查看器', purpose: '看实时日志、检索和导出。', whenToUse: '看错误细节时。' },
      { id: 'TaskCenter', title: '任务中心', purpose: '把草稿、执行、验证承接为动作。', whenToUse: '需要把发现变成任务时。' },
      { id: 'Performance', title: '性能监控', purpose: '看资源指标和性能瓶颈。', whenToUse: '系统慢、负载高时。' },
      { id: 'Sandbox', title: '隔离沙箱', purpose: '做低风险验证和命令实验。', whenToUse: '先试再动生产面时。' },
    ],
  },
  {
    id: 'domain',
    title: '领域应用',
    description: '把家庭生活、OPC 和服务型能力作为挂载应用纳入 cockpit。',
    summary: 'Cockpit 做入口和治理，不吞掉领域自己的 SSOT 和专业 UI。',
    target: { tab: 'DomainApps' },
    pages: [
      { id: 'QuestBoard', title: '积分冒险', purpose: '承接家庭激励与亲子场景。', whenToUse: '家庭互动和任务激励时。' },
      { id: 'DomainApps', title: '应用中心', purpose: '统一看领域应用、服务状态和打开入口。', whenToUse: '要进入家庭驾驶舱或 OPC 时。' },
      { id: 'Settings', title: '底层设置', purpose: '配置控制面、认证和基础参数。', whenToUse: '准备挂载新应用或修配置时。' },
    ],
  },
];

const GUIDE_PATHS: GuidePath[] = [
  {
    id: 'first-pass',
    title: '第一次进入',
    tag: '认路',
    description: '先看导览，再看系统地图，最后回首页建立日常使用感。',
    steps: ['站内导览', '系统地图', '首页', '任务中心'],
    target: { tab: 'Guide' },
    actionLabel: '打开导览',
  },
  {
    id: 'daily-ops',
    title: '每日值守',
    tag: '日常',
    description: '从首页看健康和提醒，再进告警、任务和日志闭环。',
    steps: ['首页', '告警中心', '任务中心', '日志查看器'],
    target: { tab: 'SystemMap', usagePathId: 'daily-ops' },
    actionLabel: '打开推荐路径',
  },
  {
    id: 'governance-loop',
    title: '治理巡检',
    tag: '治理',
    description: '从战略到债务再到域健康，判断哪里该补位、哪里该下线。',
    steps: ['C2G 战略中心', '技术债务', 'L4 域健康', '系统地图'],
    target: { tab: 'C2G' },
    actionLabel: '打开治理面',
  },
  {
    id: 'domain-mount',
    title: '领域挂载',
    tag: '领域',
    description: '先从应用中心看挂载状态，再进入家庭驾驶舱、Quest 和设置。',
    steps: ['应用中心', '积分冒险', '底层设置', '任务中心'],
    target: { tab: 'DomainApps' },
    actionLabel: '打开应用中心',
  },
];

const DEFAULT_METRICS: GuideMetrics = {
  usagePaths: 0,
  playbooks: 0,
  featureDomains: 0,
  attentionPages: 0,
  projectCoverageScore: null,
  domainSummary: {
    total: 0,
    running: 0,
    highRisk: 0,
    externalMounts: 0,
    score: null,
  },
  domainAttention: [],
  pageAttentionItems: [],
  capabilityGaps: [],
  weakestDimensions: [],
  roadmapItems: [],
  draftSummary: {
    total: 0,
    capabilityGap: 0,
    pageMaturity: 0,
    domainApp: 0,
    projectPortfolio: 0,
    playbook: 0,
    verificationReady: 0,
  },
  featuredDrafts: [],
  closureDrafts: [],
  pageCoverageRows: [],
  dimensionCoverageRows: [],
};

function staticPageCount() {
  return GUIDE_GROUPS.reduce((total, group) => total + group.pages.length, 0);
}

function appendListValue(map: Map<string, string[]>, key: string, value: string) {
  if (!key || !value) return;
  const list = map.get(key) || [];
  if (!list.includes(value)) {
    list.push(value);
    map.set(key, list);
  }
}

function pageCoverageStatusClass(status: string) {
  if (status === 'ready') return 'ready';
  if (status === 'watch') return 'watch';
  return 'gap';
}

function pageCoverageStatusText(status: string) {
  if (status === 'ready') return '已接通';
  if (status === 'watch') return '待收口';
  return '待补位';
}

function dimensionStatusClass(status: string) {
  if (status === 'ready') return 'ready';
  if (status === 'warning' || status === 'watch') return 'watch';
  return 'gap';
}

function dimensionStatusText(status: string) {
  if (status === 'ready') return '已接通';
  if (status === 'warning' || status === 'watch') return '待收口';
  return '待修复';
}

function guideDraftTypeLabel(type?: string) {
  if (type === 'system_map_page_maturity') return '页面补位';
  if (type === 'system_map_capability_gap') return '能力缺口';
  if (type === 'system_map_domain_app') return '领域挂载';
  if (type === 'system_map_project_portfolio') return '项目组合';
  if (type === 'system_map_playbook') return '操作清单';
  if (type === 'system_map_verification_ready') return '验证补证';
  return '承接任务';
}

function matchesGuideFocusQuery(value?: string | null, query?: string) {
  if (!value || !query) return false;
  const haystack = value.trim().toLowerCase();
  const needle = query.trim().toLowerCase();
  if (!haystack || !needle) return false;
  return haystack.includes(needle) || needle.includes(haystack);
}

export default function CockpitGuideView({
  onNavigate,
  onOpenTarget,
  focusPageId,
  focusProjectId,
  focusTaskQuery,
}: CockpitGuideViewProps) {
  const [metrics, setMetrics] = useState<GuideMetrics>(DEFAULT_METRICS);

  useEffect(() => {
    let alive = true;

    const loadGuideMetrics = async () => {
      try {
        const [systemMapResponse, tasksResponse] = await Promise.all([
          fetch('/api/cockpit/system-map'),
          fetch('/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=40'),
        ]);
        if (!systemMapResponse.ok) return;
        const payload = await systemMapResponse.json();
        const tasksPayload = tasksResponse.ok ? await tasksResponse.json() : { items: [] };
        if (!alive) return;
        const attentionItems = (payload.page_maturity?.attention_items || payload.page_maturity?.items || [])
          .filter((item: { status?: string }) => item.status !== 'ready');
        const draftItems = ((tasksPayload.items || []) as Array<{
          id: string;
          title: string;
          description?: string;
          read_only?: boolean;
          source?: { type?: string; id?: string };
        }>).filter((item) => item.read_only && item.source?.type);
        const dimensionSummaryItems = ((payload.project_capability_coverage?.dimension_summary || []) as Array<{
          id: string;
          title?: string;
          description?: string;
          status?: string;
          score?: number;
          ready?: number;
          warning?: number;
          failed?: number;
          attention_projects?: Array<{ id: string; status?: string; next_action?: string }>;
        }>);
        const usagePathMap = new Map<string, string[]>();
        const playbookMap = new Map<string, string[]>();
        const featureDomainMap = new Map<string, string[]>();
        const roadmapMap = new Map<string, string[]>();
        const pageAttentionById = new Map<string, {
          page_id: string;
          score?: number;
          status?: string;
          next_action?: string;
        }>();
        const domainDraftItems = draftItems.filter((item) => item.source?.type === 'system_map_domain_app');
        const domainAttentionItems = ((payload.domain_apps?.attention_items || []) as Array<{
          id: string;
          name?: string;
          runtime_status?: string;
          risk_level?: string;
          security_posture?: string;
          freshness_status?: string;
          next_action?: string;
          domain?: { name?: string };
        }>).slice(0, 3);
        ((payload.page_maturity?.attention_items || payload.page_maturity?.items || []) as Array<{
          page_id: string;
          score?: number;
          status?: string;
          next_action?: string;
        }>).forEach((item) => {
          if (item.page_id) {
            pageAttentionById.set(item.page_id, item);
          }
        });
        ((payload.usage_paths || []) as Array<{
          title?: string;
          pages?: Array<{ id?: string }>;
        }>).forEach((path) => {
          (path.pages || []).forEach((page) => {
            if (page.id && path.title) {
              appendListValue(usagePathMap, page.id, path.title);
            }
          });
        });
        ((payload.playbooks || []) as Array<{
          title?: string;
          steps?: Array<{ page_id?: string; page?: { id?: string } }>;
        }>).forEach((playbook) => {
          (playbook.steps || []).forEach((step) => {
            const pageId = step.page_id || step.page?.id;
            if (pageId && playbook.title) {
              appendListValue(playbookMap, pageId, playbook.title);
            }
          });
        });
        ((payload.feature_domains || []) as Array<{
          title?: string;
          cockpit_page?: string;
          providers?: string[];
        }>).forEach((domain) => {
          if (domain.cockpit_page && domain.title) {
            appendListValue(featureDomainMap, domain.cockpit_page, domain.title);
          }
          (domain.providers || []).forEach((provider) => {
            if (domain.title && GUIDE_GROUPS.some((group) => group.pages.some((page) => page.id === provider || page.title === provider))) {
              appendListValue(featureDomainMap, provider, domain.title);
            }
          });
        });
        ((payload.roadmap?.items || []) as Array<{
          title?: string;
          cockpit_page?: string;
        }>).forEach((item) => {
          if (item.cockpit_page && item.title) {
            appendListValue(roadmapMap, item.cockpit_page, item.title);
          }
        });
        const draftSummary = {
          total: draftItems.length,
          capabilityGap: draftItems.filter((item) => item.source?.type === 'system_map_capability_gap').length,
          pageMaturity: draftItems.filter((item) => item.source?.type === 'system_map_page_maturity').length,
          domainApp: draftItems.filter((item) => item.source?.type === 'system_map_domain_app').length,
          projectPortfolio: draftItems.filter((item) => item.source?.type === 'system_map_project_portfolio').length,
          playbook: draftItems.filter((item) => item.source?.type === 'system_map_playbook').length,
          verificationReady: draftItems.filter((item) => item.source?.type === 'system_map_verification_ready').length,
        };
        setMetrics({
          usagePaths: (payload.usage_paths || []).length,
          playbooks: (payload.playbooks || []).length,
          featureDomains: (payload.feature_domains || []).length,
          attentionPages: attentionItems.length,
          projectCoverageScore: payload.project_portfolio?.summary?.score ?? null,
          domainSummary: {
            total: payload.domain_apps?.summary?.total ?? 0,
            running: payload.domain_apps?.summary?.running ?? 0,
            highRisk: payload.domain_apps?.summary?.high_risk ?? 0,
            externalMounts: payload.domain_apps?.summary?.external_mounts ?? 0,
            score: payload.domain_apps?.summary?.score ?? null,
          },
          domainAttention: domainAttentionItems.map((item) => {
            const linkedDraft = domainDraftItems.find((draft) =>
              draft.source?.id === item.id
              || (item.name ? draft.title?.includes(item.name) : false),
            );
            return {
              id: item.id,
              name: item.name || item.id,
              domainName: item.domain?.name,
              runtimeStatus: item.runtime_status || 'unknown',
              securityPosture: item.security_posture || 'unknown',
              riskLevel: item.risk_level || 'unknown',
              freshnessStatus: item.freshness_status || '未登记',
              nextAction: item.next_action || linkedDraft?.description || '回应用中心确认运行态、安全门和入口状态。',
              taskTitle: linkedDraft?.title,
              taskQuery: linkedDraft?.source?.id || linkedDraft?.id || item.id,
            };
          }),
          pageAttentionItems: attentionItems.slice(0, 3),
          capabilityGaps: (payload.gaps || []).slice(0, 3),
          weakestDimensions: (payload.project_portfolio?.weakest_dimensions || []).slice(0, 3),
          roadmapItems: ((payload.roadmap?.items || []) as GuideMetrics['roadmapItems'])
            .filter((item) => item.status !== 'shipped')
            .slice(0, 3),
          draftSummary,
          featuredDrafts: draftItems
            .filter((item) =>
              item.source?.type === 'system_map_capability_gap'
              || item.source?.type === 'system_map_page_maturity'
              || item.source?.type === 'system_map_domain_app'
              || item.source?.type === 'system_map_project_portfolio'
            )
            .slice(0, 4)
            .map((item) => ({
              id: item.id,
              title: item.title,
              sourceType: item.source?.type || '',
              sourceId: item.source?.id || item.id,
              description: item.description,
            })),
          closureDrafts: draftItems
            .filter((item) =>
              item.source?.type === 'system_map_verification_ready'
              || item.source?.type === 'system_map_playbook'
              || item.source?.type === 'system_map_page_maturity'
            )
            .slice(0, 4)
            .map((item) => ({
              id: item.id,
              title: item.title,
              sourceType: item.source?.type || '',
              sourceId: item.source?.id || item.id,
              description: item.description,
            })),
          pageCoverageRows: GUIDE_GROUPS.flatMap((group) => (
            group.pages.map((page) => {
              const attention = pageAttentionById.get(page.id);
              const usagePaths = usagePathMap.get(page.id) || [];
              const featureDomains = featureDomainMap.get(page.id) || [];
              const playbooks = playbookMap.get(page.id) || [];
              const roadmapTitles = roadmapMap.get(page.id) || [];
              const linkedDraft = draftItems.find((item) =>
                item.source?.id === page.id
                && (
                  item.source?.type === 'system_map_page_maturity'
                  || item.source?.type === 'system_map_verification_ready'
                ),
              );
              const missingUsagePath = usagePaths.length === 0;
              const missingFeatureDomain = featureDomains.length === 0;
              const status = attention?.status
                || (linkedDraft ? 'watch' : (missingUsagePath || missingFeatureDomain ? 'gap' : 'ready'));
              const score = attention?.score ?? (
                missingUsagePath && missingFeatureDomain
                  ? 40
                  : missingUsagePath || missingFeatureDomain
                    ? 72
                    : 100
              );
              const nextAction = attention?.next_action
                || linkedDraft?.description
                || roadmapTitles[0]
                || (missingUsagePath
                  ? '先把这个页面接入至少一条使用路径。'
                  : missingFeatureDomain
                    ? '补一条能力域映射，让页面不再孤立。'
                    : '保持页面入口、路径和任务承接同步。');
              return {
                id: page.id,
                title: page.title,
                groupId: group.id,
                groupTitle: group.title,
                purpose: page.purpose,
                whenToUse: page.whenToUse,
                status,
                score,
                usagePaths,
                featureDomains,
                playbooks,
                roadmapTitles,
                nextAction,
                taskQuery: linkedDraft?.source?.id || page.id,
                missingUsagePath,
                missingFeatureDomain,
              };
            })
          )),
          dimensionCoverageRows: dimensionSummaryItems
            .map((item) => {
              const attentionProjects = (item.attention_projects || []).map((project) => ({
                id: project.id,
                status: project.status,
                nextAction: project.next_action,
              }));
              return {
                id: item.id,
                title: item.title || item.id,
                description: item.description || '从系统地图确认这个维度在项目矩阵里的覆盖质量。',
                status: item.status || (item.failed ? 'failed' : item.warning ? 'warning' : 'ready'),
                score: item.score ?? null,
                ready: item.ready ?? 0,
                warning: item.warning ?? 0,
                failed: item.failed ?? 0,
                attentionProjects,
                nextAction: attentionProjects[0]?.nextAction
                  || (item.failed
                    ? `先回系统地图处理 ${item.failed} 个失败格子。`
                    : item.warning
                      ? `先确认 ${item.warning} 个预警格子是否已经在收口。`
                      : '保持这个维度的覆盖质量和验证证据新鲜。'),
                taskQuery: attentionProjects[0]?.id
                  || (item.id.includes('verification')
                    ? '验证'
                    : item.id.includes('runtime')
                      ? '运行'
                      : item.id),
              };
            })
            .sort((left, right) => {
              const leftRisk = (left.failed * 3) + (left.warning * 2) - left.ready;
              const rightRisk = (right.failed * 3) + (right.warning * 2) - right.ready;
              return rightRisk - leftRisk;
            }),
        });
      } catch (error) {
        if (alive) {
          setMetrics(DEFAULT_METRICS);
        }
      }
    };

    void loadGuideMetrics();
    return () => {
      alive = false;
    };
  }, []);

  const summaryCards = useMemo(() => [
    { id: 'pages', label: '页面覆盖', value: `${staticPageCount()} 页`, detail: '当前导览已把 cockpit 的核心页面按工作带重新分组。' },
    { id: 'usage', label: '使用路径', value: `${metrics.usagePaths} 条`, detail: '把“先看哪、再去哪”从页面导航提升成路径导航。' },
    { id: 'domains', label: '能力域', value: `${metrics.featureDomains} 个`, detail: '让页面和能力域、项目、路线图之间能相互定位。' },
    {
      id: 'attention',
      label: '当前补位',
      value: metrics.attentionPages > 0 ? `${metrics.attentionPages} 页待补` : '已收敛',
      detail: metrics.domainSummary.total > 0
        ? `领域挂载 ${metrics.domainSummary.running}/${metrics.domainSummary.total} 在线 · 高风险 ${metrics.domainSummary.highRisk}。`
        : metrics.projectCoverageScore !== null
          ? `项目覆盖得分 ${metrics.projectCoverageScore}%，可以从系统地图继续下钻。`
        : '优先补齐使用路径、验证证据和领域挂载承接。',
    },
  ], [metrics.attentionPages, metrics.domainSummary.highRisk, metrics.domainSummary.running, metrics.domainSummary.total, metrics.featureDomains, metrics.projectCoverageScore, metrics.usagePaths]);

  const coverageSummary = useMemo(() => {
    const rows = metrics.pageCoverageRows;
    return {
      total: rows.length,
      ready: rows.filter((row) => row.status === 'ready').length,
      watch: rows.filter((row) => row.status === 'watch').length,
      gap: rows.filter((row) => row.status !== 'ready' && row.status !== 'watch').length,
      withUsagePath: rows.filter((row) => !row.missingUsagePath).length,
      withFeatureDomain: rows.filter((row) => !row.missingFeatureDomain).length,
    };
  }, [metrics.pageCoverageRows]);

  const coverageGroups = useMemo(() => (
    GUIDE_GROUPS.map((group) => ({
      ...group,
      rows: metrics.pageCoverageRows.filter((row) => row.groupId === group.id),
    }))
  ), [metrics.pageCoverageRows]);

  const dimensionCoverageSummary = useMemo(() => {
    const rows = metrics.dimensionCoverageRows;
    return {
      total: rows.length,
      ready: rows.filter((row) => row.status === 'ready').length,
      warning: rows.filter((row) => row.status === 'warning' || row.status === 'watch').length,
      failed: rows.filter((row) => row.status !== 'ready' && row.status !== 'warning' && row.status !== 'watch').length,
      attentionProjects: rows.reduce((total, row) => total + row.attentionProjects.length, 0),
    };
  }, [metrics.dimensionCoverageRows]);

  const focusedGuideCard = useMemo(() => {
    const pageRow = focusPageId
      ? metrics.pageCoverageRows.find((row) => row.id === focusPageId) || null
      : null;
    const queryDraft = focusTaskQuery
      ? [...metrics.featuredDrafts, ...metrics.closureDrafts].find((draft) =>
        matchesGuideFocusQuery(draft.sourceId, focusTaskQuery)
        || matchesGuideFocusQuery(draft.id, focusTaskQuery)
        || matchesGuideFocusQuery(draft.title, focusTaskQuery),
      ) || null
      : null;
    const projectDraft = focusProjectId
      ? [...metrics.featuredDrafts, ...metrics.closureDrafts].find((draft) =>
        matchesGuideFocusQuery(draft.sourceId, focusProjectId)
        || matchesGuideFocusQuery(draft.id, focusProjectId)
        || matchesGuideFocusQuery(draft.title, focusProjectId),
      ) || null
      : null;
    const domainItem = focusTaskQuery
      ? metrics.domainAttention.find((item) =>
        matchesGuideFocusQuery(item.id, focusTaskQuery)
        || matchesGuideFocusQuery(item.name, focusTaskQuery),
      ) || null
      : null;

    if (pageRow) {
      return {
        title: pageRow.title,
        meta: '从系统地图带回来的页面导览对象',
        state: `${pageCoverageStatusText(pageRow.status)} · ${pageRow.score ?? 0}% · ${pageRow.groupTitle}`,
        nextAction: pageRow.nextAction,
        objectTarget: { tab: 'SystemMap', pageId: pageRow.id } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: pageRow.taskQuery } as CockpitNavigationTarget,
      };
    }

    if (domainItem) {
      return {
        title: domainItem.name,
        meta: `${domainItem.domainName || '领域挂载'} · 从导览页继续承接`,
        state: `运行 ${domainItem.runtimeStatus} · 风险 ${domainItem.riskLevel} · 安全 ${domainItem.securityPosture}`,
        nextAction: domainItem.nextAction,
        objectTarget: { tab: 'DomainApps', taskQuery: domainItem.id } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: domainItem.taskQuery } as CockpitNavigationTarget,
      };
    }

    if (queryDraft) {
      return {
        title: queryDraft.title,
        meta: `从导览页继续承接的${guideDraftTypeLabel(queryDraft.sourceType)}`,
        state: `${guideDraftTypeLabel(queryDraft.sourceType)} · ${queryDraft.sourceId}`,
        nextAction: queryDraft.description || '回任务中心继续承接这条补位动作。',
        objectTarget: queryDraft.sourceType === 'system_map_domain_app'
          ? { tab: 'DomainApps', taskQuery: queryDraft.sourceId }
          : queryDraft.sourceType === 'system_map_capability_gap'
            ? { tab: 'SystemMap', gapId: queryDraft.sourceId }
            : queryDraft.sourceType === 'system_map_project_portfolio'
              ? { tab: 'SystemMap', projectId: queryDraft.sourceId }
              : { tab: 'SystemMap', pageId: queryDraft.sourceId },
        taskTarget: { tab: 'TaskCenter', taskQuery: queryDraft.sourceId } as CockpitNavigationTarget,
      };
    }

    if (projectDraft) {
      return {
        title: projectDraft.title,
        meta: '从系统地图带回来的项目导览对象',
        state: `${guideDraftTypeLabel(projectDraft.sourceType)} · ${projectDraft.sourceId}`,
        nextAction: projectDraft.description || '回系统地图继续看项目覆盖和任务承接。',
        objectTarget: { tab: 'SystemMap', projectId: projectDraft.sourceId } as CockpitNavigationTarget,
        taskTarget: { tab: 'TaskCenter', taskQuery: projectDraft.sourceId } as CockpitNavigationTarget,
      };
    }

    return null;
  }, [focusPageId, focusProjectId, focusTaskQuery, metrics.closureDrafts, metrics.domainAttention, metrics.featuredDrafts, metrics.pageCoverageRows]);

  const problemEntryCards = useMemo<ProblemEntryCard[]>(() => {
    const firstAttentionPage = metrics.pageAttentionItems[0];
    const firstGap = metrics.capabilityGaps[0];
    const firstDomainAttention = metrics.domainAttention[0];
    const firstWeakDimension = metrics.weakestDimensions[0];
    const evidenceCount = metrics.draftSummary.verificationReady + metrics.draftSummary.playbook;
    const capabilityDraft = metrics.featuredDrafts.find((draft) => draft.sourceType === 'system_map_capability_gap');
    const coverageDraft = metrics.featuredDrafts.find((draft) => draft.sourceType === 'system_map_project_portfolio');

    return [
      {
        id: 'page-gap',
        title: '页面有了但不会用',
        signal: metrics.attentionPages > 0 ? `${metrics.attentionPages} 页待补位` : '页面入口已基本接通',
        detail: firstAttentionPage
          ? `${firstAttentionPage.page?.title || firstAttentionPage.page_id} 还需要继续补路径、补映射或补任务承接。`
          : '先从系统地图确认是不是页面职责、进入路径或任务承接没有接上。',
        primaryLabel: '看页面补位',
        primaryTarget: firstAttentionPage
          ? { tab: 'SystemMap', pageId: firstAttentionPage.page_id }
          : { tab: 'SystemMap' },
        secondaryLabel: '看页面任务',
        secondaryTarget: firstAttentionPage
          ? { tab: 'TaskCenter', taskQuery: firstAttentionPage.page_id }
          : { tab: 'TaskCenter', taskQuery: 'system_map_page_maturity' },
      },
      {
        id: 'evidence-gap',
        title: '能看不能证',
        signal: evidenceCount > 0 ? `${evidenceCount} 条待补证` : '补证车道已相对收敛',
        detail: metrics.closureDrafts[0]
          ? `${metrics.closureDrafts[0].title} 还没沉成完整证据链，建议先走验证补证车道。`
          : '先回任务中心和日志入口，把验证证据、操作清单和运行痕迹补齐。',
        primaryLabel: '开补证车道',
        primaryTarget: { tab: 'TaskCenter', taskQuery: 'system_map_verification_ready' },
        secondaryLabel: '看日志证据',
        secondaryTarget: { tab: 'LogViewer', taskQuery: 'verification' },
      },
      {
        id: 'domain-risk',
        title: '领域应用挂了或不稳',
        signal: metrics.domainSummary.total > 0
          ? `${metrics.domainSummary.highRisk} 高风险 / ${metrics.domainSummary.total} 总数`
          : '领域挂载数据待接入',
        detail: firstDomainAttention
          ? `${firstDomainAttention.name} 当前是 ${firstDomainAttention.runtimeStatus}，需要回应用中心和任务中心一起收口。`
          : '先确认家庭驾驶舱、OPC 和 family-hub 的挂载状态、安全门和入口可用性。',
        primaryLabel: '看领域对象',
        primaryTarget: firstDomainAttention
          ? { tab: 'DomainApps', taskQuery: firstDomainAttention.id }
          : { tab: 'DomainApps' },
        secondaryLabel: '看领域任务',
        secondaryTarget: firstDomainAttention
          ? { tab: 'TaskCenter', taskQuery: firstDomainAttention.taskQuery }
          : { tab: 'TaskCenter', taskQuery: 'system_map_domain_app' },
      },
      {
        id: 'capability-gap',
        title: '能力缺口还没收口',
        signal: metrics.capabilityGaps.length > 0 ? `${metrics.capabilityGaps.length} 项显式缺口` : '暂无显式能力缺口',
        detail: firstGap
          ? `${firstGap.title} 还需要继续拆成页面、资产、协议或领域挂载动作。`
          : '先从系统地图确认缺口落在页面能力、项目覆盖还是领域应用承接。',
        primaryLabel: '看缺口总图',
        primaryTarget: firstGap
          ? { tab: 'SystemMap', gapId: firstGap.id }
          : { tab: 'SystemMap' },
        secondaryLabel: '看缺口任务',
        secondaryTarget: capabilityDraft
          ? { tab: 'TaskCenter', taskQuery: capabilityDraft.sourceId }
          : { tab: 'TaskCenter', taskQuery: 'system_map_capability_gap' },
      },
      {
        id: 'coverage-drop',
        title: '覆盖维度在掉分',
        signal: firstWeakDimension ? `${firstWeakDimension.score ?? 0}% 最低分` : '维度覆盖暂未暴露短板',
        detail: firstWeakDimension
          ? `${firstWeakDimension.title || firstWeakDimension.id} 失败 ${firstWeakDimension.failed ?? 0}，预警 ${firstWeakDimension.warning ?? 0}。`
          : '先看项目覆盖和最弱维度，避免只补页面却没补治理链。',
        primaryLabel: '看覆盖维度',
        primaryTarget: firstWeakDimension
          ? { tab: 'SystemMap', coverageDimensionId: firstWeakDimension.id }
          : { tab: 'SystemMap' },
        secondaryLabel: '看覆盖任务',
        secondaryTarget: coverageDraft
          ? { tab: 'TaskCenter', taskQuery: coverageDraft.sourceId }
          : { tab: 'TaskCenter', taskQuery: 'system_map_project_portfolio' },
      },
    ];
  }, [
    metrics.attentionPages,
    metrics.capabilityGaps,
    metrics.closureDrafts,
    metrics.domainAttention,
    metrics.domainSummary.highRisk,
    metrics.domainSummary.total,
    metrics.draftSummary.playbook,
    metrics.draftSummary.verificationReady,
    metrics.featuredDrafts,
    metrics.pageAttentionItems,
    metrics.weakestDimensions,
  ]);

  return (
    <div className="cockpit-guide-page">
      <section className="cockpit-guide-band antd-card" aria-label="Cockpit 导览总览">
        <div className="cockpit-guide-band-head">
          <div>
            <small>Guide</small>
            <h2>全站导览</h2>
            <p>把 cockpit 从“很多页面”整理成“可理解、可上手、可闭环”的工作台。</p>
          </div>
          <div className="cockpit-guide-band-badge">
            <Sparkles size={16} />
            <span>先定路径，再下钻页面</span>
          </div>
        </div>
        <div className="cockpit-guide-summary-grid">
          {summaryCards.map((card) => (
            <article key={card.id} className="cockpit-guide-summary-card">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <p>{card.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <ActionSurfacePanel
        title="推荐起手动作"
        subtitle="你不用记住全部页面，按目标选一条路径就够了。"
        statusText={metrics.attentionPages > 0 ? `${metrics.attentionPages} 页待补位` : '导览已接通'}
        onNavigate={onNavigate}
        items={[
          {
            id: 'guide-home',
            title: '从首页开始值守',
            detail: '健康、告警、任务是最稳的日常入口。',
            actionLabel: '打开首页',
            actionType: 'navigate',
            actionValue: 'Home',
          },
          {
            id: 'guide-map',
            title: '从系统地图看缺口',
            detail: '当你觉得 cockpit 还缺功能，就去系统地图看页面、能力域和路线图。',
            actionLabel: '打开系统地图',
            actionType: 'navigate',
            actionValue: 'SystemMap',
          },
          {
            id: 'guide-domain',
            title: '从应用中心进领域',
            detail: '家庭驾驶舱、OPC、family-hub 先做挂载，不直接并入 cockpit。',
            actionLabel: '打开应用中心',
            actionType: 'navigate',
            actionValue: 'DomainApps',
          },
          {
            id: 'guide-task',
            title: '从任务中心承接动作',
            detail: '研究、治理、页面补位最后都要沉到任务中心。',
            actionLabel: '打开任务中心',
            actionType: 'navigate',
            actionValue: 'TaskCenter',
          },
        ]}
      />

      {focusedGuideCard && (
        <section className="cockpit-guide-section" aria-label="当前导览承接焦点">
          <div className="section-header">
            <div>
              <h2>当前导览承接焦点</h2>
              <p className="text-muted">导览页先把你刚定位到的对象和任务承接摆出来，再决定往系统地图、应用中心还是任务中心继续下钻。</p>
            </div>
            <button className="antd-btn small" onClick={() => onNavigate?.('SystemMap')} aria-label="回系统地图继续定位">
              <MapIcon size={13} />
              <span>回系统地图</span>
            </button>
          </div>
          <div className="cockpit-guide-focus-grid">
            <article className="cockpit-guide-focus-card">
              <div className="cockpit-guide-focus-head">
                <strong>{focusedGuideCard.title}</strong>
                <span>{focusedGuideCard.meta}</span>
              </div>
              <div className="cockpit-guide-focus-list">
                <div className="cockpit-guide-focus-item" style={{ cursor: 'default' }}>
                  <div>
                    <strong>当前状态</strong>
                    <small>{focusedGuideCard.state}</small>
                  </div>
                  <p>{focusedGuideCard.nextAction}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  type="button"
                  className="antd-btn small"
                  aria-label={`打开导览焦点对象 ${focusedGuideCard.title}`}
                  onClick={() => openCockpitNavigationTarget(focusedGuideCard.objectTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={13} />
                  <span>看对象</span>
                </button>
                <button
                  type="button"
                  className="antd-btn small"
                  aria-label={`打开导览焦点任务 ${focusedGuideCard.title}`}
                  onClick={() => openCockpitNavigationTarget(focusedGuideCard.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={13} />
                  <span>看任务承接</span>
                </button>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>当前缺口与补位</h2>
            <p className="text-muted">把“感觉还缺很多”拆成页面、能力、项目覆盖和路线图四类动作。</p>
          </div>
        </div>
        <div className="cockpit-guide-focus-grid">
          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>页面补位</strong>
              <span>{metrics.pageAttentionItems.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.pageAttentionItems.map((item) => (
                <button
                  key={item.page_id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开页面补位 ${item.page?.title || item.page_id}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: item.page_id }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{item.page?.title || item.page_id}</strong>
                    <small>{item.status} · {item.score}%</small>
                  </div>
                  <p>{item.next_action}</p>
                </button>
              ))}
              {metrics.pageAttentionItems.length === 0 && (
                <div className="cockpit-guide-focus-empty">当前没有待补页面。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>能力缺口</strong>
              <span>{metrics.capabilityGaps.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.capabilityGaps.map((gap) => (
                <button
                  key={gap.id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开能力缺口 ${gap.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', gapId: gap.id }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{gap.title}</strong>
                    <small>{gap.severity}</small>
                  </div>
                  <p>{gap.next || gap.evidence}</p>
                </button>
              ))}
              {metrics.capabilityGaps.length === 0 && (
                <div className="cockpit-guide-focus-empty">当前没有显式能力缺口。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>项目覆盖短板</strong>
              <span>{metrics.weakestDimensions.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.weakestDimensions.map((dimension) => (
                <button
                  key={dimension.id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开覆盖短板 ${dimension.title || dimension.id}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', coverageDimensionId: dimension.id }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{dimension.title || dimension.id}</strong>
                    <small>{dimension.score ?? 0}%</small>
                  </div>
                  <p>失败 {dimension.failed ?? 0} · 预警 {dimension.warning ?? 0}</p>
                </button>
              ))}
              {metrics.weakestDimensions.length === 0 && (
                <div className="cockpit-guide-focus-empty">当前没有覆盖短板数据。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>领域挂载</strong>
              <span>{metrics.domainAttention.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.domainAttention.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开领域挂载 ${item.name}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: item.id }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.runtimeStatus} · {item.securityPosture} · {item.riskLevel}</small>
                  </div>
                  <p>{item.nextAction}</p>
                </button>
              ))}
              {metrics.domainAttention.length === 0 && (
                <div className="cockpit-guide-focus-empty">
                  {metrics.domainSummary.total > 0 ? '当前没有待承接的领域挂载。' : '当前还没有领域挂载数据。'}
                </div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-focus-card">
            <div className="cockpit-guide-focus-head">
              <strong>路线图优先项</strong>
              <span>{metrics.roadmapItems.length} 项</span>
            </div>
            <div className="cockpit-guide-focus-list">
              {metrics.roadmapItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="cockpit-guide-focus-item"
                  aria-label={`打开路线图优先项 ${item.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: item.cockpit_page }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <small>{item.priority} · {item.status}</small>
                  </div>
                  <p>{item.problem || `优先回到 ${item.cockpit_page} 承接实现。`}</p>
                </button>
              ))}
              {metrics.roadmapItems.length === 0 && (
                <div className="cockpit-guide-focus-empty">当前没有待跟进路线图条目。</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>按问题定位</h2>
            <p className="text-muted">当你只知道“这里不够用”时，先按症状进，不用猜应该去哪个页面翻。</p>
          </div>
        </div>
        <div className="cockpit-guide-focus-grid">
          {problemEntryCards.map((card) => (
            <article key={card.id} className="cockpit-guide-focus-card">
              <div className="cockpit-guide-focus-head">
                <strong>{card.title}</strong>
                <span>{card.signal}</span>
              </div>
              <div className="cockpit-guide-focus-list">
                <div className="cockpit-guide-focus-item" style={{ cursor: 'default' }}>
                  <div>
                    <strong>当前信号</strong>
                    <small>{card.signal}</small>
                  </div>
                  <p>{card.detail}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开问题入口 ${card.title}`}
                  onClick={() => openCockpitNavigationTarget(card.primaryTarget, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>{card.primaryLabel}</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开问题任务 ${card.title}`}
                  onClick={() => openCockpitNavigationTarget(card.secondaryTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>{card.secondaryLabel}</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>推荐使用路径</h2>
            <p className="text-muted">按照目标走，不要按菜单乱撞。</p>
          </div>
        </div>
        <div className="cockpit-guide-path-grid">
          {GUIDE_PATHS.map((path) => (
            <article key={path.id} className="cockpit-guide-path-card">
              <div className="cockpit-guide-path-head">
                <span>{path.tag}</span>
                <strong>{path.title}</strong>
              </div>
              <p>{path.description}</p>
              <div className="cockpit-guide-path-steps" aria-label={`${path.title} 路径步骤`}>
                {path.steps.map((step) => (
                  <span key={step}>{step}</span>
                ))}
              </div>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开推荐路径 ${path.title}`}
                onClick={() => openCockpitNavigationTarget(path.target, onNavigate, onOpenTarget)}
              >
                <Route size={14} />
                <span>{path.actionLabel}</span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>按角色进入</h2>
            <p className="text-muted">同一个 cockpit，不同人进来的第一步不该一样。</p>
          </div>
        </div>
        <div className="cockpit-guide-mode-grid">
          {COCKPIT_WORK_MODES.map((mode) => (
            <article key={mode.id} className={`cockpit-guide-mode-card ${mode.role}`}>
              <div className="cockpit-guide-mode-head">
                <span>{mode.role}</span>
                <strong>{mode.title}</strong>
              </div>
              <p>{mode.summary}</p>
              <div className="cockpit-guide-mode-focus">
                {mode.focus.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
              <div className="cockpit-guide-mode-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开角色模式 ${mode.title}`}
                  onClick={() => openCockpitNavigationTarget(mode.entry, onNavigate, onOpenTarget)}
                >
                  <ArrowRight size={14} />
                  <span>进入主入口</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开角色任务 ${mode.title}`}
                  onClick={() => openCockpitNavigationTarget(mode.taskTarget, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看承接任务</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>补位任务承接</h2>
            <p className="text-muted">把发现的问题直接沉到任务中心，不靠手动记忆。</p>
          </div>
        </div>
        <div className="cockpit-guide-task-grid">
          <article className="cockpit-guide-task-card">
            <div className="cockpit-guide-task-head">
              <strong>草稿车道</strong>
              <span>{metrics.draftSummary.total} 条</span>
            </div>
            <div className="cockpit-guide-task-lanes">
              <button
                type="button"
                className="cockpit-guide-task-lane"
                aria-label="打开任务车道 页面能力"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_page_maturity' }, onNavigate, onOpenTarget)}
              >
                <strong>页面能力</strong>
                <small>{metrics.draftSummary.pageMaturity}</small>
              </button>
              <button
                type="button"
                className="cockpit-guide-task-lane"
                aria-label="打开任务车道 能力缺口"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_capability_gap' }, onNavigate, onOpenTarget)}
              >
                <strong>能力缺口</strong>
                <small>{metrics.draftSummary.capabilityGap}</small>
              </button>
              <button
                type="button"
                className="cockpit-guide-task-lane"
                aria-label="打开任务车道 领域应用"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_domain_app' }, onNavigate, onOpenTarget)}
              >
                <strong>领域应用</strong>
                <small>{metrics.draftSummary.domainApp}</small>
              </button>
              <button
                type="button"
                className="cockpit-guide-task-lane"
                aria-label="打开任务车道 项目组合"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_project_portfolio' }, onNavigate, onOpenTarget)}
              >
                <strong>项目组合</strong>
                <small>{metrics.draftSummary.projectPortfolio}</small>
              </button>
            </div>
          </article>

          <article className="cockpit-guide-task-card">
            <div className="cockpit-guide-task-head">
              <strong>推荐先做</strong>
              <span>{metrics.featuredDrafts.length} 条</span>
            </div>
            <div className="cockpit-guide-task-list">
              {metrics.featuredDrafts.map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  className="cockpit-guide-task-item"
                  aria-label={`打开补位任务 ${draft.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: draft.sourceId }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{draft.title}</strong>
                    <small>{draft.sourceType}</small>
                  </div>
                  <p>{draft.description || `优先在任务中心承接 ${draft.sourceId}。`}</p>
                </button>
              ))}
              {metrics.featuredDrafts.length === 0 && (
                <div className="cockpit-guide-task-empty">当前没有需要承接的补位草稿。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-task-card">
            <div className="cockpit-guide-closure-head">
              <strong>领域挂载闭环</strong>
              <span>{metrics.domainAttention.length} 项</span>
            </div>
            <div className="cockpit-guide-closure-list">
              {metrics.domainAttention.map((item) => (
                <div key={`domain-closure-${item.id}`} className="cockpit-guide-closure-item">
                  <div className="cockpit-guide-closure-copy">
                    <strong>{item.name}</strong>
                    <small>{item.domainName || '领域对象'} · {item.runtimeStatus} · {item.securityPosture} · 新鲜度 {item.freshnessStatus}</small>
                    <p>{item.taskTitle || item.nextAction}</p>
                  </div>
                  <div className="cockpit-guide-closure-actions">
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`打开领域对象 ${item.name}`}
                      onClick={() => openCockpitNavigationTarget({ tab: 'DomainApps', taskQuery: item.id }, onNavigate, onOpenTarget)}
                    >
                      <ArrowRight size={14} />
                      <span>看对象</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`打开领域任务 ${item.name}`}
                      onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: item.taskQuery }, onNavigate, onOpenTarget)}
                    >
                      <Route size={14} />
                      <span>看任务</span>
                    </button>
                  </div>
                </div>
              ))}
              {metrics.domainAttention.length === 0 && (
                <div className="cockpit-guide-closure-empty">当前没有待承接的领域挂载闭环。</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>来源页回填与补证</h2>
            <p className="text-muted">每个能力缺口最终都要回来源页补功能，或者进补证草稿把证据补齐。</p>
          </div>
        </div>
        <div className="cockpit-guide-closure-grid">
          <article className="cockpit-guide-closure-card">
            <div className="cockpit-guide-closure-head">
              <strong>回来源页补能力</strong>
              <span>{metrics.pageAttentionItems.length} 页</span>
            </div>
            <div className="cockpit-guide-closure-list">
              {metrics.pageAttentionItems.map((item) => (
                <div key={`closure-page-${item.page_id}`} className="cockpit-guide-closure-item">
                  <div className="cockpit-guide-closure-copy">
                    <strong>{item.page?.title || item.page_id}</strong>
                    <small>{item.status} · {item.score}%</small>
                    <p>{item.next_action}</p>
                  </div>
                  <div className="cockpit-guide-closure-actions">
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`回来源页 ${item.page?.title || item.page_id}`}
                      onClick={() => openCockpitNavigationTarget({ tab: item.page_id }, onNavigate, onOpenTarget)}
                    >
                      <ArrowRight size={14} />
                      <span>回来源页</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn secondary"
                      aria-label={`打开页面补位任务 ${item.page?.title || item.page_id}`}
                      onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: item.page_id }, onNavigate, onOpenTarget)}
                    >
                      <Route size={14} />
                      <span>进任务</span>
                    </button>
                  </div>
                </div>
              ))}
              {metrics.pageAttentionItems.length === 0 && (
                <div className="cockpit-guide-closure-empty">当前没有待回填来源页的页面。</div>
              )}
            </div>
          </article>

          <article className="cockpit-guide-closure-card">
            <div className="cockpit-guide-closure-head">
              <strong>补证入口</strong>
              <span>{metrics.draftSummary.verificationReady + metrics.draftSummary.playbook} 条</span>
            </div>
            <div className="cockpit-guide-closure-lanes">
              <button
                type="button"
                className="cockpit-guide-closure-lane"
                aria-label="打开补证车道 验证补证"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_verification_ready' }, onNavigate, onOpenTarget)}
              >
                <strong>验证补证</strong>
                <small>{metrics.draftSummary.verificationReady}</small>
              </button>
              <button
                type="button"
                className="cockpit-guide-closure-lane"
                aria-label="打开补证车道 操作清单"
                onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: 'system_map_playbook' }, onNavigate, onOpenTarget)}
              >
                <strong>操作清单</strong>
                <small>{metrics.draftSummary.playbook}</small>
              </button>
            </div>
            <div className="cockpit-guide-closure-list">
              {metrics.closureDrafts.map((draft) => (
                <button
                  key={`closure-draft-${draft.id}`}
                  type="button"
                  className="cockpit-guide-closure-draft"
                  aria-label={`打开补证任务 ${draft.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: draft.sourceId }, onNavigate, onOpenTarget)}
                >
                  <div>
                    <strong>{draft.title}</strong>
                    <small>{draft.sourceType}</small>
                  </div>
                  <p>{draft.description || `继续补齐 ${draft.sourceId} 的证据和步骤。`}</p>
                </button>
              ))}
              {metrics.closureDrafts.length === 0 && (
                <div className="cockpit-guide-closure-empty">当前没有需要补证的草稿。</div>
              )}
            </div>
          </article>
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>全站覆盖总表</h2>
            <p className="text-muted">按页面看职责、进入时机、路径挂载、能力域挂载和补位动作，避免“知道有页面但不知道怎么用”。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{coverageSummary.total}</strong> 页总览</span>
          <span><strong>{coverageSummary.ready}</strong> 已接通</span>
          <span><strong>{coverageSummary.watch}</strong> 待收口</span>
          <span><strong>{coverageSummary.gap}</strong> 待补位</span>
          <span><strong>{coverageSummary.withUsagePath}</strong> 已入路径</span>
          <span><strong>{coverageSummary.withFeatureDomain}</strong> 已挂能力域</span>
        </div>
        <div className="cockpit-guide-coverage-groups">
          {coverageGroups.map((group) => (
            <article key={`coverage-${group.id}`} className="cockpit-guide-coverage-group">
              <div className="cockpit-guide-coverage-group-head">
                <div>
                  <strong>{group.title}</strong>
                  <small>{group.rows.length} 页 · {group.description}</small>
                </div>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开覆盖分组 ${group.title}`}
                  onClick={() => openCockpitNavigationTarget(group.target, onNavigate, onOpenTarget)}
                >
                  <Compass size={14} />
                  <span>打开工作带</span>
                </button>
              </div>
              <div className="cockpit-guide-coverage-list">
                {group.rows.map((row) => (
                  <div key={`coverage-row-${row.id}`} className={`cockpit-guide-coverage-row ${pageCoverageStatusClass(row.status)}`}>
                    <div className="cockpit-guide-coverage-row-head">
                      <div>
                        <strong>{row.title}</strong>
                        <small>{row.id} · {pageCoverageStatusText(row.status)} · {row.score ?? 0}%</small>
                      </div>
                      <span className={`cockpit-guide-coverage-status ${pageCoverageStatusClass(row.status)}`}>
                        {pageCoverageStatusText(row.status)}
                      </span>
                    </div>
                    <p>{row.purpose}</p>
                    <div className="cockpit-guide-coverage-meta">
                      <span>何时进入：{row.whenToUse}</span>
                      <span>{row.missingUsagePath ? '未入使用路径' : `路径 ${row.usagePaths.length} 条`}</span>
                      <span>{row.missingFeatureDomain ? '未挂能力域' : `能力域 ${row.featureDomains.length} 个`}</span>
                      <span>{row.playbooks.length > 0 ? `清单 ${row.playbooks.length} 条` : '暂无清单承接'}</span>
                    </div>
                    <div className="cockpit-guide-coverage-tags">
                      {row.usagePaths.slice(0, 2).map((item) => (
                        <span key={`${row.id}-usage-${item}`}>路径 · {item}</span>
                      ))}
                      {row.featureDomains.slice(0, 2).map((item) => (
                        <span key={`${row.id}-domain-${item}`}>能力域 · {item}</span>
                      ))}
                      {row.playbooks.slice(0, 1).map((item) => (
                        <span key={`${row.id}-playbook-${item}`}>清单 · {item}</span>
                      ))}
                      {row.roadmapTitles.slice(0, 1).map((item) => (
                        <span key={`${row.id}-roadmap-${item}`}>路线图 · {item}</span>
                      ))}
                      {row.missingUsagePath && <em>待补路径</em>}
                      {row.missingFeatureDomain && <em>待挂能力域</em>}
                    </div>
                    <div className="cockpit-guide-coverage-next">
                      <strong>下一步</strong>
                      <p>{row.nextAction}</p>
                    </div>
                    <div className="cockpit-guide-coverage-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开全站覆盖页面 ${row.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: row.id }, onNavigate, onOpenTarget)}
                      >
                        <ArrowRight size={14} />
                        <span>打开页面</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn secondary"
                        aria-label={`查看全站覆盖 ${row.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: row.id }, onNavigate, onOpenTarget)}
                      >
                        <MapIcon size={14} />
                        <span>看系统覆盖</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn secondary"
                        aria-label={`打开全站覆盖任务 ${row.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
                      >
                        <Route size={14} />
                        <span>看任务承接</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>维度覆盖总表</h2>
            <p className="text-muted">把跨项目的运行、验证、入口、命令等维度直接拉平，看清哪条能力链在掉分，而不是只盯页面。</p>
          </div>
        </div>
        <div className="cockpit-guide-coverage-summary">
          <span><strong>{dimensionCoverageSummary.total}</strong> 条维度</span>
          <span><strong>{dimensionCoverageSummary.ready}</strong> 已接通</span>
          <span><strong>{dimensionCoverageSummary.warning}</strong> 待收口</span>
          <span><strong>{dimensionCoverageSummary.failed}</strong> 待修复</span>
          <span><strong>{dimensionCoverageSummary.attentionProjects}</strong> 个注意项目</span>
        </div>
        <div className="cockpit-guide-coverage-list">
          {metrics.dimensionCoverageRows.map((row) => (
            <div key={`dimension-row-${row.id}`} className={`cockpit-guide-coverage-row ${dimensionStatusClass(row.status)}`}>
              <div className="cockpit-guide-coverage-row-head">
                <div>
                  <strong>{row.title}</strong>
                  <small>{row.id} · {dimensionStatusText(row.status)} · {row.score ?? 0}%</small>
                </div>
                <span className={`cockpit-guide-coverage-status ${dimensionStatusClass(row.status)}`}>
                  {dimensionStatusText(row.status)}
                </span>
              </div>
              <p>{row.description}</p>
              <div className="cockpit-guide-coverage-meta">
                <span>就绪 {row.ready} 项</span>
                <span>预警 {row.warning} 项</span>
                <span>失败 {row.failed} 项</span>
                <span>注意项目 {row.attentionProjects.length} 个</span>
              </div>
              <div className="cockpit-guide-coverage-tags">
                {row.attentionProjects.slice(0, 3).map((project) => (
                  <span key={`${row.id}-attention-${project.id}`}>项目 · {project.id}</span>
                ))}
                {row.attentionProjects.length === 0 && (
                  <em>当前没有显式注意项目</em>
                )}
              </div>
              <div className="cockpit-guide-coverage-next">
                <strong>下一步</strong>
                <p>{row.nextAction}</p>
              </div>
              <div className="cockpit-guide-coverage-actions">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开维度覆盖 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', coverageDimensionId: row.id }, onNavigate, onOpenTarget)}
                >
                  <MapIcon size={14} />
                  <span>看维度覆盖</span>
                </button>
                <button
                  type="button"
                  className="antd-btn secondary"
                  aria-label={`打开维度任务 ${row.title}`}
                  onClick={() => openCockpitNavigationTarget({ tab: 'TaskCenter', taskQuery: row.taskQuery }, onNavigate, onOpenTarget)}
                >
                  <Route size={14} />
                  <span>看修复任务</span>
                </button>
              </div>
            </div>
          ))}
          {metrics.dimensionCoverageRows.length === 0 && (
            <div className="cockpit-guide-focus-empty">当前还没有维度覆盖数据。</div>
          )}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>功能架构</h2>
            <p className="text-muted">每个工作带说明这组页面负责什么，以及什么时候该去那里。</p>
          </div>
        </div>
        <div className="cockpit-guide-architecture">
          {GUIDE_GROUPS.map((group) => (
            <section key={group.id} className="cockpit-guide-group">
              <div className="cockpit-guide-group-head">
                <div>
                  <small>{group.summary}</small>
                  <h3>{group.title}</h3>
                  <p>{group.description}</p>
                </div>
                <button
                  type="button"
                  className="antd-btn cockpit-guide-group-btn"
                  aria-label={`打开分组 ${group.title}`}
                  onClick={() => openCockpitNavigationTarget(group.target, onNavigate, onOpenTarget)}
                >
                  <Compass size={14} />
                  <span>打开主入口</span>
                </button>
              </div>
              <div className="cockpit-guide-page-grid">
                {group.pages.map((page) => (
                  <article key={page.id} className="cockpit-guide-page-card">
                    <div className="cockpit-guide-page-head">
                      <strong>{page.title}</strong>
                      <span>{page.id}</span>
                    </div>
                    <p>{page.purpose}</p>
                    <small>{page.whenToUse}</small>
                    <div className="cockpit-guide-page-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开页面 ${page.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: page.id }, onNavigate, onOpenTarget)}
                      >
                        <ArrowRight size={14} />
                        <span>打开页面</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn secondary"
                        aria-label={`查看页面覆盖 ${page.title}`}
                        onClick={() => openCockpitNavigationTarget({ tab: 'SystemMap', pageId: page.id }, onNavigate, onOpenTarget)}
                      >
                        <MapIcon size={14} />
                        <span>看覆盖</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="cockpit-guide-section">
        <div className="section-header">
          <div>
            <h2>使用原则</h2>
            <p className="text-muted">把 cockpit 当成入口、状态面和承接台，而不是把所有领域 UI 都塞进来。</p>
          </div>
        </div>
        <div className="cockpit-guide-principles">
          <article className="cockpit-guide-principle-card">
            <LayoutDashboard size={16} />
            <strong>先路径，后页面</strong>
            <p>优先按值守、治理、研究、领域挂载这些目标使用，而不是凭感觉跳菜单。</p>
          </article>
          <article className="cockpit-guide-principle-card">
            <MapIcon size={16} />
            <strong>先总图，后补位</strong>
            <p>当你觉得功能缺失，先去系统地图定位是页面缺口、能力域缺口还是领域应用没挂上来。</p>
          </article>
          <article className="cockpit-guide-principle-card">
            <Compass size={16} />
            <strong>入口不等于吞并</strong>
            <p>家庭驾驶舱、OPC、family-hub 保留各自 SSOT 和专业面，cockpit 只负责挂载、导航、治理和状态。</p>
          </article>
        </div>
      </section>
    </div>
  );
}

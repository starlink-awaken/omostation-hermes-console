import React, { Suspense, lazy, useState, useEffect, useMemo, useRef } from 'react';
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
  Bell,
  FileText,
  BarChart3,
  ClipboardList,
  Zap,
  Command,
  Compass,
  Globe,
  Briefcase,
  AppWindow,
  Map,
  ArrowRight,
  Copy,
  Sparkles,
  Menu,
  X,
  RefreshCw,
  Download,
  Shield,
} from 'lucide-react';
import Breadcrumb from './common/Breadcrumb';
import { CommandPalette } from './common/CommandPalette';
import QuickActionsPanel from './common/QuickActionsPanel';
import { useCommandPalette, useKeyboardShortcuts } from './common/useCommandPalette';
import { useQuickActions } from './common/useQuickActions';
import { parseNavigationHash, writeNavigationHash, type CockpitNavigationTarget } from './cockpitNavigation';
import { COCKPIT_PAGE_REGISTRY } from './cockpitPageRegistry';
import {
  findTaskDraftForTarget,
  persistTaskCenterDraft,
  readTaskCenterDraft,
  taskDraftToIncomingDraft,
} from './taskDraftHandoff';
import './Dashboard.css';

const SandboxTerminal = lazy(() => import('./SandboxTerminal'));
const EnginesView = lazy(() => import('./EnginesView'));
const SettingsView = lazy(() => import('./SettingsView'));
const WorkflowsView = lazy(() => import('./WorkflowsView'));
const TopologyView = lazy(() => import('./TopologyView'));
const ComputeView = lazy(() => import('./ComputeView'));
const DebtView = lazy(() => import('./DebtView'));
const ObservabilityView = lazy(() => import('./ObservabilityView'));
const QuestBoard = lazy(() => import('./QuestBoard'));
const L4HealthView = lazy(() => import('./L4HealthView'));
const HomePage = lazy(() => import('./HomePage'));
const AlertCenterPage = lazy(() => import('./AlertCenterPage'));
const LogViewerPage = lazy(() => import('./LogViewerPage'));
const TaskCenterPage = lazy(() => import('./TaskCenterPage'));
const PerformanceMonitorPage = lazy(() => import('./PerformanceMonitorPage'));
const C2GStrategyView = lazy(() => import('./C2GStrategyView'));
const McpMeshView = lazy(() => import('./McpMeshView'));
const AssetsView = lazy(() => import('./AssetsView'));
const DomainAppsView = lazy(() => import('./DomainAppsView'));
const SystemMapView = lazy(() => import('./SystemMapView'));
const OverviewPage = lazy(() => import('./OverviewPage'));
const KnowledgeHubView = lazy(() => import('./KnowledgeHubView'));
const GBrainAdminView = lazy(async () => {
  const module = await import('./GBrain/GBrainDashboard');
  return { default: module.DashboardPage };
});
const ResearchHubView = lazy(() => import('./ResearchHubView'));
const ProtocolWorkbenchView = lazy(() => import('./ProtocolWorkbenchView'));
const CockpitGuideView = lazy(() => import('./CockpitGuideView'));

interface SearchTarget {
  id: string;
  tab: string;
  label: string;
  group: string;
  keywords: string[];
  context?: {
    projectId?: string;
    taskQuery?: string;
    usagePathId?: string;
    gapId?: string;
    coverageDimensionId?: string;
    pageId?: string;
    featureDomainId?: string;
    draftId?: string;
    alertTab?: 'active' | 'history' | 'rules';
  };
}

type SearchFetchResult = {
  ok: boolean;
  data: unknown;
  error?: string;
};

async function fetchSearchData(url: string): Promise<SearchFetchResult> {
  try {
    const response = await fetch(url);
    if (!response.ok) return { ok: false, data: null, error: `HTTP ${response.status}` };
    return { ok: true, data: await response.json() };
  } catch (error) {
    return { ok: false, data: null, error: error instanceof Error ? error.message : '网络异常' };
  }
}

interface SearchDomainApp {
  id: string;
  name?: string;
  domain: {
    id: string;
    name: string;
  };
  description?: string;
  category?: string;
  risk_level?: string;
  runtime?: {
    status?: string;
    launch?: {
      status?: string;
      url?: string | null;
    };
    api?: {
      status?: string;
      url?: string | null;
    };
  };
  links?: {
    launch_url?: string | null;
    api_url?: string | null;
  };
  auth?: {
    type?: string;
  };
  freshness?: {
    status?: string | null;
  };
  security_summary?: {
    posture?: string;
  };
  commands?: {
    start?: string;
    verify?: string;
  };
}

interface SearchDomainAppsPayload {
  items?: SearchDomainApp[];
  summary?: {
    total?: number;
    ready?: number;
    security_attention_apps?: number;
  };
}

interface SearchProject {
  id: string;
  layer?: string;
  stack?: string;
  role?: string;
  cockpit_page?: string;
  operational?: {
    next_action?: string;
    risks?: string[];
  };
  portfolio?: {
    status?: string;
    primary_gap?: string;
    next_action?: string;
  };
}

interface SearchPriorityProject {
  id: string;
  layer?: string;
  status?: string;
  score?: number;
  primary_gap?: string;
  next_action?: string;
}

interface SearchTaskDraft {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  read_only?: boolean;
  priority?: string;
  tags?: string[];
  source?: {
    type?: string;
    id?: string;
    title?: string;
  };
  draft?: {
    kind?: string;
    copy_text?: string;
    step_count?: number;
    guard?: string;
    evidence_fields?: {
      label?: string;
      value?: string;
      page_id?: string;
      step_id?: string;
      evidence?: string;
      done_when?: string;
    }[];
  };
}

interface SearchAlert {
  id: string;
  level?: string;
  status?: string;
  source?: string;
  message?: string;
  description?: string;
  created_at?: string;
}

interface SearchAlertRule {
  id: string;
  name?: string;
  condition?: string;
  level?: string;
  enabled?: boolean;
  channels?: string[];
}

interface SearchQuest {
  id: number | string;
  title?: string;
  type?: string;
  reward?: number;
  completed?: number;
  assignee?: string;
}

interface SearchResearchItem {
  id: number | string;
  topic?: string;
  summary?: string;
  status?: string;
  agent?: string;
  next_action?: string;
  tags?: string[];
}

interface SearchMetaosWorkflow {
  id?: string;
  workflow_id?: string;
  task?: string;
  status?: string;
  created?: string;
  updated?: string;
}

interface SearchAssetSkill {
  id: string;
  name?: string;
  description?: string;
  source?: string;
  path?: string;
}

interface SearchAssetWorkflow {
  name: string;
  description?: string;
  steps?: number;
}

interface SearchUsagePath {
  id: string;
  title?: string;
  intent?: string;
  steps?: string[];
  pages?: { id?: string; title?: string; purpose?: string }[];
}

interface SearchPlaybook {
  id: string;
  title?: string;
  goal?: string;
  frequency?: string;
  owner?: string;
  risk?: string;
  steps?: {
    page_id?: string;
    action?: string;
    evidence?: string;
    done_when?: string;
    page?: { id?: string; title?: string };
  }[];
}

interface SearchFeatureDomain {
  id: string;
  title?: string;
  english?: string;
  capability_items?: string[];
  providers?: string[];
  cockpit_page?: string;
  coverage?: string;
}

interface SearchRoadmapItem {
  id: string;
  priority?: string;
  stage?: string;
  status?: string;
  title?: string;
  domain?: string;
  cockpit_page?: string;
  problem?: string;
  actions?: string[];
  acceptance?: string[];
}

interface SearchRoadmapLane {
  id: string;
  title?: string;
  count?: number;
}

interface SearchCapabilityGap {
  id: string;
  severity?: string;
  title?: string;
  evidence?: string;
  next?: string;
}

interface SearchCockpitPage {
  id: string;
  title?: string;
  group?: string;
  purpose?: string;
  dimensions?: string[];
}

const PAGE_REGISTRY_BY_ID = new globalThis.Map(COCKPIT_PAGE_REGISTRY.map((page) => [page.id, page] as const));

const SIDEBAR_GROUP_ORDER = [
  { id: 'group-home', title: '入口' },
  { id: 'group-monitoring', title: '运行大盘' },
  { id: 'group-intelligence', title: '智能与知识' },
  { id: 'group-governance', title: '系统治理' },
  { id: 'group-devtools', title: '开发工具' },
  { id: 'group-domain-apps', title: '领域应用' },
  { id: 'group-config', title: '系统配置' },
] as const;

const SIDEBAR_NAV_SECTIONS = SIDEBAR_GROUP_ORDER.map((group) => ({
  ...group,
  tabs: COCKPIT_PAGE_REGISTRY.filter((page) => page.group === group.title).map((page) => page.id),
}));

const GROUP_ENTRY_TABS: Record<string, string> = {
  入口: 'Home',
  '运行大盘': 'Overview',
  '智能与知识': 'Knowledge',
  '系统治理': 'AlertCenter',
  '开发工具': 'LogViewer',
  '领域应用': 'DomainApps',
  '系统配置': 'Settings',
};

const NAV_ICON_BY_TAB: Record<string, React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>> = {
  Home: LayoutDashboard,
  Guide: Compass,
  SystemMap: Map,
  Overview: LayoutDashboard,
  McpMesh: Globe,
  Topology: Network,
  Compute: Cpu,
  Research: Search,
  Knowledge: Database,
  GBrainAdmin: Shield,
  Engines: Cpu,
  Assets: Briefcase,
  Protocol: Command,
  Workflows: GitCommit,
  C2G: Compass,
  AlertCenter: Bell,
  L4Health: Heart,
  Debt: Trophy,
  Observability: Activity,
  LogViewer: FileText,
  TaskCenter: ClipboardList,
  Performance: BarChart3,
  Sandbox: Terminal,
  QuestBoard: Trophy,
  DomainApps: AppWindow,
  Settings: Settings,
};

function pageGroupLabel(tab: string): string | null {
  return PAGE_REGISTRY_BY_ID.get(tab)?.group || null;
}

interface PageMaturitySummary {
  total: number;
  ready: number;
  watch: number;
  gap: number;
  score: number;
}

interface PageMaturityItem {
  page_id: string;
  score: number;
  status: string;
  usage_paths?: string[];
  domains?: string[];
  playbook_steps?: string[];
  roadmap_items?: string[];
  next_action?: string;
  page?: {
    id?: string;
    title?: string;
    group?: string;
  };
}

interface SidebarCoverage {
  summary: PageMaturitySummary;
  attentionItems: PageMaturityItem[];
}

interface ProjectPortfolioSummary {
  score?: number;
  status?: string;
  projects?: number;
  blocked?: number;
  at_risk?: number;
  watch?: number;
  healthy?: number;
}

interface SidebarWeakestDimension {
  id: string;
  title?: string;
  score?: number;
  failed?: number;
  warning?: number;
}

interface DashboardShellAction {
  id: string;
  title: string;
  detail: string;
  target: CockpitNavigationTarget;
  badge: string;
}

interface DashboardOverviewTile {
  id: string;
  title: string;
  value: string;
  detail: string;
  target: CockpitNavigationTarget;
}

interface ShellSourceAvailability {
  systemMap: boolean;
  tasks: boolean;
  domainApps: boolean;
}

interface PageContextChecklistItem {
  id: string;
  title: string;
  status: 'linked' | 'missing';
  detail: string;
  target: CockpitNavigationTarget;
}

interface SiteClosureRow {
  id: string;
  pageId: string;
  title: string;
  group: string;
  missingItems: string[];
  linkedItems: string[];
  nextAction: string;
  target: CockpitNavigationTarget;
}

type SiteClosureFilter = 'all' | '路径' | '能力域' | '操作清单' | '路线图' | '任务';

interface SiteClosureTemplateAction {
  id: string;
  title: string;
  detail: string;
  target: CockpitNavigationTarget;
}

interface SiteClosureTaskDraft {
  title: string;
  description: string;
  tags: string[];
  checklist: string[];
  copyText: string;
  taskTarget: CockpitNavigationTarget;
  sourceTarget: CockpitNavigationTarget;
}

interface SiteClosureGroupTemplate {
  title: string;
  summary: string;
  anchorTitle: string;
  anchorDetail: string;
  anchorTarget: CockpitNavigationTarget;
}

interface DimensionCoverageRow {
  id: string;
  title: string;
  value: string;
  detail: string;
  risk: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  target: CockpitNavigationTarget;
}

interface ArchitectureGroupRow {
  id: string;
  group: string;
  pageCount: number;
  usagePathCount: number;
  featureDomainCount: number;
  playbookCount: number;
  roadmapCount: number;
  taskCount: number;
  coverageScore: number;
  missingCount: number;
  spotlightTitle: string;
  summary: string;
  nextAction: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  target: CockpitNavigationTarget;
  pathTarget: CockpitNavigationTarget | null;
  pathTitle: string | null;
}

interface PageCapabilityRow {
  id: string;
  title: string;
  group: string;
  purpose: string;
  dimensionsLabel: string;
  primaryPathTitle: string | null;
  usagePathCount: number;
  featureDomainCount: number;
  playbookCount: number;
  roadmapCount: number;
  taskCount: number;
  coverageScore: number;
  missingItems: string[];
  nextAction: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  target: CockpitNavigationTarget;
  pathTarget: CockpitNavigationTarget | null;
  taskTarget: CockpitNavigationTarget;
}

interface PageSprintRow {
  id: string;
  pageId: string;
  title: string;
  group: string;
  purpose: string;
  coverageScore: number;
  missingItems: string[];
  nextAction: string;
  primaryPathTitle: string | null;
  primaryPathTarget: CockpitNavigationTarget | null;
  featureDomainCount: number;
  playbookCount: number;
  roadmapCount: number;
  taskCount: number;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  target: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface UsageModeRow {
  id: string;
  title: string;
  intent: string;
  entryTitle: string;
  preview: string;
  playbookCount: number;
  roadmapCount: number;
  taskCount: number;
  attentionCount: number;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  target: CockpitNavigationTarget;
  taskTarget: CockpitNavigationTarget;
}

interface PriorityRouteRow {
  id: string;
  title: string;
  kind: string;
  summary: string;
  nextAction: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  target: CockpitNavigationTarget;
  secondaryTarget: CockpitNavigationTarget;
}

interface ExecutionLaneRow {
  id: string;
  title: string;
  kind: string;
  summary: string;
  action: string;
  evidence: string;
  command?: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  primaryTarget: CockpitNavigationTarget;
  secondaryTarget: CockpitNavigationTarget;
}

interface DomainOperationRow {
  id: string;
  title: string;
  domainLabel: string;
  runtimeLabel: string;
  authLabel: string;
  freshnessLabel: string;
  securityLabel: string;
  launchUrl: string;
  apiUrl: string;
  startCommand?: string;
  verifyCommand?: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  primaryTarget: CockpitNavigationTarget;
  secondaryTarget: CockpitNavigationTarget;
}

interface PageExecutionRow {
  id: string;
  title: string;
  sourceLabel: string;
  action: string;
  evidence: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  primaryTarget: CockpitNavigationTarget;
  secondaryTarget?: CockpitNavigationTarget | null;
}

interface PageWorkbenchRow {
  id: string;
  title: string;
  laneLabel: string;
  summary: string;
  nextAction: string;
  evidence: string;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  primaryTarget: CockpitNavigationTarget;
  primaryLabel: string;
  secondaryTarget?: CockpitNavigationTarget | null;
  secondaryLabel?: string;
}

interface PageAuditRow {
  id: string;
  pageId: string;
  title: string;
  group: string;
  linkedItems: string[];
  missingItems: string[];
  coverageScore: number;
  statusTone: 'online' | 'degraded' | 'offline';
  statusLabel: string;
  nextAction: string;
  target: CockpitNavigationTarget;
  secondaryTarget: CockpitNavigationTarget;
  secondaryLabel: string;
}

function pageContextStatusClass(status?: string): string {
  if (status === 'ready') return 'ready';
  if (status === 'watch') return 'watch';
  if (status === 'gap') return 'gap';
  return 'unknown';
}

function pageContextChecklistStatusClass(status: 'linked' | 'missing'): string {
  return status === 'linked' ? 'linked' : 'missing';
}

function taskDraftMatchesPage(task: SearchTaskDraft, pageId: string, pageLabel: string): boolean {
  if (task.source?.id === pageId) return true;
  const normalizedPage = normalizeSearchText(pageLabel);
  const taskTitle = normalizeSearchText(task.title || '');
  const taskDescription = normalizeSearchText(task.description || '');
  return Boolean(normalizedPage) && (taskTitle.includes(normalizedPage) || taskDescription.includes(normalizedPage));
}

function siteClosureGroupTemplate(group: string, row: SiteClosureRow | null): SiteClosureGroupTemplate {
  const pageTitle = row?.title || '当前页面';
  if (group === '开发工具') {
    return {
      title: '开发工具打法',
      summary: `${pageTitle} 这类页面优先补执行链，先让日志、任务、性能和沙箱串起来。`,
      anchorTitle: '回任务与验证链',
      anchorDetail: '从任务中心或沙箱确认这页有没有真实执行场景和验证动作。',
      anchorTarget: { tab: 'TaskCenter', taskQuery: row?.title || pageTitle },
    };
  }
  if (group === '系统治理') {
    return {
      title: '系统治理打法',
      summary: `${pageTitle} 这类页面优先补治理归属，先接告警、健康、债务或战略闭环。`,
      anchorTitle: '回治理总面核归属',
      anchorDetail: '从 C2G、告警或 L4 健康确认这页应该归哪条治理链。',
      anchorTarget: { tab: 'C2G' },
    };
  }
  if (group === '运行大盘') {
    return {
      title: '运行大盘打法',
      summary: `${pageTitle} 这类页面优先补运行视角，先接概览、拓扑、算力和网格的巡检链。`,
      anchorTitle: '回概览中心核运行视角',
      anchorDetail: '先从概览中心看这页在运行巡检链上处在哪一环。',
      anchorTarget: { tab: 'Overview' },
    };
  }
  if (group === '智能与知识') {
    return {
      title: '智能与知识打法',
      summary: `${pageTitle} 这类页面优先补知识和执行链，先接研究、知识、协议或工作流。`,
      anchorTitle: '回知识执行链',
      anchorDetail: '从研究中枢或知识中枢确认这页在智能执行链里的位置。',
      anchorTarget: { tab: 'Knowledge' },
    };
  }
  if (group === '领域应用') {
    return {
      title: '领域应用打法',
      summary: `${pageTitle} 这类页面优先补挂载关系，先确认领域入口、运行态和任务承接。`,
      anchorTitle: '回应用中心核挂载',
      anchorDetail: '先去应用中心确认这页所在领域的入口、状态和安全门。',
      anchorTarget: { tab: 'DomainApps', taskQuery: row?.title || pageTitle },
    };
  }
  if (group === '入口') {
    return {
      title: '入口页面打法',
      summary: `${pageTitle} 这类页面优先补导航和入口职责，先保证用户知道为什么会来到这里。`,
      anchorTitle: '回站内导览核入口职责',
      anchorDetail: '从站内导览确认这页在整站里的入口角色和后续跳转。',
      anchorTarget: { tab: 'Guide' },
    };
  }
  return {
    title: '通用补位打法',
    summary: `${pageTitle} 这类页面先回系统地图确认归属，再把缺口转成任务。`,
    anchorTitle: '回系统地图核落点',
    anchorDetail: '先确认这页该属于哪条能力线、哪条路径和哪类任务。',
    anchorTarget: { tab: 'SystemMap', pageId: row?.pageId || null },
  };
}

function domainAppActionScore(app: SearchDomainApp): number {
  let score = 0;
  if (app.security_summary?.posture && app.security_summary.posture !== 'passed') score += 4;
  if (app.runtime?.status === 'stopped') score += 3;
  if (app.risk_level === 'high') score += 3;
  if (app.freshness?.status && app.freshness.status !== 'built' && app.freshness.status !== 'ssot') score += 1;
  return score;
}

function DashboardViewFallback({ label }: { label: string }) {
  return (
    <div className="loading-state dashboard-view-fallback" role="status" aria-label={`${label} 加载中`}>
      <div className="spinner" />
      <p>{label} 加载中...</p>
    </div>
  );
}

const SEARCH_ALIAS_GROUPS = [
  ['运行态势', '运行探针', '运行健康', '运行总面', '概览中心', 'overview'],
  ['日常体检', '体检', '巡检', '健康检查', 'daily ops', 'daily-health-check'],
  ['页面能力', '页面成熟度', '页面补位', '页面', 'page maturity'],
  ['能力域', '功能域', '能力地图', 'feature domain'],
  ['验证补证', '验证证据', '补证', '验证', 'verification'],
  ['家庭', '家庭生活', '家庭驾驶舱', 'family', 'family-hub'],
  ['协议', '元模型', 'model-driven', 'ecos', 'workflow', '协议工作台'],
  ['研究', '发布', 'publication', 'dossier', '研究中枢'],
  ['任务', '草稿', '待办', '行动项', 'task'],
  ['路线图', 'roadmap', '阶段', '车道'],
  ['入口', '导航', '页面分组', '功能架构'],
] as const;

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()\-_/.,:;]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (!normalized) return [];
  return [...new Set([normalized, ...normalized.split(' ').filter(Boolean)])];
}

function expandSearchAliases(values: string[]): string[] {
  const seed = new Set(values.flatMap((value) => tokenizeSearchText(value)));
  if (seed.size === 0) return [];
  for (const aliases of SEARCH_ALIAS_GROUPS) {
    const matched = aliases.some((alias) => {
      const normalizedAlias = normalizeSearchText(alias);
      return [...seed].some((term) => term.includes(normalizedAlias) || normalizedAlias.includes(term));
    });
    if (matched) {
      aliases.forEach((alias) => {
        tokenizeSearchText(alias).forEach((token) => seed.add(token));
      });
    }
  }
  return [...seed];
}

function buildSearchIndex(target: SearchTarget): string[] {
  return expandSearchAliases([target.label, target.group, target.tab, ...target.keywords]);
}

function scoreSearchTarget(target: SearchTarget, query: string, queryTerms: string[]): number {
  const normalizedQuery = normalizeSearchText(query);
  const label = normalizeSearchText(target.label);
  const group = normalizeSearchText(target.group);
  const tab = normalizeSearchText(target.tab);
  const index = buildSearchIndex(target);

  let score = 0;
  if (label.includes(normalizedQuery)) score += 12;
  if (group.includes(normalizedQuery)) score += 6;
  if (tab.includes(normalizedQuery)) score += 4;

  queryTerms.forEach((term) => {
    if (!term) return;
    if (label.includes(term)) score += 8;
    else if (group.includes(term)) score += 4;
    else if (index.some((entry) => entry.includes(term) || term.includes(entry))) score += 2;
  });

  return score;
}

interface SidebarProjectPortfolio {
  summary: ProjectPortfolioSummary;
  priorityProjects: SearchPriorityProject[];
  weakestDimensions: SidebarWeakestDimension[];
}

function maturityStatusText(status: string): string {
  if (status === 'ready') return '就绪';
  if (status === 'watch') return '观察';
  if (status === 'gap') return '缺口';
  return '未知';
}

function portfolioStatusText(status?: string): string {
  if (status === 'blocked') return '阻塞';
  if (status === 'at_risk') return '风险';
  if (status === 'watch') return '观察';
  if (status === 'healthy') return '健康';
  return '未知';
}

function usagePathPreviewText(path: SearchUsagePath): string {
  const pageTitles = (path.pages || [])
    .map((page) => page.title || page.id || '')
    .filter(Boolean)
    .slice(0, 3);
  if (pageTitles.length > 0) return pageTitles.join(' -> ');
  const steps = (path.steps || []).filter(Boolean).slice(0, 3);
  if (steps.length > 0) return steps.join(' -> ');
  return '查看路径步骤';
}

function SidebarCoveragePanel({
  coverage,
  onOpenTarget,
}: {
  coverage: SidebarCoverage | null;
  onOpenTarget: (target: CockpitNavigationTarget) => void;
}) {
  if (!coverage) return null;

  const { summary, attentionItems } = coverage;

  return (
    <section className="sidebar-coverage" role="region" aria-label="页面覆盖状态">
      <button className="sidebar-coverage-score" onClick={() => onOpenTarget({ tab: 'SystemMap' })}>
        <span>页面成熟度</span>
        <strong>{summary.score}%</strong>
      </button>
      <div className="sidebar-coverage-counts">
        <span><strong>{summary.ready}</strong> 就绪</span>
        <span><strong>{summary.watch}</strong> 观察</span>
        <span><strong>{summary.gap}</strong> 缺口</span>
      </div>
      <div className="sidebar-coverage-list">
        {attentionItems.slice(0, 3).map((item) => {
          const title = item.page?.title || item.page_id;
          return (
            <button
              key={item.page_id}
              className={`sidebar-coverage-item ${item.status}`}
              aria-label={`打开成熟度缺口页面 ${title}`}
              title={item.next_action}
              onClick={() => onOpenTarget({ tab: 'SystemMap', pageId: item.page_id })}
            >
              <span>{title}</span>
              <small>{maturityStatusText(item.status)} · {item.score}%</small>
            </button>
          );
        })}
        {attentionItems.length === 0 && (
          <div className="sidebar-coverage-complete">
            <CheckCircle size={13} />
            <span>页面层已覆盖</span>
          </div>
        )}
      </div>
    </section>
  );
}

function SidebarProjectPortfolioPanel({
  portfolio,
  onOpenProject,
  onOpenSystemMap,
  onOpenDimension,
}: {
  portfolio: SidebarProjectPortfolio | null;
  onOpenProject: (projectId: string) => void;
  onOpenSystemMap: () => void;
  onOpenDimension: (dimensionId: string) => void;
}) {
  if (!portfolio) return null;

  const { summary, priorityProjects, weakestDimensions } = portfolio;

  return (
    <section className="sidebar-projects" role="region" aria-label="项目覆盖状态">
      <button className="sidebar-projects-score" onClick={onOpenSystemMap}>
        <span>项目覆盖</span>
        <strong>{summary.score ?? 0}%</strong>
      </button>
      <div className="sidebar-projects-counts">
        <span><strong>{summary.blocked ?? 0}</strong> 阻塞</span>
        <span><strong>{summary.at_risk ?? 0}</strong> 风险</span>
        <span><strong>{summary.watch ?? 0}</strong> 观察</span>
        <span><strong>{summary.healthy ?? 0}</strong> 健康</span>
      </div>
      <div className="sidebar-projects-list">
        {priorityProjects.slice(0, 3).map((project) => (
          <button
            key={project.id}
            className={`sidebar-project-item ${project.status || 'unknown'}`}
            aria-label={`打开项目 ${project.id}`}
            title={project.next_action || project.primary_gap}
            onClick={() => onOpenProject(project.id)}
          >
            <span>{project.id}</span>
            <small>{portfolioStatusText(project.status)} · {project.score ?? 0}%</small>
          </button>
        ))}
      </div>
      <div className="sidebar-project-dimensions">
        {weakestDimensions.slice(0, 2).map((dimension) => (
          <button key={dimension.id} onClick={() => onOpenDimension(dimension.id)}>
            {dimension.title || dimension.id} {dimension.score ?? 0}%
          </button>
        ))}
      </div>
    </section>
  );
}

function SidebarUsagePathsPanel({
  paths,
  totalCount,
  activeGroupLabel,
  onOpenTarget,
}: {
  paths: SearchUsagePath[];
  totalCount: number;
  activeGroupLabel: string | null;
  onOpenTarget: (target: CockpitNavigationTarget) => void;
}) {
  if (paths.length === 0) return null;

  return (
    <section className="sidebar-usage-paths" role="region" aria-label="使用路径入口">
      <div className="sidebar-usage-paths-header">
        <strong>{activeGroupLabel ? '当前分区路径' : '使用路径'}</strong>
        <span>{activeGroupLabel ? `${activeGroupLabel} · ${paths.length}/${totalCount}` : `${paths.length} 条`}</span>
      </div>
      <div className="sidebar-usage-paths-list">
        {paths.slice(0, 3).map((path) => (
          <button
            key={path.id}
            className="sidebar-usage-path-item"
            aria-label={`打开使用路径 ${path.title || path.id}`}
            title={path.intent || path.title || path.id}
            onClick={() => onOpenTarget({ tab: 'SystemMap', usagePathId: path.id })}
          >
            <div>
              <span>{path.title || path.id}</span>
              <small>{path.intent || usagePathPreviewText(path)}</small>
            </div>
            <em>{activeGroupLabel || usagePathPreviewText(path)}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

const PAGE_SEARCH_KEYWORDS: Record<string, string[]> = {
  Home: ['home', '健康', '告警', '任务', '指标'],
  Guide: ['guide', '导览', '导航', '使用方法', '功能架构', '从哪开始'],
  SystemMap: ['map', '架构', '项目', '能力', '路线图', '功能缺口', 'cockpit'],
  DomainApps: ['domain', '家庭', 'OPC', 'family-hub', '领域应用'],
  Overview: ['overview', '服务', '集群', '运行'],
  McpMesh: ['mcp', 'bos', 'agora', '路由', '通信'],
  Topology: ['topology', '拓扑', '服务关系'],
  Compute: ['compute', 'aetherforge', '模型', '网关', '成本'],
  Research: ['research', '研究', 'publish', 'timeline', 'dossier', 'minerva'],
  Knowledge: ['knowledge', 'gbrain', 'kos', '检索', '记忆'],
  GBrainAdmin: ['gbrain', 'admin', '智能体', '凭证', 'token', '校准', '访问日志'],
  Engines: ['engine', 'kairon', 'gbrain', '引擎'],
  Assets: ['assets', 'ecos', '技能', '管线', 'workflow'],
  Protocol: ['protocol', 'ecos', 'model-driven', 'mof', 'lifecycle', '元模型'],
  Workflows: ['workflow', 'metaos', '编排', 'agent'],
  C2G: ['c2g', '战略', '治理', 'omo', 'task'],
  AlertCenter: ['alert', '告警', '规则'],
  L4Health: ['l4', '域', '健康', 'l4-kernel'],
  Debt: ['debt', '债务', '质量', 'omo-debt'],
  Observability: ['observability', '日志', '链路', 'langfuse'],
  LogViewer: ['log', '日志', 'debug'],
  TaskCenter: ['task', '任务', '执行'],
  Performance: ['performance', 'cpu', '内存', '网络'],
  Sandbox: ['sandbox', '终端', '执行'],
  QuestBoard: ['quest', '积分', '家庭', 'family'],
  Settings: ['settings', '配置', 'token', '端口'],
};

const searchTargets: SearchTarget[] = COCKPIT_PAGE_REGISTRY.map((page) => ({
  id: `page-${page.id.toLowerCase()}`,
  tab: page.id,
  label: page.title,
  group: page.group,
  keywords: [...(PAGE_SEARCH_KEYWORDS[page.id] || []), ...page.dimensions],
}));

const GROUP_DESCRIPTIONS: Record<string, string> = {
  入口: '从首页、导览和系统地图进入整站，先确定当前关注面。',
  运行大盘: '围绕概览、拓扑、算力和网格，快速完成运行巡检。',
  智能与知识: '研究、知识、引擎、协议和工作流共用一条智能执行链。',
  系统治理: '告警、L4 健康、债务和 C2G 统一回治理闭环。',
  开发工具: '日志、任务、性能和沙箱是一条开发排障链。',
  领域应用: '应用中心和 Quest 类页面统一回领域挂载和家庭体验。',
  系统配置: '底层设置负责路由、权限和阈值的最后收口。',
};

const PAGE_WORKBENCH_IDS = new Set([
  'Home',
  'Guide',
  'SystemMap',
  'Overview',
  'McpMesh',
  'Topology',
  'Compute',
  'Research',
  'Knowledge',
  'GBrainAdmin',
  'Engines',
  'Assets',
  'Protocol',
  'Workflows',
  'Sandbox',
  'C2G',
  'AlertCenter',
  'L4Health',
  'Debt',
  'Observability',
  'LogViewer',
  'TaskCenter',
  'Performance',
  'QuestBoard',
  'DomainApps',
  'Settings',
]);

const PAGE_FOCUS_HANDOFF_IDS = new Set([
  'Home',
  'Guide',
  'SystemMap',
  'Overview',
  'McpMesh',
  'Topology',
  'Compute',
  'Research',
  'Knowledge',
  'GBrainAdmin',
  'Engines',
  'Assets',
  'Workflows',
  'AlertCenter',
  'TaskCenter',
  'Debt',
  'DomainApps',
  'Protocol',
  'Observability',
  'LogViewer',
  'Performance',
  'Sandbox',
  'L4Health',
  'C2G',
  'QuestBoard',
  'Settings',
]);

function SidebarGroupEntryPanel({
  groupLabel,
  description,
  pages,
  activeTab,
  primaryUsagePath,
  onNavigate,
  onOpenTarget,
}: {
  groupLabel: string | null;
  description: string;
  pages: SearchTarget[];
  activeTab: string;
  primaryUsagePath: SearchUsagePath | null;
  onNavigate: (tab: string) => void;
  onOpenTarget: (target: CockpitNavigationTarget) => void;
}) {
  if (!groupLabel || pages.length === 0) return null;

  return (
    <section className="sidebar-group-entry" role="region" aria-label="当前分区入口">
      <div className="sidebar-group-entry-header">
        <strong>{groupLabel}</strong>
        <span>{pages.length} 页</span>
      </div>
      <p className="sidebar-group-entry-copy">{description}</p>
      <div className="sidebar-group-entry-pages">
        {pages.slice(0, 4).map((page) => (
          <button
            key={page.id}
            type="button"
            className={`sidebar-group-entry-page ${page.tab === activeTab ? 'active' : ''}`}
            aria-label={`打开分区页面 ${page.label}`}
            onClick={() => onNavigate(page.tab)}
          >
            <span>{page.label}</span>
            <small>{page.tab === activeTab ? '当前页' : page.tab}</small>
          </button>
        ))}
      </div>
      {primaryUsagePath && (
        <button
          type="button"
          className="sidebar-group-entry-path"
          aria-label={`打开分区路径 ${primaryUsagePath.title || primaryUsagePath.id}`}
          onClick={() => onOpenTarget({ tab: 'SystemMap', usagePathId: primaryUsagePath.id })}
        >
          <strong>{primaryUsagePath.title || primaryUsagePath.id}</strong>
          <small>{usagePathPreviewText(primaryUsagePath)}</small>
        </button>
      )}
    </section>
  );
}

export default function Dashboard() {
  const initialNavigationTarget = typeof window === 'undefined' ? null : parseNavigationHash(window.location.hash);
  const [activeTab, setActiveTabState] = useState(initialNavigationTarget?.tab || 'Home');
  const [pageRefreshToken, setPageRefreshToken] = useState(0);
  const [shellDataWarnings, setShellDataWarnings] = useState<string[]>([]);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dynamicSearchTargets, setDynamicSearchTargets] = useState<SearchTarget[]>([]);
  const [knowledgeSearchTargets, setKnowledgeSearchTargets] = useState<SearchTarget[]>([]);
  const [focusedProjectId, setFocusedProjectId] = useState<string | null>(null);
  const [focusedUsagePathId, setFocusedUsagePathId] = useState<string | null>(null);
  const [focusedGapId, setFocusedGapId] = useState<string | null>(null);
  const [focusedCoverageDimensionId, setFocusedCoverageDimensionId] = useState<string | null>(null);
  const [focusedPageId, setFocusedPageId] = useState<string | null>(null);
  const [focusedFeatureDomainId, setFocusedFeatureDomainId] = useState<string | null>(null);
  const [taskSearchSeed, setTaskSearchSeed] = useState('');
  const [taskDraftKey, setTaskDraftKey] = useState<string | null>(initialNavigationTarget?.draftKey || null);
  const [pageSprintFocusId, setPageSprintFocusId] = useState('');
  const [alertTab, setAlertTab] = useState<'active' | 'history' | 'rules' | null>(initialNavigationTarget?.alertTab || null);
  const [sidebarCoverage, setSidebarCoverage] = useState<SidebarCoverage | null>(null);
  const [sidebarProjectPortfolio, setSidebarProjectPortfolio] = useState<SidebarProjectPortfolio | null>(null);
  const [sidebarUsagePaths, setSidebarUsagePaths] = useState<SearchUsagePath[]>([]);
  const [shellTaskDrafts, setShellTaskDrafts] = useState<SearchTaskDraft[]>([]);
  const [shellDomainApps, setShellDomainApps] = useState<SearchDomainAppsPayload | null>(null);
  const [shellSourceAvailability, setShellSourceAvailability] = useState<ShellSourceAvailability>({
    systemMap: false,
    tasks: false,
    domainApps: false,
  });
  const [cockpitPages, setCockpitPages] = useState<SearchCockpitPage[]>([]);
  const [pageMaturityItems, setPageMaturityItems] = useState<PageMaturityItem[]>([]);
  const [featureDomains, setFeatureDomains] = useState<SearchFeatureDomain[]>([]);
  const [playbooks, setPlaybooks] = useState<SearchPlaybook[]>([]);
  const [roadmapItems, setRoadmapItems] = useState<SearchRoadmapItem[]>([]);
  const [capabilityGaps, setCapabilityGaps] = useState<SearchCapabilityGap[]>([]);
  const [siteClosureFilter, setSiteClosureFilter] = useState<SiteClosureFilter>('all');
  const [siteClosureExpanded, setSiteClosureExpanded] = useState(false);
  const [pageAuditExpanded, setPageAuditExpanded] = useState(false);
  const [closureDraftNotice, setClosureDraftNotice] = useState<string | null>(null);
  const [pageSprintDraftNotice, setPageSprintDraftNotice] = useState<string | null>(null);
  const [snapshotExportState, setSnapshotExportState] = useState<'idle' | 'exporting' | 'success' | 'error'>('idle');
  const globalSearchInputRef = useRef<HTMLInputElement>(null);
  const taskCenterIncomingDraft = useMemo(() => readTaskCenterDraft(taskDraftKey), [taskDraftKey]);

  const searchResults = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return [];
    const queryTerms = expandSearchAliases([query]);
    return [...knowledgeSearchTargets, ...dynamicSearchTargets, ...searchTargets]
      .map((target) => ({
        target,
        score: scoreSearchTarget(target, query, queryTerms),
      }))
      .filter((item) => item.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score;
        return left.target.label.localeCompare(right.target.label, 'zh-CN');
      })
      .map((item) => item.target)
      .slice(0, 8);
  }, [dynamicSearchTargets, knowledgeSearchTargets, searchQuery]);

  const shellActions = useMemo(() => {
    const items: DashboardShellAction[] = [];
    const weakestPage = sidebarCoverage?.attentionItems?.[0];
    if (weakestPage) {
      const pageId = weakestPage.page?.id || weakestPage.page_id;
      items.push({
        id: 'shell-page-gap',
        title: `页面补位：${weakestPage.page?.title || pageId}`,
        detail: weakestPage.next_action || '继续把页面接回使用路径、能力域和入口。',
        target: { tab: 'SystemMap', pageId },
        badge: `页面 ${weakestPage.status || 'gap'}`,
      });
    }

    const priorityProject = sidebarProjectPortfolio?.priorityProjects?.[0];
    if (priorityProject) {
      items.push({
        id: 'shell-project-gap',
        title: `项目修复：${priorityProject.id}`,
        detail: priorityProject.next_action || priorityProject.primary_gap || '回系统地图继续处理项目组合阻塞。',
        target: { tab: 'SystemMap', projectId: priorityProject.id },
        badge: `项目 ${priorityProject.status || 'watch'}`,
      });
    }

    const attentionDomainApp = (shellDomainApps?.items || [])
      .slice()
      .sort((left, right) => domainAppActionScore(right) - domainAppActionScore(left))[0];
    if (attentionDomainApp) {
      items.push({
        id: 'shell-domain-app',
        title: `领域挂载：${attentionDomainApp.name || attentionDomainApp.id}`,
        detail: attentionDomainApp.description
          || attentionDomainApp.commands?.start
          || '回应用中心确认运行态、安全门和入口状态。',
        target: { tab: 'DomainApps', taskQuery: attentionDomainApp.id },
        badge: `领域 ${attentionDomainApp.security_summary?.posture || attentionDomainApp.runtime?.status || 'watch'}`,
      });
    }

    const focusTaskDraft = shellTaskDrafts[0];
    if (focusTaskDraft) {
      items.push({
        id: 'shell-task-draft',
        title: `任务承接：${focusTaskDraft.title || focusTaskDraft.id}`,
        detail: focusTaskDraft.description || focusTaskDraft.source?.title || '回任务中心继续承接草稿。',
        target: { tab: 'TaskCenter', taskQuery: focusTaskDraft.source?.id || focusTaskDraft.title || focusTaskDraft.id },
        badge: `任务 ${focusTaskDraft.source?.type || 'draft'}`,
      });
    }

    return items.slice(0, 4);
  }, [shellDomainApps, shellTaskDrafts, sidebarCoverage, sidebarProjectPortfolio]);

  const gapHighlights = useMemo(() => {
    const items: DashboardShellAction[] = [];
    const weakestPage = sidebarCoverage?.attentionItems?.[0];
    if (weakestPage) {
      items.push({
        id: 'gap-page',
        title: `页面缺口：${weakestPage.page?.title || weakestPage.page_id}`,
        detail: weakestPage.next_action || '继续补页面能力。',
        target: { tab: 'SystemMap', pageId: weakestPage.page_id },
        badge: `页面 ${weakestPage.status || 'gap'}`,
      });
    }
    const priorityProject = sidebarProjectPortfolio?.priorityProjects?.[0];
    if (priorityProject) {
      items.push({
        id: 'gap-project',
        title: `项目修复：${priorityProject.id}`,
        detail: priorityProject.next_action || priorityProject.primary_gap || '继续补项目阻塞。',
        target: { tab: 'SystemMap', projectId: priorityProject.id },
        badge: `项目 ${priorityProject.status || 'watch'}`,
      });
    }
    const domainAttention = (shellDomainApps?.items || [])
      .slice()
      .sort((left, right) => domainAppActionScore(right) - domainAppActionScore(left))[0];
    if (domainAttention) {
      items.push({
        id: 'gap-domain',
        title: `领域关注：${domainAttention.name || domainAttention.id}`,
        detail: domainAttention.description || '继续处理领域挂载风险。',
        target: { tab: 'DomainApps', taskQuery: domainAttention.id },
        badge: `领域 ${domainAttention.security_summary?.posture || domainAttention.runtime?.status || 'watch'}`,
      });
    }
    const draftAttention = shellTaskDrafts[0];
    if (draftAttention) {
      items.push({
        id: 'gap-task',
        title: `任务承接：${draftAttention.title || draftAttention.id}`,
        detail: draftAttention.description || draftAttention.source?.title || '继续承接当前草稿。',
        target: { tab: 'TaskCenter', taskQuery: draftAttention.source?.id || draftAttention.title || draftAttention.id },
        badge: `任务 ${draftAttention.source?.type || 'draft'}`,
      });
    }
    return items;
  }, [shellDomainApps, shellTaskDrafts, sidebarCoverage, sidebarProjectPortfolio]);

  const pageGroupByTab = useMemo(() => (
    Object.fromEntries(searchTargets.map((target) => [target.tab, target.group]))
  ), []);

  const activeGroupLabel = pageGroupByTab[activeTab] || null;

  const contextualUsagePaths = useMemo(() => {
    const priorityForPath = (path: SearchUsagePath) => {
      const pageIds = (path.pages || []).map((page) => page.id).filter(Boolean) as string[];
      if (pageIds.includes(activeTab)) return 4;
      if (activeGroupLabel && pageIds.some((pageId) => pageGroupByTab[pageId] === activeGroupLabel)) return 3;
      return 0;
    };

    return [...sidebarUsagePaths]
      .sort((left, right) => {
        const scoreDelta = priorityForPath(right) - priorityForPath(left);
        if (scoreDelta !== 0) return scoreDelta;
        return (left.title || left.id).localeCompare((right.title || right.id), 'zh-CN');
      })
      .slice(0, 3);
  }, [activeGroupLabel, activeTab, pageGroupByTab, sidebarUsagePaths]);
  const currentPagePrimaryPath = contextualUsagePaths[0] || null;

  const activeGroupPages = useMemo(() => (
    searchTargets.filter((target) => target.group === activeGroupLabel)
  ), [activeGroupLabel]);

  const activeGroupDescription = activeGroupLabel ? (GROUP_DESCRIPTIONS[activeGroupLabel] || '从当前分区的页面链开始推进。') : '';
  const currentPageTarget = useMemo(
    () => searchTargets.find((target) => target.tab === activeTab) || null,
    [activeTab],
  );
  const currentCockpitPage = useMemo(
    () => cockpitPages.find((page) => page.id === activeTab) || PAGE_REGISTRY_BY_ID.get(activeTab) || null,
    [activeTab, cockpitPages],
  );
  const currentPageMaturity = useMemo(
    () => pageMaturityItems.find((item) => (item.page?.id || item.page_id) === activeTab) || null,
    [activeTab, pageMaturityItems],
  );
  const currentPageFeatureDomains = useMemo(
    () => featureDomains.filter((domain) => domain.cockpit_page === activeTab || domain.providers?.includes(activeTab)).slice(0, 3),
    [activeTab, featureDomains],
  );
  const currentPagePlaybooks = useMemo(
    () => playbooks.filter((playbook) => (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === activeTab)).slice(0, 2),
    [activeTab, playbooks],
  );
  const currentPageRoadmapItems = useMemo(
    () => roadmapItems.filter((item) => item.cockpit_page === activeTab).slice(0, 2),
    [activeTab, roadmapItems],
  );
  const currentPageDraft = useMemo(() => {
    const pageLabel = currentCockpitPage?.title || currentPageTarget?.label || activeTab;
    return shellTaskDrafts.find((task) => taskDraftMatchesPage(task, activeTab, pageLabel)) || null;
  }, [activeTab, currentCockpitPage, currentPageTarget, shellTaskDrafts]);
  const currentPageExecutionRows = useMemo<PageExecutionRow[]>(() => {
    const pageLabel = currentCockpitPage?.title || currentPageTarget?.label || activeTab;
    const rows: PageExecutionRow[] = [];

    currentPagePlaybooks.forEach((playbook) => {
      const matchedSteps = (playbook.steps || []).filter((step) => (step.page_id || step.page?.id) === activeTab);
      if (matchedSteps.length === 0) return;
      matchedSteps.slice(0, 2).forEach((step, index) => {
        rows.push({
          id: `page-playbook-${playbook.id}-${index}`,
          title: playbook.title || playbook.id,
          sourceLabel: `操作清单 · ${playbook.frequency || 'on-demand'}`,
          action: step.action || `从 ${playbook.title || playbook.id} 承接当前页面动作。`,
          evidence: step.evidence || step.done_when || playbook.goal || '先补当前步骤的验收证据。',
          statusTone: playbook.risk === 'low' ? 'online' : playbook.risk === 'medium' ? 'degraded' : 'offline',
          statusLabel: playbook.risk === 'low' ? '可执行' : playbook.risk === 'medium' ? '需关注' : '高风险',
          primaryTarget: currentPagePrimaryPath
            ? { tab: 'SystemMap', usagePathId: currentPagePrimaryPath.id }
            : { tab: 'SystemMap', pageId: activeTab },
          secondaryTarget: { tab: 'TaskCenter', taskQuery: playbook.id },
        });
      });
    });

    currentPageRoadmapItems.forEach((item) => {
      rows.push({
        id: `page-roadmap-${item.id}`,
        title: item.title || item.id,
        sourceLabel: `路线图 · ${item.priority || item.stage || 'unknown'}`,
        action: item.actions?.[0] || item.problem || `继续推进 ${item.title || item.id}。`,
        evidence: item.acceptance?.[0] || item.status || '先补路线图验收条件。',
        statusTone: item.stage === 'now' ? 'offline' : item.stage === 'next' ? 'degraded' : 'online',
        statusLabel: item.stage === 'now' ? '现在修' : item.stage === 'next' ? '下一步' : '观察',
        primaryTarget: { tab: 'SystemMap', pageId: activeTab },
        secondaryTarget: { tab: 'TaskCenter', taskQuery: item.id },
      });
    });

    currentPageFeatureDomains.forEach((domain) => {
      rows.push({
        id: `page-feature-${domain.id}`,
        title: domain.title || domain.id,
        sourceLabel: `能力域 · ${domain.coverage || 'unknown'}`,
        action: `确认 ${pageLabel} 在 ${domain.title || domain.id} 这条能力线里承接了哪些动作。`,
        evidence: `${(domain.providers || []).length} 个 provider · ${(domain.capability_items || []).length} 项能力`,
        statusTone: domain.coverage === 'native' ? 'online' : domain.coverage === 'linked' ? 'degraded' : 'offline',
        statusLabel: domain.coverage === 'native' ? '原生承接' : domain.coverage === 'linked' ? '外链承接' : '待确认',
        primaryTarget: { tab: 'SystemMap', featureDomainId: domain.id },
      });
    });

    if (currentPageDraft) {
      rows.push({
        id: `page-task-${currentPageDraft.id}`,
        title: currentPageDraft.title || currentPageDraft.id,
        sourceLabel: `任务草稿 · ${currentPageDraft.draft?.kind || 'draft'}`,
        action: currentPageDraft.description || `承接 ${pageLabel} 的当前补位动作。`,
        evidence: currentPageDraft.source?.title || currentPageDraft.source?.type || '已生成任务草稿。',
        statusTone: 'degraded',
        statusLabel: '待承接',
        primaryTarget: {
          tab: 'TaskCenter',
          taskQuery: currentPageDraft.source?.id || currentPageDraft.title || currentPageDraft.id,
        },
      });
    }

    if (currentPageMaturity) {
      rows.push({
        id: `page-maturity-${currentPageMaturity.page_id}`,
        title: pageLabel,
        sourceLabel: `页面成熟度 · ${maturityStatusText(currentPageMaturity.status)}`,
        action: currentPageMaturity.next_action || `继续补齐 ${pageLabel} 的页面成熟度。`,
        evidence: `${currentPageMaturity.score} 分 · ${maturityStatusText(currentPageMaturity.status)}`,
        statusTone: currentPageMaturity.status === 'ready' ? 'online' : currentPageMaturity.status === 'watch' ? 'degraded' : 'offline',
        statusLabel: currentPageMaturity.status === 'ready' ? '可执行' : currentPageMaturity.status === 'watch' ? '需关注' : '待补位',
        primaryTarget: { tab: 'SystemMap', pageId: activeTab },
        secondaryTarget: {
          tab: 'TaskCenter',
          taskQuery: currentPageDraft?.source?.id || currentPageDraft?.title || pageLabel,
        },
      });
    }

    return rows.slice(0, 6);
  }, [
    activeTab,
    currentCockpitPage,
    currentPageDraft,
    currentPageFeatureDomains,
    currentPageMaturity,
    currentPagePlaybooks,
    currentPagePrimaryPath,
    currentPageRoadmapItems,
    currentPageTarget,
  ]);
  const currentPageSignalItems = useMemo(() => {
    const items: Array<{ id: string; label: string; value: string }> = [];
    currentPageFeatureDomains.forEach((domain) => {
      items.push({ id: `feature-${domain.id}`, label: '能力域', value: domain.title || domain.id });
    });
    currentPagePlaybooks.forEach((playbook) => {
      items.push({ id: `playbook-${playbook.id}`, label: '操作清单', value: playbook.title || playbook.id });
    });
    currentPageRoadmapItems.forEach((item) => {
      items.push({ id: `roadmap-${item.id}`, label: '路线图', value: item.title || item.id });
    });
    if (items.every((item) => item.label !== '能力域')) {
      (currentPageMaturity?.domains || []).slice(0, 3).forEach((domain) => {
        items.push({ id: `maturity-domain-${domain}`, label: '能力域', value: domain });
      });
    }
    return items.slice(0, 5);
  }, [currentPageFeatureDomains, currentPageMaturity, currentPagePlaybooks, currentPageRoadmapItems]);
  const currentPageChecklist = useMemo<PageContextChecklistItem[]>(() => {
    const pageLabel = currentCockpitPage?.title || currentPageTarget?.label || activeTab;
    const maturityDomains = currentPageMaturity?.domains || [];
    const maturityUsagePaths = currentPageMaturity?.usage_paths || [];
    const maturityPlaybooks = currentPageMaturity?.playbook_steps || [];
    const maturityRoadmaps = currentPageMaturity?.roadmap_items || [];
    const featureDomainsLinked = currentPageFeatureDomains.length > 0 || maturityDomains.length > 0;
    const playbooksLinked = currentPagePlaybooks.length > 0 || maturityPlaybooks.length > 0;
    const roadmapsLinked = currentPageRoadmapItems.length > 0 || maturityRoadmaps.length > 0;
    const primaryMaturityPath = maturityUsagePaths[0];
    return [
      {
        id: 'path',
        title: '使用路径',
        status: currentPagePrimaryPath || maturityUsagePaths.length > 0 ? 'linked' : 'missing',
        detail: currentPagePrimaryPath
          ? `已挂到 ${currentPagePrimaryPath.title || currentPagePrimaryPath.id}`
          : primaryMaturityPath
            ? `页面成熟度记录已挂到 ${primaryMaturityPath}`
          : `${pageLabel} 还没进入明确的使用路径。`,
        target: currentPagePrimaryPath
          ? { tab: 'SystemMap', usagePathId: currentPagePrimaryPath.id }
          : { tab: 'SystemMap', pageId: activeTab },
      },
      {
        id: 'feature-domain',
        title: '能力域',
        status: featureDomainsLinked ? 'linked' : 'missing',
        detail: currentPageFeatureDomains.length > 0
          ? `已接到 ${currentPageFeatureDomains.map((domain) => domain.title || domain.id).join(' / ')}`
          : maturityDomains.length > 0
            ? `页面成熟度记录已接到 ${maturityDomains.join(' / ')}`
          : `${pageLabel} 还缺能力域映射。`,
        target: currentPageFeatureDomains[0]
          ? { tab: 'SystemMap', featureDomainId: currentPageFeatureDomains[0].id }
          : { tab: 'SystemMap', pageId: activeTab },
      },
      {
        id: 'playbook',
        title: '操作清单',
        status: playbooksLinked ? 'linked' : 'missing',
        detail: currentPagePlaybooks.length > 0
          ? `已进入 ${currentPagePlaybooks.map((playbook) => playbook.title || playbook.id).join(' / ')}`
          : maturityPlaybooks.length > 0
            ? `页面成熟度记录已接入 ${maturityPlaybooks.length} 个步骤`
          : `${pageLabel} 还没挂进操作清单。`,
        target: currentPagePrimaryPath
          ? { tab: 'SystemMap', usagePathId: currentPagePrimaryPath.id }
          : { tab: 'SystemMap', pageId: activeTab },
      },
      {
        id: 'roadmap',
        title: '路线图',
        status: roadmapsLinked ? 'linked' : 'missing',
        detail: currentPageRoadmapItems.length > 0
          ? `已接到 ${currentPageRoadmapItems.map((item) => item.title || item.id).join(' / ')}`
          : maturityRoadmaps.length > 0
            ? `页面成熟度记录已接入 ${maturityRoadmaps.length} 个条目`
          : `${pageLabel} 还没进入路线图条目。`,
        target: { tab: 'SystemMap', pageId: activeTab },
      },
      {
        id: 'task',
        title: '任务承接',
        status: currentPageDraft ? 'linked' : 'missing',
        detail: currentPageDraft
          ? `已有草稿 ${currentPageDraft.title || currentPageDraft.id}`
          : `${pageLabel} 还没有对应任务草稿。`,
        target: {
          tab: 'TaskCenter',
          taskQuery: currentPageDraft?.source?.id || currentPageDraft?.title || pageLabel,
        },
      },
    ];
  }, [
    activeTab,
    currentCockpitPage,
    currentPageDraft,
    currentPageFeatureDomains,
    currentPageMaturity,
    currentPagePlaybooks,
    currentPagePrimaryPath,
    currentPageRoadmapItems,
    currentPageTarget,
  ]);
  const currentGroupEntryTarget = useMemo(() => {
    const siblingPage = activeGroupPages.find((page) => page.tab !== activeTab) || activeGroupPages[0];
    return siblingPage ? { tab: siblingPage.tab } : { tab: 'SystemMap' };
  }, [activeGroupPages, activeTab]);
  const siteClosureRows = useMemo<SiteClosureRow[]>(() => {
    const pageIds = new Set<string>();
    cockpitPages.forEach((page) => page.id && pageIds.add(page.id));
    pageMaturityItems.forEach((item) => (item.page?.id || item.page_id) && pageIds.add(item.page?.id || item.page_id));
    sidebarUsagePaths.forEach((path) => (path.pages || []).forEach((page) => page.id && pageIds.add(page.id)));
    playbooks.forEach((playbook) => (playbook.steps || []).forEach((step) => {
      const pageId = step.page_id || step.page?.id;
      if (pageId) pageIds.add(pageId);
    }));
    featureDomains.forEach((domain) => {
      if (domain.cockpit_page) pageIds.add(domain.cockpit_page);
      (domain.providers || []).forEach((provider) => provider && pageIds.add(provider));
    });
    roadmapItems.forEach((item) => item.cockpit_page && pageIds.add(item.cockpit_page));
    if (pageIds.size === 0) searchTargets.forEach((target) => pageIds.add(target.tab));

    return [...pageIds]
      .map((pageId) => {
        const pageTarget = searchTargets.find((target) => target.tab === pageId);
        const pageMeta = cockpitPages.find((page) => page.id === pageId);
        const maturity = pageMaturityItems.find((item) => (item.page?.id || item.page_id) === pageId);
        const pageTitle = pageMeta?.title || pageTarget?.label || pageId;
        const hasPath = sidebarUsagePaths.some((path) => path.pages?.some((page) => page.id === pageId))
          || Boolean(maturity?.usage_paths?.length);
        const matchedDomains = featureDomains.filter((domain) => domain.cockpit_page === pageId || domain.providers?.includes(pageId));
        const hasMaturityDomains = Boolean(maturity?.domains?.length);
        const matchedPlaybooks = playbooks.filter((playbook) => (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === pageId));
        const hasMaturityPlaybooks = Boolean(maturity?.playbook_steps?.length);
        const matchedRoadmapItems = roadmapItems.filter((item) => item.cockpit_page === pageId);
        const hasMaturityRoadmaps = Boolean(maturity?.roadmap_items?.length);
        const matchedDraft = shellTaskDrafts.find((task) => taskDraftMatchesPage(task, pageId, pageTitle)) || null;

        const missingItems: string[] = [];
        const linkedItems: string[] = [];
        if (hasPath) linkedItems.push('路径');
        else missingItems.push('路径');
        if (matchedDomains.length > 0 || hasMaturityDomains) linkedItems.push('能力域');
        else missingItems.push('能力域');
        if (matchedPlaybooks.length > 0 || hasMaturityPlaybooks) linkedItems.push('操作清单');
        else missingItems.push('操作清单');
        if (matchedRoadmapItems.length > 0 || hasMaturityRoadmaps) linkedItems.push('路线图');
        else missingItems.push('路线图');
        if (matchedDraft) linkedItems.push('任务');
        else missingItems.push('任务');

        const nextAction = !hasPath
          ? '先把页面挂进使用路径。'
          : matchedDomains.length === 0
            ? '补能力域映射。'
            : matchedPlaybooks.length === 0
              ? '补操作清单入口。'
              : matchedRoadmapItems.length === 0
                ? '补路线图条目。'
                : !matchedDraft
                  ? '补任务草稿。'
                  : '继续把页面闭环做实。';

        return {
          id: `site-closure-${pageId}`,
          pageId,
          title: pageTitle,
          group: pageMeta?.group || pageTarget?.group || '未归类',
          missingItems,
          linkedItems,
          nextAction,
          target: { tab: 'SystemMap', pageId },
        };
      })
      .sort((left, right) => {
        const missingDelta = right.missingItems.length - left.missingItems.length;
        if (missingDelta !== 0) return missingDelta;
        return left.title.localeCompare(right.title, 'zh-CN');
      });
  }, [cockpitPages, featureDomains, pageMaturityItems, playbooks, roadmapItems, shellTaskDrafts, sidebarUsagePaths]);
  const siteClosureSummary = useMemo(() => ({
    missingPath: siteClosureRows.filter((row) => row.missingItems.includes('路径')).length,
    missingFeatureDomain: siteClosureRows.filter((row) => row.missingItems.includes('能力域')).length,
    missingPlaybook: siteClosureRows.filter((row) => row.missingItems.includes('操作清单')).length,
    missingRoadmap: siteClosureRows.filter((row) => row.missingItems.includes('路线图')).length,
    missingTask: siteClosureRows.filter((row) => row.missingItems.includes('任务')).length,
    rows: siteClosureRows.filter((row) => row.missingItems.length > 0),
  }), [siteClosureRows]);
  const pageAuditRows = useMemo<PageAuditRow[]>(() => (
    searchTargets
      .map((target, index) => {
        const pageMeta = cockpitPages.find((page) => page.id === target.tab);
        const pageTitle = pageMeta?.title || target.label;
        const matchedPath = sidebarUsagePaths.find((path) => path.pages?.some((page) => page.id === target.tab)) || null;
        const matchedDomains = featureDomains.filter((domain) => domain.cockpit_page === target.tab || domain.providers?.includes(target.tab));
        const matchedPlaybooks = playbooks.filter((playbook) => (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === target.tab));
        const matchedRoadmapItems = roadmapItems.filter((item) => item.cockpit_page === target.tab);
        const matchedDraft = shellTaskDrafts.find((task) => taskDraftMatchesPage(task, target.tab, pageTitle)) || null;
        const linkedItems: string[] = [];
        const missingItems: string[] = [];

        if (PAGE_WORKBENCH_IDS.has(target.tab)) linkedItems.push('工作台');
        else missingItems.push('工作台');
        if (PAGE_FOCUS_HANDOFF_IDS.has(target.tab)) linkedItems.push('焦点承接');
        else missingItems.push('焦点承接');
        if (matchedPath) linkedItems.push('路径');
        else missingItems.push('路径');
        if (matchedDomains.length > 0) linkedItems.push('能力域');
        else missingItems.push('能力域');
        if (matchedPlaybooks.length > 0) linkedItems.push('操作清单');
        else missingItems.push('操作清单');
        if (matchedRoadmapItems.length > 0) linkedItems.push('路线图');
        else missingItems.push('路线图');
        if (matchedDraft) linkedItems.push('任务');
        else missingItems.push('任务');

        const coverageScore = Math.round((linkedItems.length / 7) * 100);
        const statusTone = missingItems.length === 0 ? 'online' : missingItems.length <= 2 ? 'degraded' : 'offline';
        const statusLabel = missingItems.length === 0 ? '可独立承接' : missingItems.length <= 2 ? '可走待补' : '断链较多';
        const nextAction = !PAGE_WORKBENCH_IDS.has(target.tab)
          ? `先给 ${pageTitle} 补独立工作台，别让它只剩导航入口。`
          : !PAGE_FOCUS_HANDOFF_IDS.has(target.tab)
            ? `把 ${pageTitle} 接到对象级焦点承接，避免从系统地图或搜索跳过来后重新找路。`
            : !matchedPath
              ? `先把 ${pageTitle} 挂进使用路径。`
              : matchedDomains.length === 0
                ? `先补 ${pageTitle} 的能力域映射。`
                : matchedPlaybooks.length === 0
                  ? `先给 ${pageTitle} 接操作清单。`
                  : matchedRoadmapItems.length === 0
                    ? `先把 ${pageTitle} 接进路线图。`
                    : !matchedDraft
                      ? `先给 ${pageTitle} 生成任务草稿。`
                      : `继续深化 ${pageTitle} 的页面承接和验收证据。`;

        return {
          id: `page-audit-${target.tab}`,
          pageId: target.tab,
          title: pageTitle,
          group: pageMeta?.group || target.group,
          linkedItems,
          missingItems,
          coverageScore,
          statusTone,
          statusLabel,
          nextAction,
          target: { tab: target.tab },
          secondaryTarget: matchedDraft
            ? { tab: 'TaskCenter', taskQuery: matchedDraft.source?.id || matchedDraft.title || pageTitle }
            : { tab: 'SystemMap', pageId: target.tab },
          secondaryLabel: matchedDraft ? '看任务承接' : '看页面覆盖',
          order: index,
        };
      })
      .sort((left, right) => {
        const missingDelta = right.missingItems.length - left.missingItems.length;
        if (missingDelta !== 0) return missingDelta;
        const scoreDelta = left.coverageScore - right.coverageScore;
        if (scoreDelta !== 0) return scoreDelta;
        return left.order - right.order;
      })
      .map(({ order, ...row }) => row)
  ), [cockpitPages, featureDomains, playbooks, roadmapItems, shellTaskDrafts, sidebarUsagePaths]);
  const pageAuditSummary = useMemo(() => ({
    total: pageAuditRows.length,
    ready: pageAuditRows.filter((row) => row.missingItems.length === 0).length,
    missingWorkbench: pageAuditRows.filter((row) => row.missingItems.includes('工作台')).length,
    missingFocus: pageAuditRows.filter((row) => row.missingItems.includes('焦点承接')).length,
    missingPath: pageAuditRows.filter((row) => row.missingItems.includes('路径')).length,
    missingTask: pageAuditRows.filter((row) => row.missingItems.includes('任务')).length,
  }), [pageAuditRows]);
  const pageCapabilityRows = useMemo<PageCapabilityRow[]>(() => (
    pageAuditRows.map((auditRow) => {
      const pageMeta = cockpitPages.find((page) => page.id === auditRow.pageId);
      const matchedPaths = sidebarUsagePaths.filter((path) => path.pages?.some((page) => page.id === auditRow.pageId));
      const matchedDomains = featureDomains.filter((domain) => domain.cockpit_page === auditRow.pageId || domain.providers?.includes(auditRow.pageId));
      const matchedPlaybooks = playbooks.filter((playbook) => (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === auditRow.pageId));
      const matchedRoadmapItems = roadmapItems.filter((item) => item.cockpit_page === auditRow.pageId);
      const matchedDrafts = shellTaskDrafts.filter((task) => taskDraftMatchesPage(task, auditRow.pageId, auditRow.title));
      const dimensionLabels = pageMeta?.dimensions?.length
        ? pageMeta.dimensions
        : matchedDomains.map((domain) => domain.title || domain.id);

      return {
        id: `page-capability-${auditRow.pageId}`,
        title: auditRow.title,
        group: auditRow.group,
        purpose: pageMeta?.purpose || '待补用途说明',
        dimensionsLabel: dimensionLabels.length > 0 ? dimensionLabels.join(' / ') : '未登记能力域',
        primaryPathTitle: matchedPaths[0]?.title || matchedPaths[0]?.id || null,
        usagePathCount: matchedPaths.length,
        featureDomainCount: matchedDomains.length,
        playbookCount: matchedPlaybooks.length,
        roadmapCount: matchedRoadmapItems.length,
        taskCount: matchedDrafts.length,
        coverageScore: auditRow.coverageScore,
        missingItems: auditRow.missingItems,
        nextAction: auditRow.nextAction,
        statusTone: auditRow.statusTone,
        statusLabel: auditRow.statusLabel,
        target: auditRow.target,
        pathTarget: matchedPaths[0] ? { tab: 'SystemMap', usagePathId: matchedPaths[0].id } : null,
        taskTarget: matchedDrafts[0]
          ? { tab: 'TaskCenter', taskQuery: matchedDrafts[0].source?.id || matchedDrafts[0].title || auditRow.title }
          : { tab: 'TaskCenter', taskQuery: auditRow.title },
      };
    })
  ), [cockpitPages, featureDomains, pageAuditRows, playbooks, roadmapItems, shellTaskDrafts, sidebarUsagePaths]);
  const pageSprintRows = useMemo<PageSprintRow[]>(() => (
    siteClosureSummary.rows
      .map((row) => {
        const pageMeta = cockpitPages.find((page) => page.id === row.pageId);
        const auditRow = pageAuditRows.find((item) => item.pageId === row.pageId);
        const matchedPaths = sidebarUsagePaths.filter((path) => path.pages?.some((page) => page.id === row.pageId));
        const matchedDomains = featureDomains.filter((domain) => domain.cockpit_page === row.pageId || domain.providers?.includes(row.pageId));
        const matchedPlaybooks = playbooks.filter((playbook) => (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === row.pageId));
        const matchedRoadmapItems = roadmapItems.filter((item) => item.cockpit_page === row.pageId);
        const matchedDrafts = shellTaskDrafts.filter((task) => taskDraftMatchesPage(task, row.pageId, row.title));

        return {
          id: `page-sprint-${row.pageId}`,
          pageId: row.pageId,
          title: row.title,
          group: row.group,
          purpose: pageMeta?.purpose || '待补页面用途说明',
          coverageScore: auditRow?.coverageScore ?? 0,
          missingItems: row.missingItems,
          nextAction: row.nextAction,
          primaryPathTitle: matchedPaths[0]?.title || matchedPaths[0]?.id || null,
          primaryPathTarget: matchedPaths[0] ? { tab: 'SystemMap', usagePathId: matchedPaths[0].id } : null,
          featureDomainCount: matchedDomains.length,
          playbookCount: matchedPlaybooks.length,
          roadmapCount: matchedRoadmapItems.length,
          taskCount: matchedDrafts.length,
          statusTone: auditRow?.statusTone || 'offline',
          statusLabel: auditRow?.statusLabel || '待补位',
          target: { tab: row.pageId },
          taskTarget: matchedDrafts[0]
            ? { tab: 'TaskCenter', taskQuery: matchedDrafts[0].source?.id || matchedDrafts[0].title || row.title }
            : { tab: 'TaskCenter', taskQuery: row.title },
        };
      })
      .sort((left, right) => {
        const missingDelta = right.missingItems.length - left.missingItems.length;
        if (missingDelta !== 0) return missingDelta;
        const coverageDelta = left.coverageScore - right.coverageScore;
        if (coverageDelta !== 0) return coverageDelta;
        return left.title.localeCompare(right.title, 'zh-CN');
      })
  ), [cockpitPages, featureDomains, pageAuditRows, playbooks, roadmapItems, shellTaskDrafts, sidebarUsagePaths, siteClosureSummary.rows]);
  const activePageSprintRow = useMemo(
    () => pageSprintRows.find((row) => row.pageId === pageSprintFocusId) || pageSprintRows[0] || null,
    [pageSprintFocusId, pageSprintRows],
  );
  const pageSprintTaskDraft = useMemo<SiteClosureTaskDraft | null>(() => {
    if (!activePageSprintRow) return null;
    const title = `补齐${activePageSprintRow.title}的页面承接`;
    const checklist = [
      `回页面核实用途：${activePageSprintRow.purpose}`,
      activePageSprintRow.primaryPathTitle
        ? `检查进入路径：确认 ${activePageSprintRow.primaryPathTitle} 是否真的能把用户送到 ${activePageSprintRow.title}`
        : `补进入路径：先给 ${activePageSprintRow.title} 挂一条真实使用路径`,
      `补位缺口：${activePageSprintRow.missingItems.join('、') || '继续补强验收证据'}`,
      `任务收口：在 TaskCenter 里保留 ${activePageSprintRow.title} 的持续承接动作`,
    ];
    const description = `${activePageSprintRow.nextAction} 当前分区：${activePageSprintRow.group}；已接能力域 ${activePageSprintRow.featureDomainCount}；已接清单 ${activePageSprintRow.playbookCount}；已接路线图 ${activePageSprintRow.roadmapCount}。`;
    const copyText = [
      `标题: ${title}`,
      `页面: ${activePageSprintRow.title}`,
      `页面ID: ${activePageSprintRow.pageId}`,
      `分区: ${activePageSprintRow.group}`,
      `当前用途: ${activePageSprintRow.purpose}`,
      `当前得分: ${activePageSprintRow.coverageScore}%`,
      `当前缺口: ${activePageSprintRow.missingItems.join('、') || '无'}`,
      `任务描述: ${description}`,
      `建议动作:`,
      ...checklist.map((item, index) => `${index + 1}. ${item}`),
      `验收标准:`,
      `- ${activePageSprintRow.title} 至少接入一条真实使用路径或保持现有路径可走`,
      `- ${activePageSprintRow.title} 的缺口项减少至少 1 项`,
      `- TaskCenter 可直接承接 ${activePageSprintRow.title} 的补位动作`,
    ].join('\n');

    return {
      title,
      description,
      tags: [
        'cockpit',
        'page-sprint',
        `page:${activePageSprintRow.pageId}`,
        `group:${activePageSprintRow.group}`,
      ],
      checklist,
      copyText,
      taskTarget: { tab: 'TaskCenter', taskQuery: activePageSprintRow.title },
      sourceTarget: { tab: 'SystemMap', pageId: activePageSprintRow.pageId },
    };
  }, [activePageSprintRow]);
  const visiblePageAuditRows = useMemo(
    () => (pageAuditExpanded ? pageAuditRows : pageAuditRows.slice(0, 8)),
    [pageAuditExpanded, pageAuditRows],
  );
  const siteClosureFilterOptions = useMemo(
    () => [
      { id: 'all' as const, label: '全部', count: siteClosureSummary.rows.length },
      { id: '路径' as const, label: '缺路径', count: siteClosureSummary.missingPath },
      { id: '能力域' as const, label: '缺能力域', count: siteClosureSummary.missingFeatureDomain },
      { id: '操作清单' as const, label: '缺操作清单', count: siteClosureSummary.missingPlaybook },
      { id: '路线图' as const, label: '缺路线图', count: siteClosureSummary.missingRoadmap },
      { id: '任务' as const, label: '缺任务', count: siteClosureSummary.missingTask },
    ],
    [siteClosureSummary],
  );
  const filteredSiteClosureRows = useMemo(() => (
    siteClosureFilter === 'all'
      ? siteClosureSummary.rows
      : siteClosureSummary.rows.filter((row) => row.missingItems.includes(siteClosureFilter))
  ), [siteClosureFilter, siteClosureSummary.rows]);
  const visibleSiteClosureRows = useMemo(
    () => (siteClosureExpanded ? filteredSiteClosureRows : filteredSiteClosureRows.slice(0, 6)),
    [filteredSiteClosureRows, siteClosureExpanded],
  );
  const activeSiteClosureTemplateKey = useMemo<Exclude<SiteClosureFilter, 'all'>>(() => {
    if (siteClosureFilter !== 'all') return siteClosureFilter;
    const ordered = [
      { key: '路线图' as const, count: siteClosureSummary.missingRoadmap },
      { key: '任务' as const, count: siteClosureSummary.missingTask },
      { key: '操作清单' as const, count: siteClosureSummary.missingPlaybook },
      { key: '能力域' as const, count: siteClosureSummary.missingFeatureDomain },
      { key: '路径' as const, count: siteClosureSummary.missingPath },
    ];
    return ordered.sort((left, right) => right.count - left.count)[0]?.key || '路径';
  }, [siteClosureFilter, siteClosureSummary]);
  const activeSiteClosureTemplateRow = useMemo(
    () => filteredSiteClosureRows[0] || siteClosureSummary.rows[0] || null,
    [filteredSiteClosureRows, siteClosureSummary.rows],
  );
  const activeSiteClosureGroupTemplate = useMemo(
    () => siteClosureGroupTemplate(activeSiteClosureTemplateRow?.group || '未归类', activeSiteClosureTemplateRow),
    [activeSiteClosureTemplateRow],
  );
  const siteClosureTemplateActions = useMemo<SiteClosureTemplateAction[]>(() => {
    if (!activeSiteClosureTemplateRow) return [];
    const pageTarget = { tab: 'SystemMap', pageId: activeSiteClosureTemplateRow.pageId };
    const pageTaskTarget = { tab: 'TaskCenter', taskQuery: activeSiteClosureTemplateRow.title };
    const groupAnchorAction = {
      id: 'group-anchor',
      title: activeSiteClosureGroupTemplate.anchorTitle,
      detail: activeSiteClosureGroupTemplate.anchorDetail,
      target: activeSiteClosureGroupTemplate.anchorTarget,
    };
    if (activeSiteClosureTemplateKey === '路径') {
      return [
        { id: 'path-page', title: '先确认页面落点', detail: `回系统地图检查 ${activeSiteClosureTemplateRow.title} 该挂在哪条路径上。`, target: pageTarget },
        groupAnchorAction,
        { id: 'path-task', title: '生成补位任务', detail: '去任务中心把缺路径页面拉成可执行草稿。', target: pageTaskTarget },
      ];
    }
    if (activeSiteClosureTemplateKey === '能力域') {
      return [
        { id: 'feature-page', title: '确认归属能力域', detail: `回系统地图把 ${activeSiteClosureTemplateRow.title} 接回对应能力域。`, target: pageTarget },
        groupAnchorAction,
        { id: 'feature-task', title: '生成映射任务', detail: '去任务中心记录能力域映射补位动作。', target: pageTaskTarget },
      ];
    }
    if (activeSiteClosureTemplateKey === '操作清单') {
      return [
        { id: 'playbook-page', title: '先找承接页面', detail: `回系统地图确认 ${activeSiteClosureTemplateRow.title} 该挂进哪条操作清单。`, target: pageTarget },
        groupAnchorAction,
        { id: 'playbook-task', title: '补操作清单任务', detail: '去任务中心创建操作清单补位草稿。', target: pageTaskTarget },
      ];
    }
    if (activeSiteClosureTemplateKey === '路线图') {
      return [
        { id: 'roadmap-page', title: '回系统地图挂路线图', detail: `把 ${activeSiteClosureTemplateRow.title} 接入对应路线图条目。`, target: pageTarget },
        groupAnchorAction,
        { id: 'roadmap-task', title: '补路线图任务', detail: '去任务中心登记路线图补位动作。', target: pageTaskTarget },
      ];
    }
    return [
      { id: 'task-page', title: '先确认页面缺口', detail: `回系统地图确认 ${activeSiteClosureTemplateRow.title} 当前缺的是哪类执行动作。`, target: pageTarget },
      groupAnchorAction,
      { id: 'task-center', title: '生成任务草稿', detail: '去任务中心直接搜索并承接这一页的补位工作。', target: pageTaskTarget },
    ];
  }, [activeSiteClosureGroupTemplate, activeSiteClosureTemplateKey, activeSiteClosureTemplateRow]);
  const siteClosureTemplateCopy = useMemo(() => {
    const currentPage = activeSiteClosureTemplateRow?.title || '当前页面';
    if (activeSiteClosureTemplateKey === '路径') {
      return {
        title: `${activeSiteClosureGroupTemplate.title} · 缺路径补位模板`,
        summary: `${currentPage} 这一类问题，先补用户从哪里进入，再补它怎么承接后续动作。${activeSiteClosureGroupTemplate.summary}`,
      };
    }
    if (activeSiteClosureTemplateKey === '能力域') {
      return {
        title: `${activeSiteClosureGroupTemplate.title} · 缺能力域补位模板`,
        summary: `${currentPage} 这一类问题，先确认它属于哪条能力线，再补整站分工和任务承接。${activeSiteClosureGroupTemplate.summary}`,
      };
    }
    if (activeSiteClosureTemplateKey === '操作清单') {
      return {
        title: `${activeSiteClosureGroupTemplate.title} · 缺操作清单补位模板`,
        summary: `${currentPage} 这一类问题，重点不是页面本身，而是没被放进用户实际会走的操作链。${activeSiteClosureGroupTemplate.summary}`,
      };
    }
    if (activeSiteClosureTemplateKey === '路线图') {
      return {
        title: `${activeSiteClosureGroupTemplate.title} · 缺路线图补位模板`,
        summary: `${currentPage} 这一类问题说明页面有功能，但还没进入“为什么现在做”的优先级叙事。${activeSiteClosureGroupTemplate.summary}`,
      };
    }
    return {
      title: `${activeSiteClosureGroupTemplate.title} · 缺任务补位模板`,
      summary: `${currentPage} 这一类问题说明页面缺口已经看见了，但还没有变成明确的执行动作。${activeSiteClosureGroupTemplate.summary}`,
    };
  }, [activeSiteClosureGroupTemplate, activeSiteClosureTemplateKey, activeSiteClosureTemplateRow]);
  const siteClosureTaskDraft = useMemo<SiteClosureTaskDraft | null>(() => {
    if (!activeSiteClosureTemplateRow) return null;
    const gapLabel = activeSiteClosureTemplateKey;
    const pageTitle = activeSiteClosureTemplateRow.title;
    const tags = [
      'cockpit',
      'closure-gap',
      `page:${activeSiteClosureTemplateRow.pageId}`,
      `group:${activeSiteClosureTemplateRow.group}`,
      `gap:${gapLabel}`,
    ];
    const title = `补齐${pageTitle}的${gapLabel}承接`;
    const checklist = siteClosureTemplateActions.map((action) => `${action.title}：${action.detail}`);
    const description = `${activeSiteClosureTemplateRow.nextAction} 当前已接：${activeSiteClosureTemplateRow.linkedItems.join('、') || '暂无'}；待补：${activeSiteClosureTemplateRow.missingItems.join('、') || '无'}。`;
    const copyText = [
      `标题: ${title}`,
      `页面: ${pageTitle}`,
      `页面ID: ${activeSiteClosureTemplateRow.pageId}`,
      `分区: ${activeSiteClosureTemplateRow.group}`,
      `缺口类型: ${gapLabel}`,
      `任务描述: ${description}`,
      `建议动作:`,
      ...checklist.map((item, index) => `${index + 1}. ${item}`),
      `验收标准:`,
      `- 页面闭环审计里 ${pageTitle} 不再缺 ${gapLabel}`,
      `- 当前分区 ${activeSiteClosureTemplateRow.group} 至少有一条可走的补位动作`,
      `- TaskCenter 能按 ${pageTitle} 或 ${activeSiteClosureTemplateRow.pageId} 检索到该任务`,
      `标签: ${tags.join(', ')}`,
    ].join('\n');

    return {
      title,
      description,
      tags,
      checklist,
      copyText,
      taskTarget: { tab: 'TaskCenter', taskQuery: pageTitle },
      sourceTarget: { tab: 'SystemMap', pageId: activeSiteClosureTemplateRow.pageId },
    };
  }, [activeSiteClosureTemplateKey, activeSiteClosureTemplateRow, siteClosureTemplateActions]);
  const handleCopySiteClosureDraft = async () => {
    if (!siteClosureTaskDraft) return;
    try {
      await navigator.clipboard.writeText(siteClosureTaskDraft.copyText);
      setClosureDraftNotice(`已复制任务草稿：${siteClosureTaskDraft.title}`);
    } catch (error) {
      setClosureDraftNotice('复制任务草稿失败，请检查浏览器剪贴板权限。');
      console.error(error);
    }
  };
  const handleCopyPageSprintDraft = async () => {
    if (!pageSprintTaskDraft) return;
    try {
      await navigator.clipboard.writeText(pageSprintTaskDraft.copyText);
      setPageSprintDraftNotice(`已复制补位任务：${pageSprintTaskDraft.title}`);
    } catch (error) {
      setPageSprintDraftNotice('复制补位任务失败，请检查浏览器剪贴板权限。');
      console.error(error);
    }
  };
  const domainDraftCount = shellTaskDrafts.filter((task) => task.source?.type === 'system_map_domain_app').length;
  const firstDomainDraft = shellTaskDrafts.find((task) => task.source?.type === 'system_map_domain_app');
  const dimensionCoverageRows = useMemo<DimensionCoverageRow[]>(() => {
    const systemMapUnavailable = !shellSourceAvailability.systemMap;
    const tasksUnavailable = !shellSourceAvailability.tasks;
    const domainAppsUnavailable = !shellSourceAvailability.domainApps;
    const pageScore = sidebarCoverage?.summary.score ?? 0;
    const projectScore = sidebarProjectPortfolio?.summary.score ?? 0;
    const domainTotal = shellDomainApps?.summary?.total ?? 0;
    const domainReady = shellDomainApps?.summary?.ready ?? 0;
    const domainSecurityAttention = shellDomainApps?.summary?.security_attention_apps ?? 0;
    return [
      {
        id: 'dimension-pages',
        title: '页面覆盖',
        value: systemMapUnavailable ? 'N/A' : `${pageScore}%`,
        detail: systemMapUnavailable ? '页面成熟度数据不可用' : `就绪 ${sidebarCoverage?.summary.ready ?? 0} · 观察 ${sidebarCoverage?.summary.watch ?? 0} · 缺口 ${sidebarCoverage?.summary.gap ?? 0}`,
        risk: systemMapUnavailable ? '先重试系统地图数据源' : `待补页面 ${sidebarCoverage?.attentionItems.length ?? 0}`,
        statusTone: systemMapUnavailable ? 'offline' : pageScore >= 70 ? 'online' : pageScore >= 40 ? 'degraded' : 'offline',
        statusLabel: systemMapUnavailable ? '数据不可用' : pageScore >= 70 ? '成型' : pageScore >= 40 ? '观察' : '缺口',
        target: { tab: 'SystemMap' },
      },
      {
        id: 'dimension-projects',
        title: '项目组合',
        value: systemMapUnavailable ? 'N/A' : `${projectScore}%`,
        detail: systemMapUnavailable ? '项目组合数据不可用' : `阻塞 ${sidebarProjectPortfolio?.summary.blocked ?? 0} · 风险 ${sidebarProjectPortfolio?.summary.at_risk ?? 0} · 健康 ${sidebarProjectPortfolio?.summary.healthy ?? 0}`,
        risk: systemMapUnavailable ? '先重试系统地图数据源' : `优先项目 ${sidebarProjectPortfolio?.priorityProjects.length ?? 0}`,
        statusTone: systemMapUnavailable ? 'offline' : projectScore >= 70 ? 'online' : projectScore >= 40 ? 'degraded' : 'offline',
        statusLabel: systemMapUnavailable ? '数据不可用' : projectScore >= 70 ? '成型' : projectScore >= 40 ? '观察' : '缺口',
        target: { tab: 'SystemMap', projectId: sidebarProjectPortfolio?.priorityProjects?.[0]?.id || null },
      },
      {
        id: 'dimension-domain-apps',
        title: '领域挂载',
        value: domainAppsUnavailable ? 'N/A' : String(domainTotal),
        detail: domainAppsUnavailable ? '领域应用数据不可用' : `就绪 ${domainReady} · 安全关注 ${domainSecurityAttention}`,
        risk: domainAppsUnavailable ? '先重试领域应用数据源' : `待承接草稿 ${domainDraftCount}`,
        statusTone: domainAppsUnavailable ? 'offline' : domainSecurityAttention === 0 && domainTotal > 0 ? 'online' : domainTotal > 0 ? 'degraded' : 'offline',
        statusLabel: domainAppsUnavailable ? '数据不可用' : domainSecurityAttention === 0 && domainTotal > 0 ? '成型' : domainTotal > 0 ? '观察' : '缺口',
        target: { tab: 'DomainApps', taskQuery: shellDomainApps?.items?.[0]?.id || firstDomainDraft?.source?.id || '' },
      },
      {
        id: 'dimension-usage-paths',
        title: '使用路径',
        value: systemMapUnavailable ? 'N/A' : String(sidebarUsagePaths.length),
        detail: systemMapUnavailable ? '使用路径数据不可用' : `当前登记 ${sidebarUsagePaths.length} 条整站路径`,
        risk: systemMapUnavailable ? '先重试系统地图数据源' : `缺路径页面 ${siteClosureSummary.missingPath}`,
        statusTone: systemMapUnavailable ? 'offline' : sidebarUsagePaths.length >= 3 ? 'online' : sidebarUsagePaths.length > 0 ? 'degraded' : 'offline',
        statusLabel: systemMapUnavailable ? '数据不可用' : sidebarUsagePaths.length >= 3 ? '成型' : sidebarUsagePaths.length > 0 ? '观察' : '缺口',
        target: { tab: 'SystemMap', usagePathId: contextualUsagePaths[0]?.id || sidebarUsagePaths[0]?.id || null },
      },
      {
        id: 'dimension-feature-domains',
        title: '能力域',
        value: systemMapUnavailable ? 'N/A' : String(featureDomains.length),
        detail: systemMapUnavailable ? '能力域数据不可用' : `当前映射 ${featureDomains.length} 个能力域`,
        risk: systemMapUnavailable ? '先重试系统地图数据源' : `缺映射页面 ${siteClosureSummary.missingFeatureDomain}`,
        statusTone: systemMapUnavailable ? 'offline' : featureDomains.length >= 3 ? 'online' : featureDomains.length > 0 ? 'degraded' : 'offline',
        statusLabel: systemMapUnavailable ? '数据不可用' : featureDomains.length >= 3 ? '成型' : featureDomains.length > 0 ? '观察' : '缺口',
        target: { tab: 'SystemMap', featureDomainId: featureDomains[0]?.id || null },
      },
      {
        id: 'dimension-playbooks',
        title: '操作清单',
        value: systemMapUnavailable ? 'N/A' : String(playbooks.length),
        detail: systemMapUnavailable ? '操作清单数据不可用' : `当前登记 ${playbooks.length} 条操作清单`,
        risk: systemMapUnavailable ? '先重试系统地图数据源' : `缺清单页面 ${siteClosureSummary.missingPlaybook}`,
        statusTone: systemMapUnavailable ? 'offline' : playbooks.length >= 3 ? 'online' : playbooks.length > 0 ? 'degraded' : 'offline',
        statusLabel: systemMapUnavailable ? '数据不可用' : playbooks.length >= 3 ? '成型' : playbooks.length > 0 ? '观察' : '缺口',
        target: { tab: 'SystemMap', usagePathId: currentPagePrimaryPath?.id || sidebarUsagePaths[0]?.id || null },
      },
      {
        id: 'dimension-roadmap',
        title: '路线图',
        value: systemMapUnavailable ? 'N/A' : String(roadmapItems.length),
        detail: systemMapUnavailable ? '路线图数据不可用' : `当前登记 ${roadmapItems.length} 个路线图条目`,
        risk: systemMapUnavailable ? '先重试系统地图数据源' : `缺路线图页面 ${siteClosureSummary.missingRoadmap}`,
        statusTone: systemMapUnavailable ? 'offline' : roadmapItems.length >= 3 ? 'online' : roadmapItems.length > 0 ? 'degraded' : 'offline',
        statusLabel: systemMapUnavailable ? '数据不可用' : roadmapItems.length >= 3 ? '成型' : roadmapItems.length > 0 ? '观察' : '缺口',
        target: { tab: 'SystemMap', pageId: roadmapItems[0]?.cockpit_page || null },
      },
      {
        id: 'dimension-tasks',
        title: '任务承接',
        value: tasksUnavailable ? 'N/A' : String(shellTaskDrafts.length),
        detail: tasksUnavailable ? '任务承接数据不可用' : `当前焦点 ${shellTaskDrafts[0]?.title || '未登记任务草稿'}`,
        risk: tasksUnavailable ? '先重试任务数据源' : `缺任务页面 ${siteClosureSummary.missingTask}`,
        statusTone: tasksUnavailable ? 'offline' : shellTaskDrafts.length >= 5 ? 'online' : shellTaskDrafts.length > 0 ? 'degraded' : 'offline',
        statusLabel: tasksUnavailable ? '数据不可用' : shellTaskDrafts.length >= 5 ? '成型' : shellTaskDrafts.length > 0 ? '观察' : '缺口',
        target: { tab: 'TaskCenter', taskQuery: shellTaskDrafts[0]?.source?.id || shellTaskDrafts[0]?.title || '' },
      },
    ];
  }, [
    contextualUsagePaths,
    currentPagePrimaryPath,
    domainDraftCount,
    featureDomains,
    firstDomainDraft?.source?.id,
    playbooks,
    roadmapItems,
    shellDomainApps,
    shellTaskDrafts,
    shellSourceAvailability,
    sidebarCoverage,
    sidebarProjectPortfolio,
    sidebarUsagePaths,
    siteClosureSummary.missingFeatureDomain,
    siteClosureSummary.missingPath,
    siteClosureSummary.missingPlaybook,
    siteClosureSummary.missingRoadmap,
    siteClosureSummary.missingTask,
  ]);
  const architectureGroupRows = useMemo<ArchitectureGroupRow[]>(() => {
    const groupOrder = [...new Set(searchTargets.map((target) => target.group))];
    return groupOrder
      .map((group) => {
        const groupPages = searchTargets.filter((target) => target.group === group);
        if (groupPages.length === 0) return null;

        const linkedPathIds = new Set<string>();
        const linkedFeatureDomainIds = new Set<string>();
        const linkedPlaybookIds = new Set<string>();
        const linkedRoadmapIds = new Set<string>();
        const linkedTaskIds = new Set<string>();

        const pageDetails = groupPages.map((page) => {
          const pageMeta = cockpitPages.find((item) => item.id === page.tab);
          const pageTitle = pageMeta?.title || page.label;
          const matchedPath = sidebarUsagePaths.find((path) => path.pages?.some((pathPage) => pathPage.id === page.tab)) || null;
          const matchedFeatureDomains = featureDomains.filter((domain) => domain.cockpit_page === page.tab || domain.providers?.includes(page.tab));
          const matchedPlaybooks = playbooks.filter((playbook) => (playbook.steps || []).some((step) => (step.page_id || step.page?.id) === page.tab));
          const matchedRoadmapItems = roadmapItems.filter((item) => item.cockpit_page === page.tab);
          const matchedTask = shellTaskDrafts.find((task) => taskDraftMatchesPage(task, page.tab, pageTitle)) || null;

          if (matchedPath?.id) linkedPathIds.add(matchedPath.id);
          matchedFeatureDomains.forEach((domain) => linkedFeatureDomainIds.add(domain.id));
          matchedPlaybooks.forEach((playbook) => linkedPlaybookIds.add(playbook.id));
          matchedRoadmapItems.forEach((item) => linkedRoadmapIds.add(item.id));
          if (matchedTask?.id) linkedTaskIds.add(matchedTask.id);

          const missingItems: string[] = [];
          if (!matchedPath) missingItems.push('路径');
          if (matchedFeatureDomains.length === 0) missingItems.push('能力域');
          if (matchedPlaybooks.length === 0) missingItems.push('操作清单');
          if (matchedRoadmapItems.length === 0) missingItems.push('路线图');
          if (!matchedTask) missingItems.push('任务');

          const nextAction = !matchedPath
            ? `先把 ${pageTitle} 挂进使用路径。`
            : matchedFeatureDomains.length === 0
              ? `先补 ${pageTitle} 的能力域映射。`
              : matchedPlaybooks.length === 0
                ? `先给 ${pageTitle} 接操作清单。`
                : matchedRoadmapItems.length === 0
                  ? `先把 ${pageTitle} 接进路线图。`
                  : !matchedTask
                    ? `先给 ${pageTitle} 生成任务草稿。`
                    : `继续深化 ${pageTitle} 的承接动作。`;

          return {
            pageId: page.tab,
            pageTitle,
            matchedPath,
            missingItems,
            linkedCount: 5 - missingItems.length,
            nextAction,
          };
        });

        const linkedSlots = pageDetails.reduce((sum, item) => sum + item.linkedCount, 0);
        const totalSlots = pageDetails.length * 5;
        const coverageScore = totalSlots > 0 ? Math.round((linkedSlots / totalSlots) * 100) : 0;
        const missingCount = totalSlots - linkedSlots;
        const spotlight = pageDetails
          .slice()
          .sort((left, right) => {
            const missingDelta = right.missingItems.length - left.missingItems.length;
            if (missingDelta !== 0) return missingDelta;
            return left.pageTitle.localeCompare(right.pageTitle, 'zh-CN');
          })[0];
        const primaryPath = pageDetails.find((item) => item.matchedPath)?.matchedPath || null;
        const statusTone = coverageScore >= 70 ? 'online' : coverageScore >= 40 ? 'degraded' : 'offline';
        const statusLabel = coverageScore >= 70 ? '成型' : coverageScore >= 40 ? '观察' : '缺口';

        return {
          id: `architecture-group-${group}`,
          group,
          pageCount: groupPages.length,
          usagePathCount: linkedPathIds.size,
          featureDomainCount: linkedFeatureDomainIds.size,
          playbookCount: linkedPlaybookIds.size,
          roadmapCount: linkedRoadmapIds.size,
          taskCount: linkedTaskIds.size,
          coverageScore,
          missingCount,
          spotlightTitle: spotlight?.pageTitle || groupPages[0]?.label || group,
          summary: GROUP_DESCRIPTIONS[group] || `${group} 需要明确入口、能力域和任务承接。`,
          nextAction: spotlight?.nextAction || '先从系统地图确认这一组页面的实际落点。',
          statusTone,
          statusLabel,
          target: { tab: spotlight?.pageId || groupPages[0]?.tab || 'SystemMap' },
          pathTarget: primaryPath ? { tab: 'SystemMap', usagePathId: primaryPath.id } : null,
          pathTitle: primaryPath?.title || primaryPath?.id || null,
        };
      })
      .filter((row): row is ArchitectureGroupRow => Boolean(row));
  }, [cockpitPages, featureDomains, playbooks, roadmapItems, shellTaskDrafts, sidebarUsagePaths]);
  const usageModeRows = useMemo<UsageModeRow[]>(() => {
    const rows = sidebarUsagePaths.map((path) => {
      const pageIds = (path.pages || []).map((page) => page.id).filter(Boolean) as string[];
      const pageTitles = pageIds.map((pageId) => cockpitPages.find((page) => page.id === pageId)?.title
        || searchTargets.find((target) => target.tab === pageId)?.label
        || pageId);
      const matchedPlaybooks = playbooks.filter((playbook) => (playbook.steps || []).some((step) => {
        const pageId = step.page_id || step.page?.id;
        return Boolean(pageId) && pageIds.includes(pageId);
      }));
      const matchedRoadmapItems = roadmapItems.filter((item) => item.cockpit_page && pageIds.includes(item.cockpit_page));
      const matchedTasks = shellTaskDrafts.filter((task) =>
        pageIds.some((pageId, index) => taskDraftMatchesPage(task, pageId, pageTitles[index] || pageId))
        || normalizeSearchText(task.title || '').includes(normalizeSearchText(path.title || path.id))
        || normalizeSearchText(task.description || '').includes(normalizeSearchText(path.title || path.id)),
      );
      const attentionCount = siteClosureRows.filter((row) => pageIds.includes(row.pageId) && row.missingItems.length > 0).length;
      const missingSignals = [
        matchedPlaybooks.length === 0,
        matchedRoadmapItems.length === 0,
        matchedTasks.length === 0,
        attentionCount > 1,
      ].filter(Boolean).length;
      const statusTone = missingSignals === 0 ? 'online' : missingSignals <= 2 ? 'degraded' : 'offline';
      const statusLabel = missingSignals === 0 ? '顺手可用' : missingSignals <= 2 ? '可走待补' : '断链较多';
      return {
        id: `usage-mode-${path.id}`,
        title: path.title || path.id,
        intent: path.intent || '从这条路径进入 cockpit。',
        entryTitle: pageTitles[0] || '未登记首站',
        preview: usagePathPreviewText(path),
        playbookCount: matchedPlaybooks.length,
        roadmapCount: matchedRoadmapItems.length,
        taskCount: matchedTasks.length,
        attentionCount,
        statusTone,
        statusLabel,
        target: { tab: 'SystemMap', usagePathId: path.id },
        taskTarget: { tab: 'TaskCenter', taskQuery: path.title || path.id },
      };
    });

    return rows.sort((left, right) => {
      const leftActive = left.preview.includes(currentCockpitPage?.title || currentPageTarget?.label || activeTab) ? 1 : 0;
      const rightActive = right.preview.includes(currentCockpitPage?.title || currentPageTarget?.label || activeTab) ? 1 : 0;
      if (rightActive !== leftActive) return rightActive - leftActive;
      const attentionDelta = right.attentionCount - left.attentionCount;
      if (attentionDelta !== 0) return attentionDelta;
      return left.title.localeCompare(right.title, 'zh-CN');
    });
  }, [activeTab, cockpitPages, currentCockpitPage, currentPageTarget, playbooks, roadmapItems, shellTaskDrafts, sidebarUsagePaths, siteClosureRows]);
  const priorityRouteRows = useMemo<PriorityRouteRow[]>(() => {
    const items: PriorityRouteRow[] = [];

    (sidebarProjectPortfolio?.weakestDimensions || []).forEach((dimension) => {
      items.push({
        id: `priority-dimension-${dimension.id}`,
        title: `覆盖维度：${dimension.title || dimension.id}`,
        kind: '覆盖维度',
        summary: `${dimension.score ?? 0}% · 缺口 ${dimension.failed ?? 0} · 提醒 ${dimension.warning ?? 0}`,
        nextAction: '先从系统地图的覆盖维度面收敛缺口，再决定分配到哪条执行链。',
        statusTone: (dimension.score ?? 0) >= 70 ? 'online' : (dimension.score ?? 0) >= 40 ? 'degraded' : 'offline',
        statusLabel: (dimension.score ?? 0) >= 70 ? '稳定' : (dimension.score ?? 0) >= 40 ? '观察' : '优先修',
        target: { tab: 'SystemMap', coverageDimensionId: dimension.id },
        secondaryTarget: { tab: 'TaskCenter', taskQuery: dimension.id },
      });
    });

    capabilityGaps.forEach((gap) => {
      items.push({
        id: `priority-gap-${gap.id}`,
        title: `能力缺口：${gap.title || gap.id}`,
        kind: `能力缺口 · ${gap.severity || 'unknown'}`,
        summary: gap.evidence || '当前缺口仍缺少更强证据。',
        nextAction: gap.next || '先把缺口转成明确任务再推进。',
        statusTone: gap.severity === 'high' ? 'offline' : gap.severity === 'medium' ? 'degraded' : 'online',
        statusLabel: gap.severity === 'high' ? '优先修' : gap.severity === 'medium' ? '观察' : '稳定',
        target: { tab: 'SystemMap', gapId: gap.id },
        secondaryTarget: { tab: 'TaskCenter', taskQuery: gap.id },
      });
    });

    roadmapItems.forEach((item) => {
      items.push({
        id: `priority-roadmap-${item.id}`,
        title: `路线图：${item.title || item.id}`,
        kind: `路线图 · ${item.priority || 'unknown'}`,
        summary: item.problem || '当前路线图项还缺少问题说明。',
        nextAction: item.actions?.[0] || item.acceptance?.[0] || '先回系统地图看它挂在哪个页面和能力域上。',
        statusTone: item.stage === 'now' ? 'offline' : item.stage === 'next' ? 'degraded' : 'online',
        statusLabel: item.stage === 'now' ? '现在修' : item.stage === 'next' ? '下一步' : '观察',
        target: { tab: 'SystemMap', pageId: item.cockpit_page || null },
        secondaryTarget: { tab: 'TaskCenter', taskQuery: item.id },
      });
    });

    (sidebarProjectPortfolio?.priorityProjects || []).forEach((project) => {
      items.push({
        id: `priority-project-${project.id}`,
        title: `项目修复：${project.id}`,
        kind: `项目组合 · ${project.layer || 'unknown'}`,
        summary: project.primary_gap || '当前项目还缺少主要缺口说明。',
        nextAction: project.next_action || '先回系统地图核实项目真实状态和落点。',
        statusTone: project.status === 'blocked' ? 'offline' : project.status === 'at_risk' ? 'degraded' : 'online',
        statusLabel: project.status === 'blocked' ? '阻塞' : project.status === 'at_risk' ? '风险' : '观察',
        target: { tab: 'SystemMap', projectId: project.id },
        secondaryTarget: { tab: 'TaskCenter', taskQuery: project.id },
      });
    });

    return items
      .sort((left, right) => {
        const toneWeight: Record<string, number> = { offline: 0, degraded: 1, online: 2 };
        const toneDelta = (toneWeight[left.statusTone] ?? 3) - (toneWeight[right.statusTone] ?? 3);
        if (toneDelta !== 0) return toneDelta;
        return left.title.localeCompare(right.title, 'zh-CN');
      })
      .slice(0, 8);
  }, [capabilityGaps, roadmapItems, sidebarProjectPortfolio]);
  const executionLaneRows = useMemo<ExecutionLaneRow[]>(() => {
    const usageRows = sidebarUsagePaths.slice(0, 3).map((path) => {
      const pageIds = (path.pages || []).map((page) => page.id).filter(Boolean) as string[];
      const matchedPlaybook = playbooks.find((playbook) => (playbook.steps || []).some((step) => {
        const pageId = step.page_id || step.page?.id;
        return Boolean(pageId) && pageIds.includes(pageId);
      })) || null;
      const matchedStep = matchedPlaybook?.steps?.find((step) => {
        const pageId = step.page_id || step.page?.id;
        return Boolean(pageId) && pageIds.includes(pageId);
      }) || null;
      const matchedTask = shellTaskDrafts.find((task) =>
        normalizeSearchText(task.title || '').includes(normalizeSearchText(path.title || path.id))
        || normalizeSearchText(task.description || '').includes(normalizeSearchText(path.title || path.id)),
      ) || null;
      const missingCount = siteClosureRows.filter((row) => pageIds.includes(row.pageId) && row.missingItems.length > 0).length;
      const statusTone = missingCount === 0 ? 'online' : missingCount <= 1 ? 'degraded' : 'offline';
      const statusLabel = missingCount === 0 ? '可直接执行' : missingCount <= 1 ? '可走待补' : '需先补链';
      return {
        id: `execution-usage-${path.id}`,
        title: path.title || path.id,
        kind: '使用模式',
        summary: path.intent || usagePathPreviewText(path),
        action: matchedStep?.action || `按 ${path.title || path.id} 的路径顺序逐页巡检。`,
        evidence: matchedStep?.evidence || matchedStep?.done_when || matchedTask?.title || '当前还没有显式验收证据，建议先去任务中心补草稿。',
        statusTone,
        statusLabel,
        primaryTarget: { tab: 'SystemMap', usagePathId: path.id },
        secondaryTarget: { tab: 'TaskCenter', taskQuery: matchedTask?.source?.id || matchedTask?.title || path.title || path.id },
      };
    });

    const domainRows = (shellDomainApps?.items || [])
      .slice()
      .sort((left, right) => domainAppActionScore(right) - domainAppActionScore(left))
      .slice(0, 3)
      .map((app) => {
        const posture = app.security_summary?.posture || app.runtime?.status || 'unknown';
        const statusTone = posture === 'passed' || posture === 'ready' ? 'online' : posture === 'warn' || posture === 'stopped' ? 'degraded' : 'offline';
        const statusLabel = posture === 'passed' || posture === 'ready' ? '可挂载' : posture === 'warn' || posture === 'stopped' ? '需关注' : '待处理';
        const command = app.commands?.start || app.commands?.verify || '';
        return {
          id: `execution-domain-${app.id}`,
          title: app.name || app.id,
          kind: `领域应用 · ${app.domain?.name || app.domain?.id || 'unknown'}`,
          summary: app.description || '去应用中心确认运行态与入口状态。',
          action: command || '先回应用中心确认入口、权限和运行态。',
          evidence: `${app.runtime?.status || 'unknown'} · ${app.freshness?.status || 'unknown'} · ${app.auth?.type || 'unknown'}`,
          command: command || undefined,
          statusTone,
          statusLabel,
          primaryTarget: { tab: 'DomainApps', taskQuery: app.id },
          secondaryTarget: { tab: 'TaskCenter', taskQuery: app.id },
        };
      });

    const routeRows = priorityRouteRows.slice(0, 2).map((row) => ({
      id: `execution-route-${row.id}`,
      title: row.title,
      kind: row.kind,
      summary: row.summary,
      action: row.nextAction,
      evidence: `当前状态：${row.statusLabel}`,
      statusTone: row.statusTone,
      statusLabel: row.statusLabel,
      primaryTarget: row.target,
      secondaryTarget: row.secondaryTarget,
    }));

    return [...usageRows, ...domainRows, ...routeRows].slice(0, 8);
  }, [playbooks, priorityRouteRows, shellDomainApps, shellTaskDrafts, sidebarUsagePaths, siteClosureRows]);
  const domainOperationRows = useMemo<DomainOperationRow[]>(() => (
    (shellDomainApps?.items || [])
      .slice()
      .sort((left, right) => domainAppActionScore(right) - domainAppActionScore(left))
      .map((app) => {
        const runtimeLabel = app.runtime?.status || 'unknown';
        const freshnessLabel = app.freshness?.status || 'unknown';
        const securityLabel = app.security_summary?.posture || 'unknown';
        const authLabel = app.auth?.type || 'unknown';
        const launchUrl = app.links?.launch_url || app.runtime?.launch?.url || '未登记入口 URL';
        const apiUrl = app.links?.api_url || app.runtime?.api?.url || '未登记 API URL';
        const statusTone = securityLabel === 'passed' && runtimeLabel === 'ready'
          ? 'online'
          : securityLabel === 'warn' || runtimeLabel === 'stopped'
            ? 'degraded'
            : 'offline';
        const statusLabel = statusTone === 'online'
          ? '可挂载'
          : statusTone === 'degraded'
            ? '需关注'
            : '待处理';

        return {
          id: `domain-operation-${app.id}`,
          title: app.name || app.id,
          domainLabel: app.domain?.name || app.domain?.id || '未分组',
          runtimeLabel,
          authLabel,
          freshnessLabel,
          securityLabel,
          launchUrl,
          apiUrl,
          startCommand: app.commands?.start,
          verifyCommand: app.commands?.verify,
          statusTone,
          statusLabel,
          primaryTarget: { tab: 'DomainApps', taskQuery: app.id },
          secondaryTarget: { tab: 'TaskCenter', taskQuery: app.id },
        };
      })
  ), [shellDomainApps]);
  const currentPageWorkbenchRows = useMemo<PageWorkbenchRow[]>(() => {
    const pageLabel = currentCockpitPage?.title || currentPageTarget?.label || activeTab;
    const rows: PageWorkbenchRow[] = [];
    const currentPageMissingCount = [
      !currentPagePrimaryPath,
      currentPageFeatureDomains.length === 0,
      currentPagePlaybooks.length === 0,
      currentPageRoadmapItems.length === 0,
      !currentPageDraft,
    ].filter(Boolean).length;
    const siblingPage = activeGroupPages.find((page) => page.tab !== activeTab) || activeGroupPages[0] || null;
    const groupEntryTarget = siblingPage ? { tab: siblingPage.tab } : { tab: 'SystemMap' };

    if (currentPagePrimaryPath) {
      const pathPageIds = (currentPagePrimaryPath.pages || []).map((page) => page.id).filter(Boolean) as string[];
      const pathMissingCount = siteClosureRows.filter((row) => pathPageIds.includes(row.pageId) && row.missingItems.length > 0).length;
      rows.push({
        id: `page-workbench-path-${currentPagePrimaryPath.id}`,
        title: `${pageLabel} · 路径工作台`,
        laneLabel: '首选使用路径',
        summary: currentPagePrimaryPath.intent || usagePathPreviewText(currentPagePrimaryPath),
        nextAction: currentPagePrimaryPath.steps?.[0]
          ? `从“${currentPagePrimaryPath.steps[0]}”开始，把 ${pageLabel} 放回 ${currentPagePrimaryPath.title || currentPagePrimaryPath.id} 这条日常链路。`
          : `把 ${pageLabel} 放回 ${currentPagePrimaryPath.title || currentPagePrimaryPath.id} 的稳定使用路径里。`,
        evidence: `${(currentPagePrimaryPath.pages || []).length} 页串联 · ${pathMissingCount} 个页面待补链`,
        statusTone: pathMissingCount === 0 ? 'online' : pathMissingCount === 1 ? 'degraded' : 'offline',
        statusLabel: pathMissingCount === 0 ? '路径完整' : pathMissingCount === 1 ? '可走待补' : '断链较多',
        primaryTarget: { tab: 'SystemMap', usagePathId: currentPagePrimaryPath.id },
        primaryLabel: '打开路径',
        secondaryTarget: {
          tab: 'TaskCenter',
          taskQuery: currentPageDraft?.source?.id || currentPageDraft?.title || currentPagePrimaryPath.title || currentPagePrimaryPath.id,
        },
        secondaryLabel: '承接任务',
      });
    }

    if (currentPageDraft || currentPageMaturity || currentPageRoadmapItems[0]) {
      const leadRoadmap = currentPageRoadmapItems[0] || null;
      const maturityTone = currentPageMaturity?.status === 'ready'
        ? 'online'
        : currentPageMaturity?.status === 'watch'
          ? 'degraded'
          : currentPageMaturity
            ? 'offline'
            : leadRoadmap?.stage === 'now'
              ? 'offline'
              : 'degraded';
      const maturityLabel = currentPageMaturity
        ? currentPageMaturity.status === 'ready'
          ? '页面成型'
          : currentPageMaturity.status === 'watch'
            ? '页面观察'
            : '页面待补'
        : leadRoadmap?.stage === 'now'
          ? '现在修'
          : '下一步';

      rows.push({
        id: `page-workbench-deliver-${activeTab}`,
        title: `${pageLabel} · 页面补位`,
        laneLabel: currentPageDraft
          ? `当前草稿 · ${currentPageDraft.draft?.kind || 'draft'}`
          : currentPageMaturity
            ? `成熟度 · ${maturityStatusText(currentPageMaturity.status)}`
            : `路线图 · ${leadRoadmap?.priority || leadRoadmap?.stage || 'unknown'}`,
        summary: currentPageDraft?.title || leadRoadmap?.title || `${pageLabel} 的承接面还需要继续补齐。`,
        nextAction: currentPageDraft?.description
          || currentPageMaturity?.next_action
          || leadRoadmap?.actions?.[0]
          || `继续把 ${pageLabel} 的动作、证据和任务链补齐。`,
        evidence: currentPageMaturity
          ? `${currentPageMaturity.score} 分 · ${maturityStatusText(currentPageMaturity.status)}`
          : leadRoadmap?.acceptance?.[0]
            || currentPageDraft?.source?.title
            || '先补页面级验收证据。',
        statusTone: maturityTone,
        statusLabel: maturityLabel,
        primaryTarget: currentPageDraft
          ? { tab: 'TaskCenter', taskQuery: currentPageDraft.source?.id || currentPageDraft.title || currentPageDraft.id }
          : { tab: 'SystemMap', pageId: activeTab },
        primaryLabel: currentPageDraft ? '打开任务' : '打开页面',
        secondaryTarget: currentPageDraft
          ? { tab: 'SystemMap', pageId: activeTab }
          : { tab: 'TaskCenter', taskQuery: currentPageDraft?.source?.id || currentPageDraft?.title || pageLabel },
        secondaryLabel: currentPageDraft ? '查看页面' : '打开任务',
      });
    }

    if (activeGroupLabel === '入口') {
      rows.push({
        id: `page-workbench-group-${activeTab}`,
        title: `${pageLabel} · 入口分发`,
        laneLabel: '入口工作带',
        summary: activeGroupDescription || '入口页负责把用户送进正确的全站工作流。',
        nextAction: `先用 ${pageLabel} 判断这次是日常巡检、治理收敛、开发排障还是进入领域应用。`,
        evidence: `同组 ${activeGroupPages.length} 页 · 推荐路径 ${currentPagePrimaryPath?.title || '未登记'}`,
        statusTone: currentPagePrimaryPath ? 'online' : 'degraded',
        statusLabel: currentPagePrimaryPath ? '入口成型' : '入口待补',
        primaryTarget: groupEntryTarget,
        primaryLabel: '打开同组页',
        secondaryTarget: currentPagePrimaryPath ? { tab: 'SystemMap', usagePathId: currentPagePrimaryPath.id } : { tab: 'SystemMap', pageId: activeTab },
        secondaryLabel: currentPagePrimaryPath ? '查看路径' : '查看页面',
      });
    }

    if (activeGroupLabel === '开发工具') {
      rows.push({
        id: `page-workbench-group-${activeTab}`,
        title: `${pageLabel} · 开发排障链`,
        laneLabel: '开发工具联动',
        summary: '日志、性能、任务和沙箱应该是一条连续的排障动作链，而不是几张互相不认的页面。',
        nextAction: groupEntryTarget.tab !== activeTab
          ? `从 ${pageLabel} 切到同组页面继续核实排障链，别让动作断在单页。`
          : `继续把 ${pageLabel} 接回任务和验证动作。`,
        evidence: `同组 ${activeGroupPages.length} 页 · 缺口 ${currentPageMissingCount} 项`,
        statusTone: currentPageMissingCount === 0 ? 'online' : currentPageMissingCount <= 2 ? 'degraded' : 'offline',
        statusLabel: currentPageMissingCount === 0 ? '链路顺畅' : currentPageMissingCount <= 2 ? '可走待补' : '需先补链',
        primaryTarget: groupEntryTarget,
        primaryLabel: '打开联动页',
        secondaryTarget: currentPagePrimaryPath ? { tab: 'SystemMap', usagePathId: currentPagePrimaryPath.id } : { tab: 'TaskCenter', taskQuery: pageLabel },
        secondaryLabel: currentPagePrimaryPath ? '查看路径' : '打开任务',
      });
    }

    if (activeGroupLabel === '运行大盘' && priorityRouteRows[0]) {
      const focusRoute = priorityRouteRows[0];
      rows.push({
        id: `page-workbench-group-${activeTab}`,
        title: `${pageLabel} · 运行收口`,
        laneLabel: focusRoute.kind,
        summary: focusRoute.summary,
        nextAction: focusRoute.nextAction,
        evidence: `当前状态：${focusRoute.statusLabel}`,
        statusTone: focusRoute.statusTone,
        statusLabel: focusRoute.statusLabel,
        primaryTarget: focusRoute.target,
        primaryLabel: '打开路线',
        secondaryTarget: focusRoute.secondaryTarget,
        secondaryLabel: '打开任务',
      });
    }

    if (activeGroupLabel === '系统治理') {
      const governanceFocus = priorityRouteRows.find((row) => row.kind.includes('能力缺口') || row.kind.includes('项目组合')) || priorityRouteRows[0];
      if (governanceFocus) {
        rows.push({
          id: `page-workbench-group-${activeTab}`,
          title: `${pageLabel} · 治理收敛`,
          laneLabel: governanceFocus.kind,
          summary: governanceFocus.summary,
          nextAction: governanceFocus.nextAction,
          evidence: `当前状态：${governanceFocus.statusLabel}`,
          statusTone: governanceFocus.statusTone,
          statusLabel: governanceFocus.statusLabel,
          primaryTarget: governanceFocus.target,
          primaryLabel: '打开治理对象',
          secondaryTarget: governanceFocus.secondaryTarget,
          secondaryLabel: '打开任务',
        });
      }
    }

    if (activeGroupLabel === '智能与知识') {
      const knowledgeDomain = currentPageFeatureDomains[0];
      rows.push({
        id: `page-workbench-group-${activeTab}`,
        title: `${pageLabel} · 知识执行链`,
        laneLabel: knowledgeDomain ? `能力域 · ${knowledgeDomain.coverage || 'unknown'}` : '知识链路',
        summary: knowledgeDomain
          ? `${pageLabel} 已挂在 ${knowledgeDomain.title || knowledgeDomain.id} 这条知识执行线上。`
          : '这类页面需要把研究、知识、引擎和协议串成一条稳定执行链。',
        nextAction: knowledgeDomain
          ? `继续确认 ${knowledgeDomain.title || knowledgeDomain.id} 对 ${pageLabel} 的输入、输出和任务承接。`
          : `先把 ${pageLabel} 补进能力域和任务承接。`,
        evidence: knowledgeDomain
          ? `${(knowledgeDomain.providers || []).length} 个 provider · ${(knowledgeDomain.capability_items || []).length} 项能力`
          : `缺口 ${currentPageMissingCount} 项`,
        statusTone: knowledgeDomain ? (knowledgeDomain.coverage === 'native' ? 'online' : 'degraded') : 'offline',
        statusLabel: knowledgeDomain ? (knowledgeDomain.coverage === 'native' ? '链路成型' : '链路待补') : '待建链',
        primaryTarget: knowledgeDomain ? { tab: 'SystemMap', featureDomainId: knowledgeDomain.id } : { tab: 'SystemMap', pageId: activeTab },
        primaryLabel: knowledgeDomain ? '打开能力域' : '打开页面',
        secondaryTarget: { tab: 'TaskCenter', taskQuery: currentPageDraft?.source?.id || currentPageDraft?.title || pageLabel },
        secondaryLabel: '打开任务',
      });
    }

    if (activeGroupLabel === '领域应用') {
      const focusApp = (shellDomainApps?.items || [])
        .slice()
        .sort((left, right) => domainAppActionScore(right) - domainAppActionScore(left))[0];
      if (focusApp) {
        rows.push({
          id: `page-workbench-group-${activeTab}`,
          title: `${pageLabel} · 领域挂载`,
          laneLabel: `应用中心 · ${focusApp.domain?.name || focusApp.domain?.id || 'unknown'}`,
          summary: focusApp.description || '先确认领域应用的入口、认证和运行态。',
          nextAction: focusApp.commands?.start || focusApp.commands?.verify || '回应用中心继续处理挂载和验收。',
          evidence: `${focusApp.runtime?.status || 'unknown'} · ${focusApp.security_summary?.posture || 'unknown'} · ${focusApp.auth?.type || 'unknown'}`,
          statusTone: focusApp.security_summary?.posture === 'passed'
            ? (focusApp.runtime?.status === 'ready' ? 'online' : 'degraded')
            : 'offline',
          statusLabel: focusApp.security_summary?.posture === 'passed'
            ? (focusApp.runtime?.status === 'ready' ? '可挂载' : '需拉起')
            : '安全待补',
          primaryTarget: { tab: 'DomainApps', taskQuery: focusApp.id },
          primaryLabel: '打开应用',
          secondaryTarget: { tab: 'TaskCenter', taskQuery: focusApp.id },
          secondaryLabel: '打开任务',
        });
      }
    }

    if (activeGroupLabel === '系统配置') {
      const configApp = (shellDomainApps?.items || []).find((app) => app.auth?.type) || (shellDomainApps?.items || [])[0];
      rows.push({
        id: `page-workbench-group-${activeTab}`,
        title: `${pageLabel} · 配置收口`,
        laneLabel: '底层设置',
        summary: '权限、入口、命令和阈值最后都会回到底层设置收口，不然驾驶舱只能看不能控。',
        nextAction: configApp?.auth?.type
          ? `先确认 ${configApp.name || configApp.id} 的认证方式和入口配置，再回设置页固化默认值。`
          : `先补一条真实配置收口链，别让设置页悬空。`,
        evidence: configApp?.auth?.type
          ? `${configApp.auth.type} · ${configApp.runtime?.status || 'unknown'}`
          : `缺口 ${currentPageMissingCount} 项`,
        statusTone: configApp?.auth?.type ? 'degraded' : 'offline',
        statusLabel: configApp?.auth?.type ? '配置待收口' : '待补位',
        primaryTarget: configApp ? { tab: 'DomainApps', taskQuery: configApp.id } : { tab: 'SystemMap', pageId: activeTab },
        primaryLabel: configApp ? '打开应用' : '打开页面',
        secondaryTarget: { tab: 'TaskCenter', taskQuery: pageLabel },
        secondaryLabel: '打开任务',
      });
    }

    const dedupedRows = rows.filter((row, index, allRows) => allRows.findIndex((item) => item.title === row.title) === index);
    return dedupedRows.slice(0, 3);
  }, [
    activeGroupDescription,
    activeGroupLabel,
    activeGroupPages,
    activeTab,
    currentCockpitPage,
    currentPageDraft,
    currentPageFeatureDomains,
    currentPageMaturity,
    currentPagePlaybooks,
    currentPagePrimaryPath,
    currentPageRoadmapItems,
    currentPageTarget,
    priorityRouteRows,
    shellDomainApps,
    siteClosureRows,
  ]);

  const overviewTiles = useMemo<DashboardOverviewTile[]>(() => [
    {
      id: 'overview-pages',
      title: '页面覆盖',
      value: shellSourceAvailability.systemMap ? `${sidebarCoverage?.summary.score ?? 0}%` : 'N/A',
      detail: shellSourceAvailability.systemMap ? `就绪 ${sidebarCoverage?.summary.ready ?? 0} · 缺口 ${sidebarCoverage?.summary.gap ?? 0}` : '页面覆盖数据不可用',
      target: { tab: 'SystemMap' },
    },
    {
      id: 'overview-projects',
      title: '项目组合',
      value: shellSourceAvailability.systemMap ? `${sidebarProjectPortfolio?.summary.score ?? 0}%` : 'N/A',
      detail: shellSourceAvailability.systemMap ? `阻塞 ${sidebarProjectPortfolio?.summary.blocked ?? 0} · 风险 ${sidebarProjectPortfolio?.summary.at_risk ?? 0}` : '项目组合数据不可用',
      target: { tab: 'SystemMap', projectId: sidebarProjectPortfolio?.priorityProjects?.[0]?.id || null },
    },
    {
      id: 'overview-domains',
      title: '领域挂载',
      value: shellSourceAvailability.domainApps ? String(shellDomainApps?.summary?.total ?? 0) : 'N/A',
      detail: shellSourceAvailability.domainApps ? `就绪 ${shellDomainApps?.summary?.ready ?? 0} · 待承接 ${domainDraftCount}` : '领域挂载数据不可用',
      target: { tab: 'DomainApps', taskQuery: shellDomainApps?.items?.[0]?.id || firstDomainDraft?.source?.id || '' },
    },
    {
      id: 'overview-tasks',
      title: '任务草稿',
      value: shellSourceAvailability.tasks ? String(shellTaskDrafts.length) : 'N/A',
      detail: shellSourceAvailability.tasks ? `当前焦点 ${shellTaskDrafts[0]?.title || '未登记'}` : '任务草稿数据不可用',
      target: { tab: 'TaskCenter', taskQuery: shellTaskDrafts[0]?.source?.id || shellTaskDrafts[0]?.title || '' },
    },
    {
      id: 'overview-paths',
      title: '使用路径',
      value: shellSourceAvailability.systemMap ? String(sidebarUsagePaths.length) : 'N/A',
      detail: shellSourceAvailability.systemMap ? `当前分区 ${activeGroupLabel || '未归类'} · 首推 ${contextualUsagePaths[0]?.title || '未登记'}` : '使用路径数据不可用',
      target: { tab: 'SystemMap', usagePathId: contextualUsagePaths[0]?.id || null },
    },
  ], [activeGroupLabel, contextualUsagePaths, domainDraftCount, firstDomainDraft, shellDomainApps, shellSourceAvailability, shellTaskDrafts, sidebarCoverage, sidebarProjectPortfolio, sidebarUsagePaths.length]);

  const setActiveTab = (tab: string) => {
    setFocusedProjectId(null);
    setFocusedUsagePathId(null);
    setFocusedGapId(null);
    setFocusedCoverageDimensionId(null);
    setFocusedPageId(null);
    setFocusedFeatureDomainId(null);
    setTaskSearchSeed('');
    setTaskDraftKey(null);
    setAlertTab(null);
    setMobileNavOpen(false);
    setActiveTabState(tab);
    writeNavigationHash({ tab });
  };

  const openContextTarget = (target: CockpitNavigationTarget) => {
    const matchedDraft = findTaskDraftForTarget(target, shellTaskDrafts);
    const incomingDraft = matchedDraft ? taskDraftToIncomingDraft(matchedDraft) : null;
    const resolvedDraftKey = target.draftKey || (incomingDraft ? persistTaskCenterDraft(incomingDraft) : null);
    setFocusedProjectId(target.projectId || null);
    setFocusedUsagePathId(target.usagePathId || null);
    setFocusedGapId(target.gapId || null);
    setFocusedCoverageDimensionId(target.coverageDimensionId || null);
    setFocusedPageId(target.pageId || null);
    setFocusedFeatureDomainId(target.featureDomainId || null);
    setTaskSearchSeed(target.taskQuery || '');
    setTaskDraftKey(resolvedDraftKey);
    setAlertTab(target.alertTab || null);
    setMobileNavOpen(false);
    setActiveTabState(target.tab);
    writeNavigationHash({
      ...target,
      draftKey: resolvedDraftKey || undefined,
    });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const target = parseNavigationHash(window.location.hash);
      if (!target) return;
      setFocusedProjectId(target.projectId || null);
      setFocusedUsagePathId(target.usagePathId || null);
      setFocusedGapId(target.gapId || null);
      setFocusedCoverageDimensionId(target.coverageDimensionId || null);
      setFocusedPageId(target.pageId || null);
      setFocusedFeatureDomainId(target.featureDomainId || null);
      setTaskSearchSeed(target.taskQuery || '');
      setTaskDraftKey(target.draftKey || null);
      setAlertTab(target.alertTab || null);
      setActiveTabState(target.tab);
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (pageSprintRows.length === 0) {
      if (pageSprintFocusId) setPageSprintFocusId('');
      return;
    }
    if (!pageSprintFocusId || !pageSprintRows.some((row) => row.pageId === pageSprintFocusId)) {
      setPageSprintFocusId(pageSprintRows[0].pageId);
    }
  }, [pageSprintFocusId, pageSprintRows]);

  useEffect(() => {
    const focusGlobalSearch = () => {
      setSearchQuery('');
      globalSearchInputRef.current?.focus();
    };

    const exportSnapshot = async () => {
      setSnapshotExportState('exporting');
      const endpoints = {
        system_map: '/api/cockpit/system-map',
        tasks: '/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80',
        domain_apps: '/api/domain-apps',
        alerts: '/api/alerts?limit=80',
        mesh_services: '/api/bos/services',
        compute_status: '/api/governance/compute/status',
        logs: '/api/logs?limit=100',
        research: '/api/cockpit/research-hub',
        metaos_workflows: '/api/metaos/workflows',
        skills: '/api/ecos/skills',
        pipelines: '/api/pipelines',
        ecos_workflows: '/api/ecos/workflows',
        health_summary: '/api/health/summary',
        metrics_trend: '/api/metrics/trend?range=24h',
        omo_thoughts: '/api/omos/thoughts',
        services: '/api/services',
        services_status: '/api/services/status',
        bos_health: '/api/bos/health',
        bos_metrics: '/api/bos/metrics',
        kos_health: '/api/kos/health',
        kos_stats: '/api/kos/stats',
        l4_health: '/api/l4/health',
        l4_signals: '/api/l4/signals',
        l4_trend: '/api/l4/trend',
        debt: '/api/debt',
        omos_status: '/api/omos/status',
        omos_violations: '/api/omos/violations',
        governance_cards: '/api/cards',
        governance_proposals: '/api/v1/proposals',
        protocol_hub: '/api/cockpit/protocol-hub',
        opc_workspace: '/api/opc/workspace',
        architecture_health: '/api/v1/arch-health',
        metrics_history: '/api/metrics/history',
        ecos_health: '/api/ecos/health',
        ecos_status: '/api/ecos/status',
        convergence_status: '/api/convergence/status',
        governance_summary: '/api/governance/summary',
        omo_report: '/api/omo-report',
        protocols: '/api/protocols',
        m0_status: '/api/v1/m0',
        runtime_status: '/api/v1/status',
        engine_events: '/api/events',
        api_version: '/api/version',
        api_version_history: '/api/version/history',
      } as const;
      try {
        const snapshot = await Promise.all(Object.entries(endpoints).map(async ([key, url]) => {
          try {
            const response = await fetch(url);
            const data = await response.json().catch(() => null);
            return [key, { ok: response.ok, status: response.status, data }] as const;
          } catch (error) {
            return [key, { ok: false, status: null, error: error instanceof Error ? error.message : '读取失败' }] as const;
          }
        }));
        const payload = {
          schema_version: 2,
          generated_at: new Date().toISOString(),
          source: 'cockpit-ui',
          active_tab: activeTab,
          endpoint_count: Object.keys(endpoints).length,
          endpoints: Object.fromEntries(snapshot),
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = `cockpit-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(objectUrl);
        setSnapshotExportState('success');
      } catch (error) {
        console.error('Failed to export cockpit snapshot:', error);
        setSnapshotExportState('error');
      }
    };

    const refreshCurrentPage = () => setPageRefreshToken((value) => value + 1);

    window.addEventListener('cockpit:focus-search', focusGlobalSearch);
    window.addEventListener('cockpit:export-snapshot', exportSnapshot);
    window.addEventListener('cockpit:refresh-page', refreshCurrentPage);
    return () => {
      window.removeEventListener('cockpit:focus-search', focusGlobalSearch);
      window.removeEventListener('cockpit:export-snapshot', exportSnapshot);
      window.removeEventListener('cockpit:refresh-page', refreshCurrentPage);
    };
  }, [activeTab]);

  const openSearchTarget = (target: SearchTarget) => {
    const matchedDraft = target.context?.draftId
      ? shellTaskDrafts.find((task) => task.id === target.context?.draftId) || null
      : null;
    const incomingDraft = matchedDraft ? taskDraftToIncomingDraft(matchedDraft) : null;
    const draftKey = incomingDraft ? persistTaskCenterDraft(incomingDraft) : null;
    openContextTarget({
      tab: target.tab,
      projectId: target.context?.projectId || null,
      usagePathId: target.context?.usagePathId || null,
      gapId: target.context?.gapId || null,
      coverageDimensionId: target.context?.coverageDimensionId || null,
      pageId: target.context?.pageId || null,
      featureDomainId: target.context?.featureDomainId || null,
      taskQuery: target.context?.taskQuery || '',
      alertTab: target.context?.alertTab || null,
      draftKey,
    });
    setSearchQuery('');
  };

  const commandPaletteCommands = [
    ...COCKPIT_PAGE_REGISTRY.map((page) => ({
      id: page.id.toLowerCase(),
      label: page.title,
      description: `${page.purpose} ${page.whenToUse}`,
      action: () => setActiveTab(page.id),
    })),
    ...dynamicSearchTargets
      .filter((target) => !target.id.startsWith('page-'))
      .slice(0, 80)
      .map((target) => ({
        id: `dynamic-${target.id}`,
        label: target.label,
        description: `${target.group} · ${target.keywords.slice(0, 3).filter(Boolean).join(' / ')}`,
        action: () => openSearchTarget(target),
      })),
  ];

  const openSidebarProject = (projectId: string) => {
    openContextTarget({ tab: 'SystemMap', projectId });
  };

  // 命令面板
  const { isOpen: isCommandPaletteOpen, open: openCommandPalette, close: closeCommandPalette, toggle: toggleCommandPalette } = useCommandPalette();

  // 快捷操作面板
  const { isOpen: isQuickActionsOpen, open: openQuickActions, close: closeQuickActions } = useQuickActions();

  // 键盘快捷键
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'k', ctrl: true, description: '切换命令面板', action: toggleCommandPalette },
      { key: 'j', ctrl: true, description: '打开快捷操作', action: openQuickActions },
      { key: '1', ctrl: true, description: '首页', action: () => setActiveTab('Home') },
      { key: '2', ctrl: true, description: '概览', action: () => setActiveTab('Overview') },
      { key: '3', ctrl: true, description: '告警', action: () => setActiveTab('AlertCenter') },
      { key: '4', ctrl: true, description: '日志', action: () => setActiveTab('LogViewer') },
      { key: '5', ctrl: true, description: '任务', action: () => setActiveTab('TaskCenter') },
      { key: 'n', ctrl: true, description: '打开任务中心', action: () => setActiveTab('TaskCenter') },
      { key: 'l', ctrl: true, description: '打开日志', action: () => setActiveTab('LogViewer') },
      { key: 'f', ctrl: true, shift: true, description: '聚焦全局搜索', action: () => { setSearchQuery(''); globalSearchInputRef.current?.focus(); } },
      { key: '`', ctrl: true, description: '打开隔离沙箱', action: () => setActiveTab('Sandbox') },
      { key: 'a', ctrl: true, description: '打开告警中心', action: () => setActiveTab('AlertCenter') },
      { key: 'r', ctrl: true, description: '刷新当前页面数据', action: () => setPageRefreshToken((value) => value + 1) },
      { key: ',', ctrl: true, description: '打开系统设置', action: () => setActiveTab('Settings') },
    ],
  });

  useEffect(() => {
    const buildDynamicSearch = async () => {
      try {
        const [systemMapRes, tasksRes, domainAppsRes, alertsRes, alertRulesRes, meshServicesRes, computeStatusRes, logsRes, researchRes, metaosWorkflowsRes, skillsRes, pipelinesRes, ecosWorkflowsRes, debtRes, l4HealthRes, proposalsRes, gbrainAgentsRes, questsRes] = await Promise.all([
          fetchSearchData('/api/cockpit/system-map'),
          fetchSearchData('/api/tasks?include_playbook_drafts=true&include_project_portfolio_drafts=true&include_verification_ready_drafts=true&include_domain_app_drafts=true&include_capability_gap_drafts=true&include_page_maturity_drafts=true&limit=80'),
          fetchSearchData('/api/domain-apps'),
          fetchSearchData('/api/alerts?limit=80'),
          fetchSearchData('/api/alerts/rules'),
          fetchSearchData('/api/bos/services'),
          fetchSearchData('/api/governance/compute/status'),
          fetchSearchData('/api/logs?limit=100'),
          fetchSearchData('/api/cockpit/research-hub'),
          fetchSearchData('/api/metaos/workflows'),
          fetchSearchData('/api/ecos/skills'),
          fetchSearchData('/api/pipelines'),
          fetchSearchData('/api/ecos/workflows'),
          fetchSearchData('/api/debt'),
          fetchSearchData('/api/l4/health'),
          fetchSearchData('/api/v1/proposals'),
          fetchSearchData('/admin/api/agents'),
          fetchSearchData('/api/omos/quests'),
        ]);
        setShellSourceAvailability({
          systemMap: systemMapRes.ok,
          tasks: tasksRes.ok,
          domainApps: domainAppsRes.ok,
        });
        const targets: SearchTarget[] = [];
        const sourceFailures = [
          ['系统地图', systemMapRes],
          ['任务中心', tasksRes],
          ['领域应用', domainAppsRes],
          ['告警中心', alertsRes],
          ['网格服务', meshServicesRes],
          ['算力状态', computeStatusRes],
          ['日志', logsRes],
          ['研究中枢', researchRes],
          ['MetaOS 工作流', metaosWorkflowsRes],
          ['技能资产', skillsRes],
          ['工具管线', pipelinesRes],
          ['资产工作流', ecosWorkflowsRes],
          ['技术债务', debtRes],
          ['L4 域健康', l4HealthRes],
          ['C2G 提案', proposalsRes],
        ] as const;
        setShellDataWarnings(
          sourceFailures
            .filter(([, result]) => !result.ok)
            .map(([label, result]) => `${label}（${result.error || '暂不可用'}）`),
        );

        if (systemMapRes.ok) {
          const systemMap = (systemMapRes.data || {}) as Record<string, any>;
          const cockpitPages: SearchCockpitPage[] = systemMap.cockpit_pages || [];
          setCockpitPages(cockpitPages);
          const pageMaturity = systemMap.page_maturity;
          setPageMaturityItems((pageMaturity?.items || []) as PageMaturityItem[]);
          if (pageMaturity?.summary) {
            const statusWeight: Record<string, number> = { gap: 0, watch: 1, ready: 2 };
            const attentionItems = ((pageMaturity.items || []) as PageMaturityItem[])
              .filter((item) => item.status !== 'ready')
              .sort((a, b) => {
                const statusDelta = (statusWeight[a.status] ?? 3) - (statusWeight[b.status] ?? 3);
                if (statusDelta !== 0) return statusDelta;
                return a.score - b.score;
              });
            setSidebarCoverage({
              summary: pageMaturity.summary,
              attentionItems,
            });
          }
          const projectPortfolio = systemMap.project_portfolio;
          if (projectPortfolio?.summary) {
            setSidebarProjectPortfolio({
              summary: projectPortfolio.summary,
              priorityProjects: projectPortfolio.priority_projects || [],
              weakestDimensions: projectPortfolio.weakest_dimensions || [],
            });
          }
          const usagePaths: SearchUsagePath[] = systemMap.usage_paths || [];
          setSidebarUsagePaths(usagePaths);
          const usagePathContextForPage = (pageId?: string) => {
            const usagePathId = pageId
              ? usagePaths.find((path) => path.pages?.some((page) => page.id === pageId))?.id
              : undefined;
            return usagePathId ? { usagePathId } : undefined;
          };
          const usagePathContextForPages = (pageIds: string[]) => {
            const usagePathId = usagePaths.find((path) =>
              path.pages?.some((page) => page.id && pageIds.includes(page.id)),
            )?.id;
            return usagePathId ? { usagePathId } : undefined;
          };

          const pageGroups = cockpitPages.reduce<Record<string, SearchCockpitPage[]>>((accumulator, page) => {
            const key = page.group || '未分组';
            accumulator[key] = accumulator[key] || [];
            accumulator[key].push(page);
            return accumulator;
          }, {});

          cockpitPages.forEach((page) => {
            targets.push({
              id: `cockpit-page-${page.id}`,
              tab: page.id,
              label: `页面：${page.title || page.id}`,
              group: `页面 · ${page.group || '未分组'}`,
              keywords: [
                page.id,
                page.title || '',
                page.group || '',
                page.purpose || '',
                ...(page.dimensions || []),
                '页面',
                '入口',
                '功能架构',
              ],
            });
          });

          Object.entries(pageGroups).forEach(([group, pages]) => {
            targets.push({
              id: `page-group-${group}`,
              tab: pages[0]?.id || 'SystemMap',
              label: `页面分组：${group}`,
              group: `功能架构 · ${pages.length} 页`,
              keywords: [
                group,
                ...pages.flatMap((page) => [page.id, page.title || '', page.purpose || '']),
                '页面分组',
                '入口',
                '导航',
                '功能架构',
              ],
            });
          });

          usagePaths.forEach((path) => {
            targets.push({
              id: `usage-path-${path.id}`,
              tab: 'SystemMap',
              label: `使用路径：${path.title || path.id}`,
              group: '使用路径',
              context: { usagePathId: path.id },
              keywords: [
                path.id,
                path.title || '',
                path.intent || '',
                ...(path.steps || []),
                ...(path.pages || []).flatMap((page) => [page.id || '', page.title || '', page.purpose || '']),
                'usage',
                'path',
                '使用路径',
                '工作台',
              ],
            });
          });

          const playbooks: SearchPlaybook[] = systemMap.playbooks || [];
          setPlaybooks(playbooks);
          playbooks.forEach((playbook) => {
            const pageIds = (playbook.steps || [])
              .map((step) => step.page_id || step.page?.id || '')
              .filter(Boolean);
            targets.push({
              id: `playbook-${playbook.id}`,
              tab: 'SystemMap',
              label: `操作清单：${playbook.title || playbook.id}`,
              group: '操作清单',
              context: usagePathContextForPages(pageIds),
              keywords: [
                playbook.id,
                playbook.title || '',
                playbook.goal || '',
                playbook.frequency || '',
                playbook.owner || '',
                playbook.risk || '',
                ...(playbook.steps || []).flatMap((step) => [
                  step.page_id || '',
                  step.page?.title || '',
                  step.action || '',
                  step.evidence || '',
                  step.done_when || '',
                ]),
                'playbook',
                '操作清单',
                '使用',
              ],
            });
          });

          const featureDomains: SearchFeatureDomain[] = systemMap.feature_domains || [];
          setFeatureDomains(featureDomains);
          featureDomains.forEach((domain) => {
            targets.push({
              id: `feature-domain-${domain.id}`,
              tab: 'SystemMap',
              label: `能力域：${domain.title || domain.id}`,
              group: `功能域 · ${domain.coverage || 'unknown'}`,
              context: {
                ...usagePathContextForPage(domain.cockpit_page),
                featureDomainId: domain.id,
              },
              keywords: [
                domain.id,
                domain.title || '',
                domain.english || '',
                domain.cockpit_page || '',
                domain.coverage || '',
                ...(domain.capability_items || []),
                ...(domain.providers || []),
                'feature',
                'domain',
                '能力域',
                '功能域',
              ],
            });
          });

          const roadmapItems: SearchRoadmapItem[] = systemMap.roadmap?.items || [];
          setRoadmapItems(roadmapItems);
          const roadmapLanes: SearchRoadmapLane[] = systemMap.roadmap?.lanes || [];
          roadmapItems.forEach((item) => {
            targets.push({
              id: `roadmap-${item.id}`,
              tab: 'SystemMap',
              label: `路线图：${item.title || item.id}`,
              group: `路线图 · ${item.priority || 'unknown'}`,
              context: usagePathContextForPage(item.cockpit_page),
              keywords: [
                item.id,
                item.title || '',
                item.priority || '',
                item.stage || '',
                item.status || '',
                item.domain || '',
                item.cockpit_page || '',
                item.problem || '',
                ...(item.actions || []),
                ...(item.acceptance || []),
                'roadmap',
                '路线图',
                '缺功能',
              ],
            });
          });

          roadmapLanes.forEach((lane) => {
            targets.push({
              id: `roadmap-lane-${lane.id}`,
              tab: 'SystemMap',
              label: `路线图车道：${lane.title || lane.id}`,
              group: `路线图 · ${lane.count ?? 0} 项`,
              keywords: [
                lane.id,
                lane.title || '',
                String(lane.count ?? ''),
                '路线图',
                '车道',
                '阶段',
                '优先级',
              ],
            });
          });

          const gaps: SearchCapabilityGap[] = systemMap.gaps || [];
          setCapabilityGaps(gaps);
          gaps.forEach((gap) => {
            targets.push({
              id: `capability-gap-${gap.id}`,
              tab: 'SystemMap',
              label: `能力缺口：${gap.title || gap.id}`,
              group: `能力缺口 · ${gap.severity || 'unknown'}`,
              context: { gapId: gap.id },
              keywords: [
                gap.id,
                gap.title || '',
                gap.severity || '',
                gap.evidence || '',
                gap.next || '',
                'gap',
                '缺口',
                '缺功能',
                '能力不足',
              ],
            });
          });

          const priorityProjects: SearchPriorityProject[] = systemMap.project_portfolio?.priority_projects || [];
          priorityProjects.forEach((project) => {
            targets.push({
              id: `priority-project-${project.id}`,
              tab: 'SystemMap',
              label: `优先项目：${project.id}`,
              group: `项目组合 · ${project.layer || 'unknown'}`,
              context: { projectId: project.id },
              keywords: [
                project.id,
                project.layer || '',
                project.status || '',
                project.primary_gap || '',
                project.next_action || '',
                'priority',
                'portfolio',
                '项目组合',
                '优先项目',
              ],
            });
          });

          const projects: SearchProject[] = systemMap.projects || [];
          projects.forEach((project) => {
            targets.push({
              id: `project-${project.id}`,
              tab: 'SystemMap',
              label: `项目：${project.id}`,
              group: `项目 · ${project.layer || 'unknown'}`,
              context: { projectId: project.id },
              keywords: [
                project.id,
                project.layer || '',
                project.stack || '',
                project.role || '',
                project.cockpit_page || '',
                project.operational?.next_action || '',
                ...(project.operational?.risks || []),
                project.portfolio?.status || '',
                project.portfolio?.primary_gap || '',
                project.portfolio?.next_action || '',
              ],
            });
          });

          const searchablePageMaturityItems = ((pageMaturity?.attention_items as PageMaturityItem[] | undefined)
            || (pageMaturity?.items as PageMaturityItem[] | undefined)?.filter((item) => item.status !== 'ready')
            || []);

          searchablePageMaturityItems.forEach((item: PageMaturityItem) => {
            const pageId = item.page?.id || item.page_id;
            targets.push({
              id: `page-maturity-${pageId}`,
              tab: 'SystemMap',
              label: `页面能力：${item.page?.title || pageId}`,
              group: `页面成熟度 · ${item.status || 'unknown'}`,
              context: {
                ...usagePathContextForPage(pageId),
                pageId,
              },
              keywords: [
                pageId,
                item.page?.title || '',
                item.page?.group || '',
                item.status || '',
                item.next_action || '',
                'page',
                '页面',
                '页面成熟度',
                '能力不足',
              ],
            });
          });

          (projectPortfolio?.weakest_dimensions || []).forEach((dimension: SidebarWeakestDimension) => {
            targets.push({
              id: `coverage-dimension-${dimension.id}`,
              tab: 'SystemMap',
              label: `覆盖维度：${dimension.title || dimension.id}`,
              group: `能力矩阵 · ${dimension.score ?? 0}%`,
              context: { coverageDimensionId: dimension.id },
              keywords: [
                dimension.id,
                dimension.title || '',
                String(dimension.score ?? ''),
                String(dimension.failed ?? ''),
                String(dimension.warning ?? ''),
                'coverage',
                'dimension',
                '覆盖维度',
                '修复台',
              ],
            });
          });
        }
        else {
          setSidebarCoverage(null);
          setSidebarProjectPortfolio(null);
          setSidebarUsagePaths([]);
          setCockpitPages([]);
          setPageMaturityItems([]);
          setFeatureDomains([]);
          setPlaybooks([]);
          setRoadmapItems([]);
          setCapabilityGaps([]);
        }

        if (tasksRes.ok) {
          const tasks = (tasksRes.data || {}) as { items?: SearchTaskDraft[] };
          const drafts: SearchTaskDraft[] = tasks.items || [];
          setShellTaskDrafts(drafts);
          drafts.forEach((task) => {
              const isDraft = task.read_only === true || Boolean(task.source?.type);
              const group = task.source?.type === 'system_map_project_portfolio'
                ? '项目组合草稿'
                : task.source?.type === 'system_map_verification_ready'
                  ? '验证补证草稿'
                : task.source?.type === 'system_map_domain_app'
                  ? '领域应用草稿'
                  : task.source?.type === 'system_map_capability_gap'
                    ? '能力缺口草稿'
                    : task.source?.type === 'system_map_page_maturity'
                    ? '页面能力草稿'
                      : isDraft ? '操作清单草稿' : `任务 · ${task.status || 'pending'}`;
              targets.push({
                id: `${isDraft ? 'task-draft' : 'task'}-${task.id}`,
                tab: 'TaskCenter',
                label: `${isDraft ? '任务草稿' : '任务'}：${task.title || task.id}`,
                group,
                context: {
                  taskQuery: isDraft ? (task.source?.id || task.title || task.id) : task.id,
                  ...(isDraft ? { draftId: task.id } : {}),
                },
                keywords: [
                  task.id,
                  task.title || '',
                  task.description || '',
                  task.status || '',
                  task.priority || '',
                  task.source?.id || '',
                  task.source?.title || '',
                  task.draft?.kind || '',
                  ...(task.source?.type === 'system_map_verification_ready' ? ['verification', '验证', '补证', '验证补证'] : []),
                  ...(task.tags || []),
                  ...(task.source?.type === 'system_map_capability_gap' ? ['gap', '缺口', '能力缺口', '能力不足'] : []),
                  ...(task.source?.type === 'system_map_page_maturity' ? ['page', '页面', '页面能力', '成熟度', '能力不足'] : []),
                  ...(isDraft ? ['draft', '草稿'] : ['active', '正式任务', '受治理']),
                  '任务',
                ],
              });
            });
        }
        else {
          setShellTaskDrafts([]);
        }

        if (domainAppsRes.ok) {
          const domainApps = (domainAppsRes.data || {}) as SearchDomainAppsPayload;
          setShellDomainApps(domainApps);
          const apps = domainApps.items || [];

          apps.forEach((app) => {
            targets.push({
              id: `domain-app-${app.id}`,
              tab: 'DomainApps',
              label: `领域应用：${app.name || app.id}`,
              group: `领域应用 · ${app.domain?.name || app.domain?.id || '未分组'}`,
              context: { taskQuery: app.id },
              keywords: [
                app.id,
                app.name || '',
                app.domain?.id || '',
                app.domain?.name || '',
                app.description || '',
                app.category || '',
                app.risk_level || '',
                app.runtime?.status || '',
                app.runtime?.launch?.status || '',
                app.runtime?.api?.status || '',
                app.auth?.type || '',
                app.freshness?.status || '',
                app.security_summary?.posture || '',
                app.commands?.start || '',
                app.commands?.verify || '',
                app.links?.launch_url || '',
                app.links?.api_url || '',
                'domain',
                'app',
                '领域应用',
                '应用中心',
                '领域挂载',
              ],
            });
          });

          if (domainApps.summary?.total) {
            targets.push({
              id: 'domain-apps-registry',
              tab: 'DomainApps',
              label: '应用中心：领域挂载总览',
              group: `领域应用 · ${domainApps.summary.total} 个应用`,
              keywords: [
                String(domainApps.summary.total || ''),
                String(domainApps.summary.ready || ''),
                String(domainApps.summary.security_attention_apps || ''),
                'domain',
                'apps',
                'registry',
                '应用中心',
                '领域挂载',
                '家庭驾驶舱',
                'opc',
                'family-hub',
              ],
            });
          }
        }
        else {
          setShellDomainApps(null);
        }

        if (alertsRes.ok) {
          const alertsPayload = (alertsRes.data || {}) as { items?: SearchAlert[] };
          const alerts: SearchAlert[] = alertsPayload.items || [];
          alerts.forEach((alert) => {
            const status = alert.status || 'active';
            targets.push({
              id: `alert-${alert.id}`,
              tab: 'AlertCenter',
              label: `告警：${alert.message || alert.id}`,
              group: `告警 · ${alert.level || 'unknown'} · ${status}`,
              context: { taskQuery: alert.id, alertTab: status === 'active' ? 'active' : 'history' },
              keywords: [
                alert.id,
                alert.level || '',
                status,
                alert.source || '',
                alert.message || '',
                alert.description || '',
                'alert',
                '告警',
                '异常',
              ],
            });
          });
        }

        if (alertRulesRes.ok) {
          const rulesPayload = (alertRulesRes.data || {}) as { items?: SearchAlertRule[] };
          (rulesPayload.items || []).forEach((rule) => {
            if (!rule.id) return;
            targets.push({
              id: `alert-rule-${rule.id}`,
              tab: 'AlertCenter',
              label: `告警规则：${rule.name || rule.id}`,
              group: `告警规则 · ${rule.enabled === false ? '已停用' : rule.level || 'unknown'}`,
              context: { taskQuery: rule.name || rule.id, alertTab: 'rules' },
              keywords: [
                rule.id,
                rule.name || '',
                rule.condition || '',
                rule.level || '',
                ...(rule.channels || []),
                rule.enabled === false ? 'disabled' : 'enabled',
                'alert rule',
                '告警规则',
                '规则',
              ],
            });
          });
        }

        if (meshServicesRes.ok) {
          const meshPayload = (meshServicesRes.data || {}) as { services?: Array<{ uri?: string; domain?: string; action?: string; transport?: string }> };
          const services = meshPayload.services || [];
          services.forEach((service: { uri?: string; domain?: string; action?: string; transport?: string }) => {
            if (!service.uri) return;
            targets.push({
              id: `mesh-route-${service.uri}`,
              tab: 'McpMesh',
              label: `网格路由：${service.uri}`,
              group: `网格路由 · ${service.domain || '未分域'}`,
              context: { taskQuery: service.uri },
              keywords: [
                service.uri,
                service.domain || '',
                service.action || '',
                service.transport || '',
                'mesh',
                'MCP',
                '网格',
                '路由',
              ],
            });
          });
        }

        if (computeStatusRes.ok) {
          const computePayload = (computeStatusRes.data || {}) as { nodes?: Array<{ id?: string; name?: string; model?: string; type?: string; status?: string }>; quota?: { quota?: { provider?: string; available?: boolean; error?: unknown }[] } };
          (computePayload.nodes || []).forEach((node: { id?: string; name?: string; model?: string; type?: string; status?: string }) => {
            if (!node.id) return;
            targets.push({
              id: `compute-node-${node.id}`,
              tab: 'Compute',
              label: `算力节点：${node.name || node.id}`,
              group: `算力节点 · ${node.status || 'unknown'}`,
              context: { taskQuery: node.id },
              keywords: [node.id, node.name || '', node.model || '', node.type || '', node.status || '', 'compute', '算力', '节点'],
            });
          });
          ((computePayload.quota?.quota || []) as { provider?: string; available?: boolean; error?: unknown }[]).forEach((provider) => {
            if (!provider.provider) return;
            targets.push({
              id: `compute-provider-${provider.provider}`,
              tab: 'Compute',
              label: `算力供应商：${provider.provider}`,
              group: `算力配额 · ${provider.available === false ? '异常' : '可用'}`,
              context: { taskQuery: provider.provider },
              keywords: [provider.provider, provider.available === false ? 'unavailable' : 'available', String(provider.error || ''), 'compute', '算力', '配额', '供应商'],
            });
          });
        }

        if (logsRes.ok) {
          const logsPayload = (logsRes.data || {}) as { items?: Array<{ source?: string; level?: string; message?: string }> };
          const logs = logsPayload.items || [];
          const sources = new globalThis.Map<string, { level?: string; message?: string }>();
          logs.forEach((log: { source?: string; level?: string; message?: string }) => {
            if (log.source && !sources.has(log.source)) sources.set(log.source, log);
          });
          sources.forEach((log, source) => {
            targets.push({
              id: `log-source-${source}`,
              tab: 'LogViewer',
              label: `日志来源：${source}`,
              group: `运行日志 · ${log.level || 'unknown'}`,
              context: { taskQuery: source },
              keywords: [source, log.level || '', log.message || '', 'logs', '日志', '运行证据'],
            });
          });
        }

        if (researchRes.ok) {
          const researchPayload = (researchRes.data || {}) as { recent?: SearchResearchItem[] };
          const researchItems: SearchResearchItem[] = researchPayload.recent || [];
          researchItems.forEach((item) => {
            const id = String(item.id);
            targets.push({
              id: `research-${id}`,
              tab: 'Research',
              label: `研究：${item.topic || id}`,
              group: `研究对象 · ${item.status || 'unknown'}`,
              context: { taskQuery: id },
              keywords: [
                id,
                item.topic || '',
                item.summary || '',
                item.status || '',
                item.agent || '',
                item.next_action || '',
                ...(item.tags || []),
                'research',
                '研究',
                '知识',
              ],
            });
          });
        }

        if (metaosWorkflowsRes.ok) {
          const workflowsPayload = (metaosWorkflowsRes.data || {}) as { workflows?: SearchMetaosWorkflow[] };
          const workflows: SearchMetaosWorkflow[] = workflowsPayload.workflows || [];
          workflows.forEach((workflow) => {
            const id = workflow.workflow_id || workflow.id;
            if (!id) return;
            targets.push({
              id: `metaos-workflow-${id}`,
              tab: 'Workflows',
              label: `运行工作流：${id}`,
              group: `MetaOS 工作流 · ${workflow.status || 'unknown'}`,
              context: { taskQuery: id },
              keywords: [
                id,
                workflow.task || '',
                workflow.status || '',
                workflow.created || '',
                workflow.updated || '',
                'workflow',
                '工作流',
                '运行链',
              ],
            });
          });
        }

        if (skillsRes.ok) {
          const skillsPayload = (skillsRes.data || {}) as { skills?: SearchAssetSkill[] };
          const skills: SearchAssetSkill[] = skillsPayload.skills || [];
          skills.forEach((skill) => {
            targets.push({
              id: `asset-skill-${skill.id}`,
              tab: 'Assets',
              label: `技能资产：${skill.name || skill.id}`,
              group: '技术资产 · 技能',
              context: { taskQuery: skill.id },
              keywords: [
                skill.id,
                skill.name || '',
                skill.description || '',
                skill.source || '',
                skill.path || '',
                'asset',
                'skill',
                '技术资产',
                '技能',
              ],
            });
          });
        }

        if (pipelinesRes.ok) {
          const pipelinesPayload = (pipelinesRes.data || {}) as { pipelines?: string[] };
          const pipelines: string[] = pipelinesPayload.pipelines || [];
          pipelines.forEach((pipeline) => {
            targets.push({
              id: `asset-pipeline-${pipeline}`,
              tab: 'Assets',
              label: `工具管线：${pipeline}`,
              group: '技术资产 · 管线',
              context: { taskQuery: pipeline },
              keywords: [pipeline, 'asset', 'pipeline', '技术资产', '工具管线'],
            });
          });
        }

        if (ecosWorkflowsRes.ok) {
          const workflowsPayload = (ecosWorkflowsRes.data || {}) as { workflows?: SearchAssetWorkflow[] };
          const workflows: SearchAssetWorkflow[] = workflowsPayload.workflows || [];
          workflows.forEach((workflow) => {
            targets.push({
              id: `asset-workflow-${workflow.name}`,
              tab: 'Assets',
              label: `资产工作流：${workflow.name}`,
              group: '技术资产 · 工作流',
              context: { taskQuery: workflow.name },
              keywords: [
                workflow.name,
                workflow.description || '',
                String(workflow.steps ?? ''),
                'asset',
                'workflow',
                '技术资产',
                '工作流',
              ],
            });
          });
        }

        if (debtRes.ok) {
          const debtPayload = (debtRes.data || {}) as {
            items?: Array<{
              id?: string;
              title?: string;
              severity?: string;
              lifecycle_state?: string;
              owner?: string;
              dimension?: string;
            }>;
          };
          (debtPayload.items || []).forEach((item) => {
            if (!item.id) return;
            targets.push({
              id: `debt-${item.id}`,
              tab: 'Debt',
              label: `技术债务：${item.title || item.id}`,
              group: `技术债务 · ${item.severity || item.lifecycle_state || 'unknown'}`,
              context: { taskQuery: item.id },
              keywords: [
                item.id,
                item.title || '',
                item.severity || '',
                item.lifecycle_state || '',
                item.owner || '',
                item.dimension || '',
                'debt',
                '技术债务',
                '治理风险',
              ],
            });
          });
        }

        if (l4HealthRes.ok) {
          const l4Payload = (l4HealthRes.data || {}) as {
            domains?: Array<{
              id?: string;
              name?: string;
              issue_count?: number;
              signal_count?: number;
              capabilities?: string[];
              fresh?: boolean;
            }>;
          };
          (l4Payload.domains || []).forEach((domain) => {
            if (!domain.id) return;
            targets.push({
              id: `l4-domain-${domain.id}`,
              tab: 'L4Health',
              label: `L4 域：${domain.name || domain.id}`,
              group: `L4 域健康 · ${domain.issue_count || domain.signal_count ? '需关注' : '正常'}`,
              context: { taskQuery: domain.id },
              keywords: [
                domain.id,
                domain.name || '',
                String(domain.issue_count ?? ''),
                String(domain.signal_count ?? ''),
                ...(domain.capabilities || []),
                domain.fresh === false ? 'stale' : 'fresh',
                'L4',
                '域健康',
                '风险',
              ],
            });
          });
        }

        if (proposalsRes.ok) {
          const proposalsPayload = (proposalsRes.data || {}) as {
            proposals?: Array<{
              id?: string;
              type?: string;
              status?: string;
              debt_id?: string;
              target_model?: string;
              scope?: string;
              description?: string;
            }>;
          };
          (proposalsPayload.proposals || []).forEach((proposal) => {
            if (!proposal.id) return;
            targets.push({
              id: `c2g-proposal-${proposal.id}`,
              tab: 'C2G',
              label: `C2G 提案：${proposal.id}`,
              group: `C2G 提案 · ${proposal.status || 'unknown'}`,
              context: { taskQuery: proposal.id },
              keywords: [
                proposal.id,
                proposal.type || '',
                proposal.status || '',
                proposal.debt_id || '',
                proposal.target_model || '',
                proposal.scope || '',
                proposal.description || '',
                'C2G',
                '提案',
                '治理决策',
              ],
            });
          });
        }

        if (gbrainAgentsRes.ok) {
          const payload = gbrainAgentsRes.data as
            | Array<Record<string, unknown>>
            | { agents?: Array<Record<string, unknown>>; items?: Array<Record<string, unknown>> }
            | null;
          const agents = Array.isArray(payload) ? payload : payload?.agents || payload?.items || [];
          agents.forEach((agent) => {
            const id = String(agent.id || agent.client_id || agent.name || '').trim();
            const name = String(agent.name || agent.client_name || id).trim();
            if (!id && !name) return;
            targets.push({
              id: `gbrain-agent-${id || name}`,
              tab: 'GBrainAdmin',
              label: `GBrain 智能体：${name}`,
              group: `GBrain 管理 · ${String(agent.status || 'unknown')}`,
              context: { taskQuery: `agent ${name}` },
              keywords: [id, name, String(agent.scope || ''), String(agent.auth_type || ''), String(agent.status || ''), 'GBrain', 'agent', '智能体', '凭证'],
            });
          });
        }

        if (questsRes.ok) {
          const questsPayload = (questsRes.data || {}) as { quests?: SearchQuest[] };
          (questsPayload.quests || []).forEach((quest) => {
            const id = String(quest.id || '').trim();
            if (!id) return;
            targets.push({
              id: `quest-${id}`,
              tab: 'QuestBoard',
              label: `家庭 Quest：${quest.title || id}`,
              group: `家庭任务 · ${quest.completed === 1 ? '已完成' : '进行中'}`,
              context: { taskQuery: id },
              keywords: [
                id,
                quest.title || '',
                quest.type || '',
                String(quest.reward ?? ''),
                String(quest.completed ?? ''),
                quest.assignee || '',
                'quest',
                '家庭',
                '积分',
                '成长',
              ],
            });
          });
        }

        setDynamicSearchTargets(targets);
      } catch (error) {
        console.error('Failed to build dynamic search targets:', error);
        setShellSourceAvailability({ systemMap: false, tasks: false, domainApps: false });
        setShellDataWarnings(['全站搜索数据（壳层请求异常）']);
        setDynamicSearchTargets([]);
        setSidebarUsagePaths([]);
        setShellTaskDrafts([]);
        setShellDomainApps(null);
        setCockpitPages([]);
        setPageMaturityItems([]);
        setFeatureDomains([]);
        setPlaybooks([]);
        setRoadmapItems([]);
        setCapabilityGaps([]);
      }
    };

    buildDynamicSearch();
    const interval = setInterval(buildDynamicSearch, 30000);
    return () => clearInterval(interval);
  }, [pageRefreshToken]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      setKnowledgeSearchTargets([]);
      return undefined;
    }

    setKnowledgeSearchTargets([]);
    let active = true;
    const timer = window.setTimeout(async () => {
      const response = await fetchSearchData(`/api/kos/search?q=${encodeURIComponent(query)}&limit=8`);
      if (!active || !response.ok) return;
      const payload = (response.data || {}) as { results?: unknown[]; items?: unknown[] };
      const records = Array.isArray(payload.results)
        ? payload.results
        : Array.isArray(payload.items)
          ? payload.items
          : [];
      const targets = records.flatMap((record, index) => {
        if (!record || typeof record !== 'object') return [];
        const item = record as Record<string, unknown>;
        const id = String(item.id || item.slug || item.title || `result-${index}`);
        const title = String(item.title || item.name || item.slug || id);
        const excerpt = String(item.chunk_text || item.content || item.text || '');
        return [{
          id: `kos-search-${id}-${index}`,
          tab: 'Knowledge',
          label: `知识证据：${title}`,
          group: '知识证据 · KOS',
          context: { taskQuery: id },
          keywords: [id, title, excerpt, 'KOS', '知识', '证据', '记忆', '上下文'],
        }];
      });
      setKnowledgeSearchTargets(targets);
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  // 面包屑
  const getBreadcrumbItems = () => {
    const items = [];
    const group = pageGroupLabel(activeTab);
    const groupEntryTab = group ? GROUP_ENTRY_TABS[group] : null;
    if (activeTab !== 'Home' && group && groupEntryTab) {
      items.push({
        label: group === '入口' ? '入口总览' : group,
        onClick: () => setActiveTab(groupEntryTab),
      });
    }
    items.push({ label: hero.title.split(' (')[0] });
    return items;
  };

  const getHeroContent = () => {
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
  };

  const hero = getHeroContent();

  const renderLazyView = (label: string, node: React.ReactNode) => (
    <Suspense fallback={<DashboardViewFallback label={label} />}>
      {node}
    </Suspense>
  );

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
      {mobileNavOpen && (
        <button
          type="button"
          className="mobile-nav-backdrop"
          aria-label="关闭主导航"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <aside role="complementary" aria-label="控制台侧边栏" className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-box" aria-hidden="true">
            <Activity size={18} />
          </div>
          <h2>Cockpit Console</h2>
          <button
            type="button"
            className="mobile-nav-close"
            aria-label="关闭主导航"
            onClick={() => setMobileNavOpen(false)}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <SidebarCoveragePanel coverage={sidebarCoverage} onOpenTarget={openContextTarget} />
        <SidebarProjectPortfolioPanel
          portfolio={sidebarProjectPortfolio}
          onOpenProject={openSidebarProject}
          onOpenSystemMap={() => setActiveTab('SystemMap')}
          onOpenDimension={(dimensionId) => openContextTarget({ tab: 'SystemMap', coverageDimensionId: dimensionId })}
        />
        <SidebarUsagePathsPanel
          paths={contextualUsagePaths}
          totalCount={sidebarUsagePaths.length}
          activeGroupLabel={activeGroupLabel}
          onOpenTarget={openContextTarget}
        />
        <SidebarGroupEntryPanel
          groupLabel={activeGroupLabel}
          description={activeGroupDescription}
          pages={activeGroupPages}
          activeTab={activeTab}
          primaryUsagePath={contextualUsagePaths[0] || null}
          onNavigate={setActiveTab}
          onOpenTarget={openContextTarget}
        />
        {shellActions.length > 0 && (
          <section className="sidebar-action-queue" aria-label="侧边推进队列">
            <div className="sidebar-action-queue-header">
              <strong>推进队列</strong>
              <span>{shellActions.length} 条</span>
            </div>
            <div className="sidebar-action-queue-list">
              {shellActions.map((item) => (
                <button
                  key={`sidebar-${item.id}`}
                  type="button"
                  className="sidebar-action-item"
                  aria-label={`侧边推进 ${item.title}`}
                  onClick={() => openContextTarget(item.target)}
                >
                  <div>
                    <span>{item.title}</span>
                    <small>{item.detail}</small>
                  </div>
                  <em>{item.badge}</em>
                </button>
              ))}
            </div>
          </section>
        )}
        
        <nav aria-label="控制台主导航" className="sidebar-nav" role="menu">
          {SIDEBAR_NAV_SECTIONS.map((section) => (
            <React.Fragment key={section.id}>
              <div className="nav-group-title" id={section.id}>{section.title}</div>
              {section.tabs.map((tab) => {
                const pageMeta = PAGE_REGISTRY_BY_ID.get(tab);
                const Icon = NAV_ICON_BY_TAB[tab] || LayoutDashboard;
                return (
                  <button
                    key={tab}
                    role="menuitem"
                    aria-describedby={section.id}
                    aria-selected={activeTab === tab}
                    className={`nav-item ${activeTab === tab ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                    style={tab === 'QuestBoard' ? { fontWeight: '500' } : undefined}
                  >
                    <Icon size={16} aria-hidden="true" className={tab === 'QuestBoard' ? 'text-warning' : undefined} />
                    <span>{pageMeta?.title || tab}</span>
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </nav>
      </aside>

      {/* Main Content Area (a11y skip target) */}
      <main id="main-content" tabIndex={-1} className="main-content" style={{ outline: 'none' }}>
        <header className="topbar">
          <button
            type="button"
            className="topbar-btn mobile-nav-toggle"
            aria-label={mobileNavOpen ? '关闭主导航' : '打开主导航'}
            aria-expanded={mobileNavOpen}
            onClick={() => setMobileNavOpen((open) => !open)}
          >
            {mobileNavOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
          </button>
          <div className="topbar-search-wrap" role="search">
            <div className="search-bar">
              <Search size={16} className="text-muted" aria-hidden="true" />
              <input
                ref={globalSearchInputRef}
                type="text"
                placeholder="搜索页面、项目、能力..."
                aria-label="全局搜索输入框"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && searchResults[0]) {
                    openSearchTarget(searchResults[0]);
                  }
                  if (event.key === 'Escape') {
                    setSearchQuery('');
                  }
                }}
              />
            </div>
            {searchQuery.trim() && (
              <div className="topbar-search-results">
                {searchResults.length > 0 ? searchResults.map((target) => (
                  <button
                    key={target.id}
                    className="topbar-search-result"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openSearchTarget(target)}
                  >
                    <span>{target.label}</span>
                    <small>{target.group} · {target.keywords.slice(0, 3).join(' / ')}</small>
                  </button>
                )) : (
                  <div className="topbar-search-empty">没有匹配入口</div>
                )}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="topbar-btn"
              aria-label="刷新当前页面数据"
              title="刷新当前页面数据"
              onClick={() => setPageRefreshToken((value) => value + 1)}
            >
              <RefreshCw size={16} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="topbar-btn"
              aria-label="导出全站运行快照"
              title="导出全站运行快照"
              disabled={snapshotExportState === 'exporting'}
              onClick={() => { window.dispatchEvent(new Event('cockpit:export-snapshot')); }}
            >
              <Download size={16} aria-hidden="true" />
            </button>
            {snapshotExportState !== 'idle' && (
              <span className="text-muted" role="status" aria-live="polite">
                {snapshotExportState === 'exporting' ? '导出中...' : snapshotExportState === 'success' ? '快照已导出' : '快照导出失败'}
              </span>
            )}
            <button
              className="topbar-btn"
              onClick={openCommandPalette}
              title="命令面板 (Ctrl+K)"
            >
              <Command size={16} />
            </button>
            <button
              className="topbar-btn"
              onClick={openQuickActions}
              title="快捷操作 (Ctrl+J)"
            >
              <Zap size={16} />
            </button>
          </div>
          <div className="user-profile" role="button" aria-label="个人中心，管理员" tabIndex={0}>
            <div className="avatar" aria-hidden="true">AD</div>
            <span>管理员</span>
          </div>
        </header>

        <div className="content-area">
          {/* 面包屑导航 */}
          {activeTab !== 'Home' && (
            <Breadcrumb items={getBreadcrumbItems()} />
          )}

          {shellDataWarnings.length > 0 && (
            <div className="overview-inline-error" role="alert" aria-label="全站数据源状态">
              <AlertTriangle size={16} aria-hidden="true" />
              <div>
                <strong>全站数据源有 {shellDataWarnings.length} 项不可用</strong>
                <span>{shellDataWarnings.slice(0, 4).join('、')}{shellDataWarnings.length > 4 ? `，另有 ${shellDataWarnings.length - 4} 项` : ''}。空状态不代表没有能力，先重试数据源。</span>
              </div>
              <button
                type="button"
                className="antd-btn small"
                aria-label="重试全站数据源"
                onClick={() => setPageRefreshToken((value) => value + 1)}
              >
                <RefreshCw size={13} aria-hidden="true" />
                <span>重试</span>
              </button>
            </div>
          )}

          {/* Keyed hero section triggers smooth fade transition upon menu selection */}
          <div key={activeTab} className="hero-section animate-fade-in">
            <h1 className="hero-title">{hero.title}</h1>
            <p className="hero-subtitle">{hero.subtitle}</p>
          </div>

          <section className="dashboard-page-context" role="region" aria-label="当前页面承接">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>当前页面承接</h2>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  把当前页放回整站链路里，直接告诉你它属于哪条工作带、建议怎么进入，以及下一步该承接到哪。
                </p>
              </div>
              <span className={`dashboard-page-context-status ${pageContextStatusClass(currentPageMaturity?.status)}`}>
                {currentPageMaturity ? `${maturityStatusText(currentPageMaturity.status)} ${currentPageMaturity.score}分` : '待补登记'}
              </span>
            </div>
            <div className="dashboard-page-context-grid">
              <article className="dashboard-page-context-card dashboard-page-context-card-primary">
                <span className="dashboard-page-context-label">页面定位</span>
                <strong>{currentCockpitPage?.title || currentPageTarget?.label || hero.title}</strong>
                <p>{currentCockpitPage?.purpose || activeGroupDescription || hero.subtitle}</p>
                <div className="dashboard-page-context-tags">
                  <span>{activeGroupLabel || '未归类'}</span>
                  {(currentCockpitPage?.dimensions || []).slice(0, 3).map((dimension) => (
                    <span key={dimension}>{dimension}</span>
                  ))}
                </div>
              </article>
              <article className="dashboard-page-context-card">
                <span className="dashboard-page-context-label">推荐路径</span>
                <strong>{currentPagePrimaryPath?.title || '暂未登记路径'}</strong>
                <p>
                  {currentPagePrimaryPath
                    ? (currentPagePrimaryPath.intent || usagePathPreviewText(currentPagePrimaryPath))
                    : '当前页还没被挂进使用路径，建议先去系统地图补齐入口。'}
                </p>
                {currentPagePrimaryPath && (
                  <small>{usagePathPreviewText(currentPagePrimaryPath)}</small>
                )}
              </article>
              <article className="dashboard-page-context-card">
                <span className="dashboard-page-context-label">覆盖状态</span>
                <strong>{currentPageMaturity ? `${maturityStatusText(currentPageMaturity.status)} · ${currentPageMaturity.score}分` : '未登记成熟度'}</strong>
                <p>{currentPageMaturity?.next_action || '当前页还没有明确的补位动作，先通过系统地图确认覆盖、任务和路径。'}</p>
                {currentPageDraft && (
                  <small>当前草稿：{currentPageDraft.title || currentPageDraft.id}</small>
                )}
              </article>
              <article className="dashboard-page-context-card">
                <span className="dashboard-page-context-label">关联牵引</span>
                <strong>{currentPageSignalItems.length > 0 ? `${currentPageSignalItems.length} 条关联线索` : '暂无关联牵引'}</strong>
                <p>
                  {currentPageSignalItems.length > 0
                    ? '能力域、操作清单和路线图会一起标出当前页在整站里的位置。'
                    : '这页还缺少显式的能力域、操作清单或路线图映射，适合优先补齐。'}
                </p>
                <div className="dashboard-page-context-signals">
                  {currentPageSignalItems.length > 0 ? currentPageSignalItems.map((item) => (
                    <span key={item.id}>
                      <em>{item.label}</em>
                      <strong>{item.value}</strong>
                    </span>
                  )) : (
                    <span>
                      <em>提示</em>
                      <strong>补领域映射或路线图</strong>
                    </span>
                  )}
                </div>
              </article>
            </div>
            <section className="dashboard-page-context-checklist" role="region" aria-label="当前页面缺口清单">
              {currentPageChecklist.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`dashboard-page-context-checklist-item ${pageContextChecklistStatusClass(item.status)}`}
                  aria-label={`打开当前页面链路 ${item.title}`}
                  onClick={() => openContextTarget(item.target)}
                >
                  <div>
                    <span>{item.title}</span>
                    <p>{item.detail}</p>
                  </div>
                  <small>{item.status === 'linked' ? '已接通' : '待补位'}</small>
                </button>
              ))}
            </section>
            <div className="dashboard-page-context-actions">
              <button
                type="button"
                className="antd-btn"
                aria-label={`查看当前页面覆盖 ${currentCockpitPage?.title || currentPageTarget?.label || activeTab}`}
                onClick={() => openContextTarget({ tab: 'SystemMap', pageId: activeTab })}
              >
                <Map size={14} />
                <span>查看页面覆盖</span>
              </button>
              {currentPagePrimaryPath && (
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={`打开当前页面路径 ${currentPagePrimaryPath.title || currentPagePrimaryPath.id}`}
                  onClick={() => openContextTarget({ tab: 'SystemMap', usagePathId: currentPagePrimaryPath.id })}
                >
                  <Compass size={14} />
                  <span>打开推荐路径</span>
                </button>
              )}
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开当前页面任务 ${currentCockpitPage?.title || currentPageTarget?.label || activeTab}`}
                onClick={() => openContextTarget({
                  tab: 'TaskCenter',
                  taskQuery: currentPageDraft?.source?.id || currentPageDraft?.title || currentCockpitPage?.title || currentPageTarget?.label || activeTab,
                })}
              >
                <ClipboardList size={14} />
                <span>打开任务承接</span>
              </button>
              <button
                type="button"
                className="antd-btn"
                aria-label={`打开当前工作带 ${activeGroupLabel || '未归类'}`}
                onClick={() => openContextTarget(currentGroupEntryTarget)}
              >
                <Briefcase size={14} />
                <span>打开当前工作带</span>
              </button>
            </div>
          </section>

          {currentPageExecutionRows.length > 0 && (
            <section className="dashboard-page-execution" role="region" aria-label="当前页执行与证据">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>当前页执行与证据</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    不只告诉你当前页属于哪里，也把它眼下能承接的动作、证据和任务来源直接摊开，方便就地继续做事。
                  </p>
                </div>
                <span className="status-badge degraded">
                  共 {currentPageExecutionRows.length} 条执行线索
                </span>
              </div>
              <div className="dashboard-page-execution-grid">
                {currentPageExecutionRows.map((row) => (
                  <article key={row.id} className="dashboard-page-execution-card" aria-label={`当前页执行 ${row.title}`}>
                    <div className="dashboard-page-execution-head">
                      <div>
                        <span>{row.sourceLabel}</span>
                        <strong>{row.title}</strong>
                      </div>
                      <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
                    </div>
                    <div className="dashboard-page-execution-detail">
                      <span>动作</span>
                      <strong>{row.action}</strong>
                    </div>
                    <div className="dashboard-page-execution-detail">
                      <span>证据</span>
                      <strong>{row.evidence}</strong>
                    </div>
                    <div className="dashboard-page-execution-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开当前页对象 ${row.title}`}
                        onClick={() => openContextTarget(row.primaryTarget)}
                      >
                        <ArrowRight size={14} />
                        <span>打开对象</span>
                      </button>
                      {row.secondaryTarget && (
                        <button
                          type="button"
                          className="antd-btn"
                          aria-label={`打开当前页任务 ${row.title}`}
                          onClick={() => openContextTarget(row.secondaryTarget || { tab: 'TaskCenter' })}
                        >
                          <ClipboardList size={14} />
                          <span>打开任务</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {currentPageWorkbenchRows.length > 0 && (
            <section className="dashboard-page-workbench" role="region" aria-label="关键页面专属工作台">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>关键页面专属工作台</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    把当前页最该做的路径、补位动作和同组联动压成一个小工作台，尽量做到看完就能直接开干。
                  </p>
                </div>
                <span className="status-badge degraded">
                  共 {currentPageWorkbenchRows.length} 个动作位
                </span>
              </div>
              <div className="dashboard-page-workbench-grid">
                {currentPageWorkbenchRows.map((row) => (
                  <article key={row.id} className="dashboard-page-workbench-card" aria-label={`页面工作台 ${row.title}`}>
                    <div className="dashboard-page-workbench-head">
                      <div>
                        <span>{row.laneLabel}</span>
                        <strong>{row.title}</strong>
                      </div>
                      <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
                    </div>
                    <p>{row.summary}</p>
                    <div className="dashboard-page-workbench-detail">
                      <span>下一步</span>
                      <strong>{row.nextAction}</strong>
                    </div>
                    <div className="dashboard-page-workbench-detail">
                      <span>验收线索</span>
                      <strong>{row.evidence}</strong>
                    </div>
                    <div className="dashboard-page-workbench-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开页面工作台对象 ${row.title}`}
                        onClick={() => openContextTarget(row.primaryTarget)}
                      >
                        <ArrowRight size={14} />
                        <span>{row.primaryLabel}</span>
                      </button>
                      {row.secondaryTarget && row.secondaryLabel && (
                        <button
                          type="button"
                          className="antd-btn"
                          aria-label={`打开页面工作台动作 ${row.title}`}
                          onClick={() => openContextTarget(row.secondaryTarget || { tab: 'TaskCenter' })}
                        >
                          <ClipboardList size={14} />
                          <span>{row.secondaryLabel}</span>
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          <section className="dashboard-overview-band" role="region" aria-label="整站能力总览">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>整站能力总览</h2>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  把页面、项目、领域挂载、任务和使用路径压成一层总览，先看全站面，再决定往哪一页深钻。
                </p>
              </div>
              <span className="status-badge degraded">
                当前分区 {activeGroupLabel || '未归类'}
              </span>
            </div>
            <div className="dashboard-overview-grid">
              {overviewTiles.map((item) => (
                <article key={item.id} className="dashboard-overview-tile">
                  <div>
                    <span>{item.title}</span>
                    <strong>{item.value}</strong>
                    <p>{item.detail}</p>
                  </div>
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={`打开总览 ${item.title}`}
                    onClick={() => openContextTarget(item.target)}
                  >
                    <ArrowRight size={14} />
                    <span>查看</span>
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-dimension-band" role="region" aria-label="覆盖维度盘点">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>覆盖维度盘点</h2>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  不只看页面和项目，把领域挂载、使用路径、能力域、操作清单、路线图和任务承接也一起盘，先确认整站有没有哪条腿还没站稳。
                </p>
              </div>
              <span className="status-badge degraded">
                共 {dimensionCoverageRows.length} 个维度
              </span>
            </div>
            <div className="dashboard-dimension-grid">
              {dimensionCoverageRows.map((row) => (
                <article key={row.id} className="dashboard-dimension-card" aria-label={`覆盖维度 ${row.title}`}>
                  <div className="dashboard-dimension-card-top">
                    <div>
                      <span>{row.title}</span>
                      <strong>{row.value}</strong>
                    </div>
                    <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
                  </div>
                  <p>{row.detail}</p>
                  <small>{row.risk}</small>
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={`打开覆盖维度 ${row.title}`}
                    onClick={() => openContextTarget(row.target)}
                  >
                    <ArrowRight size={14} />
                    <span>查看维度</span>
                  </button>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-architecture-band" role="region" aria-label="功能工作带矩阵">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>功能工作带矩阵</h2>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  把入口、运行、知识、治理、开发工具、领域应用和设置这些工作带逐个盘清楚，看它们是不是已经能独立承接“页面 - 路径 - 能力域 - 清单 - 路线图 - 任务”。
                </p>
              </div>
              <span className="status-badge degraded">
                工作带 {architectureGroupRows.length} 组
              </span>
            </div>
            <div className="dashboard-architecture-grid">
              {architectureGroupRows.map((row) => (
                <article key={row.id} className="dashboard-architecture-card" aria-label={`工作带架构 ${row.group}`}>
                  <div className="dashboard-architecture-card-top">
                    <div>
                      <strong>{row.group}</strong>
                      <small>{row.summary}</small>
                    </div>
                    <span className={`status-badge ${row.statusTone}`}>{row.statusLabel} {row.coverageScore}%</span>
                  </div>
                  <div className="dashboard-architecture-metrics">
                    <span>页面 {row.pageCount}</span>
                    <span>路径 {row.usagePathCount}</span>
                    <span>能力域 {row.featureDomainCount}</span>
                    <span>清单 {row.playbookCount}</span>
                    <span>路线图 {row.roadmapCount}</span>
                    <span>任务 {row.taskCount}</span>
                  </div>
                  <p>{row.nextAction}</p>
                  <div className="dashboard-architecture-footer">
                    <small>当前焦点：{row.spotlightTitle} · 缺口槽位 {row.missingCount}</small>
                    <div className="dashboard-architecture-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开工作带 ${row.group}`}
                        onClick={() => openContextTarget(row.target)}
                      >
                        <Briefcase size={14} />
                        <span>打开工作带</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={row.pathTitle ? `查看工作带路径 ${row.pathTitle}` : `查看工作带路径 ${row.group}`}
                        onClick={() => openContextTarget(row.pathTarget || { tab: 'SystemMap' })}
                      >
                        <Compass size={14} />
                        <span>{row.pathTitle ? '看首推路径' : '补路径落点'}</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="dashboard-page-audit-band" role="region" aria-label="页面闭环覆盖审计">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>页面闭环覆盖审计</h2>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  直接按页面盘工作台、焦点承接、使用路径、能力域、操作清单、路线图和任务承接，回答“这页到底能不能独立承接工作”。
                </p>
              </div>
              <span className={`status-badge ${pageAuditSummary.ready >= Math.ceil(pageAuditSummary.total / 2) ? 'online' : 'degraded'}`}>
                成型 {pageAuditSummary.ready}/{pageAuditSummary.total}
              </span>
            </div>
            <div className="dashboard-page-audit-summary">
              <span>工作台缺口 {pageAuditSummary.missingWorkbench}</span>
              <span>焦点承接缺口 {pageAuditSummary.missingFocus}</span>
              <span>路径缺口 {pageAuditSummary.missingPath}</span>
              <span>任务缺口 {pageAuditSummary.missingTask}</span>
            </div>
            <div className="dashboard-page-audit-grid">
              {visiblePageAuditRows.map((row) => (
                <article key={row.id} className="dashboard-page-audit-card" aria-label={`页面闭环 ${row.title}`}>
                  <div className="dashboard-page-audit-head">
                    <div>
                      <span>{row.group}</span>
                      <strong>{row.title}</strong>
                    </div>
                    <em className={`status-badge ${row.statusTone}`}>{row.statusLabel} {row.coverageScore}%</em>
                  </div>
                  <p>{row.nextAction}</p>
                  <div className="dashboard-closure-tags">
                    {row.linkedItems.map((item) => (
                      <span key={`${row.id}-${item}`} className="linked">{item}</span>
                    ))}
                    {row.missingItems.map((item) => (
                      <span key={`${row.id}-${item}`} className="missing">{item}</span>
                    ))}
                  </div>
                  <div className="dashboard-page-audit-actions">
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`打开页面闭环 ${row.title}`}
                      onClick={() => openContextTarget(row.target)}
                    >
                      <ArrowRight size={14} />
                      <span>打开页面</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`打开页面闭环动作 ${row.title}`}
                      onClick={() => openContextTarget(row.secondaryTarget)}
                    >
                      <ClipboardList size={14} />
                      <span>{row.secondaryLabel}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
            {pageAuditRows.length > 8 && (
              <div className="dashboard-page-audit-footer">
                <button
                  type="button"
                  className="antd-btn"
                  aria-label={pageAuditExpanded ? '收起页面闭环覆盖审计列表' : '展开全部页面闭环覆盖审计列表'}
                  onClick={() => setPageAuditExpanded((value) => !value)}
                >
                  <span>{pageAuditExpanded ? '收起列表' : `展开全部 ${pageAuditRows.length} 页`}</span>
                </button>
              </div>
            )}
          </section>

          <section className="dashboard-usage-mode-band" role="region" aria-label="页面能力总表">
            <div className="section-header" style={{ marginBottom: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, margin: 0 }}>页面能力总表</h2>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  把每一页负责什么、从哪条路径进入、当前挂了哪些能力域、清单、路线图和任务承接直接摊平。你可以把这一块当作 cockpit 的整站说明书。
                </p>
              </div>
              <span className="status-badge degraded">
                覆盖 {pageCapabilityRows.length} 页
              </span>
            </div>
            <div className="dashboard-usage-mode-grid">
              {pageCapabilityRows.map((row) => (
                <article key={row.id} className="dashboard-usage-mode-card" aria-label={`页面能力 ${row.title}`}>
                  <div className="dashboard-usage-mode-head">
                    <div>
                      <span>{row.group}</span>
                      <strong>{row.title}</strong>
                    </div>
                    <em className={`status-badge ${row.statusTone}`}>{row.statusLabel} {row.coverageScore}%</em>
                  </div>
                  <p>{row.purpose}</p>
                  <small>怎么用：{row.primaryPathTitle ? `从 ${row.primaryPathTitle} 进入` : '还没挂进明确使用路径'} · 能力域：{row.dimensionsLabel}</small>
                  <div className="dashboard-usage-mode-metrics">
                    <span>路径 {row.usagePathCount}</span>
                    <span>能力域 {row.featureDomainCount}</span>
                    <span>清单 {row.playbookCount}</span>
                    <span>路线图 {row.roadmapCount}</span>
                    <span>任务 {row.taskCount}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13 }}>{row.nextAction}</p>
                  <div className="dashboard-usage-mode-actions">
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`打开页面能力 ${row.title}`}
                      onClick={() => openContextTarget(row.target)}
                    >
                      <ArrowRight size={14} />
                      <span>打开页面</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={row.primaryPathTitle ? `查看页面能力路径 ${row.title}` : `查看页面能力任务 ${row.title}`}
                      onClick={() => openContextTarget(row.pathTarget || row.taskTarget)}
                    >
                      {row.primaryPathTitle ? <Compass size={14} /> : <ClipboardList size={14} />}
                      <span>{row.primaryPathTitle ? '看进入路径' : '看任务承接'}</span>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {pageSprintRows.length > 0 && activePageSprintRow && pageSprintTaskDraft && (
            <section className="dashboard-usage-mode-band" role="region" aria-label="重点补位页面">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>重点补位页面</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    这里不只是盘点缺口，而是直接把最弱页面拉成可操作的补位冲刺台。先聚焦页面，再一键把补位任务送进 TaskCenter 持续追。
                  </p>
                </div>
                <span className="status-badge degraded">
                  待补 {pageSprintRows.length} 页
                </span>
              </div>
              <div className="dashboard-usage-mode-grid">
                {pageSprintRows.slice(0, 6).map((row) => (
                  <article key={row.id} className="dashboard-usage-mode-card" aria-label={`重点补位 ${row.title}`}>
                    <div className="dashboard-usage-mode-head">
                      <div>
                        <span>{row.group}</span>
                        <strong>{row.title}</strong>
                      </div>
                      <em className={`status-badge ${row.statusTone}`}>{row.statusLabel} {row.coverageScore}%</em>
                    </div>
                    <p>{row.nextAction}</p>
                    <small>当前缺口：{row.missingItems.join('、') || '无'} · 路径：{row.primaryPathTitle || '未登记'}</small>
                    <div className="dashboard-usage-mode-metrics">
                      <span>能力域 {row.featureDomainCount}</span>
                      <span>清单 {row.playbookCount}</span>
                      <span>路线图 {row.roadmapCount}</span>
                      <span>任务 {row.taskCount}</span>
                    </div>
                    <div className="dashboard-usage-mode-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`聚焦补位页面 ${row.title}`}
                        onClick={() => setPageSprintFocusId(row.pageId)}
                      >
                        <Sparkles size={14} />
                        <span>{activePageSprintRow.pageId === row.pageId ? '当前焦点' : '聚焦补位'}</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开补位页面 ${row.title}`}
                        onClick={() => openContextTarget(row.target)}
                      >
                        <ArrowRight size={14} />
                        <span>打开页面</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
              <section
                className="services-section"
                role="region"
                aria-label="当前补位页面"
                style={{ marginTop: 16, display: 'grid', gap: 12 }}
              >
                <div className="service-header">
                  <div>
                    <h3 style={{ margin: 0, fontSize: 16 }}>{activePageSprintRow.title}</h3>
                    <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                      {activePageSprintRow.purpose}
                    </p>
                  </div>
                  <span className={`status-badge ${activePageSprintRow.statusTone}`}>
                    {activePageSprintRow.statusLabel} {activePageSprintRow.coverageScore}%
                  </span>
                </div>
                <div className="dashboard-closure-tags">
                  {activePageSprintRow.missingItems.map((item) => (
                    <span key={`${activePageSprintRow.pageId}-${item}`} className="missing">{item}</span>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 13 }}>{activePageSprintRow.nextAction}</p>
                <div className="dashboard-usage-mode-metrics">
                  <span>路径 {activePageSprintRow.primaryPathTitle || '未登记'}</span>
                  <span>能力域 {activePageSprintRow.featureDomainCount}</span>
                  <span>清单 {activePageSprintRow.playbookCount}</span>
                  <span>路线图 {activePageSprintRow.roadmapCount}</span>
                  <span>任务 {activePageSprintRow.taskCount}</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={`打开当前补位页面 ${activePageSprintRow.title}`}
                    onClick={() => openContextTarget(activePageSprintRow.target)}
                  >
                    <ArrowRight size={14} />
                    <span>回页面核实</span>
                  </button>
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={activePageSprintRow.primaryPathTitle ? `打开当前补位路径 ${activePageSprintRow.title}` : `打开当前补位任务 ${activePageSprintRow.title}`}
                    onClick={() => openContextTarget(activePageSprintRow.primaryPathTarget || activePageSprintRow.taskTarget)}
                  >
                    {activePageSprintRow.primaryPathTitle ? <Compass size={14} /> : <ClipboardList size={14} />}
                    <span>{activePageSprintRow.primaryPathTitle ? '看进入路径' : '看当前任务'}</span>
                  </button>
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={`复制补位任务 ${activePageSprintRow.title}`}
                    onClick={() => {
                      void handleCopyPageSprintDraft();
                    }}
                  >
                    <Copy size={14} />
                    <span>复制补位任务</span>
                  </button>
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={`打开补位任务 ${activePageSprintRow.title}`}
                    onClick={() => {
                      const draftKey = persistTaskCenterDraft({
                        title: pageSprintTaskDraft.title,
                        description: pageSprintTaskDraft.description,
                        tags: pageSprintTaskDraft.tags,
                        checklist: pageSprintTaskDraft.checklist,
                        copyText: pageSprintTaskDraft.copyText,
                        sourceTarget: pageSprintTaskDraft.sourceTarget,
                      });
                      openContextTarget({
                        ...pageSprintTaskDraft.taskTarget,
                        draftKey,
                      });
                    }}
                  >
                    <ClipboardList size={14} />
                    <span>送进任务中心</span>
                  </button>
                </div>
                {pageSprintDraftNotice && (
                  <p className="text-muted" style={{ margin: 0, fontSize: 12 }}>{pageSprintDraftNotice}</p>
                )}
              </section>
            </section>
          )}

          {usageModeRows.length > 0 && (
            <section className="dashboard-usage-mode-band" role="region" aria-label="整站使用模式">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>整站使用模式</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    把 cockpit 变成几条真的可以走的路径。每条模式都说明从哪一页进、现在补到了哪儿、还有哪些承接动作没接上。
                  </p>
                </div>
                <span className="status-badge degraded">
                  共 {usageModeRows.length} 条模式
                </span>
              </div>
              <div className="dashboard-usage-mode-grid">
                {usageModeRows.map((row) => (
                  <article key={row.id} className="dashboard-usage-mode-card" aria-label={`使用模式 ${row.title}`}>
                    <div className="dashboard-usage-mode-head">
                      <div>
                        <span>{row.entryTitle}</span>
                        <strong>{row.title}</strong>
                      </div>
                      <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
                    </div>
                    <p>{row.intent}</p>
                    <small>{row.preview}</small>
                    <div className="dashboard-usage-mode-metrics">
                      <span>清单 {row.playbookCount}</span>
                      <span>路线图 {row.roadmapCount}</span>
                      <span>草稿 {row.taskCount}</span>
                      <span>待补页 {row.attentionCount}</span>
                    </div>
                    <div className="dashboard-usage-mode-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开使用模式 ${row.title}`}
                        onClick={() => openContextTarget(row.target)}
                      >
                        <Compass size={14} />
                        <span>打开模式</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`查看模式任务 ${row.title}`}
                        onClick={() => openContextTarget(row.taskTarget)}
                      >
                        <ClipboardList size={14} />
                        <span>看任务承接</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {priorityRouteRows.length > 0 && (
            <section className="dashboard-priority-route-band" role="region" aria-label="优先补位路线">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>优先补位路线</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    把覆盖维度、能力缺口、路线图和优先项目放到同一队列里，先看最该补的方向，再决定落到哪一页或哪份任务草稿。
                  </p>
                </div>
                <span className="status-badge degraded">
                  共 {priorityRouteRows.length} 条路线
                </span>
              </div>
              <div className="dashboard-priority-route-grid">
                {priorityRouteRows.map((row) => (
                  <article key={row.id} className="dashboard-priority-route-card" aria-label={`优先补位 ${row.title}`}>
                    <div className="dashboard-priority-route-head">
                      <div>
                        <span>{row.kind}</span>
                        <strong>{row.title}</strong>
                      </div>
                      <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
                    </div>
                    <p>{row.summary}</p>
                    <small>{row.nextAction}</small>
                    <div className="dashboard-priority-route-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开补位路线 ${row.title}`}
                        onClick={() => openContextTarget(row.target)}
                      >
                        <ArrowRight size={14} />
                        <span>去主视图</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开补位任务 ${row.title}`}
                        onClick={() => openContextTarget(row.secondaryTarget)}
                      >
                        <ClipboardList size={14} />
                        <span>看任务</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {executionLaneRows.length > 0 && (
            <section className="dashboard-execution-band" role="region" aria-label="执行对象与验收">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>执行对象与验收</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    把使用模式、领域应用和补位路线直接压成执行卡。你不需要先理解整张图，也能顺着动作、证据和命令往下走。
                  </p>
                </div>
                <span className="status-badge degraded">
                  共 {executionLaneRows.length} 个执行对象
                </span>
              </div>
              <div className="dashboard-execution-grid">
                {executionLaneRows.map((row) => (
                  <article key={row.id} className="dashboard-execution-card" aria-label={`执行对象 ${row.title}`}>
                    <div className="dashboard-execution-head">
                      <div>
                        <span>{row.kind}</span>
                        <strong>{row.title}</strong>
                      </div>
                      <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
                    </div>
                    <p>{row.summary}</p>
                    <div className="dashboard-execution-detail">
                      <span>动作</span>
                      <strong>{row.action}</strong>
                    </div>
                    <div className="dashboard-execution-detail">
                      <span>验收</span>
                      <strong>{row.evidence}</strong>
                    </div>
                    {row.command && (
                      <code className="dashboard-execution-command">{row.command}</code>
                    )}
                    <div className="dashboard-execution-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开执行对象 ${row.title}`}
                        onClick={() => openContextTarget(row.primaryTarget)}
                      >
                        <ArrowRight size={14} />
                        <span>打开对象</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开执行任务 ${row.title}`}
                        onClick={() => openContextTarget(row.secondaryTarget)}
                      >
                        <ClipboardList size={14} />
                        <span>打开任务</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {domainOperationRows.length > 0 && (
            <section className="dashboard-domain-ops-band" role="region" aria-label="应用接入与运行">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>应用接入与运行</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    把领域应用的入口、运行态、认证、安全姿态、数据新鲜度和启动校验命令摆到一层，方便你判断哪些应用已经能挂到 cockpit，哪些还只是概念入口。
                  </p>
                </div>
                <span className="status-badge degraded">
                  共 {domainOperationRows.length} 个应用
                </span>
              </div>
              <div className="dashboard-domain-ops-grid">
                {domainOperationRows.map((row) => (
                  <article key={row.id} className="dashboard-domain-ops-card" aria-label={`应用运行 ${row.title}`}>
                    <div className="dashboard-domain-ops-head">
                      <div>
                        <span>{row.domainLabel}</span>
                        <strong>{row.title}</strong>
                      </div>
                      <em className={`status-badge ${row.statusTone}`}>{row.statusLabel}</em>
                    </div>
                    <div className="dashboard-domain-ops-metrics">
                      <span>运行 {row.runtimeLabel}</span>
                      <span>认证 {row.authLabel}</span>
                      <span>新鲜度 {row.freshnessLabel}</span>
                      <span>安全 {row.securityLabel}</span>
                    </div>
                    <div className="dashboard-domain-ops-links">
                      <div>
                        <span>入口</span>
                        <strong>{row.launchUrl}</strong>
                      </div>
                      <div>
                        <span>API</span>
                        <strong>{row.apiUrl}</strong>
                      </div>
                    </div>
                    {(row.startCommand || row.verifyCommand) && (
                      <div className="dashboard-domain-ops-commands">
                        {row.startCommand && <code>{row.startCommand}</code>}
                        {row.verifyCommand && <code>{row.verifyCommand}</code>}
                      </div>
                    )}
                    <div className="dashboard-domain-ops-actions">
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开应用运行 ${row.title}`}
                        onClick={() => openContextTarget(row.primaryTarget)}
                      >
                        <AppWindow size={14} />
                        <span>打开应用</span>
                      </button>
                      <button
                        type="button"
                        className="antd-btn"
                        aria-label={`打开应用任务 ${row.title}`}
                        onClick={() => openContextTarget(row.secondaryTarget)}
                      >
                        <ClipboardList size={14} />
                        <span>打开任务</span>
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {siteClosureSummary.rows.length > 0 && (
            <section className="dashboard-closure-band" role="region" aria-label="全站闭环缺口">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>全站闭环缺口</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    把整站页面逐个按路径、能力域、操作清单、路线图和任务承接来盘，先看哪几页断链最严重。
                  </p>
                </div>
                <span className="status-badge degraded">
                  路径 {siteClosureSummary.missingPath} · 能力域 {siteClosureSummary.missingFeatureDomain} · 清单 {siteClosureSummary.missingPlaybook} · 路线图 {siteClosureSummary.missingRoadmap} · 任务 {siteClosureSummary.missingTask}
                </span>
              </div>
              <div className="dashboard-closure-summary">
                <span>缺路径 {siteClosureSummary.missingPath}</span>
                <span>缺能力域 {siteClosureSummary.missingFeatureDomain}</span>
                <span>缺操作清单 {siteClosureSummary.missingPlaybook}</span>
                <span>缺路线图 {siteClosureSummary.missingRoadmap}</span>
                <span>缺任务 {siteClosureSummary.missingTask}</span>
              </div>
              <div className="dashboard-closure-filters" role="toolbar" aria-label="闭环缺口筛选">
                {siteClosureFilterOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`dashboard-closure-filter ${siteClosureFilter === option.id ? 'active' : ''}`}
                    aria-pressed={siteClosureFilter === option.id}
                    aria-label={`筛选${option.label} ${option.count}`}
                    onClick={() => {
                      setSiteClosureFilter(option.id);
                      setSiteClosureExpanded(false);
                    }}
                  >
                    <span>{option.label}</span>
                    <strong>{option.count}</strong>
                  </button>
                ))}
              </div>
              <div className="dashboard-closure-grid">
                {visibleSiteClosureRows.map((row) => (
                  <article key={row.id} className="dashboard-closure-item">
                    <div>
                      <strong>{`页面闭环：${row.title}`}</strong>
                      <p>{row.nextAction}</p>
                      <small>{row.group}</small>
                    </div>
                    <div className="dashboard-closure-tags">
                      {row.linkedItems.length > 0 && row.linkedItems.map((item) => (
                        <span key={`${row.id}-${item}`} className="linked">{item}</span>
                      ))}
                      {row.missingItems.map((item) => (
                        <span key={`${row.id}-${item}`} className="missing">{item}</span>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`打开闭环缺口 页面闭环：${row.title}`}
                      onClick={() => openContextTarget(row.target)}
                    >
                      <ArrowRight size={14} />
                      <span>去补位</span>
                    </button>
                  </article>
                ))}
              </div>
              {filteredSiteClosureRows.length > 6 && (
                <div className="dashboard-closure-footer">
                  <button
                    type="button"
                    className="antd-btn"
                    aria-label={siteClosureExpanded ? '收起闭环缺口列表' : '展开全部闭环缺口列表'}
                    onClick={() => setSiteClosureExpanded((value) => !value)}
                  >
                    <span>{siteClosureExpanded ? '收起列表' : `展开全部 ${filteredSiteClosureRows.length} 项`}</span>
                  </button>
                </div>
              )}
              {siteClosureTemplateActions.length > 0 && (
                <section className="dashboard-closure-template" role="region" aria-label="闭环缺口补位模板">
                  <div className="section-header" style={{ marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15, margin: 0 }}>{siteClosureTemplateCopy.title}</h3>
                      <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                        {siteClosureTemplateCopy.summary}
                      </p>
                    </div>
                    <span className="status-badge degraded">当前模板 {activeSiteClosureTemplateKey}</span>
                  </div>
                  <div className="dashboard-closure-template-list">
                    {siteClosureTemplateActions.map((action) => (
                      <article key={action.id} className="dashboard-closure-template-item">
                        <div>
                          <strong>{action.title}</strong>
                          <p>{action.detail}</p>
                        </div>
                        <button
                          type="button"
                          className="antd-btn"
                          aria-label={`执行补位模板 ${action.title}`}
                          onClick={() => openContextTarget(action.target)}
                        >
                          <ArrowRight size={14} />
                          <span>执行</span>
                        </button>
                      </article>
                    ))}
                  </div>
                </section>
              )}
              {siteClosureTaskDraft && (
                <section className="dashboard-closure-template" role="region" aria-label="闭环任务草稿工坊">
                  <div className="section-header" style={{ marginBottom: 12 }}>
                    <div>
                      <h3 style={{ fontSize: 15, margin: 0 }}>{siteClosureTaskDraft.title}</h3>
                      <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 12 }}>
                        {siteClosureTaskDraft.description}
                      </p>
                    </div>
                    <span className="status-badge degraded">任务草稿</span>
                  </div>
                  <div className="dashboard-closure-template-list">
                    <article className="dashboard-closure-template-item">
                      <div>
                        <strong>建议标签</strong>
                        <p>{siteClosureTaskDraft.tags.join(' · ')}</p>
                      </div>
                    </article>
                    {siteClosureTaskDraft.checklist.slice(0, 3).map((item, index) => (
                      <article key={`${siteClosureTaskDraft.title}-${index}`} className="dashboard-closure-template-item">
                        <div>
                          <strong>{`执行步骤 ${index + 1}`}</strong>
                          <p>{item}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="dashboard-domain-ops-actions" style={{ marginTop: 12 }}>
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`复制任务草稿 ${siteClosureTaskDraft.title}`}
                      onClick={() => {
                        void handleCopySiteClosureDraft();
                      }}
                    >
                      <ClipboardList size={14} />
                      <span>复制任务草稿</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`打开任务草稿 ${siteClosureTaskDraft.title}`}
                      onClick={() => {
                        const draftKey = persistTaskCenterDraft({
                          title: siteClosureTaskDraft.title,
                          description: siteClosureTaskDraft.description,
                          tags: siteClosureTaskDraft.tags,
                          checklist: siteClosureTaskDraft.checklist,
                          copyText: siteClosureTaskDraft.copyText,
                          sourceTarget: siteClosureTaskDraft.sourceTarget,
                        });
                        openContextTarget({
                          ...siteClosureTaskDraft.taskTarget,
                          draftKey,
                        });
                      }}
                    >
                      <ArrowRight size={14} />
                      <span>打开任务中心</span>
                    </button>
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`查看草稿来源 ${siteClosureTaskDraft.title}`}
                      onClick={() => openContextTarget(siteClosureTaskDraft.sourceTarget)}
                    >
                      <Compass size={14} />
                      <span>查看来源页面</span>
                    </button>
                  </div>
                  {closureDraftNotice && (
                    <p className="text-muted" style={{ margin: '10px 0 0', fontSize: 12 }}>{closureDraftNotice}</p>
                  )}
                </section>
              )}
            </section>
          )}

          {gapHighlights.length > 0 && (
            <section className="dashboard-gap-band" role="region" aria-label="缺口总览">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>缺口总览</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    用一屏把当前最该补的页面、项目、领域和任务拉平，减少首页和系统地图反复切换。
                  </p>
                </div>
                <span className="status-badge degraded">{gapHighlights.length} 个重点</span>
              </div>
              <div className="dashboard-gap-list">
                {gapHighlights.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="dashboard-gap-item"
                    aria-label={`打开缺口 ${item.title}`}
                    onClick={() => openContextTarget(item.target)}
                  >
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                    </div>
                    <small>{item.badge}</small>
                  </button>
                ))}
              </div>
            </section>
          )}

          {shellActions.length > 0 && (
            <section className="action-surface-panel antd-card" aria-label="全站下一步">
              <div className="section-header" style={{ marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 16, margin: 0 }}>全站下一步</h2>
                  <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                    不管你现在停在哪一页，先从页面补位、项目修复、领域挂载和任务承接里挑一条继续推进。
                  </p>
                </div>
                <span className="status-badge degraded">
                  页面 {sidebarCoverage?.attentionItems.length || 0} · 项目 {sidebarProjectPortfolio?.priorityProjects.length || 0} · 领域 {shellDomainApps?.summary?.security_attention_apps || 0} · 草稿 {shellTaskDrafts.length}
                </span>
              </div>
              <div className="action-surface-grid">
                {shellActions.map((item) => (
                  <article key={item.id} className="action-surface-item">
                    <div>
                      <strong>{item.title}</strong>
                      <p>{item.detail}</p>
                      <span className="text-muted" style={{ fontSize: 12 }}>{item.badge}</span>
                    </div>
                    <button
                      type="button"
                      className="antd-btn"
                      aria-label={`打开全站动作 ${item.title}`}
                      onClick={() => openContextTarget(item.target)}
                    >
                      <ArrowRight size={14} />
                      <span>继续推进</span>
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}

          <div className="dashboard-page-view" data-testid="dashboard-page-view" data-refresh-token={pageRefreshToken} key={`${activeTab}-${pageRefreshToken}`}>
          {activeTab === 'Home' && (
            renderLazyView(
              '首页',
              <HomePage
                onTabChange={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusProjectId={focusedProjectId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Guide' && (
            renderLazyView(
              '站内导览',
              <CockpitGuideView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusProjectId={focusedProjectId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'SystemMap' && (
            renderLazyView(
              '系统地图',
              <SystemMapView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusProjectId={focusedProjectId}
                focusUsagePathId={focusedUsagePathId}
                focusGapId={focusedGapId}
                focusCoverageDimensionId={focusedCoverageDimensionId}
                focusPageId={focusedPageId}
                focusFeatureDomainId={focusedFeatureDomainId}
              />,
            )
          )}

          {activeTab === 'Overview' && (
            renderLazyView(
              '概览中心',
              <OverviewPage
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusProjectId={focusedProjectId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Topology' && (
            renderLazyView(
              '全局拓扑',
              <TopologyView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Compute' && (
            renderLazyView(
              '算力调配',
              <ComputeView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Research' && (
            renderLazyView(
              '研究中枢',
              <ResearchHubView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Engines' && (
            renderLazyView(
              '引擎调度',
              <EnginesView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Knowledge' && (
            renderLazyView(
              '知识中枢',
              <KnowledgeHubView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'GBrainAdmin' && (
            renderLazyView(
              'GBrain 管理',
              <GBrainAdminView
                initialSubTab={
                  /智能体|agent/i.test(taskSearchSeed)
                    ? 'agents'
                    : /凭证|token|credential/i.test(taskSearchSeed)
                      ? 'monitor'
                      : /校准|calibration|模型/i.test(taskSearchSeed)
                        ? 'calibration'
                        : /日志|请求|request|log/i.test(taskSearchSeed)
                          ? 'logs'
                          : /记忆|memory/i.test(taskSearchSeed)
                            ? 'memory'
                            : 'monitor'
                }
                initialQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Workflows' && (
            renderLazyView(
              'MetaOS 工作流',
              <WorkflowsView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Sandbox' && (
            renderLazyView(
              '隔离沙箱',
              <SandboxTerminal
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Settings' && (
            renderLazyView(
              '底层设置',
              <SettingsView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Debt' && (
            renderLazyView(
              '技术债务',
              <DebtView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'C2G' && (
            renderLazyView(
              'C2G 战略中心',
              <C2GStrategyView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'McpMesh' && (
            renderLazyView(
              '网格与 MCP',
              <McpMeshView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Assets' && (
            renderLazyView(
              '技术资产库',
              <AssetsView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'Protocol' && (
            renderLazyView(
              '协议工作台',
              <ProtocolWorkbenchView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'QuestBoard' && (
            renderLazyView(
              '积分冒险',
              <QuestBoard
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'DomainApps' && (
            renderLazyView(
              '应用中心',
              <DomainAppsView onNavigate={setActiveTab} onOpenTarget={openContextTarget} taskQuery={taskSearchSeed} />,
            )
          )}

          {activeTab === 'Observability' && (
            renderLazyView(
              '运行可观测',
              <ObservabilityView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'L4Health' && (
            renderLazyView(
              'L4 域健康',
              <L4HealthView
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'AlertCenter' && (
            renderLazyView(
              '告警中心',
              <AlertCenterPage
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                initialTab={alertTab || 'active'}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'LogViewer' && (
            renderLazyView(
              '日志查看器',
              <LogViewerPage
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}

          {activeTab === 'TaskCenter' && (
            renderLazyView(
              '任务中心',
              <TaskCenterPage
                initialSearchQuery={taskSearchSeed}
                incomingDraft={taskCenterIncomingDraft}
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
              />,
            )
          )}

          {activeTab === 'Performance' && (
            renderLazyView(
              '性能监控',
              <PerformanceMonitorPage
                onNavigate={setActiveTab}
                onOpenTarget={openContextTarget}
                focusPageId={focusedPageId}
                focusTaskQuery={taskSearchSeed}
              />,
            )
          )}
          </div>
        </div>
      </main>

      {/* 命令面板 */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={closeCommandPalette}
        commands={commandPaletteCommands}
      />

      {/* 快捷操作面板 */}
      <QuickActionsPanel
        isOpen={isQuickActionsOpen}
        onClose={closeQuickActions}
      />
    </div>
  );
}

import {
  Activity,
  AppWindow,
  BarChart3,
  Bell,
  Briefcase,
  ClipboardList,
  Command,
  Compass,
  Cpu,
  Database,
  FileText,
  GitCommit,
  Globe,
  Heart,
  LayoutDashboard,
  Map,
  Network,
  Search,
  Settings,
  Shield,
  Terminal,
  Trophy,
} from 'lucide-react';
import { COCKPIT_PAGE_REGISTRY } from './cockpitPageRegistry';

export const SIDEBAR_GROUP_ORDER = [
  { id: 'group-home', title: '入口' },
  { id: 'group-monitoring', title: '运行大盘' },
  { id: 'group-intelligence', title: '智能与知识' },
  { id: 'group-governance', title: '系统治理' },
  { id: 'group-devtools', title: '开发工具' },
  { id: 'group-domain-apps', title: '领域应用' },
  { id: 'group-config', title: '系统配置' },
] as const;

export const SIDEBAR_NAV_SECTIONS = SIDEBAR_GROUP_ORDER.map((group) => ({
  ...group,
  tabs: COCKPIT_PAGE_REGISTRY.filter((page) => page.group === group.title).map((page) => page.id),
}));

export const GROUP_ENTRY_TABS: Record<string, string> = {
  入口: 'Home',
  '运行大盘': 'Overview',
  '智能与知识': 'Knowledge',
  '系统治理': 'AlertCenter',
  '开发工具': 'LogViewer',
  '领域应用': 'DomainApps',
  '系统配置': 'Settings',
};

export const NAV_ICON_BY_TAB: Record<string, React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>> = {
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

export function pageGroupLabel(tab: string): string | null {
  for (const group of SIDEBAR_GROUP_ORDER) {
    if (COCKPIT_PAGE_REGISTRY.some((page) => page.id === tab && page.group === group.title)) {
      return group.title;
    }
  }
  return null;
}

/**
 * dashboardIcons — Dashboard 图标映射
 *
 * 从 Dashboard.tsx 提取，避免单文件过大。
 */
import React from 'react';
import {
  Activity, Search, Settings, Command, Zap, LayoutDashboard, Compass,
  Network, Cpu, Globe, Database, Briefcase, FileText, Brain,
  ArrowRight, BookOpen, GitCommit, Bell, Heart, BarChart3,
  ClipboardList, Terminal, Trophy, Inbox, Target, GitBranch,
  Shield, Server, MonitorCog, ShieldCheck, Layers,
} from 'lucide-react';

export const ICON_MAP: Record<string, React.ComponentType<{ size: number; 'aria-hidden'?: boolean; className?: string }>> = {
  LayoutDashboard: (p) => <LayoutDashboard {...p} />,
  Globe: (p) => <Globe {...p} />,
  Network: (p) => <Network {...p} />,
  Cpu: (p) => <Cpu {...p} />,
  Database: (p) => <Database {...p} />,
  Briefcase: (p) => <Briefcase {...p} />,
  FileText: (p) => <FileText {...p} />,
  Brain: (p) => <Brain {...p} />,
  BookOpen: (p) => <BookOpen {...p} />,
  GitCommit: (p) => <GitCommit {...p} />,
  Bell: (p) => <Bell {...p} />,
  Heart: (p) => <Heart {...p} />,
  BarChart3: (p) => <BarChart3 {...p} />,
  Compass: (p) => <Compass {...p} />,
  Zap: (p) => <Zap {...p} />,
  ClipboardList: (p) => <ClipboardList {...p} />,
  Terminal: (p) => <Terminal {...p} />,
  Trophy: (p) => <Trophy {...p} />,
  Settings: (p) => <Settings {...p} />,
  Search: (p) => <Search {...p} />,
  ArrowRight: (p) => <ArrowRight {...p} />,
  Inbox: (p) => <Inbox {...p} />,
  Target: (p) => <Target {...p} />,
  GitBranch: (p) => <GitBranch {...p} />,
  Activity: (p) => <Activity {...p} />,
  Shield: (p) => <Shield {...p} />,
  Server: (p) => <Server {...p} />,
  MonitorCog: (p) => <MonitorCog {...p} />,
  ShieldCheck: (p) => <ShieldCheck {...p} />,
  Layers: (p) => <Layers {...p} />,
};

export function getIconComponent(iconName?: string) {
  return ICON_MAP[iconName || 'LayoutDashboard'] || (() => <Activity size={16} aria-hidden="true" />);
}

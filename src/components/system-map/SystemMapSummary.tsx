import React from 'react';
import {
  AlertTriangle,
  ClipboardCheck,
  ExternalLink,
  Layers,
  Map as MapIcon,
  Network,
  ShieldAlert,
} from 'lucide-react';
import SummaryTileGrid from '../common/SummaryTileGrid';
import type { SystemMapPayload } from './types';

type SystemMapSummaryProps = {
  systemMap: SystemMapPayload;
};

function SystemMapSummary({ systemMap }: SystemMapSummaryProps) {
  const systemSummaryTiles = [
    { id: 'cockpit-pages', title: 'Cockpit 页面', value: systemMap.summary.cockpit_pages, icon: <MapIcon size={20} />, iconClassName: 'pulse-accent' },
    { id: 'layers', title: '架构层级', value: systemMap.summary.layers, icon: <Layers size={20} />, iconClassName: 'pulse-success' },
    { id: 'running-projects', title: '运行项目', value: `${systemMap.summary.running_projects} / ${systemMap.summary.projects}`, description: `无需常驻 ${systemMap.summary.not_applicable_projects}`, icon: <Network size={20} />, iconClassName: 'pulse-info' },
    { id: 'gaps', title: '待补能力', value: systemMap.summary.gaps, icon: <AlertTriangle size={20} />, iconClassName: 'pulse-warning' },
    { id: 'source-refs', title: '来源定位', value: systemMap.summary.source_refs, icon: <ExternalLink size={20} />, iconClassName: 'pulse-info' },
    { id: 'actions', title: '受控动作', value: systemMap.summary.project_actions, icon: <ClipboardCheck size={20} />, iconClassName: 'pulse-success' },
    { id: 'projects-needing-action', title: '项目待处理', value: systemMap.summary.projects_needing_action, icon: <AlertTriangle size={20} />, iconClassName: 'pulse-warning' },
    { id: 'coverage-score', title: '覆盖分', value: `${systemMap.summary.project_coverage_score}%`, icon: <ShieldAlert size={20} />, iconClassName: 'pulse-success' },
    { id: 'triage-commands', title: '排查命令', value: systemMap.summary.project_triage_commands, icon: <ClipboardCheck size={20} />, iconClassName: 'pulse-info' },
    { id: 'domain-apps', title: '领域应用', value: `${systemMap.summary.domain_apps} · ${systemMap.summary.domain_app_score}%`, icon: <ExternalLink size={20} />, iconClassName: 'pulse-accent' },
  ];

  return <SummaryTileGrid className="system-map-summary-grid" items={systemSummaryTiles} minColumnWidth={180} />;
}

export default SystemMapSummary;

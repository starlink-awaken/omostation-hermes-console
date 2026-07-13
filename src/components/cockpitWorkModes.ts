import type { CockpitNavigationTarget } from './cockpitNavigation';

export type CockpitWorkModeTarget = CockpitNavigationTarget;

export interface CockpitWorkMode {
  id: string;
  role: string;
  title: string;
  summary: string;
  focus: string[];
  entry: CockpitWorkModeTarget;
  taskTarget: CockpitWorkModeTarget;
}

export const COCKPIT_WORK_MODES: CockpitWorkMode[] = [
  {
    id: 'operator',
    title: '日常值守模式',
    role: 'operator',
    summary: '适合每天先看健康、告警、任务，把系统先稳住。',
    focus: ['首页', '告警中心', '任务中心', '日志查看器'],
    entry: { tab: 'Home' },
    taskTarget: { tab: 'TaskCenter', taskQuery: 'system_map_playbook' },
  },
  {
    id: 'governance',
    title: '治理巡检模式',
    role: 'governance',
    summary: '适合看战略、债务、域健康和覆盖短板，决定先补哪一块。',
    focus: ['C2G 战略中心', '技术债务', 'L4 域健康', '系统地图'],
    entry: { tab: 'C2G' },
    taskTarget: { tab: 'TaskCenter', taskQuery: 'system_map_capability_gap' },
  },
  {
    id: 'builder',
    title: '建设补位模式',
    role: 'builder',
    summary: '适合对着页面缺口、路线图和协议约束补功能、补入口、补验证。',
    focus: ['系统地图', '协议工作台', '任务中心', '隔离沙箱'],
    entry: { tab: 'SystemMap' },
    taskTarget: { tab: 'TaskCenter', taskQuery: 'system_map_page_maturity' },
  },
  {
    id: 'domain',
    title: '领域挂载模式',
    role: 'domain',
    summary: '适合处理家庭驾驶舱、OPC、family-hub 这类领域入口和状态问题。',
    focus: ['应用中心', '积分冒险', '底层设置', '任务中心'],
    entry: { tab: 'DomainApps' },
    taskTarget: { tab: 'TaskCenter', taskQuery: 'system_map_domain_app' },
  },
];

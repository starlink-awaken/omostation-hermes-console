import { type DomainApp } from './types';

export const healthLabels: Record<string, string> = {
  ready: '就绪',
  needs_build: '待构建',
  needs_attention: '需关注',
  missing: '缺失',
};

export const runtimeLabels: Record<string, string> = {
  running: '运行中',
  stopped: '未运行',
  not_applicable: '无需运行',
  listening: '监听中',
  closed: '未监听',
  internal_route: '内置接口',
  external_unchecked: '外部未探测',
  not_configured: '未配置',
};

export function badgeClass(value: string): string {
  if (value === 'ready' || value === 'built' || value === 'ssot_present' || value === 'low' || value === 'running' || value === 'listening' || value === 'internal_route' || value === 'passed') return 'online';
  if (value === 'missing' || value === 'high' || value === 'stopped' || value === 'closed' || value === 'failed' || value === 'blocked') return 'offline';
  return 'degraded';
}

export function riskText(value: string): string {
  if (value === 'high') return '高风险';
  if (value === 'medium') return '中风险';
  if (value === 'low') return '低风险';
  return value;
}

export function securityText(value: string): string {
  if (value === 'passed') return '通过';
  if (value === 'warn') return '警告';
  if (value === 'failed') return '失败';
  if (value === 'attention') return '需处理';
  if (value === 'blocked') return '阻断';
  return value;
}

export function shortDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value);
}

export function nextActionForApp(app: DomainApp): string {
  const blockingCheck = app.security_checks.find((check) => check.blocking);
  if (blockingCheck?.next_action) return blockingCheck.next_action;
  const failedCheck = app.security_checks.find((check) => check.status === 'failed' || check.status === 'warn');
  if (failedCheck?.next_action) return failedCheck.next_action;
  if (app.warnings[0]) return app.warnings[0];
  if (app.runtime.status === 'stopped') return app.commands.start || '拉起服务或确认该应用只需要按需启动。';
  return app.notes[0] || '进入应用详情继续处理。';
}

export function contractStatusText(ready: boolean, missingLabel: string): string {
  return ready ? '已登记' : missingLabel;
}

export function capabilityText(app: DomainApp): string {
  const readCount = app.capabilities.read.length;
  const writeCount = app.capabilities.write.length;
  return `读 ${readCount} · 写 ${writeCount}`;
}

export function entryText(app: DomainApp): string {
  const launch = app.links.launch_url || app.runtime.launch.url;
  const api = app.links.api_url || app.runtime.api.url;
  if (launch && api) return '应用 / API';
  if (launch) return '应用';
  if (api) return 'API';
  return '未登记';
}

export function verifyText(app: DomainApp): string {
  if (app.commands.verify.length === 0) return '未登记';
  if (app.commands.verify.length === 1) return '1 条命令';
  return `${app.commands.verify.length} 条命令`;
}

export function attentionReasons(app: DomainApp): string[] {
  const reasons: string[] = [];
  if (app.runtime.status === 'stopped') reasons.push('待启动');
  if (app.security_summary.posture !== 'passed') reasons.push(`安全${securityText(app.security_summary.posture)}`);
  if (app.risk_level === 'high') reasons.push('高风险');
  if (app.health !== 'ready') reasons.push(`健康${healthLabels[app.health] || app.health}`);
  return reasons;
}

export function matchesDomainApp(app: DomainApp, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return false;
  return [app.id, app.name, app.domain.id, app.domain.name]
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}

export function domainBuildStatusClass(value?: string): string {
  if (!value) return 'degraded';
  if (value === 'healthy' || value === 'ready' || value === 'shipped') return 'online';
  if (value === 'watch' || value === 'at_risk' || value === 'planned' || value === 'active') return 'degraded';
  if (value === 'blocked' || value === 'failed') return 'offline';
  return 'degraded';
}

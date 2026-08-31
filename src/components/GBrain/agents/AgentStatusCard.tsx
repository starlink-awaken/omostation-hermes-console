import React from 'react';
import type { Agent } from './types';

function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

interface AgentStatusCardProps {
  agent: Agent;
  onSelect: (agent: Agent) => void;
}

export function AgentStatusCard({ agent, onSelect }: AgentStatusCardProps) {
  return (
    <tr key={agent.id} onClick={() => onSelect(agent)} style={{ cursor: 'pointer' }}>
      <td style={{ fontWeight: 500 }}>{agent.name || agent.client_name}</td>
      <td>
        <span className={`badge ${agent.auth_type === 'oauth' ? 'badge-read' : 'badge-write'}`} style={{ fontSize: 11 }}>
          {agent.auth_type === 'oauth' ? 'OAuth' : 'API Key'}
        </span>
      </td>
      <td>
        {(agent.scope || '').split(' ').filter(Boolean).map(s => (
          <span key={s} className={`badge badge-${s}`} style={{ marginRight: 4 }}>{s}</span>
        ))}
      </td>
      <td>
        <span className={`badge ${agent.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{agent.status}</span>
      </td>
      <td>
        <span style={{ fontWeight: 500 }}>{agent.requests_today || 0}</span>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}> / {agent.total_requests || 0}</span>
      </td>
      <td style={{ color: 'var(--text-secondary)' }}>
        {agent.last_used_at ? timeAgo(new Date(agent.last_used_at)) : 'Never'}
      </td>
    </tr>
  );
}

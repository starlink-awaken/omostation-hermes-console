import React from 'react';
import type { Agent } from './types';
import { AgentStatusCard } from './AgentStatusCard';

interface AgentListProps {
  agents: Agent[];
  hideRevoked: boolean;
  onSelectAgent: (agent: Agent) => void;
}

export function AgentList({ agents, hideRevoked, onSelectAgent }: AgentListProps) {
  // Filter once and reuse, so the empty-state guard sees the same
  // rows the table renders. Pre-fix: agents.length === 0 used the
  // unfiltered array, so an all-revoked dataset with hideRevoked=on
  // showed a header-only table with no placeholder.
  const visibleAgents = agents.filter(a => !hideRevoked || a.status !== 'revoked');

  if (agents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
        No agents registered. Register your first agent to get started.
      </div>
    );
  }

  if (visibleAgents.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-muted)' }}>
        All agents are revoked. Uncheck "Hide revoked" to view them.
      </div>
    );
  }

  return (
    <>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Scopes</th>
            <th>Status</th>
            <th>Requests</th>
            <th>Last Used</th>
          </tr>
        </thead>
        <tbody>
          {visibleAgents.map(a => (
            <AgentStatusCard key={a.id} agent={a} onSelect={onSelectAgent} />
          ))}
        </tbody>
      </table>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 12 }}>
        {agents.filter(a => a.status === 'active').length} active / {agents.length} total
      </div>
    </>
  );
}

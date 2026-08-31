import React, { useState, useEffect } from 'react';
import type { Agent, AgentCredentials, ApiKeyResult } from './types';
import { useAgents } from './useAgents';
import { AgentList } from './AgentList';
import { AgentDetail } from './AgentDetail';
import { ApiKeyCreateModal, ApiKeyTokenModal, RegisterModal, CredentialsModal } from './AgentForm';

export function AgentsPage({ focusQuery }: { focusQuery?: string }) {
  const { agents, loadError, loadAgents } = useAgents();
  const [hideRevoked, setHideRevoked] = useState(true);
  const [showRegister, setShowRegister] = useState(false);
  const [showCredentials, setShowCredentials] = useState<AgentCredentials | null>(null);
  const [showApiKeyCreate, setShowApiKeyCreate] = useState(false);
  const [showApiKeyToken, setShowApiKeyToken] = useState<ApiKeyResult | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  useEffect(() => {
    const query = focusQuery?.replace(/^agent\s+/i, '').trim().toLowerCase();
    if (!query) return;
    const matched = agents.find((agent) =>
      [agent.id, agent.name, agent.client_id, agent.client_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase() === query),
    );
    if (matched) {
      // 外部导航查询命中智能体时同步详情选择。
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedAgent(matched);
    }
  }, [agents, focusQuery]);

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>Agents</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
            <input type="checkbox" checked={hideRevoked} onChange={e => setHideRevoked(e.target.checked)} /> Hide revoked
          </label>
          <button className="btn btn-secondary" onClick={() => setShowApiKeyCreate(true)}>+ API Key</button>
          <button className="btn btn-primary" onClick={() => setShowRegister(true)}>+ OAuth Client</button>
        </div>
      </div>

      {loadError && (
        <div
          role="alert"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '12px 16px', marginBottom: 16, color: 'var(--text-danger, #ff4757)', border: '1px solid rgba(255,71,87,0.2)', borderRadius: 8 }}
        >
          <span>Unable to load agents: {loadError}</span>
          <button className="btn btn-secondary" onClick={loadAgents}>Retry</button>
        </div>
      )}

      <AgentList
        agents={agents}
        hideRevoked={hideRevoked}
        onSelectAgent={setSelectedAgent}
      />

      {showRegister && (
        <RegisterModal
          onClose={() => setShowRegister(false)}
          onRegistered={(creds) => { setShowRegister(false); setShowCredentials(creds); loadAgents(); }}
        />
      )}

      {showCredentials && (
        <CredentialsModal
          credentials={showCredentials}
          onClose={() => setShowCredentials(null)}
        />
      )}

      {selectedAgent && (
        <AgentDetail agent={selectedAgent} onClose={() => setSelectedAgent(null)} onRevoked={loadAgents} />
      )}

      {showApiKeyCreate && (
        <ApiKeyCreateModal
          onClose={() => setShowApiKeyCreate(false)}
          onCreated={(result) => { setShowApiKeyCreate(false); setShowApiKeyToken(result); loadAgents(); }}
        />
      )}

      {showApiKeyToken && (
        <ApiKeyTokenModal token={showApiKeyToken} onClose={() => setShowApiKeyToken(null)} />
      )}
    </>
  );
}

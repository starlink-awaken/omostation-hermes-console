import React, { useState } from 'react';
import { gbrain } from '../../../api/gbrain';
import type { Agent } from './types';

interface AgentDetailProps {
  agent: Agent;
  onClose: () => void;
  onRevoked: () => void;
}

type ConfigTab = 'claude-code' | 'chatgpt' | 'claude-cowork' | 'perplexity' | 'cursor' | 'json';

export function AgentDetail({ agent, onClose, onRevoked }: AgentDetailProps) {
  const [tab, setTab] = useState<ConfigTab>('claude-code');
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const copy = (text: string) => navigator.clipboard.writeText(text);
  const serverUrl = window.location.origin;

  const cid = agent.id || agent.client_id || '';
  const isOAuth = agent.auth_type === 'oauth';
  const agentName = agent.name || agent.client_name || 'unknown';

  const configSnippets: Record<string, string> = {
    'claude-code': isOAuth
      ? [
        `The user wants to connect GBrain MCP to your context. Here's how.`,
        ``,
        `# Step 1 — read the client secret from the operator without putting it in shell history.`,
        `# read -s suppresses the echo; export keeps it scoped to this shell session.`,
        `read -rs -p "Client Secret: " GBRAIN_CS && echo`,
        ``,
        `# Step 2 — mint a token and register GBrain in one go.`,
        `claude mcp add --transport http gbrain ${serverUrl}/mcp \\`,
        `  --header "Authorization: Bearer $(curl -s -X POST ${serverUrl}/token \\`,
        `    -d 'grant_type=client_credentials' \\`,
        `    -d 'client_id=${cid}' \\`,
        `    --data-urlencode "client_secret=$GBRAIN_CS" \\`,
        `    -d 'scope=${agent.scope || 'read write'}' | jq -r .access_token)"`,
        ``,
        `# Step 3 — clear the secret from this shell.`,
        `unset GBRAIN_CS`,
        ``,
        `The token will last ${agent.token_ttl ? (agent.token_ttl >= 86400 ? Math.floor(agent.token_ttl / 86400) + ' days' : Math.floor(agent.token_ttl / 3600) + ' hours') : '1 hour (default)'}.`,
        ``,
        `─── Fallback: 2-step curl + paste ───`,
        ``,
        `If your shell doesn't support read -s, mint the token first, then paste:`,
        ``,
        `curl -s -X POST ${serverUrl}/token \\`,
        `  -d 'grant_type=client_credentials' \\`,
        `  -d 'client_id=${cid}' \\`,
        `  -d 'client_secret=PASTE_YOUR_CLIENT_SECRET_HERE' \\`,
        `  -d 'scope=${agent.scope || 'read write'}' | jq -r .access_token`,
        ``,
        `claude mcp add --transport http gbrain ${serverUrl}/mcp \\`,
        `  --header "Authorization: Bearer PASTE_TOKEN_FROM_ABOVE"`,
        ``,
        `# Then run: history -d $((HISTCMD-1))   # zsh: print -s -- '' && fc -p`,
      ].join('\n')
      : [
        `The user wants to connect GBrain MCP to your context. Here's how.`,
        ``,
        `Run this command in terminal to register GBrain:`,
        ``,
        `claude mcp add --transport http gbrain ${serverUrl}/mcp \\`,
        `  --header "Authorization: Bearer PASTE_YOUR_API_KEY_HERE"`,
        ``,
        `Replace PASTE_YOUR_API_KEY_HERE with the API key shown when "${agentName}" was created.`,
        `API keys never expire.`,
      ].join('\n'),

    'chatgpt': [
      `The user wants to connect GBrain MCP to ChatGPT.`,
      ``,
      `1. Open ChatGPT > Settings > Tools & Integrations > Add MCP Server`,
      `2. Enter this URL — ChatGPT will auto-discover the OAuth configuration:`,
      ``,
      `   ${serverUrl}/.well-known/oauth-authorization-server`,
      ``,
      `3. When prompted for credentials:`,
      `   Client ID: ${cid}`,
      `   Client Secret: (the secret from agent registration)`,
      `   Grant Type: client_credentials`,
      `   Scope: ${agent.scope || 'read write'}`,
    ].join('\n'),

    'claude-cowork': [
      `The user wants to connect GBrain MCP to Claude.ai.`,
      ``,
      `1. Open claude.ai > Settings > Connected Apps > Add MCP Server`,
      `2. Server URL: ${serverUrl}/mcp`,
      `3. When prompted for auth:`,
      `   Token endpoint: ${serverUrl}/token`,
      `   Client ID: ${cid}`,
      `   Client Secret: (the secret from agent registration)`,
      `   Scope: ${agent.scope || 'read write'}`,
      ``,
      `Discovery URL: ${serverUrl}/.well-known/oauth-authorization-server`,
    ].join('\n'),

    cursor: isOAuth
      ? [
        `The user wants to connect GBrain MCP to Cursor.`,
        ``,
        `Cursor supports OAuth for remote MCP. Add to .cursor/mcp.json:`,
        ``,
        `{`,
        `  "mcpServers": {`,
        `    "gbrain": {`,
        `      "url": "${serverUrl}/mcp",`,
        `      "transport": "sse"`,
        `    }`,
        `  }`,
        `}`,
        ``,
        `Cursor will auto-discover OAuth via:`,
        `${serverUrl}/.well-known/oauth-authorization-server`,
        ``,
        `When prompted: Client ID ${cid}, use the secret from registration.`,
      ].join('\n')
      : [
        `The user wants to connect GBrain MCP to Cursor.`,
        ``,
        `Add to .cursor/mcp.json:`,
        ``,
        `{`,
        `  "mcpServers": {`,
        `    "gbrain": {`,
        `      "url": "${serverUrl}/mcp",`,
        `      "transport": "sse",`,
        `      "headers": {`,
        `        "Authorization": "Bearer PASTE_YOUR_API_KEY_HERE"`,
        `      }`,
        `    }`,
        `  }`,
        `}`,
        ``,
        `Replace PASTE_YOUR_API_KEY_HERE with the API key shown when "${agentName}" was created.`,
      ].join('\n'),

    perplexity: [
      `The user wants to connect GBrain MCP to Perplexity.`,
      ``,
      `1. Go to Settings > Connectors > Add MCP`,
      `2. Server URL: ${serverUrl}/mcp`,
      `3. Client ID: ${cid}`,
      `4. Client Secret: (the secret from agent registration)`,
    ].join('\n'),

    json: JSON.stringify({
      server_url: serverUrl + '/mcp',
      token_url: serverUrl + '/token',
      discovery_url: serverUrl + '/.well-known/oauth-authorization-server',
      client_id: cid,
      client_name: agentName,
      auth_type: agent.auth_type,
      scope: agent.scope,
    }, null, 2),
  };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer">
        <button className="drawer-close" onClick={onClose}>&#10005;</button>
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 4 }}>{agent.name || agent.client_name}</div>
        <span className={`badge ${agent.status === 'active' ? 'badge-success' : 'badge-danger'}`}>{agent.status}</span>

        <div className="section-title">Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '6px 12px', fontSize: 13 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Client ID</span>
          <span className="mono">{(agent.id || agent.id || agent.client_id || '').substring(0, 24)}...</span>
          <span style={{ color: 'var(--text-secondary)' }}>Scopes</span>
          <span>{(agent.scope || '').split(' ').filter(Boolean).map(s => (
            <span key={s} className={`badge badge-${s}`} style={{ marginRight: 4 }}>{s}</span>
          ))}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Registered</span>
          <span>{new Date(agent.created_at).toLocaleDateString()}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Token TTL</span>
          <span>{agent.token_ttl ? (agent.token_ttl >= 31536000 ? 'No expiry' : agent.token_ttl >= 86400 ? `${Math.floor(agent.token_ttl / 86400)}d` : agent.token_ttl >= 3600 ? `${Math.floor(agent.token_ttl / 3600)}h` : `${agent.token_ttl}s`) : '1h (default)'}</span>
        </div>

        {/*
          Config Export visible for both auth_type=oauth AND auth_type=api_key.
          Claude Code + Cursor + JSON tabs render real snippets regardless
          (commit 15's snippets are auth-type-aware for those two clients;
          JSON is just structured metadata). ChatGPT, Claude.ai, and
          Perplexity tabs render an "OAuth client required" message on
          api_key agents — those MCP clients only speak OAuth 2.0
          client_credentials, not raw bearer tokens.

          Pre-fix (Wintermute commit 16): the entire Config Export
          section was hidden for api_key agents, dropping the working
          Claude Code + Cursor snippets along with the broken ones.
          (D5=C in the eng review.)
        */}
        <div className="section-title">Config Export</div>
        <div className="tabs" style={{ flexWrap: 'wrap' }}>
          <div className={`tab ${tab === 'claude-code' ? 'active' : ''}`} onClick={() => setTab('claude-code')}>Claude Code</div>
          <div className={`tab ${tab === 'chatgpt' ? 'active' : ''}`} onClick={() => setTab('chatgpt')}>ChatGPT</div>
          <div className={`tab ${tab === 'claude-cowork' ? 'active' : ''}`} onClick={() => setTab('claude-cowork')}>Claude.ai</div>
          <div className={`tab ${tab === 'cursor' ? 'active' : ''}`} onClick={() => setTab('cursor')}>Cursor</div>
          <div className={`tab ${tab === 'perplexity' ? 'active' : ''}`} onClick={() => setTab('perplexity')}>Perplexity</div>
          <div className={`tab ${tab === 'json' ? 'active' : ''}`} onClick={() => setTab('json')}>JSON</div>
        </div>
        {(() => {
          const oauthOnlyTabs = new Set(['chatgpt', 'claude-cowork', 'perplexity']);
          if (!isOAuth && oauthOnlyTabs.has(tab)) {
            const clientName = { chatgpt: 'ChatGPT', 'claude-cowork': 'Claude.ai', perplexity: 'Perplexity' }[tab] || tab;
            return (
              <div style={{
                background: 'rgba(255, 200, 100, 0.08)',
                border: '1px solid rgba(255, 200, 100, 0.2)',
                borderRadius: 8,
                padding: '14px 16px',
                marginTop: 12,
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {clientName} requires an OAuth client
                </div>
                {clientName} only supports OAuth 2.0 (client_credentials). API keys use raw bearer tokens, which {clientName} does not accept. Register a separate OAuth client and use that to connect this AI.
              </div>
            );
          }
          return (
            <div className="code-block">
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{configSnippets[tab]}</pre>
              <button className="copy-btn" onClick={() => copy(configSnippets[tab])}>Copy</button>
            </div>
          );
        })()}

        <div style={{ marginTop: 32 }}>
          {agent.status === 'active' && (
            <button className="btn btn-danger" onClick={async () => {
              if (!confirm(`Revoke ${agent.name || agent.client_name}? All active tokens will be invalidated.`)) return;
              setRevokeError(null);
              try {
                if (agent.auth_type === 'oauth') {
                  await gbrain.revokeClient(agent.id || agent.client_id || '');
                } else {
                  await gbrain.revokeApiKey(agent.name || '');
                }
                onRevoked();
                onClose();
              } catch (e) {
                setRevokeError(`Revoke failed: ${e instanceof Error ? e.message : 'unknown error'}`);
              }
            }}>Revoke Agent</button>
          )}
          {revokeError && (
            <div role="alert" style={{ color: 'var(--text-danger, #ff4757)', fontSize: 13, marginTop: 10 }}>
              {revokeError}
            </div>
          )}
          {agent.status === 'revoked' && (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>This agent has been revoked.</span>
          )}
        </div>
      </div>
    </>
  );
}

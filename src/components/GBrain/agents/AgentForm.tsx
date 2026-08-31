import React, { useState } from 'react';
import { gbrain } from '../../../api/gbrain';
import { ALLOWED_SCOPES_LIST, type Scope } from '../../GBrain/scope-constants';
import type { AgentCredentials, ApiKeyResult } from './types';

interface ApiKeyCreateModalProps {
  onClose: () => void;
  onCreated: (result: ApiKeyResult) => void;
}

export function ApiKeyCreateModal({ onClose, onCreated }: ApiKeyCreateModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    setLoading(true);
    try {
      const data = await gbrain.createApiKey(name.trim());
      onCreated({ name: data.name, token: data.token });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-title">Create API Key</div>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 16 }}>
          API keys use simple bearer token auth. They grant full read+write+admin access.
          For scoped access, use OAuth clients instead.
        </p>
        <div style={{ marginBottom: 16 }}>
          <label>Key Name</label>
          <input placeholder="e.g. claude-code-local" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Key'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface ApiKeyTokenModalProps {
  token: ApiKeyResult;
  onClose: () => void;
}

export function ApiKeyTokenModal({ token, onClose }: ApiKeyTokenModalProps) {
  const copy = (text: string) => navigator.clipboard.writeText(text);

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 36, color: 'var(--success)', marginBottom: 8 }}>&#10003;</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>API Key Created</div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12 }}>Name</label>
          <div className="code-block"><span>{token.name}</span></div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12 }}>Bearer Token</label>
          <div className="code-block">
            <span>{token.token}</span>
            <button className="copy-btn" onClick={() => copy(token.token)}>Copy</button>
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12 }}>Usage</label>
          <div className="code-block">
            <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 12 }}>{`Authorization: Bearer ${token.token}`}</pre>
            <button className="copy-btn" onClick={() => copy(`Authorization: Bearer ${token.token}`)}>Copy</button>
          </div>
        </div>
        <div className="warning-bar">Save this token now. It will not be shown again.</div>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

interface RegisterModalProps {
  onClose: () => void;
  onRegistered: (creds: AgentCredentials) => void;
}

export function RegisterModal({ onClose, onRegistered }: RegisterModalProps) {
  const [name, setName] = useState('');
  // v0.28: scope set sourced from admin/src/lib/scope-constants.ts (mirror
  // of src/core/scope.ts). CI drift check at scripts/check-admin-scope-drift.sh
  // fails the build if these diverge.
  const [scopes, setScopes] = useState<Record<Scope, boolean>>(() =>
    Object.fromEntries(ALLOWED_SCOPES_LIST.map(s => [s, s === 'read'])) as Record<Scope, boolean>,
  );
  const [ttl, setTtl] = useState('86400'); // 24h default
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ttlOptions = [
    { label: '1 hour', value: '3600' },
    { label: '24 hours', value: '86400' },
    { label: '7 days', value: '604800' },
    { label: '30 days', value: '2592000' },
    { label: '1 year', value: '31536000' },
    { label: 'No expiry', value: '0' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name required'); return; }
    setLoading(true);
    setError('');
    try {
      // Use the CLI registration endpoint (POST to admin API)
      const selectedScopes = Object.entries(scopes).filter(([, v]) => v).map(([k]) => k).join(' ');
      const res = await fetch('/admin/api/register-client', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes: selectedScopes, tokenTtl: ttl === '0' ? 315360000 : Number(ttl) }),
      });
      if (!res.ok) throw new Error('Registration failed');
      const data = await res.json();
      onRegistered({ clientId: data.clientId, clientSecret: data.clientSecret, name: name.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className="modal-title">Register Agent</div>
        <div style={{ marginBottom: 16 }}>
          <label>Agent Name</label>
          <input placeholder="e.g. perplexity-production" value={name} onChange={e => setName(e.target.value)} autoFocus />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label>Scopes</label>
          <div className="checkbox-group">
            {ALLOWED_SCOPES_LIST.map(s => (
              <label key={s} className="checkbox-label">
                <input type="checkbox" checked={scopes[s]} onChange={e => setScopes(p => ({ ...p, [s]: e.target.checked }))} />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <label>Token Lifetime</label>
          <select value={ttl} onChange={e => setTtl(e.target.value)}
            style={{ width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 14 }}>
            {ttlOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {error && <div style={{ color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Registering...' : 'Register'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface CredentialsModalProps {
  credentials: AgentCredentials;
  onClose: () => void;
}

export function CredentialsModal({ credentials, onClose }: CredentialsModalProps) {
  const copy = (text: string) => navigator.clipboard.writeText(text);
  const downloadJson = () => {
    const blob = new Blob([JSON.stringify(credentials, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${credentials.name}-credentials.json`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 560 }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 36, color: 'var(--success)', marginBottom: 8 }}>&#10003;</div>
          <div style={{ fontSize: 20, fontWeight: 600 }}>Agent Registered</div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12 }}>Client ID</label>
          <div className="code-block">
            <span>{credentials.clientId}</span>
            <button className="copy-btn" onClick={() => copy(credentials.clientId)}>Copy</button>
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12 }}>Client Secret</label>
          <div className="code-block">
            <span>{credentials.clientSecret}</span>
            <button className="copy-btn" onClick={() => copy(credentials.clientSecret)}>Copy</button>
          </div>
        </div>

        <div className="warning-bar">
          Save this secret now. It will not be shown again.
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 20 }}>
          <button className="btn btn-secondary" onClick={downloadJson}>Download as JSON</button>
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}

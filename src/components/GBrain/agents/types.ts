import type { Scope } from '../../GBrain/scope-constants';

export interface Agent {
  id: string;
  name: string;
  auth_type: 'oauth' | 'api_key';
  client_id?: string;  // compat
  client_name?: string; // compat
  grant_types: string[];
  scope: string;
  created_at: string;
  last_used_at: string | null;
  total_requests: number;
  requests_today: number;
  token_ttl: number | null;
  status: 'active' | 'revoked';
}

export interface AgentCredentials {
  clientId: string;
  clientSecret: string;
  name: string;
}

export interface ApiKeyResult {
  name: string;
  token: string;
}

export type { Scope };

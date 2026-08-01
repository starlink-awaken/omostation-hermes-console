import { describe, expect, it, vi, beforeEach } from 'vitest';
import { gbrain } from '../gbrain';

function mockFetch(body: unknown, opts?: { ok?: boolean; status?: number }) {
  const ok = opts?.ok ?? true;
  const status = opts?.status ?? 200;
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as Response);
}

function mockFetchText(text: string, opts?: { ok?: boolean; status?: number }) {
  const ok = opts?.ok ?? true;
  const status = opts?.status ?? 200;
  (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
    ok,
    status,
    text: async () => text,
    json: async () => ({}),
  } as Response);
}

describe('GBrain adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('gbrainFetch behavior', () => {
    it('stats() returns raw data on success', async () => {
      mockFetch({ connected_agents: 3, requests_today: 42, active_tokens: 5 });
      const result = await gbrain.stats();
      expect(result).toEqual({ connected_agents: 3, requests_today: 42, active_tokens: 5 });
    });

    it('throws on 401 Unauthorized', async () => {
      mockFetch({ error: 'Unauthorized' }, { ok: false, status: 401 });
      await expect(gbrain.stats()).rejects.toThrow('Unauthorized');
    });

    it('throws on non-ok response with error body', async () => {
      mockFetch({ error: 'Server error' }, { ok: false, status: 500 });
      await expect(gbrain.stats()).rejects.toThrow('Server error');
    });

    it('throws on non-ok response without error body', async () => {
      mockFetch({}, { ok: false, status: 503 });
      await expect(gbrain.stats()).rejects.toThrow('HTTP 503');
    });

    it('throws on network error', async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network fail'));
      await expect(gbrain.stats()).rejects.toThrow('Network fail');
    });

    it('sends credentials: same-origin', async () => {
      mockFetch({});
      await gbrain.stats();
      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ credentials: 'same-origin' }),
      );
    });
  });

  describe('agents()', () => {
    it('returns agent array with full type', async () => {
      const agents = [
        { id: '1', name: 'test-agent', auth_type: 'api_key', scope: 'read', created_at: '2026-01-01', last_used_at: null, total_requests: 10, requests_today: 2, token_ttl: 86400, status: 'active', grant_types: [] },
      ];
      mockFetch(agents);
      const result = await gbrain.agents();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('test-agent');
      expect(result[0].auth_type).toBe('api_key');
    });
  });

  describe('requests()', () => {
    it('returns rows/total/page/pages structure', async () => {
      const data = { rows: [{ id: 1, token_name: 't', agent_name: 'a', operation: 'search', latency_ms: 50, status: 'ok', params: null, error_message: null, created_at: '2026-01-01' }], total: 1, page: 1, pages: 1 };
      mockFetch(data);
      const result = await gbrain.requests(1, '');
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pages).toBe(1);
    });
  });

  describe('createApiKey()', () => {
    it('returns name and token', async () => {
      mockFetch({ name: 'my-key', token: 'sk-abc123' });
      const result = await gbrain.createApiKey('my-key');
      expect(result.name).toBe('my-key');
      expect(result.token).toBe('sk-abc123');
    });
  });

  describe('calibrationChart()', () => {
    it('returns SVG text via gbrainFetchText', async () => {
      mockFetchText('<svg>chart</svg>');
      const result = await gbrain.calibrationChart('brier-trend');
      expect(result).toBe('<svg>chart</svg>');
    });
  });

  describe('login()', () => {
    it('sends POST with token body', async () => {
      mockFetch({ ok: true });
      await gbrain.login('test-token');
      expect(globalThis.fetch).toHaveBeenCalledWith(
        '/admin/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ token: 'test-token' }),
        }),
      );
    });
  });
});

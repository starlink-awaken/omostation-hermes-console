/**
 * hermes-console bus adapter (R59, Month 1)
 *
 * Wraps existing component event handlers in hermes-console to publish through
 * agora.bus (I0 bus-foundation). When agoraUrl is configured, events are sent
 * over HTTP to the agora MCP `publish_event` tool. When not configured, the
 * adapter falls back to a local in-process broker so the UI continues to work
 * in offline / development mode.
 *
 * The adapter mirrors the agora.bus facade contract (publish/subscribe) but
 * does NOT depend on the Python package directly — TypeScript projects call
 * agora via HTTP. This keeps hermes-console decoupled from agora's runtime.
 */

export interface BusEnvelope {
  id: string;
  time: string;
  type: string;
  source: string;
  schema_version: number;
  trace_id?: string | null;
  payload: Record<string, unknown>;
}

export interface HermesBusConfig {
  /** Base URL of the agora HTTP/MCP gateway, e.g. http://localhost:7070 */
  agoraUrl?: string;
  /** Default source tag attached to every event */
  source?: string;
  /** Schema version to send (matches agora.bus.envelope default) */
  schemaVersion?: number;
  /** Optional fetch implementation (for tests / SSR) */
  fetchImpl?: typeof fetch;
}

type Subscriber = (envelope: BusEnvelope) => void | Promise<void>;

const DEFAULT_SOURCE = "hermes-console";

function uuid(): string {
  // crypto.randomUUID is available in modern browsers + Node 19+ / bun.
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return "evt_" + Math.random().toString(36).slice(2, 10);
}

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

export class HermesBus {
  private readonly subscribers = new Map<string, Set<Subscriber>>();
  private readonly config: Required<HermesBusConfig>;

  constructor(config: HermesBusConfig = {}) {
    this.config = {
      agoraUrl: config.agoraUrl ?? "",
      source: config.source ?? DEFAULT_SOURCE,
      schemaVersion: config.schemaVersion ?? 1,
      fetchImpl: config.fetchImpl ?? globalThis.fetch.bind(globalThis),
    };
  }

  /** Build a BusEnvelope compatible with agora.bus.envelope.BusEnvelope. */
  buildEnvelope(
    type: string,
    payload: Record<string, unknown>,
    traceId?: string,
  ): BusEnvelope {
    return {
      id: "evt_" + uuid().replace(/-/g, "").slice(0, 12),
      time: nowIso(),
      type,
      source: this.config.source,
      schema_version: this.config.schemaVersion,
      trace_id: traceId ?? null,
      payload,
    };
  }

  /** Publish an event. If agoraUrl is set, POST to agora MCP; always notify local subscribers. */
  async publish(envelope: BusEnvelope): Promise<string> {
    // Local fan-out first — UI updates should not block on network.
    this.fanout(envelope);
    if (this.config.agoraUrl) {
      try {
        await this.config.fetchImpl(`${this.config.agoraUrl}/mcp/event/publish`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(envelope),
        });
      } catch (err) {
        // RETRY-OWNERSHIP: do not retry here. The agora router will DLQ on failure.
        // We swallow the error so the UI keeps working; observability is upstream.
        console.warn("[hermes-bus] agora publish failed (DLQ handled upstream):", err);
      }
    }
    return envelope.id;
  }

  /** Subscribe to a type-pattern. Returns an unsubscribe function. */
  subscribe(type: string, callback: Subscriber): () => void {
    const set = this.subscribers.get(type) ?? new Set<Subscriber>();
    set.add(callback);
    this.subscribers.set(type, set);
    return () => {
      set.delete(callback);
      if (set.size === 0) this.subscribers.delete(type);
    };
  }

  private fanout(envelope: BusEnvelope): void {
    const exact = this.subscribers.get(envelope.type);
    if (exact) for (const fn of exact) void fn(envelope);
    const wildcard = this.subscribers.get("*");
    if (wildcard) for (const fn of wildcard) void fn(envelope);
  }
}

/** Default singleton used by hermes-console components. */
export const hermesBus = new HermesBus({
  source: "hermes-console",
});

/**
 * Helper for components that already maintain an `onEvent` prop pattern.
 * Wraps the legacy handler so events also flow through agora.bus.
 */
export function withBusPublish<T extends Record<string, unknown>>(
  type: string,
  bus: HermesBus = hermesBus,
) {
  return function wrap(props: T, payload: Record<string, unknown>): T {
    const envelope = bus.buildEnvelope(type, payload);
    void bus.publish(envelope);
    return props;
  };
}

/**
 * Smoke test for hermes-console bus adapter.
 * Run with: bun test src/hermes_console/bus_adapter.test.ts
 */
import { describe, expect, mock, test } from "bun:test";
import { HermesBus, withBusPublish } from "./bus_adapter";

describe("HermesBus", () => {
  test("buildEnvelope sets required fields", () => {
    const bus = new HermesBus({ source: "test" });
    const env = bus.buildEnvelope("pipeline:started", { foo: 1 });
    expect(env.type).toBe("pipeline:started");
    expect(env.source).toBe("test");
    expect(env.schema_version).toBe(1);
    expect(env.payload).toEqual({ foo: 1 });
    expect(env.id).toMatch(/^evt_/);
  });

  test("publish fans out to local subscribers", async () => {
    const bus = new HermesBus();
    const handler = mock(() => {});
    const unsub = bus.subscribe("pipeline:completed", handler);
    const env = bus.buildEnvelope("pipeline:completed", { x: 1 });
    await bus.publish(env);
    expect(handler).toHaveBeenCalledTimes(1);
    unsub();
    await bus.publish(env);
    expect(handler).toHaveBeenCalledTimes(1); // unsubscribed
  });

  test("publish posts to agora when agoraUrl set, swallows network errors", async () => {
    const fetchMock = mock(() => Promise.reject(new Error("network down")));
    const bus = new HermesBus({ agoraUrl: "http://localhost:9", fetchImpl: fetchMock as typeof fetch });
    const env = bus.buildEnvelope("message:received", { ok: true });
    // Should not throw even though fetch fails.
    await bus.publish(env);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // R61 follow-up: wildcard subscription catches every event type.
  test("wildcard subscribers receive every event type", async () => {
    const bus = new HermesBus();
    const handler = mock(() => {});
    bus.subscribe("*", handler);
    await bus.publish(bus.buildEnvelope("pipeline:started", {}));
    await bus.publish(bus.buildEnvelope("pipeline:completed", {}));
    await bus.publish(bus.buildEnvelope("message:received", {}));
    expect(handler).toHaveBeenCalledTimes(3);
  });
});

describe("withBusPublish", () => {
  test("publishes event and returns props unchanged", async () => {
    const bus = new HermesBus();
    const handler = mock(() => {});
    bus.subscribe("ui:click", handler);
    const wrap = withBusPublish<{ className: string }>("ui:click", bus);
    const props = { className: "btn" };
    const out = wrap(props, { buttonId: "save" });
    // Wait one microtask for the fire-and-forget publish() to complete.
    await new Promise((r) => setTimeout(r, 10));
    expect(out).toEqual(props);
    expect(handler).toHaveBeenCalledTimes(1);
    const env = handler.mock.calls[0][0];
    expect(env.type).toBe("ui:click");
    expect(env.payload).toEqual({ buttonId: "save" });
  });
});

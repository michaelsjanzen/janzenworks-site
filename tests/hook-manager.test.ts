/**
 * Unit tests for HookManager — the action/filter system that plugins
 * use to register listeners and that core fires at call sites.
 *
 * Uses a bare HookManager instance (not the global singleton) so tests
 * are fully isolated from each other and from the running app.
 */
import { describe, it, expect, vi } from "vitest";
import { HookManager } from "../src/lib/hooks";

// Minimal catalogues for testing — no DB or external deps needed.
interface TestActions {
  "test:event":  { value: number };
  "test:strict": { value: number };
}
interface TestFilters {
  "test:transform": { input: string; multiplier: number };
  "test:chain":     { input: number };
}

function makeHooks() {
  return new HookManager<TestActions, TestFilters>();
}

// ── addAction / doAction ───────────────────────────────────────────────────────

describe("HookManager — actions", () => {
  it("calls a registered listener with the payload", async () => {
    const hooks = makeHooks();
    const fn = vi.fn();
    hooks.addAction("test:event", fn);
    await hooks.doAction("test:event", { value: 42 });
    expect(fn).toHaveBeenCalledOnce();
    expect(fn).toHaveBeenCalledWith({ value: 42 });
  });

  it("calls multiple listeners in registration order", async () => {
    const hooks = makeHooks();
    const order: number[] = [];
    hooks.addAction("test:event", () => { order.push(1); });
    hooks.addAction("test:event", () => { order.push(2); });
    hooks.addAction("test:event", () => { order.push(3); });
    await hooks.doAction("test:event", { value: 0 });
    expect(order).toEqual([1, 2, 3]);
  });

  it("does not throw when no listeners are registered", async () => {
    const hooks = makeHooks();
    await expect(hooks.doAction("test:event", { value: 0 })).resolves.toBeUndefined();
  });

  it("swallows listener errors and continues (non-strict)", async () => {
    const hooks = makeHooks();
    const second = vi.fn();
    hooks.addAction("test:event", () => { throw new Error("boom"); });
    hooks.addAction("test:event", second);
    await expect(hooks.doAction("test:event", { value: 0 })).resolves.toBeUndefined();
    expect(second).toHaveBeenCalledOnce();
  });

  it("calls the error handler when a listener throws", async () => {
    const hooks = makeHooks();
    const onError = vi.fn();
    hooks.setErrorHandler(onError);
    hooks.addAction("test:event", () => { throw new Error("oops"); });
    await hooks.doAction("test:event", { value: 0 });
    expect(onError).toHaveBeenCalledOnce();
    expect(onError.mock.calls[0][0].hook).toBe("test:event");
    expect(onError.mock.calls[0][0].error.message).toBe("oops");
  });

  it("awaits async listeners", async () => {
    const hooks = makeHooks();
    let resolved = false;
    hooks.addAction("test:event", async () => {
      await new Promise(r => setTimeout(r, 5));
      resolved = true;
    });
    await hooks.doAction("test:event", { value: 0 });
    expect(resolved).toBe(true);
  });
});

// ── doActionStrict ─────────────────────────────────────────────────────────────

describe("HookManager — doActionStrict", () => {
  it("propagates errors from listeners", async () => {
    const hooks = makeHooks();
    hooks.addAction("test:strict", () => { throw new Error("rejected"); });
    await expect(hooks.doActionStrict("test:strict", { value: 0 })).rejects.toThrow("rejected");
  });

  it("aborts remaining listeners after first throw", async () => {
    const hooks = makeHooks();
    const second = vi.fn();
    hooks.addAction("test:strict", () => { throw new Error("stop"); });
    hooks.addAction("test:strict", second);
    await expect(hooks.doActionStrict("test:strict", { value: 0 })).rejects.toThrow("stop");
    expect(second).not.toHaveBeenCalled();
  });

  it("resolves normally when no listener throws", async () => {
    const hooks = makeHooks();
    hooks.addAction("test:strict", vi.fn());
    await expect(hooks.doActionStrict("test:strict", { value: 1 })).resolves.toBeUndefined();
  });
});

// ── addFilter / applyFilters ──────────────────────────────────────────────────

describe("HookManager — filters", () => {
  it("returns the original input when no filters are registered", async () => {
    const hooks = makeHooks();
    const result = await hooks.applyFilters("test:transform", { input: "hello", multiplier: 2 });
    expect(result).toBe("hello");
  });

  it("transforms input through a single filter", async () => {
    const hooks = makeHooks();
    hooks.addFilter("test:transform", ({ input, multiplier }) => input.repeat(multiplier));
    const result = await hooks.applyFilters("test:transform", { input: "ab", multiplier: 3 });
    expect(result).toBe("ababab");
  });

  it("chains multiple filters in registration order", async () => {
    const hooks = makeHooks();
    hooks.addFilter("test:chain", ({ input }) => input + 1);
    hooks.addFilter("test:chain", ({ input }) => input * 2);
    hooks.addFilter("test:chain", ({ input }) => input - 3);
    // (0 + 1) * 2 - 3 = -1
    const result = await hooks.applyFilters("test:chain", { input: 0 });
    expect(result).toBe(-1);
  });

  it("each filter in the chain receives the previous filter's output", async () => {
    const hooks = makeHooks();
    const received: number[] = [];
    hooks.addFilter("test:chain", ({ input }) => { received.push(input); return input + 10; });
    hooks.addFilter("test:chain", ({ input }) => { received.push(input); return input + 10; });
    await hooks.applyFilters("test:chain", { input: 5 });
    expect(received).toEqual([5, 15]);
  });

  it("skips a broken filter and preserves the previous value", async () => {
    const hooks = makeHooks();
    hooks.addFilter("test:chain", ({ input }) => input + 1);
    hooks.addFilter("test:chain", () => { throw new Error("broken"); });
    hooks.addFilter("test:chain", ({ input }) => input + 100);
    // broken filter is skipped, chain continues with value from first filter
    const result = await hooks.applyFilters("test:chain", { input: 0 });
    expect(result).toBe(101);
  });

  it("awaits async filter callbacks", async () => {
    const hooks = makeHooks();
    hooks.addFilter("test:chain", async ({ input }) => {
      await new Promise(r => setTimeout(r, 5));
      return input + 99;
    });
    const result = await hooks.applyFilters("test:chain", { input: 1 });
    expect(result).toBe(100);
  });
});

// ── getRegistered* ────────────────────────────────────────────────────────────

describe("HookManager — introspection", () => {
  it("getRegisteredActions lists registered action hooks", () => {
    const hooks = makeHooks();
    hooks.addAction("test:event", vi.fn());
    hooks.addAction("test:strict", vi.fn());
    expect(hooks.getRegisteredActions()).toContain("test:event");
    expect(hooks.getRegisteredActions()).toContain("test:strict");
  });

  it("getRegisteredFilters lists registered filter hooks", () => {
    const hooks = makeHooks();
    hooks.addFilter("test:transform", ({ input }) => input);
    expect(hooks.getRegisteredFilters()).toContain("test:transform");
  });

  it("returns empty arrays when nothing is registered", () => {
    const hooks = makeHooks();
    expect(hooks.getRegisteredActions()).toHaveLength(0);
    expect(hooks.getRegisteredFilters()).toHaveLength(0);
  });
});

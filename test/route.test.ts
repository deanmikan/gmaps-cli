import { describe, expect, test, beforeEach, afterEach } from "bun:test";

process.env.GOOGLE_MAPS_API_KEY = "test-key";

import { route } from "../src/commands/route.js";

describe("route", () => {
  let originalFetch: typeof global.fetch;
  let logs: string[];
  let originalLog: typeof console.log;
  let originalExit: typeof process.exit;

  beforeEach(() => {
    originalFetch = global.fetch;
    originalLog = console.log;
    originalExit = process.exit;
    logs = [];
    console.log = (...args: unknown[]) => { logs.push(args.map(String).join(" ")); };
    process.exit = ((code?: number) => { throw new Error(`EXIT:${code}`); }) as never;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    console.log = originalLog;
    process.exit = originalExit;
  });

  const mockRouteData = {
    routes: [{
      distanceMeters: 15200,
      duration: "1680s",
    }],
  };

  function mockMcpResponse(result: unknown) {
    global.fetch = (async () => {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { content: [{ type: "text", text: JSON.stringify(result) }] },
      }));
    }) as typeof fetch;
  }

  function mockMcpResponseCapture(result: unknown): { captured: { body: Record<string, unknown> } } {
    const captured = { body: {} as Record<string, unknown> };
    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      captured.body = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { content: [{ type: "text", text: JSON.stringify(result) }] },
      }));
    }) as typeof fetch;
    return { captured };
  }

  test("sends correct JSON-RPC request for basic route", async () => {
    const { captured } = mockMcpResponseCapture(mockRouteData);

    await route(["JFK Airport", "Manhattan"]);

    expect(captured.body).toMatchObject({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "compute_routes",
        arguments: {
          origin: { address: "JFK Airport" },
          destination: { address: "Manhattan" },
          travelMode: "DRIVE",
        },
      },
    });
  });

  test("formats response correctly", async () => {
    mockMcpResponse(mockRouteData);

    await route(["A", "B"]);

    const output = JSON.parse(logs[0]);
    expect(output.route.distance).toBe("15.2 km");
    expect(output.route.duration).toBe("28 mins");
    expect(output.route.distanceMeters).toBe(15200);
    expect(output.route.durationSeconds).toBe(1680);
  });

  test("handles --mode walk flag", async () => {
    const { captured } = mockMcpResponseCapture(mockRouteData);

    await route(["A", "B", "--mode", "walk"]);

    const args = (captured.body as any).params.arguments;
    expect(args.travelMode).toBe("WALK");
  });

  test("parses coordinate origins as lat/lng", async () => {
    const { captured } = mockMcpResponseCapture(mockRouteData);

    await route(["-33.8688,151.2093", "40.7128,-74.0060"]);

    const args = (captured.body as any).params.arguments;
    expect(args.origin).toEqual({
      latLng: { latitude: -33.8688, longitude: 151.2093 },
    });
    expect(args.destination).toEqual({
      latLng: { latitude: 40.7128, longitude: -74.006 },
    });
  });

  test("exits with error for missing destination", async () => {
    await expect(route(["only-origin"])).rejects.toThrow("EXIT:1");
  });

  test("exits with error for invalid mode", async () => {
    await expect(route(["A", "B", "--mode", "bicycle"])).rejects.toThrow("EXIT:1");
  });

  test("exits with error when no route found", async () => {
    mockMcpResponse({ routes: [] });

    await expect(route(["A", "B"])).rejects.toThrow("EXIT:1");
  });

  test("formats small distances in meters", async () => {
    mockMcpResponse({ routes: [{ distanceMeters: 500, duration: "300s" }] });

    await route(["A", "B"]);

    const output = JSON.parse(logs[0]);
    expect(output.route.distance).toBe("500 m");
    expect(output.route.duration).toBe("5 mins");
  });
});

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

  const mockRouteResponse = {
    routes: [{
      distanceMeters: 15200,
      duration: "1680s",
      localizedValues: {
        distance: { text: "15.2 km" },
        duration: { text: "28 mins" },
      },
      legs: [{
        steps: [{
          navigationInstruction: { instructions: "Head north on Van Wyck Expy" },
          localizedValues: {
            distance: { text: "3.1 km" },
            staticDuration: { text: "5 mins" },
          },
        }],
      }],
    }],
  };

  test("sends correct request body for basic route", async () => {
    let capturedBody: Record<string, unknown> = {};
    let capturedHeaders: Record<string, string> = {};

    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      capturedHeaders = Object.fromEntries(
        Object.entries(init?.headers as Record<string, string>)
      );
      return new Response(JSON.stringify(mockRouteResponse));
    }) as typeof fetch;

    await route(["JFK Airport", "Manhattan"]);

    expect(capturedBody.origin).toEqual({ address: "JFK Airport" });
    expect(capturedBody.destination).toEqual({ address: "Manhattan" });
    expect(capturedBody.travelMode).toBe("DRIVE");
    expect(capturedBody.units).toBe("METRIC");
    expect(capturedHeaders["X-Goog-Api-Key"]).toBe("test-key");
  });

  test("formats response correctly", async () => {
    global.fetch = (async () => {
      return new Response(JSON.stringify(mockRouteResponse));
    }) as typeof fetch;

    await route(["A", "B"]);

    const output = JSON.parse(logs[0]);
    expect(output.route.distance).toBe("15.2 km");
    expect(output.route.duration).toBe("28 mins");
    expect(output.route.steps).toHaveLength(1);
    expect(output.route.steps[0].instruction).toBe("Head north on Van Wyck Expy");
    expect(output.route.steps[0].distance).toBe("3.1 km");
    expect(output.route.steps[0].duration).toBe("5 mins");
  });

  test("handles --mode flag", async () => {
    let capturedBody: Record<string, unknown> = {};

    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify(mockRouteResponse));
    }) as typeof fetch;

    await route(["A", "B", "--mode", "walk"]);
    expect(capturedBody.travelMode).toBe("WALK");
  });

  test("handles --units imperial flag", async () => {
    let capturedBody: Record<string, unknown> = {};

    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify(mockRouteResponse));
    }) as typeof fetch;

    await route(["A", "B", "--units", "imperial"]);
    expect(capturedBody.units).toBe("IMPERIAL");
  });

  test("handles --waypoints flag", async () => {
    let capturedBody: Record<string, unknown> = {};

    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify(mockRouteResponse));
    }) as typeof fetch;

    await route(["Sydney", "Melbourne", "--waypoints", "Canberra,Albury"]);

    const intermediates = capturedBody.intermediates as Array<{ address?: string }>;
    expect(intermediates).toHaveLength(2);
    expect(intermediates[0]).toEqual({ address: "Canberra" });
    expect(intermediates[1]).toEqual({ address: "Albury" });
  });

  test("parses coordinate waypoints as lat/lng", async () => {
    let capturedBody: Record<string, unknown> = {};

    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify(mockRouteResponse));
    }) as typeof fetch;

    await route(["-33.8688,151.2093", "40.7128,-74.0060"]);

    expect(capturedBody.origin).toEqual({
      location: { latLng: { latitude: -33.8688, longitude: 151.2093 } },
    });
    expect(capturedBody.destination).toEqual({
      location: { latLng: { latitude: 40.7128, longitude: -74.006 } },
    });
  });

  test("exits with error for missing destination", async () => {
    await expect(route(["only-origin"])).rejects.toThrow("EXIT:1");
  });

  test("exits with error for invalid mode", async () => {
    await expect(route(["A", "B", "--mode", "fly"])).rejects.toThrow("EXIT:1");
  });

  test("exits with error when no route found", async () => {
    global.fetch = (async () => {
      return new Response(JSON.stringify({ routes: [] }));
    }) as typeof fetch;

    await expect(route(["A", "B"])).rejects.toThrow("EXIT:1");
  });

  test("falls back to distanceMeters when localizedValues missing", async () => {
    global.fetch = (async () => {
      return new Response(JSON.stringify({
        routes: [{
          distanceMeters: 5000,
          duration: "600s",
          legs: [{ steps: [] }],
        }],
      }));
    }) as typeof fetch;

    await route(["A", "B"]);

    const output = JSON.parse(logs[0]);
    expect(output.route.distance).toBe("5000 m");
    expect(output.route.duration).toBe("600s");
  });
});

import { describe, expect, test, beforeEach, afterEach } from "bun:test";

process.env.GOOGLE_MAPS_API_KEY = "test-key";

import { places } from "../src/commands/places.js";

describe("places", () => {
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

  function mockMcpResponse(result: unknown) {
    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { content: [{ type: "text", text: JSON.stringify(result) }] },
      }));
    }) as typeof fetch;
  }

  function mockMcpResponseCapture(result: unknown): { captured: { body: Record<string, unknown>; headers: Record<string, string> } } {
    const captured = { body: {} as Record<string, unknown>, headers: {} as Record<string, string> };
    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      captured.body = JSON.parse(init?.body as string);
      captured.headers = Object.fromEntries(
        Object.entries(init?.headers as Record<string, string>)
      );
      return new Response(JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        result: { content: [{ type: "text", text: JSON.stringify(result) }] },
      }));
    }) as typeof fetch;
    return { captured };
  }

  test("sends correct JSON-RPC request", async () => {
    const { captured } = mockMcpResponseCapture({
      places: [{ id: "abc", location: { latitude: -33.8, longitude: 151.2 } }],
      summary: "Test summary",
    });

    await places(["coffee shops"]);

    expect(captured.body).toMatchObject({
      jsonrpc: "2.0",
      method: "tools/call",
      params: {
        name: "search_places",
        arguments: {
          textQuery: "coffee shops",
          pageSize: 10,
          languageCode: "en",
        },
      },
    });
    expect(captured.headers["X-Goog-Api-Key"]).toBe("test-key");
  });

  test("formats response correctly", async () => {
    mockMcpResponse({
      places: [{
        id: "ChIJ123",
        location: { latitude: 40.7423, longitude: -74.006 },
        googleMapsLinks: {
          placeUrl: "https://maps.google.com/place/123",
          directionsUrl: "https://maps.google.com/dir/123",
        },
      }],
      summary: "Found a great coffee shop.",
    });

    await places(["coffee"]);

    const output = JSON.parse(logs[0]);
    expect(output.places).toHaveLength(1);
    expect(output.places[0].id).toBe("ChIJ123");
    expect(output.places[0].location).toEqual({ lat: 40.7423, lng: -74.006 });
    expect(output.places[0].mapsUrl).toBe("https://maps.google.com/place/123");
    expect(output.places[0].directionsUrl).toBe("https://maps.google.com/dir/123");
    expect(output.summary).toBe("Found a great coffee shop.");
  });

  test("handles --near and --radius flags", async () => {
    const { captured } = mockMcpResponseCapture({ places: [], summary: "" });

    await places(["petrol", "--near", "-33.8688,151.2093", "--radius", "2000"]);

    const args = (captured.body as any).params.arguments;
    expect(args.locationBias).toEqual({
      circle: {
        center: { latitude: -33.8688, longitude: 151.2093 },
        radiusMeters: 2000,
      },
    });
  });

  test("handles --limit flag", async () => {
    const { captured } = mockMcpResponseCapture({ places: [], summary: "" });

    await places(["food", "--limit", "5"]);

    const args = (captured.body as any).params.arguments;
    expect(args.pageSize).toBe(5);
  });

  test("handles --region flag", async () => {
    const { captured } = mockMcpResponseCapture({ places: [], summary: "" });

    await places(["restaurants", "--region", "AU"]);

    const args = (captured.body as any).params.arguments;
    expect(args.regionCode).toBe("AU");
  });

  test("handles empty places response", async () => {
    mockMcpResponse({ summary: "No results found." });

    await places(["nonexistent"]);

    const output = JSON.parse(logs[0]);
    expect(output.places).toEqual([]);
  });

  test("handles missing optional fields in place data", async () => {
    mockMcpResponse({ places: [{ id: "abc" }] });

    await places(["test"]);

    const output = JSON.parse(logs[0]);
    expect(output.places[0]).toEqual({
      id: "abc",
      location: null,
      mapsUrl: "",
      directionsUrl: "",
    });
  });

  test("exits with error for missing query", async () => {
    await expect(places([])).rejects.toThrow("EXIT:1");
  });
});

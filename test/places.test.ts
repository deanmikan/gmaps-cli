import { describe, expect, test, mock, beforeEach, afterEach } from "bun:test";

// We need to test the places command by mocking global.fetch and capturing console.log output.
// Set API key env before importing.
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
    // Mock process.exit to throw instead of actually exiting
    process.exit = ((code?: number) => { throw new Error(`EXIT:${code}`); }) as never;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    console.log = originalLog;
    process.exit = originalExit;
  });

  test("sends correct request body for basic query", async () => {
    let capturedUrl = "";
    let capturedBody: Record<string, unknown> = {};
    let capturedHeaders: Record<string, string> = {};

    global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      capturedUrl = url.toString();
      capturedBody = JSON.parse(init?.body as string);
      capturedHeaders = Object.fromEntries(
        Object.entries(init?.headers as Record<string, string>)
      );
      return new Response(JSON.stringify({
        places: [{
          displayName: { text: "Test Cafe" },
          formattedAddress: "123 Test St",
          location: { latitude: -33.8, longitude: 151.2 },
          rating: 4.5,
          types: ["cafe"],
          googleMapsUri: "https://maps.google.com/?cid=123",
        }]
      }));
    }) as typeof fetch;

    await places(["coffee shops"]);

    expect(capturedUrl).toBe("https://places.googleapis.com/v1/places:searchText");
    expect(capturedBody.textQuery).toBe("coffee shops");
    expect(capturedBody.pageSize).toBe(10);
    expect(capturedBody.languageCode).toBe("en");
    expect(capturedHeaders["X-Goog-Api-Key"]).toBe("test-key");
    expect(capturedHeaders["X-Goog-FieldMask"]).toContain("places.displayName");
  });

  test("formats response correctly", async () => {
    global.fetch = (async () => {
      return new Response(JSON.stringify({
        places: [{
          displayName: { text: "Blue Bottle" },
          formattedAddress: "450 W 15th St",
          location: { latitude: 40.7423, longitude: -74.006 },
          rating: 4.5,
          types: ["coffee_shop", "cafe"],
          googleMapsUri: "https://maps.google.com/?cid=456",
        }]
      }));
    }) as typeof fetch;

    await places(["coffee"]);

    const output = JSON.parse(logs[0]);
    expect(output.places).toHaveLength(1);
    expect(output.places[0].name).toBe("Blue Bottle");
    expect(output.places[0].address).toBe("450 W 15th St");
    expect(output.places[0].location).toEqual({ lat: 40.7423, lng: -74.006 });
    expect(output.places[0].rating).toBe(4.5);
    expect(output.places[0].types).toEqual(["coffee_shop", "cafe"]);
    expect(output.places[0].mapsUrl).toBe("https://maps.google.com/?cid=456");
  });

  test("handles --near and --radius flags", async () => {
    let capturedBody: Record<string, unknown> = {};

    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ places: [] }));
    }) as typeof fetch;

    await places(["petrol", "--near", "-33.8688,151.2093", "--radius", "2000"]);

    expect(capturedBody.locationBias).toEqual({
      circle: {
        center: { latitude: -33.8688, longitude: 151.2093 },
        radius: 2000,
      },
    });
  });

  test("handles --limit flag (capped at 20)", async () => {
    let capturedBody: Record<string, unknown> = {};

    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ places: [] }));
    }) as typeof fetch;

    await places(["food", "--limit", "50"]);
    expect(capturedBody.pageSize).toBe(20);
  });

  test("handles --region flag", async () => {
    let capturedBody: Record<string, unknown> = {};

    global.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
      capturedBody = JSON.parse(init?.body as string);
      return new Response(JSON.stringify({ places: [] }));
    }) as typeof fetch;

    await places(["restaurants", "--region", "AU"]);
    expect(capturedBody.regionCode).toBe("AU");
  });

  test("handles empty places response", async () => {
    global.fetch = (async () => {
      return new Response(JSON.stringify({}));
    }) as typeof fetch;

    await places(["nonexistent"]);

    const output = JSON.parse(logs[0]);
    expect(output.places).toEqual([]);
  });

  test("handles missing optional fields in place data", async () => {
    global.fetch = (async () => {
      return new Response(JSON.stringify({
        places: [{ id: "abc" }]
      }));
    }) as typeof fetch;

    await places(["test"]);

    const output = JSON.parse(logs[0]);
    expect(output.places[0]).toEqual({
      name: "",
      address: "",
      location: null,
      rating: null,
      types: [],
      mapsUrl: "",
    });
  });

  test("exits with error for missing query", async () => {
    await expect(places([])).rejects.toThrow("EXIT:1");
  });
});

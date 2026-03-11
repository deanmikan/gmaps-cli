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

  const mockTransitData = {
    routes: [{
      distanceMeters: 10000,
      duration: "2700s",
      legs: [{
        steps: [
          {},
          {
            transitDetails: {
              stopDetails: {
                departureStop: { name: "Central Station" },
                arrivalStop: { name: "Bondi Junction" },
                departureTime: "2026-03-11T23:10:00Z",
                arrivalTime: "2026-03-11T23:22:00Z",
              },
              localizedValues: {
                departureTime: { time: { text: "10:10 AM" }, timeZone: "Australia/Sydney" },
                arrivalTime: { time: { text: "10:22 AM" }, timeZone: "Australia/Sydney" },
              },
              headsign: "Bondi Junction",
              transitLine: {
                name: "Cronulla to Bondi Junction via City",
                nameShort: "T4",
                vehicle: { name: { text: "Train" }, type: "HEAVY_RAIL" },
                agencies: [{ name: "Sydney Trains" }],
              },
              stopCount: 6,
            },
          },
          {},
        ],
      }],
    }],
  };

  function mockRestResponse(result: unknown) {
    global.fetch = (async () => {
      return new Response(JSON.stringify(result));
    }) as typeof fetch;
  }

  function mockRestResponseCapture(result: unknown): { captured: { url: string; body: Record<string, unknown>; headers: Record<string, string> } } {
    const captured = { url: "", body: {} as Record<string, unknown>, headers: {} as Record<string, string> };
    global.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      captured.url = url.toString();
      captured.body = JSON.parse(init?.body as string);
      captured.headers = Object.fromEntries(
        Object.entries(init?.headers as Record<string, string>)
      );
      return new Response(JSON.stringify(result));
    }) as typeof fetch;
    return { captured };
  }

  test("sends correct REST API request for basic route", async () => {
    const { captured } = mockRestResponseCapture(mockRouteData);

    await route(["JFK Airport", "Manhattan"]);

    expect(captured.url).toBe("https://routes.googleapis.com/directions/v2:computeRoutes");
    expect(captured.headers["X-Goog-Api-Key"]).toBe("test-key");
    expect(captured.headers["X-Goog-FieldMask"]).toContain("routes.duration");
    expect(captured.body).toMatchObject({
      origin: { address: "JFK Airport" },
      destination: { address: "Manhattan" },
      travelMode: "DRIVE",
      computeAlternativeRoutes: false,
    });
  });

  test("formats response correctly", async () => {
    mockRestResponse(mockRouteData);

    await route(["A", "B"]);

    const output = JSON.parse(logs[0]);
    expect(output.route.distance).toBe("15.2 km");
    expect(output.route.duration).toBe("28 mins");
    expect(output.route.distanceMeters).toBe(15200);
    expect(output.route.durationSeconds).toBe(1680);
  });

  test("handles --mode walk flag", async () => {
    const { captured } = mockRestResponseCapture(mockRouteData);

    await route(["A", "B", "--mode", "walk"]);

    expect(captured.body.travelMode).toBe("WALK");
  });

  test("handles --mode transit with transit steps", async () => {
    const { captured } = mockRestResponseCapture(mockTransitData);

    await route(["Central Station, Sydney", "Bondi Beach", "--mode", "transit"]);

    expect(captured.body.travelMode).toBe("TRANSIT");
    expect(captured.headers["X-Goog-FieldMask"]).toContain("transitDetails");

    const output = JSON.parse(logs[0]);
    expect(output.route.transitSteps).toBeArray();
    expect(output.route.transitSteps).toHaveLength(1);
    expect(output.route.transitSteps[0]).toEqual({
      line: "T4",
      vehicle: "Train",
      from: "Central Station",
      to: "Bondi Junction",
      departs: "10:10 AM",
      arrives: "10:22 AM",
      stops: 6,
    });
  });

  test("transit field mask differs from drive/walk", async () => {
    const { captured: transitCaptured } = mockRestResponseCapture(mockTransitData);
    await route(["A", "B", "--mode", "transit"]);
    const transitFieldMask = transitCaptured.headers["X-Goog-FieldMask"];

    const { captured: driveCaptured } = mockRestResponseCapture(mockRouteData);
    logs = [];
    await route(["A", "B", "--mode", "drive"]);
    const driveFieldMask = driveCaptured.headers["X-Goog-FieldMask"];

    expect(transitFieldMask).toContain("transitDetails");
    expect(driveFieldMask).not.toContain("transitDetails");
  });

  test("drive/walk responses do not include transitSteps", async () => {
    mockRestResponse(mockRouteData);

    await route(["A", "B", "--mode", "drive"]);

    const output = JSON.parse(logs[0]);
    expect(output.route.transitSteps).toBeUndefined();
  });

  test("parses coordinate origins as lat/lng", async () => {
    const { captured } = mockRestResponseCapture(mockRouteData);

    await route(["-33.8688,151.2093", "40.7128,-74.0060"]);

    expect(captured.body.origin).toEqual({
      location: { latLng: { latitude: -33.8688, longitude: 151.2093 } },
    });
    expect(captured.body.destination).toEqual({
      location: { latLng: { latitude: 40.7128, longitude: -74.006 } },
    });
  });

  test("parses place IDs starting with ChIJ", async () => {
    const { captured } = mockRestResponseCapture(mockRouteData);

    await route(["ChIJOwE_Id1w5EAR4Q27FkL6T_0", "ChIJt_5xIthw5EARoJ71mGq7t74"]);

    expect(captured.body.origin).toEqual({ placeId: "ChIJOwE_Id1w5EAR4Q27FkL6T_0" });
    expect(captured.body.destination).toEqual({ placeId: "ChIJt_5xIthw5EARoJ71mGq7t74" });
  });

  test("formats small distances in meters", async () => {
    mockRestResponse({ routes: [{ distanceMeters: 500, duration: "300s" }] });

    await route(["A", "B"]);

    const output = JSON.parse(logs[0]);
    expect(output.route.distance).toBe("500 m");
    expect(output.route.duration).toBe("5 mins");
  });

  test("exits with error for missing destination", async () => {
    await expect(route(["only-origin"])).rejects.toThrow("EXIT:1");
  });

  test("exits with error for invalid mode", async () => {
    await expect(route(["A", "B", "--mode", "bicycle"])).rejects.toThrow("EXIT:1");
  });

  test("exits with error when no route found", async () => {
    mockRestResponse({ routes: [] });

    await expect(route(["A", "B"])).rejects.toThrow("EXIT:1");
  });
});

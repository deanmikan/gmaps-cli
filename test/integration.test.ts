import { describe, test, expect } from "bun:test";

const hasApiKey = !!process.env.GOOGLE_MAPS_API_KEY;

// Integration tests hit real Google APIs. Run with:
//   GOOGLE_MAPS_API_KEY=... bun test test/integration.test.ts

describe.skipIf(!hasApiKey)("places (integration)", () => {
  test("basic search returns places and summary", async () => {
    const result = await runCli(["places", "coffee shops in Sydney CBD", "--limit", "2"]);
    expect(result.places).toBeArray();
    expect(result.places.length).toBeGreaterThan(0);
    expect(result.places[0]).toHaveProperty("id");
    expect(result.places[0]).toHaveProperty("location");
    expect(result.places[0].location).toHaveProperty("lat");
    expect(result.places[0].location).toHaveProperty("lng");
    expect(result.places[0]).toHaveProperty("mapsUrl");
    expect(result.summary).toBeString();
    expect(result.summary.length).toBeGreaterThan(0);
  });

  test("search with --near and --radius", async () => {
    const result = await runCli([
      "places", "petrol stations",
      "--near", "-33.8688,151.2093",
      "--radius", "2000",
      "--limit", "2",
    ]);
    expect(result.places).toBeArray();
    expect(result.places.length).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasApiKey)("route (integration)", () => {
  test("drive mode", async () => {
    const result = await runCli(["route", "Sydney Opera House", "Sydney Airport", "--mode", "drive"]);
    expect(result.route).toBeDefined();
    expect(result.route.distanceMeters).toBeGreaterThan(0);
    expect(result.route.durationSeconds).toBeGreaterThan(0);
    expect(result.route.distance).toBeString();
    expect(result.route.duration).toBeString();
    expect(result.route.transitSteps).toBeUndefined();
  });

  test("walk mode", async () => {
    const result = await runCli(["route", "Sydney Opera House", "Circular Quay", "--mode", "walk"]);
    expect(result.route).toBeDefined();
    expect(result.route.distanceMeters).toBeGreaterThan(0);
    expect(result.route.durationSeconds).toBeGreaterThan(0);
  });

  test("transit mode returns transit steps", async () => {
    const result = await runCli(["route", "Central Station, Sydney", "Bondi Beach, Sydney", "--mode", "transit"]);
    expect(result.route).toBeDefined();
    expect(result.route.distanceMeters).toBeGreaterThan(0);
    expect(result.route.durationSeconds).toBeGreaterThan(0);
    expect(result.route.transitSteps).toBeArray();
    expect(result.route.transitSteps.length).toBeGreaterThan(0);
    const step = result.route.transitSteps[0];
    expect(step).toHaveProperty("line");
    expect(step).toHaveProperty("vehicle");
    expect(step).toHaveProperty("from");
    expect(step).toHaveProperty("to");
    expect(step).toHaveProperty("departs");
    expect(step).toHaveProperty("arrives");
    expect(step).toHaveProperty("stops");
  });

  test("place ID as origin", async () => {
    // ChIJ3S-JXmauEmsRUcIaWtf4MzE = Sydney Opera House
    const result = await runCli(["route", "ChIJ3S-JXmauEmsRUcIaWtf4MzE", "Sydney Airport"]);
    expect(result.route).toBeDefined();
    expect(result.route.distanceMeters).toBeGreaterThan(0);
  });

  test("lat,lng coordinates", async () => {
    const result = await runCli(["route", "-33.8568,151.2153", "-33.9399,151.1753"]);
    expect(result.route).toBeDefined();
    expect(result.route.distanceMeters).toBeGreaterThan(0);
  });

  test("invalid mode exits with error", async () => {
    const proc = Bun.spawn(["bun", "src/index.ts", "route", "A", "B", "--mode", "bicycle"], {
      cwd: import.meta.dir + "/..",
      env: { ...process.env },
      stdout: "pipe",
      stderr: "pipe",
    });
    const exitCode = await proc.exited;
    const stderr = await new Response(proc.stderr).text();
    expect(exitCode).toBe(1);
    expect(stderr).toContain("invalid mode");
  });
});

async function runCli(args: string[]): Promise<any> {
  const proc = Bun.spawn(["bun", "src/index.ts", ...args], {
    cwd: import.meta.dir + "/..",
    env: { ...process.env },
    stdout: "pipe",
    stderr: "pipe",
  });
  const exitCode = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  if (exitCode !== 0) {
    throw new Error(`CLI exited with ${exitCode}: ${stderr}`);
  }
  return JSON.parse(stdout);
}

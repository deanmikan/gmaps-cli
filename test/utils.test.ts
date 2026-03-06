import { describe, expect, test } from "bun:test";
import { parseArgs } from "../src/utils.js";

describe("parseArgs", () => {
  test("parses positional args", () => {
    const result = parseArgs(["hello", "world"]);
    expect(result.positional).toEqual(["hello", "world"]);
    expect(result.flags).toEqual({});
  });

  test("parses flags with values", () => {
    const result = parseArgs(["--near", "-33.8,151.2", "--radius", "2000"]);
    expect(result.positional).toEqual([]);
    expect(result.flags).toEqual({ near: "-33.8,151.2", radius: "2000" });
  });

  test("parses boolean flags (no value)", () => {
    const result = parseArgs(["--help"]);
    expect(result.flags).toEqual({ help: "true" });
  });

  test("mixes positional and flags", () => {
    const result = parseArgs(["coffee shops", "--limit", "5", "--language", "en"]);
    expect(result.positional).toEqual(["coffee shops"]);
    expect(result.flags).toEqual({ limit: "5", language: "en" });
  });

  test("handles empty argv", () => {
    const result = parseArgs([]);
    expect(result.positional).toEqual([]);
    expect(result.flags).toEqual({});
  });

  test("handles flag followed by another flag (boolean)", () => {
    const result = parseArgs(["--help", "--verbose"]);
    expect(result.flags).toEqual({ help: "true", verbose: "true" });
  });

  test("handles negative number values for flags", () => {
    const result = parseArgs(["query", "--near", "-33.8688,151.2093"]);
    expect(result.positional).toEqual(["query"]);
    expect(result.flags.near).toBe("-33.8688,151.2093");
  });
});

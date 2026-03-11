const MCP_URL = "https://mapstools.googleapis.com/mcp";

export function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error("Error: GOOGLE_MAPS_API_KEY environment variable is required.");
    process.exit(1);
  }
  return key;
}

/** Call a Grounding Lite MCP tool via JSON-RPC */
export async function mcpCall<T>(toolName: string, args: Record<string, unknown>): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      "X-Goog-Api-Key": apiKey,
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",
      params: { name: toolName, arguments: args },
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`API error (${res.status}): ${error}`);
    process.exit(1);
  }

  const json = (await res.json()) as { result?: { content?: Array<{ text?: string }> }; error?: { message: string } };

  if (json.error) {
    console.error(`MCP error: ${json.error.message}`);
    process.exit(1);
  }

  const text = json.result?.content?.[0]?.text;
  if (!text) {
    console.error("Empty response from API.");
    process.exit(1);
  }

  return JSON.parse(text) as T;
}

/** Call a Google Maps REST API endpoint directly */
export async function restCall<T>(url: string, body: Record<string, unknown>, fieldMask: string): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": fieldMask,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const error = await res.text();
    console.error(`API error (${res.status}): ${error}`);
    process.exit(1);
  }

  return (await res.json()) as T;
}

/** Format seconds string (e.g. "1680s") to human-readable (e.g. "28 mins") */
export function formatDuration(duration: string): string {
  const seconds = parseInt(duration);
  if (isNaN(seconds)) return duration;
  if (seconds < 60) return `${seconds} secs`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} mins`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.round((seconds % 3600) / 60);
  return mins > 0 ? `${hours} hr ${mins} mins` : `${hours} hr`;
}

/** Format meters to human-readable distance */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

/** Parse --flag value pairs and positional args from argv */
export function parseArgs(argv: string[]): { positional: string[]; flags: Record<string, string> } {
  const positional: string[] = [];
  const flags: Record<string, string> = {};
  let i = 0;
  while (i < argv.length) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i += 2;
      } else {
        flags[key] = "true";
        i += 1;
      }
    } else {
      positional.push(arg);
      i += 1;
    }
  }
  return { positional, flags };
}

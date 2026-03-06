export function getApiKey(): string {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error("Error: GOOGLE_MAPS_API_KEY environment variable is required.");
    process.exit(1);
  }
  return key;
}

export async function googleFetch<T>(
  url: string,
  body: Record<string, unknown>,
  fieldMask: string,
): Promise<T> {
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

  return res.json() as Promise<T>;
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

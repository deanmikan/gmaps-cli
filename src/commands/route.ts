import { mcpCall, parseArgs, formatDuration, formatDistance } from "../utils.js";

const TRAVEL_MODES: Record<string, string> = {
  drive: "DRIVE",
  walk: "WALK",
  transit: "TRANSIT",
};

interface Waypoint {
  address?: string;
  latLng?: { latitude: number; longitude: number };
  placeId?: string;
}

interface RoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
  }>;
}

function parseWaypoint(input: string): Waypoint {
  // Place IDs start with "ChIJ"
  if (input.startsWith("ChIJ")) {
    return { placeId: input };
  }
  const parts = input.split(",");
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { latLng: { latitude: lat, longitude: lng } };
    }
  }
  return { address: input };
}

export async function route(argv: string[]) {
  const { positional, flags } = parseArgs(argv);
  const origin = positional[0];
  const destination = positional[1];

  if (!origin || !destination || flags.help) {
    console.log(`Usage: gmaps route <origin> <destination> [options]

Origin/destination can be an address, lat,lng coordinates, or a place ID (from gmaps places).

Options:
  --mode <mode>  Travel mode: drive, walk, transit (default: drive)`);
    process.exit(origin && destination ? 0 : 1);
  }

  const modeKey = flags.mode ?? "drive";
  const travelMode = TRAVEL_MODES[modeKey];
  if (!travelMode) {
    console.error(`Error: invalid mode '${modeKey}'. Must be one of: ${Object.keys(TRAVEL_MODES).join(", ")}`);
    process.exit(1);
  }

  const args: Record<string, unknown> = {
    origin: parseWaypoint(origin),
    destination: parseWaypoint(destination),
    travelMode,
  };

  const data = await mcpCall<RoutesResponse>("compute_routes", args);
  const r = data.routes?.[0];

  if (!r) {
    console.error("No route found.");
    process.exit(1);
  }

  const result = {
    route: {
      distance: r.distanceMeters != null ? formatDistance(r.distanceMeters) : "",
      duration: r.duration ? formatDuration(r.duration) : "",
      distanceMeters: r.distanceMeters ?? 0,
      durationSeconds: parseInt(r.duration ?? "0") || 0,
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

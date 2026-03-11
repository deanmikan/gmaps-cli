import { restCall, parseArgs, formatDuration, formatDistance } from "../utils.js";

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";

const TRAVEL_MODES: Record<string, string> = {
  drive: "DRIVE",
  walk: "WALK",
  transit: "TRANSIT",
};

interface RestWaypoint {
  address?: string;
  location?: { latLng: { latitude: number; longitude: number } };
  placeId?: string;
}

interface TransitStop {
  name: string;
  location?: { latLng: { latitude: number; longitude: number } };
}

interface TransitDetails {
  stopDetails?: {
    arrivalStop?: TransitStop;
    departureStop?: TransitStop;
    arrivalTime?: string;
    departureTime?: string;
  };
  localizedValues?: {
    arrivalTime?: { time?: { text?: string }; timeZone?: string };
    departureTime?: { time?: { text?: string }; timeZone?: string };
  };
  headsign?: string;
  transitLine?: {
    name?: string;
    nameShort?: string;
    agencies?: Array<{ name?: string }>;
    vehicle?: { name?: { text?: string }; type?: string };
  };
  stopCount?: number;
}

interface RoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    legs?: Array<{
      steps?: Array<{
        transitDetails?: TransitDetails;
      }>;
    }>;
  }>;
}

function parseWaypoint(input: string): RestWaypoint {
  if (input.startsWith("ChIJ")) {
    return { placeId: input };
  }
  const parts = input.split(",");
  if (parts.length === 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { location: { latLng: { latitude: lat, longitude: lng } } };
    }
  }
  return { address: input };
}

function formatTransitSteps(legs: RoutesResponse["routes"][0]["legs"]): object[] | undefined {
  if (!legs?.[0]?.steps) return undefined;
  const transitSteps = legs[0].steps
    .filter((s) => s.transitDetails)
    .map((s) => {
      const td = s.transitDetails!;
      const line = td.transitLine;
      const dep = td.localizedValues?.departureTime?.time?.text;
      const arr = td.localizedValues?.arrivalTime?.time?.text;
      return {
        line: line?.nameShort || line?.name || "unknown",
        vehicle: line?.vehicle?.name?.text || line?.vehicle?.type || "unknown",
        from: td.stopDetails?.departureStop?.name,
        to: td.stopDetails?.arrivalStop?.name,
        departs: dep,
        arrives: arr,
        stops: td.stopCount,
      };
    });
  return transitSteps.length > 0 ? transitSteps : undefined;
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

  const body: Record<string, unknown> = {
    origin: parseWaypoint(origin),
    destination: parseWaypoint(destination),
    travelMode,
    computeAlternativeRoutes: false,
  };

  const fieldMask =
    travelMode === "TRANSIT"
      ? "routes.duration,routes.distanceMeters,routes.legs.steps.transitDetails"
      : "routes.duration,routes.distanceMeters";

  const data = await restCall<RoutesResponse>(ROUTES_URL, body, fieldMask);
  const r = data.routes?.[0];

  if (!r) {
    console.error("No route found.");
    process.exit(1);
  }

  const result: Record<string, unknown> = {
    route: {
      distance: r.distanceMeters != null ? formatDistance(r.distanceMeters) : "",
      duration: r.duration ? formatDuration(r.duration) : "",
      distanceMeters: r.distanceMeters ?? 0,
      durationSeconds: parseInt(r.duration ?? "0") || 0,
      ...(travelMode === "TRANSIT" && r.legs
        ? { transitSteps: formatTransitSteps(r.legs) }
        : {}),
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

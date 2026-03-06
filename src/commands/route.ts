import { googleFetch, parseArgs } from "../utils.js";

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const FIELD_MASK = "routes.legs.steps.navigationInstruction,routes.legs.steps.localizedValues,routes.legs.localizedValues,routes.localizedValues,routes.distanceMeters,routes.duration";

const TRAVEL_MODES: Record<string, string> = {
  drive: "DRIVE",
  walk: "WALK",
  bicycle: "BICYCLE",
  transit: "TRANSIT",
};

interface Waypoint {
  address?: string;
  location?: { latLng: { latitude: number; longitude: number } };
}

interface RoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    localizedValues?: {
      distance?: { text: string };
      duration?: { text: string };
    };
    legs?: Array<{
      localizedValues?: {
        distance?: { text: string };
        duration?: { text: string };
      };
      steps?: Array<{
        navigationInstruction?: { instructions: string };
        localizedValues?: {
          distance?: { text: string };
          staticDuration?: { text: string };
        };
      }>;
    }>;
  }>;
}

function parseWaypoint(input: string): Waypoint {
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

export async function route(argv: string[]) {
  const { positional, flags } = parseArgs(argv);
  const origin = positional[0];
  const destination = positional[1];

  if (!origin || !destination || flags.help) {
    console.log(`Usage: gmaps route <origin> <destination> [options]

Options:
  --mode <mode>        Travel mode: drive, walk, bicycle, transit (default: drive)
  --waypoints <stops>  Comma-separated intermediate stops
  --units <system>     metric or imperial (default: metric)`);
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
    units: flags.units === "imperial" ? "IMPERIAL" : "METRIC",
  };

  if (flags.waypoints) {
    body.intermediates = flags.waypoints.split(",").map((s) => parseWaypoint(s.trim()));
  }

  const data = await googleFetch<RoutesResponse>(ROUTES_URL, body, FIELD_MASK);
  const r = data.routes?.[0];

  if (!r) {
    console.error("No route found.");
    process.exit(1);
  }

  const result = {
    route: {
      distance: r.localizedValues?.distance?.text ?? `${r.distanceMeters} m`,
      duration: r.localizedValues?.duration?.text ?? r.duration ?? "",
      steps: (r.legs ?? []).flatMap((leg) =>
        (leg.steps ?? []).map((step) => ({
          instruction: step.navigationInstruction?.instructions ?? "",
          distance: step.localizedValues?.distance?.text ?? "",
          duration: step.localizedValues?.staticDuration?.text ?? "",
        })),
      ),
    },
  };

  console.log(JSON.stringify(result, null, 2));
}

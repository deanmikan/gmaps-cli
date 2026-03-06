import { mcpCall, parseArgs } from "../utils.js";

interface PlacesResponse {
  places?: Array<{
    place?: string;
    id?: string;
    location?: { latitude: number; longitude: number };
    googleMapsLinks?: {
      directionsUrl?: string;
      placeUrl?: string;
      reviewsUrl?: string;
      photosUrl?: string;
    };
  }>;
  summary?: string;
}

export async function places(argv: string[]) {
  const { positional, flags } = parseArgs(argv);
  const query = positional[0];

  if (!query || flags.help) {
    console.log(`Usage: gmaps places <query> [options]

Options:
  --near <lat,lng>     Bias results to location
  --radius <meters>    Search radius (requires --near, default: 5000, max: 50000)
  --limit <n>          Max results (default: 10)
  --language <code>    Language code (default: en)
  --region <code>      Region bias (ISO 3166-1)`);
    process.exit(query ? 0 : 1);
  }

  const args: Record<string, unknown> = {
    textQuery: query,
    pageSize: parseInt(flags.limit ?? "10"),
    languageCode: flags.language ?? "en",
  };

  if (flags.region) {
    args.regionCode = flags.region;
  }

  if (flags.near) {
    const [lat, lng] = flags.near.split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) {
      console.error("Error: --near must be lat,lng (e.g. -33.8688,151.2093)");
      process.exit(1);
    }
    args.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radiusMeters: Math.min(parseFloat(flags.radius ?? "5000"), 50000),
      },
    };
  }

  const data = await mcpCall<PlacesResponse>("search_places", args);

  const result = {
    places: (data.places ?? []).map((p) => ({
      id: p.id ?? "",
      location: p.location
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : null,
      mapsUrl: p.googleMapsLinks?.placeUrl ?? "",
      directionsUrl: p.googleMapsLinks?.directionsUrl ?? "",
    })),
    summary: data.summary ?? "",
  };

  console.log(JSON.stringify(result, null, 2));
}

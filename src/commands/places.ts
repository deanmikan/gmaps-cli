import { googleFetch, parseArgs } from "../utils.js";

const PLACES_URL = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = "places.displayName,places.formattedAddress,places.location,places.rating,places.types,places.googleMapsUri,places.id";

interface PlacesResponse {
  places?: Array<{
    id: string;
    displayName?: { text: string };
    formattedAddress?: string;
    location?: { latitude: number; longitude: number };
    rating?: number;
    types?: string[];
    googleMapsUri?: string;
  }>;
}

export async function places(argv: string[]) {
  const { positional, flags } = parseArgs(argv);
  const query = positional[0];

  if (!query || flags.help) {
    console.log(`Usage: gmaps places <query> [options]

Options:
  --near <lat,lng>     Bias results to location
  --radius <meters>    Search radius (requires --near, default: 5000)
  --limit <n>          Max results (default: 10, max: 20)
  --language <code>    Language code (default: en)
  --region <code>      Region bias (ISO 3166-1)`);
    process.exit(query ? 0 : 1);
  }

  const body: Record<string, unknown> = {
    textQuery: query,
    pageSize: Math.min(parseInt(flags.limit ?? "10"), 20),
    languageCode: flags.language ?? "en",
  };

  if (flags.region) {
    body.regionCode = flags.region;
  }

  if (flags.near) {
    const [lat, lng] = flags.near.split(",").map(Number);
    if (isNaN(lat) || isNaN(lng)) {
      console.error("Error: --near must be lat,lng (e.g. -33.8688,151.2093)");
      process.exit(1);
    }
    body.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: parseFloat(flags.radius ?? "5000"),
      },
    };
  }

  const data = await googleFetch<PlacesResponse>(PLACES_URL, body, FIELD_MASK);

  const result = {
    places: (data.places ?? []).map((p) => ({
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      location: p.location
        ? { lat: p.location.latitude, lng: p.location.longitude }
        : null,
      rating: p.rating ?? null,
      types: p.types ?? [],
      mapsUrl: p.googleMapsUri ?? "",
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

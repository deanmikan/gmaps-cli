---
name: gmaps
description: "Google Maps: Search for places and compute routes. Use when the user asks about places, businesses, restaurants, directions, travel times, distances, nearby locations, how to get somewhere, what's near a location, commute times, or anything involving maps and navigation — even if they don't explicitly mention 'maps'."
metadata:
  openclaw:
    category: "productivity"
    requires:
      bins: ["gmaps"]
    cliHelp: "gmaps --help"
---

# gmaps (v0.1)

```bash
gmaps <command> [options]
```

## Authentication

Authentication is handled automatically. The Google Maps API key is pre-configured in the environment.

## Common Workflows

- **Find and navigate:** Use `places` to find a location, then `route` with the place ID to get directions
- **Compare options:** Search for multiple places, then compute routes to each to find the closest
- **Nearby search:** Use `places` with `--near` to find things around a known coordinate

## Commands

### places

Search for places, businesses, addresses, and points of interest. Returns place IDs, coordinates, Google Maps links, and a natural language summary.

Location context is important for good results — include a city/area in your query (e.g. "coffee shops in Sydney") or use `--near` with coordinates.

```bash
# Basic search (include location in query for best results)
gmaps places "coffee shops in Sydney"

# Search near a location
gmaps places "petrol stations" --near "-33.8688,151.2093" --radius 2000

# Limit results
gmaps places "restaurants" --limit 5 --language en
```

| Flag | Description | Default |
|------|-------------|---------|
| `--near <lat,lng>` | Bias results to location | — |
| `--radius <meters>` | Search radius (requires --near, max 50000) | 5000 |
| `--limit <n>` | Max results | 10 |
| `--language <code>` | Language (ISO 639-1) | en |
| `--region <code>` | Region bias (ISO 3166-1) | — |

### route

Compute travel distance and duration between locations. Supports drive and walk modes.

Origin and destination can be an address, lat,lng coordinates, or a place ID from `gmaps places`.

```bash
# Basic route
gmaps route "JFK Airport" "Manhattan"

# Walking directions
gmaps route "Central Park" "Brooklyn Bridge" --mode walk

# Using a place ID from gmaps places
gmaps route "ChIJOwE_Id1w5EAR4Q27FkL6T_0" "Manhattan"
```

| Flag | Description | Default |
|------|-------------|---------|
| `--mode <mode>` | `drive` or `walk` | drive |

## Output Format

Both commands output JSON to stdout.

### places

```json
{
  "places": [
    {
      "id": "ChIJ...",
      "location": { "lat": 40.7423, "lng": -74.006 },
      "mapsUrl": "https://maps.google.com/place/...",
      "directionsUrl": "https://maps.google.com/dir/..."
    }
  ],
  "summary": "Found 3 coffee shops: **Blue Bottle** at 450 W 15th St (4.5 stars) [0], **Stumptown** at 18 W 29th St (4.3 stars) [1], ..."
}
```

The `summary` field contains the most useful information — it includes place names, ratings, addresses, and descriptions. The `[0]`, `[1]` citation indices map to the `places` array, so you can look up the place ID or coordinates for any place mentioned in the summary.

### route

```json
{
  "route": {
    "distance": "15.2 km",
    "duration": "28 mins",
    "distanceMeters": 15200,
    "durationSeconds": 1680
  }
}
```

## Key Patterns

- **Find a place:** `gmaps places "query"` — the `summary` field has names and details
- **Get distance/time:** `gmaps route "origin" "destination"` — returns distance and duration
- **Nearby search:** `gmaps places "type" --near "lat,lng"` — find things near a coordinate
- **Places → Route chaining:** find a place, then use its `id` as origin/destination in `gmaps route`
- **Walking vs driving:** `gmaps route "A" "B" --mode walk` — compare travel modes

## Notes

- Always include location context in places queries (in the query text or via `--near`)
- If `places` returns an empty array, try broadening the search or removing `--near`
- **Route requires specific addresses** — short names and abbreviations (e.g. "MCG", "CBD") often fail. Use full addresses like "Melbourne Cricket Ground, Melbourne" or, better yet, use `gmaps places` first to get a place ID and pass that to `gmaps route`
- If `route` returns "No route found", try: (1) use `gmaps places` to find the place ID, then route with that, or (2) use a more specific address with city/country
- Route only supports `drive` and `walk` modes (no bicycle or transit)
- Max search radius is 50,000 meters

## Help

```bash
gmaps --help
gmaps places --help
gmaps route --help
```

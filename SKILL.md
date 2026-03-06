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

- **Find and navigate:** Use `places` to find a location, then `route` to get directions to it
- **Compare options:** Search for multiple places, then compute routes to each to find the closest
- **Nearby search:** Use `places` with `--near` to find things around a known coordinate

## Commands

### places

Search for places, businesses, addresses, and points of interest. Returns place IDs, coordinates, Google Maps links, and a natural language summary.

```bash
# Basic search
gmaps places "coffee shops in Sydney"

# Search near a location
gmaps places "petrol stations" --near "-33.8688,151.2093" --radius 2000

# Limit results
gmaps places "restaurants" --limit 5 --language en
```

| Flag | Description | Default |
|------|-------------|---------|
| `--near <lat,lng>` | Bias results to location | — |
| `--radius <meters>` | Search radius (requires --near) | 5000 |
| `--limit <n>` | Max results | 10 |
| `--language <code>` | Language (ISO 639-1) | en |
| `--region <code>` | Region bias (ISO 3166-1) | — |

### route

Compute travel distance and duration between locations. Supports drive and walk modes.

```bash
# Basic route
gmaps route "JFK Airport" "Manhattan"

# Walking directions
gmaps route "Central Park" "Brooklyn Bridge" --mode walk
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
  "summary": "A natural language summary of the results with place names and details."
}
```

The `summary` field contains the most useful information — it includes place names, descriptions, and context that the individual place entries don't have.

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
- **Walking vs driving:** `gmaps route "A" "B" --mode walk` — compare travel modes

## Notes

- If `places` returns an empty array, try broadening the search or removing `--near`
- If `route` fails, the origin/destination may be too vague — try adding city/country
- Route only supports `drive` and `walk` modes (no bicycle or transit)

## Help

```bash
gmaps --help
gmaps places --help
gmaps route --help
```

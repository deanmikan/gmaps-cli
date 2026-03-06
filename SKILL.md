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

Search for places, businesses, addresses, and points of interest.

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

Compute travel routes between locations.

```bash
# Basic route
gmaps route "JFK Airport" "Manhattan"

# With travel mode
gmaps route "Sydney" "Melbourne" --mode drive

# With intermediate stops
gmaps route "Sydney" "Melbourne" --waypoints "Canberra,Albury"

# Walking directions
gmaps route "Central Park" "Brooklyn Bridge" --mode walk
```

| Flag | Description | Default |
|------|-------------|---------|
| `--mode <mode>` | `drive`, `walk`, `bicycle`, `transit` | drive |
| `--waypoints <stops>` | Comma-separated intermediate stops | — |
| `--units <system>` | `metric` or `imperial` | metric |

## Output Format

Both commands output JSON to stdout.

### places

```json
{
  "places": [
    {
      "name": "Blue Bottle Coffee",
      "address": "450 W 15th St, New York, NY 10011",
      "location": { "lat": 40.7423, "lng": -74.006 },
      "rating": 4.5,
      "types": ["coffee_shop", "cafe"],
      "mapsUrl": "https://maps.google.com/?cid=..."
    }
  ]
}
```

### route

```json
{
  "route": {
    "distance": "15.2 km",
    "duration": "28 mins",
    "steps": [
      { "instruction": "Head north on Van Wyck Expy", "distance": "3.1 km", "duration": "5 mins" }
    ]
  }
}
```

## Key Patterns

- **Find a place:** `gmaps places "query"` — returns name, address, coordinates, rating
- **Get directions:** `gmaps route "origin" "destination"` — returns distance, duration, turn-by-turn steps
- **Nearby search:** `gmaps places "type" --near "lat,lng"` — find things near a coordinate
- **Multi-stop route:** `gmaps route "A" "D" --waypoints "B,C"` — route through intermediate stops

## Notes

- If `places` returns an empty array, try broadening the search or removing `--near`
- If `route` fails, the origin/destination may be too vague — try adding city/country

## Help

```bash
gmaps --help
gmaps places --help
gmaps route --help
```

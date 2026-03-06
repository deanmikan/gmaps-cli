---
name: gmaps
description: "Google Maps: Search for places and compute routes. Use when the user asks about places, directions, travel times, distances, or nearby businesses."
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

## Output

Both commands output JSON to stdout. Parse with `jq` if needed:

```bash
# Get just the first place name
gmaps places "coffee" | jq '.places[0].name'

# Get route duration
gmaps route "A" "B" | jq '.route.duration'
```

## Key Patterns

- **Find a place:** `gmaps places "query"` — returns name, address, coordinates, rating
- **Get directions:** `gmaps route "origin" "destination"` — returns distance, duration, turn-by-turn steps
- **Nearby search:** `gmaps places "type" --near "lat,lng"` — find things near a coordinate
- **Multi-stop route:** `gmaps route "A" "D" --waypoints "B,C"` — route through intermediate stops

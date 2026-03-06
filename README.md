# gmaps-cli

Lightweight CLI for Google Maps Places and Routes APIs. Runs on [Bun](https://bun.sh).

## Install

```bash
bun install -g gmaps-cli
```

## Setup

1. Enable **Places API (New)** and **Routes API** in your [Google Cloud Console](https://console.cloud.google.com/apis/library)
2. Create an API key with access to both APIs
3. Set the environment variable:

```bash
export GOOGLE_MAPS_API_KEY=your-api-key
```

## Usage

### Search for places

```bash
gmaps places "coffee shops in Sydney"
gmaps places "petrol stations" --near "-33.8688,151.2093" --radius 2000
gmaps places "restaurants" --limit 5 --language en --region AU
```

| Flag | Description | Default |
|------|-------------|---------|
| `--near <lat,lng>` | Bias results to location | — |
| `--radius <meters>` | Search radius (requires --near) | 5000 |
| `--limit <n>` | Max results (max 20) | 10 |
| `--language <code>` | Language (ISO 639-1) | en |
| `--region <code>` | Region bias (ISO 3166-1) | — |

### Compute a route

```bash
gmaps route "JFK Airport" "Manhattan"
gmaps route "Sydney" "Melbourne" --mode drive
gmaps route "Sydney" "Melbourne" --waypoints "Canberra,Albury"
gmaps route "Central Park" "Brooklyn Bridge" --mode walk --units imperial
```

| Flag | Description | Default |
|------|-------------|---------|
| `--mode <mode>` | `drive`, `walk`, `bicycle`, `transit` | drive |
| `--waypoints <stops>` | Comma-separated intermediate stops | — |
| `--units <system>` | `metric` or `imperial` | metric |

## Output

Both commands output JSON to stdout:

```bash
gmaps places "coffee" | jq '.places[0].name'
gmaps route "A" "B" | jq '.route.duration'
```

## License

MIT

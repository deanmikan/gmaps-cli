#!/usr/bin/env bun

import { places } from "./commands/places.js";
import { route } from "./commands/route.js";

const args = process.argv.slice(2);
const command = args[0];
const commandArgs = args.slice(1);

if (!command || command === "--help" || command === "-h") {
  console.log(`gmaps - Google Maps CLI

Usage:
  gmaps places <query> [options]         Search for places
  gmaps route <origin> <dest> [options]  Compute a route

Options:
  --help, -h  Show this help message

Environment:
  GOOGLE_MAPS_API_KEY  Required. Your Google Maps API key.`);
  process.exit(0);
}

const commands: Record<string, (argv: string[]) => Promise<void>> = {
  places,
  route,
};

const handler = commands[command];
if (!handler) {
  console.error(`Unknown command: ${command}. Run 'gmaps --help' for usage.`);
  process.exit(1);
}

await handler(commandArgs);

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { artistSchema, type Artist } from "./models/artist.js";
import { venueSchema, type Venue } from "./models/venue.js";

const dataDirectory = resolve(__dirname, "..");

function readSeedRows(fileName: string): string[][] {
  return readFileSync(resolve(dataDirectory, fileName), "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.trim().split(";"));
}

export function loadArtists(fileName = "artists.csv"): Artist[] {
  return readSeedRows(fileName).map(([id, name]) => artistSchema.parse({ id, name }));
}

export function loadVenues(fileName = "venues.csv"): Venue[] {
  return readSeedRows(fileName).map(([id, name, capacity]) =>
    venueSchema.parse({ id, name, capacity: Number(capacity) }),
  );
}

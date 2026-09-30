import assert from "node:assert/strict";
import { test } from "node:test";
import { loadArtists, loadVenues } from "./event-data.js";

test("loads artists and venues from the application seed data", () => {
  const artists = loadArtists();
  const venues = loadVenues();

  assert.ok(artists.length > 0);
  assert.ok(venues.length > 0);
  assert.deepEqual(Object.keys(artists[0]).sort(), ["id", "name"]);
  assert.deepEqual(Object.keys(venues[0]).sort(), ["capacity", "id", "name"]);
});

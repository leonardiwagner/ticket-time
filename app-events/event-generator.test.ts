import assert from "node:assert/strict";
import { test } from "node:test";
import { Writable } from "node:stream";
import { createEventGenerator } from "./event-generator.js";
import { createLogger } from "./logging/logger.js";
import { createInMemoryEventRepository } from "./repository/index.js";

const artist = { id: "8a176cbd-c5f2-4d55-9927-8fb65e5f74fc", name: "Otha Kohler" };
const venue = {
  id: "7f6855a4-540d-47cb-b541-e69f01018bd8",
  name: "East Macyfurt Hall",
  capacity: 80,
};

test("generates an event from artist and venue seed data and logs its name and capacity", () => {
  const lines: string[] = [];
  const logger = createLogger({
    service: "app-events",
    env: { LOG_LEVEL: "info" },
    stream: new Writable({
      write(chunk, _encoding, callback) {
        lines.push(chunk.toString());
        callback();
      },
    }),
  });
  const repository = createInMemoryEventRepository();
  const generator = createEventGenerator(
    repository,
    [artist],
    [venue],
    60_000,
    () => new Date("2026-10-01T18:00:00Z"),
    logger,
  );

  generator.start();
  generator.stop();

  const [event] = repository.readAll();
  assert.equal(event.name, "Otha Kohler live at East Macyfurt Hall");
  assert.deepEqual(event.artist, artist);
  assert.deepEqual(event.venue, venue);
  const log = JSON.parse(lines[0]);
  assert.equal(log.eventName, event.name);
  assert.equal(log.capacity, venue.capacity);
});

test("requires artist and venue seed data", () => {
  const repository = createInMemoryEventRepository();

  assert.throws(() => createEventGenerator(repository, [], [venue]));
  assert.throws(() => createEventGenerator(repository, [artist], []));
});

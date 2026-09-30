import assert from "node:assert/strict";
import { test } from "node:test";
import { Writable } from "node:stream";
import { createLogger } from "./logging/logger.js";
import { readAndLogConfirmedEvents } from "./read-events.js";

test("reads and logs every confirmed event", async () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const logger = createLogger({ service: "app-bookings", env: { LOG_LEVEL: "info" }, stream });
  const events = [
    {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Concert",
      description: "Live music",
      venueId: "650e8400-e29b-41d4-a716-446655440000",
      startsAt: "2026-10-01T18:00:00Z",
      endsAt: "2026-10-01T20:00:00Z",
    },
  ];

  const result = await readAndLogConfirmedEvents(
    {
      listConfirmedEvents: async () => events,
      claimTicket: async () => ({ ticketId: "750e8400-e29b-41d4-a716-446655440000", eventId: events[0].id, status: "sold" }),
    },
    logger,
  );

  assert.deepEqual(result, events);
  assert.equal(JSON.parse(lines[0]).event.id, events[0].id);
  assert.equal(JSON.parse(lines[0]).msg, "event received from app-events");
  assert.equal(JSON.parse(lines[1]).eventCount, 1);
});

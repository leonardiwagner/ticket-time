import assert from "node:assert/strict";
import test from "node:test";
import { Writable } from "node:stream";
import { createLogger } from "./logging/logger.js";
import { purchaseRandomStartupTicket } from "./startup-purchase.js";

const customer = { id: "096d6e88-7510-4c01-b372-5dba6a53ac81", name: "Elias Lynch V" };
const availableEvent = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Concert",
  venueId: "650e8400-e29b-41d4-a716-446655440000",
  startsAt: "2026-10-01T18:00:00Z",
  endsAt: "2026-10-01T20:00:00Z",
  availableTicketCount: 1,
};

test("purchases a ticket for a randomly selected customer and Kafka catalog event", async () => {
  const lines: string[] = [];
  const stream = new Writable({ write(chunk, _encoding, callback) { lines.push(chunk.toString()); callback(); } });
  const purchases: string[] = [];
  await purchaseRandomStartupTicket([customer], [availableEvent], {
    listConfirmedEvents: async () => [],
    claimTicket: async (eventId) => { purchases.push(eventId); return { ticketId: "750e8400-e29b-41d4-a716-446655440000", eventId, status: "sold" }; },
  }, { createTicket: async (ticket) => ticket }, createLogger({ service: "app-bookings", env: { LOG_LEVEL: "info" }, stream }), () => 0);
  assert.deepEqual(purchases, [availableEvent.id]);
  const entry = JSON.parse(lines[0]);
  assert.equal(entry.customerId, customer.id);
  assert.equal(entry.eventId, availableEvent.id);
  assert.equal(entry.msg, "startup ticket purchased");
});

test("does not purchase when the catalog has no available events", async () => {
  let claimed = false;
  await purchaseRandomStartupTicket([customer], [{ ...availableEvent, availableTicketCount: 0 }], { listConfirmedEvents: async () => [], claimTicket: async () => { claimed = true; throw new Error("unexpected"); } }, { createTicket: async (ticket) => ticket }, createLogger({ service: "app-bookings", env: { LOG_LEVEL: "silent" } }));
  assert.equal(claimed, false);
});

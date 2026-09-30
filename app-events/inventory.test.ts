import assert from "node:assert/strict";
import test from "node:test";
import { createInMemoryEventRepository } from "./repository/index.js";

const event = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Capacity test",
  description: "Exercises capacity-safe ticket allocation",
  artist: { id: "650e8400-e29b-41d4-a716-446655440000", name: "Artist" },
  venue: { id: "750e8400-e29b-41d4-a716-446655440000", name: "Venue", capacity: 2 },
  startsAt: "2026-10-01T18:00:00Z",
  endsAt: "2026-10-01T20:00:00Z",
  status: "confirmed" as const,
};

test("creates one available inventory ticket per capacity unit and an outbox catalog event", () => {
  const repository = createInMemoryEventRepository();
  repository.createConfirmedEvent(event);

  assert.deepEqual(repository.countTickets(event.id), { available: 2, held: 0, sold: 0 });
  assert.equal(repository.pendingOutbox().length, 2);
  assert.equal(repository.pendingOutbox()[0].envelope.eventType, "EventPublished.v1");
});

test("claims at most capacity and returns the original ticket for a duplicate request", async () => {
  const repository = createInMemoryEventRepository();
  repository.createConfirmedEvent(event);

  const [first, second] = await Promise.all([
    Promise.resolve().then(() => repository.claimTicket(event.id, "request-1")),
    Promise.resolve().then(() => repository.claimTicket(event.id, "request-2")),
  ]);
  assert.notEqual(first.id, second.id);
  assert.equal(repository.claimTicket(event.id, "request-1").id, first.id);
  assert.throws(() => repository.claimTicket(event.id, "request-3"), /SOLD_OUT/);
  assert.deepEqual(repository.countTickets(event.id), { available: 0, held: 0, sold: 2 });
});

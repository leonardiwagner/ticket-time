import assert from "node:assert/strict";
import test from "node:test";
import { createCatalogProjection } from "./catalog-projection.js";

test("projects replayed catalog messages once and applies availability changes", () => {
  const projection = createCatalogProjection();
  const published = {
    messageId: "message-1",
    eventType: "EventPublished.v1" as const,
    payload: {
      event: {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Catalog event",
        venue: { id: "650e8400-e29b-41d4-a716-446655440000" },
        startsAt: "2026-10-01T18:00:00Z",
        endsAt: "2026-10-01T20:00:00Z",
      },
      availableTicketCount: 2,
    },
  };

  assert.equal(projection.apply(published), true);
  assert.equal(projection.apply(published), false);
  assert.equal(projection.apply({
    messageId: "message-2",
    eventType: "EventAvailabilityChanged.v1",
    payload: { eventId: published.payload.event.id, availableTicketCount: 1 },
  }), true);
  assert.equal(projection.events()[0].availableTicketCount, 1);
});

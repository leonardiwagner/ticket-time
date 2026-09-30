import type { Event } from "../models/event.js";

export const eventTopic = "tickettime.events.v1";
export const inventoryTopic = "tickettime.inventory.v1";

export interface EventEnvelope<T> {
  messageId: string;
  eventType: "EventPublished.v1" | "EventAvailabilityChanged.v1" | "EventCancelled.v1";
  schemaVersion: 1;
  occurredAt: string;
  aggregateId: string;
  correlationId: string | null;
  causationId: string | null;
  payload: T;
}

export interface EventPublished { event: Event; venueCapacity: number; availableTicketCount: number; }
export interface EventAvailabilityChanged { eventId: string; availableTicketCount: number; heldTicketCount: number; soldTicketCount: number; reason: "event-published" | "ticket-claimed" | "ticket-released"; }
export interface OutboxRecord { id: string; topic: typeof eventTopic | typeof inventoryTopic; key: string; envelope: EventEnvelope<EventPublished | EventAvailabilityChanged>; createdAt: string; publishedAt: string | null; }

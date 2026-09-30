import { randomUUID } from "node:crypto";
import { eventTopic, inventoryTopic, type OutboxRecord } from "../messaging/events.js";
import type { Event } from "../models/event.js";
import type { InventoryTicket } from "../models/inventory-ticket.js";
import { readAllEvents } from "./read-events.js";
import { saveEvent } from "./save-event.js";

export interface EventRepository {
  readAll(): Event[];
  save(event: Event): Event;
  createConfirmedEvent(event: Event): Event;
  claimTicket(eventId: string, bookingRequestId: string): InventoryTicket;
  countTickets(eventId: string): TicketCounts;
  pendingOutbox(): readonly OutboxRecord[];
  markOutboxPublished(id: string): void;
}

interface TicketCounts {
  available: number;
  held: number;
  sold: number;
}

export function createInMemoryEventRepository(): EventRepository {
  const events = new Map<string, Event>();
  const tickets = new Map<string, InventoryTicket>();
  const outbox = new Map<string, OutboxRecord>();

  const countTickets = (eventId: string): TicketCounts => {
    const eventTickets = [...tickets.values()].filter((ticket) => ticket.eventId === eventId);
    return {
      available: eventTickets.filter(isAvailable).length,
      held: eventTickets.filter((ticket) => ticket.status === "held").length,
      sold: eventTickets.filter((ticket) => ticket.status === "sold").length,
    };
  };

  const addOutbox = (topic: OutboxRecord["topic"], key: string, envelope: OutboxRecord["envelope"]) => {
    const id = randomUUID();
    outbox.set(id, { id, topic, key, envelope, createdAt: new Date().toISOString(), publishedAt: null });
  };

  return {
    readAll: () => readAllEvents(events),
    save: (event) => saveEvent(events, event),
    createConfirmedEvent: (event) => {
      const savedEvent = saveEvent(events, event);
      const timestamp = new Date().toISOString();
      createTickets(tickets, savedEvent, timestamp);
      const counts = countTickets(savedEvent.id);
      addOutbox(eventTopic, savedEvent.id, eventPublished(savedEvent, counts.available, timestamp));
      addOutbox(inventoryTopic, savedEvent.id, availabilityChanged(savedEvent.id, counts, "event-published", timestamp));
      return savedEvent;
    },
    claimTicket: (eventId, bookingRequestId) => {
      const event = events.get(eventId);
      if (!event) throw new Error("EVENT_NOT_FOUND");
      if (event.status !== "confirmed") throw new Error("EVENT_NOT_SELLABLE");

      const previousClaim = [...tickets.values()].find(
        (ticket) => ticket.eventId === eventId && ticket.bookingRequestId === bookingRequestId,
      );
      if (previousClaim) return previousClaim;

      const availableTicket = [...tickets.values()].find(
        (ticket) => ticket.eventId === eventId && isAvailable(ticket),
      );
      if (!availableTicket) throw new Error("SOLD_OUT");

      const claimedTicket: InventoryTicket = {
        ...availableTicket,
        status: "sold",
        bookingRequestId,
        updatedAt: new Date().toISOString(),
      };
      tickets.set(claimedTicket.id, claimedTicket);
      const counts = countTickets(eventId);
      addOutbox(inventoryTopic, eventId, availabilityChanged(eventId, counts, "ticket-claimed", claimedTicket.updatedAt, bookingRequestId));
      return claimedTicket;
    },
    countTickets,
    pendingOutbox: () => [...outbox.values()].filter((record) => record.publishedAt === null),
    markOutboxPublished: (id) => {
      const record = outbox.get(id);
      if (record) outbox.set(id, { ...record, publishedAt: new Date().toISOString() });
    },
  };
}

function isAvailable(ticket: InventoryTicket): boolean {
  return ticket.status === "available" || ticket.status === "released";
}

function createTickets(tickets: Map<string, InventoryTicket>, event: Event, timestamp: string): void {
  for (let index = 0; index < event.venue.capacity; index += 1) {
    const id = randomUUID();
    tickets.set(id, { id, eventId: event.id, status: "available", holdId: null, bookingRequestId: null, heldUntil: null, createdAt: timestamp, updatedAt: timestamp });
  }
}

function eventPublished(event: Event, availableTicketCount: number, timestamp: string): OutboxRecord["envelope"] {
  return { messageId: randomUUID(), eventType: "EventPublished.v1", schemaVersion: 1, occurredAt: timestamp, aggregateId: event.id, correlationId: null, causationId: null, payload: { event, venueCapacity: event.venue.capacity, availableTicketCount } };
}

function availabilityChanged(eventId: string, counts: TicketCounts, reason: "event-published" | "ticket-claimed", timestamp: string, correlationId: string | null = null): OutboxRecord["envelope"] {
  return { messageId: randomUUID(), eventType: "EventAvailabilityChanged.v1", schemaVersion: 1, occurredAt: timestamp, aggregateId: eventId, correlationId, causationId: null, payload: { eventId, availableTicketCount: counts.available, heldTicketCount: counts.held, soldTicketCount: counts.sold, reason } };
}

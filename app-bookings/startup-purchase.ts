import { randomUUID } from "node:crypto";
import type { Logger } from "pino";
import type { CatalogEvent } from "./catalog-projection.js";
import type { Customer } from "./models/customer.js";
import type { EventsGateway } from "./grpc/events-client.js";
import type { TicketStore } from "./grpc/bookings-service.js";
import { purchaseTicket } from "./ticket-purchase.js";

function chooseRandom<T>(items: readonly T[], random: () => number): T | undefined {
  return items[Math.floor(random() * items.length)];
}

export async function purchaseRandomStartupTicket(
  customers: readonly Customer[],
  catalogEvents: readonly CatalogEvent[],
  events: EventsGateway,
  tickets: TicketStore,
  logger: Logger,
  random: () => number = Math.random,
): Promise<void> {
  const availableEvents = catalogEvents.filter((event) => event.availableTicketCount > 0);
  const customer = chooseRandom(customers, random);
  const event = chooseRandom(availableEvents, random);
  if (!customer || !event) {
    logger.warn(
      { customerCount: customers.length, availableEventCount: availableEvents.length },
      "startup ticket purchase skipped because no customer or available event was found",
    );
    return;
  }
  const requestId = randomUUID();
  try {
    const ticket = await purchaseTicket(
      { customerId: customer.id, eventId: event.id, requestId },
      events,
      tickets,
    );
    logger.info(
      { customerId: customer.id, eventId: event.id, ticketId: ticket.id, requestId },
      "startup ticket purchased",
    );
  } catch (error) {
    logger.warn(
      { err: error, customerId: customer.id, eventId: event.id, requestId },
      "startup ticket purchase failed",
    );
  }
}

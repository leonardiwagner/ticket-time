import type { Ticket } from "./models/ticket.js";
import type { EventsGateway } from "./grpc/events-client.js";
import type { TicketStore } from "./grpc/bookings-service.js";

export interface TicketPurchaseRequest {
  customerId: string;
  eventId: string;
  requestId: string;
  correlationId?: string;
}

export async function purchaseTicket(
  request: TicketPurchaseRequest,
  events: EventsGateway,
  tickets: TicketStore,
): Promise<Ticket> {
  const claim = await events.claimTicket(
    request.eventId,
    request.requestId,
    request.correlationId ?? request.requestId,
  );
  return tickets.createTicket({
    id: claim.ticketId,
    eventId: claim.eventId,
    customerId: request.customerId,
    status: "confirmed",
    ticketId: claim.ticketId,
  });
}

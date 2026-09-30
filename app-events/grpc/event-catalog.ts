import type { EventCatalog, TicketClaim } from "./events-service.js";
import type { EventRepository } from "../repository/index.js";

export function createEventCatalog(repository: EventRepository): EventCatalog {
  return {
    listConfirmedEvents: async () => repository.readAll().filter((event) => event.status === "confirmed"),
    claimTicket: async (eventId, bookingRequestId): Promise<TicketClaim> => {
      const ticket = repository.claimTicket(eventId, bookingRequestId);
      return { ticketId: ticket.id, eventId: ticket.eventId, status: ticket.status };
    },
  };
}

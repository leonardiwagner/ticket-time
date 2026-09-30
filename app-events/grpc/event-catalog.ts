import type { EventCatalog, EventReservation } from "./events-service.js";
import type { EventRepository } from "../repository/index.js";

export function createEventCatalog(repository: EventRepository): EventCatalog {
  return {
    listConfirmedEvents: async () =>
      repository.readAll().filter((event) => event.status === "confirmed"),
    reserveEvent: async (eventId: string, requestId: string): Promise<EventReservation> => {
      const event = repository.readAll().find((candidate) => candidate.id === eventId);
      if (!event || event.status !== "confirmed") {
        throw new Error(`Confirmed event ${eventId} was not found`);
      }

      return {
        reservationId: `${requestId}:${event.id}`,
        eventId: event.id,
      };
    },
  };
}

import type {
  sendUnaryData,
  ServerUnaryCall,
  UntypedServiceImplementation,
} from "@grpc/grpc-js";
import { status } from "@grpc/grpc-js";
import { z } from "zod";
import type { Logger } from "pino";
import type { Ticket } from "../models/ticket.js";
import type { EventsGateway } from "./events-client.js";
import { createLogger, requestIdFromMetadata } from "../logging/logger.js";

const bookEventRequestSchema = z.object({
  customerId: z.uuid(),
  eventId: z.uuid(),
  requestId: z.string().trim().min(1),
});

export interface TicketStore {
  createTicket(input: Ticket & { ticketId: string }): Promise<Ticket>;
}

interface BookEventRequest {
  customerId: string;
  eventId: string;
  requestId: string;
}

interface BookEventResponse {
  ticket: Ticket;
}

export function createBookingsService(
  events: EventsGateway,
  tickets: TicketStore,
  logger: Logger = createLogger({ service: "app-bookings" }),
): UntypedServiceImplementation {
  return {
    bookEvent: async (
      call: ServerUnaryCall<BookEventRequest, unknown>,
      callback: sendUnaryData<BookEventResponse>,
    ) => {
      const requestId = requestIdFromMetadata(call.metadata);
      const requestLogger = logger.child({ requestId, operation: "bookEvent" });
      const request = bookEventRequestSchema.safeParse(call.request);
      if (!request.success) {
        requestLogger.warn("invalid booking request");
        callback({ code: status.INVALID_ARGUMENT, message: "Invalid booking request" });
        return;
      }

      requestLogger.info({ eventId: request.data.eventId }, "gRPC request started");
      try {
        const claim = await events.claimTicket(
          request.data.eventId,
          request.data.requestId,
          requestId,
        );
        const ticket = await tickets.createTicket({
          id: claim.ticketId,
          eventId: claim.eventId,
          customerId: request.data.customerId,
          status: "confirmed",
          ticketId: claim.ticketId,
        });
        requestLogger.info({ eventId: ticket.eventId, ticketId: ticket.id }, "event booked");
        callback(null, { ticket });
      } catch (error) {
        requestLogger.error({ err: error, eventId: request.data.eventId }, "failed to book event");
        callback({ code: status.ABORTED, message: "Unable to book event" });
      }
    },
  };
}

import type {
  sendUnaryData,
  ServerUnaryCall,
  UntypedServiceImplementation,
} from "@grpc/grpc-js";
import { status } from "@grpc/grpc-js";
import type { Event } from "../models/event.js";
import { createLogger, requestIdFromMetadata } from "../logging/logger.js";
import type { Logger } from "pino";

export interface EventReservation {
  reservationId: string;
  eventId: string;
}

export interface EventCatalog {
  listConfirmedEvents(): Promise<readonly Event[]>;
  reserveEvent(eventId: string, requestId: string): Promise<EventReservation>;
}

interface ListConfirmedEventsResponse {
  events: readonly Event[];
}

interface ReserveEventRequest {
  eventId: string;
  requestId: string;
}

interface ReserveEventResponse {
  reservationId: string;
  eventId: string;
}

export function createEventsService(
  catalog: EventCatalog,
  logger: Logger = createLogger({ service: "app-events" }),
): UntypedServiceImplementation {
  return {
    listConfirmedEvents: async (
      call: ServerUnaryCall<unknown, unknown>,
      callback: sendUnaryData<ListConfirmedEventsResponse>,
    ) => {
      const requestId = requestIdFromMetadata(call.metadata);
      const requestLogger = logger.child({ requestId, operation: "listConfirmedEvents" });
      requestLogger.info("gRPC request started");
      try {
        const events = await catalog.listConfirmedEvents();
        requestLogger.info({ eventCount: events.length }, "confirmed events listed");
        callback(null, { events });
      } catch (error) {
        requestLogger.error({ err: error }, "failed to list confirmed events");
        callback({ code: status.INTERNAL, message: "Unable to list confirmed events" });
      }
    },
    reserveEvent: async (
      call: ServerUnaryCall<ReserveEventRequest, unknown>,
      callback: sendUnaryData<ReserveEventResponse>,
    ) => {
      const requestId = requestIdFromMetadata(call.metadata);
      const requestLogger = logger.child({ requestId, operation: "reserveEvent" });
      requestLogger.info({ eventId: call.request.eventId }, "gRPC request started");
      try {
        const reservation = await catalog.reserveEvent(call.request.eventId, call.request.requestId);
        requestLogger.info({ eventId: reservation.eventId }, "event reserved");
        callback(null, reservation);
      } catch (error) {
        requestLogger.error({ err: error, eventId: call.request.eventId }, "failed to reserve event");
        callback({ code: status.ABORTED, message: "Unable to reserve event" });
      }
    },
  };
}

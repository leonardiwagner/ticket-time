import type { sendUnaryData, ServerUnaryCall, UntypedServiceImplementation } from "@grpc/grpc-js";
import { status } from "@grpc/grpc-js";
import type { Event } from "../models/event.js";
import { createLogger, requestIdFromMetadata } from "../logging/logger.js";
import type { Logger } from "pino";

export interface TicketClaim { ticketId: string; eventId: string; status: "available" | "held" | "sold" | "released"; }
export interface EventCatalog { listConfirmedEvents(): Promise<readonly Event[]>; claimTicket(eventId: string, bookingRequestId: string): Promise<TicketClaim>; }
interface ClaimTicketRequest { eventId: string; bookingRequestId: string; }
function grpcError(error: unknown) { const code = error instanceof Error ? error.message : ""; if (code === "EVENT_NOT_FOUND") return status.NOT_FOUND; if (code === "EVENT_NOT_SELLABLE") return status.FAILED_PRECONDITION; if (code === "SOLD_OUT") return status.RESOURCE_EXHAUSTED; return status.UNAVAILABLE; }
export function createEventsService(catalog: EventCatalog, logger: Logger = createLogger({ service: "app-events" })): UntypedServiceImplementation {
  return {
    listConfirmedEvents: async (call: ServerUnaryCall<unknown, unknown>, callback: sendUnaryData<{ events: unknown[] }>) => { const requestLogger = logger.child({ requestId: requestIdFromMetadata(call.metadata), operation: "listConfirmedEvents" }); try { const events = await catalog.listConfirmedEvents(); callback(null, { events: events.map((event) => ({ id: event.id, name: event.name, description: event.description, venueId: event.venue.id, startsAt: event.startsAt, endsAt: event.endsAt })) }); } catch (error) { requestLogger.error({ err: error }, "failed to list confirmed events"); callback({ code: status.UNAVAILABLE, message: "Unable to list confirmed events" }); } },
    claimTicket: async (call: ServerUnaryCall<ClaimTicketRequest, unknown>, callback: sendUnaryData<TicketClaim>) => { const requestLogger = logger.child({ requestId: requestIdFromMetadata(call.metadata), operation: "claimTicket", eventId: call.request.eventId }); try { const claim = await catalog.claimTicket(call.request.eventId, call.request.bookingRequestId); requestLogger.info({ ticketId: claim.ticketId }, "ticket claimed"); callback(null, claim); } catch (error) { requestLogger.warn({ err: error }, "ticket claim rejected"); callback({ code: grpcError(error), message: "Unable to claim ticket" }); } },
  };
}

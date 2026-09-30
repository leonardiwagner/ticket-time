import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { resolve } from "node:path";
import type { Logger } from "pino";
import { createLogger } from "../logging/logger.js";
const eventsProtoPath = resolve(process.cwd(), "../contracts/ticket-time/v1/events.proto");
export interface ConfirmedEvent { id: string; name: string; description?: string; venueId: string; startsAt: string; endsAt: string; }
export interface EventsGateway { listConfirmedEvents(): Promise<readonly ConfirmedEvent[]>; claimTicket(eventId: string, bookingRequestId: string, correlationId?: string): Promise<{ ticketId: string; eventId: string; status: string }>; }
export function createEventsGateway(address: string, timeoutMs = 2_000, logger: Logger = createLogger({ service: "app-bookings" })): EventsGateway {
  const definition = protoLoader.loadSync(eventsProtoPath); const loaded = grpc.loadPackageDefinition(definition) as unknown as { tickettime: { events: { v1: { EventsService: grpc.ServiceClientConstructor } } } }; const client = new loaded.tickettime.events.v1.EventsService(address, grpc.credentials.createInsecure()) as unknown as grpc.Client & { listConfirmedEvents(request: object, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (e: grpc.ServiceError | null, r?: { events: ConfirmedEvent[] }) => void): void; claimTicket(request: object, metadata: grpc.Metadata, options: grpc.CallOptions, callback: (e: grpc.ServiceError | null, r?: { ticketId: string; eventId: string; status: string }) => void): void; };
  const deadline = () => new Date(Date.now() + timeoutMs);
  return { listConfirmedEvents: () => new Promise((resolve, reject) => client.listConfirmedEvents({}, new grpc.Metadata(), { deadline: deadline() }, (e, r) => e ? reject(e) : resolve(r?.events ?? []))), claimTicket: (eventId, bookingRequestId, correlationId = bookingRequestId) => new Promise((resolve, reject) => { const metadata = new grpc.Metadata(); metadata.set("x-request-id", correlationId); client.claimTicket({ eventId, bookingRequestId }, metadata, { deadline: deadline() }, (e, r) => { if (e) { logger.warn({ err: e, eventId, requestId: correlationId }, "ticket claim failed"); reject(e); } else if (r) resolve(r); else reject(new Error("Events service returned an empty claim")); }); }) };
}

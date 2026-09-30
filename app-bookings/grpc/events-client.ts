import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { Metadata } from "@grpc/grpc-js";
import { createLogger } from "../logging/logger.js";
import type { Logger } from "pino";

const eventsProtoPath = resolve(process.cwd(), "../contracts/ticket-time/v1/events.proto");

export interface ConfirmedEvent {
  id: string;
  name: string;
  description: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
}

interface EventsClient extends grpc.Client {
  listConfirmedEvents(
    request: Record<string, never>,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response?: { events: ConfirmedEvent[] }) => void,
  ): grpc.ClientUnaryCall;
  reserveEvent(
    request: { eventId: string; requestId: string },
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response?: { reservationId: string; eventId: string }) => void,
  ): grpc.ClientUnaryCall;
}

export interface EventsGateway {
  listConfirmedEvents(): Promise<readonly ConfirmedEvent[]>;
  reserveEvent(
    eventId: string,
    requestId: string,
    correlationId?: string,
  ): Promise<{ reservationId: string; eventId: string }>;
}

export function createEventsGateway(
  address: string,
  timeoutMs = 2_000,
  logger: Logger = createLogger({ service: "app-bookings" }),
): EventsGateway {
  const packageDefinition = protoLoader.loadSync(eventsProtoPath);
  const loaded = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    tickettime: { events: { v1: { EventsService: grpc.ServiceClientConstructor } } };
  };
  const client = new loaded.tickettime.events.v1.EventsService(
    address,
    grpc.credentials.createInsecure(),
  ) as unknown as EventsClient;
  const deadline = () => new Date(Date.now() + timeoutMs);

  return {
    listConfirmedEvents: () =>
      new Promise((resolve, reject) => {
        const requestId = randomUUID();
        const metadata = new Metadata();
        metadata.set("x-request-id", requestId);
        client.listConfirmedEvents({}, metadata, { deadline: deadline() }, (error, response) => {
          if (error) {
            logger.error({ err: error, requestId }, "events service list call failed");
            reject(error);
            return;
          }
          resolve(response?.events ?? []);
        });
      }),
    reserveEvent: (eventId, requestId, correlationId = requestId) =>
      new Promise((resolve, reject) => {
        const metadata = new Metadata();
        metadata.set("x-request-id", correlationId);
        logger.debug({ requestId: correlationId, eventId }, "calling events service");
        client.reserveEvent(
          { eventId, requestId },
          metadata,
          { deadline: deadline() },
          (error, response) => {
            if (error) {
              logger.error(
                { err: error, requestId: correlationId, eventId },
                "events service call failed",
              );
              reject(error);
              return;
            }
            if (!response) {
              const emptyResponseError = new Error("Events service returned an empty reservation");
              logger.error(
                { err: emptyResponseError, requestId: correlationId, eventId },
                "events service returned an empty reservation",
              );
              reject(emptyResponseError);
              return;
            }
            resolve(response);
          },
        );
      }),
  };
}

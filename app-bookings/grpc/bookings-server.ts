import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { resolve } from "node:path";
import { createBookingsService, type TicketStore } from "./bookings-service.js";
import type { EventsGateway } from "./events-client.js";
import { createLogger } from "../logging/logger.js";
import type { Logger } from "pino";

const bookingsProtoPath = resolve(process.cwd(), "../contracts/ticket-time/v1/bookings.proto");

export function createBookingsServer(
  events: EventsGateway,
  tickets: TicketStore,
  logger: Logger = createLogger({ service: "app-bookings" }),
): grpc.Server {
  const packageDefinition = protoLoader.loadSync(bookingsProtoPath);
  const loaded = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    tickettime: { bookings: { v1: { BookingsService: grpc.ServiceClientConstructor } } };
  };
  const server = new grpc.Server();

  server.addService(
    loaded.tickettime.bookings.v1.BookingsService.service,
    createBookingsService(events, tickets, logger),
  );
  return server;
}

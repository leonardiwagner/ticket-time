import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { resolve } from "node:path";
import { createEventsService, type EventCatalog } from "./events-service.js";
import { createLogger } from "../logging/logger.js";
import type { Logger } from "pino";

const eventsProtoPath = resolve(process.cwd(), "../contracts/ticket-time/v1/events.proto");

export function createEventsServer(
  catalog: EventCatalog,
  logger: Logger = createLogger({ service: "app-events" }),
): grpc.Server {
  const packageDefinition = protoLoader.loadSync(eventsProtoPath);
  const loaded = grpc.loadPackageDefinition(packageDefinition) as unknown as {
    tickettime: { events: { v1: { EventsService: grpc.ServiceClientConstructor } } };
  };
  const server = new grpc.Server();

  server.addService(
    loaded.tickettime.events.v1.EventsService.service,
    createEventsService(catalog, logger),
  );
  return server;
}

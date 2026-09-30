export interface CatalogEvent {
  id: string;
  name: string;
  description?: string;
  venueId: string;
  startsAt: string;
  endsAt: string;
  availableTicketCount: number;
}

interface EventPublishedMessage {
  messageId: string;
  eventType: "EventPublished.v1";
  payload: {
    event: {
      id: string;
      name: string;
      description?: string;
      venue: { id: string };
      startsAt: string;
      endsAt: string;
    };
    availableTicketCount: number;
  };
}

interface AvailabilityChangedMessage {
  messageId: string;
  eventType: "EventAvailabilityChanged.v1";
  payload: { eventId: string; availableTicketCount: number };
}

type CatalogMessage = EventPublishedMessage | AvailabilityChangedMessage;

export interface CatalogProjection {
  apply(message: CatalogMessage): boolean;
  events(): readonly CatalogEvent[];
  markInitialized(): void;
  isInitialized(): boolean;
}

export function createCatalogProjection(): CatalogProjection {
  const processedMessageIds = new Set<string>();
  const catalogEvents = new Map<string, CatalogEvent>();
  let initialized = false;

  return {
    apply: (message) => {
      if (processedMessageIds.has(message.messageId)) return false;
      processedMessageIds.add(message.messageId);

      if (message.eventType === "EventPublished.v1") {
        const { event, availableTicketCount } = message.payload;
        catalogEvents.set(event.id, {
          id: event.id,
          name: event.name,
          description: event.description,
          venueId: event.venue.id,
          startsAt: event.startsAt,
          endsAt: event.endsAt,
          availableTicketCount,
        });
      } else {
        const event = catalogEvents.get(message.payload.eventId);
        if (event) {
          catalogEvents.set(event.id, {
            ...event,
            availableTicketCount: message.payload.availableTicketCount,
          });
        }
      }
      return true;
    },
    events: () => [...catalogEvents.values()],
    markInitialized: () => { initialized = true; },
    isInitialized: () => initialized,
  };
}

import type { Event } from "../models/event.js";
import { readAllEvents } from "./read-events.js";
import { saveEvent } from "./save-event.js";

export interface EventRepository {
  readAll(): Event[];
  save(event: Event): Event;
}

export function createInMemoryEventRepository(): EventRepository {
  const events = new Map<string, Event>();

  return {
    readAll: () => readAllEvents(events),
    save: (event) => saveEvent(events, event),
  };
}

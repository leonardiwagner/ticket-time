import type { Event } from "../models/event.js";

export function readAllEvents(events: ReadonlyMap<string, Event>): Event[] {
  return [...events.values()];
}

# ADR 0001: Use gRPC between events and bookings

## Decision

Use versioned Protocol Buffer contracts under `contracts/ticket-time/v1` for
the synchronous events-to-bookings workflow.

- `EventsService.ListConfirmedEvents` exposes only confirmed events.
- `EventsService.ReserveEvent` reserves capacity and returns a reservation ID.
- `BookingsService.BookEvent` coordinates the reservation and returns a ticket.

`app-events` owns event availability and reservation state. `app-bookings` owns
customers and tickets. The services do not share persistence tables.

Both services use request IDs so retries can be made idempotent when the
repositories are implemented.

## Consequences

The booking path has a synchronous dependency on `app-events`, so callers must
handle deadlines and unavailable upstream responses. The next implementation
slice should add timeout, retry, and compensation behavior around reservation
failure.

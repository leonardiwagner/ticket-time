# Service logging

`app-events` and `app-bookings` use Pino and write logs to standard output. The
minimum operational fields are:

- `time`: an ISO-compatible timestamp represented by Pino's `time` field
- `level`: numeric Pino severity (`30` is info, `40` warn, `50` error)
- `service`: stable service name
- `msg`: operational event description
- `requestId`: correlation identifier for gRPC requests when applicable
- `err`: serialized error details on failures

Production-like execution defaults to `LOG_LEVEL=info`, which disables debug and
trace entries. Set `LOG_LEVEL=debug` or `trace` when those details are needed.
Sensitive fields such as tokens, authorization headers, credentials, payment
data, card numbers, CVVs, and customer secrets are redacted before emission.

For readable local output, set `LOG_PRETTY=true` (and optionally
`LOG_COLORIZE=false`). The application logging calls do not change; without the
flag, output is newline-delimited JSON suitable for container stdout collection.

Incoming gRPC calls use `x-request-id` when present and otherwise generate a
UUID. The bookings service forwards that identifier to the events service when
reserving an event.

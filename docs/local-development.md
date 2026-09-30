# Local development

## Prerequisites

- Node.js 22 or newer and npm
- Docker Engine with Compose v2 (for the container workflow)

The services use the versioned contracts in `contracts/ticket-time/v1`. The
local ports match the planned service shape: app-events gRPC `50051` and
readiness `8081`; app-bookings gRPC `50052` and readiness `8082`.

## Run the production-like topology

```sh
docker compose up --build
```

Compose starts app-events first and waits for its readiness check before
starting app-bookings. Logs are newline-delimited JSON by default, and the
same image receives configuration through environment variables.

Useful overrides are `LOG_LEVEL=debug`, `LOG_LEVEL=trace`, and
`LOG_PRETTY=true LOG_COLORIZE=false`. Stop and remove the local containers with
`docker compose down`; add `--volumes` only if future services introduce local
state that you intentionally want removed.

Verify both services with:

```sh
curl -f http://localhost:8081/health/ready
curl -f http://localhost:8082/health/ready
```

## Run and debug one service directly

Install dependencies once in each service, then build and start app-events:

```sh
(cd app-events && npm ci && npm run build && npm run dev)
```

Start app-bookings in a second terminal after app-events is ready:

```sh
(cd app-bookings && npm ci && EVENTS_GRPC_ADDRESS=127.0.0.1:50051 npm run dev)
```

The debugger listens on port `9229` for app-events and `9230` for
app-bookings. The `--enable-source-maps` flag maps breakpoints to TypeScript
source. VS Code can attach to either port with a Node.js attach configuration.

Both processes support `SIGINT` and `SIGTERM` and close their gRPC and HTTP
servers before exiting. Direct runs use the same addresses, contracts,
environment variables, structured logs, and health endpoints as Compose.

## Smoke test

With dependencies installed, run:

```sh
(cd app-bookings && npm run smoke)
```

The smoke test builds both services, starts both real processes, waits for
readiness, discovers an event through the events gRPC service, and books it
through the bookings gRPC service. It cleans up both child processes on exit.

## Known differences and follow-up

Local services currently use in-memory repositories and insecure gRPC within a
trusted developer network. Kubernetes/AWS should add persistent ownership,
identity-aware service communication, TLS, resource limits, and external
observability. These differences are deliberate follow-up work; the process
boundaries, ports, contracts, configuration model, health checks, and log
shape are already kept aligned.

import { createServer, type Server } from "node:http";

export function createHealthServer(
  port: number,
  isReady: () => boolean,
  host = process.env.HEALTH_HOST ?? "127.0.0.1",
): Server {
  return createServer((request, response) => {
    if (request.url !== "/health/live" && request.url !== "/health/ready") {
      response.writeHead(404).end();
      return;
    }

    const ready = isReady();
    const live = request.url === "/health/live";
    response.writeHead(live || ready ? 200 : 503, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: live || ready ? "ok" : "not ready" }));
  }).listen(port, host);
}

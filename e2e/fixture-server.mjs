// Serves a recorded slice of Contributable's published data for the end-to-end test.
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const index = readFileSync(join(here, "fixtures", "index.json"));
const orgs = readFileSync(join(here, "fixtures", "orgs.json"));

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  if (url.startsWith("/index.json")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(index);
  } else if (url.startsWith("/api/v1/orgs")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(orgs);
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(3101, "127.0.0.1", () => {
  console.log("fixture server on http://127.0.0.1:3101");
});

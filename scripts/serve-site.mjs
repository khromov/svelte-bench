/** Serve the exact Pages artifact without an SPA fallback. */
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
const root = path.resolve("site/build");
const base = process.env.BASE_PATH ?? "/svelte-bench";
const port = Number(process.env.PORT ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
};
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname === base && base) {
      response.writeHead(302, { Location: `${base}/` });
      response.end();
      return;
    }
    if (!pathname.startsWith(`${base}/`)) throw new Error("Not found");
    let filename = path.resolve(root, `.${pathname.slice(base.length)}`);
    if (!filename.startsWith(root + path.sep) && filename !== root) throw new Error("Not found");
    if ((await stat(filename)).isDirectory()) filename = path.join(filename, "index.html");
    const body = await readFile(filename);
    response.writeHead(200, { "Content-Type": types[path.extname(filename)] ?? "application/octet-stream" });
    response.end(request.method === "HEAD" ? undefined : body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Static site: http://127.0.0.1:${port}${base}/`);
  const open = process.argv.indexOf("--open");
  if (open !== -1)
    spawn("open", [`http://127.0.0.1:${port}${process.argv[open + 1] ?? `${base}/`}`], { stdio: "inherit" });
});

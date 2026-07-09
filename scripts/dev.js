import * as esbuild from "esbuild";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const PORT = parseInt(process.argv[2] || "3000", 10);
const MIME = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "application/javascript;charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".gif": "image/gif",
};

const ctx = await esbuild.context({
  entryPoints: [path.join(root, "js/app.js")],
  bundle: true,
  outfile: path.join(root, "dist/app.js"),
  sourcemap: true,
  logLevel: "info",
});

await ctx.watch();

http
  .createServer((req, res) => {
    let filePath = path.join(root, req.url === "/" ? "index.html" : req.url);
    const ext = path.extname(filePath);
    res.setHeader("Cache-Control", "no-cache");

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { "Content-Type": "text/plain;charset=utf-8" });
      res.end("404 Not Found");
    }
  })
  .listen(PORT, () => {
    console.log(`\n  \x1b[36mhttp://localhost:${PORT}\x1b[0m  (Ctrl+C to stop)\n`);
  });

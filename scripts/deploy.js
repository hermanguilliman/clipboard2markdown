import * as esbuild from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const dist = path.join(root, "dist");

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

esbuild.buildSync({
  entryPoints: [path.join(root, "js/app.js")],
  bundle: true,
  outfile: path.join(dist, "app.js"),
  minify: true,
  logLevel: "info",
});

const copyAssets = [
  ["css", "css"],
  ["favicon", "favicon"],
];

for (const [src, dest] of copyAssets) {
  fs.cpSync(path.join(root, src), path.join(dist, dest), { recursive: true });
}

if (fs.existsSync(path.join(root, "manifest.json"))) {
  fs.copyFileSync(path.join(root, "manifest.json"), path.join(dist, "manifest.json"));
}

fs.copyFileSync(path.join(root, "CNAME"), path.join(dist, "CNAME"));

let html = fs.readFileSync(path.join(root, "index.html"), "utf-8");
html = html.replace('src="dist/app.js"', 'src="app.js"');
fs.writeFileSync(path.join(dist, "index.html"), html);

console.log(`\n  dist/ ready (${(fs.readdirSync(dist, { recursive: true }).length)} files)`);

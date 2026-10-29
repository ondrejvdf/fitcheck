import { readFile, stat } from "node:fs/promises";
import assert from "node:assert/strict";
const root = new URL("../dist/", import.meta.url);
const manifest = JSON.parse(
  await readFile(new URL("manifest.webmanifest", root), "utf8"),
);
assert.equal(manifest.display, "standalone");
assert.equal(manifest.start_url, "./");
for (const size of [192, 512]) {
  const icon = manifest.icons.find((i) => i.sizes === `${size}x${size}`);
  assert.ok(icon);
  const data = await readFile(new URL(icon.src, root));
  assert.equal(data.readUInt32BE(16), size);
  assert.equal(data.readUInt32BE(20), size);
}
const html = await readFile(new URL("index.html", root), "utf8");
assert.match(html, /lang="cs"/);
assert.match(html, /src="\.\/assets\//);
for (const file of ["sw.js", "manifest.webmanifest", "index.html"])
  assert.ok((await stat(new URL(file, root))).size > 0);
const sw = await readFile(new URL("sw.js", root), "utf8");
assert.match(sw, /index.html/);
assert.match(sw, /precacheAndRoute/);
assert.match(sw, /NavigationRoute/);
console.log(
  "PWA: manifest, 192/512 ikony, relativní cesty, service worker a navigační fallback ověřeny.",
);

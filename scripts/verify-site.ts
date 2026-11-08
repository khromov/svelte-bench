/** Verify every public result URL and byte-for-byte download in the static artifact. */
import assert from "node:assert/strict";
import { readdir, readFile, access } from "node:fs/promises";
import path from "node:path";
let count = 0;
for (const directory of ["", "v1"]) {
  for (const name of (await readdir(path.join("benchmarks", directory))).filter((n) => n.endsWith(".json"))) {
    const source = await readFile(path.join("benchmarks", directory, name));
    assert.deepEqual(await readFile(path.join("site/build", directory, name)), source, `Download changed: ${name}`);
    const html = await readFile(path.join("site/build", directory, name.replace(/\.json$/, ".html")), "utf8");
    assert(html.includes("Download JSON"), `Missing rendered page: ${name}`);
    if (directory) assert(html.includes("Legacy v1 results"));
    count++;
  }
}
await access("site/build/index.html");
await access("site/build/v1/index.html");
for (const name of await readdir("site/build/_app/immutable/nodes")) {
  if (name.endsWith(".js")) {
    const script = await readFile(path.join("site/build/_app/immutable/nodes", name), "utf8");
    assert(!/node:fs|OPENAI_API_KEY|ANTHROPIC_API_KEY|src\/llms/.test(script), `Server code in browser node ${name}`);
  }
}
console.log(
  `Verified ${count} result HTML pages, unchanged JSON downloads, both indexes, and browser module boundaries.`,
);

/** Prepare unchanged JSON downloads; SvelteKit reads results only during prerendering. */
import { readdir, mkdir, copyFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
const destination = path.resolve("site/static");
for (const directory of ["", "v1"]) {
  const source = path.resolve("benchmarks", directory);
  const target = path.join(destination, directory);
  await mkdir(target, { recursive: true });
  for (const name of await readdir(target)) {
    if (name.endsWith(".json")) await rm(path.join(target, name));
  }
  for (const name of await readdir(source)) {
    if (name.includes("benchmark-results-") && name.endsWith(".json")) await copyFile(path.join(source, name), path.join(target, name));
  }
}
await writeFile(path.join(destination, ".nojekyll"), "");
console.log("Prepared JSON downloads in site/static");

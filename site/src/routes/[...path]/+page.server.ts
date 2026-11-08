import { error } from "@sveltejs/kit";
import { files, readResults } from "#lib/server/data.js";
import type { EntryGenerator, PageServerLoad } from "./$types.js";
export const entries: EntryGenerator = async () => [
  { path: "" },
  { path: "index.html" },
  { path: "v1" },
  { path: "v1/index.html" },
  ...(await files()).map((name) => ({ path: name.replace(/\.json$/, ".html") })),
  ...(await files(true)).map((name) => ({ path: `v1/${name.replace(/\.json$/, ".html")}` })),
];
export const load: PageServerLoad = async ({ params }) => {
  const current = params.path ?? "";
  const legacy = current === "v1" || current.startsWith("v1/");
  const name = current.split("/").at(-1) ?? "";
  const index = ["", "v1", "index.html"].includes(name);
  const available = await files(legacy);
  const selected = index
    ? (available.find((file) => file.includes("merged")) ?? null)
    : name.replace(/\.html$/, ".json");
  if (!index && (!name.endsWith(".html") || !available.includes(selected!))) error(404, "Result not found");
  return { legacy, files: available, selected, results: selected ? await readResults(selected, legacy) : [] };
};

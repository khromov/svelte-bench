// Launcher for `pnpm tui`: the TUI is a Go program, so check for Go before trying to run it
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const tuiDir = dirname(fileURLToPath(import.meta.url));

if (spawnSync("go", ["version"], { stdio: "ignore" }).error) {
  console.error(
    [
      "The TUI is optional and needs Go 1.25+ (https://go.dev/dl/), which was not found on your PATH.",
      "",
      "You don't need it to run the benchmark. Use the environment variables instead, e.g.:",
      "  DEBUG_MODE=true DEBUG_PROVIDER=ollama DEBUG_MODEL=<model> pnpm run-tests",
      "",
      "See the README for details.",
    ].join("\n"),
  );
  process.exit(1);
}

const result = spawnSync("go", ["run", "./cmd/tui"], {
  cwd: tuiDir,
  stdio: "inherit",
});
process.exit(result.status ?? 1);

// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import { runTest } from "./test-runner";

let directory: string;
beforeAll(async () => {
  await fs.mkdir("tmp", { recursive: true });
  directory = await fs.mkdtemp(path.resolve("tmp/runner-regression-"));
  await fs.writeFile(
    path.join(directory, "passing.test.ts"),
    `import { it, expect } from 'vitest'; it('passes', () => expect(2 + 2).toBe(4));`,
  );
  await fs.writeFile(
    path.join(directory, "failing.test.ts"),
    `import { it, expect } from 'vitest'; it('fails', () => expect(2 + 2).toBe(5));`,
  );
  await fs.writeFile(
    path.join(directory, "broken.test.ts"),
    `import { it } from 'vitest'; import Component from './Component.svelte'; it('loads', () => Component);`,
  );
  await fs.writeFile(
    path.join(directory, "Component.svelte"),
    `<script>let text = $state('hello'); $effect(() => { text; $inspect.trace(); });</script><p>{text}</p>`,
  );
});
afterAll(async () => {
  await fs.rm(directory, { recursive: true, force: true });
});

describe("sample runner isolation", () => {
  it("keeps passing, assertion-failing and compile-failing samples independent", async () => {
    const exitCode = process.exitCode;
    const [passing, failing, broken] = await Promise.all([
      runTest("passing", "test", directory),
      runTest("failing", "test", directory),
      runTest("broken", "test", directory),
    ]);
    expect(passing).toMatchObject({ success: true, totalTests: 1, failedTests: 0, errors: [] });
    expect(failing).toMatchObject({ success: false, totalTests: 1, failedTests: 1 });
    expect(failing.errors.join("\n")).toContain("expected 4 to be 5");
    expect(broken.success).toBe(false);
    expect(broken.errors.join("\n")).toContain("inspect_trace_invalid_placement");
    expect(process.exitCode).toBe(exitCode);
    expect((await runTest("passing", "test", directory)).success).toBe(true);
  }, 30000);

  it("reports a missing test file as a failure", async () => {
    expect(await runTest("missing", "test", directory)).toMatchObject({ success: false, testFiles: 0 });
  });
});

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const e2eRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workspaceRoot = dirname(e2eRoot);
const ciWorkflowPath = join(workspaceRoot, ".github", "workflows", "ci.yml");

describe("packaged smoke workflow", () => {
  it("builds the PR mac smoke artifact without portable mode", async () => {
    const workflow = await readFile(ciWorkflowPath, "utf8");
    const macBuildStep = workflow.match(/- name: Build PR mac artifacts\n(?:.+\n)+?(?=\n      - name: Smoke PR mac packaged runtime)/m);

    expect(macBuildStep?.[0]).toBeDefined();
    expect(macBuildStep?.[0]).not.toContain("--portable");
  });

  it("runs a linux headless packaged smoke job when packaged changes require smoke", async () => {
    const workflow = await readFile(ciWorkflowPath, "utf8");
    expect(workflow).toContain("packaged_smoke_linux_headless:");
    expect(workflow).toContain("Build PR linux headless artifacts");
    expect(workflow).toContain('OD_PACKAGED_E2E_LINUX_HEADLESS: "1"');
    expect(workflow).toContain("pnpm test specs/linux.spec.ts");
  });
});

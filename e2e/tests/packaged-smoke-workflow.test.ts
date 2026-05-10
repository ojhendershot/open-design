import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const e2eRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const workspaceRoot = dirname(e2eRoot);
const ciWorkflowPath = join(workspaceRoot, ".github", "workflows", "ci.yml");
const releaseBetaWorkflowPath = join(workspaceRoot, ".github", "workflows", "release-beta.yml");
const releaseStableWorkflowPath = join(workspaceRoot, ".github", "workflows", "release-stable.yml");

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

  it("preserves beta linux AppImage smoke reports for release publication", async () => {
    const workflow = await readFile(releaseBetaWorkflowPath, "utf8");
    const linuxBuildStep = workflow.match(
      /- name: Build beta linux artifacts\n(?:.+\n)+?(?=\n      - name: Smoke beta linux AppImage runtime)/m,
    );
    expect(linuxBuildStep?.[0]).toBeDefined();
    expect(linuxBuildStep?.[0]).toContain(
      'node -e \'const fs = require("node:fs"); JSON.parse(fs.readFileSync(process.argv[1], "utf8"));\' "$build_json_path"',
    );
    expect(workflow).toContain("Smoke beta linux AppImage runtime");
    expect(workflow).toContain("manifest.json");
    expect(workflow).toContain("linux-tools-pack-build.json");
    expect(workflow).toContain("Upload linux e2e spec report");
    expect(workflow).toContain("open-design-beta-linux-e2e-report");
    expect(workflow).toContain("Download linux e2e spec report");
  });

  it("preserves stable linux AppImage smoke reports for release publication", async () => {
    const workflow = await readFile(releaseStableWorkflowPath, "utf8");
    const linuxBuildStep = workflow.match(
      /- name: Build release linux artifacts\n(?:.+\n)+?(?=\n      - name: Smoke release linux AppImage runtime)/m,
    );
    expect(linuxBuildStep?.[0]).toBeDefined();
    expect(linuxBuildStep?.[0]).toContain(
      'node -e \'const fs = require("node:fs"); JSON.parse(fs.readFileSync(process.argv[1], "utf8"));\' "$build_json_path"',
    );
    expect(workflow).toContain("Smoke release linux AppImage runtime");
    expect(workflow).toContain("manifest.json");
    expect(workflow).toContain("linux-tools-pack-build.json");
    expect(workflow).toContain("Upload linux e2e spec report");
    expect(workflow).toContain("open-design-release-linux-e2e-report");
    expect(workflow).toContain("Download linux e2e spec report");
  });
});

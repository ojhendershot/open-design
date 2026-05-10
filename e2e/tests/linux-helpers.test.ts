import { homedir } from "node:os";

import { describe, expect, it } from "vitest";

import { linuxRemovalStatusMessage, linuxUserHome } from "../specs/linux-helpers.js";

describe("linux e2e helpers", () => {
  it("uses os.homedir for install path expectations when HOME is unset", () => {
    const originalHome = process.env.HOME;
    try {
      delete process.env.HOME;
      expect(linuxUserHome()).toBe(homedir());
    } finally {
      if (originalHome == null) {
        delete process.env.HOME;
      } else {
        process.env.HOME = originalHome;
      }
    }
  });

  it("surfaces skipped-process-running as a lifecycle cleanup diagnostic", () => {
    expect(linuxRemovalStatusMessage("appImage", "skipped-process-running")).toContain(
      "process remained running before removal",
    );
  });
});

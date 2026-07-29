import { describe, expect, it } from "vitest";
import { EXPERIMENTAL_MODULES } from "../../src/shared/lib/training/experimentalModules";

describe("experimentalModules", () => {
  it("is empty after block_pattern was promoted to the main catalog", () => {
    expect(EXPERIMENTAL_MODULES).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";
import type { TargetPriority, TargetScope, TargetSelectionShape } from "./index";

describe("engine public type exports", () => {
  it("makes targeting contracts available to TypeScript consumers", () => {
    const consumerTargetScope: TargetScope = "enemies";
    const consumerTargetPriority: TargetPriority = "highest_health";
    const consumerSelectionShape: TargetSelectionShape = "individual";

    expect([consumerTargetScope, consumerTargetPriority, consumerSelectionShape]).toEqual([
      "enemies",
      "highest_health",
      "individual",
    ]);
  });
});

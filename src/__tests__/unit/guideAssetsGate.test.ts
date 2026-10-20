import { describe, expect, it } from "vitest";
import { GUIDE_IDS } from "@/contracts/mathSrsGuide.contract";
import { GUIDE_POSES, guideAssetPath } from "@/lib/math-srs/guideAssets";
import { studentGateFor } from "@/lib/studentRouteAccess";

// 2026-10-20: the guide pictures first shipped under /lab/guides, which the student gate does
// not open — a blocked GET is a 307 to /learn, so every <img> would have read HTML. The screen
// builds its paths with guideAssetPath, so asking the gate about those paths asks about the
// pictures the student actually loads.
describe("guide pictures reach the student who chose them", () => {
  const paths = GUIDE_IDS.flatMap((id) =>
    GUIDE_POSES.map((pose) => guideAssetPath(id, pose)),
  );

  it("lives with the other public pictures, one file per guide and pose", () => {
    expect(paths).toHaveLength(25);
    expect(new Set(paths).size).toBe(25);
    for (const path of paths)
      expect(path).toMatch(/^\/images\/guides\/[a-z-]+\/[a-z]+\.webp$/);
  });

  it("is open to an active student, and only GET and HEAD", () => {
    for (const path of paths) {
      for (const method of ["GET", "HEAD"])
        expect(
          studentGateFor(false, method, path),
          `${method} ${path}`,
        ).toEqual({ kind: "allow" });
      expect(studentGateFor(false, "POST", path).kind).not.toBe("allow");
    }
  });
});

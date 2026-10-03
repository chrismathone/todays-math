import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeWorkspaceMenus,
  workspaceMenusFromDisabled,
  workspaceMenusOf,
} from "@/contracts/accountAccess.contract";
import {
  getListeningPilotAccess,
  filterListeningPilotMenus,
} from "@/lib/listeningPilot";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

describe("listening menu rollout", () => {
  it("registers listening without upgrading legacy English grants", () => {
    expect(workspaceMenusOf("english")).toContain("english-listening");
    expect(normalizeWorkspaceMenus(["english"])).not.toContain(
      "english-listening",
    );
  });
  it("preserves both legacy and normalized full-English denials", () => {
    for (const blocked of [
      ["english"],
      ["english-school", "english-maker", "english-library"],
      ["english-listening"],
    ]) {
      expect(workspaceMenusFromDisabled(blocked)).not.toContain(
        "english-listening",
      );
    }
    expect(workspaceMenusFromDisabled(["english-maker"])).toContain(
      "english-listening",
    );
  });
  it("requires an explicit pilot grant or service administrator and honors the kill switch", () => {
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
    vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", "teacher-one,teacher-two");
    expect(
      getListeningPilotAccess({ id: "teacher-one" }).grantedUserIds,
    ).toContain("teacher-one");
    expect(
      filterListeningPilotMenus(
        { id: "unlisted" },
        workspaceMenusOf("english"),
        [],
      ),
    ).not.toContain("english-listening");
    expect(
      filterListeningPilotMenus(
        { id: "admin", isSuperAdmin: true },
        workspaceMenusOf("english"),
        [],
      ),
    ).toContain("english-listening");
    expect(
      filterListeningPilotMenus(
        { id: "admin", isSuperAdmin: true },
        workspaceMenusOf("english"),
        ["english"],
      ),
    ).not.toContain("english-listening");
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "false");
    expect(
      filterListeningPilotMenus(
        { id: "admin", isSuperAdmin: true },
        workspaceMenusOf("english"),
        [],
      ),
    ).not.toContain("english-listening");
  });
});

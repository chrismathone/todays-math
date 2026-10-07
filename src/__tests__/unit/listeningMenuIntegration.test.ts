import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeWorkspaceMenus,
  workspaceMenusFromDisabled,
  workspaceMenusOf,
} from "@/contracts/accountAccess.contract";
import {
  canAccessListeningPilot,
  filterListeningPilotMenus,
  listeningServiceEnabled,
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
  it("follows the stored menus for every account, with no enrolment list, and honors the kill switch", () => {
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "true");
    // The former pilot list neither grants nor withholds anything.
    vi.stubEnv("ENGLISH_LISTENING_TEACHER_IDS", "teacher-one");
    const accounts = [
      { id: "teacher-one" },
      { id: "unlisted" },
      { id: "admin", isSuperAdmin: true },
    ];
    expect(listeningServiceEnabled()).toBe(true);
    for (const account of accounts) {
      expect(
        filterListeningPilotMenus(account, workspaceMenusOf("english"), []),
      ).toContain("english-listening");
      for (const disabledMenus of [["english"], ["english-listening"]])
        expect(
          filterListeningPilotMenus(
            account,
            workspaceMenusOf("english"),
            disabledMenus,
          ),
        ).not.toContain("english-listening");
      expect(
        canAccessListeningPilot({ ...account, approvalStatus: "approved" }, []),
      ).toBe(true);
      expect(
        canAccessListeningPilot({ ...account, approvalStatus: "pending" }, []),
      ).toBe(false);
    }
    vi.stubEnv("ENGLISH_LISTENING_ENABLED", "false");
    expect(listeningServiceEnabled()).toBe(false);
    for (const account of accounts) {
      expect(
        filterListeningPilotMenus(account, workspaceMenusOf("english"), []),
      ).not.toContain("english-listening");
      expect(
        canAccessListeningPilot({ ...account, approvalStatus: "approved" }, []),
      ).toBe(false);
    }
  });
});

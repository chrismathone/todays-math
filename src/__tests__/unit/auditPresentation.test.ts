import { describe, expect, it } from "vitest";
import { WORKSPACE_MENUS } from "@/contracts/accountAccess.contract";
import {
  auditActionLabel,
  auditDetailRows,
  auditOutcomeLabel,
  auditTechnicalDetails,
} from "@/components/admin/auditPresentation";
import type { AuditEntry } from "@/components/admin/documentTypes";

const entry: AuditEntry = {
  id: "audit-1",
  action: "account.settings_changed",
  outcome: "success",
  actorName: "관리자",
  createdAt: "2026-10-02T00:00:00.000Z",
  details: null,
};

describe("audit presentation", () => {
  it.each([null, "branch-1"])(
    "uses workspace menu labels for the recorded branch %s",
    (branchId) => {
      const rows = auditDetailRows({
        menus: WORKSPACE_MENUS.map((menu) => menu.id),
        branchId,
      });
      for (const menu of WORKSPACE_MENUS) {
        expect(rows.find((row) => row.label === "메뉴 권한")?.value).toContain(
          menu.id === "library" && branchId ? "우리학원 시험지" : menu.label,
        );
      }
      expect(
        rows.find((row) => row.label === "메뉴 권한")?.value,
      ).not.toContain("conceptBlank");
    },
  );

  it("pairs approval, boolean, branch and empty menu values without mutating source data", () => {
    const details = Object.freeze({
      previousStatus: "pending",
      status: "approved",
      previousBranchManager: false,
      branchManager: true,
      previousBranchId: null,
      branchId: "branch-1",
      branchName: "당시 강남점",
      previousMenus: Object.freeze([]),
      menus: Object.freeze(["library", "conceptBlank"]),
      suspended: false,
      deleted: false,
    });
    const before = JSON.stringify(details);
    expect(auditDetailRows(details)).toEqual(
      expect.arrayContaining([
        {
          label: "승인 상태",
          previous: "승인 대기",
          value: "승인됨",
          unchanged: false,
        },
        {
          label: "지점 관리 권한",
          previous: "없음",
          value: "있음",
          unchanged: false,
        },
        {
          label: "소속 지점",
          previous: "독립 계정",
          value: "당시 강남점",
          unchanged: false,
        },
        {
          label: "메뉴 권한",
          previous: "허용된 메뉴 없음",
          value: "우리학원 시험지, 개념 백지",
          unchanged: false,
        },
        { label: "이용 정지", value: "정지 안 됨" },
        { label: "계정 삭제", value: "삭제 안 됨" },
      ]),
    );
    expect(JSON.stringify(details)).toBe(before);
  });

  it("distinguishes missing history, unchanged values and an unresolved historical branch", () => {
    const rows = auditDetailRows({
      previousBranchId: "old-branch",
      branchId: "new-branch",
      previousStatus: "approved",
      status: "approved",
      previousMenus: ["bank"],
    });
    expect(rows).toContainEqual({
      label: "승인 상태",
      previous: "승인됨",
      value: "승인됨",
      unchanged: true,
    });
    expect(rows).toContainEqual({
      label: "소속 지점",
      previous: "지점 소속 (이름 미기록)",
      value: "지점 소속 (이름 미기록)",
      unchanged: false,
    });
    expect(rows).toContainEqual({
      label: "메뉴 권한",
      previous: "시험지 만들기",
      value: "기록 없음",
      unchanged: false,
    });
  });

  it("preserves unknown, nested, null and potentially hostile values verbatim in technical details", () => {
    const unknown = {
      ...entry,
      action: "future.action",
      outcome: "constructor",
      details: {
        status: "future-status",
        menus: ["future-menu"],
        branchManager: "false",
        nested: {
          value: '<img src=x onerror="alert(1)">',
          child: [null, false, 0, ""],
        },
        empty: null,
        requestUrl: "/api/admin/users/unknown/audit",
      },
    };
    expect(auditActionLabel(unknown)).toBe("기타 활동");
    expect(auditOutcomeLabel(unknown.outcome)).toBe("기타 결과");
    expect(JSON.parse(auditTechnicalDetails(unknown))).toEqual({
      action: unknown.action,
      outcome: unknown.outcome,
      details: unknown.details,
    });
    expect(auditDetailRows(unknown.details).map((row) => row.value)).toEqual([
      "알 수 없는 상태",
      "기록 확인 필요",
      "미등록 메뉴",
    ]);
    expect(auditDetailRows(null)).toEqual([]);
  });

  it.each([
    [
      "admin.private_material_view",
      "/api/admin/users/user-1/audit",
      "관리자 계정 활동 기록 조회 요청",
    ],
    [
      "admin.private_material_view",
      "/api/admin/users/user-1/documents",
      "관리자 계정 자료 목록 조회 요청",
    ],
    ["request", "/api/library/documents", "우리학원 시험지 이용 요청"],
    ["ui.navigate", "/#conceptBlank", "개념 백지 · 화면 이동"],
    ["ui.print", "/concept-blank/print", "개념 백지 · 인쇄 요청"],
    ["ui.print", "/unknown", "인쇄 요청"],
  ])(
    "labels %s on %s without exposing the request URL",
    (action, path, label) => {
      expect(
        auditActionLabel({
          ...entry,
          action,
          details: { path, branchId: "branch-1" },
        }),
      ).toBe(label);
    },
  );

  it.each([
    [null, "new-branch", "내 시험지", "우리학원 시험지"],
    ["old-branch", null, "우리학원 시험지", "내 시험지"],
  ])(
    "uses each side's historical membership even when menu IDs are unchanged",
    (previousBranchId, branchId, previous, value) => {
      expect(
        auditDetailRows({
          previousBranchId,
          branchId,
          previousMenus: ["library"],
          menus: ["library"],
        }),
      ).toContainEqual({
        label: "메뉴 권한",
        previous,
        value,
        unchanged: false,
      });
    },
  );

  it("does not infer missing historical membership or branch names", () => {
    const details = {
      previousMenus: ["library"],
      menus: ["library"],
      branchId: "historical-branch-uuid",
    };
    const rows = auditDetailRows(details);
    expect(rows).toContainEqual({
      label: "메뉴 권한",
      previous: "시험지 보관함 (소속 미기록)",
      value: "우리학원 시험지",
      unchanged: false,
    });
    expect(rows).toContainEqual({
      label: "소속 지점",
      value: "지점 소속 (이름 미기록)",
    });
    expect(JSON.stringify(rows)).not.toContain("historical-branch-uuid");
    expect(auditTechnicalDetails({ ...entry, details })).toContain(
      "historical-branch-uuid",
    );
    expect(auditDetailRows({ menus: ["library"] })).toEqual([
      { label: "메뉴 권한", value: "시험지 보관함 (소속 미기록)" },
    ]);
  });

  it("keeps legacy English permission history understandable after menus split", () => {
    expect(auditDetailRows({ previousMenus: ["english"], menus: [] })).toEqual([
      {
        label: "메뉴 권한",
        previous: "오늘 영어 전체",
        value: "허용된 메뉴 없음",
        unchanged: false,
      },
    ]);
    expect(
      auditActionLabel({
        ...entry,
        action: "ui.navigate",
        details: { path: "/#english" },
      }),
    ).toBe("오늘 영어 전체 · 화면 이동");
  });
});

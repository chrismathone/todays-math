// @vitest-environment node
/**
 * 오늘의 영어 — 형식 판 관문 · 사용 권한 정책 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * 🔴 1판 경로(저장 API · 붙여넣기 · 서버 AI)가 2판이나 모르는 판의 값을 받았을 때 **모르는 칸을 버리고 1판으로 저장**하면
 * 표적과 표적별 정답이 소리 없이 사라진다. 관문은 그 값을 거절한다. 정상 1판 요청은 그대로 지난다.
 * `schemaVersion`(형식 판)과 `revision`(동시 수정 CAS)은 다른 칸이다.
 */
import { describe, expect, it } from "vitest";

import type { EnglishV2Rights } from "@/contracts/englishV2.contract";
import {
  ENGLISH_V2_INTAKE_RIGHTS,
  englishV2UseAllowed,
  withIntakeRights,
} from "@/lib/english/v2/rights";
import {
  englishV1PayloadIssues,
  englishV2Markers,
  gateEnglishV1Write,
  probeEnglishSchemaVersion,
  storedEnglishSetVersion,
} from "@/lib/english/v2/versionGate";
import {
  englishV1LegacySet,
  englishV2TwoTargetDocument,
} from "@/mocks/englishV2Fixtures";

const v1Body = () => {
  const { title, status, passage, questions, revision } = englishV1LegacySet();
  return { title, status, passage, questions, revision };
};
const v2Targets = () => englishV2TwoTargetDocument().items[0]!.targets;

describe("형식 판 읽기 — probeEnglishSchemaVersion", () => {
  it("표지가 없으면 1판(옛 payload), 1 이면 1판, 2 면 2판", () => {
    expect(probeEnglishSchemaVersion(v1Body())).toEqual({ kind: "v1" });
    expect(probeEnglishSchemaVersion({ schemaVersion: 1 })).toEqual({
      kind: "v1",
    });
    expect(probeEnglishSchemaVersion(englishV2TwoTargetDocument())).toEqual({
      kind: "v2",
    });
  });

  it.each([3, 0, -1, 1.5, "1", "2", null, true, {}])(
    "모르는 판 %j 는 unsupported — 가까운 판으로 맞춰 읽지 않는다",
    (schemaVersion) => {
      expect(probeEnglishSchemaVersion({ schemaVersion })).toEqual({
        kind: "unsupported",
        schemaVersion,
      });
    },
  );

  it("객체가 아니면 판을 말할 수 없다", () => {
    for (const value of [null, undefined, "x", 2, []])
      expect(probeEnglishSchemaVersion(value)).toEqual({
        kind: "unsupported",
        schemaVersion: undefined,
      });
  });

  it("revision 은 형식 판이 아니다 — revision 이 2여도 1판이다", () => {
    expect(probeEnglishSchemaVersion({ ...v1Body(), revision: 2 })).toEqual({
      kind: "v1",
    });
  });
});

describe("2판 칸 찾기 — englishV2Markers", () => {
  it("1판 값에는 없다 — AI 가 흔히 덧붙이는 낯선 칸(번호 · 난이도)은 2판 칸이 아니다", () => {
    expect(englishV2Markers(v1Body())).toEqual([]);
    const chatty = v1Body() as unknown as {
      questions: Record<string, unknown>[];
    };
    chatty.questions[0]!.number = 1;
    chatty.questions[0]!.difficulty = "중";
    expect(englishV2Markers(chatty)).toEqual([]);
  });

  it("문서 칸과 문항 칸을 자리와 함께 찾는다", () => {
    expect(englishV2Markers(englishV2TwoTargetDocument())).toEqual(
      expect.arrayContaining(["documentId", "passages", "items"]),
    );
    const mixed = v1Body() as unknown as {
      questions: Record<string, unknown>[];
    };
    mixed.questions[1]!.targets = v2Targets();
    mixed.questions[1]!.interactionType = "inline_alternatives";
    expect(englishV2Markers(mixed)).toEqual([
      "questions[1].interactionType",
      "questions[1].targets",
    ]);
  });
});

describe("1판 쓰기 관문 — gateEnglishV1Write", () => {
  it("정상 1판 요청은 그대로 지난다 — 같은 값을 돌려준다", () => {
    const body = v1Body();
    const gate = gateEnglishV1Write(body);
    expect(gate).toEqual({ ok: true, body });
  });

  it("schemaVersion: 1 을 밝힌 요청도 지난다 — 그 표지만 떼어 1판 계약에 넘긴다", () => {
    const body = { ...v1Body(), schemaVersion: 1 };
    const gate = gateEnglishV1Write(body);
    expect(gate).toEqual({ ok: true, body: v1Body() });
    // 넣은 값은 고치지 않는다
    expect(body.schemaVersion).toBe(1);
  });

  it("🔴 2판 요청은 거절한다 — 문서 꼴이든, 1판 꼴에 판만 2로 적은 것이든", () => {
    for (const body of [
      englishV2TwoTargetDocument(),
      { ...v1Body(), schemaVersion: 2 },
    ]) {
      const gate = gateEnglishV1Write(body);
      expect(gate.ok).toBe(false);
      if (gate.ok) continue;
      expect(gate.reason).toBe("v2_payload");
      expect(gate.schemaVersion).toBe(2);
      expect(gate.message).toContain("2판");
    }
  });

  it.each([3, "2", null, 0])(
    "🔴 모르는 판 %j 요청은 거절한다",
    (schemaVersion) => {
      const gate = gateEnglishV1Write({ ...v1Body(), schemaVersion });
      expect(gate.ok).toBe(false);
      if (gate.ok) return;
      expect(gate.reason).toBe("unsupported_version");
      expect(gate.schemaVersion).toBe(schemaVersion);
    },
  );

  it("🔴 판 표지 없이 2판 칸이 든 요청도 거절한다 — 그 칸의 자리를 알려 준다", () => {
    const body = v1Body() as unknown as {
      questions: Record<string, unknown>[];
    };
    body.questions[0]!.targets = v2Targets();
    const gate = gateEnglishV1Write(body);
    expect(gate.ok).toBe(false);
    if (gate.ok) return;
    expect(gate.reason).toBe("v2_payload");
    expect(gate.markers).toEqual(["questions[0].targets"]);
  });

  it("schemaVersion: 1 이라 적고 2판 칸을 넣은 요청도 거절한다", () => {
    const body = { ...v1Body(), schemaVersion: 1 } as unknown as {
      questions: Record<string, unknown>[];
    };
    body.questions[1]!.targets = v2Targets();
    expect(gateEnglishV1Write(body).ok).toBe(false);
  });

  it("객체가 아닌 본문은 관문이 판정하지 않는다 — 계약이 400 으로 거절한다", () => {
    for (const body of [undefined, null, "x", []])
      expect(gateEnglishV1Write(body)).toEqual({ ok: true, body });
  });
});

describe("1판 초안 검증기에 실을 사유 — englishV1PayloadIssues", () => {
  it("1판 초안은 사유가 없다", () => {
    expect(englishV1PayloadIssues(v1Body())).toEqual([]);
    expect(englishV1PayloadIssues({ ...v1Body(), schemaVersion: 1 })).toEqual(
      [],
    );
  });

  it("2판 · 모르는 판 · 2판 칸은 세트 단위 사유 한 줄로 — 문항 번호는 null", () => {
    for (const value of [
      englishV2TwoTargetDocument(),
      { ...v1Body(), schemaVersion: 7 },
    ]) {
      const issues = englishV1PayloadIssues(value);
      expect(issues).toHaveLength(1);
      expect(issues[0]!.question).toBeNull();
      expect(issues[0]!.message).toContain("1판");
    }
  });
});

describe("저장된 행의 판 — storedEnglishSetVersion", () => {
  it("문항이 1판 꼴이면 1판", () => {
    expect(
      storedEnglishSetVersion({ questions: englishV1LegacySet().questions }),
    ).toEqual({ kind: "v1" });
  });

  it("🔴 문항에 2판 칸이 있으면 2판 — 1판 PUT 으로 덮어쓰면 안 되는 행이다", () => {
    const questions = [
      { ...englishV1LegacySet().questions[0], targets: v2Targets() },
    ];
    expect(storedEnglishSetVersion({ questions })).toEqual({ kind: "v2" });
  });

  it("행에 schemaVersion 칸이 있으면 그 값이 먼저다 — 문항 꼴보다", () => {
    const questions = englishV1LegacySet().questions;
    expect(storedEnglishSetVersion({ questions, schemaVersion: 1 })).toEqual({
      kind: "v1",
    });
    expect(
      storedEnglishSetVersion({ questions: [], schemaVersion: 2 }),
    ).toEqual({ kind: "v2" });
    expect(storedEnglishSetVersion({ questions, schemaVersion: 9 })).toEqual({
      kind: "unsupported",
      schemaVersion: 9,
    });
  });

  it("schemaVersion 칸이 없는 행(지금의 모든 행)은 문항 꼴로만 본다 — 없는 칸을 2판으로 읽지 않는다", () => {
    expect(
      storedEnglishSetVersion({
        questions: englishV1LegacySet().questions,
        schemaVersion: undefined,
      }),
    ).toEqual({ kind: "v1" });
  });
});

describe("사용 권한 정책", () => {
  it("새로 들이는 자료의 처음 값은 unknown · 허락된 용도 없음", () => {
    expect(ENGLISH_V2_INTAKE_RIGHTS).toEqual({
      rightsStatus: "unknown",
      allowedUses: [],
    });
  });

  it("unknown · reference_only 는 어느 용도도 안 된다", () => {
    for (const rightsStatus of ["unknown", "reference_only"] as const)
      for (const use of [
        "store_original",
        "teacher_review",
        "generation_input",
        "search_index",
        "external_model",
        "distribution",
      ] as const)
        expect(
          englishV2UseAllowed({ rightsStatus, allowedUses: [] }, use),
        ).toBe(false);
  });

  it("🔴 approved 여도 적힌 용도만 된다 — 승인 하나로 전부 열리지 않는다", () => {
    const rights: EnglishV2Rights = {
      rightsStatus: "approved",
      allowedUses: ["teacher_review", "generation_input"],
    };
    expect(englishV2UseAllowed(rights, "teacher_review")).toBe(true);
    expect(englishV2UseAllowed(rights, "generation_input")).toBe(true);
    expect(englishV2UseAllowed(rights, "external_model")).toBe(false);
    expect(englishV2UseAllowed(rights, "distribution")).toBe(false);
  });

  it("🔴 요청이 보낸 approved 는 믿지 않는다 — 들일 때 처음 값으로 되돌린다", () => {
    const claimed = englishV2TwoTargetDocument();
    claimed.rights = {
      rightsStatus: "approved",
      allowedUses: ["distribution", "external_model"],
    };
    const reset = withIntakeRights(claimed);
    expect(reset.rights).toEqual({ rightsStatus: "unknown", allowedUses: [] });
    expect(englishV2UseAllowed(reset.rights, "distribution")).toBe(false);
    // 나머지는 그대로이고, 넣은 값은 고치지 않는다
    expect({ ...reset, rights: claimed.rights }).toEqual(claimed);
    expect(claimed.rights.rightsStatus).toBe("approved");
  });
});

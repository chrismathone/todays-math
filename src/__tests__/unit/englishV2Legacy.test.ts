// @vitest-environment node
/**
 * 오늘의 영어 — 1판 읽기 변환 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * 옛 세트를 형식 판이 붙은 «읽기 모양»으로 감싼다. 🔴 **감쌀 뿐 바꾸지 않는다**: 지문 · 문항 · `meta: null` 이 그대로이고,
 * 저장된 해설을 다시 분류하지 않으며, «검토 완료»를 정답 확인으로 올리지 않는다. 변환이 지은 ID 는 임시다 — 2판 ID 로 통하지 않는다.
 */
import { describe, expect, it } from "vitest";

import { englishSetSchema } from "@/contracts/english.contract";
import {
  englishV2DocumentSchema,
  englishV2IdSchema,
} from "@/contracts/englishV2.contract";
import {
  isProvisionalEnglishId,
  readEnglishV1Set,
  readEnglishVersioned,
  restoreEnglishV1Set,
} from "@/lib/english/v2/legacy";
import { validateEnglishV2Document } from "@/lib/english/v2/validate";
import {
  V1_SET_ID,
  englishV1LegacySet,
  englishV2TwoTargetDocument,
} from "@/mocks/englishV2Fixtures";

describe("1판 읽기 변환 — 손실 없음", () => {
  it("🔴 옛 세트(meta null · 출처 미상)를 감쌌다 풀면 처음과 똑같다", () => {
    const set = englishV1LegacySet();
    const view = readEnglishV1Set(set);
    expect(view.schemaVersion).toBe(1);
    expect(view.set).toEqual(set);
    const restored = restoreEnglishV1Set(view);
    expect(restored).toEqual(set);
    expect(restored.meta).toBeNull();
    expect("meta" in restored).toBe(true);
    // 계약도 그대로 통과한다 — 풀어낸 것이 1판 세트다
    expect(englishSetSchema.parse(restored)).toEqual(set);
  });

  it("meta 칸이 아예 없던 세트는 없는 채로, 값이 있던 세트는 그 값 그대로", () => {
    const withoutMeta = englishV1LegacySet();
    delete withoutMeta.meta;
    const absent = restoreEnglishV1Set(readEnglishV1Set(withoutMeta));
    expect("meta" in absent).toBe(false);

    const withMeta = {
      ...englishV1LegacySet(),
      meta: { path: "chatgpt" as const, count: 2, difficulty: "표준" as const },
    };
    expect(restoreEnglishV1Set(readEnglishV1Set(withMeta)).meta).toEqual(
      withMeta.meta,
    );
  });

  it("지문의 글자가 그대로다 — 다듬지 않는다", () => {
    const set = englishV1LegacySet();
    const view = readEnglishV1Set(set);
    expect(view.set.passage).toBe(set.passage);
    expect(view.set.questions.map((q) => q.evidence)).toEqual(
      set.questions.map((q) => q.evidence),
    );
  });

  it("넣은 세트를 고치지 않고, 돌려준 것을 고쳐도 원본이 안 바뀐다", () => {
    const set = englishV1LegacySet();
    const before = JSON.stringify(set);
    const view = readEnglishV1Set(set);
    view.set.questions[0]!.answer = "5";
    restoreEnglishV1Set(view).title = "바꿈";
    expect(JSON.stringify(set)).toBe(before);
  });
});

describe("1판 읽기 변환 — 올려 적지 않는다", () => {
  it("🔴 상태가 «검토 완료»여도 정답 확인은 false 다", () => {
    const set = englishV1LegacySet();
    expect(set.status).toBe("검토 완료");
    expect(readEnglishV1Set(set).answerVerified).toBe(false);
  });

  it("출처는 «미상», 권한은 unknown · 허락된 용도 없음", () => {
    const view = readEnglishV1Set(englishV1LegacySet());
    expect(view.provenance).toEqual({ kind: "legacy_unknown" });
    expect(view.rights).toEqual({ rightsStatus: "unknown", allowedUses: [] });
  });

  it("🔴 저장된 해설 문자열을 고치지도 다시 분류하지도 않는다 — 부분점수 문장이 든 옛 해설도 그대로", () => {
    const set = englishV1LegacySet();
    const view = readEnglishV1Set(set);
    expect(view.set.questions[1]!.explanation).toBe(
      "핵심어 사용 2점 · 조건 충족 2점 · 어법 오류 하나당 1점 감점",
    );
    // 읽기 모양 어디에도 2판 해설 상태(none · source · ai_suggested · teacher_confirmed)를 붙이지 않았다
    expect(JSON.stringify(view)).not.toMatch(
      /"status":"(none|source|ai_suggested|teacher_confirmed)"/,
    );
  });
});

describe("1판 읽기 변환 — 임시 ID", () => {
  it("문항 수만큼 임시 ID 를 짓고, 같은 세트면 늘 같은 글자다", () => {
    const view = readEnglishV1Set(englishV1LegacySet());
    expect(view.provisional.passageId).toBe(`legacy:${V1_SET_ID}:passage`);
    expect(view.provisional.itemIds).toEqual([
      `legacy:${V1_SET_ID}:q:0`,
      `legacy:${V1_SET_ID}:q:1`,
    ]);
    expect(readEnglishV1Set(englishV1LegacySet()).provisional).toEqual(
      view.provisional,
    );
  });

  it("🔴 임시 ID 는 2판의 영구 ID 로 통하지 않는다", () => {
    const { provisional } = readEnglishV1Set(englishV1LegacySet());
    for (const id of [provisional.passageId, ...provisional.itemIds]) {
      expect(isProvisionalEnglishId(id)).toBe(true);
      expect(englishV2IdSchema.safeParse(id).success).toBe(false);
    }
    expect(isProvisionalEnglishId("20000000-0000-4000-8000-0000000000c1")).toBe(
      false,
    );
    // 임시 ID 를 2판 문서에 넣으면 문서째 거절된다
    const forged = englishV2TwoTargetDocument();
    forged.items[0]!.itemId = provisional.itemIds[0]!;
    expect(validateEnglishV2Document(forged).ok).toBe(false);
  });

  it("읽기 모양 자체는 2판 문서가 아니다 — 2판 저장 경로에 그대로 넣을 수 없다", () => {
    const view = readEnglishV1Set(englishV1LegacySet());
    expect(englishV2DocumentSchema.safeParse(view).success).toBe(false);
    expect(validateEnglishV2Document(view).ok).toBe(false);
  });
});

describe("판을 보고 읽는다 — readEnglishVersioned", () => {
  it("판 표지가 없는 1판 세트는 1판 읽기 모양으로", () => {
    const set = englishV1LegacySet();
    const read = readEnglishVersioned(set);
    expect(read).toMatchObject({ ok: true, schemaVersion: 1 });
    if (read.ok && read.schemaVersion === 1) expect(read.view.set).toEqual(set);
  });

  it("2판 문서는 검증기를 지나 2판으로", () => {
    const document = englishV2TwoTargetDocument();
    expect(readEnglishVersioned(document)).toEqual({
      ok: true,
      schemaVersion: 2,
      document,
    });
  });

  it("🔴 모르는 판은 읽지 않는다 — 1판으로도 2판으로도 낮춰 읽지 않는다", () => {
    for (const schemaVersion of [3, "2", null]) {
      const read = readEnglishVersioned({
        ...englishV1LegacySet(),
        schemaVersion,
      });
      expect(read.ok).toBe(false);
      if (read.ok) continue;
      expect(read.issues[0]).toMatchObject({ code: "unsupported_version" });
    }
  });

  it("🔴 판 표지 없이 2판 칸(targets)이 든 값은 1판으로 읽지 않는다", () => {
    const mixed = englishV1LegacySet() as unknown as {
      questions: Record<string, unknown>[];
    };
    mixed.questions[0]!.targets =
      englishV2TwoTargetDocument().items[0]!.targets;
    const read = readEnglishVersioned(mixed);
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(read.issues[0]!.code).toBe("unsupported_version");
    expect(read.issues[0]!.path).toBe("questions[0].targets");
  });

  it("1판인데 모양이 깨진 값은 shape 로 거절한다 — 고쳐서 읽지 않는다", () => {
    const broken = { ...englishV1LegacySet(), questions: [] };
    const read = readEnglishVersioned(broken);
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(read.issues[0]).toMatchObject({ code: "shape", path: "questions" });
  });
});

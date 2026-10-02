// @vitest-environment node
/**
 * 오늘의 영어 2판 — 왕복 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * parse → serialize → parse 뒤에 표적 · 정답 · 출처가 그대로다. 내보내는 글은 칸 순서와 무관하게 하나다(정준).
 * 깨진 문서는 내보내지 않는다. 🔴 이 시험은 **글자열 왕복**이다 — DB 에 저장했다 읽는 왕복이 아니다(2판 저장은 꺼져 있다).
 */
import { describe, expect, it } from "vitest";

import {
  EnglishV2InvalidError,
  parseEnglishV2Json,
  serializeEnglishV2Document,
} from "@/lib/english/v2/serialize";
import {
  V2_TARGET_AGREEMENT_ID,
  V2_TARGET_TENSE_ID,
  englishV2TwoTargetDocument,
} from "@/mocks/englishV2Fixtures";

/** 칸 순서를 뒤집은 복사본 — 값은 같다 */
function reversedKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reversedKeys);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .reverse()
        .map(([key, inner]) => [key, reversedKeys(inner)]),
    );
  return value;
}

describe("2판 왕복 — parse → serialize → parse", () => {
  it("🔴 표적 · 정답 · 출처 · 권한 · 해설 상태가 그대로 돌아온다", () => {
    const fixture = englishV2TwoTargetDocument();
    const first = parseEnglishV2Json(JSON.stringify(fixture));
    if (!first.ok) throw new Error("표본이 거절됐다");
    const text = serializeEnglishV2Document(first.document);
    const second = parseEnglishV2Json(text);
    if (!second.ok) throw new Error("내보낸 글이 다시 읽히지 않는다");

    expect(second.document).toEqual(fixture);
    const [tense, agreement] = second.document.items[0]!.targets;
    expect(tense).toMatchObject({
      targetId: V2_TARGET_TENSE_ID,
      span: { start: 114, end: 125, quote: "had climbed" },
      answer: { alternativeId: "a" },
      answerVerification: { verified: false },
      explanation: { status: "none" },
    });
    expect(agreement).toMatchObject({
      targetId: V2_TARGET_AGREEMENT_ID,
      span: { start: 187, end: 194, quote: "matters" },
      answer: { alternativeId: "b" },
      answerVerification: { verified: true },
      explanation: { status: "teacher_confirmed" },
    });
    expect(second.document.provenance).toEqual(fixture.provenance);
    expect(second.document.rights).toEqual(fixture.rights);
    expect(second.document.schemaVersion).toBe(2);
    expect(second.document.passages[0]!.sourceRevision).toBe(1);
  });

  it("두 번 돌려도 글자가 같다", () => {
    const once = serializeEnglishV2Document(englishV2TwoTargetDocument());
    const parsed = parseEnglishV2Json(once);
    if (!parsed.ok) throw new Error("내보낸 글이 다시 읽히지 않는다");
    expect(serializeEnglishV2Document(parsed.document)).toBe(once);
  });

  it("칸 순서가 달라도 내보낸 글은 하나다 — 배열 순서는 지킨다", () => {
    const fixture = englishV2TwoTargetDocument();
    const shuffled = parseEnglishV2Json(JSON.stringify(reversedKeys(fixture)));
    if (!shuffled.ok) throw new Error("칸 순서만 바꿨는데 거절됐다");
    expect(serializeEnglishV2Document(shuffled.document)).toBe(
      serializeEnglishV2Document(fixture),
    );
    const swapped = structuredClone(fixture);
    swapped.items[0]!.targets[0]!.alternatives.reverse();
    expect(serializeEnglishV2Document(swapped)).not.toBe(
      serializeEnglishV2Document(fixture),
    );
  });

  it("내보낸 글의 칸은 이름순이다 — 계약에 칸을 적은 순서가 바뀌어도 글자가 안 바뀐다", () => {
    const text = serializeEnglishV2Document(englishV2TwoTargetDocument());
    // 계약은 schemaVersion 을 맨 앞에 적었지만 글은 이름순(documentId · items · passages …)으로 나간다
    const keys = Object.keys(JSON.parse(text) as Record<string, unknown>);
    expect(keys).toEqual([...keys].sort());
    expect(keys[0]).toBe("documentId");
    expect(text.startsWith('{"documentId":')).toBe(true);
    const span = (
      JSON.parse(text) as {
        items: { targets: { span: Record<string, unknown> }[] }[];
      }
    ).items[0]!.targets[0]!.span;
    expect(Object.keys(span)).toEqual(["end", "quote", "start"]);
  });

  it("지문의 공백 · 줄바꿈 · 4바이트 글자가 왕복에서 한 글자도 안 바뀐다", () => {
    const face = String.fromCodePoint(0x1f600);
    const fixture = englishV2TwoTargetDocument();
    const text = `  Line one.\r\n\tLine two ${face} ends here with enough words.  `;
    fixture.passages[0]!.text = text;
    fixture.items[0]!.targets = [
      {
        ...fixture.items[0]!.targets[0]!,
        span: { start: 2, end: 6, quote: "Line" },
        evidence: [],
      },
    ];
    const parsed = parseEnglishV2Json(serializeEnglishV2Document(fixture));
    if (!parsed.ok) throw new Error("거절됐다");
    expect(parsed.document.passages[0]!.text).toBe(text);
  });
});

describe("2판 왕복 — 깨진 값", () => {
  it("깨진 문서는 내보내지 않는다 — 사유를 실어 던진다", () => {
    const broken = englishV2TwoTargetDocument();
    broken.items[0]!.targets[0]!.answer = { alternativeId: "z" };
    let caught: unknown;
    try {
      serializeEnglishV2Document(broken);
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(EnglishV2InvalidError);
    expect(
      (caught as EnglishV2InvalidError).issues.map((issue) => issue.code),
    ).toEqual(["answer_not_in_alternatives"]);
  });

  it("JSON 이 아닌 글은 invalid_json 으로 거절한다", () => {
    const verdict = parseEnglishV2Json("{ not json");
    expect(verdict).toEqual({
      ok: false,
      issues: [expect.objectContaining({ code: "invalid_json", path: "" })],
    });
  });

  it("모르는 판의 글은 읽지 않는다 — 2판으로 낮춰 읽지 않는다", () => {
    const future = { ...englishV2TwoTargetDocument(), schemaVersion: 3 };
    const verdict = parseEnglishV2Json(JSON.stringify(future));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.issues.map((issue) => issue.code)).toEqual([
      "unsupported_version",
    ]);
  });

  it("모르는 칸이 든 글은 읽지 않는다 — 그 칸을 버리고 읽지 않는다", () => {
    const extra = englishV2TwoTargetDocument() as unknown as Record<
      string,
      unknown
    >;
    extra.scoringRules = [{ points: 2 }];
    const verdict = parseEnglishV2Json(JSON.stringify(extra));
    expect(verdict.ok).toBe(false);
    if (verdict.ok) return;
    expect(verdict.issues[0]).toMatchObject({
      code: "unknown_field",
      path: "scoringRules",
    });
  });
});

// @vitest-environment node
/**
 * 오늘의 영어 2판 검증기 — 뜻 (자료 개선 M0, docs/planning/english-material-upgrade-20261002.md §B).
 *
 * 계약이 모양을 잠근 뒤 지문과 문항을 같이 본다: ID 유일 · 문항이 가리키는 지문 · 지문 개정 일치 ·
 * 자리의 경계 · 인용 일치 · 서로게이트 · 표적끼리 겹침 · 보기 밖 정답 · 표적별 답 누락.
 * 표본은 우리가 지은 지문 하나 · 표적 둘(`src/mocks/englishV2Fixtures.ts`).
 */
import { describe, expect, it } from "vitest";

import {
  type EnglishV2Issue,
  validateEnglishV2Document,
} from "@/lib/english/v2/validate";
import {
  V2_PASSAGE_ID,
  V2_PASSAGE_TEXT,
  V2_TARGET_AGREEMENT_ID,
  V2_TARGET_TENSE_ID,
  englishV2TwoTargetDocument,
} from "@/mocks/englishV2Fixtures";

type Json = Record<string, unknown>;

function edited(edit: (document: Json) => void): Json {
  const document = structuredClone(englishV2TwoTargetDocument()) as Json;
  edit(document);
  return document;
}
const passage = (document: Json) => (document.passages as Json[])[0]!;
const item = (document: Json, index = 0) => (document.items as Json[])[index]!;
const target = (document: Json, index: number) =>
  (item(document).targets as Json[])[index]!;

function issuesOf(value: unknown): EnglishV2Issue[] {
  const verdict = validateEnglishV2Document(value);
  if (verdict.ok) throw new Error("통과했다 — 거절돼야 하는 표본이다");
  return verdict.issues;
}
const codesOf = (value: unknown) => issuesOf(value).map((issue) => issue.code);

/** 같은 지문에 문항을 하나 더 — ID 만 새로 준다 */
function withSecondItem(document: Json, edit?: (second: Json) => void) {
  const second = structuredClone(item(document));
  second.itemId = "20000000-0000-4000-8000-0000000000b2";
  (second.targets as Json[])[0]!.targetId =
    "20000000-0000-4000-8000-0000000000c3";
  (second.targets as Json[])[1]!.targetId =
    "20000000-0000-4000-8000-0000000000c4";
  edit?.(second);
  (document.items as Json[]).push(second);
}

describe("2판 검증기 — 표본", () => {
  it("지문 하나 · 표적 둘 표본이 통과하고, 돌려준 문서가 넣은 값과 같다", () => {
    const fixture = englishV2TwoTargetDocument();
    const verdict = validateEnglishV2Document(fixture);
    expect(verdict).toEqual({ ok: true, document: fixture });
  });

  it("🔴 표본의 자리는 손으로 적은 숫자이고, 지문을 그 숫자로 자르면 인용과 같다", () => {
    const [tense, agreement] = englishV2TwoTargetDocument().items[0]!.targets;
    expect(tense!.span).toEqual({ start: 114, end: 125, quote: "had climbed" });
    expect(agreement!.span).toEqual({ start: 187, end: 194, quote: "matters" });
    for (const span of [tense!.span, agreement!.span, ...tense!.evidence])
      expect(V2_PASSAGE_TEXT.slice(span.start, span.end)).toBe(span.quote);
  });

  it("표적마다 정답이 따로다 — 첫 표적은 a, 둘째 표적은 b", () => {
    const verdict = validateEnglishV2Document(englishV2TwoTargetDocument());
    if (!verdict.ok) throw new Error("표본이 거절됐다");
    const answers = verdict.document.items[0]!.targets.map((t) => [
      t.targetId,
      t.alternatives.find((a) => a.alternativeId === t.answer.alternativeId)
        ?.text,
    ]);
    expect(answers).toEqual([
      [V2_TARGET_TENSE_ID, "had climbed"],
      [V2_TARGET_AGREEMENT_ID, "matters"],
    ]);
  });
});

describe("2판 검증기 — 형식 판 · 모르는 칸", () => {
  it.each([3, 0, "2", null])(
    "모르는 판 %j 는 unsupported_version 하나로 거절한다",
    (version) => {
      const issues = issuesOf(edited((d) => (d.schemaVersion = version)));
      expect(issues).toHaveLength(1);
      expect(issues[0]).toMatchObject({
        code: "unsupported_version",
        path: "schemaVersion",
      });
    },
  );

  it("판 표지가 없는 값 · 1판 값은 2판 문서가 아니다", () => {
    expect(codesOf(edited((d) => delete d.schemaVersion))).toEqual([
      "unsupported_version",
    ]);
    expect(codesOf(edited((d) => (d.schemaVersion = 1)))).toEqual([
      "unsupported_version",
    ]);
    expect(codesOf(null)).toEqual(["unsupported_version"]);
    expect(codesOf([])).toEqual(["unsupported_version"]);
  });

  it("모르는 칸은 unknown_field 로 자리와 함께 거절한다 — 버리고 통과시키지 않는다", () => {
    const issues = issuesOf(edited((d) => (target(d, 1).score = 2)));
    expect(issues).toEqual([
      expect.objectContaining({
        code: "unknown_field",
        path: "items[0].targets[1].score",
      }),
    ]);
    const top = issuesOf(edited((d) => (d.note = "x")));
    expect(top[0]).toMatchObject({ code: "unknown_field", path: "note" });
  });

  it("모양이 틀리면 shape 로 자리를 짚는다", () => {
    const issues = issuesOf(edited((d) => (item(d).prompt = "")));
    expect(issues[0]).toMatchObject({ code: "shape", path: "items[0].prompt" });
  });
});

describe("2판 검증기 — 표적별 답", () => {
  it("🔴 표적 둘 가운데 하나의 답이 빠지면 그 표적을 짚어 거절한다", () => {
    const issues = issuesOf(edited((d) => delete target(d, 1).answer));
    expect(issues).toEqual([
      expect.objectContaining({
        code: "target_answer_missing",
        path: "items[0].targets[1].answer",
      }),
    ]);
    expect(issues[0]!.message).toContain("2번 표적");
  });

  it("보기에 없는 열쇠를 정답으로 적으면 거절한다", () => {
    const issues = issuesOf(
      edited((d) => (target(d, 0).answer = { alternativeId: "c" })),
    );
    expect(issues).toEqual([
      expect.objectContaining({
        code: "answer_not_in_alternatives",
        path: "items[0].targets[0].answer",
      }),
    ]);
  });

  it("보기 열쇠가 겹치거나 보기 글이 같으면 거절한다", () => {
    expect(
      codesOf(
        edited((d) => {
          target(d, 0).alternatives = [
            { alternativeId: "a", text: "had climbed" },
            { alternativeId: "a", text: "has climbed" },
          ];
        }),
      ),
    ).toContain("duplicate_alternative");
    expect(
      codesOf(
        edited((d) => {
          target(d, 0).alternatives = [
            { alternativeId: "a", text: "had climbed" },
            { alternativeId: "b", text: "had  climbed" },
          ];
        }),
      ),
    ).toContain("duplicate_alternative");
  });
});

describe("2판 검증기 — ID", () => {
  it("표적 ID 가 겹치면 거절한다 — 다른 문항 사이에서도", () => {
    expect(
      codesOf(edited((d) => (target(d, 1).targetId = target(d, 0).targetId))),
    ).toEqual(["duplicate_id"]);
    const across = edited((d) =>
      withSecondItem(d, (second) => {
        (second.targets as Json[])[0]!.targetId = V2_TARGET_TENSE_ID;
      }),
    );
    const issues = issuesOf(across);
    expect(issues).toEqual([
      expect.objectContaining({
        code: "duplicate_id",
        path: "items[1].targets[0].targetId",
      }),
    ]);
  });

  it("문항 ID · 지문 ID 가 겹치면 거절한다", () => {
    expect(
      codesOf(
        edited((d) =>
          withSecondItem(d, (second) => (second.itemId = item(d).itemId)),
        ),
      ),
    ).toEqual(["duplicate_id"]);
    expect(
      codesOf(
        edited((d) => {
          (d.passages as Json[]).push(structuredClone(passage(d)));
        }),
      ),
    ).toEqual(["duplicate_id"]);
  });

  it("한 ID 를 지문과 문항이 같이 쓰면 거절한다 — 종류가 달라도 ID 는 문서에서 하나다", () => {
    const issues = issuesOf(edited((d) => (item(d).itemId = V2_PASSAGE_ID)));
    expect(issues.map((issue) => issue.code)).toEqual(["duplicate_id"]);
    expect(issues[0]!.path).toBe("items[0].itemId");
  });
});

describe("2판 검증기 — 지문 대응 · 개정", () => {
  it("없는 지문을 가리키는 문항은 거절한다 — 그 문항의 자리는 재지 않는다", () => {
    const issues = issuesOf(
      edited(
        (d) => (item(d).passageId = "20000000-0000-4000-8000-0000000000a9"),
      ),
    );
    expect(issues).toEqual([
      expect.objectContaining({
        code: "unknown_passage",
        path: "items[0].passageId",
      }),
    ]);
  });

  it("🔴 지문이 개정됐는데 문항이 옛 개정에 걸려 있으면 거절한다 — 자리가 우연히 맞아도", () => {
    const issues = issuesOf(edited((d) => (passage(d).sourceRevision = 2)));
    expect(issues).toEqual([
      expect.objectContaining({
        code: "stale_source_revision",
        path: "items[0].sourceRevision",
      }),
    ]);
    expect(issues[0]!.message).toContain("재검토");
  });
});

describe("2판 검증기 — 자리(JS UTF-16 [start, end))", () => {
  it("끝이 지문 밖이면 거절한다", () => {
    const issues = issuesOf(
      edited((d) => {
        target(d, 1).span = { start: 205, end: 212, quote: "speed.x" };
      }),
    );
    expect(issues).toEqual([
      expect.objectContaining({
        code: "span_out_of_bounds",
        path: "items[0].targets[1].span",
      }),
    ]);
  });

  it("시작이 끝과 같거나 크면 거절한다", () => {
    for (const span of [
      { start: 125, end: 125, quote: "x" },
      { start: 125, end: 114, quote: "had climbed" },
    ])
      expect(codesOf(edited((d) => (target(d, 0).span = span)))).toEqual([
        "span_out_of_bounds",
      ]);
  });

  it("인용이 그 자리의 글자와 다르면 거절한다 — 한 칸 밀려도 · 대소문자만 달라도", () => {
    for (const span of [
      { start: 115, end: 126, quote: "had climbed" },
      { start: 114, end: 125, quote: "Had climbed" },
    ]) {
      const issues = issuesOf(edited((d) => (target(d, 0).span = span)));
      expect(issues).toEqual([
        expect.objectContaining({
          code: "span_quote_mismatch",
          path: "items[0].targets[0].span",
        }),
      ]);
    }
  });

  it("끝 경계는 열려 있다 — 지문의 마지막 글자까지인 자리는 통과한다", () => {
    const ok = edited((d) => {
      target(d, 1).span = { start: 205, end: 211, quote: "speed." };
      target(d, 1).alternatives = [
        { alternativeId: "a", text: "speed." },
        { alternativeId: "b", text: "speeds." },
      ];
      target(d, 1).answer = { alternativeId: "a" };
    });
    expect(validateEnglishV2Document(ok).ok).toBe(true);
  });

  it("서로게이트 쌍 가운데를 끊는 자리는 거절한다", () => {
    const face = String.fromCodePoint(0x1f600);
    const text = `Plants ${face} grow slowly in the cold season of the year.`;
    const base = (span: Json) =>
      edited((d) => {
        passage(d).text = text;
        item(d).targets = [{ ...target(d, 0), span, evidence: [] }];
      });
    // 쌍 전체(7~9)는 된다
    expect(
      validateEnglishV2Document(base({ start: 7, end: 9, quote: face })).ok,
    ).toBe(true);
    // 높은 쪽만(7~8) · 낮은 쪽부터(8~9)는 안 된다
    for (const [start, end] of [
      [7, 8],
      [8, 9],
    ] as const)
      expect(
        codesOf(base({ start, end, quote: text.slice(start, end) })),
      ).toEqual(["span_splits_surrogate"]);
  });

  it("공백뿐인 표적 자리는 거절한다", () => {
    expect(
      codesOf(
        edited(
          (d) => (target(d, 0).span = { start: 113, end: 114, quote: " " }),
        ),
      ),
    ).toEqual(["span_blank"]);
  });
});

describe("2판 검증기 — 겹침", () => {
  it("한 문항 안에서 표적 자리가 겹치면 거절한다", () => {
    const issues = issuesOf(
      edited((d) => {
        // 둘째 표적을 첫 표적(114~125)과 한 글자 겹치게 — «d higher»(124~132)
        target(d, 1).span = { start: 124, end: 132, quote: "d higher" };
      }),
    );
    expect(issues).toEqual([
      expect.objectContaining({
        code: "target_span_overlap",
        path: "items[0].targets[1].span",
      }),
    ]);
  });

  it("맞닿기만 한 자리(앞의 끝 = 뒤의 시작)는 겹침이 아니다", () => {
    const ok = edited((d) => {
      target(d, 1).span = { start: 125, end: 132, quote: " higher" };
    });
    expect(validateEnglishV2Document(ok).ok).toBe(true);
  });

  it("다른 문항이 같은 자리를 쓰는 것은 된다 — 한 지문을 여러 문항이 다시 쓴다", () => {
    const ok = edited((d) => withSecondItem(d));
    expect(validateEnglishV2Document(ok).ok).toBe(true);
  });

  it("근거 자리는 표적 · 다른 근거와 겹쳐도 된다", () => {
    const ok = edited((d) => {
      target(d, 1).evidence = [
        {
          start: 149,
          end: 211,
          quote:
            "The project taught them that patience matters more than speed.",
        },
        { start: 178, end: 194, quote: "patience matters" },
      ];
    });
    expect(validateEnglishV2Document(ok).ok).toBe(true);
  });

  it("근거 자리도 경계와 인용을 본다", () => {
    const issues = issuesOf(
      edited((d) => {
        target(d, 0).evidence = [{ start: 47, end: 148, quote: "Three" }];
      }),
    );
    expect(issues).toEqual([
      expect.objectContaining({
        code: "span_quote_mismatch",
        path: "items[0].targets[0].evidence[0]",
      }),
    ]);
  });
});

describe("2판 검증기 — 여러 결함", () => {
  it("결함을 다 모아서 돌려준다(첫 것에서 멈추지 않는다)", () => {
    const codes = codesOf(
      edited((d) => {
        target(d, 0).answer = { alternativeId: "z" };
        target(d, 1).span = { start: 187, end: 194, quote: "matter!" };
      }),
    );
    expect(codes).toEqual([
      "answer_not_in_alternatives",
      "span_quote_mismatch",
    ]);
  });

  it("넣은 값을 고치지 않는다", () => {
    const document = Object.freeze(englishV2TwoTargetDocument());
    const before = JSON.stringify(document);
    validateEnglishV2Document(document);
    expect(JSON.stringify(document)).toBe(before);
  });
});

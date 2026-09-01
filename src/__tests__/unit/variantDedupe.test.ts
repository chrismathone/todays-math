/**
 * **중복 제거는 «변형» 단위다** — 단답형과 객관식이 같이 버려지거나 같이 남는다.
 *
 * 이 시험이 지키는 결함(2026-09-01 실측):
 *   적재기의 중복 열쇠가 **파생 뒤의 글자**를 봤다. 객관식 본문에는 무작위
 *   오답이 붙어 있어 다른 문항류의 같은 문항과 **안 겹친다.** 그래서 단답형만
 *   「중복」으로 버려지고 객관식이 살아남아, 그 가드가 막으려던 바로 그 모양
 *   (같은 문항이 다른 번호를 받음)이 됐다 — **초등 문항류 35개 · 짝 없는
 *   객관식 41행.**
 *
 * ⚠️ 이 시험을 무디게 만드는 길은 하나다 — 「행마다 따로 판정」으로 되돌리는 것.
 *    그러면 ㉢ 이 빨개진다(다른 것들은 그대로 초록이라 ㉢ 이 유일한 파수꾼이다).
 */
import { describe, expect, it } from "vitest";

import { dedupeByVariant } from "@/lib/engine/variants";

type Row = {
  variantKey: string;
  questionType: string;
  origin: string;
  content: string;
};

const 단답 = (
  variantKey: string,
  content: string,
  origin = variantKey,
): Row => ({
  variantKey,
  questionType: "단답형",
  origin,
  content,
});
const 객관 = (
  variantKey: string,
  content: string,
  origin = variantKey,
): Row => ({
  variantKey,
  questionType: "객관식",
  origin,
  content,
});

const keyOf = (r: Row) => r.content;

describe("변형 단위 중복 제거", () => {
  it("㉠ 발문이 다르면 둘 다 남는다", () => {
    const rows = [
      단답("v1", "$1+1$"),
      객관("v1", "$1+1$ ① $2$ ② $3$"),
      단답("v2", "$2+2$"),
      객관("v2", "$2+2$ ① $4$ ② $5$"),
    ];
    const got = dedupeByVariant(rows, keyOf);
    expect(got.kept).toHaveLength(4);
    expect(got.dropped).toHaveLength(0);
  });

  it("㉡ 발문이 같으면 그 변형이 통째로 빠진다", () => {
    const rows = [
      단답("v1", "$1+1$", "문형 01"),
      객관("v1", "$1+1$ ① $2$"),
      단답("v2", "$1+1$", "문형 07"),
      객관("v2", "$1+1$ ① $9$"),
    ];
    const got = dedupeByVariant(rows, keyOf);
    expect(got.kept.map((r) => r.variantKey)).toEqual(["v1", "v1"]);
    expect(got.dropped).toHaveLength(1);
    expect(got.dropped[0]!.stem.origin).toBe("문형 07");
    expect(got.dropped[0]!.against).toBe("문형 01");
  });

  it("🔴 ㉢ **객관식은 오답이 달라 안 겹치는데도** 그 짝과 같이 빠진다", () => {
    // 두 문항류가 같은 단답형을 냈다. 객관식 본문은 오답이 무작위라 서로 다르다.
    // 행마다 따로 판정하면 v2 의 객관식만 살아남는다 — 그게 실측 41행이었다.
    const rows = [
      단답("v1", "$8000000$ cm³는 몇 m³입니까?", "문형 01"),
      객관("v1", "$8000000$ cm³는 몇 m³입니까? ① $6$ ② $16$ ③ $8$", "문형 01"),
      단답("v2", "$8000000$ cm³는 몇 m³입니까?", "문형 06"),
      객관(
        "v2",
        "$8000000$ cm³는 몇 m³입니까? ① $8$ ② $80$ ③ $800$",
        "문형 06",
      ),
    ];
    const got = dedupeByVariant(rows, keyOf);
    expect(got.kept.map((r) => r.questionType)).toEqual(["단답형", "객관식"]);
    expect(got.kept.every((r) => r.variantKey === "v1")).toBe(true);
    // 짝 없는 객관식이 하나도 없어야 한다 — 이 단정이 결함 그 자체를 문다.
    const 단답변형 = new Set(
      got.kept
        .filter((r) => r.questionType === "단답형")
        .map((r) => r.variantKey),
    );
    const 짝없는객관 = got.kept.filter(
      (r) => r.questionType === "객관식" && !단답변형.has(r.variantKey),
    );
    expect(짝없는객관).toEqual([]);
  });

  it("㉣ 단답형이 없는 변형(이미 객관식인 발문)은 자기 글자로 판정한다", () => {
    const rows = [
      객관("v1", "다음 중 옳은 것은? ① 가 ② 나"),
      객관("v2", "다음 중 옳은 것은? ① 가 ② 나"),
      객관("v3", "다음 중 틀린 것은? ① 가 ② 나"),
    ];
    const got = dedupeByVariant(rows, keyOf);
    expect(got.kept.map((r) => r.variantKey)).toEqual(["v1", "v3"]);
  });

  it("㉤ 바깥(DB)에 물을 때도 변형 단위다", () => {
    const inDb = new Map([["$1+1$", "E30101-A01-001"]]);
    const rows = [
      단답("v1", "$1+1$"),
      객관("v1", "$1+1$ ① $2$"),
      단답("v2", "$3+3$"),
      객관("v2", "$3+3$ ① $6$"),
    ];
    const got = dedupeByVariant(rows, keyOf, (k) => inDb.get(k));
    expect(got.kept.map((r) => r.variantKey)).toEqual(["v2", "v2"]);
    expect(got.dropped[0]!.against).toBe("E30101-A01-001");
  });

  it("㉥ 분모가 맞는다 — 남은 행 + 버린 행 == 넣은 행", () => {
    const rows = [
      단답("v1", "$1+1$"),
      객관("v1", "$1+1$ ①"),
      단답("v2", "$1+1$"),
      객관("v2", "$1+1$ ②"),
      단답("v3", "$5+5$"),
    ];
    const got = dedupeByVariant(rows, keyOf);
    const 버린행 = rows.length - got.kept.length;
    expect(got.kept.length + 버린행).toBe(rows.length);
    // 버린 «변형» 은 1개인데 «행» 은 2개다 — 이 둘을 헷갈리면 분모 검사가 거짓말한다.
    expect(got.dropped).toHaveLength(1);
    expect(버린행).toBe(2);
  });
});

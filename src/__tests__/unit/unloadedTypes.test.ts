/**
 * **「엔진에 있는데 지면에 안 나간다」를 세는 자를 잠근다** (2026-08-31).
 *
 * 이 결함은 **스스로 신고하지 않는다** — 유형을 엔진에 더하고 시험까지 초록으로
 * 만들어도, 적재를 안 하면 시험지에 한 줄도 안 나간다. tsc·vitest·판정기가 전부
 * 초록이다. 이 저장소가 되풀이해 데인 자리인데(2026-08-27 · 08-30) 세는 자가 없었다.
 * 2026-08-31 중3 조사가 실물로 짚었다 — **22유형 + 결합형 6 = 28자리**.
 *
 * ## 🔴 픽스처로 댄다 — 살아 있는 엔진만 보면 «도장»이다
 *
 * 지금 상태에서 `unloaded()` 는 늘 28을 낸다. 그 수만 보면 **세는 능력을 잃어도
 * 답이 같다.** 그래서 지어낸 표로 두 쪽(양성·음성)을 직접 댄다.
 *
 * ## 이 시험이 지키는 것
 *
 * ```
 * ㉠ 적재된 유형은 «안 나감»으로 안 잡힌다        ← 뒤집히면 전량이 거짓 경보
 * ㉡ 안 적재된 유형은 반드시 잡힌다               ← 뒤집히면 구조적으로 0
 * ㉢ 🔴 **결합형을 따로 센다**                    ← registeredTypes 밖이라 안 세면 0
 * ㉣ externalId 를 «조각»으로 편다                ← 통짜로만 보면 못 찾는다
 * ```
 */
import { describe, expect, it } from "vitest";

import {
  judgeKeyProbe,
  loadedFragments,
  unloaded,
  type ComboRow,
  type JudgeRow,
  type TypeRow,
} from "../../../scripts/qa/checkUnloadedTypes";

const T = (key: string): TypeRow => ({
  key,
  grade: "중1",
  unitSection: "1-1 아무데",
});
const C = (id: string): ComboRow => ({
  id,
  anchorGrade: "중2",
  anchorSection: "2-2 아무데",
});

describe("[적재] 엔진에 있는데 지면에 안 나가는 유형", () => {
  it("㉠ 적재된 유형은 «안 나감»으로 안 잡힌다", () => {
    const frags = loadedFragments(["중1|1-1|일차식|03"]);
    expect(unloaded(frags, [T("1-1|일차식|03")], [], [])).toEqual([]);
  });

  it("㉡ 안 적재된 유형은 반드시 잡힌다", () => {
    const frags = loadedFragments(["중1|1-1|일차식|03"]);
    const out = unloaded(frags, [T("1-1|일차식|99")], [], []);
    expect(out.map((e) => e.key)).toEqual(["1-1|일차식|99"]);
  });

  it("㉢ 🔴 **결합형을 따로 센다** — registeredTypes 밖이라 안 세면 구조적으로 0이다", () => {
    const frags = loadedFragments(["중1|1-1|일차식|03"]);
    const out = unloaded(frags, [], [C("중2|가::중2|나")], []);
    expect(
      out.map((e) => e.key),
      "결합형이 빠졌다 — 원장님이 승인하신 문형이 엔진에만 살게 된다",
    ).toEqual(["중2|가::중2|나"]);
    expect(out[0]!.where).toContain("결합형");
  });

  it("㉢' 적재된 결합형은 안 잡힌다", () => {
    const frags = loadedFragments(["중2|가::중2|나"]);
    expect(unloaded(frags, [], [C("중2|가::중2|나")], [])).toEqual([]);
  });

  it("㉣ externalId 를 «조각»으로 편다 — 통짜로만 보면 못 찾는다", () => {
    const frags = loadedFragments(["중1|1-1 어떤소단원|일차식|03"]);
    expect(frags.has("일차식")).toBe(true);
    expect(frags.has("중1|1-1 어떤소단원|일차식|03")).toBe(true);
    // 조각을 안 펴면 아래가 «안 나감»으로 잡혀 거짓 경보가 된다
    expect(unloaded(frags, [T("일차식")], [], [])).toEqual([]);
  });

  it("분모 — 적재본이 비면 등록된 것이 전부 «안 나감»이다 (그래서 스크립트가 행 수를 먼저 본다)", () => {
    const out = unloaded(
      loadedFragments([]),
      [T("가"), T("나")],
      [C("다::라")],
      [],
    );
    expect(out).toHaveLength(3);
  });

  it("㉤ 🔴 **판정형을 따로 센다** — 정확한 키로(비슷한 키는 «나갔다»가 아니다)", () => {
    const J = (key: string): JudgeRow => ({
      key,
      grade: "중1",
      unitSection: "유리수의 덧셈과 뺄셈",
    });
    const id = (key: string) => `engine-mid-judge:${key}|r1|s1|v0|객관식`;
    // 실린 것은 안 잡힌다
    expect(
      unloaded(
        loadedFragments([id("중1|가|calc-add2")]),
        [],
        [],
        [J("중1|가|calc-add2")],
      ),
    ).toEqual([]);
    // 비슷한 키(…calc-add2x)만 실렸으면 …calc-add2 는 «안 나감»이다 — 포함으로 대면 여기가 거짓 초록
    const out = unloaded(
      loadedFragments([id("중1|가|calc-add2x")]),
      [],
      [],
      [J("중1|가|calc-add2")],
    );
    expect(out.map((e) => e.key)).toEqual(["중1|가|calc-add2"]);
    expect(out[0]!.where).toContain("판정형");
  });

  it("㉤' 판정형 열쇠 읽기의 자기 점검이 지금 초록이다 — 짓는 함수와 읽는 함수가 짝이다", () => {
    expect(judgeKeyProbe()).toBeNull();
  });

  it("여러 유형에서 «적재된 것만» 골라낸다", () => {
    const frags = loadedFragments(["중1|X|01", "중1|X|02"]);
    const out = unloaded(
      frags,
      [T("X|01"), T("X|02"), T("X|03"), T("X|04")],
      [],
      [],
    );
    expect(out.map((e) => e.key)).toEqual(["X|03", "X|04"]);
  });
});

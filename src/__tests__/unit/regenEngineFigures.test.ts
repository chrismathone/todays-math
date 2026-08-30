/**
 * **적재본 그림을 다시 그릴 때 되짚는 열쇠** — `externalId` 파서와 발문 대조.
 *
 * 🔴 이 둘이 **적재기와 갈리면 조용히 아무것도 안 고친다.**
 *    2026-08-30 실측: 적재기가 `externalId` 뒤에 `|{문항유형}` 을 붙이고 초등을
 *    갈래가 아니라 **문형**(`f{id}`)으로 내게 바꿨는데, 되짚는 쪽 정규식이 `$` 로
 *    끝을 못 박고 있어 **5,005건 중 4,640건이 「되짚기 실패」**였다. 그 수를 찍게
 *    해 둔 덕에 드러났다 — 안 찍었으면 「351건 고쳤다」로 끝났을 것이다.
 *
 * 그래서 이 시험은 **적재기가 실제로 쓰는 문자열 모양**을 못 박는다. 적재기가 형식을
 * 또 바꾸면 여기가 빨개진다.
 *
 * ⚠️ 발문 대조도 **적재기가 덧붙인 것을 빼고** 봐야 한다 — 한 문항이 단답형·객관식
 *    두 벌로 들어가고 객관식 본문에는 보기 ①~⑤ 가 뒤에 붙는다. 그냥 견주면 객관식이
 *    통째로 「발문이 달라졌다」로 빠져 그 그림은 영영 안 고쳐진다.
 */
import { describe, expect, it } from "vitest";

import { respec, sameStem } from "../../../scripts/qa/regen-engine-figures";

/**
 * **적재본에서 그대로 가져온** `externalId` 다 — 지어낸 것이 아니다.
 * (2026-08-30, 공유 DB 를 훑어 `problemCode` 오름차순 첫 행.)
 * 적재기가 형식을 바꾸면 이 문자열이 낡고, 그때 아래 시험이 빨개진다.
 */
const REAL = {
  mid: "engine-mid:1-1|정비례와 반비례|05|s20260827|v0|단답형",
  elem:
    "engine-elem:초3|1-1 덧셈과 뺄셈|" +
    "1-1-1 받아올림이 없는, 한 번 있는 (세 자리 수)+(세 자리 수)|f05|단답형|s20260827",
} as const;

describe("적재본 그림 되그리기 — externalId 되짚기", () => {
  it("🔴 중등 — 지금 적재 형식(`|{문항유형}` 이 붙는다)을 되짚는다", () => {
    // 여기가 null 이면 **아무것도 안 고치면서 조용히 끝난다** — 실측 4,640건이 그랬다.
    const back = respec(REAL.mid);
    expect(
      back,
      "중등 externalId 를 못 되짚는다 — 적재기와 형식이 갈렸다",
    ).not.toBeNull();
    expect(back!.content.length).toBeGreaterThan(0);
  });

  it("🔴 초등 — **문형**(`f{id}`) 판을 되짚는다 (갈래 판이 아니다)", () => {
    const back = respec(REAL.elem);
    expect(
      back,
      "초등 externalId 를 못 되짚는다 — 문형 판을 모른다",
    ).not.toBeNull();
    expect(back!.content.length).toBeGreaterThan(0);
  });

  it("옛 형식(문항유형이 없던 시절)도 그대로 받는다", () => {
    // 그때 적재된 행이 아직 DB 에 있다 — 새 형식만 받으면 그 행들이 통째로 빠진다.
    expect(
      respec("engine-mid:1-1|정비례와 반비례|05|s20260827|v0"),
    ).not.toBeNull();
  });

  it("음성 대조 — 모르는 접두사는 null 이다", () => {
    expect(respec("engine-what:foo|s1|v0")).toBeNull();
    expect(respec("rpm:12345")).toBeNull();
  });
});

describe("적재본 그림 되그리기 — 발문 대조", () => {
  it("같은 발문이면 참", () => {
    expect(
      sameStem(
        "삼각형 $ABC$의 넓이를 구하시오.",
        "삼각형 $ABC$의 넓이를 구하시오.",
      ),
    ).toBe(true);
  });

  it("공백만 다른 것은 같은 발문으로 본다", () => {
    expect(sameStem("넓이를  구하시오.", "넓이를 구하시오.")).toBe(true);
  });

  it("객관식 — 적재기가 **붙인 보기**는 차이가 아니다", () => {
    const engine = "직각삼각형 $ABC$의 넓이를 구하시오.";
    const loaded = `${engine} ① $25\\sqrt{3}$ ② $50\\sqrt{3}$ ③ $75$ ④ $100$ ⑤ $125$`;
    expect(sameStem(engine, loaded)).toBe(true);
  });

  it("🔴 음성 대조 — **진짜 발문 변경**은 막는다", () => {
    // 꼬리가 보기가 아니면 그냥 다른 발문이다. 여기가 새면 그림과 발문이 갈린다.
    expect(
      sameStem(
        "넓이를 구하시오.",
        "넓이를 구하시오. 단, 원주율은 3.14 로 한다.",
      ),
    ).toBe(false);
    expect(sameStem("넓이를 구하시오.", "둘레를 구하시오.")).toBe(false);
  });

  it("🔴 음성 대조 — 적재본이 **짧아진** 경우도 막는다", () => {
    // `startsWith` 한 방향만 보면 이 자리가 샌다.
    expect(
      sameStem("넓이를 구하시오. 단, 원주율은 3.14.", "넓이를 구하시오."),
    ).toBe(false);
  });
});

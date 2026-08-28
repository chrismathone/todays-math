/**
 * **무엇을 출제에서 빼는가** — `lock-legacy-elem-format.ts` 의 모집단 술어.
 *
 * 🔴 이 술어가 넓어지면 **멀쩡한 문항이 조용히 출제에서 빠진다.** 오류도 경고도
 *    안 나고, 시험지가 그냥 얇아진다. 2026-08-18 에 「반증하려고 넓힌 모집단을
 *    처리 대상으로 물려받아」 43건이 433건이 된 적이 있고, 그때 잡아 준 것은
 *    「무엇을 잃는지 세라」 하나뿐이었다.
 *
 * 그래서 시험의 대부분이 **「이건 빼면 안 된다」** 쪽이다.
 */
import { describe, expect, it } from "vitest";

import { isLegacyElemFormat } from "../../../scripts/qa/lock-legacy-elem-format";

/** 실제 DB 값 그대로 (2026-08-28 실측). */
const OLD =
  "engine-elem:초5|1-6 다각형의 둘레와 넓이|1-6-2 1cm², 직사각형과 정사각형의 넓이|기본|s20260826";
const NEW =
  "engine-elem:초3|1-1 덧셈과 뺄셈|1-1-1 세 자리 수의 덧셈|f05|객관식|s20260827";

describe("[옛 형식 잠금] isLegacyElemFormat", () => {
  it("옛 형식(문형 표지 `|f` 가 없다)을 잡는다", () => {
    expect(isLegacyElemFormat(OLD)).toBe(true);
  });

  it("🔴 **새 형식은 안 건드린다** — 11,758건이 여기 있다", () => {
    expect(isLegacyElemFormat(NEW)).toBe(false);
  });

  it("🔴 **중등은 안 건드린다** — 형식이 달라도 이 작업 밖이다", () => {
    expect(
      isLegacyElemFormat(
        "engine-mid:중1 일차방정식의 활용(수)|s20260827|v0|객관식",
      ),
    ).toBe(false);
  });

  it("🔴 **엔진이 낸 것이 아니면 안 건드린다** — 기출·RPM 이관본", () => {
    expect(isLegacyElemFormat("rpm-2024-3-1-p42-q7")).toBe(false);
    expect(isLegacyElemFormat("exam-강북고-2928-12")).toBe(false);
    expect(isLegacyElemFormat(null)).toBe(false);
    expect(isLegacyElemFormat("")).toBe(false);
  });

  it("🔴 **`engine-elem` 처럼 «시작만 같은» 남의 접두사에 안 걸린다**", () => {
    // 접두사처럼 생긴 것을 접두사로 믿지 마라 — 2026-08-20 에 `public/figures` 가
    // `public/figures-svg` 를 덮을 줄 알았다가 716건이 거짓 경보였다.
    // 여기서는 **콜론**이 지켜 준다: `engine-elementary-v2:` 는 `engine-elem:` 로
    // 시작하지 않는다(11번째 글자가 `e` 대 `:`). 콜론을 빼면 이 시험이 빨개진다.
    expect(isLegacyElemFormat("engine-elementary-v2:초5|1-1|기본|s1")).toBe(
      false,
    );
  });

  it("본문에 `f` 가 들어 있어도 **표지 `|f`** 만 본다", () => {
    // 단원 이름에 f 가 섞여도 표지가 없으면 옛 형식이다.
    expect(
      isLegacyElemFormat(
        "engine-elem:초6|2-4 비례식|2-4-3 비례식 alpha|기본|s1",
      ),
    ).toBe(true);
  });
});

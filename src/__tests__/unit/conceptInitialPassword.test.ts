/**
 * 학생 초기 비밀번호 — **숫자 4자리** (D-125 ⑶, 원장님 확정 2026-09-15).
 *
 * 원장님이 시안의 «가장 쉽지만 가장 약하다»를 보시고 고르셨다 — 영상만 보는 계정이라 잃는
 * 것이 작다(D-123 ⑵). 약한 곳은 리드가 메운다: **한 숫자 반복(0000·1111…)과 오름/내림 연속
 * (0123·1234·4321·9876…)은 뺀다**(D-125 ⑶ — 리드 제안, 원장님이 다르게 정하시면 바꾼다).
 * 연속 5회 실패 잠금은 로그인 쪽 몫이라 여기 없다.
 *
 * «쉬운 번호인가»는 함수로 따로 내보낸다 — 학생이 첫 로그인에서 새 번호를 정할 때도 **같은
 * 함수**를 써야 발급과 변경이 갈리지 않는다.
 *
 * 수맥 원본(`learner-account.ts`)은 16자 영문·숫자에서 헷갈리는 글자(0/O · 1/l/I)를 뺐다.
 * 숫자만 쓰면 그 문제가 없어 글자판은 옮기지 않았다. 남은 수맥 규칙: 암호학적 난수 · 한 번만
 * 보여 주고 저장하지 않는다(서버에는 해시만 — D-124 ⑷).
 */
import { describe, expect, it } from "vitest";

import {
  generateInitialPassword,
  INITIAL_PASSWORD_LENGTH,
  isEasyPin,
  isPinFormat,
} from "@/lib/concept/initialPassword";

const ALL_PINS = Array.from({ length: 10_000 }, (_, n) =>
  String(n).padStart(4, "0"),
);

/** 주입용 난수원 — 적은 순서대로 돌려준다. 받은 상한도 적어 둔다. */
function queue(values: number[]) {
  const seen: number[] = [];
  const draw = (max: number) => {
    seen.push(max);
    const v = values.shift();
    if (v === undefined) throw new Error("준비한 난수를 다 썼다");
    return v;
  };
  return { draw, seen };
}

describe("쉬운 번호 판정", () => {
  it("🔴 0000~9999 중 쉬운 번호는 정확히 24개 — 한 숫자 반복 10 · 오름 7 · 내림 7", () => {
    const easy = ALL_PINS.filter(isEasyPin);
    expect(easy).toEqual(
      [
        ...["0000", "1111", "2222", "3333", "4444"],
        ...["5555", "6666", "7777", "8888", "9999"],
        ...["0123", "1234", "2345", "3456", "4567", "5678", "6789"],
        ...["3210", "4321", "5432", "6543", "7654", "8765", "9876"],
      ].sort(),
    );
  });

  it("경계 — 0 으로 시작하는 오름(0123)·9 로 시작하는 내림(9876)은 쉽고, 한 자리만 다른 1112 는 아니다", () => {
    expect(isEasyPin("0123")).toBe(true);
    expect(isEasyPin("9876")).toBe(true);
    expect(isEasyPin("3210")).toBe(true);
    expect(isEasyPin("1112")).toBe(false);
    expect(isEasyPin("1235")).toBe(false);
    expect(isEasyPin("2468")).toBe(false);
  });

  it("넘어가는 연속(7890·8901·2109)은 규칙 밖이다 — 0 다음에 1 이 오지 않으므로 «연속»이 아니다", () => {
    // D-125 ⑶ 이 적은 것은 «오름/내림 연속» 이다. 키보드 윗줄(…7890)은 넣지 않았다 —
    // 넣을지는 보고서 «리드가 정할 것». 넣게 되면 이 사례를 바꾼다.
    for (const pin of ["7890", "8901", "9012", "2109", "1098"]) {
      expect(isEasyPin(pin), pin).toBe(false);
    }
  });

  it("형식 — 네 자리 ASCII 숫자만", () => {
    expect(isPinFormat("0123")).toBe(true);
    for (const bad of ["123", "12345", "12a4", " 1234", "1234 ", "", "١٢٣٤"]) {
      expect(isPinFormat(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});

describe("초기 비밀번호 만들기", () => {
  it("🔴 1만 번 뽑아 쉬운 번호 0건 · 전부 네 자리 숫자", () => {
    expect(INITIAL_PASSWORD_LENGTH).toBe(4);
    let easy = 0;
    for (let i = 0; i < 10_000; i += 1) {
      const pin = generateInitialPassword();
      expect(isPinFormat(pin), pin).toBe(true);
      if (isEasyPin(pin)) easy += 1;
    }
    expect(easy).toBe(0);
  });

  it("0000~9999 전체에서 뽑는다 — 상한 10000, 앞자리 0 을 지킨다", () => {
    const q = queue([42]);
    expect(generateInitialPassword({ randomInt: q.draw })).toBe("0042");
    expect(q.seen).toEqual([10_000]);
  });

  it("🔴 쉬운 번호가 나오면 버리고 다시 뽑는다", () => {
    const q = queue([1111, 1234, 4321, 123, 5809]);
    expect(generateInitialPassword({ randomInt: q.draw })).toBe("5809");
    expect(q.seen).toHaveLength(5);
  });

  it("난수원이 쉬운 번호만 주면 끝없이 돌지 않고 멈춘다", () => {
    expect(() => generateInitialPassword({ randomInt: () => 1111 })).toThrow();
  });
});

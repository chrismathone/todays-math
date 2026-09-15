/**
 * 학생 초기 비밀번호 — **숫자 4자리** (D-125 ⑶, 원장님 확정 2026-09-15).
 *
 * 원장님이 시안의 «가장 쉽지만 가장 약하다»를 보시고 고르셨다 — 영상만 보는 계정이라 잃는
 * 것이 작다(D-123 ⑵). 약한 곳은 리드가 메운다(D-125 ⑶ — 리드 제안, 원장님이 다르게 정하시면
 * 바꾼다): **한 숫자 반복(0000·1111…)과 오름/내림 연속(0123·1234·4321·9876…)은 뺀다.**
 * 연속 5회 실패 잠금·아이디를 흘리지 않는 실패 문구는 로그인 쪽 몫이라 여기 없다.
 *
 * «쉬운 번호인가»(`isEasyPin`)를 따로 내보낸다 — 학생이 첫 로그인에서 새 번호를 정할 때도
 * **이 함수**를 불러야 발급과 변경이 갈리지 않는다. 형식은 `isPinFormat` 이 본다(둘 다 부른다).
 *
 * ## 수맥에서 온 것 · 바뀐 것
 *
 * 수맥 `learner-account.ts` 의 `generateInitialPassword` 는 16자 영문·숫자에서 헷갈리는 글자
 * (0/O · 1/l/I)를 빼고 끝에 `7!` 을 붙였다(Supabase 기본 정책 대비). 숫자 4자리가 되며 둘 다
 * 뜻을 잃었다 — 숫자만 쓰면 헷갈릴 글자가 없고, 우리 정책은 Supabase 의 것이 아니다. 남은 수맥
 * 규칙은 둘이다: **암호학적 난수**, **한 번만 보여 주고 저장하지 않는다**(서버에는 해시만 — D-124 ⑷).
 *
 * ⚠️ 이 번호는 원장·검수 계정 규칙(`auth.contract.ts` — 8~72자)을 통과하지 **않는다.** 학생
 *    로그인은 절대 규칙 7 의 유일한 예외(D-124 ⑶)라 학생 계정 트랙이 따로 계약을 둔다.
 *    `auth.contract.ts` 는 이 워크트리에서 건드리지 않았다.
 */
import { randomInt as nodeRandomInt } from "node:crypto";

export const INITIAL_PASSWORD_LENGTH = 4;

/** 0000~9999 — 뽑는 상한(미포함) */
const PIN_SPACE = 10 ** INITIAL_PASSWORD_LENGTH;
const PIN_FORMAT = /^[0-9]{4}$/;
/** 쉬운 번호는 24/10000 이라 정상 난수로는 거의 첫 번에 끝난다 — 끝없이 돌지 않게만 막는다 */
const MAX_DRAWS = 64;

/** 네 자리 ASCII 숫자인가 */
export function isPinFormat(value: string): boolean {
  return PIN_FORMAT.test(value);
}

/**
 * 쉬운 번호인가 — 모든 자리가 같거나(0000), 한 자리씩 1 씩 오르거나(0123), 1 씩 내린다(9876).
 * 넘어가는 연속(7890·9012)은 넣지 않았다 — «연속»의 뜻 그대로다(보고서 «리드가 정할 것»).
 * 숫자가 아닌 글은 false 다 — 형식은 `isPinFormat` 이 본다.
 */
export function isEasyPin(pin: string): boolean {
  if (!/^[0-9]{2,}$/.test(pin)) return false;
  const digits = [...pin].map(Number);
  const steps = digits.slice(1).map((d, i) => d - digits[i]!);
  const repeated = steps.every((s) => s === 0);
  const ascending = steps.every((s) => s === 1);
  const descending = steps.every((s) => s === -1);
  return repeated || ascending || descending;
}

/**
 * 초기 비밀번호 — 0000~9999 에서 암호학적 난수(`crypto.randomInt`, 상한 안에서 고르다)로 고르고,
 * 쉬운 번호면 버리고 다시 뽑는다. 버리는 표본 추출이라 남은 9,976개가 고르게 나온다.
 */
export function generateInitialPassword(
  options: { randomInt?: (maxExclusive: number) => number } = {},
): string {
  const draw = options.randomInt ?? ((max: number) => nodeRandomInt(max));
  for (let i = 0; i < MAX_DRAWS; i += 1) {
    const pin = String(draw(PIN_SPACE)).padStart(INITIAL_PASSWORD_LENGTH, "0");
    if (!isEasyPin(pin)) return pin;
  }
  throw new Error("난수원이 쉬운 번호만 준다 — 초기 비밀번호를 만들 수 없다.");
}

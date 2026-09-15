/**
 * 숫자 4자리 비밀번호 **판정** — 순수 함수 둘 (D-125 ⑶, 원장님 확정 2026-09-15).
 *
 * `initialPassword.ts` 에서 **떼어 냈다**(2026-09-15 student-auth). 규칙은 한 글자도 안 바꿨고,
 * `initialPassword.ts` 가 그대로 다시 내보내므로 부르던 곳은 그대로다.
 *
 * 왜 떼었나: 이 둘은 학생 계정 계약(`src/contracts/studentAccount.contract.ts`)이 부른다(브리프 §7 —
 * «다시 적지 않는다»). 그 계약은 **학생 로그인 화면의 폼 검증**에서도 읽힐 자리인데,
 * `initialPassword.ts` 는 머리에서 `node:crypto` 를 import 한다. 계약이 그 파일을 부르면 화면 번들이
 * `node:crypto` 를 끌고 가다 깨진다 — 지금은 화면이 없어 `npm run build` 도 못 잡는다.
 * `studentAccountContract.test.ts` 가 계약의 import 를 따라가 `node:` 모듈이 없는지 잠근다.
 *
 * 발급(`generateInitialPassword`)과 학생의 첫 로그인 변경이 **같은 함수**를 불러야 갈리지 않는다.
 */

const PIN_FORMAT = /^[0-9]{4}$/;

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

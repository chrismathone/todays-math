/**
 * 상자 저장 줄 — 화면보다 오래 산다(05 §8.21). 앱 안에서 화면을 옮겨도 남은 상자는 저장되고,
 * 같은 학생이 탐험 화면을 다시 열면 그 저장이 끝난 뒤 기록을 읽는다.
 *
 * 🔴 **학생마다 따로다**(2026-09-28 리드 3차 검토). 로그아웃 · 로그인은 소프트 이동이라 이 모듈이
 *    산다 — 앞 학생의 줄이 새 학생의 쿠키로 나가 **새 학생의 상자를 열면** 안 된다. 그래서
 *    ① 줄과 재시도 요청 번호는 학생 id 에 묶고 ② 로그아웃 · 로그인에서 `forgetChestSaves()` 로
 *    앞 줄의 남은 상자를 멈추며 ③ 요청마다 학생 id 를 실어 라우트가 다른 학생이면 거절한다.
 */
type Line = { studentId: string; done: Promise<void> };

let line: Line | null = null;
let generation = 0;
const retryIds = new Map<string, string>();
const retryKey = (studentId: string, chestId: string) =>
  `${studentId}\u0000${chestId}`;

/** 이 줄이 끝날 때까지 «남은 저장»으로 둔다. */
export function keepSaving(studentId: string, done: Promise<void>) {
  const current: Line = { studentId, done };
  line = current;
  void done.finally(() => {
    if (line === current) line = null;
  });
}

/** 그 학생의 남은 저장 — 다른 학생의 줄은 기다리지 않는다. */
export function savingFor(studentId: string): Promise<void> | null {
  return line?.studentId === studentId ? line.done : null;
}

/** 줄이 시작된 세대 — 로그아웃 · 로그인이 세대를 넘기면 그 줄은 다음 상자부터 멈춘다. */
export function saveGeneration() {
  return generation;
}

export function retryIdFor(studentId: string, chestId: string) {
  return retryIds.get(retryKey(studentId, chestId));
}
export function rememberRetryId(
  studentId: string,
  chestId: string,
  requestId: string,
) {
  retryIds.set(retryKey(studentId, chestId), requestId);
}
export function forgetRetryId(studentId: string, chestId: string) {
  retryIds.delete(retryKey(studentId, chestId));
}

/** 로그아웃 · 로그인 — 앞 학생의 줄은 멈추고(이미 보낸 한 요청은 그 학생 것으로 끝난다), 재시도 번호는 버린다. */
export function forgetChestSaves() {
  generation += 1;
  line = null;
  retryIds.clear();
}

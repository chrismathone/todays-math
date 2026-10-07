/**
 * 유료 AI 호출의 **사용자별 동시 실행 한도**.
 *
 * 작업실 AI(`studio-ai/handler.ts`)와 사진 읽기(`api/english/materials/[id]/read`)는 «한 사람 둘까지»를
 * 저마다 갖고 있었는데, 문항 생성 · 변형 · 영어 생성에는 없었다 — 승인된 계정 하나(또는 훔친 세션 하나)가
 * 병렬로 얼마든지 부를 수 있었다(2026-10-07 검수). 그 셋이 이 함수를 쓴다.
 *
 * ⚠️ **인스턴스 안에서만 센다.** 서버리스 인스턴스가 여럿이면 그만큼 는다(위 두 곳도 같다).
 *    지점 · 하루 단위의 사용량 한도는 저장할 표가 있어야 한다 — 이것은 «한 사람이 한꺼번에 쏟는 것»만 막는다.
 * ⚠️ 영어 · 수학 양쪽 라우트가 부르므로 **아무것도 import 하지 않는다**(영어 울타리 — `englishFence.test.ts`).
 */

/** 한 사람이 한 갈래에서 동시에 띄울 수 있는 작업 수 — 작업실 AI · 사진 읽기와 같은 값. */
export const AI_ADMISSION_LIMIT = 2;

/** 화면에 그대로 나가는 문구 — 작업실 AI · 사진 읽기가 이미 쓰는 글자와 같다. */
export const AI_BUSY_MESSAGE = "진행 중인 AI 작업이 끝나면 다시 시도해 주세요.";

const active = new Map<string, number>();

/**
 * 자리를 하나 잡는다. 잡았으면 **돌려주는 함수**를, 한도에 걸렸으면 `null` 을 준다.
 * 부른 쪽은 `finally` 에서 반드시 돌려준다 — 안 돌려주면 그 사람은 인스턴스가 살아 있는 동안 못 들어온다.
 */
export function admitAiWork(
  scope: string,
  userId: string,
): (() => void) | null {
  const key = `${scope}:${userId}`;
  const count = active.get(key) ?? 0;
  if (count >= AI_ADMISSION_LIMIT) return null;
  active.set(key, count + 1);
  let released = false;
  return () => {
    if (released) return;
    released = true;
    const next = (active.get(key) ?? 1) - 1;
    if (next <= 0) active.delete(key);
    else active.set(key, next);
  };
}

/** 시험 전용 — 파일 사이에 남은 자리를 비운다. */
export function resetAiAdmission(): void {
  active.clear();
}

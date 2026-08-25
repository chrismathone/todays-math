/**
 * eywa 동기화 **범위** — 「어느 반을 가져오나」를 한 곳에서 정한다.
 *
 * 원장님 확정 2026-08-25: *「이수진T의 월목 1,2교시 반에 대해서만 작동」*.
 * 그 전까지는 **활성 수학반 전부**(실측 68반 · 재원 341명)를 매일 가져왔다.
 *
 * ## 왜 손으로 적은 목록인가
 *
 * 이 저장소는 「손 목록은 샌다」를 여러 번 겪었다. 그런데 그건 **무엇이 있는지 모를 때**의
 * 이야기다. 여기는 다르다 — **어느 반을 볼지는 원장님이 정하는 정책**이고, 발견할 것이
 * 없다. 오히려 규칙으로 유도하면(「이수진T 담임 + 월목」) 시간표가 바뀐 날 조용히 범위가
 * 늘거나 준다. 실제로 이수진T 의 월·목만 있는 반은 **셋**이었고 원장님이 그중 둘을 골랐다.
 *
 * ## 열쇠는 id, 이름은 **검산용**
 *
 * `eywaClassId` 는 UUID 라 반 이름을 바꿔도 안 흔들린다. 그래서 그것을 열쇠로 쓴다.
 * 다만 id 만 적어 두면 **사람이 읽을 수 없고**, 다른 반을 잘못 적어도 아무도 모른다.
 * 그래서 이름을 같이 적고, 동기화가 **원본 이름과 대조**해 다르면 경고를 찍는다
 * (본문 밖 근거 — 목록이 낡았다는 것을 그때 알 수 있다).
 *
 * ⚠️ **범위 밖은 조용히 빠지면 안 된다.** 걸러 낸 반·학생 수를 요약에 반드시 싣는다.
 *    안 그러면 「전부 가져왔다」로 읽힌다.
 */

export type ScopedClass = {
  /** eywa `classes.id` — 이것이 열쇠다. */
  eywaClassId: string;
  /** 사람이 읽는 이름 — 검산용. 원본과 다르면 동기화가 경고한다. */
  name: string;
  /** 왜 이 반인가 — 다음 사람이 「지워도 되나」를 물을 때 근거. */
  why: string;
};

/**
 * 지금 가져오는 반. **여기 없으면 안 가져온다.**
 *
 * 차단 목록이 아니라 **허용 목록**이다 — 새 반이 eywa 에 생겨도 여기 적기 전에는
 * 안 들어온다. 잊으면 «안 들어온다» 쪽으로 새므로 안전하다.
 */
export const EYWA_SYNC_CLASSES: readonly ScopedClass[] = [
  {
    eywaClassId: "5984ef1b-4750-4ae5-80cf-9e21a55e33aa",
    name: "초등M 초5 MS1A",
    why: "이수진T · 월·목 (원장님 확정 2026-08-25)",
  },
  {
    eywaClassId: "2914f6bc-d7cd-4a1d-85b9-fcbd0ec72324",
    name: "중등M 초6 MS2A",
    why: "이수진T · 월·목 (원장님 확정 2026-08-25)",
  },
] as const;

/**
 * 실행 시점 덮어쓰기 — 시험·조사용. `EYWA_SYNC_CLASS_IDS="uuid,uuid"`.
 *
 * ⚠️ 빈 문자열은 **「전부」가 아니라 「설정 안 함」**이다. 「전부」로 읽으면 오타 하나에
 *    68반이 다시 들어온다 — 이 결정을 통째로 뒤집는 사고가 조용히 난다.
 */
export function scopedClassIds(
  // `NodeJS.ProcessEnv` 로 받으면 시험이 `{ EYWA_SYNC_CLASS_IDS: "…" }` 하나만
  // 넘길 때 `NODE_ENV` 가 없다고 타입이 막는다. 읽는 것은 키 하나뿐이므로
  // 필요한 만큼만 요구한다 — `process.env` 는 그대로 들어간다.
  env: Record<string, string | undefined> = process.env,
): Set<string> {
  const raw = (env.EYWA_SYNC_CLASS_IDS ?? "").trim();
  if (raw.length === 0)
    return new Set(EYWA_SYNC_CLASSES.map((c) => c.eywaClassId));

  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  // 🔴 **설정했는데 하나도 안 남으면 침묵하는 실패다**(`","` · `" , "` 같은 오타).
  //    그대로 두면 범위가 빈 채로 매일 「0건 동기화」를 «성공»으로 찍는다 — 에러도
  //    경고도 없다. 기본값으로 되돌려도 안 된다: 사람이 **좁히려고** 설정한 것이라
  //    조용히 넓히는 쪽이 더 나쁘다. 그래서 **멈춘다.**
  if (ids.length === 0)
    throw new Error(
      `EYWA_SYNC_CLASS_IDS 가 설정됐는데 반 id 가 하나도 없다 (받은 값: «${raw}»). ` +
        "쉼표로 구분한 uuid 를 넣거나, 기본 목록을 쓰려면 이 환경변수를 아예 지워라.",
    );
  return new Set(ids);
}

/** 목록의 이름이 원본과 맞는가 — 안 맞으면 사람이 읽을 문장으로 돌려준다. */
export function scopeNameMismatches(
  actual: Map<string, string>,
): { eywaClassId: string; expected: string; actual: string }[] {
  const out: { eywaClassId: string; expected: string; actual: string }[] = [];
  for (const c of EYWA_SYNC_CLASSES) {
    const now = actual.get(c.eywaClassId);
    if (now !== undefined && now !== c.name)
      out.push({ eywaClassId: c.eywaClassId, expected: c.name, actual: now });
  }
  return out;
}

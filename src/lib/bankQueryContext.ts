import "server-only";
import { loadRecentProblemIds } from "@/lib/tests/recentProblemIds";

/**
 * 문제은행 조회가 요청 바깥에서 알아야 하는 것 — 지금은 «최근 출제 빼기»(D-20) 하나다.
 *
 * 시험지 만들기의 «최근 출제 문항 빼기»는 일일테스트와 **같은 규칙**이다(`loadRecentProblemIds` 를 그대로 쓴다):
 * 지금 계정의 시험 가운데 시험 날짜(`testDate`)가 오늘부터 14일 전까지인 시험에 실린 문항.
 * 오늘은 서울 날짜다. 문항 id 목록은 브라우저가 싣지 않는다 — 요청은 `recent=1` 하나이고 여기서 찾는다.
 * 한 요청 안에서 조건을 여러 번 풀어도(가용량은 네 번) 시험지 조회는 한 번만 한다.
 */
export interface BankQueryContext {
  recentProblemIds(): Promise<readonly string[]>;
}

/** 서울(KST) 날짜 `YYYY-MM-DD`. */
export function kstToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * `owner` — 시험지를 찾을 계정. 함수면 `recent=1` 을 받았을 때만 부른다(dev 미리보기 라우트가 세션을 늦게 읽는다).
 * `null` 이면 찾을 계정이 없어 빼는 문항이 없다 — 운영 라우트는 늘 로그인한 계정을 넘긴다.
 */
export function bankQueryContext(
  owner: string | null | (() => Promise<string | null>),
  today: string = kstToday(),
): BankQueryContext {
  let ids: Promise<readonly string[]> | undefined;
  return {
    recentProblemIds() {
      ids ??= (async () => {
        const userId = typeof owner === "function" ? await owner() : owner;
        return userId ? loadRecentProblemIds(userId, today) : [];
      })();
      return ids;
    },
  };
}

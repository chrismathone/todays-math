import "server-only";
import { bankQueryContext } from "@/lib/bankQueryContext";

/**
 * dev 미리보기 라우트(`/api/dev/unified/**`)의 조회 문맥 — 관문이 없어 세션을 `recent=1` 을 받았을 때만 읽는다.
 * 로그인하지 않은 미리보기에서는 찾을 시험지가 없어 빼는 문항이 없다(운영 라우트는 늘 계정을 넘긴다).
 * 세션 모듈은 그때 불러온다 — 이 라우트를 함수로 부르는 옛 시험이 인증 모듈을 끌고 오지 않게.
 */
export function devBankQueryContext() {
  return bankQueryContext(async () => {
    const { getSessionUser } = await import("@/lib/session");
    return (await getSessionUser())?.id ?? null;
  });
}

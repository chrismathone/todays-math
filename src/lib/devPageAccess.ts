/**
 * `/dev` 화면을 **지금 이 요청에** 보여도 되나 — 한 곳에서 정한다.
 *
 * ## 왜 생겼나
 *
 * `/dev/print-check` 는 절대 규칙 6(인쇄는 실물 검수까지가 완료 조건)의 잔고 화면인데,
 * **원장님이 인쇄하시는 컴퓨터가 개발 서버를 띄우는 컴퓨터와 다르다**(2026-08-28).
 * 그래서 production 에서도 보여야 한다.
 *
 * ## 🔴 그렇다고 `ENABLE_RENDER_QA=1` 을 켜면 안 된다
 *
 * `src/proxy.ts` 는 `/dev/` 를 **인증 없이 공개**로 둔다. 그 플래그는 화면을 가리는
 * 마지막 한 겹이라, 켜는 순간 `/dev` **12화면이 링크만 알면 누구에게나** 열린다 —
 * 그 안에는 교재 대조(`cube-scrape`)·문항 화면(`transfer-qa`·`content-damaged`)이 있다.
 * 저장소를 비공개로 두는 이유와 정면으로 어긋난다.
 *
 * 그래서 여기서는 **로그인한 원장에게만** 연다. 로그인 안 한 요청에는 화면이 그대로
 * `notFound()` 를 내므로, 바깥에서 보기에는 **그 경로가 없는 것과 똑같다**
 * (로그인으로 되돌리면 「그 경로가 있다」를 알려 주게 된다).
 *
 * ⚠️ **`directorOnly` 를 안 준 화면은 지금까지와 똑같이 닫힌다.** 새로 여는 것은
 *    부르는 쪽이 그 인자를 붙인 화면뿐이다 — 목록을 여기 손으로 적지 않는다
 *    (손 목록은 새고, 새면 안 적힌 화면이 조용히 열리거나 닫힌다).
 */
import { auth } from "@/lib/auth";

export async function devPageVisible(
  opts: { directorOnly?: boolean } = {},
): Promise<boolean> {
  // 개발·시험에서는 늘 연다 — 이 화면들의 본래 자리다.
  if (process.env.NODE_ENV !== "production") return true;
  // 검수용으로 통째로 여는 옛 스위치. 기본은 꺼져 있고, 켜는 것은 의도된 선택이다.
  if (process.env.ENABLE_RENDER_QA === "1") return true;
  if (!opts.directorOnly) return false;

  const session = await auth();
  if (!session?.user) return false;
  /**
   * ⚠️ **`role` 이 없는 세션은 원장으로 본다.** `src/proxy.ts` 의 역할 게이트와
   *    **같은 규약**이다 — DB 기본값이 director 이고, 역할 기능이 나가기 전에 발급된
   *    토큰에는 `role` 이 없다. `=== "director"` 로 읽으면 그 토큰을 가진
   *    **원장이 자기 서비스에서 잠긴다.** 두 곳이 어긋나면 프록시는 통과시키는데
   *    화면은 404 를 내는 상태가 되므로, 규약을 바꾸려면 **둘 다** 바꾼다.
   */
  return session.user.role !== "reviewer";
}

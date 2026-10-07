import { notFound } from "next/navigation";

import { AppChrome } from "@/components/chrome/AppChrome";
import { MAIN_VIEW_TOGGLE_CLASS } from "@/components/main/MainScreen";
import { devPageVisible } from "@/lib/devPageAccess";

/**
 * 상단 크롬 **표본** — 로그인 없이 «메인과 같은 무게»의 헤더를 그린다.
 *
 * ## 왜 필요한가
 *
 * 헤더가 좁은 창에서 어떻게 접히는지는 **실제 무게**로만 잴 수 있는데, 그 무게를
 * 만드는 것 셋이 전부 로그인 뒤에만 나타난다:
 *
 *   1. `remaining` — 「남은 작업 N」 (메인만 넘긴다)
 *   2. `extraNav` — 「전체 표 ⇄」 버튼 (메인만 넘긴다)
 *   3. `AccountBadge` 의 **이메일** — 세션이 있어야 그린다
 *
 * 그래서 시안과 계측이 번번이 **가벼운 헤더**를 재고 틀린 답을 냈다(2026-09-08 에만
 * 세 번). 이 페이지는 그 셋을 갖춘 헤더를 로그인 없이 볼 수 있게 한다.
 * 이메일은 계측 쪽에서 `/api/auth/session` 을 가로채 넣는다 — 여기서 지어내지 않는다.
 *
 * ⚠️ **버튼 모양을 베끼지 않는다.** `MAIN_VIEW_TOGGLE_CLASS` 를 메인에서 그대로
 *    가져온다. 베끼면 메인만 고쳐도 이 표본이 조용히 갈리고, 그러면 여기서 잰 값이
 *    다시 «다른 헤더»의 값이 된다.
 *
 * 읽기만 한다. 아무것도 안 바꾼다.
 */
export const dynamic = "force-dynamic";

export default async function ChromeCheckPage() {
  // 계측용 표본이다 — 개발 서버에서는 종전대로 로그인 없이 열리고, production 에서는 닫는다
  // (`src/lib/devPageAccess.ts` — `/dev` 화면은 하나도 빠짐없이 가드를 단다).
  if (!(await devPageVisible())) notFound();

  return (
    <AppChrome
      remaining={3}
      extraNav={
        <button type="button" className={MAIN_VIEW_TOGGLE_CLASS}>
          전체 표 ⇄
        </button>
      }
    >
      <main className="px-[26px] py-6 text-[12.5px] text-text-2">
        상단 크롬 표본입니다. 창 폭을 줄여 가며 헤더가 어떻게 접히는지 봅니다.
      </main>
    </AppChrome>
  );
}

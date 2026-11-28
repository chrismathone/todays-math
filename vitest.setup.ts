// Vitest 전역 셋업 (T0.4 — 테스트 인프라)
// 참조: docs/planning/02-trd.md §7.3 (테스트 도구), §7.6 (품질 게이트)
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll, beforeEach, vi } from "vitest";
import { cleanup, configure } from "@testing-library/react";

import { server } from "@/mocks/server";
import { installArithmeticPackReader } from "@/lib/arithmetic-v2/presentation/packAssets";
import { readNodeArithmeticPack } from "@/lib/arithmetic-v2/presentation/packAssets.node";
installArithmeticPackReader(readNodeArithmeticPack);
// Route tests execute server modules directly; Next's build-time server boundary is not a Node runtime module.
vi.mock("server-only", () => ({}));

// findBy*/waitFor 의 기본 상한 1초를 올린다 (성능 수리 C-2).
//
// 문제 카드(문제은행·검수)는 이제 `next/dynamic` 지연 청크다. 그래서 한 테스트
// 파일의 **첫 렌더**가 KaTeX + unified/remark 모듈 그래프를 처음 적재하는 비용을
// 문다 — 격리 실행에서는 350ms 지만, 전체 실행에서 워커들이 CPU 를 다투면 1초를
// 넘겨 첫 테스트만 간헐 실패했다(3회 중 2회 재현). 두 번째 렌더부터는 모듈이
// 캐시돼 즉시다. **렌더가 느려진 게 아니라 적재 시점이 옮겨간 것**이다.
//
// vitest.config.mts 가 같은 렌더 스택 때문에 testTimeout 을 5초→20초로 올린 것과
// 같은 성질의 조정이다. 단언 내용은 아무것도 바뀌지 않는다 — 깨진 렌더는 여전히
// 실패하고, 다만 상한만큼 늦게 실패한다(testTimeout 20초 안이다).
//
// ⚠️ **2026-08-19: 5초도 모자랐다 — 상한을 기계 한 대 기준으로 잡았기 때문이다.**
// 오르카 다중 세션이 기본(CLAUDE.md 절대 규칙 9)이라 이 저장소의 전체 실행은
// **다른 세션의 dev 서버·vitest·npm install 과 CPU 를 나눠 쓰는 것이 정상 상태**다.
// 그 상태에서 `ProblemBank.test.tsx` 첫 테스트가 5초를 넘겨 **두 번 연속** 빨갛게
// 났고(기계가 한가해지자 통과), 같은 테스트를 혼자 돌리면 언제나 초록이다.
// 즉 이 값이 재는 것은 렌더 성능이 아니라 **그때 이 기계가 얼마나 바빴는가**다.
// 부하가 그날그날 다르므로 상한도 그만큼 넉넉해야 한다. 12초는 testTimeout(20초)
// 안이므로 **정말 안 그려지는 화면은 여전히 실패한다** — 늦게 실패할 뿐이다.
configure({ asyncUtilTimeout: 12000 });

// jsdom 29.1.1 의 MathML 계산된 스타일 심 (2026-09-27 — 시험 환경만, 제품 무관).
//
// 🔴 jsdom 은 MathML(`<math>` · `<mi>` …)을 `style` 없는 일반 `Element` 로 만든다. 그 요소에
//    `getComputedStyle` 를 부르면 jsdom 내부(`computed-style.js` `prepareComputedStyleDeclaration`)가
//    `elementImpl.style.length` 를 읽다가 `TypeError: … reading 'length'` 로 터진다.
//    `getByRole(…, { name })` · `queryByRole(…, { name })` 는 모든 후보의 접근성 이름을 계산하며
//    (dom-accessibility-api, 호출 때마다 `window.getComputedStyle` 를 꺼내 씀) 보기 단추 안 KaTeX
//    `<math>` 까지 내려가므로, KaTeX 가 그려진 화면에서 이름으로 단추를 찾는 시험이 터진다.
//    게다가 **순서 의존**이었다 — 수식 렌더러는 `next/dynamic` 이라, 앞 시험이 적재해 둔 파일에서만
//    보기에 `<math>` 가 그려진다(AuthenticatedMathSrs «grades a choice immediately…»: 하나만 돌리면 초록,
//    파일 전체면 빨강). 요소에 `style` 을 달아 주는 것으로는 안 된다 — jsdom 은 wrapper 가 아니라
//    impl 의 `style` 을 읽는다. 그래서 `getComputedStyle` 를 감싼다.
//
// 좁게: **`style` 이 없는 요소에만** 빈 계산된 스타일(모든 속성 "")을 돌려준다. `style` 이 있는
// HTML · SVG 요소와 요소가 아닌 값(잘못된 인자 — jsdom 이 던지는 그대로)은 jsdom 원래 함수를
// 그대로 부른다 — 동작이 한 글자도 바뀌지 않는다.
// 잠금: `src/__tests__/unit/jsdomMathmlStyleShim.test.tsx`. ⚠️ jsdom 이 MathML 에 style 을 주면 지울 것.
if (typeof window !== "undefined") {
  const jsdomGetComputedStyle = window.getComputedStyle.bind(window);
  const lacksStyle = (element: unknown) =>
    element instanceof window.Element && !("style" in element);
  window.getComputedStyle = ((element: Element, pseudo?: string | null) =>
    lacksStyle(element)
      ? document.createElement("span").style
      : jsdomGetComputedStyle(
          element,
          pseudo,
        )) as typeof window.getComputedStyle;
}

// Phase 2, T2.1 — `src/__tests__/api/class.test.ts`(및 이후 progress/problem/test API
// 테스트)는 Route Handler를 fetch가 아니라 함수로 직접 호출하므로 MSW(위 server)가 가로챌 수
// 없다. 실제 Prisma 클라이언트(`@/lib/db`)가 .env의 DATABASE_URL(공유 Supabase 프로덕션 DB)에
// 접속하지 않도록, 모든 테스트 파일에서 전역으로 인메모리 테스트 더블로 치환한다.
// (src/mocks/prismaTestDouble.ts 참조 — MSW 기반 mockHandlers.contract.test.ts는 fetch를
// 가로채므로 이 모킹과 무관하다.)
vi.mock("@/lib/db", async () => {
  const mod = await import("@/mocks/prismaTestDouble");
  // prismaTestDouble 모듈 초기화가 끝나기 전에 팩토리가 닫히면 named export가
  // undefined일 수 있다. 프로퍼티 접근 시점에 실객체를 읽도록 프록시로 감싼다.
  const db = new Proxy(
    {},
    {
      get(_target, prop, receiver) {
        return Reflect.get(mod.prismaTestDouble, prop, receiver);
      },
    },
  );
  return { db };
});

// D-77 — 헤더 계정 구역(AccountBadge)이 로그아웃 **서버 액션**을 물고 들어온다.
// 그 모듈은 `@/lib/auth`(NextAuth v5)를 import 하는데, Next 번들러 밖에서는
// `next/server` 해석이 깨져 **AppChrome 을 렌더하는 모든 테스트가 적재 단계에서
// 죽는다**(AppChrome·ClassManage·ProblemBank…). 위 `@/lib/db` 전역 모킹과 같은
// 성질의 차단이다 — 테스트가 실제 인증/쿠키를 건드리면 안 된다.
//
// ⚠️ 그래서 **이 액션이 실제로 로그아웃시키는지는 단위 테스트가 못 지킨다.**
//    프레임워크가 읽는 자리는 실물로 확인해야 한다(2026-08-20 교훈, 절대 규칙 6과
//    같은 성격) — `scripts/qa/smoke-logout.sh` 가 그 몫이다.
vi.mock("@/app/actions/auth", () => ({
  signOutAction: vi.fn(async () => {}),
}));

// MSW: 등록되지 않은 요청은 에러로 처리 — 실제 네트워크/AI 호출이 테스트에
// 몰래 나가는 것을 원천 차단한다 (Claude API 포함, 07-coding-convention §5).
beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

beforeEach(async () => {
  const { resetPrismaTestDouble } = await import("@/mocks/prismaTestDouble");
  resetPrismaTestDouble();
});

afterEach(() => {
  server.resetHandlers();
  cleanup();
});

afterAll(() => {
  server.close();
});

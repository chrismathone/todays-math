/** Browser-safe URLs shared by the approved development and production workspace. */
export function getStudioEndpoints(pathname?: string) {
  const path =
    pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);
  // 계정별 반 관리와 지점 관리도 실제 작업실 화면이므로 권한이 있는 studio API를 쓴다.
  const production =
    process.env.NODE_ENV === "production" ||
    path === "/" ||
    /^\/studio(?:\/|$)/.test(path) ||
    path === "/classes/manage" ||
    path === "/branch";
  const base = production ? "/api/studio" : "/api/dev/unified";
  // 🔴 AI 경로 판정은 **빌드만** 본다(원장님 2026-09-18 — 「dev 모드인데 왜 구독요금제가 아니라 서버로 되어있지?」).
  //    development 에서는 작업실 표면에서도 AI 요청만 구독 CLI 다리로 보낸다(과금 API 키를 안 쓴다).
  //    운영 빌드는 그대로 `/api/studio/ai` — `/api/dev/**` 는 운영에서 404 다(`dev/unified/ai/guard.ts`).
  const productionBuild = process.env.NODE_ENV === "production";
  const aiBase = productionBuild ? "/api/studio" : "/api/dev/unified";
  return {
    production,
    /**
     * 운영 빌드인가 — AI 경로와 **AI 상태판 최소화**가 이것을 본다(원장님 2026-09-18
     * 「작업실 AI칸은 dev 모드일때는 기존처럼, production에서만 최소화」). 표면(`production`)과 다르다.
     */
    productionBuild,
    ai: `${aiBase}/ai`,
    problems: `${base}/problems`,
    overview: `${base}/overview`,
    teaching: `${base}/teaching`,
    /** 문제 추출 시연 녹화본(2026-11-11) — 로그인한 시연 계정만 쓰는 운영 경로 하나. */
    demo: "/api/studio/demo",
    pdfWorker: `${base}/pdf-worker`,
    pdfAssets: `${base}/pdf-assets/`,
  };
}

/** Browser-safe URLs shared by the approved development and production workspace. */
export function getStudioEndpoints(pathname?: string) {
  const path =
    pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);
  // 표면 판정 — 로그인한 작업실(`/`·`/studio`)과 운영 빌드. 데이터 경로와 화면 모양(연결 상태 한 줄)이 이것을 본다.
  const production =
    process.env.NODE_ENV === "production" ||
    path === "/" ||
    /^\/studio(?:\/|$)/.test(path);
  const base = production ? "/api/studio" : "/api/dev/unified";
  // 🔴 AI 경로 판정은 **빌드만** 본다(원장님 2026-09-18 — 「dev 모드인데 왜 구독요금제가 아니라 서버로 되어있지?」).
  //    development 에서는 작업실 표면에서도 AI 요청만 구독 CLI 다리로 보낸다(과금 API 키를 안 쓴다).
  //    운영 빌드는 그대로 `/api/studio/ai` — `/api/dev/**` 는 운영에서 404 다(`dev/unified/ai/guard.ts`).
  const aiBase =
    process.env.NODE_ENV === "production" ? "/api/studio" : "/api/dev/unified";
  return {
    production,
    ai: `${aiBase}/ai`,
    problems: `${base}/problems`,
    overview: `${base}/overview`,
    teaching: `${base}/teaching`,
    pdfWorker: `${base}/pdf-worker`,
    pdfAssets: `${base}/pdf-assets/`,
  };
}

/** Browser-safe URLs shared by the approved development and production workspace. */
export function getStudioEndpoints(pathname?: string) {
  const path =
    pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);
  const production =
    process.env.NODE_ENV === "production" || /^\/studio(?:\/|$)/.test(path);
  const base = production ? "/api/studio" : "/api/dev/unified";
  return {
    production,
    ai: `${base}/ai`,
    problems: `${base}/problems`,
    overview: `${base}/overview`,
    teaching: `${base}/teaching`,
    pdfWorker: `${base}/pdf-worker`,
    pdfAssets: `${base}/pdf-assets/`,
  };
}

/** Keep inherited activity/error reporters and export fallbacks inside this iframe.
 * Install in a layout effect, before any passive reporter effects or ready message.
 */
export function isolatePreviewApis(): () => void {
  const originalFetch = window.fetch;
  const originalBeacon = navigator.sendBeacon;
  let active = true;
  const isApi = (url: string | URL) =>
    new URL(url, window.location.href).pathname.startsWith("/api/");
  const isolatedFetch: typeof fetch = (input, init) => {
    const url =
      typeof input === "string" || input instanceof URL ? input : input.url;
    if (active && isApi(url)) {
      return Promise.resolve(
        Response.json(
          { error: "시안에서는 계정 API를 사용하지 않습니다.", preview: true },
          { status: 403 },
        ),
      );
    }
    return originalFetch.call(window, input, init);
  };
  const isolatedBeacon: typeof navigator.sendBeacon = (url, data) =>
    active && isApi(url)
      ? true
      : (originalBeacon?.call(navigator, url, data) ?? false);
  window.fetch = isolatedFetch;
  navigator.sendBeacon = isolatedBeacon;
  return () => {
    // A reporter may have wrapped this fetch after installation. Deactivate that
    // retained closure too, so navigating away cannot leave an API block behind.
    active = false;
    if (window.fetch === isolatedFetch) window.fetch = originalFetch;
    if (navigator.sendBeacon === isolatedBeacon)
      navigator.sendBeacon = originalBeacon;
  };
}

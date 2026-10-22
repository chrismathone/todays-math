import { writeFile } from "node:fs/promises";

/** Used by the coordinator-granted focused launcher/zoom verification.
 * Capture the visible browser surface at real tab zoom without Playwright's
 * full-page clip calculation. The caller already owns the single browser slot.
 */
export async function captureZoomViewport(context, page, pngPath, metricsPath) {
  const cdp = await context.newCDPSession(page);
  try {
    const metrics = await cdp.send("Page.getLayoutMetrics");
    const image = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    await writeFile(pngPath, Buffer.from(image.data, "base64"));
    await writeFile(metricsPath, JSON.stringify(metrics, null, 2));
  } finally {
    await cdp.detach();
  }
}

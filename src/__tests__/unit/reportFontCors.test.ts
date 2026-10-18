// @vitest-environment node
import { describe, expect, it } from "vitest";
import nextConfig from "../../../next.config";

/**
 * 성적표 PDF 는 빈 문서(about:blank)에 HTML 을 붓고 자체 글꼴을 읽는다 — 다른 출처 요청이라
 * 글꼴에는 CORS 허용 헤더가 있어야 한다. 없으면 Chromium 이 net::ERR_FAILED 로 막고
 * 성적표 PDF 가 «글꼴을 불러오지 못했습니다»로 멈춘다(2026-10-18 실측).
 */
describe("성적표 자체 글꼴 CORS", () => {
  it("두 글꼴 파일에만 Access-Control-Allow-Origin 을 붙인다", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    const fontRules = rules.filter((r) =>
      r.headers.some((h) => h.key === "Access-Control-Allow-Origin"),
    );
    expect(fontRules.map((r) => r.source).sort()).toEqual([
      "/fonts/NotoSerifKR-subset.woff2",
      "/fonts/PretendardVariable.woff2",
    ]);
    for (const r of fontRules)
      expect(r.headers).toContainEqual({
        key: "Access-Control-Allow-Origin",
        value: "*",
      });
  });
});

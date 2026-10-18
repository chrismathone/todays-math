// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  allowedPdfResource,
  PdfPayloadSchema,
  pdfDocument,
} from "@/lib/export/pdfServer";

describe("server PDF document boundary", () => {
  const origin = "https://math.example";
  it("permits print assets while denying scripts, API calls, navigation and foreign images", () => {
    expect(
      allowedPdfResource(`${origin}/_next/static/a.css`, "stylesheet", origin),
    ).toBe(true);
    expect(
      allowedPdfResource(
        "https://fonts.gstatic.com/font.woff2",
        "font",
        origin,
      ),
    ).toBe(true);
    expect(
      allowedPdfResource("data:image/png;base64,AA==", "image", origin),
    ).toBe(true);
    for (const [url, type] of [
      [`${origin}/api/private`, "image"],
      [`${origin}/_next/a.js`, "script"],
      ["https://foreign.example/a.png", "image"],
      ["file:///etc/passwd", "image"],
      [origin, "document"],
      ["data:text/html,attack", "document"],
    ]) {
      expect(allowedPdfResource(url, type, origin)).toBe(false);
    }
  });
  it("preserves current stylesheet text and physical pages, while escaping title/style boundaries", () => {
    const html = pdfDocument(
      PdfPayloadSchema.parse({
        html: "<div data-mathgen-document><article data-unified-paper>수학</article></div>",
        title: "<script>bad</script>",
        cssText: "p{color:red}</style><script>bad</script>",
        cssUrls: [
          `${origin}/_next/static/a.css`,
          "https://foreign.example/track.css",
        ],
      }),
      origin,
    );
    expect(html).toContain("&lt;script&gt;bad&lt;/script&gt;");
    expect(html).toContain("<\\/style>");
    expect(html).toContain("--preview-scale:1!important");
    expect(html).not.toContain("track.css");
    expect(html).toContain("수학");
    expect(html).toContain("fonts.googleapis.com");
  });
  it("self-hosted mode omits and denies foreign font requests without changing the default", () => {
    const input = PdfPayloadSchema.parse({
      html: "<article data-unified-paper>성적표</article>",
      fontPolicy: "self-hosted",
      cssUrls: [
        "https://fonts.googleapis.com/example.css",
        `${origin}/paper.css`,
      ],
    });
    expect(pdfDocument(input, origin)).not.toContain("fonts.googleapis.com");
    expect(pdfDocument(input, origin)).toContain(`${origin}/paper.css`);
    expect(
      allowedPdfResource(
        "https://fonts.gstatic.com/a.woff2",
        "font",
        origin,
        "self-hosted",
      ),
    ).toBe(false);
    expect(
      allowedPdfResource(
        `${origin}/fonts/local.woff2`,
        "font",
        origin,
        "self-hosted",
      ),
    ).toBe(true);
  });
});

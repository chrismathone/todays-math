// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { zipSync } from "fflate";
vi.mock("server-only", () => ({}));
import {
  createTextbookArchive,
  readTextbookArchive,
  exchangeFromInertHtml,
} from "@/lib/textbook/archive/package.server";
import {
  assertArchivePath,
  readZipFiles,
  crc32,
} from "@/lib/textbook/archive/zip";
import { mappingCsv, csvCell } from "@/lib/textbook/archive/mappingCsv";
import { assertAssetMime, assertSafeSvg } from "@/lib/textbook/assets";
import { canonicalJson } from "@/lib/textbook/canonical";
import { publishedFixture } from "../helpers/textbookFixture";

describe("strict textbook archive transport", () => {
  it("roundtrips published original IDs, manifest, metadata and exact original archive bytes", async () => {
    const e = publishedFixture();
    const archive = (await createTextbookArchive(
      e,
      async () => {
        throw new Error("no assets");
      },
      { physicalScan: "pending" },
    ))!;
    const reopened = await readTextbookArchive(archive);
    expect(reopened.exchange).toEqual(e);
    expect(reopened.originalBytes).toBe(archive);
    expect(reopened.readOnly).toBe(true);
    expect(reopened.mode).toBe("archive");
    const repeated = await createTextbookArchive(
      reopened.exchange,
      async () => new Uint8Array(),
      reopened.validation,
    );
    expect(Buffer.compare(Buffer.from(repeated!), Buffer.from(archive))).toBe(
      0,
    );
  });
  it.each([
    "../x",
    "/x",
    "a/../x",
    "a\\x",
    "a//x",
    "a%2fx",
    "C:x",
    "a/CON.txt",
    "a/x.",
    "a/x ",
  ])("rejects path %s", (path) =>
    expect(() => assertArchivePath(path)).toThrow(),
  );
  it("rejects case aliases, symlinks, CRC changes, bombs and unexpected actual lengths", () => {
    expect(() =>
      readZipFiles(
        zipSync({
          "assets/A.png": new Uint8Array([1]),
          "assets/a.png": new Uint8Array([2]),
        }),
      ),
    ).toThrow(/Duplicate/);
    expect(() =>
      readZipFiles(
        zipSync({
          "assets/link": [new Uint8Array([1]), { os: 3, attrs: 0xa1ed0000 }],
        }),
      ),
    ).toThrow(/links/);
    expect(() =>
      readZipFiles(zipSync({ bomb: new Uint8Array(500_000) })),
    ).toThrow(/expansion/);
    const zip = zipSync({ x: new Uint8Array([1, 2, 3]) }, { level: 0 });
    const view = new DataView(zip.buffer);
    const central = zip.findIndex(
      (_, i) => i + 4 <= zip.length && view.getUint32(i, true) === 0x02014b50,
    );
    view.setUint32(14, 0, true);
    view.setUint32(central + 16, 0, true);
    expect(() => readZipFiles(zip)).toThrow(/CRC/);
    const compressed = zipSync({ x: new Uint8Array(50).fill(3) });
    const data = new DataView(compressed.buffer);
    const c = compressed.findIndex(
      (_, i) =>
        i + 4 <= compressed.length && data.getUint32(i, true) === 0x02014b50,
    );
    data.setUint32(22, 1, true);
    data.setUint32(c + 24, 1, true);
    expect(() => readZipFiles(compressed)).toThrow(/Actual/);
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
  it("refuses HTML as image and all executable/external SVG constructs", () => {
    expect(() =>
      assertAssetMime(new TextEncoder().encode("<html>"), "image/png"),
    ).toThrow();
    for (const svg of [
      "<svg><script>alert(1)</script></svg>",
      '<svg onload="x"/>',
      '<svg><image href="https://x"/></svg>',
      '<svg><path fill="url(https://x)"/></svg>',
      "<!DOCTYPE svg><svg/>",
      "<svg><foreignObject/></svg>",
    ])
      expect(() => assertSafeSvg(svg)).toThrow();
    expect(() =>
      assertSafeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0 L20 20" stroke="black"/></svg>',
      ),
    ).not.toThrow();
  });
  it("accepts frozen local figure labels while retaining the SVG execution/resource allowlist", () => {
    expect(() =>
      assertSafeSvg(
        '<svg xmlns="http://www.w3.org/2000/svg"><g data-mj="x &lt; 3" data-label="&quot;수학&quot;" data-anchor="middle" data-x="12.500" data-y="-3.000" data-base="1.000" data-fs="16.000" data-w="22.000" data-a="12.000" data-d="3.000" data-halo="1.500" data-px="0.000" data-py="0.000"><path d="M0 0 L2 2"/></g></svg>',
      ),
    ).not.toThrow();
    for (const attrs of [
      'data-mj="&custom;"',
      'data-html="x"',
      'onload="x"',
      'style="background:url(https://x)"',
      'fill="url(https://x)"',
      'href="https://x"',
      'data-label="x" onmouseover="x"',
      'data-anchor="javascript:x"',
      'data-x="Infinity"',
      'data-w="url(https://x)"',
      'data-y="&custom;"',
      'data-mml-node="url(https://x)"',
      'data-c="<script>"',
    ])
      expect(() => assertSafeSvg(`<svg><g ${attrs}/></svg>`)).toThrow();
  });
  it("retains native SVG text letter spacing as a finite scalar only", () => {
    for (const spacing of ["1px", "-.5px", ".3px", "1.3px", "0", "+.5"])
      expect(() =>
        assertSafeSvg(
          `<svg><text letter-spacing="${spacing}">개념</text></svg>`,
        ),
      ).not.toThrow();
    for (const spacing of [
      "normal",
      "Infinity",
      "NaN",
      "1em",
      "1px;color:red",
      "calc(1px)",
      "url(https://x)",
      "&#49;px",
      "9".repeat(400),
    ])
      expect(() =>
        assertSafeSvg(
          `<svg><text letter-spacing="${spacing}">개념</text></svg>`,
        ),
      ).toThrow(/SVG/);
  });
  it("exports actual page labels and protects spreadsheet formula cells without changing JSON", () => {
    const e = publishedFixture();
    e.items[0].displayNumber = '=HYPERLINK("x")';
    expect(mappingCsv(e)).toContain(csvCell(e.items[0].displayNumber));
    expect(csvCell(" \t=1+1")).toMatch(/^"'/);
    expect(e.items[0].displayNumber).toBe('=HYPERLINK("x")');
    expect(mappingCsv(e)).toContain('"2","2"');
  });
  it("extracts only inert strict JSON from HTML and never mounts executable source", () => {
    const e = publishedFixture();
    expect(
      exchangeFromInertHtml(
        `<script>alert('untrusted')</script><script type="application/json" id="textbook-exchange">${canonicalJson(e)}</script>`,
      ),
    ).toEqual(e);
    expect(() =>
      exchangeFromInertHtml(
        '<script type="application/json" id="textbook-exchange">{"x":1,"x":2}</script>',
      ),
    ).toThrow(/Duplicate/);
  });
});

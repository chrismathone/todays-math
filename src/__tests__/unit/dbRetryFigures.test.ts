// @vitest-environment node
import { createHash } from "node:crypto";
import {
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  figuresFromDbRetrySvg,
  loadDbRetryFigures,
  renderDbRetryFigure,
} from "@/lib/import/schoolTextbook/dbRetryFigures";
import { reviewDigest } from "@/lib/import/schoolTextbook/qualification";

const hash = (bytes: Uint8Array) =>
  createHash("sha256").update(bytes).digest("hex");
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40"><rect x="5" y="5" width="20" height="20" fill="black"/></svg>';
let temp: string;
let publicDir: string;
let red: Buffer;
let blue: Buffer;
beforeEach(async () => {
  temp = await mkdtemp(path.join(os.tmpdir(), "db-retry-figures-"));
  publicDir = path.join(temp, "public");
  await mkdir(path.join(publicDir, "figures"), { recursive: true });
  red = await sharp({
    create: { width: 30, height: 20, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  blue = await sharp({
    create: { width: 40, height: 25, channels: 3, background: "blue" },
  })
    .png()
    .toBuffer();
  await writeFile(path.join(publicDir, "figures", "red.png"), red);
  await writeFile(path.join(publicDir, "figures", "blue.png"), blue);
});
afterEach(async () => {
  vi.unstubAllEnvs();
  // This resolved mkdtemp directory has no workspace/dependency junctions.
  if (
    !path.resolve(temp).startsWith(path.resolve(os.tmpdir()) + path.sep) ||
    !path.basename(temp).startsWith("db-retry-figures-")
  )
    throw new Error("unsafe test cleanup");
  await rm(temp, { recursive: true, force: true });
});

function remoteFixture(bytes = red, key = "/figures/red.png") {
  const sha256 = hash(bytes);
  const entry = {
    sha256,
    size: bytes.length,
    mimeType: "image/png",
    objectPath: `v1/${sha256}${key}`,
  };
  const manifest = {
    schemaVersion: 1,
    sourceCommit: "a".repeat(40),
    entries: { [key]: entry },
  };
  const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
    new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(bytes.length),
      },
    }),
  );
  return {
    entry,
    manifest,
    fetch,
    cdnBaseUrl: "https://allowed.example/assets/",
  };
}
const origin = {
  content: "① [그림]\n② [그림]",
  figure_urls: ["/figures/red.png", "/figures/blue.png"],
  choice_figure_index: [2, 1],
};

describe("DB retry source image evidence", () => {
  it("preserves raw raster bytes, source order and non-sorted choice indices", async () => {
    const result = await loadDbRetryFigures(origin, { publicDir });
    expect(result.images.map((image) => image.choiceIndex)).toEqual([2, 1]);
    expect(result.images.map((image) => image.origin)).toEqual([
      "database-raster",
      "database-raster",
    ]);
    expect(result.images.map((image) => image.sha256)).toEqual([
      hash(red),
      hash(blue),
    ]);
    expect(
      result.images.map((image) =>
        Buffer.from(image.dataUrl.split(",")[1], "base64"),
      ),
    ).toEqual([red, blue]);
    expect(result.digest).toBe(
      reviewDigest([
        {
          sha256: hash(red),
          sourceSha256: hash(red),
          choiceIndex: 2,
          origin: "database-raster",
        },
        {
          sha256: hash(blue),
          sourceSha256: hash(blue),
          choiceIndex: 1,
          origin: "database-raster",
        },
      ]),
    );
    const swapped = await loadDbRetryFigures(
      { ...origin, choice_figure_index: [1, 2] },
      { publicDir },
    );
    expect(swapped.digest).not.toBe(result.digest);
    await writeFile(path.join(publicDir, "figures", "red.png"), blue);
    expect((await loadDbRetryFigures(origin, { publicDir })).digest).not.toBe(
      result.digest,
    );
  });

  it("prepends inline SVG as a stem and hashes the actual solver PNG", async () => {
    const result = await loadDbRetryFigures(
      { ...origin, figure_svg: svg },
      { publicDir },
    );
    expect(result.images.map((image) => image.choiceIndex)).toEqual([0, 2, 1]);
    expect(result.images.map((image) => image.origin)).toEqual([
      "database-svg",
      "database-raster",
      "database-raster",
    ]);
    const png = Buffer.from(result.images[0].dataUrl.split(",")[1], "base64");
    expect(result.images[0].sha256).toBe(hash(png));
    expect(result.images[0]).toHaveProperty(
      "sourceSha256",
      hash(Buffer.from(svg)),
    );
    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe("png");
    expect(metadata.width).toBeGreaterThanOrEqual(80);
    expect(metadata.height).toBeGreaterThanOrEqual(40);
  });

  it("binds source SVG byte edits even when solver pixels are identical", async () => {
    const first = await figuresFromDbRetrySvg(svg);
    const second = await figuresFromDbRetrySvg(
      svg.replace("</svg>", "<!-- byte change --></svg>"),
    );
    expect(first.images[0].sha256).toBe(second.images[0].sha256);
    expect(first.digest).not.toBe(second.digest);
  });

  it("supports camelCase source fields and text-only packets", async () => {
    const result = await loadDbRetryFigures(
      { figureUrls: origin.figure_urls, choiceFigureIndex: [2, 1] },
      { publicDir },
    );
    expect(result.images.map((image) => image.choiceIndex)).toEqual([2, 1]);
    expect(
      await loadDbRetryFigures({ content: "$2+3$의 값을 구하시오." }),
    ).toEqual({ images: [], digest: reviewDigest([]) });
  });

  it.each([
    undefined,
    [],
    [1],
    [1, 1],
    [0, 11],
    [0, -1],
    [0, 1.5],
    [0, null],
    "[1,2]",
  ])("rejects missing or malformed choice mapping %j", async (choices) => {
    await expect(
      loadDbRetryFigures(
        { ...origin, choice_figure_index: choices },
        { publicDir },
      ),
    ).rejects.toMatchObject({ code: "choice-index" });
  });

  it.each([
    "그림과 같이 삼각형이 있다.",
    "① [그림]",
    "좌표평면 위의 각 점 A, B를 보시오.",
  ])(
    "never turns missing required figures into text-only success: %s",
    async (content) => {
      await expect(loadDbRetryFigures({ content })).rejects.toMatchObject({
        code: "missing-evidence",
      });
    },
  );
  it("honors an explicit requirement even without deictic text", async () => {
    await expect(
      loadDbRetryFigures(
        { content: "자료를 보시오." },
        { requireFigures: true },
      ),
    ).rejects.toMatchObject({ code: "missing-evidence" });
  });
  it("allows a fully stated text-only geometric definition for independent solving", async () => {
    const content =
      "초점이 F인 포물선 위의 점 A에서 준선에 내린 수선의 발을 H라 할 때, FA=3이면 AH의 길이를 구하시오.";
    for (const source of ["school_textbook", "transformed"])
      expect(await loadDbRetryFigures({ source, content })).toEqual({
        images: [],
        digest: reviewDigest([]),
      });
    await expect(
      loadDbRetryFigures({
        source: "school_textbook",
        content: "다음 표에서 AH의 길이를 구하시오.",
      }),
    ).rejects.toMatchObject({ code: "missing-evidence" });
  });

  it("rejects a missing image without returning partial evidence", async () => {
    vi.stubEnv("SHARED_FIGURE_CDN_BASE_URL", "");
    await expect(
      loadDbRetryFigures(
        {
          ...origin,
          figure_urls: ["/figures/red.png", "/figures/missing.png"],
        },
        { publicDir },
      ),
    ).rejects.toMatchObject({ code: "missing-image" });
  });

  it.each([
    "/figures/../secret.png",
    "/figures/%2e%2e/secret.png",
    "/figures/%252e%252e/secret.png",
    "/figures/a%2fb.png",
    "/figures/a\\b.png",
    "/figures//red.png",
    "/figures/./red.png",
    "/figures/red.png?x=1",
    "/figures/red.png#x",
    "/figures/C:/secret.png",
    "/images/red.png",
    "file:///C:/secret.png",
    "//allowed.example/figures/red.png",
    "https://evil.example/red.png",
  ])("rejects untrusted host or traversal path: %s", async (url) => {
    const fetch = vi.fn();
    await expect(
      loadDbRetryFigures(
        { figure_urls: [url], choice_figure_index: [0] },
        { publicDir, fetch },
      ),
    ).rejects.toMatchObject({ code: "unsafe-path" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a public subtree junction that escapes its canonical root", async () => {
    const outside = path.join(temp, "outside");
    await mkdir(outside);
    await writeFile(path.join(outside, "red.png"), red);
    await symlink(
      outside,
      path.join(publicDir, "figures", "escape"),
      "junction",
    );
    await expect(
      loadDbRetryFigures(
        { figure_urls: ["/figures/escape/red.png"], choice_figure_index: [0] },
        { publicDir },
      ),
    ).rejects.toMatchObject({ code: "unsafe-path" });
  });

  it("rejects corrupt, mismatched and oversized images", async () => {
    await writeFile(
      path.join(publicDir, "figures", "bad.png"),
      Buffer.from("not an image"),
    );
    await expect(
      loadDbRetryFigures(
        { figure_urls: ["/figures/bad.png"], choice_figure_index: [0] },
        { publicDir },
      ),
    ).rejects.toMatchObject({ code: "image-decode" });
    await writeFile(
      path.join(publicDir, "figures", "bad.png"),
      await sharp(red).jpeg().toBuffer(),
    );
    await expect(
      loadDbRetryFigures(
        { figure_urls: ["/figures/bad.png"], choice_figure_index: [0] },
        { publicDir },
      ),
    ).rejects.toMatchObject({ code: "image-format" });
    await writeFile(
      path.join(publicDir, "figures", "bad.png"),
      Buffer.alloc(16 * 1024 * 1024 + 1),
    );
    await expect(
      loadDbRetryFigures(
        { figure_urls: ["/figures/bad.png"], choice_figure_index: [0] },
        { publicDir },
      ),
    ).rejects.toMatchObject({ code: "image-size" });
  });

  it("uses the existing manifest handler for a missing local image, with redirect rejection", async () => {
    const options = remoteFixture(red, "/figures/remote.png");
    const result = await loadDbRetryFigures(
      { figure_urls: ["/figures/remote.png"], choice_figure_index: [0] },
      { ...options, publicDir },
    );
    expect(result.images[0].sha256).toBe(hash(red));
    expect(options.fetch).toHaveBeenCalledExactlyOnceWith(
      `${options.cdnBaseUrl}${options.entry.objectPath}`,
      expect.objectContaining({ redirect: "error", credentials: "omit" }),
    );
  });

  it("accepts an exact whitelisted CDN URL, but no other object or base escape", async () => {
    const options = remoteFixture();
    const result = await loadDbRetryFigures(
      {
        figure_urls: [`${options.cdnBaseUrl}${options.entry.objectPath}`],
        choice_figure_index: [0],
      },
      options,
    );
    expect(result.images[0].sha256).toBe(hash(red));
    for (const url of [
      `https://allowed.example.evil/assets/${options.entry.objectPath}`,
      `${options.cdnBaseUrl}../${options.entry.objectPath}`,
      `${options.cdnBaseUrl}${options.entry.objectPath.replace(options.entry.sha256, "0".repeat(64))}`,
    ])
      await expect(
        loadDbRetryFigures(
          { figure_urls: [url], choice_figure_index: [0] },
          options,
        ),
      ).rejects.toMatchObject({ code: "unsafe-path" });
    expect(options.fetch).toHaveBeenCalledTimes(1);
  });

  it("rejects an oversized CDN object before downloading it", async () => {
    const options = remoteFixture(red, "/figures/large.png");
    options.manifest.entries["/figures/large.png"].size = 16 * 1024 * 1024 + 1;
    await expect(
      loadDbRetryFigures(
        { figure_urls: ["/figures/large.png"], choice_figure_index: [0] },
        { ...options, publicDir },
      ),
    ).rejects.toMatchObject({ code: "image-size" });
    expect(options.fetch).not.toHaveBeenCalled();
  });

  it("preserves a read SVG's UTF-8 BOM in its source byte hash", async () => {
    await mkdir(path.join(publicDir, "figures-svg"));
    const bytes = Buffer.concat([
      Buffer.from([0xef, 0xbb, 0xbf]),
      Buffer.from(svg),
    ]);
    await writeFile(path.join(publicDir, "figures-svg", "bom.svg"), bytes);
    const result = await loadDbRetryFigures(
      { figure_urls: ["/figures-svg/bom.svg"], choice_figure_index: [0] },
      { publicDir },
    );
    expect(result.images[0]).toHaveProperty("sourceSha256", hash(bytes));
  });

  it("rejects CDN integrity mismatch and redirects instead of exposing remote bytes", async () => {
    const options = remoteFixture();
    options.fetch.mockResolvedValueOnce(
      new Response(new Uint8Array(blue), {
        headers: { "Content-Type": "image/png" },
      }),
    );
    await expect(
      loadDbRetryFigures(
        { figure_urls: ["/figures/absent.png"], choice_figure_index: [0] },
        {
          ...options,
          manifest: remoteFixture(red, "/figures/absent.png").manifest,
          publicDir,
        },
      ),
    ).rejects.toMatchObject({ code: "cdn-read" });
    const redirected = new Response(new Uint8Array(red), {
      headers: { "Content-Type": "image/png" },
    });
    Object.defineProperty(redirected, "redirected", { value: true });
    options.fetch.mockResolvedValueOnce(redirected);
    await expect(
      loadDbRetryFigures(
        {
          figure_urls: [`${options.cdnBaseUrl}${options.entry.objectPath}`],
          choice_figure_index: [0],
        },
        options,
      ),
    ).rejects.toMatchObject({ code: "cdn-read" });
  });

  it("reads an existing public SVG export with inert namespace and glyph metadata", async () => {
    const result = await loadDbRetryFigures({
      figure_urls: ["/figures-svg/1318/q10.svg"],
      choice_figure_index: [0],
    });
    expect(result.images[0].origin).toBe("database-svg");
    expect(result.images[0].dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(result.images[0]).toHaveProperty(
      "sourceSha256",
      hash(
        await readFile(
          path.join(process.cwd(), "public/figures-svg/1318/q10.svg"),
        ),
      ),
    );
  });
});

describe("new vector figure generation", () => {
  const spec = {
    version: 2,
    points: { A: [40, 40], B: [220, 40], C: [220, 160] },
    segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
    dimensions: { d: { points: ["A", "B"], label: "12 cm" } },
    labels: { A: "A", B: "B", C: "C" },
  };
  it("runs the actual strict FigureSpec engine and returns newly rendered PNG evidence", async () => {
    const before = structuredClone(spec);
    const result = await renderDbRetryFigure(
      spec,
      "그림에서 AB의 길이는 $12cm$이다.",
    );
    expect(result.svg).toContain("12 cm");
    expect(result.figures.images[0].origin).toBe("generated-svg");
    expect(result.figures.images[0].choiceIndex).toBe(0);
    const pixels = Buffer.from(
      result.figures.images[0].dataUrl.split(",")[1],
      "base64",
    );
    expect(result.figures.images[0].sha256).toBe(hash(pixels));
    expect((await sharp(pixels).metadata()).format).toBe("png");
    expect(spec).toEqual(before);
  });

  it("rejects invented dimensions before rendering", async () => {
    await expect(
      renderDbRetryFigure(spec, "AB의 길이는 $9cm$이다."),
    ).rejects.toMatchObject({ code: "fabricated-spec" });
  });
  it("rejects invalid geometry instead of silently deleting conditions", async () => {
    await expect(
      renderDbRetryFigure(
        {
          ...spec,
          dimensions: { bad: { points: ["A", "MISSING"], label: "12 cm" } },
        },
        "AB의 길이는 12cm이다.",
      ),
    ).rejects.toMatchObject({ code: "figure-render" });
    await expect(
      renderDbRetryFigure(null, "AB의 길이는 12cm이다."),
    ).rejects.toMatchObject({ code: "figure-spec" });
  });

  it("refuses crowded dimensions that the non-strict renderer could drop", async () => {
    const crowded = {
      version: 2,
      points: { A: [50, 30], B: [50, 210], C: [290, 210] },
      segments: { AB: ["A", "B"], BC: ["B", "C"], CA: ["C", "A"] },
      labels: { A: "A", B: "B", C: "C" },
      dimensions: Object.fromEntries(
        Array.from({ length: 8 }, (_, i) => [
          `d${i}`,
          { points: i % 2 ? ["A", "C"] : ["C", "A"], label: `${i + 1} cm` },
        ]),
      ),
    };
    const before = structuredClone(crowded);
    await expect(
      renderDbRetryFigure(crowded, "도형에 1 2 3 4 5 6 7 8 cm 치수가 있다."),
    ).rejects.toMatchObject({
      code: "figure-render",
      message: expect.stringContaining("no collision-free layout"),
    });
    expect(crowded).toEqual(before);
  });

  it.each([
    '<svg viewBox="0 0 80 40"><script>alert(1)</script><rect width="2" height="2"/></svg>',
    '<svg viewBox="0 0 80 40"><rect onload="alert(1)" width="2" height="2"/></svg>',
    '<svg viewBox="0 0 80 40"><image href="https://evil.example/a.png"/></svg>',
    '<svg viewBox="0 0 80 40"><image href="data:image/png;base64,YQ=="/></svg>',
    '<svg viewBox="0 0 80 40"><use href="&#35;x"/></svg>',
    '<svg viewBox="0 0 80 40"><rect fill="url(https://evil.example/a)" width="2" height="2"/></svg>',
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///secret">]><svg viewBox="0 0 80 40"><text>&x;</text></svg>',
    '<svg viewBox="0 0 80 40"><foreignObject><p>bad</p></foreignObject></svg>',
    '<svg viewBox="0 0 80 40"><style>@import "https://evil.example";</style><rect width="2" height="2"/></svg>',
    '<svg viewBox="0 0 80 40"><rect width="2" height="2"></svg>',
  ])("rejects unsafe or malformed SVG: %s", async (unsafe) => {
    await expect(figuresFromDbRetrySvg(unsafe)).rejects.toMatchObject({
      code: "unsafe-svg",
    });
  });

  it.each([
    '<svg><rect width="20" height="20"/></svg>',
    '<svg viewBox="0 0 0 40"><rect width="20" height="20"/></svg>',
    '<svg viewBox="0 0 NaN 40"><rect width="20" height="20"/></svg>',
    '<svg viewBox="0 0 10000 40"><rect width="20" height="20"/></svg>',
    '<svg width="100%" height="40" viewBox="0 0 80 40"><rect width="20" height="20"/></svg>',
    '<svg width="80"><rect width="20" height="20"/></svg>',
  ])("rejects missing, invalid or unsafe dimensions: %s", async (invalid) => {
    await expect(figuresFromDbRetrySvg(invalid)).rejects.toMatchObject({
      code: "dimensions",
    });
  });

  it("rejects inherited raster paths on a transformed candidate", async () => {
    await expect(
      loadDbRetryFigures(
        {
          source: "transformed",
          figureUrls: ["/figures/red.png"],
          choiceFigureIndex: [0],
        },
        { publicDir },
      ),
    ).rejects.toMatchObject({ code: "inherited-image" });
    expect(
      (await loadDbRetryFigures({ source: "transformed", figureSvg: svg }))
        .images[0].origin,
    ).toBe("generated-svg");
  });
});

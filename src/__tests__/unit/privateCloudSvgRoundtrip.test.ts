import { Blob as NodeBlob } from "node:buffer";
import { webcrypto } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrivateCloudClient } from "@/components/unified/privateCloudClient";
import { svgFromImage } from "@/components/unified/figure-editor/figureDocument";
import { svgDataUrl } from "@/lib/svgDataUrl";
import { privateServer } from "../fixtures/privateCloud";

/**
 * 계정 저장 → 다시 열기 왕복에서 SVG 데이터 주소가 잘리던 자리(원장님 운영 콘솔 2026-09-19).
 *
 * 옛 `svgDataUrl` 은 `encodeURIComponent` 라 `( ) '` 가 날것으로 남았고, `externalize` 는 주소를 첫 `)`·`'` 에서
 * 끊었다. 잘린 앞부분만 자산이 되고 꼬리 `)%20translate(…)…%3C%2Fsvg%3E` 가 문자열에 남아, 다시 열면
 * «blob 주소 + 꼬리» → `net::ERR_FILE_NOT_FOUND`.
 */
const NS = "http://www.w3.org/2000/svg";
// 조판한 각도 라벨 모양 그대로 — 첫 `)` 가 rotate 에, `'` 가 글꼴 이름에
const full = `<svg xmlns="${NS}" viewBox="0 0 100 60"><line x1="0" y1="0" x2="10" y2="10" stroke="#111111"/><g transform="rotate(30 5 5) translate(-1.488 0) translate(42.41 9.67)"><g data-label="60°"><path d="M0 0L1 1"/></g></g><text x="5" y="5" font-family="'Cambria Math', serif">A</text></svg>`;
/** 이 고침 전의 짓기 — 괄호·작은따옴표가 날것 */
const legacy = (svg: string) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const ASSET = /^\/api\/library\/assets\/[a-f0-9]{64}$/;
const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/** 옛 `externalize` 가 남긴 모양을 그대로 만든다 — 첫 `)`·`'` 앞까지만 자산, 나머지는 꼬리 */
async function brokenlySaved(client: PrivateCloudClient, url: string) {
  const comma = url.indexOf(",");
  const cut = url.slice(comma + 1).search(/[\s"'<>)]/) + comma + 1;
  const prefix = decodeURIComponent(url.slice(comma + 1, cut));
  const path = await client.upload(
    new Blob([prefix], { type: "image/svg+xml" }),
    "문제 그림",
  );
  return { path, tail: url.slice(cut), prefix };
}

let objectUrls = 0;
beforeEach(() => {
  vi.stubGlobal("Blob", NodeBlob);
  vi.stubGlobal("crypto", webcrypto);
  objectUrls = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(
    () => `blob:private-view-${++objectUrls}`,
  );
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("SVG 데이터 주소 — 저장할 때", () => {
  it("옛 주소(괄호가 날것)도 끝까지 한 자산으로 올린다 — 꼬리가 문자열에 남지 않는다", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const saved = await client.externalize({ image: legacy(full) });
    expect(saved.image).toMatch(ASSET);
    expect([...server.assets.values()].map((a) => text(a.bytes))).toEqual([
      full,
    ]);
  });

  it("새 주소와 옛 주소는 같은 그림 — 같은 자산 하나", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const saved = await client.externalize({
      fresh: svgDataUrl(full),
      old: legacy(full),
    });
    expect(saved.fresh).toMatch(ASSET);
    expect(saved.old).toBe(saved.fresh);
    expect(server.assets.size).toBe(1);
  });

  it("마크다운·CSS 의 닫는 괄호와 따옴표는 주소로 먹지 않는다", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const other = full.replace("A</text>", "B</text>");
    const saved = await client.externalize({
      markdown: `앞 ![그림](${legacy(full)}) 뒤`,
      pair: `![](${legacy(full)})![](${legacy(other)})`,
      css: `background:url('${svgDataUrl(full)}');mask:url(${svgDataUrl(other)})`,
    });
    const hash = "\\/api\\/library\\/assets\\/[a-f0-9]{64}";
    expect(saved.markdown).toMatch(
      new RegExp(`^앞 !\\[그림\\]\\(${hash}\\) 뒤$`),
    );
    expect(saved.pair).toMatch(
      new RegExp(`^!\\[\\]\\(${hash}\\)!\\[\\]\\(${hash}\\)$`),
    );
    expect(saved.css).toMatch(
      new RegExp(`^background:url\\('${hash}'\\);mask:url\\(${hash}\\)$`),
    );
    expect(
      [...server.assets.values()].map((a) => text(a.bytes)).sort(),
    ).toEqual([full, other].sort());
  });
});

describe("SVG 데이터 주소 — 이미 잘려 저장된 것을 다시 열 때", () => {
  it("잘린 자산 + 꼬리를 이어 붙여 되살리고, 다음 저장 때 온전한 자산이 된다", async () => {
    const server = privateServer();
    const old = new PrivateCloudClient("owner-a", server.transport);
    const { path, tail, prefix } = await brokenlySaved(old, legacy(full));
    expect(tail.startsWith(")%20translate(")).toBe(true);
    expect(prefix.length).toBeLessThan(full.length);
    const stored = {
      image: `${path}${tail}`,
      content: `본문 ![그림](${path}${tail}) 끝`,
    };
    const opening = new PrivateCloudClient("owner-a", server.transport);
    const opened = await opening.materialize(stored);
    expect(svgFromImage(opened.image)).toBe(full);
    const inline = /^본문 !\[그림\]\(([^)]*)\) 끝$/.exec(opened.content)?.[1];
    expect(inline && svgFromImage(inline)).toBe(full);
    const resaved = await opening.externalize(opened);
    expect(resaved.image).toMatch(ASSET);
    expect(resaved.content).toBe(`본문 ![그림](${resaved.image}) 끝`);
    const repaired = [...server.assets.entries()].find(([key]) =>
      resaved.image.endsWith(key.split(":")[1]),
    );
    expect(repaired && text(repaired[1].bytes)).toBe(full);
  });

  it("온전한 자산 뒤의 마크다운 `)` 와 다음 주소는 꼬리로 읽지 않는다", async () => {
    const server = privateServer();
    const client = new PrivateCloudClient("owner-a", server.transport);
    const path = await client.upload(
      new Blob([full], { type: "image/svg+xml" }),
    );
    const next = svgDataUrl(full.replace("A</text>", "B</text>"));
    const opened = await new PrivateCloudClient(
      "owner-a",
      server.transport,
    ).materialize({ content: `![](${path})![](${next})` });
    expect(opened.content).toBe(`![](blob:private-view-1)![](${next})`);
  });

  it("되살릴 수 없는 모양이면 그 그림만 «다시 그려 주세요» 그림으로 드러내고 문서는 열린다", async () => {
    const server = privateServer();
    const old = new PrivateCloudClient("owner-a", server.transport);
    const { path, tail } = await brokenlySaved(old, legacy(full));
    const fine = await old.upload(new Blob(["png"], { type: "image/png" }));
    const opened = await new PrivateCloudClient(
      "owner-a",
      server.transport,
    ).materialize({
      // 꼬리의 끝(`</svg>`)이 없어진 것 · 퍼센트 부호가 깨진 것
      cut: `${path}${tail.slice(0, -"%3C%2Fsvg%3E".length)}`,
      malformed: `${path}${tail.replace("%20translate", "%E0%A4%A")}`,
      other: fine,
    });
    for (const broken of [opened.cut, opened.malformed]) {
      expect(broken).not.toContain("/api/library/assets/");
      expect(broken).not.toContain("blob:");
      expect(svgFromImage(broken)).toContain("다시 그려 주세요");
    }
    expect(opened.other).toMatch(/^blob:private-view-\d+$/);
  });
});

import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { svgDataUrl } from "@/lib/svgDataUrl";
import { svgFromImage } from "@/components/unified/figure-editor/figureDocument";

/**
 * 데이터 주소를 짓는 한 함수 — 원장님 운영 콘솔 2026-09-19
 * `blob:…)%20translate(-1.488…%200)…%3C%2Fsvg%3E  Failed to load resource: net::ERR_FILE_NOT_FOUND`.
 * `encodeURIComponent` 는 `( ) '` 를 그대로 둔다. 계정 저장(`externalize`)은 마크다운·CSS 문맥 때문에 주소를 첫 `)`·`'`
 * 에서 끊어 읽으므로, 조판한 라벨의 `transform="rotate(…) translate(…)"` 첫 `)` 에서 그림이 잘렸다.
 */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><g transform="rotate(30 5 5) translate(-1.488 0)"><text font-family="'Cambria Math', serif">f(x)!*~</text></g></svg>`;

describe("svgDataUrl", () => {
  it("괄호·작은따옴표까지 퍼센트 인코딩한다 — 주소 안에 끊을 자리가 없다", () => {
    const url = svgDataUrl(svg);
    const body = url.slice(url.indexOf(",") + 1);
    expect(url.startsWith("data:image/svg+xml;charset=utf-8,")).toBe(true);
    expect(body).not.toMatch(/[()'!*\s"<>]/);
    expect(svgFromImage(url)).toBe(svg);
  });

  it("마크다운 ![](…)·CSS url(…) 안에서 주소가 제 괄호에서 끝난다", () => {
    const url = svgDataUrl(svg);
    expect(/!\[[^\]]*\]\(([^)]*)\)/.exec(`![그림](${url})`)?.[1]).toBe(url);
    expect(/url\('([^']*)'\)/.exec(`url('${url}')`)?.[1]).toBe(url);
  });

  it("SVG 데이터 주소를 짓는 곳은 이 함수 하나다 — encodeURIComponent 로 따로 짓는 자리가 없다", () => {
    const root = path.join(process.cwd(), "src");
    const own = path.join(root, "lib", "svgDataUrl.ts");
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const name of readdirSync(dir)) {
        const full = path.join(dir, name);
        if (statSync(full).isDirectory()) {
          if (name !== "__tests__") walk(full);
        } else if (/\.tsx?$/.test(name) && full !== own) files.push(full);
      }
    };
    walk(root);
    const builders = files.filter((file) =>
      /data:image\/svg\+xml[^`\n]*\$\{\s*encodeURIComponent\(/.test(
        readFileSync(file, "utf8"),
      ),
    );
    expect(builders.map((file) => path.relative(root, file))).toEqual([]);
  });
});

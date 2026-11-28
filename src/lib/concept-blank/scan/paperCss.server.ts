import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import paper from "@/components/concept-blank/paper/paper.module.css";
import issued from "@/components/concept-blank/issuedPaper.module.css";
import print from "@/components/print/TestPrint.module.css";
import writing from "@/components/print/WritingArea.module.css";
import { scanMathLayoutCss } from "./fonts.server";

/** Translate only local class selectors through the same build's CSS-module map.
 * No parallel hand-maintained copy of paper geometry. :global selectors stay global.
 * These four first-party modules contain no composes/nested :global syntax. */
export function materializeScanCss(
  source: string,
  classes: Record<string, string>,
) {
  const globals: string[] = [];
  return source
    .replace(/:global\(([^()]*)\)/g, (_, selector: string) => {
      globals.push(selector);
      return `__CB_GLOBAL_${globals.length - 1}__`;
    })
    .replace(/\.([A-Za-z_][\w-]*)/g, (whole, name: string) => {
      const mapped = classes[name];
      if (!mapped) return whole;
      if (!/^[\w-]+$/.test(mapped))
        throw new Error("지면 CSS 클래스 결합을 확인해야 합니다.");
      return `.${mapped}`;
    })
    .replace(/__CB_GLOBAL_(\d+)__/g, (_, n: string) => globals[Number(n)]);
}

let cached: string | undefined;
export function scanPaperCss() {
  if (cached !== undefined) return cached;
  const root = process.cwd();
  const modules: [string, Record<string, string>][] = [
    ["src/components/print/TestPrint.module.css", print],
    ["src/components/print/WritingArea.module.css", writing],
    ["src/components/concept-blank/paper/paper.module.css", paper],
    ["src/components/concept-blank/issuedPaper.module.css", issued],
  ];
  cached = [
    // 읽는 파일은 next.config `outputFileTracingIncludes` 가 싣는다 — 동적 경로를 추적하면 프로젝트 전체(9만 파일)를 훑어 Vercel 빌드가 메모리 초과로 죽었다(2026-11-27).
    // `createRequire(import.meta.url).resolve` 는 Turbopack 운영 빌드에서 undefined 가 됐다(2026-11-25 운영 장애).
    // 이 파일은 `next.config.ts` 의 outputFileTracingIncludes 로 함수에 실린다 — cwd 기준으로 읽는다.
    readFileSync(
      path.join(
        /* turbopackIgnore: true */ root,
        "node_modules/tailwindcss/preflight.css",
      ),
      "utf8",
    ),
    scanMathLayoutCss(),
    `:root{--font-noto-serif-kr:"Noto Serif KR";--font-pretendard:"Pretendard"}html,body{margin:0;padding:0}`,
    ...modules.map(([file, classes]) =>
      materializeScanCss(
        readFileSync(path.join(/* turbopackIgnore: true */ root, file), "utf8"),
        classes,
      ),
    ),
    `[data-print-page]{--cb-paper-scale:1!important;margin:0!important;box-shadow:none!important}`,
  ].join("\n");
  return cached;
}

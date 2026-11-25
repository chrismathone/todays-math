import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import paper from "@/components/concept-blank/paper/paper.module.css";
import issued from "@/components/concept-blank/issuedPaper.module.css";
import print from "@/components/print/TestPrint.module.css";
import writing from "@/components/print/WritingArea.module.css";
import { selfHostedMathCss } from "@/lib/examReport/paperHtml";

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
  const font = (name: string, file: string) =>
    `@font-face{font-family:"${name}";font-style:normal;font-weight:100 900;font-display:block;src:url(data:font/woff2;base64,${readFileSync(path.join(root, "public/fonts", file)).toString("base64")}) format("woff2");}`;
  cached = [
    // `createRequire(import.meta.url).resolve` 는 Turbopack 운영 빌드에서 undefined 가 됐다(2026-11-25 운영 장애).
    // 이 파일은 `next.config.ts` 의 outputFileTracingIncludes 로 함수에 실린다 — cwd 기준으로 읽는다.
    readFileSync(
      path.join(root, "node_modules/tailwindcss/preflight.css"),
      "utf8",
    ),
    font("Noto Serif KR", "NotoSerifKR-subset.woff2"),
    font("Pretendard", "PretendardVariable.woff2"),
    selfHostedMathCss(),
    `:root{--font-noto-serif-kr:"Noto Serif KR";--font-pretendard:"Pretendard"}html,body{margin:0;padding:0}`,
    ...modules.map(([file, classes]) =>
      materializeScanCss(readFileSync(path.join(root, file), "utf8"), classes),
    ),
    `[data-print-page]{--cb-paper-scale:1!important;margin:0!important;box-shadow:none!important}`,
  ].join("\n");
  return cached;
}

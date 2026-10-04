/**
 * 기기(OS)의 «움직임 줄이기»와 앱 설정은 **같은 끝 모양**을 낸다(3자 합의 v2 9항, 2026-10-04).
 *
 * 학생 수학 CSS 는 OS 설정을 `@media (prefers-reduced-motion: reduce)` 로 받고, 앱 설정은 수학 뿌리의
 * `data-learning-motion="reduce"`(`LearningMotionScope`)로 받는다. 한쪽에만 규칙을 쓰면 그 모듈만 움직인다 —
 * 그래서 OS 블록의 규칙마다 같은 선택자 · 같은 선언의 앱 규칙이 있는지 파일을 읽어 잰다(jsdom 은 CSS 를 안 읽는다).
 *
 * 🔴 시안의 `.reduce * { animation: none !important }` 같은 일괄 규칙은 쓰지 않는다. 기존 블록은 «없앤다» 말고
 *    끝 모양도 정한다(체크 선은 `stroke-dashoffset: 0`) — 일괄 규칙은 그 끝 모양을 건너뛴다.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const components = resolve(__dirname, "../../components");
const read = (file: string) =>
  readFileSync(resolve(components, file), "utf8").replace(
    /\/\*[\s\S]*?\*\//g,
    "",
  );

const APP = '[data-learning-motion="reduce"]';
type Rule = { selectors: string[]; declarations: string };

const squeeze = (text: string) => text.replace(/\s+/g, " ").trim();
const declarationsOf = (body: string) =>
  body.split(";").map(squeeze).filter(Boolean).sort().join("; ");

/** `{ … }` 한 덩이의 끝(짝이 맞는 닫는 괄호) */
function blockEnd(css: string, open: number) {
  let depth = 0;
  for (let index = open; index < css.length; index++) {
    if (css[index] === "{") depth++;
    if (css[index] === "}" && --depth === 0) return index;
  }
  throw new Error("닫히지 않은 블록");
}

/** 중첩 없는 규칙들 */
function rulesOf(css: string): Rule[] {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((match) => ({
    selectors: match[1]!.split(",").map(squeeze).filter(Boolean),
    declarations: declarationsOf(match[2]!),
  }));
}

/** OS 블록 안의 규칙과, 블록 밖(최상위)의 규칙 */
function split(css: string) {
  const os: Rule[] = [];
  let rest = "";
  let cursor = 0;
  const media = /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{/g;
  for (let match = media.exec(css); match; match = media.exec(css)) {
    const open = match.index + match[0].length - 1;
    const end = blockEnd(css, open);
    os.push(...rulesOf(css.slice(open + 1, end)));
    rest += css.slice(cursor, match.index);
    cursor = end + 1;
    media.lastIndex = cursor;
  }
  rest += css.slice(cursor);
  return { os, rest };
}

const HOME = "math-explorers/explorer-home-atelier.module.css";
const files = [
  "math-srs/daily-journey-board.module.css",
  "math-explorers/math-explorers.module.css",
];

describe.each(files)("%s", (file) => {
  const css = read(file);
  const { os, rest } = split(css);
  const app = rulesOf(rest).filter((rule) =>
    rule.selectors.some((selector) => selector.startsWith(APP)),
  );

  it("OS 블록의 규칙마다 같은 선언의 앱 규칙이 있다", () => {
    expect(os.length).toBeGreaterThan(0);
    for (const rule of os)
      for (const selector of rule.selectors) {
        const twin = app.find(
          (candidate) =>
            candidate.selectors.includes(`${APP} ${selector}`) &&
            candidate.declarations === rule.declarations,
        );
        expect(
          twin,
          `앱 줄이기 규칙이 없다: ${APP} ${selector} { ${rule.declarations} }`,
        ).toBeDefined();
      }
  });

  it("앱 규칙마다 같은 선언의 OS 규칙이 있다", () => {
    for (const rule of app)
      for (const selector of rule.selectors) {
        expect(selector.startsWith(`${APP} `), selector).toBe(true);
        const bare = selector.slice(APP.length + 1);
        const twin = os.find(
          (candidate) =>
            candidate.selectors.includes(bare) &&
            candidate.declarations === rule.declarations,
        );
        expect(
          twin,
          `OS 줄이기 규칙이 없다: ${bare} { ${rule.declarations} }`,
        ).toBeDefined();
      }
  });

  it("모든 요소의 움직임을 한꺼번에 멈추는 일괄 규칙이 없다", () => {
    for (const rule of [...os, ...rulesOf(rest)]) {
      if (!/\b(animation|transition)\b/.test(rule.declarations)) continue;
      for (const selector of rule.selectors)
        expect(selector, `${selector} { ${rule.declarations} }`).not.toMatch(
          /(^|[\s>+~])\*(?![\w-])/,
        );
    }
  });
});

describe("새 홈 모듈", () => {
  it("움직임을 더하지 않는다 — 줄이기에서 따로 멈출 것이 없다", () => {
    const css = read(HOME);
    expect(css).not.toMatch(/\b(animation|transition)\s*:/);
    expect(css).not.toMatch(/@keyframes/);
  });
});

describe("진도판 말의 장식", () => {
  it("착지 링을 그리는 규칙이 남아 있지 않다", () => {
    expect(read("math-srs/daily-journey-board.module.css")).not.toMatch(
      /pawnLanding/,
    );
  });

  it("가만히 몸짓과 바퀴 구름은 줄이기에서만 멈춘다", () => {
    const css = read("math-srs/daily-journey-board.module.css");
    const { os, rest } = split(css);
    // 보통 때의 움직임(§8.24)은 그대로 있다
    for (const name of [
      "journeyWheel",
      "journeySway",
      "journeyBob",
      "journeyDrift",
    ])
      expect(rest).toMatch(new RegExp(`animation:\\s*${name}\\b`));
    const stopped = os.find((rule) =>
      rule.selectors.includes(".rider .riderFigure"),
    )!;
    expect(stopped.selectors).toContain(".rider .wheel");
    expect(stopped.declarations).toBe("animation: none !important");
  });
});

describe("홈의 두 열", () => {
  it("넓은 PC 에서만 미션과 지도를 나란히 둔다 — 768 · 1024 는 한 열, 지도 판은 지금 크기 그대로", () => {
    const css = read(HOME);
    const wide = /@media\s*\(min-width:\s*(\d+)px\)\s*\{/.exec(css);
    expect(wide).not.toBeNull();
    expect(Number(wide![1])).toBeGreaterThan(1024);
    const open = wide!.index + wide![0].length - 1;
    const end = blockEnd(css, open);
    const inside = css.slice(open + 1, end);
    const outside = css.slice(0, wide!.index) + css.slice(end + 1);
    expect(outside).not.toMatch(/grid-template-columns/);
    expect(outside).not.toMatch(/@media\s*\(min-width/);
    const columns = /grid-template-columns:\s*([^;]+);/.exec(inside)![1]!;
    const tracks = squeeze(columns).split(/\s+(?=minmax\()/);
    expect(tracks).toHaveLength(2);
    const map = /^minmax\((\d+)px,\s*(\d+)px\)$/.exec(tracks[1]!);
    expect(map, columns).not.toBeNull();
    // 좁아져도 판은 «넓은 판» 경계(05 §8.17 — 판 폭 480px) 밑으로 내려가지 않는다: 판 480 + 안쪽 여백 12px 둘
    expect(Number(map![1])).toBeGreaterThanOrEqual(480 + 2 * 12);
    // 넉넉하면 지금 PC 판 620px 그대로: 620 + 안쪽 여백 12px 둘 — 칸 이름 실측이 한 열일 때와 같다
    expect(Number(map![2])).toBe(620 + 2 * 12);
  });
});

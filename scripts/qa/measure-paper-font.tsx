/**
 * UI-09 실측 — **지면이 «실제로» 무슨 글꼴로 나가는가** (읽기 전용).
 *
 *   npx tsx scripts/qa/measure-paper-font.tsx
 *   npx tsx scripts/qa/measure-paper-font.tsx --json out.json
 *
 * ## 왜 필요한가 — CSS 문자열은 답이 아니다
 *
 * 지면 본문은 `--paper-font-serif` 하나를 타고 오는데 그 값은 **이름 다섯의 목록**이다
 * (`PAPER_FONTS.serifKR`). `public/fonts` 에는 Pretendard 하나뿐이고 `@font-face` 로
 * 명조를 적재하는 자리가 **없으므로**, 실제로 쓰이는 글꼴은 **그 기계에 깔린 것**이
 * 정한다. 그래서 「무슨 글꼴로 나가나」는 소스를 읽어서는 못 푼다 — 렌더러에게
 * 물어야 한다. 이 스크립트는 CDP `CSS.getPlatformFontsForNode` 로 **글리프에 실제로
 * 쓰인 글꼴 이름과 글리프 수**를 받아 온다.
 *
 * ## 네 축 (하나만 재면 답이 안 나온다)
 *
 *   A. **이름별 해상** — 스택의 다섯 이름을 하나씩 대 보면 이 기계가 어디서 멈추는지 나온다.
 *   B. **자(측정 도구)의 지면** — `paperProbe` 가 그리는 진짜 A4 에서 본문이 무엇으로 찍히나.
 *      자의 기존 가드(`assertPaperSane`)는 **크기(12.5px)만** 본다. 글꼴 이름은 안 본다.
 *   C. **종이** — `page.pdf()` 로 뽑아 PDF 에 **박힌 글꼴 이름**을 읽는다. 화면·인쇄 매체가
 *      갈릴 수 있으므로 `emulateMedia({media:"print"})` 로도 A/B 를 다시 잰다.
 *   D. **폴백이 갈리면 자가 얼마나 틀리나** — 자는 이 기계의 글꼴로 눈금을 맞춘다.
 *      원장님 기계가 다른 글꼴로 떨어지면 **자는 그대로인데 지면만 달라진다**.
 *      같은 문항을 글꼴만 바꿔 그려 «폭·높이·줄 수»가 얼마나 벌어지는지 잰다.
 *
 * ## 🔴 이 자가 눈멀 수 있는 자리 — 그래서 음성 대조를 박았다
 *
 * CDP 가 빈 배열을 주거나 글리프 수가 0이면 「같다」가 «못 셈»과 구분되지 않는다.
 * 그래서 판정 **전에** 뻔히 다른 두 글꼴(명조 스택 vs `Malgun Gothic`)을 대 보고,
 * 그 둘이 **다르게 나오지 않으면 보고를 거부**한다. 0은 «깨끗»과 «못 셈»을 안 가른다.
 *
 * 이 스크립트는 아무것도 안 고친다. DB 도 안 본다.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { chromium, type Page } from "@playwright/test";

import { PAPER_FONTS } from "../../src/components/print/tokens";
import {
  GUARD_SCRIPT,
  assertPaperSane,
  paperDocument,
  renderPage,
  renderSlot,
  writeProbe,
} from "./paperProbe";

const ROOT = process.cwd();

/**
 * 한글과 라틴을 **갈라서** 잰다.
 *
 * 🔴 한 덩어리로 재면 안 된다. 브라우저의 폴백은 **문자마다** 도는데, 그러면 한 노드에
 *    글꼴 둘이 섞여 나오고 「대표값」은 글리프 수가 많은 쪽이 이긴다. 한글이 고딕으로
 *    떨어져도 라틴이 명조면 대표값이 명조가 될 수 있고, 그 반대도 된다.
 *    처음에 그렇게 짰다가 **음성 대조가 서로를 가려** 판정이 막혔다.
 */
const SPECIMEN_KO = "이차방정식의 해를 구하시오";
const SPECIMEN_EN = "Ax+B 0123456789";

/**
 * 스택의 이름을 **손으로 옮겨 적지 않는다** — 정본(`PAPER_FONTS.serifKR`)을 쪼갠다.
 * 옮겨 적으면 토큰이 바뀐 날 이 자가 옛 목록을 재고도 초록으로 남는다.
 */
const STACK = PAPER_FONTS.serifKR.split(",").map((s) => s.trim());

/**
 * 눈금 — **설치가 확실한 두 글꼴**로 「이 자가 «다르다»를 말할 수 있는가」를 먼저 본다.
 *
 * ⚠️ 눈금을 **제품 스택**으로 잡으면 안 된다. 제품 스택이 어디로 떨어지는지가 바로
 *    우리가 재려는 값이라, 그것이 눈금이면 「결과가 나쁘다」와 「자가 죽었다」가 안 갈린다.
 *    (처음에 그렇게 짰고, 스택이 고딕으로 떨어지는 바람에 판정이 통째로 막혔다.)
 *    그래서 눈금은 레지스트리에 있는 것이 확인된 `Batang` ↔ `Malgun Gothic` 으로 잡는다.
 */
const CALIBRATION = {
  serif: '"Batang"',
  sans: '"Malgun Gothic"',
} as const;

interface PlatformFont {
  familyName: string;
  glyphCount: number;
  isCustomFont?: boolean;
}

interface FontRow {
  label: string;
  declared: string;
  /** 한글 글리프에 실제로 쓰인 글꼴 */
  ko: PlatformFont[];
  /** 라틴·숫자 글리프에 실제로 쓰인 글꼴 */
  en: PlatformFont[];
}

/** CDP 로 «이 노드의 글리프에 실제로 쓰인 글꼴»을 묻는다. 계산값이 아니라 렌더러의 답이다. */
async function platformFonts(
  page: Page,
  selector: string,
): Promise<PlatformFont[]> {
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    const doc = (await cdp.send("DOM.getDocument", { depth: -1 })) as {
      root: { nodeId: number };
    };
    const found = (await cdp.send("DOM.querySelector", {
      nodeId: doc.root.nodeId,
      selector,
    })) as { nodeId: number };
    if (!found.nodeId) throw new Error(`노드를 못 찾았다: ${selector}`);
    const result = (await cdp.send("CSS.getPlatformFontsForNode", {
      nodeId: found.nodeId,
    })) as { fonts: PlatformFont[] };
    return result.fonts ?? [];
  } finally {
    await cdp.detach();
  }
}

function fontsLabel(fonts: PlatformFont[]): string {
  if (fonts.length === 0) return "(없음 — 못 셌다)";
  return fonts
    .slice()
    .sort((a, b) => b.glyphCount - a.glyphCount)
    .map((f) => `${f.familyName}(${f.glyphCount})`)
    .join(" + ");
}

/** 가장 많은 글리프를 그린 글꼴 — 「이 문단은 무엇으로 찍혔나」의 대표값. */
function dominant(fonts: PlatformFont[]): string {
  if (fonts.length === 0) return "";
  return fonts.reduce((a, b) => (b.glyphCount > a.glyphCount ? b : a))
    .familyName;
}

// ─────────────────────────────────────────────────────────────────────────────
// 축 A — 이름별 해상
// ─────────────────────────────────────────────────────────────────────────────

/** 재는 대상 — 스택의 이름 하나씩 · 스택 전체(제품이 쓰는 값) · 눈금 둘. */
function specimenEntries(): Array<{
  id: string;
  label: string;
  family: string;
}> {
  return [
    ...STACK.map((name, i) => ({ id: `s${i}`, label: name, family: name })),
    {
      id: "full",
      label: "스택 전체(제품 값)",
      family: PAPER_FONTS.serifKR,
    },
    { id: "calserif", label: "눈금 · Batang", family: CALIBRATION.serif },
    { id: "calsans", label: "눈금 · Malgun Gothic", family: CALIBRATION.sans },
  ];
}

/**
 * 🔴 **글꼴 이름을 `style=` 속성에 인라인으로 넣지 마라.** 이름에 큰따옴표가 들어 있어
 *    (`"KoPubBatang", …`) 속성이 **그 첫 따옴표에서 끝난다.** 그러면 선언이 통째로
 *    날아가고 본문은 브라우저 기본값으로 떨어지는데, **에러가 하나도 안 난다** —
 *    측정은 그대로 돌고 「전부 Malgun Gothic」이라는 그럴듯한 답을 낸다.
 *    (실제로 이 스크립트가 첫 회차에 그렇게 재고, 눈금이 그것을 잡았다.
 *     `paperProbe.tsx:44` 가 `PAPER_VARS` 에서 겪은 것과 같은 자리다.)
 *    그래서 규칙을 `<style>` 블록에 둔다 — 거기서는 따옴표가 정상 문법이다.
 */
function specimenHtml(): string {
  const css = specimenEntries()
    .map(
      (e) =>
        `#${e.id}-ko, #${e.id}-en { font-family: ${e.family}; font-size: 12.5px; }`,
    )
    .join("\n");
  const rows = specimenEntries()
    .map(
      (e) =>
        `<div>` +
        `<span id="${e.id}-ko">${SPECIMEN_KO}</span>` +
        `<span id="${e.id}-en">${SPECIMEN_EN}</span>` +
        `</div>`,
    )
    .join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><style>${css}</style></head><body>${rows}</body></html>`;
}

/**
 * 선언이 **실제로 앉았는지** 묻는다. 위 함정은 「글꼴이 다르다」가 아니라
 * 「선언이 사라졌다」로 나타나므로, 결과를 읽기 전에 이걸 봐야 한다.
 */
async function assertDeclarationsLanded(page: Page) {
  const want = specimenEntries().map((e) => ({ id: e.id, family: e.family }));
  const rows = await page.evaluate(
    (entries) =>
      entries.map((e) => {
        const el = document.getElementById(`${e.id}-ko`);
        return {
          id: e.id,
          declared: e.family,
          computed: el ? getComputedStyle(el).fontFamily : "(노드 없음)",
        };
      }),
    want,
  );
  // 따옴표·공백만 다른 것은 같은 선언이다(브라우저가 다시 직렬화한다).
  const flat = (s: string) => s.replace(/["' ]/g, "").toLowerCase();
  const bad = rows.filter((r) => flat(r.computed) !== flat(r.declared));
  if (bad.length > 0)
    throw new Error(
      "글꼴 선언이 앉지 않았다 — 이 상태의 측정값은 통째로 거짓이다:\n" +
        bad
          .map(
            (b) =>
              `  ${b.id}: 적은 것 [${b.declared}] · 앉은 것 [${b.computed}]`,
          )
          .join("\n"),
    );
}

async function measureNames(page: Page): Promise<FontRow[]> {
  await page.goto(writeProbe("font-specimen.html", specimenHtml()), {
    waitUntil: "load",
  });
  await assertDeclarationsLanded(page);
  const out: FontRow[] = [];
  for (const e of specimenEntries()) {
    out.push({
      label: e.label,
      declared: e.family,
      ko: await platformFonts(page, `#${e.id}-ko`),
      en: await platformFonts(page, `#${e.id}-en`),
    });
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// 축 B/C — 자의 진짜 지면, 그리고 종이
// ─────────────────────────────────────────────────────────────────────────────

/** 자가 실제로 재는 것과 같은 A4 지면을 그린다(제품 DOM 그대로). */
async function paperUrl(): Promise<string> {
  const slots = [
    renderSlot(
      {
        id: "ui09-a",
        content:
          "다음 이차방정식의 두 근의 합을 구하시오. $x^2-5x+6=0$ 이고, 두 근을 각각 $\\alpha,\\ \\beta$ 라 할 때 $\\alpha+\\beta$ 의 값은?",
      },
      1,
    ),
    renderSlot(
      {
        id: "ui09-b",
        content:
          "어떤 수에 $3$ 을 더한 뒤 $4$ 로 나누어야 할 것을 잘못하여 $3$ 을 곱한 뒤 $4$ 를 더했더니 $40$ 이 되었다. 바르게 계산한 값을 구하시오.",
      },
      2,
    ),
  ];
  return writeProbe(
    "font-paper.html",
    await paperDocument([renderPage("first", slots, 1)]),
  );
}

/**
 * 🔴 **선택자는 «직속 글자가 있는» 노드여야 한다.** `CSS.getPlatformFontsForNode` 는
 *    그 노드가 **스스로 그린 글리프**만 센다. `.problemText` 는 마크다운 렌더 결과를
 *    `div.prose > p` 로 감싸므로 직속 글자가 **하나도 없고**, 그러면 빈 배열이 온다.
 *    처음에 그렇게 짜서 축 B 가 「(없음 — 못 셌다)」였다. 빈 배열은 «명조가 아니다»가
 *    아니라 «내가 엉뚱한 노드를 물었다»는 뜻이다 — 그 둘을 안 가르면 제품을 의심하게 된다.
 */
const PAPER_TEXT_SELECTORS = [
  ".problemText p",
  ".conceptText",
  ".questionNumber",
  ".academyName",
] as const;

async function measurePaper(
  page: Page,
  url: string,
): Promise<{
  nodes: Array<{ selector: string; fonts: PlatformFont[] }>;
  fontSize: string;
}> {
  await page.goto(url, { waitUntil: "load" });
  const guard = (await page.evaluate(GUARD_SCRIPT)) as {
    katexOk: boolean;
    a4Height: number;
    fontSize: string;
  };
  assertPaperSane(guard);
  const nodes = [];
  for (const selector of PAPER_TEXT_SELECTORS)
    nodes.push({ selector, fonts: await platformFonts(page, selector) });
  if (nodes.every((n) => n.fonts.length === 0))
    throw new Error(
      "지면의 어느 노드에서도 글꼴을 못 셌다 — 선택자가 직속 글자를 안 가진다. 해석 거부.",
    );
  return { nodes, fontSize: guard.fontSize };
}

/** PDF 에 **박힌** 글꼴 이름을 읽는다 — 종이로 나가는 것에 가장 가까운 증거다. */
function pdfFonts(pdfPath: string): string[] {
  const code = [
    "import fitz, sys",
    "doc = fitz.open(sys.argv[1])",
    "seen = set()",
    "for page in doc:",
    "    for f in page.get_fonts(full=True):",
    "        seen.add(f[3] + '  [' + f[2] + ']')",
    "print(chr(10).join(sorted(seen)))",
  ].join("\n");
  const out = execFileSync("python", ["-c", code, pdfPath], {
    encoding: "utf8",
  });
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ─────────────────────────────────────────────────────────────────────────────
// 축 D — 폴백이 갈리면 자가 얼마나 틀리나
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 같은 글을 **글꼴만 바꿔** 지면 열 폭(364px)에 흘려 넣고 폭·높이·줄 수를 잰다.
 * 자는 이 기계의 글꼴로 눈금을 맞추므로, 다른 기계가 다른 글꼴로 떨어지면
 * **자는 그대로인데 지면만 달라진다** — 그 벌어짐이 여기서 나온다.
 */
const SAMPLES = [
  "다음 이차방정식의 두 근의 합을 구하시오.",
  "어떤 수에 3 을 더한 뒤 4 로 나누어야 할 것을 잘못하여 3 을 곱한 뒤 4 를 더했더니 40 이 되었다. 바르게 계산한 값을 구하시오.",
  "오른쪽 그림과 같이 한 변의 길이가 12cm 인 정사각형 ABCD 에서 점 P 가 변 AB 위를 움직일 때, 삼각형 APD 의 넓이가 최대가 되는 경우를 구하시오.",
  "한 개에 800원인 사과와 한 개에 1200원인 배를 합하여 10개를 사고 9600원을 지불하였다. 이때 산 사과의 개수를 구하시오.",
];

interface WidthRow {
  family: string;
  singleLineWidthPx: number[];
  wrappedHeightPx: number[];
  lineCounts: number[];
}

async function measureWidths(
  page: Page,
  families: string[],
): Promise<WidthRow[]> {
  // 여기도 `style=` 인라인을 쓰면 안 된다 — 위 `specimenHtml` 의 주석 참조.
  const perFamily = families
    .map((family, fi) => `#fam-${fi} { font-family: ${family}; }`)
    .join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
    body{margin:0}
    .col{width:364px;font-size:12.5px;line-height:1.625}
    .one{display:inline-block;white-space:nowrap;font-size:12.5px}
    ${perFamily}
  </style></head><body>${families
    .map(
      (_family, fi) =>
        `<div id="fam-${fi}">` +
        SAMPLES.map(
          (t, si) =>
            `<span class="one" id="one-${fi}-${si}">${t}</span>` +
            `<div class="col" id="col-${fi}-${si}">${t}</div>`,
        ).join("") +
        `</div>`,
    )
    .join("")}</body></html>`;

  await page.goto(writeProbe("font-widths.html", html), { waitUntil: "load" });

  // 선언이 앉았는지 — 안 앉으면 「글꼴이 같아서 폭도 같다」는 거짓말이 나온다.
  const landed = await page.evaluate(
    (n) =>
      Array.from({ length: n }, (_, fi) => {
        const el = document.getElementById(`fam-${fi}`);
        return el ? getComputedStyle(el).fontFamily : "";
      }),
    families.length,
  );
  const flat = (s: string) => s.replace(/["' ]/g, "").toLowerCase();
  families.forEach((family, fi) => {
    if (flat(landed[fi]) !== flat(family))
      throw new Error(
        `폭 측정의 글꼴 선언이 앉지 않았다: 적은 것 [${family}] · 앉은 것 [${landed[fi]}]`,
      );
  });

  return page.evaluate(
    ([families_, count, linePx]) => {
      const rows = [];
      for (let fi = 0; fi < families_.length; fi += 1) {
        const one = [];
        const wrapped = [];
        const lines = [];
        for (let si = 0; si < count; si += 1) {
          const o = document.getElementById(`one-${fi}-${si}`);
          const c = document.getElementById(`col-${fi}-${si}`);
          const ow = o ? o.getBoundingClientRect().width : 0;
          const ch = c ? c.getBoundingClientRect().height : 0;
          one.push(Math.round(ow * 100) / 100);
          wrapped.push(Math.round(ch * 100) / 100);
          lines.push(Math.round(ch / linePx));
        }
        rows.push({
          family: families_[fi],
          singleLineWidthPx: one,
          wrappedHeightPx: wrapped,
          lineCounts: lines,
        });
      }
      return rows;
    },
    [families, SAMPLES.length, 12.5 * 1.625] as const,
  ) as Promise<WidthRow[]>;
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const jsonAt = process.argv.indexOf("--json");
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1000, height: 1200 },
  });

  const report: Record<string, unknown> = {};
  try {
    // ── 축 A (화면 매체)
    const screenNames = await measureNames(page);
    report.screenNames = screenNames;

    /**
     * 🔴 눈금 — **재고 나서, 판정하기 전에.** 측정값은 무조건 찍는다(안 찍으면 실패한 회차의
     *    관측이 통째로 사라진다). 눈금이 안 서면 그 뒤의 «해석»만 거부한다.
     */
    printNames(
      "축 A — 스택의 이름을 이 기계가 무엇으로 푸는가 (화면 매체)",
      screenNames,
    );
    const calSerif = screenNames.find((r) => r.label === "눈금 · Batang")!;
    const calSans = screenNames.find(
      (r) => r.label === "눈금 · Malgun Gothic",
    )!;
    if (calSerif.ko.length === 0 || calSans.ko.length === 0)
      throw new Error(
        "CDP 가 글꼴을 하나도 안 줬다 — 이 자로는 «같다»와 «못 셈»이 안 갈린다. 해석 거부.",
      );
    if (dominant(calSerif.ko) === dominant(calSans.ko))
      throw new Error(
        `눈금 실패 — Batang 과 Malgun Gothic 이 같은 글꼴(${dominant(calSerif.ko)})로 나온다. ` +
          "이 자는 «다르다»를 말할 수 없다. 해석 거부.",
      );
    console.log(
      `\n  ✅ 눈금: Batang(${dominant(calSerif.ko)}) ≠ Malgun Gothic(${dominant(calSans.ko)}) — 이 자는 «다르다»를 말할 수 있다.`,
    );

    // ── 축 B (화면 매체) — 자의 진짜 지면
    const url = await paperUrl();
    const paperScreen = await measurePaper(page, url);
    report.paperScreen = paperScreen;

    // ── 축 A·B 를 인쇄 매체로 다시
    await page.emulateMedia({ media: "print" });
    const printNamesRows = await measureNames(page);
    report.printNames = printNamesRows;
    const paperPrint = await measurePaper(page, url);
    report.paperPrint = paperPrint;

    // ── 축 C — 종이(PDF 에 박힌 이름)
    const outDir = path.join(ROOT, "node_modules/.cache/paper-probe");
    mkdirSync(outDir, { recursive: true });
    const pdfPath = path.join(outDir, `ui09-${process.pid}.pdf`);
    await page.pdf({ path: pdfPath, printBackground: true });
    const embedded = pdfFonts(pdfPath);
    report.pdfFonts = embedded;
    report.pdfPath = pdfPath;

    // ── 축 D — 폴백이 갈릴 때의 벌어짐
    await page.emulateMedia({ media: null });
    const candidates = [
      PAPER_FONTS.serifKR,
      ...STACK.filter((s) => s !== "serif"),
      "serif",
    ];
    const widths = await measureWidths(page, candidates);
    report.widths = widths;

    printNames("축 A′ — 같은 것을 인쇄 매체로 다시", printNamesRows);
    print(paperScreen, paperPrint, embedded, widths);
  } finally {
    await browser.close();
  }

  if (jsonAt >= 0 && process.argv[jsonAt + 1]) {
    writeFileSync(process.argv[jsonAt + 1], JSON.stringify(report, null, 2));
    console.log(`\nJSON: ${process.argv[jsonAt + 1]}`);
  }
}

function printNames(title: string, names: FontRow[]) {
  console.log(`\n══ ${title} ══`);
  for (const row of names) {
    console.log(`  ${row.label}`);
    console.log(`      한글 → ${fontsLabel(row.ko)}`);
    console.log(`      라틴 → ${fontsLabel(row.en)}`);
  }
}

type PaperResult = {
  nodes: Array<{ selector: string; fonts: PlatformFont[] }>;
  fontSize: string;
};

function print(
  paperScreen: PaperResult,
  paperPrint: PaperResult,
  embedded: string[],
  widths: WidthRow[],
) {
  console.log("\n══ 축 B — 자(paperProbe)가 그리는 진짜 A4 지면 ══");
  for (const [label, res] of [
    ["화면 매체", paperScreen],
    ["인쇄 매체", paperPrint],
  ] as const) {
    console.log(`  ${label} (본문 ${res.fontSize})`);
    for (const n of res.nodes)
      console.log(`      ${n.selector.padEnd(18)} → ${fontsLabel(n.fonts)}`);
  }

  console.log("\n══ 축 C — PDF 에 박힌 글꼴(종이에 가장 가까운 증거) ══");
  if (embedded.length === 0) console.log("  (없음)");
  for (const f of embedded) console.log(`  ${f}`);
  console.log(
    "  ⓘ 이름 없는 `Type3` 는 «글꼴을 못 실었다»가 아니라 **글리프 윤곽선으로 박았다**는 뜻이다.\n" +
      "    크로미움은 가변 글꼴(Noto Serif KR = NotoSerifKR-VF.ttf)을 PDF 에 통짜로 못 싣고\n" +
      "    글자마다 Type3 프로시저로 그린다 — **모양은 그 글꼴이 맞다.** 축 B 의 CDP 값과\n" +
      "    대조해서 읽을 것. 이름이 박힌 것(MalgunGothic 등)은 고딕 자리이거나 폴백이다.",
  );

  console.log(
    "\n══ 축 D — 글꼴이 갈리면 지면이 얼마나 벌어지나 (열 폭 364px) ══",
  );
  const base = widths[0];
  for (const row of widths) {
    const dw = row.singleLineWidthPx.map((w, i) => {
      const b = base.singleLineWidthPx[i];
      return b ? `${(((w - b) / b) * 100).toFixed(1)}%` : "—";
    });
    const dh = row.wrappedHeightPx.map(
      (h, i) => `${(h - base.wrappedHeightPx[i]).toFixed(1)}`,
    );
    console.log(`  ${row.family}`);
    console.log(
      `      한 줄 폭 : ${row.singleLineWidthPx.join(" · ")}   (기준 대비 ${dw.join(" · ")})`,
    );
    console.log(
      `      흘린 높이: ${row.wrappedHeightPx.join(" · ")}   (기준 대비 ${dh.join(" · ")}px)`,
    );
    console.log(`      줄 수    : ${row.lineCounts.join(" · ")}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

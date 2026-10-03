/**
 * 기출 1편(정화중 25-2-중간) HWP 해설의 **변환 잔재를 마저 고치고, 제품 렌더러로 판정**한다.
 *
 *   npx tsx scripts/import/exam-paper/fix-exam-solutions.ts <들어온것.json> <나갈것.json>
 *
 * ## 왜 필요한가 — `convert-hwp-spans.py` 가 끝이 아니다
 *
 * 정본 변환기는 `rmbarBD` 를 `\mathrm{\overline{B}}D` 로 낸다. 이건 **B 에만 바가
 * 있는 글자**라 지면에서 선분 BD 가 아니다. 그런데 **KaTeX 는 초록**이다 — 유효한
 * 수식이기 때문이다. 잔재 검사도 렌더 검사도 이 부류를 구조적으로 못 잡는다
 * (CLAUDE.md 2026-08-19 「□ 보다 나쁜 그럴듯한 값」과 같은 자리).
 * 그래서 **모양 자체**를 세는 규칙을 따로 둔다.
 *
 * ## 이 도구가 «아니오»를 낼 수 있는가 (2026-08-23 교훈)
 *
 * ㉠ 규칙마다 **일부러 걸리는 글**(probe)을 달았다. 그 글이 안 바뀌면 그 규칙은
 *    죽은 것이므로 **판정을 거부**한다. 0 은 「깨끗」과 「못 셈」을 안 가른다.
 * ㉡ 고친 뒤 **남은 모양**을 다시 센다(잔재). 그 검사도 probe 로 눈금을 맞춘다.
 * ㉢ 마지막은 **제품 렌더러**(`renderMathHtml`)다 — 규칙을 옮겨 적지 않는다.
 *
 * ## 손으로 고치는 자리 (규칙으로 못 하는 것)
 *
 * 문16 은 정본이 `\frac` 안으로 뒷문장을 통째로 빨아들였다. 이건 패턴이 아니라
 * 한 자리의 사고라 **원문을 보고 손으로** 고치고, 그 옛 글이 **정확히 하나** 있을
 * 때만 바꾼다(없으면 멈춘다 — 조용히 0건이 되지 않게).
 */
import { readFileSync, writeFileSync } from "node:fs";

import { renderMathHtml } from "../../../src/lib/math/renderMathHtml";
import { repairEquationScopes } from "./repairEquationScopes";
import { repairExamText } from "./repairExamText";

interface Row {
  id: string;
  text: string;
}

interface Rule {
  name: string;
  re: RegExp;
  to: string;
  /** 이 규칙이 **반드시 바꿔야 하는** 글. 안 바뀌면 규칙이 죽은 것이다. */
  probe: string;
}

/** 사적 사용 영역 — 어떤 글꼴에서도 뜻이 없다. 아는 것만 옮기고 나머지는 막는다. */
const SIMILAR = "\u{F0040}"; // 문12 「△BDF ▢ △AEF … 닮음비가 2:3」 → ∽
/** 경산여중 문14 「(단, m ▢ BC)」 — 원본 지면을 렌더하니 **∥** 였다(2026-09-12). */
const PARALLEL = "\u{F005A}";

const RULES: Rule[] = [
  // ── 선분 표기: 바가 첫 글자에만 걸린 것을 두 글자 위로 올린다 ──────────────
  {
    name: "rm-bar-split", // \mathrm{\overline{B}}D → \overline{BD}
    re: /\\mathrm\{\\overline\{([A-Za-z])\}\}\s*([A-Za-z])/g,
    to: "\\overline{$1$2}",
    probe: "\\mathrm{\\overline{B}}D",
  },
  {
    // 어깨점이 낀 꼴: `\mathrm{\overline{O}}'H` 는 선분 O′H 다. rm-bar-split 은 바 뒤가
    // **글자**일 때만 걸어서 어깨점이 끼면 못 잡는다(2026-09-13 경일여중 20-stem).
    // 기하 문항에서 O′·A′ 는 흔해 한 편만의 일이 아니다.
    name: "rm-bar-prime", // \mathrm{\overline{O}}'H → \overline{O'H}
    re: /\\mathrm\{\\overline\{([A-Za-z])\}\}\s*(['’′])\s*([A-Za-z])/g,
    to: "\\overline{$1$2$3}",
    probe: "\\mathrm{\\overline{O}}'H",
  },
  {
    // 같은 사고인데 **다음 글자가 분수로 끌려간** 꼴이다: 원문 `CD/1` 이
    // `\mathrm{\overline{C}}\frac{D}{1}` 로 온다(2026-09-13 경구중 문20 세 자리 ·
    // 경일여중 문12 · 계성중 문19). 바는 C 에만 서고 D 는 분자가 되어,
    // rm-bar-split(뒤가 **글자**일 때만 건다)이 못 잡는다. KaTeX 는 초록이라
    // 렌더 검사도 못 잡는다 — 모양으로만 드러나는 부류다.
    name: "rm-bar-frac", // \mathrm{\overline{C}}\frac{D}{1} → \frac{\overline{CD}}{1}
    re: /\\mathrm\{\\overline\{([A-Za-z])\}\}\s*\\frac\{([A-Za-z])\}\{/g,
    to: "\\frac{\\overline{$1$2}}{",
    probe: "\\mathrm{\\overline{C}}\\frac{D}{1}",
  },
  {
    name: "rm-bar-whole", // \mathrm{\overline{BF}} → \overline{BF}
    re: /\\mathrm\{\\overline\{([A-Za-z]{2,})\}\}/g,
    to: "\\overline{$1}",
    probe: "\\mathrm{\\overline{BF}}",
  },
  {
    name: "bar-split", // \overline{A}E → \overline{AE}
    re: /\\overline\{([A-Za-z])\}([A-Za-z])/g,
    to: "\\overline{$1$2}",
    probe: "\\overline{A}E",
  },
  {
    name: "bar-rm-inner", // \overline{\mathrm{AF}} → \overline{AF}
    re: /\\overline\{\\mathrm\{([A-Za-z]+)\}\}/g,
    to: "\\overline{$1}",
    probe: "\\overline{\\mathrm{AF}}",
  },
  {
    name: "bar-inner-space", // \overline{N\,I} → \overline{NI}
    re: /\\overline\{([A-Za-z])\\,\s*([A-Za-z])\}/g,
    to: "\\overline{$1$2}",
    probe: "\\overline{N\\,I}",
  },
  // ── 기호를 \mathrm 이 삼킨 것 ─────────────────────────────────────────────
  {
    name: "rm-angle",
    re: /\\mathrm\{\\angle\s*\}/g,
    to: "\\angle ",
    probe: "\\mathrm{\\angle }BDA",
  },
  {
    name: "rm-triangle",
    re: /\\mathrm\{\\triangle\s*\}/g,
    to: "\\triangle ",
    probe: "\\mathrm{\\triangle }ABH",
  },
  {
    name: "rm-arc",
    re: /\\mathrm\{\\overset\{\\frown\}\{([A-Za-z]+)\}\}/g,
    to: "\\overset{\\frown}{$1}",
    probe: "\\mathrm{\\overset{\\frown}{AB}}",
  },
  // ── 사적 사용 영역 글자 ──────────────────────────────────────────────────
  {
    name: "∥ (평행, U+F005A)",
    re: new RegExp(PARALLEL, "gu"),
    to: "\\parallel ",
    probe: "m\\," + PARALLEL + "\\overline{BC}",
  },
  {
    // 🔴 이 글자가 ∽ 인 근거는 **본문 밖**에 있다 — 바로 다음 문장이
    //    「닮음비가 $2:3$ 이다」라고 말한다(합동이면 비가 1:1 이라 모순).
    name: "pua-similar",
    re: new RegExp(SIMILAR, "gu"),
    to: "\\backsim ",
    probe: "\\triangle BDF" + SIMILAR + "\\triangle AEF",
  },
  // ── 장식 잡음 ────────────────────────────────────────────────────────────
  {
    name: "mathit-strip", // \mathit{2\sqrt{5}k} → 2\sqrt{5}k  (중괄호 한 겹까지)
    re: /\\mathit\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
    to: "$1",
    probe: "\\mathit{3}k",
  },
  {
    // `\mathrm{}` 과 `\mathrm{\,}` — 정본이 서식 span 경계에서 남기는 빈 껍데기다.
    // 지면에서는 안 보이지만 「고쳤다」의 기준을 흐린다.
    name: "rm-empty",
    re: /\\mathrm\{\s*(?:\\,\s*)*\}/g,
    to: "",
    probe: "\\overline{\\mathrm{A}O\\mathrm{}}",
  },
  {
    name: "digit-thin-space", // 7\,5° → 75°   (실제로 문17 에 있었다)
    re: /(\d)\\,\s*(\d)/g,
    to: "$1$2",
    probe: "=7\\,5°",
  },
  {
    name: "thin-space-before-op",
    re: /\\,(?=\s*[=:,])/g,
    to: "",
    probe: "\\overline{AH}\\,=1",
  },
  {
    name: "thin-space-run",
    re: /(?:\\,){2,}/g,
    to: "\\,",
    probe: "a\\,\\,b",
  },
  {
    // HWP 수식의 줄바꿈 `#` — KaTeX 에서 `#` 는 매크로 인수 기호라 수식이 **통째로** 포기된다
    // («KaTeX 가 포기했다 · 지면에 날 \dfrac»). 줄 맞춤으로 뒤따르는 `~`·`\,` 도 같이 걷어 한 줄로 잇는다.
    // 2026-09-13 행 단위 census: 8행(노변·새론·매호·시지 3·안심 2), **적재된 편 0행** — 관행이 아니라 사고다.
    // 처음 한 행(노변중)일 땐 손 고침으로 막았고, 다섯 편으로 늘어 규칙으로 올렸다.
    name: "hwp-hash-linebreak",
    re: /#(?:~|\\,|\s)*/g,
    to: "",
    probe: "A#~\\,=B",
  },
  {
    // 분자의 밑이 분수 밖으로 빠진 꼴: `a\frac{^{2}}{16}` 은 a²/16 이다. 윗첨자 `^` 로 시작하는 분자는
    // 뜻이 없으므로 모양만으로 되돌린다. 2026-09-13 시지중 해설 18 에 다섯 자리, 적재된 편 0.
    name: "frac-caret-numerator",
    re: /([A-Za-z0-9])\\frac\{\^\{([^{}]*)\}\}\{/g,
    to: "\\frac{$1^{$2}}{",
    probe: "a\\frac{^{2}}{16}",
  },
  {
    // 바 **바로 뒤**의 빈 분자: HWP `{rm {bar{AB}} it} over {…}` 을 변환기가 바를 밖에 두고
    // 기울임 스위치(`it`)만 분자로 넣어 `\mathrm{\overline{AB}}\frac{\mathit{}}{…}` 를 낸다
    // (mathit-strip 뒤엔 `\frac{}{…}`). 2026-09-13 census 7자리 · 5편(범물 2·덕화·학산·성화 2
    // + 적재된 강동중 15-c2 — 그때는 손 고침으로 막았다). 이 규칙의 결과는 그 손 고침과 **바이트까지 같다**.
    // ⚠️ 바가 아닌 것 뒤의 빈 분자(`3-\sqrt{7}\frac{}{2}`)는 **안 건드린다** — 분자가 어디까지인지
    //    모양만으로 못 정한다. 그런 자리는 PDF 텍스트층과 대조해 손으로 고친다(매호·경구).
    name: "bar-empty-numerator",
    re: /(\\overline\{[^{}]+\})\\frac\{(?:\\mathit\{\})?\}\{/g,
    to: "\\frac{$1}{",
    probe: "\\overline{AB}\\frac{}{\\overline{OB}}",
  },
];

/** 고친 **뒤에** 남으면 안 되는 모양. 각 항목도 probe 로 눈금을 맞춘다. */
const RESIDUE: { name: string; re: RegExp; probe: string }[] = [
  {
    name: "사적사용영역 글자",
    re: /[-]|[\u{F0000}-\u{FFFFD}]|[\u{100000}-\u{10FFFD}]/u,
    probe: "x" + SIMILAR + "y",
  },
  {
    name: "바가 첫 글자에만",
    re: /\\overline\{[A-Za-z]\}[A-Za-z]/,
    probe: "\\overline{A}B",
  },
  {
    name: "\\mathrm 이 삼킨 바",
    re: /\\mathrm\{\\overline/,
    probe: "\\mathrm{\\overline{A}}B",
  },
  { name: "남은 \\mathit", re: /\\mathit\{/, probe: "\\mathit{x}" },
  { name: "빈 \\mathrm", re: /\\mathrm\{\}/, probe: "A\\mathrm{}B" },
  {
    // 정본이 못 되돌린 HWP 낱말이 수식 안에 날 글자로 남은 것.
    name: "날 HWP 낱말",
    re: /(?<![\\A-Za-z])(?:TRIANGLE|ANGLE|TIMES|DIVIDE|THEREFORE|BECAUSE|RARROW|LEFT|RIGHT|sqrt|bar|over|arch)(?![A-Za-z])/,
    probe: "$rm bar AB TIMES 2$",
  },
];

/** 규칙으로 못 고치는 한 자리 — 원문을 보고 손으로 고친다. `from` 이 딱 하나여야 한다. */
const HAND_JEONGHWA: { id: string; why: string; from: string; to: string }[] = [
  {
    id: "16",
    why:
      "정본의 \\frac 이 뒷문장을 통째로 분모로 빨아들였다 — " +
      "원문은 sin60°=9/(2·AO) 와 AO=3√3 **두 식**이다",
    from:
      "\\sin 60°=\\frac{9}{2\\overline{\\mathrm{A}O\\mathrm{}}," +
      "~\\overline{AO}\\,=3\\sqrt{3}}",
    to: "\\sin 60°=\\frac{9}{2\\overline{AO}},~\\overline{AO}=3\\sqrt{3}",
  },
];

/**
 * 손 고침은 **편마다 다르다** — `--config <exam.json>` 이 있으면 그 편의 것만 쓴다.
 * 없으면 첫 편(정화중)의 것 — 그 편을 다시 돌릴 때 옛 동작을 지킨다.
 * 🔴 첫 편의 문16 고침이 둘째 편의 문16 해설에 걸리면 「옛 글이 0개」로 멈춘다(동도중이 그렇다).
 */
const CONFIG_ARG = process.argv.indexOf("--config");
const HAND: { id: string; why: string; from: string; to: string }[] =
  CONFIG_ARG > 0
    ? ((
        JSON.parse(readFileSync(process.argv[CONFIG_ARG + 1]!, "utf-8")) as {
          hand?: { id: string; why: string; from: string; to: string }[];
        }
      ).hand ?? [])
    : HAND_JEONGHWA;

function applyRules(s: string): string {
  let out = s;
  for (const r of RULES) out = out.replace(r.re, r.to);
  // 규칙이 서로를 열어 준다(\mathrm 을 벗기면 \overline{A}B 가 드러난다) —
  // 더 안 바뀔 때까지 돌린다.
  for (let i = 0; i < 6; i += 1) {
    const next = RULES.reduce((acc, r) => acc.replace(r.re, r.to), out);
    if (next === out) break;
    out = next;
  }
  return repairExamText(repairEquationScopes(out));
}

function gauge(): void {
  const deadRules = RULES.filter(
    (r) => r.probe.replace(r.re, r.to) === r.probe,
  );
  if (deadRules.length > 0) {
    throw new Error(
      `[중단] 눈금이 안 걸리는 규칙: ${deadRules.map((r) => r.name).join(", ")} — 판정을 거부한다`,
    );
  }
  const deadResidue = RESIDUE.filter((r) => !r.re.test(r.probe));
  if (deadResidue.length > 0) {
    throw new Error(
      `[중단] 눈금이 안 걸리는 잔재 검사: ${deadResidue.map((r) => r.name).join(", ")} — 판정을 거부한다`,
    );
  }
  // 잔재 검사가 **고친 뒤**에도 살아 있는가 — 규칙이 probe 를 지워 버리면
  // 그 잔재 검사는 이 파이프라인에서 영영 0 이다. 그건 «못 셈»이지 «깨끗»이 아니다.
  console.log(
    `눈금 통과 — 규칙 ${RULES.length}개 · 잔재 검사 ${RESIDUE.length}개 전부 살아 있다`,
  );
}

function renderProblems(text: string): string[] {
  const html = renderMathHtml(text);
  const bad: string[] = [];
  if (html.includes("math-raw")) bad.push("KaTeX 가 포기했다(.math-raw)");
  if (html.includes("#cc0000")) bad.push("붉은 글씨로 나간다");
  if (html.includes("katex-error")) bad.push("katex-error");
  const plain = html.replace(/<[^>]+>/g, "");
  const raw = plain.match(
    /\\(?:frac|dfrac|sqrt|overline|angle|triangle|mathrm|times|div|therefore|backsim|overset|left|right)/,
  );
  if (raw) bad.push(`지면에 날 LaTeX: ${raw[0]}`);
  return bad;
}

function main(): void {
  gauge();
  const [, , inPath, outPath] = process.argv;
  if (!inPath || !outPath)
    throw new Error("사용: <들어온것.json> <나갈것.json>");
  const rows: Row[] = JSON.parse(readFileSync(inPath, "utf-8"));

  const out: Row[] = [];
  let handDone = 0;
  for (const row of rows) {
    let t = applyRules(row.text);
    for (const h of HAND.filter((x) => x.id === row.id)) {
      const fixed = applyRules(h.from);
      const n = t.split(fixed).length - 1;
      if (n !== 1) {
        throw new Error(
          `[중단] 문${row.id} 손 고침 «${h.why}» 의 옛 글이 ${n}개다 — 하나여야 한다`,
        );
      }
      t = t.split(fixed).join(h.to);
      handDone += 1;
    }
    out.push({ ...row, text: t });
  }
  // 손 고침은 그 id 의 행이 **이 파일에 있을 때만** 해당한다(해설 파일 · 발문 파일이
  // 따로 돌기 때문이다). 있는데 안 걸렸으면 멈춘다 — 조용히 0건이 되지 않게.
  const applicable = HAND.filter((h) => rows.some((r) => r.id === h.id)).length;
  if (handDone !== applicable) {
    throw new Error(`[중단] 손 고침 ${applicable}개 중 ${handDone}개만 걸렸다`);
  }
  if (applicable === 0) console.log("이 파일에는 손 고침 대상이 없다");

  let bad = 0;
  for (const row of out) {
    const hits = RESIDUE.filter((r) => r.re.test(row.text)).map((r) => r.name);
    const render = renderProblems(row.text);
    if (hits.length > 0 || render.length > 0) {
      bad += 1;
      console.log(`[문${row.id}] ${[...hits, ...render].join(" · ")}`);
      for (const r of RESIDUE) {
        const m = row.text.match(new RegExp(r.re.source, "gu"));
        if (m) console.log(`     ↳ ${r.name}: ${[...new Set(m)].join(", ")}`);
      }
    }
  }
  writeFileSync(outPath, JSON.stringify(out, null, 1), "utf-8");
  console.log(
    `\n해설 ${out.length}편 · 손 고침 ${handDone}자리 · 남은 결함 ${bad}편`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

main();

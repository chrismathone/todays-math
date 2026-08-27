/**
 * 「역슬래시가 한 겹인 LaTeX」가 **지면에 날 글자로 나가는가** — 실물로 찍는다.
 *
 *   지면 : 그림과 같이 angle C=90^circ 인 직각삼각형 ABC 에서 …
 *   원본 : `` `\angle C=90^\circ` `` 라고 쓴 **TS 템플릿 리터럴**
 *
 * 자바스크립트가 `\a` 의 역슬래시를 **읽으면서 버린다.** 그래서 소스에는 분명히
 * `\angle` 이 있는데 문자열에는 `angle` 만 남는다. `String.raw` 나 `\\` 를 안 쓰면
 * 조용히 그렇게 된다.
 *
 * 🔴 **어떤 기존 관문도 이 부류를 못 본다.**
 *   · tsc      — 유효한 문자열이다
 *   · vitest   — 값이 맞으므로 초록이다
 *   · KaTeX    — `angle` 은 «글자 a-n-g-l-e» 로 성공적으로 렌더된다
 *   · 값 검산  — 수식의 «뜻»이 아니라 «값»을 본다
 * 결함이 스스로 신고하지 않는 자리다(2026-08-19 「□ 보다 나쁜 그럴듯한 값」과 같은 부류).
 *
 * 그리고 **세 갈래가 따로 밟았다** — 갈래 A 22유형 · B 448자리 · main 16문항.
 * 사람이 기억할 일로 두면 그 사람이 잊는 날 그대로 나간다. 그래서 관문에 세운다.
 *
 * ⚠️ 열쇠를 **손 목록으로 짓지 않는다.** 수식 `$…$` 안에서 「역슬래시가 앞에 없는
 *    영문 두 글자 이상 덩어리」를 **전부** 세고, 그중 실제 LaTeX 명령인 것만 남긴다.
 *    아래 `COMMANDS` 는 **걸러 내는** 쪽이라 빠진 이름이 있어도 과대평가가 안 된다
 *    (놓칠 뿐이다 — 늘리는 것은 언제나 안전하다).
 *
 * ⚠️ `{` 바로 뒤는 뺀다 — `\begin{cases}` 의 `cases`, `\mathrm{cm}` 의 `cm` 은
 *    **명령의 인자**라 역슬래시가 없는 게 옳다. 이걸 안 걸렀다가 연립방정식
 *    17유형이 거짓으로 걸렸다.
 */
import {
  generateMiddleProblem,
  registeredTypes,
} from "../../src/lib/middle/generate";

const SEEDS = [20260827, 7, 424242];
const VARIANTS = 2;

/**
 * 실제 LaTeX 명령 이름. **걸러 내는** 목록이라 상한이 아니다 —
 * 여기 없는 명령은 「못 잡는다」일 뿐 「없다」가 아니다.
 */
const COMMANDS = new Set([
  "angle",
  "circ",
  "overline",
  "underline",
  "triangle",
  "square",
  "dfrac",
  "frac",
  "tfrac",
  "sqrt",
  "times",
  "div",
  "cdot",
  "pm",
  "mp",
  "mathrm",
  "text",
  "textbf",
  "mathbf",
  "degree",
  "parallel",
  "perp",
  "sim",
  "cong",
  "equiv",
  "approx",
  "propto",
  "le",
  "ge",
  "leq",
  "geq",
  "ne",
  "neq",
  "ll",
  "gg",
  "pi",
  "theta",
  "alpha",
  "beta",
  "gamma",
  "delta",
  "omega",
  "phi",
  "sin",
  "cos",
  "tan",
  "log",
  "ln",
  "lim",
  "sum",
  "prod",
  "int",
  "left",
  "right",
  "begin",
  "end",
  "cases",
  "array",
  "matrix",
  "Rightarrow",
  "Leftarrow",
  "rightarrow",
  "leftarrow",
  "to",
  "mapsto",
  "cup",
  "cap",
  "subset",
  "in",
  "notin",
  "emptyset",
  "infty",
  "dots",
  "cdots",
  "ldots",
  "quad",
  "qquad",
  "overrightarrow",
]);

const CHUNK = /\$([^$]*)\$/g;
const BARE = /(?<![\\{])\b([A-Za-z]{2,})/g;

/** 이 글에 날 글자 명령이 있으면 그 이름들을 낸다. */
export function bareCommands(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(CHUNK)) {
    for (const r of m[1]!.matchAll(BARE)) {
      if (COMMANDS.has(r[1]!)) out.push(r[1]!);
    }
  }
  return out;
}

// ────────────────────────────────────────────────────────────────────────
// 눈금 — 양성과 음성을 **둘 다** 댄다. 양성만 대면 지어냄이 구조적으로 0이 된다.
// ────────────────────────────────────────────────────────────────────────
const GAUGE: [name: string, text: string, catches: boolean][] = [
  ["역슬래시가 죽은 각·도", String.raw`$angle C=90^circ$`, true],
  ["역슬래시가 죽은 선분", String.raw`$overline{AB}=5$`, true],
  ["역슬래시가 죽은 분수", String.raw`$x=dfrac{1}{2}$`, true],
  ["🔴 제대로 쓴 각·도는 안 잡는다", String.raw`$\angle C=90^\circ$`, false],
  [
    "🔴 명령의 인자는 안 잡는다 — `\\begin{cases}` 의 cases",
    String.raw`$\begin{cases}x=1\end{cases}$`,
    false,
  ],
  [
    "🔴 단위도 인자다 — `\\mathrm{cm}` 의 cm",
    String.raw`$5\,\mathrm{cm}$`,
    false,
  ],
  ["🔴 한 글자 변수는 명령이 아니다", String.raw`$x+y=z$`, false],
  ["🔴 수식 밖의 글은 안 본다", "각 $ABC$ 의 크기를 구하시오.", false],
  ["🔴 제대로 쓴 근호·곱셈은 안 잡는다", String.raw`$\sqrt{2}\times3$`, false],
];

function selftest(): void {
  let bad = 0;
  for (const [name, text, want] of GAUGE) {
    const got = bareCommands(text).length > 0;
    const ok = got === want;
    if (!ok) bad += 1;
    console.log(
      `  ${ok ? "✅" : "❌"} ${name} — 기대 ${want ? "잡는다" : "안 잡는다"}` +
        ` / 실제 ${got ? "잡는다" : "안 잡는다"}`,
    );
  }
  const pos = GAUGE.filter((g) => g[2]).length;
  console.log(
    `\n${bad === 0 ? "✅" : "🔴"} 눈금 ${GAUGE.length}건` +
      `${bad === 0 ? " 전부 맞다" : ` 중 ${bad}건 어긋남`}` +
      ` (양성 ${pos} · 음성 ${GAUGE.length - pos})`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

function main(): void {
  if (process.argv.includes("--selftest")) return selftest();

  const types = registeredTypes();
  const rows: { key: string; where: string; token: string; sample: string }[] =
    [];
  let tried = 0;
  let threw = 0;

  for (const t of types) {
    for (const seed of SEEDS) {
      for (let v = 0; v < VARIANTS; v += 1) {
        tried += 1;
        let p;
        try {
          p = generateMiddleProblem(t.key, seed, v);
        } catch {
          threw += 1;
          continue;
        }
        for (const [where, text] of [
          ["발문", p.content],
          ["정답", p.answer],
          ["해설", p.solution ?? ""],
        ] as const) {
          for (const token of bareCommands(text)) {
            const chunk = [...text.matchAll(CHUNK)].find(
              (m) => bareCommands(m[0]!).length > 0,
            );
            rows.push({
              key: t.key,
              where,
              token,
              sample: (chunk?.[0] ?? text).slice(0, 70),
            });
          }
        }
      }
    }
  }

  const byKey = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byKey.has(r.key)) byKey.set(r.key, []);
    byKey.get(r.key)!.push(r);
  }

  console.log(
    `등록 유형 ${types.length}개 × 씨앗 ${SEEDS.length} × 변형 ${VARIANTS}` +
      ` = 시도 ${tried} (던진 것 ${threw})`,
  );
  console.log(`날 글자가 실린 유형 ${byKey.size}개 · 자리 ${rows.length}개`);

  if (byKey.size === 0) {
    console.log("✅ 깨끗하다.");
    return;
  }
  for (const [key, list] of [...byKey].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    const tokens = [...new Set(list.map((l) => l.token))].join(", ");
    console.log(`  ❌ ${key} — ${list.length}자리 [${tokens}]`);
    console.log(`       [${list[0]!.where}] ${list[0]!.sample}`);
  }
  console.log(
    "\n고치는 법: TS 템플릿 리터럴에서 `\\angle` 은 역슬래시가 **먹힌다**." +
      " `String.raw` 를 쓰거나 `\\\\angle` 로 적어라.",
  );
  process.exit(1);
}

main();

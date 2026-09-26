/**
 * KaTeX 가 **수식 모드에서 붉은 글자 없이 그리는** 명령 이름 전수.
 *
 * 입구 후보정(`src/lib/math/normalizeMathgenText.ts`)이 구분자 밖에 홀로 선
 * `\명령` 을 수식으로 감쌀지 가를 때 쓰는 목록의 **원천**이다. 손으로 쓴 140개 목록
 * 밖 명령(`\pi` `\le` `\quad` `\lvert` …) 775개가 날 글자로 새던 것을 막으려고
 * 만들었다(2026-09-26 후보정 감사 — census-commands).
 *
 * KaTeX 는 명령 표를 공개하지 않는다(`__parse` 같은 내부 API 만 있다). 그래서
 * 배포본 `katex.js` 의 문자열 리터럴 `"\\name"` 을 모두 뽑고, 공개 API
 * `renderToString` 으로 `\name` · `\name{x}` · `\name{x}{y}` 중 하나라도 붉은 글자
 * 없이 그려지는 것만 남긴다. 결과는 `gen-katex-commands.ts` 가 제품 상수 파일로
 * 굳히고, 동기화 시험이 설치된 KaTeX 와 어긋나면 운다.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * KaTeX 가 알아도 **산문 속 역슬래시를 수식으로 끌어들일 증거로는 쓰지 않는** 이름.
 * - 한 글자(`\S` `\P` `\R` `\u` `\r` `\v` …): JSON 이스케이프 잔재(`\r` `é`)·
 *   정규식·경로와 겹친다. 수식에서 쓰는 한 글자 명령은 입구가 감쌀 일이 드물다.
 * - 조판 제어(`\relax` `\newline` `\renewcommand` …)와 글자 크기(`\small` …):
 *   수식 내용이 아니다 — 산문에서 만나면 무엇을 뜻했는지 모른다.
 */
export const EXCLUDED_COMMANDS = new Set([
  "DOTSB",
  "DOTSI",
  "DOTSX",
  "expandafter",
  "noexpand",
  "nonumber",
  "notag",
  "relax",
  "show",
  "newline",
  "renewcommand",
  "providecommand",
  "Huge",
  "LARGE",
  "Large",
  "footnotesize",
  "huge",
  "large",
  "normalsize",
  "scriptsize",
  "sixptsize",
  "small",
  "tiny",
]);

export interface KatexCommandCensus {
  version: string;
  /** 붉은 글자 없이 그려지는 이름 전부(제외 목록을 뺀 뒤), 가나다·ASCII 순. */
  names: string[];
  /** 그중 `x \name y` 에서 관계(mrel)·이항(mbin) 기호로 서는 것 — 왼쪽 피연산자가 있다. */
  infix: string[];
}

export function censusKatexCommands(repoRoot: string): KatexCommandCensus {
  const require = createRequire(path.join(repoRoot, "package.json"));
  const katex = require("katex") as typeof import("katex");
  const version = (require("katex/package.json") as { version: string })
    .version;
  const dist = readFileSync(
    path.join(repoRoot, "node_modules/katex/dist/katex.js"),
    "utf8",
  );
  const literal = /"\\\\([A-Za-z]+)"/g;
  const seen = new Set<string>();
  for (const match of dist.matchAll(literal)) seen.add(match[1]);

  const renders = (tex: string) => {
    try {
      const html = katex.renderToString(tex, {
        throwOnError: true,
        strict: false,
      });
      return !/katex-error|#cc0000/i.test(html);
    } catch {
      return false;
    }
  };
  // KaTeX 는 모르는 글자 폭을 console.warn 으로, `\message` 류는 console.log 로
  // 찍는다 — 전수 중 수백 줄이 난다.
  const { warn, log, error } = console;
  console.warn = () => {};
  console.log = () => {};
  console.error = () => {};
  try {
    const names = [...seen]
      .filter((name) => name.length > 1 && !EXCLUDED_COMMANDS.has(name))
      .filter(
        (name) =>
          renders(`\\${name}`) ||
          renders(`\\${name}{x}`) ||
          renders(`\\${name}{x}{y}`),
      )
      .sort();
    const infix = names.filter((name) => {
      try {
        const html = katex.renderToString(`x\\${name} y`, { strict: false });
        return /class="(?:mrel|mbin)"/.test(html);
      } catch {
        return false;
      }
    });
    return { version, names, infix };
  } finally {
    console.warn = warn;
    console.log = log;
    console.error = error;
  }
}

/** 제품 상수 파일의 본문 — 생성기와 동기화 시험이 **같은 함수**로 만든다. */
export function renderKatexCommandsModule(census: KatexCommandCensus): string {
  const wrap = (names: string[]) => {
    const lines: string[] = [];
    let line = "";
    for (const name of names) {
      if (line && line.length + name.length + 1 > 76) {
        lines.push(line);
        line = "";
      }
      line = line ? `${line} ${name}` : name;
    }
    if (line) lines.push(line);
    return lines.map((text) => `  "${text} "`).join(" +\n");
  };
  return [
    "/**",
    " * 생성물 — 손으로 고치지 말 것. `npx tsx scripts/qa/gen-katex-commands.ts` 가 만든다.",
    " * 원천·제외 규칙: `scripts/qa/katexCommandCensus.ts`.",
    " * 동기화 시험: `src/__tests__/unit/katexCommands.sync.test.ts` (KaTeX 를 올리면 운다).",
    " *",
    " * KaTeX 가 수식 모드에서 붉은 글자 없이 그리는 명령 이름(역슬래시 뺌, 공백 구분).",
    " */",
    `export const KATEX_COMMANDS_VERSION = "${census.version}";`,
    "",
    "export const KATEX_COMMAND_NAMES =",
    `${wrap(census.names)};`,
    "",
    "/** `x \\name y` 에서 관계·이항 기호로 서는 것 — 왼쪽 피연산자를 같이 감싼다. */",
    "export const KATEX_INFIX_NAMES =",
    `${wrap(census.infix)};`,
    "",
  ].join("\n");
}

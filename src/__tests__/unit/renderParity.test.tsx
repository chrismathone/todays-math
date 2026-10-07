/**
 * 렌더 결과 동일성 잠금 (성능 수리 B 전용).
 *
 * 이 저장소의 성능 수리는 **"같은 결과를 덜 계산해서 낸다"** 만 허용된다 (D-07).
 * 메모이제이션·알고리즘 교체가 수식 렌더 HTML 을 한 글자라도 바꾸면 실패다.
 *
 * 기대 해시(`src/__tests__/fixtures/renderParity.json`)는 성능 수리 **이전**
 * 커밋(2c3c6d0d)의 코드로 뽑았다. 이 파일이 빨개지면 회귀이지 기대값 갱신
 * 대상이 아니다 — 화면·지면이 실제로 달라졌다는 뜻이다.
 *
 * ── 변경 이력 ─────────────────────────────────────────────────────────────
 * 2026-09-21 **격자 칸 세로 맞춤을 기준선으로 바꿨다** (트랙 51, 원장님 확정 «추천대로 가»).
 *   분수 칸 옆 글 칸·보기 번호가 몇 px 높게 서던 것 — 한글과 같아진다. 그림 칸은 위쪽 그대로.
 *   더한 클래스: 〈보기〉 격자 `items-baseline` · 칸 `has-[img]:self-start`, 보기 번호 격자
 *   `items-baseline` · 칸 `items-start`→`items-baseline has-[img]:items-start has-[img]:self-start`.
 *   바뀐 키 6개(원문자-보기·숫자-보기·상자-보기-자모·상자-조건-발문꼬리·상자-긴보기-1열·corpus).
 *   근거: 렌더 결과에서 **그 클래스만 옛것으로 되돌려** 뽑은 해시가 20키 전부 이전 기준과 같다
 *   (탐침으로 확인). 같은 날 지면 상자가 `BoxQuoteCard`(좁은 단 판정)로 옮겨 갔는데 — 서버 렌더에서는
 *   속성이 하나도 안 붙어 마크업이 같다는 것도 이 탐침이 보였다.
 * 2026-09-21 **여러 열 상자 격자에 HWPX 격자 표시(`data-hwpx-grid`)를 붙였다** (트랙 46).
 *   HWPX writer 가 격자 한 행을 한 문단으로, 칸 차례대로 묶게 하려는 표시다 — 원장님 9번 저장본이
 *   한글에서 (바)가 (마)보다 먼저 나왔다. 바뀐 키는 2열 상자 **둘뿐**(`상자-보기-자모`·`상자-조건-발문꼬리`).
 *   근거: 새 HTML 에서 ` data-hwpx-grid=""` 만 지우고 해시를 뽑으면 두 키 모두 **기준과 같다**
 *   (탐침으로 확인). 즉 그 속성 말고는 한 글자도 안 바뀌었다. 1열 상자(`상자-긴보기-1열`)는 불변.
 *   같은 날 **보기 번호 격자(`ProblemContent`)에도 같은 표시**를 붙였다 — 분수 보기가 한글에서 번호와
 *   다른 줄로 떨어지던 것(하네스 실측). 그래서 보기가 있는 키가 더 바뀌었다(원문자-보기·숫자-보기·
 *   상자-보기-자모·상자-긴보기-1열·corpus). 근거: 렌더 결과에서 ` data-hwpx-grid=""` 만 지우고 뽑은
 *   20키가 **트랙 46 이전 기준(8fb45205^ 의 fixture)과 전부 같다**(diff 0).
 * 2026-09-19 **바로 아래 09-14 항목이 남긴 «드리프트»의 정체를 찾았다 — 수식이 아니라 글꼴 스택.**
 *   커밋별로 해시를 뽑아 보니(08-27 f1be7e57 → 09-19, 렌더 경로를 건드린 커밋 32개) 바뀐 곳은
 *   **4ea78278(09-08 «시험지 명조 자체 적재»)** 한 커밋뿐이었다. 그 커밋은 `PAPER_FONTS.serifKR`
 *   맨 앞에 `var(--font-noto-serif-kr), ` 를 붙였고, `PaperProblemView` 가 그 문자열을 인라인
 *   `font-family` 로 싣기 때문에 **paper 13키 + corpus 가 전부** 바뀌었다. `math:*` 4키는
 *   지면 글꼴을 안 써서 그대로다 — 폭발 반경이 정확히 «지면 글꼴을 싣는 자리»다.
 *   근거(HEAD 에서 잰 것): 그 앞머리 한 줄만 잠시 빼고 돌리면 드리프트 14키가 **전부 기준과
 *   같아지고**, 대신 그 뒤(8749b02c)에 기준을 새로 뽑은 상자 2키만 달라진다.
 *   즉 수식 렌더 HTML 은 한 글자도 안 바뀌었다. 의도된 지면 변경이라 기준을 다시 뽑았다
 *   (바뀐 키 14개 = 실패하던 14개, 나머지 6개 불변).
 *   ⚠️ 이 시험은 글꼴 스택도 문다 — 스택을 바꾸면 paper 키 전부가 빨개지는 것이 정상이다.
 *      그때는 이번처럼 «앞머리만 빼면 기준과 같은가»로 수식 쪽 변화가 섞였는지부터 가른다.
 * 2026-09-14 조건 상자 수리: 라벨만 작은 보통 굵기로 가운데에 놓고 본문을
 * 왼쪽 정렬로 분리한다. compact quote 회귀는 conditionExport.test.tsx가 지킨다.
 * 바뀐 키는 상자-보기-자모 / 상자-조건-발문꼬리 둘뿐이다. 이 체크아웃의
 * 나머지 paper/corpus 해시 드리프트는 HEAD 렌더러로도 재현되어 갱신하지 않았다.
 * 2026-08-17 렌더 수리 B(`<보기>`·`<조건>` 상자): 케이스 **3개를 추가**했다
 *   (`상자-보기-자모` / `상자-조건-발문꼬리` / `상자-긴보기-1열`).
 *   기존 14개 키의 해시는 **하나도 바뀌지 않았다** — 그것이 "상자 없는 문항의
 *   렌더는 불변"이라는 약속의 증거다. 상자 렌더를 고칠 때 이 셋이 빨개지는 것은
 *   정상이지만, **기존 14개가 같이 빨개지면 회귀다.** 갱신 전에 어느 쪽이
 *   빨개졌는지부터 확인할 것.
 *
 * 2026-08-18 **이 파일 자체가 고장나 있었다.** 케이스 문자열의 역슬래시를 한 번만
 *   써서 TypeScript 가 escape 로 먹었다 — `"$\frac…"` = 폼피드 + `rac`,
 *   `"$0.\overline{3}$"` = `$0.overline{3}$`. 그래서
 *     · `분수-유한소수`·`원문자-보기`·`극한-limits` 는 **붉은 글씨를 잠그고** 있었고
 *     · `순환소수-점표기` 는 순환마디 경로를 **한 번도 지나가지 않았다**.
 *   해시는 내내 초록이었다. 문자열을 바로잡고 해시를 다시 뽑았다 —
 *   **12개가 바뀌고 6개(역슬래시가 없던 것)는 그대로다.** 이 12개는 회귀가 아니라
 *   «드디어 제 입력을 보게 된» 것이다. 새 키 둘(`순환마디-두점`·`호-widehat`)은
 *   전처리가 만드는 `\htmlClass` 경로를 잠근다.
 *   같은 사고를 다시 침묵시키지 않으려고 아래 «붉은 글씨 금지» 검사를 붙였다.
 *
 * 2026-08-19 **R2 (D-58) — 줄 중간 보기 마커를 보기 경계로.** 원장님 확정으로
 *   제품 파서가 「보기 다섯이 한 줄에 붙은」 문항을 다시 가른다. 바뀐 키는
 *   **`corpus:mock-problems` 하나뿐**이고 나머지 19개는 그대로다 — 상자·수식·
 *   순환소수 경로가 안 바뀌었다는 증거다.
 *   mock 30건 중 R2 가 건드리는 것은 **2건**이며, 둘 다 보기가 발문에 통째로
 *   붙어 **0칸**이던 것이 **4칸**이 됐다(`…000002` 정답 ②, `…000025` 정답 ②·④).
 *   즉 지면이 «달라진» 게 아니라 **없던 보기가 생겼다.** 회귀가 아니다.
 *
 * 2026-08-24 **가분수 → 대분수 자동 변환 제거** (원장님 확정 「중등은 대분수 변환하지
 *   말 것」). 바뀐 키는 **`corpus:mock-problems` 하나뿐**이고 나머지 19개는 그대로다.
 *   mock 30문항 중 걸린 자리는 **3곳**이며 전부 「순환소수를 분수로」 답이다:
 *     · 정답 `13/6` 이 지면에 **`2 1/6`** 으로 나갔다 (정답지와 다른 표기)
 *     · 해설 `195/90 = 13/6` 이 **`2 15/90 = 2 1/6`** 이 됐다
 *     · 정답 `11/9` 가 **`1 2/9`** 로 나갔다
 *   즉 지면이 «달라진» 게 아니라 **답이 원래 모양으로 돌아왔다.** 회귀가 아니다.
 *   근거·측정: `docs/planning/tracks/mixed-number-preprocess-20260823.md`,
 *   지키는 검사: `src/__tests__/unit/mixedNumberPolicy.test.ts`
 *
 * 2026-08-25 **상자 라벨 = 가운데 · 홑화살괄호 `〈보기〉`** (D-108, 원장님 위임).
 *   바뀐 키는 **둘뿐**이다 — `paper:상자-보기-자모` · `paper:상자-조건-발문꼬리`.
 *   **왜 상자 픽스처 넷 중 둘만인가**(갱신 전에 반드시 세어 볼 것):
 *     · `보기상자-blockquote` 는 `<보기>` 마커가 **없는** 맨 인용문이라 `!header`
 *       가지로 빠진다 — 그릴 라벨이 없다.
 *     · `상자-긴보기-1열` 은 이름과 달리 **상자가 아니라 보기(선택지) 목록**이다
 *       (`1. …` `2. $b$`). 역시 라벨이 없다.
 *   즉 「라벨이 있는 둘만 바뀌었다」가 이번 변경의 정확한 폭발 반경이다.
 *   본문 규약(`BOX_HEADER_RE` = ASCII `<보기>`)은 **안 바꿨다** — 지면에 그리는
 *   순간에만 `〈 〉` 로 바꾼다(`MarkdownRenderer` 의 `LABEL_OPEN`).
 *
 * 2026-08-27 **이중 개행이 «문장이 끝난 자리»에서 문단이 됐다** (원장님 지적
 *   「두 수의 합을 구하시오. 485, 342 … 줄바꿈 되어있지 않고」).
 *   `collapseWhitespace` 가 이중 개행을 **전부** 공백으로 접던 것을,
 *   `keepMeaningfulParagraphs` 가 「앞이 문장부호로 끝났으면 문단」으로 갈랐다.
 *   **바뀐 키는 둘뿐이다.** 갱신 전에 왜인지 셌다:
 *     · `보기상자-blockquote` — 발문 `…개수는?` 뒤 `\n\n` 이 살아나 두 `> ` 줄이
 *       **한 인용 상자**가 된다. 전에는 첫 `>` 가 발문에 붙어 **글자 그대로** 나갔다.
 *       (렌더 HTML 로 확인함 — 상자 하나에 `f(1)=2`·`f(2)=3` 둘 다 들어간다.)
 *     · `꼬리중복-OCR결함` — 발문 `…것은?` 뒤가 문단이 된다. 중복 제거는 그대로다
 *       (그 알맹이는 `parseProblemContent.test.ts` 가 따로 단언한다).
 *     · **`corpus:mock-problems`(넓은 그물)는 불변** — 폭발 반경이 좁다는 가장 강한 근거.
 *   공유 DB 전량 실측: 발문이 바뀐 문항 **393건 / 17,513**, **보기는 0건**.
 *   147가지 모양을 전부 눈으로 봤고 전부 「발문 끝 + 나열 대상」이었다.
 *   ⚠️ 열쇠를 「이중 개행이면 무조건 문단」으로 넓히면 OCR 이 문장 한가운데를
 *      끊어 놓은 자리(`자연수\n\n$m,n$\n\n의 개수는?`)가 갈라진다 — 그 시험이 지킨다.
 *
 * 2026-08-25 **홑 개행이 지면의 줄바꿈이 됐다** (원장님 지적 「문제은행에서 줄바꿈
 *   안되는 문제들이 여전히 존재」). `collapseWhitespace` 가 `/\\n+/` 로 홑 개행까지
 *   녹이던 것을 `/\\n{2,}/` 로 좁혔고(OCR **이중** 개행만 접는다), 렌더러가
 *   `applyHardBreaks` 로 하드 브레이크를 굳힌다.
 *   **바뀐 키는 하나뿐이다 — `paper:보기상자-blockquote`.** 갱신 전에 왜인지 셌다:
 *     · 그 픽스처만 본문에 **맨 마크다운 인용문**(`> $f(1)=2$`)을 담고 있다. 두 `>` 줄
 *       사이의 홑 개행이 이제 살아남아 둘째 줄이 진짜 인용문이 된다(전에는 한 줄로 붙어
 *       `>` 가 **글자 그대로** 나갔다).
 *     · 나머지 19키는 홑 개행이 없거나(한 줄 발문) 이미 `\\n\\n` 문단이라 불변.
 *     · **`corpus:mock-problems`(넓은 그물)도 불변**이다 — 이게 「폭발 반경이 좁다」는
 *       가장 강한 근거다. Mock 문항 전량의 본문·정답·해설이 한 글자도 안 바뀌었다.
 *   실데이터에서 줄머리 `> ` 를 가진 문항은 **1건**(그마저 격리)이라 이 키는 사실상
 *   픽스처 전용이다. 그래서 기준을 갱신했다.
 *   ⚠️ `escapePlainLeaders` 에 `>` 를 넣으면 이 키가 **다시** 빨개진다 — 그게 이 키의
 *      진짜 값어치다(변이로 확인).
 *
 * 2026-08-25 **이 파일에 날 제어 바이트가 들어 있었다.** 해시 구분자가
 *   `.join("\u0000")` 이 아니라 **NUL 바이트 그 자체**였다(0x01 도). heredoc 이
 *   역슬래시를 먹은 자국이다. 그래서 `grep` 이 이 파일을 「Binary file matches」
 *   로 읽어 **픽스처를 못 보여 줬다** — 위 「어느 키가 왜 바뀌었나」를 세려던
 *   사람을 실제로 막았다. 이스케이프로 바꿨고, **해시는 하나도 안 바뀌는 것을
 *   확인**했다(값이 같으니 당연하지만, 그 확인이 이 수리의 유일한 근거다).
 *
 * 재생성(표기 자체를 의도적으로 바꾼 경우에만):
 *   PARITY_DUMP=1 npx vitest run src/__tests__/unit/renderParity.test.tsx
 *
 * (그림 `<img>` 속성은 여기서 잠그지 않는다. 지연 로딩 속성은 렌더 결과가 아니라
 *  로딩 정책이라 `problemFigures` 테스트가 따로 검증한다.)
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MathText } from "@/components/math/MathText";
import { PaperProblemView } from "@/components/print/PaperProblemView";
import { MOCK_PROBLEMS } from "@/mocks/data/problems";

const FIXTURE = path.join(
  process.cwd(),
  "src/__tests__/fixtures/renderParity.json",
);

const DUMP = Boolean(process.env.PARITY_DUMP);

// KaTeX 0.18 prefixes these internal classes. Keep the pre-upgrade hashes as
// evidence that only those class tokens changed; text, MathML, geometry, styles
// and all other markup still have to match byte for byte. Production selectors
// are checked against the actual new output by opLimitScale and fraction choices.
const RENAMED_KATEX_CLASSES = new Set([
  "base",
  "strut",
  "sizing",
  "accent",
  "stretchy",
  "overlay",
  "overline",
  "underline",
  "vbox",
  "thinbox",
  "rule",
  "root",
  "smash",
  "sout",
  "tag",
  "newline",
  "inner",
  "fix",
  "hline",
  "hdashline",
]);

function sha256(value: string): string {
  const compatible = value.replace(
    /class="([^"]*)"/g,
    (_match, classes: string) =>
      `class="${classes
        .split(" ")
        .map((name) =>
          name.startsWith("katex-") && RENAMED_KATEX_CLASSES.has(name.slice(6))
            ? name.slice(6)
            : name,
        )
        .join(" ")}"`,
  );
  return createHash("sha256").update(compatible, "utf8").digest("hex");
}

function readExpected(): Record<string, string> {
  try {
    return JSON.parse(readFileSync(FIXTURE, "utf8")) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * 실측 문항에서 뽑은 대표 입력 — 전처리 경로를 골고루 지나가도록 골랐다.
 *
 * ⚠️ **역슬래시를 반드시 두 번 쓴다(`\\frac`).** 2026-08-18 이전 이 배열은
 * 한 번만 써 놓아서 TypeScript 가 escape 로 먹었다 — `"$\frac…"` 은 실제로
 * **폼피드(U+000C) + `rac`** 였고, `"$0.\overline{3}$"` 은 `$0.overline{3}$`
 * 였다. 그 결과:
 *   · `분수-유한소수`·`원문자-보기`·`극한-limits` 는 **줄곧 붉은 글씨를 잠그고**
 *     있었다. 해시는 「달라지지 않았다」고 초록이었다.
 *   · `순환소수-점표기` 는 `\overline` 이 사라져 순환마디 경로를 **한 번도**
 *     지나가지 않았다 — 이 파일이 지키려던 바로 그 경로다.
 * 「지표가 실패를 셀 수 있는 형태인지 먼저 확인하라」(CLAUDE.md 2026-08-16)가
 * 여기서 그대로 재현됐다. 고친 뒤 해시를 다시 뽑았다.
 */
const PAPER_CASES: Array<{ name: string; content: string }> = [
  {
    name: "분수-유한소수",
    content: "$\\frac{7}{25}$를 유한소수로 나타내어라.",
  },
  {
    name: "원문자-보기",
    content:
      "다음 중 유한소수로 나타낼 수 없는 것은?\n① $\\frac{3}{8}$\n② $\\frac{5}{12}$\n③ $\\frac{7}{20}$\n④ $\\frac{9}{50}$",
  },
  {
    name: "숫자-보기",
    content:
      "두 수\n\n$A=2^{3}\\times 3$\n\n의 최소공배수는?\n1. $a$\n2. $b$\n3. $c$\n4. $d$\n5. $e$",
  },
  {
    name: "순환소수-점표기",
    content: "순환소수\n\n$0.\\overline{3}$\n\n을 기약분수로 나타내어라.",
  },
  {
    name: "도형-기호",
    content:
      "$\\triangle ABC$ 에서 $\\angle C = 90^{\\circ}$ 이고 $\\overline{AB}=10$ 일 때 $\\overline{AC}$ 의 길이는?",
  },
  {
    name: "극한-limits",
    content:
      "$\\lim_{n \\to \\infty} \\frac{2n^{2}+1}{n^{2}-3}$ 의 값을 구하시오.",
  },
  {
    name: "유니코드-기호",
    content: "√10 ≤ x ≤ 5 를 만족하는 자연수 x 의 개수는? (단, x ≠ 4)",
  },
  {
    name: "보기상자-blockquote",
    content:
      "다음 조건을 만족시키는 함수의 개수는?\n\n> $f(1)=2$\n> $f(2)=3$\n",
  },
  {
    name: "꼬리중복-OCR결함",
    content:
      "다음 중 일차부등식이 아닌 것은?\n\n$5-3x\\ge x+9$\n\n$6x\\le3x+1$\n\n$x-2x^{2}>7-2x^{2}$\n\n$5-3x\\ge x+9$\n\n$6x\\le3x+1$\n\n$x-2x^{2}>7-2x^{2}$",
  },
  {
    // ── 렌더 수리 B(2026-08-17)에서 **새로 추가**한 상자 케이스 ───────────────
    // 기존 10개 케이스의 해시는 한 글자도 안 바뀐다(상자 마커가 없으므로).
    // 아래 셋만 새 키로 들어온다 — 상자 렌더가 이제 잠긴다.
    name: "상자-보기-자모",
    content:
      "<보기>에서 옳은 것만을 고른 것은?\n< 보 기 >\nㄱ. 참이다.\nㄴ. 거짓이다.\nㄷ. 알 수 없다.\n1. ㄱ\n2. ㄴ",
  },
  {
    name: "상자-조건-발문꼬리",
    content:
      "다음 <조건>을 만족한다. <조건>(가) $p$는 확률이다.(나) $q$는 확률이다.이 때 $p+q$의 값은?",
  },
  {
    name: "상자-긴보기-1열",
    content:
      "다음 중 옳은 것은?\n1. 서로 다른 두 소수는 항상 서로소이다.\n2. $b$\n3. $c$\n4. $d$",
  },
  {
    name: "지수-계산",
    content: "$a^{3} \\times a^{2} \\div a^{4}$ 을 간단히 하시오.",
  },
  /* ── 2026-08-18 추가: 전처리가 **스스로 만드는** KaTeX HTML 확장 경로 ────────
     `\htmlClass{repeat-dot}` · `\htmlClass{geom-arc-wrap}` 은 이 저장소가
     만들어 내는 것인데, 렌더가 `trust` 없이 거부해 붉은 날문자로 나갔다.
     위 `순환소수-점표기` 가 escape 사고로 이 경로를 못 지나갔으므로 따로 둔다. */
  {
    name: "순환마디-두점",
    content: "$1.2\\dot{3}\\dot{4}$ 를 기약분수로 나타내어라.",
  },
  { name: "호-widehat", content: "호 $\\widehat{AB}$ 의 길이를 구하시오." },
];

const MATHTEXT_CASES: Array<{
  name: string;
  text: string;
  as: "span" | "div";
}> = [
  { name: "정답-인라인", text: "$\\frac{28}{100}=0.28$", as: "span" },
  { name: "정답-원문자", text: "②", as: "span" },
  {
    name: "해설-블록",
    text: "$\\frac{7}{25} = \\frac{28}{100} = 0.28$\n\n따라서 답은 $0.28$ 이다.",
    as: "div",
  },
  {
    name: "해설-합기호",
    text: "$\\sum_{k=1}^{9} a_k = 12$ 이므로 $a_{10}=3$ 이다.",
    as: "div",
  },
];

function renderAll(): Record<string, string> {
  const hashes: Record<string, string> = {};
  for (const { name, content } of PAPER_CASES) {
    hashes[`paper:${name}`] = sha256(
      renderToStaticMarkup(<PaperProblemView content={content} />),
    );
  }
  for (const { name, text, as } of MATHTEXT_CASES) {
    hashes[`math:${name}`] = sha256(
      renderToStaticMarkup(<MathText as={as} text={text} />),
    );
  }
  // 넓은 그물 — Mock 문항 전량(본문·정답·해설)을 한 해시로 묶는다.
  // 위 대표 입력이 못 지나간 전처리 분기까지 한꺼번에 잠근다.
  hashes["corpus:mock-problems"] = sha256(
    MOCK_PROBLEMS.map((problem) =>
      [
        renderToStaticMarkup(<PaperProblemView content={problem.content} />),
        renderToStaticMarkup(<MathText as="span" text={problem.answer} />),
        renderToStaticMarkup(
          <MathText as="div" text={problem.solution ?? ""} />,
        ),
      ].join("\u0000"),
    ).join("\u0001"),
  );
  return hashes;
}

describe("[렌더 동일성] 성능 수리 전후 HTML 이 같아야 한다", () => {
  it("대표 문항의 렌더 HTML 해시가 기준과 같다", () => {
    const actual = renderAll();

    if (DUMP) {
      writeFileSync(FIXTURE, `${JSON.stringify(actual, null, 2)}\n`, "utf8");
      return;
    }

    const expected = readExpected();
    expect(Object.keys(expected).length).toBe(Object.keys(actual).length);
    expect(actual).toEqual(expected);
  });
});

/**
 * ── 붉은 글씨 금지 (2026-08-18) ──────────────────────────────────────────────
 * 해시 잠금은 «달라졌는가»만 본다. **처음부터 붉었으면 붉은 채로 잠긴다.**
 * 실제로 그랬다 — `preprocessMathText` 가 만든 `\htmlClass{repeat-dot}{…}` 를
 * `MarkdownRenderer` 가 `trust` 없이 넘겨 KaTeX 가 **예외 없이** 붉은 날문자로
 * 그렸다(실측 320행 · 수식 787곳). 원장님이 본 `0.\htmlClass\htmlClass이 되었고`.
 *
 * 그래서 «출력에 `#cc0000` 이 없다»를 따로 센다. 이 부류는 렌더 실패로 안 잡힌다
 * (CLAUDE.md 2026-08-16 «지표가 실패를 셀 수 있는 형태인지 먼저 확인하라»).
 */
const RED_TEXT = /#cc0000|katex-error/i;

/**
 * KaTeX 는 MathML `<annotation>` 에 **원본 TeX 를 그대로** 넣는다. 거기엔 성공해도
 * `\htmlClass` 글자가 남으므로, 「날문자가 지면에 찍혔는가」는 그 부분을 뺀 뒤 본다.
 * (안 빼면 성공한 렌더도 실패로 읽는다 — 지표가 거꾸로 걸리는 그 함정이다.)
 */
const stripAnnotation = (html: string): string =>
  html.replace(/<annotation[\s\S]*?<\/annotation>/g, "");

/** 전처리가 **스스로 만드는** KaTeX HTML 확장 — 이게 거부되면 붉게 나온다. */
const HTML_EXTENSION_CASES: Array<{ name: string; content: string }> = [
  { name: "순환마디-overline", content: "$0.\\overline{3}$ 을 분수로." },
  { name: "순환마디-dot", content: "$0.\\dot{5}$ 를 분수로." },
  { name: "순환마디-두점", content: "$1.2\\dot{3}\\dot{4}$ 를 분수로." },
  { name: "호-widehat", content: "호 $\\widehat{AB}$ 의 길이는?" },
  {
    name: "호-overset-frown",
    content: "호 $\\overset{\\frown}{ABC}$ 의 길이는?",
  },
];

describe("[렌더 안전] 지면에 붉은 글씨가 나가지 않는다", () => {
  it.each(HTML_EXTENSION_CASES)(
    "$name — `\\htmlClass` 가 거부되지 않는다",
    ({ content }) => {
      const html = renderToStaticMarkup(<PaperProblemView content={content} />);
      expect(html).not.toMatch(RED_TEXT);
      // 날문자 `\htmlClass` 가 **지면에** 찍히면 안 된다(MathML 주석은 뺀다).
      expect(stripAnnotation(html)).not.toContain("htmlClass");
      // 클래스는 살아남아야 한다 — 그래야 CSS 가 점·호를 그린다.
      expect(html).toMatch(/class="[^"]*(?:repeat-dot|geom-arc-wrap)/);
    },
  );

  it("대표 문항·Mock 전량에도 붉은 글씨가 없다", () => {
    const red: string[] = [];
    for (const { name, content } of PAPER_CASES)
      if (
        RED_TEXT.test(
          renderToStaticMarkup(<PaperProblemView content={content} />),
        )
      )
        red.push(`paper:${name}`);
    for (const problem of MOCK_PROBLEMS)
      if (
        RED_TEXT.test(
          renderToStaticMarkup(<PaperProblemView content={problem.content} />),
        )
      )
        red.push(`mock:${problem.id}`);
    expect(red).toEqual([]);
  });
});

/**
 * 홑 개행이 **파서를 살아서 통과하는가** (원장님 지적 2026-08-25).
 *
 * `hardBreaks.test.tsx` 는 렌더러가 홑 개행을 `<br>` 로 굳히는지를 본다. 그런데
 * 문제은행·검수·인쇄가 실제로 타는 경로는 `parseProblemContent` 를 **먼저** 지난다.
 * 원장님이 「여전히 1줄」이라고 하신 이유가 바로 그것이었다 — 렌더러는 고쳤는데
 * `collapseWhitespace` 가 `/\n+/` 로 **홑 개행까지 미리 지워** 렌더러에 닿지 않았다.
 *
 * 🔴 그래서 이 검사는 **두 자리를 잇는다**: 파서가 개행을 남기는가(여기) ·
 *    렌더러가 그것을 줄바꿈으로 그리는가(`hardBreaks.test.tsx`). 한쪽만 있으면
 *    「함수는 도는데 화면은 그대로」를 구조적으로 못 본다.
 *
 * 실측(공유 DB 전수): 지문이 바뀌는 문항 5,757건 · 그중 **격리 안 된 것 38건**
 * (전부 2026-08-24 엔진 생성분) · 높이 한계를 새로 넘는 출제 가능 문항 **0건**.
 */
import { describe, expect, it } from "vitest";

import {
  normalizeOcrText,
  parseProblemContent,
} from "@/lib/problem/parseProblemContent";
import { estimateSolutionPx } from "@/lib/printOverflow";

/** 소스에 날 역슬래시를 안 쓰려고 — heredoc·이스케이프 사고를 원천 차단한다. */
const BS = String.fromCharCode(92);

describe("[파서] 홑 개행은 살아서 렌더러까지 간다", () => {
  it("원장님이 지목한 문항의 발문이 두 줄로 남는다 (J30101-A15-002)", () => {
    const content = `다음 세 수를 작은 것부터 차례로 나열하시오.\n$${BS}sqrt{5}$, $5$, $${BS}sqrt{3}$`;
    const { question } = parseProblemContent(content);
    // 2026-10-20 — 물음 뒤 쉼표 나열 식 줄은 따로 선 식 문단(가운데 · 한 줄 띄움)이 된다(`markStandaloneFormula`).
    //   빈 줄 하나가 끼어도 «한 줄로 합쳐지지 않는다» 는 그대로다.
    expect(question.split(/\n+/)).toHaveLength(2);
    expect(question.startsWith("다음 세 수를 작은 것부터 차례로 나열하시오.\n")).toBe(
      true,
    );
  });

  it("㉠㉡㉢ 항목이 각각 제 줄에 선다", () => {
    const content =
      "다음 중 $y$가 $x$의 함수인 것은 모두 몇 개인지 구하시오.\n㉠ 자연수 $x$보다 작은 홀수 $y$\n㉡ 절댓값이 $x$인 정수 $y$";
    expect(parseProblemContent(content).question.split("\n")).toHaveLength(3);
  });

  it("🔴 OCR **이중** 개행은 여전히 공백으로 합쳐진다 — 이걸 남기면 토막마다 세로로 쌓인다", () => {
    // 실데이터 모양(HAL0101-2ER5): 수식마다 빈 줄이 들어간 인라인 토큰 나열.
    const content = "세 실수\n\n$a$\n\n,\n\n$b$\n\n의 값은?";
    const { question } = parseProblemContent(content);
    expect(question).not.toContain("\n");
    // 쉼표 앞 공백을 떼는 것은 예전부터 있던 규칙이다 — 개행 수리와 무관하다.
    expect(question).toBe("세 실수 $a$, $b$ 의 값은?");
  });

  it("🔴 보기 본문은 개행이 있어도 **한 줄**이다 — 자(`choicesBlockPx`)가 개행을 못 센다", () => {
    const content = "다음 중 옳은 것은?\n1. 앞부분\n계속되는 뒷부분\n2. 둘째 보기\n3. 셋째 보기";
    const { choices } = parseProblemContent(content);
    expect(choices.length).toBeGreaterThanOrEqual(2);
    for (const choice of choices) expect(choice).not.toContain("\n");
  });

  it("🔴 상자 항목도 **한 줄**이다 — 개행이 남으면 `> ` 인용문이 끊겨 그리드가 깨진다", () => {
    // ⚠️ 이 자리는 변이 시험이 찾아 줬다. 앞 픽스처들은 상자 항목이 늘 한 줄이라
    //    「접기」를 꺼도 산출물이 같았다 — 경계를 안 가르는 픽스처였다.
    //    `splitBoxSegments` 는 실제로 `"㉠ 앞줄\\n이어지는 뒷줄"` 같은 항목을 낸다(실측).
    const content =
      "다음 조건을 모두 만족하는 수는?\n<보기>\n㉠ 앞줄\n이어지는 뒷줄\n㉡ 둘째 항목";
    const { question } = parseProblemContent(content);
    expect(question).toContain("> ㉠ 앞줄 이어지는 뒷줄");
    // 상자가 시작된 뒤로는 빈 줄 없이 **모든 줄이** `>` 로 열려야 한다.
    const lines = question.split("\n");
    const first = lines.findIndex((l) => l.startsWith(">"));
    expect(first).toBeGreaterThan(-1);
    for (const line of lines.slice(first)) {
      expect(line.startsWith(">")).toBe(true);
    }
  });

  it("해설도 같은 규칙을 탄다 (발문만 고치면 화면마다 규칙이 갈린다)", () => {
    const solution = "먼저 $f(3)$을 구한다.\n다음으로 역함수를 쓴다.";
    expect(normalizeOcrText(solution).split("\n")).toHaveLength(2);
  });
});

describe("[자] 해설 높이가 하드 브레이크를 센다", () => {
  it("🔴 줄을 나누면 자도 더 높게 본다 — 과소평가는 해설이 **통째로 사라지는** 결함이다", () => {
    // ⚠️ 표본이 **경계를 갈라야** 한다 — 40자를 20+20 으로 쪼개면 둘 다 2줄이라
    //    개행을 세든 안 세든 같은 값이 나온다(처음에 그렇게 썼다가 헛 초록을 봤다).
    //    한 줄에 들어가는 길이로 잡아야 「합치면 1줄 · 나누면 2줄」이 갈린다.
    const oneLine = "가".repeat(20);
    const twoLines = `${"가".repeat(10)}\n${"가".repeat(10)}`;
    expect(estimateSolutionPx(twoLines)).toBeGreaterThan(
      estimateSolutionPx(oneLine),
    );
  });

  it("개행이 없으면 예전 값 그대로다 (기존 해설의 높이가 흔들리면 안 된다)", () => {
    const text = "짧은 해설이다.";
    expect(estimateSolutionPx(text)).toBe(estimateSolutionPx(text));
    expect(Number.isFinite(estimateSolutionPx(text))).toBe(true);
  });
});

describe("[마크다운] 새로 생긴 줄머리를 막는다", () => {
  it("`1.` 로 시작하는 줄은 escape 한다 — 안 막으면 목록이 되어 번호가 사라진다", () => {
    // 마커가 하나뿐이라 보기로 안 잘리고 발문에 남는 모양.
    const content = "다음 과정에서 잘못된 곳은?\n1. 첫 단계이다.";
    const { question } = parseProblemContent(content);
    expect(question).toContain(`1${BS}.`);
  });

  it("🔴 `>` 줄머리는 **escape 하지 않는다** — 맨 인용문을 담은 문항이 깨진다", () => {
    const content = "다음 조건을 만족시키는 함수의 개수는?\n\n> $f(1)=2$\n> $f(2)=3$\n";
    const { question } = parseProblemContent(content);
    expect(question).not.toContain(`${BS}>`);
    expect(question).toContain("> $f(2)=3$");
  });
});

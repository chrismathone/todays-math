// @vitest-environment node
// 전수 가드: 중등 복습의 채점·보기는 한 자리(gradeSrsAnswer · srsAnswerChoices)로만 간다.
// 보기형 문항의 `answer` 는 «정답 보기 번호»라서, 누가 checkAnswer(…, p.answer) 를 새로
// 부르면 학생이 번호 «1» 을 내도 정답이 된다. 그 길이 다시 열리면 여기서 빨개진다.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { eatenCode, withoutComments } from "../helpers/sourceComments";

const root = join(__dirname, "../../..");
const SCANNED = [
  "src/lib/math-srs",
  "src/lib/math-explorers",
  "src/components/math-srs",
  "src/components/math-explorers",
  "src/app/api/learn",
];
function files(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(
    (entry) =>
      entry.isDirectory()
        ? files(join(dir, entry.name))
        : /\.tsx?$/.test(entry.name)
          ? [join(dir, entry.name)]
          : [],
  );
}
// 주석은 부르는 곳이 아니다 (types.ts 의 엔진 약속 주석이 checkAnswer(…) 를 적어 둔다).
// 걷기는 `helpers/sourceComments.ts` 한 곳 — 블록을 아무 데서나 먼저 걷던 옛 규칙은 문자열 · 줄 주석 속 `/*` 에서
// 코드 줄째 걷을 수 있었다(기록 격리 시험이 실측 스크립트에 두 번 눈멂, 2026-09-27 · 2026-09-29).
const sources = SCANNED.flatMap(files).map((path) => {
  const raw = readFileSync(join(root, path), "utf8");
  return {
    path: relative(root, join(root, path)).replaceAll("\\", "/"),
    raw,
    text: withoutComments(raw),
  };
});
const callers = (pattern: RegExp) =>
  sources.filter((s) => pattern.test(s.text)).map((s) => s.path);

describe("중등 복습 채점·보기의 단일 경로", () => {
  it("훑는 파일이 실제로 있다 (0 은 «없다»가 아니라 «못 센다»일 수 있다)", () => {
    expect(sources.length).toBeGreaterThan(50);
    expect(callers(/\bgradeSrsAnswer\s*\(/)).toEqual(
      expect.arrayContaining([
        "src/lib/math-srs/serverState.ts",
        "src/lib/math-srs/mission.ts",
        "src/lib/math-srs/replay.ts",
        "src/components/math-srs/PracticeSession.tsx",
      ]),
    );
  });

  it("주석을 걷어도 코드 줄은 안 사라진다 — 걷는 블록 안에 import · const · function … 줄이 없다", () => {
    const eaten = sources.flatMap(({ path, raw }) =>
      eatenCode(raw).map((length) => `${path} (${length}자)`),
    );
    expect(eaten).toEqual([]);
  });

  it("숫자 채점 checkAnswer 를 직접 부르는 곳은 채점 함수와 숫자 보기 생성기뿐이다", () => {
    expect(callers(/\bcheckAnswer\s*\(/).sort()).toEqual([
      "src/lib/math-srs/numericAnswerChoices.ts",
      "src/lib/math-srs/sharedAnswers.ts",
    ]);
  });

  it("숫자 보기 생성기를 부르는 곳은 보기형을 먼저 거르는 한 함수뿐이다", () => {
    expect(callers(/\bnumericAnswerChoices\s*\(/).sort()).toEqual([
      "src/lib/math-srs/numericAnswerChoices.ts",
      "src/lib/math-srs/serverDto.ts",
    ]);
  });
});

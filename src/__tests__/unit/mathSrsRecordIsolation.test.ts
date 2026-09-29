// @vitest-environment node
// 전용 문항 격리 (원장님 2026-09-27 «문제은행 및 다른 곳에 포함되지 않도록»).
// 보기형 «한 걸음» 문항은 학생 복습 기록(StudentSrsState.payload)의 미션 안에만 산다.
// 그 기록을 읽거나 내보내는 길을 **지금의 목록**으로 못 박는다 — 문제은행·시험지·작업실·
// 내보내기·자동 출제 쪽에서 새로 읽기 시작하면 여기서 빨갛다.
// (B1 의 울타리는 `math-srs/quick/**` 를 가져다 쓰는 곳을, 이 시험은 «저장된 기록»을 읽는 곳을 막는다.)
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { mathSrsClassDashboardSchema } from "@/contracts/mathSrs.contract";

const root = join(__dirname, "../../..");
const SKIP = new Set(["node_modules", ".next", "__tests__"]);
function files(dir: string): string[] {
  return readdirSync(join(root, dir), { withFileTypes: true }).flatMap(
    (entry) =>
      entry.isDirectory()
        ? SKIP.has(entry.name)
          ? []
          : files(join(dir, entry.name))
        : /\.(tsx?|mjs|cjs|js|py|sql)$/.test(entry.name)
          ? [join(dir, entry.name)]
          : [],
  );
}
// 주석 걷기 — 줄 주석을 먼저, 블록 주석은 **줄 머리(들여쓰기 뒤)의 `/*`** 에서만.
// 🔴 블록을 아무 데서나 먼저 지우면 줄 주석 · 문자열 속 `/*`(«`/api/**`» · `"preview/*.html"`)가 블록 시작으로 읽혀
//    다음 블록 주석 끝까지 — 코드 줄째 — 지운다. `mobile-explorers-qa.mjs` 가 두 번 그렇게 이 시험에서 사라졌다
//    (2026-09-27 2만여 자, 2026-09-29 JSDoc 한 줄로 10만여 자 · 기록 모듈을 부르는 줄 포함). 저장소 전체에서
//    같은 식으로 코드 줄을 삼키던 블록이 다섯 더 있었다 — 아래 «지운 블록에 코드 줄 없음»이 막는다.
const LINE_COMMENT = /^\s*(\/\/|#).*$/gm;
const BLOCK_COMMENT = /^[ \t]*\/\*[\s\S]*?\*\//gm;
/** 지운 블록 안에 이런 줄이 있으면 주석이 아니라 코드를 지운 것이다. */
const CODE_LINE =
  /^[ \t]*(import|export|const|let|var|function|async function|class|return|await|for|if)\b/m;
const withoutComments = (text: string) =>
  text.replace(LINE_COMMENT, "").replace(BLOCK_COMMENT, "");
const sources = ["src", "scripts"].flatMap(files).map((path) => {
  const raw = readFileSync(join(root, path), "utf8");
  return {
    path: relative(root, join(root, path)).replaceAll("\\", "/"),
    raw,
    text: withoutComments(raw),
  };
});

/** 복습 기록(보기형 문항 포함)을 읽거나 학생·강사에게 내보내는 서버 모듈. */
const RECORD_MODULES = [
  "math-srs/serverStore",
  "math-srs/serverState",
  "math-srs/serverDto",
  "math-srs/serverRoutes",
  "math-srs/serverContext",
  "math-srs/replay",
  "math-srs/replayRoutes",
  "math-srs/mission",
  "math-srs/storage",
  "math-srs/dailyJourney",
  "math-srs/courseServer",
  "math-srs/courseRoutes",
  "math-srs/courseTeacherRoutes",
  "math-explorers/routes",
  "math-explorers/expedition",
  "math-explorers/expeditionStart",
  "math-explorers/expeditionJourney",
];
/** 지금 그 모듈을 부르는 곳 — 학생 학습·통합 탐험·강사 기록 보기·DB 없는 QA 시뮬레이터. */
const ALLOWED = [
  "src/lib/math-srs/",
  "src/lib/math-explorers/",
  "src/components/math-srs/",
  "src/components/math-explorers/",
  "src/app/api/learn/",
  "src/app/api/classes/[id]/math-srs/",
  "src/app/api/math-srs/",
  "src/app/api/students/[id]/math-srs/",
  "scripts/qa/mobile-explorers-qa.mjs",
  "scripts/qa/star-economy/", // 원장님 2026-09-28 허용 · DB 없는 별 경제 시뮬레이터(D-144)
];
// 정적 import · 재수출 · 동적 import · require · QA 의 src("…ts") 까지 — 문자열 안의 경로로 잡는다.
// «/» 로 시작하는 문자열은 화면·API 주소(`/api/learn/math-srs/replay`)라 모듈 참조가 아니다.
const recordLiteral = new RegExp(
  `["'\`]([^"'\`\\n]*(?:${RECORD_MODULES.map((m) => m.replace("/", "\\/")).join("|")})(?:\\.tsx?)?)["'\`]`,
  "g",
);
const recordReference = {
  test: (text: string) =>
    [...text.matchAll(recordLiteral)].some(([, path]) => !path.startsWith("/")),
};

describe("보기형 전용 문항이 사는 기록의 격리", () => {
  it("훑는 파일이 실제로 있고, 알려진 사용처를 실제로 잡는다", () => {
    expect(sources.length).toBeGreaterThan(500);
    const found = sources.filter((s) => recordReference.test(s.text));
    expect(found.map((s) => s.path)).toEqual(
      expect.arrayContaining([
        "src/app/api/learn/math-srs/route.ts",
        "src/app/api/learn/math-srs/replay/route.ts",
        "src/app/api/classes/[id]/math-srs/route.ts",
        "scripts/qa/mobile-explorers-qa.mjs",
      ]),
    );
  });

  it("줄 주석 · 문자열 속 `/*` 가 뒤 JSDoc 까지 지우지 않는다 — 그 사이 모듈 참조가 산다", () => {
    const text = [
      "// Every `/api/**` request is fulfilled here.",
      'const glob = "preview/*.html";',
      'import { readSrsState } from "../src/lib/math-srs/serverStore";',
      "/** 네 폭으로 잰다. */",
      "readSrsState(glob);",
    ].join("\n");
    const kept = withoutComments(text);
    expect(recordReference.test(kept)).toBe(true);
    expect(kept).not.toContain("네 폭으로 잰다");
    expect(kept).not.toContain("fulfilled here");
  });

  it("주석을 걷어도 코드 줄은 안 사라진다 — 지운 블록 안에 import · const · function … 줄이 없다", () => {
    const eaten = sources.flatMap(({ path, raw }) =>
      [...raw.replace(LINE_COMMENT, "").matchAll(BLOCK_COMMENT)]
        .filter(([block]) =>
          CODE_LINE.test(block.split("\n").slice(1).join("\n")),
        )
        .map(([block]) => `${path} (${block.length}자)`),
    );
    expect(eaten).toEqual([]);
  });

  it("복습 기록 모듈을 부르는 곳은 허용 목록 안에만 있다 (문제은행·시험지·작업실·내보내기·자동 출제 없음)", () => {
    const outside = sources
      .filter((s) => recordReference.test(s.text))
      .map((s) => s.path)
      .filter((path) => !ALLOWED.some((prefix) => path.startsWith(prefix)));
    expect(outside).toEqual([]);
  });

  it("복습 기록 표를 직접 읽는 곳은 저장소 모듈 하나뿐이다", () => {
    const table = /studentSrsState|student_srs_state|StudentSrsState/;
    expect(
      sources
        .filter((s) => table.test(s.text))
        .map((s) => s.path)
        .sort(),
    ).toEqual([
      "scripts/qa/apply-student-srs-migration.ts",
      "src/lib/math-srs/serverStore.ts",
    ]);
  });

  it("강사 반 현황 데이터는 문항 전문·보기·정답을 싣지 않는다", () => {
    const keys = new Set<string>();
    const walk = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const properties = (node as { properties?: Record<string, unknown> })
        .properties;
      if (properties) Object.keys(properties).forEach((key) => keys.add(key));
      Object.values(node).forEach(walk);
    };
    walk(z.toJSONSchema(mathSrsClassDashboardSchema));
    expect(keys.has("students")).toBe(true);
    for (const content of [
      "problems",
      "prompt",
      "equation",
      "choices",
      "answerChoices",
      "answer",
      "solution",
      "hint",
    ])
      expect(keys.has(content)).toBe(false);
  });
});

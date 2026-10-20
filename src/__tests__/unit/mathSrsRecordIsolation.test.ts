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
import {
  ANYWHERE_BLOCK,
  eatenCode,
  withoutComments,
} from "../helpers/sourceComments";

const root = join(__dirname, "../../..");
const SKIP = new Set(["node_modules", ".next", "__tests__"]);
// 이 브라우저 QA 서버도 __tests__와 같은 메모리 DB mock이다. 운영 경로 허용 목록은 넓히지 않는다.
const TEST_FIXTURES = new Set(["scripts/qa/math-prerequisite/server.test.ts"]);
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
// 주석 걷기는 `helpers/sourceComments.ts` 한 곳 — 줄 주석을 먼저, 블록 주석은 줄 머리의 `/*` 에서만(까닭은 그 머리말).
// 파이썬 · SQL 도 훑으므로 `#` 줄도 주석으로 친다.
const COMMENTS = { hash: true } as const;
const sources = ["src", "scripts"]
  .flatMap(files)
  .filter((path) => !TEST_FIXTURES.has(path.replaceAll("\\", "/")))
  .map((path) => {
    const raw = readFileSync(join(root, path), "utf8");
    return {
      path: relative(root, join(root, path)).replaceAll("\\", "/"),
      raw,
      text: withoutComments(raw, COMMENTS),
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
  "math-explorers/teacherRoutes", // 탐험 기록의 교사 보기(27번 문서) — 기록을 읽어 강사에게 내보낸다
];
/** 지금 그 모듈을 부르는 곳 — 학생 학습·통합 탐험·강사 기록 보기·DB 없는 QA 시뮬레이터. */
const ALLOWED = [
  "src/lib/math-srs/",
  "src/lib/math-explorers/",
  "src/components/math-srs/",
  "src/components/math-explorers/",
  "src/lib/fading/", // «오늘의 기억» 새 앱의 학생 라우트(2026-10-06) — 본인의 기록에 새 칸만 읽고 쓴다
  "src/app/api/learn/",
  "src/app/api/classes/[id]/math-srs/",
  "src/app/api/math-srs/",
  "src/app/api/students/[id]/math-srs/",
  "scripts/qa/mobile-explorers-qa.mjs",
  "scripts/qa/star-economy/", // 원장님 2026-09-28 허용 · DB 없는 별 경제 시뮬레이터(D-144)
  // «오늘의 기억» 변이 실험기(2026-10-06) — 기록을 읽지 않는다. 변이를 걸 파일의 이름으로 저장 모듈의 길을 글로 적을 뿐이다.
  "scripts/qa/fading-mutants/",
  // Owner-authorized aggregate-only READ ONLY comparison; it never runs student actions.
  "scripts/qa/measure-sweep-20261020.ts",
];
// 2026-10-03 교재와 기존 학습 통합 승인: 현재 학생의 읽기·복습 시작·인증 경로만.
// 교재 원고/문제은행/내보내기에는 학습 미션을 싣지 않는다. textbook/ 전체를 허용하지 않는다.
const TEXTBOOK_STUDENT_ENTRYPOINTS = new Set([
  "src/lib/textbook/studentRead.ts",
  "src/lib/textbook/studentReview.ts",
  "src/lib/textbook/studentRoutes.ts",
]);
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
    const kept = withoutComments(text, COMMENTS);
    expect(recordReference.test(kept)).toBe(true);
    expect(kept).not.toContain("네 폭으로 잰다");
    expect(kept).not.toContain("fulfilled here");
    // 옛 규칙(블록을 아무 데서나)이면 같은 글에서 참조가 사라진다 — 이 자기 시험이 그 차이를 본다.
    expect(
      recordReference.test(
        withoutComments(text, { ...COMMENTS, block: ANYWHERE_BLOCK }),
      ),
    ).toBe(false);
  });

  it("주석을 걷어도 코드 줄은 안 사라진다 — 걷는 블록 안에 import · const · function … 줄이 없다", () => {
    const eaten = sources.flatMap(({ path, raw }) =>
      eatenCode(raw, COMMENTS).map((length) => `${path} (${length}자)`),
    );
    expect(eaten).toEqual([]);
  });

  it("복습 기록 모듈을 부르는 곳은 허용 목록 안에만 있다 (문제은행·시험지·작업실·내보내기·자동 출제 없음)", () => {
    const outside = sources
      .filter((s) => recordReference.test(s.text))
      .map((s) => s.path)
      .filter(
        (path) =>
          !ALLOWED.some((prefix) => path.startsWith(prefix)) &&
          !TEXTBOOK_STUDENT_ENTRYPOINTS.has(path),
      );
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

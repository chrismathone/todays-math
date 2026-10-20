import { db } from "@/lib/db";
import { MOCK_UNITS, USER_TEACHER_ID } from "@/mocks/data";
import { MISSING_ANSWER } from "@/lib/missingAnswer";

export const BUILDER_MARKER = "builder-speed-fixed-fixture";
export const builderId = (n: number) =>
  `b0000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
export const builderParams = (patch: Record<string, string> = {}) =>
  new URLSearchParams({ identity: "question", q: BUILDER_MARKER, ...patch });

/** Fixed cross-axis siblings, NULL/blank families, all eligibility and format branches. */
export async function seedBuilderSpeedFixture(size = 240) {
  const ids: string[] = [];
  for (let i = 0; i < size; i++) {
    const id = builderId(i + 1);
    const choice = i % 7 === 0;
    const types = ["단답형", "서술형", "객관식", null, "", "기타"];
    const families = [
      null,
      "",
      "  ",
      "mid:fixture|1",
      " mid:fixture|1 ",
      "solo:fixture",
    ];
    // exam-wiring: 테스트 — 전역 Prisma 인메모리 대역에 성능·동등성 픽스처만 넣는다.
    await db.problem.create({
      data: {
        id,
        userId: USER_TEACHER_ID,
        unitId: MOCK_UNITS[i % 3].id,
        problemCode: `FIX-${String(i).padStart(8, "0")}`,
        questionGroupKey:
          i % 4 === 0
            ? null
            : `q:v1:${Math.floor(i / 4)
                .toString(16)
                .padStart(64, "0")}`,
        source: ["manual", "past_exam", "school_textbook", "transformed"][
          i % 4
        ],
        sourceMaterialId: null,
        content: `${BUILDER_MARKER} ${i}${choice ? "\n① 1\n② 2\n③ 3\n④ 4\n⑤ 5" : ""}`,
        answer:
          i % 19 === 0
            ? MISSING_ANSWER
            : choice
              ? "➁"
              : "7".repeat(i % 5 === 0 ? 400 : 1),
        solution: "고정 풀이",
        difficulty: ["기초", "기본", "실력", "심화", "최상위"][i % 5],
        questionType: types[i % types.length],
        problemType: i % 3 === 0 ? "서술형" : "계산",
        familyKey: families[i % families.length],
        reviewStatus: i % 11 === 0 ? "pending" : "approved",
        directUseAllowed: i % 13 !== 0,
        pool: i % 23 === 0 ? "private" : "shared",
        figureUrls: [],
        figureSvg: null,
        figureDims: [],
        figureSourceMm: [],
        choiceFigureIndex: [],
      } as never,
    });
    ids.push(id);
  }
  return ids;
}

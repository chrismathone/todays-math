// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
import {
  studentOptionalMenuAllowed,
  studentOptionalMenuForPath,
} from "@/lib/learn/studentLearningMenuPolicy";
import {
  readStudentLearningMenus,
  studentLearningMenusKey,
  writeStudentLearningMenus,
} from "@/lib/learn/studentLearningMenusStore";
import { studentLearningMenusRequestSchema } from "@/contracts/studentLearningMenus.contract";

const studentA = "017c1a9b-b28a-4a5b-80b6-f1a21ccfeee2";
const studentB = "7e7c388b-c264-4d39-809b-527723b8b74b";
describe("학생별 추가 메뉴", () => {
  it.each([
    "/learn",
    "/learn?view=collection",
    "/api/learn/math-explorers",
    "/api/learn/fading",
    "/api/learn/fading/daily",
    "/api/learn/fading/relearn",
  ])("%s 탐험은 추가 메뉴 허가 없이 작동한다", (path) => {
    expect(studentOptionalMenuForPath(path)).toBeNull();
    expect(studentOptionalMenuAllowed([], path)).toBe(true);
  });
  it.each([
    "/learn/lectures",
    "/learn/watch/a",
    "/api/learn/lectures/a",
    "/api/learn/watch",
  ])("%s 강의는 기본으로 닫고 허가하면 연다", (path) => {
    expect(studentOptionalMenuAllowed([], path)).toBe(false);
    expect(studentOptionalMenuAllowed(["lectures"], path)).toBe(true);
  });
  it.each([
    "/q/a",
    "/learn/textbook/a/concepts/b",
    "/api/learn/textbook/editions/a/concepts/b/attempts",
  ])("%s 교재는 탐험 기록과 독립된 허가다", (path) => {
    expect(studentOptionalMenuAllowed(["lectures"], path)).toBe(false);
    expect(studentOptionalMenuAllowed(["textbook"], path)).toBe(true);
  });
  it.each([
    "/learn/english-listening",
    "/api/english/learn/listening/a/commands",
  ])("%s 영어 듣기는 학생 수학 메뉴에서 제외한다", (path) =>
    expect(studentOptionalMenuAllowed(["lectures", "textbook"], path)).toBe(
      false,
    ),
  );
  it("다른 학생의 설정을 섞지 않으며 아직 없거나 잘못된 설정은 기본으로 닫는다", async () => {
    const findUnique = vi.fn(async ({ where }: { where: { key: string } }) =>
      where.key === studentLearningMenusKey(studentA)
        ? {
            key: where.key,
            value: { version: 1, enabled: ["lectures"] },
            updatedAt: new Date("2026-10-07T00:00:00Z"),
            updatedById: null,
          }
        : null,
    );
    expect(
      await readStudentLearningMenus(studentA, { findUnique }),
    ).toMatchObject({ enabled: ["lectures"] });
    expect(await readStudentLearningMenus(studentB, { findUnique })).toEqual({
      enabled: [],
      updatedAt: null,
    });
    expect(
      await readStudentLearningMenus(studentA, {
        findUnique: async () => ({
          key: "bad",
          value: { version: 1, enabled: ["english-listening"] },
          updatedAt: new Date(),
          updatedById: null,
        }),
      }),
    ).toEqual({ enabled: [], updatedAt: null });
  });
  it("아직 설정 표가 없으면 기본으로 닫되 연결 오류를 허가로 바꾸지 않는다", async () => {
    expect(
      await readStudentLearningMenus(studentA, {
        findUnique: async () => {
          throw { code: "P2021" };
        },
      }),
    ).toEqual({ enabled: [], updatedAt: null });
    await expect(
      readStudentLearningMenus(studentA, {
        findUnique: async () => {
          throw new Error("offline");
        },
      }),
    ).rejects.toThrow("offline");
  });
  it("학생이 조작한 잘못된 ID와 알 수 없는/중복 메뉴를 허용하지 않는다", () => {
    expect(() => studentLearningMenusKey("../other-student")).toThrow();
    expect(
      studentLearningMenusRequestSchema.safeParse({
        enabled: ["lectures", "lectures"],
      }).success,
    ).toBe(false);
    expect(
      studentLearningMenusRequestSchema.safeParse({
        enabled: ["english-listening"],
      }).success,
    ).toBe(false);
  });
  it("쓰기 저장소도 잘못된 ID와 중복 메뉴를 DB에 보내지 않는다", async () => {
    const upsert = vi.fn();
    await expect(
      writeStudentLearningMenus("invalid", [], "manager", { upsert }),
    ).rejects.toThrow();
    await expect(
      writeStudentLearningMenus(studentA, ["lectures", "lectures"], "manager", {
        upsert,
      }),
    ).rejects.toThrow();
    expect(upsert).not.toHaveBeenCalled();
  });
});

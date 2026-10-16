import { writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it, vi } from "vitest";

// 행 만들기만 쓴다. 클라이언트의 어떤 속성에 닿아도 실패하므로 DB 접속은 불가능하다.
vi.mock("@prisma/client", () => ({
  PrismaClient: class {
    constructor() {
      return new Proxy(
        {},
        {
          get() {
            throw new Error("이 시험은 DB에 닿으면 안 된다");
          },
        },
      );
    }
  },
}));

import { buildMiddleRows } from "../../../scripts/import/load-engine-problems";
import { registeredTypes } from "../../lib/middle/generate";
import { parseProblemContent } from "../../lib/problem/parseProblemContent";
import {
  digest,
  fixturePath,
  readEvidence,
  TRIG_KEY,
} from "../helpers/bankDecideEngineEvidence";

/**
 * Captured from the pre-edit code (4ad8451e7) with `stable` below. The first baseline hashed
 * raw figure coordinates: trigonometric points differ in the last bit between Windows and macOS
 * (위치 관계 20 · 원주각의 활용 07 · 12), so it could only pass on the machine that captured it.
 */
const BASELINE = "bankDecideMiddleLoader.before.v2.json.gz";
const SEEDS = [0, 15, 299];
type Evidence = {
  templates: string[];
  rows: { id: string; family: string; format: string; hash: string }[];
};

/** Ten significant digits: far finer than a drawn figure, coarser than a platform's last bit. */
const stable = (value: unknown): unknown =>
  typeof value === "number" && !Number.isInteger(value)
    ? Number(value.toPrecision(10))
    : Array.isArray(value)
      ? value.map(stable)
      : value && typeof value === "object"
        ? Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, stable(item)]),
          )
        : value;

function capture(): Evidence {
  const entries = registeredTypes();
  const sections = [
    ...new Map(
      entries.map((entry) => [
        `${entry.grade}|${entry.unitSection}`,
        {
          engine: "middle" as const,
          grade: entry.grade,
          unitSection: entry.unitSection,
          variants: 1,
        },
      ]),
    ).values(),
  ];
  const rows = SEEDS.flatMap((seed) =>
    sections.flatMap((section) =>
      buildMiddleRows(section, seed).map((row) => ({
        id: row.externalId,
        family: row.familyKey,
        format: row.questionType,
        hash: digest(stable(row)),
      })),
    ),
  );
  expect(new Set(rows.map((row) => row.family)).size).toBe(entries.length);
  expect(new Set(rows.map((row) => row.id)).size).toBe(rows.length);
  return { templates: entries.map((entry) => entry.key), rows };
}

describe("B5: 중등 적재 행의 실제 오답 배선", () => {
  it("등록 유형 전부 × 씨앗 세 개: 삼각비 18 객관식 외의 산출은 한 글자도 바뀌지 않는다", () => {
    const after = capture();
    if (process.env.BANK_DECIDE_CAPTURE_LOADER === "1") {
      writeFileSync(fixturePath(BASELINE), gzipSync(JSON.stringify(after)), {
        flag: "wx",
      });
      console.log(
        JSON.stringify({
          templates: after.templates.length,
          seeds: SEEDS.length,
          rows: after.rows.length,
          digest: digest(after),
        }),
      );
      return;
    }
    const before = readEvidence<Evidence>(BASELINE);
    expect(before.templates.length).toBeGreaterThan(1000);
    expect(after.templates).toEqual(before.templates);
    expect(after.rows.map((row) => row.id)).toEqual(
      before.rows.map((row) => row.id),
    );
    const changed = after.rows.filter(
      (row, i) => row.hash !== before.rows[i].hash,
    );
    expect(
      changed.map(({ id, family, format }) => ({ id, family, format })),
    ).toEqual(
      before.rows
        .filter(
          (row) => row.family === `mid:${TRIG_KEY}` && row.format === "객관식",
        )
        .map(({ id, family, format }) => ({ id, family, format })),
    );
    expect(changed).toHaveLength(SEEDS.length);
  }, 60000);

  it("buildMiddleRows가 삼각비 18의 발문에 나온 다른 값과 1.0000을 실제 보기로 전달한다", () => {
    const rows = buildMiddleRows(
      {
        engine: "middle",
        grade: "중3",
        unitSection: "삼각비의 값",
        variants: 1,
      },
      15,
    ).filter((row) => row.familyKey === `mid:${TRIG_KEY}`);
    expect(rows).toHaveLength(2);
    const short = rows.find((row) => row.questionType === "단답형")!;
    const mc = rows.find((row) => row.questionType === "객관식")!;
    const correct = Number(short.answer.replace(/\$/g, ""));
    const given = [...short.content.matchAll(/=(0\.\d{4})/g)].map((match) =>
      Number(match[1]),
    );
    expect(given).toHaveLength(2);
    expect(given).toContain(correct);
    const values = parseProblemContent(mc.content).choices.map((choice) =>
      Number(choice.replace(/\$/g, "")),
    );
    expect(values).toHaveLength(5);
    expect(new Set(values).size).toBe(5);
    expect(values).toEqual(expect.arrayContaining([...given, 1]));
  });
});

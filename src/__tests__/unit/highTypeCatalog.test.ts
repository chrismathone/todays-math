/**
 * RPM 고등(2022) 유형 색인 — **산출물이 성한가**를 잠근다.
 *
 * 색인은 `scripts/rpm/extract-high-type-catalog.py` 가 저장소 밖 PDF 에서 뽑아 커밋한다.
 * 추출기는 이 시험이 못 부른다(PDF 가 없는 컴퓨터가 있다). 그래서 지키는 것은
 * **커밋된 json 이 다음 사람이 믿어도 되는 모양인가**다 — 빈 책·깨진 머리·경계 경고·
 * 본문이 바닥글로 잡혀 대단원이 된 자국(「이므로」·「가 나타내는 그래프의」, 2026-09-13 실측)
 * 을 조용히 들이지 않는다.
 *
 * 수치는 2026-09-13 실측 리터럴이다. 추출기를 고쳐 수가 달라지면 **왜 달라졌는지** 적고
 * 갱신할 것 — 숫자만 올리면 이 가드는 장식이다.
 */
import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

type Row = {
  page: number;
  major: string | null;
  minor: string | null;
  number: string;
  title: string;
  levels: Record<string, number>;
};
type Book = {
  grade: string;
  edition: string;
  types: Row[];
  incomplete: unknown[];
  boundary_warnings: string[];
};

const catalog = JSON.parse(
  readFileSync(
    path.resolve(process.cwd(), "scripts/rpm/rpm-high-type-catalog.json"),
    "utf-8",
  ),
) as Record<string, Book>;

/** 원장님이 확정한 첫 범위 — 이 둘만 색인이 «찼다»고 요구한다. 나머지 다섯 권은 조판이 달라 0 이다. */
const IN_SCOPE: Record<string, { minTypes: number; majors: string[] }> = {
  공통수학1: {
    minTypes: 140,
    majors: ["다항식", "방정식과 부등식", "경우의 수", "행렬"],
  },
  공통수학2: {
    minTypes: 150,
    majors: ["도형의 방정식", "집합과 명제", "함수"],
  },
};

const LEVELS = new Set(["하", "중하", "중", "중상", "상중", "상"]);

describe("RPM 고등 유형 색인 — 커밋된 산출물", () => {
  it("첫 범위 두 과목이 2022 판으로 들어 있고 유형 수가 실측 아래로 안 내려간다", () => {
    for (const [book, want] of Object.entries(IN_SCOPE)) {
      const b = catalog[book];
      expect(b, `${book} 이 색인에 없다`).toBeDefined();
      expect(b!.edition).toBe("2022");
      expect(b!.grade).toBe(book);
      expect(b!.types.length, `${book} 유형 수`).toBeGreaterThanOrEqual(
        want.minTypes,
      );
    }
  });

  it("깨진 머리와 경계 경고가 0 이다 — 하나라도 있으면 색인을 믿을 수 없다", () => {
    for (const book of Object.keys(IN_SCOPE)) {
      const b = catalog[book]!;
      expect(b.incomplete, `${book} 깨진머리`).toEqual([]);
      expect(b.boundary_warnings, `${book} 경계경고`).toEqual([]);
    }
  });

  it("대단원은 실측 목록과 글자까지 같다 — 본문이 바닥글로 잡히면 여기서 빨개진다", () => {
    for (const [book, want] of Object.entries(IN_SCOPE)) {
      const majors = [...new Set(catalog[book]!.types.map((t) => t.major))];
      expect(majors, `${book} 대단원`).toEqual(want.majors);
    }
  });

  it("유형마다 번호·제목·중단원이 있고, 같은 중단원 안에서 번호가 겹치지 않는다", () => {
    for (const book of Object.keys(IN_SCOPE)) {
      const seen = new Set<string>();
      for (const t of catalog[book]!.types) {
        expect(t.number, `${book} p${t.page}`).toMatch(/^\d{2}$/);
        expect(
          t.title.trim().length,
          `${book} ${t.number} 제목`,
        ).toBeGreaterThan(0);
        expect(t.minor, `${book} ${t.number} 중단원`).toBeTruthy();
        const key = `${t.minor}|${t.number}`;
        expect(seen.has(key), `${book} 겹친 유형 키 ${key}`).toBe(false);
        seen.add(key);
      }
    }
  });

  it("유형마다 난이도 표가 한 개 이상 붙어 있고 표 이름은 여섯 가지 안이다", () => {
    for (const book of Object.keys(IN_SCOPE)) {
      for (const t of catalog[book]!.types) {
        const n = Object.values(t.levels).reduce((s, v) => s + v, 0);
        expect(n, `${book} ${t.minor}|${t.number} 난이도 표`).toBeGreaterThan(
          0,
        );
        for (const k of Object.keys(t.levels))
          expect(LEVELS.has(k), k).toBe(true);
      }
    }
  });
});

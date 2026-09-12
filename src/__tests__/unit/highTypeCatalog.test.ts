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
 *
 * 갱신 이력:
 *  - 148/157 → **170/177** (같은 날). 첫 판이 「유형」 라벨로 머리를 잡아 **라벨 없는 머리
 *    42개**를 놓쳤다. 깨진머리·경계경고가 0 인 채로 조용히 모자랐다 — 그래서 아래에
 *    「중단원 안에서 번호가 건너뛰지 않는다」를 더했다(추출기의 `gap_warnings` 와 같은 축을
 *    커밋된 산출물에 대고 다시 묻는다).
 *  - 난이도 표는 **검은 조각만** 센다. 첫 판은 회색(꺼진 칸)까지 세어 거의 모든 유형이
 *    「하 … 상」을 함께 가진 것처럼 보였다. 아래 「하·상 동시」 비율 검사가 그 모양을 막는다.
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
    minTypes: 170,
    majors: ["다항식", "방정식과 부등식", "경우의 수", "행렬"],
  },
  공통수학2: {
    minTypes: 177,
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

  it("중단원 안에서 번호가 01 부터 건너뛰지 않는다 — 머리를 놓치면 여기서 빨개진다", () => {
    for (const book of Object.keys(IN_SCOPE)) {
      const byMinor = new Map<string, number[]>();
      for (const t of catalog[book]!.types) {
        const list = byMinor.get(t.minor!) ?? [];
        list.push(Number(t.number));
        byMinor.set(t.minor!, list);
      }
      for (const [minor, nums] of byMinor) {
        const max = Math.max(...nums);
        const missing = Array.from({ length: max }, (_, i) => i + 1).filter(
          (n) => !nums.includes(n),
        );
        expect(missing, `${book} ${minor} 빠진 번호`).toEqual([]);
      }
    }
  });

  it("난이도 표는 검은 조각만 셌다 — 「하」와 「상」을 함께 가진 유형이 드물다", () => {
    // 회색(꺼진 칸)까지 세면 「중」 문항 하나가 하·중·상을 다 남겨 거의 모든 유형이 둘을
    // 함께 가진다(첫 판 실측). 검은 것만 세면 공통수학1 0 · 공통수학2 0 이다(2026-09-13).
    for (const book of Object.keys(IN_SCOPE)) {
      const ts = catalog[book]!.types;
      const both = ts.filter((t) => "하" in t.levels && "상" in t.levels);
      expect(both.length / ts.length, `${book} 하·상 동시 비율`).toBeLessThan(
        0.1,
      );
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

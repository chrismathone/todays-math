/**
 * 물결 2D — 실물 맥락 5유형(`m1Real`·`m2Real`)의 검산.
 *
 * 1차 물결 계약(같은 씨앗 == 같은 문항 · `facts` 독립 재계산 · 답 ↔ facts ·
 * bareNumbers · 변형 폭)에 **이 트랙만의 계약 둘**을 더한다.
 *
 * ㉠ **그림 스펙도 검산 대상이다.** 스펙의 **모든 라벨**(`dims[].label` +
 *    `labels[].text`)에서 수를 긁어 모아 `facts` 의 기대 집합과 대조한다.
 *    한쪽만 보면 안 된다 — 세로 치수는 화살표(`dims`)와 글자(`labels`)가
 *    갈라져 있어서, `dims` 만 세면 그 수가 구조적으로 0 이 된다.
 *    그리고 **기대 집합은 문항 본문에서 다시 뽑는다** — `facts` 를 그림에도
 *    쓰고 기대값에도 쓰면 동어반복이라, 그림이 발문과 갈라져도 초록이다.
 *
 * ㉡ **실제 엔진으로 그려 본다.** `renderFigureSpec` 이 파이썬 엔진을 띄운다.
 *    에셋 이름이 틀렸거나 치수 화살표가 너무 짧거나 화폭을 넘으면 거기서 걸린다 —
 *    스펙을 눈으로만 보면 「성공적으로 렌더되는 오답」과 「아예 못 그리는 스펙」을
 *    구분하지 못한다.
 *
 * 그리고 유형 번호·제목·중단원명은 `scripts/rpm/rpm-type-catalog.json`(색인 정본)과
 * **직접 대조**한다. 이 검사가 곧 「지어낸 유형 금지」이고, 중단원명의 얇은 공백
 * (U+2009)도 여기서 잠긴다.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { bareNumbers, runawayDecimals } from "../../lib/elementary/rules";
import { renderFigureSpec } from "../../lib/figure/renderFigureSpec";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M1_REAL } from "../../lib/middle/m1Real";
import { M2_REAL } from "../../lib/middle/m2Real";
import type { MidProblem } from "../../lib/middle/types";

const SEEDS = [20260823, 1, 7777, 424242, 99991];
const REPO = path.resolve(__dirname, "../../..");

const VENDOR = path.join(REPO, "vendor", "figure-engine");
const hasEngine =
  existsSync(VENDOR) ||
  existsSync(process.env.FIGURE_ENGINE_PATH ?? "F:\\시험지변환기");

const OWNED = [...M1_REAL, ...M2_REAL];

/**
 * RPM 색인 정본의 중단원명. **가운데 공백은 U+2009(얇은 공백)라 눈에 안 보인다.**
 * 여기 한 번은 날 문자로 적는다 — `middleTypeCoverage.test.ts` 가 「등록된 중단원이
 * 어느 시험 파일엔가 **문자열로** 있는가」를 세기 때문이다. 이스케이프로만 적으면
 * 그 가드에서 이 중단원이 구조적으로 «시험 없음»이 된다.
 * 편집 중에 이 글자가 뭉개지면 바로 아래 `it` 이 잡는다.
 */
const MINOR_G2 = "일차함수와 그 그래프  ⑵";

type CatalogType = { minor: string; number: string; title: string };

/** 유형별 독립 검산 — 발문의 조건식을 **여기서 다시 세운다**(생성기 식을 옮겨 적지 않는다). */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // 정비례: (x0, y0) 이 y=ax 위 · 속력×시간 = 다리+기차
  "1-1|정비례와 반비례|04": (f) =>
    f.y0! === f.speed! * f.x0! &&
    f.speed! * f.t! === f.bridgeLen! + f.trainLen! &&
    f.bridgeLen! > 0 &&
    f.trainLen! > 0,
  // 반비례: 속력×시간이 (터널+기차) 로 일정
  "1-1|정비례와 반비례|14": (f) =>
    f.speed! * f.t! === f.tunnelLen! + f.trainLen! &&
    f.tunnelLen! > 0 &&
    f.trainLen! > 0,
  // 원뿔 부피 (1/3)πr²h 를 분당 rate·π 로 나눈 것이 t
  "1-2|입체도형의 겉넓이와 부피|18": (f) =>
    f.radius! * f.radius! * f.height! === 3 * f.rate! * f.t!,
  // 물의 양: 처음 + 분당×시간 = 들이, 그림이 정직하도록 처음은 들이의 40~60%
  [`2-1|${MINOR_G2}|11`]: (f) =>
    f.initial! + f.rate! * f.t! === f.capacity! &&
    f.rate! > 0 &&
    f.initial! * 10 >= f.capacity! * 4 &&
    f.initial! * 10 <= f.capacity! * 6,
  // 마주 보고 걷기: (두 속력의 합)×시간 = 거리
  [`2-1|${MINOR_G2}|12`]: (f) =>
    (f.speedA! + f.speedB!) * f.t! === f.dist! && f.speedA !== f.speedB,
};

/** 답 문자열의 첫 수가 `facts` 의 이 키와 같아야 한다. */
const ANSWER_KEY: Record<string, string> = {
  "1-1|정비례와 반비례|04": "t",
  "1-1|정비례와 반비례|14": "t",
  "1-2|입체도형의 겉넓이와 부피|18": "t",
  [`2-1|${MINOR_G2}|11`]: "t",
  [`2-1|${MINOR_G2}|12`]: "t",
};

/**
 * 그림에 적혀야 하는 수 — **본문에서 다시 뽑는다.**
 *
 * `facts` 로 기대값을 만들면 생성기가 그림에 엉뚱한 값을 실어도 초록이다
 * (지표의 «참»이 제품에서 오면 안 된다). 그래서 발문에 실제로 쓰인 수 중
 * **그림이 나타내는 양**만 골라 적는다. 골라내는 규칙은 유형마다 다르므로
 * 여기 손으로 적되, 값은 `content` 파싱으로 얻는다.
 */
const FIGURE_NUMBERS: Record<string, (p: MidProblem) => number[]> = {
  // 「길이가 A m인 기차가 길이가 B m인 다리」 — 그림에는 이 둘만 적힌다
  "1-1|정비례와 반비례|04": (p) => twoLengths(p.content),
  "1-1|정비례와 반비례|14": (p) => twoLengths(p.content),
  // 「반지름의 길이가 r cm, 높이가 h cm」
  "1-2|입체도형의 겉넓이와 부피|18": (p) => {
    const m = p.content.match(
      /반지름의 길이가 \$(\d+)\$ cm, 높이가 \$(\d+)\$ cm/,
    );
    if (!m) throw new Error(`발문에서 원뿔 치수를 못 읽었습니다: ${p.content}`);
    return [Number(m[1]), Number(m[2])];
  },
  // 「물을 C L까지 담을 수 있는 수조에 a L의 물이」
  [`2-1|${MINOR_G2}|11`]: (p) => {
    const m = p.content.match(
      /물을 \$(\d+)\$ L까지 담을 수 있는 수조에 \$(\d+)\$ L의 물이/,
    );
    if (!m) throw new Error(`발문에서 수조 수치를 못 읽었습니다: ${p.content}`);
    return [Number(m[1]), Number(m[2])];
  },
  // 「d m 떨어진 두 지점」 + 「분속 v m」 둘
  [`2-1|${MINOR_G2}|12`]: (p) => {
    const d = p.content.match(/\$(\d+)\$ m 떨어진 두 지점/);
    const v = [...p.content.matchAll(/분속 \$(\d+)\$ m/g)].map((x) =>
      Number(x[1]),
    );
    if (!d || v.length !== 2) {
      throw new Error(`발문에서 걷기 수치를 못 읽었습니다: ${p.content}`);
    }
    return [Number(d[1]), ...v];
  },
};

/** 「길이가 $A$ m인 … 길이가 $B$ m인 …」 두 자리를 순서대로. */
function twoLengths(content: string): number[] {
  const hits = [...content.matchAll(/길이가 \$(\d+)\$ m인/g)].map((m) =>
    Number(m[1]),
  );
  if (hits.length !== 2) {
    throw new Error(`발문에서 길이 둘을 못 읽었습니다: ${content}`);
  }
  return hits;
}

type SceneSpec = {
  kind?: string;
  items?: { asset?: string }[];
  dims?: { label?: string }[];
  labels?: { text?: string }[];
};

/** 스펙의 **모든** 라벨에서 수를 긁는다 — dims 만 보면 세로 치수가 구조적으로 0 이 된다. */
function figureNumbers(spec: unknown): number[] {
  const s = spec as SceneSpec;
  const texts = [
    ...(s.dims ?? []).map((d) => d.label ?? ""),
    ...(s.labels ?? []).map((l) => l.text ?? ""),
  ];
  return texts
    .flatMap((t) => t.match(/\d+(?:\.\d+)?/g) ?? [])
    .map((n) => Number(n));
}

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

function sorted(ns: number[]): number[] {
  return [...ns].sort((a, b) => a - b);
}

describe("물결 2D — 실물 맥락 5유형", () => {
  it("5유형이 등록돼 있다 (중1 3 · 중2 2)", () => {
    expect(M1_REAL.length).toBe(3);
    expect(M2_REAL.length).toBe(2);
    const keys = new Set(registeredTypes().map((e) => e.key));
    for (const e of OWNED) {
      expect(keys.has(e.key), `generate.ts 에 안 실린 유형: ${e.key}`).toBe(
        true,
      );
    }
  });

  it("2A 가 이미 등록한 유형과 겹치지 않는다 (키 유일성)", () => {
    const all = registeredTypes().map((e) => e.key);
    expect(new Set(all).size).toBe(all.length);
  });

  it("RPM 유형 번호·제목·중단원명이 색인 정본과 일치한다 (지어낸 유형 금지)", () => {
    const catalog = JSON.parse(
      readFileSync(
        path.join(REPO, "scripts/rpm/rpm-type-catalog.json"),
        "utf-8",
      ),
    ) as Record<string, { types: CatalogType[] }>;
    for (const e of OWNED) {
      const book = catalog[e.rpmBook];
      expect(book, `색인에 없는 책: ${e.rpmBook}`).toBeDefined();
      const hit = book!.types.find(
        (t) => t.minor === e.rpmMinor && t.number === e.rpmType,
      );
      expect(hit, `색인에 없는 유형: ${e.key}`).toBeDefined();
      expect(hit!.title, e.key).toBe(e.rpmTitle);
    }
  });

  it("중단원명의 얇은 공백(U+2009)이 정본 그대로다", () => {
    // 위 `MINOR_G2` 는 날 문자로 적혀 있다 — 뭉개졌으면 여기서 잡힌다.
    expect(MINOR_G2).toBe("일차함수와 그 그래프\u2009 ⑵");
    expect(MINOR_G2).not.toContain("  "); // 보통 공백 둘이면 정본과 다르다
    const linear2 = OWNED.filter((e) => e.rpmMinor.includes("\u2475"));
    expect(linear2.length).toBe(2);
    for (const e of linear2) {
      expect(e.rpmMinor).toBe("일차함수와 그 그래프\u2009 ⑵");
      expect(e.rpmMinor).not.toContain("  "); // 보통 공백 둘로 적으면 정본과 다르다
    }
  });

  it("우리 단원에 실측 이름으로 붙는다 (prisma/seed-data/units.ts 실측 2026-08-23)", () => {
    const count = new Map<string, number>();
    for (const e of OWNED) {
      count.set(e.unitSection, (count.get(e.unitSection) ?? 0) + 1);
    }
    expect(count).toEqual(
      new Map([
        ["정비례 관계 y=ax의 그래프", 1],
        ["반비례 관계 y=a/x의 그래프", 1],
        ["뿔의 겉넓이와 부피", 1],
        ["일차함수의 활용(속력, 도형, 기타)", 2],
      ]),
    );
  });

  for (const e of OWNED) {
    describe(`${e.key} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        expect(generateMiddleProblem(e.key, 20260823)).toEqual(
          generateMiddleProblem(e.key, 20260823),
        );
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.key];
        expect(verify, `검산식 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        const key = ANSWER_KEY[e.key];
        expect(key, `답 키 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(firstNumber(p.answer), `${p.answer} vs facts.${key}`).toBe(
            p.facts[key!],
          );
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          for (const p of generateMiddleSet(e.key, seed, 3)) {
            expect(bareNumbers(p.content), p.content).toEqual([]);
            expect(bareNumbers(p.answer), p.answer).toEqual([]);
            expect(bareNumbers(p.solution), p.solution).toEqual([]);
            expect(runawayDecimals(p.solution), p.solution).toEqual([]);
          }
        }
      });

      it("3문항을 뽑으면 발문이 전부 다르다", () => {
        const set = generateMiddleSet(e.key, 20260823, 3);
        expect(new Set(set.map((p) => p.content)).size).toBe(3);
      });

      // ── 이 트랙의 계약 ㉠ ────────────────────────────────────────
      it("그림 라벨의 수가 발문의 수와 같다 (그림 따로 발문 따로 금지)", () => {
        const want = FIGURE_NUMBERS[e.key];
        expect(want, `그림 기대값 누락: ${e.key}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            p.figureSpec,
            `${e.key} seed ${seed}: 그림이 없다`,
          ).toBeTruthy();
          expect(
            sorted(figureNumbers(p.figureSpec)),
            `seed ${seed} — 그림 라벨 ${JSON.stringify(
              figureNumbers(p.figureSpec),
            )} vs 발문 ${JSON.stringify(want!(p))}`,
          ).toEqual(sorted(want!(p)));
        }
      });

      it("그림이 `assetScene` 이고 실물 에셋을 싣는다", () => {
        const spec = generateMiddleProblem(e.key, 20260823)
          .figureSpec as SceneSpec;
        expect(spec.kind).toBe("assetScene");
        expect(spec.items?.length ?? 0).toBeGreaterThan(0);
        for (const it of spec.items!) {
          expect(typeof it.asset, JSON.stringify(it)).toBe("string");
        }
      });
    });
  }

  it("에셋 이름이 전부 manifest 에 있다 (지어낸 에셋 금지)", () => {
    // 조각 이름을 손으로 적으면 새 조각이 생겼을 때 그 에셋이 구조적으로 «없는 것»이
    // 된다 — 파이썬 로더와 **같은 규칙**(manifest*.json 전부)으로 훑는다.
    const dir = path.join(REPO, "scripts", "figure", "assets");
    const files = readdirSync(dir).filter(
      (f) => f.startsWith("manifest") && f.endsWith(".json"),
    );
    expect(
      files.length,
      "manifest 조각을 하나도 못 찾았습니다",
    ).toBeGreaterThan(0);
    const slugs = new Set<string>();
    for (const f of files) {
      const rows = (
        JSON.parse(readFileSync(path.join(dir, f), "utf-8")) as {
          assets?: { slug: string }[];
        }
      ).assets;
      for (const row of rows ?? []) slugs.add(row.slug);
    }
    expect(slugs.size, "manifest 를 하나도 못 읽었습니다").toBeGreaterThan(0);
    for (const e of OWNED) {
      const spec = generateMiddleProblem(e.key, 20260823)
        .figureSpec as SceneSpec;
      for (const it of spec.items!) {
        expect(
          slugs.has(it.asset!),
          `${e.key}: manifest 밖 에셋 ${it.asset}`,
        ).toBe(true);
      }
    }
  });

  it("변형 공간을 넘겨 달라고 하면 조용히 모자란 세트를 내지 않고 던진다", () => {
    // 원뿔 유형의 조합은 반지름 4 × 높이 6 × 속력 7 = 168 이 상한이고 그중 상당수가
    // 정수 조건에 걸린다 — 400 문항은 어떤 씨앗으로도 못 채운다.
    expect(() =>
      generateMiddleSet("1-2|입체도형의 겉넓이와 부피|18", 20260823, 400),
    ).toThrow(/변형 공간/);
  });

  // ── 이 트랙의 계약 ㉡ ──────────────────────────────────────────
  describe.skipIf(!hasEngine)("실제 엔진 렌더", () => {
    it("5유형 전부가 실제로 그려진다", async () => {
      for (const e of OWNED) {
        for (const seed of SEEDS.slice(0, 3)) {
          const p = generateMiddleProblem(e.key, seed);
          const r = await renderFigureSpec(p.figureSpec);
          expect(r.ok, `${e.key} seed ${seed}: ${r.ok ? "" : r.error}`).toBe(
            true,
          );
        }
      }
    }, 60_000);

    it("그림 라벨의 글자가 SVG 에 그대로 들어간다", async () => {
      for (const e of OWNED) {
        const p = generateMiddleProblem(e.key, 20260823);
        const r = await renderFigureSpec(p.figureSpec);
        expect(r.ok).toBe(true);
        if (!r.ok) continue;
        const spec = p.figureSpec as SceneSpec;
        for (const d of spec.dims ?? []) {
          if (d.label) expect(r.svg, `${e.key}: ${d.label}`).toContain(d.label);
        }
        for (const l of spec.labels ?? []) {
          if (l.text) expect(r.svg, `${e.key}: ${l.text}`).toContain(l.text);
        }
      }
    }, 60_000);
  });
});

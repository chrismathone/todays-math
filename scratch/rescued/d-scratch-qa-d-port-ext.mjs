/**
 * `m2GeoQuad` 확장 유형(18~)의 검산을 **갈래 시험**으로 옮긴다.
 *
 * main 이 2026-08-27 에 세운 규약: 모듈 시험은 `isCatalogType` 으로 **색인 유형만**
 * 본다. 우리가 지은 확장 유형의 검산은 그 갈래의 시험 파일이 든다.
 */
import { readFileSync, writeFileSync } from "node:fs";

const LF = "\n";
const CR = "\r\n";
const target = "src/__tests__/unit/midTypesD.test.ts";
const raw = readFileSync(target, "utf8");
const wasCrlf = raw.includes(CR);
let src = raw.split(CR).join(LF);
const verify = readFileSync("scratch/qa-d/verify-ext.txt", "utf8")
  .split(CR)
  .join(LF)
  // 모듈 시험은 `중단원|번호` 로 키를 썼다. 여기서는 등록 키 전체를 쓴다.
  .replace(/"여러 가지 사각형\|(\d+)"/g, (_m, no) => `"2-2|여러 가지 사각형|${no}"`);

function must(cond, why) {
  if (!cond) {
    console.error("MELT:", why);
    process.exit(1);
  }
}

const anchorImport = `import { generateMiddleProblem } from "@/lib/middle/generate";`;
must(src.includes(anchorImport), "generate import 앵커 없음");
src = src.replace(
  anchorImport,
  () =>
    `import {
  generateMiddleProblem,
  generateMiddleSet,
} from "@/lib/middle/generate";`,
);

const anchorJosa = `import { josaMismatches, pageSmells } from "../helpers/midPage";`;
must(src.includes(anchorJosa), "midPage import 앵커 없음");
src = src.replace(
  anchorJosa,
  () =>
    `import { josaMismatches, pageSmells } from "../helpers/midPage";
import { isCatalogType } from "../helpers/rpmCatalog";`,
);

const block = `
/* ────────────────── 확장 유형의 값 검산 (m2GeoQuad 18~) ──────────────────
 *
 * main 이 2026-08-27 에 세운 규약이다 — 모듈 시험(\`middleM2Geo\`)은
 * \`isCatalogType\` 으로 **색인 유형만** 보고, 우리가 «지은» 확장 유형의 검산은
 * 그 갈래의 시험이 든다. 그래야 남의 모듈 시험이 우리 유형을 자기 검산표에
 * 들이대지 않는다.
 *
 * 검산은 **도형을 실제로 세워 잰다.** 넓이·길이·각은 조건식이 곧 생성식이라
 * 공식을 옮겨 적으면 동어반복이 된다. 교점은 «중점»으로 가정하지 않고 두
 * 직선을 직접 만나게 해서 구한다.
 */

type P2 = readonly [number, number];

const dist = (a: P2, b: P2): number => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** 벡터 b→a 와 b→c 의 내적. */
const dot = (a: P2, b: P2, c: P2): number =>
  (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]);

const near = (a: number, b: number, eps = 1e-9): boolean =>
  Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));

/** 삼각형의 넓이 — 신발끈. */
function triArea(a: P2, b: P2, c: P2): number {
  return (
    Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
  );
}

/** 각 \`∠abc\` 의 크기(도) — 세 점에서 직접 잰다. */
function angleDeg(a: P2, b: P2, c: P2): number {
  const u = Math.hypot(a[0] - b[0], a[1] - b[1]);
  const v = Math.hypot(c[0] - b[0], c[1] - b[1]);
  return (
    (Math.acos(Math.min(1, Math.max(-1, dot(a, b, c) / (u * v)))) * 180) /
    Math.PI
  );
}

/** 선분 \`ab\` 의 내분점 (\`t\`=0 이면 a, 1 이면 b). */
function lerpP(a: P2, b: P2, t: number): P2 {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}

/** 두 직선 \`ab\` · \`cd\` 의 교점 — «어디서 만나는가»를 **가정하지 않고** 푼다. */
function lineInter(a: P2, b: P2, c: P2, d: P2): P2 {
  const r: P2 = [b[0] - a[0], b[1] - a[1]];
  const s: P2 = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den;
  return [a[0] + t * r[0], a[1] + t * r[1]];
}

const EXT_VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
VERIFY_BODY
};

/** 이 갈래가 \`m2GeoQuad\` 에 **지은** 유형 — 색인 밖 번호가 곧 그 표시다. */
const GEO_QUAD_EXT = M2_GEO_QUAD.filter((e) => !isCatalogType(e));

const EXT_SEEDS = [20260827, 1, 7777, 424242, 99991];

describe("갈래 D 가 m2GeoQuad 에 지은 확장 유형", () => {
  it("확장 유형은 하나도 빠짐없이 검산식을 갖는다", () => {
    const missing = GEO_QUAD_EXT.filter((e) => !EXT_VERIFY[e.key]).map(
      (e) => e.key,
    );
    expect(missing, "검산식 없는 확장 유형").toEqual([]);
    expect(GEO_QUAD_EXT.length).toBeGreaterThan(0);
  });

  for (const e of GEO_QUAD_EXT) {
    describe(\`\${e.rpmType} \${e.rpmTitle}\`, () => {
      it("씨앗별 독립 검산 — 도형을 세워 재면 발문의 수치가 맞는다", () => {
        const verify = EXT_VERIFY[e.key];
        expect(verify, \`검산식 누락: \${e.key}\`).toBeDefined();
        for (const seed of EXT_SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            \`seed \${seed} 검산 실패: \${JSON.stringify(p.facts)}\`,
          ).toBe(true);
        }
      });

      it("답의 첫 수가 facts.x 와 같다", () => {
        for (const seed of EXT_SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const m = p.answer.match(/-?\\d+(?:\\.\\d+)?/);
          expect(m, \`답에 수가 없다: \${p.answer}\`).not.toBeNull();
          expect(Number(m![0]), \`\${p.answer} vs \${JSON.stringify(p.facts)}\`).toBe(
            p.facts.x,
          );
        }
      });

      it("그림이 있고, 스펙의 수는 전부 유한하며, 숫자 라벨은 facts 에 있다", () => {
        for (const seed of EXT_SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const spec = p.figureSpec as Record<string, unknown> | null;
          expect(spec, \`\${e.key} seed \${seed}: 그림이 없다\`).not.toBeNull();
          expect(spec!.version).toBe(2);
          expect(everyNumberFinite(spec), "스펙에 NaN/무한대").toBe(true);
          const values = new Set(Object.values(p.facts));
          for (const n of numericLabels(spec!)) {
            expect(
              values.has(n),
              \`\${e.key} seed \${seed}: 그림 라벨 \${n} 이 facts 에 없다\`,
            ).toBe(true);
          }
        }
      });

      it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
        const set = generateMiddleSet(e.key, 20260827, 4);
        expect(new Set(set.map((p) => p.content)).size, e.key).toBe(4);
      });
    });
  }

  it("그림이 발문과 같은 말을 한다 — 비·각을 지면 좌표에서 되잰다", () => {
    // 09 §4-20. «대충 그린» 그림은 에러를 안 내고 지면에서만 거짓말한다.
    const pointsOf = (key: string, seed: number): Record<string, P2> =>
      (
        generateMiddleProblem(key, seed).figureSpec as {
          points: Record<string, P2>;
        }
      ).points;
    for (const seed of EXT_SEEDS) {
      // 23 — 두 대각선의 교점 $O$ 가 실제로 두 대각선 위에 있는가
      const k23 = "2-2|여러 가지 사각형|23";
      const p23 = pointsOf(k23, seed);
      const span = Math.max(dist(p23.A!, p23.C!), dist(p23.B!, p23.D!));
      expect(
        triArea(p23.A!, p23.O!, p23.C!) / span,
        \`23 seed \${seed}: O 가 대각선 AC 밖이다\`,
      ).toBeLessThan(0.05);
      expect(
        triArea(p23.B!, p23.O!, p23.D!) / span,
        \`23 seed \${seed}: O 가 대각선 BD 밖이다\`,
      ).toBeLessThan(0.05);

      // 24 — 대각선:변 의 비
      const k24 = "2-2|여러 가지 사각형|24";
      const f24 = generateMiddleProblem(k24, seed).facts;
      const p24 = pointsOf(k24, seed);
      const want24 = f24.mode === 0 ? f24.c! / f24.b! : f24.x! / f24.a!;
      const got24 =
        f24.mode === 0
          ? dist(p24.A!, p24.C!) / dist(p24.B!, p24.C!)
          : dist(p24.A!, p24.C!) / dist(p24.A!, p24.B!);
      expect(
        Math.abs(got24 - want24),
        \`24 seed \${seed}: 그림의 비 \${got24} ≠ 발문의 \${want24}\`,
      ).toBeLessThan(0.02);

      // 25 — 두 대각선의 비
      const k25 = "2-2|여러 가지 사각형|25";
      const f25 = generateMiddleProblem(k25, seed).facts;
      const p25 = pointsOf(k25, seed);
      expect(
        Math.abs(dist(p25.A!, p25.C!) / dist(p25.B!, p25.D!) - f25.m! / f25.n!),
        \`25 seed \${seed}: 두 대각선의 비가 발문과 다르다\`,
      ).toBeLessThan(0.02);

      // 27 — 지면의 $\\angle PAB$
      const k27 = "2-2|여러 가지 사각형|27";
      const f27 = generateMiddleProblem(k27, seed).facts;
      const p27 = pointsOf(k27, seed);
      expect(
        Math.abs(angleDeg(p27.P!, p27.A!, p27.B!) - f27.a!),
        \`27 seed \${seed}: 그림의 각이 발문과 다르다\`,
      ).toBeLessThan(0.5);
    }
  });
});

/** 스펙 JSON 안의 모든 수가 유한한가 — NaN 이 조용히 새는 것을 막는다. */
function everyNumberFinite(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (Array.isArray(v)) return v.every(everyNumberFinite);
  if (v !== null && typeof v === "object") {
    return Object.values(v).every(everyNumberFinite);
  }
  return true;
}

/** 스펙의 labels 에서 «숫자 라벨»만 뽑는다 (\`12 cm\` → 12). */
function numericLabels(spec: Record<string, unknown>): number[] {
  const labels = (spec.labels ?? {}) as Record<string, unknown>;
  const out: number[] = [];
  for (const value of Object.values(labels)) {
    const text =
      typeof value === "string"
        ? value
        : typeof (value as { text?: unknown })?.text === "string"
          ? (value as { text: string }).text
          : null;
    if (text === null) continue;
    const m = /^(\\d+(?:\\.\\d+)?)(?:\\s*(?:cm|m|°))?$/.exec(text.trim());
    if (m) out.push(Number(m[1]));
  }
  return out;
}
`.replace("VERIFY_BODY", verify.trimEnd());

src = src.trimEnd() + "\n" + block;

writeFileSync(target, wasCrlf ? src.split(LF).join(CR) : src);
console.log("ok", src.length);

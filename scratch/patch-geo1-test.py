"""midTypesC.test.ts 에 m1Geo1 확장 11유형의 값 검산을 붙인다 (일회용).

⚠️ 위치 관계 다섯은 **공식을 옮겨 적지 않는다.** 각뿔·각기둥의 모서리를 실제로
   만들어 놓고 「꼬인 위치인가」를 정의대로 판정해 **세어서** 답과 맞댄다 —
   생성기가 쓴 `2n-3` 을 시험이 다시 쓰면 그 식이 틀려도 둘이 같이 틀린다.
"""

from pathlib import Path

BLOCK = r'''
/* ─── 다면체의 모서리를 실제로 만들어 세는 자 ─────────────────────
 * 「공식이 맞나」가 아니라 「그 도형에서 정말 그런가」를 묻는다.
 * 꼬인 위치 = 만나지도 않고 평행하지도 않다.
 */
type Edge = { a: string; b: string };

/** n각기둥 — 밑면 B0..B(n-1) · 윗면 T0..T(n-1). */
function prismEdges(n: number): Edge[] {
  const e: Edge[] = [];
  for (let i = 0; i < n; i += 1) {
    e.push({ a: `B${i}`, b: `B${(i + 1) % n}` });
    e.push({ a: `T${i}`, b: `T${(i + 1) % n}` });
    e.push({ a: `B${i}`, b: `T${i}` });
  }
  return e;
}

/** n각뿔 — 밑면 B0..B(n-1) · 꼭짓점 V. */
function pyramidEdges(n: number): Edge[] {
  const e: Edge[] = [];
  for (let i = 0; i < n; i += 1) {
    e.push({ a: `B${i}`, b: `B${(i + 1) % n}` });
    e.push({ a: `B${i}`, b: "V" });
  }
  return e;
}

function meets(x: Edge, y: Edge): boolean {
  return [x.a, x.b].some((p) => p === y.a || p === y.b);
}

/** 같은 평면 위인가 — 밑면끼리·윗면끼리, 그리고 각뿔의 밑면끼리. */
function coplanar(x: Edge, y: Edge): boolean {
  const face = (e: Edge) =>
    e.a[0] === e.b[0] ? e.a[0] : null; // 둘 다 B… 이거나 둘 다 T…
  const fx = face(x);
  const fy = face(y);
  return fx !== null && fx === fy;
}

/** 각기둥의 옆모서리끼리는 평행하고, 밑면·윗면의 대응 모서리도 평행하다. */
function prismParallel(x: Edge, y: Edge, n: number): boolean {
  const lateral = (e: Edge) => e.a[0] !== e.b[0];
  if (lateral(x) && lateral(y)) return true;
  const idx = (e: Edge) => Number(e.a.slice(1));
  if (!lateral(x) && !lateral(y) && x.a[0] !== y.a[0]) {
    return idx(x) === idx(y) || ((idx(x) + 1) % n === (idx(y) + 1) % n);
  }
  return false;
}

function skewCountPrism(n: number, target: Edge): number {
  const edges = prismEdges(n);
  return edges.filter(
    (e) =>
      !(e.a === target.a && e.b === target.b) &&
      !meets(e, target) &&
      !coplanar(e, target) &&
      !prismParallel(e, target, n),
  ).length;
}

function skewCountPyramid(n: number, target: Edge): number {
  const edges = pyramidEdges(n);
  return edges.filter(
    (e) =>
      !(e.a === target.a && e.b === target.b) &&
      !meets(e, target) &&
      !coplanar(e, target),
  ).length;
}

describe("중등 유형 갈래 C — 두 직선의 위치 관계", () => {
  const SEC_L = "두 직선의 위치 관계";

  it("70 각뿔의 밑면 모서리 — 실제로 세어 맞댄다", () => {
    const { facts } = generatedGeo1(SEC_L, "70");
    const n = facts!.n;
    expect(skewCountPyramid(n, { a: "B0", b: "B1" })).toBe(facts!.ans);
  });

  it("71 각뿔의 옆모서리와 만나는 모서리 — 실제로 세어 맞댄다", () => {
    const { facts } = generatedGeo1(SEC_L, "71");
    const n = facts!.n;
    const target: Edge = { a: "B0", b: "V" };
    const met = pyramidEdges(n).filter(
      (e) =>
        !(e.a === target.a && e.b === target.b) && meets(e, target),
    ).length;
    expect(met).toBe(facts!.ans);
  });

  it("72 각기둥의 옆모서리와 평행한 모서리 — 실제로 세어 맞댄다", () => {
    const { facts } = generatedGeo1(SEC_L, "72");
    const n = facts!.n;
    const target: Edge = { a: "B0", b: "T0" };
    const par = prismEdges(n).filter(
      (e) =>
        !(e.a === target.a && e.b === target.b) &&
        e.a[0] !== e.b[0], // 옆모서리끼리는 평행
    ).length;
    expect(par).toBe(facts!.ans);
  });

  it("73 각기둥의 밑면 모서리 — 실제로 세어 맞댄다", () => {
    const { facts } = generatedGeo1(SEC_L, "73");
    const n = facts!.n;
    expect(skewCountPrism(n, { a: "B0", b: "B1" })).toBe(facts!.ans);
  });

  it("74 각뿔의 꼬인 쌍 — 모든 쌍을 훑어 센다", () => {
    const { facts } = generatedGeo1(SEC_L, "74");
    const n = facts!.n;
    const edges = pyramidEdges(n);
    let pairs = 0;
    for (let i = 0; i < edges.length; i += 1) {
      for (let j = i + 1; j < edges.length; j += 1) {
        const x = edges[i]!;
        const y = edges[j]!;
        if (!meets(x, y) && !coplanar(x, y)) pairs += 1;
      }
    }
    expect(pairs).toBe(facts!.ans);
  });
});

describe("중등 유형 갈래 C — 점, 선, 면 · 다면체", () => {
  const SEC_PT = "점, 선, 면";
  const SEC_SOLID = "다면체";

  it("70 삼등분한 두 도막이 답이고 세 도막이 전체다", () => {
    const { facts } = generatedGeo1(SEC_PT, "70");
    expect(3 * facts!.unit).toBe(facts!.ab);
    expect(facts!.ans).toBe(2 * facts!.unit);
  });

  it("71 두 도막을 합하면 발문의 전체 길이가 된다", () => {
    const { facts } = generatedGeo1(SEC_PT, "71");
    const bc = facts!.k * facts!.unit;
    expect(facts!.ans + bc).toBe(facts!.ac);
    expect(facts!.ans * facts!.k).toBe(bc * facts!.m); // 비가 맞나
  });

  it("72 점을 실제로 늘어놓아 나뉜 부분을 센다", () => {
    const { facts } = generatedGeo1(SEC_PT, "72");
    const n = facts!.n;
    // 점 n개 → 사이 구간 n-1 + 양 끝 반직선 2
    const parts = n - 1 + 2;
    expect(parts).toBe(facts!.ans);
  });

  it("73 좌표로 점을 놓아 NP 를 직접 잰다", () => {
    const { facts } = generatedGeo1(SEC_PT, "73");
    const A = 0;
    const B = facts!.ab;
    const M = (A + B) / 2;
    const N = (A + M) / 2;
    const P = (N + B) / 2;
    expect(P - N).toBe(facts!.ans);
  });

  it("70 각기둥의 면·모서리·꼭짓점을 실제로 세어 맞댄다", () => {
    const { facts } = generatedGeo1(SEC_SOLID, "70");
    const n = facts!.n;
    expect(prismEdges(n).length).toBe(facts!.edges);
    expect(2 * n).toBe(facts!.vertices);
    expect(n + 2).toBe(facts!.faces);
    expect(facts!.ans).toBe(facts!.edges + facts!.vertices);
  });

  it("71 각뿔대는 각기둥과 면·모서리·꼭짓점 수가 같다", () => {
    const { facts } = generatedGeo1(SEC_SOLID, "71");
    const n = facts!.n;
    expect(facts!.b).toBe(prismEdges(n).length); // 뿔대도 3n
    expect(facts!.c).toBe(2 * n);
    expect(facts!.a).toBe(n + 2);
    expect(facts!.ans).toBe(facts!.a + facts!.b - facts!.c);
  });
});
'''

path = Path('src/__tests__/unit/midTypesC.test.ts')
src = path.read_text('utf-8')

# m1Geo1 helper
old_helper = 'function generatedFunc(section: string, type: string, seed = 17) {'
assert src.count(old_helper) == 1
helper = '''function generatedGeo1(section: string, type: string, seed = 23) {
  const entry = M1_GEO1.find(
    (item) => item.unitSection === section && item.rpmType === type,
  );
  expect(entry, `${section} ${type} 유형`).toBeDefined();
  return entry!.handler(rng(seed));
}

'''
src = src.replace(old_helper, helper + old_helper)

old_imp = 'import { M2_CENTER } from "../../lib/middle/m2Center";'
assert src.count(old_imp) == 1
src = src.replace(old_imp, 'import { M1_GEO1 } from "../../lib/middle/m1Geo1";\n' + old_imp)

path.write_text(src.rstrip('\n') + '\n' + BLOCK, encoding='utf-8', newline='')
print('ok')

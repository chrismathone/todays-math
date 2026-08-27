"""m1Geo1.ts 에 갈래 C 확장 유형 11개를 붙인다 (일회용).

두 직선의 위치 관계 +5 · 점,선,면 +4 · 다면체 +2.

기존 유형과 **소재가 겹치지 않게** 골랐다 — 기존 두직선 다섯은 사면체·삼각기둥·
정n각형·직육면체를 쓰므로, 새 다섯은 **각뿔과 n각기둥의 일반형**으로 간다.
"""

from pathlib import Path

BLOCK = r'''
export const M1_GEO1_EXT: TypeEntry[] = [
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 「위치 관계」를 20, 「기본 도형」을 14, 「다면체와 회전체」를 20 까지만
  // 담는다. 130소단원을 10유형으로 올리려면 색인에 없는 유형을 지어야 하므로
  // 번호를 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def(
    MINOR_POS,
    "70",
    "각뿔에서 밑면의 한 모서리와 꼬인 위치에 있는 모서리",
    SEC.두직선,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 4, 8);
      return {
        content: `${gonName(n)}뿔에서 밑면의 한 모서리와 꼬인 위치에 있는 모서리의 개수를 구하시오.`,
        answer: `$${n - 2}$개`,
        solution: `밑면의 모서리는 다른 밑면의 모서리와 한 평면 위에 있으므로 꼬인 위치가 아니다.\n옆모서리 $${n}$개 중 그 모서리의 양 끝점에서 만나는 $2$개를 빼면 $${n}-2=${n - 2}$개가 꼬인 위치에 있다.`,
        facts: { n, ans: n - 2, kind: 0 },
      };
    },
  ),

  def(
    MINOR_POS,
    "71",
    "각뿔에서 한 옆모서리와 만나는 모서리",
    SEC.두직선,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 4, 8);
      return {
        content: `${gonName(n)}뿔에서 한 옆모서리와 만나는 모서리의 개수를 구하시오.`,
        answer: `$${n + 1}$개`,
        solution: `꼭짓점에서 나머지 옆모서리 $${n - 1}$개와 만나고, 밑면의 꼭짓점에서 밑면의 모서리 $2$개와 만난다.\n따라서 $${n - 1}+2=${n + 1}$개이다.`,
        facts: { n, ans: n + 1, kind: 1 },
      };
    },
  ),

  def(
    MINOR_POS,
    "72",
    "각기둥에서 한 옆모서리와 평행한 모서리",
    SEC.두직선,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 4, 9);
      return {
        content: `${gonName(n)}기둥에서 한 옆모서리와 평행한 모서리의 개수를 구하시오.`,
        answer: `$${n - 1}$개`,
        solution: `각기둥의 옆모서리는 모두 서로 평행하다.\n옆모서리는 $${n}$개이므로 자기 자신을 뺀 $${n}-1=${n - 1}$개가 평행하다.`,
        facts: { n, ans: n - 1, kind: 2 },
      };
    },
  ),

  def(
    MINOR_POS,
    "73",
    "각기둥에서 한 밑면 모서리와 꼬인 위치에 있는 모서리",
    SEC.두직선,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 4, 8);
      return {
        content: `${gonName(n)}기둥에서 한 밑면의 모서리와 꼬인 위치에 있는 모서리의 개수를 구하시오.`,
        answer: `$${2 * n - 3}$개`,
        solution: `같은 밑면의 모서리는 한 평면 위에 있으므로 꼬인 위치가 아니다.\n다른 밑면의 모서리 $${n}$개 중 평행한 $1$개를 뺀 $${n - 1}$개, 옆모서리 $${n}$개 중 양 끝에서 만나는 $2$개를 뺀 $${n - 2}$개가 꼬인 위치에 있다.\n따라서 $${n - 1}+${n - 2}=${2 * n - 3}$개이다.`,
        facts: { n, ans: 2 * n - 3, kind: 3 },
      };
    },
  ),

  def(
    MINOR_POS,
    "74",
    "각뿔에서 꼬인 위치에 있는 모서리의 쌍의 개수",
    SEC.두직선,
    "심화",
    (rng): Body => {
      const n = intBetween(rng, 4, 7);
      return {
        content: `${gonName(n)}뿔에서 서로 꼬인 위치에 있는 두 모서리의 쌍은 모두 몇 쌍인지 구하시오.`,
        answer: `$${n * (n - 2)}$쌍`,
        solution: `밑면의 모서리끼리는 한 평면 위에 있고, 옆모서리끼리는 꼭짓점에서 만나므로 꼬인 위치가 아니다.\n밑면의 모서리 하나마다 꼬인 위치인 옆모서리가 $${n - 2}$개이므로 $${n}\\times${n - 2}=${n * (n - 2)}$쌍이다.`,
        facts: { n, ans: n * (n - 2), kind: 4 },
      };
    },
  ),

  def(
    MINOR_BASE,
    "70",
    "선분을 삼등분하는 점",
    SEC.점선면,
    "기본",
    (rng): Body => {
      const unit = intBetween(rng, 2, 9);
      const ab = 3 * unit;
      return {
        content: `선분 $AB$ 위의 두 점 $P$, $Q$가 $\\overline{AB}$를 삼등분한다. $\\overline{AB}=${ab}\\,\\mathrm{cm}$일 때, $\\overline{AQ}$의 길이를 구하시오.`,
        answer: `$${2 * unit}\\,\\mathrm{cm}$`,
        solution: `삼등분한 한 도막의 길이는 $\\dfrac{${ab}}{3}=${unit}\\,\\mathrm{cm}$이다.\n$\\overline{AQ}$는 그 두 도막이므로 $2\\times${unit}=${2 * unit}\\,\\mathrm{cm}$이다.`,
        facts: { ab, unit, ans: 2 * unit },
      };
    },
  ),

  def(
    MINOR_BASE,
    "71",
    "두 점 사이의 거리의 비",
    SEC.점선면,
    "응용",
    (rng): Body => {
      const m = intBetween(rng, 1, 5);
      const k = intBetween(rng, 1, 5);
      const unit = intBetween(rng, 2, 8);
      const ac = (m + k) * unit;
      return {
        content: `수직선 위에 세 점 $A$, $B$, $C$가 이 순서로 있고 $\\overline{AB}:\\overline{BC}=${m}:${k}$이다. $\\overline{AC}=${ac}\\,\\mathrm{cm}$일 때, $\\overline{AB}$의 길이를 구하시오.`,
        answer: `$${m * unit}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AC}$를 $${m}+${k}=${m + k}$등분한 한 도막은 $\\dfrac{${ac}}{${m + k}}=${unit}\\,\\mathrm{cm}$이다.\n$\\overline{AB}$는 그 $${m}$도막이므로 $${m}\\times${unit}=${m * unit}\\,\\mathrm{cm}$이다.`,
        facts: { m, k, unit, ac, ans: m * unit },
      };
    },
  ),

  def(
    MINOR_BASE,
    "72",
    "직선 위의 점들이 나누는 부분의 개수",
    SEC.점선면,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 3, 9);
      return {
        content: `한 직선 위에 서로 다른 $${n}$개의 점이 있다. 이 점들에 의해 직선이 나누어지는 부분은 모두 몇 개인지 구하시오.`,
        answer: `$${n + 1}$개`,
        solution: `점 $${n}$개 사이에 생기는 선분이 $${n - 1}$개이고, 양 끝에 반직선이 $2$개 생긴다.\n따라서 $${n - 1}+2=${n + 1}$개이다.`,
        facts: { n, ans: n + 1 },
      };
    },
  ),

  def(
    MINOR_BASE,
    "73",
    "중점이 겹칠 때 선분의 길이",
    SEC.점선면,
    "심화",
    (rng): Body => {
      const unit = intBetween(rng, 2, 8);
      const ab = 4 * unit; // M=AB중점, N=AM중점, P=NB중점 이 정수가 되게
      return {
        content: `선분 $AB$의 중점을 $M$, $\\overline{AM}$의 중점을 $N$, $\\overline{NB}$의 중점을 $P$라 하자. $\\overline{AB}=${ab}\\,\\mathrm{cm}$일 때, $\\overline{NP}$의 길이를 구하시오.`,
        answer: `$${(3 * unit) / 2}\\,\\mathrm{cm}$`,
        solution: `$\\overline{AM}=${2 * unit}$, $\\overline{AN}=${unit}\\,\\mathrm{cm}$이다.\n$\\overline{NB}=${ab}-${unit}=${ab - unit}\\,\\mathrm{cm}$이므로 $\\overline{NP}=\\dfrac{${ab - unit}}{2}=${(3 * unit) / 2}\\,\\mathrm{cm}$이다.`,
        facts: { ab, unit, ans: (3 * unit) / 2 },
      };
    },
  ),

  def(
    MINOR_SOLID,
    "70",
    "면의 개수가 주어진 각기둥의 모서리와 꼭짓점",
    SEC.다면체,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 4, 10);
      const faces = n + 2;
      return {
        content: `면의 개수가 $${faces}$인 각기둥의 모서리의 개수와 꼭짓점의 개수의 합을 구하시오.`,
        answer: `$${5 * n}$`,
        solution: `${gonName(n)}기둥의 면의 개수는 $${n}+2=${faces}$이므로 밑면은 ${gonName(n)}형이다.\n모서리는 $3\\times${n}=${3 * n}$개, 꼭짓점은 $2\\times${n}=${2 * n}$개이므로 합은 $${5 * n}$이다.`,
        facts: { n, faces, edges: 3 * n, vertices: 2 * n, ans: 5 * n },
      };
    },
  ),

  def(
    MINOR_SOLID,
    "71",
    "각뿔대의 면·모서리·꼭짓점의 개수",
    SEC.다면체,
    "기본",
    (rng): Body => {
      const n = intBetween(rng, 3, 9);
      return {
        content: `${gonName(n)}뿔대의 면의 개수를 $a$, 모서리의 개수를 $b$, 꼭짓점의 개수를 $c$라 할 때, $a+b-c$의 값을 구하시오.`,
        answer: `$${n + 2 + 3 * n - 2 * n}$`,
        solution: `${gonName(n)}뿔대는 두 밑면과 옆면 $${n}$개로 면이 $${n + 2}$개, 모서리가 $3\\times${n}=${3 * n}$개, 꼭짓점이 $2\\times${n}=${2 * n}$개이다.\n따라서 $a+b-c=${n + 2}+${3 * n}-${2 * n}=${n + 2 + n}$이다.`,
        facts: { n, a: n + 2, b: 3 * n, c: 2 * n, ans: n + 2 + n },
      };
    },
  ),
];
'''

path = Path('src/lib/middle/m1Geo1.ts')
src = path.read_text('utf-8')

# ⑴ 다면체 중단원·소단원 상수
old_min = 'const MINOR_POS = "위치 관계";'
assert src.count(old_min) == 1, src.count(old_min)
src = src.replace(old_min, old_min + '\nconst MINOR_SOLID = "다면체와 회전체";')

old_sec = '  평행선: "평행선",\n} as const;'
assert src.count(old_sec) == 1
src = src.replace(old_sec, '  평행선: "평행선",\n  다면체: "다면체",\n} as const;')

# ⑵ 확장 배열을 합본 앞에 넣고 spread 한다
marker = 'export const M1_GEO1: TypeEntry[] = [...M1_GEO1_BASE, ...M1_GEO1_POS];'
assert src.count(marker) == 1, src.count(marker)
src = src.replace(marker, BLOCK.strip() + '\n\n' + marker)

path.write_text(src, encoding='utf-8', newline='')
print('ok')

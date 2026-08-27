"""m1Geo2.ts 에 갈래 C 확장 유형 11개를 붙인다 (일회용).

작도 +3 · 합동 +3 · 이등변삼각형의 성질 +3 · 다각형의 내각과 외각 +2.

⚠️ 「이등변삼각형의 성질」은 **중2 · RPM 2-2 「삼각형의 성질」**이다. 이 파일의
   `def` 는 중1 · 1-2 로 굳어 있으므로 `def2` 를 따로 둔다 — 학년·책을 잘못
   붙이면 그 유형이 중1 시험지에 섞인다.
"""

from pathlib import Path

BLOCK = r'''
/**
 * 중2 · RPM 2-2 용 등록기 — 「이등변삼각형의 성질」이 이 파일에 들어오면서 필요해졌다.
 * `def` 는 중1 · 1-2 로 굳어 있어 그대로 쓰면 학년이 잘못 붙는다.
 */
function def2(
  minor: string,
  rpmType: string,
  rpmTitle: string,
  unitSection: string,
  difficulty: MidProblem["difficulty"],
  gen: (rng: Rng) => Body,
): TypeEntry {
  return {
    key: `2-2|${minor}|${rpmType}`,
    grade: "중2",
    unitSection,
    rpmBook: "2-2",
    rpmMinor: minor,
    rpmType,
    rpmTitle,
    handler: (rng) => ({
      grade: "중2",
      unitSection,
      rpmBook: "2-2",
      rpmMinor: minor,
      rpmType,
      rpmTitle,
      difficulty,
      ...gen(rng),
    }),
  };
}

export const M1_GEO2_EXT: TypeEntry[] = [
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 「작도와 합동」을 14, 「다각형」을 24, 「삼각형의 성질」을 12 까지만
  // 담는다. 색인에 없는 유형을 지어야 하므로 번호를 갈래마다 나눠 쓴다 — C 는 70번대.

  def(
    MINOR_CONSTR,
    "70",
    "나머지 한 변이 될 수 있는 자연수의 개수",
    SEC.작도,
    "기본",
    (rng): Body => {
      const a = intBetween(rng, 4, 12);
      const b = intBetween(rng, 4, 12);
      const lo = Math.abs(a - b); // x > lo
      const hi = a + b; // x < hi
      const ans = hi - lo - 1;
      return {
        content: `삼각형의 두 변의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$일 때, 나머지 한 변의 길이가 될 수 있는 자연수는 모두 몇 개인지 구하시오.`,
        answer: `$${ans}$개`,
        solution: `삼각형에서 한 변의 길이는 나머지 두 변의 길이의 합보다 작고 차보다 커야 한다.\n나머지 한 변의 길이를 $x\\,\\mathrm{cm}$라 하면 $${lo}<x<${hi}$이다.\n따라서 $x$는 $${lo + 1}$부터 $${hi - 1}$까지 $${ans}$개이다.`,
        facts: { a, b, lo, hi, ans },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "71",
    "세 수를 골라 삼각형을 만들 수 있는 경우의 수",
    SEC.작도,
    "응용",
    (rng): Body => {
      const pool = pickDistinct(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11], 4).sort(
        (x, y) => x - y,
      );
      let ans = 0;
      for (let i = 0; i < 4; i += 1) {
        for (let j = i + 1; j < 4; j += 1) {
          for (let k = j + 1; k < 4; k += 1) {
            if (pool[i]! + pool[j]! > pool[k]!) ans += 1;
          }
        }
      }
      return {
        content: `네 개의 선분의 길이가 각각 $${pool[0]}\\,\\mathrm{cm}$, $${pool[1]}\\,\\mathrm{cm}$, $${pool[2]}\\,\\mathrm{cm}$, $${pool[3]}\\,\\mathrm{cm}$이다. 이 중 세 개를 골라 삼각형을 만들 수 있는 경우는 모두 몇 가지인지 구하시오.`,
        answer: `$${ans}$가지`,
        solution: `세 개를 고르는 경우는 $4$가지이고, 그때마다 가장 긴 변이 나머지 두 변의 길이의 합보다 작은지 본다.\n조건을 만족시키는 것은 $${ans}$가지이다.`,
        facts: {
          p0: pool[0]!,
          p1: pool[1]!,
          p2: pool[2]!,
          p3: pool[3]!,
          ans,
        },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "72",
    "가장 긴 변의 길이의 최댓값",
    SEC.작도,
    "심화",
    (rng): Body => {
      const a = intBetween(rng, 5, 14);
      const b = intBetween(rng, 5, 14);
      const ans = a + b - 1;
      return {
        content: `삼각형의 두 변의 길이가 각각 $${a}\\,\\mathrm{cm}$, $${b}\\,\\mathrm{cm}$이고 나머지 한 변의 길이가 가장 길다. 나머지 한 변의 길이가 자연수일 때 그 최댓값을 구하시오.`,
        answer: `$${ans}\\,\\mathrm{cm}$`,
        solution: `나머지 한 변의 길이를 $x\\,\\mathrm{cm}$라 하면 가장 긴 변이므로 $x$는 나머지 두 변의 길이의 합보다 작아야 한다.\n$x<${a}+${b}=${a + b}$이므로 자연수 $x$의 최댓값은 $${ans}$이다.`,
        facts: { a, b, ans },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "73",
    "합동인 두 다각형의 둘레",
    SEC.합동,
    "기본",
    (rng): Body => {
      const s1 = intBetween(rng, 3, 12);
      const s2 = intBetween(rng, 3, 12);
      const s3 = intBetween(rng, 3, 12);
      const s4 = intBetween(rng, 3, 12);
      const total = s1 + s2 + s3 + s4;
      return {
        content: `사각형 $ABCD$와 사각형 $EFGH$가 합동이고 $\\overline{AB}=${s1}\\,\\mathrm{cm}$, $\\overline{BC}=${s2}\\,\\mathrm{cm}$, $\\overline{CD}=${s3}\\,\\mathrm{cm}$, $\\overline{DA}=${s4}\\,\\mathrm{cm}$이다. 사각형 $EFGH$의 둘레의 길이를 구하시오.`,
        answer: `$${total}\\,\\mathrm{cm}$`,
        solution: `합동인 두 도형은 대응변의 길이가 각각 같으므로 둘레의 길이도 같다.\n따라서 $${s1}+${s2}+${s3}+${s4}=${total}\\,\\mathrm{cm}$이다.`,
        facts: { s1, s2, s3, s4, total },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "74",
    "합동인 두 삼각형에서 나머지 각",
    SEC.합동,
    "기본",
    (rng): Body => {
      const p = intBetween(rng, 30, 80);
      const q = intBetween(rng, 30, 80);
      const r = 180 - p - q;
      if (r < 20) return { content: "", answer: "", solution: "" } as Body;
      return {
        content: `$\\triangle ABC$와 $\\triangle DEF$가 합동이고 $\\angle A=${p}^\\circ$, $\\angle B=${q}^\\circ$이다. $\\angle F$의 크기를 구하시오.`,
        answer: `$${r}^\\circ$`,
        solution: `합동인 두 삼각형은 대응각의 크기가 각각 같으므로 $\\angle D=${p}^\\circ$, $\\angle E=${q}^\\circ$이다.\n삼각형의 세 내각의 크기의 합은 $180^\\circ$이므로 $\\angle F=180^\\circ-${p}^\\circ-${q}^\\circ=${r}^\\circ$이다.`,
        facts: { p, q, r },
      };
    },
  ),

  def(
    MINOR_CONSTR,
    "75",
    "합동인 두 사각형에서 나머지 각",
    SEC.합동,
    "응용",
    (rng): Body =>
      attempt(200, (): Body | null => {
        const p = intBetween(rng, 50, 110);
        const q = intBetween(rng, 50, 110);
        const r = intBetween(rng, 50, 110);
        const s = 360 - p - q - r;
        if (s < 30 || s > 150) return null;
        return {
          content: `사각형 $ABCD$와 사각형 $EFGH$가 합동이고 $\\angle A=${p}^\\circ$, $\\angle B=${q}^\\circ$, $\\angle C=${r}^\\circ$이다. $\\angle H$의 크기를 구하시오.`,
          answer: `$${s}^\\circ$`,
          solution: `합동이므로 대응각의 크기가 각각 같아 $\\angle E=${p}^\\circ$, $\\angle F=${q}^\\circ$, $\\angle G=${r}^\\circ$이다.\n사각형의 네 내각의 크기의 합은 $360^\\circ$이므로 $\\angle H=360^\\circ-${p}^\\circ-${q}^\\circ-${r}^\\circ=${s}^\\circ$이다.`,
          facts: { p, q, r, s },
        };
      }),
  ),

  def2(
    "삼각형의 성질",
    "70",
    "밑각이 주어질 때 이등변삼각형의 꼭지각",
    SEC.이등변,
    "기본",
    (rng): Body => {
      const base = intBetween(rng, 25, 80);
      const apex = 180 - 2 * base;
      return {
        content: `$\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle B=${base}^\\circ$일 때, $\\angle A$의 크기를 구하시오.`,
        answer: `$${apex}^\\circ$`,
        solution: `이등변삼각형의 두 밑각의 크기는 같으므로 $\\angle C=\\angle B=${base}^\\circ$이다.\n세 내각의 크기의 합은 $180^\\circ$이므로 $\\angle A=180^\\circ-2\\times${base}^\\circ=${apex}^\\circ$이다.`,
        facts: { base, apex },
      };
    },
  ),

  def2(
    "삼각형의 성질",
    "71",
    "꼭지각의 이등분선과 밑변",
    SEC.이등변,
    "응용",
    (rng): Body => {
      const half = intBetween(rng, 3, 12);
      const bc = 2 * half;
      const ab = intBetween(rng, bc, bc + 12);
      return {
        content: `$\\overline{AB}=\\overline{AC}=${ab}\\,\\mathrm{cm}$인 이등변삼각형 $ABC$에서 $\\angle A$의 이등분선이 $\\overline{BC}$와 만나는 점을 $D$라 하자. $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{BD}$의 길이를 구하시오.`,
        answer: `$${half}\\,\\mathrm{cm}$`,
        solution: `이등변삼각형에서 꼭지각의 이등분선은 밑변을 수직이등분한다.\n따라서 $\\overline{BD}=\\dfrac{1}{2}\\overline{BC}=\\dfrac{${bc}}{2}=${half}\\,\\mathrm{cm}$이다.`,
        facts: { ab, bc, half },
      };
    },
  ),

  def2(
    "삼각형의 성질",
    "72",
    "밑각의 이등분선이 이루는 각",
    SEC.이등변,
    "심화",
    (rng): Body => {
      // 밑각이 4의 배수라야 이등분한 각이 정수로 떨어진다.
      const base = 4 * intBetween(rng, 8, 20);
      const apex = 180 - 2 * base;
      const x = 180 - base - base / 2;
      return {
        content: `$\\overline{AB}=\\overline{AC}$이고 $\\angle A=${apex}^\\circ$인 이등변삼각형 $ABC$에서 $\\angle B$의 이등분선이 $\\overline{AC}$와 만나는 점을 $D$라 하자. $\\angle BDC$의 크기를 구하시오.`,
        answer: `$${x}^\\circ$`,
        solution: `밑각은 $\\angle B=\\angle C=\\dfrac{180^\\circ-${apex}^\\circ}{2}=${base}^\\circ$이다.\n$\\angle DBC=\\dfrac{1}{2}\\angle B=${base / 2}^\\circ$이므로 $\\triangle DBC$에서 $\\angle BDC=180^\\circ-${base}^\\circ-${base / 2}^\\circ=${x}^\\circ$이다.`,
        facts: { apex, base, x },
      };
    },
  ),

  def(
    MINOR_POLY,
    "70",
    "내각의 크기의 합이 주어질 때 대각선의 개수",
    SEC.다각형내외각,
    "응용",
    (rng): Body => {
      const n = intBetween(rng, 5, 14);
      const sum = 180 * (n - 2);
      const diag = (n * (n - 3)) / 2;
      return {
        content: `내각의 크기의 합이 $${sum}^\\circ$인 다각형의 대각선의 개수를 구하시오.`,
        answer: `$${diag}$개`,
        solution: `$n$각형의 내각의 크기의 합은 $180^\\circ\\times(n-2)$이므로 $180\\times(n-2)=${sum}$에서 $n-2=${n - 2}$, $n=${n}$이다.\n${gonName(n)}형의 대각선의 개수는 $\\dfrac{${n}\\times(${n}-3)}{2}=${diag}$개이다.`,
        facts: { n, sum, diag },
      };
    },
  ),

  def(
    MINOR_POLY,
    "71",
    "한 외각의 크기로 내각의 크기의 합 구하기",
    SEC.다각형내외각,
    "응용",
    (rng): Body => {
      const n = pick(rng, [5, 6, 8, 9, 10, 12, 15, 18] as const);
      const ext = 360 / n;
      const sum = 180 * (n - 2);
      return {
        content: `한 외각의 크기가 $${ext}^\\circ$인 정다각형의 내각의 크기의 합을 구하시오.`,
        answer: `$${sum}^\\circ$`,
        solution: `정다각형의 외각의 크기의 합은 $360^\\circ$이므로 $\\dfrac{360}{n}=${ext}$에서 $n=${n}$이다.\n${gonName(n)}형의 내각의 크기의 합은 $180^\\circ\\times(${n}-2)=${sum}^\\circ$이다.`,
        facts: { n, ext, sum },
      };
    },
  ),
];
'''

path = Path('src/lib/middle/m1Geo2.ts')
src = path.read_text('utf-8')

old_sec = '  다각형내외각: "다각형의 내각과 외각",\n} as const;'
assert src.count(old_sec) == 1
src = src.replace(
    old_sec,
    '  다각형내외각: "다각형의 내각과 외각",\n  이등변: "이등변삼각형의 성질",\n} as const;',
)

marker = 'export const M1_GEO2: TypeEntry[] = [...M1_CONSTR_TYPES, ...M1_POLY2_TYPES];'
assert src.count(marker) == 1, src.count(marker)
src = src.replace(
    marker,
    BLOCK.strip()
    + '\n\nexport const M1_GEO2: TypeEntry[] = [\n  ...M1_CONSTR_TYPES,\n  ...M1_POLY2_TYPES,\n  ...M1_GEO2_EXT,\n];',
)

path.write_text(src, encoding='utf-8', newline='')
print('ok')

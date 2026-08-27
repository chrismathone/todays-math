"""m2Center.ts 에 갈래 C 확장 유형 13개를 붙인다 (일회용).

외심 +4 · 내심 +3 · 중점연결 +3 · 무게중심 +2 · 피타고라스 +1.

그림은 **안 붙인다.** 발문이 「점 O가 삼각형 ABC의 외심일 때」처럼 배치를 말로
다 말하므로 그림이 없어도 풀린다. 장식으로 붙이지 않는다(09-figure-engine-guide).
"""

from pathlib import Path

BLOCK = r'''
export const M2_CENTER_EXT: TypeEntry[] = [
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 「삼각형의 외심과 내심」을 13, 「삼각형의 무게중심」을 15,
  // 「피타고라스 정리」를 16 까지만 담는다. 130소단원을 10유형으로 올리려면
  // 색인에 없는 유형을 지어야 하므로 번호를 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def(MINOR_CIRC, "70", "외심에서 생기는 세 각의 크기의 합", SEC.외심, "기본", (rng): Body => {
    const p = intBetween(rng, 15, 40);
    const q = intBetween(rng, 15, 40);
    const x = 90 - p - q;
    return {
      content: `점 $O$가 $\\triangle ABC$의 외심이고 $\\angle OAB=${p}^\\circ$, $\\angle OBC=${q}^\\circ$일 때, $\\angle OCA$의 크기를 구하시오.`,
      answer: `$${x}^\\circ$`,
      solution: `외심에서 세 꼭짓점까지의 거리가 같으므로 $\\triangle OAB$, $\\triangle OBC$, $\\triangle OCA$는 모두 이등변삼각형이다.\n따라서 $\\angle OAB+\\angle OBC+\\angle OCA=90^\\circ$이므로 $\\angle OCA=90^\\circ-${p}^\\circ-${q}^\\circ=${x}^\\circ$이다.`,
      facts: { p, q, x },
    };
  }),

  def(MINOR_CIRC, "71", "직각삼각형의 외접원의 넓이", SEC.외심, "응용", (rng): Body => {
    const [p, q, h] = pick(rng, [
      [6, 8, 10],
      [12, 16, 20],
      [10, 24, 26],
      [16, 30, 34],
      [18, 24, 30],
    ] as const);
    const r = h / 2;
    return {
      content: `$\\angle C=90^\\circ$인 직각삼각형 $ABC$에서 $\\overline{BC}=${p}\\,\\mathrm{cm}$, $\\overline{AC}=${q}\\,\\mathrm{cm}$일 때, 이 삼각형의 외접원의 넓이를 구하시오.`,
      answer: `$${r * r}\\pi\\,\\mathrm{cm}^2$`,
      solution: `피타고라스 정리에 의해 $\\overline{AB}=${h}\\,\\mathrm{cm}$이다.\n직각삼각형의 외심은 빗변의 중점이므로 외접원의 반지름은 $\\dfrac{${h}}{2}=${r}\\,\\mathrm{cm}$이다.\n따라서 외접원의 넓이는 $\\pi\\times${r}^2=${r * r}\\pi\\,\\mathrm{cm}^2$이다.`,
      facts: { p, q, h, r, area: r * r },
    };
  }),

  def(MINOR_CIRC, "72", "외접원의 반지름이 주어진 직각삼각형의 변", SEC.외심, "기본", (rng): Body => {
    const [p, q, h] = pick(rng, [
      [6, 8, 10],
      [12, 16, 20],
      [10, 24, 26],
      [16, 30, 34],
      [18, 24, 30],
    ] as const);
    const r = h / 2;
    return {
      content: `$\\angle C=90^\\circ$인 직각삼각형 $ABC$의 외접원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 $\\overline{BC}=${p}\\,\\mathrm{cm}$일 때, $\\overline{AC}$의 길이를 구하시오.`,
      answer: `$${q}\\,\\mathrm{cm}$`,
      solution: `직각삼각형의 외심은 빗변의 중점이므로 $\\overline{AB}=2\\times${r}=${h}\\,\\mathrm{cm}$이다.\n피타고라스 정리에 의해 $\\overline{AC}^2=${h}^2-${p}^2=${h * h - p * p}$이므로 $\\overline{AC}=${q}\\,\\mathrm{cm}$이다.`,
      facts: { p, q, h, r },
    };
  }),

  def(MINOR_CIRC, "73", "외심이 한 변 위에 있는 삼각형", SEC.외심, "심화", (rng): Body => {
    const [p, q, h] = pick(rng, [
      [3, 4, 5],
      [6, 8, 10],
      [5, 12, 13],
      [8, 15, 17],
      [9, 12, 15],
      [7, 24, 25],
    ] as const);
    return {
      content: `세 변의 길이가 각각 $${q}\\,\\mathrm{cm}$, $${h}\\,\\mathrm{cm}$, $${p}\\,\\mathrm{cm}$인 삼각형의 외심이 한 변 위에 있을 때, 그 변의 길이를 구하시오.`,
      answer: `$${h}\\,\\mathrm{cm}$`,
      solution: `외심이 한 변 위에 있으면 그 변이 외접원의 지름이므로 삼각형은 그 변을 빗변으로 하는 직각삼각형이다.\n$${p}^2+${q}^2=${p * p + q * q}=${h}^2$이므로 빗변은 $${h}\\,\\mathrm{cm}$이다.`,
      facts: { p, q, h },
    };
  }),

  def(MINOR_CIRC, "74", "이등변삼각형의 내심과 밑각의 이등분", SEC.내심, "기본", (rng): Body => {
    const angA = 2 * intBetween(rng, 10, 40); // 밑각이 정수가 되게 짝수만
    const base = (180 - angA) / 2;
    const x = base / 2;
    return {
      content: `$\\overline{AB}=\\overline{AC}$인 이등변삼각형 $ABC$에서 $\\angle A=${angA}^\\circ$이고 점 $I$가 내심일 때, $\\angle IBC$의 크기를 구하시오.`,
      answer: `$${x}^\\circ$`,
      solution: `이등변삼각형이므로 $\\angle B=\\dfrac{180^\\circ-${angA}^\\circ}{2}=${base}^\\circ$이다.\n내심은 세 내각의 이등분선의 교점이므로 $\\angle IBC=\\dfrac{1}{2}\\angle B=${x}^\\circ$이다.`,
      facts: { angA, base, x },
    };
  }),

  def(MINOR_CIRC, "75", "내심으로 나뉜 삼각형의 넓이", SEC.내심, "응용", (rng): Body => {
    const a = 2 * intBetween(rng, 4, 12);
    const r = intBetween(rng, 2, 7);
    const b = intBetween(rng, 5, 15);
    const c = intBetween(rng, 5, 15);
    return {
      content: `점 $I$가 $\\triangle ABC$의 내심이고 내접원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이다. $\\overline{BC}=${a}\\,\\mathrm{cm}$, $\\overline{CA}=${b}\\,\\mathrm{cm}$, $\\overline{AB}=${c}\\,\\mathrm{cm}$일 때, $\\triangle IBC$의 넓이를 구하시오.`,
      answer: `$${(a * r) / 2}\\,\\mathrm{cm}^2$`,
      solution: `내심에서 각 변까지의 거리는 모두 내접원의 반지름과 같다.\n$\\triangle IBC$는 밑변이 $\\overline{BC}$이고 높이가 $${r}\\,\\mathrm{cm}$이므로 넓이는 $\\dfrac{1}{2}\\times${a}\\times${r}=${(a * r) / 2}\\,\\mathrm{cm}^2$이다.`,
      facts: { a, b, c, r, area: (a * r) / 2 },
    };
  }),

  def(MINOR_CIRC, "76", "내접원의 반지름과 넓이로 둘레 구하기", SEC.내심, "심화", (rng): Body => {
    const r = intBetween(rng, 2, 6);
    const half = intBetween(rng, 8, 25); // 둘레의 절반
    const S = r * half;
    return {
      content: `$\\triangle ABC$의 내접원의 반지름의 길이가 $${r}\\,\\mathrm{cm}$이고 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, $\\triangle ABC$의 둘레의 길이를 구하시오.`,
      answer: `$${2 * half}\\,\\mathrm{cm}$`,
      solution: `내심에서 세 변에 그은 수선의 길이가 모두 $${r}\\,\\mathrm{cm}$이므로, 세 삼각형의 넓이를 더하면 $\\triangle ABC$의 넓이는 $\\dfrac{1}{2}\\times${r}\\times(둘레)$이다.\n$${S}=\\dfrac{1}{2}\\times${r}\\times(둘레)$이므로 둘레는 $${2 * half}\\,\\mathrm{cm}$이다.`,
      facts: { r, S, perimeter: 2 * half },
    };
  }),

  def(MINOR_CENTROID, "70", "두 변의 중점을 연결한 선분이 자른 사다리꼴의 넓이", SEC.중점연결, "응용", (rng): Body => {
    const S = 4 * intBetween(rng, 4, 20);
    const ans = (S * 3) / 4;
    return {
      content: `$\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$의 중점을 각각 $M$, $N$이라 하자. $\\triangle ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 사각형 $MBCN$의 넓이를 구하시오.`,
      answer: `$${ans}\\,\\mathrm{cm}^2$`,
      solution: `$\\overline{MN}\\parallel\\overline{BC}$이고 $\\overline{MN}=\\dfrac{1}{2}\\overline{BC}$이므로 $\\triangle AMN$과 $\\triangle ABC$의 닮음비는 $1:2$이고 넓이의 비는 $1:4$이다.\n$\\triangle AMN=\\dfrac{1}{4}\\times${S}=${S / 4}\\,\\mathrm{cm}^2$이므로 사각형 $MBCN$의 넓이는 $${S}-${S / 4}=${ans}\\,\\mathrm{cm}^2$이다.`,
      facts: { S, ans },
    };
  }),

  def(MINOR_CENTROID, "71", "사다리꼴의 두 대각선의 중점을 연결한 선분", SEC.중점연결, "응용", (rng): Body => {
    const ad = 2 * intBetween(rng, 2, 9);
    const bc = ad + 2 * intBetween(rng, 2, 9);
    const ans = (bc - ad) / 2;
    return {
      content: `$\\overline{AD}\\parallel\\overline{BC}$인 사다리꼴 $ABCD$에서 두 대각선 $\\overline{AC}$, $\\overline{BD}$의 중점을 각각 $P$, $Q$라 하자. $\\overline{AD}=${ad}\\,\\mathrm{cm}$, $\\overline{BC}=${bc}\\,\\mathrm{cm}$일 때, $\\overline{PQ}$의 길이를 구하시오.`,
      answer: `$${ans}\\,\\mathrm{cm}$`,
      solution: `$\\overline{AB}$의 중점을 $M$이라 하면 $\\overline{MQ}=\\dfrac{1}{2}\\overline{AD}=${ad / 2}\\,\\mathrm{cm}$, $\\overline{MP}=\\dfrac{1}{2}\\overline{BC}=${bc / 2}\\,\\mathrm{cm}$이다.\n따라서 $\\overline{PQ}=\\overline{MP}-\\overline{MQ}=${bc / 2}-${ad / 2}=${ans}\\,\\mathrm{cm}$이다.`,
      facts: { ad, bc, ans },
    };
  }),

  def(MINOR_CENTROID, "72", "세 중점으로 만든 사각형의 둘레", SEC.중점연결, "심화", (rng): Body => {
    const a = 2 * intBetween(rng, 3, 12); // BC
    const c = 2 * intBetween(rng, 3, 12); // AB
    const b = intBetween(rng, 5, 20); // CA — 답에 안 쓰이지만 발문에 있다
    return {
      content: `$\\triangle ABC$에서 $\\overline{AB}$, $\\overline{AC}$, $\\overline{BC}$의 중점을 각각 $M$, $N$, $D$라 하자. $\\overline{AB}=${c}\\,\\mathrm{cm}$, $\\overline{BC}=${a}\\,\\mathrm{cm}$, $\\overline{CA}=${b}\\,\\mathrm{cm}$일 때, 사각형 $MBDN$의 둘레의 길이를 구하시오.`,
      answer: `$${a + c}\\,\\mathrm{cm}$`,
      solution: `$\\overline{MB}=\\dfrac{1}{2}\\overline{AB}=${c / 2}$, $\\overline{BD}=\\dfrac{1}{2}\\overline{BC}=${a / 2}$이다.\n중점연결정리에 의해 $\\overline{DN}=\\dfrac{1}{2}\\overline{AB}=${c / 2}$, $\\overline{NM}=\\dfrac{1}{2}\\overline{BC}=${a / 2}$이다.\n따라서 둘레는 $${c / 2}+${a / 2}+${c / 2}+${a / 2}=${a + c}\\,\\mathrm{cm}$이다.`,
      facts: { a, b, c, ans: a + c },
    };
  }),

  def(MINOR_CENTROID, "73", "세 중선의 길이의 합과 무게중심", SEC.무게중심, "기본", (rng): Body => {
    const total = 3 * intBetween(rng, 5, 20);
    const ans = (total * 2) / 3;
    return {
      content: `점 $G$가 $\\triangle ABC$의 무게중심이고 세 중선 $\\overline{AD}$, $\\overline{BE}$, $\\overline{CF}$의 길이의 합이 $${total}\\,\\mathrm{cm}$일 때, $\\overline{AG}+\\overline{BG}+\\overline{CG}$의 값을 구하시오.`,
      answer: `$${ans}\\,\\mathrm{cm}$`,
      solution: `무게중심은 각 중선을 꼭짓점에서부터 $2:1$로 나누므로 $\\overline{AG}=\\dfrac{2}{3}\\overline{AD}$이고 나머지도 같다.\n따라서 구하는 값은 세 중선의 길이의 합의 $\\dfrac{2}{3}$이므로 $\\dfrac{2}{3}\\times${total}=${ans}\\,\\mathrm{cm}$이다.`,
      facts: { total, ans },
    };
  }),

  def(MINOR_CENTROID, "74", "무게중심을 지나는 평행선이 자른 사각형의 넓이", SEC.무게중심, "심화", (rng): Body => {
    const S = 9 * intBetween(rng, 3, 12);
    const ans = (S * 5) / 9;
    return {
      content: `점 $G$가 $\\triangle ABC$의 무게중심이고, $G$를 지나 $\\overline{BC}$에 평행한 직선이 $\\overline{AB}$, $\\overline{AC}$와 만나는 점을 각각 $P$, $Q$라 하자. $\\triangle ABC$의 넓이가 $${S}\\,\\mathrm{cm}^2$일 때, 사각형 $PBCQ$의 넓이를 구하시오.`,
      answer: `$${ans}\\,\\mathrm{cm}^2$`,
      solution: `$\\overline{AG}:\\overline{AD}=2:3$이므로 $\\triangle APQ$와 $\\triangle ABC$의 닮음비는 $2:3$이고 넓이의 비는 $4:9$이다.\n$\\triangle APQ=\\dfrac{4}{9}\\times${S}=${(S * 4) / 9}\\,\\mathrm{cm}^2$이므로 사각형 $PBCQ$의 넓이는 $${S}-${(S * 4) / 9}=${ans}\\,\\mathrm{cm}^2$이다.`,
      facts: { S, ans },
    };
  }),

  def(MINOR_PYTHA, "70", "세 변의 길이로 직각삼각형임을 확인하고 넓이 구하기", SEC.피타고라스, "응용", (rng): Body => {
    const [p, q, h] = pick(rng, [
      [3, 4, 5],
      [6, 8, 10],
      [5, 12, 13],
      [8, 15, 17],
      [9, 12, 15],
      [7, 24, 25],
      [12, 16, 20],
    ] as const);
    return {
      content: `세 변의 길이가 각각 $${p}\\,\\mathrm{cm}$, $${q}\\,\\mathrm{cm}$, $${h}\\,\\mathrm{cm}$인 삼각형의 넓이를 구하시오.`,
      answer: `$${(p * q) / 2}\\,\\mathrm{cm}^2$`,
      solution: `$${p}^2+${q}^2=${p * p}+${q * q}=${p * p + q * q}$이고 $${h}^2=${h * h}$이므로 이 삼각형은 길이가 $${h}\\,\\mathrm{cm}$인 변을 빗변으로 하는 직각삼각형이다.\n따라서 넓이는 $\\dfrac{1}{2}\\times${p}\\times${q}=${(p * q) / 2}\\,\\mathrm{cm}^2$이다.`,
      facts: { p, q, h, area: (p * q) / 2 },
    };
  }),
];
'''

path = Path('src/lib/middle/m2Center.ts')
src = path.read_text('utf-8')

# ⑴ 새 중단원·소단원 상수
old_min = 'const MINOR_SIMILAR = "도형의 닮음";'
assert src.count(old_min) == 1
src = src.replace(old_min, old_min + '\nconst MINOR_PYTHA = "피타고라스 정리";')

old_sec = '  닮음: "닮은 도형",\n} as const;'
assert src.count(old_sec) == 1
src = src.replace(old_sec, '  닮음: "닮은 도형",\n  피타고라스: "피타고라스 정리",\n} as const;')

# ⑵ 확장 배열을 M2_CENTER 앞에 넣고 합본에 더한다
old_all = 'export const M2_CENTER: TypeEntry[] = ['
assert src.count(old_all) == 1
src = src.replace(old_all, BLOCK.strip() + '\n\n' + old_all)

old_spread = '  ...M2_CENTER_SIMILAR,\n];'
assert src.count(old_spread) == 1
src = src.replace(old_spread, '  ...M2_CENTER_SIMILAR,\n  ...M2_CENTER_EXT,\n];')

path.write_text(src, encoding='utf-8', newline='')
print('ok')

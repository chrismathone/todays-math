"""m2Counting.ts(+4) 와 m3Func.ts(+2) 에 갈래 C 확장 유형을 붙인다 (일회용).

경우의 수 +3(전부 응용 — 기존이 기본4·응용1·심화1 이라 응용이 모자란다) ·
여러 가지 경우의 수 +1(기본) · 이차함수의 최댓값과 최솟값 +2(기본 — 기존 8개가
전부 응용·심화라 기본이 하나도 없다).
"""

from pathlib import Path

COUNTING = r'''
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 이 중단원을 16 까지만 담는다. 색인에 없는 유형을 지어야 하므로
  // 번호를 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def("70", "두 주사위의 눈의 차가 주어진 경우의 수", SEC.경우의수, "응용", (rng): Body => {
    const t = intBetween(rng, 1, 4);
    // 눈의 차가 t 인 (a,b) 쌍의 개수 = 2(6-t)
    const ans = 2 * (6 - t);
    return {
      content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 차가 $${t}$인 경우의 수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `차가 $${t}$이려면 큰 눈이 작은 눈보다 $${t}$만큼 커야 한다.\n작은 눈이 $1$부터 $${6 - t}$까지 $${6 - t}$가지이고, 두 주사위를 바꾼 경우도 세므로 $2\\times${6 - t}=${ans}$이다.`,
      facts: { t, ans },
    };
  }),

  def("71", "동전과 주사위를 함께 던지는 경우의 수", SEC.경우의수, "응용", (rng): Body => {
    const coins = intBetween(rng, 1, 4);
    const dice = intBetween(rng, 1, 2);
    const ans = 2 ** coins * 6 ** dice;
    return {
      content: `서로 다른 $${coins}$개의 동전과 서로 다른 $${dice}$개의 주사위를 동시에 던질 때, 일어나는 모든 경우의 수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `동전은 각각 $2$가지, 주사위는 각각 $6$가지이다.\n따라서 경우의 수는 $2^{${coins}}\\times6^{${dice}}=${2 ** coins}\\times${6 ** dice}=${ans}$이다.`,
      facts: { coins, dice, ans },
    };
  }),

  def("72", "두 주사위의 눈의 수의 합이 4의 배수인 경우의 수", SEC.경우의수, "응용", (rng): Body => {
    const k = pick(rng, [3, 4, 5] as const);
    // 합이 k 의 배수인 (a,b) 쌍의 개수 — 6×6 을 훑어 센다.
    let ans = 0;
    for (let a = 1; a <= 6; a += 1)
      for (let b = 1; b <= 6; b += 1) if ((a + b) % k === 0) ans += 1;
    return {
      content: `서로 다른 두 개의 주사위를 동시에 던질 때, 나오는 두 눈의 수의 합이 $${k}$의 배수인 경우의 수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `두 눈의 수의 합은 $2$부터 $12$까지이다.\n합이 $${k}$의 배수가 되는 경우를 모두 세면 $${ans}$가지이다.`,
      facts: { k, ans },
    };
  }),

  def("73", "특정한 한 사람을 맨 앞에 세우는 경우의 수", SEC.여러가지, "기본", (rng): Body => {
    const n = intBetween(rng, 4, 7);
    let ans = 1;
    for (let i = 1; i <= n - 1; i += 1) ans *= i;
    return {
      content: `$${n}$명을 한 줄로 세울 때, 특정한 한 사람을 맨 앞에 세우는 경우의 수를 구하시오.`,
      answer: `$${ans}$`,
      solution: `맨 앞은 정해져 있으므로 나머지 $${n - 1}$명을 한 줄로 세우면 된다.\n따라서 $${n - 1}!$의 값인 $${ans}$가지이다.`,
      facts: { n, ans },
    };
  }),
'''

QUAD = r'''
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // 이 소단원은 기존 8유형이 전부 응용·심화라 **기본이 하나도 없다.**
  // 시험지 배분(1:4:4:1)에서 기본이 넷 필요하므로 새 둘을 기본으로 낸다.

  def(
    MINOR_G2,
    "70",
    "표준형에서 최댓값 또는 최솟값 읽기",
    SEC.최대최소,
    "기본",
    (rng): Body => {
      const a = pick(rng, [-3, -2, -1, 1, 2, 3] as const);
      const p = intBetween(rng, -5, 5);
      const qv = intBetween(rng, -8, 8);
      const isMax = a < 0;
      return {
        content: `이차함수 $y=${a === 1 ? "" : a === -1 ? "-" : a}(x${p >= 0 ? `-${p}` : `+${-p}`})^2${qv >= 0 ? `+${qv}` : qv}$의 ${isMax ? "최댓값" : "최솟값"}을 구하시오.`,
        answer: `$${qv}$`,
        solution: `꼭짓점의 좌표가 $(${p}, ${qv})$이고 $x^2$의 계수가 ${a < 0 ? "음수이므로 위로 볼록하다" : "양수이므로 아래로 볼록하다"}.\n따라서 $x=${p}$일 때 ${isMax ? "최댓값" : "최솟값"} $${qv}$를 갖는다.`,
        facts: { a, p, q: qv, ans: qv, isMax: isMax ? 1 : 0 },
      };
    },
  ),

  def(
    MINOR_G2,
    "71",
    "꼭짓점의 좌표로 최댓값 또는 최솟값 구하기",
    SEC.최대최소,
    "기본",
    (rng): Body => {
      const a = pick(rng, [-2, -1, 1, 2] as const);
      const p = intBetween(rng, -4, 4);
      const qv = intBetween(rng, -7, 7);
      const isMax = a < 0;
      return {
        content: `꼭짓점의 좌표가 $(${p}, ${qv})$이고 $x^2$의 계수가 $${a}$인 이차함수의 ${isMax ? "최댓값" : "최솟값"}을 구하시오.`,
        answer: `$${qv}$`,
        solution: `이차함수의 식은 $y=${a === 1 ? "" : a === -1 ? "-" : a}(x${p >= 0 ? `-${p}` : `+${-p}`})^2${qv >= 0 ? `+${qv}` : qv}$이다.\n$x^2$의 계수가 ${a < 0 ? "음수이므로 위로 볼록해 꼭짓점에서 최댓값" : "양수이므로 아래로 볼록해 꼭짓점에서 최솟값"}을 갖는다.\n따라서 ${isMax ? "최댓값" : "최솟값"}은 $${qv}$이다.`,
        facts: { a, p, q: qv, ans: qv, isMax: isMax ? 1 : 0 },
      };
    },
  ),
'''


def append_before_last_bracket(path: Path, block: str) -> None:
    src = path.read_text('utf-8')
    assert src.rstrip().endswith('];'), path
    body = src.rstrip()
    body = body[: -len('];')] + block + '];\n'
    path.write_text(body, encoding='utf-8', newline='')


if "--counting" in __import__("sys").argv:
    append_before_last_bracket(Path('src/lib/middle/m2Counting.ts'), COUNTING)

# ⚠️ m3Func.ts 의 **마지막** `];` 는 M3_FUNC 가 아니라 그림 키 목록이다.
#    그대로 붙이면 엉뚱한 배열을 망가뜨린다 — TYPES_G2 배열의 끝을 짚는다.
CLOSE = "\n];"
p3 = Path('src/lib/middle/m3Func.ts')
s3 = p3.read_text('utf-8')
anchor = 'export const M3_FUNC: TypeEntry[] = [...TYPES_G1, ...TYPES_G2];'
assert s3.count(anchor) == 1
end = s3.rindex(CLOSE, 0, s3.index(anchor))
s3 = s3[:end] + "\n" + QUAD + "];" + s3[end + len(CLOSE):]
p3.write_text(s3, encoding='utf-8', newline='')
print('ok')

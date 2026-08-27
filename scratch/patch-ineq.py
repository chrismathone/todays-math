"""m2IneqApply.ts 에 갈래 C 확장 유형 10개를 붙인다 (일회용).

⚠️ 셸 heredoc 으로 넣지 않는다 — 역슬래시가 한 겹 더 붙어 조용히 다른 글이 된다
   (이 저장소가 여러 번 데인 자리).
"""

from pathlib import Path

BLOCK = r'''
  // ── 확장 유형 (갈래 C, 70~99) ─────────────────────────
  // RPM 색인은 「일차부등식」을 14, 「일차부등식의 활용」을 14 까지만 담는다.
  // 130소단원을 10유형으로 올리려면 색인에 없는 유형을 지어야 하므로 번호를
  // 갈래마다 나눠 쓴다 — 갈래 C 는 70번대.

  def(
    MINOR_INEQ,
    "70",
    "일차부등식의 해 중에서 가장 큰 정수",
    SEC.응용,
    "기본",
    (rng) =>
      attempt(120, () => {
        const a = intBetween(rng, 2, 6);
        const n = intBetween(rng, 1, 9);
        const r = intBetween(rng, 1, a - 1); // 나누어떨어지면 경계가 해에 들어간다
        const b = intBetween(rng, 1, 9);
        const c = a * n + r + b;
        if (c > 90) return null;
        return {
          content: `일차부등식 $${a}x+${b}\\le${c}$ 를 만족시키는 $x$ 중에서 가장 큰 정수를 구하시오.`,
          answer: `$${n}$`,
          solution: `$${a}x\\le${c - b}$이므로 $x\\le\\dfrac{${c - b}}{${a}}$이다.\n이를 만족시키는 가장 큰 정수는 $${n}$이다.`,
          facts: { a, b, c, n },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "71",
    "일차부등식을 만족시키는 자연수의 개수",
    SEC.응용,
    "기본",
    (rng) =>
      attempt(120, () => {
        const a = intBetween(rng, 2, 6);
        const n = intBetween(rng, 2, 9);
        const r = intBetween(rng, 1, a - 1);
        const b = intBetween(rng, 1, 9);
        const d = a * n + r - b;
        if (d < 1 || d > 90) return null;
        return {
          content: `일차부등식 $${a}x-${b}<${d}$ 를 만족시키는 자연수 $x$의 개수를 구하시오.`,
          answer: `$${n}$개`,
          solution: `$${a}x<${d + b}$이므로 $x<\\dfrac{${d + b}}{${a}}$이다.\n이를 만족시키는 자연수는 $1$부터 $${n}$까지 $${n}$개이다.`,
          facts: { a, b, d, n },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "72",
    "괄호가 있는 일차부등식의 해 중에서 가장 작은 정수",
    SEC.응용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const b = intBetween(rng, 1, 4);
        const a = b + intBetween(rng, 2, 4); // a-b>=2 라야 나머지가 생긴다
        const p = intBetween(rng, 1, 6);
        const q = intBetween(rng, 1, 6);
        const d = a - b;
        const t = a * p + b * q;
        if (t % d === 0) return null; // 딱 나누어떨어지면 경계가 해에 들어간다
        const n = Math.floor(t / d) + 1;
        if (n > 20) return null;
        return {
          content: `일차부등식 $${a}(x-${p})>${b}(x+${q})$ 를 만족시키는 $x$ 중에서 가장 작은 정수를 구하시오.`,
          answer: `$${n}$`,
          solution: `괄호를 풀면 $${a}x-${a * p}>${b}x+${b * q}$이므로 $${d}x>${t}$이다.\n$x>\\dfrac{${t}}{${d}}$이므로 가장 작은 정수는 $${n}$이다.`,
          facts: { a, b, p, q, n },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "73",
    "두 일차부등식을 동시에 만족시키는 정수의 개수",
    SEC.응용,
    "응용",
    (rng) =>
      attempt(200, () => {
        const lo = intBetween(rng, -6, 2);
        const hi = lo + intBetween(rng, 3, 9);
        const a1 = intBetween(rng, 1, 4);
        const b1 = intBetween(rng, -5, 5);
        const c1 = a1 * hi + b1; // a1·x + b1 < c1  ⟺  x < hi
        const a2 = intBetween(rng, 1, 4);
        const b2 = intBetween(rng, -5, 5);
        const c2 = a2 * lo + b2; // a2·x + b2 >= c2 ⟺  x >= lo
        return {
          content: `두 일차부등식 $${a1}x${b1 >= 0 ? `+${b1}` : b1}<${c1}$, $${a2}x${b2 >= 0 ? `+${b2}` : b2}\\ge${c2}$ 를 동시에 만족시키는 정수 $x$의 개수를 구하시오.`,
          answer: `$${hi - lo}$개`,
          solution: `앞 부등식에서 $x<${hi}$이고, 뒤 부등식에서 $x\\ge${lo}$이다.\n따라서 $${lo}\\le x<${hi}$이므로 정수 $x$는 $${lo}$부터 $${hi - 1}$까지 $${hi - lo}$개이다.`,
          facts: { a1, b1, c1, a2, b2, c2, lo, hi, ans: hi - lo },
        };
      }),
  ),

  def(
    MINOR_INEQ,
    "74",
    "해 중 자연수의 개수가 주어질 때 상수의 최솟값",
    SEC.응용,
    "심화",
    (rng) =>
      attempt(120, () => {
        const m = intBetween(rng, 2, 7);
        const n = intBetween(rng, 2, 9);
        const ans = m * n;
        if (ans > 70) return null;
        return {
          content: `$x$에 대한 일차부등식 $${m}x-a\\le0$ 의 해 중에서 자연수가 $${n}$개일 때, 자연수 $a$의 최솟값을 구하시오.`,
          answer: `$${ans}$`,
          solution: `$${m}x\\le a$에서 $x\\le\\dfrac{a}{${m}}$이다.\n자연수인 해가 $${n}$개이려면 $${n}\\le\\dfrac{a}{${m}}<${n + 1}$이어야 하므로 $${ans}\\le a<${m * (n + 1)}$이다.\n따라서 자연수 $a$의 최솟값은 $${ans}$이다.`,
          facts: { m, n, ans },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "70",
    "목표 금액에 이르는 최소 개월",
    SEC.개수예금,
    "응용",
    (rng) =>
      attempt(120, () => {
        const p = pick(rng, [5000, 8000, 10000, 12000] as const);
        const a0 = 10000 * intBetween(rng, 2, 9);
        const n = intBetween(rng, 4, 15);
        const r = 1000 * intBetween(rng, 1, p / 1000 - 1);
        const T = a0 + p * n - r;
        return {
          content: `현재 예금액이 $${a0}$원이고 다음 달부터 매달 $${p}$원씩 예금한다. 예금액이 $${T}$원 이상이 되는 것은 최소 몇 개월 후인지 구하시오.`,
          answer: `$${n}$개월 후`,
          solution: `$x$개월 후의 예금액은 $(${a0}+${p}x)$원이다.\n$${a0}+${p}x\\ge${T}$에서 $${p}x\\ge${T - a0}$이므로 $x\\ge\\dfrac{${T - a0}}{${p}}$이다.\n이를 만족시키는 자연수 $x$의 최솟값은 $${n}$이므로 $${n}$개월 후이다.`,
          facts: { a0, p, T, n },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "71",
    "예금액이 처음의 몇 배 이상이 되는 최소 개월",
    SEC.개수예금,
    "응용",
    (rng) =>
      attempt(200, () => {
        const a0 = 10000 * intBetween(rng, 2, 8);
        const k = intBetween(rng, 2, 4);
        const p = pick(rng, [4000, 5000, 6000, 8000] as const);
        const need = (k - 1) * a0;
        if (need % p === 0) return null; // 딱 나누어떨어지면 «최소»가 경계와 겹친다
        const n = Math.floor(need / p) + 1;
        if (n < 3 || n > 30) return null;
        return {
          content: `현재 예금액이 $${a0}$원이고 다음 달부터 매달 $${p}$원씩 예금한다. 예금액이 처음의 $${k}$배 이상이 되는 것은 최소 몇 개월 후인지 구하시오.`,
          answer: `$${n}$개월 후`,
          solution: `$x$개월 후의 예금액은 $(${a0}+${p}x)$원이고, 처음의 $${k}$배는 $${k * a0}$원이다.\n$${a0}+${p}x\\ge${k * a0}$에서 $${p}x\\ge${need}$이므로 $x\\ge\\dfrac{${need}}{${p}}$이다.\n이를 만족시키는 자연수 $x$의 최솟값은 $${n}$이다.`,
          facts: { a0, p, k, n },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "72",
    "점수가 기준을 넘는 최소 정답 개수",
    SEC.개수예금,
    "응용",
    (rng) =>
      attempt(200, () => {
        const N = pick(rng, [20, 25, 30] as const);
        const a = pick(rng, [4, 5] as const);
        const b = pick(rng, [1, 2] as const);
        const n = intBetween(rng, Math.ceil(N / 2), N - 2);
        // x 개를 맞히면 점수는 a·x - b·(N-x) = (a+b)x - bN 이다.
        const score = (a + b) * n - b * N;
        const prev = (a + b) * (n - 1) - b * N;
        const M = intBetween(rng, prev + 1, score); // n 에서 처음으로 넘어선다
        return {
          content: `$${N}$문제가 나오는 시험에서 한 문제를 맞히면 $${a}$점을 얻고 틀리면 $${b}$점을 잃는다. $${M}$점 이상을 얻으려면 최소 몇 문제를 맞혀야 하는지 구하시오.`,
          answer: `$${n}$문제`,
          solution: `맞힌 문제를 $x$개라 하면 틀린 문제는 $(${N}-x)$개이므로 점수는 $\\{${a}x-${b}(${N}-x)\\}$점이다.\n$${a}x-${b}(${N}-x)\\ge${M}$에서 $${a + b}x\\ge${M + b * N}$이므로 $x\\ge\\dfrac{${M + b * N}}{${a + b}}$이다.\n이를 만족시키는 자연수 $x$의 최솟값은 $${n}$이다.`,
          facts: { N, a, b, M, n },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "73",
    "짐을 모두 나르는 최소 횟수",
    SEC.개수예금,
    "기본",
    (rng) =>
      attempt(120, () => {
        const w = pick(rng, [40, 50, 60, 75] as const);
        const n = intBetween(rng, 4, 15);
        const r = 5 * intBetween(rng, 1, w / 5 - 1);
        const W = w * n - r;
        return {
          content: `무게가 모두 $${W}\\,\\mathrm{kg}$인 짐을 한 번에 $${w}\\,\\mathrm{kg}$까지 실을 수 있는 수레로 옮기려고 한다. 짐을 모두 옮기려면 최소 몇 번 날라야 하는지 구하시오.`,
          answer: `$${n}$번`,
          solution: `$x$번 나른다고 하면 $${w}x\\ge${W}$이므로 $x\\ge\\dfrac{${W}}{${w}}$이다.\n이를 만족시키는 자연수 $x$의 최솟값은 $${n}$이므로 최소 $${n}$번 날라야 한다.`,
          facts: { W, w, n },
        };
      }),
  ),

  def(
    MINOR_APPLY,
    "74",
    "예산 안에서 비싼 쪽을 최대 몇 개 살 수 있는가",
    SEC.개수예금,
    "심화",
    (rng) =>
      attempt(200, () => {
        const p1 = pick(rng, [500, 700, 800] as const);
        const p2 = p1 + pick(rng, [300, 500, 700] as const);
        const N = intBetween(rng, 8, 20);
        const n = intBetween(rng, 2, N - 2);
        const d = p2 - p1;
        const r = 100 * intBetween(rng, 1, d / 100 - 1);
        const T = p1 * N + d * n + r; // x=n 은 되고 x=n+1 은 안 되게
        return {
          content: `한 개에 $${p1}$원인 사탕과 한 개에 $${p2}$원인 초콜릿을 합하여 $${N}$개 사려고 한다. 전체 금액이 $${T}$원 이하가 되게 하려면 초콜릿은 최대 몇 개까지 살 수 있는지 구하시오.`,
          answer: `$${n}$개`,
          solution: `초콜릿을 $x$개 산다고 하면 사탕은 $(${N}-x)$개이므로 $${p2}x+${p1}(${N}-x)\\le${T}$이다.\n$${d}x\\le${T - p1 * N}$이므로 $x\\le\\dfrac{${T - p1 * N}}{${d}}$이다.\n이를 만족시키는 자연수 $x$의 최댓값은 $${n}$이므로 최대 $${n}$개까지 살 수 있다.`,
          facts: { p1, p2, N, T, n },
        };
      }),
  ),
'''

ANCHOR = """        facts: { A, B, C, x },
      };
    },
  ),
];"""

path = Path('src/lib/middle/m2IneqApply.ts')
src = path.read_text('utf-8')
assert src.count(ANCHOR) == 1, src.count(ANCHOR)
src = src.replace(ANCHOR, ANCHOR[:-2] + BLOCK + '];')
path.write_text(src, encoding='utf-8', newline='')
print('ok')

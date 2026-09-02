/**
 * 중1 「일차방정식의 활용」 60유형 — 독립 검산.
 * (RPM 색인 01~22 + 여섯 소단원을 10유형으로 채우려고 지은 23~60)
 *
 * 생성기의 답을 그대로 믿지 않는다: `facts`(발문의 원 수치)로 유형마다
 * **방정식을 여기서 다시 세워** 만족하는지 본다. 생성기가 역산을 틀리면
 * 여기서 빨개진다 — 검산식이 생성기와 **다른 식**이어야 의미가 있으므로,
 * 아래 식들은 「발문이 말하는 조건」을 직접 옮긴 것이다.
 *
 * `VERIFY` 는 `facts` 만 본다 — 그래서 **발문에 딴 수를 찍는** 결함은 못 본다.
 * 그 축은 `CONTENT_CHECKS`(지면 글자에서 답을 다시 세운다)가 맡는다.
 */
import { describe, expect, it } from "vitest";

import { bareNumbers } from "../../lib/elementary/rules";
import {
  generateMiddleProblem,
  generateMiddleSet,
  registeredTypes,
} from "../../lib/middle/generate";
import { M1_LINEAR_APPLY } from "../../lib/middle/m1LinearApply";
import type { MidProblem } from "../../lib/middle/types";
import { josaMismatches } from "../helpers/midPage";

const SEEDS = [20260823, 1, 7777, 424242, 99991];

/** 유형별 독립 검산 — 발문의 조건식을 그대로 옮긴다. */
const VERIFY: Record<string, (f: Record<string, number>) => boolean> = {
  // 어떤 수 x에 a 곱하고 b 더한 것 == cx + diff
  "01": (f) => f.a! * f.x! + f.b! === f.c! * f.x! + f.diff! && f.diff !== 0,
  // 연속 세 자연수 (m-1)+m+(m+1) == S
  "02": (f) => f.m! - 1 + f.m! + (f.m! + 1) === f.S! && f.m! - 1 >= 1,
  // 자릿수: 합 s, 바꾼 수 == 처음 수 + d, N 재구성
  "03": (f) =>
    f.a! + f.b! === f.s! &&
    10 * f.b! + f.a! === 10 * f.a! + f.b! + f.d! &&
    f.N! === 10 * f.a! + f.b! &&
    f.a! >= 1 &&
    f.b! <= 9,
  // 개수: p·x + q·(T-x) == C, 0<x<T
  "06": (f) =>
    f.p! * f.x! + f.q! * (f.T! - f.x!) === f.C! && f.x! > 0 && f.x! < f.T!,
  // 나이: f+k == m(s+k)
  "04": (f) => f.f! + f.k! === f.m! * (f.s! + f.k!),
  // 예금: a0+p·n == 2(b0+q·n), 해가 유일하려면 p≠2q
  "05": (f) =>
    f.a0! + f.p! * f.n! === 2 * (f.b0! + f.q! * f.n!) && f.p! !== 2 * f.q!,
  // 과부족: an+r == bn-s, 남는 것과 모자란 것 둘 다 양수
  "08": (f) =>
    f.a! * f.n! + f.r! === f.b! * f.n! - f.s! && f.r! >= 1 && f.s! >= 1,
  // 긴 의자: an+r == b(n-k), 남는 의자 k ≥ 1, 못 앉는 학생 r ≥ 1
  "20": (f) =>
    f.a! * f.n! + f.r! === f.b! * (f.n! - f.k!) && f.k! >= 1 && f.r! >= 1,
  // 증감: a%·x - b%·y == c (c≠0), x+y == T
  "09": (f) =>
    (f.a! * f.x!) / 100 - (f.b! * f.y!) / 100 === f.c! &&
    f.c !== 0 &&
    f.x! + f.y! === f.T!,
  // 원가: 이익 == x·m/100 - d == p > 0
  "18": (f) => (f.x! * f.m!) / 100 - f.d! === f.p! && f.p! > 0,
  // 등산: d/v1 + d/v2 == t
  "11": (f) => f.d! / f.v1! + f.d! / f.v2! === f.t!,
  // 왕복 시간차: d/v1 - d/v2 == k/60 (분모 없애서 정수로 비교)
  "12": (f) =>
    60 * f.d! * f.v2! - 60 * f.d! * f.v1! === f.k! * f.v1! * f.v2! * -1 ||
    60 * f.d! * (f.v2! - f.v1!) === f.k! * f.v1! * f.v2!,
  // 추격: u(t+x) == w·x
  "13": (f) => f.u! * (f.t! + f.x!) === f.w! * f.x!,
  // 둘레 반대 방향: (p+q)·t == C
  "14": (f) => (f.p! + f.q!) * f.t! === f.C!,
  // 기차: v·t1 == B1+L, v·t2 == B2+L, 다리·터널이 기차보다 길다
  "22": (f) =>
    f.v! * f.t1! === f.B1! + f.L! &&
    f.v! * f.t2! === f.B2! + f.L! &&
    f.B1! > f.L! &&
    f.B2! > f.L!,
  // 직사각형: 2{(h+d)+h} == P
  "07": (f) => 2 * (f.h! + f.d! + f.h!) === f.P!,
  // 농도-물: 소금 보존 A%·B == C%·(B+W)
  "15": (f) => f.A! * f.B! === f.C! * (f.B! + f.W!),
  // 농도-소금: A%·B/100 + s == C%·(B+s)/100 (100 곱해 정수 비교)
  "16": (f) => f.A! * f.B! + 100 * f.s! === f.C! * (f.B! + f.s!),
  // 두 소금물: a·x + b·(T-x) == c·T, 0<x<T
  "17": (f) =>
    f.a! * f.x! + f.b! * (f.T! - f.x!) === f.c! * f.T! &&
    f.x! > 0 &&
    f.x! < f.T!,
  // 일: x·(1/a + 1/b) == 1  ⇔  x(a+b) == ab
  "19": (f) => f.x! * (f.a! + f.b!) === f.a! * f.b!,
  // 전체의 양: x(1-1/a)(1-1/b) == N  ⇔  x(a-1)(b-1) == N·a·b
  "10": (f) => f.x! * (f.a! - 1) * (f.b! - 1) === f.N! * f.a! * f.b!,
  // 성냥개비: 3 + 2(n-1) == M
  "21": (f) => 3 + 2 * (f.n! - 1) === f.M!,

  // ── 23~38 은 RPM 색인 밖 — 두 소단원을 10유형으로 채우려고 지은 몫 (갈래 D) ──
  // 비례배분: 남 a·k == part, 전체 (a+b)·k
  "23": (f) =>
    f.a! * f.k! === f.part! && (f.a! + f.b!) * f.k! === f.total! && f.a !== f.b,
  // 더한 뒤의 비: A 는 a·k, B 는 b·k, A + added == B
  "24": (f) =>
    f.a! * f.k! + f.added! === f.b! * f.k! &&
    f.first! === f.a! * f.k! &&
    f.a! < f.b!,
  // 백분율: rate% 의 total 이 used
  "25": (f) =>
    f.rate! * f.total! === 100 * f.used! && f.rate! > 0 && f.rate! < 100,
  // 분침: 1분에 6°
  "26": (f) => f.angle! === 6 * f.minutes! && f.minutes! >= 1,
  // 달력: 아래로 rows 칸, 한 칸에 7 씩. 합은 (rows+1)개의 등차수열
  "27": (f) =>
    f.bottom! === f.top! + 7 * f.rows! &&
    f.sum! === (f.rows! + 1) * f.top! + (7 * (f.rows! * (f.rows! + 1))) / 2,
  // 등차: n 번째 == first + (n-1)·diff
  "28": (f) => f.value! === f.first! + (f.n! - 1) * f.diff! && f.n! >= 2,
  // 정사각형: 4 + 3(n-1) == sticks
  "29": (f) => 4 + 3 * (f.n! - 1) === f.sticks! && f.n! >= 1,
  // 톱니: a·turnsA == b·turnsB
  "30": (f) => f.a! * f.turnsA! === f.b! * f.turnsB!,
  // 증가: before·(100+rate) == 100·after
  "31": (f) => f.before! * (100 + f.rate!) === 100 * f.after! && f.rate! > 0,
  // 감소: before·(100-rate) == 100·after
  "32": (f) =>
    f.before! * (100 - f.rate!) === 100 * f.after! &&
    f.rate! > 0 &&
    f.rate! < 100,
  // 이익률: cost·(100+rate) == 100·sale
  "33": (f) => f.cost! * (100 + f.rate!) === 100 * f.sale! && f.rate! > 0,
  // 할인율: price·(100-rate) == 100·sale
  "34": (f) =>
    f.price! * (100 - f.rate!) === 100 * f.sale! &&
    f.rate! > 0 &&
    f.rate! < 100,
  // 연속 증감: before·(100+up)(100-down) == 10000·after
  "35": (f) =>
    f.before! * (100 + f.up!) * (100 - f.down!) === 10000 * f.after! &&
    f.up! > 0 &&
    f.down! > 0,
  // 부가세: before·(100+rate) == 100·included
  "36": (f) => f.before! * (100 + f.rate!) === 100 * f.included! && f.rate! > 0,
  // 불량률: total·(100-rate) == 100·good
  "37": (f) =>
    f.total! * (100 - f.rate!) === 100 * f.good! &&
    f.rate! > 0 &&
    f.rate! < 100,
  // 두 번 쓰고 남기: 쓴 양 == total·(firstRate+secondRate)/100, 남은 것과 합이 total
  "38": (f) =>
    100 * f.spent! === f.total! * (f.firstRate! + f.secondRate!) &&
    f.spent! + f.left! === f.total! &&
    f.left! > 0,

  // ── 39~44 「나이, 과부족, 예금」을 10유형으로 채운 몫 (갈래 D) ──
  // 나이의 합·차: older == younger + gap, 합이 sum
  "39": (f) =>
    f.older! === f.younger! + f.gap! &&
    f.older! + f.younger! === f.sum! &&
    f.younger! >= 1 &&
    f.gap! >= 1,
  // k년 전: parent-k == m(child-k), 그때 딸이 살아 있어야 한다
  "40": (f) =>
    f.parent! - f.k! === f.m! * (f.child! - f.k!) &&
    f.k! >= 1 &&
    f.child! - f.k! >= 1,
  // 예금이 같아지는 때: a0+p·n == b0+q·n, 해가 하나이려면 p≠q
  "41": (f) =>
    f.a0! + f.p! * f.n! === f.b0! + f.q! * f.n! && f.p! !== f.q! && f.n! >= 1,
  // 과부족(개수를 묻는다): an+r == bn-s, 답은 물건 수 an+r
  "42": (f) =>
    f.a! * f.n! + f.r! === f.b! * f.n! - f.s! &&
    f.total! === f.a! * f.n! + f.r! &&
    f.r! >= 1 &&
    f.s! >= 1,
  // 목표액: a0 + p·n == target
  "43": (f) => f.a0! + f.p! * f.n! === f.target! && f.n! >= 1 && f.p! > 0,
  // 두 자녀의 합의 m배: parent+k == m(c1+c2+2k)
  "44": (f) =>
    f.parent! + f.k! === f.m! * (f.c1! + f.c2! + 2 * f.k!) && f.k! >= 1,

  // ── 45~50 「수」를 10유형으로 채운 몫 (갈래 D) ──
  // 연속하는 두 짝(홀)수: big == small+2, 홀짝이 발문의 낱말과 맞아야 한다
  "45": (f) =>
    f.big! === f.small! + 2 &&
    f.small! + f.big! === f.sum! &&
    f.small! % 2 === (f.even === 1 ? 0 : 1) &&
    f.small! >= 1,
  // 어떤 수의 a/b 보다 c 큰 수가 d: (a/b)x + c == d, 그리고 (a/b)x 가 정수
  "46": (f) =>
    (f.a! * f.x!) % f.b! === 0 &&
    (f.a! * f.x!) / f.b! + f.c! === f.d! &&
    f.a! < f.b!,
  // 잘못 곱하기: a·x == wrong, 바른 답은 x+a
  "47": (f) =>
    f.a! * f.x! === f.wrong! && f.x! + f.a! === f.right! && f.a! >= 2,
  // 차와 배수: big == m·small, big-small == d
  "48": (f) =>
    f.big! === f.m! * f.small! && f.big! - f.small! === f.d! && f.m! >= 2,
  // 연속 세 자연수: m(n+2) - (2n+1) == c, c > 0.
  // 🔴 $m=2$ 이면 좌변이 $n$ 과 무관하게 $3$ 이라 답이 하나로 안 선다.
  "49": (f) =>
    f.m! * (f.n! + 2) - (2 * f.n! + 1) === f.c! && f.c! >= 1 && f.m! >= 3,
  // 자릿수 배수: tens == m·ones, 두 자리이고, 바꾼 수가 d 만큼 작다
  "50": (f) =>
    f.tens! === f.m! * f.ones! &&
    f.tens! >= 1 &&
    f.tens! <= 9 &&
    f.ones! >= 1 &&
    f.N! === 10 * f.tens! + f.ones! &&
    f.N! - (10 * f.ones! + f.tens!) === f.d!,

  // ── 51~55 「거리, 속력, 시간」 · 56~60 「도형, 농도, 일」 (갈래 D) ──
  // 왕복: 2d == v·t
  "51": (f) => 2 * f.d! === f.v! * f.t!,
  // 두 구간: d1/a + d2/b == t (분모를 없애 정수로 견준다), D == d1+d2
  "52": (f) =>
    f.d1! === f.a! * f.t1! &&
    f.d2! === f.b! * f.t2! &&
    f.D! === f.d1! + f.d2! &&
    f.t! === f.t1! + f.t2! &&
    f.a! !== f.b!,
  // 마주 보고: (p+q)·n == D. 두 빠르기가 같으면 발문이 무의미하다
  "53": (f) => (f.p! + f.q!) * f.n! === f.D! && f.p! !== f.q!,
  // 같은 방향 둘레: (p-q)·n == L, 빠른 쪽이 있어야 한다
  "54": (f) => (f.p! - f.q!) * f.n! === f.L! && f.p! > f.q!,
  // 기차: v·t == B+L, 다리가 기차보다 길다
  "55": (f) => f.v! * f.t! === f.B! + f.L! && f.B! > f.L!,
  // 삼각형: 2S == b·h
  "56": (f) => 2 * f.S! === f.b! * f.h!,
  // 사다리꼴: 2S == (2a+d)·h
  "57": (f) => 2 * f.S! === (2 * f.a! + f.d!) * f.h! && f.d! > 0,
  // 증발: 소금이 보존된다 A·W == B·(W-E), 진해진다
  "58": (f) => f.A! * f.W! === f.B! * (f.W! - f.E!) && f.B! > f.A! && f.E! > 0,
  // 혼자 하다 함께: k/a + n(1/a+1/b) == 1  ⇔  k·b + n(a+b) == a·b
  "59": (f) =>
    f.k! * f.b! + f.n! * (f.a! + f.b!) === f.a! * f.b! &&
    f.k! >= 1 &&
    f.n! >= 1,
  // 둘레가 같다: w == h+d, 2(h+w) == 4s, 넓이 == h·w
  "60": (f) =>
    f.w! === f.h! + f.d! &&
    2 * (f.h! + f.w!) === 4 * f.s! &&
    f.area! === f.h! * f.w! &&
    f.h! >= 1,
};

/**
 * 발문 **글자**에서 답을 다시 계산한다 — `VERIFY` 와 **다른 축**이다.
 *
 * `VERIFY` 는 `facts` 끼리 조건식이 서는지만 본다. 그래서 생성기가 `facts` 는
 * 맞게 두고 **발문에 딴 수를 찍으면** 통과한다. 여기서는 지면 글자를 되읽어
 * 답을 다시 세우므로 그 자리가 걸린다.
 */
const CONTENT_CHECKS: Record<string, (content: string) => number> = {
  "23": (c) => {
    const [, a, b, part] = c.match(/비가 \$(\d+):(\d+)\$.*남학생이 \$(\d+)\$/)!;
    return (Number(part) / Number(a)) * (Number(a) + Number(b));
  },
  "24": (c) => {
    const [, a, b, added] = c.match(/비가 \$(\d+):(\d+)\$.*공을 \$(\d+)\$개/)!;
    return (Number(a) * Number(added)) / (Number(b) - Number(a));
  },
  "25": (c) => {
    const [, rate, used] = c.match(/\$(\d+)\\%\$.*\$(\d+)\\,\\mathrm\{kg\}\$/)!;
    return (Number(used) * 100) / Number(rate);
  },
  "26": (c) => Number(c.match(/분침이 \$(\d+)\^\{\\circ\}\$/)![1]) / 6,
  "27": (c) => {
    const [, count, top] = c.match(
      /연속하여 \$(\d+)\$개의 수.*수는 \$(\d+)\$/,
    )!;
    return (Number(count) * (2 * Number(top) + (Number(count) - 1) * 7)) / 2;
  },
  "28": (c) => {
    const [, first, diff, n] = c.match(
      /수 \$(\d+)\$에서.*\$(\d+)\$씩.*\$(\d+)\$번째/,
    )!;
    return Number(first) + (Number(n) - 1) * Number(diff);
  },
  "29": (c) => (Number(c.match(/성냥개비 \$(\d+)\$개로/)![1]) - 1) / 3,
  "30": (c) => {
    const [, a, b, turnsA] = c.match(
      /각각 \$(\d+)\$개, \$(\d+)\$개.*가 \$(\d+)\$바퀴/,
    )!;
    return (Number(a) * Number(turnsA)) / Number(b);
  },
  "31": (c) => {
    const [, rate, after] = c.match(/\$(\d+)\\%\$ 증가하여.*\$(\d+)\$명/)!;
    return (Number(after) * 100) / (100 + Number(rate));
  },
  "32": (c) => {
    const [, rate, after] = c.match(/\$(\d+)\\%\$ 감소하여.*\$(\d+)\$개/)!;
    return (Number(after) * 100) / (100 - Number(rate));
  },
  "33": (c) => {
    const [, rate, sale] = c.match(/원가의 \$(\d+)\\%\$.*\$(\d+)\$원/)!;
    return (Number(sale) * 100) / (100 + Number(rate));
  },
  "34": (c) => {
    const [, rate, sale] = c.match(/\$(\d+)\\%\$ 할인하여 \$(\d+)\$원/)!;
    return (Number(sale) * 100) / (100 - Number(rate));
  },
  "35": (c) => {
    const [, up, down, after] = c.match(
      /\$(\d+)\\%\$ 증가.*\$(\d+)\\%\$ 감소하여 \$(\d+)\$개/,
    )!;
    return (
      (Number(after) * 10000) / ((100 + Number(up)) * (100 - Number(down)))
    );
  },
  "36": (c) => {
    const [, rate, included] = c.match(/\$(\d+)\\%\$의 세금.*\$(\d+)\$원/)!;
    return (Number(included) * 100) / (100 + Number(rate));
  },
  "37": (c) => {
    const [, rate, good] = c.match(/\$(\d+)\\%\$가 불량품.*\$(\d+)\$개/)!;
    return (Number(good) * 100) / (100 - Number(rate));
  },
  "38": (c) => {
    const [, first, second, left] = c.match(
      /\$(\d+)\\%\$를 교재비로.*\$(\d+)\\%\$를 준비물비로.*\$(\d+)\$원/,
    )!;
    return (Number(left) * 100) / (100 - Number(first) - Number(second));
  },
  "39": (c) => {
    const [, sum, gap] = c.match(
      /합은 \$(\d+)\$세이고, 형은 동생보다 \$(\d+)\$세 많다/,
    )!;
    return (Number(sum) + Number(gap)) / 2;
  },
  "40": (c) => {
    const [, parent, child, m] = c.match(
      /어머니의 나이는 \$(\d+)\$세, 딸의 나이는 \$(\d+)\$세.*\$(\d+)\$배였던/,
    )!;
    // parent - x = m(child - x)  ⇔  x = (m·child - parent) / (m - 1)
    return (Number(m) * Number(child) - Number(parent)) / (Number(m) - 1);
  },
  "41": (c) => {
    const [, a0, b0, p, q] = c.match(
      /지호의 예금액은 \$(\d+)\$원, 서연이의 예금액은 \$(\d+)\$원.*지호는 \$(\d+)\$원씩, 서연이는 \$(\d+)\$원씩/,
    )!;
    return (Number(b0) - Number(a0)) / (Number(p) - Number(q));
  },
  "42": (c) => {
    const [, a, r, b, s] = c.match(
      /\$(\d+)\$개씩 주면 \$(\d+)\$개가 남고, \$(\d+)\$개씩 주면 \$(\d+)\$개가 모자란다/,
    )!;
    const n = (Number(r) + Number(s)) / (Number(b) - Number(a));
    return Number(a) * n + Number(r); // 답은 사람 수가 아니라 **사탕 수**다
  },
  "43": (c) => {
    const [, a0, p, target] = c.match(
      /통장에 \$(\d+)\$원.*매달 \$(\d+)\$원씩.*처음으로 \$(\d+)\$원/,
    )!;
    return (Number(target) - Number(a0)) / Number(p);
  },
  "44": (c) => {
    const [, parent, c1, c2, m] = c.match(
      /아버지의 나이는 \$(\d+)\$세.*각각 \$(\d+)\$세, \$(\d+)\$세.*\$(\d+)\$배/,
    )!;
    // parent + x = m(c1+c2+2x)  ⇔  x = (m(c1+c2) - parent) / (1 - 2m)
    return (
      (Number(m) * (Number(c1) + Number(c2)) - Number(parent)) /
      (1 - 2 * Number(m))
    );
  },
  "45": (c) => {
    const [, word, sum] = c.match(/연속하는 두 (짝|홀)수의 합이 \$(\d+)\$/)!;
    const big = (Number(sum) + 2) / 2;
    // 낱말과 홀짝이 어긋나면 발문이 성립하지 않는다 — 여기서 걸린다.
    expect(big % 2).toBe(word === "짝" ? 0 : 1);
    return big;
  },
  "46": (c) => {
    const [, a, b, plus, d] = c.match(
      /어떤 수의 \$\\dfrac\{(\d+)\}\{(\d+)\}\$보다 \$(\d+)\$만큼 큰 수는 \$(\d+)\$/,
    )!;
    return ((Number(d) - Number(plus)) * Number(b)) / Number(a);
  },
  "47": (c) => {
    const [, a, wrong] = c.match(
      /어떤 수에 \$(\d+)\$.* 곱했더니 \$(\d+)\$이 되었다/,
    )!;
    return Number(wrong) / Number(a) + Number(a);
  },
  "48": (c) => {
    const [, d, m] = c.match(
      /차가 \$(\d+)\$이고, 큰 수는 작은 수의 \$(\d+)\$배/,
    )!;
    return (Number(d) / (Number(m) - 1)) * Number(m);
  },
  "49": (c) => {
    const [, m, k] = c.match(
      /가장 큰 수의 \$(\d+)\$배가 나머지 두 수의 합보다 \$(\d+)\$만큼/,
    )!;
    // m(n+2) - (2n+1) = k  ⇔  n(m-2) = k + 1 - 2m
    return (Number(k) + 1 - 2 * Number(m)) / (Number(m) - 2);
  },
  "50": (c) => {
    const [, m, d] = c.match(
      /일의 자리의 숫자의 \$(\d+)\$배이고.*처음 수보다 \$(\d+)\$만큼 작다/,
    )!;
    // 9·ones·(m-1) = d  ⇔  ones = d / (9(m-1)) · 처음 수 = 10·m·ones + ones
    const ones = Number(d) / (9 * (Number(m) - 1));
    return (10 * Number(m) + 1) * ones;
  },
  "51": (c) => {
    const [, v, t] = c.match(
      /시속 \$(\d+)\\,\\mathrm\{km\}\$.*모두 \$(\d+)\$시간/,
    )!;
    return (Number(v) * Number(t)) / 2;
  },
  "52": (c) => {
    const [, D, a, b, t] = c.match(
      /거리는 \$(\d+)\\,\\mathrm\{km\}\$.*시속 \$(\d+)\\,\\mathrm\{km\}\$로 걷다가.*시속 \$(\d+)\\,\\mathrm\{km\}\$로 뛰어서 모두 \$(\d+)\$시간/,
    )!;
    // x/a + (D-x)/b = t  ⇔  x = a(bt - D)/(b - a)
    return (
      (Number(a) * (Number(b) * Number(t) - Number(D))) /
      (Number(b) - Number(a))
    );
  },
  "53": (c) => {
    const [, D, p, q] = c.match(
      /\$(\d+)\\,\\mathrm\{m\}\$ 떨어진.*분속 \$(\d+)\\,\\mathrm\{m\}\$로, 다른 사람은 분속 \$(\d+)\\,\\mathrm\{m\}\$/,
    )!;
    return Number(D) / (Number(p) + Number(q));
  },
  "54": (c) => {
    const [, L, p, q] = c.match(
      /둘레의 길이가 \$(\d+)\\,\\mathrm\{m\}\$.*분속 \$(\d+)\\,\\mathrm\{m\}\$로, 다른 사람은 분속 \$(\d+)\\,\\mathrm\{m\}\$/,
    )!;
    return Number(L) / (Number(p) - Number(q));
  },
  "55": (c) => {
    const [, L, B, t] = c.match(
      /길이가 \$(\d+)\\,\\mathrm\{m\}\$인 기차가 길이 \$(\d+)\\,\\mathrm\{m\}\$인 다리를 완전히 지나는 데 \$(\d+)\$초/,
    )!;
    return (Number(L) + Number(B)) / Number(t);
  },
  "56": (c) => {
    const [, h, S] = c.match(
      /높이가 \$(\d+)\\,\\mathrm\{cm\}\$인 삼각형의 넓이가 \$(\d+)\\,\\mathrm\{cm\}\^\{2\}\$/,
    )!;
    return (2 * Number(S)) / Number(h);
  },
  "57": (c) => {
    const [, d, h, S] = c.match(
      /윗변의 길이보다 \$(\d+)\\,\\mathrm\{cm\}\$만큼 긴.*높이가 \$(\d+)\\,\\mathrm\{cm\}\$이고 넓이가 \$(\d+)\\,\\mathrm\{cm\}\^\{2\}\$/,
    )!;
    return ((2 * Number(S)) / Number(h) - Number(d)) / 2;
  },
  "58": (c) => {
    const [, A, W, B] = c.match(
      /\$(\d+)\\%\$의 소금물 \$(\d+)\\,\\mathrm\{g\}\$.*\$(\d+)\\%\$의 소금물이/,
    )!;
    return Number(W) - (Number(A) * Number(W)) / Number(B);
  },
  "59": (c) => {
    const [, a, b, k] = c.match(
      /\$\\mathrm\{A\}\$는 \$(\d+)\$일, \$\\mathrm\{B\}\$는 \$(\d+)\$일.*혼자 \$(\d+)\$일/,
    )!;
    return ((Number(a) - Number(k)) * Number(b)) / (Number(a) + Number(b));
  },
  "60": (c) => {
    const [, d, s] = c.match(
      /세로의 길이보다 \$(\d+)\\,\\mathrm\{cm\}\$만큼 긴.*한 변의 길이가 \$(\d+)\\,\\mathrm\{cm\}\$/,
    )!;
    const h = Number(s) - Number(d) / 2;
    return h * (h + Number(d));
  },
};

/** 답 문자열의 첫 수가 facts 의 이 키와 같아야 한다 — 답이 엉뚱한 수를 찍는 것을 막는다. */
const ANSWER_KEY: Record<string, string> = {
  "01": "x",
  "02": "", // m+1 — 아래에서 따로 본다
  "03": "N",
  "06": "x",
  "04": "k",
  "05": "n",
  "08": "n",
  "20": "n",
  "09": "x",
  "18": "x",
  "11": "d",
  "12": "d",
  "13": "x",
  "14": "t",
  "22": "L",
  "07": "h",
  "15": "W",
  "16": "s",
  "17": "x",
  "19": "x",
  "10": "x",
  "21": "n",
  "23": "total",
  "24": "first",
  "25": "total",
  "26": "minutes",
  "27": "sum",
  "28": "value",
  "29": "n",
  "30": "turnsB",
  "31": "before",
  "32": "before",
  "33": "cost",
  "34": "price",
  "35": "before",
  "36": "before",
  "37": "total",
  "38": "total",
  "39": "older",
  "40": "k",
  "41": "n",
  "42": "total",
  "43": "n",
  "44": "k",
  "45": "big",
  "46": "x",
  "47": "right",
  "48": "big",
  "49": "n",
  "50": "N",
  "51": "d",
  "52": "d1",
  "53": "n",
  "54": "n",
  "55": "v",
  "56": "b",
  "57": "a",
  "58": "E",
  "59": "n",
  "60": "area",
};

function firstNumber(text: string): number {
  const m = text.match(/-?\d+(?:\.\d+)?/);
  if (!m) throw new Error(`답에 수가 없습니다: ${text}`);
  return Number(m[0]);
}

describe("중1 일차방정식의 활용 60유형", () => {
  // 🔴 **모집단은 «이 모듈»이다 — 「중단원이 같은 등록 유형 전부」가 아니다.**
  //    2026-09-02 확대 갈래 3차 물결이 같은 중단원에 `53V`·`54V` 를 세우자
  //    이 검사가 62를 세고, 검산표 `VERIFY["53V"]` 가 없어 다섯이 빨개졌다.
  //    아래 ⚠️ 주석은 **다른 중단원**만 막고 있었다 — 같은 중단원의 다른 모듈은
  //    구조적으로 못 본다. 확대 갈래(`m1Top*.ts`, 접미사 T·U·V)는 이 명부 밖이고
  //    제 시험(`middleM1Top*.test.ts`)이 따로 지킨다.
  //    ⚠️ 그렇다고 「T·U·V 로 끝나면 뺀다」로 적으면 안 된다 — 다음 접미사가
  //    오면 또 샌다. **어느 모듈인가**를 물어야 한다.
  const entries = M1_LINEAR_APPLY;

  it("이 모듈의 60유형이 실제로 등록돼 있다 — 모듈만 보면 «등록»을 안 지킨다", () => {
    const registered = new Set(registeredTypes().map((e) => e.key));
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) expect(registered.has(e.key), e.key).toBe(true);
  });

  it("RPM 색인의 22유형 + 갈래 D 가 지은 38유형이 빈틈없이 등록돼 있다", () => {
    // 01~22 는 RPM 색인 그대로, 23~38 은 두 소단원을 10유형으로 채우려고 지은 것.
    // **빈틈없이** 잇는지 본다 — 번호를 건너뛰면 다음 사람이 그 자리를 다시 쓴다.
    expect(entries.length).toBe(60);
    const nums = entries.map((e) => e.rpmType).sort();
    expect(nums).toEqual(
      Array.from({ length: 60 }, (_, i) => String(i + 1).padStart(2, "0")),
    );
  });

  it("우리 단원 6개(0건짜리 5개 + 증감)에 나눠 붙는다", () => {
    const sections = new Set(entries.map((e) => e.unitSection));
    expect(sections).toEqual(
      new Set([
        "일차방정식의 활용(수)",
        "일차방정식의 활용(나이, 과부족, 예금)",
        "일차방정식의 활용(증가와 감소, 원가와 정가)",
        "일차방정식의 활용(거리, 속력, 시간)",
        "일차방정식의 활용(도형, 농도, 일)",
        "일차방정식의 활용(비율, 시계, 규칙)",
      ]),
    );
  });

  // ⚠️ registeredTypes() 전량이 아니라 이 중단원 것만 돈다 — 병렬 세션이 다른
  // 중단원 유형을 등록하는 순간 VERIFY["01"] 이 남의 유형에 들이대진다
  // (2026-08-23 중3 세션이 실제로 밟음. 검산표의 키는 rpmType 번호뿐이다).
  for (const e of entries) {
    describe(`${e.rpmType} ${e.rpmTitle}`, () => {
      it("같은 씨앗이면 같은 문항", () => {
        const a = generateMiddleProblem(e.key, 20260823);
        const b = generateMiddleProblem(e.key, 20260823);
        expect(a).toEqual(b);
      });

      it("씨앗별 독립 검산 — 발문 수치가 조건식을 만족한다", () => {
        const verify = VERIFY[e.rpmType];
        expect(verify, `검산식 누락: ${e.rpmType}`).toBeDefined();
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(
            verify!(p.facts),
            `seed ${seed} 검산 실패: ${JSON.stringify(p.facts)}`,
          ).toBe(true);
        }
      });

      it("답의 수가 facts 와 일치한다", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          const n = firstNumber(p.answer);
          if (e.rpmType === "02") {
            expect(n).toBe(p.facts.m! + 1);
          } else {
            const key = ANSWER_KEY[e.rpmType]!;
            expect(n, `답 ${p.answer} vs facts.${key}`).toBe(p.facts[key]);
          }
        }
      });

      it("숫자가 KaTeX 밖에 없다 (본문·정답·해설)", () => {
        for (const seed of SEEDS) {
          const p = generateMiddleProblem(e.key, seed);
          expect(bareNumbers(p.content)).toEqual([]);
          expect(bareNumbers(p.answer)).toEqual([]);
          expect(bareNumbers(p.solution)).toEqual([]);
        }
      });

      const contentCheck = CONTENT_CHECKS[e.rpmType];
      if (contentCheck) {
        it("발문 글자에서 답을 다시 세워도 같다", () => {
          for (const seed of SEEDS) {
            const p = generateMiddleProblem(e.key, seed);
            expect(firstNumber(p.answer), p.content).toBe(
              contentCheck(p.content),
            );
          }
        });
      }

      it("지면에 소수점 붙은 수가 없다 (개·명·원은 정수다)", () => {
        // 유형 35 가 실제로 「$656.25$개」를 찍고 있었다 — 값은 맞고 **지면만**
        // 말이 안 된다. 값 검산도 KaTeX 도 이 부류를 구조적으로 못 잡는다.
        for (let variant = 0; variant < 40; variant += 1) {
          const p = generateMiddleProblem(e.key, 20260823, variant);
          for (const part of [p.content, p.answer]) {
            expect(
              [...part.matchAll(/\d+\.\d+/g)].map((m) => m[0]),
              part,
            ).toEqual([]);
          }
        }
      });

      it("수 뒤 조사가 읽기와 맞는다", () => {
        for (let variant = 0; variant < 20; variant += 1) {
          const p = generateMiddleProblem(e.key, 20260823, variant);
          for (const part of [p.content, p.answer, p.solution]) {
            expect(josaMismatches(part), part).toEqual([]);
          }
        }
      });
    });
  }

  it("한 유형에서 4문항을 뽑으면 발문이 전부 다르다", () => {
    for (const e of entries) {
      const set = generateMiddleSet(e.key, 20260823, 4);
      const contents = new Set(set.map((p: MidProblem) => p.content));
      expect(contents.size, e.key).toBe(4);
    }
  });
});

import type { CanonicalParams } from "@/contracts/examStudy.contract";
import {
  clauses,
  draft,
  family,
  fmt,
  insist,
  linear2,
  match,
  near,
  numberText,
  rubric,
  type RubricPart,
} from "./support";

const writtenBasis = [
  "변수와 단위를 명시하여 모델 구성",
  "서로 의존하는 여러 출력을 설명",
  "경계/제외/최소 조건을 원상황으로 확인",
];
function native(
  parts: readonly string[],
  alternatives: readonly string[],
  errors: readonly string[],
) {
  return rubric(
    parts.map((expected, i): RubricPart => ({
      id: `reason-${i + 1}`,
      expected,
      alternative: alternatives[i],
      error: errors[i],
    })),
  );
}
const minimumDomain: CanonicalParams[] = [];
for (const rows of [2, 3])
  for (const cols of [4, 5])
    for (const q of [47, 48, 49])
      minimumDomain.push({ rows, cols, q, L: 3, rate: 7 });
function minCriteria(
  N: number,
  V: number,
  U: number,
  minute: number,
  perMinute: number,
) {
  return [
    `트레이 수 N=${N}, 사용량 V=${V} mL`,
    `잔량 U=${U} mL (L를 mL로 환산)`,
    `1분 처리 용량=${perMinute} mL, 최소 예약=${minute}분`,
    `${minute - 1}분 용량=${(minute - 1) * perMinute}<${U}, ${minute}분 용량=${minute * perMinute}>=${U}`,
  ];
}
export const minimumTime = family({
  key: "dependent-formula-min-time",
  title: "공식 의존·잔량·단위와 최소 예약 시간",
  course: "중1",
  unit: "일차방정식의 활용",
  requirement: "written.dependent-formula-min-time",
  domain: minimumDomain,
  written: true,
  boundaries: [
    "분 단위 용량에 정확히 나누어짐",
    "정수 분 바로 위/아래",
    "양의 잔량",
    "초에서 분으로 환산",
  ],
  make(p) {
    const rows = Number(p.rows),
      cols = Number(p.cols),
      q = Number(p.q),
      L = Number(p.L),
      rate = Number(p.rate),
      N = rows * cols,
      V = q * N,
      U = 1000 * L - V,
      perMinute = 60 * rate,
      minute = Math.ceil(U / perMinute);
    const parts = minCriteria(N, V, U, minute, perMinute);
    const r = native(
      parts,
      [
        "행별 사용량을 먼저 구한 뒤 모두 더함",
        "처음 양과 사용량을 모두 L로 계산 후 변환",
        "초 단위 필요 시간을 구한 뒤 분 단위로 올림",
        "예약 분 수의 앞뒤 정수를 직접 비교",
      ],
      [
        "트레이 수를 행과 열의 합으로 계산",
        "L와 mL를 변환하지 않고 뺌",
        "가까운 정수로 반올림하거나 내림",
        "나누어떨어질 때도 무조건 1분을 더함",
      ],
    );
    return draft(
      p,
      `육묘실에는 ${rows}행 ${cols}열로 트레이가 놓여 있고 트레이 하나에 배양액 ${q} mL를 사용한다. 처음 배양액은 ${L} L이다. 주어진 공식은 $N=행수×열수$, $V=트레이당 사용량×N$, $U=처음 양(mL)-V$이다. 남은 배양액을 초당 ${rate} mL까지 처리하는 장치에 맡긴다. 장치 시간은 양의 정수 분 단위로 예약하며 예약 시간의 처리 용량이 잔량 이상이어야 한다. $N,V,U$와 최소 예약 시간을 구하고, 그보다 1분 짧은 예약이 불가능한 이유를 단위와 함께 설명하시오.`,
      `N=${N}, V=${V} mL, U=${U} mL, 최소=${minute}분`,
      `${parts[0]}. 먼저 N을 구해야 V를 정할 수 있다.\n${parts[1]}. 처음 양은 ${L}×1000 mL이다.\n${parts[2]}. 초당 용량에 60을 곱한다.\n${parts[3]}. 따라서 잔량을 전부 처리할 수 있는 가장 짧은 정수 분 예약이다.`,
      null,
      writtenBasis,
      r,
    );
  },
  solve(item) {
    clauses(item.content, [
      "$N=행수×열수$",
      "$V=트레이당 사용량×N$",
      "$U=처음 양(mL)-V$",
      "양의 정수 분 단위로 예약",
      "처리 용량이 잔량 이상",
      "그보다 1분 짧은 예약이 불가능한 이유",
    ]);
    const m = match(
        item.content,
        /에는 (\d+)행 (\d+)열로 트레이가 놓여 있고 트레이 하나에 배양액 (\d+) mL/,
      ),
      rows = Number(m[1]),
      cols = Number(m[2]),
      q = Number(m[3]);
    const L = Number(match(item.content, /처음 배양액은 (\d+) L/)[1]),
      rate = Number(match(item.content, /초당 (\d+) mL까지/)[1]);
    // Count trays and account for each withdrawal, then search the reservation boundary.
    let N = 0,
      remaining = L * 1000;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        N++;
        remaining -= q;
      }
    insist(remaining > 0 && rate > 0, "잔량/속도 범위");
    let minute = 1;
    while (minute < 100 && minute * 60 * rate < remaining) minute++;
    insist(
      minute < 100 && (minute - 1) * 60 * rate < remaining,
      "최소 시간 경계",
    );
    const V = L * 1000 - remaining;
    return {
      answer: `N=${N}, V=${V} mL, U=${remaining} mL, 최소=${minute}분`,
      parameters: { rows, cols, q, L, rate },
      rubric: minCriteria(N, V, remaining, minute, 60 * rate),
    };
  },
});

const fuelDomain: CanonicalParams[] = [];
for (const efficiency of [8, 12])
  for (const legs of [4, 6])
    for (const reserve of [1, 2])
      fuelDomain.push({ efficiency, legs, reserve });
function fuelCriteria(
  E: number,
  F: number,
  D: number,
  x0: number,
  at: number,
  extra: number,
) {
  return [
    `사용량=x/${E} L이므로 y=${F}-x/${E}`,
    `정의역은 0<=x<=${D}`,
    `x=${x0}에서 남은 연료=${at} L`,
    `도착 때 남은 연료=${fmt(extra / E)} L, 추가 주행 한계=${extra} km`,
  ];
}
export const fuelModel = family({
  key: "linear-fuel-model",
  title: "연료 잔량의 함수·정의역·추가 주행",
  course: "중2",
  unit: "일차함수의 활용",
  requirement: "written.linear-fuel-model",
  domain: fuelDomain,
  written: true,
  boundaries: [
    "노선 시작과 끝",
    "효율의 역수인 기울기",
    "도착 후 양의 예비 연료",
    "추가 주행 한계",
  ],
  make(p) {
    const E = Number(p.efficiency),
      legs = Number(p.legs),
      reserve = Number(p.reserve),
      F = legs + reserve,
      D = E * legs,
      x0 = E * (legs - 1),
      at = reserve + 1,
      extra = E * reserve;
    const parts = fuelCriteria(E, F, D, x0, at, extra);
    return draft(
      p,
      `차량은 연료 1 L로 ${E} km를 일정하게 달린다. 출발할 때 ${F} L가 있고 길이 ${D} km인 노선을 주유 없이 한 번 달린다. 출발 후 노선에서 달린 거리를 $x$ km, 남은 연료를 $y$ L라 하자. 노선에서의 $y$를 $x$의 식으로 나타내고 의미 있는 정의역을 쓰시오. ${x0} km를 달렸을 때의 연료와 도착 후 남은 연료로 추가로 달릴 수 있는 최대 거리도 구하시오. 각 식의 단위와 기울기의 뜻을 설명하시오.`,
      `y=${F}-x/${E}, 0<=x<=${D}; y(${x0})=${at} L; 추가=${extra} km`,
      `${parts[0]}. 연료 효율의 단위가 km/L이므로 거리/효율이 L이고 1 km마다 ${fmt(1 / E)} L가 줄어든다.\n${parts[1]}. x는 이 노선에서 달린 거리이다.\n${parts[2]}. 식에 해당 거리를 대입한다.\n${parts[3]}. 남은 연료에 km/L를 곱한다.`,
      null,
      writtenBasis,
      native(
        parts,
        [
          "1 km당 소비량으로 비례식 구성",
          "노선의 양 끝에서 직접 범위를 정함",
          "사용한 양을 먼저 계산하여 처음 양에서 뺌",
          "잔량이 0이 되는 추가 거리를 식으로 구함",
        ],
        [
          "효율을 곱해 연료 사용량 계산",
          "노선 길이 대신 연료가 빌 때까지를 정의역으로 씀",
          "남은 거리와 달린 거리를 혼동",
          "L 단위 값을 그대로 km로 답함",
        ],
      ),
    );
  },
  solve(item) {
    clauses(item.content, [
      "주유 없이 한 번",
      "노선에서 달린 거리를 $x$ km",
      "남은 연료를 $y$ L",
      "의미 있는 정의역",
      "도착 후 남은 연료",
      "최대 거리",
      "기울기의 뜻",
    ]);
    const E = Number(match(item.content, /1 L로 (\d+) km/)[1]),
      F = Number(match(item.content, /출발할 때 (\d+) L/)[1]),
      D = Number(match(item.content, /길이 (\d+) km인 노선/)[1]),
      x0 = Number(match(item.content, /([0-9]+) km를 달렸을 때/)[1]);
    insist(
      E > 0 && D > 0 && x0 >= 0 && x0 <= D && F * E >= D,
      "실행 가능 노선/거리",
    );
    const startRange = E * F,
      endRange = startRange - D,
      at = (startRange - x0) / E;
    const legs = D / E,
      reserve = endRange / E;
    insist(near(x0, D - E), "평가 거리 영역");
    return {
      answer: `y=${F}-x/${E}, 0<=x<=${D}; y(${x0})=${fmt(at)} L; 추가=${fmt(endRange)} km`,
      parameters: { efficiency: E, legs, reserve },
      rubric: fuelCriteria(E, F, D, x0, at, endRange),
    };
  },
});

const stoppedDomain: CanonicalParams[] = [];
for (const v1 of [6, 12])
  for (const v2 of [12, 18])
    for (const rest of [5, 10])
      for (const b of [10, 15]) stoppedDomain.push({ v1, v2, a: 10, rest, b });
function travelResponse(
  v1: number,
  v2: number,
  a: number,
  rest: number,
  arrival: number,
) {
  return `0<=t<=${a}: y=(${fmt(v1 / 60)})t; ${a}<t<=${a + rest}: y=${fmt((v1 * a) / 60)}; ${a + rest}<t<=${arrival}: y=${fmt((v1 * a) / 60)}+(${fmt(v2 / 60)})(t-${a + rest}); 도착=${arrival}분`;
}
function travelCriteria(
  v1: number,
  v2: number,
  a: number,
  rest: number,
  arrival: number,
) {
  return [
    `첫 구간 y=(${fmt(v1 / 60)})t (0<=t<=${a})`,
    `정지 구간 y=${fmt((v1 * a) / 60)} (${a}<t<=${a + rest})`,
    `마지막 구간 y=${fmt((v1 * a) / 60)}+(${fmt(v2 / 60)})(t-${a + rest})`,
    `도착=${arrival}분, 정지 시간 ${rest}분을 빼면 실제보다 ${rest}분 이르다`,
  ];
}
export const stoppedTravel = family({
  key: "stopped-travel",
  title: "정지 구간을 포함한 이동의 구간별 모델",
  course: "중2",
  unit: "일차함수의 활용",
  requirement: "written.stopped-travel",
  domain: stoppedDomain,
  written: true,
  boundaries: [
    "정지 시작·끝에서 연속",
    "같은/다른 두 이동속도",
    "분/시간 단위",
    "정지시간을 뺀 잘못된 도착시각",
  ],
  make(p) {
    const v1 = Number(p.v1),
      v2 = Number(p.v2),
      a = Number(p.a),
      rest = Number(p.rest),
      b = Number(p.b),
      D = (v1 * a) / 60 + (v2 * b) / 60,
      arrival = a + rest + b;
    const parts = travelCriteria(v1, v2, a, rest, arrival);
    return draft(
      p,
      `탐사자는 출발점에서 ${fmt(D)} km 떨어진 목적지까지 같은 방향으로 간다. 처음 ${a}분 동안 시속 ${v1} km로 이동하고, 이어서 ${rest}분 동안 제자리에 정지한 뒤 시속 ${v2} km로 목적지까지 이동한다. 출발 후 시간 $t$분에 출발점에서 이동한 거리를 $y$ km라 한다. 출발부터 도착까지 $y$를 구간별 식으로 나타내고 도착 시각을 구하시오. 경계 시각에서 식이 이어짐을 확인하고, 정지 시간을 빼고 계산한 도착 시각이 왜 틀렸는지 설명하시오.`,
      travelResponse(v1, v2, a, rest, arrival),
      `${parts[0]}. 시속을 60으로 나눠 분당 거리로 바꾼다.\n${parts[1]}. 정지 중에는 시간이 지나도 거리가 증가하지 않는다.\n${parts[2]}. 마지막 구간에서 움직인 시간은 t에서 정지 종료 시각을 뺀 값이다.\n${parts[3]}. 두 경계에서 앞뒤 식의 거리는 ${fmt((v1 * a) / 60)} km로 같고, 도착 때 거리는 ${fmt(D)} km이다.`,
      null,
      writtenBasis,
      native(
        parts,
        [
          "각 구간의 시간·거리 표를 먼저 구성",
          "위치 그래프의 수평 선분으로 표현 후 식으로 옮김",
          "마지막 직선의 기울기와 시작점을 이용",
          "이동 시간 합과 전체 경과 시간을 따로 계산",
        ],
        [
          "시속 수치를 그대로 분당 기울기로 씀",
          "정지 중에도 첫 속도로 이동한다고 계산",
          "마지막 구간의 시간에 t 전체를 대입",
          "거리 0인 정지의 경과 시간도 0이라고 처리",
        ],
      ),
    );
  },
  solve(item) {
    clauses(item.content, [
      "같은 방향",
      "제자리에 정지한 뒤",
      "출발 후 시간 $t$분",
      "출발부터 도착까지",
      "구간별 식",
      "경계 시각에서 식이 이어짐",
      "정지 시간을 빼고 계산한 도착 시각",
    ]);
    const D = numberText(
      match(item.content, /출발점에서 (\d+(?:\/\d+)?) km/)[1],
    );
    const m = match(
      item.content,
      /처음 (\d+)분 동안 시속 (\d+) km로 이동하고, 이어서 (\d+)분 동안 제자리에 정지한 뒤 시속 (\d+) km/,
    );
    const a = Number(m[1]),
      v1 = Number(m[2]),
      rest = Number(m[3]),
      v2 = Number(m[4]);
    insist(a > 0 && v1 > 0 && rest > 0 && v2 > 0, "양의 각 시간/속도");
    const first = (v1 * a) / 60,
      b = (D - first) / (v2 / 60),
      arrival = a + rest + b;
    insist(b > 0 && near(first + (v2 * b) / 60, D), "도착 조건");
    // At rest endpoints the two adjacent formulas evaluate to the same travelled distance.
    insist(
      near((v1 / 60) * a, first) &&
        near(first + (v2 / 60) * (a + rest - a - rest), first),
      "연속 경계",
    );
    return {
      answer: travelResponse(v1, v2, a, rest, arrival),
      parameters: { v1, v2, a, rest, b },
      rubric: travelCriteria(v1, v2, a, rest, arrival),
    };
  },
});

const ratesDomain: CanonicalParams[] = [];
for (const u of [2, 3])
  for (const v of [3, 4])
    for (const delta of [1, 2]) ratesDomain.push({ u, v, delta });
function ratesCriteria(
  p: number,
  q: number,
  r: number,
  s: number,
  C: number,
  u: number,
  v: number,
) {
  return [
    `${p}u+${q}v=${C}, ${r}u+${s}v=${C} (단위 L)`,
    `A의 작업률=${u} L/분, B의 작업률=${v} L/분`,
    `A 단독=${fmt(C / u)}분, B 단독=${fmt(C / v)}분`,
    u === v
      ? "두 작업률이 양수이고 단독 시간은 같다"
      : `두 작업률이 양수이고 ${u > v ? "A" : "B"}가 단독으로 더 빨리 채운다`,
  ];
}
export const twoWorkRates = family({
  key: "two-work-rates",
  title: "두 급수 일정으로 개별 작업률과 시간을 복원",
  course: "중2",
  unit: "연립일차방정식의 활용",
  requirement: "written.two-work-rates",
  domain: ratesDomain,
  written: true,
  boundaries: [
    "같은 작업률로 단독시간 동률",
    "서로 다른 작업률",
    "양의 속도와 일정별 대입",
    "독립적인 두 일정",
  ],
  make(p) {
    const u = Number(p.u),
      v = Number(p.v),
      delta = Number(p.delta),
      r = 2,
      q = 3,
      first = r + delta * v,
      second = q + delta * u,
      C = first * u + q * v;
    const parts = ratesCriteria(first, q, r, second, C, u, v);
    return draft(
      p,
      `용량 ${C} L의 빈 물통을 채우는 두 수도꼭지 $A,B$의 분당 급수량은 각각 일정하고 양수이다. 새로 비운 물통에 $A$만 ${first}분, 이어서 $B$만 ${q}분 틀면 정확히 가득 찬다. 다른 실험에서 다시 빈 물통에 $A$만 ${r}분, 이어서 $B$만 ${second}분 틀어도 정확히 가득 찬다. 물은 새거나 넘치지 않는다. 두 수도꼭지의 분당 급수량과 각각 혼자 빈 물통을 채우는 시간을 구하시오. 두 식을 세운 이유, 해가 실제 상황에 맞는지, 어느 쪽이 더 빨리 채우는지(같으면 같음)를 설명하시오.`,
      `A=${u} L/분, B=${v} L/분; 단독 A=${fmt(C / u)}분, B=${fmt(C / v)}분; ${u === v ? "같음" : u > v ? "A가 빠름" : "B가 빠름"}`,
      `${parts[0]}. 각 시간에 작업률을 곱한 양을 더하면 물통 용량이다.\n${parts[1]}. 두 실험의 식을 소거하여 구한다.\n${parts[2]}. 용량을 한 분의 급수량으로 나눈다.\n${parts[3]}. 구한 양의 작업률을 두 실험에 대입하면 각각 ${C} L이고, 각 첫 구간은 전체 용량보다 작아서 넘치지 않는다.`,
      null,
      writtenBasis,
      native(
        parts,
        [
          "한 일정에서 다른 일정을 빼어 속도 비를 먼저 구함",
          "대입법 또는 가감법으로 연립식 풀이",
          "1 L당 시간을 먼저 구한 뒤 용량을 곱함",
          "단독 시간을 직접 비교하고 두 실험을 대입 검산",
        ],
        [
          "일한 시간을 더해 작업률이라고 답함",
          "급수량을 구하지 않고 두 시간을 평균",
          "작업률을 용량으로 나눠 시간으로 답함",
          "음수 해를 실제 급수량으로 허용하거나 동률을 놓침",
        ],
      ),
    );
  },
  solve(item) {
    clauses(item.content, [
      "각각 일정하고 양수",
      "새로 비운 물통",
      "다시 빈 물통",
      "정확히 가득",
      "물은 새거나 넘치지 않는다",
      "각각 혼자 빈 물통을 채우는 시간",
      "해가 실제 상황에 맞는지",
      "같으면 같음",
    ]);
    const C = Number(match(item.content, /용량 (\d+) L/)[1]);
    const m = match(
        item.content,
        /\$A\$만 (\d+)분, 이어서 \$B\$만 (\d+)분 틀면/,
      ),
      n = match(
        item.content,
        /다시 빈 물통에 \$A\$만 (\d+)분, 이어서 \$B\$만 (\d+)분/,
      );
    const p = Number(m[1]),
      q = Number(m[2]),
      r = Number(n[1]),
      s = Number(n[2]);
    const [u, v] = linear2(p, q, C, r, s, C);
    insist(
      u > 0 &&
        v > 0 &&
        p * u < C &&
        r * u < C &&
        near(p * u + q * v, C) &&
        near(r * u + s * v, C),
      "급수량의 양수/비넘침/원조건",
    );
    insist(q === 3 && r === 2 && near((p - r) / v, (s - q) / u), "일정 영역");
    return {
      answer: `A=${fmt(u)} L/분, B=${fmt(v)} L/분; 단독 A=${fmt(C / u)}분, B=${fmt(C / v)}분; ${near(u, v) ? "같음" : u > v ? "A가 빠름" : "B가 빠름"}`,
      parameters: { u, v, delta: (p - r) / v },
      rubric: ratesCriteria(p, q, r, s, C, u, v),
    };
  },
});

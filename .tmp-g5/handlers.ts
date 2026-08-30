/* ── 후보 묶음 — 소단원 이름이 그대로 조건이다 ─────────────────────────────── */

/** `0.1`~`0.9` — 1보다 작은 소수 한 자리 수. */
const P_UNDER1: Sc[] = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((t) => [t, 1] as Sc);

/** `1.1`~`4.9` — 1보다 큰 소수 한 자리 수(`overOneT` 와 같은 범위). */
const P_OVER1: Sc[] = (() => {
  const out: Sc[] = [];
  for (let w = 1; w <= 4; w += 1)
    for (let f = 1; f <= 9; f += 1) out.push([w * 10 + f, 1]);
  return out;
})();

/** 둘째 걸음의 곱하는 수로 쓰는 `1.1`~`2.9` — 곱이 두 자리를 안 넘게 좁혔다. */
const P_OVER1_SMALL: Sc[] = P_OVER1.filter((s) => s[0] <= 29);

/** 한 자리 자연수 `2`~`9`. */
const P_NAT: Sc[] = [2, 3, 4, 5, 6, 7, 8, 9].map((k) => [k, 0] as Sc);

/** 소수 두 자리 `0.11`~`0.99`(끝자리 0 은 지면에서 접히므로 뺀다) — 2-4-7 참값. */
const P_HUND: Sc[] = (() => {
  const out: Sc[] = [];
  for (let v = 11; v <= 99; v += 1) if (v % 10 !== 0) out.push([v, 2]);
  return out;
})();

/** 자리를 옮기는 수. */
const P_POWERS: Sc[] = [
  [10, 0],
  [100, 0],
  [1000, 0],
];

const isUnder1Digit = (v: Sc) =>
  scPlaces(v) === 1 && scQ(v) > 0 && scQ(v) < SC_Q;
const isOver1Digit = (v: Sc) => scPlaces(v) === 1 && scQ(v) > SC_Q;
const isTwoPlaces = (v: Sc) => scPlaces(v) === 2;

/** 경계로 쓸 «반듯한 수»들. */
function scSteps(lo: number, hi: number, step: number, places: number): Sc[] {
  const out: Sc[] = [];
  for (let v = lo; v <= hi; v += step) out.push([v, places]);
  return out;
}

const UNDER_ONE_WORD = `${n(1)}보다 작은 소수 한 자리 수`;
const OVER_ONE_WORD = `${n(1)}보다 큰 소수 한 자리 수`;

/* ── 심화중 일곱 ──────────────────────────────────────────────────────────── */

function dm241Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-241-mid",
      aPool: P_UNDER1,
      kPool: P_NAT,
      dir: -1,
      holds: isUnder1Digit,
      maxPlaces: 2,
      shows: "under",
    },
    UNDER_ONE_WORD,
    "dec",
  );
}

function dm242Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-242-mid",
      aPool: P_OVER1,
      kPool: P_NAT,
      dir: -1,
      holds: isOver1Digit,
      maxPlaces: 2,
      shows: "over",
    },
    OVER_ONE_WORD,
    "dec",
  );
}

function dm243Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-243-mid",
      aPool: P_UNDER1,
      kPool: P_NAT,
      dir: -1,
      holds: isUnder1Digit,
      maxPlaces: 2,
      shows: "under",
    },
    UNDER_ONE_WORD,
    "whole",
  );
}

function dm244Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-244-mid",
      aPool: P_OVER1,
      kPool: P_NAT,
      dir: -1,
      holds: isOver1Digit,
      maxPlaces: 2,
      shows: "over",
    },
    OVER_ONE_WORD,
    "whole",
  );
}

function dm245Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-245-mid",
      aPool: P_UNDER1,
      kPool: P_UNDER1,
      dir: 1,
      holds: isUnder1Digit,
      maxPlaces: 2,
      shows: "under",
    },
    UNDER_ONE_WORD,
    "dec",
  );
}

function dm246Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-246-mid",
      aPool: P_OVER1,
      kPool: P_OVER1,
      dir: 1,
      holds: isOver1Digit,
      maxPlaces: 2,
      shows: "over",
    },
    OVER_ONE_WORD,
    "dec",
  );
}

/** 2-4-7 은 굳히는 성질이 **자릿수**다 — 그 소단원이 묻는 것이 곧 자리이기 때문. */
function dm247Mid(unit: UnitSeed, rng: Rng): ElemProblem {
  return misplacedMid(
    unit,
    rng,
    {
      key: "g5-247-mid",
      aPool: P_HUND,
      kPool: P_POWERS,
      dir: 1,
      holds: isTwoPlaces,
      maxPlaces: 3,
      shows: "any",
    },
    "소수 두 자리 수",
    "dec",
  );
}

/* ── 심화상 여섯 + 2-4-7 ─────────────────────────────────────────────────── */

function dm241Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-241-top",
      decPool: P_UNDER1,
      otherPool: P_NAT,
      probePool: P_UNDER1,
      boundPool: scSteps(1, 9, 1, 0),
      maxPlaces: 2,
      shows: "under",
    },
    {
      pair: `어떤 ${UNDER_ONE_WORD}와 어떤 한 자리 자연수`,
      other: "그 자연수",
      ask: "처음의 소수",
    },
    "dec",
  );
}

function dm242Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-242-top",
      decPool: P_OVER1,
      otherPool: P_NAT,
      probePool: P_OVER1_SMALL,
      boundPool: scSteps(2, 26, 2, 0),
      maxPlaces: 2,
      shows: "over",
    },
    {
      pair: `어떤 ${OVER_ONE_WORD}와 어떤 한 자리 자연수`,
      other: "그 자연수",
      ask: "처음의 소수",
    },
    "dec",
  );
}

function dm243Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-243-top",
      decPool: P_UNDER1,
      otherPool: P_NAT,
      probePool: P_UNDER1,
      boundPool: scSteps(1, 9, 1, 0),
      maxPlaces: 2,
      shows: "under",
    },
    {
      pair: `어떤 한 자리 자연수와 어떤 ${UNDER_ONE_WORD}`,
      other: "그 자연수",
      ask: "처음의 소수",
    },
    "whole",
  );
}

function dm244Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-244-top",
      decPool: P_OVER1,
      otherPool: P_NAT,
      probePool: P_OVER1_SMALL,
      boundPool: scSteps(2, 26, 2, 0),
      maxPlaces: 2,
      shows: "over",
    },
    {
      pair: `어떤 한 자리 자연수와 어떤 ${OVER_ONE_WORD}`,
      other: "그 자연수",
      ask: "처음의 소수",
    },
    "whole",
  );
}

function dm245Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-245-top",
      decPool: P_UNDER1,
      otherPool: P_UNDER1,
      probePool: P_UNDER1,
      boundPool: scSteps(5, 90, 5, 2),
      maxPlaces: 2,
      shows: "under",
    },
    {
      pair: `${UNDER_ONE_WORD} 둘`,
      other: "두 소수 중 하나",
      ask: "나머지 한 소수",
    },
    "dec",
  );
}

function dm246Top(unit: UnitSeed, rng: Rng): ElemProblem {
  return factorTop(
    unit,
    rng,
    {
      key: "g5-246-top",
      decPool: P_OVER1,
      otherPool: P_OVER1,
      probePool: P_OVER1_SMALL,
      boundPool: scSteps(10, 140, 5, 1),
      maxPlaces: 2,
      shows: "over",
    },
    {
      pair: `${OVER_ONE_WORD} 둘`,
      other: "두 소수 중 하나",
      ask: "나머지 한 소수",
    },
    "dec",
  );
}

/* ── 2-4-7 심화상 — 「어느 수를 곱했는지 모른다」 ──────────────────────────── */

type PointTask = {
  product: Sc;
  powers: [Sc, Sc];
  answer: Sc;
  otherCand: Sc;
  probe: Sc;
  lo: Sc;
  hi: Sc;
};

const POINT_CACHE = new Map<string, PointTask[]>();

/**
 * 되짚기가 **두 후보**를 만든다(어느 수를 곱했는지 모르므로). 둘 다 소수라
 * 「소수다」라는 성질로는 안 굳고, **각각에 다시 곱해 봐야** 하나가 남는다.
 */
function pointTasks(): PointTask[] {
  const cached = POINT_CACHE.get("g5-247-top");
  if (cached) return cached;
  const out: PointTask[] = [];
  const probes: Sc[] = [
    [1, 1],
    [1, 2],
    [10, 0],
    [100, 0],
  ];
  const bounds: Sc[] = [
    [1, 3],
    [5, 3],
    [1, 2],
    [5, 2],
    [1, 1],
    [5, 1],
    [1, 0],
    [5, 0],
    [10, 0],
    [50, 0],
    [100, 0],
    [500, 0],
  ];
  for (let i = 0; i < P_POWERS.length; i += 1) {
    for (let j = i + 1; j < P_POWERS.length; j += 1) {
      const a = P_POWERS[i]!;
      const b = P_POWERS[j]!;
      for (const base of P_HUND) {
        // 곱은 둘 중 **한쪽**으로 만든다 — 어느 쪽인지는 발문이 말하지 않는다.
        for (const [used, unused] of [
          [a, b],
          [b, a],
        ] as const) {
          const product = scMul(base, used);
          if (scPlaces(product) > 3) continue;
          // 다른 후보 — 곱을 반대쪽 수로 되짚은 값.
          const ratio = scQ(unused) / scQ(used);
          const otherCand: Sc = [
            base[0],
            base[1] + Math.round(Math.log10(ratio)),
          ];
          if (otherCand[1] < 1 || otherCand[1] > 3) continue;
          if (scPlaces(otherCand) < 1 || scPlaces(base) < 1) continue;
          for (const probe of probes) {
            const v1 = scMul(base, probe);
            const v2 = scMul(otherCand, probe);
            if (scPlaces(v1) > 3 || scPlaces(v2) > 3) continue;
            if (scQ(v1) === scQ(v2)) continue;
            for (let x = 0; x < bounds.length; x += 1) {
              for (let y = x + 1; y < bounds.length; y += 1) {
                const lo = bounds[x]!;
                const hi = bounds[y]!;
                const inA = scQ(v1) > scQ(lo) && scQ(v1) < scQ(hi);
                const inB = scQ(v2) > scQ(lo) && scQ(v2) < scQ(hi);
                if (!inA || inB) continue; // 정확히 참값 하나만 남아야 한다
                const shown = [product, a, b, probe, lo, hi];
                if (forwardReach(shown, base)) continue;
                out.push({
                  product,
                  powers: [a, b],
                  answer: base,
                  otherCand,
                  probe,
                  lo,
                  hi,
                });
              }
            }
          }
        }
      }
    }
  }
  POINT_CACHE.set("g5-247-top", out);
  return out;
}

function dm247Top(unit: UnitSeed, rng: Rng): ElemProblem {
  const tasks = pointTasks();
  if (tasks.length === 0) {
    throw new Error(
      `«심화상» 후보가 하나도 없습니다: ${unit.grade} ${unit.section}`,
    );
  }
  const t = pick(rng, tasks);
  const [p1, p2] = t.powers;
  const say = (v: Sc) =>
    `${scText(v)}\\times${scText(t.probe)}=${scText(scMul(v, t.probe))}`;
  return makeDeep(
    unit,
    `어떤 소수에 ${n(scText(p1))} 또는 ${dj(scText(p2), "을", "를")} 곱했더니 ` +
      `${dj(scText(t.product), "이", "가")} 되었습니다. ` +
      `어떤 소수에 ${dj(scText(t.probe), "을", "를")} 곱한 값이 ${n(scText(t.lo))}보다 크고 ` +
      `${n(scText(t.hi))}보다 작을 때, 어떤 소수를 구하시오.`,
    expr(scText(t.answer)),
    [
      `소수점을 되돌리면 어떤 소수는 ${expr(scText(t.answer))} 또는 ${expr(scText(t.otherCand))}입니다. 둘 다 소수라 이것만으로는 못 정합니다.`,
      `${dj(scText(t.probe), "을", "를")} 각각 곱해 봅니다. ${expr(say(t.answer))}, ${expr(say(t.otherCand))}입니다.`,
      `${n(scText(t.lo))}보다 크고 ${n(scText(t.hi))}보다 작은 것은 ${expr(scText(scMul(t.answer, t.probe)))}이므로 어떤 소수는 ${expr(scText(t.answer))}입니다.`,
    ],
  );
}

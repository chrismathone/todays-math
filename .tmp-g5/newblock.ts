/* ────────────────────────────────────────────────────────────────────────────
 * 2-4 확대 갈래 «심화중»·«심화상» — D-113 파일럿 (2026-08-30, **되짚기 축**)
 *
 * 🔴 **첫 판은 «열거 축»이었고 기각됐다.** 리드가 문형 경로 전량(6,900행)에 두 축을
 *    나란히 대 보니 열거는 갈래를 **1.5~2배**밖에 안 가르는데 되짚기는 **22~40배**
 *    가른다. 게다가 심화하 **안에서** 열거형은 평균 0.39걸음으로 **그 소단원의 연산
 *    (0.79)보다도 얕았다** — 열거를 위 두 칸의 정의로 쓰면 가장 얕은 것을 꼭대기로
 *    올리는 셈이다. 그래서 이 블록을 통째로 다시 짰다.
 *
 * ## 확정 잣대 — 되짚기 사슬의 «마디»가 굳는가
 *
 *   심화하  마디마다 값이 **하나로 굳는다**  `0.4×□=2.8` → □=7   (기존, 안 건드림)
 *   심화중  **굳지 않는 마디가 하나** 있고, **그 소단원의 성질**이 한 번에 굳혀 준다
 *   심화상  성질만으로는 못 굳혀서, 그 소단원의 계산으로 나올 수 있는 값들을
 *           **실제로 만들어 견주어야** 하나가 남는다. 그리고 그 후보를
 *           **발문이 주지 않고 되짚기가 만든다.**
 *
 * ## 이 파일이 쓰는 두 뼈대
 *
 * **㉠ 심화중 — 소수점을 한 자리 «잘못» 옮겼다** (`misplacedMid`)
 *    되짚기로 «잘못 쓴 수»까지는 하나로 굳는다. 그런데 **어느 쪽으로 옮겼는지를
 *    발문이 말하지 않는다** — 원래 수 후보가 둘이다. 그 마디를 **소단원의 이름**
 *    (「1보다 작은 소수 한 자리 수」…)이 한 번에 굳힌다.
 *    ⚠️ 방향을 발문에 적으면 마디가 굳어 **심화하가 된다.** 안 적는 것이 이 갈래다.
 *
 * **㉡ 심화상 — 곱만 알고 두 인수를 모른다** (`factorTop`)
 *    인수분해는 하나로 안 굳고, 소단원의 성질로도 여러 짝이 남는다. 그래서
 *    **짝마다 둘째 곱셈을 실제로 해 보고** 조건에 맞는 것을 골라야 한다.
 *
 *    🔴 **둘째 걸음만으로 풀리면 안 된다.** 조건 창에 드는 후보가 **둘 이상**이도록
 *    잡아, 「그중 어느 것이 곱을 만드는가」를 **인수 되짚기로** 갈라야만 답이 나오게
 *    했다(예: 창이 $6$·$7$ 을 남기고 $2.4$ 를 만드는 것은 $6$ 뿐이다). 이 조건이
 *    없으면 학생이 창만 보고 답을 얻어 되짚기가 장식이 된다.
 *
 * ## 반증문 ⑥ 을 **생성기가 스스로 막는다**
 *
 * 「발문이 준 수에 순방향 곱셈만으로 답이 나오면 중·상이 아니다」 — `forwardReach`
 * 가 그것을 세고, 걸리는 후보는 **애초에 안 만든다.** 판정기
 * (`scripts/qa/probe-elem-tier-backsolve.ts`)가 ④ 와 함께 밖에서 다시 잰다.
 *
 * 🔴 **숫자를 안 키웠다**(원장님). 소수는 한 자리, 자연수는 한 자리, 곱은 소수 두 자리
 *    안에 머문다(2-4-7 만 세 자리 — 그 소단원이 자리를 옮기는 단원이라서다).
 *
 * ⚠️ **갈래만 채운다 — 문형(`G5_FORMS`)은 안 건드린다**(D-113·D-114, 순서는 잣대 →
 *    갈래 → 문형 12 → 적재다). 그래서 적재본에는 한 건도 안 들어간다.
 * ──────────────────────────────────────────────────────────────────────────── */

/** 정수 스케일 수 — `[값, 소수점 아래 자릿수]`. 견주기·곱하기를 부동소수 없이 한다. */
type Sc = readonly [number, number];

/** 자릿수가 다른 둘을 견주기 위한 공통 분모(십만분의 일). */
const SC_Q = 100000;
const scQ = (s: Sc): number => s[0] * (SC_Q / 10 ** s[1]);
const scMul = (a: Sc, b: Sc): Sc => [a[0] * b[0], a[1] + b[1]];
/** 지면 표기 — `dec` 가 꼬리 0 을 접는다. */
const scText = (s: Sc): string => dec(s[0], s[1]);

/** 꼬리 0 을 접은 뒤 남는 소수 자릿수. 0 이면 자연수다. */
function scPlaces(s: Sc): number {
  let v = s[0];
  let d = s[1];
  while (d > 0 && v % 10 === 0) {
    v /= 10;
    d -= 1;
  }
  return d;
}

/** 소수점을 오른쪽(`+1`)·왼쪽(`-1`)으로 한 자리 옮긴 수. 자릿수는 정규화한다. */
function scShift(s: Sc, dir: 1 | -1): Sc {
  let v = s[0];
  let d = s[1] - dir;
  while (d < 0) {
    v *= 10;
    d += 1;
  }
  return [v, d];
}

/** `$6$, $7$로는` — 나열 뒤 «(으)로» 를 마지막 수의 소리에 맞춘다. */
function listRo(values: readonly Sc[]): string {
  const last = values[values.length - 1]!;
  return `${values.map((v) => n(scText(v))).join(", ")}${dro(scText(last))}는`;
}

/**
 * **반증 ⑥ 을 기계로 막는다** — 발문의 수에 곱셈(과 한 번의 덧뺄셈)만 순방향으로
 * 써서 답이 나오면 그 문항은 중·상이 아니다.
 *
 * ⚠️ 이 자는 «되짚기가 필요한가»를 못 잰다. **«순방향으로도 되나»만** 잰다 —
 *    걸리면 확실히 아니고, 안 걸린다고 반드시 되짚기인 것은 아니다(그건 사람이 본다).
 */
function forwardReach(nums: readonly Sc[], answer: Sc): boolean {
  const want = scQ(answer);
  for (const a of nums) if (scQ(a) === want) return true;
  for (let i = 0; i < nums.length; i += 1) {
    for (let j = 0; j < nums.length; j += 1) {
      if (i === j) continue;
      const p = scQ(scMul(nums[i]!, nums[j]!));
      if (p === want) return true;
      for (let k = 0; k < nums.length; k += 1) {
        if (k === i || k === j) continue;
        const q = scQ(nums[k]!);
        if (p + q === want || p - q === want) return true;
      }
    }
  }
  return false;
}

/* ── ㉠ 심화중 — 「소수점을 한 자리 잘못 옮긴 수로 계산했다」 ─────────────── */

type MisTask = { a: Sc; k: Sc; wrong: Sc; product: Sc; right: Sc };

const MIS_CACHE = new Map<string, MisTask[]>();

type MisSpec = {
  key: string;
  /** 참값 소수 후보 — 그 소단원의 성질을 만족하는 것만. */
  aPool: readonly Sc[];
  /** 곱하는 수 후보. */
  kPool: readonly Sc[];
  /** 어느 쪽으로 잘못 옮겼나 — **발문에는 안 적는다**(그래야 마디가 안 굳는다). */
  dir: 1 | -1;
  /** 소단원의 성질. 되짚기가 만든 두 후보 중 **하나만** 이걸 만족해야 한다. */
  holds: (v: Sc) => boolean;
  /** 지면에 나가는 수의 소수 자릿수 상한. */
  maxPlaces: number;
  /** 발문에 소단원 이름이 내건 크기의 소수가 있어야 한다. */
  shows: "under" | "over" | "any";
};

/** 발문에 보이는 수가 소단원 이름의 크기를 갖췄나. */
function showsOk(shown: readonly Sc[], want: MisSpec["shows"]): boolean {
  if (want === "any") return true;
  return shown.some(
    (s) =>
      scPlaces(s) >= 1 &&
      (want === "under" ? scQ(s) > 0 && scQ(s) < SC_Q : scQ(s) > SC_Q),
  );
}

function misTasks(spec: MisSpec): MisTask[] {
  const cached = MIS_CACHE.get(spec.key);
  if (cached) return cached;
  const out: MisTask[] = [];
  for (const a of spec.aPool) {
    if (!spec.holds(a)) continue;
    const wrong = scShift(a, spec.dir);
    // 되짚기가 만드는 **다른 후보** — 발문이 방향을 안 말하므로 이것도 살아 있다.
    const other = scShift(wrong, spec.dir === 1 ? 1 : -1);
    // 🔴 마디가 «굳지 않아야» 한다. 다른 후보도 성질을 만족하면 답이 둘이 된다.
    if (spec.holds(other)) continue;
    for (const k of spec.kPool) {
      const product = scMul(wrong, k);
      const right = scMul(a, k);
      if (
        [product, right, a, wrong, k].some((s) => scPlaces(s) > spec.maxPlaces)
      )
        continue;
      if (scQ(product) === scQ(right)) continue;
      const shown = [product, k];
      if (!showsOk(shown, spec.shows)) continue;
      if (forwardReach(shown, right)) continue;
      out.push({ a, k, wrong, product, right });
    }
  }
  MIS_CACHE.set(spec.key, out);
  return out;
}

/**
 * 심화중 문항 하나.
 *
 * `order` 는 그 소단원이 약속한 **차례**다 — 2-4-1·2 는 소수가 앞, 2-4-3·4 는 자연수가
 * 앞이다. 발문과 해설의 식이 그 차례를 지켜야 소단원 이름이 거짓말이 되지 않는다(반증 ③).
 */
function misplacedMid(
  unit: UnitSeed,
  rng: Rng,
  spec: MisSpec,
  property: string,
  order: "dec" | "whole",
): ElemProblem {
  const tasks = misTasks(spec);
  if (tasks.length === 0) {
    throw new Error(
      `«심화중» 후보가 하나도 없습니다: ${unit.grade} ${unit.section}`,
    );
  }
  const t = pick(rng, tasks);
  const times = (x: Sc, y: Sc) =>
    order === "dec"
      ? `${scText(x)}\\times${scText(y)}`
      : `${scText(y)}\\times${scText(x)}`;
  const kText = scText(t.k);
  const head =
    order === "dec"
      ? `어떤 수에 ${dj(kText, "을", "를")} 곱해야 할 것을, 어떤 수의 소수점을 한 자리 잘못 옮긴 수에 ${dj(kText, "을", "를")} 곱했더니`
      : `${n(kText)}에 어떤 수를 곱해야 할 것을, ${n(kText)}에 어떤 수의 소수점을 한 자리 잘못 옮긴 수를 곱했더니`;
  return makeDeep(
    unit,
    `${head} ${dj(scText(t.product), "이", "가")} 되었습니다. ` +
      `어떤 수가 ${property}일 때 바르게 계산한 값을 구하시오.`,
    expr(scText(t.right)),
    [
      `잘못 쓴 수부터 되짚습니다. ${expr(`${times(t.wrong, t.k)}=${scText(t.product)}`)}이므로 잘못 쓴 수는 ${expr(scText(t.wrong))}입니다.`,
      `소수점을 한쪽으로 옮기면 ${expr(scText(t.a))}이 되고 반대쪽으로 옮기면 ${property}가 아니므로, 어떤 수는 ${expr(scText(t.a))}입니다.`,
      `바르게 계산하면 ${expr(`${times(t.a, t.k)}=${scText(t.right)}`)}입니다.`,
    ],
  );
}

/* ── ㉡ 심화상 — 「곱만 알고 두 인수를 모른다 → 짝마다 계산해 견준다」 ────── */

type TopTask = {
  product: Sc;
  /** 답 — 되짚기로만 갈라지는 인수. */
  dec: Sc;
  /** 창 조건이 걸리는 인수. */
  other: Sc;
  probe: Sc;
  lo: Sc;
  hi: Sc;
  /** 창에는 들지만 곱을 못 만드는 «미끼» — 되짚기를 강제하는 근거다. */
  decoys: Sc[];
};

const TOP_CACHE = new Map<string, TopTask[]>();

type TopSpec = {
  key: string;
  /** 답이 되는 인수의 후보(그 소단원의 성질). */
  decPool: readonly Sc[];
  /** 창 조건이 걸리는 인수의 후보. */
  otherPool: readonly Sc[];
  probePool: readonly Sc[];
  boundPool: readonly Sc[];
  maxPlaces: number;
  shows: "under" | "over" | "any";
};

function topTasks(spec: TopSpec): TopTask[] {
  const cached = TOP_CACHE.get(spec.key);
  if (cached) return cached;
  const out: TopTask[] = [];
  for (const probe of spec.probePool) {
    for (let i = 0; i < spec.boundPool.length; i += 1) {
      const lo = spec.boundPool[i]!;
      for (let j = i + 1; j < spec.boundPool.length; j += 1) {
        const hi = spec.boundPool[j]!;
        const inWindow = spec.otherPool.filter((o) => {
          const v = scQ(scMul(probe, o));
          return v > scQ(lo) && v < scQ(hi);
        });
        // 🔴 창이 하나만 남기면 학생이 창만 보고 답을 얻는다 — 되짚기가 장식이 된다.
        if (inWindow.length < 2 || inWindow.length > 4) continue;
        if (inWindow.some((o) => scPlaces(scMul(probe, o)) > spec.maxPlaces))
          continue;
        for (const other of inWindow) {
          for (const decv of spec.decPool) {
            if (scPlaces(decv) < 1) continue;
            const product = scMul(decv, other);
            if (scPlaces(product) > spec.maxPlaces) continue;
            // 창 안의 다른 후보가 같은 곱을 만들면 답이 둘이다.
            const rival = inWindow.some(
              (o) =>
                scQ(o) !== scQ(other) &&
                spec.decPool.some(
                  (d) => scPlaces(d) >= 1 && scQ(scMul(d, o)) === scQ(product),
                ),
            );
            if (rival) continue;
            const decoys = inWindow.filter((o) => scQ(o) !== scQ(other));
            if (decoys.length === 0) continue;
            const shown = [product, probe, lo, hi];
            if (!showsOk(shown, spec.shows)) continue;
            if (forwardReach(shown, decv)) continue;
            out.push({ product, dec: decv, other, probe, lo, hi, decoys });
          }
        }
      }
    }
  }
  TOP_CACHE.set(spec.key, out);
  return out;
}

function factorTop(
  unit: UnitSeed,
  rng: Rng,
  spec: TopSpec,
  words: { pair: string; other: string; ask: string },
  order: "dec" | "whole",
): ElemProblem {
  const tasks = topTasks(spec);
  if (tasks.length === 0) {
    throw new Error(
      `«심화상» 후보가 하나도 없습니다: ${unit.grade} ${unit.section}`,
    );
  }
  const t = pick(rng, tasks);
  const times = (x: Sc, y: Sc) =>
    order === "dec"
      ? `${scText(x)}\\times${scText(y)}`
      : `${scText(y)}\\times${scText(x)}`;
  const probeOf = (o: Sc) =>
    `${times(t.probe, o)}=${scText(scMul(t.probe, o))}`;
  const window = [t.other, ...t.decoys].sort((a, b) => scQ(a) - scQ(b));
  const listed = window.map((o) => expr(probeOf(o))).join(", ");
  const probeText = scText(t.probe);
  const cond =
    order === "dec"
      ? `${dj(probeText, "과", "와")} ${words.other}를 곱한 값`
      : `${words.other}와 ${dj(probeText, "을", "를")} 곱한 값`;
  return makeDeep(
    unit,
    `${words.pair}를 곱했더니 ${dj(scText(t.product), "이", "가")} 되었습니다. ` +
      `${cond}이 ${n(scText(t.lo))}보다 크고 ${n(scText(t.hi))}보다 작을 때, ${words.ask}를 구하시오.`,
    expr(scText(t.dec)),
    [
      `먼저 조건에 맞는 ${words.other}를 찾습니다. ${listed}이 그 사이에 듭니다.`,
      `그중 어느 것이 ${dj(scText(t.product), "을", "를")} 만드는지 봅니다. ${listRo(t.decoys)} 짝을 만들 수 없습니다.`,
      `${expr(`${times(t.dec, t.other)}=${scText(t.product)}`)}이므로 ${words.ask}는 ${expr(scText(t.dec))}입니다.`,
    ],
  );
}

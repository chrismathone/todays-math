/**
 * **단위 뒤에 손으로 적은 조사** — 지면에서 잰다.
 *
 *   npx tsx scripts/qa/probe-elem-unit-josa.ts
 *   npx tsx scripts/qa/probe-elem-unit-josa.ts --selftest
 *
 * ## 왜 새 판정기인가 — **판정기 셋의 사각지대가 정확히 겹친다**
 *
 * `색종이 $278$장를 …` 이 실물로 나가고 있었는데 아무도 못 봤다:
 *   · `probe-elem-rules` R-조사 — 스스로 **「단위는 판정 밖」**이라 적어 두었다
 *   · `probe-elem-josa-source` — `josa()` **호출**을 보는데 이건 **리터럴**이다
 *   · 산출물 조사 검사 — `$…$` **바로 뒤**만 보는데 여기는 `$278$` 다음에 「장」이 낀다
 *
 * 그리고 **원문으로는 못 푼다** — 표 구동(`{ unit: "L", unitJosa: "를" }`)이 있어
 * 값이 정해지는 것은 지면에서다. 축이 다르면 파일도 달라야 한다(2026-08-23 리드 판단).
 *
 * ## ⚠️ **한글 단위를 표에 적지 마라** — 손 목록이 필요한 자리의 경계선
 *
 * **한글 단위는 글자가 곧 소리라 받침을 «계산»할 수 있다.** 손 표는 **라틴·기호
 * 단위(kg·cm·℃)에만** 쓴다 — 그것만이 글자로 소리를 모르는 부류다.
 *
 * 이 경계선은 실패로 배웠다: 첫 판이 한글 단위까지 표에 적었고 **「원」을 받침 없음으로
 * 적어 310자리가 거짓**이었다(원 = ㅇㅝㄴ, 받침 ㄴ). 「손 목록은 샌다」는 이 저장소가
 * 여러 번 적었는데, 여기서 **어디까지가 손이 필요한 자리인지**가 정해진다.
 * 아래 `LATIN_READING` 에 한글을 더하려거든 이 문단을 먼저 읽을 것.
 *
 * ## ⚠️ 한글에서 **부분 문자열은 늘 샌다** — 자리 조건을 같이 걸어라
 *
 * 2026-08-23 하루에 **셋이 각각 다른 사람·다른 파일에서** 같은 것을 밟았다:
 *   · 「반**지름**」 속 「지름」 — 조건 판정기가 «둘 다 있다»로 읽었다 (g3)
 *   · 짧은 needle 「각의 크기에 따라 분류하기」가 초4 1-2-3 까지 샜다 (g4)
 *   · 「**초**과」의 「초」를 단위로, 「과」를 조사로 읽었다 — **268자리 거짓** (여기)
 *
 * ⚠️ **그 268자리를 막은 것은 「초를 단위 목록에서 뺀 것」이지 자리 조건이 아니다.**
 * 처음엔 자리 조건이 막은 줄 알고 그렇게 적었는데, 변이 시험이 「자리 조건을 없애도
 * 산출물이 같다」며 **판정을 거부**해서 드러났다 — 두 가지를 한 번에 바꿔 놓고 한쪽에
 * 공을 돌린 것이었다. 실측: `$54$ 초과` 는 자리 조건을 **통과한다**(`$`+빈칸 뒤다).
 *
 * 그러면 자리 조건은 왜 두나 — **분모의 뜻** 때문이다. 없으면 「공원을」의 「원」까지
 * «잰 자리»로 세어 M 이 두 배가 된다(실측 7,546 → 14,324). 그건 단위 자리가 아니다.
 * 한글에서는 조사의 옳고 그름이 **마지막 음절**로만 갈리므로, 낱말 속에 우연히 낀
 * 단위 음절은 **거짓 어긋남을 못 만든다** — 그래서 이 조건은 어긋남 눈금으로는
 * 못 지키고, 아래 눈금이 **«잰 자리» 수까지 못 박아** 지킨다.
 *
 * ## ⚠️ 「이고」는 조사가 아니라 **연결어미**다
 *
 * `$6$℃이고` 는 옳다(도이고). 조사 뒤에 한글이 이어지면 판정하지 않는다.
 * 이걸 결함으로 읽고 규칙을 넓히려다, 실물을 열어 보고서야 **급히 만든 확인 스크립트
 * 쪽이 틀렸다**는 것을 알았다 — **좁힌 뒤에는 «아는 양성»으로 다시 대 볼 것.**
 *
 * ## 무엇을 찍나
 *
 * **잰 자리 M 과 어긋남 N 을 같이 찍는다.** N=0 은 M 이 있어야 «깨끗»이 된다 —
 * M=0 이면 그건 «못 셈»이다. 읽을 수 없는 단위는 **모름**으로 따로 세어 드러낸다
 * (조용히 넘기면 새 단위가 들어올 때 그 자리는 영영 0이다).
 */
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";
import {
  elementaryUnits,
  generateElementaryProblem,
  supportedTiers,
} from "../../src/lib/elementary/generate";
import { openFence } from "./elemProbeFence";

const SEEDS = Array.from({ length: 40 }, (_, i) => 20260823 + i * 613);

/** **라틴·기호 단위만.** 한글은 계산한다 — 위 경계선 문단을 먼저 읽을 것. */
const LATIN_READING: Record<string, boolean> = {
  kg: true, // 킬로그램
  g: true, // 그램
  m: false, // 미터
  cm: false, // 센티미터
  mm: false, // 밀리미터
  km: false, // 킬로미터
  L: false, // 리터
  mL: false, // 밀리리터
  "℃": false, // 도
  "°": false, // 도
};

/** 지면에 실제로 쓰는 한글 단위 — **받침은 안 적는다. 계산한다.** */
const HANGUL_UNITS = [
  "개",
  "장",
  "권",
  "명",
  "대",
  "그루",
  "자루",
  "마리",
  "벌",
  "켤레",
  "원",
  "묶음",
  "상자",
  "봉지",
  "도막",
  "판",
  "송이",
  "모둠",
  "줄",
  "쪽",
];

const PAIRS: [string, string][] = [
  ["은", "는"],
  ["이", "가"],
  ["을", "를"],
  ["과", "와"],
];

const UNITS = [...Object.keys(LATIN_READING), ...HANGUL_UNITS].sort(
  (a, b) => b.length - a.length,
);

/**
 * 단위가 **수 바로 뒤**나 **「몇」 뒤**에 서고, 조사가 **붙어** 있고, 조사 뒤에 한글이
 * **안 이어지는** 자리. 세 조건이 다 필요하다(위 주석 셋 참조).
 */
const SITE = new RegExp(
  `(?:(?<=[0-9$])|(?<=[0-9$] )|(?<=몇 ))(${UNITS.join("|")})(${PAIRS.flat().join("|")})(?![가-힣])`,
  "g",
);

/** 읽는 소리에 받침이 있나. **모르면 null** — 판정하지 않고 세어서 드러낸다. */
export function batchimOf(unit: string): boolean | null {
  if (/[가-힣]/.test(unit)) {
    const code = unit.trim().slice(-1).charCodeAt(0) - 0xac00;
    return code >= 0 && code <= 11171 ? code % 28 !== 0 : null;
  }
  return unit in LATIN_READING ? LATIN_READING[unit]! : null;
}

export type UnitFault = { unit: string; got: string; want: string };
export type Scan = { measured: number; unknown: string[]; faults: UnitFault[] };

/** 한 지면을 훑는다 — **잰 자리·모름·어긋남을 함께** 낸다. */
export function scanUnitJosa(text: string): Scan {
  const out: Scan = { measured: 0, unknown: [], faults: [] };
  for (const m of text.matchAll(SITE)) {
    const unit = m[1]!;
    const particle = m[2]!;
    const has = batchimOf(unit);
    if (has === null) {
      out.unknown.push(unit);
      continue;
    }
    out.measured += 1;
    const pair = PAIRS.find((p) => p.includes(particle))!;
    const want = has ? pair[0] : pair[1];
    if (particle !== want) out.faults.push({ unit, got: particle, want });
  }
  return out;
}

/* ─────────────────────────── 눈금 ─────────────────────────── */

/**
 * ⚠️ 음성 셋은 **지어낸 것이 아니다** — 이 판정기를 만들며 실제로 틀렸던 자리다.
 * 「원을」 310자리 · 「초과」 268자리 · 「℃이고」 13자리가 다 **거짓 경보**였다.
 * 지우면 그 셋이 그대로 되살아난다.
 */
const GAUGE: [
  why: string,
  text: string,
  wantFaults: number,
  wantMeasured?: number,
][] = [
  ["양성 — 받침 있는 한글 단위에 「를」", "색종이 $278$장를 담습니다", 1],
  ["양성 — 받침 있는 한글 단위에 「가」", "$8$장가 남고", 1],
  ["양성 — 받침 없는 한글 단위에 「이」", "$556$개이 들어 있다면", 1],
  ["양성 — 받침 없는 한글 단위에 「을」", "$14$봉지을 담으면", 1],
  ["양성 — 라틴 단위에 「을」", "세로 눈금 한 칸은 몇 cm을 나타내는가?", 1],
  ["양성 — 「몇 mm을」", "한 칸은 몇 mm을 나타내는가?", 1],
  ["음성 — 옳게 적힌 한글 단위", "색종이 $278$장을 담고 $8$장이 남는다", 0],
  [
    "음성 — 옳게 적힌 라틴 단위",
    "무게가 $4$ kg을 넘고 길이는 몇 cm를 잽니까?",
    0,
  ],
  [
    "음성 — **「원」은 받침이 있다**(ㅇㅝㄴ). 손 표에 적었다가 310자리가 거짓이었다",
    "저금통에 $590000$원이 들어 있고 $60000$원을 냈습니다",
    0,
  ],
  [
    "음성 — **「초과」의 「초」는 단위가 아니다.** 부분 문자열로 268자리가 거짓이었다",
    "무게가 $4$ kg 이하이면 $2000$원, $4$ kg 초과이면 $3000$원입니다",
    0,
  ],
  [
    "음성 — **「이고」는 조사가 아니라 연결어미**다(도이고). 13자리가 거짓이었다",
    "늘어난 양은 $4$, $6$℃이고, 모두 같습니다",
    0,
  ],
  [
    // ⚠️ 이 눈금은 **어긋남이 아니라 «잰 자리»로** 지킨다. 낱말 속에 낀 단위 음절은
    //    거짓 «어긋남»을 못 만들기 때문이다(조사는 마지막 음절로만 갈린다) —
    //    자리 조건을 없애면 어긋남은 그대로 0인데 **잰 자리가 늘어난다.**
    "음성 — 단위가 **수 뒤에 안 서면** 재지도 않는다(낱말 속 우연한 겹침)",
    "그림에서 원과 삼각형을 찾으시오",
    0,
    0,
  ],
];

if (process.argv.includes("--selftest")) {
  let bad = 0;
  for (const [why, text, want, wantMeasured] of GAUGE) {
    const scan = scanUnitJosa(text);
    const got = scan.faults.length;
    const okFaults = got === want;
    // «잰 자리»를 못 박은 눈금은 그것도 본다 — 자리 조건은 이 축으로만 지켜진다.
    const okMeasured =
      wantMeasured === undefined || scan.measured === wantMeasured;
    if (!okFaults || !okMeasured) bad += 1;
    console.log(
      `  ${okFaults && okMeasured ? "✅" : "❌"} ${why} — 어긋남 기대 ${want} / 실제 ${got}` +
        (wantMeasured === undefined
          ? ""
          : ` · 잰 자리 기대 ${wantMeasured} / 실제 ${scan.measured}`),
    );
  }
  // 양성·음성 수는 **세어서** 찍는다 — 손으로 적으면 눈금을 늘릴 때 거짓말이 된다.
  const pos = GAUGE.filter(([, , w]) => w > 0).length;
  console.log(
    bad === 0
      ? `\n✅ 눈금 ${GAUGE.length}건 전부 맞다 (양성 ${pos} · 음성 ${GAUGE.length - pos})`
      : `\n❌ 눈금 ${bad}건 어긋남 — **가드를 믿을 수 없다**`,
  );
  process.exit(bad === 0 ? 0 : 1);
}

/* ─────────────────────────── 쓸기 ─────────────────────────── */

const gradeArg = process.argv.slice(2).find((a) => a.startsWith("초"));
const fence = openFence({ grades: gradeArg ? [gradeArg] : undefined });
const units = elementaryUnits().filter(
  (u) => !gradeArg || u.grade === gradeArg,
);

let measured = 0;
const unknown = new Map<string, number>();
const rows = new Map<string, { n: number; ex: string }>();

for (const u of units) {
  const tiers = supportedTiers(u).length > 0 ? ELEM_TIERS : [];
  for (const tier of [undefined, ...tiers])
    for (const seed of SEEDS) {
      const p = generateElementaryProblem(u, seed, tier);
      for (const text of [p.content, String(p.solution ?? "")]) {
        const s = scanUnitJosa(text);
        measured += s.measured;
        for (const k of s.unknown) unknown.set(k, (unknown.get(k) ?? 0) + 1);
        for (const f of s.faults) {
          const key = `${u.grade} ${u.section} «${tier ?? "표준"}»  「${f.unit}${f.got}」→「${f.unit}${f.want}」`;
          const cur = rows.get(key);
          rows.set(key, {
            n: (cur?.n ?? 0) + 1,
            ex: cur?.ex ?? text.replace(/\n/g, " / ").slice(0, 140),
          });
        }
      }
    }
}
fence.close();

const total = [...rows.values()].reduce((a, b) => a + b.n, 0);
console.log(
  `잰 자리 M ${measured} · 어긋남 N ${total} · 갈래 ${rows.size} · ${fence.scopeLine()}\n`,
);
// **M 이 분모다.** 0 이면 「어긋남 0」은 «깨끗»이 아니라 «못 셈»이다.
if (measured === 0) {
  console.log(
    "⛔ **한 자리도 재지 못했다** — 단위 목록이나 자리 조건이 지면과 어긋났는지 보라.",
  );
  process.exit(2);
}
if (unknown.size > 0) {
  console.log(
    `⚠️ 읽는 소리를 모르는 단위 ${unknown.size}가지 (판정 안 함) — ` +
      [...unknown].map(([u, n]) => `${u}x${n}`).join(" · ") +
      "\n   새 단위가 들어왔다면 LATIN_READING 에 **읽는 소리**를 더할 것.\n",
  );
}
if (total === 0) {
  console.log("✅ 단위 뒤 조사 어긋남 0");
} else {
  console.log(`❌ 단위 뒤 조사 어긋남 ${total}자리 / ${rows.size}갈래`);
  for (const [k, v] of [...rows].sort((a, b) => b[1].n - a[1].n))
    console.log(`  · ${k} — ${v.n}자리\n      ${v.ex}`);
}
process.exitCode = total === 0 ? 0 : 1;

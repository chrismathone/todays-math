# -*- coding: utf-8 -*-
"""초등 난이도 갈래(D-71) 변이 시험 — 「이 시험이 정말 무는가」를 확인한다.

    python scripts/qa/mutate-elem-tiers.py g3
    python scripts/qa/mutate-elem-tiers.py g5
    python scripts/qa/mutate-elem-tiers.py g6

**판정 순서가 이 도구의 알맹이다** (CLAUDE.md 2026-08-20·08-21):

  ⑴ 파일이 바뀌었나      — 안 바뀌면 치환이 실패한 것이다(따옴표·역슬래시가 흔한 범인)
  ⑵ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 거짓말이 된다
  ⑶ 그제서야 시험이 빨개지나

⑵ 를 건너뛰면 **멀쩡한 가드를 의심하고 고치러 간다** — 가드가 없는 것보다 나쁘다.
빨강일 때는 «어떤 검사가» 떨어졌는지도 찍는다. 엉뚱한 검사가 대신 걸린 것을
「잡았다」로 읽지 않기 위해서다.

변이 목록은 **소스의 실제 문자열**이라 코드가 바뀌면 「자리를 못 찾았다」로 시끄럽게
깨진다 — 조용히 통과하는 것보다 낫다. 그때는 목록을 지금 소스에 맞춰 고친다.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import subprocess
import sys

# ⚠️ `line_buffering` 을 켠다. 파이썬은 출력이 **파일·파이프로 갈 때 버퍼링**해서,
#    회차가 도중에 죽으면 **이미 끝난 판정까지 통째로 사라진다** — 2026-08-23 에
#    9분 30초를 돌고 죽었더니 남은 파일이 **0바이트**였다. 한 변이는 40~60초라
#    긴 회차를 나눠 도는 판에서는 「어디까지 갔나」가 곧 재개 지점이다.
sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# ⚠️ **경로에 PID 를 넣는다.** 예전에는 고정 이름이라, 두 학년 하네스가 동시에 돌면
# 한쪽이 `finally` 에서 지운 파일을 다른 쪽 `npx tsx` 가 열지 못해 산출물이 비었다.
# 그러면 판정이 «산출물을 못 얻었다»로 떨어진다 — 2026-08-23 실측: 초6 31종 중
# **13종이 한 칸 걸러 하나씩** 그렇게 찍혔고(무작위가 아니라 «번갈아»가 단서였다),
# 원인을 컴파일 깨짐으로 읽으면 멀쩡한 변이를 의심하게 된다.
PROBE_PATH = os.path.join(
    ROOT, "scripts", "qa", f".mutate-elem-tiers.probe.{os.getpid()}.ts"
)

# 산출물에 figureSpec 까지 넣는다 — 「그림을 뗀다」류 변이는 본문·정답·해설이 그대로라
# 그림을 안 찍으면 ⑵ 에서 «산출물이 그대로다»로 오판된다(멀쩡한 변이를 판정 거부).
PROBE_TS = """
import { elementaryUnits, generateElementaryProblem } from "../../src/lib/elementary/generate";
import { ELEM_TIERS } from "../../src/lib/elementary/difficulty";

const sections: string[] = __SECTIONS__;
const out: string[] = [];
for (const sec of sections) {
  const unit = elementaryUnits().find(
    (u) => u.grade === "__GRADE__" && u.section.startsWith(sec),
  )!;
  // ⚠️ **표준(`undefined`)까지 찍는다.** 갈래만 찍으면 「표준 발문을 고치는 변이」가
  // ⑵ 에서 «산출물이 그대로다»로 판정 거부된다 — 표준 결함은 구조적으로 안 보인다.
  // 초3 조사 수리(1-3-3 표준)를 등록하며 실제로 걸렸다(2026-08-23 elem-g3).
  for (const tier of [undefined, ...ELEM_TIERS]) {
    // ⚠️ 씨앗은 **일부러 고른 것**이다. 표본이 어떤 자리를 안 밟으면 그 자리를 건드리는
    // 변이는 산출물을 안 바꿔 **판정할 수 없다**(⑵ 거부). 4·79 는 초3 2-2-3 에서
    // 「나쁜 나머지가 뽑는 범위의 **끝**」인 자리를 밟는다 — 그것 없이는 「나쁜 r 탐색
    // 범위를 하나 줄임」 변이가 영영 판정되지 않는다(2026-08-23 실측).
    //
    // 23 은 초6 2-4 가 넣었다. 앞 여덟 씨앗은 2-4-5 심화의 **차 가지에서 뒤 이름이 더
    // 많은 경우**(a<b)와 2-4-3 응용의 **오답 비율이 약분되는 경우**를 하나도 안 밟아
    // 그 두 변이가 «산출물이 그대로다»로 판정 거부됐다. 23 은 **둘 다** 밟는다.
    //
    // 68 은 초6 2-2-4 「낱말 거짓말」 변이 몫이다. 그 자리는 **800 씨앗 중 4개**(0.5%)
    // 뿐이라 아홉 씨앗으로는 구조적으로 안 밟힌다 — 변이를 손으로 적용해 산출물이
    // 달라지는 씨앗을 찾아 넣었다(68·515·534·737 중 첫째). 그 자리가 바로 리드 반려의
    // 「긴 막대 $12$ cm, 짧은 막대 $13$ cm」다.
    for (const seed of [20260821, 7, 1234, 1, 2, 3, 4, 79, 23, 68]) {
      try {
        const p = generateElementaryProblem(unit, seed, tier);
        out.push(
          `${sec}|${tier}|${seed}|${p.content}|${p.answer}|${p.solution}|${JSON.stringify(p.figureSpec ?? null)}`,
        );
      } catch (err) {
        out.push(`${sec}|${tier}|${seed}|THROW ${String(err)}`);
      }
    }
  }
}
console.log(JSON.stringify(out));
"""

# ── 변이 목록 ──────────────────────────────────────────────────────────
# (이름, 찾을 문자열, 바꿀 문자열). 찾을 문자열은 **소스 그대로**여야 한다.
G3_MUTS = [
    (
        "조건 훼손 — 기본 갈래의 받아올림 하한을 푼다",
        "function add3Word(unit: UnitSeed, rng: Rng): ElemProblem {\n  const [a, b] = addWithCarries(rng, 2, 3);",
        "function add3Word(unit: UnitSeed, rng: Rng): ElemProblem {\n  const [a, b] = addWithCarries(rng, 0, 3);",
    ),
    (
        "검산 훼손 — 기본 갈래 정답을 하나 올린다",
        "    n(a + b),\n    `${p.left} 수와 ${p.right} 수를 더합니다.",
        "    n(a + b + 1),\n    `${p.left} 수와 ${p.right} 수를 더합니다.",
    ),
    (
        "응용 둘째 단계 훼손 — 중간값을 안 더한다",
        "  const total = base + second;",
        "  const total = base + more;",
    ),
    # ⚠️ `n(r.rightSum),` 만으로는 g3.ts 에 **2곳**이다(1-1-2 add3Reverse · reverseAddLight 쪽).
    # 예전 하네스는 첫 자리를 바꿔 우연히 맞았다 — count==1 단정을 넣으며 문맥으로 못 박는다.
    (
        "심화 역산 훼손 — 어떤 수를 답으로 낸다",
        "  const r = reverseAdd(rng);\n  return make(\n    unit,\n    `어떤 수에 $${r.right}$ 만큼 더해야 할 것을 잘못하여 $${r.wrong}$ 만큼 더했더니 합이 $${r.wrongSum}$ 입니다. 바르게 계산한 값은 얼마입니까?`,\n    n(r.rightSum),",
        "  const r = reverseAdd(rng);\n  return make(\n    unit,\n    `어떤 수에 $${r.right}$ 만큼 더해야 할 것을 잘못하여 $${r.wrong}$ 만큼 더했더니 합이 $${r.wrongSum}$ 입니다. 바르게 계산한 값은 얼마입니까?`,\n    n(r.some),",
    ),
    (
        "소재 고정 — 기본 갈래가 늘 첫 소재",
        "  const p = pick(rng, ADD_PAIRS);",
        "  const p = ADD_PAIRS[0]!;\n  void rng;",
    ),
    (
        "갈래 뭉개기 — 심화를 연산으로",
        "    심화: add3Reverse,",
        "    심화: add3Calc,",
    ),
    # ── 초3 2-1 곱셈 · 2-2 나눗셈 확대(elem-g3, 2026-08-23) ──
    # 이름 약속 잠금과 표준 수리를 지키는 변이다. 표준을 고치는 변이가 섞여 있어
    # 산출물 probe 가 **표준까지** 찍어야 판정된다(위 PROBE_TS 주석).
    (
        "[2-1] 표준 2-1-3: 20·30·40 건너뛰기 삭제",
        "    for (const cut of [20, 30, 40]) if (b >= cut) b += 1;",
        "    for (const cut of [20, 30, 40]) if (false && b >= cut) b += 1;",
    ),
    (
        "[2-1] 표준 2-1-3: 건너뛰기 위끝 45→48 (뽑는 범위가 새 밖으로)",
        "let b = intBetween(rng, 12, 45);",
        "let b = intBetween(rng, 12, 48);",
    ),
    (
        "[2-1] 2-1-1·2 올림 갈림 뒤집기 (1)↔(2)",
        'return section.includes("(2)") ? [2, 3] : [0, 1];',
        'return section.includes("(2)") ? [0, 1] : [2, 3];',
    ),
    (
        "[2-1] 2-1-1·2 응용: 곱한 뒤 더할 것을 곱만",
        "      n(p + c),\n      `먼저 곱합니다.",
        "      n(p),\n      `먼저 곱합니다.",
    ),
    (
        "[2-1] 2-1-1·2 심화 ㉢: 두 번째 곱하는 수가 올림 약속을 어겨도 통과",
        "    (v) => v !== b && mulCarries3x1(a, v) >= lo && mulCarries3x1(a, v) <= hi,",
        "    (v) => v !== b,",
    ),
    (
        "[2-1] 2-1-1·2 심화 ㉡: 가린 자리를 한 자리 옆으로",
        "    const hidden = Math.floor(a / 10 ** pos) % 10;",
        "    const hidden = Math.floor(a / 10 ** ((pos + 1) % 3)) % 10;",
    ),
    (
        "[2-1] 2-1-3 갈래: (몇)×(몇십몇) 꼴을 (몇)×(몇십) 으로",
        "  return [intBetween(rng, 2, 9), tensOnes21(rng)];",
        "  return [intBetween(rng, 2, 9), intBetween(rng, 2, 9) * 10];",
    ),
    (
        "[2-1] 2-1-3 응용: 덜어낸 뒤 답이 곱 그대로",
        "    n(p - c),\n    `묶음의 수를 먼저 곱합니다.",
        "    n(p),\n    `묶음의 수를 먼저 곱합니다.",
    ),
    (
        "[2-1] 2-1-3 심화 ㉡: 되짚은 몇십에 10 더하기",
        "      n(t1),\n      `몇십끼리의 곱은",
        "      n(t1 + 10),\n      `몇십끼리의 곱은",
    ),
    (
        "[2-1] 2-1-4: «몇십몇» 의 일의 자리에 0 을 허용",
        "  return intBetween(rng, 1, 9) * 10 + intBetween(rng, 1, 9);",
        "  return intBetween(rng, 1, 9) * 10 + intBetween(rng, 0, 9);",
    ),
    (
        "[2-1] 2-1-4 심화: 카드 네 장 중복 허용(동률 방지 건너뛰기 무력화)",
        "  const cards = distinctIdx(rng, 9, 4).map((i) => i + 1);",
        "  const cards = [0, 1, 2, 3].map(() => intBetween(rng, 1, 9));",
    ),
    (
        "[2-1] 2-1-4 심화: 가장 큰·작은 판정 뒤집기",
        "          if (askBig ? v1 * v2 > bestP : v1 * v2 < bestP) {",
        "          if (askBig ? v1 * v2 < bestP : v1 * v2 > bestP) {",
    ),
    (
        "[2-2] 표준 2-2-3: 건너뛰기 삭제 (몇십이 되살아난다)",
        "    if (r >= bad) r += 1;",
        "    if (false && r >= bad) r += 1;",
    ),
    (
        "[2-2] 표준 2-2-3: 나쁜 r 탐색 범위를 하나 줄임",
        "for (let v = 1; v <= b - 1; v += 1) if ((b * q + v) % 10 === 0) bad = v;",
        "for (let v = 1; v <= b - 2; v += 1) if ((b * q + v) % 10 === 0) bad = v;",
    ),
    (
        "[2-2] 2-2-1·2 내림 갈림 뒤집기",
        'return section.includes("내림이 있는");',
        'return !section.includes("내림이 있는");',
    ),
    (
        "[2-2] 2-2-1·2 응용: 덜어내기를 안 한다",
        "    n(q - c),\n    `한 몫을 먼저 구합니다. ${expr(`${a}\\\\div${b}=${q}`)} 입니다. ${expr(`${q}-${c}=${q - c}`)} 이므로 답은",
        "    n(q),\n    `한 몫을 먼저 구합니다. ${expr(`${a}\\\\div${b}=${q}`)} 입니다. ${expr(`${q}-${c}=${q - c}`)} 이므로 답은",
    ),
    (
        "[2-2] 2-2-1·2 응용: 「그중 몇 묶음」을 곱하지 않는다",
        "      n(q * c),\n      `한 몫을 먼저 구합니다.",
        "      n(q + c),\n      `한 몫을 먼저 구합니다.",
    ),
    (
        "[2-2] 2-2-1·2 심화 ㉠: 되짚은 나뉘는 수를 어긋나게",
        "      n(a),\n      `나누어지는 수는 곱으로 되짚습니다. ${expr(`${b}\\\\times${q}=${a}`)} 이므로 ${sq} 에 알맞은 수는 ${n(a)} 입니다.`,\n    );\n  }\n  const wrong = a * b;",
        "      n(a + b),\n      `나누어지는 수는 곱으로 되짚습니다. ${expr(`${b}\\\\times${q}=${a}`)} 이므로 ${sq} 에 알맞은 수는 ${n(a)} 입니다.`,\n    );\n  }\n  const wrong = a * b;",
    ),
    (
        "[2-2] 2-2-3: 나머지가 나누는 수까지 커질 수 있게",
        "    r = intBetween(rng, 1, b - 1);",
        "    r = intBetween(rng, 1, b);",
    ),
    (
        "[2-2] 2-2-3 기본: 「남는 것」에 몫을 답한다",
        "      n(r),\n      `${expr(`${b}\\\\times${q}=${b * q}`)}",
        "      n(q),\n      `${expr(`${b}\\\\times${q}=${b * q}`)}",
    ),
    (
        "[2-2] 2-2-3 응용: 「적어도」에 한 묶음을 안 더한다",
        "      n(q + 1),",
        "      n(q),",
    ),
    (
        "[2-2] 2-2-3 심화 ㉡: 채우는 수를 나머지로",
        "    n(b - r),\n    `${expr(`${b}\\\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다. 나누는 수가 ${n(b)} 이므로",
        "    n(r),\n    `${expr(`${b}\\\\times${q}=${b * q}`)} 이고 ${expr(`${a}-${b * q}=${r}`)} 이므로 몫은 ${n(q)}, 나머지는 ${n(r)} 입니다. 나누는 수가 ${n(b)} 이므로",
    ),
    (
        "[2-2] 2-2-4: 나뉘는 수 아래끝을 b 에서 유도하지 않음 (두 자리가 샌다)",
        "function div3Exact(rng: Rng): [number, number, number] {\n  const b = intBetween(rng, 3, 9);\n  const q = intBetween(rng, Math.ceil(100 / b), 48);",
        "function div3Exact(rng: Rng): [number, number, number] {\n  const b = intBetween(rng, 3, 9);\n  const q = intBetween(rng, 12, 48);",
    ),
    (
        "[2-2] 2-2-4 심화 ㉡: 일의 자리까지 가린다 (답이 하나가 아니다)",
        "  const pos = intBetween(rng, 1, 2);",
        "  const pos = intBetween(rng, 0, 2);",
    ),
    (
        "[2-2] 2-2-4 응용: 더 받은 것을 안 더한다",
        "      n(q + c),\n      `한 몫을 먼저 구합니다.",
        "      n(q),\n      `한 몫을 먼저 구합니다.",
    ),
    (
        "[조사] 1-3-3 표준 조사 수리 되돌리기 — «$…=18$ 에서» 를 «를» 로",
        "$ 에서 $${a}\\\\div${b}$ 의 몫을 구하시오.`,",
        "$ 를 이용하여 $${a}\\\\div${b}$ 의 몫을 구하시오.`,",
    ),
    (
        '[2-4] 2-4-5 표준: 나머지 있는 나눗셈을 다시 등식으로 (거짓 등식 되살리기)',
        '${expr(`${den}\\\\times${whole}=${den * whole}`)} 이고 ${expr(`${num}-${den * whole}=${rest}`)} 이므로 ${expr(`${num}\\\\div${den}`)} 의 몫은 ${n(whole)}, 나머지는 ${n(rest)} 입니다. 대분수로 나타내면 ${expr(fracLatex(num, den))} 입니다.',
        '$${num}\\\\div${den}=${whole}$ 이고 나머지가 ${n(rest)} 이므로 대분수로 나타내면 ${expr(fracLatex(num, den))} 입니다.',
    ),
    (
        '[2-4] 2-4-1 심화: 되짚은 전체를 한 묶음 적게',
        '  const whole = each * groups;\n  const stem = pick(rng, [\n    // ⚠️ 소재 낱말 뒤 조사는',
        '  const whole = each * (groups - 1);\n  const stem = pick(rng, [\n    // ⚠️ 소재 낱말 뒤 조사는',
    ),
    (
        '[2-4] 2-4-1 표준: 답 분수를 기약으로 거른다 (초3 은 약분을 안 배운다)',
        '    const take = intBetween(rng, 1, groups - 1);\n    return make(\n      unit,\n      `${stuff} ${n(whole)}개를 똑같이',
        '    const take = pick(rng, coprimeNums(groups, 1));\n    return make(\n      unit,\n      `${stuff} ${n(whole)}개를 똑같이',
    ),
    (
        '[2-4] 2-4-2 가 단위분수를 안 지킨다 ((1)/(2) 갈림 무력화)',
        '  return unitOnly ? 1 : pick(rng, coprimeNums(den, 2));',
        '  return pick(rng, coprimeNums(den, unitOnly ? 1 : 2));',
    ),
    (
        '[2-4] 2-4-2·3 응용: 덜어낸 나머지를 하나 더',
        '    const left = whole - used;',
        '    const left = whole - used + 1;',
    ),
    (
        '[2-4] 2-4-3 발문 분수의 기약 거름을 뺀다 (약분되는 분수가 발문에 선다)',
        'function coprimeNums(den: number, from: number): number[] {\n  return Array.from({ length: den - from }, (_, i) => i + from).filter(\n    (v) => gcd(v, den) === 1,\n  );',
        'function coprimeNums(den: number, from: number): number[] {\n  return Array.from({ length: den - from }, (_, i) => i + from).filter(\n    (v) => v > 0,\n  );',
    ),
    (
        '[2-4] 2-4-4 연산: 가분수 판정을 «분모보다 큰» 으로 (같은 것을 뺀다)',
        '  const ans = shown.filter((v) => v >= den);',
        '  const ans = shown.filter((v) => v > den);',
    ),
    (
        '[2-4] 2-4-4 심화: 개수를 하나 더',
        '    n(span),\n    `분모가 같으므로 분자만 견주면 됩니다.',
        '    n(span + 1),\n    `분모가 같으므로 분자만 견주면 됩니다.',
    ),
    (
        '[2-4] 2-4-4 기본: 기준 분수의 분자가 답과 같아질 수 있게 (묻는 것이 사라진다)',
        '  const avoid = improper ? 0 : num;',
        '  const avoid = 0;',
    ),
    (
        '[2-4] 2-4-5 심화: 가린 자리를 맞바꾼다',
        '  const hidden = spot === 0 ? whole : rest;',
        '  const hidden = spot === 0 ? rest : whole;',
    ),
    (
        '[2-4] 2-4-5 응용: 자연수 부분 비교를 뒤집는다',
        '  const bigger = wA > wB ? numA : numB;',
        '  const bigger = wA < wB ? numA : numB;',
    ),
    (
        '[2-4] 2-4-6 연산: 「가장 작은」을 묻고 가장 큰 것을 답한다',
        '  const small = Math.min(...three);',
        '  const small = Math.max(...three);',
    ),
    (
        '[2-4] 2-4-6 심화: 사이의 가장 큰 분자를 한 칸 아래로',
        '  const ans = hi - 1;',
        '  const ans = hi - 2;',
    ),
    (
        '[2-4] 2-4-6 기본: 가장 많이 먹은 사람 대신 가장 적게 먹은 사람',
        '  const top = three.indexOf(Math.max(...three));',
        '  const top = three.indexOf(Math.min(...three));',
    ),
]

# 초5 — 1-1 혼합 계산(3ee85b47) 셋 + 1-6 확대(8ed2da00) 하나. 1-6-3 변이는 그 트랜치에서
# 손으로 재현하던 것을 하네스로 승격한 것이다(같은 자리 ×10000→×1000).
# ⚠️ `n(k * 10000),` 은 표준 1-6-3 판과 갈래 판 **두 곳**이라 발문 줄까지 문맥으로 못 박는다.
G5_MUTS = [
    (
        "심화 검산 훼손 — 1-1-1 잘못계산의 바른 값에서 b 하나를 뺀다",
        "n(c + 2 * b),",
        "n(c + b),",
    ),
    (
        "연산 검산 훼손 — 1-1-3 ㉮ 정답이 나눗셈을 안 접는다(q 대신 d)",
        "n(a * b + c - q),",
        "n(a * b + c - d),",
    ),
    (
        "갈래 뭉개기 — 1-1-1 심화를 연산으로",
        "    심화: mix111Deep,",
        "    심화: mix111Calc,",
    ),
    (
        "단위 환산 훼손 — 1-6-3 연산 갈래가 m²→cm² 를 ×1000 으로",
        r"""`${expr(`${k}\\,\\mathrm{m}^2`)}는 몇 ${expr("\\mathrm{cm}^2")}입니까?`,
      n(k * 10000),""",
        r"""`${expr(`${k}\\,\\mathrm{m}^2`)}는 몇 ${expr("\\mathrm{cm}^2")}입니까?`,
      n(k * 1000),""",
    ),
    # ── 3차분 (1-2 약수와 배수) ──
    (
        "구성 훼손 — 1-2-4 심화 둘째 수의 나머지가 발문과 어긋난다",
        "    const b = g * q + r2;",
        "    const b = g * q + r1;",
    ),
    (
        "경계 훼손 — 1-2-6 심화 나머지가 나누는 수보다 커질 수 있다 (리드 경계 지시)",
        "    const r = intBetween(rng, 1, Math.min(a, b) - 1);",
        "    const r = intBetween(rng, 1, Math.min(a, b) + 1);",
    ),
    (
        "낱말 축 훼손 — 1-2-5 연산이 공배수를 공약수라 말한다 (D-66 ⑸)",
        """      `${nj(a, "과", "와")} ${n(b)}의 공배수 중에서 가장 작은 수를 구하시오.`,""",
        """      `${nj(a, "과", "와")} ${n(b)}의 공약수 중에서 가장 작은 수를 구하시오.`,""",
    ),
    # ── 4차분 (1-3 대응 관계) ──
    (
        "자르기 +1 방향 훼손 — 1-3-3 심화 도막이 횟수+2 가 된다 (off-by-one)",
        "  const m = intBetween(rng, 12, 30);\n  const v = m + 1;",
        "  const m = intBetween(rng, 12, 30);\n  const v = m + 2;",
    ),
    (
        # ⚠️ 옛 correspond(표준 1-3-2)에 같은 리터럴이 있어 낱값 앵커는 count=2 다 —
        # relMulLatex «정의부»로 좁혀야 한다.
        "정본 꼴 훼손 — 대응식이 «△=k×□» 로 뒤집힌다 (기호 규약)",
        r"string => `\\triangle=\\square\\times${k}`",
        r"string => `\\triangle=${k}\\times\\square`",
    ),
    (
        "갈래 뭉개기 — 1-3-1 심화를 응용으로",
        "    응용: corr131Apply,\n    심화: corr131Deep,",
        "    응용: corr131Apply,\n    심화: corr131Apply,",
    ),
    (
        # «>= 3 → >= 2» 완화판은 프로브 6씨앗이 그 경계를 안 건드려 ⑵ 판정 거부가 났다
        # (2026-08-23 실측 — 확률적 가드는 낱값 완화가 아니라 통째 제거로 문다).
        "㉡ 누출 가드 제거 — 1-3-2 심화 ㉡ 자리를 무조건 둘째 칸에 둔다",
        "  const p2cands = [1, 2, 3].filter(\n    (i) => i === 3 || xs[i + 1]! - xs[i - 1]! >= 3,\n  );\n  const p2 = pick(rng, p2cands);",
        "  const p2 = 1;",
    ),
    (
        "차 관계 정의역 훼손 — 1-3-2 기본 □ 가 상수보다 작을 수 있다",
        "  const from = intBetween(rng, 10, 15);",
        "  const from = intBetween(rng, 1, 15);",
    ),
    # ── 5차분 (1-4 약분과 통분) ──
    (
        "비교 방향 훼손 — 1-4-4 기본이 큰 쪽을 «작다»고 답한다 (⑶)",
        "const leftSmall = a * dens[1]! < b * dens[0]!;",
        "const leftSmall = a * dens[1]! > b * dens[0]!;",
    ),
    (
        "방식 약속 훼손 — 1-4-3 기본이 최소공배수라 말하고 곱으로 통분한다 (⑵)",
        "  const L = lcm(d1, d2);\n  return make(",
        "  const L = d1 * d2;\n  return make(",
    ),
    (
        "기약 구성 훼손 — 1-4-2 응용의 목표 분수가 기약이 아니게 된다 (⑴)",
        "  const [sn, sd] = properFrac(rng, [3, 4, 5, 6, 7, 8]);\n  const g = pick(",
        "  const [sn, sd] = [2, 6] as [number, number];\n  const g = pick(",
    ),
    (
        "범위 구성 훼손 — 1-4-5 심화 경계 사이가 비어 답이 0 이 될 수 있다",
        "Math.ceil(20 / den)",
        "Math.ceil(10 / den)",
    ),
    (
        "유일성 훼손 — 1-4-1 심화 범위에 분모 후보가 둘 들어온다",
        "  const hi = lo + sd;",
        "  const hi = lo + sd + sd;",
    ),
    # ── 6차분 (1-5 분수의 덧셈과 뺄셈) ──
    (
        "음수 구성 훼손 — 1-5-4 연산 빼는 대분수의 자연수부가 더 클 수 있다 (⑶)",
        "  const w2 = intBetween(rng, 1, w1 - 2);\n  const L = lcm(d1, d2);\n  const [num, den] = subFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);",
        "  const w2 = intBetween(rng, 1, w1 + 2);\n  const L = lcm(d1, d2);\n  const [num, den] = subFrac(w1 * d1 + a, d1, w2 * d2 + b, d2);",
    ),
    (
        "음수 구성 훼손 — 1-5-3 진분수 뺄셈이 큰 쪽·작은 쪽을 뒤바꾼다 (⑶)",
        "  return a * d2 > b * d1\n    ? { big: [a, d1], small: [b, d2] }\n    : { big: [b, d2], small: [a, d1] };",
        "  return a * d2 > b * d1\n    ? { big: [b, d2], small: [a, d1] }\n    : { big: [a, d1], small: [b, d2] };",
    ),
    (
        "받아내림 훼손 — 1-5-4 응용이 자연수부를 빼먹어 진분수를 뺀다",
        "  const [num, den] = subFrac(whole, 1, w2 * d2 + b, d2);",
        "  const [num, den] = subFrac(whole, 1, b, d2);",
    ),
    (
        "검산 훼손 — 1-5-1 응용이 셋째 분수를 안 더한다",
        "  const [num, den] = addFrac(s1, sd1, n3, d3);",
        "  const [num, den] = addFrac(s1, sd1, 0, 1);",
    ),
    (
        # 이 변이는 씨앗 16개 시험이 아니라 **씨앗 0~999 전수 throw 쓸기**가 문다
        # (리드 지시로 넣은 그 검사 — 손 목록이면 2×넓이=98 에서 후보가 빈다).
        "손 목록 회귀 — 1-6-4 심화 밑변 후보를 고정 목록으로 되돌린다",
        "  const tbCands = divisors(2 * area).filter(\n    (v) => v >= 4 && v <= 20 && (2 * area) / v <= 30,\n  );",
        "  const tbCands = [4, 5, 6, 8, 10, 12, 15, 16, 20].filter(\n    (v) => (2 * area) % v === 0,\n  );",
    ),
    (
        "소재-동사 짝 훼손 — 1-5-3 응용이 색종이를 «먹는다» (g4 회송 결함)",
        "\"색종이\", \"한 장\", \"쓰고\", \"썼습니다\", \"쓴\"",
        "\"색종이\", \"한 장\", \"먹고\", \"먹었습니다\", \"먹은\"",
    ),
    # ── 7차분 (2-1 수의 범위와 어림하기) ──
    (
        "뜻 없는 어림 — 어림할 수의 아래 자리가 0 이 될 수 있다 (㉡ 구성 보장)",
        "  const below = intBetween(rng, 1, place - 1); // 1 이상 — 절대 0이 아니다",
        "  const below = intBetween(rng, 0, place - 1); // 1 이상 — 절대 0이 아니다",
    ),
    (
        # 양방향 검사(«바깥값도 그 어림값이 되는가»)가 무는 자리다 — 안쪽만 보면
        # 넓게 틀려도 조용하다(2026-08-23 리드 지적).
        "역산 범위 훼손 — 올림 역산의 아래끝을 한 칸 넓힌다",
        "    nums([up - place + 1, up]),",
        "    nums([up - place, up]),",
    ),
    (
        "역산 범위 훼손 — 반올림 역산의 위끝을 한 칸 넓힌다",
        "  const hi = r + place / 2 - 1;",
        "  const hi = r + place / 2;",
    ),
    (
        "조건 조합 무력화 — 2-1-5 심화의 두 어림이 같은 값을 가리켜 한쪽이 논다",
        "  const u = d + place;",
        "  const u = d;",
    ),
    (
        # 경계값이 없으면 «이상»과 «초과»가 **같은 답**을 낸다 — 낱말을 바꿔치기해도
        # 안 걸리는 자리이므로 이 변이가 그 사각지대를 지킨다.
        "경계값 누락 — 2-1-3 장면의 값 넷에서 경계값 자신을 뺀다",
        "    limit, // 경계값 자신 — 이 하나가 두 낱말의 답을 가른다",
        "    limit + 1, // 경계값 자신 — 이 하나가 두 낱말의 답을 가른다",
    ),
    (
        "경계 방향 훼손 — 2-1-3 기본의 «초과» 가 경계값을 포함한다",
        "  const ok = s.values.filter((v) => v > s.limit);",
        "  const ok = s.values.filter((v) => v >= s.limit);",
    ),
    (
        # 이름과 무는 자리가 어긋나면 다음 사람이 속는다 — 위 «2-1-3» 것과 달리
        # 이 변이는 2-1-1·2-1-2 의 후보 목록(boundaryPool)을 문다.
        "경계값 누락 — 2-1-1·2-1-2 후보에서 아래 경계를 한 칸 밀어낸다",
        "  return shuffled(rng, [a, b, inner, below, above]);",
        "  return shuffled(rng, [a + 1, b, inner, below, above]);",
    ),
    # ── 8차분 (2-1 검수 반려 수리) ──
    (
        # «$1.0$» 이라 쓸 수 없으니(꼬리 0 금지) 뽑는 데서 막아야 한다.
        "자리 사라짐 — 2-1-6 기본이 소수 첫째 자리 0 을 뽑아 답이 정수가 된다 (반려 ①)",
        "  const tenth = hundredth >= 5 ? intBetween(rng, 0, 8) : intBetween(rng, 1, 9);",
        "  const tenth = intBetween(rng, 0, 9);",
    ),
    (
        "견줌 무력화 — 2-1-6 응용의 두 어림이 같은 값을 가리켜 차가 0 이 된다 (반려 ②)",
        "  const tens = intBetween(rng, 0, 8);\n  const ones = tens === 0 ? intBetween(rng, 5, 9) : intBetween(rng, 1, 9);\n  const below = tens * 10 + ones;",
        "  const below = intBetween(rng, 1, 99);",
    ),
    (
        # 「상수답이 아니다」는 이것을 **통과시킨다** — 가짓수를 세는 시험만 문다.
        "답의 폭 좁힘 — 2-1-3 후보 수를 넷으로 고정해 답이 2종뿐이 된다 (반려 ③)",
        "  const total = intBetween(rng, 4, 6);",
        "  const total = 4;",
    ),
    (
        "정의역 훼손 — 2-1-3 아래 값이 0·음수가 될 수 있다 (나이·무게)",
        "  for (let v = Math.max(1, limit - 12); v < limit; v += 1) lowPool.push(v);",
        "  for (let v = limit - 12; v < limit; v += 1) lowPool.push(v);",
    ),
    # ── 9차분 (2-2 분수의 곱셈) ──
    (
        # 값은 같고 답도 같다 — **차례만** 틀린다. 검산 가드는 통째로 조용하다.
        "차례 훼손 — 2-2-1 이 (자연수)×(분수) 로 쓴다 (이름의 약속 ②)",
        "`계산하시오.  ${expr(`\\\\frac{${a}}{${d}}\\\\times${k}`)}`,",
        "`계산하시오.  ${expr(`${k}\\\\times\\\\frac{${a}}{${d}}`)}`,",
    ),
    (
        "차례 훼손 — 2-2-2 가 (분수)×(자연수) 로 쓴다 (이름의 약속 ②)",
        "`계산하시오.  ${expr(`${k}\\\\times\\\\frac{${a}}{${d}}`)}`,",
        "`계산하시오.  ${expr(`\\\\frac{${a}}{${d}}\\\\times${k}`)}`,",
    ),
    (
        "약분이 사라짐 — 2-2 의 자연수가 분모와 서로소만 되어 해설의 «약분»이 빈 말이 된다 (①)",
        "  const k = pick(rng, divs) * intBetween(rng, 1, 2); // d 와 공약수를 반드시 가진다",
        "  const k = intBetween(rng, 2, 8); // d 와 공약수를 반드시 가진다",
    ),
    (
        "오개념 훼손 — 2-2-4 심화의 «잘못 계산한 값» 이 자연수부 곱이 아니다 (③)",
        "    expr(fracLatex(dn, dd)),",
        "    expr(fracLatex(rn, rd)),",
    ),
    # ── 10차분 (2-4 소수의 곱셈) ──
    (
        # 값도 답도 같다 — **차례만** 틀린다. 검산 가드는 통째로 조용하다.
        "차례 훼손 — 2-4-1 이 (자연수)×(1보다 작은 소수) 로 쓴다 (이름의 약속)",
        "`계산하시오.  ${expr(`${dec(t, 1)}\\\\times${k}`)}`,",
        "`계산하시오.  ${expr(`${k}\\\\times${dec(t, 1)}`)}`,",
    ),
    (
        "크기 훼손 — 2-4-1 이 1보다 큰 소수를 쓴다 (소단원 이름)",
        "  const t = underOneT(rng, (x) => (x * k) % 10 !== 0);\n  return make(\n    unit,\n    `계산하시오.  ${expr(`${dec(t, 1)}\\\\times${k}`)}`,",
        "  const t = overOneT(rng, (x) => (x * k) % 10 !== 0);\n  return make(\n    unit,\n    `계산하시오.  ${expr(`${dec(t, 1)}\\\\times${k}`)}`,",
    ),
    (
        # `dec()` 가 꼬리 0 을 접으므로 지면에 「$0.20$」은 안 나온다 — 그 대신
        # **자리가 사라져** 이 소단원이 가르치려는 것이 안 보인다. 값 검산은 조용하다.
        "자리 접힘 — 2-4-5 연산의 곱이 10의 배수가 되어 두 자리가 한 자리로 접힌다",
        "  const b = underOneT(rng, (x) => (a * x) % 10 !== 0);\n  return make(\n    unit,\n    `계산하시오.",
        "  const b = underOneT(rng);\n  return make(\n    unit,\n    `계산하시오.",
    ),
    (
        "자리 접힘 — 2-4-2 응용의 합이 10의 배수가 될 수 있다",
        "  const { b, k2 } = sumPairOverOne(rng, a, k1);\n  const total = a * k1 + b * k2;",
        "  const b = overOneT(rng, (x) => x !== a);\n  const k2 = intBetween(rng, 2, 9);\n  const total = a * k1 + b * k2;",
    ),
    (
        "제자리로 돌아옴 — 2-4-7 응용이 오른쪽 2칸·왼쪽 2칸이 되어 두 단계가 뜻을 잃는다",
        "  const downSteps = pick(\n    rng,\n    [1, 2].filter((d) => d !== upSteps),\n  );",
        "  const downSteps = pick(rng, [1, 2]);",
    ),
    (
        # 소단원 이름이 약속한 것이 지면에 없으면 판정기도 시험도 그 조건을 못 본다.
        "조건 사라짐 — 2-4-3 심화가 소수를 □ 로 가려 「1보다 작은 소수」가 지면에서 사라진다",
        "`□ 안에 알맞은 자연수를 구하시오.  ${expr(`\\\\square\\\\times${dec(t, 1)}=${dec(k * t, 1)}`)}`,",
        "`□ 안에 알맞은 소수를 구하시오.  ${expr(`${k}\\\\times\\\\square=${dec(k * t, 1)}`)}`,",
    ),
    # ── 11차분 (2-6 평균과 가능성) ──
    (
        # 인원이 같으면 «평균을 더해 2로 나누기»가 **정답과 같아진다** — 값 검산은 그때도 초록이다.
        "평균의 평균 — 2-6-1 심화의 두 모둠 인원이 같아져 오개념을 안 가른다",
        "  const n2 = pick(\n    rng,\n    [2, 3, 4, 5].filter((v) => v !== n1),\n  );",
        "  const n2 = n1;",
    ),
    (
        # 평균도 답도 맞다. 세상에 없는 값인 것만 틀렸다 — 산술 검산이 구조적으로 못 본다.
        "음수 자료 — 2-6-1 기본의 치우침이 평균보다 커져 「$-3$ 쪽을 읽었다」가 나온다",
        "  const values = aroundMean(rng, avg, 5, 3);",
        "  const values = aroundMean(rng, avg, 5, 12);",
    ),
    (
        "경계 훼손 — 2-6-1 응용이 평균과 «같은» 날도 «많은» 날로 센다",
        "  const overs = values.filter((v) => v > avg);",
        "  const overs = values.filter((v) => v >= avg);",
    ),
    (
        # 빨강을 넣는 것과 전체를 늘리는 것이 갈리지 않는다. 값은 여전히 «한 답»에 맞는다.
        "모호해짐 — 2-6-3 심화가 «무엇을 더하는지» 안 정해 답이 둘이 된다",
        "이 주머니에 빨간 구슬만 더 넣어,",
        "이 주머니에 구슬을 더 넣어,",
    ),
    (
        # 「적어도 몇 점 더」인데 목표가 지금보다 낮으면 답이 음수가 되어 물음이 무너진다.
        "역산 훼손 — 2-6-2 심화의 목표 평균이 지금 평균보다 낮아진다",
        "  const m = intBetween(rng, 2, 3);\n  const t = a + intBetween(rng, 1, 3);\n  const need = t * (k + m) - a * k;",
        "  const m = intBetween(rng, 2, 3);\n  const t = a - intBetween(rng, 1, 3);\n  const need = t * (k + m) - a * k;",
    ),
    (
        "여집합 훼손 — 2-6-3 응용이 «아닌 것» 대신 빨간 구슬을 센다",
        "  const [num, den] = simplify(yellow, total);",
        "  const [num, den] = simplify(red, total);",
    ),
    (
        "진분수 약속 훼손 — 2-2-3 에 대분수가 든다 (소단원 이름)",
        "`계산하시오.  ${expr(`\\\\frac{${a}}{${d}}\\\\times\\\\frac{${b}}{${e}}`)}`,",
        "`계산하시오.  ${expr(`1\\\\frac{${a}}{${d}}\\\\times\\\\frac{${b}}{${e}}`)}`,",
    ),
]

# 초6 1-2 각기둥과 각뿔 (elem-g6, cfe1fb15 검수 마감). 도형형이라 변이도 도형 축을 문다 —
# 공식·검산·갈래 배선·«기본은 그림에서 읽는다»·그림 자체·죽은 짝(꼭짓점↔면) 여섯.
G6_MUTS = [
    (
        "공식 훼손 — 각기둥 모서리를 2n 으로",
        "const prismParts = (n: number) => ({ 꼭짓점: 2 * n, 모서리: 3 * n, 면: n + 2 });",
        "const prismParts = (n: number) => ({ 꼭짓점: 2 * n, 모서리: 2 * n, 면: n + 2 });",
    ),
    (
        "검산 훼손 — 각뿔 옆면 전체 넓이 답을 하나 올린다",
        "    num(n * one),",
        "    num(n * one + 1),",
    ),
    (
        "갈래 뭉개기 — 1-2-1 심화를 연산으로",
        "    심화: prismFaceDeep,",
        "    심화: prismFaceCalc,",
    ),
    (
        "축 훼손 — 기본이 밑면 이름을 말해 버린다",
        "`다음은 각기둥 모양 ${thing}입니다. 옆면은 몇 개입니까?`,",
        "`다음은 ${sino(n)}각기둥 모양 ${thing}입니다. 옆면은 몇 개입니까?`,",
    ),
    (
        "그림 훼손 — 기본 갈래에서 겨냥도를 뗀다",
        """    `겨냥도에서 밑면이 ${polyName(n)}임을 읽습니다. 옆면의 수는 밑면의 변의 수와 같으므로 ${num(n)}개입니다.`,
    fig("prism", { sides: n, h: 3 }),
  );""",
        """    `겨냥도에서 밑면이 ${polyName(n)}임을 읽습니다. 옆면의 수는 밑면의 변의 수와 같으므로 ${num(n)}개입니다.`,
  );""",
    ),
    (
        "죽은 짝 되살리기 — 각뿔 심화가 꼭짓점↔면을 짝짓는다(준 수가 그대로 답)",
        """const PYR_DEEP_PAIRS = [
  ["모서리", "꼭짓점"],
  ["모서리", "면"],
  ["면", "모서리"],
  ["꼭짓점", "모서리"],
] as const;""",
        """const PYR_DEEP_PAIRS = [["꼭짓점", "면"]] as const;""",
    ),
    # ── 3차분 (1-3 소수의 나눗셈) — 몫-성질은 판정기가 발문에서 못 재므로(loose)
    #    시험이 정답에 대고 지킨다. 그 시험이 정말 무는지 셋으로 문다.
    (
        "조건 훼손 — 1-3-2 풀이 몫 1 이상을 낸다",
        "    (c) => c.q >= 20 && c.q < 100 && c.q % 10 === 0 && oneDecDividend(c),",
        "    (c) => c.q >= 20 && c.q < 200 && c.q % 10 === 0 && oneDecDividend(c),",
    ),
    (
        "검산 훼손 — 1-3-1 상자 응용 답을 0.1 올린다",
        """    expr(decStr(q10, 1)),
    `${b.item}만의 무게를 먼저 구합니다.""",
        """    expr(decStr(q10 + 1, 1)),
    `${b.item}만의 무게를 먼저 구합니다.""",
    ),
    (
        "갈래 뭉개기 — 1-3-4 심화를 연산으로",
        "    심화: decZeroDeep,",
        "    심화: decZeroCalc,",
    ),
    # ── 4차분 (1-4 비와 비율) — 최대 함정은 **비의 어순**(«B에 대한 A의 비» = A:B).
    #    시험이 어순 규칙을 독립 구현했는지, 뒤집힌 비를 정말 무는지 문다.
    (
        "어순 훼손 — 1-4-2 응용의 비가 뒤집힌다",
        "    expr(`${a}:${a + b}`),",
        "    expr(`${a + b}:${a}`),",
    ),
    (
        "검산 훼손 — 1-4-6 심화 원래 가격을 100원 올린다",
        "      num(orig),",
        "      num(orig + 100),",
    ),
    (
        "갈래 뭉개기 — 1-4-5 심화를 연산으로",
        "    심화: pctDeep,",
        "    심화: pctCalc,",
    ),
    # ── 5차분 (1-5 여러 가지 그래프) — 참이 그림 스펙에 있는 첫 트랜치.
    #    «스펙에서 되뽑는 검산»과 «합100 단정»이 정말 무는지 문다.
    (
        "스펙-발문 어긋남 — 1-5-1 연산 답이 그래프보다 5 높다",
        r"""    num(one.pct),
    `띠그래프에서 ${one.label} 부분에 적힌 비율을 읽으면 ${expr(`${one.pct}\\%`)} 입니다.`,""",
        r"""    num(one.pct + 5),
    `띠그래프에서 ${one.label} 부분에 적힌 비율을 읽으면 ${expr(`${one.pct}\\%`)} 입니다.`,""",
    ),
    (
        "합100 훼손 — split100 이 5 모자란 분할을 낸다",
        "    out.push(left);",
        "    out.push(left - 5);",
    ),
    (
        "갈래 뭉개기 — 1-5-3 심화를 연산으로",
        "    심화: pieReadDeep,",
        "    심화: pieReadCalc,",
    ),
    # ── 6차분 (1-6 겉넓이·부피) — 환산·공식·배선을 문다. 환산 훼손은 g5 1-6-3 선례 미러.
    (
        "환산 훼손 — 1-6-3 연산이 m³→cm³ 를 ×100000 으로",
        """      `${num(k)} m³는 몇 cm³입니까?`,
      num(k * 1000000),""",
        """      `${num(k)} m³는 몇 cm³입니까?`,
      num(k * 100000),""",
    ),
    (
        "공식 훼손 — 뚜껑 없는 상자가 여섯 면을 다 센다",
        "  const five = w * d + 2 * (d * h + h * w);",
        "  const five = 2 * (w * d + d * h + h * w);",
    ),
    (
        "갈래 뭉개기 — 1-6-2 심화를 연산으로",
        "    심화: volDeep,",
        "    심화: volCalc,",
    ),
    # ── 7차분 (2-1 분수의 나눗셈) — 뒤집기 누락(이 단원의 고전 오류)·기약 규약·배선을 문다.
    (
        "뒤집기 누락 — 2-1-4 연산이 역수를 안 뒤집는다",
        r"""    expr(`\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.d2}}{${f.n2}}`),
    `나누는 수 ${expr(`\\frac{${f.n2}}{${f.d2}}`)} 의 분모와 분자를 바꾼 수를 곱합니다.`,""",
        r"""    expr(`\\frac{${f.n1}}{${f.d1}}\\times\\frac{${f.n2}}{${f.d2}}`),
    `나누는 수 ${expr(`\\frac{${f.n2}}{${f.d2}}`)} 의 분모와 분자를 바꾼 수를 곱합니다.`,""",
    ),
    (
        "기약 훼손 — 2-1-1 연산이 분수를 안 접어 적는다",
        r"""    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`\\frac{${a}}{${d}}\\div\\frac{${b}}{${d}}=\\square`)}`,""",
        r"""    `다음 나눗셈의 몫을 구하시오.\n\n${expr(`\\frac{${a * 2}}{${d * 2}}\\div\\frac{${b}}{${d}}=\\square`)}`,""",
    ),
    (
        "갈래 뭉개기 — 2-1-5 심화를 연산으로",
        "    심화: mixedFracDeep,",
        "    심화: mixedFracCalc,",
    ),
    # ── 8차분 (2-2 소수의 나눗셈) — 반올림 구성·남는 수 자리·소수점 옮기기를 문다.
    (
        "반올림 뜻 훼손 — 딱 떨어지는 몫도 반올림 문항이 된다",
        "      if (a % b === 0) continue;\n      if ((a * 10 ** (place + 1)) % b === 0) continue;",
        "      if (a % b === 0) continue;",
    ),
    (
        "남는 수 자리 훼손 — 나머지를 몫의 자리(자연수)로 적는다",
        "  const rem10 = intBetween(rng, 0, per - 1) * 10 + intBetween(rng, 1, 9);\n  return { per, people, total10: people * per * 10 + rem10, rem10 };",
        "  const rem10 = intBetween(rng, 1, per - 1) * 10;\n  return { per, people, total10: people * per * 10 + rem10, rem10 };",
    ),
    (
        # 리드 검수 반려분(2026-08-23) — 「긴 막대 11 cm, 짧은 막대 13 cm」.
        # 0.35%(7/2000) 라 **씨앗 16개로는 구조적으로 안 보인다** — 잠금 시험은 전수 쓸기다.
        "낱말 거짓말 — 2-2-4 응용이 소재를 값보다 먼저 뽑는다(순서 낱말이 값과 어긋남)",
        """  const p = pick(
    rng,
    ROUND_PAIRS.filter((pair) => !pair.ordered || c.a > c.b),
  );""",
        "  const p = pick(rng, ROUND_PAIRS);",
    ),
    (
        # 값은 옳고 판정기도 □ 를 와일드카드로 세어 통과시킨다 — «지면에 서는가» 축만 문다.
        "종류 은닉 — 2-2-3 심화가 □ 를 나누는 수에 두어 소수가 안 보인다",
        """    `${expr("\\\\square")} 안에 알맞은 수를 구하시오.\\n\\n${expr(`\\\\square\\\\div${b}=${c.q}`)}`,
    num(c.a),""",
        """    `${expr("\\\\square")} 안에 알맞은 수를 구하시오.\\n\\n${expr(`${c.a}\\\\div\\\\square=${c.q}`)}`,
    expr(b),""",
    ),
    (
        "검산 훼손 — 2-2-3 연산이 소수점을 한 자리만 옮긴 값을 답으로",
        """    `다음 나눗셈의 몫을 구하시오.\\n\\n${expr(`${c.a}\\\\div${b}=\\\\square`)}`,
    num(c.q),""",
        """    `다음 나눗셈의 몫을 구하시오.\\n\\n${expr(`${c.a}\\\\div${b}=\\\\square`)}`,
    num(c.a),""",
    ),
    (
        # 2-4 ② — 비는 «자리»가 뜻이다. 뒤집으면 두 항의 **곱도 합도 그대로**라
        # 값만 보는 잣대는 초록이다. 시험이 왼쪽·오른쪽을 따로 봐야만 빨개진다.
        "자리 뒤집기 — 2-4-1 기본이 비의 전항과 후항을 바꿔 답한다",
        """      `이런 상자 ${num(k)}개에 담긴 ${g.x} 수와 ${g.y} 수의 비를 쓰시오.`,
    expr(`${a * k}:${b * k}`),""",
        """      `이런 상자 ${num(k)}개에 담긴 ${g.x} 수와 ${g.y} 수의 비를 쓰시오.`,
    expr(`${b * k}:${a * k}`),""",
    ),
    (
        # 2-4 ① — 값(비율)은 그대로 맞다. **기약이 아닐 뿐**이다.
        # 「비율이 같은가」만 보는 검산은 구조적으로 이걸 못 본다.
        "기약 훼손 — 2-4-2 기본이 약분하지 않은 비를 답으로 낸다",
        "    expr(`${p / g}:${q / g}`),",
        "    expr(`${p}:${q}`),",
    ),
    (
        # 2-4 ③ — 2-2-4 반려와 같은 부류. 값은 옳고 **낱말만** 거짓말한다.
        "낱말 거짓말 — 2-4-5 심화가 «더 많은 쪽»을 값이 아니라 이름 차례로 고른다",
        """  const more = a > b ? kid.one : kid.two;
  const less = a > b ? kid.two : kid.one;""",
        """  const more = kid.one;
  const less = kid.two;""",
    ),
    (
        # 2-4 ④ — 비례배분의 몫이 자연수가 아니게 된다.
        "몫 훼손 — 2-4-5 응용의 둘레가 항의 합으로 안 나누어떨어진다",
        "  const around = 2 * (w + h);",
        "  const around = 2 * (w + h) + 2;",
    ),
    (
        # 가드의 가드 — 시험이 「약분해 보이는 등식」을 예외로 빼 준다. 그 예외가
        # **통째로 새는 구멍**이면 안 되므로, 등식을 없애 날 분수만 남겨 본다.
        "예외 남용 — 2-4-3 응용 해설이 약분 등식 없이 안 줄인 분수만 적는다",
        """  const wg = gcd(a + m, b + m);
  const wrongRatio =
    wg === 1""",
        """  const wg = gcd(a + m, b + m);
  const wrongRatio =
    wg >= 1""",
    ),
    (
        # 위 「예외 남용」과 짝이다. 그것은 **등식을 없애** 날 분수를 남기고, 이것은
        # **거짓 등식**을 남긴다. 시험의 예외가 「오른쪽이 정말 왼쪽의 기약형인가」를
        # 안 보고 통째로 빼면 이 자리가 조용히 통과한다.
        #
        # ⚠️ 처음엔 시험 쪽 조건을 `true ||` 로 열어 확인하려 했는데 **초록**이었다.
        # 지금 해설에는 «참인 약분 등식»밖에 없어서 **산출물이 안 바뀌었기** 때문이다
        # (하네스 판정 ⑵ 와 같은 함정 — 초록이 「장식」을 뜻하지 않는다).
        # 거짓 등식을 **만들어 넣어야** 그 조건이 하는 일이 보인다.
        "거짓 약분 — 2-4-3 응용 해설이 틀린 등식으로 «약분한 척» 한다",
        "${(a + m) / wg}}{${(b + m) / wg}}",
        "${a}}{${b}}",
    ),
    # ── 초6 2-5 원의 둘레와 넓이 (2026-08-23) ──
    (
        # 2-5-3 표준을 고치며 세운 규약을 갈래가 물려받는가. 그림이 없으므로 이 말이
        # 빠지면 「원 안에 그린 정육각형」이 무수히 많아 **답이 하나로 안 선다.**
        # 값은 그대로 맞으니 검산으로는 구조적으로 안 잡힌다.
        "한정어 제거 — 2-5-1 연산이 «꼭 맞게»도 조건절도 없이 도형을 말한다",
        '`반지름이 ${unitNum(r, "cm")} 인 원 안에 꼭 맞게 그린 정육각형의 둘레는 몇 cm인가? ${FIT_HEX}`,',
        '`반지름이 ${unitNum(r, "cm")} 인 원 안에 그린 정육각형의 둘레는 몇 cm인가?`,',
    ),
    (
        # 발문이 원주율을 안 적으면 「$3$ 으로 풀까 $3.14$ 로 풀까」가 지면에서 안 갈린다.
        "규약 누락 — 2-5-2 연산이 원주율을 발문에 안 적는다",
        '`지름이 ${unitNum(d, "cm")} 인 원의 원주는 몇 cm인가? (원주율: ${num(3)})`,\n    num(3 * d),',
        '`지름이 ${unitNum(d, "cm")} 인 원의 원주는 몇 cm인가?`,\n    num(3 * d),',
    ),
    (
        # 2-4 와 같은 축 — 답이 «순서 있는 쌍»이라 뒤집으면 두 수의 곱도 합도 그대로다.
        "자리 뒤집기 — 2-5-1 응용이 지름의 아래끝과 위끝을 바꿔 답한다",
        "    expr(`${c / 4},\\\\ ${c / 3}`),",
        "    expr(`${c / 3},\\\\ ${c / 4}`),",
    ),
    (
        # 정육각형의 한 변은 **반지름**이다. 지름으로 읽으면 둘레가 두 배가 된다.
        "공식 훼손 — 2-5-1 연산이 정육각형 한 변을 지름으로 읽는다",
        "      `반지름이 ${unitNum(r, \"cm\")} 인 원 안에 꼭 맞게 그린 정육각형의 둘레는 몇 cm인가? ${FIT_HEX}`,\n      num(6 * r),",
        "      `반지름이 ${unitNum(r, \"cm\")} 인 원 안에 꼭 맞게 그린 정육각형의 둘레는 몇 cm인가? ${FIT_HEX}`,\n      num(6 * d),",
    ),
    # ── D-73 원주율 — 「적은 값 ≠ 쓴 값」 두 방향 ────────────────────
    # 이 부류는 **값 검산으로 안 잡힌다**: 어느 쪽 산술도 그 자체로는 맞다.
    # 지면에서만 틀리므로 「적은 값과 쓴 값이 같은가」를 재는 가드만 문다.
    (
        "규약 어긋남 ㉡ — 2-5-2 응용이 $3$ 이라 적고 해설은 $3.1$ 로 계산한다",
        '`굴러간 거리는 몇 cm인가? (원주율: ${num("3.1")})`,',
        '`굴러간 거리는 몇 cm인가? (원주율: ${num(3)})`,',
    ),
    (
        "규약 어긋남 ㉠ — 2-5-4 응용이 $3.14$ 라 적고 해설은 $3.1$ 로 계산한다",
        '`원주가 ${unitNum(fromTenths(c), "cm")} 인 원의 넓이는 몇 cm²인가? (원주율: ${num("3.1")})`,',
        '`원주가 ${unitNum(fromTenths(c), "cm")} 인 원의 넓이는 몇 cm²인가? (원주율: ${num("3.14")})`,',
    ),
]

G4_MUTS = [
    # ── 초4 2-2 삼각형 (2026-08-23, elem-g4) ─────────────────────────────
    #
    # ⚠️ **초4 는 46소단원이 착지할 때까지 변이 등록이 하나도 없었다**(리드 실측
    # 2026-08-23). 그동안 검증을 안 한 것은 아니다 — 리드가 「$1.90$ 꼬리 $0$」·
    # 「$12$시과」·꺾은선 77건을 실제로 변이시켜 확인했다. 그런데 **전부 스크래치의
    # 일회용 스크립트**여서 아무것도 안 남았다. 증명은 됐고 **가드는 안 남은** 상태다.
    # 그래서 새 2-2 뿐 아니라 **그때 그 셋을 여기 못 박는다** — 지면에 나갈 뻔했던 것들이다.
    (
        "삼각형 부등식 훼손 — 두 변의 합이 나머지와 «같아도» 삼각형이라 한다",
        "  const [x, y, z] = [a, b, c].sort((p, q) => p - q);\n  return x! + y! > z!;",
        "  const [x, y, z] = [a, b, c].sort((p, q) => p - q);\n  return x! + y! >= z!;",
    ),
    (
        "2-2-1 2단 훼손 — 나머지가 «작은 쪽»인 경우를 안 본다",
        "      if (isTriangle(small, small, big) && isTriangle(small, big, big)) {",
        "      if (isTriangle(small, big, big)) {",
    ),
    (
        "2-2-1 3단 훼손 — 나머지 한 변이 «같은 두 변»과 같아도 된다(정삼각형)",
        "    (v) => v !== leg && isTriangle(leg, leg, v),",
        "    (v) => isTriangle(leg, leg, v),",
    ),
    (
        "2-2-1 4단 훼손 — 두 조건 중 «차»를 안 지킨다",
        "  const leg = longer ? other + d : other - d;",
        "  const leg = longer ? other + d + 1 : other - d;",
    ),
    (
        "2-2-2 훼손 — 밑각 $60^\\circ$ 를 허용한다(세 각이 다 $60^\\circ$ 인데 «이등변»이라 부른다)",
        "  return Array.from({ length: hi - lo + 1 }, (_, i) => i + lo).filter(\n    (v) => v !== 60,\n  );",
        "  return Array.from({ length: hi - lo + 1 }, (_, i) => i + lo);",
    ),
    (
        "2-2-4 3단 훼손 — 나머지 한 각이 $90^\\circ$ 인 경우를 되살린다(계산 없이 답이 보인다)",
        "  const given =\n    intBetween(rng, 0, 1) === 0\n      ? intBetween(rng, 5, 44) * 2",
        "  const given =\n    intBetween(rng, 0, 1) === 0\n      ? 90",
    ),
    (
        "2-2-4 4단 훼손 — 큰 각을 안 감춘다(셈이 0단계가 되어 3단보다 가벼워진다)",
        "  const [a, b] = angles.filter((v) => v < 90);",
        "  const [a, b] = angles.filter((v) => v <= 180);",
    ),
    (
        "2-2-4 4단 훼손 — 예각삼각형도 뽑는다(틀린 근거로도 답이 맞는다)",
        "  const angles = triAnglesOfClass(rng, intBetween(rng, 0, 1));",
        "  const angles = triAnglesOfClass(rng, intBetween(rng, 1, 2));",
    ),
    (
        "2-2-5 4단 훼손 — 두 경우의 부류가 같아지는 각도 뽑는다",
        "  const a = intBetween(rng, 5, 22) * 2; // 10~44 짝수",
        "  const a = intBetween(rng, 5, 30) * 2; // 10~60 짝수",
    ),
    # ── 초4 2-4 사각형 (2026-08-23, elem-g4) ─────────────────────────────
    (
        "사다리꼴 존재 조건 훼손 — 그릴 수 없는 네 변도 낸다",
        "  return gap > 0 && Math.abs(legA - legB) < gap && gap < legA + legB;",
        "  return gap > 0;",
    ),
    (
        "2-4-4 4단 훼손 — 사다리꼴 걸름을 지운다(차가 두 다리의 합을 넘는다)",
        "    Array.from({ length: leg + 3 }, (_, i) => (i + 1) * 2).filter((g) =>\n      isTrapezoid(short, short + g, leg, leg),\n    ),",
        "    Array.from({ length: leg + 3 }, (_, i) => (i + 1) * 2),",
    ),
    (
        "2-4-6 2단 훼손 — 더 긴 쪽을 거꾸로 고른다",
        "  const bigger = rhombus * 4 > triangle * 3 ? \"마름모\" : \"정삼각형\";",
        "  const bigger = rhombus * 4 > triangle * 3 ? \"정삼각형\" : \"마름모\";",
    ),
    (
        "2-4-7 4단 훼손 — 합의 차가 $4$의 배수가 아니어도 된다(한 변이 자연수가 아니다)",
        "  const gap = intBetween(rng, 1, 8) * 4; // 합의 차가 $4$의 배수라야 한 변이 자연수다",
        "  const gap = intBetween(rng, 1, 32); // 합의 차가 $4$의 배수라야 한 변이 자연수다",
    ),
    (
        "2-4-7 2단 훼손 — 배제절을 지운다(포함 관계 때문에 이름이 안 갈린다)",
        "  const stem = `어떤 사각형은 ${c.has}지만 ${c.not}.`;",
        "  const stem = `어떤 사각형은 ${c.has}습니다.`;",
    ),
    # ── 이미 착지한 초4 가드 — 되돌리면 지면이 실제로 나빠지는 것 ──────────
    (
        "표준 2-3-2 훼손 — 더한 값의 꼬리 $0$ 을 막지 않는다(「$1.90$」이 지면에 나간다)",
        "        Array.from({ length: 40 }, (_, i) => i + 1).filter(\n          (d) => (x + d) % 10 !== 0,\n        ),",
        "        Array.from({ length: 40 }, (_, i) => i + 1),",
    ),
    (
        "표준 2-5-2 훼손 — 때 이름 뒤 조사를 「과」로 박는다(「$12$시과」가 나간다)",
        '        `${josa(theme.labels[at]!.math, "과", "와")} ${theme.labels[at + 1]!.math} 사이`,',
        '        `${theme.labels[at]!.math}과 ${theme.labels[at + 1]!.math} 사이`,',
    ),
    (
        "2-5-3 4단 훼손 — 표를 써야 하는 자리에 꺾은선을 그린다",
        "      `${expr(`${most}-${gaps[other]!}=${most - gaps[other]!}`)}`,\n    tableFigure(theme, nums),",
        "      `${expr(`${most}-${gaps[other]!}=${most - gaps[other]!}`)}`,\n    lineFigure(theme, nums),",
    ),
]

TARGETS = {
    # 초3 은 잠금이 **두 파일**에 걸쳐 있다 — 파일럿(1-1-2)은 elementaryG3Tiers,
    # 확대분(1-2~2-2)은 elemTiersG3 다. 하나만 돌리면 다른 쪽이 무는 변이가
    # 「시험이 못 잡는다」로 읽힌다. 소단원도 변이가 닿는 곳을 전부 찍어야
    # ⑵ 에서 «산출물이 그대로다»로 오판되지 않는다.
    "g3": {
        "file": "src/lib/elementary/g3.ts",
        "test": [
            "src/__tests__/unit/elementaryG3Tiers.test.ts",
            "src/__tests__/unit/elemTiersG3.test.ts",
        ],
        "grade": "초3",
        "sections": [
            "1-1-2",
            "1-3-3",
            "2-1-1",
            "2-1-2",
            "2-1-3",
            "2-1-4",
            "2-2-1",
            "2-2-2",
            "2-2-3",
            "2-2-4",
            "2-4-5",
            "2-4-1",
            "2-4-2",
            "2-4-3",
            "2-4-4",
            "2-4-6",
        ],
        "muts": G3_MUTS,
    },
    # 변이가 1-1·1-2·1-3·1-4·1-6-3 에 걸쳐 있어 «sections» 로 전부 찍는다(g6 과 같은 까닭).
    # 시험은 네 트랜치를 다 담은 elemTiersG5.test.ts 다 — 파일럿(1-6-2)의
    # elementaryG5Tiers.test.ts 는 변이 목록이 그 소단원을 안 물므로 여기서 안 부른다.
    # 1-3 정본 꼴 변이(relMulLatex)는 tier 함수만 물지만, 표준 1-3-2 에 같은 리터럴이
    # 있으니 sections 에 1-3 셋을 다 둔다.
    "g5": {
        "file": "src/lib/elementary/g5.ts",
        "test": "src/__tests__/unit/elemTiersG5.test.ts",
        "grade": "초5",
        "sections": [
            "1-1-1",
            "1-1-2",
            "1-1-3",
            "1-2-4",
            "1-2-5",
            "1-2-6",
            "1-3-1",
            "1-3-2",
            "1-3-3",
            "1-4-1",
            "1-4-2",
            "1-4-3",
            "1-4-4",
            "1-4-5",
            "1-5-1",
            "1-5-2",
            "1-5-3",
            "1-5-4",
            "1-6-3",
            "1-6-4",
            "2-1-1",
            "2-1-2",
            "2-1-3",
            "2-1-4",
            "2-1-5",
            "2-1-6",
            "2-2-1",
            "2-2-2",
            "2-2-3",
            "2-2-4",
            "2-4-1",
            "2-4-2",
            "2-4-3",
            "2-4-5",
            "2-4-7",
            "2-6-1",
            "2-6-2",
            "2-6-3",
        ],
        "muts": G5_MUTS,
    },
    # 초4 의 잠금은 **시험 파일 넷**에 흩어져 있다(2-1 분수 · 2-3 소수 · 2-5 꺾은선 ·
    # 2-2 삼각형). 변이 하나가 무는 곳이 그중 하나뿐이라도 넷을 다 돌려야 한다 —
    # 하나만 돌리면 다른 파일이 무는 변이가 「시험이 못 잡는다」로 읽힌다(g3 과 같은 까닭).
    # 표준 갈래를 건드리는 변이(2-3-2 꼬리 $0$ · 2-5-2 조사)가 있어 sections 에
    # 그 소단원들도 넣는다 — 안 넣으면 ⑵ 에서 «산출물이 그대로다»로 오판된다.
    "g4": {
        "file": "src/lib/elementary/g4.ts",
        "test": [
            "src/__tests__/unit/elemTiersG4Tri.test.ts",
            "src/__tests__/unit/elemTiersG4Quad.test.ts",
            "src/__tests__/unit/elemTiersG4Dec.test.ts",
            "src/__tests__/unit/elemTiersG4Line.test.ts",
        ],
        "grade": "초4",
        "sections": [
            "2-2-1",
            "2-2-2",
            "2-2-3",
            "2-2-4",
            "2-2-5",
            "2-3-2",
            "2-4-4",
            "2-4-6",
            "2-4-7",
            "2-5-2",
            "2-5-3",
        ],
        "muts": G4_MUTS,
    },
    # 변이가 소단원 열여섯(1-2 다섯 + 1-3 다섯 + 1-4 여섯)에 걸쳐 있어 «sections» 로
    # 전부 찍는다 — 하나만 찍으면 다른 소단원만 바꾸는 변이가 ⑵ 에서 오판된다.
    "g6": {
        "file": "src/lib/elementary/g6.ts",
        "test": "src/__tests__/unit/elemTiersG6.test.ts",
        "grade": "초6",
        "sections": [
            "1-2-1",
            "1-2-2",
            "1-2-3",
            "1-2-4",
            "1-2-5",
            "1-3-1",
            "1-3-2",
            "1-3-3",
            "1-3-4",
            "1-3-5",
            "1-4-1",
            "1-4-2",
            "1-4-3",
            "1-4-4",
            "1-4-5",
            "1-4-6",
            "1-5-1",
            "1-5-2",
            "1-5-3",
            "1-5-4",
            "1-5-5",
            "1-6-1",
            "1-6-2",
            "1-6-3",
            "2-1-1",
            "2-1-2",
            "2-1-3",
            "2-1-4",
            "2-1-5",
            "2-2-1",
            "2-2-2",
            "2-2-3",
            "2-2-4",
            "2-2-5",
            "2-4-1",
            "2-4-2",
            "2-4-3",
            "2-4-4",
            "2-4-5",
            "2-5-1",
            "2-5-2",
            "2-5-3",
            "2-5-4",
        ],
        "muts": G6_MUTS,
    },
}


def run(args: list[str]) -> tuple[int, str]:
    r = subprocess.run(args, capture_output=True, shell=True, cwd=ROOT)
    return r.returncode, r.stdout.decode("utf-8", "replace")


# 산출물을 못 얻었을 때 **왜** 못 얻었는지. 예전에는 stderr 를 통째로 버려서
# 「판정하지 않는다: 」 뒤가 비어 있었다 — 다음 사람이 원인을 다시 찾아야 했다.
# 2026-08-23 실측: 다중 세션이 `src/lib/elementary/` 를 저장하는 사이에 돌면
# 남의 **중간 상태**가 컴파일을 깨서 이 자리가 난다. 그때 그 파일 이름이 보여야
# 「내 변이가 이상한가」와 「과녁이 움직였나」를 가를 수 있다.
LAST_PROBE_ERR = ""


def probe(grade: str, sections: list[str]) -> str:
    global LAST_PROBE_ERR
    ts = PROBE_TS.replace("__GRADE__", grade).replace(
        "__SECTIONS__", json.dumps(sections)
    )
    io.open(PROBE_PATH, "w", encoding="utf-8").write(ts)
    try:
        r = subprocess.run(
            ["npx", "tsx", PROBE_PATH], capture_output=True, shell=True, cwd=ROOT
        )
        err = r.stderr.decode("utf-8", "replace").strip()
        out = r.stdout.decode("utf-8", "replace").strip()
        LAST_PROBE_ERR = "" if out else " / ".join(err.splitlines()[:3])
        return out
    finally:
        if os.path.exists(PROBE_PATH):
            os.remove(PROBE_PATH)


# ── 죽어도 남는 빵부스러기 ────────────────────────────────────────────────────
#
# `finally` 는 **하드 킬에서 안 돈다.** 2026-08-23 에 두 번, 도는 중에 죽어서
# 대상 파일이 «변이가 적용된 채» 남았다. 그때 되살릴 수 있었던 것은 순전히
# 운영자가 **손으로** 원본 md5 를 미리 찍어 뒀기 때문이다.
#
# ⚠️ 그리고 이 파일들은 대개 **미커밋**이다(갈래 작업 중이니까). 그러니
#    `git checkout` 으로 되돌리면 **그날 작업이 통째로 날아간다** — 되돌리는
#    유일한 안전한 길은 «적용된 변이를 거꾸로 치환»하는 것이고, 그러려면
#    **어느 변이였는지**를 알아야 한다. 그것을 여기 적어 둔다.
#
# ⚠️ **대상마다 따로 둔다.** 한 파일로 두면 g5 회차와 g6 회차가 **동시에 돌 때**
#    서로의 빵부스러기를 덮어쓰고, 먼저 끝난 쪽이 남의 것을 지운다. 게다가 한쪽의
#    **살아 있는** 회차를 다른 쪽이 「죽은 회차」로 읽어 **둘 다 못 돌게** 된다 —
#    거짓 경보는 가드를 끈다. 대상별로 나누면 두 회차는 서로를 아예 안 본다
#    (같은 대상을 둘이 동시에 도는 것은 원래 하면 안 되는 일이라 그대로 막는다).
def inflight_path(which: str) -> str:
    return os.path.join(ROOT, "scripts", "qa", f".mutate-inflight.{which}.json")


def mark_inflight(
    which: str, rel_file: str, base_md5: str, idx: int, name: str
) -> None:
    io.open(inflight_path(which), "w", encoding="utf-8", newline="\n").write(
        json.dumps(
            {"file": rel_file, "base_md5": base_md5, "index": idx, "name": name},
            ensure_ascii=False,
            indent=2,
        )
    )


def clear_inflight(which: str) -> None:
    p = inflight_path(which)
    if os.path.exists(p):
        os.remove(p)


def inflight_files() -> list[tuple[str, str]]:
    """
    남아 있는 빵부스러기 — `(대상, 경로)`.

    ⚠️ **옛 형식(`.mutate-inflight.json`, 대상 이름이 없다)도 읽는다.** 이 이름은
       하루 안에 두 번 바뀌었고, 그 사이에 **이미 돌고 있던 회차**는 옛 이름으로
       빵부스러기를 남긴다 — 도는 프로세스는 자기 메모리 안의 옛 코드를 쓰니까.
       새 이름만 보면 그 회차가 죽었을 때 빵부스러기가 **안 보인다.**
       이름이 비면 안에 적힌 `file` 로 대상을 되찾는다.
    """
    qa = os.path.join(ROOT, "scripts", "qa")
    out = []
    for fn in sorted(os.listdir(qa)):
        if not (fn.startswith(".mutate-inflight") and fn.endswith(".json")):
            continue
        p = os.path.join(qa, fn)
        which = fn[len(".mutate-inflight.") : -len(".json")]
        if not which:  # 옛 형식 — 안을 열어 대상을 되찾는다
            try:
                d = json.loads(io.open(p, encoding="utf-8").read())
                which = next(
                    (k for k, t in TARGETS.items() if t["file"] == d.get("file")), ""
                )
            except Exception:
                which = ""
        out.append((which or "(대상 모름)", p))
    return out


def sweep_stale_probes() -> None:
    """
    하드 킬이 남긴 **남의 임시 프로브**를 치운다.

    ⚠️ 살아 있는 회차의 것을 지우면 그 회차가 「산출물을 못 얻었다」로 떨어진다 —
       그래서 **PID 로 고르지 않고 나이로** 고른다. 프로브 파일은 probe() 한 번마다
       쓰고 지우므로 몇 분만 지나도 확실히 고아다. 30분을 넘긴 것만 치운다.
    """
    import time

    qa = os.path.join(ROOT, "scripts", "qa")
    for fn in os.listdir(qa):
        if not fn.startswith(".mutate-") or not fn.endswith(".ts"):
            continue
        p = os.path.join(qa, fn)
        try:
            if time.time() - os.path.getmtime(p) > 1800:
                os.remove(p)
                print(f"(죽은 회차가 남긴 임시 프로브를 치웁니다: {fn})")
        except OSError:
            pass


def inflight_guard(which: str) -> int:
    """앞 회차가 **더럽게 죽었으면** 새로 돌지 않는다 — 무엇을 재는지 알 수 없다."""
    p = inflight_path(which)
    if not os.path.exists(p):
        return 0
    d = json.loads(io.open(p, encoding="utf-8").read())
    print("⛔ 앞 회차가 **변이를 적용한 채 죽었습니다.** 판정하지 않습니다.\n")
    print(f"   파일   {d['file']}")
    print(f"   변이   [{d['index']}] {d['name']}")
    print(f"   원본   md5 {d['base_md5']}\n")
    print("   되돌리기:  python scripts/qa/mutate-elem-tiers.py --recover")
    print("   ⚠️ `git checkout` 은 쓰지 마십시오 — 그 파일은 대개 미커밋입니다.")
    return 1


def recover() -> int:
    """적용된 변이를 **거꾸로** 치환해 되돌린다. md5 가 안 맞으면 쓰지 않는다."""
    #
    # ⚠️ **남의 대상을 되돌리지 않는다.** 처음엔 남은 빵부스러기를 **전부** 훑게
    #    했는데, 그 순간 이 명령이 **다른 세션의 미커밋 파일에 쓰는 도구**가 된다.
    #    실제로 g5 를 되돌리다 g6 것까지 집어 「되돌려도 md5 가 다르다」로 막혔다
    #    (2026-08-23). 막힌 이유가 더 중요하다 — 그쪽 회차가 **살아 있어서**
    #    내가 [N] 을 읽는 사이 그쪽은 [N+1] 로 넘어가 있었다. md5 가드가 없었으면
    #    남의 도는 회차 한복판에 썼을 것이다.
    #
    #    그래서 대상을 **반드시 이름으로** 받는다. 인자 없이 부르면 남은 것을
    #    보여만 주고 아무것도 쓰지 않는다.
    left = inflight_files()
    if not left:
        print("되돌릴 것이 없습니다 — 빵부스러기가 없습니다.")
        return 0
    want = next((a for a in sys.argv[1:] if a in TARGETS), None)
    if want is None:
        print("되돌릴 대상을 **이름으로** 주십시오 — 남의 회차를 건드리지 않기 위해서입니다.\n")
        for which, p in left:
            d = json.loads(io.open(p, encoding="utf-8").read())
            print(f"   {which}: {d['file']}  변이 [{d['index']}] {d['name']}")
        print(f"\n   보기:  python scripts/qa/mutate-elem-tiers.py {left[0][0]} --recover")
        print("   ⚠️ 그 대상의 회차가 **지금 돌고 있으면** 되돌리지 마십시오.")
        return 2
    hit = next((p for w, p in left if w == want), None)
    if hit is None:
        print(f"«{want}» 의 빵부스러기가 없습니다 — 되돌릴 것이 없습니다.")
        return 0
    return recover_one(want, json.loads(io.open(hit, encoding="utf-8").read()))


def recover_one(which: str, d: dict) -> int:
    target = next(t for t in TARGETS.values() if t["file"] == d["file"])
    _name, old, new = target["muts"][d["index"]]
    path = os.path.join(ROOT, d["file"])
    text = io.open(path, "rb").read().replace(b"\r\n", b"\n").decode("utf-8")
    if text.count(new) != 1 or text.count(old) != 0:
        print(f"⛔ 파일이 예상한 모양이 아닙니다(new={text.count(new)} old={text.count(old)}).")
        print("   누가 그 사이 고쳤을 수 있습니다 — 손으로 확인하십시오. 쓰지 않습니다.")
        return 1
    fixed = text.replace(new, old, 1).encode("utf-8")
    got = hashlib.md5(fixed).hexdigest()
    if got != d["base_md5"]:
        print(f"⛔ 되돌려도 md5 가 다릅니다: {got} ≠ {d['base_md5']}")
        print("   그 사이 다른 수정이 들어왔습니다 — 손으로 확인하십시오. 쓰지 않습니다.")
        return 1
    io.open(path, "wb").write(fixed)
    clear_inflight(which)
    print(f"✅ 되돌렸습니다 — {d['file']} md5 {got} (변이 되돌리기 + 줄끝 둘 다)")
    return 0


def failed_tests(test_paths: str | list[str]) -> tuple[int, list[str]]:
    # 한 학년의 잠금이 시험 파일 **여럿**에 걸쳐 있을 수 있다(초3 은 파일럿 판과
    # 확대 판이 따로다) — 하나만 돌리면 다른 쪽이 무는 변이를 «시험이 못 잡는다»로 읽는다.
    paths = [test_paths] if isinstance(test_paths, str) else list(test_paths)
    code, txt = run(["npx", "vitest", "run", *paths, "--reporter=json"])
    names: list[str] = []
    try:
        data = json.loads(txt[txt.index("{"):])
        for suite in data.get("testResults", []):
            for case in suite.get("assertionResults", []):
                if case.get("status") == "failed":
                    names.append(case.get("title", "?"))
    except Exception:
        if code != 0:
            names = ["(판정 결과를 못 읽었다 — vitest 출력을 직접 보라)"]
    return code, names


def main() -> int:
    if "--recover" in sys.argv:
        return recover()
    which = sys.argv[1] if len(sys.argv) > 1 else "g3"
    if inflight_guard(which):
        return 2
    sweep_stale_probes()
    # ── 구간 — 「10분 벽」을 넘기지 않고 나눠 돌기 위한 것 ────────────────────────
    #
    # ⚠️ 나눠 돌 수 있게 되면 **부분 회차를 전량으로 착각할** 위험이 새로 생긴다.
    #    그래서 구간을 준 회차는 마지막 줄이 절대 「전량」이라 말하지 않고 **몇 번부터
    #    몇 번까지 돌았는지**를 반드시 찍는다 — 조용히 자르면 표가 「전부 해 봤다」로
    #    읽힌다(CLAUDE.md 2026-08-18 「빠진 표본은 반드시 세어 찍어라」).
    lo = int(next((a.split("=")[1] for a in sys.argv if a.startswith("--from=")), 0))
    hi_arg = next((a.split("=")[1] for a in sys.argv if a.startswith("--to=")), None)
    target = TARGETS.get(which)
    if target is None:
        print(f"모르는 대상입니다: {which} — {' · '.join(TARGETS)}")
        return 2
    if not target["muts"]:
        print(f"«{which}» 변이 목록이 비어 있습니다. 채우기 전에는 판정하지 않습니다 —")
        print("빈 목록으로 「전부 빨강」을 찍으면 아무것도 증명하지 못합니다.")
        return 2
    hi = min(int(hi_arg) if hi_arg is not None else len(target["muts"]) - 1,
             len(target["muts"]) - 1)
    if lo > hi:
        print(f"구간이 비었습니다: [{lo}..{hi}] — 판정하지 않습니다.")
        return 2

    path = os.path.join(ROOT, target["file"])
    # 복원은 **바이트**로 한다. 텍스트 모드로 되쓰면 Windows 가 LF 를 CRLF 로 바꿔
    # 「복원: 예」(텍스트 비교)가 참인데 **md5 는 달라진다** — 2026-08-23 g5 실행에서
    # 실제로 났다(HEAD 와 2,565줄 전부 줄끝만 다른 파일이 남았다). 변이 적용 중의
    # 임시 상태는 텍스트 쓰기여도 되지만, 원상은 반드시 원본 바이트 그대로 돌려놓는다.
    src_bytes = io.open(path, "rb").read()
    base_md5 = hashlib.md5(src_bytes).hexdigest()
    src = io.open(path, encoding="utf-8").read()
    if os.path.exists(PROBE_PATH):
        os.remove(PROBE_PATH)

    sections = target.get("sections") or [target["section"]]
    base = probe(target["grade"], sections)
    if not base.startswith("["):
        print("기준 산출물을 못 얻었습니다:", base[:400])
        return 1

    # ── 음성 대조 — 변이를 넣기 **전에** 그 시험이 초록인가 ────────────────────────
    # ⚠️ 판정은 「종료 코드 ≠ 0 이면 RED」다. 그러니 **기준이 이미 빨갛거나 러너가
    #    아예 못 뜨면 모든 변이가 빨강**으로 찍힌다 — 답이 진실에 따라 안 변하는
    #    판정자는 판정자가 아니라 도장이다. 낱개 판(`mutate-one.py`)이 없어진
    #    리포터 이름(`basic`, vitest 4 에서 제거)을 써서 정확히 그 상태였다
    #    (2026-08-23 발견). 이쪽은 `--reporter=json` 이라 무사했지만 **구조는 같다.**
    #    「망가진 것을 잡는가」만 보면 「멀쩡한 것을 멀쩡하다 하는가」는 구조적으로
    #    안 보인다 — 그래서 여기에 음성 대조를 못 박는다.
    base_code, base_fails = failed_tests(target["test"])
    if base_code != 0:
        print(f"기준 시험이 **이미 빨갛습니다**({len(base_fails)}건) — 판정하지 않습니다.")
        for name in base_fails[:8]:
            print("   ↳", name)
        print("변이를 넣기 전에 초록이어야 「빨개졌다」가 뜻을 가집니다.")
        return 1

    print(
        f"대상 {which} · 기준 산출물 {len(json.loads(base))}건 · 기준 시험 초록 · "
        f"변이 [{lo}..{hi}] / 전체 {len(target['muts'])}\n"
    )

    ok = True
    try:
        for idx, (name, before, after) in enumerate(target["muts"]):
            if idx < lo or idx > hi:
                continue
            # ⚠️ **다음 변이를 넣기 전에 파일이 아직 «내가 재기 시작한 그것»인지 본다.**
            #    이 고리는 매번 `src_bytes`(회차 시작 바이트)로 되돌린다. 그러니 도는
            #    중에 주인이 그 파일을 저장하면 **그 수정을 조용히 덮어쓴다** — 되돌리기
            #    기능이 곧 남의 작업을 먹는 기능이 된다. 그리고 기준선이 어긋나므로
            #    빵부스러기의 md5 도 영영 안 맞게 된다(2026-08-23 g6 이 겪은 그 자리).
            #    어긋나면 **쓰지 않고 멈춘다.**
            if io.open(path, "rb").read() != src_bytes:
                print(
                    f"  ⛔ {target['file']} 가 회차 도중에 바뀌었습니다 — 판정을 멈춥니다.\n"
                    "     (누가 저장했거나 같은 대상 회차가 둘입니다. 덮어쓰지 않습니다.)\n"
                    "     ⚠️ 앞 회차의 **종료 통보를 받았더라도** 그 아래 python·vitest\n"
                    "        자식이 살아 있을 수 있습니다 — 「죽였다」와 「죽었다」는 다릅니다.\n"
                    "        `ps` 로 자식을 먼저 확인하십시오."
                )
                ok = False
                break
            # 자리는 정확히 **하나**여야 한다 — 0이면 치환 실패, 2 이상이면 첫 자리만
            # 바뀌어 «내가 노린 자리»라는 보장이 없다 (2026-08-23 메모리: count==1 단정).
            count = src.count(before)
            if count != 1:
                why = (
                    "자리를 못 찾았다(변이가 적용되지 않았다)"
                    if count == 0
                    else f"자리가 {count}곳이다 — 어느 것이 바뀔지 모른다. 문맥을 넓혀라"
                )
                print(f"  ??    {name}\n        ← {why}")
                ok = False
                continue
            # ⚠️ **바이트로 쓴다.** 텍스트 모드로 쓰면 Windows 가 `\n` 을 `\r\n` 으로
            #    바꿔, 도중에 죽었을 때 «변이 적용 + 전량 CRLF» 라는 **두 겹 손상**이
            #    남는다(2026-08-23 두 번째 발생). 바이트로 쓰면 죽어도 줄끝은 성하다.
            io.open(path, "wb").write(src.replace(before, after, 1).encode("utf-8"))
            # 죽어도 **무엇을 되돌려야 하는지**가 디스크에 남는다 — `finally` 는
            # 하드 킬에서 안 돈다. 이게 없으면 다음 사람이 md5 를 손으로 재현해야 한다.
            mark_inflight(which, target["file"], base_md5, idx, name)
            got = None
            if io.open(path, encoding="utf-8").read() == src:
                print(f"  ??    {name}\n        ← 파일이 안 바뀌었다")
                ok = False
            elif (got := probe(target["grade"], sections)) == base:
                print(f"  ??    {name}\n        ← **산출물이 그대로다.** 판정하지 않는다")
                ok = False
            elif not got.startswith("["):
                # ⚠️ 「바뀌었다」와 「못 얻었다」는 다르다. 변이가 컴파일을 깨면 probe 가
                # 에러 문자열을 돌려주는데, 그것도 base 와 «다르므로» 여기까지 통과해
                # 시험이 컴파일 오류로 떨어지고 **RED 로 찍힌다** — 아무것도 안 잡았는데
                # 「가드가 잡았다」로 읽힌다. 기준 산출물에만 있던 잣대를 여기에도 건다.
                print(
                    f"  ??    {name}\n        ← **산출물을 못 얻었다**(컴파일이 깨졌을 수 있다). "
                    f"판정하지 않는다: {(got or LAST_PROBE_ERR)[:240]}"
                )
                ok = False
            else:
                code, names = failed_tests(target["test"])
                # ⚠️ **빨간데 어느 시험인지 못 대면 그것은 판정이 아니다.** 러너가
                #    기동 단계에서 죽어도 종료 코드는 0이 아니라, 「가드가 물었다」와
                #    구분되지 않는다 — 낱개 판이 없어진 리포터 이름 때문에 **모든
                #    변이를 RED 로 찍던** 그 모양 그대로다(2026-08-23).
                unreadable = code != 0 and (
                    not names or names[0].startswith("(판정 결과를 못 읽었다")
                )
                if unreadable:
                    print(f"  ??    {name}\n        ← **빨간데 실패한 시험을 못 댄다**(러너가 안 떴다). 판정하지 않는다")
                    ok = False
                else:
                    print(f"  {'RED  ' if code else 'GREEN'} {name}")
                    for t in names[:3]:
                        print(f"        ↳ {t}")
                    if code == 0:
                        print("        ← 시험이 못 잡는다")
                        ok = False
            io.open(path, "wb").write(src_bytes)
            clear_inflight(which)
    finally:
        # 어떤 일이 있어도 되돌린다 — 변이가 남은 채 끝나면 그게 가장 나쁘다.
        io.open(path, "wb").write(src_bytes)
        clear_inflight(which)
        if os.path.exists(PROBE_PATH):
            os.remove(PROBE_PATH)

    restored = io.open(path, "rb").read() == src_bytes
    ran = hi - lo + 1
    whole = lo == 0 and hi == len(target["muts"]) - 1
    scope = (
        f"전량 {ran}종"
        if whole
        else f"**부분** [{lo}..{hi}] {ran}종 / 전체 {len(target['muts'])}"
    )
    print("\n" + ("모든 변이가 빨강" if ok else "빠진 변이가 있다") + f" — {scope}")
    if not whole:
        print("⚠️ 구간 회차입니다 — 이 수치를 「전량」이라고 적지 마십시오.")
    print("복원:", "예" if restored else "**아니오 — 손으로 확인하라**")
    return 0 if (ok and restored) else 1


if __name__ == "__main__":
    sys.exit(main())

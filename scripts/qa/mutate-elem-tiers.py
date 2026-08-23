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

import io
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

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
        "오개념 훼손 — 2-2-4 응용의 «잘못 계산한 값» 이 자연수부 곱이 아니다 (③)",
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
        "제자리로 돌아옴 — 2-4-7 심화가 오른쪽 2칸·왼쪽 2칸이 되어 계산이 뜻을 잃는다",
        "  const downSteps = pick(\n    rng,\n    [1, 2].filter((d) => d !== upSteps),\n  );",
        "  const downSteps = pick(rng, [1, 2]);",
    ),
    (
        # 소단원 이름이 약속한 것이 지면에 없으면 판정기도 시험도 그 조건을 못 본다.
        "조건 사라짐 — 2-4-3 심화가 소수를 □ 로 가려 「1보다 작은 소수」가 지면에서 사라진다",
        "`□ 안에 알맞은 자연수를 구하시오.  ${expr(`\\\\square\\\\times${dec(t, 1)}=${dec(k * t, 1)}`)}`,",
        "`□ 안에 알맞은 소수를 구하시오.  ${expr(`${k}\\\\times\\\\square=${dec(k * t, 1)}`)}`,",
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
        '`지름이 ${unitNum(d, "cm")} 인 원 안에 꼭 맞게 그린 정육각형의 둘레는 몇 cm인가? ${FIT_HEX}`,',
        '`지름이 ${unitNum(d, "cm")} 인 원 안에 그린 정육각형의 둘레는 몇 cm인가?`,',
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
        "      `지름이 ${unitNum(d, \"cm\")} 인 원 안에 꼭 맞게 그린 정육각형의 둘레는 몇 cm인가? ${FIT_HEX}`,\n      num(6 * r),",
        "      `지름이 ${unitNum(d, \"cm\")} 인 원 안에 꼭 맞게 그린 정육각형의 둘레는 몇 cm인가? ${FIT_HEX}`,\n      num(6 * d),",
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
        ],
        "muts": G5_MUTS,
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
    which = sys.argv[1] if len(sys.argv) > 1 else "g3"
    target = TARGETS.get(which)
    if target is None:
        print(f"모르는 대상입니다: {which} — {' · '.join(TARGETS)}")
        return 2
    if not target["muts"]:
        print(f"«{which}» 변이 목록이 비어 있습니다. 채우기 전에는 판정하지 않습니다 —")
        print("빈 목록으로 「전부 빨강」을 찍으면 아무것도 증명하지 못합니다.")
        return 2

    path = os.path.join(ROOT, target["file"])
    # 복원은 **바이트**로 한다. 텍스트 모드로 되쓰면 Windows 가 LF 를 CRLF 로 바꿔
    # 「복원: 예」(텍스트 비교)가 참인데 **md5 는 달라진다** — 2026-08-23 g5 실행에서
    # 실제로 났다(HEAD 와 2,565줄 전부 줄끝만 다른 파일이 남았다). 변이 적용 중의
    # 임시 상태는 텍스트 쓰기여도 되지만, 원상은 반드시 원본 바이트 그대로 돌려놓는다.
    src_bytes = io.open(path, "rb").read()
    src = io.open(path, encoding="utf-8").read()
    if os.path.exists(PROBE_PATH):
        os.remove(PROBE_PATH)

    sections = target.get("sections") or [target["section"]]
    base = probe(target["grade"], sections)
    if not base.startswith("["):
        print("기준 산출물을 못 얻었습니다:", base[:400])
        return 1
    print(f"대상 {which} · 기준 산출물 {len(json.loads(base))}건\n")

    ok = True
    try:
        for name, before, after in target["muts"]:
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
            io.open(path, "w", encoding="utf-8").write(src.replace(before, after, 1))
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
                print(f"  {'RED  ' if code else 'GREEN'} {name}")
                for t in names[:3]:
                    print(f"        ↳ {t}")
                if code == 0:
                    print("        ← 시험이 못 잡는다")
                    ok = False
            io.open(path, "wb").write(src_bytes)
    finally:
        # 어떤 일이 있어도 되돌린다 — 변이가 남은 채 끝나면 그게 가장 나쁘다.
        io.open(path, "wb").write(src_bytes)
        if os.path.exists(PROBE_PATH):
            os.remove(PROBE_PATH)

    restored = io.open(path, "rb").read() == src_bytes
    print("\n" + ("모든 변이가 빨강" if ok else "빠진 변이가 있다"))
    print("복원:", "예" if restored else "**아니오 — 손으로 확인하라**")
    return 0 if (ok and restored) else 1


if __name__ == "__main__":
    sys.exit(main())

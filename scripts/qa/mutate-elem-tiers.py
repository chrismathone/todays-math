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
PROBE_PATH = os.path.join(ROOT, "scripts", "qa", ".mutate-elem-tiers.probe.ts")

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
  for (const tier of ELEM_TIERS) {
    for (const seed of [20260821, 7, 1234, 1, 2, 3]) {
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
]

TARGETS = {
    "g3": {
        "file": "src/lib/elementary/g3.ts",
        "test": "src/__tests__/unit/elementaryG3Tiers.test.ts",
        "grade": "초3",
        "section": "1-1-2",
        "muts": G3_MUTS,
    },
    # 변이가 1-1 셋과 1-6-3 에 걸쳐 있어 «sections» 로 전부 찍는다(g6 과 같은 까닭).
    # 시험은 두 트랜치(1-1·1-6)를 다 담은 elemTiersG5.test.ts 다 — 파일럿(1-6-2)의
    # elementaryG5Tiers.test.ts 는 변이 목록이 그 소단원을 안 물므로 여기서 안 부른다.
    "g5": {
        "file": "src/lib/elementary/g5.ts",
        "test": "src/__tests__/unit/elemTiersG5.test.ts",
        "grade": "초5",
        "sections": ["1-1-1", "1-1-2", "1-1-3", "1-2-4", "1-2-5", "1-2-6", "1-6-3"],
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
        ],
        "muts": G6_MUTS,
    },
}


def run(args: list[str]) -> tuple[int, str]:
    r = subprocess.run(args, capture_output=True, shell=True, cwd=ROOT)
    return r.returncode, r.stdout.decode("utf-8", "replace")


def probe(grade: str, sections: list[str]) -> str:
    ts = PROBE_TS.replace("__GRADE__", grade).replace(
        "__SECTIONS__", json.dumps(sections)
    )
    io.open(PROBE_PATH, "w", encoding="utf-8").write(ts)
    try:
        _, out = run(["npx", "tsx", PROBE_PATH])
        return out.strip()
    finally:
        if os.path.exists(PROBE_PATH):
            os.remove(PROBE_PATH)


def failed_tests(test_path: str) -> tuple[int, list[str]]:
    code, txt = run(["npx", "vitest", "run", test_path, "--reporter=json"])
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
            if io.open(path, encoding="utf-8").read() == src:
                print(f"  ??    {name}\n        ← 파일이 안 바뀌었다")
                ok = False
            elif probe(target["grade"], sections) == base:
                print(f"  ??    {name}\n        ← **산출물이 그대로다.** 판정하지 않는다")
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

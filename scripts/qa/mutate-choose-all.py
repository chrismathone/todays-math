# -*- coding: utf-8 -*-
"""「모두 고르시오 = 정답 2개」 규칙의 가드를 **망가뜨려 본다**.

    python scripts/qa/mutate-choose-all.py [번호 …]
    python scripts/qa/mutate-choose-all.py --list

가드는 그래야 가드인 줄 안다 — 「검사가 있다」는 「검사가 무언가를 지킨다」가 아니다.

판정은 **3단**이다(CLAUDE.md 2026-08-21):
  ⑴ 파일이 바뀌었나        — 치환이 실제로 먹었나
  ⑵ **산출물이 바뀌었나**   — `probe-choose-all.ts` 의 지문이 달라졌나
  ⑶ 그제서야 시험이 빨개지나

⑵ 를 건너뛰면 「뜻을 안 바꾸는 변이」가 «초록 ← 가드가 아니다» 로 찍혀
**멀쩡한 가드를 의심하고 고치러 간다** — 가드가 없는 것보다 나쁘다.

그리고 ⑶ 앞에 **㉠ 음성 대조**가 있다 — 변이를 넣기 **전에** 기준 시험이 초록인가.
초록이 아니면 판정을 **거부**한다(판정자가 «아니오»를 낼 수 있음을 회차마다 보인다).

⚠️ 리포터 이름을 손으로 적지 않는다. `--reporter=basic` 은 **vitest 4 에 없는 이름**이라
   러너가 기동 단계에서 죽고 종료 코드 1 이 된다 — 그러면 **모든 변이가 빨강**으로
   찍혀 판정자가 도장이 된다(2026-08-23). 기본 리포터로 돌린다.

## 이 스크립트는 대상 파일들을 덮어쓴다
시작할 때 `git status` 로 **미커밋 변경이 없는지 먼저 묻고**, 되돌리기는 git 이 아니라
**시작할 때 읽어 둔 바이트 그대로** 쓴다(2026-08-23: 복원을 `git show HEAD:` 로 짜서
커밋 안 된 수정을 통째로 덮은 전례가 있다). 돌아가는 동안 대상 파일을 편집하지 말 것.
"""

from __future__ import annotations

import io
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

RULE = os.path.join(ROOT, "src", "lib", "problem", "chooseAllRule.ts")
MID_GEN = os.path.join(ROOT, "src", "lib", "middle", "generate.ts")
ELEM_GEN = os.path.join(ROOT, "src", "lib", "elementary", "generate.ts")
SYSTEM = os.path.join(ROOT, "src", "lib", "middle", "m2System.ts")
RATIONAL = os.path.join(ROOT, "src", "lib", "middle", "m2Rational.ts")
FUNC = os.path.join(ROOT, "src", "lib", "middle", "m3Func.ts")
COUNT_RULE = os.path.join(ROOT, "src", "lib", "problem", "choiceCountRule.ts")
M2FUNC = os.path.join(ROOT, "src", "lib", "middle", "m2Func.ts")
M2LINE = os.path.join(ROOT, "src", "lib", "middle", "m2Line.ts")

TARGETS = [RULE, MID_GEN, ELEM_GEN, SYSTEM, RATIONAL, FUNC, COUNT_RULE, M2FUNC, M2LINE]
# 이 파일들을 지키는 시험 **전부**를 돌린다. 규칙 시험 하나만 돌리면 「보기 명제의
# 진리표」 같은 다른 축의 가드가 있는데도 «초록 ← 가드가 아니다» 로 찍힌다
# (2026-08-25 변이 [15] 가 실제로 그랬다 — 진리표는 middleM3Func 가 들고 있다).
TESTS = [
    "src/__tests__/unit/chooseAllRule.test.ts",
    "src/__tests__/unit/middleM3Func.test.ts",
    "src/__tests__/unit/middleM2NumProb.test.ts",
    "src/__tests__/unit/middleM2System.test.ts",
    "src/__tests__/unit/choiceCountRule.test.ts",
    "src/__tests__/unit/middleM2Func.test.ts",
    "src/__tests__/unit/middleM2Line.test.ts",
]

ENV = dict(os.environ, PYTHONIOENCODING="utf-8")

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def run(cmd: list[str]) -> tuple[int, str]:
    p = subprocess.run(
        cmd, cwd=ROOT, env=ENV, stdout=subprocess.PIPE, stderr=subprocess.STDOUT
    )
    return p.returncode, p.stdout.decode("utf-8", errors="replace")


def npx(*args: str) -> tuple[int, str]:
    exe = "npx.cmd" if os.name == "nt" else "npx"
    return run([exe, *args])


def fingerprint() -> tuple[int, str]:
    """산출물 지문 — **두 축**을 합친다.

    ⚠️ `probe-choose-all.ts` 하나로는 **표식 축을 못 본다.** 표식을 ㉠ 으로
       되돌려도 그 지문은 한 글자도 안 변한다 — 그 유형들은 「모두 몇 개인지
       구하시오」라 「모두 고르시오」 판정 **밖**이기 때문이다. 그러면 표식 변이가
       전부 «산출물이 그대로 — 판정 거부» 로 찍혀 **아무것도 못 잰다.**
       축이 없으면 변이시킬 수 없다 — 그래서 표식 지문을 따로 붙인다.
    """
    parts: list[str] = []
    for cmd in (
        ["tsx", "scripts/qa/probe-choose-all.ts"],
        ["tsx", "scripts/qa/census-choice-marks.ts", "--fingerprint"],
    ):
        code, out = npx(*cmd)
        if code != 0:
            return code, out
        parts.append(out.strip().splitlines()[-1])
    return 0, "+".join(parts)


# (제목, 파일, 찾을 것, 바꿀 것) — 각 변이는 «이 시험이 지키는 것 하나»를 겨눈다.
MUTATIONS: list[tuple[str, str, str, str]] = [
    (
        "판정기 — 「모두」 요구를 뺀다 (「옳지 않은 것을 고르시오」가 딸려 온다)",
        RULE,
        '  if (!/모두|모든/.test(stem)) return false;',
        '  if (false) return false;',
    ),
    (
        "판정기 — 「고를 보기가 둘 이상」 요구를 뺀다 (본문 밖 열쇠를 버린다)",
        RULE,
        "  return choiceLineCount(content) >= 2;",
        "  return true;",
    ),
    (
        "판정기 — 「모두」가 「고르」 앞이어야 한다는 순서를 버린다",
        RULE,
        "  if (all > pick) return false;",
        "  if (all > pick + 10000) return false;",
    ),
    (
        "판정기 — ㄱㄴㄷ 조합 보기를 가르지 않는다 (조합 하나를 고르는 «모두 고르면?» 이 정답 2개 규칙에 걸린다)",
        RULE,
        "  if (choicesAreLabelCombos(content)) return false;",
        "  if (false) return false;",
    ),
    (
        "판정기 — «모두 고른 것» 구절을 지우지 않는다 («…모두 고른 것을 고르시오» 가 걸린다)",
        RULE,
        '  const stem = stemOf(content).replace(COMBO_PICK_PHRASE, "▦");',
        "  const stem = stemOf(content);",
    ),
    (
        "규칙 상수 — 정답 개수를 3으로 바꾼다 (기대값이 제품에서 오면 초록이다)",
        RULE,
        "export const CHOOSE_ALL_ANSWER_COUNT = 2;",
        "export const CHOOSE_ALL_ANSWER_COUNT = 3;",
    ),
    (
        "정답 세기 — 표식 대신 쉼표 조각을 센다 (연립방정식 해가 «2개»가 된다)",
        RULE,
        "export function chooseAllAnswerCount(answer: string): number {\n"
        "  const marks = enclosedAnswerMarks(answer);\n"
        "  if (!marks) return UNCOUNTABLE;\n"
        "  return new Set(marks).size;\n"
        "}",
        "export function chooseAllAnswerCount(answer: string): number {\n"
        "  return answer.split(/[,、]/).filter((s) => s.trim().length > 0).length;\n"
        "}",
    ),
    (
        "관문 — 중등 엔진 진입점에서 호출을 지운다",
        MID_GEN,
        "  assertChooseAllAnswerCount(content, p.answer, `중등 유형 ${key}`);\n",
        "",
    ),
    (
        "관문 — 초등 엔진 진입점에서 호출을 지운다",
        ELEM_GEN,
        "  assertChooseAllAnswerCount(content, p.answer, `초등 ${p.grade} ${p.section}`);\n",
        "",
    ),
    (
        "부등식 01·06 · 연립 01 — 참의 개수를 다시 «씨앗이 고르게» 되돌린다",
        SYSTEM,
        "  const t = CHOOSE_ALL_ANSWER_COUNT;\n  if (yes.length < t",
        "  const t = intBetween(rng, 2, 4);\n  if (yes.length < t",
    ),
    (
        "부등식 04 — 참이 1~4개면 받던 옛 문턱으로 되돌린다",
        SYSTEM,
        "      if (t !== CHOOSE_ALL_ANSWER_COUNT) return null;",
        "      if (t < 1 || t > 4) return null;",
    ),
    (
        "연립 04 — 참의 개수를 씨앗이 고르게 되돌린다",
        SYSTEM,
        "      const t = CHOOSE_ALL_ANSWER_COUNT;\n      const flags = shuffle(rng, [",
        "      const t = intBetween(rng, 1, 3);\n      const flags = shuffle(rng, [",
    ),
    (
        "순환소수 17 — 「전부 참/전부 거짓만 거른다」로 되돌린다",
        RATIONAL,
        "      if (cnt !== CHOOSE_ALL_ANSWER_COUNT) return null;",
        "      if (cnt === 0 || cnt === 4) return null;",
    ),
    (
        "순환소수 18 — 참·거짓을 갈라 담지 않고 풀 전체에서 넷을 뽑는다",
        RATIONAL,
        "        ...shuffle(rng, trues)\n          .slice(0, need)",
        "        ...shuffle(rng, RATIONAL_FACT_POOL.map((_s, i) => ({ i })))\n"
        "          .slice(0, need)",
    ),
    (
        "이차함수 ⑴06 — 참·거짓을 갈라 담지 않고 아홉 중 다섯을 뽑는다",
        FUNC,
        "      const idx = chooseFivePropIndices(rng, props);\n"
        "      const flags = idx.map((i) => props[i]!.ok);\n"
        "      const count = flags.filter(Boolean).length;\n"
        "      return {\n"
        "        content: `이차함수 $y=${termTex(a, \"x^2\", true)}$",
        "      const idx = distinctIndices(rng, props.length, 5);\n"
        "      const flags = idx.map((i) => props[i]!.ok);\n"
        "      const count = flags.filter(Boolean).length;\n"
        "      return {\n"
        "        content: `이차함수 $y=${termTex(a, \"x^2\", true)}$",
    ),
    (
        "이차함수 ⑵06 — 참·거짓을 갈라 담지 않고 아홉 중 다섯을 뽑는다",
        FUNC,
        "      const idx = chooseFivePropIndices(rng, props);\n"
        "      const flags = idx.map((i) => props[i]!.ok);\n"
        "      const count = flags.filter(Boolean).length;\n"
        "      return {\n"
        "        content: `이차함수 $y=${genRhs(A, B, C)}$",
        "      const idx = distinctIndices(rng, props.length, 5);\n"
        "      const flags = idx.map((i) => props[i]!.ok);\n"
        "      const count = flags.filter(Boolean).length;\n"
        "      return {\n"
        "        content: `이차함수 $y=${genRhs(A, B, C)}$",
    ),
    (
        "이차함수 ⑴06 — 더한 거짓 명제 하나를 참으로 바꾼다 (거짓이 둘뿐인 구간이 생긴다)",
        FUNC,
        "        { text: `그래프는 점 $(1, 0)$을 지난다.`, ok: false },",
        "        { text: `그래프는 점 $(1, 0)$을 지난다.`, ok: true },",
    ),
    # ── 표식 축 (원장님 확정 2026-08-25 「보기번호는 바꾸고」) ──────────
    #
    # 이 여섯은 **개수 축과 다른 것**을 겨눈다. ㉠ 다섯 줄은 개수 관문을 통과하므로
    # 개수 시험만 있으면 여섯 다 초록이다 — 축이 있어야 변이시킬 수 있다.
    (
        "표식 SSOT — ①~⑤ 를 ㉠~㉤ 로 되돌린다 (지면이 보기로 안 읽는다)",
        COUNT_RULE,
        'export const CHOICE_MARKS = ["①", "②", "③", "④", "⑤"] as const;',
        'export const CHOICE_MARKS = ["㉠", "㉡", "㉢", "㉣", "㉤"] as const;',
    ),
    (
        "표식 관문 — 「파서가 같은 수를 읽나」 판정을 무력화한다",
        COUNT_RULE,
        "  const read = choiceCountOf(content);\n  if (read === m) return;",
        "  const read = choiceCountOf(content);\n  if (read === m || true) return;",
    ),
    # ⚠️ 아래 둘은 **지문이 못 보는 축**이다 — 지금은 어기는 유형이 하나도 없어서
    #    호출을 지워도 산출물이 한 글자도 안 변한다(2026-08-25 실측: 둘 다 «판정 거부»).
    #    그래서 배선은 `choiceCountRule.test.ts` 의 **텍스트 가드**가 지킨다.
    #    거부는 «가드가 없다»가 아니라 «이 도구로는 못 잰다»는 뜻이다 — 남겨 둔다.
    (
        "표식 관문 — 중등 엔진 진입점에서 호출을 지운다",
        MID_GEN,
        "  assertChoiceMarks(content, `중등 유형 ${key}`);\n",
        "",
    ),
    (
        "표식 관문 — 초등 엔진 진입점에서 호출을 지운다",
        ELEM_GEN,
        "  assertChoiceMarks(content, `초등 ${p.grade} ${p.section}`);\n",
        "",
    ),
    (
        "m2Func — 표식을 다시 **손으로** 적는다 (SSOT 를 안 읽는다)",
        M2FUNC,
        "const CIRCLED = CHOICE_MARKS;",
        'const CIRCLED = ["㉠", "㉡", "㉢", "㉣", "㉤"] as const;',
    ),
    (
        "m2Line — 표식을 다시 **손으로** 적는다 (SSOT 를 안 읽는다)",
        M2LINE,
        "const CIRCLED = CHOICE_MARKS;",
        'const CIRCLED = ["㉠", "㉡", "㉢", "㉣", "㉤"] as const;',
    ),
]


def main() -> int:
    args = [a for a in sys.argv[1:]]
    if "--list" in args:
        for i, (title, path, _o, _n) in enumerate(MUTATIONS, start=1):
            print("[%2d] %-14s %s" % (i, os.path.basename(path), title))
        return 0
    only = {int(a) for a in args if a.isdigit()}

    for path in TARGETS:
        code, out = run(["git", "status", "--porcelain", "--", path])
        if code != 0 or out.strip():
            print("멈춘다 — 대상 파일에 미커밋 변경이 있다. 이 스크립트는 그 파일을")
            print("덮어쓴다: 먼저 커밋하거나 되돌려라.\n" + out)
            return 2

    original = {path: io.open(path, "rb").read() for path in TARGETS}

    code, base_out = fingerprint()
    if code != 0:
        print("기준 지문을 못 얻었다:\n" + base_out)
        return 2
    baseline = base_out
    print("기준 지문 " + baseline[:16] + "…")

    # ㉠ 음성 대조 — 이 도구가 «초록»을 낼 수 있음을 회차마다 구성으로 증명한다.
    code, _ = npx("vitest", "run", *TESTS, "--pool=threads")
    if code != 0:
        print("멈춘다 — **기준 시험이 이미 빨갛다.** 변이 판정이 무의미하다.")
        return 2
    print("기준 시험 초록\n")

    verdicts: list[tuple[str, str]] = []
    try:
        for i, (title, path, old, new) in enumerate(MUTATIONS, start=1):
            if only and i not in only:
                continue
            text = original[path].decode("utf-8")
            crlf = "\r\n" in text
            probe_old = old.replace("\n", "\r\n") if crlf else old
            probe_new = new.replace("\n", "\r\n") if crlf else new
            n = text.count(probe_old)
            if n != 1:
                verdicts.append((title, "⚠️  앵커 %d개 — 판정 불가" % n))
                print("[%d] %s\n    ⚠️  앵커가 %d개다. 포맷이 줄을 합쳤을 수 있다." % (i, title, n))
                continue
            io.open(path, "wb").write(text.replace(probe_old, probe_new).encode("utf-8"))
            # ⑴ 파일이 바뀌었나
            if io.open(path, "rb").read() == original[path]:
                verdicts.append((title, "⚠️  파일이 안 바뀜 — 판정 불가"))
                continue
            # ⑵ 산출물이 바뀌었나
            code, digest = fingerprint()
            if code != 0:
                digest = "PROBE-FAIL"
            if digest == baseline:
                verdicts.append((title, "⚠️  산출물이 그대로 — 판정 거부"))
                print("[%d] %s\n    ⚠️  뜻이 안 바뀌었다. 이 변이로는 아무것도 못 잰다." % (i, title))
                io.open(path, "wb").write(original[path])
                continue
            # ⑶ 시험이 빨개지나
            code, _ = npx("vitest", "run", *TESTS, "--pool=threads")
            mark = "🔴 빨강 ← 가드가 산다" if code != 0 else "🟢 초록 ← 가드가 아니다"
            verdicts.append((title, mark))
            print("[%d] %s\n    %s" % (i, title, mark))
            io.open(path, "wb").write(original[path])
    finally:
        for path in TARGETS:
            io.open(path, "wb").write(original[path])

    print("\n── 판정 ──")
    for title, mark in verdicts:
        print("  %s  %s" % (mark, title))
    bad = [v for v in verdicts if not v[1].startswith("🔴")]
    print("\n%d개 중 빨강 %d개" % (len(verdicts), len(verdicts) - len(bad)))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())

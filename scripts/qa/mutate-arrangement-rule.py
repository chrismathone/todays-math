# -*- coding: utf-8 -*-
"""「배치가 정해지는가」 판정의 **가드를 망가뜨려 본다**.

    python scripts/qa/mutate-arrangement-rule.py          # 전량
    python scripts/qa/mutate-arrangement-rule.py --list    # 변이 목록만

가드는 망가뜨려 봐야 가드인 줄 안다(CLAUDE.md 2026-08-18). 판정 순서는 이 저장소의
`mutate-one.py` 와 **같다**:

  ㉠ **음성 대조** — 변이를 넣기 **전에** 시험이 초록인가. 아니면 판정을 거부한다.
     (이게 없으면 「늘 빨강」인 도장이 「가드가 문다」로 읽힌다 — 2026-08-23 실제 사고.)
  ⑴ 앵커가 **정확히 하나**인가 — 아니면 판정 거부(조용히 0건 치환하지 않는다)
  ⑵ 파일이 바뀌었나 — 안 바뀌면 치환 실패다(따옴표·역슬래시가 흔한 범인)
  ⑶ **판정이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 「가드가 아니다」가 거짓말이 된다
  ⑷ 그제서야 시험이 빨개지나

⑶ 은 `--selftest` 로 잰다: 눈금 열 줄의 판정이 하나라도 달라져야 «뜻이 바뀐 변이»다.

⚠️ 리포터 이름을 손으로 적지 않는다. `--reporter=basic` 은 **vitest 4 에 없는 이름**이라
   러너가 기동 단계에서 죽고 종료 코드 1 이 되어 **모든 변이가 빨강**으로 찍힌다
   (2026-08-23). 여기서는 기본 리포터를 쓰고, 빨간데 **실패한 시험 이름을 못 대면**
   판정을 거부한다 — 그 옛 결함의 모양 그 자체다.

⚠️ 대상 파일이 **커밋돼 있어야** 돌린다. 이 도구는 파일을 덮어쓰고 되돌리는데,
   되돌리는 기준이 「시작할 때 읽어 둔 바이트」다. 미커밋 수정이 있으면 먼저 멈춘다
   (2026-08-23 에 복원이 미커밋 수정을 통째로 먹은 전례가 있다).
"""
from __future__ import annotations

import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RULE = os.path.join(ROOT, "src", "lib", "figure", "arrangementRule.ts")
TEST = "src/__tests__/unit/arrangementRule.test.ts"

# (이름, 찾을 것, 바꿀 것) — 전부 «지키려는 성질 그 자체»를 건드린다.
MUTATIONS = [
    (
        "라벨 둘을 안 본다 (셋을 요구)",
        "if (labels.length < 2) return [];",
        "if (labels.length < 3) return [];",
    ),
    (
        "수식 명령을 안 지운다 (\\square AEFD 를 놓친다)",
        'const stripped = content.replace(/\\\\[A-Za-z]+/g, " ");',
        "const stripped = content;",
    ),
    (
        "글자 나눠 쓰기를 안 따진다 (아무 라벨 둘이면 얽힘)",
        "return shares.length >= 2 ? shares : [];",
        "return labels.length >= 2 ? labels : [];",
    ),
    (
        "길·폭 얽힘을 뺀다 (J30303-A06-001 을 놓친다)",
        "|길을\\s*내|길의|폭이|",
        "|",
    ),
    (
        "「십자 모양」 고정을 뺀다 (형제 대조가 무너진다)",
        "|십자\\s*모양|",
        "|",
    ),
    (
        "「가로 방향과 세로 방향」 고정을 뺀다",
        "|가로\\s*방향과\\s*세로\\s*방향|",
        "|",
    ),
    (
        "단서절 `(단, …)` 고정을 뺀다",
        "/\\(\\s*단[,，]|",
        "/(?!)|",
    ),
    (
        "얽힘을 아예 안 본다 (전부 얽힘없음)",
        "const entangled = ENTANGLED.test(c) || sharedVertexShapes(c).length > 0;",
        "const entangled = false;",
    ),
    (
        "고정을 아예 안 본다 (얽히면 전부 배치미정)",
        'return PINNED.test(c) ? "배치확정" : "배치미정";',
        'return "배치미정";',
    ),
]


def run(cmd: list[str]) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace")


def selftest_signature() -> str | None:
    """눈금 열 줄의 판정만 뽑는다. 못 돌면 None."""
    p = run(["node", "node_modules/tsx/dist/cli.mjs", "scripts/qa/probe-figure-dependent.ts", "--selftest"])
    if p.returncode not in (0, 1):
        return None
    lines = [l for l in p.stdout.splitlines() if "→" in l]
    return "\n".join(lines) if lines else None


def vitest() -> tuple[bool, list[str]]:
    """(초록인가, 실패한 시험 이름들). 리포터 이름은 손으로 적지 않는다."""
    out = os.path.join(ROOT, ".probe", "mutate-vitest.json")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    p = run([
        "node", "node_modules/vitest/vitest.mjs", "run", TEST,
        "--reporter=json", "--outputFile=" + out,
    ])
    names: list[str] = []
    try:
        with open(out, encoding="utf-8") as f:
            data = json.load(f)
        for res in data.get("testResults", []):
            for a in res.get("assertionResults", []):
                if a.get("status") == "failed":
                    names.append(a.get("fullName") or a.get("title") or "?")
    except Exception:
        pass
    return p.returncode == 0, names


def main() -> int:
    if "--list" in sys.argv:
        for i, (name, _, _) in enumerate(MUTATIONS):
            print(f"  {i}. {name}")
        return 0

    # 미커밋 수정이 있으면 멈춘다 — 되돌리기가 남의 것을 확정하면 안 된다.
    st = run(["git", "status", "--porcelain", "--", "src/lib/figure/arrangementRule.ts"])
    if st.stdout.strip():
        print("🔴 대상 파일에 커밋 안 된 수정이 있다 — 먼저 커밋하라.\n   " + st.stdout.strip())
        return 2

    original = open(RULE, "rb").read()
    text = original.decode("utf-8")

    # ㉠ 음성 대조 — 변이 **전에** 초록인가.
    base_ok, base_fail = vitest()
    base_sig = selftest_signature()
    if not base_ok:
        print("🔴 기준 시험이 이미 빨갛다 — **판정을 거부한다.** 먼저 초록으로 만들어라.")
        for n in base_fail:
            print("   ↳ " + n)
        return 2
    if base_sig is None:
        print("🔴 눈금을 못 읽었다 — 판정을 거부한다.")
        return 2
    print("🟢 음성 대조 통과 — 이 명령이 방금 초록을 냈다. 도장이 아니다.\n")

    verdicts = []
    for name, find, repl in MUTATIONS:
        n = text.count(find)
        if n != 1:  # ⑴ 앵커가 정확히 하나
            print(f"⚪ 판정 거부 — 앵커가 {n}개다: {name}")
            verdicts.append((name, "거부"))
            continue
        mutated = text.replace(find, repl, 1)
        if mutated == text:  # ⑵ 파일이 바뀌었나
            print(f"⚪ 판정 거부 — 치환이 헛돌았다: {name}")
            verdicts.append((name, "거부"))
            continue
        open(RULE, "wb").write(mutated.encode("utf-8"))
        try:
            sig = selftest_signature()
            if sig is None or sig == base_sig:  # ⑶ 판정이 바뀌었나
                print(f"⚪ 판정 거부 — 파일은 바뀌었는데 **판정이 그대로다**: {name}")
                verdicts.append((name, "거부"))
                continue
            ok, fails = vitest()  # ⑷ 시험이 빨개지나
            if ok:
                print(f"🟢 초록 ← **가드가 아니다**: {name}")
                verdicts.append((name, "초록"))
            elif not fails:
                print(f"⚪ 판정 거부 — 빨간데 실패한 시험을 못 댄다(러너가 죽었나): {name}")
                verdicts.append((name, "거부"))
            else:
                print(f"🔴 빨강 ← 가드가 문다: {name}")
                for f in fails[:3]:
                    print("     ↳ " + f)
                verdicts.append((name, "빨강"))
        finally:
            open(RULE, "wb").write(original)  # 되돌리기는 **시작할 때 읽어 둔 바이트**로

    red = sum(1 for _, v in verdicts if v == "빨강")
    green = sum(1 for _, v in verdicts if v == "초록")
    refused = sum(1 for _, v in verdicts if v == "거부")
    print(f"\n빨강 {red} · 초록 {green} · 판정거부 {refused} / 전체 {len(MUTATIONS)}")
    return 0 if green == 0 and refused == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

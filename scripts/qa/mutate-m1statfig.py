"""변이 시험 — 중1 통계 **그림 유형**(`m1StatFig.ts`). 3단으로 판정한다.

  ⑴ 파일이 바뀌었나  ⑵ **산출물이 바뀌었나**  ⑶ 그제서야 시험이 빨개지나

여기서 지키려는 것은 **물결 2D 계약**이다 — 그림과 발문이 같은 수를 말하는가.
그래서 변이의 절반은 「그림만 슬쩍 어긋나게」 하는 것이다. 발문·정답·해설은
그대로인데 `figureSpec` 만 틀리면, 계약을 안 보는 시험은 **전부 초록**이다.

되돌리기는 시작할 때 읽어 둔 바이트 그대로. 시작 전에 대상 파일이 커밋돼
있는지 확인한다(`git show HEAD:` 로 짜면 커밋 안 된 수정을 덮는다).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src/lib/middle/m1StatFig.ts"
TESTS = [
    "src/__tests__/unit/middleM1StatFig.test.ts",
    "src/__tests__/unit/middleTypeCoverage.test.ts",
]

# (이름, 무엇을 지키는 가드인가, 찾을 것, 바꿀 것, 몇 군데)
MUTATIONS = [
    (
        "F1 그림의 계급을 한 칸 밀어 놓는다",
        "facts ↔ figureSpec 계급 대조",
        "classes: classesOf(t.lo, t.w, values.length),",
        "classes: classesOf(t.lo + t.w, t.w, values.length),",
        1,
    ),
    (
        "F2 그림의 도수만 뒤집는다 (발문·정답은 그대로)",
        "facts ↔ figureSpec 도수 대조",
        "    values: [...values],",
        "    values: [...values].reverse(),",
        1,
    ),
    (
        "F3 찢긴 계급을 그림에서 옆으로 옮긴다",
        "hidden 이 facts.h 와 같은가",
        "hidden: [h],",
        "hidden: [h + 1 < n - 1 ? h + 1 : h - 1],",
        1,
    ),
    (
        "F4 줄기와 잎의 잎을 가운데 정렬로",
        "align 은 왼쪽 정렬이어야 한다",
        '["center", "left"],',
        '["center", "center"],',
        1,
    ),
    (
        "F5 찢긴 표의 빈 칸에 값을 적어 버린다",
        "찢긴 칸은 비어 있어야 한다",
        '[bandShort(t.lo, t.w, i + 1), "", dec(p2)],',
        "[bandShort(t.lo, t.w, i + 1), String(d2), dec(p2)],",
        1,
    ),
    (
        "F6 facts 의 계급 개수를 하나 줄인다",
        "unpack 이 f0..f{n-1} 을 전부 찾는다",
        "  out.n = values.length;",
        "  out.n = values.length - 1;",
        1,
    ),
    (
        "F7 다각형의 계급 수를 봉투 밖으로 올린다",
        "실제 엔진 렌더 — 가로 눈금이 겹치면 던진다",
        "      // 다각형은 양끝에 계급이 하나씩 더 붙어 가로 눈금이 촘촘하다 — 5개까지.\n"
        "      const n = intBetween(rng, 4, 5);",
        "      const n = intBetween(rng, 6, 7);",
        1,
    ),
    (
        "F8 상대도수 쏠림 상한을 없앤다",
        "한 계급이 지면을 다 먹지 않는다",
        "  if (max > 50) return null;",
        "  if (max > 100) return null;",
        1,
    ),
]


def sh(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", shell=True
    )


def digest() -> str:
    r = sh(["npx", "tsx", "scripts/qa/m1statfig-digest.ts"])
    if r.returncode != 0:
        return f"DIGEST-FAILED:{r.returncode}:{r.stderr[-400:]}"
    return r.stdout.strip().splitlines()[-1]


def run_tests() -> bool:
    return sh(["npx", "vitest", "run", *TESTS]).returncode == 0


def main() -> int:
    dirty = sh(["git", "status", "--porcelain", "--", str(SRC.relative_to(ROOT))])
    if dirty.stdout.strip():
        print("STOP: 대상 파일에 커밋 안 된 수정이 있다 — 이 스크립트는 그 파일을 덮어쓴다")
        print(dirty.stdout)
        return 2

    original = SRC.read_bytes()
    print(f"원본 {len(original)} bytes")
    base = digest()
    print(f"기준 지문 {base[:16]}...")
    if base.startswith("DIGEST-FAILED"):
        print("STOP: 기준 지문을 못 냈다")
        return 2
    if not run_tests():
        print("STOP: 기준 시험이 이미 빨갛다")
        return 2
    print("기준 시험 초록 OK\n")

    verdicts: list[tuple[str, str]] = []
    try:
        for name, guards, find, repl, want in MUTATIONS:
            text = original.decode("utf-8")
            n = text.count(find)
            if n != want:
                verdicts.append((name, f"[X] 앵커가 {n}군데 (기대 {want}) — 판정 불가"))
                continue
            mutated = text.replace(find, repl).encode("utf-8")
            if mutated == original:
                verdicts.append((name, "[X] 파일이 안 바뀜 — 판정 불가"))
                continue
            SRC.write_bytes(mutated)

            d = digest()
            if d == base:
                verdicts.append((name, "[X] 산출물이 그대로 — 무효한 변이, 판정 불가"))
                SRC.write_bytes(original)
                continue

            green = run_tests()
            verdicts.append(
                (name, ("[GREEN] 가드가 아니다" if green else "[RED] 빨강 OK") + f"  [{guards}]")
            )
            SRC.write_bytes(original)
    finally:
        SRC.write_bytes(original)
        assert SRC.read_bytes() == original, "복원 실패 — 손으로 되돌릴 것"

    print("\n-- 판정 ---------------------------------")
    for name, v in verdicts:
        print(f"{v}\n    {name}")
    red = sum(1 for _, v in verdicts if v.startswith("[RED]"))
    print(f"\n빨강 {red} / {len(MUTATIONS)}")
    print("복원 확인:", SRC.read_bytes() == original)
    return 0 if red >= 3 else 1


if __name__ == "__main__":
    sys.exit(main())

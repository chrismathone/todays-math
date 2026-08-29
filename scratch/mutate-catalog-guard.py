"""색인 가드 변이 시험 — 「이 가드가 «아니오» 를 낼 수 있는가」.

순서는 이 저장소가 값을 치르고 배운 그대로다:
  ⑴ 대상이 커밋돼 있나 (이 스크립트는 대상을 덮어쓴다)
  ⑵ **음성 대조** — 변이를 넣기 전에 초록인가 (아니면 판정을 거부한다)
  ⑶ 파일이 정말 바뀌었나
  ⑷ 그제서야 빨개지나

쓰기:  python scratch/mutate-catalog-guard.py
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = "src/__tests__/unit/middleTypeCoverage.test.ts"
TOUCHED = [
    TARGET,
    "src/lib/middle/m2Center.ts",
    "src/lib/middle/m2Func.ts",
]

# 정본에 실제로 있는 값 — 손으로 적지 않고 색인에서 읽는다.
CATALOG = json.loads((ROOT / "scripts/rpm/rpm-type-catalog.json").read_text("utf-8"))
SIM = [t for t in CATALOG["2-2"]["types"] if t["minor"] == "도형의 닮음"]
SIM_MAX = max(int(t["number"]) for t in SIM)
SIM_TITLE = SIM[0]["title"]

# m2Func 의 중단원 상수 한 줄 — 얇은 공백이 들어 있는 바로 그 줄.
THIN_LINE = 'const MINOR_G1 = "일차함수와 그 그래프  ⑴";'


def verdict() -> str:
    """RED / GREEN — 「N passed」가 아니라 실패 **개수**로 판정한다.

    ⚠️ `numFailedTests` 만 보면 **눈이 먼다.** 유형 키가 겹치면 `generate.ts` 가
       모듈을 읽는 자리에서 던지므로 시험이 **하나도 안 돌고** 스위트가 통째로
       실패한다 — 그때 `numFailedTests` 는 **0** 이다. 실제로 이 하네스가 변이 ⑶ 을
       「🟢 초록 ← 가드가 아니다」로 찍었고, 손으로 같은 변이를 넣어 보고서야
       「유형 키가 겹칩니다: 2-2|도형의 닮음|15」가 드러났다. 판정자가 «아니오» 를
       못 내는 자리가 여기였다(2026-08-23 «도장» 과 같은 부류).
    """
    out = subprocess.run(
        ["npx", "vitest", "run", TARGET, "--reporter=json"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=True,
    ).stdout
    i = out.find("{")
    if i < 0:
        return "??출력없음"
    try:
        j = json.loads(out[i:])
    except json.JSONDecodeError:
        return "??JSON아님"
    failed = j.get("numFailedTests", 0) + j.get("numFailedTestSuites", 0)
    if failed > 0:
        return "RED"
    # 「빨간데 근거를 못 댄다」의 뒷면 — 초록인데 **아무것도 안 돌았으면** 초록이 아니다.
    if j.get("numTotalTests", 0) == 0:
        return "??아무것도안돌았다"
    return "GREEN"


def mutate(rel: str, old: str, new: str, name: str) -> None:
    p = ROOT / rel
    before = p.read_bytes()  # ⑶ 복원은 **시작할 때 읽어 둔 바이트 그대로**
    s = before.decode("utf-8")
    if s.count(old) != 1:
        print(f"   {name}: 🛑 닻이 {s.count(old)}번 — 변이를 못 넣는다")
        return
    p.write_bytes(s.replace(old, new).encode("utf-8"))
    try:
        if p.read_bytes() == before:
            print(f"   {name}: 🛑 파일이 안 바뀌었다 — 판정 거부")
            return
        r = verdict()
    finally:
        p.write_bytes(before)
    if r == "RED":
        print(f"   {name}: 🔴 가드가 문다")
    else:
        print(f"   {name}: 🟢 {r} ← 가드가 아니다")


def main() -> int:
    dirty = subprocess.run(
        ["git", "status", "--porcelain", "--", *TOUCHED],
        cwd=ROOT,
        capture_output=True,
        text=True,
        shell=True,
    ).stdout.strip()
    if dirty:
        print("🛑 대상에 미커밋 수정이 있다 — 이 스크립트는 대상을 덮어쓴다")
        print(dirty)
        return 2

    print("== 음성 대조 (변이 전) ==")
    base = verdict()
    print(f"   {base}")
    if base != "GREEN":
        print("🛑 기준이 이미 빨갛다 — 판정할 수 없다")
        return 2

    print("== 변이 ==")
    # ⑴ 중단원 이름의 얇은 공백(U+2009)을 보통 공백으로 — 이 가드가 실제로 잡았던 결함.
    mutate(
        "src/lib/middle/m2Func.ts",
        # 얇은 공백(U+2009)은 눈에 안 보인다 — 리터럴이 아니라 이스케이프로 적는다.
        THIN_LINE,
        THIN_LINE.replace(" ", " "),
        "⑴ 중단원 이름의 얇은 공백을 보통 공백으로",
    )
    # ⑵ 색인에 있는 번호의 제목을 바꾼다.
    mutate(
        "src/lib/middle/m2Center.ts",
        'def(MINOR_CIRC, "01", "삼각형의 외심"',
        'def(MINOR_CIRC, "01", "삼각형의 외심 (변이)"',
        "⑵ 색인 번호의 제목을 바꾼다",
    )
    # ⑶ 확장 번호를 색인 번호대(최대 SIM_MAX) 안으로 내린다.
    mutate(
        "src/lib/middle/m2Center.ts",
        'MINOR_SIMILAR,\n    "70",',
        f'MINOR_SIMILAR,\n    "{SIM_MAX:02d}",',
        f"⑶ 확장 번호를 색인 번호대(≤{SIM_MAX}) 안으로",
    )
    # ⑷ 확장 유형의 제목을 색인에 이미 있는 제목으로 — 같은 유형을 두 번 세는 모양.
    mutate(
        "src/lib/middle/m2Center.ts",
        '"닮은 도형의 대응변"',
        f'"{SIM_TITLE}"',
        "⑷ 확장 제목을 색인 제목과 같게",
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())

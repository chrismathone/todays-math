# -*- coding: utf-8 -*-
"""변이 — 소재를 안 지우면 음성 대조가 갈라지는가.

    python scripts/qa/mutate-elem-stem-frame.py

판정 3단 (2026-08-21): ⑴ 파일이 바뀌었나 ⑵ 산출물이 바뀌었나 ⑶ 시험이 빨개지나.
음성 대조: 변이를 넣기 전에 시험이 초록이어야 한다. 아니면 판정 거부.
원복은 시작 때 읽은 바이트 그대로. 대상이 더럽으면 멈춘다.
"""
from __future__ import annotations

import hashlib
import io
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(REPO, "src", "lib", "elementary", "stemFrame.ts")
TEST = "src/__tests__/unit/elemStemFrame.test.ts"
ANCHOR = "s = s.replace(re, \"\\u25c7\");"
# U+25C7 is ◇. Source file uses the character; we match the replace call.
ANCHOR2 = 's = s.replace(re, "◇");'


def run(cmd: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        cmd, cwd=REPO, capture_output=True, text=True, shell=True, encoding="utf-8", errors="replace"
    )


def probe() -> str:
    path = os.path.join(REPO, "scripts", "qa", f"__stem_probe.{os.getpid()}.ts")
    io.open(path, "w", encoding="utf-8", newline="").write(
        "import { sameStemFrame } from '../../src/lib/elementary/stemFrame';\n"
        "const a = '막대그래프로 나타내시오. 수영과 달리기';\n"
        "const b = '막대그래프로 나타내시오. 줄넘기와 수영';\n"
        "console.log(String(sameStemFrame(a, b, ['수영','달리기','줄넘기'])));\n"
    )
    try:
        p = run(f"npx tsx {path}")
        out = (p.stdout or "").strip() + (p.stderr or "")
        if p.returncode != 0:
            raise SystemExit("표본이 실패했다 — 판정하지 않는다:\n" + out[:600])
        return (p.stdout or "").strip()
    finally:
        if os.path.exists(path):
            os.unlink(path)


def main() -> int:
    dirty = run('git status --porcelain -- "' + TARGET.replace("\\", "/") + '"').stdout.strip()
    # 미추적은 이번 회차가 만든 새 파일. 덮어쓸 커밋본이 없다. 수정(M)만 멈춘다.
    if dirty and not dirty.startswith("??"):
        print("멈춘다 — 대상 파일에 커밋 안 된 수정이 있다:")
        print(" ", dirty)
        return 2

    original = io.open(TARGET, "rb").read()
    before_probe = probe()
    print("기준 산출물:", before_probe)
    if before_probe != "true":
        print("⛔ 음성 대조 실패 — 변이 전에 소재를 같은 틀로 안 본다. 판정 거부")
        return 2

    text = original.decode("utf-8")
    if ANCHOR2 not in text:
        print("⛔ 앵커를 못 찾았다 — 판정 거부")
        return 2
    mutated = text.replace(ANCHOR2, 's = s.replace(re, theme);', 1)
    if mutated == text:
        print("⛔ 파일이 안 바뀌었다 — 판정 거부")
        return 2
    io.open(TARGET, "w", encoding="utf-8", newline="").write(mutated)
    try:
        after_md5 = hashlib.md5(io.open(TARGET, "rb").read()).hexdigest()
        before_md5 = hashlib.md5(original).hexdigest()
        print("⑴ 파일", "바뀜" if after_md5 != before_md5 else "그대로")
        after_probe = probe()
        print("⑵ 산출물", before_probe, "→", after_probe)
        if after_probe == before_probe:
            print("⛔ 산출물이 그대로다 — 가드가 아니다. 판정 거부")
            return 2
        t = run(f"npx vitest run {TEST}")
        red = t.returncode != 0
        print("⑶ 시험", "RED" if red else "GREEN", "code", t.returncode)
        if red:
            print("🟢 가드가 문다 — 소재를 안 지우면 음성 대조가 빨개진다")
            return 0
        print("🔴 시험이 초록 — 가드가 아니다")
        return 1
    finally:
        io.open(TARGET, "wb").write(original)


if __name__ == "__main__":
    sys.exit(main())

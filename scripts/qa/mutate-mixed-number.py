# -*- coding: utf-8 -*-
"""변이 시험 — 「가분수 → 대분수」 규칙을 **되살려** 가드가 빨개지는지 본다.

    python scripts/qa/mutate-mixed-number.py

## 판정은 3단이다 (2026-08-21 교훈)

  ⑴ 파일이 바뀌었나  ⑵ **산출물이 바뀌었나**  ⑶ 그제서야 시험이 빨개지나

⑵ 를 건너뛰면 「가드가 아니다」가 거짓말이 된다 — 이 저장소에서 실제로 두 번 났다.
여기서 산출물은 **제품 전처리를 실제로 돌린 결과**다.

## 되돌리기

시작할 때 읽어 둔 **바이트 그대로** 되돌린다. `git show HEAD:` 로 되돌리면 커밋 안 된
수정을 덮는다(2026-08-23). 그리고 시작 전에 대상 파일이 깨끗한지 먼저 묻는다 —
이 스크립트는 그 파일을 덮어쓴다.
"""
from __future__ import annotations

import hashlib
import io
import os
import subprocess
import sys

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(REPO, "src", "lib", "math", "textPreprocess.ts")
TEST = "src/__tests__/unit/mixedNumberPolicy.test.ts"
B = chr(92)

PROBE = (
    "import { preprocessMathText } from " + chr(34) + "../../src/lib/math/textPreprocess"
    + chr(34) + ";" + chr(10)
    + "console.log(preprocessMathText(String.raw" + chr(96) + "$" + B + "dfrac{4}{3}$ $"
    + B + "dfrac{355}{5}=71$" + chr(96) + "));" + chr(10)
)

# 되살릴 규칙 — 옛 구현과 같은 뜻으로 최소한만 적는다(git: aed9b430).
# 옛 규칙의 정규식을 **바이트로 조립**한다 — 역슬래시를 손으로 세면 층마다 틀린다.
# TS 소스에 이렇게 들어가야 한다:  /(-?)\\d?frac\{(\d{1,4})\}\{(\d{1,4})\}/g
RE = (
    "/(-?)" + B + B + "d?frac" + B + "{(" + B + "d{1,4})" + B + "}"
    + B + "{(" + B + "d{1,4})" + B + "}/g"
)

RULE_FN = (
    "const improperToMixed = (math: string): string =>" + chr(10)
    + "  math.replace(" + RE + ", (full, sign, a, b) => {" + chr(10)
    + "    const num = parseInt(a, 10), den = parseInt(b, 10);" + chr(10)
    + "    if (!den || num < den) return full;" + chr(10)
    + "    const w = Math.floor(num / den), r = num % den;" + chr(10)
    + "    return r === 0 ? `${sign}${w}` : `${sign}${w}" + B + B + "frac{${r}}{${den}}`;" + chr(10)
    + "  });" + chr(10) + chr(10)
)

ANCHOR_FN = "const splitMultiLetterBoxed"
ANCHOR_CALL = "  s = splitMultiLetterBoxed(s);"
CALL = "  s = improperToMixed(s);" + chr(10)


def run(cmd: str) -> subprocess.CompletedProcess[str]:
    # Windows 에서 `npx` 는 `.cmd` 라 shell 없이는 못 찾는다.
    return subprocess.run(
        cmd, cwd=REPO, capture_output=True, text=True, shell=True, encoding="utf-8", errors="replace"
    )


def probe() -> str:
    path = os.path.join(REPO, "scripts", "qa", "__mixed_probe.ts")
    io.open(path, "w", encoding="utf-8", newline="").write(PROBE)
    try:
        p = run("npx tsx scripts/qa/__mixed_probe.ts")
        out = (p.stdout or "") + (p.stderr or "")
        if p.returncode != 0 or "Error" in out:
            # 표본이 죽으면 «산출물이 바뀌었나»가 트레이스백끼리 견주는 일이 된다
            # (2026-08-23 실제로 그렇게 «가드가 아니다» 가 찍혔다).
            raise SystemExit("표본이 실패했다 — 판정하지 않는다:" + chr(10) + out[:600])
        return out
    finally:
        if os.path.exists(path):
            os.unlink(path)


def main() -> int:
    dirty = run("git status --porcelain -- " + chr(34) + TARGET + chr(34)).stdout.strip()
    if dirty:
        print("멈춘다 — 대상 파일에 커밋 안 된 수정이 있다. 이 스크립트는 그 파일을 덮어쓴다:")
        print(" ", dirty)
        return 2

    original = io.open(TARGET, "rb").read()
    md5_before = hashlib.md5(original).hexdigest()
    out_before = probe()
    print("기준 산출물:", out_before.strip()[:120])

    text = original.decode("utf-8")
    assert text.count(ANCHOR_FN) >= 1 and text.count(ANCHOR_CALL) == 1
    mutated = text.replace(ANCHOR_FN, RULE_FN + ANCHOR_FN, 1)
    mutated = mutated.replace(ANCHOR_CALL, CALL + ANCHOR_CALL, 1)

    ok = False
    try:
        io.open(TARGET, "wb").write(mutated.encode("utf-8"))
        # ⑴ 파일이 바뀌었나
        if hashlib.md5(io.open(TARGET, "rb").read()).hexdigest() == md5_before:
            print("판정 안 함 — 파일이 안 바뀌었다")
            return 3
        # ⑵ 산출물이 바뀌었나
        out_after = probe()
        print("변이 산출물:", out_after.strip()[:120])
        if out_after.strip() == out_before.strip():
            print("판정 안 함 — **산출물이 그대로다**. 변이가 뜻을 안 바꿨다")
            return 3
        # ⑶ 시험이 빨개지나
        p = run("npx vitest run " + TEST)
        red = p.returncode != 0
        print(("🔴 빨강 — 가드가 산다" if red else "🟢 초록 ← 가드가 아니다"))
        ok = red
    finally:
        io.open(TARGET, "wb").write(original)
        assert hashlib.md5(io.open(TARGET, "rb").read()).hexdigest() == md5_before, "되돌리기 실패"
        print("되돌림 (md5 일치)")
    return 0 if ok else 1


sys.exit(main())

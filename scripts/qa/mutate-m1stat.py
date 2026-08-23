"""변이 시험 — 3단으로 판정한다.

  ⑴ 파일이 바뀌었나  ⑵ **산출물이 바뀌었나**  ⑶ 그제서야 시험이 빨개지나

⑵ 를 건너뛰면 「무효한 변이」가 «초록 ← 가드가 아니다» 로 찍혀서
멀쩡한 가드를 의심하고 고치러 가게 된다 (2026-08-21 교훈).

되돌리기는 **시작할 때 읽어 둔 바이트 그대로** 쓴다 — `git show HEAD:` 로 짜면
커밋 안 된 수정을 덮는다 (2026-08-23 교훈). 그래서 시작 전에 대상 파일이
커밋돼 있는지도 확인한다.
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "src/lib/middle/m1Stat.ts"
TESTS = [
    "src/__tests__/unit/middleM1Stat.test.ts",
    "src/__tests__/unit/middleTypeCoverage.test.ts",
]

# 역슬래시는 **바이트로 조립**한다 — 도구·셸 층이 한 겹 벗겨 가면
# 앵커가 조용히 0군데가 되고, 그러면 판정이 아니라 «판정 불가» 가 된다.
BS2 = bytes([92, 92]).decode()  # TS 소스에 글자 그대로 있는 `\\`

# (이름, 무엇을 지키는 가드인가, 찾을 것, 바꿀 것)
MUTATIONS = [
    (
        "M1 23 자른 단면의 넓이를 절반으로",
        "닫힌 식 검산 nA=4r^2(n-1)+2r^2 log2 n",
        "const cut = (planes * 2 * r * r) / n;",
        "const cut = (planes * r * r) / n;",
    ),
    (
        "M2 21 답을 엉뚱한 키로 (S -> A)",
        "답의 수가 facts 와 일치한다",
        "facts: { branch, r, A, S, ans: S },",
        "facts: { branch, r, A, S, ans: A },",
    ),
    (
        "M3 16 상대도수의 비를 엇갈리게 (c*b -> c*a)",
        "약분 없는 교차곱 검산",
        "const p0 = c * b;",
        "const p0 = c * a;",
    ),
    (
        "M4 누수 가드를 꺼 버림",
        "답이 발문에 그대로 적혀 있지 않다",
        "return asked.some((v) => nums.has(v));",
        "return false;",
    ),
    (
        "M5 15 가중합의 한쪽을 같은 집단으로",
        "가중합 검산 nM*fMp + nF*fFp",
        "const sum = nM * fMp + nF * fFp;",
        "const sum = nM * fMp + nM * fFp;",
    ),
    (
        "M6 우리 단원을 엉뚱한 곳으로",
        "붙인 단원이 셋뿐이다",
        '구: "구의 겉넓이와 부피",',
        '구: "대푯값",',  # 시드에 **있는** 이름이라 SSOT 검사는 통과한다
    ),
    (
        "M8 구의 부피 계수를 다시 «맨 가분수» 로",
        "제품 전처리가 내 수식의 수를 바꾸지 않는다",
        BS2 + "dfrac{4" + BS2 + "pi}{3}",
        BS2 + "dfrac{4}{3}" + BS2 + "pi",
        8,
    ),
    (
        "M7 RPM 제목 바이트를 흔듦",
        "middleTypeCoverage — 색인 정본과 글자 그대로",
        '"회전체의 겉넓이와 부피 구"',
        '"회전체의 겉넓이와 부피; 구"',
    ),
]


def sh(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        args, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", shell=True
    )


def digest() -> str:
    r = sh(["npx", "tsx", "scripts/qa/m1stat-digest.ts"])
    if r.returncode != 0:
        return f"DIGEST-FAILED:{r.returncode}:{r.stderr[-400:]}"
    return r.stdout.strip().splitlines()[-1]


def run_tests() -> bool:
    """시험이 초록이면 True."""
    r = sh(["npx", "vitest", "run", *TESTS])
    return r.returncode == 0


def main() -> int:
    dirty = sh(["git", "status", "--porcelain", "--", str(SRC.relative_to(ROOT))])
    if dirty.stdout.strip():
        print("STOP: 대상 파일에 커밋 안 된 수정이 있다 — 이 스크립트는 그 파일을 덮어쓴다")
        print(dirty.stdout)
        return 2

    original = SRC.read_bytes()
    print(f"원본 {len(original)} bytes")

    base_digest = digest()
    print(f"기준 지문 {base_digest[:16]}…")
    if base_digest.startswith("DIGEST-FAILED"):
        print("STOP: 기준 지문을 못 냈다")
        return 2
    if not run_tests():
        print("STOP: 기준 시험이 이미 빨갛다")
        return 2
    print("기준 시험 초록 ✓\n")

    verdicts: list[tuple[str, str]] = []
    try:
        for entry in MUTATIONS:
            name, guards, find, repl = entry[:4]
            want = entry[4] if len(entry) > 4 else 1
            text = original.decode("utf-8")
            n = text.count(find)
            if n != want:
                verdicts.append((name, f"⛔ 앵커가 {n}군데 (기대 {want}) — 판정 불가"))
                continue
            mutated = text.replace(find, repl).encode("utf-8")

            # ⑴ 파일이 바뀌었나
            if mutated == original:
                verdicts.append((name, "⛔ 파일이 안 바뀜 — 판정 불가"))
                continue
            SRC.write_bytes(mutated)
            assert SRC.read_bytes() == mutated

            # ⑵ 산출물이 바뀌었나
            d = digest()
            if d == base_digest:
                verdicts.append((name, "⛔ 산출물이 그대로 — 무효한 변이, 판정 불가"))
                SRC.write_bytes(original)
                continue

            # ⑶ 그제서야 시험이 빨개지나
            green = run_tests()
            verdicts.append(
                (
                    name,
                    ("🟢 초록 ← 가드가 아니다" if green else "🔴 빨강 ✓")
                    + f"  [{guards}]",
                )
            )
            SRC.write_bytes(original)
            assert SRC.read_bytes() == original
    finally:
        SRC.write_bytes(original)
        assert SRC.read_bytes() == original, "복원 실패 — 손으로 되돌릴 것"

    print("\n── 판정 ─────────────────────────────")
    for name, v in verdicts:
        print(f"{v}\n    {name}")
    red = sum(1 for _, v in verdicts if v.startswith("🔴"))
    print(f"\n빨강 {red} / {len(MUTATIONS)}")
    print("복원 확인:", SRC.read_bytes() == original)
    return 0 if red >= 3 else 1


if __name__ == "__main__":
    sys.exit(main())

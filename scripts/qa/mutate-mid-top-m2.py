# -*- coding: utf-8 -*-
"""중2 확대 갈래(D-116) 시험이 **가드인가 장식인가** — 변이로 판정한다.

    python scripts/qa/mutate-mid-top-m2.py            # 전량
    python scripts/qa/mutate-mid-top-m2.py --list     # 변이 목록
    python scripts/qa/mutate-mid-top-m2.py 4          # 하나만 (번호)

## 판정 순서 — 넷을 다 밟는다 (CLAUDE.md 2026-08-20·08-21·08-23)

  ㉠ **음성 대조** — 변이를 넣기 **전에** 그 시험이 초록인가. 아니면 판정 거부.
     루프 **밖**에서 한 번만 돈다(회차당 `N+1` 이지 `N×2` 가 아니다).
     이것이 있어야 「도장」(늘 빨강을 내는 판정기)이 판정 단계에 **못 온다** —
     같은 명령이 방금 초록을 낸 것을 본 뒤여야 하기 때문이다.
  ⑴ 앵커가 **정확히 하나**인가 — 아니면 판정 거부(조용히 0건 치환하지 않는다).
  ⑵ **파일 바이트**가 바뀌었나 — 안 바뀌면 치환이 헛돈 것이다.
  ⑶ 🔴 **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 「가드가 아니다」가
     거짓말이 되고, **멀쩡한 가드를 의심하고 고치러 간다**(가드가 없는 것보다 나쁘다).
     지문은 `probe-mid-top-m2.ts --dump` (문항 600개의 sha1).
  ⑷ 그제서야 시험이 빨개지나 — 빨간데 **실패한 시험 이름을 못 대면 판정 거부**.
     (옛 결함의 유일한 징후가 「빨간데 근거 줄이 비었다」였다.)

## 원복

시작할 때 읽어 둔 **바이트 그대로** 되쓴다. `git show HEAD:` 로 되돌리면 커밋 안 된
수정을 덮는다(2026-08-23 실제 사고). 그리고 이 하네스는 대상 파일을 덮어쓰므로
**미커밋 변경이 있으면 시작을 거부한다.**

⚠️ 이 도구가 도는 동안 대상 파일을 편집하지 마라 — 원복이 덮는다. 그리고 관문이
   도는 동안 이 도구를 돌리지 마라 — 워커가 변이본을 읽는다.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODULE = os.path.join(ROOT, "src", "lib", "middle", "m2Top.ts")
TEST = "src/__tests__/unit/middleTopM2.test.ts"
PROBE = "scripts/qa/probe-mid-top-m2.ts"

# (이름, [(앵커, 치환), …], 무엇을 지키는 시험인가)
#
# 앵커는 **파일에 그대로 있는 글자**여야 하고 파일 안에서 **정확히 하나**여야 한다.
# 역슬래시가 필요하면 bytes([92]) 로 조립하라 — 도구 JSON 층이 한 겹 벗긴다.
#
# 🔴 **한 변이가 두 자리를 고쳐야 할 때가 있다.** 홀수 변을 되살리려면 「모집단
#    (`LEGS`)의 걸음」과 「`legTriangles` 의 홀수 갈래」를 **둘 다** 되돌려야 한다 —
#    한쪽만 바꾸면 인수 곱이 정수가 아니라 후보가 0이 되고, 산출물이 **그대로**다.
#    실제로 처음에 한쪽만 바꿨다가 하네스가 「산출물이 그대로」로 **판정을 거부**했다.
Edit = tuple[str, str]
MUTATIONS: list[tuple[str, list[Edit], str]] = [
    (
        "정답 m 을 하나 어긋나게",
        [("      const m = (C - A + B) / v;", "      const m = (C - A + B) / v + 1;")],
        "|90 발문의 방정식에 대입해 등식을 확인하는 검산",
    ),
    (
        "해설이 적는 k 를 어긋나게",
        [("}}=${k}$이다. ` +", "}}=${k + 1}$이다. ` +")],
        "|90 「해설이 적는 k 가 발문에서 다시 구한 값과 같다」",
    ),
    (
        "합이 소수인 해의 유일성 가드 제거",
        [
            (
                "      if (hits.length !== 1) return null;",
                "      if (hits.length < 1) return null;",
            )
        ],
        "|91 「합이 소수인 해가 하나뿐」 전수 검산",
    ),
    (
        "해설의 후보 목록에서 하나 빼기",
        [
            (
                '      const rowY = sols.map(([, y]) => `$${y}$`).join(", ");',
                '      const rowY = sols.slice(1).map(([, y]) => `$${y}$`).join(", ");',
            )
        ],
        "|91 「해설이 후보를 하나도 빠뜨리지 않는다」",
    ),
    (
        "x=y 지름길 차단 가드 제거",
        [
            (
                "      if (sols.some(([x, y]) => x === y)) return null;",
                "      if (sols.some(([x, y]) => x < 0)) return null;",
            )
        ],
        "|91 「x=y 인 해가 없다」 불변식",
    ),
    (
        "순열의 나누는 밑을 늘 2 로",
        [("      const answer = base / groupWays;", "      const answer = base / 2;")],
        "경우의 수 90 순열 전수 세기",
    ),
    (
        "이웃 짝과 순서 짝을 겹치게",
        [
            (
                "      const orderIdx = shuffled.slice(2, 2 + orderSize);",
                "      const orderIdx = shuffled.slice(1, 1 + orderSize);",
            )
        ],
        "경우의 수 90 「두 짝이 겹치지 않는다」 불변식",
    ),
    (
        "두 조건이 둘 다 물어야 한다는 가드 제거",
        [
            (
                "      if (both.length === onlyA.length || both.length === onlyB.length) {",
                "      if (both.length < 0) {",
            )
        ],
        "경우의 수 91 「조건 하나가 장식이면 안 된다」",
    ),
    (
        "피타고라스 한 변에 홀수 허용 (두 자리를 함께)",
        [
            (
                "  for (let a = 6; a <= 30; a += 2) {",
                "  for (let a = 6; a <= 30; a += 1) {",
            ),
            # ⚠️ 앵커가 **두 곳**에 걸린다 — 생성기 안에도 같은 줄이 있고, 그쪽은
            #    들여쓰기가 깊어 이 짧은 앵커를 **부분 문자열로 품는다.**
            #    하네스가 「앵커 적중 [1, 2]」로 판정을 거부해서 알았다.
            #    앞 줄을 붙여 유일하게 만든다.
            (
                "n: number; b: number; c: number }> {\n  const product = (a * a) / 4;",
                "n: number; b: number; c: number }> {\n"
                "  const product = a % 2 === 0 ? (a * a) / 4 : a * a;",
            ),
        ],
        "피타고라스 90 「한 변은 늘 짝수다」",
    ),
    (
        "삼각형 개수를 하나 부풀리기",
        [
            (
                "      const answer =\n        ask === 0\n          ? `$${tri.length}$`",
                "      const answer =\n        ask === 0\n          ? `$${tri.length + 1}$`",
            )
        ],
        "피타고라스 90 b 전수 탐색 검산",
    ),
]


def run(cmd: list[str]) -> tuple[int, str]:
    p = subprocess.run(
        cmd, cwd=ROOT, capture_output=True, text=True, encoding="utf-8", errors="replace", shell=False
    )
    return p.returncode, (p.stdout or "") + (p.stderr or "")


def npx(args: list[str]) -> tuple[int, str]:
    exe = "npx.cmd" if os.name == "nt" else "npx"
    return run([exe] + args)


def dump() -> str:
    code, out = npx(["tsx", PROBE, "--dump"])
    if code != 0:
        return f"DUMP-FAILED:{out[-400:]}"
    return out.strip()


def failed_tests() -> tuple[int, list[str]]:
    """시험을 돌리고 (종료 코드, 실패한 시험 이름들). 리포터 이름은 **json** 이다.

    ⚠️ `basic` 은 vitest 4 에 없다. 없는 이름을 주면 러너가 기동에서 죽고 코드 1 —
       그러면 **모든 변이가 빨강**이 되어 판정자가 도장이 된다(2026-08-23).
    """
    out_path = os.path.join(ROOT, ".tmp-orca", "mutate-mid-top-m2.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    if os.path.exists(out_path):
        os.remove(out_path)
    code, _ = npx(
        ["vitest", "run", TEST, "--reporter=json", f"--outputFile={out_path}"]
    )
    names: list[str] = []
    if os.path.exists(out_path):
        try:
            data = json.load(io.open(out_path, encoding="utf-8"))
            for res in data.get("testResults", []):
                for a in res.get("assertionResults", []):
                    if a.get("status") == "failed":
                        names.append(a.get("title") or a.get("fullName") or "?")
        except Exception as e:  # noqa: BLE001
            names.append(f"(json 을 못 읽었다: {e})")
    return code, names


def main() -> int:
    args = sys.argv[1:]
    if "--list" in args:
        for i, (name, _edits, guard) in enumerate(MUTATIONS, 1):
            print(f"{i:2}. {name}  ← {guard}")
        return 0

    # 🔴 대상 파일에 미커밋 변경이 있으면 시작하지 않는다 — 원복이 그것을 덮는다.
    code, out = run(["git", "status", "--porcelain", "--", MODULE])
    if code != 0 or out.strip():
        print(f"🛑 대상 파일에 미커밋 변경이 있다 — 먼저 커밋하라:\n{out}")
        return 2

    original = io.open(MODULE, "rb").read()
    base_md5 = hashlib.md5(original).hexdigest()

    # ㉠ 음성 대조 — 변이 **전에** 초록인가. 루프 밖이라 회차당 한 번.
    print("㉠ 음성 대조 — 변이를 넣기 전에 그 시험이 초록인가 …")
    code, names = failed_tests()
    if code != 0 or names:
        print(f"🛑 기준 시험이 이미 빨갛다 — 판정을 거부한다. {names[:3]}")
        return 2
    base_dump = dump()
    if base_dump.startswith("DUMP-FAILED"):
        print(f"🛑 기준 산출물을 못 얻었다 — 판정을 거부한다.\n{base_dump}")
        return 2
    print("   🟢 기준 초록 · 산출물 지문 확보")

    picked = [int(a) for a in args if a.isdigit()]
    verdicts: list[tuple[str, str]] = []
    try:
        for i, (name, edits, guard) in enumerate(MUTATIONS, 1):
            if picked and i not in picked:
                continue
            text = original.decode("utf-8")
            counts = [text.count(a) for a, _r in edits]
            if any(n != 1 for n in counts):
                verdicts.append((name, f"⛔ 판정 거부 — 앵커 적중 {counts}"))
                continue
            for a, r in edits:
                text = text.replace(a, r)
            io.open(MODULE, "wb").write(text.encode("utf-8"))
            after = io.open(MODULE, "rb").read()
            if hashlib.md5(after).hexdigest() == base_md5:
                verdicts.append((name, "⛔ 판정 거부 — 파일이 안 바뀌었다"))
                continue
            got = dump()
            if got == base_dump:
                verdicts.append(
                    (name, "⛔ 판정 거부 — 파일은 바뀌었는데 **산출물이 그대로**다")
                )
                continue
            if got.startswith("DUMP-FAILED"):
                # 산출물을 못 만드는 것도 «뜻이 바뀐 것»이다(엔진이 던진다).
                got = "throw"
            code, failed = failed_tests()
            if code == 0:
                verdicts.append((name, f"🟢 초록 — 가드가 아니다 ← {guard}"))
            elif not failed:
                verdicts.append(
                    (name, "⛔ 판정 거부 — 빨간데 실패한 시험을 못 댄다(러너 고장?)")
                )
            else:
                verdicts.append((name, f"🔴 빨강 ← {failed[0]}"))
            io.open(MODULE, "wb").write(original)
    finally:
        io.open(MODULE, "wb").write(original)
        assert hashlib.md5(io.open(MODULE, "rb").read()).hexdigest() == base_md5

    print()
    bad = 0
    for i, (name, v) in enumerate(verdicts, 1):
        print(f"{i:2}. {v.split(' ')[0]} {name}")
        print(f"      {v}")
        if not v.startswith("🔴"):
            bad += 1
    print(f"\n변이 {len(verdicts)}개 · 빨강 {len(verdicts) - bad} · 빨강 아님 {bad}")
    return 0 if bad == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())

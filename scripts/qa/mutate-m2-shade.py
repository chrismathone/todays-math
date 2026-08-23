"""변이 시험 — 채색 축(유형 15 색칠하기 · 회전판)의 가드가 진짜 가드인가.

    python scripts/qa/mutate-m2-shade.py

가드는 **망가뜨려 봐야 가드인 줄 안다**(CLAUDE.md 2026-08-18). 그런데 변이가
초록이라고 곧바로 「내 시험이 장식이다」로 읽으면 안 된다 — 2026-08-20~21 에
두 번, 변이가 **동작을 안 바꿔서** 초록이었다. 그래서 판정 순서를 셋으로 둔다:

  ⑴ 파일이 실제로 바뀌었나 (바이트 대조)
  ⑵ **산출물이 바뀌었나** (문항·그림 스펙 전량 해시)  ← 이게 없으면 거짓 판정
  ⑶ 그제서야 시험이 빨개지나

⑵ 에서 안 바뀌면 «판정 거부»로 찍고 넘어간다. 멀쩡한 가드를 의심하고 고치러
가는 것이 가드가 없는 것보다 나쁘다.

되돌리기는 **시작할 때 읽어 둔 바이트 그대로** 쓴다. `git show HEAD:` 로 되돌리면
안 된다 — 2026-08-23 첫 판이 그렇게 짜여 있었고, **커밋하지 않은 수정이 통째로
날아갔다**(git 블롭은 LF, 작업 트리는 CRLF 라 되돌리기 대조도 늘 실패한다).
그래서 시작할 때 **대상 파일이 커밋돼 있는지 먼저 확인하고, 아니면 멈춘다** —
이 스크립트는 대상 파일을 덮어쓰므로 안 커밋된 수정이 있으면 위험하다.
"""

from __future__ import annotations

import hashlib
import io
import subprocess
import sys

TEST = "src/__tests__/unit/middleM2NumProb.test.ts"
METER = "scripts/qa/meter-m2-shade.ts"

COUNTING = "src/lib/middle/m2Counting.ts"
PROB = "src/lib/middle/m2Prob.ts"
SHADE = "src/lib/middle/m2Shade.ts"

# (이름, 파일, 찾을 것, 바꿀 것) — 찾을 것은 파일에 **정확히 한 번**만 나와야 한다.
MUTANTS: list[tuple[str, str, str, str]] = [
    (
        "역산: 모두 다른 색의 가짓수를 한 칸 줄인다",
        COUNTING,
        "Array.from({ length: parts }, (_v, i) => n - i)",
        "Array.from({ length: parts }, (_v, i) => n - i - 1)",
    ),
    (
        "역산: 이웃 색칠에서 이미 칠한 이웃을 한 명 덜 뺀다",
        COUNTING,
        "const f = n - earlier.length;",
        "const f = n - earlier.length + 1;",
    ),
    (
        "그림: 색칠 부분 이름표를 거꾸로 붙인다 (해설의 이웃 이름이 어긋난다)",
        SHADE,
        'labels[`L${i}`] = { text: PART_LETTERS[i]!, dx: 0, dy: 0 };\n  }\n  return {\n    version: 2,\n    canvas: { width: CANVAS_W, height: bottom + BOX_MARGIN },',
        'labels[`L${i}`] = { text: PART_LETTERS[k - 1 - i]!, dx: 0, dy: 0 };\n  }\n  return {\n    version: 2,\n    canvas: { width: CANVAS_W, height: bottom + BOX_MARGIN },',
    ),
    (
        "그림: 고리 가운데 원의 경계를 둘레 점으로 안 쪼갠다 (이웃이 사라진다)",
        SHADE,
        'arc: { circle: "inn", from: `B${i}`, to: `B${(i + 1) % k}`, dir: "cw" },',
        'arc: { circle: "inn", from: `B${i % 2}`, to: `B${(i + 1) % 2}`, dir: "cw" },',
    ),
    (
        "그림: 회전판 칸을 고르게 안 나눈다 (크기가 같은 k개가 거짓이 된다)",
        SHADE,
        "      angle: r4(90 - (i * 360) / k),\n    };\n    segments[`r${i}`] = [\"O\", `A${i}`];\n  }\n  for (let i = 0; i < k; i += 1) {\n    const j = (i + 1) % k;\n    regions[`s${i}`] = {",
        "      angle: r4(90 - (i * 360) / k - (i === 1 ? 6 : 0)),\n    };\n    segments[`r${i}`] = [\"O\", `A${i}`];\n  }\n  for (let i = 0; i < k; i += 1) {\n    const j = (i + 1) % k;\n    regions[`s${i}`] = {",
    ),
    (
        "그림: 캔버스 폭을 안 박는다 (지면 등급이 도형마다 갈린다)",
        SHADE,
        "const CANVAS_W = 224;",
        "const CANVAS_W = 150;",
    ),
    (
        "회전판: 칸에 적는 수를 1이 아니라 2부터 적는다",
        PROB,
        "Array.from({ length: k }, (_v, i) => String(i + 1)),",
        "Array.from({ length: k }, (_v, i) => String(i + 2)),",
    ),
    (
        "회전판 06: 두 배수가 겹쳐도 «동시에 일어나지 않는다» 고 낸다",
        PROB,
        "if ((a * b) / gcd(a, b) <= k) return null;",
        "if ((a * b) / gcd(a, b) <= 0) return null;",
    ),
]


def read_bytes(path: str) -> bytes:
    with open(path, "rb") as fh:
        return fh.read()


def write_bytes(path: str, data: bytes) -> None:
    with open(path, "wb") as fh:
        fh.write(data)


def restore(path: str, original: bytes) -> None:
    """**시작할 때 읽어 둔 바이트 그대로** 되돌린다.

    `git show HEAD:<경로>` 로 되돌리면 안 된다 — git 은 블롭을 LF 로 담고
    작업 트리는 CRLF 라(autocrlf), 내용은 같은데 **줄끝이 통째로 바뀐다.**
    실제로 첫 판이 그 자리에서 「되돌리기 실패」로 멈췄다. 텍스트로 쓰는 것도
    안 된다(파이썬이 Windows 에서 LF→CRLF 로 바꾼다) — 그래서 바이너리다.
    """
    write_bytes(path, original)


def meter() -> str | None:
    """산출물 해시 — 못 재면 None (변이가 컴파일조차 안 되는 경우)."""
    r = subprocess.run(
        ["npx", "tsx", METER],
        capture_output=True,
        shell=True,
    )
    if r.returncode != 0:
        return None
    return hashlib.sha256(r.stdout).hexdigest()


def run_tests() -> bool:
    r = subprocess.run(
        ["npx", "vitest", "run", TEST],
        capture_output=True,
        shell=True,
    )
    return r.returncode == 0


def dirty_targets() -> list[str]:
    """대상 파일 중 커밋 안 된 것 — 이 스크립트가 덮어쓰므로 있으면 멈춘다."""
    r = subprocess.run(
        ["git", "status", "--porcelain", "--", COUNTING, PROB, SHADE],
        capture_output=True,
        text=True,
        check=True,
    )
    return [line[3:] for line in r.stdout.splitlines() if line.strip()]


def main() -> int:
    dirty = dirty_targets()
    if dirty:
        print("대상 파일에 커밋 안 된 수정이 있습니다 — 먼저 커밋하십시오:")
        for name in dirty:
            print(f"  {name}")
        return 2
    base_files = {p: read_bytes(p) for p in (COUNTING, PROB, SHADE)}
    base_hash = meter()
    if base_hash is None:
        print("기준 산출물을 못 쟀습니다 — 계량기부터 고치십시오")
        return 2
    print(f"기준 산출물 해시 {base_hash[:16]}")
    if not run_tests():
        print("기준 시험이 이미 빨갛습니다 — 변이를 재도 뜻이 없습니다")
        return 2

    bad = 0
    for name, path, old, new in MUTANTS:
        original = base_files[path]
        # 찾을 것은 LF 로 적혀 있는데 작업 트리는 CRLF 일 수 있다 — 줄끝을
        # 맞춰 놓고 찾는다. 되돌릴 때는 어차피 «원래 바이트»를 그대로 쓴다.
        norm = original.replace(b"\r\n", b"\n")
        old_b, new_b = old.encode("utf-8"), new.encode("utf-8")
        count = norm.count(old_b)
        if count != 1:
            print(f"❓ {name}: 찾을 것이 {count}번 나옵니다 — 변이를 고치십시오")
            bad += 1
            continue
        write_bytes(path, norm.replace(old_b, new_b))
        try:
            after = read_bytes(path)
            if after == original:
                print(f"❓ {name}: 파일이 안 바뀌었습니다 — 판정 거부")
                bad += 1
                continue
            got = meter()
            if got is None:
                print(f"🔴 {name}: 산출물을 못 잽니다(생성기가 던짐) ← 가드")
                continue
            if got == base_hash:
                print(f"❓ {name}: 산출물이 그대로입니다 — 판정 거부")
                bad += 1
                continue
            if run_tests():
                print(f"🟢 {name}: 시험이 초록 ← **가드가 아니다**")
                bad += 1
            else:
                print(f"🔴 {name}: 시험이 빨강 ← 가드")
        finally:
            restore(path, original)
            if read_bytes(path) != original:
                print(f"‼ {path} 되돌리기 실패 — 손으로 확인하십시오")
                return 2

    print("판정 거부·초록 없음" if bad == 0 else f"살펴볼 것 {bad}건")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
    sys.exit(main())

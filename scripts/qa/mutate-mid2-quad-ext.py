# -*- coding: utf-8 -*-
"""**「등변사다리꼴, 여러 가지 사각형」 확장 유형 29~32 의 가드를 망가뜨려 본다.**

    python scripts/qa/mutate-mid2-quad-ext.py            # 전량
    python scripts/qa/mutate-mid2-quad-ext.py 비를        # 이름 조각으로 하나만
    python scripts/qa/mutate-mid2-quad-ext.py --list

## 판정 순서 (CLAUDE.md 2026-08-20·08-21·08-23 의 그 순서 그대로)

  ㉠ **음성 대조** — 변이를 넣기 **전에** 그 시험이 초록인가. 아니면 판정 거부.
     이것이 없으면 「늘 빨강」인 도장이 「가드가 다 문다」로 읽힌다.
  ⑴ 앵커가 **정확히 하나**인가 — 아니면 판정 거부(조용히 0건 치환하지 않는다).
  ⑵ **파일이 바뀌었나** — 안 바뀌면 치환이 헛돈 것이다.
  ⑶ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 「가드가 아니다」가
     거짓말이 된다. 여기서 산출물은 29~32 를 씨앗 5 × 변형 8 로 뽑은 문항 전부다.
  ⑷ 그제서야 시험이 빨개지나 — 그리고 **실패한 시험 이름을 못 대면 판정을 거부한다.**
     (빨간데 근거 줄이 비어 있던 것이 2026-08-23 «도장» 결함의 유일한 징후였다.)

## 원복

시작할 때 읽어 둔 **바이트 그대로** 되돌린다. `git show HEAD:` 로 짜면 커밋 안 된
수정을 덮어쓴다(2026-08-23 에 실제로 겪었다). 그래도 이 도구는 대상 파일을 덮어
쓰므로, 시작 전에 **대상이 커밋돼 있는지** 확인하고 아니면 멈춘다.
"""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(ROOT, "src", "lib", "middle", "m2GeoQuad.ts")
TEST = "src/__tests__/unit/midTypesD.test.ts"
PROBE = os.path.join(ROOT, "scripts", "qa", "probe-mid2-quad-ext.ts")

# (이름, 찾을 것, 바꿀 것) — 어느 가드를 겨누는지는 이름에 적는다.
MUTANTS = [
    (
        "29 넓이가 1 만큼 어긋난다",
        "const x = ((a + b) * h) / 2;",
        "const x = ((a + b) * h) / 2 + 1;",
    ),
    (
        "29 다리가 짧아 도형이 존재할 수 없다",
        "const d = intBetween(rng, 1, c - 1);",
        "const d = intBetween(rng, 1, c + 3);",
    ),
    (
        "29 둘레가 다리를 한 번만 센다",
        "const x = a + b + 2 * c;",
        "const x = a + b + c;",
    ),
    (
        "30 두 대각선의 길이가 어긋난다",
        "const p = q + x;",
        "const p = q + x + 1;",
    ),
    (
        "30 그림의 윗변:아랫변 비가 발문과 다르다",
        "figureSpec: figIsoTrapDiags(x * 8, q * 8, 96, {}),",
        "figureSpec: figIsoTrapDiags(x * 9, q * 8, 96, {}),",
    ),
    (
        "30 그림의 각이 발문과 다르다",
        "r2(((bottom + top) / 2) * Math.tan(t * DEG)),",
        "r2(((bottom + top) / 2) * Math.tan((t + 6) * DEG)),",
    ),
    (
        "30 발문이 그림을 가리키는데 그림이 없다",
        "figureSpec: figIsoTrapDiags(\n          top,",
        "figureSpec: null,\n        deadSpec: figIsoTrapDiags(\n          top,",
    ),
    (
        "30 그림에 대각선 치수를 다시 적는다",
        "labels.n_ac = opts.acLabel;",
        "labels.n_ac = opts.acLabel;\n  } else {\n    pts.n_zz = [off, height / 2];\n    labels.n_zz = `${Math.round(bottom / 8)} cm`;",
    ),
    (
        "31 비가 뒤집힌다",
        "const x = (180 * m) / (m + n);",
        "const x = (180 * n) / (m + n);",
    ),
    (
        "31 두 각의 차가 절반이 된다",
        "const x = (180 - d) / 2;",
        "const x = (180 - d / 2) / 2;",
    ),
    (
        "32 정사각형의 넓이를 대각선의 제곱으로 본다",
        "const x = (p * p) / 2;",
        "const x = p * p;",
    ),
    (
        "32 마름모의 넓이가 두 배가 된다",
        "const area = (p * x) / 2;",
        "const area = p * x;",
    ),
]

# 「대각선 치수를 다시 적는다」 변이는 지금 없는 가지(`opts.acLabel`)를 되살려야
# 하므로, 그 가지를 먼저 꽂아 둔 판을 쓴다. 앵커가 없으면 판정을 거부하게 두고
# 여기서 대신 **라벨을 직접 더하는** 꼴로 바꾼다.
MUTANTS[7] = (
    "30 그림에 대각선 치수를 다시 적는다",
    'labels: Record<string, string> = {\n    A: "A",\n    B: "B",\n    C: "C",\n    D: "D",\n    O: "O",\n  };\n  if (opts.angDBC !== undefined) {',
    'labels: Record<string, string> = {\n    A: "A",\n    B: "B",\n    C: "C",\n    D: "D",\n    O: "O",\n  };\n  pts.n_zz = [off, height / 2];\n  labels.n_zz = `${bottom / 8} cm`;\n  if (opts.angDBC !== undefined) {',
)
# ⚠️ 라벨 값을 `bottom / 8` 로 둔 까닭: 30 의 mode 0 은 아랫변을 `q * 8` 로 그리므로
#    이 값이 **정확히 `facts.q`** 다. 그래서 「그림 라벨이 facts 에 있다」는 통과하고
#    「대각선 치수를 적지 않는다」쪽이 문다 — 겨눈 가드가 실제로 무는지 갈린다.
#    (mode 1 은 17.5 라 두 가드가 같이 문다. 판정이 실패 이름을 여럿 찍어 그것도 보인다.)


def run(cmd: list[str], **kw) -> subprocess.CompletedProcess:
    return subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", **kw)


def probe_digest() -> str:
    """산출물 지문 — 29~32 를 씨앗 5 × 변형 8 로 뽑은 것 전부."""
    r = run(["node", "node_modules/tsx/dist/cli.mjs", PROBE])
    if r.returncode != 0:
        # 변이가 생성기를 아예 못 돌게 만들 수도 있다 — 그것도 «바뀐 산출물»이다.
        return "THROW:" + hashlib.md5(
            (r.stdout + r.stderr).encode("utf-8", "replace")
        ).hexdigest()
    return hashlib.md5(r.stdout.encode("utf-8", "replace")).hexdigest()


def run_test() -> tuple[bool, list[str], str]:
    """(초록인가, 실패한 시험 이름, 까닭)."""
    with tempfile.TemporaryDirectory() as tmp:
        out = os.path.join(tmp, "r.json")
        r = run([
            "node", "node_modules/vitest/vitest.mjs", "run", TEST,
            "--reporter=json", f"--outputFile.json={out}",
        ])
        names: list[str] = []
        try:
            with open(out, encoding="utf-8") as f:
                report = json.load(f)
            for res in report.get("testResults", []):
                for a in res.get("assertionResults", []):
                    if a.get("status") == "failed":
                        names.append(a.get("fullName") or a.get("title") or "?")
        except Exception as exc:  # noqa: BLE001
            return (r.returncode == 0, [], f"판정 파일을 못 읽었다: {exc}")
        return (r.returncode == 0, names, "")


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--list" in sys.argv:
        for i, (name, _, _) in enumerate(MUTANTS):
            print(f"{i:2d}. {name}")
        return 0

    dirty = run(["git", "status", "--porcelain", "--", TARGET]).stdout.strip()
    if dirty:
        print("🔴 대상 파일에 커밋 안 된 수정이 있다 — 이 도구는 그 파일을 덮어쓴다.")
        print(f"   {dirty}")
        return 2

    with open(TARGET, "rb") as f:
        original = f.read()

    picked = [m for m in MUTANTS if not args or any(a in m[0] for a in args)]
    if not picked:
        print("🔴 이름 조각과 맞는 변이가 없다 (--list 로 확인)")
        return 2

    print("㉠ 음성 대조 — 변이 **전에** 시험이 초록인가")
    base_green, base_failed, why = run_test()
    if not base_green:
        print(f"🔴 기준 시험이 이미 빨갛다 — 판정을 거부한다. {base_failed} {why}")
        return 2
    base_digest = probe_digest()
    print(f"   ✅ 초록 · 산출물 지문 {base_digest[:12]}\n")

    verdicts: list[tuple[str, str]] = []
    try:
        for name, find, repl in picked:
            text = original.decode("utf-8")
            n = text.count(find)
            if n != 1:
                verdicts.append((name, f"⛔ 판정 거부 — 앵커가 {n} 개다"))
                print(f"⛔ {name} — 앵커가 {n} 개")
                continue
            with open(TARGET, "wb") as f:
                f.write(text.replace(find, repl).encode("utf-8"))
            with open(TARGET, "rb") as f:
                after = f.read()
            if after == original:
                verdicts.append((name, "⛔ 판정 거부 — 파일이 안 바뀌었다"))
                print(f"⛔ {name} — 파일이 안 바뀜")
                continue
            digest = probe_digest()
            if digest == base_digest:
                verdicts.append((name, "⛔ 판정 거부 — **산출물이 그대로다**"))
                print(f"⛔ {name} — 산출물 그대로 (뜻이 안 바뀌었다)")
                continue
            green, failed, why = run_test()
            if green:
                verdicts.append((name, "🟢 초록 ← **가드가 아니다**"))
                print(f"🟢 {name} — 시험이 안 문다")
            elif not failed:
                verdicts.append((name, "⛔ 판정 거부 — 빨간데 실패한 시험을 못 댄다"))
                print(f"⛔ {name} — 빨간데 근거가 없다 ({why})")
            else:
                # 실패한 시험을 **여럿** 찍는다 — 하나만 찍으면 「어느 가드가
                # 물었나」가 가려져, 겨눈 가드가 아니라 옆 가드가 문 것을 못 본다.
                shown = failed[:3]
                verdicts.append((name, "🔴 빨강 ← " + " · ".join(shown)))
                print(f"🔴 {name}")
                for t in shown:
                    print(f"     ↳ {t}")
                if len(failed) > len(shown):
                    print(f"     ↳ … 그 밖에 {len(failed) - len(shown)}건")
    finally:
        with open(TARGET, "wb") as f:
            f.write(original)
        back = probe_digest()
        print(f"\n원복 — 산출물 지문 {back[:12]} "
              f"({'같다' if back == base_digest else '🔴 다르다!'})")

    print("\n── 판정 ──")
    for name, v in verdicts:
        print(f"  {v}  {name}")
    bad = [v for _, v in verdicts if not v.startswith("🔴")]
    return 1 if bad else 0


if __name__ == "__main__":
    raise SystemExit(main())

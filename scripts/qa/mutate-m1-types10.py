# -*- coding: utf-8 -*-
"""`m1Types10.ts` 의 가드를 **망가뜨려 보는** 하네스 — 초록이면 가드가 아니다.

    python scripts/qa/mutate-m1-types10.py            # 전량
    python scripts/qa/mutate-m1-types10.py --list     # 목록만

## 판정 순서 (CLAUDE.md 2026-08-20 · 08-21 · 08-23 이 값 치르고 세운 것)

  ㉠ **음성 대조** — 변이를 넣기 **전에** 그 시험이 초록인가. 아니면 판정을 **거부**한다.
     「망가진 것을 잡는가」만 보면 「멀쩡한 것을 멀쩡하다 하는가」는 구조적으로 안 보인다.
  ⑴ 앵커가 **정확히 하나**인가 — 아니면 판정 거부(조용히 0건 치환하고 초록을 내지 않는다).
  ⑵ 파일이 바뀌었나.
  ⑶ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 거짓말이 된다.
     그러면 **멀쩡한 가드를 의심하고 고치러 간다** — 가드가 없는 것보다 나쁘다.
  ⑷ 그제서야 시험이 빨개지나. 빨간데 **실패한 시험 이름을 못 대면** 판정을 거부한다
     — 러너가 기동에 실패한 것과 시험이 문 것을 뭉개면 모든 변이가 빨강이 된다(도장).

## 다루는 규칙 셋

* **바이트로 다룬다.** 읽기·치환·되돌리기 전부 `rb`/`wb` 다. Windows 텍스트 쓰기는
  LF 를 CRLF 로 바꾸므로, 텍스트로 되돌리면 md5 가 영영 안 맞는다.
* **되돌리기는 시작할 때 읽어 둔 바이트로** 한다. `git show HEAD:` 로 짜면 커밋 안 된
  수정을 통째로 덮는다(2026-08-23 실제 사고).
* **앵커에 역슬래시를 안 쓴다.** 도구 JSON 층이 한 겹 벗겨 조용히 0건 치환이 된다.
* 도는 동안 대상 파일을 **편집하지 말 것** — 되돌리기가 그 편집을 덮는다.
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
TARGET = os.path.join(ROOT, "src", "lib", "middle", "m1Types10.ts")
TEST = "src/__tests__/unit/middleM1Types10.test.ts"
PROBE = os.path.join(ROOT, "scripts", "qa", f".m1types10.probe.{os.getpid()}.ts")

PROBE_SRC = """
import { generateMiddleProblem } from "../../src/lib/middle/generate";
import { M1_TYPES_10 } from "../../src/lib/middle/m1Types10";

const out: unknown[] = [];
for (const e of M1_TYPES_10) {
  for (const seed of [20260829, 1, 7, 424242, 99991]) {
    for (let v = 0; v < 4; v += 1) {
      try {
        const p = generateMiddleProblem(e.key, seed, v);
        out.push([e.key, seed, v, p.difficulty, p.content, p.answer, p.solution, p.facts]);
      } catch (err) {
        out.push([e.key, seed, v, "THROW", String(err)]);
      }
    }
  }
}
process.stdout.write(JSON.stringify(out));
"""

# 이름 · 앵커 · 바꿀 글자 · 「무엇이 물어야 하는가」
MUTATIONS: list[tuple[str, str, str, str]] = [
    (
        "90 좌변·우변의 답을 뒤집는다",
        "const x = p + n;",
        "const x = p - n;",
        "지면에서 다시 읽은 값과 어긋난다",
    ),
    (
        "91 항등식의 상수항을 어긋내",
        "const T = a * u + b * v;",
        "const T = a * u - b * v;",
        "연립을 풀면 정수가 아니거나 항등식이 안 된다",
    ),
    (
        "92 해에서 상수항을 잘못 역산",
        "const n = (p - m) * r + q;",
        "const n = (p - m) * r - q;",
        "해를 대입하면 좌우가 다르다",
    ),
    (
        "93 최소공배수 대신 두 분모의 곱",
        "const K = lcm(m, n);",
        "const K = m * n;",
        "k=1 부터 훑으면 더 작은 수가 먼저 나온다",
    ),
    (
        "좌표 90 길이를 하나 키운다",
        "const x = Math.abs(step);",
        "const x = Math.abs(step) + 1;",
        "hypot 으로 잰 길이와 다르다",
    ),
    (
        "좌표 91 꼭짓점을 하나 어긋내 직사각형을 깬다",
        "          [x1, y2],",
        "          [x1 + 1, y2],",
        "세 점이 직각을 이루지 않는다",
    ),
    (
        "좌표 91 답의 두 좌표를 맞바꾼다",
        "x: dx, y: dy",
        "x: dy, y: dx",
        "facts 짝이 어긋난다",
    ),
    (
        "구 90 지름 대신 반지름의 세 배",
        "const x = 2 * r;",
        "const x = 3 * r;",
        "훑어 찾은 반지름의 두 배와 다르다",
    ),
    (
        "구 91 세제곱을 제곱으로",
        "const x = k * k * k;",
        "const x = k * k;",
        "부피를 실제로 계산해 나눈 값과 다르다",
    ),
    (
        "좌표 90 의 «0 을 뺀다» 막이를 없앤다",
        "if (lo === 0) return null;",
        "if (lo === 99999) return null;",
        "지면 냄새 자가 `4-0` 을 문다",
    ),
    (
        "91 의 난이도를 심화에서 응용으로",
        '    "심화",',
        '    "응용",',
        "등록한 갈래를 잠근 시험이 문다",
    ),
]


def run(cmd: list[str]) -> tuple[int, str]:
    p = subprocess.run(
        cmd, cwd=ROOT, capture_output=True, shell=(os.name == "nt"), text=False
    )
    txt = (p.stdout or b"").decode("utf-8", "replace") + (p.stderr or b"").decode(
        "utf-8", "replace"
    )
    return p.returncode, txt


def probe() -> str | None:
    """산출물 한 벌 — 못 얻으면 `None`(⑶ 을 판정하지 않는다)."""
    code, txt = run(["npx", "tsx", PROBE])
    i = txt.find("[")
    if code != 0 or i < 0:
        return None
    try:
        return json.dumps(json.loads(txt[i:]), ensure_ascii=False)
    except Exception:
        return None


def failed_tests() -> tuple[int, list[str]]:
    code, txt = run(["npx", "vitest", "run", TEST, "--reporter=json"])
    names: list[str] = []
    try:
        data = json.loads(txt[txt.index("{") :])
        for suite in data.get("testResults", []):
            for case in suite.get("assertionResults", []):
                if case.get("status") == "failed":
                    names.append(case.get("title", "?"))
    except Exception:
        pass
    return code, names


def main() -> int:
    if "--list" in sys.argv:
        for i, (name, _, _, why) in enumerate(MUTATIONS, 1):
            print(f"{i:2d}. {name} — {why}")
        return 0

    # 대상 파일이 커밋돼 있는가 — 이 도구는 그 파일을 덮어쓴다.
    code, txt = run(["git", "status", "--porcelain", "--", TARGET])
    if txt.strip():
        print(f"⛔ 대상 파일에 커밋 안 된 수정이 있습니다:\n{txt}")
        print("   이 도구는 그 파일을 덮어씁니다 — 먼저 커밋하십시오.")
        return 2

    base = io.open(TARGET, "rb").read()
    base_md5 = hashlib.md5(base).hexdigest()
    io.open(PROBE, "w", encoding="utf-8", newline="\n").write(PROBE_SRC)

    try:
        # ㉠ 음성 대조 — 지금 초록인가, 그리고 산출물을 얻을 수 있는가.
        base_out = probe()
        if base_out is None:
            print("⛔ 기준 산출물을 못 얻었습니다 — 판정을 거부합니다.")
            return 2
        code, names = failed_tests()
        if code != 0:
            print(f"⛔ 기준 시험이 이미 빨갛습니다 ({names}) — 판정을 거부합니다.")
            return 2
        print(f"㉠ 음성 대조 통과 — 기준 시험 초록 · 산출물 {len(base_out)}자 · md5 {base_md5}")

        verdicts: list[tuple[str, str]] = []
        for i, (name, anchor, repl, why) in enumerate(MUTATIONS, 1):
            a = anchor.encode("utf-8")
            n = base.count(a)
            if n != 1:
                verdicts.append((name, f"⛔ 판정 거부 — 앵커가 {n}건"))
                print(f"{i:2d}. {name}\n    ⛔ 앵커가 {n}건 — 판정 거부")
                continue
            mutated = base.replace(a, repl.encode("utf-8"))
            io.open(TARGET, "wb").write(mutated)
            try:
                if mutated == base:
                    verdicts.append((name, "⛔ 판정 거부 — 파일이 안 바뀌었다"))
                    print(f"{i:2d}. {name}\n    ⛔ 파일이 안 바뀌었다 — 판정 거부")
                    continue
                out = probe()
                if out is None:
                    # 변이가 컴파일·생성 자체를 죽인 것도 「뜻이 바뀌었다」다.
                    changed = "산출물을 못 얻음(생성이 죽었다)"
                elif out == base_out:
                    verdicts.append((name, "⛔ 판정 거부 — 산출물이 그대로"))
                    print(f"{i:2d}. {name}\n    ⛔ 산출물이 그대로 — 뜻이 안 바뀌었다")
                    continue
                else:
                    changed = "산출물이 바뀜"
                code, names = failed_tests()
                if code == 0:
                    verdicts.append((name, "🟢 초록 ← 가드가 아니다"))
                    print(f"{i:2d}. {name}\n    🟢 초록 — 이 변이를 아무 시험도 안 문다 ({why})")
                elif not names:
                    verdicts.append((name, "⛔ 판정 거부 — 실패한 시험을 못 댐"))
                    print(f"{i:2d}. {name}\n    ⛔ 빨간데 실패한 시험 이름이 없다 — 러너를 직접 보라")
                else:
                    verdicts.append((name, "🔴 빨강"))
                    print(f"{i:2d}. {name}\n    🔴 빨강 ({changed}) ↳ {names[0]}")
            finally:
                io.open(TARGET, "wb").write(base)
        got = hashlib.md5(io.open(TARGET, "rb").read()).hexdigest()
        print(f"\n되돌림 확인 md5 {got} ({'같다' if got == base_md5 else '⛔ 다르다'})")
        red = sum(1 for _, v in verdicts if v.startswith("🔴"))
        print(f"전량 {len(MUTATIONS)}개 중 빨강 {red}개")
        return 0 if red == len(MUTATIONS) and got == base_md5 else 1
    finally:
        io.open(TARGET, "wb").write(base)
        if os.path.exists(PROBE):
            os.remove(PROBE)


if __name__ == "__main__":
    raise SystemExit(main())

# -*- coding: utf-8 -*-
"""변이 시험 — 4B(중3 3-1 48유형)의 가드가 **정말 가드인가**.

    python scripts/qa/mutate-m3-root.py            # 전량
    python scripts/qa/mutate-m3-root.py --only M3  # 하나만

## 판정은 3단이다 (2026-08-21 교훈 · 물결 4 공통 계약 8)

  ⑴ 파일이 바뀌었나  ⑵ **산출물이 바뀌었나**  ⑶ 그제서야 시험이 빨개지나

⑵ 를 건너뛰면 「가드가 아니다」가 거짓말이 된다 — 파일이 바뀌어도 **뜻이 안
바뀌는** 변이가 실제로 있다(이 저장소에서 두 번 났다). 여기서 산출물은
**제품 생성기를 실제로 돌려** 48유형 × 씨앗 둘의 발문·정답을 찍은 것이다.

## 표본(PROBE)이 실패하면 판정하지 않는다

표본이 죽으면 ⑵ 가 트레이스백끼리 견주는 일이 된다(2026-08-23 에 그렇게
「가드가 아니다」가 찍혔다). 그래서 표본이 0 으로 안 끝나면 멈춘다.

## 되돌리기

시작할 때 읽어 둔 **바이트 그대로** 되돌린다. `git show HEAD:` 로 되돌리면
커밋 안 된 수정을 덮는다(2026-08-23). 그래서 시작 전에 대상 파일이 깨끗한지
먼저 묻는다 — 이 스크립트는 그 파일을 덮어쓴다.
"""
from __future__ import annotations

import hashlib
import io
import os
import subprocess
import sys

# 이 창의 stdout 이 cp949 면 판정 글자(🔴)가 UnicodeEncodeError 로 죽는다 —
# 그러면 되돌리기 뒤 요약이 통째로 사라진다. 먼저 UTF-8 로 박는다.
for _s in (sys.stdout, sys.stderr):
    if hasattr(_s, "reconfigure"):
        _s.reconfigure(encoding="utf-8", errors="replace")

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TARGET = os.path.join(REPO, "src", "lib", "middle", "m3Root.ts")
TEST = "src/__tests__/unit/middleM3Root.test.ts"

B = chr(92)   # 역슬래시 — 도구 층이 한 겹 벗기므로 바이트로 조립한다
NL = chr(10)
Q = chr(34)

# 표본 — 제품 생성기를 실제로 돌린다.
#
# ⚠️ **표본이 안 보는 축은 변이시킬 수 없다.** 처음엔 (key, content, answer) 만
# 찍었더니 「정본 제목을 손으로 고쳐 적는」 변이가 «산출물 그대로» 로 판정을
# 거부당했고(제목이 표본에 없었다), 「기약 줄이기를 끄는」 변이도 씨앗 둘로는
# 줄일 것이 있는 갈래를 한 번도 안 밟았다. 그래서 색인 축(제목·단원)을 같이
# 찍고, 유형마다 씨앗 셋 × 3문항으로 갈래를 넓혔다.
PROBE = (
    "import { generateMiddleSet } from " + Q + "../../src/lib/middle/generate" + Q + ";" + NL
    + "import { M3_ROOT } from " + Q + "../../src/lib/middle/m3Root" + Q + ";" + NL
    + "for (const e of M3_ROOT) {" + NL
    + "  console.log(e.key, " + Q + "|" + Q + ", e.rpmTitle, " + Q + "|" + Q + ", e.unitSection);" + NL
    + "  for (const seed of [20260824, 7777, 424242]) {" + NL
    + "    for (const p of generateMiddleSet(e.key, seed, 3)) {" + NL
    + "      console.log(JSON.stringify([p.content, p.answer, p.solution]));" + NL
    + "    }" + NL
    + "  }" + NL
    + "}" + NL
)


def sq(*parts: str) -> str:
    """역슬래시가 든 TS 소스 조각을 바이트로 잇는다."""
    return "".join(parts)


SQRT = B + B + "sqrt"

MUTANTS = [
    # ⑴ 근호 정리를 끈다 — 답이 `4\sqrt{2}` 대신 `\sqrt{32}` 로 나간다.
    (
        "M1-근호정리",
        "  let inner = n;" + NL,
        "  let inner = n;" + NL + "  if (n > 0) return { out: 1, inner: n };" + NL,
        "정답의 근호 안에 제곱인수가 없다",
    ),
    # ⑵ 분모의 유리화를 끈다 — 유리화 유형이 받은 그대로를 답으로 낸다.
    (
        "M2-유리화",
        "      const ans = fracSqrt(p, m, q * m);",
        "      const ans = shown;",
        "정답의 분모가 유리화돼 있고 분수가 기약이다",
    ),
    # ⑶ √(a²)=|a| 의 부호 갈래를 없앤다 — a<0 에서 계수 부호가 뒤집힌다.
    (
        "M3-절댓값",
        "      const coef = sign > 0 ? p - q : q - p;",
        "      const coef = p - q;",
        "씨앗별 독립 검산",
    ),
    # ⑷ 기약 줄이기를 끈다 — `\dfrac{4\sqrt{2}}{8}` 처럼 안 줄인 분수가 나간다.
    (
        "M4-기약",
        "  const g = gcd(n, d);",
        "  const g = 1;",
        "정답의 분모가 유리화돼 있고 분수가 기약이다",
    ),
    # ⑸ 잘려 보이는 정본 제목을 «고쳐» 적는다 — 색인 대조가 막아야 한다.
    (
        "M5-정본제목",
        sq('def(MINOR_SQRT, ', Q, '08', Q, ', ', Q, '의 성질', Q),
        sq('def(MINOR_SQRT, ', Q, '08', Q, ', ', Q, SQRT, '{a^2}의 성질', Q),
        "색인 정본과 글자 그대로 같다",
    ),
    # ⑹ 답 하나를 한 칸 틀리게 — 전수 탐색이 잡아야 한다.
    (
        "M6-off-by-one",
        "        const x = k * k - a;",
        "        const x = k * k - a + 1;",
        "씨앗별 독립 검산",
    ),
    # ⑺ 분류기를 속인다 — π 를 유리수라 우기면 시험이 **제 손으로** 센 값과 갈린다.
    (
        "M7-무리수분류",
        sq('item = { latex: ', Q, B + B, 'pi', Q, ', irrational: true };'),
        sq('item = { latex: ', Q, B + B, 'pi', Q, ', irrational: false };'),
        "씨앗별 독립 검산",
    ),
]


def run(cmd: str) -> subprocess.CompletedProcess[str]:
    # Windows 에서 `npx` 는 `.cmd` 라 shell 없이는 못 찾는다.
    return subprocess.run(
        cmd,
        cwd=REPO,
        capture_output=True,
        text=True,
        shell=True,
        encoding="utf-8",
        errors="replace",
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
    )


def probe() -> str:
    path = os.path.join(REPO, "scripts", "qa", "__m3root_probe.ts")
    io.open(path, "w", encoding="utf-8", newline="").write(PROBE)
    try:
        p = run("npx tsx scripts/qa/__m3root_probe.ts")
        out = (p.stdout or "")
        err = (p.stderr or "")
        if p.returncode != 0 or not out.strip():
            raise SystemExit(
                "표본이 실패했다 — 판정하지 않는다:" + NL + (err or out)[:900]
            )
        return out
    finally:
        if os.path.exists(path):
            os.unlink(path)


def main() -> int:
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]

    dirty = run("git status --porcelain -- " + Q + TARGET + Q).stdout.strip()
    if dirty:
        print("멈춘다 — 대상 파일에 커밋 안 된 수정이 있다. 이 스크립트는 그 파일을 덮어쓴다:")
        print(" ", dirty)
        return 2

    original = io.open(TARGET, "rb").read()
    md5_before = hashlib.md5(original).hexdigest()
    text = original.decode("utf-8")

    base_out = probe()
    base_md5 = hashlib.md5(base_out.encode("utf-8")).hexdigest()
    print("기준 산출물 md5:", base_md5, "(" + str(len(base_out.splitlines())) + "줄)")

    base = run("npx vitest run " + TEST + " --pool=threads")
    if base.returncode != 0:
        print("멈춘다 — 변이 전 기준 시험이 이미 빨갛다:")
        print((base.stdout or "")[-1500:])
        return 2
    print("기준 시험 초록" + NL)

    results = []
    for name, anchor, repl, expect_hint in MUTANTS:
        if only and only not in name:
            continue
        if text.count(anchor) != 1:
            print("[" + name + "] 판정 안 함 — 앵커가", text.count(anchor), "개다")
            results.append((name, "앵커없음"))
            continue
        mutated = text.replace(anchor, repl, 1)
        verdict = "?"
        try:
            io.open(TARGET, "wb").write(mutated.encode("utf-8"))
            # ⑴ 파일이 바뀌었나
            if hashlib.md5(io.open(TARGET, "rb").read()).hexdigest() == md5_before:
                print("[" + name + "] 판정 안 함 — 파일이 안 바뀌었다")
                verdict = "파일그대로"
                continue
            # ⑵ 산출물이 바뀌었나 (뜻이 바뀌었나)
            try:
                after = probe()
            except SystemExit as ex:
                print("[" + name + "] 판정 안 함 —", str(ex)[:300])
                verdict = "표본실패"
                continue
            if hashlib.md5(after.encode("utf-8")).hexdigest() == base_md5:
                print("[" + name + "] 판정 안 함 — **산출물이 그대로다**. 변이가 뜻을 안 바꿨다")
                verdict = "산출물그대로"
                continue
            # ⑶ 그제서야 시험이 빨개지나
            p = run("npx vitest run " + TEST + " --pool=threads")
            red = p.returncode != 0
            verdict = "🔴 빨강" if red else "🟢 초록 ← 가드가 아니다"
            print("[" + name + "] " + verdict + "  (기대: " + expect_hint + ")")
            if not red:
                print((p.stdout or "")[-800:])
        finally:
            io.open(TARGET, "wb").write(original)
            got = hashlib.md5(io.open(TARGET, "rb").read()).hexdigest()
            assert got == md5_before, "되돌리기 실패 — " + got + " != " + md5_before
            results.append((name, verdict))

    print(NL + "── 요약 ──")
    for name, verdict in results:
        print(" ", name, verdict)
    print("되돌림 (md5 일치:", md5_before + ")")
    bad = [n for n, v in results if not v.startswith("🔴")]
    return 0 if not bad else 1


sys.exit(main())

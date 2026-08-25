# -*- coding: utf-8 -*-
"""**심화 4단 가드를 일부러 망가뜨려 본다** — 가드는 망가뜨려 봐야 가드인 줄 안다.

    python scripts/qa/mutate-tier4.py            # 전량
    python scripts/qa/mutate-tier4.py --list     # 목록만
    python scripts/qa/mutate-tier4.py 새는       # 이름 조각으로 하나만

## 판정 순서 (CLAUDE.md 2026-08-20·08-21·08-23 — 순서를 바꾸지 말 것)

  ㉠ **음성 대조** — 변이를 넣기 **전에** 시험이 초록인가. 아니면 판정 **거부**.
     (이게 없으면 「무엇을 해도 빨강」인 도장이 판정자 행세를 한다. 이 저장소가
      실제로 그 함정에 빠진 적이 있다 — 없어진 리포터 이름 하나로 45개 변이가
      전부 «RED» 였다.)
  ⑴ 앵커가 **정확히 하나**인가 — 아니면 거부(조용히 0건 치환하고 초록을 내지 않는다).
  ⑵ 파일이 바뀌었나 — 안 바뀌면 치환이 헛돈 것이다(따옴표·역슬래시가 흔한 범인).
  ⑶ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 거짓말이다.
     여기서 산출물은 `marksOf` 가 표본 발문에 대해 내는 표지 집합, 또는 원장 집계다.
  ⑷ 그제서야 시험이 빨개지나.

## 안전

  · 시작할 때 **바이트를 읽어 두고** 그것으로 되돌린다 (`git show HEAD:` 로 되돌리면
    커밋 안 된 수정을 덮는다 — 2026-08-23 에 실제로 그랬다).
  · 대상 파일에 **커밋 안 된 수정이 있으면 멈춘다** — 이 스크립트는 그 파일을 덮어쓴다.
"""
from __future__ import annotations

import io
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RULES = "scripts/qa/tier4Rules.ts"
LEDGER = "scripts/qa/reports/tier4-review.json"
TEST = "src/__tests__/unit/tier4Ladder.test.ts"

# 산출물 지문을 만드는 표본 — **응용 실물**과 **심화 실물**을 섞는다.
# 한쪽만 두면 「덜 문다」와 「더 문다」 중 하나가 구조적으로 안 보인다.
PROBE_INPUTS = [
    "학생 $400$명의 좋아하는 과일을 조사하여 나타낸 띠그래프입니다. 사과를 고른 학생은 포도를 고른 학생보다 몇 명 더 많습니까?",
    "도화지 한 장의 $\\frac{6}{7}$ 만큼을 잘라 냈습니다. 남은 도화지는 전체의 얼마입니까?",
    "전체가 $40$ 명일 때, 남학생은 몇 명입니까?",
    "어떤 수에 $10$을 곱했더니 $37.3$이 되었습니다.",
    "$\\square+5=12$",
    "위에서 본 모양의 칸이 $4$칸이고, 두 층 이상인 칸은 많아야 몇 칸인가?",
    "$50^\\circ$보다 크고 $106^\\circ$보다 작은 각은 모두 몇 개인가?",
    "공책이 한 묶음에 $19$권씩 $85$묶음 있습니다. 공책은 모두 몇 권입니까?",
]

MUTATIONS = [
    # 이름, 대상 파일, 앵커, 바꿀 것
    (
        "새는 표지로 되돌리기 (전체가 ~일 때 → 전체[가의])",
        RULES,
        "re: /전체[가는] [^.]*일 때/,",
        "re: /전체[가의]/,",
    ),
    (
        "표지 하나 지우기 (많아야)",
        RULES,
        '    name: "최대 조건 (많아야)",\n    re: /많아야/,',
        '    name: "최대 조건 (많아야)",\n    re: /결코안나오는말/,',
    ),
    (
        "□ 표지의 역슬래시를 하나로 (죽은 정규식)",
        RULES,
        "re: /\\\\square|□/,",
        "re: /\\square/,",
    ),
    (
        # 2026-08-25 에 잔고가 0 이 되어 앵커를 뒤집었다 — 예전 판은 «고칠것 → 4단»
        # (잔고가 조용히 주는 것)이었는데, 이제 «고칠것» 이 한 줄도 없다.
        # 반대 방향도 같은 시험이 문다: 잔고 수는 **정확히** 박혀 있다.
        "원장 판정 하나를 «4단» → «고칠것» (잔고가 조용히 는다)",
        LEDGER,
        '"판정": "4단"',
        '"판정": "고칠것"',
    ),
    (
        "중등 낱말 하나 빼기 (D-106 과 갈라진다)",
        RULES,
        '  "유리화하시오",\n',
        "",
    ),
]


def run(cmd: list[str]) -> tuple[int, str]:
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, (r.stdout or "") + (r.stderr or "")


def fingerprint() -> str:
    """산출물 지문 — `marksOf` 가 표본에 내는 표지 + 원장 집계."""
    script = (
        "const {marksOf,OPERATION_INSTRUCTION_WORDS}=require('./scripts/qa/tier4Rules.ts');"
        "const l=require('./" + LEDGER + "');"
        "const rows=Object.values(l.초등);"
        "console.log(JSON.stringify({"
        "marks:" + json.dumps(PROBE_INPUTS, ensure_ascii=False) + ".map(marksOf),"
        "words:OPERATION_INSTRUCTION_WORDS,"
        "elem:[rows.length,rows.filter(r=>r.판정==='고칠것').length],"
        "mid:Object.keys(l.중등).length}));"
    )
    code, out = run([
        "node", os.path.join("node_modules", "tsx", "dist", "cli.mjs"), "-e", script
    ])
    if code != 0:
        return f"<지문 실패 {code}: {out.strip()[:200]}>"
    return out.strip().splitlines()[-1]


def test_red() -> tuple[bool, list[str]]:
    code, out = run([
        "node",
        os.path.join("node_modules", "vitest", "vitest.mjs"),
        "run",
        TEST,
        "--reporter=json",
        "--outputFile=" + os.path.join("scripts", "qa", ".mutate-tier4.json"),
    ])
    failed: list[str] = []
    path = os.path.join("scripts", "qa", ".mutate-tier4.json")
    if os.path.exists(path):
        try:
            data = json.load(io.open(path, encoding="utf-8"))
            for t in data.get("testResults", []):
                for a in t.get("assertionResults", []):
                    if a.get("status") == "failed":
                        failed.append(a.get("title", "?"))
        except Exception:
            pass
        os.remove(path)
    return code != 0, failed


def main() -> int:
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--list" in sys.argv:
        for i, m in enumerate(MUTATIONS, 1):
            print(f"  {i}. {m[0]}   ({m[1]})")
        return 0

    targets = sorted({m[1] for m in MUTATIONS})
    code, out = run(["git", "status", "--porcelain", "--"] + targets)
    if out.strip():
        print("⛔ 대상 파일에 커밋 안 된 수정이 있다 — 이 스크립트는 그 파일을 덮어쓴다.")
        print(out)
        return 2

    원본 = {p: io.open(p, "rb").read() for p in targets}

    print("㉠ 음성 대조 — 변이 **전에** 시험이 초록인가 …")
    red, _ = test_red()
    if red:
        print("⛔ 기준 시험이 이미 빨갛다 — **판정을 거부한다.**")
        return 2
    기준지문 = fingerprint()
    if 기준지문.startswith("<지문"):
        print(f"⛔ 기준 지문을 못 만들었다 — {기준지문}")
        return 2
    print("   ✅ 초록. 판정할 수 있다.\n")

    골 = [m for m in MUTATIONS if not args or any(a in m[0] for a in args)]
    결과 = []
    try:
        for 이름, 파일, 앵커, 새것 in 골:
            s = 원본[파일].decode("utf-8")
            n = s.count(앵커)
            if n == 0:
                결과.append((이름, "거부", "앵커를 못 찾았다"))
                continue
            # ⑴ 앵커가 여럿이어도 좋다 — 원장 판정처럼 «하나를 바꾸면 되는» 것이 있다.
            #    다만 **몇 개를 바꿨는지 찍는다.** 안 찍으면 「무엇을 쟀나」가 사라진다.
            바뀐 = s.replace(앵커, 새것, 1)
            if 바뀐 == s:
                결과.append((이름, "거부", "치환했는데 글자가 그대로다"))
                continue
            io.open(파일, "wb").write(바뀐.encode("utf-8"))
            지문 = fingerprint()
            if 지문 == 기준지문:
                결과.append((이름, "거부", "파일은 바뀌었는데 **산출물이 그대로**다 (뜻이 안 바뀌었다)"))
            else:
                red, failed = test_red()
                if red and not failed:
                    결과.append((이름, "거부", "빨간데 실패한 시험을 못 댄다 — 러너 자체를 의심하라"))
                elif red:
                    결과.append((이름, "RED", " / ".join(failed[:3])))
                else:
                    결과.append((이름, "GREEN", f"앵커 {n}곳 중 1곳 치환 — **가드가 아니다**"))
            io.open(파일, "wb").write(원본[파일])
    finally:
        for p, b in 원본.items():
            io.open(p, "wb").write(b)

    print()
    for 이름, 판정, 말 in 결과:
        표 = {"RED": "🔴", "GREEN": "🟢", "거부": "⛔"}[판정]
        print(f"  {표} {판정:<5} {이름}\n        {말}")
    나쁨 = [r for r in 결과 if r[1] != "RED"]
    print(
        f"\n{'✅ 변이 ' + str(len(결과)) + '개 전부 빨강 — 가드가 문다.' if not 나쁨 else '🔴 ' + str(len(나쁨)) + '개가 안 물거나 판정 불가다.'}"
    )
    return 0 if not 나쁨 else 1


if __name__ == "__main__":
    raise SystemExit(main())

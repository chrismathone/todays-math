# -*- coding: utf-8 -*-
"""문제은행 정렬 규칙의 **변이 시험** — 「가드는 망가뜨려 봐야 가드인 줄 안다」.

    python scripts/qa/mutate-problem-order.py          # 전량
    python scripts/qa/mutate-problem-order.py 분류      # 이름 조각으로 하나만

판정 순서는 이 저장소의 규약 그대로다 (CLAUDE.md 2026-08-20 · 08-21 · 08-23):

  ㉠ **음성 대조** — 변이를 넣기 **전에** 시험이 초록인가. 아니면 판정 거부.
     («망가진 것을 잡는가»만 보면 «멀쩡한 것을 멀쩡하다 하는가»는 구조적으로 안 보인다.)
  ⑴ 앵커가 정확히 하나인가 — 아니면 판정 거부(조용히 0건 치환하고 초록을 내지 않는다)
  ⑵ **파일이 바뀌었나** — 안 바뀌면 치환이 헛돈 것이다
  ⑶ **산출물이 바뀌었나** — 파일이 바뀌어도 뜻이 안 바뀌면 «가드가 아니다»가 **거짓말**이 된다
  ⑷ 그제서야 시험이 빨개지나

⑶ 의 「산출물」은 변이마다 다르다. 규칙을 건드리는 변이는 **실제로 정렬한 순서**를 찍어
견주고, 배선을 건드리는 변이는 **그 배선이 적힌 줄**을 견준다 — 둘 다 «뜻이 바뀌었나»다.

원복은 **바이트**로 한다(시작할 때 읽어 둔 그대로). 이 저장소는 `git show HEAD:` 로
되돌리다가 미커밋 수정을 통째로 날린 적이 있다(2026-08-23).
"""
from __future__ import annotations

import io
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

RULE = "src/lib/problem/problemOrder.ts"
ROUTE = "src/app/api/problems/route.ts"
BANK = "src/components/problem/ProblemBank.tsx"

TESTS = ["src/__tests__/unit/problemOrder.test.ts", "src/__tests__/api/problem.test.ts"]

# 산출물 프로브 — 규칙을 실제로 **돌려서** 순서를 찍는다(텍스트 검사가 아니다).
PROBE = r"""
import {
  PROBLEM_BANK_ORDER_BY,
  problemOrderFields,
  sortProblemsForBank,
} from "../../src/lib/problem/problemOrder";
// ⚠️ 열쇠를 손으로 만들지 않고 **`problemOrderFields` 를 지나게** 한다. 직접 만들면
//    「단원을 못 찾은 행」 갈래가 프로브에 **아예 없어서**, 그 자리를 건드리는 변이가
//    산출물을 못 바꾸고 ⑶ 에서 거부된다(실제로 그렇게 났다 — 하네스가 잡았다).
const rows = [
  problemOrderFields({ problemCode: "J10102-A01-001" }, { orderIndex: 362 }),
  problemOrderFields({ problemCode: "J10101-A10-001" }, { orderIndex: 361 }),
  problemOrderFields({ problemCode: "J10101-A02-003" }, { orderIndex: 361 }),
  problemOrderFields({ problemCode: "J10101-A02-001" }, { orderIndex: 361 }),
  problemOrderFields({ problemCode: "J10101-A01-010" }, { orderIndex: 361 }),
  problemOrderFields({ problemCode: "J10101-A01-002" }, { orderIndex: 361 }),
  problemOrderFields({ problemCode: "J10101-A00-001" }, undefined),
];
console.log(sortProblemsForBank(rows).map((r) => r.problemCode).join(" "));
console.log(JSON.stringify(PROBLEM_BANK_ORDER_BY));
"""
PROBE_PATH = os.path.join(ROOT, "scripts", "qa", f".mutate-order.probe.{os.getpid()}.ts")


def read(path: str) -> bytes:
    with open(os.path.join(ROOT, path), "rb") as f:
        return f.read()


def write(path: str, data: bytes) -> None:
    with open(os.path.join(ROOT, path), "wb") as f:
        f.write(data)


def probe_rule() -> str:
    """규칙을 실제로 돌린 **산출물**."""
    r = subprocess.run(
        ["npx", "tsx", PROBE_PATH], cwd=ROOT, capture_output=True, text=True,
        encoding="utf-8", errors="replace", shell=(os.name == "nt"),
    )
    return r.stdout.strip() or f"(프로브 실패) {r.stderr.strip()[:200]}"


def probe_line(path: str, needle: str) -> str:
    """배선이 적힌 줄 — 그 줄이 안 바뀌면 변이가 뜻을 안 바꾼 것이다."""
    text = read(path).decode("utf-8")
    return " | ".join(l.strip() for l in text.splitlines() if needle in l) or "(없음)"


MUTATIONS = [
    {
        "name": "분류·번호 열쇠를 통째로 뺀다",
        "file": RULE,
        "old": '  { prisma: { problemCode: "asc" }, read: (f) => f.problemCode },\n',
        "new": "",
        "probe": probe_rule,
    },
    {
        "name": "단원순서 열쇠를 통째로 뺀다",
        "file": RULE,
        "old": '  { prisma: { unit: { orderIndex: "asc" } }, read: (f) => f.unitOrderIndex },\n',
        "new": "",
        "probe": probe_rule,
    },
    {
        "name": "비교기만 내림차순으로 뒤집는다 (orderBy 는 asc 그대로 — 두 벌이 갈라진다)",
        "file": RULE,
        "old": "    if (left < right) return -1;\n    if (left > right) return 1;",
        "new": "    if (left < right) return 1;\n    if (left > right) return -1;",
        "probe": probe_rule,
    },
    {
        "name": "단원을 못 찾은 행을 맨 뒤가 아니라 맨 앞으로 보낸다 (사라지는 것과 같은 부류)",
        "file": RULE,
        "old": "unit?.orderIndex ?? Number.POSITIVE_INFINITY",
        "new": "unit?.orderIndex ?? Number.NEGATIVE_INFINITY",
        "probe": probe_rule,
    },
    {
        "name": "라우트가 규칙 모듈을 안 쓰고 옛 정렬을 직접 적는다",
        "file": ROUTE,
        "old": "      orderBy: PROBLEM_BANK_ORDER_BY,",
        "new": '      orderBy: [{ createdAt: "desc" }, { id: "desc" }],',
        "probe": lambda: probe_line(ROUTE, "orderBy:"),
    },
    {
        "name": "화면이 새 문항을 다시 맨 위에 얹는다 (서버와 두 벌)",
        "file": BANK,
        "old": """      setProblems((current) =>
        [...matching, ...current].sort((a, b) =>
          compareProblemsForBank(
            problemOrderFields(a, unitById.get(a.unitId)),
            problemOrderFields(b, unitById.get(b.unitId)),
          ),
        ),
      );""",
        "new": "      setProblems((current) => [...matching, ...current]);",
        "probe": lambda: probe_line(BANK, "setProblems((current) =>"),
    },
]


def run_tests() -> tuple[int, list[str]]:
    """`(종료코드, 실패한 시험 이름들)`. 빨간데 이름을 못 대면 **판정을 거부**한다."""
    out = os.path.join(ROOT, f".mutate-order.result.{os.getpid()}.json")
    r = subprocess.run(
        ["npx", "vitest", "run", *TESTS, "--reporter=json", f"--outputFile={out}"],
        cwd=ROOT, capture_output=True, text=True, encoding="utf-8",
        errors="replace", shell=(os.name == "nt"),
    )
    failed: list[str] = []
    try:
        with io.open(out, encoding="utf-8") as f:
            data = json.load(f)
        for suite in data.get("testResults", []):
            for t in suite.get("assertionResults", []):
                if t.get("status") == "failed":
                    failed.append(t.get("fullName") or t.get("title") or "?")
    except Exception:
        failed = ["(판정 결과를 못 읽었다 — 러너가 안 떴을 수 있다)"]
    finally:
        if os.path.exists(out):
            os.remove(out)
    return r.returncode, failed


def main() -> int:
    pick = sys.argv[1] if len(sys.argv) > 1 else None
    chosen = [m for m in MUTATIONS if not pick or pick in m["name"]]
    if not chosen:
        print(f"이름 조각 «{pick}» 에 맞는 변이가 없다")
        return 2

    with io.open(PROBE_PATH, "w", encoding="utf-8", newline="\n") as f:
        f.write(PROBE)

    originals = {p: read(p) for p in {m["file"] for m in chosen}}
    try:
        # ㉠ 음성 대조 — 지금이 초록이 아니면 무엇을 재도 뜻이 없다.
        code, failed = run_tests()
        if code != 0:
            print(f"⛔ 기준 시험이 이미 빨갛다 — 판정을 거부한다. {failed[:3]}")
            return 1
        base_probe = {m["name"]: m["probe"]() for m in chosen}
        print(f"㉠ 음성 대조 통과 (기준 초록)\n")

        verdicts = []
        for m in chosen:
            path, before = m["file"], originals[m["file"]]
            text = before.decode("utf-8")
            # ⑴ 앵커가 정확히 하나인가 (CRLF 저장소라 줄바꿈을 맞춰 찾는다)
            old = m["old"].replace("\n", "\r\n") if b"\r\n" in before else m["old"]
            new = m["new"].replace("\n", "\r\n") if b"\r\n" in before else m["new"]
            hits = text.count(old)
            if hits != 1:
                print(f"⛔ {m['name']}: 앵커가 {hits}개 — 판정 거부")
                verdicts.append((m["name"], "거부(앵커)"))
                continue
            write(path, text.replace(old, new).encode("utf-8"))
            try:
                # ⑵ 파일이 바뀌었나
                if read(path) == before:
                    print(f"⛔ {m['name']}: 파일이 그대로 — 판정 거부")
                    verdicts.append((m["name"], "거부(파일)"))
                    continue
                # ⑶ 산출물이 바뀌었나 — 안 바뀌면 「가드가 아니다」가 거짓말이 된다
                after_probe = m["probe"]()
                if after_probe == base_probe[m["name"]]:
                    print(f"⛔ {m['name']}: 산출물이 그대로 — 판정 거부\n     {after_probe[:120]}")
                    verdicts.append((m["name"], "거부(산출물)"))
                    continue
                # ⑷ 시험이 빨개지나
                code, failed = run_tests()
                if code == 0:
                    print(f"🟢 {m['name']}\n     ← 초록이다. 이 자리를 지키는 가드가 없다.")
                    verdicts.append((m["name"], "초록(가드 없음)"))
                elif not failed or failed[0].startswith("(판정 결과를 못 읽었다"):
                    print(f"⛔ {m['name']}: 빨간데 실패한 시험을 못 댄다 — 판정 거부")
                    verdicts.append((m["name"], "거부(근거 없음)"))
                else:
                    print(f"🔴 {m['name']}\n     ↳ {failed[0]}" + (f"  (외 {len(failed) - 1}건)" if len(failed) > 1 else ""))
                    verdicts.append((m["name"], f"빨강({len(failed)}건)"))
            finally:
                write(path, before)  # 원복은 **읽어 둔 바이트**로
        print("\n── 판정 ──")
        for name, v in verdicts:
            print(f"  {v:<16} {name}")
        return 0 if all(v.startswith("빨강") for _, v in verdicts) else 1
    finally:
        for p, data in originals.items():
            write(p, data)
        if os.path.exists(PROBE_PATH):
            os.remove(PROBE_PATH)


if __name__ == "__main__":
    raise SystemExit(main())

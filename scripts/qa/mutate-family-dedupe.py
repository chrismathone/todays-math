# -*- coding: utf-8 -*-
"""문항류 중복 금지(2026-08-26) 가드가 **진짜 무는지** 변이로 확인한다.

판정 순서 — 이 저장소가 여러 번 데인 자리라 셋 다 본다.
  ㉠ 파일이 실제로 바뀌었나 (바이트 md5)
  ㉡ 기준(변이 전)이 **초록**인가  ← 음성 대조. 이게 없으면 도장이 「빨강」만 찍는다
  ㉢ 그제서야 시험이 빨개지나 (그리고 **실패한 시험 이름을 댈 수 있나**)

⚠️ 복원은 «시작할 때 읽어 둔 바이트»로 한다. `git show HEAD:` 로 짜면 커밋 안 된
   수정을 덮는다(2026-08-23). 대상 파일이 더러우면 **아예 시작하지 않는다.**

  python scripts/qa/mutate-family-dedupe.py
"""
import hashlib
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

MUTATIONS = [
    {
        "name": "M1 배선 — 조회가 familyKey 를 안 실어 보낸다",
        "file": "src/lib/findEligibleProblems.ts",
        "old": "      familyKey: true,\n",
        "new": "",
        "tests": ["src/__tests__/api/problem.test.ts"],
    },
    {
        "name": "M2 강제 — 쓴 문항류를 기록하지 않는다",
        "file": "src/lib/generator/balanceDifficulty.ts",
        "old": "    usedFamilies.add(family);\n",
        "new": "",
        "tests": ["src/__tests__/unit/familyDedupe.test.ts"],
    },
    {
        "name": "M3 정체 — 단원을 안 보고 키 문자열만 본다",
        "file": "src/lib/generator/familyKey.ts",
        "old": "  return `${problem.unitId}${SEP}${key}`;",
        "new": "  return key;",
        "tests": ["src/__tests__/unit/familyDedupe.test.ts"],
    },
    {
        "name": "M4 정체 — 키 없는 행을 한 무리로 묶는다 (기출 41,084행이 한 류가 된다)",
        "file": "src/lib/generator/familyKey.ts",
        "old": '  if (!key) return `solo:${problem.id}`;',
        "new": '  if (!key) return "solo:none";',
        "tests": ["src/__tests__/unit/familyDedupe.test.ts"],
    },
    {
        "name": "M5 부족 안내 — available 을 행 수로 되돌린다 (화면 단추가 덫이 된다)",
        "file": "src/lib/tests/generateDraftTest.ts",
        "old": "            available: capacity,",
        "new": "            available: usable.length,",
        "tests": [
            "src/__tests__/api/test.test.ts",
            "src/__tests__/unit/familyDedupe.test.ts",
        ],
    },
    {
        "name": "M6 교체 — 다른 자리의 문항류를 안 거른다 (한 번 눌러 규칙이 깨진다)",
        "file": "src/lib/tests/replaceTestProblem.ts",
        "old": "      pool: pool.filter((p) => !familiesOnOtherSeats.has(familyIdOf(p))),",
        "new": "      pool,",
        "tests": ["src/__tests__/api/test.test.ts"],
    },
]


def md5(path):
    with open(path, "rb") as f:
        return hashlib.md5(f.read()).hexdigest()


def run_tests(files):
    proc = subprocess.run(
        ["npx.cmd", "vitest", "run", *files, "--reporter=json"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    out = proc.stdout or ""
    start = out.find("{")
    failed = []
    ok = None
    if start >= 0:
        try:
            data = json.loads(out[start:])
            ok = bool(data.get("success"))
            for res in data.get("testResults", []):
                for a in res.get("assertionResults", []):
                    if a.get("status") == "failed":
                        failed.append(a.get("fullName") or a.get("title"))
        except Exception:
            ok = None
    if ok is None:
        ok = proc.returncode == 0
    return ok, failed


def main():
    dirty = subprocess.run(
        ["git", "status", "--porcelain", "--",
         *{m["file"] for m in MUTATIONS}],
        cwd=ROOT, capture_output=True, text=True,
    ).stdout.strip()
    if dirty:
        print("멈춘다 — 대상 파일에 커밋 안 된 수정이 있다. 복원이 그것을 덮는다.")
        print(dirty)
        return 2

    verdicts = []
    for m in MUTATIONS:
        path = os.path.join(ROOT, m["file"])
        with open(path, "rb") as f:
            original = f.read()
        before_md5 = hashlib.md5(original).hexdigest()

        # ㉡ 음성 대조 — 변이 **전에** 초록인가. 아니면 판정을 거부한다.
        base_ok, _ = run_tests(m["tests"])
        if not base_ok:
            verdicts.append((m["name"], "판정거부", "기준이 이미 빨갛다"))
            continue

        text = original.decode("utf-8")
        # 파일은 CRLF 로 저장돼 있을 수 있다 — 앵커는 LF 로 적고 여기서 맞춘다.
        old = m["old"]
        target = old if old in text else old.replace("\n", "\r\n")
        if text.count(target) != 1:
            verdicts.append(
                (m["name"], "판정거부", f"앵커가 {text.count(target)}번 — 1번이어야 한다")
            )
            continue
        new = m["new"]
        if "\r\n" in target and new:
            new = new.replace("\n", "\r\n")
        mutated = text.replace(target, new, 1)

        try:
            with open(path, "wb") as f:
                f.write(mutated.encode("utf-8"))
            if md5(path) == before_md5:
                verdicts.append((m["name"], "판정거부", "파일이 안 바뀌었다"))
                continue
            ok, failed = run_tests(m["tests"])
            if ok:
                verdicts.append((m["name"], "초록", "가드가 아니다 — 아무도 안 문다"))
            elif not failed:
                verdicts.append(
                    (m["name"], "판정거부", "빨간데 실패한 시험 이름을 못 댄다")
                )
            else:
                verdicts.append((m["name"], "빨강", failed[0]))
        finally:
            with open(path, "wb") as f:
                f.write(original)
            assert md5(path) == before_md5, f"복원 실패: {m['file']}"

    print()
    print("=" * 78)
    for name, verdict, why in verdicts:
        mark = {"빨강": "RED ", "초록": "GREEN", "판정거부": "SKIP"}[verdict]
        print(f"[{mark}] {name}")
        print(f"        {why}")
    print("=" * 78)
    bad = [v for v in verdicts if v[1] != "빨강"]
    return 1 if bad else 0


sys.exit(main())

# -*- coding: utf-8 -*-
"""초등 결합형 변이 시험 — 다양성·공식·선수 순서 가드가 실제로 무는지 확인한다.

    python scripts/qa/mutate-elem-combos.py

각 변이는 ⑴ 소스가 바뀌고 ⑵ 생성 산출물이 바뀐 뒤 ⑶ 결합형 단위 테스트가
빨개져야만 통과한다. 대상 파일은 매 회 원본 바이트로 되돌리고 마지막 md5까지 확인한다.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace", line_buffering=True)

ROOT = Path(__file__).resolve().parents[2]
TARGET = ROOT / "src" / "lib" / "elementary" / "combo.ts"
PROBE = ROOT / "scripts" / "qa" / f".mutate-elem-combos.probe.{os.getpid()}.ts"
LOCK = ROOT / "scripts" / "qa" / ".mutate-elem-combos.lock"
MARKER = ROOT / "MUTATION-IN-PROGRESS.elem-combos.txt"
RECOVERY = ROOT / "scripts" / "qa" / f".mutate-elem-combos.original.{os.getpid()}.bak"

PROBE_TS = r'''import {
  elementaryComboDefinitions,
  generateElementaryComboProblem,
  validateElementaryComboDefinition,
} from "../../src/lib/elementary/generate";

const definitions = elementaryComboDefinitions();
const out: unknown[] = [definitions];
for (const definition of definitions) {
  for (let seed = 1; seed <= 96; seed += 1) {
    const p = generateElementaryComboProblem(definition.id, seed);
    out.push({
      seed,
      comboId: p.comboId,
      anchorKey: p.anchorKey,
      conceptKeys: p.conceptKeys,
      familyId: p.familyId,
      content: p.content,
      answer: p.answer,
      solution: p.solution,
    });
  }
}
for (const bad of [
  {
    id: "bad-order",
    anchorKey: "초5|1-6-2",
    prerequisiteKeys: ["초5|2-2-3"],
    curriculumBasis: "음성 대조",
    laterConceptReview: "units.ts 음성 대조",
    familyIds: ["a", "b"],
  },
  {
    id: "one-family",
    anchorKey: "초5|2-2-3",
    prerequisiteKeys: ["초5|1-6-2"],
    curriculumBasis: "음성 대조",
    laterConceptReview: "units.ts 음성 대조",
    familyIds: ["only"],
  },
  {
    id: "no-later-review",
    anchorKey: "초5|2-2-3",
    prerequisiteKeys: ["초5|1-6-2"],
    curriculumBasis: "양성 근거만 있음",
    familyIds: ["a", "b"],
  },
]) {
  try {
    validateElementaryComboDefinition(bad as never);
    out.push(`${bad.id}:OK`);
  } catch (error) {
    out.push(`${bad.id}:THROW:${(error as Error).message}`);
  }
}
console.log(JSON.stringify(out));
'''

MUTATIONS = [
    (
        "family 도달 훼손 — 늘 첫 family만 고른다",
        "  const family = pick(rng, definition.families);",
        "  const family = definition.families[0];",
    ),
    (
        "family 병합 — 이름만 둘이고 문장 생성기는 하나다",
        '{ id: "remainder-part", generate: remainderAreaFraction },',
        '{ id: "remainder-part", generate: nestedAreaFraction },',
    ),
    (
        "nested 공식 훼손 — 둘째 분수를 곱하지 않는다",
        "  const answer = (firstArea * secondNumerator) / secondDenominator;",
        "  const answer = firstArea;",
    ),
    (
        "remainder 공식 훼손 — 남은 넓이 대신 전체 넓이에 곱한다",
        "  const answer = (remainingArea * secondNumerator) / secondDenominator;",
        "  const answer = (area * secondNumerator) / secondDenominator;",
    ),
    (
        "선수 metadata 훼손 — 승인된 넓이 소단원을 바꾼다",
        '    prerequisiteKeys: ["초5|1-6-2"],',
        '    prerequisiteKeys: ["초5|1-6-1"],',
    ),
    (
        "선수 순서 가드 훼손 — 뒤 학년을 허용한다",
        "    if (prerequisite.orderIndex >= anchor.orderIndex) {",
        "    if (prerequisite.orderIndex === anchor.orderIndex) {",
    ),
    (
        "family 최소 둘 가드 훼손 — 하나도 허용한다",
        "  if (definition.familyIds.length < 2) {",
        "  if (definition.familyIds.length < 1) {",
    ),
    (
        "후속 정식 개념 대조 가드 훼손 — units.ts 검토 기록 없이 허용한다",
        '  if (!definition.laterConceptReview?.includes("units.ts")) {',
        '  if (false && !definition.laterConceptReview?.includes("units.ts")) {',
    ),
    (
        "소재 조사 훼손 — 받침을 무시하고 늘 「를」을 붙인다",
        '${theme.second}${josa(theme.second, "을", "를")} 만들었습니다.',
        "${theme.second}를 만들었습니다.",
    ),
]


def command(args: list[str], timeout: int = 180) -> subprocess.CompletedProcess[bytes]:
    return subprocess.run(
        args,
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=timeout,
        check=False,
    )


def probe() -> str:
    node = shutil.which("node")
    if node is None:
        raise RuntimeError("node 실행 파일을 찾지 못했다")
    result = command(
        [
            node,
            str(ROOT / "node_modules" / "tsx" / "dist" / "cli.mjs"),
            str(PROBE),
        ],
        timeout=60,
    )
    text = result.stdout.decode("utf-8", "replace").strip()
    if result.returncode != 0:
        raise RuntimeError(f"산출물 probe 실패(exit {result.returncode}):\n{text[-2000:]}")
    try:
        json.loads(text)
    except json.JSONDecodeError as error:
        raise RuntimeError(f"산출물 probe가 JSON을 내지 않았다: {error}\n{text[-1000:]}") from error
    return text


def test() -> subprocess.CompletedProcess[bytes]:
    npm = "npm.cmd" if os.name == "nt" else "npm"
    return command(
        [npm, "run", "test", "--", "src/__tests__/unit/elemCombo.test.ts"],
        timeout=180,
    )


def main() -> int:
    try:
        fd = os.open(LOCK, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
    except FileExistsError:
        print(f"⛔ 다른 결합형 변이 회차가 열려 있다: {LOCK}")
        return 2

    original = TARGET.read_bytes()
    base_md5 = hashlib.md5(original).hexdigest()
    failed = 0
    expected = original
    concurrent_write = False
    owns_marker = False
    try:
        os.write(fd, f"pid={os.getpid()}\nmd5={base_md5}\n".encode("ascii"))
        os.close(fd)
        try:
            marker_fd = os.open(MARKER, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
        except FileExistsError:
            print(f"⛔ 다른 파일 창 표식이 남아 있다: {MARKER}")
            return 2
        owns_marker = True
        os.write(
            marker_fd,
            (
                f"target={TARGET.relative_to(ROOT)}\n"
                f"original_md5={base_md5}\n"
                f"restore=python {Path(__file__).relative_to(ROOT)}\n"
                f"pid={os.getpid()}\n"
            ).encode("utf-8"),
        )
        os.close(marker_fd)
        PROBE.write_text(PROBE_TS, encoding="utf-8", newline="\n")

        print(f"대상: {TARGET.relative_to(ROOT)}")
        print(f"원본 md5: {base_md5}")
        baseline = probe()
        baseline_test = test()
        if baseline_test.returncode != 0:
            text = baseline_test.stdout.decode("utf-8", "replace")
            print(f"⛔ 기준 시험부터 빨강이다:\n{text[-2500:]}")
            return 2

        for index, (name, before, after) in enumerate(MUTATIONS, start=1):
            current = TARGET.read_bytes()
            if current != expected:
                concurrent_write = True
                failed += len(MUTATIONS) - index + 1
                print(
                    f"⛔ [{index}/{len(MUTATIONS)}] 대상 파일이 예상 밖으로 바뀌었다 — "
                    "남의 저장을 덮지 않고 중단한다"
                )
                break
            if current != original:
                TARGET.write_bytes(original)
                expected = original
                if TARGET.read_bytes() != expected:
                    concurrent_write = True
                    failed += len(MUTATIONS) - index + 1
                    print("⛔ 원복 직후 파일이 다시 바뀌었다 — 중단한다")
                    break
            before_bytes = before.encode("utf-8")
            after_bytes = after.encode("utf-8")
            if original.count(before_bytes) != 1:
                print(f"❌ [{index}/{len(MUTATIONS)}] {name}")
                print(f"   치환 자리 {original.count(before_bytes)}개 — 정확히 1개여야 한다")
                failed += 1
                continue

            mutated = original.replace(before_bytes, after_bytes, 1)
            TARGET.write_bytes(mutated)
            expected = mutated
            if TARGET.read_bytes() != expected:
                concurrent_write = True
                failed += len(MUTATIONS) - index + 1
                print("⛔ 변이 적용 직후 파일이 다시 바뀌었다 — 중단한다")
                break
            if hashlib.md5(mutated).hexdigest() == base_md5:
                print(f"❌ [{index}/{len(MUTATIONS)}] {name} — 소스가 안 바뀌었다")
                failed += 1
                continue

            try:
                changed = probe()
            except RuntimeError as error:
                print(f"❌ [{index}/{len(MUTATIONS)}] {name} — {error}")
                failed += 1
                continue
            if changed == baseline:
                print(f"❌ [{index}/{len(MUTATIONS)}] {name} — 산출물이 그대로다")
                failed += 1
                continue

            result = test()
            if result.returncode == 0:
                print(f"❌ [{index}/{len(MUTATIONS)}] {name} — 시험이 초록이다")
                failed += 1
            else:
                output = result.stdout.decode("utf-8", "replace")
                failed_lines = [
                    line.strip()
                    for line in output.splitlines()
                    if "FAIL" in line or "AssertionError" in line or "×" in line
                ]
                detail = failed_lines[0] if failed_lines else f"exit {result.returncode}"
                print(f"✅ [{index}/{len(MUTATIONS)}] {name} → {detail}")
    finally:
        current = TARGET.read_bytes()
        if current == expected:
            if current != original:
                TARGET.write_bytes(original)
        else:
            concurrent_write = True
            RECOVERY.write_bytes(original)
            print(
                "⛔ 원복 직전 대상 파일이 예상 밖으로 바뀌었다 — 원복하지 않았다.\n"
                f"   이 회차의 원본 사본: {RECOVERY.relative_to(ROOT)}"
            )
        if PROBE.exists():
            PROBE.unlink()
        if LOCK.exists():
            LOCK.unlink()
        if owns_marker and MARKER.exists():
            MARKER.unlink()

    restored = TARGET.read_bytes() == original
    restored_md5 = hashlib.md5(TARGET.read_bytes()).hexdigest()
    print(f"복원: {'예' if restored else '아니오'} · md5 {restored_md5}")
    print(f"결과: {len(MUTATIONS) - failed}/{len(MUTATIONS)} 변이를 가드가 잡았다")
    return 0 if failed == 0 and restored and not concurrent_write else 1


if __name__ == "__main__":
    raise SystemExit(main())

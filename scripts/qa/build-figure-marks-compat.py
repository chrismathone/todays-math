# -*- coding: utf-8 -*-
"""2B 마크 문법 — 하위 호환 기준선 굽기.

    python scripts/qa/build-figure-marks-compat.py [--check]

기존 실증 FigureSpec v2 전량을 모아 render_spec.py 실경로로 렌더하고,
스펙+SVG 를 `scripts/qa/fixtures/figure-marks-compat-baseline.json` 에 굽는다.
figureMarks.test.ts 가 이 파일과 **바이트(문자열) 동일**을 대조한다.

⚠️ 기준선은 **마크 문법을 넣기 전 엔진**(b0a1cce0, v2채색 병합 직후)으로 구운
것이다.  다시 굽는 것은 «렌더 바이트를 바꾸기로 결정»했다는 뜻 — 커밋 메시지에
사유를 적어라.  `--check` 는 다시 굽지 않고 지금 엔진과 대조만 한다.

코퍼스 출처(2026-08-23 수집):
  round2-*   C:/tmp/probe-round2.py CASES (중2 함수·기하/중3 접선 실증 7종)
             — 임시 파일이라 여기 JSON 으로 영구화했다
  regions-*  scripts/qa/probe-figure-regions.py SPECS (RPM 1-2 채색 실증 8종)
  m3-*       src/lib/middle/m3Figures.ts 생성기 11호출 (dump-m3-figure-specs.ts)
  cube-*     src/app/dev/cube-scrape/fixtures.ts 의 v2 스펙 2종
"""
from __future__ import annotations

import ast
import hashlib
import io
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FIXTURE = os.path.join(ROOT, "scripts", "qa", "fixtures",
                       "figure-marks-compat-baseline.json")
RENDER_SPEC = os.path.join(ROOT, "scripts", "figure", "render_spec.py")
ROUND2 = r"C:/tmp/probe-round2.py"


def collect() -> dict[str, dict]:
    specs: dict[str, dict] = {}

    # ① round2 실증 — 임시 파일에서 리터럴만 안전 추출 (있으면).  기준선을
    #    이미 구운 뒤에는 임시 파일이 사라져도 기준선 JSON 이 정본이다.
    #
    # 🔴 **그 「정본이다」가 코드에 없었다** (2026-08-25). 임시 파일이 사라지면
    #    round2 7종이 `specs` 에서 통째로 빠지고, `--check` 는 그것을 «바뀌었다»로
    #    보고했다 — 「못 구웠다」와 「달라졌다」가 구분이 안 됐다. 그리고 그대로
    #    다시 구우면 기준선에서 **7종이 조용히 사라진다.** 그래서 없으면
    #    기준선 JSON 의 스펙을 그대로 물려받는다.
    if not os.path.exists(ROUND2) and os.path.exists(FIXTURE):
        old = json.loads(io.open(FIXTURE, encoding="utf-8").read())
        for sid, entry in old.items():
            if sid.startswith("round2-"):
                specs[sid] = entry["spec"]
        print(f"  (round2 원본 임시 파일이 없다 — 기준선에서 {len(specs)}종 물려받음)")
    if os.path.exists(ROUND2):
        source = io.open(ROUND2, encoding="utf-8").read()
        tree = ast.parse(source)
        cases = None
        for node in ast.walk(tree):
            if (isinstance(node, ast.Assign)
                    and any(getattr(t, "id", "") == "CASES" for t in node.targets)):
                cases = ast.literal_eval(node.value)
        if cases is None:
            raise RuntimeError("probe-round2.py 에서 CASES 를 못 찾았다")
        round2_ids = ["linear-graph", "iso-base-angles", "bisector-two-arcs",
                      "incircle-right", "trapezoid-ratio", "grid-paths",
                      "two-tangents"]
        if len(cases) != len(round2_ids):
            raise RuntimeError(f"round2 CASES 가 {len(cases)}개 — 예상 {len(round2_ids)}")
        for rid, (_title, spec) in zip(round2_ids, cases):
            specs[f"round2-{rid}"] = spec

    # ② regions 실증 — probe 모듈에서 import (main 은 __main__ 가드 뒤).
    sys.path.insert(0, os.path.join(ROOT, "scripts", "qa"))
    regions_mod = __import__("probe-figure-regions")
    for name, entry in regions_mod.SPECS.items():
        specs[f"regions-{name}"] = entry["spec"]

    # ③ m3Figures 생성기 — tsx 로 내보낸다.
    dumped = subprocess.run(
        ["npx", "tsx", os.path.join("scripts", "qa", "dump-m3-figure-specs.ts")],
        capture_output=True, cwd=ROOT, timeout=120, shell=(os.name == "nt"))
    if dumped.returncode != 0:
        raise RuntimeError(f"dump-m3-figure-specs 실패: {dumped.stderr.decode('utf-8', 'replace')[:400]}")
    specs.update(json.loads(dumped.stdout.decode("utf-8")))

    # ④ cube-scrape v2 스펙 — TS 상수라 여기 그대로 옮겨 적지 않고 파일에서 뽑는다.
    dumped2 = subprocess.run(
        ["npx", "tsx", "-e",
         "import {ANGLE_SPEC, SHAPES_SPEC} from './src/app/dev/cube-scrape/fixtures';"
         "process.stdout.write(JSON.stringify({'cube-angle': ANGLE_SPEC, 'cube-shapes': SHAPES_SPEC}))"],
        capture_output=True, cwd=ROOT, timeout=120, shell=(os.name == "nt"))
    if dumped2.returncode != 0:
        raise RuntimeError(f"cube 스펙 추출 실패: {dumped2.stderr.decode('utf-8', 'replace')[:400]}")
    specs.update(json.loads(dumped2.stdout.decode("utf-8")))
    return specs


def render(spec: dict) -> str:
    proc = subprocess.run(
        [sys.executable, RENDER_SPEC],
        input=json.dumps(spec, ensure_ascii=False).encode("utf-8"),
        capture_output=True, cwd=ROOT, timeout=60)
    result = json.loads(proc.stdout.decode("utf-8"))
    if "svg" not in result:
        raise RuntimeError(f"렌더 실패: {result.get('error', '?')[:200]}")
    return result["svg"]


def main() -> None:
    check_only = "--check" in sys.argv[1:]
    specs = collect()
    if not specs:
        raise RuntimeError("코퍼스가 비었다")
    baseline: dict[str, dict] = {}
    for sid in sorted(specs):
        svg = render(specs[sid])
        baseline[sid] = {
            "spec": specs[sid],
            "svg": svg,
            "md5": hashlib.md5(svg.encode("utf-8")).hexdigest(),
        }
        print(f"  {sid}: {baseline[sid]['md5']}")

    if check_only:
        old = json.loads(io.open(FIXTURE, encoding="utf-8").read())
        changed = [sid for sid in old
                   if sid not in baseline or old[sid]["md5"] != baseline[sid]["md5"]]
        missing = [sid for sid in baseline if sid not in old]
        if changed or missing:
            print(f"CHANGED={changed} NEW={missing}")
            sys.exit(1)
        print(f"OK — {len(old)}개 전부 바이트 불변")
        return

    os.makedirs(os.path.dirname(FIXTURE), exist_ok=True)
    # JSON 안 문자열로 저장 — Windows EOL 변환이 SVG 바이트를 못 건드린다.
    # ⚠️ sort_keys 금지 — spec 의 키 순서가 곧 그리는 순서다.  정렬해 저장하면
    #    「저장된 spec」과 「그때 렌더한 svg」가 서로 다른 순서를 말하게 된다
    #    (실측 2026-08-23: cube-shapes 의 <line> 순서가 갈렸다).
    with io.open(FIXTURE, "w", encoding="utf-8", newline="\n") as fh:
        json.dump(baseline, fh, ensure_ascii=False, indent=1)
    print(f"구움: {len(baseline)}개 → {FIXTURE}")


if __name__ == "__main__":
    main()

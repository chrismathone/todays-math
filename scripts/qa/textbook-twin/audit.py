"""시범 반출/완결 감사: 새 문항과 외부 원장을 대조하고 원문 없이 수치·해시만 저장한다."""
from __future__ import annotations

import argparse
import collections
import json
from pathlib import Path

import integrity
from export_guard import source_copy_reasons, corpus_index, corpus_copy_reasons


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("sources")
    parser.add_argument("bundle")
    args = parser.parse_args()
    sources = {s["problemCode"]: s for s in map(json.loads, Path(args.sources).read_text().splitlines())}
    corpus = corpus_index(sources.values())
    root = Path(args.bundle)
    errors, rounds = [], {}
    proposed_codes = []
    for path in (Path(args.sources).parent / "author").glob("*.json"):
        if path.name.startswith("._") or path.name.endswith(".raw.json"):
            continue
        proposed_codes += [p["problemCode"] for p in json.loads(path.read_text()).get("proposals", [])]
    if len(proposed_codes) != len(set(proposed_codes)) or set(proposed_codes) != set(sources):
        errors.append({"error": "첫 저자 제안이 책 전체를 정확히 한 번씩 다루지 않았다"})
    for name in ("r1", "r2"):
        bundle = root / name
        if not (bundle / "freeze.json").exists():
            continue
        freeze = json.loads((bundle / "freeze.json").read_text())
        counts = collections.Counter()
        for tid, frozen in freeze["candidates"].items():
            errors += [{"id": tid, "error": e} for e in integrity.frozen_errors(bundle, tid, frozen)]
            cand = json.loads((bundle / "candidates" / f"{tid}.json").read_text())
            src = sources[cand["sourceReference"]["problemCode"]]
            errors += [{"id": tid, "error": e} for e in source_copy_reasons(src, cand) + corpus_copy_reasons(corpus, cand)]
            if cand["metadata"].get("loadable") is not False or cand["metadata"].get("productionWrites") is not False:
                errors.append({"id": tid, "error": "미등록/쓰기 금지 표지가 다르다"})
            originals = {f["sha256"] for f in src["figures"]}
            for artifact in cand["figureArtifacts"]:
                spec = json.loads((bundle / artifact["specPath"]).read_text())
                errors += [{"id": tid, "error": e} for e in source_copy_reasons(src, {"figureSpec": spec}) +
                           corpus_copy_reasons(corpus, {"figureSpec": spec})]
                svg = (bundle / artifact["svgPath"]).read_bytes()
                if integrity.digest(svg) in originals or b"<image" in svg:
                    errors.append({"id": tid, "error": "원본 그림 동일 바이트 또는 래스터 임베드"})
            for solver in ("codex", "opus", "gemini"):
                path = bundle / "solve" / solver / f"{tid}.json"
                counts[solver] += path.exists()
                if path.exists():
                    record = json.loads(path.read_text())
                    errors += [{"id": tid, "error": f"{solver} 풀이: {e}"} for e in
                               source_copy_reasons(src, record) + corpus_copy_reasons(corpus, record)]
            if not (bundle / "solve/codex" / f"{tid}.json").exists() or not any(
                    (bundle / "solve" / solver / f"{tid}.json").exists() for solver in ("opus", "gemini")):
                errors.append({"id": tid, "error": "두 독립 풀이가 아직 모이지 않았다"})
            path = bundle / "reviews" / f"{tid}.json"
            if path.exists():
                pointer = json.loads(path.read_text())
                if "raw" in pointer or "parsed" in pointer or "externalReview" not in pointer:
                    errors.append({"id": tid, "error": "검수 원문 반출 경계 위반"})
                try:
                    integrity.read_review(path)
                except (ValueError, OSError) as error:
                    errors.append({"id": tid, "error": f"외부 검수 해시/파일: {error}"})
                counts["reviews"] += 1
            else:
                errors.append({"id": tid, "error": "문항별 검수가 아직 없다"})
            counts["candidates"] += 1
            counts[cand["route"]] += 1
        rounds[name] = dict(counts)
        for hold in json.loads((bundle / "holds.json").read_text()):
            src = sources[hold["problemCode"]]
            errors += [{"id": hold["problemCode"], "error": e} for e in source_copy_reasons(src, hold) + corpus_copy_reasons(corpus, hold)]
    selection = json.loads((root / "collect.json").read_text())
    selected_codes = [r["problemCode"] for r in selection["rows"]]
    selected_codes += [r["problemCode"] for r in json.loads((root / "holds.json").read_text())]
    if len(selected_codes) != len(set(selected_codes)) or set(selected_codes) != set(sources):
        errors.append({"error": "최종 목록이 책 전체와 일대일로 맞지 않는다"})
    result = {"totalSources": len(sources), "proposedSources": len(proposed_codes), "selected": len(selected_codes), "rounds": rounds,
              "sourceCopiesDetected": sum(any(s in e["error"] for s in ("후보 필드", "연속 인용", "원문 전체 복제")) for e in errors),
              "originalFigureIdentityVerified": False, "loadable": 0, "productionWrites": False,
              "errors": errors, "limitations": ["원본 그림의 SSD 문항 대응 미검증", "유사도 문턱은 잠정 눈금", "성취기준 코드 미확인"]}
    (root / "audit.json").write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps(result, ensure_ascii=False))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

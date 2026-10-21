# -*- coding: utf-8 -*-
"""교과서 쌍둥이 시범 — 모으기(봉인된 풀이 · 검수 · 너무 닮음 → 문항마다 상태 하나).

  python collect.py <묶음 폴더>

상태(하나만):
  통과            엔진·저자 갈래 모두 두 모델 풀이가 정답과 같고 · 검수 verdict pass ·
                  너무 닮음이 보류가 아님(«경고 · 손 판정»은 검수의 distinctPresentation 이 true 일 때만)
  보류 — 수학      풀이 하나라도 정답과 다름 · 못 읽음
  보류 — 답 표기(값은 같음)  풀이의 값은 같은데 단위가 한쪽에만 있다(단위를 지우고 같다고 하지 않는다 — 1회차 E)
  보류 — 검수      검수 verdict hold · 검수 없음
  보류 — 너무 닮음  결정적 수치가 보류 문턱
  (저자 · 엔진 · 그림 단계의 보류는 `holds.json`)
봉인 확인: 풀이 기록의 학생 면 해시가 `freeze.json` 과 같아야 한다 — 다르면 «보류 — 봉인».
🔴 통과는 «이 시범의 관문을 지났다»일 뿐이다 — 적재 0 · `loadable:false` · 출처 · 권리 · 사람 검토는 따로.
"""
from __future__ import annotations

import argparse
import collections
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

import answers  # noqa: E402
import integrity
from review import CHECKS, SURFACES, MODEL as REVIEW_MODEL
from solve import MODELS
from execution_evidence import solver_evidence, review_evidence, evidence_specificity

LEGACY_BASELINE = "662b7c10c2d7e9168b0ede49050e262ec99439ac"

SOLVERS = ("codex", "opus", "gemini")
STAGE_LABELS = {"author": "저작", "figure": "그림", "engine": "엔진", "shape": "형식", "source-copy": "원문 복제 의심"}


def check_value(v):
    """검사 칸 — {"value": …, "evidence": …} 꼴과 맨 값 꼴을 다 읽는다. 근거 없는 true 는 true 로 치지 않는다(기출 계약)"""
    if isinstance(v, dict):
        return v.get("value") if isinstance(v.get("evidence"), str) and v["evidence"].strip() else None
    return None


def derived_verdict(review: dict | None, candidate: dict | None = None) -> str:
    """검수 지시문의 규칙 그대로 다시 계산한 판정 — 검수자의 verdict 와 다르면 엄한 쪽을 쓴다(칸이 빠진 응답도 읽는다)"""
    if not review:
        return "hold"

    def status(v):
        return v.get("status") if isinstance(v, dict) and isinstance(v.get("basis"), str) and v["basis"].strip() else None

    checks, surfaces = review.get("checks") or {}, review.get("surfaces") or {}
    optional_checks = {"choicesCorrect", "figureConsistent", "scoreAppropriate"}
    optional_surfaces = {"choices", "figuresAndTables"}
    if candidate:
        if candidate.get("score") is not None:
            optional_checks.discard("scoreAppropriate")
        if candidate.get("choices"):
            optional_checks.discard("choicesCorrect")
            optional_surfaces.discard("choices")
        if candidate.get("figureArtifacts") or re.search(r"<table\b|\\begin\{(?:array|tabular)\}|\[표\]", candidate.get("content", "")):
            optional_checks.discard("figureConsistent")
            optional_surfaces.discard("figuresAndTables")
    checks_ok = set(checks) == set(CHECKS) and all(check_value(v) is True or
        (k in optional_checks and check_value(v) == "n/a") for k, v in checks.items())
    surfaces_ok = set(surfaces) == set(SURFACES) and all(status(v) in ("pass", "passed") or
        (k in optional_surfaces and status(v) == "n/a") for k, v in surfaces.items())
    ok = (checks_ok and surfaces_ok and review.get("engineTypeFit") in ("same", "n/a") and review.get("difficulty") == "same"
          and review.get("questionTypeSame") is True)
    rule = "pass" if ok else "hold"
    if candidate and (review.get("issues") or
                      (candidate.get("route") == "engine" and review.get("engineTypeFit") != "same") or
                      answers.compare(candidate["answer"], review.get("verifiedAnswer") or "")[0] != "match"):
        return "hold"
    return "pass" if rule == "pass" and review.get("verdict") == "pass" else "hold"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle")
    parser.add_argument("--output", type=Path, help="재검증 결과를 기존 봉인 묶음 대신 별도 경로에 보존")
    args = parser.parse_args()
    bundle = Path(args.bundle)
    head = integrity.git_head(bundle)
    freeze = json.loads((bundle / "freeze.json").read_text(encoding="utf-8"))
    rows, tally = [], collections.Counter()
    for tid, frozen in freeze["candidates"].items():
        cand = json.loads((bundle / "candidates" / f"{tid}.json").read_text(encoding="utf-8"))
        solves, reasons = {}, integrity.frozen_errors(bundle, tid, frozen)
        author_models, author_sessions = integrity.author_roles(cand)
        if not author_models or not author_sessions:
            reasons.append("저자 모델/세션 증거 부족")
        records = {}
        for solver in SOLVERS:
            f = bundle / "solve" / solver / f"{tid}.json"
            if not f.exists():
                continue
            record = json.loads(f.read_text(encoding="utf-8"))
            records[solver] = record
            if record.get("model") in author_models or record.get("sessionId") in author_sessions:
                reasons.append(f"{solver}가 저작/그림 수정과 독립된 모델·세션이 아니다")
            if record["studentSha256"] != frozen["student"]:
                reasons.append(f"{solver} 풀이가 동결된 학생 면과 다르다")
            if not integrity.committed_specs(bundle, cand, record.get("freezeCommit") or "HEAD"):
                reasons.append(f"{solver} 사전 동결 커밋의 그림 스펙과 현재 바이트가 다르다")
            exposure = record.get("exposure") or {}
            if (record.get("returncode") != 0 or record.get("twinExternalId") != tid or record.get("solver") != solver or
                    not record.get("sessionId") or record.get("model") != MODELS[solver] or
                    not isinstance((record.get("parsed") or {}).get("work"), str) or
                    not (record.get("parsed") or {}).get("work", "").strip() or
                    exposure.get("answerKeyOrSourceAvailableInWorkdir") is not False or
                    exposure.get("toolPolicyVerified") is not True or
                    exposure.get("received") != sorted(frozen["student"]) or
                    not record.get("freezeCommit") or not integrity.committed_freeze(bundle, tid, frozen, record.get("freezeCommit", "HEAD"))):
                reasons.append(f"{solver} 실행 성공/노출/사전 동결 증거 부족")
            got = (record.get("parsed") or {}).get("answer") or ""
            verdict, why = answers.compare(cand["answer"], got)
            solves[solver] = {"answer": got, "verdict": verdict, "why": why,
                              "issues": (record.get("parsed") or {}).get("issues") or []}
        review_file = bundle / "reviews" / f"{tid}.json"
        try:
            review_record = integrity.read_review(review_file) if review_file.exists() else {}
        except (ValueError, OSError) as error:
            review_record = {}
            reasons.append(f"검수 기록 손상: {error}")
        review = review_record.get("parsed")
        proof = {"solvers": {}, "review": {}, "specificity": evidence_specificity(review or {})}
        if review_record:
            if (review_record.get("returncode") != 0 or not review_record.get("sessionId") or
                    review_record.get("candidateSha256") != frozen["candidateSha256"] or
                    review_record.get("studentSha256") != frozen["student"] or not review_record.get("sealCommit")):
                reasons.append("검수가 현재 동결본/봉인 커밋과 연결되지 않았다")
            if (review_record.get("twinExternalId") != tid or review_record.get("reviewer") != REVIEW_MODEL or
                    review_record.get("reviewer") in {*author_models, *(r.get("model") for r in records.values())} or
                    review_record.get("sessionId") in {*author_sessions, *(r.get("sessionId") for r in records.values())} or
                    (review_record.get("exposure") or {}).get("sawSolverAnswers") != sorted(records)):
                reasons.append("검수자의 문항/모델/세션/공개 대상이 독립 역할과 맞지 않는다")
            try:
                pointer = json.loads(review_file.read_text())
                external = Path(pointer["externalReview"]) if pointer.get("externalReview") else None
                run_root = external.parents[2] if external else None
                legacy = integrity.committed(review_file, LEGACY_BASELINE) and integrity.is_ancestor(bundle, LEGACY_BASELINE, head)
                proof["review"] = review_evidence(review_record, external, legacy, bundle=bundle)
                reasons += proof["review"]["errors"]
                for solver, record in records.items():
                    proof["solvers"][solver] = solver_evidence(record, run_root)
                    reasons += [f"{solver}: {error}" for error in proof["solvers"][solver]["errors"]]
            except (OSError, ValueError, KeyError, TypeError) as error:
                reasons.append(f"외부 실행 증거 읽기/검증 실패: {type(error).__name__}")
            for solver in records:
                solve_file = bundle / "solve" / solver / f"{tid}.json"
                if ((review_record.get("solveSha256") or {}).get(solver) != integrity.digest(solve_file.read_bytes()) or
                        not integrity.committed(solve_file, review_record.get("sealCommit", "HEAD"))):
                    reasons.append(f"{solver} 원시 풀이를 검수 전에 커밋하지 않았거나 이후 바뀌었다")
                freeze_commit, seal_commit = records[solver].get("freezeCommit", ""), review_record.get("sealCommit", "")
                if (not integrity.is_ancestor(bundle, freeze_commit, seal_commit, strict=True)
                        or not integrity.is_ancestor(bundle, seal_commit, head)):
                    reasons.append(f"{solver} freeze→seal→현재 HEAD 조상 관계 위반")
        sim = cand["metadata"]["similarity"]
        if sim.get("verdict") not in {"pass", "warn", "manual", "hold"}:
            reasons.append("알 수 없는 유사도 판정")
        engine = cand["route"] == "engine"
        need = 2
        if len(records) >= 2 and (len({r.get("sessionId") for r in records.values()}) != len(records) or
                                 len({r.get("model") for r in records.values()}) != len(records)):
            reasons.append("독립 모델/세션이 둘이 아니다")
        matched = sum(1 for s in solves.values() if s["verdict"] == "match")
        unit_only = [s for s in solves.values() if s["verdict"] == "hold" and s["why"].startswith("단위가 한쪽에만")]
        if reasons:
            status = "보류 — 봉인"
        elif sim["verdict"] == "hold":
            status = "보류 — 너무 닮음"
            reasons += sim["reasons"]
        elif "codex" not in solves or len(solves) < need or any(s["verdict"] != "match" or s["issues"] for s in solves.values()) or matched < need:
            # 값은 같고 단위만 한쪽에 있는 답은 수학 불일치와 따로 센다 — 사람이 보면 끝나는 일이다
            others = [s for s in solves.values() if s["verdict"] != "match" and s not in unit_only]
            status = "보류 — 답 표기(값은 같음)" if unit_only and not others and len(solves) >= need else "보류 — 수학"
            reasons += [f"{k}: {v['why']}({v['answer']})" for k, v in solves.items() if v["verdict"] != "match"]
            if len(solves) < need:
                reasons.append(f"풀이 {len(solves)}/{need}")
            reasons += [f"{k} 문항 지적: {v['issues']}" for k, v in solves.items() if v["issues"]]
        elif derived_verdict(review, cand) != "pass":
            status = "보류 — 검수"
            reasons.append("독립 검수 기준 미충족 — 상세 근거는 외부 검수 원장" if review else "검수 없음")
        elif sim["verdict"] in ("warn", "manual") and check_value((review.get("checks") or {}).get("distinctPresentation")) is not True:
            status = "보류 — 너무 닮음"
            reasons += sim["reasons"]
        else:
            status = "통과"
        tally[status] += 1
        rows.append({"twinExternalId": tid, "problemCode": cand["sourceReference"]["problemCode"], "route": cand["route"],
                     "status": status, "reasons": reasons, "solves": solves, "similarity": sim["verdict"],
                     "executionEvidence": proof,
                     "review": {**{k: (review or {}).get(k) for k in ("verdict", "engineTypeFit", "difficulty", "questionTypeSame")},
                                "derived": derived_verdict(review, cand)}})
    holds = json.loads((bundle / "holds.json").read_text(encoding="utf-8"))
    for h in holds:
        tally[f"보류 — {STAGE_LABELS.get(h['stage'], h['stage'])}"] += 1
    result = {"tally": dict(tally), "candidates": len(rows), "earlierHolds": len(holds), "loadable": 0, "rows": rows}
    (args.output or bundle / "collect.json").write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for k, v in sorted(tally.items(), key=lambda kv: -kv[1]):
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()

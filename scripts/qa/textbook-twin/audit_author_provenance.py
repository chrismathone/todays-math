"""저작/그림 보완의 실제 봉투, 기록 모델, 추정을 분리한다. 읽기 전용, 외부 출력 전용."""
from __future__ import annotations

import argparse
import collections
import json
import re
from pathlib import Path

from integrity import digest
from solve import parse


def envelope_evidence(path: Path | None, model: str | None, session: str | None) -> dict:
    result = {"recordedModel": model, "sessionId": session, "actualModels": [],
              "actualEnvelopeVerified": False, "identityVerified": False, "actualEnvelopeVerifiedScope": "identity-only",
              "evidenceLevel": "record-only" if model else "inference-only"}
    if path is None or not path.exists():
        return result
    data = path.read_bytes()
    envelope = json.loads(data)
    actual = sorted(envelope.get("modelUsage", {}))
    verified = bool(session and actual and envelope.get("session_id") == session
                    and envelope.get("is_error") is False and (not model or actual == [model]))
    return {**result, "envelopePath": str(path), "envelopeSha256": digest(data), "actualModels": actual,
            "actualEnvelopeVerified": verified, "identityVerified": verified, "evidenceLevel": "actual-envelope" if verified else "conflicting-envelope"}


def proposal_evidence(record: dict, path: Path, envelope_path: Path) -> dict:
    result = {"proposalContentVerified": False, "proposalContentStatus": "missing-envelope",
              "candidateFinalContentCompared": False}
    if not envelope_path.is_file():
        return result
    result["proposalContentStatus"] = "mismatch"
    try:
        from author import parse_result
        raw_bytes = envelope_path.read_bytes()
        raw = json.loads(raw_bytes)["result"]
        repair = record.get("formatRepair")
        if repair:
            result["proposalContentStatus"] = "invalid-format-repair"
            fixed_file = path.with_suffix(".format-repaired.txt")
            if not fixed_file.is_file(): return result
            fixed_bytes = fixed_file.read_bytes()
            result.update({"formatRepairPath": str(fixed_file), "formatRepairSha256": digest(fixed_bytes)})
            fenced = re.fullmatch(r"```json\s*(.*?)\s*```", raw.strip(), re.S)
            body = fenced.group(1) if fenced else raw.strip()
            # 허용된 과거 복구 하나만 재현: fence 제거 뒤 마지막 잉여 } 한 개 삭제.
            reproduced, count = re.subn(r"\}\s*\]\s*$", "]", body, count=1)
            if (repair.get("kind") != "remove-one-surplus-final-closing-brace" or count != 1
                    or repair.get("rawSha256") != digest(raw_bytes)
                    or repair.get("repairedResponseSha256") != digest(fixed_bytes)
                    or reproduced.encode() != fixed_bytes):
                return result
            proposals = json.loads(reproduced)
            method = "exact-format-repair-match"
        else:
            proposals = parse_result(raw)
            method = "direct-match"
        verified = isinstance(proposals, list) and proposals == record.get("proposals")
        return {**result, "proposalContentVerified": verified, "proposalContentStatus": method if verified else "mismatch"}
    except (ValueError, KeyError, TypeError, OSError):
        return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("work", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--independent-impact", type=Path)
    args = parser.parse_args()
    repo = Path(__file__).resolve().parents[3]
    if args.output.resolve().is_relative_to(repo):
        parser.error("감사 상세는 저장소 밖에만 허용")
    inputs, errors = {}, []

    def read(path):
        data = path.read_bytes()
        inputs[str(path.resolve())] = digest(data)
        return json.loads(data)

    final = read(args.bundle / "collect.json")
    selected = {r["twinExternalId"]: r for r in final["rows"]}
    passed = {tid for tid, r in selected.items() if r["status"] == "통과"}
    authors, authors_by_session = [], collections.defaultdict(list)
    for folder in ("author", "author-r2"):
        for path in sorted((args.work / folder).glob("*.json")):
            if path.name.startswith("._") or path.name.endswith(".raw.json"):
                continue
            record = read(path)
            raw = path.with_suffix(".raw.json")
            if raw.exists():
                read(raw)
            entry = {"recordPath": str(path), "recordSha256": inputs[str(path.resolve())],
                     "problemCodes": [p["problemCode"] for p in record["proposals"]],
                     **envelope_evidence(raw, record.get("model"), record.get("sessionId")),
                     **proposal_evidence(record, path, raw)}
            if entry.get("formatRepairPath"):
                fixed = Path(entry["formatRepairPath"])
                inputs[str(fixed.resolve())] = digest(fixed.read_bytes())
            if raw.exists() and not entry["proposalContentVerified"]:
                errors.append({"path": str(path), "error": "저작 raw→proposals 내용/정확 형식 복구 불일치"})
            authors.append(entry)
            authors_by_session[record.get("sessionId")].append(entry)
            if entry["evidenceLevel"] == "conflicting-envelope":
                errors.append({"path": str(path), "error": "저작 봉투 모델/세션/실행 불일치"})

    envelopes, reports = collections.defaultdict(list), []
    for path in sorted(args.work.glob("**/figure-repair-response-*.json")):
        if path.name.startswith("._"):
            continue
        record = read(path)
        envelopes[record.get("session_id")].append(path)
    for path in sorted(args.work.glob("**/figures-report-final.json")):
        if not path.name.startswith("._"):
            reports.append((path, read(path).get("repairs", {})))
    body_missing, figure_missing, repairs, candidates = set(), set(), [], []
    for rnd in ("r1", "r2"):
        for path in sorted((args.bundle / rnd / "candidates").glob("*.json")):
            if path.name.startswith("._"):
                continue
            candidate = read(path)
            tid = path.stem
            code = candidate["sourceReference"]["problemCode"]
            metadata = candidate["metadata"]
            identity = metadata.get("engine", {}).get("proposedBy", "") if candidate["route"] == "engine" else candidate.get("authorId", "")
            recorded_model, _, session = identity.partition(":")
            body = [r for r in authors_by_session[session] if code in r["problemCodes"]]
            if len(body) != 1 or body[0]["recordedModel"] != recorded_model:
                errors.append({"id": tid, "error": "후보 저작 기록 연결 불일치"})
            if not body or not all(r["actualEnvelopeVerified"] for r in body):
                body_missing.add(tid)
            candidate_repairs = metadata.get("figureAuthoring", {}).get("specRepairs", [])
            for index, repair in enumerate(candidate_repairs):
                matches = envelopes.get(repair.get("session"), [])
                if len(matches) > 1:
                    errors.append({"id": tid, "repairIndex": index, "error": "그림 보완 세션 봉투 중복"})
                raw = matches[0] if len(matches) == 1 else None
                proof = envelope_evidence(raw, repair.get("model"), repair.get("session"))
                if proof["evidenceLevel"] == "conflicting-envelope":
                    errors.append({"id": tid, "repairIndex": index, "error": "그림 봉투 모델/세션/실행 불일치"})
                report_paths = [p for p, items in reports if repair in items.get(tid, [])]
                entry = {"twinExternalId": tid, "problemCode": code, "repairIndex": index,
                         "repairRound": repair.get("round"), "gotSpec": repair.get("gotSpec"),
                         "inferredModel": recorded_model if not repair.get("model") else None,
                         "inferenceBasis": "본문 저자 모델로 대체한 과거 규칙; 실제 모델 증거 아님" if not repair.get("model") else None,
                         "metadataReportPaths": [str(p) for p in report_paths], **proof}
                if not report_paths:
                    errors.append({"id": tid, "repairIndex": index, "error": "그림 메타기록 연결 없음"})
                if raw:
                    envelope = read(raw)
                    try:
                        spec = (parse(envelope.get("result", "")) or {}).get("spec")
                        spec_path = raw.parent / f"specs-repair{repair['round']}.json"
                        saved = read(spec_path).get(tid) if spec_path.exists() else None
                        entry["responseSpecMatchesSavedRound"] = spec is not None and spec == saved
                        entry["specPath"] = str(spec_path)
                        if not entry["responseSpecMatchesSavedRound"]:
                            errors.append({"id": tid, "repairIndex": index, "error": "그림 응답과 저장 스펙 불일치"})
                    except (ValueError, TypeError, AttributeError) as error:
                        errors.append({"id": tid, "error": f"그림 원응답 파싱: {error}"})
                if not proof["actualEnvelopeVerified"]:
                    figure_missing.add(tid)
                repairs.append(entry)
            status = selected.get(tid, {}).get("status")
            missing_roles = [role for role, ids in (("body", body_missing), ("figureRepair", figure_missing)) if tid in ids]
            candidates.append({"twinExternalId": tid, "selected": tid in selected, "contentGateStatus": status,
                "answerAgreementStatus": ("match" if all(s["verdict"] == "match" for s in selected[tid]["solves"].values())
                                          else "hold") if tid in selected else None,
                "executionLineageStatus": ("unverified-missing-envelope" if missing_roles else
                    "rejected-proposal-content" if not all(r["proposalContentVerified"] for r in body) else
                    "no-gap-in-body-figure-envelope-scope"),
                "missingRoles": missing_roles, "bodyEvidence": body,
                "eligibleForMerge": False, "limitation": "전체 실행계보/원문/수학 인증 아님. 독립 최종 검토가 별도로 필요"})
    sets = {"bodyOnly": sorted((body_missing - figure_missing) & passed),
            "figureOnly": sorted((figure_missing - body_missing) & passed),
            "intersection": sorted(body_missing & figure_missing & passed),
            "union": sorted((body_missing | figure_missing) & passed)}
    summary = {"authorRecords": len(authors), "authorIdentityVerified": sum(r["identityVerified"] for r in authors),
        "authorProposalContentVerified": sum(r["proposalContentVerified"] for r in authors),
        "authorProposalContentStates": dict(collections.Counter(r["proposalContentStatus"] for r in authors)),
        "historicalBodyRecords": sum(not r["actualEnvelopeVerified"] for r in authors),
        "bodyCandidates": len(body_missing), "bodyFinalPass": len(body_missing & passed),
        "figureRepairEvents": len(repairs), "figureRepairEnvelopesVerified": sum(r["actualEnvelopeVerified"] for r in repairs),
        "figureMissingEnvelopeEvents": sum(not r["actualEnvelopeVerified"] for r in repairs),
        "figureMissingEnvelopeCandidates": len(figure_missing),
        "figureMissingModelFieldEvents": sum(not r["recordedModel"] for r in repairs),
        "figureRecordedOpusMissingEnvelopeEvents": sum(r["recordedModel"] == "claude-opus-5-5" and not r["actualEnvelopeVerified"] for r in repairs),
        "figureFinalPass": len(figure_missing & passed), "finalPassIntersection": len(sets["intersection"]),
        "finalPassUnion": len(sets["union"]), "finalPassTotal": len(passed),
        "finalPassWithoutTheseTwoMissingEnvelopeCategories": len(passed - body_missing - figure_missing)}
    if args.independent_impact:
        independent = read(args.independent_impact)
        if independent["finalPassSets"] != sets:
            errors.append({"error": "독립 검토 최종 ID 목록과 불일치"})
        for key, value in summary.items():
            if key in independent["summary"] and independent["summary"][key] != value:
                errors.append({"error": "독립 검토 집계와 불일치", "key": key})
    # 생성 단계에서 보류돼 후보로 봉인되지 않은 시도도 따로 보존한다.
    tracked = {(r["twinExternalId"], r["repairRound"], r["sessionId"]) for r in repairs}
    unused = {}
    for path, items in reports:
        for tid, rows in items.items():
            for repair in rows:
                key = (tid, repair.get("round"), repair.get("session"))
                if key in tracked:
                    continue
                matches = envelopes.get(repair.get("session"), [])
                raw = matches[0] if len(matches) == 1 else None
                proof = envelope_evidence(raw, repair.get("model"), repair.get("session"))
                unused[key] = {"twinExternalId": tid, "repairRound": repair.get("round"),
                    "gotSpec": repair.get("gotSpec"), "reportPath": str(path), **proof,
                    "scope": "봉인된 후보 specRepairs에 없는 생성 보류 시도; 최종 통과 영향 합집합에 더하지 않음"}
    result = {"summary": summary, "finalPassSets": sets, "errors": errors, "authors": authors,
              "figureRepairs": repairs, "candidates": candidates, "inputs": inputs,
              "unmaterializedFigureRepairs": list(unused.values()),
              "allReportRepairEvents": len(tracked) + len(unused),
              "scope": "기존 provenance 감사가 빠뜨린 그림 보완 69회 포함. missing은 검증 성공이 아니며 오류 0으로 소거되지 않음."}
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=1) + "\n")
    print(json.dumps(summary, ensure_ascii=False))
    print("contradictions", json.dumps(errors, ensure_ascii=False))
    if errors:
        raise SystemExit(1)


if __name__ == "__main__":
    main()

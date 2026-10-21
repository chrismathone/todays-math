"""보존된 CLI 사건으로 실행/도구/원응답을 검증한다. 모델 호출은 하지 않는다."""
from __future__ import annotations

import json
import re
from pathlib import Path

from integrity import digest
from subscription_cli import claude_model_matches, gemini_tool_policy


def events_from(text: str) -> list[dict]:
    try:
        value = json.loads(text)
        return [value] if isinstance(value, dict) else []
    except ValueError:
        return [json.loads(line) for line in text.splitlines() if line.startswith("{")]


def codex_trace(events: list[dict]) -> dict:
    sessions = {e["thread_id"] for e in events if e.get("type") == "thread.started" and e.get("thread_id")}
    tools, pending = set(), set()
    failed, completed = False, False
    message, recovered = None, 0
    for index, event in enumerate(events):
        kind = event.get("type", "")
        if kind == "turn.started":
            completed = False
        elif kind == "turn.completed":
            completed = True
        elif kind in ("turn.failed", "turn.incomplete", "turn.cancelled", "item.failed"):
            failed = True
        elif kind == "error":
            # 실제 자료의 일시 재연결은 이후 완료될 때만 허용한다.
            if str(event.get("message", "")).startswith("Reconnecting..."):
                recovered += 1
                completed = False
            else:
                failed = True
        if kind.startswith("item."):
            item = event.get("item") or {}
            item_id = item.get("id", f"missing-id-{index}")
            if item.get("type") not in ("agent_message", "reasoning"):
                tools.add(item_id)
                if kind == "item.completed":
                    pending.discard(item_id)
                else:
                    pending.add(item_id)
            if item.get("status") in ("failed", "incomplete", "cancelled"):
                failed = True
            if kind == "item.completed" and item.get("type") == "agent_message":
                message = item.get("text")
    success = bool(len(sessions) == 1 and completed and not failed and not pending and isinstance(message, str)
                   and any(e.get("type") == "turn.started" for e in events))
    return {"sessionId": next(iter(sessions)) if len(sessions) == 1 else None, "raw": message,
            "executionComplete": success, "toolCalls": len(tools), "toolPolicyVerified": success and not tools,
            "pendingTools": len(pending), "reconnectionEvents": recovered}


def claude_trace(events: list[dict], cwd: Path, allowed_names: list[str], model: str) -> dict:
    result = next((e for e in reversed(events) if e.get("type") == "result"), {})
    calls = [block for event in events for block in (event.get("message") or {}).get("content", [])
             if isinstance(block, dict) and block.get("type") == "tool_use"]
    allowed = {(cwd / name).resolve() for name in allowed_names}
    paths = [(cwd / (call.get("input") or {}).get("file_path", "")).resolve() for call in calls]
    stream = any(e.get("type") == "system" and e.get("subtype") == "init" for e in events)
    complete = bool(result.get("session_id") and result.get("is_error") is False
                    and result.get("subtype") == "success" and claude_model_matches(result, model))
    ok = stream and complete and all(call.get("name") == "Read" and path in allowed for call, path in zip(calls, paths))
    return {"sessionId": result.get("session_id"), "raw": result.get("result", ""), "executionComplete": complete,
            "toolTraceAvailable": stream, "toolCalls": len(calls), "toolPolicyVerified": ok,
            "accessedPaths": [str(p) for p in paths]}


def parsed_matches(record: dict) -> bool:
    from solve import parse
    raw = record.get("raw") or ""
    parsed = parse(raw)
    repair = record.get("formatRepair")
    if repair:
        # 허용하는 복구는 유효하지 않은 JSON 역슬래시의 이스케이프뿐이다.
        # 임의의 새 답/풀이 파일을 해시만 맞춰 제출해도 채택하지 않는다.
        path = Path(repair.get("externalRepairedJson", ""))
        if (not path.is_file() or digest(raw.encode()) != repair.get("originalRawSha256")
                or digest(path.read_bytes()) != repair.get("repairedJsonSha256")):
            return False
        escaped = re.sub(r'(?<!\\)\\(?!["\\/bfnrtu])', r"\\\\", raw)
        parsed = parse(escaped)
        if parsed != json.loads(path.read_text()):
            return False
    return isinstance(parsed, dict) and parsed == record.get("parsed")


def solver_evidence(record: dict, run_root: Path | None) -> dict:
    solver, tid = record.get("solver"), record.get("twinExternalId")
    names = {"codex": "events.jsonl", "opus": "claude-envelope.json", "gemini": "agy-envelope.json"}
    errors = []
    if not parsed_matches(record):
        errors.append("원응답/parsed 불일치")
    direct = (record.get("executionEvidence") or {}).get("eventsPath")
    paths = [Path(direct)] if direct else sorted((run_root / solver).glob(f"{tid}*/{names[solver]}")) if run_root and solver in names else []
    match = None
    for path in paths:
        if not path.is_file():
            continue
        events = events_from(path.read_text())
        if solver == "codex":
            trace = codex_trace(events)
            if trace["raw"] != (path.parent / "last.txt").read_text():
                trace["executionComplete"] = False
        elif solver == "opus":
            trace = claude_trace(events, path.parent, list(record["studentSha256"]), record["model"])
        elif solver == "gemini":
            result = next((e.get("result") or {} for e in reversed(events) if e.get("event") == "result"), {})
            model = next(((e.get("init") or {}).get("model") for e in events if e.get("event") == "init"), None)
            count, policy = gemini_tool_policy(events, path.parent)
            trace = {"sessionId": result.get("conversation_id"), "raw": result.get("response", ""),
                     "executionComplete": result.get("status") == "SUCCESS" and model == record["model"],
                     "toolCalls": count, "toolPolicyVerified": policy}
        else:
            continue
        if trace["sessionId"] == record.get("sessionId"):
            match = (path, trace)
            break
    if match is None:
        return {"errors": errors + ["대응하는 외부 CLI 사건 없음"], "status": "unverified"}
    path, trace = match
    if not record.get("eventsSha256") or digest(path.read_bytes()) != record["eventsSha256"]:
        errors.append("실제 사건 해시 불일치/부재")
    if not trace["executionComplete"] or trace["raw"] != record.get("raw"):
        errors.append("실제 CLI 실패/미완료/원응답 불일치")
    exposure = record.get("exposure") or {}
    if (not trace["toolPolicyVerified"] or exposure.get("toolPolicyVerified") is not True
            or trace["toolCalls"] != exposure.get("toolCalls")):
        errors.append("실제 도구 사건과 허용 경로/선언 불일치")
    for name, expected in record.get("studentSha256", {}).items():
        supplied = path.parent / name
        if not supplied.is_file() or digest(supplied.read_bytes()) != expected:
            errors.append("실행 입력 바이트 불일치")
    return {"errors": errors, "status": "verified-retained-evidence" if not errors else "rejected",
            "eventsPath": str(path), "eventsSha256": digest(path.read_bytes()),
            **{k: v for k, v in trace.items() if k != "raw"}}


def review_evidence(record: dict, external: Path | None, legacy_allowed: bool = False) -> dict:
    from review import MODEL
    errors = []
    if record.get("reviewer") != MODEL:
        errors.append("검수자 허용 모델 누락/불일치")
    if not parsed_matches(record):
        errors.append("검수 원응답/parsed 불일치")
    tracing = record.get("executionEvidence") or {}
    path = Path(tracing["eventsPath"]) if tracing.get("eventsPath") else external.parent / "review-envelope.json" if external else None
    if path is None or not path.is_file():
        return {"errors": errors + ["검수 원봉투 없음"], "toolTraceStatus": "unverified"}
    events = events_from(path.read_text())
    allowed = list((tracing.get("inputSha256") or {}))
    trace = claude_trace(events, path.parent, allowed, MODEL)
    if (not trace["executionComplete"] or trace["sessionId"] != record.get("sessionId")
            or trace["raw"] != record.get("raw")):
        errors.append("검수 실제 봉투 모델/세션/응답/실행 불일치")
    if tracing:
        if (tracing.get("version") != 1 or tracing.get("eventsSha256") != digest(path.read_bytes())
                or not trace["toolPolicyVerified"] or record.get("exposure", {}).get("toolCalls") != trace["toolCalls"]
                or record.get("exposure", {}).get("toolPolicyVerified") is not True):
            errors.append("검수 실제 도구 추적/해시/선언 불일치")
        for name, expected in (tracing.get("inputSha256") or {}).items():
            # 선언한 임의 파일을 허용 경로로 세탁하지 않는다.
            if not re.fullmatch(r"(?:original-fig-\d+|twin-fig-1)\.(?:png|jpg|jpeg|webp|svg)", name):
                errors.append("검수 허용 그림 이름 위반")
                continue
            file = path.parent / name
            if not file.is_file() or digest(file.read_bytes()) != expected:
                errors.append("검수 입력 그림 바이트 불일치")
        if {(path.parent / name).resolve() for name in allowed} - {Path(p) for p in trace["accessedPaths"]}:
            errors.append("새 검수에 선언한 그림의 실제 Read 사건 없음")
        status = "verified-retained-events" if not errors else "rejected"
    else:
        status = "legacy-unverified-paths"
        if not legacy_allowed:
            errors.append("새 검수에 실제 도구 사건 추적 없음")
    declared = sorted(p.name for p in path.parent.iterdir() if re.fullmatch(r"(?:original-fig-\d+|twin-fig-1)\.(?:png|jpg|jpeg|webp|svg)", p.name))
    return {"errors": errors, "toolTraceStatus": status, "envelopeSha256": digest(path.read_bytes()),
            "declaredFigureInputs": declared, "accessedPaths": trace["accessedPaths"] if tracing else None,
            "actualAccessVerified": bool(tracing and not errors)}


def evidence_specificity(review: dict) -> dict:
    """중복/일반 근거의 기계 표시일 뿐 문항별 의미 타당성 인증은 아니다."""
    texts = {f"{group}.{key}": str(value.get(field, "")).strip()
             for group, field in (("checks", "evidence"), ("surfaces", "basis"))
             for key, value in (review.get(group) or {}).items() if isinstance(value, dict)}
    duplicates = [[k for k, v in texts.items() if v == text] for text in set(texts.values())
                  if text and sum(v == text for v in texts.values()) > 1]
    generic = [key for key, text in texts.items() if text in {"근거", "확인", "문제없음", "이상 없음", "검토 완료"}]
    return {"duplicateEvidenceFields": sorted(duplicates), "genericEvidenceFields": sorted(generic),
            "semanticSpecificityVerified": False}

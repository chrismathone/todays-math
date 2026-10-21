"""보존된 CLI 사건으로 실행/도구/원응답을 검증한다. 모델 호출은 하지 않는다."""
from __future__ import annotations

import base64
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


def read_result_matches(event: dict, block: dict, file: Path, expected: str | None) -> bool:
    """성공 반환의 실제 payload를 요청 파일에 연결한다. 요청 경로나 성공 문구만으로 인증하지 않는다."""
    if block.get('is_error', False) is not False or not expected or not file.is_file() or file.is_symlink():
        return False
    content = block.get('content')
    if not isinstance(content, list) or len(content) != 1 or not isinstance(content[0], dict):
        return False
    item = content[0]
    try:
        if item.get('type') == 'image' and item.get('source', {}).get('type') == 'base64':
            payload = base64.b64decode(item['source']['data'], validate=True)
        else:
            # 현재 승인한 그림 Read 반환은 이미지 원바이트뿐이다. 변환/부분/미지원 반환은 보류한다.
            return False
        if digest(payload) != expected or digest(file.read_bytes()) != expected:
            return False
        metadata = event.get('tool_use_result')
        if metadata is not None:
            if not isinstance(metadata, dict) or metadata.get('type') != 'image':
                return False
            info = metadata.get('file') or {}
            if (base64.b64decode(info['base64'], validate=True) != payload
                    or ('originalSize' in info and info['originalSize'] != len(payload))):
                return False
            for obj in (metadata, info):
                for key in ('filePath', 'file_path', 'path'):
                    if key in obj and (file.parent / obj[key]).resolve() != file.resolve():
                        return False
        return True
    except (ValueError, KeyError, TypeError, OSError):
        return False


def claude_trace(events: list[dict], cwd: Path, allowed_names: list[str], model: str,
                 expected_hashes: dict | None = None) -> dict:
    initials = [e for e in events if e.get('type') == 'system' and e.get('subtype') == 'init']
    finals = [e for e in events if e.get('type') == 'result']
    result = finals[-1] if finals else {}
    session = initials[0].get('session_id') if len(initials) == 1 else None
    allowed = {(cwd / name).resolve(): name for name in allowed_names}
    hashes = expected_hashes if expected_hashes is not None else {
        name: digest((cwd / name).read_bytes()) for name in allowed_names if (cwd / name).is_file()}
    failures, calls, returned, accessed = [], {}, set(), []
    stream_ok = bool(session and len(initials) == 1 and events[0] == initials[0]
                     and initials[0].get('model') == model and len(finals) == 1 and events[-1] == result)
    if not stream_ok: failures.append('init/final 구조/모델 오류')
    last_text = None
    for index, event in enumerate(events):
        kind = event.get('type')
        if (kind not in {'system', 'assistant', 'user', 'rate_limit_event', 'result'}
                or (kind == 'system' and event.get('subtype') not in {'init', 'thinking_tokens'})
                or ('tool_use_result' in event and kind != 'user')):
            failures.append(f'사건 {index}: 미지원 사건 종류')
        if (event.get('session_id') != session or event.get('parent_tool_use_id') is not None
                or kind in ('error', 'tool_failed', 'tool_cancelled', 'tool_incomplete')
                or event.get('is_error', False) is not False
                or event.get('status') in ('failed', 'incomplete', 'cancelled')
                or event.get('subtype', '').startswith(('error', 'failed', 'cancelled', 'incomplete'))):
            failures.append(f'사건 {index}: 세션/중단/실패')
        message = event.get('message') or {}
        if not isinstance(message, dict):
            failures.append(f'사건 {index}: message 형식 오류')
            continue
        content = message.get('content', [])
        if not isinstance(content, list):
            failures.append(f'사건 {index}: 내용 형식 오류')
            continue
        if kind == 'assistant' and (message.get('role') != 'assistant' or not message.get('id') or message.get('model') != model):
            failures.append(f'사건 {index}: assistant 모델/역할/ID 오류')
        if kind == 'user' and (message.get('role') != 'user' or len(content) != 1
                               or not isinstance(content[0], dict) or content[0].get('type') != 'tool_result'):
            failures.append(f'사건 {index}: 반환 역할 오류')
        for block in content:
            if not isinstance(block, dict):
                failures.append(f'사건 {index}: block 형식 오류')
                continue
            supported = {'thinking', 'text', 'tool_use'} if kind == 'assistant' else {'tool_result'} if kind == 'user' else set()
            if block.get('type') not in supported:
                failures.append(f'사건 {index}: 미지원 block/역할')
            if kind == 'assistant' and block.get('type') == 'text':
                last_text = block.get('text')
            if block.get('type') == 'tool_use':
                request_id = block.get('id')
                args = block.get('input') or {}
                if not isinstance(args, dict):
                    failures.append(f'사건 {index}: Read 인자 형식 오류')
                    args = {}
                path = (cwd / args.get('file_path', '')).resolve() if isinstance(args.get('file_path', ''), str) else cwd
                if (kind != 'assistant' or not isinstance(request_id, str) or not request_id or request_id in calls
                        or block.get('name') != 'Read' or path not in allowed or set(args) != {'file_path'}):
                    failures.append(f'사건 {index}: Read 요청 ID/도구/경로 오류')
                if isinstance(request_id, str) and request_id not in calls:
                    calls[request_id] = path
            elif block.get('type') == 'tool_result':
                request_id = block.get('tool_use_id')
                path = calls.get(request_id) if isinstance(request_id, str) else None
                if kind != 'user' or path is None or request_id in returned:
                    failures.append(f'사건 {index}: Read 반환 ID/순서/중복 오류')
                    continue
                returned.add(request_id)
                if (event.get('session_id') != session or path not in allowed
                        or not read_result_matches(event, block, path, hashes.get(allowed.get(path)))):
                    failures.append(f'사건 {index}: Read 반환 오류/바이트 불일치')
                else:
                    accessed.append(str(path))
    if set(calls) != returned: failures.append('Read 성공 반환 누락')
    final_ok = bool(result.get('session_id') == session and result.get('is_error') is False
                    and result.get('subtype') == 'success' and claude_model_matches(result, model)
                    and isinstance(last_text, str) and last_text == result.get('result'))
    if not final_ok: failures.append('최종 응답/실행 오류')
    complete = stream_ok and final_ok and not failures
    return {'sessionId': result.get('session_id'), 'raw': result.get('result', ''), 'executionComplete': complete,
            'toolTraceAvailable': bool(initials), 'toolCalls': len(calls), 'toolPolicyVerified': complete,
            'requestedPaths': [str(p) for p in calls.values()], 'accessedPaths': accessed,
            'successfulReadResults': len(accessed), 'traceErrors': failures}


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


def review_evidence(record: dict, external: Path | None, legacy_allowed: bool = False,
                    bundle: Path | None = None) -> dict:
    from review import MODEL
    import review_inputs
    errors = []
    if record.get("reviewer") != MODEL:
        errors.append("검수자 허용 모델 누락/불일치")
    if not parsed_matches(record):
        errors.append("검수 원응답/parsed 불일치")
    tracing = record.get("executionEvidence") or {}
    path = Path(tracing["eventsPath"]) if tracing.get("eventsPath") else external.parent / "review-envelope.json" if external else None
    if path is None or not path.is_file():
        return {"errors": errors + ["검수 원봉투 없음"], "toolTraceStatus": "unverified", "actualAccessVerified": False}
    events = events_from(path.read_text())
    declared = sorted(p.name for p in path.parent.iterdir() if re.fullmatch(r"(?:original-fig-\d+|twin-fig-1)\.(?:png|jpg|jpeg|webp|svg)", p.name))
    if not tracing:
        # 과거 최종 봉투에는 요청/반환 stream이 없다. 경로를 만들어 채우지 않는다.
        final = events[0] if len(events) == 1 else {}
        if (not legacy_allowed or final.get("type") != "result" or final.get("subtype") != "success"
                or final.get("is_error") is not False or not claude_model_matches(final, MODEL)
                or final.get("session_id") != record.get("sessionId") or final.get("result") != record.get("raw")):
            errors.append("새 검수 추적 없음 또는 과거 봉투 모델/세션/응답/실행 불일치")
        return {"errors": errors, "toolTraceStatus": "legacy-unverified-paths", "envelopeSha256": digest(path.read_bytes()),
                "declaredFigureInputs": declared, "accessedPaths": None, "actualAccessVerified": False}
    expected, manifest_sha = {}, None
    try:
        if bundle is None: raise ValueError("검수 입력 봉인 묶음 없음")
        files, _, manifest_sha = review_inputs.load(bundle, record["twinExternalId"], record["sealCommit"])
        expected = {name: sha for name, (_, sha) in files.items()}
        if tracing.get("inputManifestSha256") != manifest_sha:
            errors.append("검수 입력 계약 해시 불일치")
    except (ValueError, OSError, KeyError, TypeError) as error:
        errors.append(f"검수 기대 입력 봉인 실패: {type(error).__name__}")
    if tracing.get("inputSha256") != expected:
        errors.append("검수 선언 그림 집합/바이트와 사전 봉인 기대값 불일치")
    trace = claude_trace(events, path.parent, list(expected), MODEL, expected)
    if (tracing.get("version") != 2 or tracing.get("eventsSha256") != digest(path.read_bytes())
            or not trace["toolPolicyVerified"] or trace["sessionId"] != record.get("sessionId")
            or trace["raw"] != record.get("raw")
            or record.get("exposure", {}).get("toolCalls") != trace["toolCalls"]
            or record.get("exposure", {}).get("toolPolicyVerified") is not True):
        errors.append("검수 실제 요청/성공 반환/해시/모델/세션/응답/선언 불일치")
    if set(declared) != set(expected):
        errors.append("검수 작업 폴더 그림 집합과 사전 봉인 기대값 불일치")
    for name, sha in expected.items():
        file = path.parent / name
        if not file.is_file() or file.is_symlink() or digest(file.read_bytes()) != sha:
            errors.append("검수 입력 그림 바이트 불일치")
    if {(path.parent / name).resolve() for name in expected} - {Path(p) for p in trace["accessedPaths"]}:
        errors.append("사전 봉인 필수 그림의 성공 Read 반환 없음")
    return {"errors": errors, "toolTraceStatus": "verified-retained-events" if not errors else "rejected",
            "envelopeSha256": digest(path.read_bytes()), "inputManifestSha256": manifest_sha,
            "expectedFigureInputs": expected, "declaredFigureInputs": declared,
            "requestedPaths": trace["requestedPaths"], "accessedPaths": trace["accessedPaths"],
            "successfulReadResults": trace["successfulReadResults"], "traceErrors": trace["traceErrors"],
            "actualAccessVerified": not errors}


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

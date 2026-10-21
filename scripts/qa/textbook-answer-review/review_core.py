"""Local preparation and evidence checks, never inference or production writes.

Exact comparisons are deliberately narrow. Event completeness is NOT execution
isolation. This module has no model runner and no approval-producing path.
"""
from __future__ import annotations

import hashlib
import json
import re
import stat
import subprocess
from collections import defaultdict
from fractions import Fraction
from pathlib import Path


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def json_bytes(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode()


def file_record(path: Path) -> dict:
    data = path.read_bytes()
    return {"path": str(path.resolve()), "bytes": len(data), "sha256": digest(data)}


def verify_records(records: list[dict]) -> list[dict]:
    errors = []
    for expected in records:
        try:
            actual = file_record(Path(expected["path"]))
            if any(actual[k] != expected[k] for k in ("bytes", "sha256")):
                errors.append({"path": expected["path"], "reason": "changed"})
        except OSError:
            errors.append({"path": expected["path"], "reason": "unreadable"})
    return errors


def require_external(path: Path, repo: Path) -> Path:
    resolved, repo = path.resolve(), repo.resolve()
    if resolved == repo or repo in resolved.parents:
        raise ValueError("source-bearing output must be outside repository")
    return resolved


def join_targets(targets, db, ledger, originals):
    """Retain ambiguous joins; never silently choose last row or widen targets."""
    if len({x["externalId"] for x in targets}) != len(targets) or len({x["problemCode"] for x in targets}) != len(targets):
        raise ValueError("duplicate target identity")
    indices = []
    code_counts = []
    for rows, key in [(db, "externalId"), (ledger, "externalId"), (originals, "id")]:
        idx = defaultdict(list)
        for row in rows:
            idx[row[key]].append(row)
        indices.append(idx)
        counts = defaultdict(int)
        for source in rows:
            if source.get("problemCode"): counts[source["problemCode"]] += 1
        code_counts.append(counts)
    result = []
    for target in targets:
        row = {"target": target, "issues": []}
        for label, idx, counts in zip(("db", "ledger", "original"), indices, code_counts):
            found = idx[target["externalId"]]
            if len(found) != 1:
                row["issues"].append(label + (":missing" if not found else ":duplicate"))
            row[label] = found[0] if len(found) == 1 else None
            if label != "original" and row[label] and row[label]["problemCode"] != target["problemCode"]:
                row["issues"].append(label + ":problemCode")
            if label != "original" and counts[target["problemCode"]] > 1:
                row["issues"].append(label + ":duplicate_problemCode")
        d, l, o = (row[k] for k in ("db", "ledger", "original"))
        if d and l:
            for key in ("sourceFile", "bookKey"):
                if d.get(key) != l.get(key): row["issues"].append("ledger:" + key)
        if d and o and d["sourceFile"] != o["path"]: row["issues"].append("original:path")
        if d and target.get("bookKey", d.get("bookKey")) != d.get("bookKey"):
            row["issues"].append("target:bookKey")
        result.append(row)
    return result


def project(row: dict) -> dict:
    # A positive allowlist, never deleting a list of known secret fields.
    if not isinstance(row.get("content"), str) or not row["content"].strip():
        raise ValueError("missing student content")
    return {"content": row["content"]}


def content_holds(text: str, *, original: bool) -> list[str]:
    holds = []
    if re.search(r"https?://|file://|plugin://|www\.", text, re.I): holds.append("external_link")
    if re.search(r"(?im)^\s*(?:정답|해설|풀이|답안|모범\s*답안|answer|solution)\s*(?:[:：]|$)|정답\s*및\s*(?:풀이|해설)", text):
        holds.append("answer_or_solution_marker")
    if re.search(r"(?i)ignore (?:previous|all)|system prompt|developer message|이전\s*지시.*무시", text):
        holds.append("instruction_like_content")
    if "\ufffd" in text or any(0xE000 <= ord(ch) <= 0xF8FF or ord(ch) > 0xF0000 for ch in text):
        holds.append("unreadable_character")
    if re.search(r"\[\[?(?:FIG|TBL|그림)|<img|<svg", text, re.I): holds.append("figure_placeholder")
    spans = re.findall(r"\$([^$]*)\$", text)
    if text.count("$") % 2 or any(not balanced_math(s) for s in spans): holds.append("unbalanced_math")
    if original:
        # No HWP->LaTeX rewriting here: unbraced HWP scripts extend to spaces.
        # Contiguous words may be legitimate products, but need explicit review.
        if any(re.search(r"[A-Za-z]{2,}|[\^_]\s*(?!\{)\S", s) for s in spans):
            holds.append("native_math_requires_structure_review")
    return sorted(set(holds))


def balanced_math(text: str) -> bool:
    depth = 0
    for i, ch in enumerate(text):
        if i and text[i - 1] == "\\": continue
        if ch == "{": depth += 1
        if ch == "}": depth -= 1
        if depth < 0: return False
    return depth == 0


def strict_json(text: str):
    def pairs(items):
        out = {}
        for k, v in items:
            if k in out: raise ValueError("duplicate JSON key")
            out[k] = v
        return out
    def invalid_constant(_): raise ValueError("non-JSON number")
    return json.loads(text, object_pairs_hook=pairs, parse_constant=invalid_constant)


def prompt_bytes(template: str, student: bytes) -> bytes:
    token = "{{STUDENT_JSON}}"
    if template.count(token) != 1: raise ValueError("exactly one student placeholder required")
    packet = strict_json(student)
    if not isinstance(packet, dict) or set(packet) != {"content"} or project(packet) != packet:
        raise ValueError("student projection required")
    return template.replace(token, student.decode("utf-8")).encode("utf-8")


def packet_manifest(folder: Path, repo: Path) -> dict:
    require_external(folder, repo)
    if folder.is_symlink(): raise ValueError("symlink folder")
    children = list(folder.iterdir())
    if {p.name for p in children} != {"student.json"}: raise ValueError("file allowlist")
    path = children[0]
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1: raise ValueError("non-regular or shared file")
    data = path.read_bytes()
    packet = strict_json(data)
    if set(packet) != {"content"} or project(packet) != packet: raise ValueError("student schema")
    return {"files": [{"path": "student.json", "bytes": len(data), "sha256": digest(data)}],
            "projectionSha256": digest(json_bytes(packet))}


def verify_packet(folder: Path, manifest: dict, repo: Path) -> list[str]:
    try:
        actual = packet_manifest(folder, repo)
    except (OSError, ValueError, TypeError):
        return ["file_allowlist"]
    return [] if actual == manifest else ["file_bytes"]


def compare_scalar(a: str, b: str) -> str:
    """Only exact rational scalars; no unit erasure, eval or order-insensitive lists."""
    def parse(s):
        s = s.strip()
        if re.fullmatch(r"[+-]?(?:\d+(?:\.\d+)?|\.\d+)", s): return Fraction(s)
        m = re.fullmatch(r"([+-]?\d+)\s*/\s*([+-]?\d+)", s)
        if not m: m = re.fullmatch(r"\\(?:d?frac)\{([+-]?\d+)\}\{([+-]?\d+)\}", s)
        if m and int(m[2]) != 0: return Fraction(int(m[1]), int(m[2]))
        return None
    av, bv = parse(a), parse(b)
    if av is None or bv is None: return "needs_review"
    return "same_value" if av == bv else "different_value"


def audit_events(provider: str, stream: str, raw: str, parsed: dict, exit_code: int) -> dict:
    """Reparse actual JSONL. Text-only/no-tools profile; image profile not enabled.

    Never infer response model from requested CLI settings. Do not treat final
    envelope alone, process exit 0 or self-declared policy as complete evidence.
    Full OS access / hidden defaults remain outside this event-level checker.
    """
    errors, events, tool_events, sessions, models = [], [], [], set(), set()
    starts, ends = set(), set()
    completions, initialized, final = 0, False, None
    if exit_code != 0: errors.append("process_exit")
    for line in stream.splitlines():
        if not line.strip(): continue
        try:
            e = strict_json(line)
            if not isinstance(e, dict): raise ValueError()
        except (ValueError, TypeError):
            errors.append("invalid_event_json");continue
        events.append(e)
        kind = e.get("type")
        if provider == "codex":
            if kind == "thread.started":
                initialized = True
                if e.get("thread_id"): sessions.add(e["thread_id"])
            elif kind == "turn.completed": completions += 1
            elif kind == "turn.failed": errors.append("failed_turn")
            elif kind in ("item.started", "item.updated", "item.completed"):
                item = e.get("item", {})
                it = item.get("type")
                if it == "agent_message":
                    if kind == "item.completed": final = item.get("text")
                elif it in ("reasoning", "todo_list"): pass
                else:
                    tool_events.append(e)
                    ident = item.get("id")
                    if not ident: errors.append("missing_tool_id")
                    if kind == "item.started": starts.add(ident)
                    if kind == "item.completed": ends.add(ident)
            elif kind == "response.completed":
                # Accepted only when the actual response envelope is present.
                response = e.get("response", {})
                if response.get("model"): models.add(response["model"])
            elif kind not in ("turn.started",): errors.append("unknown_event")
        elif provider == "claude":
            if e.get("session_id"): sessions.add(e["session_id"])
            if kind == "system" and e.get("subtype") == "init": initialized = True
            elif kind == "assistant":
                message = e.get("message", {})
                if message.get("model"): models.add(message["model"])
                for block in message.get("content", []):
                    if block.get("type") == "tool_use":
                        tool_events.append(block);starts.add(block.get("id"))
                        if not block.get("id"): errors.append("missing_tool_id")
                    elif block.get("type") not in ("text", "thinking", "redacted_thinking"):
                        errors.append("unknown_event")
            elif kind == "user":
                for block in e.get("message", {}).get("content", []):
                    if isinstance(block, dict) and block.get("type") == "tool_result":
                        tool_events.append(block);ends.add(block.get("tool_use_id"))
                    else: errors.append("unknown_event")
            elif kind == "result":
                if e.get("subtype") == "success" and e.get("is_error") is False:
                    completions += 1;final = e.get("result")
                else: errors.append("failed_turn")
            else: errors.append("unknown_event")
        else: errors.append("unknown_provider")
    if not initialized: errors.append("missing_init")
    if len(sessions) != 1: errors.append("missing_session" if not sessions else "multiple_sessions")
    if completions != 1: errors.append("missing_completion" if not completions else "multiple_completions")
    if starts - ends: errors.append("unfinished_tool")
    if tool_events: errors.append("tool_disallowed_text_only")
    if final != raw: errors.append("raw_event_mismatch")
    try:
        reparsed = strict_json(raw)
        if reparsed != parsed: errors.append("raw_parsed_mismatch")
        if (not isinstance(reparsed, dict) or set(reparsed) != {"status", "answer", "reasoning"}
                or reparsed.get("status") not in ("solved", "unreadable", "insufficient")
                or not isinstance(reparsed.get("reasoning"), str) or not reparsed["reasoning"].strip()
                or (reparsed.get("status") == "solved" and (not isinstance(reparsed.get("answer"), str) or not reparsed["answer"].strip()))
                or (reparsed.get("status") != "solved" and reparsed.get("answer") is not None)):
            errors.append("output_schema")
    except (ValueError, TypeError): errors.append("raw_parse_failed")
    return {"provider": provider, "sessionIds": sorted(sessions), "actualModels": sorted(models),
            "toolEvents": tool_events, "eventErrors": sorted(set(errors)), "events": len(events),
            "eventComplete": not errors, "executionVerified": False,
            "unverified": ["os_file_access", "effective_cli_configuration", "subscription_auth", "pre_exposure"],
            "streamSha256": digest(stream.encode()), "rawSha256": digest(raw.encode()),
            "parsedSha256": digest(json_bytes(parsed))}


def audit_bundle(bundle: dict, repo: Path) -> dict:
    """Bind raw files, parser results, process receipt and input bytes offline.

    A hashed receipt is an observation record, not proof that its author told
    the truth. OS enforcement and effective configuration still need review.
    No caller's toolPolicyVerified/model/session declarations grant approval.
    """
    errors, data = [], {}
    required = {"events", "stderr", "raw", "parsed", "launch", "exit", "prompt", "isolation"}
    artifacts = bundle.get("artifacts", {})
    if set(artifacts) != required: errors.append("artifact_allowlist")
    for name in required:
        record = artifacts.get(name)
        if not isinstance(record, dict): errors.append("missing_artifact:" + name);continue
        try:
            path = require_external(Path(record["path"]), repo)
            if Path(record["path"]).is_symlink() or path.stat().st_nlink != 1: raise ValueError("alias")
            if verify_records([record]): raise ValueError("bytes")
            data[name] = path.read_text()
        except (OSError, KeyError, ValueError): errors.append("artifact_bytes:" + name)
    events = None
    if not errors:
        try:
            launch = strict_json(data["launch"]);exited = strict_json(data["exit"])
            parsed = strict_json(data["parsed"])
            for key in ("attemptId", "pid", "argv", "cwd", "startedAt", "cliBinarySha256", "requestedModel", "requestedEffort", "inputManifestSha256"):
                if key not in launch: errors.append("launch_field:" + key)
            for key in ("attemptId", "pid", "exitCode", "endedAt"):
                if key not in exited: errors.append("exit_field:" + key)
            if launch.get("attemptId") != exited.get("attemptId") or launch.get("pid") != exited.get("pid"):
                errors.append("process_receipt_mismatch")
            if type(exited.get("exitCode")) is not int: errors.append("missing_exit_code")
            events = audit_events(bundle.get("provider"), data["events"], data["raw"], parsed, exited.get("exitCode", -1))
            if not events["actualModels"]: errors.append("actual_model_unobserved")
            if bundle.get("sessionId") not in events["sessionIds"]: errors.append("session_mismatch")
            folder = Path(bundle["inputFolder"])
            manifest = bundle["inputManifest"]
            errors.extend(verify_packet(folder, manifest, repo))
            if launch.get("inputManifestSha256") != digest(json_bytes(manifest)): errors.append("launch_input_mismatch")
            errors.extend(events["eventErrors"])
        except (ValueError, TypeError, KeyError): errors.append("invalid_bundle_json")
    return {"bundleErrors": sorted(set(errors)), "events": events, "executionVerified": False,
            "hold": "stage1_no_isolation_approval; inspect OS/config/subscription evidence and lead notice"}


def verify_git_seal(repo: Path, freeze: str, seal: str, path: str, data: bytes) -> bool:
    """Local immutable receipt verification; bytes AND strict ancestry to HEAD."""
    if not all(re.fullmatch(r"[0-9a-f]{40}", x) for x in (freeze, seal)) or freeze == seal:
        return False
    if Path(path).is_absolute() or ".." in Path(path).parts: return False
    def run(*args):
        return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, check=False)
    if any(run("merge-base", "--is-ancestor", a, b).returncode for a, b in [(freeze, seal), (seal, "HEAD")]):
        return False
    actual = run("show", seal + ":" + path)
    return actual.returncode == 0 and actual.stdout == data


def review_gate(record: dict) -> dict:
    # Stage 1 intentionally cannot approve/reveal; a declaration never becomes proof.
    holds = ["lead_execution_notice_pending", "execution_evidence_unverified"]
    if not record.get("reviewer"): holds.append("reviewer_missing")
    return {"approved": False, "holds": holds}

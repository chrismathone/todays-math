"""구독 CLI만 호출한다. API 키 환경변수는 넘기지 않고 원시 응답은 실행 폴더에 보존한다."""
from __future__ import annotations

import hashlib
import json
import os
import subprocess
from pathlib import Path

AUTHOR_MODEL = "claude-opus-5-5"  # 원장님 2026-10-21: Fable 신규 호출 중단


def claude_model_matches(envelope: dict, expected: str) -> bool:
    """요청 인자만 믿지 않고 CLI가 반환한 실제 사용 모델을 확인한다."""
    return set(envelope.get("modelUsage") or {}) == {expected}


def cli_env() -> dict:
    return {k: v for k, v in os.environ.items()
            if not any(part in k for part in ("API_KEY", "AUTH_TOKEN", "BASE_URL"))}


def run_gemini(prompt: str, cwd: Path, timeout: int = 1800) -> dict:
    proc = subprocess.run(["agy", "--model", "gemini-3.8-flash-high", "--output-format", "stream-json", "--sandbox", "-p=" + prompt],
                          capture_output=True, text=True, cwd=cwd, timeout=timeout, env=cli_env())
    (cwd / "agy-envelope.json").write_text(proc.stdout, encoding="utf-8")
    events = []
    for line in proc.stdout.splitlines():
        try:
            events.append(json.loads(line))
        except ValueError:
            pass
    envelope = next((e.get("result") or {} for e in reversed(events) if e.get("event") == "result"), {})
    actual_model = next(((e.get("init") or {}).get("model") for e in events if e.get("event") == "init"), None)
    tool_count, policy_ok = gemini_tool_policy(events, cwd)
    return {"returncode": proc.returncode if envelope.get("status") == "SUCCESS" and actual_model == "gemini-3.8-flash-high" else (proc.returncode or 1),
            "sessionId": envelope.get("conversation_id"), "raw": envelope.get("response", ""),
            "numTurns": envelope.get("num_turns"),
            "toolCalls": tool_count, "toolPolicyVerified": policy_ok,
            "eventsSha256": hashlib.sha256(proc.stdout.encode()).hexdigest(), "stderrTail": proc.stderr[-400:]}


def gemini_tool_policy(events: list[dict], cwd: Path) -> tuple[int, bool]:
    calls = {}
    for event in events:
        step = event.get("step_update") or {}
        if step.get("step_type") == "tool":
            calls[step.get("step_index")] = step.get("tool_info") or {}
    allowed = {(cwd / name).resolve() for name in ("student.json", "fig-1.png")}
    ok = all(call.get("name") == "read_file" and
             (cwd / (call.get("parameters") or {}).get("Path", "")).resolve() in allowed for call in calls.values())
    return len(calls), ok

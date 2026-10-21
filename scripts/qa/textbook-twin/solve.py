# -*- coding: utf-8 -*-
"""교과서 쌍둥이 시범 — 블라인드 풀이 (학생 면만 · 문항마다 새 세션 · 구독 CLI).

  python solve.py <묶음 폴더> <저장소 밖 실행 폴더> --solver codex|opus [--jobs 1] [--only 쌍둥이ID,...]

- 풀이자는 학생 면(`blind/<id>/student.json` · `fig-1.png`)만 받는다 — 답 · 풀이 · 원본 · 엔진 코드 · 상대 풀이를 안 받는다.
  학생 면은 저장소 밖 실행 폴더에 문항마다 따로 복사해 그 폴더를 작업 폴더로 준다.
- codex: `codex exec -m gpt-6-astra -c model_reasoning_effort=xhigh --sandbox read-only --json` — 문항마다 새 실행(Codex 2회차 B).
  기계 부하 때문에 한 번에 하나(리드 규칙 ⑤). 사건 기록에서 명령 실행을 세어 «노출 이력»으로 남긴다.
- opus: `claude -p --model claude-opus-5-5 --restricted` — 그림이 있으면 `--tools Read`(작업 폴더 안으로만), 없으면 도구 없음.
- 원 풀이는 `<묶음>/solve/<풀이자>/<id>.json` — 답 공개 전에 커밋한다(봉인). 이미 있으면 건너뛴다(다시 풀지 않는다 — 고치지 않는다).
"""
from __future__ import annotations

import argparse
import concurrent.futures
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import integrity
from execution_evidence import codex_trace
from subscription_cli import cli_env, run_gemini, claude_model_matches

MODELS = {"codex": "gpt-6-astra", "opus": "claude-opus-5-5", "gemini": "gemini-3.8-flash-high"}
_FENCE = re.compile(r"```json\s*(.*?)```", re.S)


def prompt_for(student: dict) -> str:
    choices = "".join(f"\n{'①②③④⑤'[i]} {c}" for i, c in enumerate(student["choices"]))
    figure = (
        "\n그림은 이 폴더의 fig-1.png 다 — 열어서 본다. 그림 밖의 파일 · 명령 · 웹은 쓰지 않는다."
        if student["figures"] else "\n파일 · 명령 · 웹을 쓰지 않는다."
    )
    return (
        f"중학교 2학년 수학 문제를 풀어라. 아래 «문제»만 보고 푼다.{figure}\n\n"
        f"문제({student['questionType']}):\n{student['content']}{choices}\n\n"
        "출력은 ```json 코드펜스 안의 객체 하나만:\n"
        '{"answer": "…", "work": "풀이 핵심 몇 줄", "confidence": "high|medium|low", '
        '"issues": ["문제에 모순 · 정보 부족 · 답이 여럿 · 그림과 글이 안 맞음 등이 있으면 적는다"]}\n'
        "JSON 문자열 안의 LaTeX 역슬래시는 두 번 써서 이스케이프한다(예: \\\\frac). 유효한 JSON이어야 한다.\n"
        "- answer: 객관식이면 보기 기호(①~⑤ — «모두 고르시오»면 기호 둘을 쉼표로). 소문항이면 «⑴ … ⑵ …». "
        "값에 단위가 있으면 단위까지(예: 30°, 12 cm). 식이 답이면 LaTeX 를 $…$ 로."
    )


def parse(text: str) -> dict | None:
    blocks = _FENCE.findall(text or "")
    body = blocks[-1] if blocks else (text or "")[(text or "").find("{"): (text or "").rfind("}") + 1]
    try:
        return json.loads(body)
    except (json.JSONDecodeError, ValueError):
        return None


def run_codex(workdir: Path, prompt: str, has_figure: bool) -> dict:
    cmd = ["codex", "exec", "--ignore-user-config", "-m", MODELS["codex"], "-c", "model_reasoning_effort=xhigh", "--sandbox", "read-only",
           "--skip-git-repo-check", "--cd", str(workdir), "--json", "-o", str(workdir / "last.txt")]
    if has_figure:
        cmd += ["-i", str(workdir / "fig-1.png")]
    cmd.append("-")
    proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True, timeout=1800, env=cli_env())
    (workdir / "events.jsonl").write_text(proc.stdout, encoding="utf-8")
    events = []
    for line in proc.stdout.splitlines():
        try:
            events.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    trace = codex_trace(events)
    last = (workdir / "last.txt").read_text(encoding="utf-8") if (workdir / "last.txt").exists() else ""
    success = trace["executionComplete"] and trace["raw"] == last
    return {**trace, "returncode": proc.returncode if success else (proc.returncode or 1), "raw": last,
            "toolPolicyVerified": bool(success and trace["toolPolicyVerified"]),
            "eventsSha256": hashlib.sha256(proc.stdout.encode("utf-8")).hexdigest(), "stderrTail": proc.stderr[-400:]}


def run_opus(workdir: Path, prompt: str, has_figure: bool) -> dict:
    cmd = ["claude", "-p", "--model", MODELS["opus"], "--output-format", "stream-json", "--verbose", "--restricted", "--strict-mcp-config", "--no-session-persistence",
           "--tools", "Read" if has_figure else ""]
    proc = subprocess.run(cmd, input=prompt, capture_output=True, text=True, cwd=workdir, timeout=1800, env=cli_env())
    (workdir / "claude-envelope.json").write_text(proc.stdout, encoding="utf-8")
    events = []
    for line in proc.stdout.splitlines():
        try:
            events.append(json.loads(line))
        except ValueError:
            pass
    envelope = next((event for event in reversed(events) if event.get("type") == "result"), {})
    calls = [block for event in events for block in (event.get("message") or {}).get("content", [])
             if isinstance(block, dict) and block.get("type") == "tool_use"]
    allowed_paths = {(workdir / "fig-1.png").resolve(), (workdir / "student.json").resolve()}
    tool_errors = [call.get("name") for call in calls if call.get("name") != "Read" or
                   (workdir / (call.get("input") or {}).get("file_path", "")).resolve() not in allowed_paths]
    success = not envelope.get("is_error", True) and claude_model_matches(envelope, MODELS["opus"])
    return {"returncode": proc.returncode if success else (proc.returncode or 1), "sessionId": envelope.get("session_id"), "raw": envelope.get("result", ""),
            "numTurns": envelope.get("num_turns"), "toolCalls": len(calls), "toolPolicyVerified": not tool_errors,
            "eventsSha256": hashlib.sha256(proc.stdout.encode()).hexdigest(),
            "stderrTail": proc.stderr[-400:]}


def solve_one(solver: str, tid: str, bundle: Path, run_dir: Path, freeze: dict) -> str:
    out_file = bundle / "solve" / solver / f"{tid}.json"
    if out_file.exists():
        return f"{tid}: 이미 있음"
    candidate = json.loads((bundle / "candidates" / f"{tid}.json").read_text())
    if MODELS[solver] in integrity.author_roles(candidate)[0]:
        return f"{tid}: 저작/그림 수정과 같은 모델 — {solver} 풀이를 생성하지 않음"
    errors = integrity.frozen_errors(bundle, tid, freeze["candidates"][tid])
    freeze_commit = integrity.git_head(bundle)
    if (errors or not integrity.committed_freeze(bundle, tid, freeze["candidates"][tid], freeze_commit)
            or not integrity.committed_specs(bundle, candidate, freeze_commit)):
        raise ValueError(f"봉인되지 않은 후보: {tid}: {errors}")
    workdir = run_dir / solver / tid
    if workdir.exists():
        workdir = workdir.with_name(workdir.name + f"-attempt-{time.time_ns()}")
    workdir.mkdir(parents=True)
    blind = bundle / "blind" / tid
    for name in freeze["candidates"][tid]["student"]:
        shutil.copyfile(blind / name, workdir / name)
    received = {name: integrity.digest((workdir / name).read_bytes()) for name in freeze["candidates"][tid]["student"]}
    if received != freeze["candidates"][tid]["student"]:
        raise ValueError("복사된 학생 면이 동결본과 다르다")
    student = json.loads((workdir / "student.json").read_text(encoding="utf-8"))
    prompt = prompt_for(student)
    if solver == "codex" and student["figures"]:
        prompt = prompt.replace("그림은 이 폴더의 fig-1.png 다 — 열어서 본다. 그림 밖의 파일 · 명령 · 웹은 쓰지 않는다.",
                                "그림 fig-1.png는 이 요청에 이미지로 첨부되어 있다. 첨부 그림만 보고 파일 · 명령 · 웹 · 도구는 쓰지 않는다.")
    started = time.time()
    result = (run_gemini(prompt, workdir) if solver == "gemini" else
              (run_codex if solver == "codex" else run_opus)(workdir, prompt, bool(student["figures"])))
    parsed = parse(result["raw"])
    record = {
        "twinExternalId": tid, "solver": solver, "model": MODELS[solver], "sessionId": result.get("sessionId"),
        "startedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z", time.localtime(started)), "elapsedSec": round(time.time() - started, 1),
        "studentSha256": received,
        "promptSha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "freezeCommit": freeze_commit,
        "exposure": {"received": sorted(freeze["candidates"][tid]["student"]), "toolCalls": result.get("toolCalls"),
                     "toolPolicyVerified": result.get("toolPolicyVerified", result.get("toolCalls") == 0),
                     "answerKeyOrSourceAvailableInWorkdir": False},
        "returncode": result["returncode"], "raw": result["raw"], "parsed": parsed,
    }
    if (result["returncode"] != 0 or not isinstance(parsed, dict) or not isinstance(parsed.get("answer"), str) or
            not result.get("sessionId") or record["exposure"]["toolPolicyVerified"] is not True):
        (workdir / "failed-record.json").write_text(json.dumps(record, ensure_ascii=False, indent=1), encoding="utf-8")
        raise RuntimeError(f"CLI 실패/응답 손상 — 재실행 가능, 원응답 보존: {workdir}")
    if "eventsSha256" in result:
        record["eventsSha256"] = result["eventsSha256"]
        name = {"codex": "events.jsonl", "opus": "claude-envelope.json", "gemini": "agy-envelope.json"}[solver]
        record["executionEvidence"] = {"eventsPath": str((workdir / name).resolve())}
    out_file.parent.mkdir(parents=True, exist_ok=True)
    pending = out_file.with_suffix(".pending")
    pending.write_text(json.dumps(record, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    pending.replace(out_file)
    answer = (parsed or {}).get("answer")
    return f"{tid}: {answer!r} · {record['elapsedSec']}초 · 도구 {result.get('toolCalls')}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("bundle")
    parser.add_argument("run_dir")
    parser.add_argument("--solver", choices=sorted(MODELS), required=True)
    parser.add_argument("--jobs", type=int, default=1)
    parser.add_argument("--only", default="")
    args = parser.parse_args()
    bundle, run_dir = Path(args.bundle), Path(args.run_dir)
    if args.solver == "codex" and args.jobs != 1:
        raise SystemExit("Codex 는 한 번에 하나(리드 규칙 ⑤)")
    freeze = json.loads((bundle / "freeze.json").read_text(encoding="utf-8"))
    ids = [i for i in freeze["candidates"] if not args.only or i in args.only.split(",")]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(solve_one, args.solver, tid, bundle, run_dir, freeze): tid for tid in ids}
        for future in concurrent.futures.as_completed(futures):
            try:
                print(future.result(), flush=True)
            except Exception as error:  # 한 문항의 실패가 나머지를 멈추지 않게 — 다시 돌리면 빠진 것만 한다
                print(f"실패 {futures[future]}: {error}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()

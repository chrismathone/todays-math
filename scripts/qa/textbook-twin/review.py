# -*- coding: utf-8 -*-
"""교과서 쌍둥이 시범 — 검수(답 공개 뒤 · 문항마다 새 세션 · `claude -p --model claude-sonnet-5-5`).

  python review.py <sources.jsonl> <묶음 폴더> <저장소 밖 실행 폴더> [--jobs 3] [--only 쌍둥이ID,...]

검수자는 저자 · 두 풀이자와 다른 모델이다. 원본(글 · 정답 · 그림)과 쌍둥이(학생 면 · 답 · 풀이 · 그림) · 두 풀이의 답 ·
너무 닮음 수치를 받아 기출 계약의 12 검수 · 7 면을 **문항마다 전부** 매긴다(Codex 2회차 B — 표본으로 줄이지 않는다).
엔진 갈래는 «같은 유형인가»를 저자의 근거를 가린 채 따로 판정한다(Codex 2회차 C).
교과서는 배점이 없다 — `scoreAppropriate` 는 «n/a(배점 없음)».
출력: `<묶음>/reviews/<id>.json`. 원본 글은 실행 폴더(저장소 밖)에만 있고 검수 결과에는 판정 · 짧은 까닭만 남긴다.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

import integrity
import review_inputs
from subscription_cli import cli_env, claude_model_matches
from execution_evidence import events_from, claude_trace

MODEL = "claude-sonnet-5-5"
CHECKS = ["answerCorrect", "solutionCorrect", "existenceUniqueness", "choicesCorrect", "figureConsistent",
          "sameCoreConceptAndProcedure", "distinctPresentation", "naturalKorean", "curriculumAppropriate",
          "allStudentSurfacesInScope", "unitFamilyFit", "scoreAppropriate"]
SURFACES = ["stem", "choices", "figuresAndTables", "notation", "answer", "studentSolution", "prerequisites"]
_FENCE = re.compile(r"```json\s*(.*?)```", re.S)


def prompt_for(src: dict, cand: dict, solves: dict, original_figs: list[str], twin_fig: bool) -> str:
    text, answer = (src["dbContent"], src["dbAnswer"]) if src["trustedDbText"] else (src["origContent"], src["origAnswer"])
    choices = "".join(f"\n{'①②③④⑤'[i]} {c}" for i, c in enumerate(cand["choices"]))
    sim = cand["metadata"]["similarity"]
    engine = cand["metadata"].get("engine")
    route = (
        "이 쌍둥이는 **중등 엔진 유형**이 만들었다(유형 제목은 일부러 안 알린다). 원본과 같은 유형인지 따로 판정한다."
        if engine else "이 쌍둥이는 AI 저자가 썼다."
    )
    figs = ", ".join(original_figs) or "없음"
    return f"""너는 «오늘의수학» 쌍둥이 문항 검수자다. 교과서 원본 문항과 그 쌍둥이를 견주어 판정한다. 쌍둥이는 «같은 개념 · 같은 풀이 절차 · 같은 물음 꼴 · 같은 난이도, 수 · 장면 · 문장은 새로»여야 한다(교과서 문장을 옮기면 안 된다). 대상: 중학교 2학년(2022 개정) · 단원 «{src['chapter']} › {src['section']}».
파일 · 명령 · 웹은 이 폴더의 그림을 여는 것 말고는 쓰지 않는다. {route}

## 원본(교과서) — {src['questionType']} · 난이도 {src['difficulty']}
{text}
원본 정답: {answer}
원본 그림: {figs}

## 쌍둥이 — {cand['questionType']}
{cand['content']}{choices}
쌍둥이 그림: {'twin-fig-1.png' if twin_fig else '없음'}
저자(또는 엔진) 정답: {cand['answer']}
학생용 풀이:
{cand['solution']}
저자가 선언한 선수 개념: {json.dumps(cand['curriculumReview']['prerequisites'], ensure_ascii=False)}

## 독립 풀이(답을 모른 채 학생 면만 보고 푼 것)
{json.dumps(solves, ensure_ascii=False)}

## 너무 닮음(결정적 수치 · 잠정 눈금)
판정 {sim['verdict']} · 까닭 {sim['reasons']} · 4글자 겹침 {sim['overlap4']} · 이어진 같은 글 {sim['longestRun']}자 · 원본 수 보존 {sim['numberRetention']}

## 할 일
쌍둥이의 정답을 네가 직접 확인한다(풀어 본다). 그리고 아래를 매긴다 — 검사마다 {{"value": true | false | "n/a", "evidence": "구체적 근거 한 줄"}}.
true 에도 근거를 쓴다(풀이 · 보기 · 그림 · 학년의 실제 내용). 하나의 포괄적 근거를 여러 칸에 복사하지 않는다.
checks: {", ".join(CHECKS)}
- answerCorrect: 저자 정답이 맞다 · solutionCorrect: 학생용 풀이가 맞고 정답으로 끝난다 · existenceUniqueness: 답이 있고 하나뿐(객관식은 맞는 보기 하나 — «모두 고르시오»면 정확히 둘)
- choicesCorrect: 보기 다섯이 서로 다르고 정답 보기 말고는 틀렸다 · figureConsistent: 그림이 발문 조건과 맞고 풀이에 필요한 것이 다 있다(그림이 없어도 되는 문항이면 n/a)
- sameCoreConceptAndProcedure: 원본과 개념 · 풀이 절차가 같다 · distinctPresentation: 수 · 장면 · 문장이 원본과 다르다(베끼지 않았다)
- naturalKorean: 문장이 자연스럽다 · curriculumAppropriate: 중2 범위의 방법으로 풀린다 · allStudentSurfacesInScope: 발문 · 보기 · 그림 · 풀이에 범위 밖 개념 · 기호가 없다
- unitFamilyFit: 원본 단원에 둘 만하다 · scoreAppropriate: "n/a"(교과서는 배점이 없다)
surfaces({", ".join(SURFACES)}): 면마다 {{"status": "passed" | "rejected" | "pending" | "n/a", "basis": "그 면의 실제 개념 · 풀이와 중2 범위 근거 한 줄"}}
engineTypeFit: 엔진 쌍둥이면 "same" | "different" | "unclear", 아니면 "n/a"
difficulty: "same" | "easier" | "harder" · questionTypeSame: true/false

출력은 ```json 코드펜스 안의 객체 하나만:
{{"checks": {{…}}, "surfaces": {{…}}, "engineTypeFit": "…", "difficulty": "…", "questionTypeSame": true, "verifiedAnswer": "네가 구한 답", "issues": ["무엇이 왜 문제인지 짧게"], "verdict": "pass" | "hold"}}
verdict 는 checks 가 모두 true(또는 n/a) · surfaces 가 모두 passed(또는 n/a) · engineTypeFit 가 same 또는 n/a · difficulty same · questionTypeSame 일 때만 "pass". 칸을 빠뜨리지 않는다(verdict 포함).
"""


def parse(text: str) -> dict | None:
    blocks = _FENCE.findall(text or "")
    body = blocks[-1] if blocks else (text or "")[(text or "").find("{"): (text or "").rfind("}") + 1]
    try:
        return json.loads(body)
    except (json.JSONDecodeError, ValueError):
        return None


def review_one(tid: str, src: dict, bundle: Path, run_dir: Path, model: str = MODEL) -> str:
    if model != MODEL:
        raise ValueError("검수자는 명시적 허용 모델이어야 한다")
    out_file = bundle / "reviews" / f"{tid}.json"
    if out_file.exists():
        return f"{tid}: 이미 있음"
    cand = json.loads((bundle / "candidates" / f"{tid}.json").read_text(encoding="utf-8"))
    frozen = json.loads((bundle / "freeze.json").read_text())["candidates"][tid]
    errors = integrity.frozen_errors(bundle, tid, frozen)
    if errors:
        raise ValueError(errors)
    seal_commit = integrity.git_head(bundle)
    solves = {}
    solve_digests = {}
    for solver in ("codex", "opus", "gemini"):
        f = bundle / "solve" / solver / f"{tid}.json"
        if f.exists():
            if not integrity.committed(f, seal_commit):
                raise ValueError(f"원시 풀이를 답 공개 전에 커밋할 것: {f}")
            solves[solver] = (json.loads(f.read_text(encoding="utf-8")).get("parsed") or {}).get("answer")
            solve_digests[solver] = integrity.digest(f.read_bytes())
    if "codex" not in solves or len(solves) < 2:
        raise ValueError("두 모델의 원시 풀이 봉인 전에는 검수하지 않는다")
    inputs, sealed_source, input_manifest_sha = review_inputs.load(bundle, tid, seal_commit)
    if integrity.canonical(src) != integrity.canonical(sealed_source):
        raise ValueError("호출한 source와 사전 봉인 source manifest 불일치")
    workdir = run_dir / "review" / tid
    if workdir.exists():
        workdir = workdir.with_name(workdir.name + f"-attempt-{time.time_ns()}")
    workdir.mkdir(parents=True)
    for name, (file, expected) in inputs.items():
        shutil.copyfile(file, workdir / name)
        if integrity.digest((workdir / name).read_bytes()) != expected:
            raise ValueError("복사된 검수 그림 바이트 불일치")
    original_figs = [name for name in inputs if name.startswith("original-")]
    twin_fig = "twin-fig-1.png" in inputs
    prompt = prompt_for(src, cand, solves, original_figs, twin_fig)
    allowed_names = list(inputs)
    input_hashes = {name: sha for name, (_, sha) in inputs.items()}
    started = time.time()
    proc = subprocess.run(
        ["claude", "-p", "--model", model, "--output-format", "stream-json", "--verbose", "--restricted", "--strict-mcp-config", "--no-session-persistence",
         "--tools", "Read" if (original_figs or twin_fig) else ""],
        input=prompt, capture_output=True, text=True, cwd=workdir, timeout=1800, env=cli_env(),
    )
    event_file = workdir / "review-events.jsonl"
    event_file.write_text(proc.stdout, encoding="utf-8")
    try:
        events = events_from(proc.stdout)
    except ValueError:
        events = []
    envelope = next((event for event in reversed(events) if event.get("type") == "result"), {})
    trace = claude_trace(events, workdir, allowed_names, model, input_hashes)
    images_read = {(workdir / name).resolve() for name in allowed_names}.issubset(
        {Path(path) for path in trace["accessedPaths"]})
    # 최종 봉투도 따로 보존하되 실제 도구 접근의 증거는 전체 stream이다.
    (workdir / "review-envelope.json").write_text(json.dumps(envelope, ensure_ascii=False), encoding="utf-8")
    parsed = parse(envelope.get("result", ""))
    record = {"twinExternalId": tid, "reviewer": model, "sessionId": envelope.get("session_id"),
              "candidateSha256": frozen["candidateSha256"], "studentSha256": frozen["student"],
              "solveSha256": solve_digests, "sealCommit": seal_commit,
              "elapsedSec": round(time.time() - started, 1), "returncode": proc.returncode,
              "exposure": {"sawOriginal": True, "sawAuthorAnswer": True, "sawSolverAnswers": sorted(solves),
                           "sawEngineRationale": False, "priorExposureToThisItem": False,
                           "toolCalls": trace["toolCalls"], "toolPolicyVerified": trace["toolPolicyVerified"]},
              "executionEvidence": {"version": 2, "inputManifestSha256": input_manifest_sha, "eventsPath": str(event_file.resolve()),
                                    "eventsSha256": integrity.digest(event_file.read_bytes()), "inputSha256": input_hashes},
              "raw": envelope.get("result", ""), "parsed": parsed}
    if (proc.returncode != 0 or envelope.get("is_error", True) or not isinstance(parsed, dict)
            or not claude_model_matches(envelope, model) or not trace["toolPolicyVerified"] or not images_read
            or any(not (workdir / name).is_file() or integrity.digest((workdir / name).read_bytes()) != sha
                   for name, sha in input_hashes.items())):
        (workdir / "failed-review.json").write_text(json.dumps(record, ensure_ascii=False, indent=1), encoding="utf-8")
        raise RuntimeError(f"검수 CLI 실패/응답 손상: {workdir}")
    # 검수자가 원문을 재인용할 수 있으므로 원시 응답과 근거는 저장소 밖에만 남긴다.
    external = workdir / "review-record.json"
    external.write_text(json.dumps(record, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    out_file.parent.mkdir(parents=True, exist_ok=True)
    pointer = {"twinExternalId": tid, "externalReview": str(external.resolve()),
               "sha256": integrity.digest(external.read_bytes()), "candidateSha256": frozen["candidateSha256"],
               "sealCommit": seal_commit, "reviewer": model, "sessionId": record["sessionId"]}
    out_file.write_text(json.dumps(pointer, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return f"{tid}: {(parsed or {}).get('verdict')!r} · {record['elapsedSec']}초"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("sources")
    parser.add_argument("bundle")
    parser.add_argument("run_dir")
    parser.add_argument("--jobs", type=int, default=3)
    parser.add_argument("--only", default="")
    parser.add_argument("--model", default=MODEL)
    args = parser.parse_args()
    bundle, run_dir = Path(args.bundle), Path(args.run_dir)
    sources = {s["problemCode"]: s for s in map(json.loads, open(args.sources, encoding="utf-8"))}
    freeze = json.loads((bundle / "freeze.json").read_text(encoding="utf-8"))
    ids = [i for i in freeze["candidates"] if not args.only or i in args.only.split(",")]
    by_id = {}
    for tid in ids:
        cand = json.loads((bundle / "candidates" / f"{tid}.json").read_text(encoding="utf-8"))
        by_id[tid] = sources[cand["sourceReference"]["problemCode"]]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(review_one, tid, by_id[tid], bundle, run_dir, args.model): tid for tid in ids}
        for future in concurrent.futures.as_completed(futures):
            try:
                print(future.result(), flush=True)
            except Exception as error:
                print(f"실패 {futures[future]}: {error}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()

"""Two-stage blind review through subscription CLIs only; never calls an API SDK.

python3 scripts/qa/review-descriptive-batch1.py --reviewer A --candidate C01
Run A and B independently. Solve outputs are frozen before rubric packets are sent.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
from datetime import datetime, timezone


def object_schema(properties):
    return {"type": "object", "properties": properties, "required": list(properties), "additionalProperties": False}


STRING = {"type": "string"}
ISSUES = {"type": "array", "items": object_schema({"category": STRING, "detail": STRING})}
SOLVE_SCHEMA = object_schema({
    "results": {"type": "array", "items": object_schema({
        "id": STRING, "work": STRING, "finalAnswer": STRING,
        "verdict": STRING, "issues": ISSUES,
    })}
})
RUBRIC_SCHEMA = object_schema({
    "results": {"type": "array", "items": object_schema({
        "id": STRING, "verdict": STRING, "issues": ISSUES,
        "criteria": {"type": "array", "items": object_schema({
            "criterionId": STRING, "separable": {"type": "boolean"},
            "fullExample": STRING, "partialExample": STRING, "zeroExample": STRING,
            "comment": STRING,
        })},
    })}
})

INSTRUCTION = """한국어로 검토한다. 당신은 중학교 수학 교사인 독립 검토자이다.
이 작업의 생성기, 소스 코드, 정답 파일, 다른 검토자 결과를 읽지 않는다.
주어진 발문과 그림에만 근거한다. 문제 끝에 답 숫자를 쓸 수 있다고 가짜 서술형은 아니다.
발문이 명시적으로 요구하는 관계식·근거·조건 검토를 답만 쓴 답안이 충족하는지 판단하라.
문항마다 생략 없이 응답한다. 지적 범주는 수학 오류 / 조건 모순·답이 여럿 /
발문 모호 / 그림과 글 어긋남 / 가짜 서술형 / 채점표가 묻지 않은 것에 배점 /
학교 시험 연습용으로 어색함이다. 문제가 없으면 verdict를 '통과', issues를 []로 한다.
의심을 결함으로 단정하지 말고 구체적인 학생 답안 또는 계산으로 입증한다.
"""


def run_review(reviewer, phase, prompt, schema, workdir, result_dir, images):
    env = dict(os.environ)
    for key in [
        "OPENAI_API_KEY", "OPENAI_BASE_URL", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN",
        "ANTHROPIC_BASE_URL", "GEMINI_API_KEY", "GOOGLE_API_KEY", "DEEPSEEK_API_KEY",
        "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CODE_USE_FOUNDRY",
    ]:
        env.pop(key, None)
    # Keep the subscription's profile directory and OAuth credentials intact.
    schema_file = result_dir / f"{phase}-schema.json"
    schema_file.write_text(json.dumps(schema), encoding="utf8")
    (result_dir / f"{phase}-prompt.txt").write_text(prompt, encoding="utf8")
    output_file = result_dir / f"{phase}.json"
    if reviewer == "A":
        argv = [
            "codex", "exec", "-m", "gpt-6-astra", "-c", "model_reasoning_effort=xhigh",
            "--ignore-user-config", "--ephemeral", "--skip-git-repo-check",
            "--sandbox", "read-only", "--cd", str(workdir),
            "--output-schema", str(schema_file), "--output-last-message", str(output_file),
            "--json",
        ]
        for image in images:
            argv += ["--image", str(image)]
        argv += ["-"]
    else:
        argv = [
            "claude", "-p", "--restricted", "--no-session-persistence",
            "--strict-mcp-config", "--mcp-config", '{"mcpServers":{}}',
            "--disable-slash-commands", "--tools", "Read" if images else "",
            "--allowedTools", "Read", "--output-format", "json",
            "--json-schema", json.dumps(schema),
        ]
    started = datetime.now(timezone.utc).isoformat()
    with (result_dir / f"{phase}-stdout.log").open("w") as stdout, \
            (result_dir / f"{phase}-stderr.log").open("w") as stderr:
        completed = subprocess.run(argv, input=prompt, text=True, cwd=workdir, env=env,
                                   stdout=stdout, stderr=stderr, timeout=1800)
    receipt = {
        "reviewer": reviewer, "phase": phase, "argv": argv, "startedAt": started,
        "completedAt": datetime.now(timezone.utc).isoformat(),
        "exitCode": completed.returncode,
        "promptSha256": hashlib.sha256(prompt.encode()).hexdigest(),
    }
    (result_dir / f"{phase}-receipt.json").write_text(json.dumps(receipt, ensure_ascii=False, indent=2))
    if completed.returncode:
        raise RuntimeError(f"검토자 {reviewer} {phase} 실행 실패: {completed.returncode}; 로그 확인 및 리드에게 알림 필요")
    if reviewer == "B":
        response = json.loads((result_dir / f"{phase}-stdout.log").read_text())
        if response.get("is_error"):
            raise RuntimeError(f"검토자 B 오류: {response}")
        result = response.get("structured_output")
        if result is None:
            result = json.loads(response["result"])
        output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf8")
    return json.loads(output_file.read_text())


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--reviewer", choices=["A", "B"], required=True)
    parser.add_argument("--candidate", default="all")
    parser.add_argument("--round", default="initial")
    args = parser.parse_args()
    out = Path(os.environ.get("DESCRIPTIVE_BATCH1_OUT", "/Volumes/새 볼륨/today-worktrees/desc-batch1-out"))
    if args.reviewer == "A":
        auth = subprocess.run(["codex", "login", "status"], capture_output=True, text=True, check=True)
        if "Logged in using ChatGPT" not in auth.stdout + auth.stderr:
            raise RuntimeError("Codex가 ChatGPT 구독 인증이 아닙니다. 호출하지 않습니다.")
        auth_summary = {"method": "ChatGPT"}
    else:
        auth = subprocess.run(["claude", "auth", "status"], capture_output=True, text=True, check=True)
        state = json.loads(auth.stdout)
        if state.get("authMethod") != "claude.ai" or not state.get("subscriptionType"):
            raise RuntimeError("Claude가 구독 인증이 아닙니다. 호출하지 않습니다.")
        auth_summary = {"method": "claude.ai", "subscription": state["subscriptionType"]}
    auth_dir = out / "review" / args.round / args.reviewer
    auth_dir.mkdir(parents=True, exist_ok=True)
    (auth_dir / "subscription-auth.json").write_text(json.dumps(auth_summary))
    candidates = [f"C{i:02}" for i in range(1, 11)] if args.candidate == "all" else args.candidate.split(",")
    for candidate in candidates:
        source = Path(os.environ.get("DESCRIPTIVE_BATCH1_REVIEW_INPUT", out / "review" / "inputs"))
        workdir = out / "review" / "blind" / args.round / args.reviewer / candidate
        result_dir = out / "review" / args.round / args.reviewer / candidate
        workdir.mkdir(parents=True, exist_ok=True)
        result_dir.mkdir(parents=True, exist_ok=True)
        packet = json.loads((source / f"{candidate}-solve.json").read_text())
        images = []
        for item in packet:
            if item["figureImage"]:
                image = source / item["figureImage"]
                if not image.is_file():
                    raise RuntimeError(f"실제 인쇄 그림이 없습니다: {image}")
                destination = workdir / image.name
                shutil.copyfile(image, destination)
                images.append(destination)
        solve_prompt = INSTRUCTION + """
1단계: 아직 채점표를 보지 않고 각 문항을 독립적으로 풀어라.
work에는 소문항별 풀이와 배점할 만한 중간값·근거를, finalAnswer에는 마지막 물음의
최종값(단위 포함)을 써라. 그림이 있으면 첨부 이미지 또는 현재 폴더의 해당 PNG를
직접 읽어라. figureSpec은 바로 그 인쇄 그림의 벡터 정보다.
외부 파일·저장소 탐색이나 웹 검색을 하지 마라. 아래 5문항 외의 답을 추측하지 마라.
\n""" + json.dumps(packet, ensure_ascii=False)
        print(f"{args.reviewer} {candidate}: 눈가림 풀이 시작", flush=True)
        solve = run_review(args.reviewer, "solve", solve_prompt, SOLVE_SCHEMA, workdir, result_dir, images)
        expected_ids = {item["id"] for item in packet}
        assert len(solve["results"]) == len(packet)
        assert {item["id"] for item in solve["results"]} == expected_ids
        frozen_solve = json.dumps(solve, ensure_ascii=False)
        rubric = json.loads((source / f"{candidate}-rubric.json").read_text())
        rubric_prompt = INSTRUCTION + """
2단계: 첫 독립 풀이가 아래에 고정되어 있다. 그 값을 고쳐 맞추지 말고 채점표와 대조하라.
각 기준의 만점·부분점수·0점이 실제 학생 답안에서 갈리는지, 발문에 없는 요구를
채점하는지, 어떤 답안에도 점수가 정해지지 않는 구멍이나 겹침이 있는지 검토하라.
criterionId마다 실제 fullExample / partialExample / zeroExample을 구체적으로 써라.
1점 기준이라 부분점수가 없으면 partialExample에 '부분점수 없음'을 써라.
이전 풀이와 채점표 수학이 다르면 그 불일치를 issues에 반드시 남겨라.
\n고정된 당신의 독립 풀이:\n""" + frozen_solve + "\n채점표:\n" + json.dumps(rubric, ensure_ascii=False)
        reviewed = run_review(args.reviewer, "rubric", rubric_prompt, RUBRIC_SCHEMA, workdir, result_dir, [])
        assert len(reviewed["results"]) == len(packet)
        assert {item["id"] for item in reviewed["results"]} == expected_ids
        by_id = {item["id"]: item for item in rubric}
        for item in reviewed["results"]:
            expected = {c["criterionId"] for c in by_id[item["id"]]["rubric"]["criteria"]}
            assert {c["criterionId"] for c in item["criteria"]} == expected
        print(f"{args.reviewer} {candidate}: 풀이 5 + 기준별 검토 완료", flush=True)


if __name__ == "__main__":
    main()

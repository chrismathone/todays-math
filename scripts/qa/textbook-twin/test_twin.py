# -*- coding: utf-8 -*-
"""교과서 쌍둥이 시범 — 답 비교 · 너무 닮음의 규칙 (지어낸 예문만 — 교과서 글을 넣지 않는다).

  <venv>/bin/python -m pytest scripts/qa/textbook-twin/test_twin.py -q -p no:cacheprovider
"""
import sys
import json
import pytest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import answers  # noqa: E402
import collect  # noqa: E402
import review as review_module  # noqa: E402
import similarity  # noqa: E402
import integrity
from export_guard import source_copy_reasons
from subscription_cli import gemini_tool_policy, claude_model_matches


def test_claude_provenance_requires_actual_requested_model():
    assert claude_model_matches({"modelUsage": {"claude-opus-5-5": {}}}, "claude-opus-5-5")
    assert not claude_model_matches({"modelUsage": {"claude-fable-5-1": {}}}, "claude-opus-5-5")
    assert not claude_model_matches({}, "claude-opus-5-5")


# ── 답 비교 — 표기만 접고 역할 · 부호 · 단위 · 순서를 지킨다 ────────────

def test_fable_is_blocked_before_cli_execution(tmp_path):
    import author
    import fix_figures
    with pytest.raises(ValueError, match="Fable 신규 호출"):
        author.run("합성 지시문", "claude-fable-5-1", tmp_path)
    with pytest.raises(ValueError, match="Fable 신규 호출"):
        fix_figures.ask("합성 지시문", "claude-fable-5-1", tmp_path)


def test_gemini_tool_events_allow_only_the_actual_student_files(tmp_path):
    def event(name, path, state="DONE"):
        return {"step_update": {"step_type": "tool", "step_index": 2, "state": state,
                                "tool_info": {"name": name, "parameters": {"Path": path}}}}
    allowed = event("read_file", str(tmp_path / "fig-1.png"))
    assert gemini_tool_policy([allowed, allowed], tmp_path) == (1, True)
    assert gemini_tool_policy([event("read_file", str(tmp_path / "answer.json"))], tmp_path) == (1, False)
    assert gemini_tool_policy([event("run_command", str(tmp_path / "fig-1.png"))], tmp_path) == (1, False)


def test_notation_folds_but_value_is_kept():
    assert answers.compare("$\\frac{1}{2}$", "1/2")[0] == "match"
    assert answers.compare("$\\frac{1}{2}$", "2/4")[0] == "match"
    assert answers.compare("$-\\frac{1}{2}$", "1/2")[0] == "different"
    assert answers.compare("$\\frac{1}{2}$", "$\\dfrac{1}{2}$")[0] == "match"
    assert answers.compare("$0.5$", "$\\frac{1}{2}$")[0] == "match"
    assert answers.compare("$30^{\\circ}$", "30°")[0] == "match"
    assert answers.compare("$12\\,\\mathrm{cm}$", "12 cm")[0] == "match"


def test_sign_unit_and_spacing_are_not_folded():
    assert answers.compare("$-3$", "3")[0] == "different"
    assert answers.compare("$12\\,\\mathrm{cm}$", "12 m")[0] == "different"
    # 공백을 다 지우면 `12` 와 `1 2` 가 같아진다(Codex 1회차 E 의 반례)
    assert answers.compare("12", "1 2")[0] == "different"


def test_choice_answers_compare_as_sets_of_marks():
    assert answers.compare("③", "③")[0] == "match"
    assert answers.compare("①, ④", "④, ①")[0] == "match"
    assert answers.compare("①, ④", "①")[0] == "different"
    assert answers.compare("③", "$7$")[0] == "different"


def test_subquestions_keep_order_and_each_value():
    assert answers.compare("⑴ $3$ ⑵ $-2$", "(1) 3 (2) -2")[0] == "match"
    assert answers.compare("⑴ $3$ ⑵ $-2$", "⑴ 3 ⑵ 2")[0] == "different"
    assert answers.compare("⑴ $3$ ⑵ $-2$", "⑵ -2 ⑴ 3")[0] == "different"
    assert answers.compare("⑴ 3 ⑺ 7 ⑻ 8", "(1) 3 (7) 7 (8) 8")[0] == "match"
    assert answers.compare("⑴ 3 ⑺ 7 ⑻ 8", "⑴ 3 ⑻ 7 ⑺ 8")[0] == "different"
    assert answers.compare("$x=4$, $y=8$", r"$x=4,\ y=8$")[0] == "match"


def test_empty_solver_answer_is_held():
    assert answers.compare("$5$", "")[0] == "hold"


def test_unit_on_one_side_only_is_held_not_matched():
    # 값은 같고 단위만 한쪽에 — 같다고 하지도, 틀렸다고 하지도 않는다
    assert answers.compare("⑴ $x=32$, $y=25$ ⑵ $x=4$", "⑴ x=32°, y=25° ⑵ x=4 cm") == ("hold", "단위가 한쪽에만 — 값은 같다")
    assert answers.compare("$12$", "12 cm")[0] == "hold"
    # 값이 다르면 단위가 있어도 다르다
    assert answers.compare("$12$", "13 cm")[0] == "different"
    # 단위가 서로 다르면 다르다
    assert answers.compare("$12\\,\\mathrm{cm}$", "12 m")[0] == "different"


# ── 너무 닮음 ──────────────────────────────────────────────────────


def test_copied_wording_is_held():
    original = "길이가 $6$인 막대를 세 조각으로 나누어 삼각형을 만들 때, 가장 긴 조각의 길이로 가능한 값을 구하시오."
    twin = "길이가 $9$인 막대를 세 조각으로 나누어 삼각형을 만들 때, 가장 긴 조각의 길이로 가능한 값을 구하시오."
    verdict = similarity.judge(original, "latex", twin)
    assert verdict["verdict"] == "hold"
    assert verdict["longestRun"] >= similarity.RUN_HOLD


def test_new_scene_and_numbers_pass():
    original = "어떤 수에 $3$을 더한 뒤 $2$배 하였더니 $18$이 되었다. 어떤 수를 구하시오."
    twin = "한 상자에 담긴 귤의 개수에서 $5$개를 빼고 남은 것을 네 사람이 똑같이 나누었더니 한 사람이 $7$개씩 가졌다. 처음 귤의 개수를 구하시오."
    verdict = similarity.judge(original, "latex", twin)
    assert verdict["verdict"] in ("pass", "warn")
    assert verdict["longestRun"] < similarity.RUN_HOLD


def test_number_retention_holds_only_with_three_or_more_parameters():
    original = "가로 $4$, 세로 $7$, 높이 $9$인 상자 모양 그릇의 부피를 구하시오."
    twin = "어느 수조는 밑면의 두 변이 $4$와 $7$이고 물의 깊이가 $9$일 때, 담긴 물의 부피를 구하시오."
    assert similarity.judge(original, "latex", twin)["verdict"] == "hold"
    two = similarity.judge("한 변이 $5$이고 다른 한 변이 $8$인 직사각형의 넓이를 구하시오.", "latex",
                           "정원의 길쭉한 꽃밭은 짧은 쪽이 $5$ m, 긴 쪽이 $8$ m 이다. 꽃밭의 넓이를 구하시오.")
    assert two["verdict"] != "hold" and two["numberRetention"] >= similarity.RETENTION


def test_short_residual_goes_to_manual_review_not_to_overlap_hold():
    # 남은 글이 짧으면 겹침 1.00 이어도 보류가 아니라 손 판정(Codex 1회차 D)
    verdict = similarity.judge("$2^{3}\\times2^{4}$을 계산하시오.", "latex", "$5^{6}\\times5^{7}$을 계산하시오.")
    assert verdict["verdict"] == "manual"
    # 수를 그대로 물려받으면 짧아도 보류
    kept = similarity.judge("$2^{3}\\times2^{4}$을 계산하시오.", "latex", "$2^{4}\\times2^{3}$을 계산하시오.")
    assert kept["verdict"] == "hold"


# ── 모으기 — 검수 판정은 규칙대로 다시 계산하고 엄한 쪽을 쓴다 ─────────────

SURFACE_NAMES = ("stem", "choices", "figuresAndTables", "notation", "answer", "studentSolution", "prerequisites")


def _review(**overrides):
    checks = {k: {"value": True, "evidence": "근거"} for k in review_module.CHECKS}
    checks["scoreAppropriate"] = {"value": "n/a", "evidence": "교과서 배점 없음"}
    surfaces = {k: {"status": "passed", "basis": "근거"} for k in SURFACE_NAMES}
    review = {"checks": checks, "surfaces": surfaces, "engineTypeFit": "n/a", "difficulty": "same", "questionTypeSame": True,
              "verdict": "pass"}
    review.update(overrides)
    return collect.derived_verdict(review)


def test_review_passes_only_when_every_rule_holds():
    assert _review() == "pass"
    assert _review(difficulty="harder") == "hold"
    assert _review(engineTypeFit="unclear") == "hold"
    assert _review(verdict="hold") == "hold"
    # verdict 칸이 빠져도 규칙대로 읽는다(맨 값 꼴도)
    bare = {"checks": {k: True for k in review_module.CHECKS}, "surfaces": {s: "pass" for s in SURFACE_NAMES},
            "engineTypeFit": "same", "difficulty": "same", "questionTypeSame": True}
    assert collect.derived_verdict(bare) == "hold"


def test_true_without_evidence_is_not_a_pass():
    assert collect.check_value({"value": True, "evidence": ""}) is None
    assert collect.check_value({"value": "n/a", "evidence": ""}) is None
    assert collect.derived_verdict({"checks": {k: {"value": True, "evidence": ""} for k in review_module.CHECKS}}) == "hold"


def test_subquestion_markers_do_not_erase_math_or_prefix():
    assert answers.compare("x(1)+3", "y(1)+3")[0] != "match"
    assert answers.compare("⑴ 3 ⑵ 5", "오답임 ⑴ 3 ⑵ 5")[0] != "match"
    assert answers.compare("5", "1/0")[0] != "match"


def test_review_checks_exact_names_and_no_blanket_na():
    checks = {k: {"value": True, "evidence": "근거"} for k in review_module.CHECKS}
    checks["wrongName"] = checks.pop("answerCorrect")
    assert _review(checks=checks) == "hold"


def test_complete_source_text_is_rejected_at_export():
    source = "민수는 산책로에서 출발하여 다리를 건넌 뒤 공원까지 걸어갔습니다. 처음 출발한 장소에서 공원까지 걸린 시간을 구하시오."
    src = {"dbContent": source}
    assert source_copy_reasons(src, {"content": source, "choices": []})
    assert source_copy_reasons(src, {"content": "새 문제", "metadata": {"quote": source}})
    assert not source_copy_reasons(src, {"content": "간식 상자 네 개에 든 과자의 수를 더해 보시오.", "choices": []})
    short = "$7^{2}\\times7^{5}$을 계산하시오."
    assert source_copy_reasons({"dbContent": short}, {"content": short, "choices": []})


def test_frozen_student_projection_rejects_answer_file_and_changed_bytes(tmp_path):
    import json
    tid = "synthetic"
    c = {"content": "새로 쓴 문제", "questionType": "단답형", "choices": [], "figureArtifacts": []}
    student = {"twinExternalId": tid, "grade": "중2", "questionType": "단답형", "content": c["content"], "choices": [], "figures": []}
    (tmp_path / "candidates").mkdir()
    (tmp_path / "candidates" / f"{tid}.json").write_text(json.dumps(c))
    blind = tmp_path / "blind" / tid
    blind.mkdir(parents=True)
    (blind / "student.json").write_text(json.dumps(student))
    frozen = {"candidateSha256": integrity.digest(integrity.canonical(c)), "figures": {},
              "student": {"student.json": integrity.digest((blind / "student.json").read_bytes())}}
    assert integrity.frozen_errors(tmp_path, tid, frozen) == []
    (blind / "old-answers").mkdir()
    assert integrity.frozen_errors(tmp_path, tid, frozen)
    (blind / "old-answers").rmdir()
    (blind / "answer-key.txt").write_text("5")
    frozen["student"]["answer-key.txt"] = integrity.digest(b"5")
    assert integrity.frozen_errors(tmp_path, tid, frozen)
    (blind / "answer-key.txt").unlink()
    del frozen["student"]["answer-key.txt"]
    student["content"] = "다른 문제"
    (blind / "student.json").write_text(json.dumps(student))
    frozen["student"]["student.json"] = integrity.digest((blind / "student.json").read_bytes())
    assert integrity.frozen_errors(tmp_path, tid, frozen)


def test_seals_require_real_git_history_and_current_bytes(tmp_path):
    import subprocess
    def git(*args):
        return subprocess.check_output(["git", "-C", str(tmp_path), *args], stderr=subprocess.DEVNULL).decode().strip()
    git("init", "-q")
    git("config", "user.name", "Synthetic test")
    git("config", "user.email", "synthetic@example.invalid")
    frozen = {"candidateSha256": "synthetic-hash", "student": {"student.json": "synthetic-student"}, "figures": {}}
    manifest = tmp_path / "freeze.json"
    manifest.write_text(json.dumps({"candidates": {"synthetic": frozen}}))
    solve = tmp_path / "solve.json"
    solve.write_text('{"answer":"5"}')
    spec = tmp_path / "figure.spec.json"
    spec.write_text('{"synthetic":true}')
    candidate = {"figureArtifacts": [{"specPath": "figure.spec.json"}]}
    assert not integrity.committed_freeze(tmp_path, "synthetic", frozen)
    git("add", "freeze.json", "solve.json", "figure.spec.json")
    git("-c", "core.hooksPath=/dev/null", "commit", "-qm", "synthetic seal")
    sealed = git("rev-parse", "HEAD")
    assert integrity.committed_freeze(tmp_path, "synthetic", frozen, sealed)
    assert integrity.committed(solve, sealed)
    assert integrity.committed_specs(tmp_path, candidate, sealed)
    spec.write_text('{"synthetic":false}')
    assert not integrity.committed_specs(tmp_path, candidate, sealed)
    solve.write_text('{"answer":"6"}')
    assert not integrity.committed(solve, sealed)
    assert not integrity.committed_freeze(tmp_path, "synthetic", {**frozen, "candidateSha256": "changed"}, sealed)


def test_review_applies_na_to_actual_candidate_and_checks_its_answer():
    checks = {k: {"value": True, "evidence": f"{k} 검토 근거"} for k in review_module.CHECKS}
    checks["scoreAppropriate"] = {"value": "n/a", "evidence": "배점 없음"}
    surfaces = {k: {"status": "passed", "basis": f"{k} 검토 근거"} for k in SURFACE_NAMES}
    r = {"checks": checks, "surfaces": surfaces, "engineTypeFit": "same", "difficulty": "same", "questionTypeSame": True,
         "verdict": "pass", "verifiedAnswer": "③", "issues": []}
    c = {"choices": ["1", "2", "3", "4", "5"], "figureArtifacts": [{}], "route": "engine", "answer": "③"}
    assert collect.derived_verdict(r, c) == "pass"
    assert collect.derived_verdict({**r, "verifiedAnswer": "④"}, c) == "hold"
    assert collect.derived_verdict({**r, "issues": ["답이 여럿"]}, c) == "hold"
    assert collect.derived_verdict({**r, "engineTypeFit": "n/a"}, c) == "hold"
    assert collect.derived_verdict(r, {**c, "score": 3}) == "hold"
    checks["figureConsistent"] = {"value": "n/a", "evidence": "잘못된 면제"}
    assert collect.derived_verdict(r, c) == "hold"
    assert collect.derived_verdict(r, {**c, "figureArtifacts": [], "content": "<table><tr><td>5</td></tr></table>"}) == "hold"


@pytest.mark.parametrize("mutation", [None, "one-solver", "failed-cli", "exposed", "same-session", "author-model", "author-session", "wrong-review-answer", "changed-candidate"])
def test_collection_never_promotes_invalid_evidence(tmp_path, monkeypatch, mutation):
    tid = "synthetic-twin"
    candidate = {"answer": "5", "content": "합성 문제", "questionType": "단답형", "choices": [], "figureArtifacts": [],
                 "route": "engine", "authorId": "middle-engine:synthetic", "sourceReference": {"problemCode": "synthetic"},
                 "metadata": {"similarity": {"verdict": "pass", "reasons": []},
                              "engine": {"proposedBy": "synthetic-author:synthetic-session"}}}
    if mutation == "author-model":
        candidate["metadata"]["engine"]["proposedBy"] = collect.MODELS["opus"] + ":synthetic-session"
    if mutation == "author-session":
        candidate["metadata"]["engine"]["proposedBy"] = "synthetic-author:opus"
    student = {"twinExternalId": tid, "grade": "중2", "content": candidate["content"], "questionType": "단답형", "choices": [], "figures": []}
    def write(path, value):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(value, ensure_ascii=False))
    write(tmp_path / "candidates" / f"{tid}.json", candidate)
    write(tmp_path / "blind" / tid / "student.json", student)
    student_hashes = {"student.json": integrity.digest((tmp_path / "blind" / tid / "student.json").read_bytes())}
    frozen = {"candidateSha256": integrity.digest(integrity.canonical(candidate)), "student": student_hashes, "figures": {}}
    write(tmp_path / "freeze.json", {"candidates": {tid: frozen}})
    write(tmp_path / "holds.json", [])
    solvers = ["codex"] if mutation == "one-solver" else ["codex", "opus"]
    solve_hashes = {}
    for solver in solvers:
        record = {"twinExternalId": tid, "solver": solver, "model": collect.MODELS[solver], "sessionId": solver,
                  "returncode": 0, "studentSha256": student_hashes, "freezeCommit": "synthetic-freeze",
                  "parsed": {"answer": "5", "work": "2+3=5", "issues": []},
                  "exposure": {"received": ["student.json"], "toolPolicyVerified": True, "answerKeyOrSourceAvailableInWorkdir": False}}
        if solver == "opus":
            if mutation == "failed-cli": record["returncode"] = 9
            if mutation == "exposed": record["exposure"]["answerKeyOrSourceAvailableInWorkdir"] = True
            if mutation == "same-session": record["sessionId"] = "codex"
        path = tmp_path / "solve" / solver / f"{tid}.json"
        write(path, record)
        solve_hashes[solver] = integrity.digest(path.read_bytes())
    parsed = {"checks": {k: {"value": True, "evidence": f"{k} 검토 근거"} for k in review_module.CHECKS},
              "surfaces": {k: {"status": "passed", "basis": f"{k} 검토 근거"} for k in SURFACE_NAMES},
              "engineTypeFit": "same", "difficulty": "same", "questionTypeSame": True, "verdict": "pass",
              "verifiedAnswer": "999" if mutation == "wrong-review-answer" else "5", "issues": []}
    record = {"twinExternalId": tid, "reviewer": review_module.MODEL, "sessionId": "review", "returncode": 0,
              "candidateSha256": frozen["candidateSha256"], "studentSha256": student_hashes, "solveSha256": solve_hashes,
              "sealCommit": "synthetic-seal", "exposure": {"sawSolverAnswers": sorted(solvers)}, "parsed": parsed}
    write(tmp_path / "reviews" / f"{tid}.json", record)
    if mutation == "changed-candidate":
        write(tmp_path / "candidates" / f"{tid}.json", {**candidate, "content": "바뀐 문제"})
    monkeypatch.setattr(integrity, "committed_freeze", lambda *a: True)
    monkeypatch.setattr(integrity, "committed", lambda *a: True)
    monkeypatch.setattr(sys, "argv", ["collect.py", str(tmp_path)])
    collect.main()
    result = json.loads((tmp_path / "collect.json").read_text())["rows"][0]
    assert (result["status"] == "통과") is (mutation is None)
    checks = {k: {"value": "n/a", "evidence": "없음"} for k in review_module.CHECKS}
    assert _review(checks=checks) == "hold"

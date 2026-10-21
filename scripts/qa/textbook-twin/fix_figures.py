# -*- coding: utf-8 -*-
"""교과서 쌍둥이 시범 — 엔진이 거절한 저자 그림 스펙을 고친다(제품 그림 경로의 «오류를 돌려주고 다시» 와 같은 길).

명시한 모델(2026-10-21 사용자 전환 뒤 Opus, 저작의 일부다)에게 쌍둥이 발문 · 거절된 스펙 · 엔진 오류 · 그림 정본 목록을 주고 스펙만 다시 받는다.
엔진(strict)이 다시 그려 통과할 때까지 최대 두 번. 그래도 안 되면 «보류 — 그림».
🔴 그림을 고치려고 발문의 수 · 조건을 바꾸지 않는다 — 스펙만 고친다(바뀐 스펙은 원 스펙과 함께 기록한다).
"""
from __future__ import annotations

import concurrent.futures
import json
import re
import subprocess
import time
from pathlib import Path

from subscription_cli import cli_env, claude_model_matches

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
FIGURE_CONTRACT = REPO / "scripts" / "figure" / "engine-catalog.json"
_FENCE = re.compile(r"```json\s*(.*?)```", re.S)

GUIDE = """너는 수학 그림 스펙을 고친다. 아래 «문항»의 그림 스펙을 엔진이 거절했다. 같은 그림을 엔진이 받는 스펙으로 고쳐라.
- 발문의 수 · 조건 · 이름은 그대로 — 그림 속 수치 · 각 · 이름이 발문과 꼭 맞아야 한다. 발문을 고치지 않는다.
- FigureSpec v2 는 화면 좌표(y 아래로) · graph-1 은 수학 좌표(y 위로) · elem-1 은 목록의 kind 와 칸 그대로. v2 의 points · segments · angles · dimensions · labels 는 이름 붙인 객체.
- «label … has no line/circle/label-free position»: 이름표 놓을 빈자리가 없다 — 점 사이를 넓히거나(좌표를 키운다) 이름표에 dx/dy · position 을 준다. 같은 자리에 이름표 둘을 두지 않는다. 변 옆 수는 빈 점(anchor)에 labels 로.
- «angle … ray to 'X' is not covered by a rendered segment»: 각의 두 반직선은 그려진 선분 위에 있어야 한다 — 그 선분을 segments 에 넣거나 각의 points 를 실제 선분의 끝점으로.
- «right: true» 는 실제로 수직인 좌표가 필요하다. 치수 활(dimensions)은 활이 필요할 때만.
출력은 ```json 코드펜스 안에 {"spec": {…}} 하나만. 고칠 수 없으면 {"spec": null, "note": "까닭"}.
"""


def prompt_for(content: str, spec: dict, error: str) -> str:
    return (
        GUIDE
        + f"\n## 문항\n{content}\n\n## 거절된 스펙\n{json.dumps(spec, ensure_ascii=False)}\n\n## 엔진 오류\n{error[:1500]}\n"
        + f"\n## ENGINE CONTRACT\n{FIGURE_CONTRACT.read_text(encoding='utf-8')}\n"
    )


def ask(prompt: str, model: str, cwd: Path) -> tuple[dict | None, str | None]:
    if "fable" in model.lower():
        raise ValueError("사용자 지시로 Fable 신규 호출이 금지됐다")
    proc = subprocess.run(
        ["claude", "-p", "--model", model, "--output-format", "json", "--restricted", "--strict-mcp-config", "--tools", "", "--no-session-persistence"],
        input=prompt, capture_output=True, text=True, cwd=cwd, timeout=1800, env=cli_env(),
    )
    (cwd / f"figure-repair-response-{time.time_ns()}.json").write_text(proc.stdout, encoding="utf-8")
    try:
        envelope = json.loads(proc.stdout)
    except json.JSONDecodeError:
        return None, None
    if proc.returncode != 0 or envelope.get("is_error", True) or not claude_model_matches(envelope, model):
        return None, envelope.get("session_id")
    text = envelope.get("result", "")
    blocks = _FENCE.findall(text)
    body = blocks[-1] if blocks else text[text.find("{"): text.rfind("}") + 1]
    try:
        return json.loads(body).get("spec"), envelope.get("session_id")
    except (json.JSONDecodeError, AttributeError):
        return None, envelope.get("session_id")


def repair(fig_dir: Path, specs: dict, report: dict, contents: dict, render, *, model: str, rounds: int = 2,
           jobs: int = 3) -> tuple[dict, dict, dict]:
    """`render(specs_file, out_dir) -> report` 로 다시 그린다. 고친 스펙 · 새 보고 · 기록(id → [{round, error, session}])"""
    history: dict[str, list] = {}
    for round_ in range(1, rounds + 1):
        failing = [tid for tid, r in report.items() if not r.get("ok")]
        if not failing:
            break
        fixed = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=jobs) as pool:
            futures = {pool.submit(ask, prompt_for(contents[tid], specs[tid], report[tid].get("error", "")), model, fig_dir): tid
                       for tid in failing}
            for future in concurrent.futures.as_completed(futures):
                tid = futures[future]
                spec, session = future.result()
                history.setdefault(tid, []).append({"round": round_, "error": report[tid].get("error", ""), "session": session, "model": model,
                                                    "gotSpec": spec is not None})
                if spec:
                    fixed[tid] = spec
        if not fixed:
            break
        specs_file = fig_dir / f"specs-repair{round_}.json"
        specs_file.write_text(json.dumps(fixed, ensure_ascii=False, indent=1), encoding="utf-8")
        again = render(specs_file, fig_dir)
        for tid, r in again.items():
            specs[tid] = fixed[tid]
            report[tid] = r
    return specs, report, history

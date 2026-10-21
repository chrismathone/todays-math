# -*- coding: utf-8 -*-
"""교과서 쌍둥이 시범 — 저자(단원 하나에 한 세션 · 구독 CLI `claude -p`).

  python author.py <sources.jsonl> <catalog.json> <출력 폴더> [--model claude-opus-5-5] [--jobs 3] [--only 단원]

저자는 원본(글 · 정답 · 풀이 · 그림)을 보고 문항마다 «엔진 유형을 고른다» 또는 «새로 쓴다» 또는 «보류».
🔴 저자는 풀이자 · 검수자와 다른 모델이다(Codex 1회차 E). 저자의 답은 승인이 아니다(`author-proposed`).
🔴 `claude -p --restricted --tools Read` — 명령 실행 · 웹이 없고 파일 읽기는 원본 폴더 안으로만.
출력: `<출력>/author/<번호>.json`(문항별 제안) · `<번호>.raw.json`(CLI 봉투 — 모델 · 세션 · 사용량) · `<번호>.prompt.md`.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import json
import re
import subprocess
import sys
import time
from pathlib import Path

from subscription_cli import AUTHOR_MODEL, cli_env, run_gemini, claude_model_matches

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
FIGURE_CONTRACT = REPO / "scripts" / "figure" / "engine-catalog.json"
NEUTRAL_NAMES = "지우 · 서아 · 하루 · 도하 · 미나"

RULES = f"""너는 «오늘의수학» 쌍둥이 문항 저자다. 아래 교과서 문항마다 쌍둥이 한 문항을 만든다(원장님 2026-10-21: «교과서 문제가 아니지만 교과서 문제가 공부되도록»).

## 쌍둥이의 뜻
- 같은 개념 · 같은 풀이 절차 · 같은 물음 꼴(객관식/단답형/서술형 그대로) · 같은 난이도.
- 수 · 장면(소재 · 인물 · 상황) · 문장은 새로. 교과서 문장을 옮기지 않는다. «다음 중 옳은 것은?» «구하시오» 같은 상투 말 말고는 원본과 같은 말줄기를 쓰지 않는다(이어진 같은 글 20자 이상 금지).
- 원본의 수를 물려받지 않는다 — 원본에 수가 셋 이상이면 그 가운데 60% 이상을 같게 두지 않는다(0 · 1 같은 조건값도 센다).
- 이름만 · 수만 바꾼 것은 부족하다. 장면이나 짜임(구하는 것 · 주어진 것의 배치 · 나타낸 방식) 가운데 적어도 하나를 실제로 바꾼다. 계산 연습 문항은 같은 계산 절차를 지키는 범위에서 식의 짜임을 바꾼다(난이도가 오르내리지 않게).
- 정답이 하나로 정해져야 한다(있고 · 하나뿐). 중학교 2학년(2022 개정) 범위의 방법으로 풀린다 — 아직 안 배운 개념을 쓰지 않는다.
- 객관식: 보기 다섯 · 정답 하나(①~⑤ 기호 하나). 원본이 «모두 고르시오»면 정답은 정확히 둘(«①, ④»). 보기는 `choices` 배열에 글만(번호 없이). 보기끼리 겹치지 않게.
- 원본이 소문항 ⑴ ⑵ … 로 되어 있으면 쌍둥이도 같은 수의 소문항, 정답도 «⑴ … ⑵ …».
- 등장인물 이름은 원본 이름을 쓰지 않는다 — {NEUTRAL_NAMES} 가운데서. 학교 · 출판사 · 실제 상표 이름 금지.
- 수식은 `$…$` 안 LaTeX(문제은행 표기): 분수 `\\frac{{a}}{{b}}` · 각 `\\angle` · 삼각형 `\\triangle` · 선분 `\\overline{{AB}}` · 도 `^{{\\circ}}` · 곱 `\\times` · 나눗셈 `\\div` · 부등호 `\\le` `\\ge` · 순환소수 `0.\\dot{{1}}\\dot{{2}}`. 점 이름 · 꼭짓점은 대문자.
- 학생용 풀이(`solution`): 짧게, 교과서 범위의 방법으로, 마지막 문장에 정답을 쓴다. 서술형은 채점할 수 있는 단계로.
- 발문에 그림이 있으면 그림 자리에 `[그림]` 을 한 줄로 둔다.

## 엔진 갈래
- 아래 «엔진 유형» 가운데 원본과 **개념 · 풀이 절차 · 물음 꼴**이 같은 것이 있으면 route "engine" 과 그 `typeKey` 를 고르고 근거를 한 줄 쓴다. 견본은 그 유형이 내는 문항의 한 예다 — 수와 장면은 엔진이 새로 정한다.
- 고르지 않는다: 물음 꼴이 다를 때(원본은 «옳은 것을 고르는» 문항인데 유형은 값 하나를 구함 등) · 풀이 단계 수가 다를 때 · 그림의 역할이 다를 때. 애매하면 고르지 말고 직접 쓴다.
- 엔진이 객관식 · 서술형을 만들 때는 제품의 파생기(단답형 → 객관식 보기 다섯 · 서술형 발문)를 거친다. 원본이 객관식인데 유형 견본이 «옳은 것을 모두 고르는» 꼴이 아니면 «값을 묻는 객관식»으로 나온다는 것을 알고 고른다.

## 그림
- 원본 그림 파일은 문항을 이해하려고 **보기만** 한다(Read 로 연다). 쌍둥이 그림은 새로 짓는다 — 아래 ENGINE CONTRACT 의 스펙으로만(`figureSpec`). 원본 그림을 본뜨지 말고 **새 조건에 맞는 새 그림**으로.
- FigureSpec v2 는 화면 좌표(y 아래로) · graph-1 은 수학 좌표(y 위로) · elem-1 은 목록의 kind 와 그 required/optional 칸 그대로. v2 의 points · segments · angles · dimensions · labels 는 이름 붙인 객체(배열 아님). 점선은 `{{"points":["A","B"],"dashed":"5 3"}}`, 실선은 dash 칸을 아예 쓰지 않는다.
- `right: true` 직각 표시는 실제로 수직인 좌표가 필요하다. 치수 활(dimensions)은 길이 표시 활이 필요할 때만 — 변 옆 수 하나는 빈 점(anchor)을 두고 labels 로. 한 점에는 이름표 하나.
- 그림 속 수치 · 각 · 이름은 새 발문과 꼭 맞아야 한다(풀이자는 그림을 보고 푼다). 그림의 모양이 조건과 크게 어긋나지 않게 좌표를 계산해 둔다.
- 그림이 필요한데 엔진 스펙으로 그릴 수 없으면 route "hold" · reason «그림 — 무엇이 안 되나».
- 원본 그림이 원본 글과 안 맞아 보이면 `figureCheck` "mismatch"(그 문항은 보류로 두지 않아도 된다 — 알리기만).

## 출력
JSON 배열 하나만, ```json 코드펜스 안에. 문항마다 객체 하나:
{{
  "problemCode": "원본 문항 코드",
  "route": "engine" | "author" | "hold",
  "engine": {{"typeKey": "…", "why": "…"}},                 // route=engine 일 때만
  "twin": {{                                                  // route=author 일 때만
    "questionType": "객관식" | "단답형" | "서술형",
    "content": "보기 없는 발문",
    "choices": ["…", "…", "…", "…", "…"],                    // 객관식만 · 아니면 []
    "answer": "…",
    "solution": "…",
    "figureSpec": {{…}} | null
  }},
  "hold": {{"reason": "…"}},                                 // route=hold 일 때만
  "variantDelta": {{
    "modes": ["context" | "structure" | "representation" | "inverse-target" | "numbers"],
    "before": "원본이 묻는 것 · 짜임을 풀어 쓴 설명(원문을 옮기지 않는다)",
    "after": "쌍둥이가 묻는 것 · 짜임",
    "sharedConcept": "…", "sharedProcedure": "단계 → 단계 → …"
  }},
  "difficultyProposal": "연산" | "기본" | "응용" | "심화하",
  "problemTypeProposal": "한 줄",
  "prerequisites": ["먼저 배운 것", "…"],
  "figureCheck": "no-figure" | "matches" | "mismatch"
}}
설명 글은 쓰지 말고 JSON 만 낸다.
"""


def present(item: dict) -> str:
    text, answer, solution = (
        (item["dbContent"], item["dbAnswer"], item["dbSolution"]) if item["trustedDbText"]
        else (item["origContent"], item["origAnswer"], item["origSolution"])
    )
    note = "" if item["trustedDbText"] else "\n(이 문항은 한글 수식 문법 원문이다 — `over` 는 분수, `^{}` 는 위첨자, `LEFT( … RIGHT)` 는 괄호)"
    figures = "\n".join(f"- {Path(f['file']).name}" for f in item["figures"]) or "(없음)"
    return (
        f"### {item['problemCode']} · {item['questionType']} · 난이도 {item['difficulty']} · {item['materialKind']}{note}\n"
        f"원본 발문:\n{text}\n\n원본 정답: {answer}\n\n원본 풀이:\n{solution or '(없음)'}\n\n"
        f"원본 그림(figures/ 아래 · Read 로 볼 것):\n{figures}\n"
    )


def engine_block(types: list[dict]) -> str:
    lines = []
    for t in types:
        if "error" in t:
            continue
        sample = t["sample"]
        lines.append(
            f"- `{t['key']}` · {t['title']} · 난이도 {t['difficulty']}{' · 그림 있음' if sample['hasFigure'] else ''}\n"
            f"  견본: {sample['content']}\n  견본 정답: {sample['answer']}"
        )
    examples = [t["sample"]["figureSpec"] for t in types if "error" not in t and t["sample"].get("figureSpec")][:2]
    spec_note = (
        "\n\n이 단원 엔진 유형의 실제 그림 스펙 예(꼴만 본뜬다 · 좌표 · 값은 새로):\n"
        + "\n".join(json.dumps(spec, ensure_ascii=False) for spec in examples)
        if examples else ""
    )
    return "\n".join(lines) + spec_note


def build_prompt(section: str, items: list[dict], types: list[dict]) -> str:
    contract = FIGURE_CONTRACT.read_text(encoding="utf-8")
    return (
        RULES
        + f"\n## ENGINE CONTRACT(그림 스펙 정본 — 여기 없는 칸은 엔진이 거절한다)\n{contract}\n"
        + f"\n## 단원 «{section}» — 엔진 유형 {len(types)}\n{engine_block(types)}\n"
        + f"\n## 교과서 문항 {len(items)}\n\n" + "\n".join(present(item) for item in items)
    )


_FENCE = re.compile(r"```json\s*(.*?)```", re.S)


def parse_result(text: str) -> list[dict]:
    blocks = _FENCE.findall(text)
    body = blocks[-1] if blocks else text[text.find("["): text.rfind("]") + 1]
    return json.loads(body)


def run(prompt: str, model: str, cwd: Path, timeout: int = 3600) -> dict:
    if "fable" in model.lower():
        raise ValueError("사용자 지시로 Fable 신규 호출이 금지됐다")
    started = time.time()
    if model == "gemini-3.8-flash-high":
        result = run_gemini(prompt, cwd, timeout)
        if result["returncode"]:
            raise RuntimeError(f"Gemini CLI 실패: {result['stderrTail']}")
        return {"result": result["raw"], "session_id": result["sessionId"], "_elapsedSec": round(time.time() - started, 1)}
    proc = subprocess.run(
        ["claude", "-p", "--model", model, "--output-format", "json", "--restricted", "--strict-mcp-config", "--tools", "Read",
         "--no-session-persistence"],
        input=prompt, capture_output=True, text=True, cwd=cwd, timeout=timeout, env=cli_env(),
    )
    if proc.returncode != 0:
        (cwd / f"author-failed-{time.time_ns()}.json").write_text(proc.stdout, encoding="utf-8")
        raise RuntimeError(f"claude 실패({proc.returncode}): {proc.stderr[-800:]}")
    envelope = json.loads(proc.stdout)
    if envelope.get("is_error") or not claude_model_matches(envelope, model):
        (cwd / f"author-failed-{time.time_ns()}.json").write_text(proc.stdout, encoding="utf-8")
        raise RuntimeError("claude 오류 또는 실제 사용 모델이 요청과 다르다 — 원응답 보존")
    envelope["_elapsedSec"] = round(time.time() - started, 1)
    return envelope


def author_section(index: int, section: str, items: list[dict], types: list[dict], out: Path, model: str, cwd: Path) -> str:
    stem = out / f"{index:02d}"
    if (stem.with_suffix(".json")).exists():
        return f"{index:02d} {section}: 이미 있음"
    prompt = build_prompt(section, items, types)
    stem.with_suffix(".prompt.md").write_text(prompt, encoding="utf-8")
    envelope = run(prompt, model, cwd)
    stem.with_suffix(".raw.json").write_text(json.dumps(envelope, ensure_ascii=False, indent=1), encoding="utf-8")
    proposals = parse_result(envelope.get("result", ""))
    wanted = {item["problemCode"] for item in items}
    got = {p.get("problemCode") for p in proposals}
    record = {"section": section, "model": model, "sessionId": envelope.get("session_id"),
              "missing": sorted(wanted - got), "extra": sorted(got - wanted), "proposals": proposals}
    stem.with_suffix(".json").write_text(json.dumps(record, ensure_ascii=False, indent=1), encoding="utf-8")
    routes = {}
    for p in proposals:
        routes[p.get("route")] = routes.get(p.get("route"), 0) + 1
    return f"{index:02d} {section}: {len(proposals)}/{len(items)} {routes} 빠짐 {len(wanted - got)} · {envelope['_elapsedSec']}초"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("sources")
    parser.add_argument("catalog")
    parser.add_argument("out")
    parser.add_argument("--model", default=AUTHOR_MODEL)
    parser.add_argument("--jobs", type=int, default=3)
    parser.add_argument("--only", default="")
    args = parser.parse_args()
    sources_dir = Path(args.sources).resolve().parent
    out = Path(args.out) / "author"
    out.mkdir(parents=True, exist_ok=True)
    items = [json.loads(line) for line in open(args.sources, encoding="utf-8")]
    catalog = json.load(open(args.catalog, encoding="utf-8"))
    sections: dict[str, list[dict]] = {}
    for item in items:
        sections.setdefault(item["section"], []).append(item)
    jobs = [(i, s, v) for i, (s, v) in enumerate(sections.items(), 1) if not args.only or args.only == s]
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.jobs) as pool:
        futures = {pool.submit(author_section, i, s, v, catalog[s], out, args.model, sources_dir): s for i, s, v in jobs}
        for future in concurrent.futures.as_completed(futures):
            try:
                print(future.result(), flush=True)
            except Exception as error:  # 한 단원의 실패가 나머지를 멈추지 않게 — 다시 돌리면 빠진 단원만 한다
                print(f"실패 {futures[future]}: {error}", file=sys.stderr, flush=True)


if __name__ == "__main__":
    main()

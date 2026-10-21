# -*- coding: utf-8 -*-
"""교과서 쌍둥이 시범 — 저자 제안 → 후보 JSON · 엔진 생성 · 그림 · 너무 닮음 · 동결 · 학생 면.

  python materialize.py <sources.jsonl> <저장소 밖 작업 폴더> <묶음 폴더(저장소 안)> [--round r1]

- 엔진 갈래: 저자가 고른 유형으로 `engine.ts twins` — 씨앗은 문항 코드에서, 원본의 수를 피한다. 엔진 커밋 · 키 · 씨앗 · 변형을 남긴다.
- 저자 갈래: 저자의 FigureSpec 을 `engine.ts figures`(strict)로 그린다. 실패하면 «보류 — 그림».
- 후보 꼴은 기출 쌍둥이 계약(`exam-twin/candidatePack.mjs` · `fe52991fa`)을 본떴다. 다른 자리는 보고서 «합칠 때 바꿀 자리».
- 동결: 후보마다 정규 JSON 의 sha256 · 그림 바이트 sha256 → `freeze.json`. 학생 면(`blind/<id>/student.json` · `fig-1.png`)은
  발문 · 보기 · 그림만 — 답 · 풀이 · 원본 · 엔진 사실이 없다.
🔴 묶음 폴더에는 새 글만 — 원본 글 · 원본 그림을 넣지 않는다(원본은 저장소 밖 · 해시로만 잇는다).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
sys.path.insert(0, str(HERE))

import fix_figures  # noqa: E402
import similarity  # noqa: E402
import integrity
from export_guard import source_copy_reasons, corpus_index, corpus_copy_reasons
from subscription_cli import AUTHOR_MODEL

BOOK_SLUG = "mirae-m2-hwang"
TSX = ["npx", "tsx"]


def canonical(value) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def git_head() -> str:
    """엔진 코드의 마지막 커밋 — 작업 가지의 HEAD 가 아니다(동결 커밋을 해도 후보의 바이트가 바뀌지 않게)"""
    return subprocess.run(["git", "log", "-1", "--format=%H", "--", "src/lib/middle", "src/lib/engine", "src/lib/figure",
                           "vendor/figure-engine", "scripts/figure"], capture_output=True, text=True, cwd=REPO).stdout.strip()


def twin_id(code: str, round_: str) -> str:
    return f"textbook-twin-{BOOK_SLUG}-{code}-{round_}"


def original_text(src: dict) -> tuple[str, str, str]:
    """(글, 정답, 뼈대 원천) — 대조가 «다른 문항»이면 SSD 원본(한글 수식)을 믿는다"""
    if src["trustedDbText"]:
        return src["dbContent"], src["dbAnswer"], "latex"
    return src["origContent"], src["origAnswer"] or "", "hwp"


def shape_problem(body: dict) -> str | None:
    """기출 계약 `validateCandidate` 의 꼴 검사를 본뜬 것 — 어기면 까닭(«모두 고르시오»의 정답 둘은 교과서 쪽 차이로 받는다)"""
    for key in ("content", "answer", "solution"):
        if not (body.get(key) or "").strip():
            return f"{key} 가 비었다"
    if body["questionType"] not in ("객관식", "단답형", "서술형"):
        return f"형식 «{body['questionType']}»"
    if body["questionType"] == "객관식":
        choices = body["choices"]
        if len(choices) != 5 or not all((c or "").strip() for c in choices):
            return f"보기 {len(choices)}개"
        if len({re.sub(r"\s", "", c) for c in choices}) != 5:
            return "같은 보기가 있다"
        marks = re.findall(r"[①②③④⑤]", body["answer"])
        rest = re.sub(r"[①②③④⑤,\s]", "", body["answer"])
        if not marks or rest or len(marks) > 2 or len(set(marks)) != len(marks):
            return f"객관식 정답 «{body['answer']}»"
        if len(marks) == 2 and "모두" not in body["content"]:
            return "정답이 둘인데 «모두 고르시오» 꼴이 아니다"
    elif body["choices"]:
        return "객관식이 아닌데 보기가 있다"
    return None


def proposals(work: Path, author_dir: str = "author") -> dict[str, dict]:
    out = {}
    for file in sorted((work / author_dir).glob("*.json")):
        if file.name.startswith("._") or file.name.endswith(".raw.json"):
            continue
        record = json.loads(file.read_text(encoding="utf-8"))
        for p in record["proposals"]:
            out[p["problemCode"]] = {**p, "_model": record["model"], "_session": record["sessionId"], "_file": file.name,
                                     "_revisionOf": record.get("revisionOf")}
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("sources")
    parser.add_argument("work")
    parser.add_argument("bundle")
    parser.add_argument("--round", default="r1")
    parser.add_argument("--author-dir", default="author")
    parser.add_argument("--only-proposed", action="store_true", help="제안이 있는 문항만(고쳐 쓰기 판)")
    parser.add_argument("--repair-jobs", type=int, default=1)
    parser.add_argument("--repair-model", default=AUTHOR_MODEL)
    args = parser.parse_args()
    work, bundle = Path(args.work), Path(args.bundle)
    for sub in ("candidates", "figures", "blind"):
        (bundle / sub).mkdir(parents=True, exist_ok=True)
    sources = {s["problemCode"]: s for s in map(json.loads, open(args.sources, encoding="utf-8"))}
    corpus = corpus_index(sources.values())
    props = proposals(work, args.author_dir)
    # 재개는 이미 동결한 후보를 다시 쓰지 않는다. 새 제안만 덧붙인다.
    previous = json.loads((bundle / "freeze.json").read_text()) if (bundle / "freeze.json").exists() else {"candidates": {}}
    previous_holds = json.loads((bundle / "holds.json").read_text()) if (bundle / "holds.json").exists() else []
    preserved = []
    for tid, frozen in previous["candidates"].items():
        errors = integrity.frozen_errors(bundle, tid, frozen)
        if errors:
            raise ValueError(f"기존 동결본 손상: {tid}: {errors}")
        candidate = json.loads((bundle / "candidates" / f"{tid}.json").read_text())
        preserved.append(candidate)
    done_codes = {c["sourceReference"]["problemCode"] for c in preserved}
    kept_holds = [h for h in previous_holds if h["reason"] != "저자 제안 없음"]
    done_codes.update(h["problemCode"] for h in kept_holds)
    props = {code: p for code, p in props.items() if code not in done_codes}
    # 이어서 생성한 중간 결과도 예전 저작/그림 증거를 덮어쓰지 않는다.
    generation_dir = work / f"materialize-{args.round}-{time.time_ns()}" if previous["candidates"] else work
    generation_dir.mkdir(exist_ok=True)
    engine_commit = git_head()

    # 1. 엔진 갈래
    plan = []
    for code, p in props.items():
        if p.get("route") == "engine":
            text, _answer, source = original_text(sources[code])
            plan.append({"problemCode": code, "typeKey": p["engine"]["typeKey"], "questionType": sources[code]["questionType"],
                         "revision": args.round,
                         "avoidNumbers": similarity.numbers(text, source)})
    engine_dir = generation_dir / ("engine" if args.round == "r1" else f"engine-{args.round}")
    engine_dir.mkdir(exist_ok=True)
    (engine_dir / "plan.jsonl").write_text("".join(json.dumps(x, ensure_ascii=False) + "\n" for x in plan), encoding="utf-8")
    engine_out = {}
    if plan:
        subprocess.run([*TSX, "scripts/qa/textbook-twin/engine.ts", "twins", str(engine_dir / "plan.jsonl"), str(engine_dir)],
                       cwd=REPO, check=True)
        engine_out = {e["problemCode"]: e for e in json.loads((engine_dir / "engine-twins.json").read_text(encoding="utf-8"))}

    # 2. 저자 갈래의 그림
    specs = {}
    for code, p in props.items():
        if p.get("route") == "author" and (p.get("twin") or {}).get("figureSpec"):
            specs[twin_id(code, args.round)] = p["twin"]["figureSpec"]
    fig_dir = generation_dir / ("figures" if args.round == "r1" else f"figures-{args.round}")
    fig_dir.mkdir(exist_ok=True)
    (fig_dir / "specs.json").write_text(json.dumps(specs, ensure_ascii=False, indent=1), encoding="utf-8")
    fig_report, repairs = {}, {}

    def render(specs_file: Path, out_dir: Path) -> dict:
        subprocess.run([*TSX, "scripts/qa/textbook-twin/engine.ts", "figures", str(specs_file), str(out_dir)], cwd=REPO, check=True)
        return json.loads((out_dir / "figures-report.json").read_text(encoding="utf-8"))

    if specs:
        # 앞서 고친 스펙이 있으면 그것을 쓴다(다시 돌릴 때 고치기를 또 부르지 않는다 — 고친 스펙은 한 벌로 남는다)
        final_file = fig_dir / "figures-report-final.json"
        if final_file.exists():
            earlier = json.loads(final_file.read_text(encoding="utf-8"))
            specs.update({tid: s for tid, s in earlier.get("specs", {}).items() if tid in specs})
            repairs = earlier.get("repairs", {})
            (fig_dir / "specs.json").write_text(json.dumps(specs, ensure_ascii=False, indent=1), encoding="utf-8")
        fig_report = render(fig_dir / "specs.json", fig_dir)
        contents = {twin_id(code, args.round): p["twin"]["content"] for code, p in props.items() if p.get("route") == "author"}
        model = args.repair_model
        specs, fig_report, more = fix_figures.repair(fig_dir, specs, fig_report, contents, render, model=model, jobs=args.repair_jobs)
        for tid, steps in more.items():
            repairs.setdefault(tid, []).extend(steps)
        final_file.write_text(json.dumps({"report": fig_report, "repairs": repairs, "specs": specs}, ensure_ascii=False, indent=1),
                              encoding="utf-8")

    # 3. 후보
    holds, candidates, png_pairs = kept_holds, preserved, []
    order = sorted(sources.values(), key=lambda s: (s["semester"], s["chapter"], s["section"], s["problemCode"]))
    for number, src in enumerate(order, 1):
        code = src["problemCode"]
        if code in done_codes:
            continue
        p = props.get(code)
        tid = twin_id(code, args.round)
        if p is None:
            if not args.only_proposed:
                holds.append({"problemCode": code, "stage": "author", "reason": "저자 제안 없음"})
            continue
        if p.get("route") == "hold":
            holds.append({"problemCode": code, "stage": "author", "reason": (p.get("hold") or {}).get("reason", "")})
            continue
        figure_artifacts, figure_authoring = [], {}
        if p["route"] == "engine":
            e = engine_out.get(code) or {}
            if "error" in e or not e:
                holds.append({"problemCode": code, "stage": "engine", "reason": e.get("error", "엔진 결과 없음")})
                continue
            if (e.get("figure") or {}).get("error"):
                holds.append({"problemCode": code, "stage": "figure", "reason": f"엔진 그림 실패: {e['figure']['error'][:200]}"})
                continue
            body = {"questionType": e["questionType"], "content": e["content"], "choices": e["choices"], "answer": e["answer"],
                    "solution": e["solution"]}
            author_id = f"middle-engine:{e['typeKey']}"
            engine = {"commit": engine_commit, "typeKey": e["typeKey"], "seed": e["seed"], "variant": e["variant"],
                      "formatChanged": e["formatChanged"], "proposedBy": f"{p['_model']}:{p['_session']}",
                      "authorRationale": p["engine"].get("why", ""), "facts": e["facts"]}
            if e.get("figure"):
                spec = json.loads((engine_dir / e["figure"]["specPath"]).read_text())
                spec_errors = source_copy_reasons(src, {"figureSpec": spec}) + corpus_copy_reasons(corpus, {"figureSpec": spec})
                if spec_errors:
                    holds.append({"problemCode": code, "stage": "source-copy", "reason": "그림 표지의 원문 복제 의심 — 원안은 외부 생성 원장"})
                    continue
                shutil.copyfile(engine_dir / e["figure"]["svgPath"], bundle / "figures" / f"{tid}.svg")
                shutil.copyfile(engine_dir / e["figure"]["specPath"], bundle / "figures" / f"{tid}.spec.json")
                figure_artifacts.append({"role": "stem", "specPath": f"figures/{tid}.spec.json", "svgPath": f"figures/{tid}.svg",
                                         "intendedWidthMm": 70})
                figure_authoring = {"method": "middle-engine-figureSpec", "newFigures": 1, "originalCropEmbedded": False}
        else:
            twin = p["twin"]
            body = {k: twin.get(k) for k in ("questionType", "content", "choices", "answer", "solution")}
            body["choices"] = body["choices"] or []
            author_id = f"{p['_model']}:{p['_session']}"
            engine = None
            if twin.get("figureSpec"):
                report = fig_report.get(tid, {})
                if not report.get("ok"):
                    holds.append({"problemCode": code, "stage": "figure",
                                  "reason": f"저자 그림 스펙 실패(고치기 {len(repairs.get(tid, []))}번 뒤): {report.get('error', '')[:200]}"})
                    continue
                spec_errors = source_copy_reasons(src, {"figureSpec": specs[tid]}) + corpus_copy_reasons(corpus, {"figureSpec": specs[tid]})
                if spec_errors:
                    holds.append({"problemCode": code, "stage": "source-copy", "reason": "그림 표지의 원문 복제 의심 — 원안은 외부 생성 원장"})
                    continue
                shutil.copyfile(fig_dir / report["svgPath"], bundle / "figures" / f"{tid}.svg")
                (bundle / "figures" / f"{tid}.spec.json").write_text(json.dumps(specs[tid], ensure_ascii=False, indent=1),
                                                                     encoding="utf-8")
                figure_artifacts.append({"role": "stem", "specPath": f"figures/{tid}.spec.json", "svgPath": f"figures/{tid}.svg",
                                         "intendedWidthMm": 70})
                figure_authoring = {"method": "author-figureSpec-engine-strict", "newFigures": 1, "originalCropEmbedded": False,
                                    "specRepairs": repairs.get(tid, [])}
        if not figure_artifacts and "[그림]" in (body["content"] or ""):
            holds.append({"problemCode": code, "stage": "figure", "reason": "발문에 [그림] 이 있는데 쌍둥이 그림이 없다"})
            continue
        problem = shape_problem(body)
        if problem:
            holds.append({"problemCode": code, "stage": "shape", "reason": problem})
            continue
        text, answer, source = original_text(src)
        sim = similarity.judge(text, source, (body["content"] or "") + "\n" + "\n".join(body["choices"]),
                               original_answer=answer, twin_answer=body["answer"] or "")
        candidate = {
            "schemaVersion": 1,
            "questionNumber": number,
            "twinExternalId": tid,
            "authorId": author_id,
            "revisionOf": p.get("_revisionOf"),
            "route": p["route"],
            **body,
            "score": None,
            "figureArtifacts": figure_artifacts,
            "sourceReference": {
                "externalId": src["externalId"],
                "problemCode": code,
                "sourceBook": "2022/미래엔/중2/황선욱",
                "materialKind": src["materialKind"],
                "sourceQuestionNumber": src["questionNumber"],
                "sourceContentSha256": src["sourceContentSha256"],
                "dbContentSha256": src["dbContentSha256"],
                "sourceFiles": [{"path": src["sourceFile"]["path"], "sha256": src["sourceFile"]["sha256"],
                                 "bytes": src["sourceFile"]["bytes"]}],
                "originalFigureSha256": [f["sha256"] for f in src["figures"]],
                "verifyLedger": {"path": "display-survey/textbook-verify/ledger-20261021.jsonl", "body": src["verify"]["body"],
                                 "answer": src["verify"]["answer"]},
                "authorSawDbText": src["trustedDbText"],
                "authorSawOriginalFigures": bool(src["figures"]),
                "originalFigureIdentityVerified": False,
                "sourceDirectUseAllowed": src["directUseAllowed"],
                "sourceIdentityApproved": False,
                "rightsApproved": False,
                "sourceTextCopiedToCandidate": False,
            },
            "variantDelta": p.get("variantDelta") or {},
            "curriculumReview": {
                "grade": src["grade"], "edition": "2022", "status": "author-proposed",
                "standardCodes": [],
                "basis": "source-textbook-placement",
                "sourceUnit": {"unitId": src["unitId"], "semester": src["semester"], "chapter": src["chapter"], "section": src["section"]},
                "prerequisites": p.get("prerequisites") or [],
                "sevenSurfaces": {s: "author-proposed-independent-review-pending" for s in
                                  ("stem", "choices", "figuresAndTables", "notation", "answer", "studentSolution", "prerequisites")},
                "independentReviewPending": True,
                "authorCannotApprove": True,
            },
            "metadata": {
                "grade": src["grade"], "subject": "수학", "curriculum": {"source": "2022", "target": "2022"},
                "questionType": body["questionType"], "score": None, "source": "transformed", "originProblemCode": code,
                "difficultyProposal": p.get("difficultyProposal"), "sourceDifficulty": src["difficulty"],
                "difficultyStatus": "author-proposed-independent-calibration-pending",
                "problemTypeProposal": p.get("problemTypeProposal"), "problemTypeStatus": "author-proposed",
                "assignment": {"status": "proposed", "unitId": src["unitId"], "familyKey": None,
                               "evidence": "원본 교과서 문항의 차시 — 쌍둥이를 같은 차시에 두자는 제안(family 는 정하지 않음)"},
                "engine": engine,
                "figureAuthoring": figure_authoring,
                "figureCheckByAuthor": p.get("figureCheck"),
                "similarity": sim,
                "authorOnly": True, "independentMathApproval": False, "independentGradeApproval": False,
                "similarityApproved": False, "nativeProvenanceApproved": False, "loadable": False, "productionWrites": False,
            },
        }
        export_errors = source_copy_reasons(src, candidate) + corpus_copy_reasons(corpus, candidate)
        if export_errors:
            quarantine = work / "quarantine"
            quarantine.mkdir(exist_ok=True)
            (quarantine / f"{tid}.json").write_text(json.dumps(candidate, ensure_ascii=False, indent=1), encoding="utf-8")
            holds.append({"problemCode": code, "stage": "source-copy", "reason": " / ".join(export_errors)})
            continue
        (bundle / "candidates" / f"{tid}.json").write_text(json.dumps(candidate, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        candidates.append(candidate)
        # 학생 면 — 발문 · 보기 · 그림만
        blind = bundle / "blind" / tid
        blind.mkdir(exist_ok=True)
        student = {"twinExternalId": tid, "grade": src["grade"], "questionType": body["questionType"],
                   "content": body["content"], "choices": body["choices"], "figures": []}
        if figure_artifacts:
            png_pairs.append([str(bundle / figure_artifacts[0]["svgPath"]), str(blind / "fig-1.png")])
            student["figures"].append("fig-1.png")
        (blind / "student.json").write_text(json.dumps(student, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    if png_pairs:
        (generation_dir / "png-pairs.json").write_text(json.dumps(png_pairs, ensure_ascii=False), encoding="utf-8")
        subprocess.run([*TSX, "scripts/qa/textbook-twin/engine.ts", "png", str(generation_dir / "png-pairs.json"), "192"], cwd=REPO, check=True)

    # 4. 동결
    freeze = {"round": args.round, "engineCommit": engine_commit, "candidates": {}}
    for c in candidates:
        tid = c["twinExternalId"]
        blind = bundle / "blind" / tid
        freeze["candidates"][tid] = {
            "candidateSha256": sha(canonical(c)),
            "figures": {a["svgPath"]: sha((bundle / a["svgPath"]).read_bytes()) for a in c["figureArtifacts"]},
            "student": {f.name: sha(f.read_bytes()) for f in sorted(blind.iterdir()) if not f.name.startswith("._")},
        }
        errors = integrity.frozen_errors(bundle, tid, freeze["candidates"][tid])
        if errors:
            raise ValueError(f"학생 면을 동결할 수 없다: {tid}: {errors}")
    (bundle / "freeze.json").write_text(json.dumps(freeze, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    for hold in holds:
        src = sources[hold["problemCode"]]
        if source_copy_reasons(src, hold) or corpus_copy_reasons(corpus, hold):
            quarantine = work / "quarantine"
            quarantine.mkdir(exist_ok=True)
            path = quarantine / f"{twin_id(hold['problemCode'], args.round)}.hold.json"
            path.write_text(json.dumps(hold, ensure_ascii=False, indent=1))
            hold["reason"] = "보류 상세에 원문 인용이 있어 외부 원장에 보존"
            hold["externalDetail"] = str(path)
            hold["detailSha256"] = sha(path.read_bytes())
    (bundle / "holds.json").write_text(json.dumps(holds, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    routes = {}
    for c in candidates:
        routes[c["route"]] = routes.get(c["route"], 0) + 1
    sims = {}
    for c in candidates:
        v = c["metadata"]["similarity"]["verdict"]
        sims[v] = sims.get(v, 0) + 1
    print(f"후보 {len(candidates)} {routes} · 보류 {len(holds)} · 너무 닮음 {sims} → {bundle}")


if __name__ == "__main__":
    main()

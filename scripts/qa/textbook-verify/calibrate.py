# -*- coding: utf-8 -*-
"""대조기의 눈금 — 깨끗한 표본과 **틀린 대조군**을 같이 대어 본다 (교과서 원본 대조 · 2026-10-21).

  python calibrate.py <DB 덤프> <원본 폴더> <원장> <출력 폴더> [--seed 20261021] [--labels <손 판정 JSON>]...

18번 문서의 함정: 깨끗한 표본만 대면 «지어냄 0»으로 보인다 · 변이가 동작을 안 바꾸면 가드가 아니다.
그래서 두 쪽을 다 잰다. 🔴 대조군은 전수와 **같은 판정 길**(`verify.Verifier.judge` — 이웃 문항 · 가까운 표 칸 · 머리글 ·
표를 줄로 풀어 씀까지)을 탄다(Codex 1회차: 맥락 없는 `compare` 만 대면 후처리의 구멍이 안 보인다).

  틀린 대조군(«다른 문항» · 정답 «다름»이어야 한다) — DB 글을 일부러 망가뜨린다
    shift     같은 파일 · 같은 묶음의 **다음 번호** 원본과 짝짓기(§4 의 «본문이 다른 문항의 것»)
    digit     수식 안의 수 하나를 바꾼다
    operator  `+`↔`-` · `<`↔`>` · `<`→`≤` 하나
    sign      수 앞의 `-` 하나를 지운다(`−3`→`3`)
    script    위첨자를 아래첨자로(`x^{2}`→`x_{2}`) · 분수를 붙은 수로(`\\frac{1}{2}`→`12`)
    drop      물음 · 조건 문장 하나를 뺀다
    tail      마지막 문장(물음 뒤의 물음 · 조건)을 뺀다 — «넓이를 구하시오. 둘레도 구하시오.»의 뒤
    word      «최댓값»↔«최솟값» 같은 반대말 하나
    answer    정답의 값 하나를 바꾼다(소문항 표지의 수는 빼고) · 정답의 부호를 지운다
  표기 대조군(«같음 · 표기만 다름»이어야 한다)
    notation  `\\frac`→`\\dfrac` · 빈칸 · `\\left(`…`\\right)` · «다음 그림»↔«오른쪽 그림»

손 판정: `--labels` 로 준 JSON(문항 코드 · truth)마다 원장의 판정과 견준다. 새 표본은 `sample-50.md` 로 낸다 — 이미 손으로 본
문항은 뺀다(같은 표본을 다시 통과한 것은 회귀 확인일 뿐이다 — Codex 1회차).
"""
from __future__ import annotations

import argparse
import collections
import json
import random
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from verify import Verifier  # noqa: E402

OPPOSITES = [("최댓값", "최솟값"), ("최솟값", "최댓값"), ("큰", "작은"), ("작은", "큰"), ("이상", "미만"), ("미만", "이상"),
             ("짝수", "홀수"), ("홀수", "짝수"), ("넓이", "둘레"), ("옳은", "옳지 않은"), ("양수", "음수"), ("음수", "양수")]
_MATH = re.compile(r"\$[^$]*\$")


def _in_math(text: str, rng: random.Random, pattern: str, replace) -> str | None:
    spans = [m for m in _MATH.finditer(text) if re.search(pattern, m.group(0))]
    if not spans:
        return None
    span = rng.choice(spans)
    hits = list(re.finditer(pattern, span.group(0)))
    hit = rng.choice(hits)
    body = span.group(0)[: hit.start()] + replace(hit) + span.group(0)[hit.end():]
    return text[: span.start()] + body + text[span.end():]


def mutate_digit(text: str, rng: random.Random) -> str | None:
    # 소문항 표지 «(1)» · 보기 번호의 수는 값이 아니다 — 그 밖의 수만
    return _in_math(text, rng, r"(?<!\()\d(?!\))", lambda m: str((int(m.group(0)) + rng.randint(1, 8)) % 10))


def mutate_operator(text: str, rng: random.Random) -> str | None:
    flips = {"+": "-", "-": "+", "<": ">", ">": "<"}

    def flip(m: re.Match) -> str:
        if m.group(0) == "<" and rng.random() < 0.5:
            return "\\leq "
        return flips[m.group(0)]

    return _in_math(text, rng, r"(?<=[\w})])[+\-<>](?=[\w({\\])", flip)


def mutate_sign(text: str, rng: random.Random) -> str | None:
    return _in_math(text, rng, r"(?<![\w})])-(?=\d)", lambda m: "")


def mutate_script(text: str, rng: random.Random) -> str | None:
    if rng.random() < 0.5:
        out = _in_math(text, rng, r"\^\{?(\d)\}?", lambda m: "_{" + m.group(1) + "}")
        if out:
            return out
    return _in_math(text, rng, r"\\d?frac\{(\d+)\}\{(\d+)\}", lambda m: m.group(1) + m.group(2))


def drop_sentence(text: str, rng: random.Random) -> str | None:
    lines = text.split("\n")
    candidates = [i for i, line in enumerate(lines) if re.search(r"구하시오|고르시오|것은\?|값은\?|\(단,|이다\.|일 때", line) and len(line) > 12]
    if not candidates:
        return None
    i = rng.choice(candidates)
    parts = re.split(r"(?<=[.?])\s+", lines[i])
    # 뺄 문장은 글이 든 것만 — 그림 표지(«[그림]»)만 빼면 뜻이 안 바뀐다(그것은 «같음»이 맞다)
    real = [k for k, part in enumerate(parts) if len(re.findall(r"[가-힣]", _MATH.sub("", part))) >= 6]
    if not real:
        return None
    if len(parts) > 1:
        parts.pop(rng.choice(real))
        lines[i] = " ".join(parts)
    else:
        lines.pop(i)
    return "\n".join(lines)


def drop_tail(text: str, rng: random.Random) -> str | None:
    """마지막 문장 하나를 뺀다 — 앞에 물음이 이미 있을 때만(«…구하시오. 또, … 구하시오.»의 뒤)."""
    body = text.rstrip()
    parts = re.split(r"(?<=[.?])\s+", body)
    if len(parts) < 2 or not re.search(r"구하시오|나타내시오|고르시오|쓰시오|\?", " ".join(parts[:-1])):
        return None
    if len(re.findall(r"[가-힣]", _MATH.sub("", parts[-1]))) < 6 or re.match(r"^[①-⑤]", parts[-1]):
        return None
    return " ".join(parts[:-1])


def swap_word(text: str, rng: random.Random) -> str | None:
    found = [(a, b) for a, b in OPPOSITES if a in _MATH.sub("", text)]
    if not found:
        return None
    a, b = rng.choice(found)
    return text.replace(a, b, 1)


def notation_only(text: str, rng: random.Random) -> str:
    out = text.replace("\\frac", "\\dfrac").replace("$, $", "$,  $")
    out = re.sub(r"\(([^()$]{1,20})\)(?=[^$]*\$)", r"\\left(\1\\right)", out, count=1)
    return out.replace("다음 그림", "오른쪽 그림", 1)


def mutate_answer(answer: str, rng: random.Random) -> str | None:
    # 소문항 표지 «(1)» 의 수는 값이 아니다 — 값의 수만 바꾼다. 셋에 하나는 부호를 지운다
    labels = [m.span(1) for m in re.finditer(r"\((\d+)\)", answer)]
    if rng.random() < 0.33:
        minus = [m for m in re.finditer(r"(?<![\w})])-(?=\d)", answer) if not any(a <= m.start() < b for a, b in labels)]
        if minus:
            m = rng.choice(minus)
            return answer[: m.start()] + answer[m.end():]
    digits = [m for m in re.finditer(r"\d", answer) if not any(a <= m.start() < b for a, b in labels)]
    if digits:
        d = rng.choice(digits)
        return answer[: d.start()] + str((int(d.group(0)) + rng.randint(1, 8)) % 10) + answer[d.end():]
    choice = re.search(r"[①-⑤]", answer)
    if choice:
        return answer.replace(choice.group(0), "①②③④⑤"[("①②③④⑤".index(choice.group(0)) + rng.randint(1, 4)) % 5], 1)
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("dump")
    parser.add_argument("orig")
    parser.add_argument("ledger")
    parser.add_argument("out")
    parser.add_argument("--seed", type=int, default=20261021)
    parser.add_argument("--per-kind", type=int, default=400)
    parser.add_argument("--labels", action="append", default=[])
    args = parser.parse_args()
    rng = random.Random(args.seed)
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    verifier = Verifier(args.dump, args.orig)
    ledger = [json.loads(l) for l in open(args.ledger, encoding="utf-8")]
    by_id = {r["externalId"]: r for r in ledger}

    # 대조군의 바탕 — 원본과 «같음»인 문항만(망가뜨린 것이 망가뜨린 탓인지 갈리게)
    clean = [r for r in ledger if r["body"] == "same"]
    rng.shuffle(clean)
    results: dict[str, collections.Counter] = collections.defaultdict(collections.Counter)
    misses: dict[str, list] = collections.defaultdict(list)
    makers = (("digit", mutate_digit), ("operator", mutate_operator), ("sign", mutate_sign), ("script", mutate_script),
              ("drop", drop_sentence), ("tail", drop_tail), ("word", swap_word))
    for kind, maker in makers:
        done = 0
        for record in clean:
            if done >= args.per_kind:
                break
            row = verifier.db_by_id[record["externalId"]]
            mutated = maker(row["content"], rng)
            if mutated is None or mutated == row["content"]:
                continue
            verdict = verifier.judge(row, content=mutated)["body"]
            results[kind][verdict] += 1
            if verdict != "different" and len(misses[kind]) < 20:
                misses[kind].append({"code": row["problemCode"], "mutated": mutated[:400], "verdict": verdict})
            done += 1
    # shift — 같은 파일 · 같은 묶음의 다음 번호 원본
    done = 0
    for record in clean:
        if done >= args.per_kind:
            break
        _, key, section, number = record["externalId"].rsplit("-", 3)
        neighbour = verifier.originals.get(f"tb-{key}-{section}-{int(number) + 1}")
        if neighbour is None:
            continue
        row = verifier.db_by_id[record["externalId"]]
        verdict = verifier.judge(row, orig=neighbour)["body"]
        results["shift"][verdict] += 1
        if verdict != "different" and len(misses["shift"]) < 20:
            misses["shift"].append({"code": row["problemCode"], "db": row["content"][:300], "neighbour": neighbour["content"][:300], "verdict": verdict})
        done += 1
    # 표기 대조군
    done = 0
    for record in clean:
        if done >= args.per_kind:
            break
        row = verifier.db_by_id[record["externalId"]]
        changed = notation_only(row["content"], rng)
        if changed == row["content"]:
            continue
        verdict = verifier.judge(row, content=changed)["body"]
        results["notation"][verdict] += 1
        if verdict == "different" and len(misses["notation"]) < 20:
            misses["notation"].append({"code": row["problemCode"], "changed": changed[:400]})
        done += 1
    # 정답 대조군 — 원본과 정답이 «같음»인 문항
    done = 0
    for record in ledger:
        if done >= args.per_kind or record.get("answer") != "same":
            continue
        row = verifier.db_by_id[record["externalId"]]
        mutated = mutate_answer(row["answer"], rng)
        if mutated is None or mutated == row["answer"]:
            continue
        verdict = verifier.judge(row, answer=mutated)["answer"]
        results["answer"][verdict] += 1
        if verdict != "different" and len(misses["answer"]) < 20:
            misses["answer"].append({"code": row["problemCode"], "mutated": mutated, "original": verifier.originals[record["externalId"]].get("answer"), "verdict": verdict})
        done += 1

    summary = {kind: dict(counter) for kind, counter in results.items()}
    report = {"seed": args.seed, "results": summary, "misses": misses}
    for kind, counter in results.items():
        total = sum(counter.values())
        if kind == "notation":
            hit = total - counter["different"]
            print(f"{kind:9s} n={total:4d}  통과 {hit:4d} ({hit / total:.1%})  {dict(counter)}")
        else:
            hit = counter["different"]
            print(f"{kind:9s} n={total:4d}  잡음 {hit:4d} ({hit / total:.1%})  {dict(counter)}")

    # 손 판정과 견주기
    seen: set[str] = set()
    for path in args.labels:
        labels = json.load(open(path, encoding="utf-8"))
        confusion = collections.Counter()
        wrong = []
        for label in labels:
            seen.add(label["externalId"])
            got = by_id[label["externalId"]]["body"]
            confusion[(label["truth"], got)] += 1
            if label["truth"] != got:
                wrong.append({"code": label["problemCode"], "truth": label["truth"], "got": got, "note": label.get("note", "")})
        report.setdefault("labels", {})[Path(path).name] = {"confusion": {f"{t}→{g}": n for (t, g), n in sorted(confusion.items())}, "wrong": wrong}
        print(Path(path).name, dict(sorted(confusion.items())))

    # 새 표본 50(같음 20 · 표기만 다름 15 · 다른 문항 15) — 손으로 본 문항은 뺀다
    pool = collections.defaultdict(list)
    for record in ledger:
        if record["externalId"] not in seen:
            pool[record["body"]].append(record)
    sample = []
    for body, n in (("same", 20), ("notation", 15), ("different", 15)):
        sample.extend(rng.sample(pool[body], min(n, len(pool[body]))))
    with open(out / "sample-50.md", "w", encoding="utf-8") as handle:
        for i, record in enumerate(sample, 1):
            row = verifier.db_by_id[record["externalId"]]
            orig = verifier.originals[record["externalId"]]
            text = orig["contentFig"] if (orig.get("contentFig") and row["figureUrls"]) else orig["content"]
            handle.write(f"## {i}. {row['problemCode']} · {record['externalId']} · 대조기 «{record['body']}» · 정답 «{record.get('answer')}»\n\n")
            handle.write(f"- 까닭: {record.get('bodyReasons')}\n\n**원본**\n\n```\n{text}\n```\n\n**DB**\n\n```\n{row['content']}\n```\n\n")
            handle.write(f"- 정답 — 원본: `{orig.get('answer')}` · DB: `{row['answer']}`\n\n")
    (out / "sample-50.json").write_text(json.dumps([{"problemCode": r["problemCode"], "externalId": r["externalId"], "body": r["body"]} for r in sample], ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "controls.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()

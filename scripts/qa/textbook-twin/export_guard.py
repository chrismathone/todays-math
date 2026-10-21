"""원문을 저장소로 내보내지 않는 최소 관문. 의심본은 외부 원장에 보존한다.

저작권 판단이나 유사도 검수를 대체하지 않는다. 완전한 원문 복제와 긴 그대로 인용을 막는다.
"""
from __future__ import annotations

import difflib
import re


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, dict):
        for item in value.values():
            yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def complete_source(key: str, compact: str) -> bool:
    # 짧은 계산 발문도 통째로 복제해서는 안 된다. 풀이의 짧은 항등식은 별개다.
    if key in {"dbContent", "origContent"}:
        return len(compact) >= 12
    return len(compact) >= 40 and len(re.findall(r"[가-힣]", compact)) >= 20


def source_copy_reasons(src: dict, candidate: dict) -> list[str]:
    fields = list(strings({k: v for k, v in candidate.items() if k != "sourceReference"}))
    # 보기를 분리해 저장해도 원문 한 문항 복제를 놓치지 않는다.
    fields.append(candidate.get("content", "") + "\n" + "\n".join(
        f"{'①②③④⑤'[i]} {c}" for i, c in enumerate(candidate.get("choices", []))))
    reasons = []
    for key in ("dbContent", "origContent", "dbSolution", "origSolution"):
        source = src.get(key) or ""
        compact = re.sub(r"\s+", "", source)
        if not complete_source(key, compact):
            continue
        for text in fields:
            if compact in re.sub(r"\s+", "", text):
                reasons.append(f"{key} 전체가 후보 필드에 그대로 있다")
                break
            if difflib.SequenceMatcher(None, source, text, autojunk=False).find_longest_match().size >= 160:
                reasons.append(f"{key}에서 160자 이상 연속 인용")
                break
    return reasons


def corpus_index(sources):
    result = []
    for src in sources:
        for key in ("dbContent", "origContent", "dbSolution", "origSolution"):
            text = re.sub(r"\s+", "", src.get(key) or "")
            if complete_source(key, text):
                result.append((src["problemCode"], key, text))
    return result


def corpus_copy_reasons(index, candidate):
    fields = [re.sub(r"\s+", "", text) for text in strings({k: v for k, v in candidate.items() if k != "sourceReference"})]
    return [f"선택 책 원문 전체 복제: {code}/{key}" for code, key, original in index
            if any(original in text for text in fields)]

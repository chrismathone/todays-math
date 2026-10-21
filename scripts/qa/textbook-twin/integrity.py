"""미리보기 검증의 봉인: 실제 바이트와 Git에 남긴 증거를 확인한다. DB에는 접근하지 않는다."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def canonical(value) -> bytes:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def author_roles(candidate: dict) -> tuple[set[str], set[str]]:
    metadata = candidate.get("metadata") or {}
    identity = ((metadata.get("engine") or {}).get("proposedBy", "") if candidate.get("route") == "engine"
                else candidate.get("authorId", ""))
    model, _, session = identity.partition(":")
    models, sessions = ({model} if model else set()), ({session} if session else set())
    for repair in (metadata.get("figureAuthoring") or {}).get("specRepairs", []):
        # 전환 전 기록은 저자와 같은 모델로만 그림을 고쳤다.
        if repair.get("model") or model:
            models.add(repair.get("model") or model)
        if repair.get("session"):
            sessions.add(repair["session"])
    return models, sessions


def frozen_errors(bundle: Path, tid: str, frozen: dict) -> list[str]:
    errors = []
    candidate = bundle / "candidates" / f"{tid}.json"
    try:
        cand = json.loads(candidate.read_text(encoding="utf-8"))
        if digest(canonical(cand)) != frozen["candidateSha256"]:
            errors.append("후보 바이트가 동결본과 다르다")
        if set(frozen.get("figures", {})) != {a["svgPath"] for a in cand["figureArtifacts"]}:
            errors.append("후보 그림과 동결 그림 목록이 다르다")
        for name, expected in frozen.get("figures", {}).items():
            if digest((bundle / name).read_bytes()) != expected:
                errors.append(f"그림이 동결본과 다르다: {name}")
        blind = bundle / "blind" / tid
        student = json.loads((blind / "student.json").read_text(encoding="utf-8"))
        expected_keys = {"twinExternalId", "grade", "questionType", "content", "choices", "figures"}
        expected_files = {"student.json", *student.get("figures", [])}
        allowed_files = {"student.json", "fig-1.png"} if cand["figureArtifacts"] else {"student.json"}
        entries = [f for f in blind.iterdir() if not f.name.startswith("._")]
        if (set(student) != expected_keys or expected_files != allowed_files or
                set(frozen["student"]) != allowed_files or
                {f.name for f in entries} != allowed_files or
                any(f.is_symlink() or not f.is_file() for f in entries) or
                student["twinExternalId"] != tid or
                any(student[k] != cand[k] for k in ("questionType", "content", "choices"))):
            errors.append("학생 면에 허용되지 않은 파일/필드 또는 후보와 다른 내용이 있다")
        actual = {f.name: digest(f.read_bytes()) for f in blind.iterdir() if f.is_file() and not f.name.startswith("._")}
        if actual != frozen["student"]:
            errors.append("학생 면 실제 바이트가 동결본과 다르다")
    except (OSError, ValueError, KeyError) as error:
        errors.append(f"동결 증거 읽기 실패: {error}")
    return errors


def read_review(path: Path) -> dict:
    """원본을 본 검수자의 원응답·근거는 저장소 밖에 두고 해시로만 연결한다."""
    pointer = json.loads(path.read_text(encoding="utf-8"))
    if "externalReview" not in pointer:
        return pointer
    data = Path(pointer["externalReview"]).read_bytes()
    if digest(data) != pointer["sha256"]:
        raise ValueError("외부 검수 기록 해시가 다르다")
    return json.loads(data)


def git_head(bundle: Path) -> str:
    return subprocess.check_output(["git", "-C", str(bundle.resolve()), "rev-parse", "HEAD"], text=True).strip()


def committed_bytes(path: Path, commit: str = "HEAD") -> bytes | None:
    try:
        root = Path(subprocess.check_output(["git", "-C", str(path.resolve().parent), "rev-parse", "--show-toplevel"], text=True).strip())
        relative = path.resolve().relative_to(root).as_posix()
        result = subprocess.run(["git", "-C", str(root), "show", f"{commit}:{relative}"], capture_output=True)
        return result.stdout if result.returncode == 0 else None
    except (OSError, ValueError, subprocess.CalledProcessError):
        return None


def committed(path: Path, commit: str = "HEAD") -> bool:
    return path.is_file() and committed_bytes(path, commit) == path.read_bytes()


def committed_specs(bundle: Path, candidate: dict, commit: str) -> bool:
    """기존 동결 해시는 SVG·PNG를 묶는다. 스펙은 같은 사전 동결 커밋의 실제 바이트로 확인한다."""
    return all(committed(bundle / artifact["specPath"], commit) for artifact in candidate["figureArtifacts"])


def committed_freeze(bundle: Path, tid: str, frozen: dict, commit: str = "HEAD") -> bool:
    try:
        saved = committed_bytes(bundle / "freeze.json", commit)
        return bool(saved) and json.loads(saved)["candidates"].get(tid) == frozen
    except (ValueError, KeyError):
        return False

"""새 검수의 입력 계약. 원문은 외부에, 사전 Git 봉인에는 해시와 위치만 둔다."""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

import integrity


def manifest_path(bundle: Path, tid: str) -> Path:
    if not re.fullmatch(r'[A-Za-z0-9_-]+', tid):
        raise ValueError('검수 문항 ID 형식 오류')
    return bundle / 'review-inputs' / f'{tid}.json'


def repo_root(bundle: Path) -> Path:
    return Path(subprocess.check_output(['git', '-C', str(bundle), 'rev-parse', '--show-toplevel'], text=True).strip()).resolve()


def expected_files(candidate: dict, frozen: dict, source: dict, bundle: Path, tid: str) -> dict[str, tuple[Path, str]]:
    """기대 집합은 동결 출처 해시 목록 + 외부 source manifest + 학생면의 교집합 계약이다."""
    ref = candidate['sourceReference']
    figures = source['figures']
    if (not isinstance(figures, list) or source['problemCode'] != ref['problemCode']
            or not re.fullmatch(r'[a-f0-9]{64}', source['sourceContentSha256'])
            or source['sourceContentSha256'] != ref['sourceContentSha256']
            or [f['sha256'] for f in figures] != ref['originalFigureSha256']):
        raise ValueError('동결 출처와 source manifest의 ID/본문 해시/그림 집합 불일치')
    files = {}
    for i, figure in enumerate(figures, 1):
        file = Path(figure['file'])
        suffix = file.suffix.lower()
        if suffix not in ('.png', '.jpg', '.jpeg', '.webp', '.svg'):
            raise ValueError('검수 원본 그림 확장자 미지원')
        files[f'original-fig-{i}{suffix}'] = (file, figure['sha256'])
    student = frozen['student']
    expected_student = {'student.json', 'fig-1.png'} if candidate['figureArtifacts'] else {'student.json'}
    if set(student) != expected_student:
        raise ValueError('동결 학생면과 후보 그림 집합 불일치')
    if 'fig-1.png' in student:
        files['twin-fig-1.png'] = (bundle / 'blind' / tid / 'fig-1.png', student['fig-1.png'])
    for file, sha in files.values():
        if (not isinstance(sha, str) or not re.fullmatch(r'[a-f0-9]{64}', sha)
                or not file.is_file() or file.is_symlink() or integrity.digest(file.read_bytes()) != sha):
            raise ValueError('기대 검수 입력 그림의 실제 바이트 불일치/누락')
    return files


def prepare(tid: str, source: dict, bundle: Path, run_dir: Path) -> Path:
    """CLI 호출 전 준비만 한다. 반환한 해시 계약을 원시 풀이와 함께 명시적으로 커밋해야 한다."""
    path = manifest_path(bundle, tid)
    head = integrity.git_head(bundle)
    candidate_file = bundle / 'candidates' / f'{tid}.json'
    candidate = json.loads(candidate_file.read_text())
    frozen = json.loads((bundle / 'freeze.json').read_text())['candidates'][tid]
    if (integrity.frozen_errors(bundle, tid, frozen) or not integrity.committed(candidate_file, head)
            or not integrity.committed_freeze(bundle, tid, frozen, head)):
        raise ValueError('검수 입력 준비 전 후보/학생면 동결 커밋 필요')
    expected_files(candidate, frozen, source, bundle, tid)
    source_file = (run_dir / 'review-inputs' / f'{tid}-source.json').resolve()
    if source_file.is_relative_to(repo_root(bundle)):
        raise ValueError('source manifest 원문은 저장소 밖에만 보존')
    data = integrity.canonical(source)
    manifest = {'version': 1, 'twinExternalId': tid, 'candidateSha256': frozen['candidateSha256'],
                'studentSha256': frozen['student'],
                'sourceManifest': {'path': str(source_file), 'sha256': integrity.digest(data)}}
    # 기존 계약/외부 원자료를 덮어쓰지 않는다. 다른 입력은 새 판/별도 배정이 필요하다.
    if source_file.exists() and source_file.read_bytes() != data:
        raise ValueError('기존 source manifest 변경 금지')
    if path.exists() and json.loads(path.read_text()) != manifest:
        raise ValueError('기존 검수 입력 계약 변경 금지')
    source_file.parent.mkdir(parents=True, exist_ok=True)
    if not source_file.exists(): source_file.write_bytes(data)
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists(): path.write_bytes(integrity.canonical(manifest) + b'\n')
    return path


def load(bundle: Path, tid: str, seal: str) -> tuple[dict, dict, str]:
    """기록의 자기선언 대신 지정된 Git 경로에서 사전 봉인 계약을 읽고 바이트로 재검증한다."""
    path = manifest_path(bundle, tid)
    data = integrity.committed_bytes(path, seal)
    if (not data or not integrity.committed(path, seal)
            or not integrity.is_ancestor(bundle, seal, integrity.git_head(bundle))):
        raise ValueError('검수 입력 계약의 사전 Git 봉인/조상/현재 바이트 불일치')
    manifest = json.loads(data)
    candidate_file = bundle / 'candidates' / f'{tid}.json'
    saved = integrity.committed_bytes(candidate_file, seal)
    freeze = integrity.committed_bytes(bundle / 'freeze.json', seal)
    if not saved or not freeze:
        raise ValueError('검수 입력 계약의 후보/학생면 봉인 없음')
    candidate = json.loads(saved)
    frozen = json.loads(freeze)['candidates'][tid]
    if (manifest.get('version') != 1 or manifest.get('twinExternalId') != tid
            or manifest.get('candidateSha256') != integrity.digest(integrity.canonical(candidate))
            or manifest['candidateSha256'] != frozen['candidateSha256']
            or manifest.get('studentSha256') != frozen['student']
            or not integrity.committed(candidate_file, seal) or integrity.frozen_errors(bundle, tid, frozen)):
        raise ValueError('검수 입력 계약의 동결 후보/학생면 불일치')
    for name in frozen['student']:
        if not integrity.committed(bundle / 'blind' / tid / name, seal):
            raise ValueError('검수 학생면 바이트의 사전 봉인 불일치')
    source_ref = manifest['sourceManifest']
    source_file = Path(source_ref['path'])
    if (source_file.resolve().is_relative_to(repo_root(bundle)) or not source_file.is_file()
            or source_file.is_symlink() or integrity.digest(source_file.read_bytes()) != source_ref['sha256']):
        raise ValueError('외부 source manifest 봉인 해시/위치 불일치')
    source = json.loads(source_file.read_text())
    files = expected_files(candidate, frozen, source, bundle, tid)
    return files, source, integrity.digest(data)

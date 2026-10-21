"""CLI 원문 전체 소비 회귀. 실제 사전 입력 봉인 + 합성 CLI만 사용한다."""
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

import integrity
import review
import review_inputs
from execution_evidence import events_from, review_evidence, solver_evidence
from test_evidence import write, sealed_bundle
from test_review_execution import setup_review, image_events, collect_row


@pytest.mark.parametrize('text', ['{"type":"result"}', ' \t{\n "type": "result"\n}\n',
    '{"type":"result"}\n\n \t\r\n', ' \t{"type":"result"}\r\n'])
def test_single_object_envelope_and_json_whitespace(text):
    assert events_from(text) == [{'type': 'result'}]


@pytest.mark.parametrize('prefix', [' ', '\t', ' \t', ''])
def test_jsonl_preserves_every_indented_event(prefix):
    error = {'type': 'error', 'session_id': 'synthetic', 'status': 'failed', 'message': 'synthetic failure'}
    text = '\n \t\n{"type":"init"}\n' + prefix + json.dumps(error) + '\n{"type":"result"}\n\n'
    assert events_from(text) == [{'type': 'init'}, error, {'type': 'result'}]


@pytest.mark.parametrize('text', ['', ' \t\r\n', '[]', 'null', 'true', '42', '"noise"',
    '{"type":"init"}\nnoise\n{"type":"result"}',
    '{"type":"init"}\n null\n{"type":"result"}',
    '{"type":"init"}\n {"type":\n{"type":"result"}',
    '{\n"type":"init"\n}\n{"type":"result"}',
    '{"type":"init"}{"type":"result"}',
    '{"type":"init"}\n\v\n{"type":"result"}',
    '{"type":"init","value":NaN}'])
def test_invalid_or_mixed_input_is_rejected_as_a_whole(text):
    with pytest.raises(ValueError): events_from(text)


BAD_LINES = {
    'space-error': ' ' + json.dumps({'type': 'error', 'session_id': 'new-review', 'status': 'failed', 'message': 'synthetic failure'}),
    'tab-error': '\t' + json.dumps({'type': 'error', 'session_id': 'new-review', 'status': 'failed', 'message': 'synthetic failure'}),
    'space-unknown': ' {"type":"unknown_execution","session_id":"new-review"}',
    'tab-unknown': '\t{"type":"unknown_execution","session_id":"new-review"}',
    'nonobject-null': ' null', 'nonobject-array': ' []', 'nonobject-string': ' "noise"',
    'truncated-json': ' {"type":"error",', 'nonjson-noise': 'synthetic CLI diagnostic',
    'mixed-pretty-json': ' {\n"type":"error",\n"session_id":"new-review"\n }',
}


def encoded_stream(events, case):
    if case == 'normal': return '\n'.join(map(json.dumps, events)) + '\n'
    if case == 'whitespace': return '\n \t\r\n' + '\r\n\n'.join(' \t' + json.dumps(e) for e in events) + '\n\n'
    lines = list(map(json.dumps, events)); lines.insert(3, BAD_LINES[case])
    return '\n'.join(lines) + '\n'


@pytest.mark.parametrize('stage', ['adapter', 'collector'])
@pytest.mark.parametrize('case', ['normal', 'whitespace', *BAD_LINES])
def test_all_input_consumed_through_sealed_adapter_pointer_collector(tmp_path, monkeypatch, stage, case):
    repo, source, raw, pointer = setup_review(tmp_path)
    tid = 'synthetic-twin'; run = tmp_path / 'external/run'
    # 과거 수작업 fixture 계약을 합성 임시 repo에서만 제거하고 실제 새 준비 API/커밋/load를 사용한다.
    (repo / 'review-inputs' / f'{tid}.json').unlink()
    plan = review_inputs.prepare(tid, source, repo, run)
    subprocess.run(['git', '-C', str(repo), 'add', str(plan)], check=True)
    subprocess.run(['git', '-C', str(repo), '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'seal parser test inputs'], check=True)
    files, _, _ = review_inputs.load(repo, tid, integrity.git_head(repo))
    assert set(files) == {'original-fig-1.png', 'twin-fig-1.png'}
    actual_run = subprocess.run; calls = []; supplied = []
    def fake_run(command, **kwargs):
        if command[0] == 'git': return actual_run(command, **kwargs)
        assert command[0] == 'claude'
        calls.append(command)
        text = encoded_stream(image_events(raw, kwargs['cwd']), case if stage == 'adapter' else 'normal')
        supplied.append(text)
        return SimpleNamespace(returncode=0, stdout=text, stderr='')
    monkeypatch.setattr(review, 'prompt_for', lambda *args: '합성 검수 지시')
    monkeypatch.setattr(review.subprocess, 'run', fake_run)
    bad = case in BAD_LINES
    if stage == 'adapter' and bad:
        with pytest.raises(RuntimeError, match='검수 CLI 실패'):
            review.review_one(tid, source, repo, run)
        assert len(calls) == 1 and not pointer.exists()
        # 실패하더라도 CLI 원문을 재작성/절삭하지 않는다.
        saved = list((run / 'review').glob(f'{tid}-attempt-*/review-events.jsonl'))
        assert len(saved) == 1 and saved[0].read_text() == supplied[0]
        assert collect_row(repo, tmp_path, monkeypatch)['status'] != '통과'
        return
    review.review_one(tid, source, repo, run)
    assert len(calls) == 1 and pointer.exists()
    ptr = json.loads(pointer.read_text()); external = Path(ptr['externalReview']); record = json.loads(external.read_text())
    if stage == 'collector':
        path = Path(record['executionEvidence']['eventsPath'])
        path.write_text(encoded_stream(image_events(raw, path.parent), case))
        record['executionEvidence']['eventsSha256'] = integrity.digest(path.read_bytes())
        write(external, record); ptr['sha256'] = integrity.digest(external.read_bytes()); write(pointer, ptr)
    proof = review_evidence(record, external, bundle=repo)
    assert proof['actualAccessVerified'] is (not bad)
    assert bool(proof['errors']) is bad
    if bad: assert proof['traceErrors']
    row = collect_row(repo, tmp_path, monkeypatch)
    assert (row['status'] == '통과') is (not bad), row['reasons']
    assert row['executionEvidence']['review']['actualAccessVerified'] is (not bad)


def test_solver_parser_failure_is_explicitly_rejected(tmp_path):
    repo = sealed_bundle(tmp_path)
    record = json.loads((repo / 'solve/codex/synthetic-twin.json').read_text())
    path = Path(record['executionEvidence']['eventsPath'])
    path.write_text(path.read_text() + '\n non-JSON diagnostic\n')
    record['eventsSha256'] = integrity.digest(path.read_bytes())
    proof = solver_evidence(record, None)
    assert proof['status'] == 'rejected' and proof['errors']
    assert proof['parseError']

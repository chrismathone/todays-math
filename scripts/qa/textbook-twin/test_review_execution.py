"""R5: 실제 임시 Git + 모형 CLI의 adapter→pointer→collector. 원문/모델 호출 없음."""
import base64
import copy
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

from test_evidence import sealed_bundle, write, stream, claude_events
import collect
import integrity
import review


def image_events(raw, cwd, session='new-review'):
    events = claude_events(raw, review.MODEL, session)
    tools = []
    for i, file in enumerate(sorted(cwd.glob('*fig*.*'))):
        encoded = base64.b64encode(file.read_bytes()).decode()
        tools += [
            {'type': 'assistant', 'session_id': session, 'message': {'id': f'm{i}', 'role': 'assistant', 'model': review.MODEL,
                'content': [{'type': 'tool_use', 'id': f'r{i}', 'name': 'Read', 'input': {'file_path': file.name}}]}},
            {'type': 'user', 'session_id': session, 'message': {'role': 'user', 'content': [{'type': 'tool_result',
                'tool_use_id': f'r{i}', 'content': [{'type': 'image', 'source': {'type': 'base64', 'data': encoded, 'media_type': 'image/png'}}]}]},
             'tool_use_result': {'type': 'image', 'file': {'base64': encoded, 'type': 'image/png', 'originalSize': file.stat().st_size}}},
        ]
    events[1:1] = tools
    return events


def corrupt(events, case):
    request, response = events[1], events[2]
    block = response['message']['content'][0]
    if case == 'missing-result': del events[2]
    elif case == 'error-result': block['is_error'] = True
    elif case == 'wrong-id': block['tool_use_id'] = 'unknown'
    elif case == 'duplicate-result': events.insert(3, copy.deepcopy(response))
    elif case == 'duplicate-request': events.insert(2, copy.deepcopy(request))
    elif case == 'result-before-request': events[1], events[2] = response, request
    elif case == 'foreign-request-and-result': request['session_id'] = response['session_id'] = 'other-session'
    elif case == 'wrong-session': response['session_id'] = 'other-session'
    elif case == 'missing-session': del response['session_id']
    elif case == 'wrong-assistant-session': request['session_id'] = 'other-session'
    elif case == 'wrong-init-session': events[0]['session_id'] = 'other-session'
    elif case == 'wrong-final-session': events[-1]['session_id'] = 'other-session'
    elif case == 'wrong-file-result': block['content'][0]['source']['data'] = base64.b64encode(b'other image').decode()
    elif case == 'wrong-result-metadata': response['tool_use_result']['file']['base64'] = base64.b64encode(b'other image').decode()
    elif case == 'wrong-result-path': response['tool_use_result']['file']['filePath'] = '/outside/other.png'
    elif case == 'empty-result': block['content'] = []
    elif case == 'outside-path': request['message']['content'][0]['input']['file_path'] = '../answer.json'
    elif case == 'unsupported-tool-block': request['message']['content'].append({'type': 'server_tool_use', 'id': 'server', 'name': 'web_search', 'input': {}})
    elif case == 'orphan-result-metadata':
        orphan = copy.deepcopy(response); orphan['message']['content'] = []; events.insert(3, orphan)
    elif case == 'unknown-event': events.insert(3, {'type': 'future_execution', 'session_id': 'new-review'})
    elif case == 'unknown-system-event': events.insert(3, {'type': 'system', 'subtype': 'future_execution', 'session_id': 'new-review'})
    elif case == 'unknown-tool': request['message']['content'][0]['name'] = 'Bash'
    elif case == 'aborted-then-success': events.insert(3, {'type': 'error', 'session_id': 'new-review', 'error': 'request cancelled'})
    elif case == 'failed-then-success': events.insert(3, {**events[-1], 'is_error': True, 'subtype': 'error_during_execution'})
    elif case == 'missing-final': events.pop()
    elif case == 'read-after-final': events[:] = [events[0], *events[3:], request, response]
    elif case == 'omit-twin': events[:] = [e for e in events if not any(b.get('id') == 'r1' or b.get('tool_use_id') == 'r1' for b in e.get('message', {}).get('content', []))]
    elif case == 'no-reads': events[:] = claude_events(events[-1]['result'], review.MODEL, 'new-review')
    else: raise AssertionError(case)


STREAM_FAILURES = ['missing-result', 'error-result', 'wrong-id', 'duplicate-result', 'duplicate-request',
    'result-before-request', 'foreign-request-and-result', 'wrong-session', 'missing-session', 'wrong-assistant-session', 'wrong-init-session',
    'wrong-final-session', 'wrong-file-result', 'wrong-result-metadata', 'wrong-result-path', 'empty-result',
    'outside-path', 'unknown-tool', 'unsupported-tool-block', 'orphan-result-metadata', 'unknown-event', 'unknown-system-event', 'aborted-then-success', 'failed-then-success', 'missing-final', 'read-after-final', 'omit-twin']
POST_FAILURES = ['empty-declaration', 'extra-declaration', 'changed-bytes', 'deleted-file', 'deleted-and-omitted',
    'empty-manifest', 'changed-source-manifest', 'uncommitted-manifest', 'missing-input-seal']


def setup_review(tmp_path):
    original = tmp_path / 'synthetic-original.png'
    original.write_bytes(b'synthetic original image bytes')
    source = {'problemCode': 'synthetic', 'sourceContentSha256': 'a' * 64,
              'figures': [{'file': str(original), 'sha256': integrity.digest(original.read_bytes())}]}
    repo = sealed_bundle(tmp_path, source=source, twin=True)
    pointer = repo / 'reviews/synthetic-twin.json'
    previous = json.loads(Path(json.loads(pointer.read_text())['externalReview']).read_text())
    pointer.unlink()
    return repo, source, previous['raw'], pointer


def collect_row(repo, tmp_path, monkeypatch):
    output = tmp_path / 'new-collect.json'
    monkeypatch.setattr(sys, 'argv', ['collect', str(repo), '--output', str(output)])
    collect.main()
    return json.loads(output.read_text())['rows'][0]


@pytest.mark.parametrize('case', [None, *STREAM_FAILURES])
@pytest.mark.parametrize('stage', ['adapter', 'collector'])
def test_review_stream_full_path(tmp_path, monkeypatch, case, stage):
    repo, source, raw, pointer = setup_review(tmp_path)
    actual_run = subprocess.run
    def fake_run(command, **kwargs):
        if command[0] == 'git': return actual_run(command, **kwargs)
        assert command[0] == 'claude' and 'stream-json' in command and '--verbose' in command
        events = image_events(raw, kwargs['cwd'])
        if stage == 'adapter' and case: corrupt(events, case)
        return SimpleNamespace(returncode=0, stdout='\n'.join(map(json.dumps, events)), stderr='')
    monkeypatch.setattr(review, 'prompt_for', lambda *args: '합성 검수 지시')
    monkeypatch.setattr(review.subprocess, 'run', fake_run)
    if case and stage == 'adapter':
        with pytest.raises(RuntimeError, match='검수 CLI 실패'):
            review.review_one('synthetic-twin', source, repo, tmp_path / 'external/run')
        assert not pointer.exists()
        assert collect_row(repo, tmp_path, monkeypatch)['status'] != '통과'
        return
    review.review_one('synthetic-twin', source, repo, tmp_path / 'external/run')
    if case:
        ptr = json.loads(pointer.read_text()); path = Path(ptr['externalReview']); record = json.loads(path.read_text())
        events_path = Path(record['executionEvidence']['eventsPath'])
        events = [json.loads(line) for line in events_path.read_text().splitlines()]
        corrupt(events, case); stream(events_path, events)
        record['executionEvidence']['eventsSha256'] = integrity.digest(events_path.read_bytes())
        record['exposure']['toolCalls'] = sum(b.get('type') == 'tool_use' for e in events for b in e.get('message', {}).get('content', []))
        write(path, record); ptr['sha256'] = integrity.digest(path.read_bytes()); write(pointer, ptr)
    row = collect_row(repo, tmp_path, monkeypatch)
    assert (row['status'] == '통과') is (case is None), row['reasons']
    proof = row['executionEvidence']['review']
    assert proof['actualAccessVerified'] is (case is None)
    if case is None:
        assert len(proof['accessedPaths']) == 2 and not proof['errors']


@pytest.mark.parametrize('case', POST_FAILURES)
def test_expected_inputs_survive_record_hash_rewriting(tmp_path, monkeypatch, case):
    repo, source, raw, pointer = setup_review(tmp_path)
    actual_run = subprocess.run
    def fake_run(command, **kwargs):
        if command[0] == 'git': return actual_run(command, **kwargs)
        assert command[0] == 'claude'
        return SimpleNamespace(returncode=0, stdout='\n'.join(map(json.dumps, image_events(raw, kwargs['cwd']))), stderr='')
    monkeypatch.setattr(review, 'prompt_for', lambda *args: '합성 검수 지시')
    monkeypatch.setattr(review.subprocess, 'run', fake_run)
    review.review_one('synthetic-twin', source, repo, tmp_path / 'external/run')
    ptr = json.loads(pointer.read_text()); path = Path(ptr['externalReview']); record = json.loads(path.read_text())
    trace = record['executionEvidence']; events_path = Path(trace['eventsPath']); cwd = events_path.parent
    events = [json.loads(line) for line in events_path.read_text().splitlines()]
    if case in ('empty-declaration', 'deleted-and-omitted'):
        trace['inputSha256'] = {}; corrupt(events, 'no-reads'); record['exposure']['toolCalls'] = 0
        if case == 'deleted-and-omitted':
            for p in cwd.glob('*fig*.*'): p.unlink()
    elif case == 'extra-declaration':
        (cwd / 'original-fig-2.png').write_bytes(b'extra')
        trace['inputSha256']['original-fig-2.png'] = integrity.digest(b'extra')
        events = image_events(raw, cwd); record['exposure']['toolCalls'] = 3
    elif case == 'changed-bytes':
        (cwd / 'original-fig-1.png').write_bytes(b'changed')
        trace['inputSha256']['original-fig-1.png'] = integrity.digest(b'changed')
        events = image_events(raw, cwd)
    elif case == 'deleted-file': (cwd / 'original-fig-1.png').unlink()
    else:
        manifest_path = repo / 'review-inputs/synthetic-twin.json'; manifest = json.loads(manifest_path.read_text())
        if case == 'missing-input-seal': manifest_path.unlink()
        elif case == 'empty-manifest': write(manifest_path, {})
        elif case == 'uncommitted-manifest':
            manifest['sourceManifest']['sha256'] = 'b' * 64; write(manifest_path, manifest)
        elif case == 'changed-source-manifest':
            source_path = Path(manifest['sourceManifest']['path']); write(source_path, {**source, 'figures': []})
    stream(events_path, events); trace['eventsSha256'] = integrity.digest(events_path.read_bytes())
    write(path, record); ptr['sha256'] = integrity.digest(path.read_bytes()); write(pointer, ptr)
    row = collect_row(repo, tmp_path, monkeypatch)
    assert row['status'] != '통과', row
    assert not row['executionEvidence']['review'].get('actualAccessVerified', False)


@pytest.mark.parametrize('case', ['normal', 'uncommitted', 'empty-sealed-manifest', 'empty-sealed-source',
    'missing-original', 'missing-twin', 'source-argument-swap'])
def test_new_input_contract_is_sealed_before_any_cli(tmp_path, monkeypatch, case):
    import review_inputs
    repo, source, raw, pointer = setup_review(tmp_path)
    plan = repo / 'review-inputs/synthetic-twin.json'
    plan.unlink()  # 합성 fixture의 계약만 새 준비 API로 대체한다.
    run = tmp_path / 'external/run'
    plan = review_inputs.prepare('synthetic-twin', source, repo, run)
    if case == 'empty-sealed-manifest': write(plan, {})
    if case == 'empty-sealed-source':
        value = json.loads(plan.read_text()); source_path = Path(value['sourceManifest']['path'])
        write(source_path, {**source, 'figures': []})
        value['sourceManifest']['sha256'] = integrity.digest(source_path.read_bytes()); write(plan, value)
    if case != 'uncommitted':
        subprocess.run(['git', '-C', str(repo), 'add', str(plan)], check=True)
        subprocess.run(['git', '-C', str(repo), '-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'seal review input contract'], check=True)
    if case == 'missing-original': Path(source['figures'][0]['file']).unlink()
    if case == 'missing-twin': (repo / 'blind/synthetic-twin/fig-1.png').unlink()
    if case == 'source-argument-swap': source = {**source, 'figures': []}
    actual_run = subprocess.run
    calls = []
    def fake_run(command, **kwargs):
        if command[0] == 'git': return actual_run(command, **kwargs)
        assert command[0] == 'claude'
        calls.append(command)
        return SimpleNamespace(returncode=0, stdout='\n'.join(map(json.dumps, image_events(raw, kwargs['cwd']))), stderr='')
    monkeypatch.setattr(review, 'prompt_for', lambda *args: '합성 검수 지시')
    monkeypatch.setattr(review.subprocess, 'run', fake_run)
    if case == 'normal':
        review.review_one('synthetic-twin', source, repo, run)
        assert len(calls) == 1
        assert collect_row(repo, tmp_path, monkeypatch)['status'] == '통과'
    else:
        with pytest.raises((ValueError, KeyError)): review.review_one('synthetic-twin', source, repo, run)
        assert not calls and not pointer.exists()

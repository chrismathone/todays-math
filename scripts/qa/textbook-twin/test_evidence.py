"""실제 임시 Git 봉인과 CLI 대역만 사용한다. 구독 모델은 호출하지 않는다."""
import json
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import pytest

sys.path.insert(0, str(Path(__file__).parent))
import collect
import integrity
import review
import solve
from execution_evidence import parsed_matches, review_evidence, evidence_specificity
from audit_author_provenance import envelope_evidence


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False))


def stream(path, events):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(json.dumps(e, ensure_ascii=False) for e in events) + '\n')


def codex_events(raw, tail=None):
    return [{'type': 'thread.started', 'thread_id': 'codex'}, {'type': 'turn.started'},
            {'type': 'item.completed', 'item': {'id': 'reply', 'type': 'agent_message', 'text': raw}},
            *([{'type': 'turn.completed'}] if tail is None else tail)]


def claude_events(raw, model, session):
    return [{'type': 'system', 'subtype': 'init', 'session_id': session, 'model': model},
            {'type': 'result', 'subtype': 'success', 'session_id': session, 'modelUsage': {model: {}},
             'is_error': False, 'result': raw}]


def sealed_bundle(tmp_path, mutation=None):
    repo = tmp_path / 'repo'
    repo.mkdir()
    run = tmp_path / 'external' / 'run'
    def git(*args):
        return subprocess.check_output(['git', '-C', str(repo), *args], stderr=subprocess.DEVNULL).decode().strip()
    def commit(message, *paths):
        git('add', *paths)
        git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', message)
        return git('rev-parse', 'HEAD')
    git('init', '-q')
    git('config', 'user.name', 'Synthetic test')
    git('config', 'user.email', 'synthetic@example.invalid')
    tid = 'synthetic-twin'
    author = 'synthetic-author:author-session'
    if mutation == 'author-model': author = solve.MODELS['opus'] + ':author-session'
    if mutation == 'author-session': author = 'synthetic-author:opus'
    candidate = {'answer': '5', 'content': '합성 문제', 'questionType': '단답형', 'choices': [], 'figureArtifacts': [],
                 'route': 'engine', 'authorId': 'middle-engine:synthetic', 'sourceReference': {'problemCode': 'synthetic'},
                 'metadata': {'similarity': {'verdict': 'pass', 'reasons': []}, 'engine': {'proposedBy': author}}}
    student = {'twinExternalId': tid, 'grade': '중2', 'content': candidate['content'], 'questionType': '단답형', 'choices': [], 'figures': []}
    write(repo / 'candidates' / f'{tid}.json', candidate)
    write(repo / 'blind' / tid / 'student.json', student)
    hashes = {'student.json': integrity.digest((repo / 'blind' / tid / 'student.json').read_bytes())}
    frozen = {'candidateSha256': integrity.digest(integrity.canonical(candidate)), 'student': hashes, 'figures': {}}
    write(repo / 'freeze.json', {'candidates': {tid: frozen}})
    write(repo / 'holds.json', [])
    freeze = commit('freeze', 'candidates', 'blind', 'freeze.json', 'holds.json')
    if mutation == 'unrelated-freeze':
        tree = git('rev-parse', 'HEAD^{tree}')
        freeze = subprocess.check_output(['git', '-C', str(repo), 'commit-tree', tree], input=b'unrelated freeze\n').decode().strip()
    solvers = ['codex'] if mutation == 'one-solver' else ['codex', 'opus']
    solve_hashes = {}
    for solver in solvers:
        parsed = {'answer': '5', 'work': '2+3=5', 'issues': []}
        raw = json.dumps({**parsed, 'answer': '999'} if mutation == 'raw-parsed' and solver == 'codex' else parsed)
        cwd = run / solver / tid
        write(cwd / 'student.json', student)
        events = codex_events(raw) if solver == 'codex' else claude_events(raw, solve.MODELS[solver], solver)
        if solver == 'codex' and mutation == 'actual-tool':
            events.insert(2, {'type': 'item.started', 'item': {'id': 'tool', 'type': 'command_execution'}})
        if solver == 'codex' and mutation == 'event-response':
            events = codex_events(json.dumps({**parsed, 'answer': '999'}))
        event_file = cwd / ('events.jsonl' if solver == 'codex' else 'claude-envelope.json')
        stream(event_file, events)
        if solver == 'codex': (cwd / 'last.txt').write_text(raw)
        record = {'twinExternalId': tid, 'solver': solver, 'model': solve.MODELS[solver], 'sessionId': solver,
                  'returncode': 0, 'studentSha256': hashes, 'freezeCommit': freeze, 'parsed': parsed, 'raw': raw,
                  'eventsSha256': integrity.digest(event_file.read_bytes()),
                  'executionEvidence': {'eventsPath': str(event_file)},
                  'exposure': {'received': ['student.json'], 'toolCalls': 0, 'toolPolicyVerified': True,
                               'answerKeyOrSourceAvailableInWorkdir': False}}
        if solver == 'codex' and mutation == 'tool-claim': record['exposure']['toolCalls'] = 7
        if solver == 'codex' and mutation == 'event-hash': record['eventsSha256'] = 'wrong'
        if solver == 'opus':
            if mutation == 'failed-cli': record['returncode'] = 9
            if mutation == 'exposed': record['exposure']['answerKeyOrSourceAvailableInWorkdir'] = True
            if mutation == 'same-session': record['sessionId'] = 'codex'
        path = repo / 'solve' / solver / f'{tid}.json'
        write(path, record)
        solve_hashes[solver] = integrity.digest(path.read_bytes())
    seal = commit('seal', 'solve')
    parsed = {'checks': {k: {'value': True, 'evidence': f'{k} 합성 계산 확인'} for k in review.CHECKS},
              'surfaces': {k: {'status': 'passed', 'basis': f'{k} 합성 표시 확인'} for k in review.SURFACES},
              'engineTypeFit': 'same', 'difficulty': 'same', 'questionTypeSame': True, 'verdict': 'pass',
              'verifiedAnswer': '999' if mutation == 'wrong-review-answer' else '5', 'issues': []}
    raw = json.dumps(parsed, ensure_ascii=False)
    cwd = run / 'review' / tid
    event_file = cwd / 'review-events.jsonl'
    events = claude_events(raw, review.MODEL, 'review')
    if mutation == 'review-tool':
        events.insert(1, {'type': 'assistant', 'message': {'content': [{'type': 'tool_use', 'id': 'r', 'name': 'Read', 'input': {'file_path': '/outside/answer.json'}}]}})
    stream(event_file, events)
    write(cwd / 'review-envelope.json', events[-1])
    record = {'twinExternalId': tid, 'reviewer': review.MODEL, 'sessionId': 'review', 'returncode': 0,
              'candidateSha256': frozen['candidateSha256'], 'studentSha256': hashes, 'solveSha256': solve_hashes,
              'sealCommit': seal, 'exposure': {'sawSolverAnswers': sorted(solvers), 'toolCalls': 0, 'toolPolicyVerified': True},
              'raw': raw, 'parsed': parsed,
              'executionEvidence': {'version': 1, 'eventsPath': str(event_file), 'eventsSha256': integrity.digest(event_file.read_bytes()), 'inputSha256': {}}}
    if mutation == 'missing-reviewer': del record['reviewer']
    if mutation == 'wrong-reviewer': record['reviewer'] = 'unapproved-reviewer'
    if mutation == 'review-raw-parsed': record['raw'] = json.dumps({**parsed, 'verifiedAnswer': '999'})
    if mutation == 'new-review-no-trace': del record['executionEvidence']
    external = cwd / 'review-record.json'
    write(external, record)
    pointer = {'externalReview': str(external), 'sha256': integrity.digest(external.read_bytes()),
               **{k: record.get(k) for k in ('twinExternalId', 'candidateSha256', 'sealCommit', 'reviewer', 'sessionId')}}
    if mutation == 'pointer-reviewer': del pointer['reviewer']
    if mutation == 'pointer-model': pointer['reviewer'] = 'unapproved-reviewer'
    write(repo / 'reviews' / f'{tid}.json', pointer)
    commit('review pointer', 'reviews')
    if mutation == 'nonancestor-head':
        git('checkout', '--orphan', 'unrelated-head')
        git('-c', 'core.hooksPath=/dev/null', 'commit', '-qm', 'unrelated root')
    if mutation == 'changed-candidate': write(repo / 'candidates' / f'{tid}.json', {**candidate, 'content': '다른 문제'})
    return repo


@pytest.mark.parametrize('mutation', [None, 'one-solver', 'failed-cli', 'exposed', 'same-session', 'author-model',
    'author-session', 'wrong-review-answer', 'changed-candidate', 'raw-parsed', 'actual-tool', 'tool-claim',
    'event-response', 'event-hash', 'missing-reviewer', 'wrong-reviewer', 'review-raw-parsed', 'nonancestor-head',
    'unrelated-freeze', 'review-tool', 'new-review-no-trace', 'pointer-reviewer', 'pointer-model'])
def test_real_git_collection_rejects_contradictory_evidence(tmp_path, monkeypatch, mutation):
    repo = sealed_bundle(tmp_path, mutation)
    monkeypatch.setattr(sys, 'argv', ['collect.py', str(repo)])
    collect.main()
    row = json.loads((repo / 'collect.json').read_text())['rows'][0]
    assert (row['status'] == '통과') is (mutation is None), row


@pytest.mark.parametrize(('tail', 'success', 'tool_count'), [
    ([], False, 0),
    ([{'type': 'turn.failed'}], False, 0),
    ([{'type': 'turn.incomplete'}], False, 0),
    ([{'type': 'item.started', 'item': {'id': 'tool', 'type': 'command_execution'}}, {'type': 'turn.failed'}], False, 1),
    ([{'type': 'item.started', 'item': {'id': 'tool', 'type': 'command_execution'}}, {'type': 'turn.completed'}], False, 1),
    ([{'type': 'error', 'message': 'fatal error'}, {'type': 'turn.completed'}], False, 0),
    ([{'type': 'error', 'message': 'Reconnecting... 2/5 (stream disconnected)'}, {'type': 'turn.completed'}], True, 0),
    ([{'type': 'turn.completed'}], True, 0),
])
def test_codex_adapter_requires_completed_turn(tmp_path, monkeypatch, tail, success, tool_count):
    raw = '{"answer":"5","work":"2+3=5","issues":[]}'
    def fake_run(command, **kwargs):
        (tmp_path / 'last.txt').write_text(raw)
        return SimpleNamespace(returncode=0, stdout='\n'.join(map(json.dumps, codex_events(raw, tail))), stderr='')
    monkeypatch.setattr(solve.subprocess, 'run', fake_run)
    result = solve.run_codex(tmp_path, '합성 지시', False)
    assert (result['returncode'] == 0) is success
    assert result.get('toolPolicyVerified', result['toolCalls'] == 0) is success
    assert result['toolCalls'] == tool_count


def test_legacy_review_paths_are_unverified_not_invented(tmp_path):
    raw = '{"verifiedAnswer":"5"}'
    path = tmp_path / 'review-record.json'
    record = {'reviewer': review.MODEL, 'sessionId': 'r', 'raw': raw, 'parsed': {'verifiedAnswer': '5'}}
    write(tmp_path / 'review-envelope.json', claude_events(raw, review.MODEL, 'r')[-1])
    proof = review_evidence(record, path, legacy_allowed=True)
    assert not proof['errors'] and proof['toolTraceStatus'] == 'legacy-unverified-paths'
    assert proof['actualAccessVerified'] is False
    assert review_evidence(record, path)['errors']


def test_format_repair_cannot_substitute_an_answer(tmp_path):
    raw = r'{"answer":"5","work":"\mathrm{x}"}'
    repaired = tmp_path / 'repair.json'
    write(repaired, {'answer': '999', 'work': r'\mathrm{x}'})
    record = {'raw': raw, 'parsed': json.loads(repaired.read_text()), 'formatRepair': {
        'externalRepairedJson': str(repaired), 'originalRawSha256': integrity.digest(raw.encode()),
        'repairedJsonSha256': integrity.digest(repaired.read_bytes())}}
    assert not parsed_matches(record)
    write(repaired, {'answer': '5', 'work': r'\mathrm{x}'})
    record['parsed'] = json.loads(repaired.read_text())
    record['formatRepair']['repairedJsonSha256'] = integrity.digest(repaired.read_bytes())
    assert parsed_matches(record)


def test_generic_evidence_is_flagged_without_claiming_semantics():
    proof = evidence_specificity({'checks': {'a': {'evidence': '근거'}, 'b': {'evidence': '근거'}}})
    assert proof['duplicateEvidenceFields'] == [['checks.a', 'checks.b']]
    assert proof['genericEvidenceFields'] == ['checks.a', 'checks.b']
    assert proof['semanticSpecificityVerified'] is False


def test_actual_model_evidence_is_not_filled_from_inference(tmp_path):
    missing = envelope_evidence(None, None, 'session')
    assert missing['actualModels'] == [] and missing['actualEnvelopeVerified'] is False
    assert missing['recordedModel'] is None and missing['evidenceLevel'] == 'inference-only'
    recorded = envelope_evidence(None, 'claude-opus-5-5', 'session')
    assert recorded['actualEnvelopeVerified'] is False and recorded['evidenceLevel'] == 'record-only'
    path = tmp_path / 'envelope.json'
    write(path, claude_events('{}', 'claude-opus-5-5', 'session')[-1])
    assert envelope_evidence(path, 'claude-opus-5-5', 'session')['actualEnvelopeVerified']
    assert not envelope_evidence(path, 'claude-fable-5-1', 'session')['actualEnvelopeVerified']


@pytest.mark.parametrize('access', ['allowed', 'outside', 'omitted'])
def test_new_reviewer_adapter_retains_actual_paths(tmp_path, monkeypatch, access):
    repo = sealed_bundle(tmp_path)
    tid = 'synthetic-twin'
    # 임시 합성 fixture의 기존 포인터만 제거하여 새 어댑터 경로를 시험한다.
    (repo / 'reviews' / f'{tid}.json').unlink()
    original = tmp_path / 'synthetic-original.png'
    original.write_bytes(b'synthetic image bytes; no image viewer needed')
    monkeypatch.setattr(review, 'prompt_for', lambda *args: '합성 검수 지시')
    actual_run = subprocess.run
    def fake_run(command, **kwargs):
        if command[0] == 'git':
            return actual_run(command, **kwargs)
        assert command[0] == 'claude' and 'stream-json' in command and '--verbose' in command
        raw = '{"verifiedAnswer":"5","verdict":"pass"}'
        events = claude_events(raw, review.MODEL, 'new-review')
        if access != 'omitted':
            name = 'original-fig-1.png' if access == 'allowed' else '../answer.json'
            events.insert(1, {'type': 'assistant', 'message': {'content': [
                {'type': 'tool_use', 'id': 'read', 'name': 'Read', 'input': {'file_path': name}}]}})
        return SimpleNamespace(returncode=0, stdout='\n'.join(map(json.dumps, events)), stderr='')
    monkeypatch.setattr(review.subprocess, 'run', fake_run)
    if access != 'allowed':
        with pytest.raises(RuntimeError, match='검수 CLI 실패'):
            review.review_one(tid, {'figures': [{'file': str(original)}]}, repo, tmp_path / 'new-run')
        assert not (repo / 'reviews' / f'{tid}.json').exists()
    else:
        review.review_one(tid, {'figures': [{'file': str(original)}]}, repo, tmp_path / 'new-run')
        pointer = json.loads((repo / 'reviews' / f'{tid}.json').read_text())
        record = json.loads(Path(pointer['externalReview']).read_text())
        proof = review_evidence(record, Path(pointer['externalReview']))
        assert not proof['errors'] and proof['actualAccessVerified']
        assert proof['accessedPaths'] == [str(tmp_path / 'new-run' / 'review' / tid / 'original-fig-1.png')]

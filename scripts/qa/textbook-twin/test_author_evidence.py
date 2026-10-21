"""저작 봉투의 identity와 raw→proposals 내용 일치를 별도로 검증한다. 합성 자료만 사용."""
import json
import sys
from pathlib import Path

import pytest

import audit_author_provenance as audit
import integrity
from test_evidence import write, claude_events


@pytest.mark.parametrize('case', ['direct', 'repair', 'swap-proposal', 'repair-swap-with-matching-hashes',
    'wrong-raw-hash', 'wrong-repair-hash', 'unsupported-repair', 'missing-repair', 'missing-raw', 'wrong-identity'])
def test_author_audit_keeps_identity_and_proposal_content_separate(tmp_path, monkeypatch, case):
    work = tmp_path / 'external'; bundle = tmp_path / 'bundle'; output = tmp_path / 'audit.json'
    write(bundle / 'collect.json', {'rows': []})
    proposal = [{'problemCode': 'synthetic', 'answer': '5', 'route': 'llm'}]
    text = json.dumps(proposal, ensure_ascii=False)
    repair_case = case in ('repair', 'repair-swap-with-matching-hashes', 'wrong-raw-hash', 'wrong-repair-hash', 'unsupported-repair', 'missing-repair')
    raw = '```json\n' + (text[:-1] + '\n}\n]' if repair_case else text) + '\n```'
    path = work / 'author/synthetic.json'; envelope_path = path.with_suffix('.raw.json')
    write(envelope_path, claude_events(raw, 'synthetic-model', 'author')[-1])
    record = {'model': 'synthetic-model', 'sessionId': 'author', 'proposals': proposal}
    if repair_case:
        fixed = text[:-1] + '\n]'
        fixed_file = path.with_suffix('.format-repaired.txt'); fixed_file.write_text(fixed)
        record['formatRepair'] = {'kind': 'remove-one-surplus-final-closing-brace',
            'rawSha256': integrity.digest(envelope_path.read_bytes()), 'repairedResponseSha256': integrity.digest(fixed_file.read_bytes())}
        if case == 'repair-swap-with-matching-hashes':
            fixed_file.write_text(fixed.replace('"5"', '"999"'))
            record['proposals'] = [{**proposal[0], 'answer': '999'}]
            record['formatRepair']['repairedResponseSha256'] = integrity.digest(fixed_file.read_bytes())
        if case == 'wrong-raw-hash': record['formatRepair']['rawSha256'] = 'b' * 64
        if case == 'wrong-repair-hash': record['formatRepair']['repairedResponseSha256'] = 'b' * 64
        if case == 'unsupported-repair': record['formatRepair']['kind'] = 'rewrite-answer'
        if case == 'missing-repair': fixed_file.unlink()
    if case == 'swap-proposal': record['proposals'] = [{**proposal[0], 'answer': '999'}]
    if case == 'wrong-identity': record['sessionId'] = 'other'
    if case == 'missing-raw': envelope_path.unlink()
    write(path, record)
    monkeypatch.setattr(sys, 'argv', ['audit', str(bundle), str(work), str(output)])
    bad = case not in ('direct', 'repair', 'missing-raw')
    if bad:
        with pytest.raises(SystemExit): audit.main()
    else: audit.main()
    result = json.loads(output.read_text()); entry = result['authors'][0]
    assert bool(result['errors']) is bad
    assert entry['identityVerified'] is (case not in ('missing-raw', 'wrong-identity'))
    assert entry['proposalContentVerified'] is (case in ('direct', 'repair', 'wrong-identity'))
    if case == 'missing-raw':
        assert entry['proposalContentStatus'] == 'missing-envelope'
        assert result['summary']['historicalBodyRecords'] == 1

"""Read-only evidence audit, followed by post-seal reference comparison.

Comparison is intentionally incomplete. Unsupported equivalence is a hold, not
an answer error. Diagnostic extraction never changes strict transport verdicts.
"""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import datetime
from fractions import Fraction
import json
from pathlib import Path
import re
import subprocess

from cohort import (DEFAULT_EXTERNAL, EvidenceError, MODELS, audit_response,
                    decode_json, digest, encoded, git, now, save, verify_file)


def scalar(text):
    t = text.strip().strip('$').strip().replace('−', '-')
    if re.fullmatch(r'[+-]?(?:\d+(?:\.\d+)?|\.\d+)', t): return Fraction(t)
    m = re.fullmatch(r'([+-]?\d+)\s*/\s*([+-]?\d+)', t)
    if m and int(m[2]): return Fraction(int(m[1]), int(m[2]))
    m = re.fullmatch(r'([+-]?)\\(?:d?frac)\{([+-]?\d+)\}\{([+-]?\d+)\}', t)
    if m and int(m[3]): return (-1 if m[1] == '-' else 1)*Fraction(int(m[2]), int(m[3]))
    return None


def normalized(text):
    # Do not concatenate numeric tokens, erase units, reorder values or reinterpret equations.
    return re.sub(r'\s+', ' ', text.strip()).replace('−', '-')


def parts(text):
    marks = list(re.finditer(r'[⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽]|(?<!\S)\([1-9]\)(?=\s)', text))
    if not marks or text[:marks[0].start()].strip(): return None
    mapping = {c: str(i+1) for i, c in enumerate('⑴⑵⑶⑷⑸⑹⑺⑻⑼⑽')}
    return [(mapping.get(m.group(), m.group().strip('()')),
             text[m.end():marks[i+1].start() if i+1 < len(marks) else len(text)].strip())
            for i, m in enumerate(marks)]


def compare_answers(a, b):
    if not isinstance(a, str) or not isinstance(b, str) or not a.strip() or not b.strip():
        return {'verdict': 'hold', 'reason': 'missing_answer'}
    a, b = normalized(a), normalized(b)
    if a == b: return {'verdict': 'match', 'reason': 'exact_normalized_text'}
    av, bv = scalar(a), scalar(b)
    if av is not None and bv is not None:
        return {'verdict': 'match' if av == bv else 'different', 'reason': 'exact_rational'}
    pa, pb = parts(a), parts(b)
    if pa and pb and [x[0] for x in pa] == [x[0] for x in pb]:
        results = [compare_answers(x[1], y[1]) for x, y in zip(pa, pb)]
        verdict = 'different' if any(x['verdict']=='different' for x in results) else (
                  'match' if all(x['verdict']=='match' for x in results) else 'hold')
        return {'verdict': verdict, 'reason': 'ordered_subparts', 'parts': results}
    la, lb = a.split(','), b.split(',')
    if len(la) == len(lb) > 1 and all(scalar(x) is not None for x in la+lb):
        return {'verdict': 'match' if list(map(scalar, la)) == list(map(scalar, lb)) else 'different',
                'reason': 'ordered_rational_list'}
    if re.fullmatch('[①②③④⑤]', a) and re.fullmatch('[①②③④⑤]', b):
        return {'verdict': 'different', 'reason': 'choice_symbol'}
    return {'verdict': 'hold', 'reason': 'equivalence_not_established'}


def diagnostic_candidate(text):
    """Find an unambiguous object for review only; original schema rejection stays."""
    candidates = []
    decoder = json.JSONDecoder()
    for m in re.finditer(r'\{\s*"status"\s*:', text):
        try:
            _, end = decoder.raw_decode(text[m.start():])
            obj = decode_json(text[m.start():m.start()+end])
        except (ValueError, EvidenceError): continue
        if not isinstance(obj, dict) or set(obj) != {'status', 'answer', 'reasoning'}: continue
        if obj['status'] not in ('solved', 'insufficient', 'unreadable'): continue
        if not isinstance(obj['reasoning'], str) or not obj['reasoning'].strip(): continue
        if obj['status'] == 'solved':
            if not isinstance(obj['answer'], str) or not obj['answer'].strip(): continue
        elif obj['answer'] is not None: continue
        candidates.append(obj)
    distinct = {encoded(x) for x in candidates}
    return candidates[0] if len(distinct) == 1 else None


def sealed_bytes(evidence, commit, path):
    return subprocess.run(['git', '-C', str(evidence), 'show', commit+':'+path],
                          capture_output=True, check=True).stdout


def audit(external, *, compare=False, write=True, include_features=False):
    external = Path(external); evidence = external/'private/cohort'
    freeze = decode_json((external/'freeze-receipt.json').read_bytes())['commit']
    manifest = decode_json(verify_file(evidence/'manifest.json', digest(sealed_bytes(evidence, freeze, 'manifest.json'))))
    blind = decode_json((external/'blind-seal.json').read_bytes())['sealCommit'] if compare else None
    if compare:
        if blind == freeze: raise EvidenceError('seal must strictly follow freeze')
        git(evidence, 'merge-base', '--is-ancestor', freeze, blind)
        git(evidence, 'merge-base', '--is-ancestor', blind, 'HEAD')
    call_sets = [(manifest['calls'], freeze)]
    format_path = evidence/'format-manifest.json'
    if format_path.exists():
        correction_freeze = decode_json((external/'format-freeze.json').read_bytes())['commit']
        if compare:
            git(evidence, 'merge-base', '--is-ancestor', freeze, correction_freeze)
            git(evidence, 'merge-base', '--is-ancestor', correction_freeze, blind)
        correction = decode_json(verify_file(format_path, digest(sealed_bytes(evidence, correction_freeze, 'format-manifest.json'))))
        originals = {c['id']:c for c in manifest['calls']}
        for call in correction['calls']:
            original = originals[call['replacesFormatFailure']]
            a = decode_json((evidence/original['requestPath']).read_bytes())
            b = decode_json((evidence/call['requestPath']).read_bytes())
            b['output_config'].pop('format')
            if a != b or original['packets'] != call['packets']:
                raise EvidenceError('correction changed blind input or model settings')
        call_sets.append((correction['calls'], correction_freeze))
    if include_features:
        for path in sorted(evidence.glob('features-*-manifest.json')):
            series = path.name.removesuffix('-manifest.json')
            feature_freeze = decode_json((external/f'{series}-freeze.json').read_bytes())['commit']
            feature = decode_json(verify_file(path, digest(sealed_bytes(evidence, feature_freeze, path.name))))
            call_sets.append((feature['calls'], feature_freeze))
    all_calls = [(c, commit) for calls,commit in call_sets for c in calls]
    errors, attempts, pending, results = [], [], [], {}
    seen_ids = set()
    for call, request_freeze in all_calls:
        body = verify_file(evidence/call['requestPath'], call['requestSha256'])
        if sealed_bytes(evidence, request_freeze, call['requestPath']) != body: raise EvidenceError('request seal mismatch')
        req = decode_json(body)
        starts = sorted((evidence/'attempts'/call['id']).glob('attempt-*/start.json'))
        if not starts: pending.append(call['id']); continue
        chosen = None
        for start in starts:
            folder = start.parent
            receipt = decode_json(start.read_bytes())
            if receipt['requestSha256'] != digest(body): errors.append(call['id']+':request_hash')
            if not (folder/'result.json').exists():
                errors.append(call['id']+':unfinished'); continue
            result = decode_json((folder/'result.json').read_bytes())
            if blind and call['kind'] == 'textbook':
                for p in folder.iterdir():
                    if p.is_file() and sealed_bytes(evidence, blind, str(p.relative_to(evidence))) != p.read_bytes():
                        errors.append(call['id']+':seal_bytes')
            usage = result.get('usage') or {}
            model = result.get('actualModel')
            cost = None
            if model in MODELS and all(type(usage.get(k)) is int for k in ('input_tokens','output_tokens')):
                inp, out = MODELS[model]
                # No caching requested; explicitly include any unexpectedly observed cache usage.
                creation = usage.get('cache_creation', {})
                cost = (usage['input_tokens']*inp+usage['output_tokens']*out+
                        usage.get('cache_read_input_tokens',0)*inp*(.05 if model.endswith('5-5') else .1)+
                        creation.get('ephemeral_5m_input_tokens',0)*inp*1.25+
                        creation.get('ephemeral_1h_input_tokens',0)*inp*2)/1e6
            attempts.append({'id': call['id'], 'ordinal': receipt['ordinal'], 'status': result['status'],
                             'httpStatus': result.get('httpStatus'), 'model': model, 'usage': usage,
                             'costUSD': cost, 'elapsedSeconds': result.get('elapsedSeconds'),
                             'startedAt': receipt['startedAt'], 'endedAt': result.get('endedAt')})
            if result.get('httpStatus') != 200: continue
            raw = verify_file(folder/'response.json', result['responseSha256'])
            parsed = audit_response(raw, req, result.get('requestId'), False)
            if parsed['messageId'] in seen_ids: errors.append(call['id']+':duplicate_message_id')
            seen_ids.add(parsed['messageId'])
            if result['status'] == 'accepted':
                check = audit_response(raw, req, result['requestId'], call['kind'] == 'textbook')
                if check != decode_json((folder/'parsed.json').read_bytes()): errors.append(call['id']+':raw_parsed')
                candidate = check['parsed']
            else:
                # Keep failed schema evidence; do not select an answer from mixed prose/JSON.
                candidate = None
            chosen = {'callId': call['id'], 'attempt': str(folder.relative_to(evidence)),
                      'strictStatus': result['status'], 'candidate': candidate,
                      'candidateSource': 'strict' if result['status']=='accepted' else 'diagnostic_only',
                      'responseSha256': digest(raw), 'actualModel': parsed['actualModel']}
        results[call['id']] = chosen
    ordinals = [x['ordinal'] for x in attempts]
    if len(set(ordinals)) != len(ordinals) or sorted(ordinals) != list(range(1,len(ordinals)+1)):
        errors.append('attempt_ordinals')
    if len(attempts) > 300: errors.append('request_cap')
    events = []
    for attempt in attempts:
        if attempt['endedAt']:
            events += [(datetime.datetime.fromisoformat(attempt['startedAt']), 1),
                       (datetime.datetime.fromisoformat(attempt['endedAt']), -1)]
    active, maximum = 0, 0
    for _, delta in sorted(events):
        active += delta; maximum = max(maximum, active)
    if maximum > 2: errors.append('concurrency_cap')
    if compare and pending: raise EvidenceError('cannot reveal references before all calls attempted')
    preservation = decode_json((evidence/'preservation.json').read_bytes())
    changed = []
    for row in preservation:
        p = Path(row['path'])
        if not p.exists() or p.stat().st_size != row['bytes'] or digest(p.read_bytes()) != row['sha256']:
            changed.append(row['path'])
    if changed: errors.append('preservation_changed')
    summary = {'checkedAt': now(), 'errors': errors, 'preservationFiles': len(preservation),
               'preservationChanged': changed, 'expectedCalls': len(all_calls),
               'attemptCount': len(attempts), 'attemptStates': dict(Counter(x['status'] for x in attempts)),
               'pending': pending, 'rawMessageIdsUnique': len(seen_ids),
               'observedMaxConcurrency': maximum,
               'usageByModel': {}, 'estimatedUSD': sum(x['costUSD'] or 0 for x in attempts),
               'costUnknownAttempts': sum(x['costUSD'] is None for x in attempts),
               'strictContractsNotTruth': True}
    for model in MODELS:
        own = [x for x in attempts if x['model']==model]
        summary['usageByModel'][model] = {'calls': len(own),
              'inputTokens': sum(x['usage'].get('input_tokens',0) for x in own),
              'outputTokens': sum(x['usage'].get('output_tokens',0) for x in own),
              'estimatedUSD': sum(x['costUSD'] or 0 for x in own)}
    if not compare: return summary
    if errors: raise EvidenceError('audit errors before reference reveal')
    # This is the first semantic read of the protected answer vault in this cohort.
    vault_path = Path(manifest['source'])/'answer-vault.jsonl'
    vault = {r['ordinal']:r for r in map(decode_json, vault_path.read_text().splitlines())}
    source_map = {r['ordinal']:r for r in map(decode_json, (Path(manifest['source'])/'mapping.jsonl').read_text().splitlines())}
    exposed = {'openedAt': now(), 'freezeCommit': freeze, 'blindSealCommit': blind,
               'vaultSha256': digest(vault_path.read_bytes()), 'reviewer': 'Codex active dispatched worker',
               'priorExposure': 'student packets and model responses; reference content first read after seal'}
    if write: save(external/'private/reference-reveal.json', exposed)
    selected = dict(results)
    for call, _ in all_calls:
        if call.get('replacesFormatFailure'):
            original_id = call['replacesFormatFailure']
            current = results[call['id']]
            if results[original_id]['strictStatus'] != 'rejected': raise EvidenceError('normal call repeated')
            if current and current['strictStatus'] == 'accepted':
                selected[original_id] = dict(current, originalCallId=original_id, originalStrictStatus='rejected')
    rows = []
    for packet in manifest['packets']:
        pair = [selected[c['id']] for c in manifest['calls'] if packet['id'] in c['packets']]
        if len(pair) != 2: raise EvidenceError('two-model mapping missing')
        refs = vault[packet['ordinal']]; mapping = source_map[packet['ordinal']]
        a, b = [p['candidate'] if p else None for p in pair]
        both = a and b and a['status'] == b['status'] == 'solved'
        agreement = compare_answers(a['answer'],b['answer']) if both else {'verdict':'hold','reason':'solver_unknown_or_missing'}
        holds = []
        if any(p is None or p['strictStatus'] != 'accepted' for p in pair): holds.append('strict_contract_failure')
        if not both: holds.append('solver_unknown_or_missing')
        if agreement['verdict'] != 'match': holds.append('model_answer_'+agreement['verdict'])
        comparisons = {}
        for name in ('dbAnswer','originalAnswer'):
            comparisons[name] = [compare_answers(refs[name], p['candidate']['answer'] if p and p['candidate'] else None) for p in pair]
            if any(x['verdict'] != 'match' for x in comparisons[name]): holds.append(name+'_comparison')
        rows.append({'packet':packet, 'problemCode':mapping['problemCode'], 'externalId':refs['externalId'],
                     'studentContent': decode_json((evidence/f"inputs/{packet['studentSha256']}.json").read_bytes())['content'],
                     'solvers':pair,'agreement':agreement,'references':{k:refs[k] for k in ('dbAnswer','originalAnswer')},
                     'referenceComparisons':comparisons, 'holds':holds})
    summary.update(packetCount=len(rows), uniqueProjections=len(manifest['groups']), targetCount=91,
                   agreement=dict(Counter(r['agreement']['verdict'] for r in rows)),
                   packetsWithHold=sum(bool(r['holds']) for r in rows),
                   holdReasons=dict(Counter(h for r in rows for h in r['holds'])),
                   noAutomaticCorrection=True)
    if write:
        save(external/'private/comparisons.json', rows)
        save(external/'private/attempt-ledger.json', attempts)
        save(external/'textbook-audit-summary.json', summary)
    return summary


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--external', type=Path, default=DEFAULT_EXTERNAL)
    p.add_argument('--compare', action='store_true')
    p.add_argument('--read-only', action='store_true')
    p.add_argument('--include-features', action='store_true')
    a = p.parse_args()
    print(json.dumps(audit(a.external, compare=a.compare, write=not a.read_only,
                           include_features=a.include_features),ensure_ascii=False,indent=2))

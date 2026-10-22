"""Bounded Claude Messages evaluation; no app environment, DB, or CLI sessions.

All source-bearing evidence lives in a separate private local Git repository.
The credential is read only by run(), never written or passed to child processes.
"""
from __future__ import annotations

import argparse
import concurrent.futures
import datetime
import fcntl
import hashlib
import json
import os
from pathlib import Path
import ssl
import stat
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

MODELS = {"claude-sonnet-5-5": (2, 10), "claude-opus-5-5": (4, 20),
          "claude-opus-5": (5, 25)}
ROOT = Path(__file__).resolve().parents[3]
DEFAULT_EXTERNAL = Path('/Users/pss/Desktop/creative/display-survey/consensus/claude-api-evaluation-20261022')
PREPARATION = Path('/Users/pss/Desktop/creative/display-survey/textbook-answer-review-20261021/preparation-v2')
LIMIT = 300
SOLVER_FORMAT = {'type': 'json_schema', 'schema': {
    'type': 'object', 'properties': {
        'status': {'type': 'string', 'enum': ['solved', 'insufficient', 'unreadable']},
        'answer': {'type': ['string', 'null']}, 'reasoning': {'type': 'string'}},
    'required': ['status', 'answer', 'reasoning'], 'additionalProperties': False}}


class EvidenceError(ValueError):
    pass


def now():
    return datetime.datetime.now(datetime.timezone.utc).isoformat()


def digest(value):
    return hashlib.sha256(value).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + '\n').encode()


def decode_json(value):
    def pairs(items):
        out = {}
        for k, v in items:
            if k in out: raise EvidenceError('duplicate JSON key')
            out[k] = v
        return out
    def bad(_): raise EvidenceError('non-JSON number')
    try:
        return json.loads(value, object_pairs_hook=pairs, parse_constant=bad)
    except (ValueError, UnicodeError) as exc:
        raise EvidenceError('invalid JSON') from None


def private_write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    with path.open('xb') as f:
        os.chmod(path, 0o600)
        f.write(data)
        f.flush()
        os.fsync(f.fileno())


def save(path, value):
    private_write(path, encoded(value))


def verify_file(path, sha):
    p = Path(path)
    st = p.lstat()
    if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1 or digest(p.read_bytes()) != sha:
        raise EvidenceError('file bytes or regular-file boundary changed')
    return p.read_bytes()


def git(cwd, *args):
    result = subprocess.run(['git', '-C', str(cwd), *args], capture_output=True, check=True)
    return result.stdout.decode().strip()


def seal(cwd, message):
    git(cwd, 'add', '--all')
    git(cwd, '-c', 'user.name=Local evaluation evidence', '-c', 'user.email=local@invalid',
        '-c', 'core.hooksPath=/dev/null', 'commit', '-m', message)
    return git(cwd, 'rev-parse', 'HEAD')


def check_request(req):
    allowed = {'model', 'max_tokens', 'messages', 'output_config', 'system', 'thinking'}
    if not isinstance(req, dict) or set(req) - allowed: raise EvidenceError('request field allowlist')
    if req.get('model') not in MODELS: raise EvidenceError('model allowlist')
    if type(req.get('max_tokens')) is not int or not 1 <= req['max_tokens'] <= 8192:
        raise EvidenceError('token limit')
    config = req.get('output_config', {})
    if not isinstance(config, dict) or set(config) - {'effort', 'format'} or config.get('effort') not in ('low','medium','high'):
        raise EvidenceError('explicit effort required')
    if 'format' in config and config['format'] != SOLVER_FORMAT:
        raise EvidenceError('structured schema allowlist')
    if req.get('thinking', {'type': 'adaptive'}) != {'type': 'adaptive'}:
        raise EvidenceError('thinking settings')
    messages = req.get('messages')
    if not isinstance(messages, list) or len(messages) != 1 or messages[0].get('role') != 'user':
        raise EvidenceError('single fresh user turn required')
    if set(messages[0]) != {'role', 'content'}: raise EvidenceError('message keys')
    content = messages[0]['content']
    if isinstance(content, str):
        if not content.strip(): raise EvidenceError('empty content')
    elif isinstance(content, list) and content:
        import base64
        for block in content:
            if block.get('type') == 'text' and set(block) == {'type', 'text'}:
                if not isinstance(block['text'], str): raise EvidenceError('text type')
            elif block.get('type') == 'image' and set(block) == {'type', 'source'}:
                source = block['source']
                if set(source) != {'type', 'media_type', 'data'} or source['type'] != 'base64':
                    raise EvidenceError('only embedded image bytes allowed')
                if source['media_type'] not in ('image/png', 'image/jpeg', 'image/webp', 'image/gif'):
                    raise EvidenceError('image type')
                if not base64.b64decode(source['data'], validate=True): raise EvidenceError('empty image')
            else: raise EvidenceError('input block allowlist')
    else: raise EvidenceError('content shape')


def audit_response(raw, req, request_id, textbook):
    check_request(req)
    obj = decode_json(raw)
    if not isinstance(obj, dict) or obj.get('type') != 'message' or obj.get('role') != 'assistant':
        raise EvidenceError('not an assistant message')
    if not request_id or not obj.get('id'): raise EvidenceError('missing request/message identity')
    if obj.get('model') != req['model']: raise EvidenceError('actual model mismatch')
    if obj.get('stop_reason') != 'end_turn': raise EvidenceError('incomplete or refused turn')
    usage = obj.get('usage', {})
    if not all(type(usage.get(k)) is int and usage[k] >= 0 for k in ('input_tokens', 'output_tokens')):
        raise EvidenceError('usage missing')
    blocks = obj.get('content')
    if not isinstance(blocks, list) or not blocks: raise EvidenceError('missing content')
    if any(not isinstance(b, dict) or b.get('type') not in ('text', 'thinking', 'redacted_thinking') for b in blocks):
        raise EvidenceError('tool or unknown content block')
    text = ''.join(b.get('text', '') for b in blocks if b['type'] == 'text')
    if not text.strip(): raise EvidenceError('empty text')
    parsed = decode_json(text) if textbook else None
    if textbook:
        if not isinstance(parsed, dict) or set(parsed) != {'status', 'answer', 'reasoning'}:
            raise EvidenceError('solver schema')
        if parsed['status'] not in ('solved', 'insufficient', 'unreadable'):
            raise EvidenceError('solver status')
        if not isinstance(parsed['reasoning'], str) or not parsed['reasoning'].strip():
            raise EvidenceError('missing reasoning')
        if parsed['status'] == 'solved':
            if not isinstance(parsed['answer'], str) or not parsed['answer'].strip():
                raise EvidenceError('missing answer')
        elif parsed['answer'] is not None: raise EvidenceError('unknown must have null answer')
    return {'actualModel': obj['model'], 'messageId': obj['id'], 'requestId': request_id,
            'stopReason': obj['stop_reason'], 'usage': usage, 'toolBlocks': 0,
            'text': text, 'parsed': parsed}


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def api_send(body, key, *, opener=None):
    # A caller cannot replace the destination; redirects and environment proxies are off.
    if opener is None:
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect(),
                    urllib.request.HTTPSHandler(context=ssl.create_default_context()))
    request = urllib.request.Request('https://api.anthropic.com/v1/messages', data=body,
        headers={'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json'})
    if request.data != body: raise EvidenceError('serialized request body changed')
    # Local evidence metadata only; never sent as an HTTP header.
    transmission = {'evaluation-transmitted-body-sha256': digest(request.data),
                    'evaluation-transmitted-body-bytes': str(len(request.data))}
    try:
        with opener.open(request, timeout=180) as response:
            return response.status, {**dict(response.headers), **transmission}, response.read()
    except urllib.error.HTTPError as exc:
        return exc.code, {**dict(exc.headers), **transmission}, exc.read() if exc.fp else b''


def freeze_packets(external=DEFAULT_EXTERNAL, preparation=PREPARATION):
    sys.path.insert(0, str(ROOT/'scripts/qa/textbook-answer-review'))
    from review_core import verify_packet, prompt_bytes, content_holds
    external, preparation = Path(external), Path(preparation)
    evidence = external/'private/cohort'
    if evidence.exists(): raise EvidenceError('freeze already exists')
    evidence.mkdir(mode=0o700)
    git(evidence, 'init', '--quiet')
    # Includes historical failures and source freezes without changing or exposing their bytes.
    preservation = []
    for p in sorted(preparation.parent.rglob('*')):
        if p.is_file() and '.git' not in p.parts and not p.is_symlink():
            preservation.append({'path': str(p), 'bytes': p.stat().st_size, 'sha256': digest(p.read_bytes())})
    save(evidence/'preservation.json', preservation)
    packets = decode_json((preparation/'packet-manifests.json').read_bytes())
    prompts = {x['packet']: x for x in decode_json((preparation/'prompt-manifests.json').read_bytes())}
    template = (ROOT/'scripts/qa/textbook-answer-review/SOLVER-PROMPT.txt').read_text()
    groups, mapping, held = {}, [], []
    for packet in packets:
        if verify_packet(Path(packet['folder']), packet['manifest'], ROOT):
            raise EvidenceError('prepared packet changed')
        if packet['holds'] or packet['status'] != 'prepared_for_lead_review':
            held.append({'id': packet['id'], 'ordinal': packet['ordinal'], 'holds': packet['holds']})
            continue
        student = (Path(packet['folder'])/'student.json').read_bytes()
        if content_holds(decode_json(student)['content'], original=packet['variant'] == 'original'):
            raise EvidenceError('new content hold')
        prompt = prompt_bytes(template, student)
        pm = prompts[packet['id']]
        if len(prompt) != pm['bytes'] or digest(prompt) != pm['sha256'] or Path(pm['path']).read_bytes() != prompt:
            raise EvidenceError('prepared prompt changed')
        sha = digest(student)
        if sha not in groups:
            groups[sha] = {'id': packet['id'], 'studentSha256': sha, 'promptSha256': digest(prompt), 'packets': []}
            private_write(evidence/f'inputs/{sha}.json', student)
            private_write(evidence/f'prompts/{sha}.txt', prompt)
        groups[sha]['packets'].append(packet['id'])
        mapping.append({'id': packet['id'], 'ordinal': packet['ordinal'], 'variant': packet['variant'],
                        'studentSha256': sha, 'promptSha256': digest(prompt)})
    if len(packets) != 458 or len(mapping) != 114 or len({p['ordinal'] for p in mapping}) != 91:
        raise EvidenceError('cohort denominator changed')
    calls = []
    for sha, group in groups.items():
        for model, effort in [('claude-sonnet-5-5', 'medium'), ('claude-opus-5-5', 'high')]:
            # High-effort Opus has room for adaptive thinking; cap all outputs explicitly.
            req = {'model': model, 'max_tokens': 8192 if effort == 'high' else 4096,
                   'output_config': {'effort': effort},
                   'messages': [{'role': 'user', 'content': (evidence/f'prompts/{sha}.txt').read_text()}]}
            check_request(req)
            ident = group['id'] + ('-sonnet' if 'sonnet' in model else '-opus')
            path = f'requests/{ident}.json'
            save(evidence/path, req)
            calls.append({'id': ident, 'kind': 'textbook', 'requestPath': path,
                          'requestSha256': digest(encoded(req)), 'studentSha256': sha,
                          'packets': group['packets'], 'model': model, 'effort': effort})
    save(evidence/'manifest.json', {'version': 1, 'createdAt': now(), 'baseCommit': git(ROOT, 'rev-parse', 'HEAD'),
         'source': str(preparation), 'packets': mapping, 'groups': list(groups.values()), 'held': held,
         'calls': calls, 'models': MODELS, 'requestLimit': LIMIT, 'maxConcurrency': 2,
         'sameProviderModels': True, 'toolsDeclared': 0, 'priceSource': 'https://platform.claude.com/docs/en/about-claude/pricing'})
    private_write(evidence/'authentication.json', (external/'authentication.json').read_bytes())
    for p in Path(__file__).parent.glob('*.py'):
        private_write(evidence/'frozen-tools'/p.name, p.read_bytes())
    commit = seal(evidence, 'Freeze API cohort student bytes, requests, models and source preservation')
    save(external/'freeze-receipt.json', {'commit': commit, 'packets': 114, 'uniqueProjections': len(groups),
         'plannedTextCalls': len(calls), 'reuseSavings': 228-len(calls), 'evidence': str(evidence)})
    return {'packets': 114, 'unique': len(groups), 'calls': len(calls), 'freezeCommit': commit}


def run(external, *, pilot=False, series=None, first=None):
    evidence = Path(external)/'private/cohort'
    with (evidence/'run.lock').open('a') as lock_file:
        os.chmod(evidence/'run.lock', 0o600)
        fcntl.flock(lock_file, fcntl.LOCK_EX | fcntl.LOCK_NB)
        return _run_locked(external, pilot=pilot, series=series, first=first)


def _run_locked(external, *, pilot=False, series=None, first=None):
    external = Path(external); evidence = external/'private/cohort'
    if series and not all(c.isalnum() or c == '-' for c in series): raise EvidenceError('series name')
    manifest_name = f'{series}-manifest.json' if series else 'manifest.json'
    receipt_name = f'{series}-freeze.json' if series else 'freeze-receipt.json'
    manifest = decode_json((evidence/manifest_name).read_bytes())
    freeze = decode_json((external/receipt_name).read_bytes())['commit']
    # Exact frozen request bytes must still be reachable from the original commit.
    if git(evidence, 'show', freeze+':'+manifest_name).encode()+b'\n' != (evidence/manifest_name).read_bytes():
        raise EvidenceError('manifest differs from freeze')
    credential = external/'private/credential.json'
    if credential.is_symlink() or credential.stat().st_mode & 0o077 or credential.parent.stat().st_mode & 0o077:
        raise EvidenceError('credential permissions')
    key = decode_json(credential.read_bytes())['apiKey']
    if not isinstance(key, str) or not key: raise EvidenceError('credential unavailable')
    stop = threading.Event(); mutex = threading.Lock()
    pilot_ids = {'q004-a', 'q010-a', 'q032-b', 'q047-a'}
    calls = [c for c in manifest['calls'] if not pilot or pilot_ids.intersection(c['packets'])]
    if first is not None: calls = calls[:first]
    def execute(call):
        root = evidence/'attempts'/call['id']
        if root.exists(): return {'id': call['id'], 'status': 'preserved_prior_attempt'}
        if stop.is_set(): return {'id': call['id'], 'status': 'pending_halted'}
        body = verify_file(evidence/call['requestPath'], call['requestSha256'])
        frozen = subprocess.run(['git', '-C', str(evidence), 'show', freeze+':'+call['requestPath']], capture_output=True, check=True).stdout
        if frozen != body: raise EvidenceError('request differs from freeze')
        req = decode_json(body); check_request(req)
        retry_count = 3 if manifest.get('retry429', True) else 1
        for retry in range(retry_count):
            with mutex:
                count = len(list((evidence/'attempts').glob('*/attempt-*/start.json')))
                if count >= LIMIT or stop.is_set():
                    stop.set(); return {'id': call['id'], 'status': 'pending_halted'}
                attempt = root/f'attempt-{retry+1:02}'
                save(attempt/'start.json', {'startedAt': now(), 'requestSha256': digest(body),
                     'requestPath': call['requestPath'], 'ordinal': count+1,
                     'retryOf429': retry > 0, 'endpoint': 'https://api.anthropic.com/v1/messages'})
            start = time.monotonic()
            try:
                status, headers, raw = api_send(body, key)
            except Exception as exc:
                # Never serialize exception text, request objects, headers or credentials.
                result = {'status': 'network_unknown', 'errorClass': type(exc).__name__,
                          'elapsedSeconds': time.monotonic()-start, 'endedAt': now()}
                save(attempt/'result.json', result); stop.set()
                return {'id': call['id'], **result}
            # Provider responses should never reflect auth. Refuse storage if they do.
            if any(token.encode() in raw for token in (key, key[:24], key[-16:]) if len(token) >= 16):
                save(attempt/'result.json', {'status': 'credential_reflection_rejected', 'httpStatus': status})
                stop.set(); return {'id': call['id'], 'status': 'credential_reflection_rejected'}
            private_write(attempt/'response.json', raw)
            headers = {k.lower(): v for k, v in headers.items()}
            result = {'httpStatus': status, 'requestId': headers.get('request-id'),
                      'elapsedSeconds': round(time.monotonic()-start, 3), 'endedAt': now(),
                      'responseSha256': digest(raw), 'status': 'http_error'}
            if headers.get('evaluation-transmitted-body-sha256'):
                result.update(transmittedBodySha256=headers['evaluation-transmitted-body-sha256'],
                              transmittedBodyBytes=int(headers['evaluation-transmitted-body-bytes']))
            if status == 200:
                try:
                    parsed = audit_response(raw, req, result['requestId'], call['kind'] in ('textbook','order-experiment'))
                    save(attempt/'parsed.json', parsed)
                    result.update(status='accepted', actualModel=parsed['actualModel'], usage=parsed['usage'],
                                  stopReason=parsed['stopReason'], toolBlocks=parsed['toolBlocks'])
                except EvidenceError as exc:
                    result.update(status='rejected', reason=str(exc))
                    try:
                        obj = decode_json(raw)
                        result.update(actualModel=obj.get('model'), usage=obj.get('usage'), stopReason=obj.get('stop_reason'))
                    except EvidenceError: pass
            save(attempt/'result.json', result)
            if status in (401, 402, 403): stop.set()
            if status != 429 or retry == retry_count-1:
                return {'id': call['id'], **result}
            delay = min(30, max(2, int(headers.get('retry-after', '5'))))
            time.sleep(delay)
    results = []
    # At most two active calls; do not pre-submit the entire pending cohort.
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        iterator = iter(calls); active = {}
        for _ in range(2):
            call = next(iterator, None)
            if call: active[pool.submit(execute, call)] = call
        while active:
            completed, _ = concurrent.futures.wait(active, return_when=concurrent.futures.FIRST_COMPLETED)
            for task in completed:
                active.pop(task)
                result = task.result(); results.append(result)
                print(json.dumps({k: result[k] for k in ('id', 'status', 'httpStatus', 'elapsedSeconds', 'usage') if k in result}), flush=True)
                if not stop.is_set():
                    call = next(iterator, None)
                    if call: active[pool.submit(execute, call)] = call
    summary = {'finishedAt': now(), 'halted': stop.is_set(), 'visited': len(results),
               'planned': len(calls), 'results': results}
    save(evidence/f'run-{datetime.datetime.now().strftime("%Y%m%dT%H%M%S%f")}.json', summary)
    return {'halted': stop.is_set(), 'visited': len(results), 'planned': len(calls)}


def freeze_format_correction(external):
    external = Path(external); evidence = external/'private/cohort'
    manifest = decode_json((evidence/'manifest.json').read_bytes())
    calls = []
    for call in manifest['calls']:
        results = sorted((evidence/'attempts'/call['id']).glob('attempt-*/result.json'))
        if not results: raise EvidenceError('original cohort incomplete')
        result = decode_json(results[-1].read_bytes())
        if result['status'] == 'accepted': continue
        if result.get('reason') != 'invalid JSON' or result.get('stopReason') != 'end_turn':
            raise EvidenceError('not an eligible format-only failure')
        req = decode_json(verify_file(evidence/call['requestPath'], call['requestSha256']))
        req['output_config']['format'] = SOLVER_FORMAT
        check_request(req)
        updated = dict(call, id=call['id']+'-format', replacesFormatFailure=call['id'])
        updated['requestPath'] = 'requests/'+updated['id']+'.json'
        updated['requestSha256'] = digest(encoded(req))
        save(evidence/updated['requestPath'], req)
        calls.append(updated)
    save(evidence/'format-manifest.json', {'createdAt': now(), 'calls': calls,
         'reason': 'One fresh blind schema-constrained attempt for original JSON-format failures only',
         'sameStudentPrompt': True, 'priorAnswersOrReferencesInRequests': False})
    private_write(evidence/'frozen-format-tools/cohort.py', Path(__file__).read_bytes())
    commit = seal(evidence, 'Preserve original responses and freeze schema-only corrections before reference reveal')
    save(external/'format-freeze.json', {'commit': commit, 'calls': len(calls)})
    return {'formatCalls': len(calls), 'freezeCommit': commit}


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('action', choices=['freeze', 'freeze-format', 'pilot', 'run', 'seal'])
    p.add_argument('--external', type=Path, default=DEFAULT_EXTERNAL)
    p.add_argument('--series')
    p.add_argument('--first', type=int)
    a = p.parse_args()
    if a.action == 'freeze': result = freeze_packets(a.external)
    elif a.action == 'freeze-format': result = freeze_format_correction(a.external)
    elif a.action == 'seal':
        result = {'sealCommit': seal(a.external/'private/cohort', 'Seal independent blind API responses before answer comparison')}
        save(a.external/'blind-seal.json', result)
    else: result = run(a.external, pilot=a.action == 'pilot', series=a.series, first=a.first)
    print(json.dumps(result))


if __name__ == '__main__': main()

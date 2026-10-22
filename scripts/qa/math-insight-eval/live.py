"""Explicit synthetic-only transport runner. No retries, at most two calls at once.

Only this script's inventory/run commands load authorized existing credentials.
Requests contain no authentication material and are Git-frozen before inference.
"""
import argparse
import concurrent.futures
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import urllib.error
import urllib.request

DEFAULT = Path('/Users/pss/Desktop/creative/display-survey/consensus/ontology-pilot-20261022/audit')

def sha(raw): return hashlib.sha256(raw).hexdigest()
def now(): return dt.datetime.now(dt.timezone.utc).isoformat()
def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = json.dumps(value, ensure_ascii=False, indent=2).encode() + b'\n'
    with path.open('xb') as stream: stream.write(raw)
    return sha(raw)
def keys(vendors=('gemini','anthropic')):
    # Values never enter argv, logs, subprocess environments or evidence files.
    result={}
    if 'gemini' in vendors:
        result['gemini'] = os.environ.get('GEMINI_API_KEY','').strip()
        if not result['gemini']:
            text = Path('/Users/pss/Desktop/creative/today_/.env').read_text()
            match = re.search(r'^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*(.+?)\s*$', text, re.M)
            result['gemini'] = match.group(1).strip().strip('\"\'') if match else ''
    if 'anthropic' in vendors:
        credential = Path('/Users/pss/Desktop/creative/display-survey/consensus/claude-api-evaluation-20261022/private/credential.json')
        result['anthropic'] = json.loads(credential.read_bytes())['apiKey']
    if any(not isinstance(key,str) or not key for key in result.values()): raise RuntimeError('credential absent')
    return result
def headers(vendor, key):
    return ({'x-goog-api-key':key} if vendor == 'gemini' else
            {'x-api-key':key, 'anthropic-version':'2023-06-01'})
def request(url, vendor, key, raw=None, timeout=115):
    req = urllib.request.Request(url, data=raw, headers={'Content-Type':'application/json', **headers(vendor,key)})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            result = response.read(4_000_001)
            return response.status, result
    except urllib.error.HTTPError as error:
        return error.code, error.read(4_000_001)
def inventory(root, vendors):
    secrets = keys(vendors)
    for vendor, url in [('gemini','https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000'),
                        ('anthropic','https://api.anthropic.com/v1/models?limit=1000')]:
        if vendor not in vendors: continue
        started=time.monotonic()
        status, raw=request(url,vendor,secrets[vendor])
        if any(key.encode() in raw for key in secrets.values()): raise RuntimeError('credential reflection held')
        save(root/'inventory'/f'{vendor}.json', {'at':now(),'endpoint':url,'httpStatus':status,
             'elapsedMs':round((time.monotonic()-started)*1000),'responseSha256':sha(raw),
             'response':json.loads(raw)})
        result=json.loads(raw)
        names=[m.get('name',m.get('id')) for m in result.get('models',result.get('data',[]))]
        print(json.dumps({'vendor':vendor,'httpStatus':status,'models':names},ensure_ascii=False))
def frozen(root, phase):
    rel=f'{phase}/manifest.json'
    subprocess.run(['git','-C',str(root),'diff','--exit-code','HEAD','--',phase],check=True,capture_output=True)
    subprocess.run(['git','-C',str(root),'ls-files','--error-unmatch',rel],check=True,capture_output=True)
    commit=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD']).decode().strip()
    return commit,json.loads((root/rel).read_bytes())
def run(root,phase,ids=None):
    commit,manifest=frozen(root,phase)
    calls=manifest['calls']
    if ids:
        wanted=set(ids.split(','))
        if not wanted.issubset({call['id'] for call in calls}): raise RuntimeError('unknown selected call')
        calls=[call for call in calls if call['id'] in wanted]
    existing=list(root.glob('attempts/*/start.json'))
    if len(existing)+len(calls)>48: raise RuntimeError('48-call ceiling')
    if len({c['id'] for c in calls}) != len(calls): raise RuntimeError('duplicate ID')
    # Preflight every immutable body before any credential read or network call.
    for call in calls:
        raw=(root/call['requestPath']).read_bytes()
        if sha(raw)!=call['requestSha256']: raise RuntimeError('body digest mismatch')
        if sha((root/call['sourcePath']).read_bytes())!=call['sourceSha256']: raise RuntimeError('source digest mismatch')
        if (root/'attempts'/call['id']).exists(): raise RuntimeError('attempt exists; no retry-to-green')
        if call['vendor'] not in ['gemini','anthropic']: raise RuntimeError('vendor')
        model=call['model']
        expected=(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent'
                  if call['vendor']=='gemini' else 'https://api.anthropic.com/v1/messages')
        if call['endpoint']!=expected or not re.fullmatch(r'[a-zA-Z0-9.\-]+',model): raise RuntimeError('endpoint')
        if call.get('sourceKind')!='synthetic': raise RuntimeError('synthetic source required')
    secrets=keys({call['vendor'] for call in calls})
    def one(call):
        target=root/'attempts'/call['id']; started=time.monotonic()
        save(target/'start.json',{'at':now(),'freezeCommit':commit,'call':call})
        try:
            status,raw=request(call['endpoint'],call['vendor'],secrets[call['vendor']],(root/call['requestPath']).read_bytes(),
                               timeout=call.get('runtimeTimeoutMs',115_000)/1000)
            if any(k.encode() in raw for k in secrets.values()):
                save(target/'result.json',{'status':'credential-reflection-held','httpStatus':status})
                return {'id':call['id'],'status':'credential-reflection-held'}
            if len(raw)>4_000_000: raise RuntimeError('response-too-large')
            (target/'response.raw.json').write_bytes(raw)
            data=json.loads(raw)
            result={'at':now(),'status':'received' if status==200 else 'http-failed','httpStatus':status,
                    'responseSha256':sha(raw),'elapsedMs':round((time.monotonic()-started)*1000),
                    'requestedModel':call['model'],'actualModel':data.get('modelVersion',data.get('model')),
                    'usage':data.get('usageMetadata',data.get('usage')),
                    'finish':data.get('stop_reason') or [c.get('finishReason') for c in data.get('candidates',[])]}
            if call.get('runtimeTimeoutMs') and result['elapsedMs']>call['runtimeTimeoutMs']:
                result['status']='runtime-deadline-held'
        except Exception as error:
            # Exception text can contain headers/URLs: preserve only a safe class.
            result={'at':now(),'status':'transport-failed','errorClass':type(error).__name__,
                    'elapsedMs':round((time.monotonic()-started)*1000)}
        save(target/'result.json',result)
        print(json.dumps({'id':call['id'],**result},ensure_ascii=False),flush=True)
        return result
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool: list(pool.map(one,calls))

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action',choices=['inventory','run'])
    parser.add_argument('--root',type=Path,default=DEFAULT)
    parser.add_argument('--phase')
    parser.add_argument('--vendor', choices=['gemini','anthropic'])
    parser.add_argument('--ids', help='Explicit subset of already-frozen call IDs; no repeat IDs allowed.')
    args=parser.parse_args()
    if args.action=='inventory': inventory(args.root,[args.vendor] if args.vendor else ['gemini','anthropic'])
    else:
        if not args.phase or not re.fullmatch(r'[a-z0-9-]+',args.phase): raise RuntimeError('phase required')
        run(args.root,args.phase,args.ids)

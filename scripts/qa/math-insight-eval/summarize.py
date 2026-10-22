"""Offline provenance/cost accounting; never load credentials or call a model."""
import argparse
import collections
import json
from pathlib import Path
import subprocess
from live import DEFAULT, save, sha, now

def summarize(root):
    rates=json.loads((root/'provider-rates.json').read_bytes())['ratesPerMillionTokens']
    rows=[]
    for start_path in sorted(root.glob('attempts/*/start.json')):
        start=json.loads(start_path.read_bytes());call=start['call'];commit=start['freezeCommit']
        for path_key,hash_key in [('requestPath','requestSha256'),('sourcePath','sourceSha256')]:
            raw=subprocess.check_output(['git','-C',str(root),'show',f'{commit}:{call[path_key]}'])
            if sha(raw)!=call[hash_key]:raise RuntimeError('pre-call Git freeze digest mismatch')
        result_path=start_path.parent/'result.json'
        if not result_path.exists():raise RuntimeError('unfinished paid job')
        result=json.loads(result_path.read_bytes())
        response_path=start_path.parent/'response.raw.json'
        if response_path.exists() and result.get('responseSha256'):
            if sha(response_path.read_bytes())!=result['responseSha256']:raise RuntimeError('response seal mismatch')
        usage=result.get('usage') or {}
        model=result.get('actualModel',call['model'])
        if result['status']=='received' and model!=call['model']:raise RuntimeError('model identity mismatch')
        price=rates.get(model)
        estimate=None
        if price and 'input_tokens' in usage and 'output_tokens' in usage:
            if usage.get('cache_creation_input_tokens') or usage.get('cache_read_input_tokens'):
                raise RuntimeError('cache pricing needs explicit accounting')
            estimate=(usage['input_tokens']*price['input']+usage['output_tokens']*price['output'])/1_000_000
        finish=result.get('finish')
        rows.append({'id':call['id'],'requestedModel':call['model'],'actualModel':model,
            'status':result['status'],'finish':finish,
            'completed':result['status']=='received' and finish=='end_turn',
            'freezeCommit':commit,'sourceSha256':call['sourceSha256'],'requestSha256':call['requestSha256'],
            'responseSha256':result.get('responseSha256'),'elapsedMs':result.get('elapsedMs'),
            'usage':usage,'estimatedUsd':estimate})
    return {'at':now(),'paidAttempts':len(rows),'cap':48,'remainingCap':48-len(rows),
        'statusCounts':dict(collections.Counter(r['status'] for r in rows)),
        'completedEndTurn':sum(r['completed'] for r in rows),'heldOrFailed':sum(not r['completed'] for r in rows),
        'estimatedUsd':sum(r['estimatedUsd'] or 0 for r in rows),
        'unknownCostAttempts':sum(r['estimatedUsd'] is None for r in rows),
        'pricingSource':'https://platform.claude.com/docs/en/about-claude/pricing',
        'costLimit':'estimate of standard global model tokens including thinking, not invoice; failed/truncated calls included',
        'provenanceCheck':'every request and synthetic source matches its pre-call Git commit; every sealed raw response hash checked',
        'rows':rows}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root',type=Path,default=DEFAULT)
    parser.add_argument('--output',required=True)
    args=parser.parse_args();result=summarize(args.root)
    save(args.root/args.output,result)
    print(json.dumps({k:v for k,v in result.items() if k!='rows'}))

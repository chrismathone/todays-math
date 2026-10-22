"""Read-only audit of all frozen phases, including failed/refused study turns.

Never reads credentials or turns a refused/malformed response into an answer.
Run after order-v1-seal.json exists; output contains only provenance and counts.
"""
import argparse
from collections import Counter
import datetime
import json
from pathlib import Path
import statistics

from cohort import (DEFAULT_EXTERNAL, EvidenceError, MODELS, audit_response,
                    decode_json, digest, git, now, verify_file)
from order_experiment import (CONTROLS, DISCREPANCIES, build_arms, interleave,
                              ordered_bytes)
from verify import audit, sealed_bytes


def observed_envelope(raw, req, result, textbook):
    """Validate metadata on every response; retain strict rejection as rejection."""
    obj = decode_json(raw)
    if obj.get('type') != 'message' or obj.get('role') != 'assistant':
        raise EvidenceError('observed envelope identity')
    if not obj.get('id') or not result.get('requestId'):
        raise EvidenceError('observed envelope IDs')
    if obj.get('model') != req['model'] or result.get('actualModel') != obj['model']:
        raise EvidenceError('observed model mismatch')
    usage = obj.get('usage', {})
    if not all(type(usage.get(k)) is int and usage[k] >= 0 for k in ('input_tokens','output_tokens')):
        raise EvidenceError('observed usage')
    if usage != result['usage'] or obj.get('stop_reason') != result.get('stopReason'):
        raise EvidenceError('receipt differs from raw envelope')
    try:
        parsed = audit_response(raw, req, result['requestId'], textbook)
    except EvidenceError as exc:
        if result['status'] != 'rejected' or result.get('reason') != str(exc):
            raise EvidenceError('strict rejection differs') from None
        parsed = None
    else:
        if result['status'] != 'accepted': raise EvidenceError('accepted response relabeled')
    return obj, parsed


def cost(model, usage):
    inp, out = MODELS[model]
    creation = usage.get('cache_creation', {})
    return (usage['input_tokens']*inp + usage['output_tokens']*out +
            usage.get('cache_read_input_tokens',0)*inp*(.05 if model.endswith('5-5') else .1) +
            creation.get('ephemeral_5m_input_tokens',0)*inp*1.25 +
            creation.get('ephemeral_1h_input_tokens',0)*inp*2)/1e6


def summarize(rows):
    return {'calls':len(rows), 'states':dict(Counter(r['status'] for r in rows)),
            'stopReasons':dict(Counter(r['stopReason'] for r in rows)),
            'inputTokens':sum(r['usage']['input_tokens'] for r in rows),
            'outputTokens':sum(r['usage']['output_tokens'] for r in rows),
            'estimatedUSD':round(sum(r['costUSD'] for r in rows), 6),
            'latencySeconds':{'min':min(r['elapsedSeconds'] for r in rows),
                              'median':statistics.median(r['elapsedSeconds'] for r in rows),
                              'max':max(r['elapsedSeconds'] for r in rows)}}


def final_audit(external):
    external=Path(external); evidence=external/'private/cohort'
    baseline=audit(external,write=False,include_features=True)
    if baseline['errors'] or baseline['pending']: raise EvidenceError('original phases changed')
    seal=decode_json((external/'order-v1-seal.json').read_bytes())['commit']
    git(evidence,'merge-base','--is-ancestor',seal,'HEAD')
    original=decode_json((evidence/'manifest.json').read_bytes())
    packets={p['id']:p for p in original['packets']}
    manifests=[('manifest.json','freeze-receipt.json'),('format-manifest.json','format-freeze.json')]
    manifests += [(p.name,p.name.replace('-manifest.json','-freeze.json'))
                  for p in sorted(evidence.glob('features-*-manifest.json'))]
    manifests += [('order-v1-manifest.json','order-v1-freeze.json')]
    ledger=[]; all_starts=set(); all_ids=set(); request_ids=set(); order=[]
    for manifest_name, receipt_name in manifests:
        freeze=decode_json((external/receipt_name).read_bytes())['commit']
        git(evidence,'merge-base','--is-ancestor',freeze,seal)
        manifest=decode_json(verify_file(evidence/manifest_name,digest(sealed_bytes(evidence,freeze,manifest_name))))
        is_order=manifest_name=='order-v1-manifest.json'
        if is_order:
            expected=interleave(DISCREPANCIES+CONTROLS)
            if [(c['packet'],c['arm']) for c in manifest['calls']] != expected:
                raise EvidenceError('study interleaving differs')
            if manifest.get('retry429') is not False or len(manifest['calls'])!=42:
                raise EvidenceError('study cap or retry policy')
        for call in manifest['calls']:
            body=verify_file(evidence/call['requestPath'],call['requestSha256'])
            if body!=sealed_bytes(evidence,freeze,call['requestPath']): raise EvidenceError('request seal')
            req=decode_json(body)
            if is_order:
                packet=packets[call['packet']]
                prompt=verify_file(evidence/f"prompts/{packet['studentSha256']}.txt",packet['promptSha256']).decode()
                if body!=ordered_bytes(build_arms(prompt)[call['arm']]): raise EvidenceError('study treatment bytes')
                if list(req['output_config']['format']['schema']['properties'])!=call['propertyOrder']:
                    raise EvidenceError('study property order')
            starts=sorted((evidence/'attempts'/call['id']).glob('attempt-*/start.json'))
            if not starts or (is_order and len(starts)!=1): raise EvidenceError('missing or repeated study call')
            for start in starts:
                if start in all_starts: raise EvidenceError('duplicate manifest call')
                all_starts.add(start); folder=start.parent
                for p in folder.iterdir():
                    if p.is_file() and p.read_bytes()!=sealed_bytes(evidence,seal,str(p.relative_to(evidence))):
                        raise EvidenceError('raw seal differs')
                receipt=decode_json(start.read_bytes()); result=decode_json((folder/'result.json').read_bytes())
                if receipt['requestSha256']!=digest(body): raise EvidenceError('receipt request hash')
                if result.get('httpStatus')!=200: raise EvidenceError('unhandled transport failure')
                if is_order and (result.get('transmittedBodySha256')!=digest(body) or result.get('transmittedBodyBytes')!=len(body)):
                    raise EvidenceError('transmitted study body differs')
                raw=verify_file(folder/'response.json',result['responseSha256'])
                obj,parsed=observed_envelope(raw,req,result,call['kind'] in ('textbook','order-experiment'))
                if obj['id'] in all_ids or result['requestId'] in request_ids: raise EvidenceError('duplicate response identity')
                all_ids.add(obj['id']); request_ids.add(result['requestId'])
                if parsed and parsed!=decode_json((folder/'parsed.json').read_bytes()): raise EvidenceError('parsed bytes differ')
                if not parsed and (folder/'parsed.json').exists(): raise EvidenceError('rejected response has parsed answer')
                row={'id':call['id'],'ordinal':receipt['ordinal'],'kind':call['kind'],
                     'model':obj['model'],'effort':req['output_config']['effort'],'maxTokens':req['max_tokens'],
                     'status':result['status'],'stopReason':obj['stop_reason'],'usage':obj['usage'],
                     'costUSD':cost(obj['model'],obj['usage']),'elapsedSeconds':result['elapsedSeconds'],
                     'startedAt':receipt['startedAt'],'endedAt':result['endedAt'],
                     'requestSha256':digest(body),'responseSha256':digest(raw),
                     'tools':sum(b.get('type')=='tool_use' for b in obj['content'])}
                if is_order:
                    row.update(arm=call['arm'],packet=call['packet'],selection=call['selection'],
                               outputKeyOrder=list(decode_json(parsed['text'])) if parsed else None)
                    order.append(row)
                ledger.append(row)
    if all_starts!=set(evidence.glob('attempts/*/attempt-*/start.json')): raise EvidenceError('unmanifested attempts')
    if sorted(r['ordinal'] for r in ledger)!=list(range(1,len(ledger)+1)) or len(ledger)>300:
        raise EvidenceError('ordinal or cap')
    events=[]
    for row in ledger:
        events.extend([(datetime.datetime.fromisoformat(row['startedAt']),1),
                       (datetime.datetime.fromisoformat(row['endedAt']),-1)])
    active=maximum=0
    for _,delta in sorted(events): active+=delta; maximum=max(maximum,active)
    if maximum>2 or active: raise EvidenceError('concurrency or unfinished calls')
    phases={kind:summarize([r for r in ledger if r['kind']==kind]) for kind in sorted({r['kind'] for r in ledger})}
    summary={'auditedAt':now(),'rawSeal':seal,'errors':[],'totals':summarize(ledger),
             'phases':phases,'byModel':{m:summarize([r for r in ledger if r['model']==m]) for m in MODELS},
             'orderArms':{arm:summarize([r for r in order if r['arm']==arm]) for arm in 'ABC'},
             'orderAcceptedOutputKeyOrders':dict(Counter(','.join(r['outputKeyOrder']) for r in order if r['outputKeyOrder'])),
             'uniqueRequestIds':len(request_ids),'uniqueMessageIds':len(all_ids),'observedMaxConcurrency':maximum,
             'activeCalls':active,'toolsUsed':sum(r['tools'] for r in ledger),
             'preservedPriorFiles':baseline['preservationFiles'],'preservationChanges':baseline['preservationChanged'],
             'originalBlindSeal':decode_json((external/'blind-seal.json').read_bytes())['sealCommit'],
             'budgetLimit':300,'budgetRemaining':300-len(ledger),'noFurtherCallsPlanned':True}
    return summary,sorted(ledger,key=lambda r:r['ordinal'])


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--external',type=Path,default=DEFAULT_EXTERNAL)
    a=p.parse_args()
    print(json.dumps(final_audit(a.external)[0],ensure_ascii=False,indent=2))

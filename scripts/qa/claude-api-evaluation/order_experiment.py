"""Explicitly authorized post-hoc output-order/effort study, separate from cohort.

42 fresh calls: 12 known discrepancy projections + two controls, three arms.
No previous answers or references enter requests. Original judgments never change.
"""
import argparse
import copy
import json
from pathlib import Path
import random

from cohort import (DEFAULT_EXTERNAL, EvidenceError, SOLVER_FORMAT, check_request,
                    decode_json, digest, encoded, now, private_write, save, seal)

EXPERIMENT = 'order-v1'
SEED = 20261022
DISCREPANCIES = ['q056-a','q059-a','q074-a','q106-a','q152-a','q160-a',
                 'q165-a','q181-a','q193-a','q216-a','q224-a','q224-b']
CONTROLS = ['q011-a','q023-a']


def ordered_bytes(value):
    return (json.dumps(value, ensure_ascii=False, indent=2)+'\n').encode()


def build_arms(prompt):
    old = 'status, answer, reasoning.'
    if prompt.count(old) != 1: raise EvidenceError('original output instruction changed')
    a = {'model':'claude-sonnet-5-5','max_tokens':4096,
         'output_config':{'effort':'medium','format':copy.deepcopy(SOLVER_FORMAT)},
         'messages':[{'role':'user','content':prompt}]}
    # A exactly retains the current canonical serializer's schema property order.
    a = decode_json(encoded(a))
    b = copy.deepcopy(a)
    b['messages'][0]['content'] = prompt.replace(old, 'reasoning, answer, status. 이 순서대로 필드를 작성하십시오.')
    props = b['output_config']['format']['schema']['properties']
    b['output_config']['format']['schema']['properties'] = {k:props[k] for k in ('reasoning','answer','status')}
    c = copy.deepcopy(b); c['output_config']['effort'] = 'high'
    return {'A':a,'B':b,'C':c}


def interleave(cases):
    cases = list(cases); random.Random(SEED).shuffle(cases)
    return [(case, 'ABC'[(i+round_number)%3]) for round_number in range(3) for i,case in enumerate(cases)]


def freeze(external):
    evidence = external/'private/cohort'
    original = decode_json((evidence/'manifest.json').read_bytes())
    existing = len(list(evidence.glob('attempts/*/attempt-*/start.json')))
    if existing+42 > 300: raise EvidenceError('42-call full study does not fit remaining cap')
    packets = {p['id']:p for p in original['packets']}
    ids = DISCREPANCIES+CONTROLS
    if len({packets[i]['studentSha256'] for i in ids}) != 14: raise EvidenceError('expected 14 unique projections')
    requests = {}
    for ident in ids:
        packet = packets[ident]
        prompt = (evidence/f"prompts/{packet['studentSha256']}.txt").read_text()
        if digest(prompt.encode()) != packet['promptSha256']: raise EvidenceError('original prompt changed')
        requests[ident] = build_arms(prompt)
    calls = []
    for index,(ident,arm) in enumerate(interleave(ids)):
        req = requests[ident][arm]; check_request(req)
        body = ordered_bytes(req)
        # The raw serialization is the treatment; no canonical rewrite is allowed.
        expected_order = ['answer','reasoning','status'] if arm=='A' else ['reasoning','answer','status']
        if list(decode_json(body)['output_config']['format']['schema']['properties']) != expected_order:
            raise EvidenceError('serialization erased treatment order')
        call_id = f'{EXPERIMENT}-{ident}-{arm}'
        path = f'requests/{call_id}.json'
        private_write(evidence/path,body)
        calls.append({'id':call_id,'kind':'order-experiment','experiment':EXPERIMENT,'arm':arm,
            'packet':ident,'packets':[ident],'studentSha256':packets[ident]['studentSha256'],
            'requestPath':path,'requestSha256':digest(body),'canonicalLogicalSha256':digest(encoded(req)),
            'propertyOrder':expected_order,'requestOrdinalInStudy':index+1,
            'model':req['model'],'effort':req['output_config']['effort'],
            'selection':'post_hoc_discrepancy' if ident in DISCREPANCIES else 'previously_correct_control'})
    save(evidence/f'{EXPERIMENT}-manifest.json',{'createdAt':now(),'experiment':EXPERIMENT,
         'calls':calls,'retry429':False,'seed':SEED,'existingCallsAtFreeze':existing,
         'totalCallsIfComplete':existing+42,'fixedCalls':42,'postHoc':True,
         'authorizationBrief':'brief-claude-api-order-experiment-20261022.md',
         'originalCohortUnchanged':True,'priorAnswersInRequests':False,
         'limits':'14 selected cases, one run per arm; not a general accuracy or causal estimate'})
    for p in Path(__file__).parent.glob('*.py'):
        private_write(evidence/f'frozen-{EXPERIMENT}-tools'/p.name,p.read_bytes())
    commit = seal(evidence,'Freeze separate post-hoc order/effort study, raw serialization and interleaving')
    save(external/f'{EXPERIMENT}-freeze.json',{'commit':commit,'calls':42})
    return {'calls':42,'projectedTotal':existing+42,'commit':commit}


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--external',type=Path,default=DEFAULT_EXTERNAL)
    a=p.parse_args()
    print(freeze(a.external))

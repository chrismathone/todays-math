"""Freeze helper-produced real-function requests for the same bounded transport."""
import argparse
import base64
from pathlib import Path

from cohort import (DEFAULT_EXTERNAL, EvidenceError, check_request, decode_json,
                    digest, now, private_write, save, seal, verify_file)


def freeze(external, series):
    evidence = external/'private/cohort'
    source = external/'features/private/requests.json'
    manifest = decode_json(source.read_bytes())
    calls = []
    for case in manifest['cases']:
        ident = 'feature-'+case['id']
        # Already completed phases are replayed by the helper, never reissued here.
        if (evidence/'attempts'/ident).exists(): continue
        body = verify_file(case['requestPath'], case['requestSha256'])
        req = decode_json(body); check_request(req)
        actual_images = [digest(base64.b64decode(b['source']['data'],validate=True))
                         for b in req['messages'][0]['content'] if b['type']=='image']
        if actual_images != case['imageSha256']: raise EvidenceError('image byte mapping')
        path = f'requests/{ident}.json'
        private_write(evidence/path, body)
        calls.append({'id':ident,'featureId':case['id'],'kind':'feature','requestPath':path,
                      'requestSha256':digest(body),'model':req['model'],
                      'effort':req['output_config']['effort'],'packets':[],
                      'sourceCase':case})
    if not calls: raise EvidenceError('no new feature phases')
    existing = len(list(evidence.glob('attempts/*/attempt-*/start.json')))
    if existing+len(calls)>300: raise EvidenceError('request cap')
    save(evidence/f'{series}-manifest.json', {'createdAt':now(),'calls':calls,
         'sourceManifestSha256':digest(source.read_bytes()), 'sourceManifest':manifest})
    for p in Path(__file__).parent.glob('*.py'):
        private_write(evidence/f'frozen-{series}-tools'/p.name,p.read_bytes())
    commit = seal(evidence, 'Freeze actual webapp feature phase requests '+series)
    save(external/f'{series}-freeze.json', {'commit':commit,'calls':len(calls)})
    return {'calls':len(calls),'commit':commit,'series':series}


def response_map(external):
    evidence = external/'private/cohort'
    mapping = {}
    for manifest_path in sorted(evidence.glob('features-*-manifest.json')):
        for call in decode_json(manifest_path.read_bytes())['calls']:
            results = sorted((evidence/'attempts'/call['id']).glob('attempt-*/result.json'))
            if not results: continue
            result = decode_json(results[-1].read_bytes())
            if result['status'] != 'accepted': raise EvidenceError('feature transport not accepted')
            mapping[call['featureId']] = str(results[-1].parent/'response.json')
    path = external/'features/private'/f'response-map-{len(mapping):02}.json'
    save(path,mapping)
    return {'path':str(path),'responses':len(mapping)}


if __name__ == '__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('action',choices=['freeze','map'])
    p.add_argument('--external',type=Path,default=DEFAULT_EXTERNAL)
    p.add_argument('--series',default='features-01')
    a=p.parse_args()
    print(freeze(a.external,a.series) if a.action=='freeze' else response_map(a.external))

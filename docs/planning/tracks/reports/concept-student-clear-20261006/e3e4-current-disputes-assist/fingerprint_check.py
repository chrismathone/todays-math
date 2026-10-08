"""Compare actual Root e3e4 fingerprints with compact sorted Python JSON."""
import hashlib
import json
from pathlib import Path

report = Path(__file__).parent
fields = ['bDecision', 'bPrompt', 'bAnswer', 'bRequiredIdeas', 'cDecision',
          'cStudentSentence', 'cSlotAnswers', 'coreAfter']

def fingerprint(row):
    payload = {key: row.get(key, None) for key in fields}
    encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False,
                         separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()

inputs = json.loads((report / 'inputs/current-inputs.json').read_text('utf-8'))
reviews = json.loads((report / 'reviews.json').read_text('utf-8'))['rows']
errors = []
for item in inputs:
    if fingerprint(item['raw']) != item['currentRawFingerprint']:
        errors.append({'id': item['raw']['id'], 'stage': 'current'})
for item in reviews:
    if 'proposedRawRow' in item:
        value = fingerprint(item['proposedRawRow'])
        if value != item['currentCandidateFingerprint'] or value != item['proposedRawRow']['proposalFingerprint']:
            errors.append({'id': item['id'], 'stage': 'candidate'})
result = {'currentCount': len(inputs), 'candidateCount': sum('proposedRawRow' in row for row in reviews),
          'fingerprintErrorCount': len(errors), 'errors': errors,
          'domain': fields, 'encoding': 'UTF-8, ensure_ascii=False, sort_keys=True, separators=(comma, colon)'}
(report / 'inputs/python-fingerprint-validation.json').write_bytes((json.dumps(result, ensure_ascii=False, indent=2) + '\n').encode('utf-8'))
print(json.dumps(result, ensure_ascii=False, indent=2))
if errors:
    raise SystemExit(1)

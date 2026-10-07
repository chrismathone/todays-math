import collections
import hashlib
import json
import sys
import os
from pathlib import Path
sys.path.insert(0, 'D:/tmp/concept-student-clear-20261006')
from e5e6_markup_ctx_a236a872 import normalize

repo = Path('C:/Users/user/orca/workspaces/todays-math/student-clear-e5e6-20261006')
out = repo / 'docs/planning/tracks/reports/concept-student-clear-20261006/e5e6'
def write_artifact(name, content):
    # Readers may inspect a checkpoint during authoring; never expose half JSON.
    target = out / name
    staging = target.with_name(target.name + '.ctx-a236a872.tmp')
    staging.write_text(content, encoding='utf-8')
    os.replace(staging, target)
source_path = Path('D:/tmp/concept-student-clear-20261006/e5e6.json')
source = json.loads(source_path.read_text(encoding='utf-8'))
entries = source['entries']
groups = list(dict.fromkeys(e['section'] for e in entries))

# Planning artifact extraction follows the dollar-aware key-slot rules read in
# src/contracts/conceptBlank.contract.ts; it never writes production data.
def split_sentence(s):
    text, pieces, i = '', [], 0
    while i < len(s):
        if s[i] == '$':
            close = s.find('$', i + 1)
            end = len(s) if close < 0 else close + 1
            text += s[i:end]
            i = end
            continue
        if s[i] == '{':
            j, close = i + 1, -1
            while j < len(s):
                if s[j] == '$':
                    end = s.find('$', j + 1)
                    if end < 0:
                        break
                    j = end + 1
                    continue
                if s[j] == '{':
                    break
                if s[j] == '}':
                    close = j
                    break
                j += 1
            inner = '' if close < 0 else s[i + 1:close].strip()
            if inner:
                if text:
                    pieces.append(('text', text))
                pieces.append(('key', inner))
                text = ''
                i = close + 1
                continue
        text += s[i]
        i += 1
    if text:
        pieces.append(('text', text))
    return pieces

drafts, section_meta = {}, []
for f in sorted((out / 'evidence').glob('section-*-draft.json')):
    number = int(f.name.split('-')[1])
    d = json.loads(f.read_text(encoding='utf-8'))
    expected = [e['id'] for e in entries if e['section'] == groups[number]]
    assert [r['id'] for r in d['rows']] == expected, (f.name, 'IDs/order')
    for row in d['rows']:
        assert row['id'] not in drafts
        drafts[row['id']] = (row, f'evidence/{f.name}')
    metadata_path = f.with_name(f.name.replace('-draft.json', '-meta.json'))
    metadata = json.loads(metadata_path.read_text(encoding='utf-8')) if metadata_path.exists() else {}
    section_meta.append({'sectionIndex': number, 'section': groups[number], 'count': len(d['rows']), 'notes': d.get('sectionNotes', []), 'evidence': f'evidence/{f.name}', 'authorModel': metadata.get('model'), 'authorEffort': metadata.get('effort'), 'metadataEvidence': 'evidence/' + metadata_path.name})

for f in sorted((out / 'evidence').glob('section-*-rubric.json')):
    supplement = json.loads(f.read_text(encoding='utf-8'))
    for extra in supplement['rows']:
        draft, evidence = drafts[extra['id']]
        draft.update(extra)
        draft['rubricEvidence'] = f'evidence/{f.name}'

overrides = {r['id']: r for r in json.loads((out / 'codex-overrides.json').read_text(encoding='utf-8'))['rows']}
assert set(overrides) <= {e['id'] for e in entries}, ('Unmapped override IDs', sorted(set(overrides) - {e['id'] for e in entries}))
notation_path = out / 'notation-corrections.json'
notation = json.loads(notation_path.read_text(encoding='utf-8'))['rows'] if notation_path.exists() else []
rows, pending, issues, markup_changes = [], [], [], []
for index, e in enumerate(entries):
    draft, evidence = drafts.get(e['id'], ({}, None))
    row = dict(draft)
    override = overrides.get(e['id'])
    if override:
        row.update(override)
    if not all(k in row for k in ['bDecision', 'bPrompt', 'bAnswer', 'bGoal', 'bReason', 'cDecision', 'cReason']):
        pending.append(e['id'])
        continue
    row['sourceIndex'] = index
    row['grade'] = 'e5' if e['part'].startswith('e5') else 'e6'
    row['part'] = e['part']
    row['source'] = e
    row['sourceFingerprint'] = hashlib.sha256(json.dumps(e, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
    row['draftEvidence'] = evidence
    if override:
        row['codexOverrideEvidence'] = 'codex-overrides.json'
    def formatted(value, field):
        after, change = normalize(value)
        if change:
            if 'issue' in change:
                issues.append({'id': e['id'], 'field': field, **change})
            else:
                markup_changes.append({'id': e['id'], 'field': field, **change})
        return after
    for field in ['bPrompt', 'bAnswer', 'coreAfter']:
        if isinstance(row.get(field), str):
            row[field] = formatted(row[field], field)
    if row['cDecision'] == 'revise':
        row['cAfter'] = formatted(row.get('cAfter'), 'cAfter')
    if isinstance(row.get('bRequiredIdeas'), list):
        updated = []
        for j, idea in enumerate(row['bRequiredIdeas']):
            if isinstance(idea, str):
                updated.append(formatted(idea, f'bRequiredIdeas[{j}]'))
            elif isinstance(idea, dict) and isinstance(idea.get('anyOf'), list):
                updated.append({**idea, 'anyOf': [formatted(v, f'bRequiredIdeas[{j}].anyOf[{k}]') for k, v in enumerate(idea['anyOf'])]})
            else:
                updated.append(idea)
        row['bRequiredIdeas'] = updated
    if isinstance(row.get('cAcceptedAnswers'), list):
        row['cAcceptedAnswers'] = [{**idea, 'anyOf': [formatted(v, f'cAcceptedAnswers[{j}].anyOf[{k}]') for k, v in enumerate(idea['anyOf'])]} if isinstance(idea, dict) and isinstance(idea.get('anyOf'), list) else idea for j, idea in enumerate(row['cAcceptedAnswers'])]
    for correction in notation:
        if correction['id'] != row['id']:
            continue
        field = correction['field']
        if field == 'cAfter' and row['cDecision'] != 'revise':
            continue
        import re
        path = re.findall(r'[^.\[\]]+', field)
        current = row
        try:
            for part in path[:-1]:
                current = current[int(part)] if part.isdigit() else current[part]
            key = int(path[-1]) if path[-1].isdigit() else path[-1]
            if current[key] == correction['before']:
                current[key] = correction['after']
                row.setdefault('notationCorrectionEvidence', []).append({'field': field, 'evidence': 'notation-corrections.json'})
        except (KeyError, IndexError, TypeError):
            pass  # A later substantive rewrite supersedes the earlier spelling proposal.
    if row['cDecision'] == 'revise':
        pieces = split_sentence(row['cAfter'])
        row['cProposedAnswers'] = [p[1] for p in pieces if p[0] == 'key']
        row['cStudentAfter'] = ''.join('□' if p[0] == 'key' else p[1] for p in pieces)
        if not 1 <= len(row['cProposedAnswers']) <= 4:
            issues.append({'id': e['id'], 'issue': 'cloze_slot_count', 'count': len(row['cProposedAnswers'])})
    elif row['cDecision'] == 'keep':
        row['cAfter'] = e['definition']
        row['cFrozenDefinition'] = e['definition']
        row['cFrozenStudentSentence'] = e['studentC']
        row['cProposedAnswers'] = e['answers']
        row['cStudentAfter'] = e['studentC']
    else:
        row['cProposedAnswers'] = []
        row['cStudentAfter'] = None
    if row['bDecision'] != 'exclude' and not row.get('bRequiredIdeas'):
        issues.append({'id': e['id'], 'issue': 'required_ideas_not_yet_drafted'})
    if row.get('bRequiredIdeas') and any(not isinstance(idea, dict) or not isinstance(idea.get('anyOf'), list) or not idea['anyOf'] or not all(isinstance(s, str) and s.strip() for s in idea['anyOf']) for idea in row['bRequiredIdeas']):
        issues.append({'id': e['id'], 'issue': 'required_idea_groups_need_supplement'})
    if row.get('learningRole') not in ['definition', 'procedure', 'reason', 'application', 'naming']:
        issues.append({'id': e['id'], 'issue': 'learning_role_not_yet_drafted'})
    if row['cDecision'] != 'exclude':
        primary = row['cProposedAnswers']
        if not row.get('cAcceptedAnswers'):
            row['cAcceptedAnswers'] = [{'anyOf': [answer]} for answer in primary]
            row['cAcceptedAnswersProvenance'] = 'Exact primary answers frozen from original source or proposed key slots; no unreviewed synonym invented'
        elif len(row['cAcceptedAnswers']) != len(primary):
            issues.append({'id': e['id'], 'issue': 'cloze_equivalence_slot_count'})
        else:
            for canonical, group in zip(primary, row['cAcceptedAnswers']):
                if isinstance(group, dict) and isinstance(group.get('anyOf'), list):
                    if canonical not in group['anyOf']:
                        group['anyOf'].insert(0, canonical)
                else:
                    issues.append({'id': e['id'], 'issue': 'cloze_equivalence_group_invalid'})
    if row['bDecision'] == 'exclude' or row['cDecision'] == 'exclude':
        if not row.get('exclusionReason'):
            issues.append({'id': e['id'], 'issue': 'exclusion_reason_missing'})
    row['cMarkedSentence'] = row.get('cAfter') if row['cDecision'] != 'exclude' else None
    row['cStudentSentence'] = row['cStudentAfter']
    row['cSlotAnswers'] = [{'key': key, 'equivalents': [v for v in group['anyOf'] if v != key]} for key, group in zip(row['cProposedAnswers'], row.get('cAcceptedAnswers', [])) if isinstance(group, dict) and isinstance(group.get('anyOf'), list)]
    row['bQuestion'] = None if row['bDecision'] == 'exclude' else {'prompt': row['bPrompt'], 'answer': row['bAnswer'], 'requiredIdeas': row.get('bRequiredIdeas')}
    row['clozeQuestion'] = None if row['cDecision'] == 'exclude' else {'sentence': row['cMarkedSentence'], 'acceptedAnswers': [g['anyOf'] for g in row.get('cAcceptedAnswers', []) if isinstance(g, dict) and isinstance(g.get('anyOf'), list)]}
    row['questionExclusions'] = {}
    if row['bDecision'] == 'exclude':
        row['questionExclusions']['term'] = row.get('exclusionReason') or row['bReason']
    if row['cDecision'] == 'exclude':
        row['questionExclusions']['cloze'] = row.get('exclusionReason') or row['cReason']
    proposal_payload = {k: row.get(k) for k in ['id', 'bDecision', 'cDecision', 'bQuestion', 'clozeQuestion', 'coreAfter', 'learningRole', 'questionExclusions', 'requiredDiagramPaths']}
    row['proposalFingerprint'] = hashlib.sha256(json.dumps(proposal_payload, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
    row['questionRevision'] = 'planning-e5e6-20261006-' + row['proposalFingerprint'][:12]
    row['requiresIndependentReview'] = True
    rows.append(row)

audit = {
    'sourceCommit': source['sourceCommit'], 'grades': source['grades'],
    'status': 'source-complete-assisted-draft-awaiting-final-editorial' if not pending and not issues else 'in-progress-planning-draft',
    'sourceFile': str(source_path).replace('\\', '/'),
    'sourceSha256': hashlib.sha256(source_path.read_bytes()).hexdigest(),
    'sourceCount': len(entries), 'directlyReviewedCount': len(entries),
    'reviewedIds': [e['id'] for e in entries],
    'reviewMethod': {'directSourceReading': 'Codex read every term, definition, actual studentC in source order; editorial-notes.md records reread truncations', 'draftAssistance': 'tools-disabled Claude per-section authoring; Opus then coordinator-authorized Sonnet fallback after repeated Opus 529; actual model/effort and raw full inputs/outputs retained per section', 'independentReleaseReview': 'not performed here; coordinator owns it', 'productionEdits': False, 'cAfterRole': 'separate C cloze assessment; coreAfter alone proposes a general explanation change'},
    'proposedCount': len(rows), 'pendingIds': pending,
    'finalEditorialReviewedCount': 0,
    'finalEditorialStatus': 'Not counted from original-source reading, preview reading, isolated authors or structural validation; explicit fingerprint-linked final Codex verdicts are required',
    'counts': {'parts': dict(collections.Counter(e['part'] for e in entries)), 'bDecisions': dict(collections.Counter(r['bDecision'] for r in rows)), 'cDecisions': dict(collections.Counter(r['cDecision'] for r in rows)), 'coreAfter': sum(bool(r.get('coreAfter')) for r in rows), 'exampleNeeded': sum(bool(r.get('exampleNeeded')) for r in rows)},
    'validationIssues': issues, 'sections': section_meta, 'rows': rows,
}
editorial_path = out / 'codex-final-editorial.json'
if editorial_path.exists():
    editorial = json.loads(editorial_path.read_text(encoding='utf-8'))
    verdicts = {r['id']: r for r in editorial['rows']}
    matched, adopted = [], []
    for row in rows:
        verdict = verdicts.get(row['id'])
        if verdict and verdict['proposalFingerprintReviewed'] == row['proposalFingerprint']:
            matched.append(row['id'])
            row['codexFinalEditorial'] = verdict
            if verdict['bVerdict'] == verdict['cVerdict'] == 'adopt':
                adopted.append(row['id'])
    audit['finalEditorialReviewedCount'] = len(matched)
    audit['finalEditorialAdoptedCount'] = len(adopted)
    audit['finalEditorialPendingIds'] = [e['id'] for e in entries if e['id'] not in adopted]
    audit['finalEditorialStatus'] = 'complete-final-editorial-planning-candidate' if len(adopted) == len(entries) and not pending and not issues else 'final-editorial-in-progress'
    if audit['finalEditorialStatus'] == 'complete-final-editorial-planning-candidate':
        audit['status'] = 'complete-planning-candidate-awaiting-coordinator-independent-release-review'
old_partial = out / 'partial-audit.json'
old_partial_evidence = out / 'evidence/partial-audit-last-pre-complete.json'
if old_partial.exists() and not old_partial_evidence.exists():
    old_partial_evidence.write_bytes(old_partial.read_bytes())
# A current canonical input must never become an older successful snapshot
# merely because a later edit has validation issues. Both files carry the
# exact current rows and their explicit pending/issue fields.
target = 'audit.json'
if pending or issues:
    audit['status'] = 'current-draft-incomplete-or-contract-issues'
write_artifact(target, json.dumps(audit, ensure_ascii=False, indent=2) + '\n')
compatibility = {**audit, 'compatibilityAliasOf': 'audit.json', 'aliasPurpose': 'Current-row compatibility copy for older coordinator readers; audit.json is canonical. Earlier partial snapshot is preserved under evidence/partial-audit-last-pre-complete.json.'}
write_artifact('partial-audit.json', json.dumps(compatibility, ensure_ascii=False, indent=2) + '\n')
write_artifact('markup-evidence.json', json.dumps({'sourceCommit': source['sourceCommit'], 'method': 'Only KaTeX display markup; every applied before/after pair passes decoded-meaning equality', 'changes': markup_changes}, ensure_ascii=False, indent=2) + '\n')
coverage = {'sourceCommit': source['sourceCommit'], 'grades': source['grades'], 'allReviewedIds': audit['reviewedIds'], 'sourceCount': len(entries), 'sourceSha256': audit['sourceSha256'], 'proposedCount': len(rows), 'pendingIds': pending, 'sections': [{'index': i, 'section': s, 'sourceIds': [e['id'] for e in entries if e['section'] == s], 'draftComplete': all(e['id'] in drafts for e in entries if e['section'] == s)} for i, s in enumerate(groups)]}
write_artifact('coverage.json', json.dumps(coverage, ensure_ascii=False, indent=2) + '\n')
def cell(v):
    return str(v if v is not None else '').replace('\t', ' ').replace('\r', '').replace('\n', '\\n')
columns = ['sourceIndex', 'id', 'part', 'bDecision', 'bPrompt', 'bAnswer', 'bGoal', 'bReason', 'cDecision', 'cStudentAfter', 'cProposedAnswers', 'cReason', 'coreAfter', 'coreReason', 'exclusionReason', 'sourceFingerprint', 'draftEvidence']
by_id = {r['id']: r for r in rows}
lines = ['\t'.join(columns)]
for index, e in enumerate(entries):
    row = by_id.get(e['id'], {'sourceIndex': index, 'id': e['id'], 'part': e['part'], 'bDecision': 'pending-draft', 'cDecision': 'pending-draft'})
    lines.append('\t'.join(cell(row.get(k)) for k in columns))
write_artifact('coverage-ledger.tsv', '\n'.join(lines) + '\n')
print(json.dumps({'target': target, 'sourceCount': len(entries), 'proposedCount': len(rows), 'pendingCount': len(pending), 'issues': len(issues), 'draftSections': len(section_meta)}, ensure_ascii=False))

"""Read-only local quarantine for ORIGINAL PDFs with no selected HWP/PDF pair.

Only aggregate-receipt.json is Git-safe. Raw parser output and first pages stay
local. Preflight is NOT content pairing, source fidelity, question-count credit,
student authoring approval, curriculum approval, rights approval or a DB writer.
"""
import argparse
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
from unpaired_pdf_scope import eligible_unpaired_job, original_pdf_candidates

ROOT = Path(__file__).resolve().parents[3]
BASE = ROOT / '.qa-artifacts/exam-resume-20261008'
INVENTORY = Path('C:/Users/user/orca/artifacts/outputs/exam-inventory-20261003/extraction-job-manifest-reviewed.json')
N_ROOT = Path('N:/개인/기출')
TEXTLAYER = Path('D:/시험지 한글화/db/textlayer.py')


def load(path):
    return json.loads(Path(path).read_text(encoding='utf-8-sig'))


def ref(path):
    p = Path(path)
    data = p.read_bytes()
    return dict(path=str(p), sha256=hashlib.sha256(data).hexdigest(), bytes=len(data))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--job-ids', nargs='+', required=True)
    parser.add_argument('--level', choices=['middle', 'high'], required=True)
    parser.add_argument('--grade', type=int, choices=[1, 2, 3], required=True)
    parser.add_argument('--out', required=True)
    args = parser.parse_args()
    if not 1 <= len(args.job_ids) <= 3 or len(set(args.job_ids)) != len(args.job_ids):
        parser.error('Supply one to three unique explicit IDs')
    output = (BASE / args.out).resolve()
    if output.parent != BASE.resolve() or not output.name.startswith('unpaired-pdf-preflight-') or output.exists():
        parser.error('A new immediate unpaired-pdf-preflight-* directory is required')
    inventory_ref = ref(INVENTORY)
    jobs = {j['examId']: j for j in load(INVENTORY)['jobs']}
    seen = set()
    prior = sorted(BASE.glob('unpaired-pdf-preflight-*/aggregate-receipt.json'))
    prior_refs = [ref(p) for p in prior]
    for p in prior:
        seen.update(e['examId'] for e in load(p)['entries'])
    plan = []
    for job_id in args.job_ids:
        job = jobs.get(job_id)
        if not eligible_unpaired_job(job, seen, level=args.level, grade=args.grade):
            parser.error('Protected, registered, prior, paired, unknown or out-of-scope ID: ' + job_id)
        files = original_pdf_candidates(job)
        if not files:
            parser.error('No metadata-consistent answer-unlabelled original PDF reference: ' + job_id)
        plan.append((job, files))
    # Imports after metadata validation; no command accepts an arbitrary reader path.
    spec = importlib.util.spec_from_file_location('unpaired_pdf_readonly_textlayer', TEXTLAYER)
    pdf = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(pdf)
    import fitz
    tools = [ref(Path(__file__)), ref(Path(__file__).with_name('unpaired_pdf_scope.py')),
             ref(Path(__file__).with_name('source_inventory_scope_v2.py')),
             ref(TEXTLAYER), ref(TEXTLAYER.with_name('pua_table.json'))]
    output.mkdir()

    def write(path, value):
        target = Path(path).resolve()
        if not target.is_relative_to(output):
            raise ValueError('Output escapes local quarantine')
        target.parent.mkdir(parents=True, exist_ok=True)
        with target.open('x', encoding='utf-8', newline='\n') as f:
            json.dump(value, f, ensure_ascii=False, indent=2)
            f.write('\n')

    entries, sources, local_refs = [], [], []
    for job, files in plan:
        entry = {k: job[k] for k in ['examId', 'school', 'level', 'year', 'grade', 'semester', 'round']}
        entry.update(selectedPairRemainsNone=True, references=[], sourceIdentityApproved=False,
                     curriculumApproved=False, rightsApproved=False, contentPairApproved=False,
                     authorDistributionAllowed=False, actualNewQuestionObservations=0)
        for i, file in enumerate(files, 1):
            observation = dict(index=i, status='individual-reference-hold')
            try:
                path = Path(file['path']).resolve(strict=True)
                if not path.is_relative_to(N_ROOT.resolve(strict=True)):
                    raise ValueError('Resolved reference escapes N original root')
                src = ref(path)
                sources.append(src)
                observation['input'] = src
                folder = output / job['examId'] / str(i)
                folder.mkdir(parents=True)
                with fitz.open(path) as doc:
                    if doc.needs_pass or not 1 <= len(doc) <= 80:
                        raise ValueError('Encrypted, empty or over-budget PDF')
                    pages = []
                    for n, page in enumerate(doc):
                        text = page.get_text()
                        pages.append(dict(page=n + 1, width=page.rect.width, height=page.rect.height,
                                          nativeTextCharacters=len(text), rawTextSha256=hashlib.sha256(text.encode()).hexdigest(),
                                          rawPuaCharacters=sum(pdf.ispua(c) for c in text)))
                    first = folder / 'original-first-page.local.png'
                    doc[0].get_pixmap(matrix=fitz.Matrix(1.2, 1.2)).save(first)
                    local_refs.append(ref(first))
                    observation.update(pages=pages, firstPage=ref(first), firstPageActuallyViewed=False)
                # Existing parser has known glyph/boundary assumptions. Every output,
                # including a mistaken answer cut, is local and never a solve pack.
                try:
                    raw = pdf.extract(path, with_answers=False)
                    target = folder / 'parser-question-output.local.json'
                    write(target, dict(quarantined=True, authorDistributionAllowed=False,
                                       originalAnswerParsingRequested=False, parserOutput=raw))
                    local_refs.append(ref(target))
                    nums = [q.get('number') for q in raw.get('questions', [])]
                    observation.update(status='parser-output-quarantined-unverified',
                                       parserQuestionCountUnverified=len(nums), parserQuestionNumbers=nums,
                                       localParser=ref(target), questionBoundaryApproved=False)
                except Exception as error:
                    observation.update(parserErrorType=type(error).__name__, parserError=str(error),
                                       status='visual-reference-held-parser-unavailable')
                observation['sourceBytesUnchanged'] = src['sha256'] == ref(path)['sha256']
                if not observation['sourceBytesUnchanged']:
                    raise RuntimeError('Original bytes changed during read')
            except Exception as error:
                observation.update(errorType=type(error).__name__, error=str(error),
                                   doesNotBlockOtherReferences=True)
            entry['references'].append(observation)
        entry['status'] = 'preflight-recorded-not-source-approved'
        entries.append(entry)
        print(json.dumps(dict(examId=job['examId'], references=len(entry['references']),
                              parserOutputs=sum(r['status']=='parser-output-quarantined-unverified' for r in entry['references']),
                              sourceApprovals=0, questionObservationCredit=0)), flush=True)
    preservation = [dict(path=r['path'], beforeSha256=r['sha256'], afterSha256=ref(r['path'])['sha256'])
                    for r in [inventory_ref] + tools + prior_refs + sources]
    if not all(r['beforeSha256'] == r['afterSha256'] for r in preservation):
        raise RuntimeError('Immutable source/tool/prior evidence changed')
    write(output / 'aggregate-receipt.json', dict(
        kind='unselected-pair-original-pdf-preflight/v1', utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        inventory=inventory_ref, tools=tools, explicitJobIds=args.job_ids,
        scopeAsProvided=dict(level=args.level, grade=args.grade, minimumYear=2025),
        entries=entries, localCopyrightedOutputs=local_refs, preservation=preservation,
        sourcePairNotManufactured=True, preserved=True, actualNewQuestionObservations=0,
        gradeApprovals=0, rightsApprovals=0, twins=0, dbWrites=0, loadable=0,
        limitations=['filename/metadata selection is not source identity or absence-of-answers proof',
                     'PDF parser output is not reviewed text, equations, boundary or figure fidelity',
                     'separate HWP may exist; selectedPair stays None until content correspondence is reviewed']
    ))


if __name__ == '__main__':
    sys.stdout.reconfigure(encoding='utf-8')
    main()

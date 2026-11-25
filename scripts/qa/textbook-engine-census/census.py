#!/usr/bin/env python3
"""Census every exported row using inspectable rules; retain no textbook prose.

Why: registry titles and a false has_figure flag do not establish type coverage.
This is an offline planning census, never an import, approval or lock writer.
"""
import argparse
from collections import Counter, defaultdict
import hashlib
import importlib
import json
from pathlib import Path
import re
import subprocess

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
DEFAULT_OUT = ROOT / 'docs/planning/tracks/reports/textbook-engine-census'
SAMPLE_SEED = '20261125-census-audit-v1'
REQUIRED = {'id', 'problem_code', 'grade', 'chapter', 'section', 'difficulty', 'problem_type',
            'question_type', 'content', 'answer', 'solution', 'has_figure', 'direct_use_allowed', 'source_title'}
HOLD_NAMES = {
    'missing-figure': '그림·표 조건 미확인',
    'figure-not-reviewed': '실제 그림 연결 확인·직접 판독 미실시',
    'visual-review-hold': '그림 직접 판독 후 보류',
    'open-response': '설명·서술·구성 응답',
    'missing-math': '식·조건 누락 의심',
    'missing-answer': '정답 근거 누락',
    'concept-review': '개념 명제·선택의 별도 판단',
    'context-review': '상황 모형의 별도 판단',
    'unmatched-structure': '기존 대응·새 생성 구조 미확인',
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encode(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2) + '\n').encode('utf-8')


def validate_rows(rows):
    ids, codes = set(), set()
    for n, row in enumerate(rows, 1):
        if REQUIRED - row.keys():
            raise ValueError(f'row {n}: missing columns {sorted(REQUIRED - row.keys())}')
        if row['id'] in ids or row['problem_code'] in codes:
            raise ValueError(f'row {n}: duplicate id/code')
        ids.add(row['id'])
        codes.add(row['problem_code'])
        if row['grade'] not in ('중1', '중2'):
            raise ValueError(f'row {n}: unsupported grade')
        if any(type(row[k]) is not bool for k in ('has_figure', 'direct_use_allowed')):
            raise ValueError(f'row {n}: boolean field is not boolean')
        if any(not isinstance(row[k], str) for k in REQUIRED - {'has_figure', 'direct_use_allowed', 'solution'}):
            raise ValueError(f'row {n}: string column has another type')
        if row['solution'] is not None and not isinstance(row['solution'], str):
            raise ValueError(f'row {n}: solution must be text or null')
        if any(not row[k].strip() for k in ('id', 'problem_code', 'section', 'content')):
            raise ValueError(f'row {n}: empty identity/content')


def read_input(path, manifest):
    data = path.read_bytes()
    if sha(data) != manifest['sha256'] or len(data) != manifest['bytes']:
        raise ValueError('Input bytes/hash differ from the reviewed snapshot; do not silently reuse judgments.')
    lines = data.splitlines()
    if any(not line.strip() for line in lines):
        raise ValueError('Blank input row')
    rows = [json.loads(line) for line in lines]
    validate_rows(rows)
    if len(rows) != manifest['rows'] or dict(Counter(r['grade'] for r in rows)) != manifest['grades']:
        raise ValueError('Input population differs from manifest')
    return rows, [sha(line) for line in lines]


def figure_evidence(row):
    return dict(figure_flag=row['has_figure'], figure_marker=bool(re.search(r'\[그림[^\]]*\]', row['content'])),
                figure_reference='그림' in row['content'])


def global_hold(row):
    if row['has_figure'] or '그림' in row['content']:
        return 'missing-figure'
    if not row['answer'].strip():
        return 'missing-answer'
    if (row['question_type'] == '서술형' or
            re.search(r'증명|설명(?:하|해|하여|을\s*(?:쓰|적))|이유(?:를|가)|까닭|토론|서술|작도하|그리[시어]|말하시오', row['content'])):
        return 'open-response'
    if re.search(r'다음.*(?:계산|풀[어고이]|구하)', row['content']) and not re.search(r'[0-9$]', row['content']):
        return 'missing-math'
    return None


def validate_families(families, engine):
    entries = {e['key']:e for e in engine['entries']}
    sections = {(e['grade'], e['section']) for e in engine['entries']}
    for fid, family in families.items():
        if (family['grade'], family['section']) not in sections:
            raise ValueError(f'{fid}: section outside registry')
        if family['category'] not in ('A', 'B') or family['difficulty'] not in ('easy', 'mid', 'hard'):
            raise ValueError(f'{fid}: invalid category/difficulty')
        for field in ('name', 'variables', 'answer_method', 'rationale'):
            if not family[field].strip():
                raise ValueError(f'{fid}: missing {field}')
        if family['figure'] not in ('none', 'required'):
            raise ValueError(f'{fid}: invalid figure burden')
        if (family['category'] == 'A') != bool(family['engine_keys']):
            raise ValueError(f'{fid}: A needs keys and B must not assert coverage')
        for key in family['engine_keys']:
            e = entries.get(key)
            if not e or (e['grade'],e['section']) != (family['grade'],family['section']):
                raise ValueError(f'{fid}: wrong/missing engine key {key}')
            if any('error' in s for s in e['samples']):
                raise ValueError(f'{fid}: engine sample generation failed')


def validate_conservation(rows, assigned):
    if Counter(r['id'] for r in rows) != Counter(r['id'] for r in assigned):
        raise ValueError('Lost, duplicated or invented population members')


def draw_sample(rows, quotas=None):
    quotas = quotas or {'A':80, 'B':40, 'C':20}
    chosen = []
    for category, n in quotas.items():
        population = [r for r in rows if r['category'] == category]
        population.sort(key=lambda r: sha((SAMPLE_SEED + ':' + r['id']).encode('utf-8')))
        chosen.extend(population[:n])
    return chosen


def intent(row):
    """Routing label only, never proof that a family can be generated."""
    text = row['content']
    for key, pattern in [('proof', r'증명|설명|이유|까닭'), ('construction',r'작도|그리|색칠'),
                         ('selection', r'옳[은지]|옳지|고르|모두 찾'), ('area-volume', r'넓이|부피'),
                         ('angle', r'각의 크기|각도|각.*크기'), ('length-ratio', r'길이|닮음비'),
                         ('count-probability',r'확률|경우의 수|몇 개|개수'),
                         ('expression-value',r'계산|값|방정식|부등식|구하')]:
        if re.search(pattern, text):
            return key
    return 'other'


def classify_all(rows, row_hashes, engine, inventory=None, visual=None, plan=None, gaps=None):
    inventory, visual = inventory or [], visual or {'families':{}, 'rows':[]}
    mapped = {r['id']:r for r in inventory}
    viewed = {r['id']:r for r in visual['rows']}
    cohorts = {c['id']:c for c in (plan or {'cohorts':[]})['cohorts']}
    term_only = {r['id'] for r in gaps or [] if r['reason']=='term-only-reference'}
    modules = {g:importlib.import_module('rules_m' + g[-1]) for g in ('중1','중2')}
    families = {}
    for module in modules.values():
        for fid, f in module.FAMILIES.items():
            if fid in families:
                raise ValueError(f'duplicate family {fid}')
            families[fid] = f
    if set(families) & set(visual['families']):
        raise ValueError('Visual family collides with a rule family')
    families.update(visual['families'])
    validate_families(families, engine)
    units = list(dict.fromkeys((r['grade'],r['section']) for r in rows))
    unit_ids = {u:f'm{u[0][-1]}-{i+1:03}' for i,u in enumerate(units)}
    engine_sections = {(e['grade'], e['section']) for e in engine['entries']}
    if set(units) - engine_sections:
        raise ValueError('Source units do not map exactly to the live engine')
    out, group_meta = [], {}
    for i, (r, digest) in enumerate(zip(rows, row_hashes), 1):
        reason = global_hold(r)
        review = viewed.get(r['id'])
        if review:
            if reason != 'missing-figure':
                raise ValueError('Visual reassessment must start from a held figure row')
            fid = review['family'] if review['category']=='B' else None
            reason = 'visual-review-hold'
        else:
            fid = None if reason else modules[r['grade']].classify(r)
            if r['id'] in mapped:
                fid = None
                reason = 'figure-not-reviewed'
            elif r['id'] in term_only:
                reason = 'concept-review'
        if fid is not None:
            f = families[fid]
            if (f['grade'], f['section']) != (r['grade'], r['section']):
                raise ValueError(f'{r["problem_code"]}: family unit mismatch')
            category, keys = f['category'], f['engine_keys']
            reason = ('visual-deterministic-extension' if review else
                      'same-generator-structure' if category == 'A' else 'deterministic-extension')
            group_meta[fid] = f
        else:
            reason = reason or ('concept-review' if r['problem_type'] == '개념' else
                                'context-review' if r['problem_type'] == '활용' else 'unmatched-structure')
            category, keys = 'C', []
            fid = 'c-' + unit_ids[(r['grade'],r['section'])] + '-' + reason + '-' + intent(r)
            group_meta[fid] = dict(name=HOLD_NAMES[reason], grade=r['grade'], section=r['section'], category='C',
                                   engine_keys=[], reason=reason, intent=intent(r), provisional=True)
        out.append(dict(id=r['id'], problem_code=r['problem_code'], source_line=i, record_sha256=digest,
                        grade=r['grade'], section=r['section'], group=fid, category=category, engine_keys=keys,
                        reason=reason, locked=not r['direct_use_allowed'], **figure_evidence(r),
                        figure_available=r['id'] in mapped, figure_file_count=len(mapped.get(r['id'],{}).get('files',[])),
                        figure_reviewed=bool(review), figure_review_cohort=review['cohort'] if review else None,
                        classification_basis='visual' if review else 'rule'))
    validate_conservation(rows, out)
    groups = []
    members = defaultdict(list)
    for r in out:
        members[r['group']].append(r)
    for fid, f in group_meta.items():
        group = members[fid]
        reviewed_group = [r for r in group if r['figure_reviewed']]
        cohort_ids = {r['figure_review_cohort'] for r in reviewed_group}
        groups.append(dict(id=fid, **f, count=len(group),
                           figure_count=sum(r['figure_flag'] or r['figure_reference'] for r in group),
                           locked_count=sum(r['locked'] for r in group),
                           classification_basis='visual' if reviewed_group else 'rule',
                           visual_reviewed_rows=len(reviewed_group),
                           visual_viewed_files=sum(r['figure_file_count'] for r in reviewed_group),
                           visual_methods=sorted({cohorts[c]['method'] for c in cohort_ids}),
                           visual_population=sum(cohorts[c]['population'] for c in cohort_ids),
                           example_codes=[r['problem_code'] for r in sorted(group, key=lambda r: r['problem_code'])[:3]]))
    groups.sort(key=lambda g:(g['category'], -g['count'], g['id']))
    unit_rows = []
    for grade, section in units:
        unit = [r for r in out if (r['grade'],r['section']) == (grade,section)]
        counts = Counter(r['category'] for r in unit)
        unit_rows.append(dict(grade=grade, section=section, total=len(unit), **{k:counts[k] for k in 'ABC'},
                              figure_flag=sum(r['figure_flag'] for r in unit),
                              figure_marker=sum(r['figure_marker'] for r in unit),
                              figure_evidence=sum(r['figure_flag'] or r['figure_reference'] for r in unit),
                              mapped_figure_rows=sum(r['figure_available'] for r in unit),
                              figure_files=sum(r['figure_file_count'] for r in unit),
                              visual_reviewed_rows=sum(r['figure_reviewed'] for r in unit),
                              locked=sum(r['locked'] for r in unit)))
    return out, groups, unit_rows


def summarize_visual(rows, inventory, plan, visual, manifest):
    baseline_data = (DEFAULT_OUT/'figure-baseline.jsonl').read_bytes()
    baseline = [json.loads(line) for line in baseline_data.splitlines()]
    if (sha(baseline_data) != manifest['baseline_sha256'] or
            dict(Counter(r['category'] for r in baseline)) != manifest['baseline_categories'] or
            any(set(r) != {'id','category','group'} for r in baseline)):
        raise ValueError('Pre-figure census baseline was replaced')
    validate_conservation(rows, baseline)
    before = {r['id']:r for r in baseline}
    if any(before[r['id']]['category'] != 'C' for r in inventory):
        raise ValueError('Figure reassessment population was not previously C')
    by_id = {r['id']:r for r in visual['rows']}
    cohorts = []
    for cohort in plan['cohorts']:
        rr = [by_id[rid] for rid in cohort['sample_ids']]
        cohorts.append(dict(**{k:v for k,v in cohort.items() if k not in ('member_ids','sample_ids')},
                            viewed_rows=len(rr),viewed_files=sum(len(r['viewed_urls']) for r in rr),
                            B=sum(r['category']=='B' for r in rr),C=sum(r['category']=='C' for r in rr)))
    return dict(cohorts=cohorts, reviewed_rows=len(visual['rows']),
                viewed_files=sum(len(r['viewed_urls']) for r in visual['rows']),
                promoted_rows=sum(r['category']=='B' for r in visual['rows']),
                held_rows=sum(r['category']=='C' for r in visual['rows']),
                unreviewed_rows=len(inventory)-len(visual['rows']),
                cohort_methods=dict(Counter(c['method'] for c in cohorts)),
                image_issues=[dict(id=r['id'],problem_code=r['problem_code'],issue=r['image_issue'],note=r['note'])
                              for r in visual['rows'] if r.get('image_issue')],
                baseline_categories=manifest['baseline_categories'],baseline_commit=manifest['previous_commit'],
                method='Direct read of all ordered images of each selected row; no promotion of unviewed rows',
                seed=plan['seed'])


def build_outputs(input_path, figures_path=None):
    import figures
    manifest = json.loads((HERE / 'input-manifest.json').read_text())
    rows, digests = read_input(input_path, manifest)
    # Same exported registry as the sample evidence: no handmade coverage list.
    result = subprocess.run([str(ROOT/'node_modules/.bin/tsx'), str(HERE/'export-engine.ts')],
                            cwd=ROOT, capture_output=True, check=True)
    engine = json.loads(result.stdout)
    inventory = figures.read_mapping(figures_path or figures.DEFAULT_INPUT, rows)
    plan = figures.make_plan(inventory)
    visual = figures.load_reviews(rows, inventory, plan)
    reconciliation = figures.reconcile(rows, inventory)
    visual_summary = summarize_visual(rows, inventory, plan, visual, reconciliation['manifest'])
    assigned, groups, units = classify_all(rows, digests, engine, inventory, visual, plan, reconciliation['gaps'])
    algorithm_files = sorted(p for p in HERE.iterdir() if p.suffix in ('.py', '.ts', '.json') and not p.name.startswith('._'))
    engine_files = sorted(p for p in (ROOT/'src/lib/middle').rglob('*.ts') if not p.name.startswith('._'))
    provenance = {str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in algorithm_files + engine_files}
    evidence_files = [DEFAULT_OUT/('visual-'+owner+'.json') for owner in figures.OWNERS]
    evidence_files += [DEFAULT_OUT/name for name in ('figure-inventory.json','figure-review-plan.json','figure-baseline.jsonl')]
    provenance.update({str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in evidence_files})
    summary = dict(input=manifest, source_fields=sorted(REQUIRED), rows=len(assigned),
                   provenance=provenance,
                   categories=dict(Counter(r['category'] for r in assigned)),
                   reasons=dict(Counter(r['reason'] for r in assigned)),
                   grades={g:dict(Counter(r['category'] for r in assigned if r['grade']==g)) for g in ('중1','중2')},
                   source_sections=len(units), engine_types=len(engine['entries']),
                   engine_sections=len({(e['grade'],e['section']) for e in engine['entries']}),
                   engine_sample_count=sum(len(e['samples']) for e in engine['entries']),
                   engine_generation_errors=sum('error' in s for e in engine['entries'] for s in e['samples']),
                   groups=dict(Counter(g['category'] for g in groups)),
                   figure_flag=sum(r['figure_flag'] for r in assigned),
                   figure_marker=sum(r['figure_marker'] for r in assigned),
                   figure_evidence=sum(r['figure_flag'] or r['figure_reference'] for r in assigned),
                   figure_reconciliation=reconciliation, visual=visual_summary,
                   locked=sum(r['locked'] for r in assigned),
                   missing_solution=sum(not r['solution'] for r in rows),
                   production_writes=False, paid_api_calls=0,
                   classification='full-population rule census plus individually viewed figure reassessment; no extrapolation')
    # Explicit projection is the privacy boundary: original rows never enter an output object.
    outputs = {'rows.jsonl':b''.join((json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n').encode() for r in assigned),
               'groups.json':encode(groups), 'units.json':encode(units), 'summary.json':encode(summary),
               'engine-inventory.json':encode(engine), 'figure-reconciliation.json':encode(reconciliation)}
    return outputs, assigned


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--figures', type=Path, help='External figure map; defaults to the reviewed backup path')
    parser.add_argument('--out', default=DEFAULT_OUT, type=Path)
    parser.add_argument('--check', action='store_true', help='Compare replay bytes without writing')
    parser.add_argument('--sample', action='store_true', help='Print reproducible current audit IDs (no source text)')
    args = parser.parse_args()
    out = args.out.resolve()
    if ROOT not in out.parents or out == args.input.resolve().parent:
        raise ValueError('Output must stay inside this worktree, separate from the input')
    outputs, assigned = build_outputs(args.input, args.figures)
    if args.sample:
        print(encode(dict(seed=SAMPLE_SEED, method='SHA256(seed:id) rank within A/B/C, quotas 80/40/20',
                          rows=draw_sample(assigned))).decode(), end='')
        return
    if args.check:
        for name, data in outputs.items():
            if (out/name).read_bytes() != data:
                raise ValueError(f'Stale replay output: {name}')
        print(f'Replay identical: {len(assigned)} rows, {len(outputs)} files')
    else:
        out.mkdir(parents=True, exist_ok=True)
        for name, data in outputs.items():
            (out/name).write_bytes(data)
        print(f'Classified {len(assigned)} rows into {out}')


if __name__ == '__main__':
    main()

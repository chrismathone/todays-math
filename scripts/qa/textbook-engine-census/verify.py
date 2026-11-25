#!/usr/bin/env python3
"""Verify replay, frozen sampling, review identity, conservation and source-free output."""
import argparse
from collections import Counter
import json
from pathlib import Path
import census

ROW_KEYS = {'id','problem_code','source_line','record_sha256','grade','section','group','category','engine_keys',
            'reason','locked','figure_flag','figure_marker','figure_reference',
            'figure_available','figure_file_count','figure_reviewed','figure_review_cohort','classification_basis'}


def string_values(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from string_values(item)
    elif isinstance(value, dict):
        for item in value.values():
            yield from string_values(item)


def has_source_fragment(source, paths):
    # Windows of 80 codepoints at stride 20 detect any unchanged span of 99+.
    # This supplements the projection boundary; it is not a copyright judgment.
    windows = set()
    for row in source:
        for field in ('content','solution'):
            text = row[field] or ''
            for i in range(0, max(0,len(text)-79), 20):
                windows.add(text[i:i+80])
    for path in paths:
        text = path.read_text()
        if path.suffix == '.json':
            strings = string_values(json.loads(text))
        elif path.suffix == '.jsonl':
            strings = (s for line in text.splitlines() for s in string_values(json.loads(line)))
        else:
            strings = [text]
        # Decode JSON escaping before checking; TeX and newlines must not hide a copy.
        for value in strings:
            if any(value[i:i+80] in windows for i in range(max(0,len(value)-79))):
                return True
    return False


def verify(input_path):
    out = census.DEFAULT_OUT
    manifest = json.loads((census.HERE/'input-manifest.json').read_text())
    source, hashes = census.read_input(input_path, manifest)
    outputs, assigned = census.build_outputs(input_path)
    for name, data in outputs.items():
        if (out/name).read_bytes() != data:
            raise ValueError('Stale census: ' + name)
    by_id = {r['id']:r for r in assigned}
    visual_before = [json.loads(line) for line in (out/'figure-baseline.jsonl').read_text().splitlines()]
    for previous in visual_before:
        current = by_id[previous['id']]
        if current['category'] != previous['category']:
            if not (previous['category']=='C' and current['category']=='B' and current['figure_reviewed'] and
                    current['reason']=='visual-deterministic-extension'):
                raise ValueError('Unreviewed or out-of-scope visual promotion')
        if previous['category'] in ('A','B') and current['group'] != previous['group']:
            raise ValueError('Previously established rule group changed in figure reassessment')
        if current['figure_available'] and not current['figure_reviewed'] and current['category']!='C':
            raise ValueError('Unviewed mapped row was promoted')
    for r,h,s in zip(assigned, hashes, source):
        if set(r) != ROW_KEYS or r['record_sha256'] != h or r['problem_code'] != s['problem_code']:
            raise ValueError('Invalid projection or input binding')
    baseline_data = (out/'audit-population.jsonl').read_bytes()
    baseline = [json.loads(line) for line in baseline_data.splitlines()]
    if any(set(r) != {'id','category','group'} for r in baseline):
        raise ValueError('Unexpected fields in the audit population')
    census.validate_conservation(source, baseline)
    baseline_by_id = {r['id']:r for r in baseline}
    sample = json.loads((out/'audit-sample.json').read_text())
    if census.sha(baseline_data) != sample['audit_population_sha256'] or sample['input_sha256'] != manifest['sha256']:
        raise ValueError('Audit source/baseline binding changed')
    expected_draw = census.draw_sample(baseline)
    if [(r['id'],r['category']) for r in expected_draw] != [(r['id'],r['category']) for r in sample['rows']]:
        raise ValueError('Frozen random sample was replaced or cherry-picked')
    covered = {r['group'] for r in sample['rows'] if r['category']=='A'}
    omitted = {r['group'] for r in baseline if r['category']=='A'} - covered
    supp = sample['supplementary']
    if {r['group'] for r in supp} != omitted or len(supp) != len(omitted):
        raise ValueError('Supplementary audit does not cover the remaining A families exactly once')
    expected = {r['id']:(kind,r) for kind, rows in [('random',sample['rows']),('supplementary',supp)] for r in rows}
    if len(expected) != len(sample['rows']) + len(supp):
        raise ValueError('Duplicate sampled row')
    for r in sample['rows']+supp:
        b = baseline_by_id[r['id']]
        if (r['category'],r['group']) != (b['category'],b['group']) or r['record_sha256'] != by_id[r['id']]['record_sha256']:
            raise ValueError('Sample identity drift')
    reviews = []
    for name in ['audit-a.json','audit-bc.json']:
        document = json.loads((out/name).read_text())
        if not document['reviewer'] or not document['role']:
            raise ValueError('Missing review provenance')
        reviews.extend(document['rows'])
    if Counter(r['id'] for r in reviews) != Counter(expected.keys()):
        raise ValueError('Review ledger has missing/duplicate/unrequested members')
    for review in reviews:
        kind, r = expected[review['id']]
        if review['sample_kind'] != kind or any(review[k] != r[k] for k in ('problem_code','group','category','engine_keys')):
            raise ValueError('Review bound to different evidence')
        if review['verdict'] not in ('pass','fail','uncertain') or len(review['note']) < 15:
            raise ValueError('Missing actual judgment/rationale')
        if by_id[r['id']]['category'] != review['expected_category']:
            current = by_id[r['id']]
            if not (review['expected_category']=='C' and current['category']=='B' and current['figure_reviewed'] and
                    current['reason']=='visual-deterministic-extension'):
                raise ValueError('Unresolved sample finding: ' + r['problem_code'])
    baseline_summary = json.loads((out/'audit-baseline-summary.json').read_text())
    if dict(Counter(r['category'] for r in baseline)) != baseline_summary['categories']:
        raise ValueError('Wrong baseline totals')
    # Screen outputs for substantial contiguous source text, in addition to strict projection.
    # Metadata, ordinary short mathematical phrases and type names are permitted.
    paths = sorted(p for p in out.iterdir() if p.suffix in ('.json','.jsonl') and not p.name.startswith('._'))
    paths += [census.ROOT/'docs/planning/tracks/reports/textbook-engine-census.md']
    paths += sorted(p for p in census.HERE.iterdir() if p.suffix in ('.py','.ts','.md','.json') and not p.name.startswith('._'))
    if has_source_fragment(source, paths):
        raise ValueError('Source text detected (long fragment); do not print it')
    from report import render_report
    report_path = census.ROOT/'docs/planning/tracks/reports/textbook-engine-census.md'
    if report_path.read_text() != render_report():
        raise ValueError('Report tables or review summary are stale')
    visual_summary = json.loads(outputs['summary.json'])['visual']
    return dict(rows=len(assigned), replay_files=len(outputs), reviewed=len(reviews),
                random_reviewed=len(sample['rows']), supplementary_reviewed=len(supp),
                sample_corrections=sum(r['verdict']=='fail' for r in reviews),
                visual_reviewed_rows=visual_summary['reviewed_rows'],
                visual_viewed_files=visual_summary['viewed_files'],
                visual_promotions=visual_summary['promoted_rows'],
                unviewed_promotions=0,
                source_long_fragment_matches=0, report_matches=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--input', required=True, type=Path)
    a = p.parse_args()
    print(json.dumps(verify(a.input), ensure_ascii=False, indent=2))

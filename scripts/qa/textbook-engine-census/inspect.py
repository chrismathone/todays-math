#!/usr/bin/env python3
"""Print source rows for local human review; never write or copy them into the repo."""
import argparse
import json
from pathlib import Path
import census

p = argparse.ArgumentParser(description=__doc__)
p.add_argument('--input', type=Path, required=True)
p.add_argument('--code', action='append', default=[])
p.add_argument('--sample-category', choices=['A','B','C'])
p.add_argument('--offset', type=int, default=0)
p.add_argument('--limit', type=int, default=10)
a = p.parse_args()
rows, _ = census.read_input(a.input, json.loads((census.HERE/'input-manifest.json').read_text()))
assignments = {r['id']:r for r in [json.loads(l) for l in (census.DEFAULT_OUT/'rows.jsonl').read_text().splitlines()]}
if a.sample_category:
    sample = json.loads((census.DEFAULT_OUT/'audit-sample.json').read_text())
    wanted = [r['id'] for r in sample['rows'] if r['category'] == a.sample_category][a.offset:a.offset+a.limit]
    by_id = {r['id']:r for r in rows}
    selected = [by_id[i] for i in wanted]
else:
    selected = [r for r in rows if r['problem_code'] in a.code]
    if len(selected) != len(set(a.code)):
        raise ValueError('Unknown problem code')
for row in selected:
    print(json.dumps({'assignment':assignments[row['id']], 'source':row}, ensure_ascii=False))

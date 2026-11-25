#!/usr/bin/env python3
"""Print selected source text and existing image paths for visual review; no writes."""
import argparse
import json
from pathlib import Path
import census

p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--owner',choices=['m1-core','m1-geo','m2-core','m2-geo'],required=True)
p.add_argument('--start',type=int,default=0)
p.add_argument('--limit',type=int,default=6)
p.add_argument('--input',type=Path,default=Path('/Volumes/새 볼륨/today-backups/textbook-mid-rows.jsonl'))
a=p.parse_args()
rows,_=census.read_input(a.input,json.loads((census.HERE/'input-manifest.json').read_text()))
by_id={r['id']:r for r in rows}
plan=json.loads((census.DEFAULT_OUT/'figure-review-plan.json').read_text())
inv={r['id']:r for r in json.loads((census.DEFAULT_OUT/'figure-inventory.json').read_text())}
selected=[(g,i) for g in plan['cohorts'] if g['owner']==a.owner for i in g['sample_ids']]
result=[]
for index,(g,i) in enumerate(selected[a.start:a.start+a.limit],a.start):
 r=by_id[i]
 result.append(dict(index=index,cohort=g['id'],population=g['population'],id=i,problem_code=r['problem_code'],grade=r['grade'],section=r['section'],content=r['content'],answer=r['answer'],solution=r['solution'],
                    files=[dict(**f,path=str(census.ROOT/'public'/f['url'].lstrip('/'))) for f in inv[i]['files']]))
print(json.dumps(result,ensure_ascii=False))

import sys
sys.dont_write_bytecode=True
from pathlib import Path
import json,hashlib,datetime,subprocess,shutil
R=Path(__file__).resolve().parent;REPO=R.parents[2];P=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');QA=P/'.qa-artifacts/exam-resume-20261008'
assert not (R/'evidence').exists(),'Never replace copied evidence'
receipt=[]
def copy(src,rel):
 b=src.read_bytes();dest=R/rel;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(b);assert dest.read_bytes()==b
 receipt.append({'sourcePath':str(src),'copyPath':rel,'rawSha256':hashlib.sha256(b).hexdigest(),'bytes':len(b)})
for f in ['VERIFY-BRIEF.md','verification-inputs.json','verification-manifest.json']:copy(QA/'gyeongsan-final-review-r1'/f,'evidence/verification/'+f)
copy(QA/'bank-read-fresh-r3-20261008.json','evidence/bank-read-fresh-r3-20261008.json')
src=QA/'next-five-extraction-r1/gyeongsan/packet';copy(src/'questions.json','evidence/source/questions.json')
s=json.loads((src/'questions.json').read_text(encoding='utf-8'));assert s['sourceOnly'] and s['originalCorrectChoiceAndSolutionWithheld']
rows=json.loads((R/'evidence/verification/verification-inputs.json').read_text(encoding='utf-8'));numbers=[r['candidate']['questionNumber'] for r in rows];assert len(numbers)==24 and 15 not in numbers
for q in s['questions']:
 if q['number'] in numbers:
  for a in q['images']:copy(src/a['file'],'evidence/source/'+a['file'])
for r in rows:
 q=f"q{r['candidate']['questionNumber']:02}";base=QA/'gyeongsan-independent-r1/package/private'/q
 copy(base/'candidate.json',f'evidence/package/private/{q}/candidate.json')
 for a in r['assets']:
  for key in ['sourceSpecPath','sourceSvgPath']:copy(Path(a[key]),f'evidence/package/private/{q}/'+Path(a[key]).name)
for f in ['src/lib/middle/m3Func.ts','src/lib/middle/m3Trig.ts','src/lib/middle/m3AngleApply.ts','src/lib/middle/m3Tangent.ts','src/lib/middle/m3Top.ts','src/lib/middle/m3Top4.ts','src/lib/middle/generate.ts','prisma/seed-data/units.ts','scripts/import/exam-twin/candidatePack.mjs','.agents/skills/typesafe-ai/SKILL.md']:
 copy(P/f,'evidence/repository/'+(f+'.txt' if f.endswith('.ts') else f))
copy(REPO/'.qa-artifacts/exam-resume-20261008/gyeongsan-independent-r1/blind/curriculum-scope-input.json','evidence/curriculum-scope-input.json')
old=json.loads((REPO/'.qa-artifacts/exam-resume-20261008/gyeongsang-stat-final-review-r1/evidence/preservation-before-main.json').read_text(encoding='utf-8'))['files']
for p in (REPO/'.qa-artifacts/exam-resume-20261008/gyeongsang-stat-final-review-r1').rglob('*'):
 if p.is_file():old.append({'path':p.relative_to(REPO).as_posix(),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
assert len(old)==743
for f in old:assert hashlib.sha256((REPO/f['path']).read_bytes()).hexdigest()==f['sha256'],f['path']
def put(p,x):p.write_bytes((json.dumps(x,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
put(R/'evidence/preservation.json',{'files':old,'previousFiles':len(old),'allBytesUnchanged':True})
put(R/'evidence/input-receipt.json',{'copiedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'parentRepositoryCommit':subprocess.check_output(['git','rev-parse','HEAD'],cwd=P,text=True).strip(),'scope':'24 originalr1 GS candidates only; no q22-repair-r2','originalAnswersRead':False,'entries':receipt})
# Reuse the reviewer renderer as NEW owned code; original stat file remains unchanged.
renderer=(REPO/'.qa-artifacts/exam-resume-20261008/gyeongsang-stat-final-review-r1/render-review.mjs').read_text(encoding='utf-8').replace("strictModeObservation:'q22 answer\\\\mathrm{분} raised unicodeTextInMathMode under strict:error;no candidate repair;lenient view permits actual glyph inspection'","strictModeObservation:'Unicode warnings recorded; actual project KaTeX strict:false; original r1 candidates unmodified'")
(R/'render-review.mjs').write_bytes(renderer.encode('utf-8'))
print('Copied GS24 originalr1 candidates,18 specs/SVGs,safe sources,bank/rules;protected743 unchanged.')

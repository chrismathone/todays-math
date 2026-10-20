from pathlib import Path
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group5-review-20261020-r2');v=p/'verification';load=lambda f:json.loads(f.read_text(encoding='utf-8'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();receipt=load(v/'own-full-review-check-receipt.json');coll=load(v/'own-full-review-collector.json')
limits={'currentCandidateReview':{'math':3,'grade2015AfterPrerequisites':3,'contentRelease':0},'actualCollector':'not-run: source hashes differ from prior frozen authorized R3 baseline; no current-code audit expansion and no invented actual collector counts','collectorHashMismatchFiles':[x for x in coll['sourceHashes'] if x['expected']!=x['actual']],'independentBlindReliability':'q17 original raw misread E as80,40; actual unchanged student data E30,40. Both put E below B150, so all21 cases keep A/H and answer100. This is an explicit post-exposure REVIEW correction, not rewriting raw or certifying all original blind points correct.','noCurrentAuthorFaultFromOwnRawError':True,'historicalSourceHold':'Reevaluate only obsolete null/shared-owner reasons against exact current stage/context hashes, preserve prior reports and raw tail; no whole-source/grade/rights/family/native release from overlay','fullApprovals':0}
with (v/'own-full-review-limits.json').open('x',encoding='utf-8') as f:json.dump(limits,f,ensure_ascii=False,indent=2);f.write('\n')
for path,sha in receipt['inputBeforeAfterHashes'].items():assert h(Path(path))==sha
paths=list(v.glob('own-full-review-*'))+[v/f'reports/q{q}.json' for q in (15,16,17)]+[p/'source-only-context/context-manifest.json']
assert all(not x.name.endswith('.png') and not x.name.endswith('-staged.json') and not x.name.endswith('-prior-review.json') for x in paths)
subprocess.run(['git','add','-f','--',*[str(x) for x in paths]],check=True)
subprocess.run(['git','diff','--cached','--stat'],check=True)
subprocess.run(['git','commit','-m','Review current Nobyeon scatter three preserving raw transcription limitation'],check=True)
subprocess.run(['git','rev-parse','HEAD'],check=True)
for q in (15,16,17):print('q'+str(q),h(v/f'reports/q{q}.json'))
print('RAW_FINDING_SHA256',h(v/'own-full-review-raw-transcription-finding.json'))
subprocess.run(['git','status','--short'],check=True)

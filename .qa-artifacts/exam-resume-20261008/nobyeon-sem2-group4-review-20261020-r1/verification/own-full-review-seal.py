from pathlib import Path
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/nobyeon-sem2-group4-review-20261020-r1');v=p/'verification';load=lambda f:json.loads(f.read_text(encoding='utf-8'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();r=load(v/'own-full-review-reproduction.json');collector=load(v/'own-full-review-collector.json')
limits={'ownMathematicalAndGradeJudgments':{'math':3,'gradeAfterPrerequisites':3,'fullContentApproved':0},'actualPinnedCollector':{'math':collector['result']['mathematicalVerified'],'grade':collector['result']['gradeReviewed'],'overall':collector['result']['overallVerified'],'loadable':collector['result']['loadable'],'heldItem':20,'reason':'independent-answer-mismatch'},'q20CurrentAnswerRoleComparison':{'independentRaw':'(1) M=40; (2) a=40, b=43','authored':'(1) $M=40$ (2) $a=40$, $b=43$','ownExactValuesAndRolesMatch':True,'actualPresentationSupport':'현재고정collector에서미통과. 실제값·순서·이름을버려비교하거나raw를재작성하지않았다. 답표기지원은수학적증명과별개이다.'},'q20StudentWholeMethod':'표준편차조건에서x²+y²9와편차합x+y3을얻고허용곱셈공식으로xy0, 순서로(0,3). 조건제거대조쌍(39,44),(41,42)는평균/기지편차/순서를충족하지만분산6은아니므로표준편차가실제필수입력이다. 고등근과계수관계없음.','noRawAnswerOrEarlierEvidenceModified':True,'noCodePatchMade':True,'newManualOrBlindCount':0}
with (v/'own-full-review-collector-limits.json').open('x',encoding='utf-8') as f:json.dump(limits,f,ensure_ascii=False,indent=2);f.write('\n')
for path,sha in r['inputBeforeAfterHashes'].items():assert h(Path(path))==sha
# Context source text/crops/preview images remain local inputs; only its aggregate manifest is staged by explicit request.
paths=list(v.glob('own-full-review-*'))+[v/f'reports/q{q}.json' for q in (18,19,20)]+[p/'source-only-context/context-manifest.json']
assert all(not x.name.endswith('.png') and not x.name.endswith('-staged.json') and not x.name.endswith('-prior-review.json') for x in paths)
subprocess.run(['git','add','-f','--',*[str(x) for x in paths]],check=True)
subprocess.run(['git','diff','--cached','--stat'],check=True)
subprocess.run(['git','commit','-m','Review sealed Nobyeon written three with whole student methods and source context'],check=True)
subprocess.run(['git','rev-parse','HEAD'],check=True)
for q in (18,19,20):print('q'+str(q),h(v/f'reports/q{q}.json'))
print('REPRODUCTION_SHA256',h(v/'own-full-review-reproduction.json'))
subprocess.run(['git','status','--short'],check=True)

from pathlib import Path
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/angle-presentation-code-audit-20261020-r1');r=json.loads((p/'own-code-controls-results.json').read_text(encoding='utf-8'))
h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
report={'kind':'independent-single-angle-code-audit/v1','status':'bounded-controls-passed','ownCases':r['ownCases'],'sourceBeforeAfterHashes':r['sourceBeforeAfterHashes'],'controlsResultsSha256':h(p/'own-code-controls-results.json'),'independentFindings':{'newGrammar':'完全ではなく、ASCII decimal with explicit Unicode degree or TeX circ only; fully consumed;0..360;0..6 fractional digits; no sign/leadingzero except0/arithmetic/prose/roles/unit inference','exactComparison':'decimal rationals compared through constantAnswers BigInt fractions; zero/trailingzero normalization exact, unequal final decimal digits rejected','sourceOwnership':'singleAnglePart is separate scalar-angle role. Existing numbered/named parsers and exact-string normalizeAnswer fallback remain; this is no universal notation validator','oldVsCurrentGroup10':{'beforeMath':1,'beforeGrade':1,'afterMath':2,'afterGrade':2,'basis':'Own actual evaluateReview against current fixed q11/q12 raw/reports; prior path simulated by removing only scalar-angle parse branch in memory. Actual current collector separately ran2/2. No claim of running historical Git code.'},'approvals':'presentationComparisonOnly=true, relationTruthProved=false, permitsGradeOrQuestionApproval=false. Missing grade basis/pendinggrade/wronganswer do not gain approval; even forged source/taxonomy/rights/similarity gates leave overall/loadable/productionWrites false.','rawAndOldReportsUnchanged':r['protectedRawReportBeforeAfterHashes']},'limitations':r['limits'],'parentTestCountsUsedAsOwn':False,'newManualCount':0,'dbWrites':0,'rootWrites':0}
report['independentFindings']['newGrammar']=report['independentFindings']['newGrammar'].replace('完全ではなく、','')
with (p/'own-code-audit-report.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
v=Path('.qa-artifacts/exam-resume-20261008/gyeongsin-group11-review-20261020-r1/verification')
notes={'ownHumanReview':{'math':5,'grade2015AfterPrerequisites':5,'fullContentApproved':0},'actualCurrentCollector':{'math':3,'grade':3,'overall':0,'heldItems':[13,15]},'reason':'q13/q15 독립 raw의 Unicode √와 저자 TeX sqrt가 현재 독립답 비교에서 unsupported/mismatch로 남는다. 값은 정확 계산으로 같지만 실제 collector의0을 임의로1로 바꾸지 않는다. 원시 답이나 보고서를 고쳐 통과시키지 않았고 코드 범위를 넓히지 않았다. q14 각도는 이번 bounded degree 비교로 일치한다.','preservedRawCommit':'f4a9aa7c978906cf021e02029bd0511ff2d4190f','gradeReasoningLimit':'각 보고서의 7면 판단은 개별 실제 해설의 성질과 기존 실제 공식 primary 배치에 근거한다. 출처학교/배점/label은 학년 승인 근거 아님.'}
with (v/'own-q13-q17-review-collector-limits.json').open('x',encoding='utf-8') as f:json.dump(notes,f,ensure_ascii=False,indent=2);f.write('\n')
paths=list(v.glob('own-q13-q17-review-*'))+[v/f'reports/q{q}.json' for q in range(13,18)]+list(p.glob('own-*'))
subprocess.run(['git','add','-f','--',*[str(x) for x in paths]],check=True)
subprocess.run(['git','diff','--cached','--stat'],check=True)
subprocess.run(['git','commit','-m','Review sealed Gyeongsin q13-q17 and audit bounded angle comparison'],check=True)
subprocess.run(['git','rev-parse','HEAD'],check=True)
print('CODE_REPORT_SHA256',h(p/'own-code-audit-report.json'))
for q in range(13,18):print('q'+str(q),h(v/f'reports/q{q}.json'))
subprocess.run(['git','status','--short'],check=True)

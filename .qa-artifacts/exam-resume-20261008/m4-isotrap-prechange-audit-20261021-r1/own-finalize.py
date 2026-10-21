from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
j=json.loads((P/'own-results.json').read_text(encoding='utf8'));before=json.loads((P/'own-before.json').read_text(encoding='utf8'));assert all(sha(Path(f).read_bytes())==h for f,h in before.items())
assert j['domain54']==54 and j['sourcePortCurrentRenders']==54 and j['candidateSourcePortRenders']==52
fail=j['candidateFailureRows'];assert {(r['p'],r['c'])for r in fail}=={(11,4),(12,4)}
report={
 'status':'M4 prechange step-disclosure confirmed; minimal angA-only replacement has52source-port renders/2strict layout HOLDs, not final-ready',
 'attribution':{'originalCard':'M4','exactCardRow':j['originalCard'],'handoff':'docs/planning/tracks/brief-engine-handoff-display-20261021.md','currentSource':'src/lib/middle/m2GeoQuad.ts','helper':'figIsoTrap','type':'2-2|여러 가지 사각형|08','branch':'mode1'},
 'domain':{'p':list(range(4,13)),'c':list(range(4,15,2)),'pairs':54,'source':'p=intBetween(rng,4,12);c=2*intBetween(rng,2,7)'},
 'mathematics':{'givens':'AB=c, AD=p, angleA120, isosceles trapezoidADparallelBC','independentExpected':'AngleB60 by same-side interior angles. Drop perpendicularsAE,DH; angleBAE30. Short legsBE,CH=c/2, EH=AD=p, soBC=p+c. Positive p,c give two nondegenerate congruent right triangles and rectangle, uniquely determiningBC.','studentProofWithoutTrigOrRoot':'To justify short-leg half rule without memorized trig: reflect triangleABE acrossAE to a congruent triangleAFE. ApexBAF60 andAB=AF makeBAF equilateral, soBF=AB=c; E is midpointBF, henceBE=c/2. This uses elementary congruence/triangle angles/equilateral properties. No sin/cos/sqrt is a required student operation.','engineOnlyGeometry':'Source computes height=round2(9c*sin60). Independent positivity and symmetry verified; numerical raw angles A differ from120 by at most about.002456degrees due height rounding. This is approximate vector witness, not an exact printed-angle certificate.'},
 'disclosure':'Current mode1 opts.angB=60degree prints the first computed supplementary angle while omitting given A120. Numeric60 is an intermediate solving step, not final answer. Full current dimensions carry only givenAD/AB; noBC target dimension; equal leg ticks/parallel marks represent stated givens.',
 'proposal':[
 'Add optional opts.angA?:string to figIsoTrap; if supplied, create angles.angA={vertex:A,points:[B,D],label:opts.angA}. Only type08mode1 passes angA120 instead ofangB60.',
 'Do not modify existing angB, angADB, foot, diagBD callers or default behaviors. Preserve every point/segment/tick/parallel mark/point label/dimension/body/answer/facts/solution/RNG draw exactly except declared given-angle entry and any explicitly necessary scoped label-layout metadata.',
 'Do not remove AB given dimension to silence new conflict. Bound a separate angle label/radius/clear-label placement adaptation only after actual captures with real MathJax metrics, keeping points/printed labels unchanged.',
 'Capture before first, then actual bothbranch tests, mode0valid49(p,q) pairs and relatedhelper callers plus seededAPI. Preserve attempt RNG consumption and IDs. Update only future relevant adapter revision/fingerprint, no issued-row rewrite.'
 ],
 'ownExecution':{'Python54ExactStudentArithmeticCases':54,'sourcePortCurrentNativeRenders':54,'QAOnlyAngAReplacementRendersSuccessful':52,'QAOnlyAngAReplacementStrictFailures':2,'actualTSGeneratorOrSeedAPI':0,'Node':0,'browser':0,'model':0,'DB':0,'productionEdits':0},
 'exactFailureHolds':[{'p':r['p'],'c':r['c'],'error':r['candidateError'],'requiredAction':'Preserve failure and AB dimension; actual Root implementation/render design pending'}for r in fail],
 'layoutLimits':'Successful52source-port candidates had0 basic label box clips and0 label-pair overlaps. Default Python metrics only, not actual MathJax/halo/arc/line/leader/physical print verification; no whole native approval. Failed2 excluded from success, not repaired or dropped. Root will capture actual TS outputs.',
 'mode0Preservation':'Proposal is optional helper field, mode1 call-only. Original default length branch must be exact. No actual mode0JS execution in this Python prechange task; preservation is a mandatory subsequent regression, not an accomplished claim.',
 'gradeLimits':'The supplementary-angle/quadrilateral/congruence/30-60-right-triangle route is described as a possible M2-school method, not certified official curriculum placement or prerequisite completion. Source engine sin60 is coordinate construction only. School/type labels and teacher conventions do not grant whole-grade/Unit/rights approval.',
 'compatibility':'All current/old QA/source hashes preserved. No new authored/exam/student task or blind count, DB/native/source/rights/public release approval.',
 'sourceBeforeAfterUnchanged':True,'boundFiles':len(before),
 'artifactSHA256':{f.name:sha(f.read_bytes())for f in P.iterdir()if f.is_file()and f.name!='own-report.json'}
}
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((P/'own-report.json').read_bytes()),'sourcePortCurrent54':True,'candidate':'52pass/2HOLD'}))

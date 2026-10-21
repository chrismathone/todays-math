from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent
sha=lambda b:hashlib.sha256(b).hexdigest()
j=json.loads((P/'own-results.json').read_text(encoding='utf8'));before=json.loads((P/'own-before.json').read_text(encoding='utf8'));assert all(sha(Path(f).read_bytes())==h for f,h in before.items())
assert j['domainCount']==21 and j['QAOnlyCandidateNativeSuccess']==21
report={
 'status':'M3 prechange step-disclosure confirmed; QA-only replacement feasible in bounded source-port render, final implementation/native review pending',
 'attribution':{'card':'M3','originalRow':j['originalCard'],'path':'docs/planning/tracks/brief-engine-handoff-display-20261021.md','currentSource':'src/lib/middle/m2GeoTri.ts','typeKey':'2-2|삼각형의 성질|09','currentBranches':'figBisector09 else and handler mode1; mode0 excluded from proposed change'},
 'domain':{'source':'w=2*intBetween(rng,20,40)','allValues':list(range(40,81,2)),'count':21,'exposedHalfValues':list(range(20,41)),'independentTargetRange':[100,140]},
 'independentStudentDerivation':'C,D are perpendicular feet, hence quadrilateralOCPD has90-degree angles atC andD. Its fourth angle is360−90−90−w=180−w. No numerical half-angle calculation, trigonometry, cosine law or high-school theorem is needed in student solution. Given bisector can be shown by equal marks without printing evaluated halves.',
 'geometryEvidence':'Engine-only trig reconstructs actual literal source coordinates; C,D lie on given rays with positive distances, both perpendiculars are90degrees, P lies inside and OCPD is convex over all21w. Raw CPD angle agrees with independent whole-angle subtraction within floating arithmetic. Fitted2-decimal points introduce measured error (not exact geometry).',
 'maximumFittedCPDAngleErrorDegrees':max(r['fittedCPDAngleErrorDegrees']for r in j['records']),
 'disclosedStep':'Current a1/a2 label w/2 each is derived from given whole angle and bisector; it is an intermediate step disclosure, not the final CPD answer. Whole given w is absent as a single mark. This is the exact originalM3 issue, not a newly authored question.',
 'proposal':[
 'Mode1 only: keep existing points/rays/perpendicular segments, point names, ax unknown target label, body/answer/solution/facts and RNG call order. Remove only a1/a2 numeric labels; use same-count equal arc marks for AOP and POB.',
 'Add a separate whole AOB mark with only given w°; use clearly distinct radius from both half-angle marks. QA witness uses inner radius16/outer32; do not treat these constants as final typography without actual viewport/typeset evidence.',
 'Ensure the given whole arc cannot be read as another equality assertion with half arcs; distinct radius/span plus numeric given needed. Consider two equal half-arcs vs one given whole arc if actual visual comparison is ambiguous, but preserve meaning and validate inner effective radii.',
 'Preserve original mode0 exact bytes across its21w*7d=147literal combinations and actual seeded API; do not accidentally add whole angle where d-only branch gives no numeric angle. Do not move RNG draws or change type IDs.',
 'Use real engine angle-label placement/leader rather than inventing free numeric labels or extra geometry. Parent final MathJax/render must check that leader is clearly a label callout, not new construction, and no clipped/hidden whole given or equal-arc marks.'
 ],
 'ownExecuted':{'rawGeometryDomain':21,'currentLiteralSourcePortPythonRenders':21,'QAOnlyProposedPythonRenders':21,'noHalfOrTargetNumericLabelsInProposal':21,'proposalBasicLabelBoxOverlapRows':j['candidateLabelOverlapRows'],'actualTSHandlerOrAPI':0,'Node':0,'browser':0,'model':0,'DB':0,'productionEdits':0},
 'nativeLimitations':['Source port is NOT actual TS output capture; Root will supply actual current/final cases','Python default text metrics, not actual MathJax typography; no glyph/halo/physical-print approval','No basic text-box pair overlaps observed, but this is not all text-vs-arc/stroke/leader collision proof. Current angle label placement can choose least-bad position and successful render alone is insufficient','Whole mark label and existing target label use external angle leaders in observed cases; source/body segments remain unchanged, yet callout visual semantics require review','No strict serialized-arc containment certification or tolerance relaxation; M28opt-in not copied here by default'],
 'gradeDistinction':'Whole student route needs perpendicular definition and quadrilateral angle sum (earlier middle-school prerequisites). Coordinates use engine-only trig for audit. No official primary whole-grade/Unit/prerequisite-completion approval performed here; school source/type label is not authority.',
 'compatibility':'Future adapter/fingerprint revision if rendered spec changes; original seeds/issued rows/raw evidence immutable. No DB rebuild or operational release.',
 'hashes':{'beforeAfterUnchanged':True,'boundFileCount':len(before)},
 'artifactSHA256':{f.name:sha(f.read_bytes())for f in P.iterdir()if f.is_file()and f.name!='own-report.json'}
}
(P/'own-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
print(json.dumps({'reportSHA256':sha((P/'own-report.json').read_bytes()),'domain':21,'productionApplied':False}))

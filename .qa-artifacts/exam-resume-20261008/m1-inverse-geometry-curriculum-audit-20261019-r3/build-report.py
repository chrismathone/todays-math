import pathlib,json,hashlib,datetime
out=pathlib.Path(__file__).parent
r2=out.parent/'m1-inverse-geometry-curriculum-audit-20261019-r2'
root=pathlib.Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
def load(p):return json.loads(p.read_text(encoding='utf-8'))
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(n,x):(out/n).write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
before=load(out/'source-before.json');after=load(out/'source-after.json')
closing={p:sha(root/p) for p in before};assert before==after==closing
write('source-closing.json',closing)
previous=load(r2/'report.json');summary=load(out/'summary.json');scope=load(out/'binding-scope.json')
refs={n:{'path':str(r2/n),'sha256':sha(r2/n)} for n in ['report.json','primary-locators.json','cohort-evidence.json','actual24-and-independent-findings.json','verifier-negative-cases.json','verifier-semantic-limits.json','visual-review.json'] if (r2/n).is_file()}
assert refs['report.json']['sha256']=='330afd66d2a0e11dd2b0e73c7b3cf4b42d8c5847ef215abe2cbe888761c0f378'
family={}
for name,info in previous['familyOutcomes'].items():
    family[name]={'familyId':info['familyId'],'version':info['version'],'variants':info['variants'],'sevenSurfaces':info['sevenSurfaces'],'primitiveOperations':info['primitiveOperations'],'basis':'r2 full seven-surface/primary/cohort findings retained only because all24current printed content/answers/figures/solutions/formats/versions match r2 exactly; actual numerical methods rerun in focusedr3.'}
report={
 'kind':'focused-independent-engine-template-binding-regression/v3',
 'status':'verified-bounded-template-regression',
 'reviewerId':'codex-clean-blind-20261019-r1-same-session-engine-audit',
 'createdAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),
 'conclusion':'r2의두모순추가오통과가검토된두유한템플릿에서해소됐다. 실제24출력은그대로이고기존128반례와변경16개전체의추가48반례가거부된다. 자유형식해설의의미검증이나전엔진학년승인으로확장하지않는다.',
 'scope':{'rootReadOnly':str(root),'rootFiles':list(before),'families':3,'actualVariants':24,'changedMethodVariants':16,'unchangedSquareVariants':8,'broadAudits':0,'newPrimaryWebSweep':False,'otherExamQuestionsRead':0,'newWorkers':0,'newWorktrees':0,'newIndependentBlindSolverCount':0},
 'summary':summary,
 'bindingReview':{
  'optionalDefinitionField':'bindStudentSolution?: boolean',
  'optedIn':['equalLegs','inverseArea'],
  'withinReadModulesOptinsExactlyTwo':True,
  'scopeLimit':'Only the two reviewed declarations in the authorized algebra.ts/graphs.ts modules were inspected for opt-in. No repository-wide registry scan or certification of other families.',
  'order':'Existing d.solve(item) still derives answer/parameters from printed content/labels and retains bounded method clauses. family.verify then compares parameters with the derived parameters and finite domain, checks answer equality, and only afterward checks item.solution===d.make(solved.parameters).solution for opt-in families.',
  'bindingMeaning':'Exact complete canonical student-solution string for the reviewed finite template; an unreviewed suffix, including harmless prose or equivalent formatting, is rejected. This is template integrity, not semantic understanding or acceptance of arbitrary equivalent proofs.',
  'oracleSeparation':'Own numeric calculations read printed content and figure labels; no import of root support.area/linear2/solve as the independent answer oracle. Actual family.verify is separately called as the system under test.',
  'versions':{'equalLegs':'2-m1-single-variable','inverseArea':'2-m1-elementary-area','square':'1'},
  'versionReason':'Parent states these local drafts were not committed/pushed/served, so no version bump was needed. Exported values and unchanged current student outputs were observed. Historical deployment/DB state was not independently inspected.',
  'evidence':'binding-scope.json'
 },
 'numericalReview':{'result':'all24passed','source':'actual24-and-independent-findings.json','method':'Rerun numerical one-variable equalLegs, elementary common-base/three-area inverseArea, and numerical one-variable square directly from printed text/labels. All positive lengths/coordinates, nonzero coefficients, original relations and unique requested quantities verified. 484actualmathblocks rendered with KaTeX; no app run.',
  'equalLegs':'all4: positive coefficientq-p, lower ordinatet>0, upper=t+d, same inverse product and equal differences. Student operation path unchanged fromr2.',
  'inverseArea':'all12: positive commonACbase fixes offseta*r/s uniquely, b>a,z>0,z<y,bz=ay; elementaryOAC/ABC/OBC numerical areas sum/difference gives positive uniqueOAB. No determinant/similarity or new prerequisite introduced.',
  'square':'all8: positive coefficient1+b-a determinesu uniquely, positive equal sides and two direct-proportion incidences; same first-quadrant vertices andC. Student output/version unaffected; square was not opted into new solution binding.'},
 'regression':{
  'all24OutputComparison':'r2-output-comparison.json: all24printed content,answer,solution,figureSpec,version,format exactly equal r2.',
  'same128Controls':'verifier-negative-cases.json is JSON-byte-equivalent in serialized data to r2 controls, including actual16oldv1solutions; all rejected with original current final answers unchanged.',
  'all16SuffixControls':'suffix-controls-all16.json: both contradictory suffixes t=99 and[ABC]=999 on each4+12variant, plus arbitrary unreviewed prose on each;48total rejected specifically by canonical template mismatch.',
  'r2FailureClosure':'verifier-semantic-limits.json: exacttwo r2variant0counterexamples nowvalid=false. R2evidence remains immutable, and those earlier failures are not overwritten.',
  'squareEffect':'All8square current outputs and their factory pass results unchanged. The new branch is opt-in and square declaration has no bindStudentSolution flag. No claim that square now has freeform semantic solution verification.'},
 'findings':[
  {'id':'R2-G3','status':'resolved-within-reviewed-template','coverage':'all4equalLegs','evidence':'All4t=99suffixes rejected, includingexactr2counterexample; canonical actualoutputs remainvalid.'},
  {'id':'R2-G4','status':'resolved-within-reviewed-template','coverage':'all12inverseArea','evidence':'All12ABC=999suffixes rejected, includingexactr2counterexample; canonicalactualoutputs remainvalid.'}
 ],
 'familyOutcomes':family,
 'primaryAndCohortReferences':refs,
 'cohortApplicability':previous['cohortApplicability'],
 'curriculumLimits':'Reuse r2 actual official2022middle-band records/KICE2026M1example and2015E5/E6prerequisite evidence. 2025/2026M1 normal cohorts learned elementary prerequisites under2015; M1uses2022. Only after necessary linear-equation/coordinate/proportion units are taught. No new legal annual allocation, school-specific pacing, individual learner readiness, source-paper or future curriculum approval.',
 'visualLimits':'Existing20specs andSVGhashes rebound in this run; no new render or new visual inspection. R2selectedsix70mmviews referenced, not a newall20layoutclearance. CurrentfigureSpec exactlyunchanged.',
 'sourceIntegrity':{'before':before,'after':after,'closing':closing,'allEqual':True,'oldR2SourceBefore':load(r2/'source-before.json'),'limits':'Exact hashes cover only the four authorized current source/test files. No root files edited, no claim about unrelated root modifications.'},
 'parentEvidenceOnly':'Parent tests/type/lint and claim of never-served localdrafts are parent evidence; not substituted for independent numerical or curriculum review. No fullregistry or broadtests run.',
 'remainingLimits':[
  'Bounded current canonical finite templates only; no arbitrary prose semantic certification.',
  'Exact string equality intentionally rejects altered formatting, benign suffixes and alternative valid solutions as unreviewed; not a claim such alternatives are mathematically false.',
  'Other families and other methods, routes, persistence, deployment history and all futurecodechanges are outside thisfocusedregression.',
  'No student outcome study, timed difficultycalibration, fullpapergrading or automatic school/unit/family assignment.',
  'Source identity, custody, rights, similarity, nativeprovenance, nativerendering and releaseholds remain; no automaticloadapproval.'
 ],
 'holds':{'sourceIdentityApproved':False,'rightsApproved':False,'similarityApproved':False,'nativeProvenanceApproved':False,'nativeRenderingApproved':False,'familyAssignmentApproved':False,'releaseApproved':False,'loadable':False},
 'operatingDB':0,'deploys':0,'pushes':0,'installs':0,'rootEdits':0,'fullThirdPartyPublished':False
}
write('report.json',report)
entries={p.name:sha(p) for p in sorted(out.iterdir()) if p.is_file() and p.name!='evidence-manifest.json'}
write('evidence-manifest.json',{'kind':'own-focused-r3-evidence-only','files':entries,'fullThirdPartyDocumentsIncluded':False,'r2EvidenceEdited':False,'rootEdited':False})
print(json.dumps({'status':report['status'],'reportSha256':sha(out/'report.json'),'files':len(entries)+1}))

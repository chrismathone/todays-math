from pathlib import Path
import json,hashlib,subprocess
p=Path('.qa-artifacts/exam-resume-20261008/bare-unit-notation-code-audit-20261020-r1');root=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
r=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest();scope=r(p/'provided-scope.json');before=r(p/'own-before.json');results=r(p/'own-control-results.json');rows=[]
for x in scope['files']+[scope['runtimeData']]:rows.append({'path':x['path'],'expected':x['sha256'],'root':h(root/x['path']),'snapshot':h(p/x['snapshot']),'runtime':h(p/x['runtime'])})
assert rows==before['codeAndData17'];actual=[{'path':x['path'],'sha256':h(Path(x['path']))} for x in scope['actualArtifacts']];assert actual==before['actualArtifacts'];old=[]
for x in before['priorRawReports']:
 f=Path(x['path']);assert h(f)==x['sha256'] and f.read_bytes()==subprocess.check_output(['git','show',x['sealedCommit']+':'+x['path']]);old.append(x)
assert h(p/'provided-scope.json')==before['scopeSha256'];assert results['summary']['failed']==0 and results['validationMocked'] is False
(p/'own-after.json').write_text(json.dumps({'scopeSha256':before['scopeSha256'],'codeAndData17':rows,'actualArtifacts':actual,'priorRawReports':old,'allHashesBeforeAfterEqual':True,'all6RawReportsGitBlobEqual':True},indent=2)+'\n',encoding='utf-8')
byid={x['id']:x for x in results['cases']}
report={
 'kind':'independent-bounded-U56-bare-unit-notation-code-audit/v1','status':'bounded-controls-passed-operational-holds-retained','scopeSha256':before['scopeSha256'],
 'sourceBinding':{'sourceAndTests':16,'runtimeData':1,'rootSnapshotRuntimeAllExactScopeSha256':True,'beforeAfter17Unchanged':True,'candidatePackHostSha256':'13da6274441c78cb7c5eb9df1c83cc55dd6a9489aec0ac4205a5764aa3ddafb4','authoredMathNotationSha256':'68b7137739df554f3ce48ccd887bbe47ef8135111417c862fbed69b4cf45e60f','actualArtifacts38Unchanged':True,'priorRawAndReports6GitBlobEqual':True},
 'actualOwnRuns':results['summary'],
 'oracle':{'cases':409,'method':'Python constructs marked text fragments and computes expected UTF16 offsets using UTF16LE byte length/2. It does not call/imitate production matching regex to generate expected locations. Node compares actual diagnostics deeply including token,offset,delimiter and repeats calls to check determinism/no input mutation.','coverage':'Inline and display math; cm/m with brace whitespace; adjacent digits/variables; Korean and two nonBMP characters; proper escaped macros; all6 masked literal group commands with nested/escaped braces and escaped dollars; prose; mixed sqrt/frac/dfrac/tfrac/ldots/cdots; cross-segment source order.','falsePositiveControls':'Proper commands and literal-group contents/prose remain unflagged. Bare markers adjacent to variables are deliberately flagged per scope.','falseNegativeControls':'Every annotated explicit bare cm/m marker is found at the independent UTF16 offset, including next to variables and after literal masks.','notSemanticProof':'Intentional unquoted letter products that happen to spell the bare marker can be diagnosed too. This is a narrow authoring hold, not proof of an author intent or invalid mathematics.'},
 'actualArtifacts':{
  'oldAuthorR2':{'warningCount':5,'warningSurfaces':'choice-1..choice-5','evidence':byid['actual-r2-five-bare-unit-warnings']['detail']},
  'newAuthorAndCurrentFrozenR3':{'notationWarnings':0,'beforeAfterInputHashesUnchanged':True},
  'freezeBad':byid['actual-bad-freeze-before-directory-write']['detail'],
  'freezeCorrectedOwnedLocalOutput':byid['actual-corrected-freeze-owned-output']['detail'],
  'realOldFrozenCollectorWithSyntheticAssertions':byid['actual-old-collector-rejects-bad-q2-synthetic-green']['detail'],
  'realCurrentDongCollectorWithExistingAuthenticSealedReports':byid['actual-current-dong-collector-own-sealed-reports']['detail']
 },
 'wiring':{'observed':'candidatePack imports the current authoredMathNotation function. Real validateCandidate produces surface warnings; freeze checks those before newDirectory; evaluateReview uses notation warnings to force both mathematicalVerified and gradeReviewed false. Real currentPackage preserves warnings in a previously frozen bad pack; actual collector revalidates it and retains the hold.','surfaceRoutingCases':16,'routingLimit':'Existing host scans stem, choices, answer and studentSolution. This audit does not claim automatic coverage of arbitrary TeX/SVG/figure-label/hint fields or all7 semantic student surfaces.','syntheticLabels':'All-green solves/reviews for old package are synthetic fixtures only. They intentionally borrow author answer values to test guard wiring and are not independent student solves, grade approvals, Git-sealed pre-exposure proofs or new manual counts. The unchanged q1 synthetic control can return math/grade true because attestations are trusted; old bad q2 returns false/false.','noValidationMocks':True,'actualCurrentSubset':'Actual current DaeguDong q01/q02 collection only:2math/2grade from previously sealed human reports. DaeguBuk current raw/report are protected by hash/Git checks but not recollected in this narrower U56 artifact scope.'},
 'findings':{'concreteProductionFaultsObserved':0,'ownControlFailures':0,'oldBadDraftIsInputDefect':'The old five legal-TeX-looking bare unit markers are held as an old input defect; no current source rewrite or automatic repair was performed.','fixtureVsSource':'Positive surface controls explicitly construct proper escaped commands in synthetic in-memory inputs. This is fixture creation, not a production text repair. No dollar-replacement expectation mistake occurred in this run; earlier U54 fixture correction remains preserved in prior committed evidence.'},
 'limits':[
  'No general TeX validation: an unmatched dollar segment is not diagnosed by this bounded matcher. No automatic correction is performed.',
  'Only baremathrm{cm}/mathrm{m} with optional whitespace is added. Units such as kg/mm,uppercase units or compound unit contents are outside this new rule and zero warnings certify nothing about them.',
  'Literal masking is limited to proper text/texttt/textrm/textsf/mathrm/operatorname groups. It is not a complete macro expansion, quoted-string or TeX grammar parser.',
  'No mathematical relation truth, physical positivity/unit semantics, student grade placement, rights, exact live family, whole-source identity, native parity/loadability or public release approval follows from diagnostics.',
  'Full copied reviewWorkflow test was intentionally not run: its compose-image-figure import was not supplied. No fallback import or repository enumeration occurred. Parent regression counts are not this own run count.',
  'Current actual collector2/2 preserves existing prior review findings; no new student problem, blind solve or grade approval count. Overall/loadable remain0 and productionWrites false.',
  'Synthetic local candidate/pack/proof/report copies contain question material and remain local only. They are excluded from Git together with all runtime copies and original inputs.'
 ],
 'preservation':{'completedRawCommit':'3a496d7669cda8c18859b351e7ca851d609c9c81','completedReviewCommit':'eb4053d06d160dba787b8ac0d42840158598be02','sourceRuntimeDataActualArtifactRawReportEdits':0,'noDbApiOrModelCalls':True,'noNewWorktreesOrWorkers':True,'modelUnchanged':True},
 'reproduction':['python <prefix>/own-prepare.py','node <prefix>/own-controls.mjs','python <prefix>/own-finalize.py'],'reproductionNote':'Controls require fresh own-local-fixtures output path and write only owned local fixture outputs; never reuse supplied original paths for outputs.',
 'evidenceHashes':{f.name:h(f) for f in sorted(p.glob('own-*')) if f.is_file() and f.name not in ['own-audit-report.json','own-file-hashes.json']}
}
with (p/'own-audit-report.json').open('x',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2);f.write('\n')
files={f.name:h(f) for f in sorted(p.glob('own-*')) if f.is_file() and f.name!='own-file-hashes.json'}
(p/'own-file-hashes.json').write_text(json.dumps(files,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'reportSha256':h(p/'own-audit-report.json'),'ownFiles':len(files)+1,'tests':results['summary'],'beforeAfterPreserved':True},indent=2))

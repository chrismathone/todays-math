import json,hashlib,subprocess
from pathlib import Path
p=Path('.qa-artifacts/exam-resume-20261008/vector-replay-code-audit-20261020-r1')
def sha(b):return hashlib.sha256(b).hexdigest()
probe=p/'own-r1-followup-utf8-probe.txt'
with probe.open('x',encoding='utf-8') as f:f.write('후속 봉인 확인: 기존 증거 바이트 보존.\n')
assert probe.read_text(encoding='utf-8')=='후속 봉인 확인: 기존 증거 바이트 보존.\n'
original=p/'own-report.json'; original_commit='a85046448ef9121bca09f82a7b7b49eda6f2c8dd'; follow_commit='c18a42497bdb5e05c6500ce7d88b6539f4153be3'
sealed=subprocess.check_output(['git','show',original_commit+':'+original.as_posix()])
assert sealed==original.read_bytes()
follow=p/'own-r1-technical-hold.json'; followsealed=subprocess.check_output(['git','show',follow_commit+':'+follow.as_posix()]);assert followsealed==follow.read_bytes()
scope=json.loads((p/'provided-code-scope.json').read_text(encoding='utf-8-sig'))
checks=[]
for f in scope['files']:
 current=sha(Path(f['path']).read_bytes());assert current==f['sha256'];checks.append({'path':f['path'],'expected':f['sha256'],'current':current,'unchanged':True})
r={'kind':'u51-r1-sealed-followup-binding/v1','status':'technical-hold','priorEvidenceImmutable':{'commit':original_commit,'path':original.as_posix(),'sha256':sha(sealed),'exactGitBytesMatch':True},'independentReproductionImmutable':{'commit':follow_commit,'path':follow.as_posix(),'sha256':sha(followsealed),'exactGitBytesMatch':True},'ownDynamicEvidence':'One additional own fixture/actual renderer scheduling injection was already committed in c18a42497. It returned reproduced and inputsUnchanged:true while expected SVG binding hash differed from later inputHashes. Parent reproduction was not counted as own. No new dynamic test or approval count in this binding addendum.','cwdAssessment':'Static provenance concern only: module-relative CLI/core/TS imports can differ from CWD-relative source fingerprints/vendor/Python path; frozen R1 lacks module-owning-worktree/CWD equality guard. No alternate-CWD positive CLI executed.','rootSevenSourceChecks':checks,'preservedConclusion':'Prior 28 bounded controls remain observed passes, but do not remove binding-to-snapshot technical hold. R2 must separately test binding/spec bytes and CWD identity after patch.','filesChanged':'Only new own-r1-followup-* files. Existing a850/c18 files remain byte-identical.','mathematicalApproval':False,'gradeApproval':False,'rightsApproval':False,'nativeReaderParity':False,'loadable':False,'newManualQuestions':0,'dbWrites':0}
with (p/'own-r1-followup-addendum.json').open('x',encoding='utf-8') as f:json.dump(r,f,ensure_ascii=False,indent=2);f.write('\n')
print(json.dumps({'originalReportSha256':sha(sealed),'followupAddendumSha256':sha((p/'own-r1-followup-addendum.json').read_bytes()),'rootFilesUnchanged':len(checks)}))

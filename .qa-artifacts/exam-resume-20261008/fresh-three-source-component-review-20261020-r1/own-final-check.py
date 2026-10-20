from pathlib import Path
import json,hashlib
p=Path('.qa-artifacts/exam-resume-20261008/fresh-three-source-component-review-20261020-r1');read=lambda f:json.loads(f.read_text(encoding='utf-8-sig'));h=lambda f:hashlib.sha256(f.read_bytes()).hexdigest()
b=read(p/'own-input-before.json');m=read(p/'input-manifest.json');a=[{'path':x['path'],'sha256':h(p/x['path']),'bytes':(p/x['path']).stat().st_size} for x in m['inputs']];assert a==b['files'] and h(p/'input-manifest.json')==b['manifestSha256']
s=read(p/'own-source-component-review.json');g=read(p/'own-grade-method-proposals.json');assert len(s['components'])==len(g['components'])==9
assert len(s['actionable']['componentDataConsistentAsProvided'])==5 and len(s['actionable']['requiresLocalNormalizationProposalReview'])==4
assert all(len(x['all7SurfacePlans'])==7 and not x['finalGradeApproved'] and x['liveFamilyKey'] is None for x in g['components'])
assert all(not x['sourceIdentity'] and not x['rightsApproved'] and not x['unitFamilyFit'] and not x['loadable'] for x in s['components'])
receipt={'manifestSha256':h(p/'input-manifest.json'),'inputFilesAfter':a,'all14InputHashesUnchanged':True,'all9HaveSevenConditionalSurfacePlans':True,'finalGradeApprovals':0,'rightsApprovals':0,'liveFamilyApprovals':0,'newTwins':0,'answersComputedOrAuthored':0,'localOriginalProposalsNotForGit':[x['localOnlyFile'] for x in read(p/'own-source-check-receipt.json')['localOnlyProposals']],'localPrimaryHtmlNotForGit':'own-primary-kosac.local.html','oldCodeAuditReportsModified':False}
(p/'own-final-check-receipt.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
files={f.name:h(f) for f in sorted(p.glob('own-*')) if f.is_file() and '.local.' not in f.name and f.name!='own-file-hashes.json'}
(p/'own-file-hashes.json').write_text(json.dumps(files,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'sourceReportSHA256':h(p/'own-source-component-review.json'),'gradeReportSHA256':h(p/'own-grade-method-proposals.json'),'ownStageEligibleFiles':list(files),'allInputsUnchanged':True},indent=2))

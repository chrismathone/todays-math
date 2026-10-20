from pathlib import Path
import json,hashlib,difflib
P=Path(__file__).resolve().parent;Q=P.parent;read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'));sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();S=read(P/'provided-scope.json');R=Path(S['root']);pre=Q/'m3-method-grade-gate-prechange-audit-20261020-r1';paths=[];checks=[]
def ck(n,v):checks.append({'name':n,'pass':bool(v)})
for spec in S['sourceFiles']:
 root=R/spec['path'];copy=P/'provided-code'/spec['path'];paths.extend([root,copy]);ck('root-copy/'+spec['path'],sha(root)==sha(copy)==spec['sha256'])
for key in ['privateGenerated32','oldCaptured32','prechangeReport','parentTests','parentLint','scopedTypes','actualCurrent174Index','binding174And295']:
 v=S[key];p=(P/'private/generated32.json') if key=='privateGenerated32' else R/v['path'];paths.append(p);ck('provided-'+key,sha(p)==v['sha256'])
for name in ['inverseRootTable.ts','inverseMinimum.ts','inverseTangentRectangle.ts']:paths.append(R/'src/lib/examStudy/families/middle'/name)
paths+=list(pre.glob('own-*'));primary=R/'.qa-artifacts/exam-resume-20261008/inverse-coefficient-engine-audit-20261019-r1/official-grade-evidence.json';paths.append(primary)
# Metadata-only indexes authorize byte hashes, never parse candidate/report bodies or group4newprivate.
index=read(R/S['actualCurrent174Index']['path']);binding=read(R/S['binding174And295']['path']);candidates=[c for g in index['groups'] for c in g['candidates']];ck('current-index174',len(candidates)==174);referenceRows=[]
def resolve(p):
 rel=p.replace(chr(92),'/');rel='.qa-artifacts/'+rel.split('.qa-artifacts/',1)[1];assert 'gachang-group4' not in rel,'scopeconflict newgroup4 path';target=(R/rel).resolve();assert target.is_relative_to(R.resolve());return target
for c,row in zip(candidates,binding['rows']):
 file=resolve(c['candidate']['path']);paths.append(file);ck('candidate-hash/'+c['twinExternalId'],sha(file)==c['candidate']['sha256']==row['candidate']['sha256']);ck('index-binding-id/'+c['twinExternalId'],c['twinExternalId']==row['id'])
 rev=c.get('review')
 if not isinstance(rev,dict):continue
 for field in ['report','verificationManifest','blindManifest','solve','seal']:
  v=rev[field];file=resolve(v['path']);paths.append(file);referenceRows.append({'id':c['twinExternalId'],'field':field,'path':str(file.relative_to(R)),'expectedSHA256':v['sha256'],'actualSHA256':sha(file),'pass':sha(file)==v['sha256']})
ck('standard-review295',len(referenceRows)==295 and all(x['pass'] for x in referenceRows));ck('binding-295-count',binding['currentReviewFileReferences']==295)
# Raw-only bytes are authorized preservation evidence; no group4private/source/authoring read.
for n in [7,8]:paths.append(Q/f'gachang-group4-review-20261020-r1/blind/solve/q{n:02}.json')
before={str(p):sha(p) for p in paths if p.is_file()};(P/'own-before.json').write_text(json.dumps(before,indent=2),encoding='utf-8');(P/'own-hash-bindings.json').write_text(json.dumps({'checks':checks,'counts':{'assertions':len(checks),'passed':sum(x['pass'] for x in checks),'failed':sum(not x['pass'] for x in checks)},'candidateRecords':len(candidates),'standardReferenceOccurrences':len(referenceRows),'standardReferenceUniqueFiles':len(set(x['path'] for x in referenceRows)),'fields':['report','verificationManifest','blindManifest','solve','seal'],'hashOnlyNoBodyRereview':True,'noNewGroup4AuthorPrivateSourceRead':True,'references':referenceRows},ensure_ascii=False,indent=2),encoding='utf-8');assert all(c['pass'] for c in checks);print(json.dumps({'bindings':len(before),'checks':len(checks),'candidateRecords':len(candidates),'standardReferences':len(referenceRows),'failures':0}))

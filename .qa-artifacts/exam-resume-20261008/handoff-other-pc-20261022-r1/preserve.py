"""Capture unfinished files and retain ignored local evidence outside both worktrees."""
from pathlib import Path
import datetime,gzip,hashlib,json,os,shutil,stat,subprocess,sys
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
WORKER=ROOT.parent/'exam-twin-source-identity-20261008'
VAULT=Path('C:/Users/user/orca/artifacts/outputs/exam-handoff-20261022-r1')
assert ROOT.name=='exam-extraction-resume-20261008'and WORKER.parent==ROOT.parent
VAULT.mkdir(parents=True,exist_ok=True)
def git(root,*args):return subprocess.check_output(['git','-C',str(root),*args])
def sha(raw):return hashlib.sha256(raw).hexdigest()
def file_sha(path):
    h=hashlib.sha256()
    with path.open('rb')as f:
        for block in iter(lambda:f.read(1024*1024),b''):h.update(block)
    return h.hexdigest()
def write(path,value):path.write_bytes((json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode())
spec={'parent':['src/__tests__/unit/middleM3Stat2.test.ts'],'worker':['scripts/import/exam-twin/candidatePack.mjs','scripts/import/exam-twin/review-exam-twins.mjs','scripts/import/exam-twin/curriculumDeclarations.mjs','scripts/import/exam-twin/curriculumDeclarations.test.mjs']}
manifest={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'scope':'USER_HANDOFF_OTHER_PC_LOCAL_EXECUTION_STOPPED','vault':str(VAULT),'roots':{},'files':[],'verifiedEngineApprovalsAdded':0,'newQuestions':0,'dbWrites':0}
for label,root in [('parent',ROOT),('worker',WORKER)]:
    head=git(root,'rev-parse','HEAD').decode().strip()
    branch=git(root,'branch','--show-current').decode().strip()
    manifest['roots'][label]={'path':str(root),'head':head,'branch':branch}
    for rel in spec[label]:
        raw=(root/rel).read_bytes();target=OUT/'wip'/label/rel;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
        r=subprocess.run(['git','-C',str(root),'show',head+':'+rel],capture_output=True)
        baseline=r.stdout if r.returncode==0 else None
        if baseline is not None:
            base=OUT/'baselines'/label/rel;base.parent.mkdir(parents=True,exist_ok=True);base.write_bytes(baseline)
        manifest['files'].append({'owner':label,'path':rel,'stored':target.relative_to(ROOT).as_posix(),'sha256':sha(raw),'bytes':len(raw),'baseLF_SHA256':sha(baseline.replace(b'\r\n',b'\n'))if baseline is not None else None,'baselineHead':head,'status':'UNVERIFIED_WIP_DO_NOT_TREAT_AS_ENGINE_APPROVAL'})
    patch=OUT/(label+'-tracked-wip.patch');patch.write_bytes(git(root,'diff','--binary','--unified=0','--',*spec[label]))
write(OUT/'wip-manifest-r1.json',manifest)
write(VAULT/'wip-manifest-r1.json',manifest)
source=Path('D:/math-figure-editor');commit=git(source,'rev-parse','a32662c').decode().strip()
ack={'sourceCommit':commit,'sourceRepo':str(source),'sourceWrites':0,'reportedBySourceOwner':{'tests':126,'browserExternalRequests':0,'browserPageErrors':0,'typeAndProductionBuildPassed':True,'nativeVersion':'0.1.27','nativeReceipt':'baaa421'},'alreadyAppliedUpstreamDoNotReapply':True,'inertFix':'27ac9fc','newImplementationRequiredByThisAck':False}
for rel in ['docs/export/todays-math/UPDATE-2026-10-22.md','src/components/unified/figure-editor/FigureMathEditor.tsx']:
    raw=git(source,'show',commit+':'+rel);p=OUT/'source-ack-a32662c'/rel;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
    ack.setdefault('files',[]).append({'path':rel,'sha256':sha(raw)})
write(OUT/'source-ack-a32662c.json',ack)
records=[];skipped=[];hardlinks=copies=0
skipNames={'node_modules','.git','.next','__pycache__','.venv','npm-cache-private','npm-cache','coverage'}
for label,root in [('parent',ROOT),('worker',WORKER)]:
    tracked={p for p in git(root,'ls-files','-z').decode('utf-8').split('\0')if p}
    for current,dirs,files in os.walk(root,followlinks=False):
        here=Path(current)
        keep=[]
        for name in dirs:
            p=here/name;rel=p.relative_to(root).as_posix()
            reparse=bool(p.lstat().st_file_attributes&stat.FILE_ATTRIBUTE_REPARSE_POINT)
            if name in skipNames or name.startswith('.vite')or reparse or p==OUT:
                skipped.append({'owner':label,'path':rel,'reason':'dependency/cache/reparse-point or current handoff folder'});continue
            keep.append(name)
        dirs[:]=keep
        for name in files:
            p=here/name;rel=p.relative_to(root).as_posix()
            if rel in tracked or name=='.git' or p.suffix in ['.pyc','.tsbuildinfo']:continue
            if p.lstat().st_file_attributes&stat.FILE_ATTRIBUTE_REPARSE_POINT:
                skipped.append({'owner':label,'path':rel,'reason':'file reparse point; shared target preserved'});continue
            dst=VAULT/'ignored-evidence'/label/rel;dst.parent.mkdir(parents=True,exist_ok=True)
            if not dst.exists():
                try:os.link(p,dst);hardlinks+=1
                except OSError:shutil.copy2(p,dst);copies+=1
            sameFile=os.path.samefile(p,dst)
            digest=file_sha(p)
            assert p.stat().st_size==dst.stat().st_size and(sameFile or file_sha(dst)==digest),rel
            records.append({'owner':label,'path':rel,'bytes':p.stat().st_size,'sha256':digest,'sameFileHardlink':sameFile})
            if len(records)%1000==0:print(json.dumps({'preservedFiles':len(records),'MiB':round(sum(x['bytes']for x in records)/1024**2,1)}),flush=True)
backup={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'vault':str(VAULT),'rootPaths':manifest['roots'],'regularIgnoredOrUntrackedFiles':len(records),'bytes':sum(x['bytes']for x in records),'newHardlinks':hardlinks,'fallbackCopies':copies,'records':records,'excludedRegenerableOrSharedPaths':skipped,'nodeModulesJunctionTargetsUntouched':True,'sourceNOrOldArtifactsChanged':False,'GitUploadOfThisRawLocalArchive':False}
payload=(json.dumps(backup,ensure_ascii=False,indent=2)+'\n').encode()
(VAULT/'ignored-files-manifest-r1.json').write_bytes(payload)
with gzip.GzipFile(filename=str(OUT/'ignored-files-manifest-r1.json.gz'),mode='wb',mtime=0)as f:f.write(payload)
summary={k:v for k,v in backup.items()if k not in ['records','excludedRegenerableOrSharedPaths']}
summary.update(manifestSHA256=sha(payload),compressedManifestSHA256=file_sha(OUT/'ignored-files-manifest-r1.json.gz'),excludedPathCount=len(skipped))
write(OUT/'local-preservation-summary-r1.json',summary);write(VAULT/'local-preservation-summary-r1.json',summary)
for rel in ['wip','baselines','source-ack-a32662c']:
    shutil.copytree(OUT/rel,VAULT/rel,dirs_exist_ok=True)
print(json.dumps(summary,ensure_ascii=False),flush=True)

"""Retire only the two explicitly authorized, remotely archived local worktrees."""
from pathlib import Path
import argparse,datetime,hashlib,json,os,shutil,socket,stat,subprocess,time
p=argparse.ArgumentParser();p.add_argument('--plan',type=Path,required=True);p.add_argument('--owner',choices=['parent','worker'],required=True);p.add_argument('--execute',action='store_true');a=p.parse_args()
plan=json.loads(a.plan.read_text(encoding='utf-8'));vault=a.plan.parent.resolve()
assert plan['userAuthorizedOtherPcHandoffAndLocalCleanup']is True
assert socket.gethostname()==plan['computerName']
allowed=Path('C:/Users/user/orca/workspaces/todays-math').resolve()
expectedNames={'parent':'exam-extraction-resume-20261008','worker':'exam-twin-source-identity-20261008'}
target=Path(plan['worktrees'][a.owner]['path']).resolve()
assert target==allowed/expectedNames[a.owner]and target.parent==allowed
main=Path('D:/todays-math');cli=plan['orca'];info=plan['worktrees'][a.owner]
def run(cmd,timeout=60):
    r=subprocess.run(cmd,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=timeout)
    if r.returncode:raise RuntimeError(json.dumps({'command':cmd,'exit':r.returncode,'error':r.stderr[-2500:],'output':r.stdout[-2500:]}))
    return r.stdout.strip()
def git(root,*args):return run(['git','-C',str(root),*args])
def orca(*args,timeout=60):return json.loads(run([cli,*args,'--json'],timeout))
def sha(raw):return hashlib.sha256(raw).hexdigest()
record={'utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'owner':a.owner,'target':str(target),'executed':a.execute,'mainFilesWritten':0,'dbWrites':0,'branchesPreserved':True}
receipt=vault/('cleanup-'+a.owner+'-receipt-r1.json')
try:
    assert git(target,'rev-parse','HEAD')==info['head']
    remote=git(main,'ls-remote','origin','refs/heads/'+plan['featureBranch']).split()[0]
    assert remote==plan['featureHead'],'New remote work requires a fresh cleanup review'
    tag=git(main,'ls-remote','origin','refs/tags/'+plan['workerArchiveTag']).split()[0]
    assert tag==plan['worktrees']['worker']['head']
    manifest=json.loads((vault/'wip-manifest-r1.json').read_text(encoding='utf-8'))
    rows=[r for r in manifest['files']if r['owner']==a.owner]
    for r in rows:
        raw=(vault/'wip'/a.owner/r['path']).read_bytes();assert sha(raw)==r['sha256']
        blob=subprocess.check_output(['git','-C',str(main),'show',plan['featureHead']+':'+r['stored']]);assert sha(blob)==r['sha256']
        assert sha((target/r['path']).read_bytes())==r['sha256'],'Coauthor change; do not discard'
    if not a.execute:
        record['status']='REMOTE_BACKUP_AND_WIP_PREFLIGHT_PASSED_NO_DELETE'
    else:
        if a.owner=='parent':
            time.sleep(5)
            record['status']='WAITING_FOR_PARENT_IDLE_NO_DELETE_YET'
            receipt.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            waited=orca('terminal','wait','--terminal',plan['parentTerminal'],'--for','tui-idle','--timeout-ms','300000',timeout=315)
            (vault/'parent-idle-observation.json').write_text(json.dumps(waited,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
            assert waited.get('ok')is True
            result=waited.get('result',{})
            assert not result.get('timedOut',False)and not result.get('timeout',False),'Parent still active; retain worktree'
        closed=orca('terminal','close','--worktree','path:'+str(target),'--all')
        assert closed.get('ok')is True
        listed=orca('terminal','list','--worktree','path:'+str(target))
        assert not listed['result']['terminals'],'Do not remove active worktree'
        # Restore captured unfinished files only after byte-identical Git and vault backups.
        tracked=[]
        for r in rows:
            f=target/r['path'];assert f.resolve().is_relative_to(target)
            assert sha(f.read_bytes())==r['sha256']
            if r['baseLF_SHA256']is None:f.unlink()
            else:tracked.append(r['path'])
        if tracked:git(target,'restore','--worktree','--',*tracked)
        assert not git(target,'status','--porcelain'),'Unexpected dirty files; retain worktree'
        modules=main/'node_modules';assert modules.is_dir()
        checks=[modules/'next/package.json',modules/'mathlive/package.json']
        before={str(f):sha(f.read_bytes())for f in checks}
        # Unlink reparse points themselves; never recurse through shared node_modules.
        for current,dirs,files in os.walk(target,followlinks=False):
            here=Path(current);keep=[]
            for name in dirs:
                f=here/name;lexical=Path(os.path.abspath(f));assert lexical.is_relative_to(target)
                reparse=bool(f.lstat().st_file_attributes&stat.FILE_ATTRIBUTE_REPARSE_POINT)
                if reparse:os.rmdir(f);continue
                if name=='node_modules':
                    assert f.resolve().is_relative_to(target)
                    shutil.rmtree('\\\\?\\'+str(f.resolve()));continue
                keep.append(name)
            dirs[:]=keep
            for name in files:
                f=here/name
                if name!='.git'and f.lstat().st_file_attributes&stat.FILE_ATTRIBUTE_REPARSE_POINT:f.unlink()
        removed=orca('worktree','rm','--worktree','path:'+str(target),'--force',timeout=240)
        assert removed.get('ok')is True
        deadline=time.monotonic()+120
        while target.exists()and time.monotonic()<deadline:time.sleep(0.25)
        assert not target.exists(),'Orca acknowledged removal but filesystem deletion is not complete'
        assert modules.is_dir()and all(sha(Path(f).read_bytes())==h for f,h in before.items())
        branch=info['branch']
        exists=subprocess.run(['git','-C',str(main),'show-ref','--verify','--quiet','refs/heads/'+branch]).returncode==0
        if not exists:git(main,'branch',branch,info['head'])
        assert git(main,'rev-parse','refs/heads/'+branch)==info['head']
        record.update(status='REMOVED_LOCAL_WORKTREE_REMOTE_AND_LOCAL_BRANCH_PRESERVED',sharedNodeModulesManifestsUnchanged=True,orcaRemoval=removed)
except Exception as e:
    record.update(status='FAILED_RETAIN_REMAINING_WORKTREE_AND_ALL_BACKUPS',error=str(e))
    receipt.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');raise
receipt.write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(record,ensure_ascii=False),flush=True)

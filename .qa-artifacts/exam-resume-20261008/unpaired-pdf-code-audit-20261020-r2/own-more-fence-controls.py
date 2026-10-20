from pathlib import Path
import json,hashlib,ast,sys,importlib.util
sys.dont_write_bytecode=True
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');sys.path.insert(0,str(R/'scripts/import/exam-twin'));sp=importlib.util.spec_from_file_location('own_fence',R/'scripts/import/exam-twin/preflight-unpaired-pdfs.py');pf=importlib.util.module_from_spec(sp);sp.loader.exec_module(pf);rows=[]
def ck(id,expected,actual):rows.append({'id':id,'passed':expected==actual})
q=P/'own-more-fence-fixtures';q.mkdir(exist_ok=True);root=q/'own-original-root';root.mkdir(exist_ok=True);(root/'own-inside.json').write_text('{}');(q/'own-outside.json').write_text('{}')
for p,want in [(root/'own-inside.json',True),(root/'../own-outside.json',False)]:ck('actual-resolve-root-calculation-'+str(want),want,p.resolve(strict=True).is_relative_to(root.resolve(strict=True)))
out=q/'own-output';out.mkdir(exist_ok=True)
for suffix in ['original-first-page.local.png','parser-question-output.local.json','subdirectory']:
 ck('all-artifacts-inside/'+suffix,True,pf.quarantine_target(out,'safe-id','1',suffix).is_relative_to(out.resolve()))
 for i,parts in enumerate([(q/suffix,),('..',suffix),('safe-id','..','..',suffix),('C:/outside',suffix),('\\outside',suffix)]):
  try:pf.quarantine_target(out,*parts);rejected=False
  except ValueError:rejected=True
  ck('all-artifacts-reject/'+suffix+'/'+str(i),True,rejected)
# Source closure and call ownership, not a parser execution.
tree=ast.parse((R/'scripts/import/exam-twin/preflight-unpaired-pdfs.py').read_text(encoding='utf-8-sig'));main=next(n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='main');updates=[n for n in ast.walk(main)if isinstance(n,ast.Call)and isinstance(n.func,ast.Attribute)and ast.unparse(n.func)=='entry.update'];entry=next(n for n in updates if any(k.arg=='selectedPairRemainsNone'for k in n.keywords));kws={k.arg:ast.literal_eval(k.value)for k in entry.keywords}
for key in ['sourceIdentityApproved','curriculumApproved','rightsApproved','contentPairApproved','authorDistributionAllowed']:ck('source-entry-closure/'+key,False,kws[key])
ck('source-entry-zero-credit',0,kws['actualNewQuestionObservations'])
# Correct names of earlier freshly exercised checks in the 64-slot provenance map.
rebind=json.loads((P/'own-legacy64-rebind.json').read_text(encoding='utf-8-sig'));extra=json.loads((P/'own-extra-results.json').read_text(encoding='utf-8-sig'));mp={r['id']:r for r in extra['results']+rows};alias={'actual-guard-before-tool-import-and-output':'guard-before-import-output','actual-json-writer-refuses-overwrite':'actual-json-writer-overwrite','actual-json-writer-rejects-traversal':'actual-json-writer-escape','parser5-printed19-partial':'parser-five-partial'}
for r in rebind['rows']:
 key=alias.get(r['id'],r['id'])
 if key in mp:r['current']=mp[key];r['mode']='reexecuted'
 # PNG call is freshly inspected in R2; old check name describes the old split implementation, do not claim unchanged premise.
 if r['id']=='png-save-does-not-use-write-fence':r['mode']='superseded-by-current-unified-fence';r['current']=mp['actual-png-unified-fence']
rebind['freshlyReexecuted']=sum(r['mode']=='reexecuted'for r in rebind['rows']);rebind['notFreshlyReexecuted']=sum(r['mode']!='reexecuted'for r in rebind['rows']);(P/'own-legacy64-rebind-current.json').write_text(json.dumps(rebind,indent=2)+'\n',encoding='utf-8')
x={'total':len(rows),'passed':sum(r['passed']for r in rows),'failed':[r for r in rows if not r['passed']],'results':rows};(P/'own-more-fence-results.json').write_text(json.dumps(x,indent=2)+'\n',encoding='utf-8');print({k:v for k,v in x.items()if k!='results'});print({'prior64Fresh':rebind['freshlyReexecuted'],'prior64PreservedOrSuperseded':rebind['notFreshlyReexecuted']})

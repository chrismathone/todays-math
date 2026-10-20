from pathlib import Path
import sys,json,ast,collections,importlib.util,re,hashlib
sys.dont_write_bytecode=True
P=Path(__file__).resolve().parent;R=Path('C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008');rd=lambda p:json.loads(Path(p).read_text(encoding='utf-8-sig'));s=rd(P/'provided-scope.json');sys.path.insert(0,str(R/'scripts/import/exam-twin'));import unpaired_pdf_scope as m
meta=[rd(R/x['path'])for x in s['allowedMetadataOnly']];aggregate,parent,pages,alias=meta;inv=rd(s['historicalInventoryMetadataOnly']);byId={j['examId']:j for j in inv['jobs']};results=[]
def check(id,expected,actual):results.append({'id':id,'passed':actual==expected,**({}if actual==expected else{'expected':str(expected),'actual':str(actual)})})
check('pilot-two-jobs',2,len(aggregate['entries']));refs=[ref for e in aggregate['entries']for ref in e['references']];check('pilot-three-pdfs',3,len(refs));check('pilot-partial-parser-one',1,sum(x['status']=='parser-output-quarantined-unverified'for x in refs));check('pilot-scan-hold-two',2,sum(x['status']=='visual-reference-held-parser-unavailable'for x in refs))
for e in aggregate['entries']:
 check('selected-pair-none-'+e['examId'],None,byId[e['examId']]['selectedPair']);check('entry-none-preserved-marker-'+e['examId'],True,e['selectedPairRemainsNone']);
 for k in ['sourceIdentityApproved','curriculumApproved','rightsApproved','contentPairApproved','authorDistributionAllowed']:check(e['examId']+'/'+k,False,e[k])
 check(e['examId']+'/question-credit',0,e['actualNewQuestionObservations'])
for k in ['actualNewQuestionObservations','gradeApprovals','rightsApprovals','twins','dbWrites','loadable']:check('aggregate/'+k,0,aggregate[k])
check('metadata-preservation-records',True,aggregate['preserved']and all(x['beforeSha256']==x['afterSha256']for x in aggregate['preservation']))
for row in pages['rows']:
 e=next(x for x in aggregate['entries']if x['examId']==row['examId']);ref=e['references'][row['reference']-1];check(row['examId']+'/'+str(row['reference'])+'/pdf-sha',row['sourcePdfSha256'],ref['input']['sha256']);check(row['examId']+'/'+str(row['reference'])+'/image-sha',row['firstPageSha256'],ref['firstPage']['sha256']);
 if row['partialParserBoundaryHold']:check('parser5-printed19-partial',True,row['printedTotalParents']==19 and row['parserQuestionCountUnverified']==ref['parserQuestionCountUnverified']==5 and ref['questionBoundaryApproved']is False)
 if row['scanParserHold']:check('scan-no-text-hold-'+str(row['reference']),True,all(p['nativeTextCharacters']==0 for p in ref['pages']))
 for k in ['wholeSourceOrPairCertified','gradeApproved','rightsApproved','marksUsedForAnswerApproval']:check(row['examId']+'/'+str(row['reference'])+'/'+k,False,row[k])
for k in ['hwpPdfContentPairApproved','transcriptionFidelityApproved','studentCurriculumApproved','rightsApproved']:check('alias/'+k,False,alias[k])
for k in ['sourceObservationCredit','loadable','dbWrites']:check('alias/'+k,0,alias[k])
check('alias-printed-counts',21,alias['observedCommonHeader']['printedCounts']['multipleChoice']+alias['observedCommonHeader']['printedCounts']['constructedResponse']);check('alias-page-map-retained',[1,2,4,3],alias['reference1NeedsPrintedPageReordering']);check('alias-byte-not-equal',False,alias['byteIdentical'])
source=(R/'scripts/import/exam-twin/preflight-unpaired-pdfs.py').read_text(encoding='utf-8');tree=ast.parse(source);main=next(n for n in tree.body if isinstance(n,ast.FunctionDef)and n.name=='main');guard=next(n for n in main.body if isinstance(n,ast.For)and ast.unparse(n.target)=='job_id');textImport=next(n for n in main.body if isinstance(n,ast.Assign)and ast.unparse(n.targets[0])=='spec');mkdir=next(n for n in main.body if isinstance(n,ast.Expr)and ast.unparse(n.value)=='output.mkdir()');check('actual-guard-before-tool-import-and-output',True,guard.lineno<textImport.lineno<mkdir.lineno)
write=next(n for n in ast.walk(main)if isinstance(n,ast.FunctionDef)and n.name=='write');own=P/'own-fence-fixtures';own.mkdir(exist_ok=True);output=own/'own-quarantine';output.mkdir(exist_ok=True);namespace={'Path':Path,'json':json,'output':output};exec(compile(ast.Module(body=[write],type_ignores=[]),'actual-nested-write-only','exec'),namespace);inside=output/'own-inside.json';namespace['write'](inside,{'own':True});first=inside.read_bytes()
try:namespace['write'](inside,{'own':False});rejected=False
except FileExistsError:rejected=True
check('actual-json-writer-refuses-overwrite',True,rejected and inside.read_bytes()==first)
try:namespace['write'](output/'../own-outside.json',{});rejected=False
except ValueError:rejected=True
check('actual-json-writer-rejects-traversal',True,rejected)
# Resolve-root fence transplant uses actual Path operations only, own temporary metadata files.
root=own/'own-original-root';root.mkdir(exist_ok=True);(root/'own-inside.json').write_text('{}',encoding='utf-8');(own/'own-outside.json').write_text('{}',encoding='utf-8')
for raw,expected in [(root/'own-inside.json',True),(root/'../own-outside.json',False)]:check('actual-resolve-root-calculation-'+str(expected),expected,raw.resolve(strict=True).is_relative_to(root.resolve(strict=True)))
check('png-save-does-not-use-write-fence',True,any(isinstance(n,ast.Call)and isinstance(n.func,ast.Attribute)and n.func.attr=='save'and ast.unparse(n.args[0])=='first'for n in ast.walk(main)))
marked=[]
for j in inv['jobs']:
 for level in ['middle','high']:
  if type(j.get('grade'))is int and j['grade']in[1,2,3] and m.eligible_unpaired_job(j,set(),level=level,grade=j['grade']):
   for ref in m.original_pdf_candidates(j):
    if re.search(r'\(\s*답\s*\)',ref['path']):marked.append({'examId':j['examId'],'nameHash':hashlib.sha256(ref['path'].encode()).hexdigest(),'explicitMarker':'(답)'})
output={'total':len(results),'passed':sum(x['passed']for x in results),'failed':[x for x in results if not x['passed']],'results':results,'historicalEligibleAnswerMarkerRefs':marked,'pilot':'Parent-executed2jobs3PDF only. Independently checked metadata/hash bindings and closure, not original source/image fidelity. Parser5/printed19 remains partial,2 scans remain held. Alias pages correspond only by supplied parent observation, not own image read.','separateHwpFileMetadata':[{'examId':e['examId'],'hwpMetadataFiles':sum(str(f.get('ext','')).lower()=='hwp'for f in byId[e['examId']]['files'])}for e in aggregate['entries']],'fenceMethod':'Actual nested JSON writer AST transplanted into own namespace; actual Path resolve/is_relative_to on own metadata files. Not a full actual PDF parsing run; no N/renderer/read helper mocks claimed as real parsing.'};(P/'own-metadata-fence-results.json').write_text(json.dumps(output,ensure_ascii=False,indent=2)+'\n',encoding='utf-8');print(json.dumps({'total':output['total'],'passed':output['passed'],'failed':output['failed'],'historicalAdmittedAnswerMarkers':len(marked)}))

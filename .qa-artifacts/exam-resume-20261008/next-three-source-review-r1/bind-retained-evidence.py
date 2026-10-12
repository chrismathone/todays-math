"""Bind preserved local previews and unchanged question-only raw scripts."""
import pathlib,json,hashlib,datetime,sys
sys.stdout.reconfigure(encoding='utf-8')
ROOT=pathlib.Path(__file__).resolve().parent
PARENT=pathlib.Path(r'C:/Users/user/orca/workspaces/todays-math/exam-extraction-resume-20261008')
SOURCE=PARENT/'.qa-artifacts/exam-resume-20261008/next-three-extraction-r1-attempt2'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def write(p,x):p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
previews=[]
for p in sorted((ROOT/'reviewer-only').rglob('*.png')):
    previews.append({'path':p.relative_to(ROOT).as_posix(),'sha256':sha(p),'bytes':p.stat().st_size,'reviewerOnly':True,'authorInput':False,'gitAssetStaging':False,'mayContainIncidentalAnswersHandwritingCopyrightOrPersonalData':True})
write(ROOT/'local-preview-inventory.json',{'schemaVersion':1,'boundAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'previews':previews,'allFilesPreserved':True,'originalOrQuarantinePixelsNotCommitted':True})
bindings=[]
for school in ['gyeongilyeo','gyeseong','nobyeon']:
    mp=SOURCE/school/'source-manifest.json';m=json.loads(mp.read_text(encoding='utf-8-sig'))
    out=ROOT/'evidence'/f'{school}-question-scripts.json'
    write(out,{'schemaVersion':1,'sourceManifestSha256':sha(mp),'questionOnly':True,'originalAnswerOrSolution':False,'questions':[{'number':q['number'],'sourceContentDigest':q['sourceContentDigest'],'hwpAnchor':q['hwpAnchor'],'hwpScriptStem':q['hwpScriptStem'],'hwpScriptChoices':q['hwpScriptChoices'],'mathExpressions':q['mathExpressions'],'positionedSourceItems':q['positionedSourceItems']} for q in m['questions']]})
    bindings.append({'path':out.relative_to(ROOT).as_posix(),'sha256':sha(out),'sourceManifestSha256':sha(mp),'questionCount':len(m['questions'])})
write(ROOT/'raw-script-bindings.json',bindings)
docs=[pathlib.Path('D:/todays-math/AGENTS.md'),ROOT.parents[2]/'.agents/skills/typesafe-ai/SKILL.md',PARENT/'docs/planning/tracks/brief-exam-extraction-resume-20261008.md']+[PARENT/f'docs/planning/tracks/brief-exam-extraction-resume-20261008-addendum-{n}.md' for n in range(1,7)]
write(ROOT/'instruction-bindings.json',[{'path':str(p),'sha256':sha(p),'bytes':p.stat().st_size,'status':'read in original resumed task'} for p in docs])
print(json.dumps({'retainedLocalPreviews':len(previews),'rawQuestionScripts':sum(b['questionCount'] for b in bindings),'instructionsBound':len(docs)}))

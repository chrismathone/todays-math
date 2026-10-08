"""Generate only the15 owned new candidates/specs, with dated taxonomy proposals."""
from pathlib import Path
import hashlib,json,math,re,struct,sys,zlib
import fitz,olefile
from drafts import DRAFTS,NUMBERS
from author_math import evaluate,table_md
sys.stdout.reconfigure(encoding='utf8')
OUT=Path(__file__).resolve().parent;OWN=OUT.parents[2];PARENT=OWN.parent/'exam-extraction-resume-20261008'
AUTHOR='orca-codex-exam-twin-source-identity-20261008'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def load(p):return json.loads(Path(p).read_text(encoding='utf8'))
def ref(p):return {'path':Path(p).as_posix(),'sha256':sha(p)}
def save(name,d):
    p=OUT/name;assert p.resolve().is_relative_to(OUT)
    p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
source=load(OUT/'source-question-only/selected15.json');byq={q['number']:q for q in source['questions']}
tax=load(OUT/'dated-taxonomy-input.json');mathrows=evaluate();mathby={q['questionNumber']:q for q in mathrows}
save('author-calculations.json',{'authorOnly':True,'rows':mathrows,'MCchoicesChecked':60,'writtenParents':3,'originalAnswerKeyAgreementUsed':False})
curr=load(OUT/'curriculum-author-basis.json')
required_extra=['9수03-01','6수03-02','6수03-04','6수03-06']
if any(not any(p['id']==k for p in curr['provisions']) for k in required_extra):
    hp=Path(curr['primaryHwp2020_236']['path']);assert sha(hp)==curr['primaryHwp2020_236']['sha256']
    hf=olefile.OleFileIO(hp);head=hf.openstream('FileHeader').read();data=hf.openstream('BodyText/Section0').read()
    if struct.unpack_from('<I',head,36)[0]&1:data=zlib.decompress(data,-15)
    off=0;rec=0;para=0;doc=fitz.open(curr['primaryPdf']['path'])
    clean=lambda s:re.sub(r'[\s\x00-\x1f]','',s)
    while off<len(data):
        start=off;word=struct.unpack_from('<I',data,off)[0];off+=4;tag=word&1023;size=word>>20
        if size==4095:size=struct.unpack_from('<I',data,off)[0];off+=4
        value=data[off:off+size];off+=size;rec+=1
        if tag==66:para+=1
        if tag!=67:continue
        text=value.decode('utf-16le')
        codes=[k for k in required_extra if text.startswith('['+k+']') and not any(p['id']==k for p in curr['provisions'])]
        if codes:
            pages=[i+1 for i in range(len(doc)) if clean(text) in clean(doc[i].get_text())];assert len(pages)==1
            curr['provisions'].append({'id':codes[0],'hwp':{'stream':'BodyText/Section0','tag':tag,'record1based':rec,'paragraph1based':para,'offset':start,'text':text},
              'pdfPhysicalPage1based':pages[0],'pdfPrintedPage':pages[0]-4,'wholeClausePdfMatch':True})
    assert all(any(p['id']==k for p in curr['provisions']) for k in required_extra)
curr['authorStageOnly']=True;curr['independentGradeApproval']=False
save('curriculum-author-basis.json',curr);provs={x['id']:x for x in curr['provisions']}
textfile=PARENT/'src/lib/middle/m3Trig.ts';ruletext=textfile.read_text(encoding='utf8')
starts=list(re.finditer(r'\bdef\(\s*"([^\"]+)"\s*,\s*"([^\"]+)"',ruletext));ruleblocks={}
for i,m in enumerate(starts):
    key='3-2|'+m[1]+'|'+m[2];end=starts[i+1].start() if i+1<len(starts) else len(ruletext)
    ruleblocks[key]={'path':textfile.as_posix(),'sha256':sha(textfile),'startLine1based':ruletext[:m.start()].count('\n')+1,
       'endLine1based':ruletext[:end].count('\n')+1,'text':ruletext[m.start():end]}
triples=re.search(r'const TRIPLES = \[.*?\] as const;',ruletext,re.S).group()
helper='\n'.join(ruletext.splitlines()[879:932])
selectedrules={k:ruleblocks[k] for n in NUMBERS for k in DRAFTS[n]['nearby']}
save('rule-author-evidence.json',{'rules':selectedrules,'TRIPLES':triples,'triangleAreaHelper':{'path':textfile.as_posix(),'sha256':sha(textfile),'startLine1based':880,'endLine1based':932,'text':helper},
    'calculationOrRegistryIsGradePermission':False,'authorDbRead':False})

def base(points,segments,angles=None,**more):
    return {'version':2,'theme':'exam-thin','style':{'font_size':18,'angle_font_size':17,'angle_radius':16,'padding':22,'show_points':False},
        'points':points,'segments':segments,'labels':{p:p for p in points if not p.startswith('_')},**({'angles':{'angle_'+k:v for k,v in angles.items()}} if angles else {}),**more}
def right(v,a,b):return {'vertex':v,'points':[a,b],'right':True,'radius':8}
def degree(v,a,b,value,radius=23):return {'vertex':v,'points':[a,b],'label':f'${value}^\\circ$','radius':radius,'label_distance':radius+12}
def specs(n):
    rt=math.sqrt
    if n==1:return [base({'P':[0,0],'R':[168,0],'Q':[168,-49]},{'PR':['P','R'],'RQ':['R','Q'],'QP':['Q','P']},{'R':right('R','P','Q')})]
    if n==2:
        s=base({'R':[0,0],'P':[160,0],'Q':[0,-120],'_X':[205,0],'_Y':[0,-155]},
               {'axisX':['R','_X'],'axisY':['R','_Y'],'PQ':['P','Q'],'PR':['P','R'],'RQ':['R','Q']},{'R':right('R','P','Q')})
        s['labels'].update({'_X':'x','_Y':'y'});return [s]
    if n==3:return [base({'P':[0,0],'R':[140,0],'Q':[140,-14*rt(69)]},{'PR':['P','R'],'RQ':['R','Q'],'PQ':['P','Q']},{'R':right('R','P','Q')})]
    if n==4:
        radius=160;a=math.radians(40);px=radius*math.cos(a);py=-radius*math.sin(a)
        return [base({'O':[0,0],'A':[radius,0],'B':[0,-radius],'P':[px,py],'H':[px,0],'D':[radius,-radius*math.tan(a)]},
            {'OA':['O','A'],'OB':['O','B'],'OD':['O','D'],'AD':['A','D'],'PH':{'points':['P','H'],'dash':'4 3'}},
            {'H':right('H','P','O'),'A':right('A','O','D'),'O':degree('O','A','P',40)},
            circles={'c':{'center':'O','radius':radius,'draw':False}},arcs={'quarter':{'circle':'c','from':'B','to':'A','dir':'cw'}})]
    if n==7:
        k=9*12/rt(2);return [base({'P':[0,0],'Q':[2*k,0],'R':[k,-k]}, {'PQ':['P','Q'],'QR':['Q','R'],'RP':['R','P']},
            {'R':right('R','P','Q'),'P':degree('P','Q','R',45)})]
    if n==9:return [base({'P':[0,0],'R':[150,0],'Q':[150,-50*rt(3)]},{'PR':['P','R'],'RQ':['R','Q'],'PQ':['P','Q']},{'R':right('R','P','Q')})]
    if n==16:return [base({'Q':[0,0],'R':[180,0],'P':[90,-90*rt(3)],'H':[90,0]},
        {'PQ':['P','Q'],'QR':['Q','R'],'RP':['R','P'],'PH':{'points':['P','H'],'dash':'4 3'}},
        {'H':right('H','P','R'),'Q':degree('Q','R','P',60)})]
    if n==17:
        h=2.7;ground=h/math.tan(math.radians(15));scale=160/ground
        return [base({'P':[0,0],'H':[160,0],'Q':[160,-h*scale]},{'PH':['P','H'],'HQ':['H','Q'],'QP':['Q','P']},
            {'H':right('H','P','Q'),'P':degree('P','H','Q',15)})]
    if n==18:
        return [base({'B':[0,0],'C':[180,0],'F':[60,0],'D':[180,-120],'A':[0,-60*rt(3)],
             'E':[60*rt(3),-60*(rt(3)-1)],'H':[60*rt(3),0]},
             {'AB':['A','B'],'BC':['B','C'],'AC':['A','C'],'CD':['C','D'],'FD':['F','D'],'EH':{'points':['E','H'],'dash':'4 3'}},
             {'B':right('B','A','C'),'C':right('C','D','F'),'H':right('H','E','C'),'A':degree('A','B','C',60),'F':degree('F','E','C',45)},
             regions={'shade':{'boundary':[{'seg':['A','B']},{'seg':['B','F']},{'seg':['F','E']},{'seg':['E','A']}],'fill':'#eeeeee'}})]
    if n==19:return [base({'P':[0,0],'R':[160,0],'Q':[160,-120]},{'PR':['P','R'],'RQ':['R','Q'],'PQ':['P','Q']},{'R':right('R','P','Q')})]
    if n==20:return [base({'Q':[0,0],'R':[160,0],'P':[80,-80*rt(3)],'H':[80,0]},
        {'PQ':['P','Q'],'QR':['Q','R'],'RP':['R','P'],'PH':{'points':['P','H'],'dash':'4 3'}})]
    if n==21:return [base({'O':[0,0],'P':[90,-90*rt(3)],'Q':[240,0],'H':[90,0]},
        {'OP':['O','P'],'PQ':['P','Q'],'QO':['Q','O'],'PH':{'points':['P','H'],'dash':'4 3'}},
        {'H':right('H','P','Q'),'O':degree('O','Q','P',60)})]
    return []

index=[];allassets=[];dispositions=[]
for n in NUMBERS:
    d=DRAFTS[n];q=byq[n];m=mathby[n];tag=f'q{n:02}';folder=OUT/'candidates'/tag;folder.mkdir(parents=True,exist_ok=True)
    content=d['content'].replace('{TABLE5}',table_md([31,32,33,34],['sin','cos'])).replace('{TABLE6}',table_md([37,38,39,40],['cos','tan']))
    solution=d['solution'];choices=d['choices'];answer=m['choiceAnswerMark'] if choices else d['answer']
    score=q['scoreEvidence']['originalPrintedParentScore'];rubric=d.get('rubric',[])
    assert not rubric or sum(r['points'] for r in rubric)==score
    unit=next(u for u in tax['units'] if u['section']==d['unit']);families=[]
    for key in d['nearby']:
        reg=next(r for r in tax['registryEntries'] if r['key']==key)
        families.append({'registry':reg,'liveMatches':[f for f in tax['liveFamilies'] if f['family_key']=='mid:'+key],'actualRule':selectedrules[key]})
    family=d['family']
    if n==1 and not re.search(r'\[\s*7,\s*24,\s*25\s*\]',triples):family=None
    if family:
        matched=[f for f in tax['liveFamilies'] if f['family_key']==family and f['unit_id']==unit['id']];assert len(matched)==1
    artifacts=[]
    for i,spec in enumerate(specs(n),1):
        p=folder/f'stem-{i}.spec.json';save(p.relative_to(OUT),spec)
        artifacts.append({'role':'stem','specPath':p.name,'svgPath':f'stem-{i}.svg','intendedWidthMm':70})
        allassets.append({'questionNumber':n,'spec':ref(p),'svgPath':(folder/f'stem-{i}.svg').as_posix(),'intendedWidthMm':70,
            'dimensionsIntentionallyAbsent':'All necessary numeric givens are explicit in the student stem/tables; no requested dimension is dropped.'})
    standards=d['standards']+(['9수03-01'] if n==2 else [])+(['6수03-02'] if n in [4,17] else [])+(['6수03-04'] if n in [16,17,18,19,20,21] else [])
    for code in standards:assert code in provs,code
    limitations=['Independent solve and full seven-surface review pending.','Rights/native/custody/loading remain pending.','Historical taxonomy snapshot is not a currentDB assertion.']
    if n==18:limitations.append('The inverse overlap/area task requires an independent judgment against the2015 complex-measurement caution; author calculations alone do not approve it.')
    candidate={'schemaVersion':1,'questionNumber':n,'twinExternalId':f'exam-twin-gyeongsang-2025-2-mid-author-source-r1-{tag}',
       'authorId':AUTHOR,'questionType':'객관식' if choices else '서술형','score':score,'content':content,'choices':choices,'answer':answer,'solution':solution,
       'figureArtifacts':artifacts,'sourceReference':{'externalId':q['sourceQuestionId'],'sourceContentSha256':q['sourceContentDigest'],
         'sourceSchoolInternal':source['internalMetadata']['school'],'sourceExamYear':2025,'packet':source['packet'],'sourceCommit':source['sourceCommit'],
         'questionOnlyImageRefs':q['images'],'providedOriginalFileRefs':source['internalMetadata']['sourceFiles'],
         'sourceIdentityAsProvided':source['internalMetadata']['identityDecision'],'sourceManifestOrOriginalAnswerInput':False},
       'variantDelta':{'modes':d['modes'],'before':q['stem']+'\n'+q['figureGivenObservation'],'after':d['delta'],
         'sharedConcept':d['core'],'sharedProcedure':d['procedure'],'originalAnswerOrNumericalAgreementUsed':False},
       'curriculumReview':{'grade':'중3','edition':'2015','status':'author-proposed','standardCodes':standards,
         'legitimateMethodDraft':d['procedure'],'officialProvisions':[provs[k] for k in standards],
         'restrictionClauses':[p for p in curr['provisions'] if p['id'] in ['no_trig_ratio_relationships','angle_range','no_circle_proportionality','no_complex_geometry_measurement','no_formal_complex_justification']],
         'independentReviewPending':True,'authorCannotApprove':True},
       'metadata':{'grade':'중3','semester':2,'subject':'수학','source':'transformed','originProblemId':None,
          'curriculum':{'sourceExam':'2015','target':'2015','2027Republication':'requiresnew2022review'},'sourceExamYear':2025,
          'sourceSchoolInternal':'경상중','fictionalVisibleSchool':'해솔중학교','schoolReplacementMap':{'경상중':'해솔중학교'},
          'fictionalSchoolUsedInStudentText':n==21,'sourceQuestionId':q['sourceQuestionId'],'twinExternalId':f'exam-twin-gyeongsang-2025-2-mid-author-source-r1-{tag}',
          'sourceSchoolNamesInStudentSurfaces':False,'questionType':'객관식' if choices else '서술형','score':score,'parentScoreCountedOnce':True,
          'newSubpartRubric':rubric,'sourcePrintedScore':q['scoreEvidence'],'difficultyProposal':d['difficulty'],'difficultyStatus':'author-proposed',
          'difficultyEvidence':'Task operations: '+d['procedure']+'. Exact original points preserved; descriptor is not a measured difficulty claim.',
          'problemTypeProposal':None,'problemTypeStatus':'pending',
          'problemTypeEvidence':'Problem.problemType is a separate database string axis (schema example 계산/개념/활용/서술형), not a free-form core-concept label. No whole-task assignment rule was verified; unknown remains null.',
          'assignment':{'status':'proposed' if family else 'pending','unitId':unit['id'],'unitSection':unit['section'],'familyKey':family,
             'evidence':{'actualCapturedUnit':unit,'bankCapturedAt':tax['bankCapturedAt'],'snapshotOnly':True,'comparison':d['classification'],
                 'comparedRegistryEntries':families,'TRIPLESPoolCheckedForQ01':triples if n==1 else None}},
          'authorMathEvidence':{'file':'../../author-calculations.json','sha256':sha(OUT/'author-calculations.json'),'questionNumber':n},
          'sourcePacketSHA256':source['packet']['sha256'],'authorOnly':True,'independentMathApproval':False,'independentGradeApproval':False,
          'rightsApproved':False,'nativeProvenanceApproved':False,'loadable':False,'limits':limitations}}
    assert '경상' not in content+'\n'+solution+'\n'+'\n'.join(choices)
    p=folder/f'{tag}.json';save(p.relative_to(OUT),candidate)
    index.append({'questionNumber':n,'candidate':ref(p),'sourceQuestionId':q['sourceQuestionId'],'twinExternalId':candidate['twinExternalId'],
       'score':score,'assignmentStatus':candidate['metadata']['assignment']['status']})
    dispositions.append({'sourceQuestionNumber':n,'status':'authored-pending-independent-review','candidate':ref(p),'sourceScore':score,
       'gradeDisposition':'author-proposed-method-independent-review-pending','hardOutsideGradeConfirmed':False,'sourceCoreAmbiguityDetectedByAuthor':False,
       'specificHolds':limitations,'finalApprovals':{'math':False,'grade':False,'rights':False,'native':False,'load':False}})
save('candidate-index-draft.json',{'ownershipNumbers':NUMBERS,'candidates':index,'scoreSum':sum(i['score'] for i in index),'independentApproval':False})
save('assets-to-render.json',allassets);save('dispositions.json',dispositions)
print(json.dumps({'candidates':len(index),'newVectorSpecs':len(allassets),'selectedParentPoints':sum(i['score'] for i in index),'authorOnly':True}))

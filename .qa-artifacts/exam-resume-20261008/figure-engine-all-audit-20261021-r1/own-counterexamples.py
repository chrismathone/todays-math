from pathlib import Path
import copy,json
P=Path(__file__).resolve().parent
base={'version':2,'points':{'V':[100,100],'P':[200,100],'Q':[150,150]},'segments':{'VP':['V','P'],'VQ':['V','Q']},'background':'transparent'};cases=[]
for id,flag,screen in [('true-projected',True,'nonorthogonal'),('false-planar',False,'nonorthogonal'),('nonboolean-string','true','nonorthogonal'),('nonboolean-number',1,'nonorthogonal'),('nonboolean-null',None,'nonorthogonal')]:
 s=copy.deepcopy(base);s['angles']={'r':{'vertex':'V','points':['P','Q'],'right':True,'perspective':flag}};cases.append({'id':id,'input':s,'requiredRenderer':('render projected symbol per exact import' if flag is True else 'reject non90 planar or invalid boolean'),'mathEvidence':'screen dot=5000 !=0; accepted perspective never proves screen/world orthogonality or grade','runtime':'pending'})
s=copy.deepcopy(base);s['angles']={'r':{'vertex':'V','points':['P','Q'],'right':False,'perspective':True}};cases.append({'id':'perspective-without-right','input':s,'requiredRenderer':'reject','runtime':'pending'})
for id,q in [('ordinary-right',[100,200]),('coincident-ray',[100,100]),('collinear-ray',[300,100])]:
 for perspective in [False,True]:
  s=copy.deepcopy(base);s['points']['Q']=q;s['angles']={'r':{'vertex':'V','points':['P','Q'],'right':True,'perspective':perspective}};cases.append({'id':id+'-'+str(perspective),'input':s,'requiredRenderer':'render' if id=='ordinary-right' else 'reject degenerate geometry','runtime':'pending'})
for slug in ['can','cup-cylinder','cup-cone','bowl','dice','ferris-wheel','pizza']:
 s=copy.deepcopy(base);s['assets']=[{'asset':slug,'at':'V','width':30}];cases.append({'id':'known-math-object-'+slug,'input':s,'requiredRenderer':'reject stock picture substitution for geometry-known object','runtime':'pending'})
for label in ['30 m','2m','5 g','g/h','$30 m$','2 L','3 mL','3 dL','3 kL','3\u2009m','3\u00a0m']:
 cases.append({'id':'unit-variable-'+label,'label':label,'required':'preserve exact exporter presentation fixtures; rendering whitespace-based upright style is NOT proof that m/g/L is a unit rather than variable','runtime':'pending'})
for id,svg in [('forged-known','<svg viewBox="0 0 100 100"><g data-asset="house"><line x1="0" y1="0" x2="50" y2="50"/></g></svg>'),('nested','<svg viewBox="0 0 100 100"><g data-asset="house"><g data-asset="building"><path d="M0 0L50 50"/></g></g></svg>'),('script','<svg viewBox="0 0 100 100"><g data-asset="house"><script>alert(1)</script></g></svg>'),('badslug','<svg viewBox="0 0 100 100"><g data-asset="../house"><path d="M0 0L50 50"/></g></svg>')]:
 cases.append({'id':'asset-group-'+id,'svg':svg,'required':'script/badslug reject; benign syntactic group acceptance must not certify asset/body provenance or hide mathematical child editing','runtime':'pending; editor followup outside engine52 patch'})
(P/'own-pending-counterexamples.json').write_text(json.dumps({'cases':cases,'caseCount':len(cases),'executed':False,'noApprovalCredits':True},ensure_ascii=False,indent=2),encoding='utf-8');print('prepared='+str(len(cases)))

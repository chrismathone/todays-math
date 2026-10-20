from pathlib import Path
import json,hashlib
P=Path(__file__).resolve().parent; R=Path(json.loads((P/'provided-scope.json').read_text(encoding='utf-8-sig'))['root']);Q=P.parent
read=lambda p:json.loads(p.read_text(encoding='utf-8-sig'))
e=read(R/'.qa-artifacts/exam-resume-20261008/curriculum-evidence.json'); snapshot=read(R/'.qa-artifacts/exam-resume-20261008/engine-upgrade-20261019/live-family-snapshot-r2.json'); prior=read(Q/'gangbuk-first2-review-20261020-r2/own-review-evidence-r1/own-primary-receipt.json'); calc=read(P/'own-independent-comparison.json')
standards=[v for v in e['achievement_standards'] if v['code'] in ['9수02-04','9수02-05','9수02-12','9수02-13']]
assert len(standards)==4
units=snapshot['units']; unit=[v for v in units if v.get('id')=='82399e51-340d-4165-b016-3e941e65f810'];assert len(unit)==1 and unit[0]['grade']=='중3' and unit[0]['semester']==1
surfaces=[]
for v in calc['rows']:
 n=v['n'];L=v['L'];a=v['a']; forms=v['formulas']
 basis={
 'stem':f'n{n}: 상수a를일차방정식의차수조건으로역산. 인쇄두곱을전개하고양변항을정리하면 이차항계수a-{a}. 기본다항식곱셈9수02-12와방정식뜻9수02-04/13의기초학습후가능. 임의고차항등식계수법을필수화하지않음.',
 'choices':f'n{n}: MC보기없음(단답형). 선택지연산/새개념부담없고요청상수a={a}를단일문자열로응답. 이면은보기검토해당없음이며선택지존재를꾸미지않음.',
 'figuresAndTables':f'n{n}: 현재JSONfigureSpec=null,표/그림없음. 수학조건은인쇄등식으로완결. PNG나네이티브렌더미제공이므로시각검토/레이아웃인증은미수행.',
 'notation':f'n{n}: a는상수,x는미지수로구분. x²,괄호곱,음의계수/정수는기학습표기. 단위없는대수문항이고x={v["x"]}는요청답a가아닌존재확인용해. 매개변수의함수/상위과정표현불필요.',
 'answer':f'n{n}: 독립봉인답a={a}와현재생산답일치. 이차항계수a-{a}=0은앞학년일차방정식. a가다르면이차항이남으므로입력유일;남는L={L}≠0이므로방정식실제일차/해유일.',
 'studentSolution':f'n{n}: 전체저자해설의세식{forms}를자체인쇄식전개와대조. 전개→이항/동류항→a-{a}=0→L={L}≠0확인→다른a배제의완전한방법. 판별식/근의공식/근과계수/Vieta/함수판정없음. 코드도구는검산수단이고학생필수알고리즘아님.',
 'prerequisites':f'n{n}: 분배법칙·다항식곱셈9수02-12,동류항/상수/계수/차수,방정식과해9수02-04,일차방정식9수02-05,일차/이차방정식기초9수02-13을먼저학습. 실제캡처M3semester1 Unit82399e51...와전체현행방법결합으로2015M3 source2025/practice2026배정조건. 학교진도/2027M3·2022별도pending.'}
 surfaces.append({'n':n,'studentDigest':v['studentDigest'],'solutionSHA256':v['studentSolutionSHA256'],'surfaces':{k:{'status':'passed','basis':b,'evidence':{'calculationRow':n,'standards':[s['code'] for s in standards],'officialLocatorReceipt':'own-current-grade-review.json#/primary','currentPrintedAndSolutionBinding':'own-independent-comparison.json#/rows'}} for k,b in basis.items()}})
report={'kind':'current26-post-raw-seal-whole-student-method-review','primary':{'documentSHA256':prior['officialDocumentSHA256'],'PDFSHA256':'4bd2b84e978865a71d90577d8eb6240f0ecf24a9884642d627cde460d71ab88e','standards':standards,'limits':[v for v in e['official_middle_restrictions'] if v['id'] in ['no_vieta','no_complex_equation_applications','real_quadratic_roots']],'evidenceSHA256':prior['evidenceSHA256'],'priorReceiptSHA256':hashlib.sha256((Q/'gangbuk-first2-review-20261020-r2/own-review-evidence-r1/own-primary-receipt.json').read_bytes()).hexdigest(),'use':'Previously actually inspected official text/record/page is primary-location evidence, not inherited Gangbuk item approval. No new broad research/source original read.'},'placement':{'unit':unit[0],'snapshotSHA256':prior['snapshotSHA256'],'capturedOnly':True,'actualWholeMethodBasis':'Every current printed task/complete solution checked separately, elementary expansion and linear coefficient cancellation, not bandcode/school/UUID alone.','edition':'2015 source2025/practice2026 after listed prerequisites','2027M3/2022':'pending'},'items':surfaces,'counts':{'mathCompared':26,'studentGradeSurfacesPassed':182,'newManualTwins':0,'newBlindSolves':0,'publicReleaseApproval':0},'editorial':{'difficulty':'기본 proposal supported by one binomial expansion, collecting terms, single linear condition and nonzero check; no measured difficulty or score equivalence.','Korean':'뜻은자연스럽게판독가능. 반복문구의 2과/4과,계수2은/4은 등의조사는2와/4와,2는/4는으로교정권고하되원문수정없음. 수학조건/결론은명확.','visual':'No PNG/figure, no visual/reader parity claim.'},'separateHolds':{'exactLiveFamily':None,'sourceIdentity':False,'rights':False,'similarity':False,'native':False,'loadable':False,'2022':False},'gradeDecisionLimit':'This evidence supports only these26 frozen student/full-solution methods afterprerequisites. No blanket approval for future versions/allparameter domains/publicrelease.'}
(P/'own-current-grade-review.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8');print('26items/182surface decisions with individual basis written')

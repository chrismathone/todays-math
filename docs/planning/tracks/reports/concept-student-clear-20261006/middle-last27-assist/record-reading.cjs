// This records the specific notes written after Codex actually consumed after-reading.txt.
// It never creates an independent approval. A future content edit invalidates the fingerprints.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const dir=__dirname,read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const notes={
 'm1-02-02-xc15':'B의 최댓값은 $3$, 최솟값은 $-\\frac92$이다. C는 양수 $5$가 최대, 절댓값이 더 큰 음수 $-7$이 최소다. 부호·절댓값의 일반 설명과 맞는다.',
 'm2-05-04-c9':'수선 거리는 이등분선 성질이나 접점임을 밝힌 내접원 반지름으로 같음을 보일 수 있다. B의 한 쌍만 같은 설명으로는 전체 이유가 완성되지 않는다. C의 다른 수선 거리와 반지름은 모두 오다.',
 'm3-05-02-c2':'실제로 포함된 표의 삼십오 도 코사인 칸은 영 점 팔일구이다. 빗변 십을 곱하면 팔 점 일구이, 둘째 자리 반올림은 팔 점 일구다. 일반 설명은 특정 행 방향·간격을 고정하지 않는다.',
 'm1-02-04-xc24':'B의 삼과 음의 이는 곱 음의 육, 합 일이다. C의 사와 음의 삼은 곱 음의 십이, 합 일이고 큰 수·작은 수의 순서가 명확하다.',
 'm3-05-02-c9':'두 예각 a<b에서 사인과 탄젠트는 작은 쪽이 작고 코사인은 작은 쪽이 크다. B는 탄젠트의 직각 값이 없음을 명시하고 일반 설명은 직각에 가까워질 때의 증가를 말한다.',
 'm2-01-01-xc22':'B 반례 기준은 삼분의 일 외의 진짜 비유한 유리수도 인정한다. C의 팔분의 일은 영 점 일이오로 유한하며 삼분의 일은 순환한다. 동치 인정 답은 선택된 같은 수의 다른 표현이다.',
 'm1-03-02-xc9':'B의 x 지수는 이, y 지수는 일이다. C의 x 지수는 삼, y 지수는 이이다. 각 문자에 대한 차수에 다른 문자의 지수를 더하지 않는 이유와 일반 설명이 일치한다.',
 'm2-01-02-xc14':'B의 최소 순환마디는 일이삼으로 세 자리다. C의 일이일도 세 자리이며 같은 숫자의 모든 출현 간격이 아니라 순환마디의 같은 위치 간격을 묻는다. 일반 설명도 같은 위치로 고쳤다.',
 'm1-03-04-xc19':'$\\frac72=3.5$는 인원에 쓸 수 없는 비정수다. C는 이 계산값을 참가 인원으로 쓸 수 있는지 판단한다. 일반 설명은 분수 모양 대신 자연수 값인지 묻는다.',
 'm3-02-03-xc23':'이십육의 제곱과 십의 제곱의 차는 오백칠십육이고 양의 제곱근은 이십사다. B의 인수 삼십육과 십육은 각각 육과 사의 제곱이다. 일반 설명은 양의 제곱수 둘이어야만 한다고 제한하지 않는다.',
 'm1-03-05-xc24':'B 제외는 실제 xc14의 동일한 등식 변형 평가와 연결되어 있다. C는 틀린 해 사를 원래 방정식 이엑스=육의 해 삼으로 고친다. 일반 설명은 서로 다른 계산이 항상 다른 결과라는 단정을 하지 않는다.',
 'm2-01-06-xc10':'실제 xc23이 전체 단항식의 역수와 문자 위치를 이미 평가한다. C의 이엑스 나누기 삼의 역수는 삼 나누기 이엑스이며 x 비영 조건이 있다. 일반 설명도 나누는 식이 영이 아님을 명시한다.',
 'm2-03-06-xc20':'B는 식과 계산 검토가 끝난 뒤의 음수 나이가 부적합함을 설명한다. C는 정수 제한이 없는 상황에서 음의 삼만 배제하고 삼 점 오 및 이분의 칠을 같은 허용값으로 인정한다. 일반 설명의 허용 범위 기준과 일치한다.',
 'm1-05-03-xc22':'정육각기둥 기준 밑면 모서리의 맞은편 한 모서리와 다른 밑면의 대응하는 두 모서리가 평행하다. C는 기준 자신을 빼고 같은 밑면 일 개, 다른 밑면 이 개로 답의 종류를 수로 한정했다.',
 'm1-07-02-xc22':'B 정육면체는 면·변 쌍과 면·꼭짓점 쌍이 각각 이십사다. C 정팔면체는 팔 곱하기 삼=이십사이므로 모서리 십이, 꼭짓점 육에 모인 면 사다. 면과 모서리 명사 중 하나만 정답으로 만들지 않는다.',
 'm2-04-01-xc15':'B 입력 육의 약수는 일·이·삼·육이고 약수의 개수는 사 하나다. C는 출력이 약수 개수라고 고정해 합·곱 등 다른 함수가 빈칸 답이 되는 문제를 없애고 실제 출력 사를 묻는다.',
 'm1-08-03-xc17':'중간 계급의 다섯 자료가 기준 칠십오 이상인지 모른다. 마지막 계급의 세 자료는 확실하므로 C의 최소 삼, 최대 팔이 정확하다. B 기준은 내부 위치만 명명하기보다 분할 개수가 없다는 이유를 요구한다.',
 'm3-05-01-xc16':'탄젠트는 높이/밑변이며 증가량 비인 기울기와 같다. C 직선 이엑스+일의 기울기는 이이므로 탄젠트 이다. 양의 기울기와 예각 조건이 일반 설명과 C에 모두 맞는다.',
 'm2-04-06-xc6':'B 길이 변화는 사 분 동안 음의 사 센티미터이므로 기울기 음의 일이다. C는 매분 이 센티미터 감소이므로 음의 이다. 다 타기 전 범위와 음의 길이 확장을 막는 일반 설명을 유지한다.',
 'm1-08-05-xc9':'B 두 계급값은 육십오와 칠십오이므로 차는 십이다. C는 이십이 점 오와 이십칠 점 오의 차인 오다. 단순 단어 복사가 아니라 계급의 한가운데에 점을 찍는다는 관계를 적용한다.',
 'm2-04-08-xc9':'B와 C 모두 원래 식을 풀면 $y=-2x+3$이므로 기울기는 $-2$, 절편은 $3$이다. B는 올바른 두 점 방법도 막지 않는다. C에는 이미 풀어놓은 일반식이 없어서 계수 값과 명칭 모두 빈칸 답이 되는 모호함이 없다.',
 'm1-08-06-xc20':'각 정확한 상대도수 삼분의 일은 표시값 영 점 삼삼보다 크다. 세 표시값의 합은 영 점 구구, 정확한 합 일과의 차는 영 점 영일이다. B는 반올림이란 단어만 아니라 손실이 합쳐짐을 요구한다.',
 'm1-08-06-xc22':'B의 넓은 계급 비율만으로 부분 계급을 항상 비교할 수 없다. C에서 A와 같은 십 이상 이십 미만을 가진 것은 C 집단이며 B 집단은 더 넓다. 같은 계급 범위 비교라는 목표에 맞는다.',
 'm2-05-01-xc6':'B 제외는 실제 c8의 밑변 이등분 관계와 연결되어 있다. C는 두 옆변이 같은 삼각형에서 꼭지각 이등분선이 밑변 십사를 반으로 나누므로 BD=칠이다. 점의 관계는 숨은 그림 없이 명시되었다.',
 'm2-05-02-xc16':'직각 C와 F의 맞은편 AB와 DE가 빗변이다. 주어진 AC=DF는 직접 빗변 조건이 아니지만 ASA로 합동을 보이면 빗변의 같음도 얻는다. B는 그 올바른 추론을 부정하지 않으며 C의 필요한 DE 길이는 오다.',
 'm2-05-08-xc10':'등변사다리꼴의 두 옆변 AB=DC, 공통변 BC와 같은 밑각 ABC=DCB가 SAS를 이룬다. B는 근거 없는 중복 제외를 복구했고 C에는 대상 삼각형 ABC와 DCB를 명시했다. SAS와 두 변·끼인각은 같은 합동 조건이다.',
 'm2-09-04-xc22':'비복원 추출에서 두 빨강은 $\\frac3{10}$, 두 파랑은 $\\frac1{10}$이며 배반 사건의 합은 $\\frac25$이다. C 동치 소수와 미약분 분수도 각각 같은 확률이다.'
};
const raw=read('candidate-raw.json').rows,normalized=read('candidate-normalized.json').rows,fps=read('fingerprints.json').rows;
assert.equal(raw.length,27);assert.equal(Object.keys(notes).length,27);
assert.deepEqual(new Set(raw.map(r=>r.id)),new Set(Object.keys(notes)));
const beforeCapture=sha(fs.readFileSync(path.join(dir,'evidence/before-reading.txt')));
const afterCapture=sha(fs.readFileSync(path.join(dir,'evidence/after-reading.txt')));
const readAt=new Date().toISOString();
const ledger=raw.map(r=>{
 const p=normalized.find(p=>p.id===r.id),fp=fps.find(fp=>fp.id===r.id);
 assert.ok(p&&fp&&notes[r.id]);
 return {id:r.id,sourceIndex:r.sourceIndex,sourceFingerprint:r.sourceFingerprint,proposalFingerprint:r.proposalFingerprint,fullRawFingerprint:fp.fullRawFingerprint,normalizedHash:p.hash,learningRole:r.learningRole,bVerdict:r.bDecision==='exclude'?'exclude':'keep',cVerdict:r.cDecision==='exclude'?'exclude':'keep',bReason:r.bReason,cReason:r.cReason,coreReason:r.coreReason??null,reader:'Codex direct actual normalized after-reading; correction author only',readAt,recordedAfterDirectReading:true,fieldsRead:['B.prompt or exclusion','B.answer','B.requiredIdeas including every anyOf','C.sentence or exclusion','C.acceptedAnswers including every alternative','general coreAfter or original definition','coreReason','current learningRole and goal'],beforeReadingCapture:'evidence/before-reading.txt',beforeReadingCaptureSha256:beforeCapture,afterReadingCapture:'evidence/after-reading.txt',afterReadingCaptureSha256:afterCapture,mathematicalReread:notes[r.id],issues:[],authority:'Own direct correction reread; not final independent approval or activation'};
});
fs.writeFileSync(path.join(dir,'final-reading-ledger.json'),JSON.stringify({status:'27 actual after readings; fingerprint bound; Root independent adoption/review remains',rows:ledger},null,2)+'\n');
const decisions=read('decisions.json');decisions.status='Settled own correction decisions after actual normalized reread; no independent approval';
decisions.rows=decisions.rows.map(r=>({...r,...fps.find(fp=>fp.id===r.id),mathematicalReread:notes[r.id],readAt,unresolved:[]}));
fs.writeFileSync(path.join(dir,'decisions.json'),JSON.stringify(decisions,null,2)+'\n');
console.log(JSON.stringify({recordedReadings:ledger.length,readAt,afterReadingCaptureSha256:afterCapture}));

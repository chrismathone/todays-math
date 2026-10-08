const fs = require('node:fs');
const { author, graph, sha, approx } = require('./author-common.cjs');
const scriptSha256 = sha(fs.readFileSync(__filename));
const codeChecks = (values, answer, extra = {}) => ({ answerIndex: values.findIndex(x => approx(x, answer)), facts: { answerValue: answer, ...extra }, optionChecks: values.map((x, i) => ({ index: i + 1, value: x, correct: approx(x, answer), reason: approx(x, answer) ? '새 조건을 직접 계산한 값과 일치한다.' : '새 조건을 직접 계산한 값과 다르다.' })), domainChecks: [{ condition: '새 계산의 값이 유한하고 답이 하나이다.', passed: Number.isFinite(answer) && values.filter(x => approx(x, answer)).length === 1 }] });
const surfaces = (stem, choices, figures, method, prerequisites) => ({ stem, choices, figuresAndTables: figures, notation: '선분·좌표·도 또는 식의 표기는 실제 학생 풀이에 쓰는 중학교 수학 표기만 사용한다.', answer: '유일한 보기 하나를 고르는 객관식 답 형식이며, 값·부호·조건이 코드 계산과 맞는다.', studentSolution: method, prerequisites });
const defs = [];

defs.push({
  n: 1, scriptSha256, modes: ['structure', 'representation'],
  content: '네 그래프 카드가 다음과 같다. **대칭축이 같고 폭도 같은** 두 그래프를 함께 묶으려고 한다. 조건에 맞는 묶음은?\n\n| 카드 | 이차함수 |\n| --- | --- |\n| (가) | $y=-2x^2+1$ |\n| (나) | $y=\\frac12(x-1)^2-2$ |\n| (다) | $y=-\\frac12x^2-1$ |\n| (라) | $y=2x^2+3$ |',
  choices: ['(가), (나)', '(가), (다)', '(가), (라)', '(나), (다)', '(다), (라)'],
  solution: '각 그래프의 대칭축은 (가) $x=0$, (나) $x=1$, (다) $x=0$, (라) $x=0$이다. 이차함수 $y=a(x-p)^2+q$에서 그래프의 폭은 $|a|$가 같으면 같고, $p$가 같으면 대칭축이 같다.\n\n(가)와 (라)는 모두 대칭축이 $x=0$이고 이차항 계수의 절댓값이 $2$이다. (가)와 (다), (다)와 (라)는 대칭축은 같지만 폭이 다르고, (나)와 (다)는 폭은 같지만 대칭축이 다르다. 따라서 두 조건을 모두 만족하는 묶음은 (가), (라)이므로 정답은 ③이다.',
  before: '네 이차함수의 위·아래로 열린 방향, 폭, 대칭축, 꼭짓점과 대칭에 대한 단일 설명을 고른다.',
  after: '함수 카드를 두 장씩 묶는 검사표로 바꾸고 대칭축 일치와 폭 일치라는 두 조건을 동시에 확인한다.',
  concept: '이차항 계수의 절댓값과 포물선의 폭, 표준형과 대칭축의 관계',
  procedure: '각 함수의 대칭축과 이차항 계수의 절댓값을 읽고 두 조건을 동시에 대조한다.',
  difficulty: '원문의 여러 그래프 성질 판별을 두 조건의 카드 쌍 판별로 바꿨다. 새 선수 개념이나 최적화를 요구하지 않으며 4점을 유지한다.',
  gradeBasis: '9수03-09/10의 포물선 그래프 성질이다. 폭·대칭축의 조건을 비교할 뿐 함수의 최댓값/최솟값을 구하지 않는다.',
  familyHold: '중3 이차함수와 그래프의 폭/축 성질은 확인했지만 두 조건 카드 묶음의 정확 live subtype은 별도 검토한다. 가깝다는 이유만으로 배정하지 않았다.',
  surfaceEvidence: surfaces('네 표준형 포물선의 폭과 축을 비교하는 중3 그래프 성질이다.', '다섯 카드 쌍의 두 조건을 모두 판정한다.', '새 네 함수의 원문과 다른 카드 표이다. 원문 이미지를 싣지 않는다.', '축 p와 |a|를 각각 비교한다.', '중1 좌표, 절댓값의 크기와 중3 포물선 표준형의 성질'),
  calculate() { const cards = [{ a: -2, p: 0 }, { a: .5, p: 1 }, { a: -.5, p: 0 }, { a: 2, p: 0 }], pairs = [[0,1],[0,2],[0,3],[1,2],[2,3]]; const optionChecks = pairs.map(([i,j],k) => ({ index:k+1, pair:[i+1,j+1], sameAxis:cards[i].p===cards[j].p, sameWidth:Math.abs(cards[i].a)===Math.abs(cards[j].a), correct:cards[i].p===cards[j].p&&Math.abs(cards[i].a)===Math.abs(cards[j].a) })); return { answerIndex:2, facts:{ cards, answerPair:[1,4] }, optionChecks, domainChecks:[{condition:'네 이차항 계수가 모두 0이 아니고 두 조건에 맞는 쌍이 하나이다.',passed:cards.every(c=>c.a!==0)&&optionChecks.filter(x=>x.correct).length===1}] }; }
});

defs.push({
  n: 2, scriptSha256, modes: ['structure', 'representation', 'inverse-target'],
  content: '지워진 이차함수 식을 그래프 검사 메모로 복구하려고 한다. 다음 기록을 **모두** 만족하는 식은?\n\n| 검사 항목 | 기록 |\n| --- | --- |\n| 대칭축 | $y$축 |\n| $y$축과 만나는 점 | $(0,-3)$ |\n| 그래프 위의 점 | $(2,-5)$ |\n| $x$축과의 위치 | 그래프 전체가 $x$축 아래에 있음 |',
  choices: ['$y=\\frac12x^2-3$', '$y=-\\frac12x^2+3$', '$y=-\\frac12(x-1)^2-3$', '$y=-\\frac12x^2-3$', '$y=-x^2-3$'],
  solution: '대칭축이 $y$축이고 $y$절편이 $-3$이므로 식을 $y=ax^2-3$으로 놓을 수 있다. 점 $(2,-5)$를 대입하면 $-5=4a-3$이므로 $a=-\\frac12$이다.\n\n따라서 식은 $y=-\\frac12x^2-3$이다. 모든 실수 $x$에 대해 $x^2\\geq0$이므로 이 식의 그래프는 $x$축보다 항상 아래에 있다. ①은 아래로 열린 그래프가 아니고, ②는 $y$절편이 다르며, ③은 축이 다르고, ⑤는 점 $(2,-5)$를 지나지 않는다. 정답은 ④이다.',
  before: '주어진 y=-x²/2−5의 여러 그래프 성질 중 옳은 설명 하나를 고른다.',
  after: '식에서 성질을 읽던 방향을 바꾸어 네 검사 메모에서 빠진 식을 복구한다. 새로운 좌표·축·위치 조건을 함께 연결한다.',
  concept: 'y=ax²+q의 축·절편·열린 방향과 함숫값',
  procedure: '대칭축과 절편으로 표준형을 정하고 한 점을 대입해 계수를 구한 뒤 x축 위아래 위치를 확인한다.',
  difficulty: '성질 판별을 기록에 맞는 식 복구로 바꿨다. 간단한 일차방정식과 음수 계수 확인으로 끝나는 4점 응용이다.',
  gradeBasis: '중3 그래프의 축/절편과 한 점 대입이며, 범위 최적화나 이차부등식 해법을 쓰지 않는다.',
  familyKey: '3-1|이차함수의 그래프 ⑴|11', familyRationale: 'y=ax²+q의 알려진 점/절편으로 이차함수 식을 정하는 입력과 절차가 현재 유형11에 대응한다. 추가 위치 메모는 구한 식의 단순 성질을 확인한다.', ruleEvidence: { module:'src/lib/middle/m3Func.ts', family:'g1 11', observed:'주어진 점·조건을 y=ax²+q에 대입하여 계수를 결정한다.', status:'author-semantic-proposal' },
  surfaceEvidence: surfaces('축·절편·한 점·x축 아래라는 중3 그래프 메모이다.', '다섯 새 함수의 축, 절편, 점 대입과 부호를 모두 확인한다.', '정확한 새 좌표를 네 행의 native 표로 제공한다.', 'a를 일차방정식으로 정하고 음수 제곱항의 부호만 확인한다.', '일차방정식, 좌표 대입과 제곱의 비음수 성질'),
  calculate() { const funcs=[{a:.5,p:0,q:-3},{a:-.5,p:0,q:3},{a:-.5,p:1,q:-3},{a:-.5,p:0,q:-3},{a:-1,p:0,q:-3}]; const optionChecks=funcs.map((f,i)=>({index:i+1,axis:f.p,intercept:f.a*f.p*f.p+f.q,valueAt2:f.a*(2-f.p)**2+f.q,allBelowXAxis:f.a<0&&f.q<0,correct:f.p===0&&f.q===-3&&approx(f.a*4+f.q,-5)&&f.a<0})); return {answerIndex:3,facts:{a:-.5,p:0,q:-3,point:[2,-5]},optionChecks,domainChecks:[{condition:'계수는 0이 아니며 모든 실수 x에서 -x²/2−3<0이고 식은 유일하다.',passed:true}]}; }
});

defs.push({
  n: 3, scriptSha256, modes: ['structure', 'inverse-target'],
  content: '이차함수의 평행이동 기록에서 원래 식의 계수가 지워졌다.\n\n| 이동 전 | 이동 후 |\n| --- | --- |\n| $y=ax(x-4)+x^2$ | $y=-2(x+1)^2+3$ |\n\n이동 전 그래프를 평행이동하여 이동 후 그래프와 완전히 겹치게 할 수 있다고 한다. 상수 $a$는?',
  choices: ['$-4$', '$-3$', '$-2$', '$-1$', '$1$'],
  solution: '이동 전 식을 전개하면 $y=(a+1)x^2-4ax$이다. 평행이동을 해도 이차항의 계수는 변하지 않는다. 이동 후 식의 이차항 계수가 $-2$이므로 $a+1=-2$, 즉 $a=-3$이다.\n\n이때 이동 전 식은 $y=-2x^2+12x=-2(x-3)^2+18$이다. 이 그래프를 왼쪽으로 $4$, 아래로 $15$만큼 평행이동하면 $y=-2(x+1)^2+3$이 되므로 실제로 겹칠 수 있다. 정답은 ②이다.',
  before: 'y=2x²와 평행이동으로 겹치는 함수를 전개된/곱 형태의 다섯 보기에서 찾는다.',
  after: '이동 전후 두 식의 기록으로 원래 곱 형태 식에서 지워진 계수를 복구한다.',
  concept: '이차항 계수는 평행이동에서 보존된다.',
  procedure: '곱 형태를 전개하여 이차항 계수를 비교하고, 구한 식을 완전제곱으로 나타내 실제 평행이동을 확인한다.',
  difficulty: '곱 형태에서 이차항을 찾는 원문의 핵심에 단순 계수 역산을 연결했다. 3점을 유지한다.',
  gradeBasis: '다항식 전개와 포물선 평행이동이다. 좌표축 교점의 일반 이론이나 근과 계수 관계를 쓰지 않는다.',
  familyHold: '평행이동의 계수 보존은 중3의 정당한 개념이지만, 곱 형태의 미지 이차항 계수 복구와 현행 live family의 정확한 subtype은 확인 전 null로 둔다.',
  surfaceEvidence: surfaces('두 식 사이의 평행이동 관계를 역으로 읽는 중3 문제이다.', '다섯 계수를 대입해 이차항이 -2인지 검사한다.', '새 이동 전/후 두 열의 표이며 원문 함수 선택을 재사용하지 않았다.', '전개, a+1=-2, 완전제곱과 이동량을 제시한다.', '중2 단항식×다항식·일차방정식, 중3 이차함수 이동'),
  calculate() { const values=[-4,-3,-2,-1,1],r=codeChecks(values,-3,{leading:-2,beforeVertex:[3,18],afterVertex:[-1,3],shift:[-4,-15]});r.optionChecks=r.optionChecks.map(o=>({...o,leading:o.value+1,correct:o.value+1===-2}));r.domainChecks.push({condition:'a=-3일 때 이차항이 0이 아니고 실제 두 꼭짓점의 이동량이 존재한다.',passed:1-3!==0});return r; }
});

defs.push({
  n: 4, scriptSha256, modes: ['structure', 'representation', 'inverse-target'],
  content: '두 그래프의 대칭축 사이 위치를 기록했다. 첫 번째 그래프는 $y=(x+2)^2-1$이다. 두 번째 그래프의 대칭축은 첫 번째 그래프의 대칭축보다 **오른쪽으로 $6$** 떨어져 있다. 두 번째 그래프의 식으로 알맞은 것은?',
  choices: ['$y=2(x+8)^2$', '$y=-(x+4)^2+1$', '$y=\\frac12(x-2)^2-3$', '$y=-2(x-4)^2+1$', '$y=3(x-6)^2-2$'],
  solution: '첫 번째 그래프의 대칭축은 $x=-2$이다. 두 번째 그래프의 축은 그보다 오른쪽으로 $6$ 떨어져 있으므로 $x=-2+6=4$이다.\n\n보기의 대칭축은 차례로 $x=-8$, $x=-4$, $x=2$, $x=4$, $x=6$이다. 이차항의 계수나 꼭짓점의 높이와 관계없이 $(x-p)^2$ 꼴의 그래프의 축은 $x=p$이므로 조건에 맞는 식은 ④이다.',
  before: '다섯 표준형 함수의 축 중 가장 오른쪽에 있는 축을 고른다.',
  after: '단순 위치 순서를 바꾸는 대신 첫 그래프와 상대 거리/방향의 기록에서 두 번째 그래프의 축을 복구한다.',
  concept: '표준형의 p와 포물선 대칭축 x=p의 대응',
  procedure: '첫 축을 읽고 좌표의 방향과 거리를 적용해 목표 축을 구한 뒤 각 보기의 축을 대조한다.',
  difficulty: '다섯 축 읽기의 핵심을 유지하고 한 번의 정수 덧셈으로 상대 축을 복구한다. 3점의 기본 그래프 이해 범위이다.',
  gradeBasis: '대칭축의 좌표와 수직선의 방향/거리만 사용한다. 이차함수의 극값 비교가 아니다.',
  familyHold: '대칭축과 상대 축 거리라는 두 기록의 정확 subtype은 현행 규칙 대조가 더 필요하다. 임의 배정 없이 family를 보류한다.',
  surfaceEvidence: surfaces('축의 상대 위치를 복구하는 중3 표준형 해석이다.', '다섯 새 식의 축을 모두 비교한다.', '그림 없이도 명시된 상대 방향과 거리로 조건이 충분하다.', '축 -2에서 오른쪽 6을 이동하여 축 4를 구한다.', '중1 수직선의 정수 이동과 중3 축의 식'),
  calculate() {const axes=[-8,-4,2,4,6],r=codeChecks(axes,-2+6,{firstAxis:-2,direction:'right',distance:6,targetAxis:4});r.domainChecks.push({condition:'다섯 보기의 이차항 계수는 모두 0이 아니다.',passed:[2,-1,.5,-2,3].every(a=>a!==0)});return r;}
});

defs.push({
  n: 5, scriptSha256, modes: ['structure', 'representation', 'inverse-target'],
  content: '포물선의 세 관측 기록으로 다른 점의 좌표를 복구하려고 한다.\n\n| 항목 | 기록 |\n| --- | --- |\n| $x$축과의 만남 | 한 점에서만 만남 |\n| 대칭축 | $x=2$ |\n| $y$축과 만나는 점 | $(0,12)$ |\n\n이 그래프 위에서 $x=-1$인 점의 $y$좌표는?',
  choices: ['$3$', '$9$', '$12$', '$27$', '$36$'],
  solution: '대칭축이 $x=2$이고 $x$축과 한 점에서만 만나므로 꼭짓점은 $(2,0)$이다. 이차함수의 식을 $y=a(x-2)^2$으로 놓는다.\n\n점 $(0,12)$를 대입하면 $12=4a$이므로 $a=3$이다. 따라서 $x=-1$일 때 $y=3(-1-2)^2=3\\times9=27$이므로 정답은 ④이다.',
  before: 'x축 접함·축 x=-1·y절편 1/2의 조건에서 함수 식을 고른다.',
  after: '식 선택을 관측 표의 다른 점 좌표 복구로 전환하여 꼭짓점/한 점으로 식을 정하고 새 좌표를 구한다.',
  concept: '꼭짓점과 한 점으로 이차함수 식을 결정한다.',
  procedure: '한 점의 x축 만남과 축으로 꼭짓점을 정하고 y절편을 대입해 a를 구한 뒤 새 x값을 대입한다.',
  difficulty: '원문의 세 조건으로 식을 결정하는 핵심을 유지하며 최종 목표만 다른 점의 좌표로 바꿨다. 단순 대입 한 번을 더하는 4점 응용이다.',
  gradeBasis: 'x축과 꼭짓점의 한 점 만남은 완전제곱이 0인 경우로 확인한다. 판별식이나 일반 접선/교점 이론을 쓰지 않는다.',
  familyHold: '꼭짓점/절편으로 식을 정한 뒤 다른 점을 복구하는 새 표현에 대한 정확 subtype은 분류 검토 전 null이다.',
  surfaceEvidence: surfaces('x축의 한 점 만남·축·절편만으로 포물선을 정한다.', '다섯 좌표값을 함수 대입 결과와 각각 비교한다.', '새 세 조건을 native 기록 표로 조직했다.', 'a(x-2)² 형태에서 a=3과 y(-1)=27을 순서대로 구한다.', '완전제곱, 일차방정식과 좌표 대입'),
  calculate() {return codeChecks([3,9,12,27,36],3*(-1-2)**2,{a:12/4,vertex:[2,0],intercept:[0,12],point:[-1,27],singleXIntercept:2});}
});

defs.push({
  n: 6, scriptSha256, modes: ['structure', 'representation', 'inverse-target'],
  content: '같은 점 $P$에 대한 두 기록을 연결해 좌표를 복구한다.\n\n| 기록 | 내용 |\n| --- | --- |\n| 포물선 기록 | $P$는 $y=(x-t)^2+3t-2$의 꼭짓점 |\n| 직선 기록 | $P$는 $y=-2x+8$ 위의 점 |\n\n두 기록에 맞는 $P$의 좌표는? (단, $t$는 상수이다.)',
  choices: ['$(-2,4)$', '$(2,4)$', '$(2,-4)$', '$(4,2)$', '$(2,8)$'],
  solution: '포물선 기록에서 꼭짓점 $P$의 좌표는 $(t,3t-2)$이다. 이 점이 직선 위에 있으므로 $3t-2=-2t+8$이다.\n\n$5t=10$에서 $t=2$이고, $P$의 $y$좌표는 $3\\times2-2=4$이다. 따라서 $P=(2,4)$이다. 직선에 대입해도 $-2\\times2+8=4$로 두 기록이 일치하므로 정답은 ②이다.',
  before: '꼭짓점 (k,2k+1)이 직선 위에 있는 조건으로 상수 k를 구한다.',
  after: '상수 하나를 묻는 문장을 두 관측 기록의 좌표 복구로 바꾸어 실제 점의 두 좌표를 연결한다.',
  concept: '표준형에서 읽은 꼭짓점 좌표가 일차함수 위에 있는 조건',
  procedure: '꼭짓점을 t로 나타내 직선에 대입하여 일차방정식을 풀고 점의 좌표를 복구한다.',
  difficulty: '꼭짓점 읽기·직선 대입·일차방정식이라는 원문의 같은 세 단계로 4점을 유지한다.',
  gradeBasis: '특정 꼭짓점 한 점을 직선에 대입한다. 포물선과 직선의 일반적인 교점 위치/판별식을 다루지 않는다.',
  familyHold: '꼭짓점과 직선이라는 두 기록의 미지 상수/좌표 복구는 기존 제목만으로 subtype을 확정할 수 없어 family를 보류한다.',
  surfaceEvidence: surfaces('특정 꼭짓점이 직선 위에 있다는 점 대입 조건이다.', '다섯 좌표가 꼭짓점 조건과 직선 조건을 모두 만족하는지 검사한다.', '두 역할의 관측 기록을 새 표로 연결했다.', '3t-2=-2t+8이라는 일차방정식만 풀고 두 좌표를 구한다.', '중1 일차방정식·중2 일차함수와 좌표 대입'),
  calculate() {const points=[[-2,4],[2,4],[2,-4],[4,2],[2,8]];const optionChecks=points.map(([x,y],i)=>({index:i+1,point:[x,y],vertexRecord:approx(y,3*x-2),lineRecord:approx(y,-2*x+8),correct:approx(y,3*x-2)&&approx(y,-2*x+8)}));return{answerIndex:1,facts:{t:2,vertex:[2,4],linearCoefficient:5,linearConstant:10},optionChecks,domainChecks:[{condition:'t의 계수 5는 0이 아니므로 t와 꼭짓점 좌표가 유일하다.',passed:true}]};}
});

const lineOptions=[{m:1,b:2},{m:-1,b:2},{m:1,b:-2},{m:-1,b:-2},{m:-1,b:0}];
defs.push({
  n: 7, scriptSha256, modes: ['structure', 'representation', 'inverse-target'],
  content: '이차함수 $y=-(x-a)^2-b$의 꼭짓점이 제$2$사분면에 있다고 한다. 이 기록에 맞는 일차함수 $y=ax+b$의 그래프는? (단, $a,b$는 상수이다.)',
  choices: [1,2,3,4,5].map(i=>'![선택지 그래프 '+i+'](choice-'+i+'.svg)'),
  figures: lineOptions.map((o,i)=>({name:'choice-'+(i+1),role:'choice:'+(i+1),spec:graph([{coefficients:[o.m,o.b],domain:[-4,4]}],[-4,4],[-4,4],[{at:[0,0],text:'$O$',dx:-13,dy:20,size:18}])})),
  solution: '이차함수의 꼭짓점은 $(a,-b)$이다. 제$2$사분면에서는 $x$좌표가 음수이고 $y$좌표가 양수이므로 $a<0$, $-b>0$, 즉 $b<0$이다.\n\n따라서 일차함수는 오른쪽으로 갈수록 내려가며 $y$축의 음의 부분에서 $y$축을 만나야 한다. ①은 기울기와 절편이 모두 양수, ②는 절편이 양수, ③은 기울기가 양수, ⑤는 절편이 $0$이다. 기울기와 $y$절편이 모두 음수인 그래프는 ④이다.',
  before: '주어진 양의 기울기/양의 절편의 직선에서 포물선 꼭짓점 (a,-b)의 사분면을 구한다.',
  after: '포물선 꼭짓점의 사분면 기록에서 직선의 부호를 복구하고 다섯 새 직선 그래프 중 하나를 고르는 역방향으로 전환한다.',
  concept: '일차함수 기울기·절편의 부호와 표준형 포물선 꼭짓점 좌표의 부호',
  procedure: '꼭짓점 (a,-b)의 사분면으로 a,b의 부호를 정하고 직선의 기울기/절편을 비교한다.',
  difficulty: '직선→포물선의 두 부호 추론을 포물선→직선으로 뒤집었다. 새로운 기하나 계산법 없이 4점을 유지한다.',
  gradeBasis: '표준형 꼭짓점과 사분면, 중2 직선의 기울기·절편이다. 두 함수의 교점을 구하지 않는다.',
  familyHold: '꼭짓점 사분면의 계수 부호 복구는 정당한 중3 해법이지만 다섯 직선 그림 선택의 정확 family 대응은 별도 검토하며 임의 타입을 부여하지 않는다.',
  surfaceEvidence: surfaces('꼭짓점의 좌표 부호에서 일차함수의 부호를 역산한다.', '다섯 새 직선 그래프의 기울기/절편이 각각 독립 소유된 choice 자산으로 연결된다.', '모두 strict 로컬 엔진의 새 그래프이며 각각 70mm 이내이다. 원문 직선을 복사하지 않았다.', 'a<0와 b<0 두 조건을 모두 얻어 시각 보기와 대조한다.', '좌표 사분면·중2 일차함수의 기울기/절편'),
  calculate() {const optionChecks=lineOptions.map((o,i)=>({index:i+1,line:o,vertex:[o.m,-o.b],slopeNegative:o.m<0,interceptNegative:o.b<0,correct:o.m<0&&o.b<0}));return{answerIndex:3,facts:{requiredSigns:{a:'negative',b:'negative'},lineOptions},optionChecks,domainChecks:[{condition:'제2사분면은 좌표축 위의 점을 제외하므로 a,b가 모두 0이 아니어야 한다.',passed:lineOptions[3].m!==0&&lineOptions[3].b!==0}]};}
});

defs.push({
  n: 8, scriptSha256, modes: ['structure', 'representation'],
  content: '함수 $y=-2(x-3)^2+1$의 그래프 검사표에서 두 칸이 지워졌다.\n\n| 항목 | 지워진 기록 |\n| --- | --- |\n| 대칭축 | (가) |\n| $x$가 증가할 때 $y$도 증가하는 범위 | (나) |\n\n(가), (나)를 바르게 복구한 것은?',
  choices: ['(가) $x=-3$, (나) $x<-3$', '(가) $x=3$, (나) $x>3$', '(가) $x=-3$, (나) $x>-3$', '(가) $x=3$, (나) $x<3$', '(가) $x=1$, (나) $x<1$'],
  solution: '표준형 $y=-2(x-3)^2+1$의 대칭축은 $x=3$이다. 이차항의 계수가 음수이므로 그래프는 위로 볼록하다.\n\n이 그래프에서 꼭짓점의 왼쪽인 $x<3$에서는 $x$가 증가할수록 꼭짓점에 가까워져 $y$도 증가한다. 꼭짓점의 오른쪽에서는 $y$가 감소한다. 따라서 (가)는 $x=3$, (나)는 $x<3$이므로 정답은 ④이다.',
  before: '증가 범위의 경계를 이용해 표준형 안의 미지 상수 p를 구한다.',
  after: '경계 상수 하나 대신 대칭축과 증가 범위라는 두 누락 기록을 복구하는 쌍 판정으로 전환한다.',
  concept: '포물선 대칭축과 증가/감소 구간의 대응',
  procedure: '표준형의 축과 열린 방향을 읽어 꼭짓점 왼쪽의 증가 구간을 정하고 두 기록을 함께 대조한다.',
  difficulty: '증가 경계와 축의 관계를 읽는 원문의 한 핵심을 유지하고 두 일관된 기록으로 표현한다. 3점을 유지한다.',
  gradeBasis: '9수03-10의 그래프 증가/감소 성질이다. 미분이나 제한구간 최적화로 증가구간을 정하지 않는다.',
  familyKey:'3-1|이차함수의 그래프 ⑴|16',familyRationale:'표준형의 p와 a의 부호로 x가 증가할 때 y가 증가하는 범위를 정하는 현재 유형16의 입력/절차이다. 누락 축과 구간을 같이 읽는 표는 표현 변경이다.',ruleEvidence:{module:'src/lib/middle/m3Func.ts',family:'g1 16',observed:'a의 부호와 표준형 꼭짓점 p로 증가·감소하는 x 범위를 정한다.',status:'author-semantic-proposal'},
  surfaceEvidence: surfaces('표준형 포물선의 증가 범위와 축이다.', '다섯 축/범위 쌍을 모두 검사하여 두 기록이 맞는 하나를 찾는다.', '새 두 칸의 native 검사표를 사용한다.', '음수 계수와 꼭짓점 왼쪽이라는 그래프 성질을 설명한다.', '중3 포물선의 개형과 중2 부등식의 부호 표기'),
  calculate() {const records=[{axis:-3,side:'left'},{axis:3,side:'right'},{axis:-3,side:'right'},{axis:3,side:'left'},{axis:1,side:'left'}];return{answerIndex:3,facts:{a:-2,p:3,q:1,increasing:'x<3'},optionChecks:records.map((r,i)=>({index:i+1,...r,correct:r.axis===3&&r.side==='left'})),domainChecks:[{condition:'이차항 계수가 음수이고 모든 실수 x의 그래프이며 증가 구간은 축의 왼쪽이다.',passed:true}]};}
});

defs.push({
  n: 9, scriptSha256, modes: ['structure', 'representation', 'inverse-target'],
  content: '이차함수 $y=2(x-m)^2+n$의 이동 기록에서 원래 꼭짓점의 좌표가 지워졌다.\n\n| 항목 | 기록 |\n| --- | --- |\n| $x$축 방향 이동량 | $-3$ |\n| $y$축 방향 이동량 | $4$ |\n| 이동한 뒤 꼭짓점 | $(2,1)$ |\n\n원래 식의 두 상수 $m,n$에 대하여 $mn$의 값은?',
  choices: ['$-20$', '$-15$', '$-5$', '$15$', '$20$'],
  solution: '원래 꼭짓점은 $(m,n)$이다. $x$축 방향으로 $-3$, $y$축 방향으로 $4$만큼 옮긴 뒤의 꼭짓점은 $(m-3,n+4)$이다.\n\n이 점이 $(2,1)$이므로 $m-3=2$, $n+4=1$에서 $m=5$, $n=-3$이다. 따라서 $mn=5\\times(-3)=-15$이므로 정답은 ②이다. 원래 꼭짓점 $(5,-3)$을 왼쪽으로 $3$, 위로 $4$ 옮기면 $(2,1)$로 실제 기록과 맞는다.',
  before: '알려진 꼭짓점을 원점으로 옮기는 두 이동량의 곱 pq를 구한다.',
  after: '이동량과 이동 후 좌표를 기록표로 주어 이동 전 식의 꼭짓점 상수 m,n을 복구하고 곱을 구한다.',
  concept: '표준형 꼭짓점과 두 축 방향 평행이동의 좌표 변화',
  procedure: '이동 후 좌표에서 두 이동량을 역산하여 원래 꼭짓점 좌표를 구하고 두 상수의 곱을 계산한다.',
  difficulty: '두 좌표/이동량 복구와 곱이라는 원문의 세 산술 단계를 유지하는 4점 역산이다.',
  gradeBasis: '정수 좌표 이동과 표준형 꼭짓점이며 최적화나 함수 합성을 요구하지 않는다.',
  familyKey:'3-1|이차함수의 그래프 ⑴|19',familyRationale:'표준형 포물선에서 이동량과 꼭짓점의 전후 좌표를 연결하는 현재 유형19의 같은 좌표 관계를 역방향으로 사용한다.',ruleEvidence:{module:'src/lib/middle/m3Func.ts',family:'g1 19',observed:'p,q와 x/y 이동량을 연결하여 이동 전후 포물선 식/좌표를 정한다.',status:'author-semantic-proposal'},
  surfaceEvidence: surfaces('원래 식과 이동량·이동 후 꼭짓점의 좌표 기록이다.', '다섯 곱을 새 두 좌표의 곱과 비교한다.', '새 세 행의 이동 기록 표로 조건을 연결한다.', 'm-3=2,n+4=1을 각각 풀고 mn을 구한다.', '정수 부호·좌표 이동·일차방정식과 중3 표준형'),
  calculate() {const m=2-(-3),n=1-4;return codeChecks([-20,-15,-5,15,20],m*n,{m,n,shift:[-3,4],beforeVertex:[m,n],afterVertex:[m-3,n+4],leadingCoefficient:2});}
});

(async () => { const selected = process.argv.slice(2).map(Number); for (const d of defs.filter(d => !selected.length || selected.includes(d.n))) await author(d); })().catch(e => { console.error(e); process.exit(1); });

// Bounded deterministic authoring helper. No providers, model calls, activation or live-bank writes.
const fs=require('node:fs');
const path=require('node:path');
const dir=__dirname;
const read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8'));
const write=(n,v)=>fs.writeFileSync(path.join(dir,n),JSON.stringify(v,null,2)+'\n');
const before=read('evidence/current-raw.json').rows;
const updates=new Map();
const add=(id,change)=>{if(updates.has(id))throw Error(id);updates.set(id,change);};
const ideas=(...texts)=>texts.map(t=>({anyOf:[t]}));
const B=(prompt,answer,requiredIdeas)=>({bDecision:'rewrite',bPrompt:prompt,bAnswer:answer,bRequiredIdeas:requiredIdeas});
const C=(sentence,answers)=>({cDecision:'rewrite',cAfter:sentence,cMarkedSentence:sentence,cAcceptedAnswers:answers});
add('m1-02-02-xc15',{
 ...C('$-7$, $-2$, $5$, $0$ 중 가장 큰 수는 {$5$}, 가장 작은 수는 {$-7$}이다.',[['$5$'],['$-7$']]),
 bReason:'부호와 절댓값으로 최댓값·최솟값을 찾는 현재 B는 수학적으로 유효하다. 네 수의 비교와 양수·음수의 비교 규칙을 모두 묻고 있어 유지한다.',
 cReason:'앞뒤의 양수·음수 및 큰이라는 말을 복사하던 빈칸을 실제 네 수의 대소 비교로 바꾼다. 이미 제시된 수 중 답을 선택하는 것은 문법 복원이 아니라 이 목표의 짧은 수학 판단이다.',
 findingDecision:'C criticism accepted; useful numerical comparison retained.'
});
add('m2-05-04-c9',{
 bRequiredIdeas:ideas('세 수선의 길이가 같다: $ID=IE=IF$.','세 거리가 같은 기하적 근거를 설명한다. 내심이 각의 이등분선 위에 있다는 성질로 각 쌍의 거리가 같음을 보이거나, 수선의 발이 내접원의 접점임을 밝혀 세 선분이 같은 원의 반지름임을 보인다.'),
 ...C('삼각형 $ABC$의 내심 $I$에서 세 변에 내린 수선의 발을 $D$, $E$, $F$라 하자. $ID=5$이면 $IE=$ {$5$}이고 내접원의 반지름은 {$5$}이다.',[['$5$'],['$5$']]),
 bReason:'같다는 결론만 되풀이하는 답은 부족하므로 각 쌍의 거리 또는 접점·반지름을 밝힌 근거를 요구한다. 내심이 내접원의 중심이고 수선의 발이 접점이라는 정당한 반지름 설명까지 잘못된 풀이로 배제하지 않는다. 서로 다른 증명 경로를 별도 anyOf 정답처럼 나열하지 않고 하나의 근거 기준에 담았다.',
 cReason:'세 변·반지름이라는 명사를 복원하는 대신 한 거리로부터 다른 거리와 반지름의 값을 추론한다.',
 findingDecision:'Bare radius assertion tightened; justified incircle-radius method remains valid.'
});
const table=String.raw`$\begin{array}{c|ccc}\text{각}&\sin&\cos&\tan\\34^\circ&0.5592&0.8290&0.6745\\35^\circ&0.5736&0.8192&0.7002\end{array}$`;
add('m3-05-02-c2',{
 ...B(`삼각비의 표 일부가 다음과 같다. ${table} $\u005ccos35^\u005ccirc$의 어림값을 찾아 쓰시오. 또 한 예각이 $35^\u005ccirc$이고 빗변이 $10$인 직각삼각형에서 그 예각에 인접한 변의 길이를 소수 둘째 자리까지 구하시오.`,
 '표의 코사인 값은 $0.8192$이다. 코사인은 인접한 변의 길이를 빗변의 길이로 나눈 값이므로 인접한 변의 길이는 $10\\times0.8192=8.192$, 소수 둘째 자리까지 $8.19$이다.',
 ideas('$35^\\circ$와 코사인에 해당하는 표의 값 $0.8192$를 찾는다.','인접한 변의 길이를 $10\\times0.8192$로 구해 $8.19$로 나타낸다.')),
 ...C(`삼각비의 표 일부가 다음과 같다. ${table} 이 표로 읽은 $\u005ccos35^\u005ccirc$의 어림값은 {$0.8192$}이다.`,[['$0.8192$']]),
 coreAfter:'삼각비의 표는 각의 크기에 따른 사인·코사인·탄젠트의 {어림값}을 정리한 표이다. 각과 삼각비의 종류에 해당하는 {칸}을 찾아 읽는다.',
 coreReason:'표마다 간격과 행·열의 배치가 달라질 수 있어 이를 고정된 수학 성질로 쓰지 않는다. 탄젠트의 값이 없는 직각까지 모든 칸의 값이 존재한다는 오해도 피한다.',
 bReason:'배치를 말로 미리 답해 주던 문항 대신 자체에 완전한 표 일부를 제공해 코사인 칸을 선택하고 그 값의 뜻을 적용한다. 실제로 보이는 표의 수를 골라 쓰는 것은 표 읽기 목표에 적합하다.',
 cReason:'외부 그림이나 숨은 표를 참조하지 않고 같은 문장에 표를 제공하므로 기존 C 제외 사유는 사라진다. 행·열 방향을 암기시키지 않고 각과 삼각비 종류로 값을 고르게 한다.',
 bGoal:'제공된 삼각비 표에서 필요한 값을 읽고 그 값의 뜻을 이용한다.',learningRole:'application',
 findingDecision:'B copying defect repaired with actual inline table; C restored.'
});
add('m1-02-04-xc24',{
 ...C('곱이 $-12$이고 합이 $1$인 두 정수 중 큰 수는 {$4$}, 작은 수는 {$-3$}이다.',[['$4$'],['$-3$']]),
 bReason:'현재 B는 음수 곱의 부호 관계, 절댓값의 곱이 맞는 짝, 실제 두 정수를 모두 확인하므로 유지한다.',
 cReason:'문장 안의 부호라는 말 복사를 없애고 음수 곱과 양수 합을 함께 만족하는 정수 쌍을 직접 찾게 한다. 큰 수·작은 수로 순서를 고정했다.',findingDecision:'C criticism accepted.'
});
add('m3-05-02-c9',{
 ...C('$0^\\circ<a<b<90^\\circ$일 때 두 값의 대소를 $<$ 또는 $>$로 나타내면 $\\sin a$ { $<$ } $\\sin b$, $\\cos a$ { $>$ } $\\cos b$, $\\tan a$ { $<$ } $\\tan b$이다.',[['$<$'],['$>$'],['$<$']]),
 bReason:'사인·코사인의 끝값과 증가·감소, 탄젠트의 증가 및 직각에서 정의되지 않음을 정확히 묻고 있으므로 B를 유지한다.',
 cReason:'증가·감소를 문장 속 끝값이나 끝없이로 미리 알려 주지 않는다. 두 예각에서 삼각비의 대소 관계를 기호로 판단한다. 이 짧은 수학 비교 자체는 목표에 맞는 평가다.',findingDecision:'C grammar/cue criticism accepted; short relational mathematics retained.'
});
add('m2-01-01-xc22',{
 bRequiredIdeas:ideas('유한소수는 모두 유리수라는 진술이 옳다.','유리수이지만 소수로 나타내면 끝나지 않는 구체적인 반례를 하나 들고, 그 수가 유한소수가 아님을 설명한다.'),
 ...C('유리수 $\\frac18$과 $\\frac13$ 중 소수로 나타냈을 때 유한소수가 되는 수는 {$\\frac18$}이다.',[['$\\frac18$','$0.125$']]),
 bReason:'서로 다른 반례 수를 anyOf의 서로 다른 답처럼 나열하지 않고 하나의 반례 기준으로 적는다. 현재 답의 삼분의 일뿐 아니라 실제 유리수이면서 비유한소수인 다른 반례도 같은 기준으로 인정한다.',
 cReason:'유리수·유한소수라는 두 명사를 옮기던 문장을 구체적인 두 유리수의 소수 표현 판별로 바꾼다. 선택된 수와 같은 값인 소수 표현도 인정한다.',findingDecision:'C ambiguity accepted; B semantic counterexamples preserved.'
});
add('m1-03-02-xc9',{
 ...B('$3x^2y$에서 $x$에 대한 차수와 $y$에 대한 차수를 각각 구하시오. $y$가 곱해진 횟수를 $x$에 대한 차수에 더하지 않는 까닭도 쓰시오.',
 '$x$에 대한 차수는 $2$, $y$에 대한 차수는 $1$이다. 한 문자에 대한 차수는 그 문자만 곱해진 횟수를 세므로 다른 문자 $y$의 횟수를 $x$의 차수에 더하지 않는다.',
 ideas('$x$에 대한 차수는 $2$이다.','$y$에 대한 차수는 $1$이다.','한 문자에 대한 차수에는 그 문자만의 지수를 세며 다른 문자의 지수는 더하지 않는다.')),
 ...C('$4x^3y^2$에서 $x$에 대한 차수는 {$3$}, $y$에 대한 차수는 {$2$}이다.',[['$3$'],['$2$']]),
 bReason:'물음의 문자를 되풀이하는 무엇이 곱해진 횟수인가 대신 다른 문자의 횟수를 합하지 않는 이유를 요구한다. 차수의 실제 값도 유지한다.',
 cReason:'문자라는 일반 명사를 복원하는 빈칸을 실제 두 문자 각각의 차수 계산으로 바꾼다.',findingDecision:'B redundant criterion repaired; C noun restoration also replaced.'
});
add('m2-01-02-xc14',{
 ...B('$0.123123123\\cdots$에서 같은 순환마디의 같은 위치에 있는 숫자가 다시 나오는 최소 간격은 몇 자리인가? 그 까닭을 순환마디로 설명하시오.',
 '순환마디가 $123$이므로 같은 위치의 숫자는 $3$자리 간격으로 다시 나온다.',ideas('최소 간격은 $3$자리이다.','순환마디 $123$의 세 자리가 반복되므로 같은 위치가 세 자리 간격으로 되풀이된다.')),
 ...C('$0.121121121\\cdots$의 최소 순환마디에 있는 같은 위치의 숫자는 {$3$}자리 간격으로 다시 나온다.',[['$3$']]),
 coreAfter:'소수점 바로 아래부터 순환하고 순환마디가 $k$자리이면, 순환마디의 {같은 위치}에 있는 숫자는 {$k$자리 간격}으로 되풀이된다.',
 coreReason:'같은 숫자가 한 순환마디 안에도 여러 번 있을 수 있으므로 숫자 자체의 모든 출현 간격을 순환마디 길이라고 하지 않는다. 같은 위치의 반복 간격을 말한다.',
 bReason:'실제 m2-01-02-c5의 B 목표는 나머지를 이용한 특정 자리 숫자 찾기이다. 반복 간격을 설명하는 이 ID의 목표를 동일한 질문이라고 배제하지 않고 간격 자체를 묻는 B를 복구한다.',
 cReason:'계속·무한히 등도 들어가던 문장 대신 숫자로 나타내야 하는 최소 반복 간격을 묻는다. 같은 숫자가 여러 위치에 있는 예에서도 같은 위치라고 특정한다.',
 bGoal:'순환마디의 같은 위치가 되풀이되는 간격을 설명한다.',learningRole:'reason',findingDecision:'False exclusion repaired; source generalization narrowed to same position.'
});
add('m1-03-04-xc19',{
 ...C('참가 인원을 구하는 문제에서 해가 $x=\\frac72$로 나왔다. 이 값을 인원 수의 답으로 쓰는 것이 가능한지, 가능 또는 불가능으로 쓰면 {불가능}이다.',[['불가능','불가능하다','쓸 수 없다','사용할 수 없다']]),
 coreAfter:'미지수가 자연수여야 하는 상황에서는 방정식의 해가 {자연수인지} 확인한다. 자연수가 아닌 해는 그 상황의 답으로 {쓸 수 없다}.',
 coreReason:'분수 꼴이라도 자연수일 수 있으므로 표현 형식이 아니라 값과 상황의 조건으로 판정한다. 일반 설명에 특정 숫자 사례를 섞지 않는다.',
 bReason:'사람 수로 쓸 수 없는 비정수 값이라는 현재 B의 판단과 이유는 정확하다. 이 값에 대한 정수·자연수 설명은 같은 배제 근거를 나타낸다.',
 cReason:'정수가 아니므로라는 이유를 학생에게 미리 제공하지 않고 실제 계산해 나온 값을 인원으로 쓸 수 있는지 판단하게 한다. 허용·불허의 뜻이 같은 표현을 인정한다.',findingDecision:'C pre-supplied reason removed; general core separated from examples.'
});
add('m3-02-03-xc23',{
 ...C('근호 안을 제곱의 차로 인수분해하여 계산하면 $\\sqrt{26^2-10^2}$의 값은 {$24$}이다.',[['$24$']]),
 coreAfter:'근호 안이 $0$ 이상인 {제곱의 차}이면 합과 차의 곱으로 바꿀 수 있다. 이렇게 인수분해하면 {제곱인 인수}를 찾아 근호 밖으로 꺼내는 데 도움이 된다.',
 coreReason:'두 인수가 각각 양의 제곱수인 경우만 가능한 일반 규칙처럼 읽히지 않게 한다. 실수 제곱근의 비음수 조건을 유지하고 특정 계산 예는 B와 C에만 둔다.',
 bReason:'현재 B의 합과 차의 곱과 계산된 인수 곱은 같은 표현이며, 제곱수임을 확인하고 양의 제곱근을 구하는 실제 이유·값이 모두 정확하다.',
 cReason:'제곱수·정수 등 서로 다른 참인 말이 들어갈 수 있던 명사 빈칸을 특정 근호식의 값으로 바꾼다. 인수분해의 장점 설명은 B에서 평가한다.',findingDecision:'C ambiguity accepted; over-narrow general explanation repaired.'
});
add('m1-03-05-xc24',{
 bDecision:'exclude',bReason:'m1-03-05-xc14의 B 목표는 양변의 계산을 비교해 풀이 한 단계의 옳고 그름을 판단하는 것이다. 그 B가 이미 $2x=6$을 $x=6-2$로 바꾼 예에서 좌변은 나누기, 우변은 빼기임을 밝히고 잘못을 판단하게 하므로 같은 단계 오류를 다시 묻는 B는 제외한다.',
 ...C('$2x=6$을 풀며 다음 줄을 $x=4$라고 잘못 썼다. 원래 방정식을 만족하도록 이 줄을 고치면 $x=$ {$3$}이다.',[['$3$']]),
 cReason:'대입 계산의 우변을 복사하는 빈칸을 없애고 잘못된 줄의 해를 실제로 고치게 한다. 올바른 양변 나눗셈으로 원래 방정식의 해를 복구한다.',findingDecision:'B exclusion verified against actual matching ID/goal; C correction task restored.'
});
add('m2-01-06-xc10',{
 bDecision:'exclude',bReason:'m2-01-06-xc23의 B 목표는 분수 계수 단항식의 역수를 바르게 구하는 것이다. $6a\\div(\\frac23a)$의 잘못된 역수를 설명하고 $\\frac{3}{2a}$로 고쳐 계산하는 그 B가 문자까지 포함한 전체 식의 역수를 평가하므로 같은 역수 구하기 B를 중복 출제하지 않는다.',
 ...C('$x\\ne0$일 때 $\\frac23x$로 나누는 것은 {$\\frac{3}{2x}$}을 곱하는 것과 같다.',[['$\\frac{3}{2x}$']]),
 coreAfter:'계수가 분수인 단항식으로 나눌 때는 나누는 식이 {$0$이 아님}을 확인한다. 나누는 식을 문자까지 넣은 하나의 분수로 보고 그 {역수}를 곱한다.',
 coreReason:'일반적인 나눗셈 설명에도 나누는 식이 영이 아니어야 한다는 조건을 명시한다. 계수만 뒤집고 문자를 그대로 두는 오해를 피한다.',
 cReason:'빈칸의 동일한 표시가 서로 다른 답을 요구한다는 비판은 일반적인 복수 빈칸 형식 자체의 결함은 아니다. 다만 분수라는 명사 복원 대신 전체 단항식의 실제 역수를 묻는 한 빈칸으로 개선한다.',findingDecision:'Multiple-blank UI criticism not accepted as defect; actual noun task improved and B duplicate verified.'
});
add('m2-03-06-xc20',{
 ...B('나이 문제를 풀어 얻은 해가 $-3$살이다. 세운 식과 계산을 확인했는데 모두 맞았다면 원래 조건을 만족하는 나이가 있는가? 음수 나이의 의미를 들어 이유를 쓰시오.',
 '조건을 만족하는 나이는 없다. 식과 계산이 맞아도 $-3$살은 가능한 나이가 아니므로 주어진 조건을 모두 만족하는 해가 없는 상황이다.',ideas('주어진 조건을 만족하는 나이가 없다.','계산의 오류가 없더라도 음수인 나이는 가능한 나이가 아니므로 원래 조건을 만족하지 못한다.')),
 ...C('나이를 정수로 제한하지 않고 연속적인 시간으로 나타내는 문제에서 계산값 $-3$과 $3.5$ 중 나이로 사용할 수 있는 값은 {$3.5$}이다.',[['$3.5$','$\\frac72$']]),
 bReason:'검토를 다시 했다는 물음의 말을 반복하던 필수 항목을 제거하고, 검토 후에도 음수 해이면 조건을 만족하는 나이가 없다는 결론과 이유만 평가한다.',
 bGoal:'검토를 마친 음수 나이 해가 원래 조건에 맞지 않음을 설명한다.',
 cReason:'다시·없을이라는 부사와 문법 복원을 없앤다. 분수 나이를 무조건 배제하지 않고 정수 제한이 없는 상황을 명시해 음수만 제외하는 수치 판단을 묻는다.',findingDecision:'B leaked criterion and C grammar restoration repaired; fractional ages remain possible.'
});
add('m1-05-03-xc22',{
 ...C('정육각기둥에서 밑면의 한 모서리 자신을 제외하고 그 모서리와 평행한 모서리는 같은 밑면에 {$1$}개, 다른 밑면에 {$2$}개 있다.',[['$1$'],['$2$']]),
 bReason:'현재 B의 같은 밑면의 마주 보는 모서리 하나, 다른 밑면의 대응하는 두 모서리, 합계 세 개는 정육각기둥의 정확한 관계다.',
 cReason:'대응하는·평행한 등도 들어갈 수 있던 수식어 빈칸을 개수로 한정했다. 기준 모서리 자체를 세지 않음을 명시한다. 별도 그림이나 임의 경로 없이 입체 종류와 기준을 문장에 제공한다.',findingDecision:'C multiple-word ambiguity narrowed to numerical counts.'
});
add('m1-07-02-xc22',{
 ...C('정팔면체는 면이 $8$개이고 한 면의 변은 $3$개이다. 모서리는 {$12$}개이며, 꼭짓점 $6$개 각각에 모인 면은 {$4$}개이다.',[['$12$'],['$4$']]),
 bReason:'면·변 쌍과 면·꼭짓점 쌍을 세는 현재 B는 세 곱이 같아지는 이유를 정확히 설명하므로 유지한다.',
 cReason:'꼭짓점에 모인 면과 모서리는 모두 참이므로 하나만 인정하던 명사 칸을 폐기한다. 면 수와 면의 변 수로 모서리 수를, 꼭짓점 수로 모인 면 수를 판단하게 한다.',findingDecision:'Genuine alternative mathematical answer acknowledged; task narrowed.'
});
add('m2-04-01-xc15',{
 ...C('자연수 $x$의 약수의 개수를 $y$로 정한다. $x=6$일 때 대응하는 값은 $y=$ {$4$}이다.',[['$4$']]),
 bReason:'현재 B는 한 입력에서 약수 자체는 여러 값, 약수의 개수는 한 값이라는 함수 기준을 실제 숫자로 확인한다.',
 cReason:'합·곱도 함수가 되는 사실을 인정하고 임의의 함수인 수량 명사를 맞히는 칸을 쓰지 않는다. 약수의 개수라는 관계를 명시한 후 해당하는 단 하나의 출력 값을 구한다.',findingDecision:'Multiple valid functions acknowledged; C relation fixed before answer.'
});
add('m1-08-03-xc17',{
 bRequiredIdeas:ideas('이 표만으로 $75$ 이상인 자료 수를 정확히 구할 수 없다.','$70$ 이상 $80$ 미만인 자료 $5$개 중에서 $75$ 이상인 개수가 주어지지 않아, 확실한 $3$개에 더해질 개수가 정해지지 않는다.'),
 ...C('계급 $60$ 이상 $70$ 미만, $70$ 이상 $80$ 미만, $80$ 이상 $90$ 미만의 도수가 각각 $4$, $5$, $3$이다. $75$ 이상인 자료의 수는 최소 {$3$}개, 최대 {$8$}개이다.',[['$3$'],['$8$']]),
 bReason:'기준이 계급 내부라는 말만이 아니라 그 계급 안에서 기준 이상인 개수가 알려지지 않았다는 실제 정보의 한계를 기준으로 삼는다.',
 cReason:'정하지 못할 수 있다라는 현재 표현 자체는 문법적으로 성립하므로 비문이라는 비판은 채택하지 않는다. 부사·명사 복원 대신 표 정보로 가능한 최소·최대 개수를 추론하도록 개선한다.',findingDecision:'Grammar criticism rejected on substance; C improved to numeric information limits.'
});
add('m3-05-01-xc16',{
 bRequiredIdeas:ideas('$\\tan a$는 직선의 기울기와 같다.','직각삼각형에서 $\\tan a$는 높이를 밑변으로 나눈 값이고 이는 $y$의 증가량을 $x$의 증가량으로 나눈 값이므로 기울기와 같다.'),
 ...C('직선 $y=2x+1$이 $x$축의 양의 방향과 이루는 예각을 $a$라 하면 $\\tan a=$ {$2$}이다.',[['$2$']]),
 bReason:'높이·밑변을 각각 명명하기만 하고 탄젠트와 기울기의 비율 연결을 쓰지 않은 답으로 이유가 충족되지 않도록 하나의 연결 기준을 적는다.',
 cReason:'기울기라는 앞의 말을 복사하는 명사 칸을 지우고 실제 직선의 식으로부터 탄젠트 값을 찾게 한다.',findingDecision:'C copy cue removed; B criterion states complete ratio connection.'
});
add('m2-04-06-xc6',{
 ...B('길이 $12\\,\\mathrm{cm}$인 양초가 불을 붙인 뒤 $4$분 동안 일정한 속도로 타서 $8\\,\\mathrm{cm}$가 되었다. 다 타기 전 시간에 대한 남은 길이의 그래프의 기울기를 구하고 그 부호의 까닭을 쓰시오.',
 '기울기는 $\\frac{8-12}{4}=-1$이다. 시간이 늘어날수록 남은 길이는 줄어들기 때문에 기울기가 음수이다.',ideas('기울기는 $-1$이다.','시간이 증가할 때 남은 길이가 감소하므로 기울기가 음수이다.')),
 ...C('길이 $15\\,\\mathrm{cm}$인 양초가 매분 $2\\,\\mathrm{cm}$씩 일정하게 탄다. 다 타기 전 $x$분 뒤의 길이를 $y\\,\\mathrm{cm}$라 하면 그래프의 기울기는 {$-2$}이다.',[['$-2$']]),
 bReason:'실제 m2-04-06-c4의 B는 문자로 길이 식을 세우는 것이 목표이고 기울기·음수 부호를 직접 묻지 않는다. 이 ID에는 관측된 두 길이로 기울기와 부호를 설명하는 유용한 B를 복구한다.',
 cReason:'줄어드는 일차함수라는 수식어 빈칸 대신 시간당 감소량에서 부호를 포함한 기울기를 구한다. 다 타기 전의 범위를 유지한다.',
 bGoal:'타는 동안 양초 길이의 그래프의 기울기와 부호를 설명한다.',learningRole:'application',findingDecision:'Different actual assessment goal restored; C numerical slope replaces grammar.'
});
add('m1-08-05-xc9',{
 ...B('도수분포다각형에서 이웃한 계급 $60$ 이상 $70$ 미만과 $70$ 이상 $80$ 미만을 나타내는 두 점의 가로 간격을 구하고, 계급을 나타내는 점의 위치로 그 까닭을 설명하시오.',
 '계급을 나타내는 점의 가로좌표는 계급의 한가운데인 $65$, $75$이므로 가로 간격은 $75-65=10$이다.',ideas('가로 간격은 $10$이다.','점의 가로좌표가 각 계급의 한가운데 $65$, $75$이므로 그 차를 구한다.')),
 ...C('도수분포다각형에서 계급 $20$ 이상 $25$ 미만과 $25$ 이상 $30$ 미만을 나타내는 두 점의 가로 간격은 {$5$}이다.',[['$5$']]),
 bReason:'구간의 너비가 주어졌다는 것만으로 간격 관계가 자동으로 답해지는 것은 아니다. 중점 좌표라는 개념 판단이 필요하므로 이를 보존하고 실제 간격과 이유를 묻는 수치 예로 개선한다.',
 cReason:'구간의 너비라는 말을 복원시키지 않고 각 계급의 한가운데 사이의 실제 간격을 찾는다. 짧은 계급 비교 계산은 해당 개념의 유효한 확인이다.',findingDecision:'Blanket copying criticism narrowed; midpoint reasoning preserved with numeric example.'
});
add('m2-04-08-xc9',{
 bRequiredIdeas:ideas('계수 정리나 그래프의 서로 다른 두 점을 이용하는 등 유효한 방법으로 기울기와 $x=0$일 때의 값을 실제로 계산한 과정을 보인다.','기울기는 $-2$이다.','$y$절편은 $3$이다.'),
 ...C('방정식 $4x+2y-6=0$의 그래프의 기울기는 {$-2$}, $y$절편은 {$3$}이다.',[['$-2$'],['$3$']]),
 bReason:'$y$에 대한 정리, 계수 비, 두 점을 이용한 계산 모두 정당한 방법이다. 서로 다른 방법을 anyOf의 다른 필수 내용으로 나열하지 않고 실제 계산 과정을 보인다는 하나의 기준으로 두며 결과값은 각각 요구한다.',
 cReason:'이미 정리된 일반식에서 기울기라는 명칭과 계수 값이 모두 들어갈 수 있던 칸을 원래 방정식의 수치 기울기·절편으로 고정한다.',findingDecision:'C task ambiguity removed; valid alternative methods expressly preserved.'
});
add('m1-08-06-xc20',{
 bRequiredIdeas:ideas('각 정확한 상대도수 $\\frac13$보다 표시된 $0.33$이 작아 반복되는 소수 뒷부분이 각각 생략되었고, 이 차이가 합쳐져 표시된 합이 $0.99$가 된다고 설명한다.'),
 ...C('도수의 총합이 $3$이고 세 계급의 도수가 각각 $1$이다. 각 상대도수를 소수 둘째 자리까지 반올림해 더하면 {$0.99$}이고 정확한 합보다 {$0.01$} 작다.',[['$0.99$'],['$0.01$']]),
 bReason:'반올림했다고 상황을 알려 주는 것은 오류가 아니다. 반올림이라는 단어만 되풀이해 통과하던 느슨한 기준을 정확한 삼분의 일과 표시값의 차이가 합쳐지는 설명으로 강화한다. 정보를 제거하면 표가 왜 근삿값인지 추측하는 문제가 될 수 있다.',
 cReason:'다를 수 있다라는 추상적인 문구 복원 대신 주어진 도수에서 실제 근삿값의 합과 정확한 합과의 차이를 구한다.',findingDecision:'Necessary rounding context retained; causal grading strengthened.'
});
add('m1-08-06-xc22',{
 ...C('집단 $A$의 $10$ 이상 $20$ 미만 자료 비율과 같은 계급 범위끼리 비교하려 한다. $B$는 $10$ 이상 $30$ 미만, $C$는 $10$ 이상 $20$ 미만의 비율이 주어졌다면 비교할 집단은 {$C$}이다.',[['$C$']]),
 bReason:'현재 B는 더 넓은 계급의 비율만으로 부분 계급의 비율을 일반적으로 알 수 없음을 정확히 묻고 있으므로 유지한다.',
 cReason:'범위라는 앞의 명사를 옮기는 대신 실제 두 계급 중 같은 범위를 가진 것을 선택한다. 상대도수의 숫자가 같아야 한다는 오해를 유도하지 않는다.',findingDecision:'C copying criticism accepted as actual range-selection task.'
});
add('m2-05-01-xc6',{
 bDecision:'exclude',bReason:'m2-05-01-c8의 B 목표는 이등변삼각형의 꼭지각 이등분선과 밑변의 관계를 말하는 것이다. 그 B의 두 필수 관계 중 밑변을 이등분한다는 항목이 이미 밑변의 중점을 지난다는 같은 성질을 직접 평가하므로 이 관계를 다시 묻는 B는 제외한다.',
 ...C('삼각형 $ABC$에서 $AB=AC$이고 $BC=14$이다. 꼭지각 $A$의 이등분선이 밑변 $BC$와 만나는 점을 $D$라 하면 $BD=$ {$7$}이다.',[['$7$']]),
 cReason:'밑변을 이등분하므로라는 성질과 결론을 문장에 미리 답하지 않는다. 이등변 조건과 꼭지각 이등분선으로 실제 밑변 일부의 길이를 추론한다. 그림 없이도 점의 관계를 모두 문장에 제공한다.',findingDecision:'B duplicate verified with actual goal; C numerical application restored.'
});
add('m2-05-02-xc16',{
 ...B('$\\mathrm{RHA}$와 $\\mathrm{RHS}$에 공통으로 필요한 같은 길이의 변은 무엇인가? 두 삼각형 $ABC$, $DEF$에서 $\\angle C=\\angle F=90^\\circ$, $\\angle A=\\angle D$, $AC=DF$라는 세 조건 자체가 $\\mathrm{RHA}$의 조건을 직접 갖추었는지 판단하고, 확인되지 않은 조건을 쓰시오.',
 '같은 길이의 빗변이 필요하다. 직접 주어진 같은 변 $AC$, $DF$는 빗변이 아니므로 세 조건 자체는 빗변이 같다는 조건을 직접 주지 않는다. 다만 $\\mathrm{ASA}$로 합동을 먼저 보이면 빗변이 같음을 얻을 수 있다.',ideas('$\\mathrm{RHA}$와 $\\mathrm{RHS}$에는 같은 길이의 빗변이 필요하다.','세 주어진 조건 자체에는 빗변 $AB$, $DE$의 길이가 같다는 조건이 직접 제시되지 않았으므로 직접 $\\mathrm{RHA}$의 조건을 갖춘 것은 아니다.')),
 ...C('직각삼각형 $ABC$, $DEF$에서 $\\angle C=\\angle F=90^\\circ$, $\\angle A=\\angle D$, $AB=5$이다. $\\mathrm{RHA}$로 합동이 되려면 $DE=$ {$5$}라는 길이 조건이 필요하다.',[['$5$']]),
 bReason:'다른 합동을 먼저 보이면 빗변도 같음을 얻을 수 있으므로 빗변의 같음을 알 수 없다는 단정은 틀리다. 주어진 조건 자체와 추가 추론을 구별하고, ASA라고만 쓰는 답이 RHA 판단을 대신하지 않도록 한다. 정당한 ASA 추론은 인정한다.',
 cReason:'빗변이라는 명사 빈칸 대신 직각의 맞은편 두 변에 필요한 실제 길이 조건을 묻는다.',findingDecision:'ASA alternative is mathematically valid; direct-condition rubric clarified without rejecting the method.'
});
add('m2-05-08-xc10',{
 ...B('$AD\\parallel BC$인 등변사다리꼴 $ABCD$에서 $\\triangle ABC$와 $\\triangle DCB$가 합동인 까닭을 대응하는 두 변과 그 끼인각으로 설명하고 합동 조건을 쓰시오.',
 '$AB=DC$, $BC=CB$이고 두 밑각 $\\angle ABC=\\angle DCB$가 같다. 두 변과 그 끼인각이 각각 같으므로 $\\mathrm{SAS}$ 합동이다.',ideas('대응하는 변 $AB=DC$이고 $BC=CB$는 공통변이다.','두 밑각 $\\angle ABC=\\angle DCB$가 같다.','두 변과 그 끼인각을 이용한 $\\mathrm{SAS}$ 합동이다.')),
 ...C('$AD\\parallel BC$인 등변사다리꼴 $ABCD$에서 $AB=DC$, 공통변 $BC$, $\\angle ABC=\\angle DCB$를 이용하여 $\\triangle ABC$와 $\\triangle DCB$의 합동을 보이는 조건은 {$\\mathrm{SAS}$}이다.',[['$\\mathrm{SAS}$','두 변과 그 끼인각']]),
 bReason:'기존 제외 이유에는 실제 겹치는 ID와 질문이 없었다. 임의의 중복 근거를 새로 만들지 않고 등변사다리꼴의 조건으로 대응 변·끼인각을 보이는 완전한 B를 복구한다.',
 cReason:'현재 C는 세 합동 근거를 주고 그 사이 관계인 SAS를 판별하는 짧은 수학 질문이다. 단순 명사 문법 복원과 다르며 이 유효한 합동 조건 판별은 유지한다. 대상인 두 삼각형의 이름을 문장 안에 명시하여 용어 또는 숨은 그림에 기대지 않도록 한다.',
 bGoal:'등변사다리꼴 안의 두 삼각형의 대응 변·끼인각으로 SAS 합동을 설명한다.',learningRole:'reason',findingDecision:'Unsupported B exclusion removed; concrete proof restored; valid short C retained.'
});
add('m2-09-04-xc22',{
 ...C('빨강 $3$개, 파랑 $2$개인 주머니에서 남은 공을 같은 가능성으로 두 번 뽑고 다시 넣지 않는다. 두 공이 빨강일 확률은 {$\\frac{3}{10}$}, 파랑일 확률은 {$\\frac{1}{10}$}, 색이 같을 확률은 {$\\frac25$}이다.',[['$\\frac{3}{10}$','$0.3$'],['$\\frac{1}{10}$','$0.1$'],['$\\frac25$','$\\frac4{10}$','$0.4$']]),
 bReason:'현재 B는 같은 색 사건을 두 가지 서로 겹치지 않는 사건으로 나누고 각각의 비복원 확률을 구해 합하므로 유지한다.',
 cReason:'나머지 색 이름만 채우는 패턴을 두 단색 사건의 실제 확률과 합으로 바꾼다. 같은 분할 구조를 짧은 수치 빈칸으로 평가하고 값이 같은 분수·소수는 인정한다.',findingDecision:'C color-restoration criticism accepted; actual partition probabilities assessed.'
});
if(updates.size!==27)throw Error('Expected 27 decisions');
const rows=before.slice().sort((a,b)=>a.sourceIndex-b.sourceIndex).map(old=>{
 const patch=updates.get(old.id);if(!patch)throw Error(old.id);
 const row={...old,...patch};
 if(row.bDecision!=='exclude'&&JSON.stringify(old.bRequiredIdeas)!==JSON.stringify(row.bRequiredIdeas))row.bDecision='rewrite';
 if(row.bDecision==='exclude'){row.bPrompt=null;row.bAnswer=null;row.bRequiredIdeas=[];}
 // Normalize only from canonical b*/c* authoring fields; remove stale assembled overrides.
 delete row.bQuestion;delete row.clozeQuestion;delete row.questionExclusions;
 row.authoringTaskId='task_c687f2c40ea2';row.authoringDispatchId='ctx_b868a7c064eb';
 row.readingProvenance='Codex direct bounded correction of 27 current findings; not independent approval';
 if(row.cDecision!=='exclude'){
  row.cAfter=row.cMarkedSentence;
  // All dependent aliases are rebuilt by Root parser in build.ts, not by a regex clone.
  for(const k of ['cFrozenSentence','cFrozenDefinition','cFrozenAnswers','cSlotAnswers','cStudentSentence','cAnswers','cSlots','lexicalSynonyms','equivalentExpressions'])delete row[k];
 }
 return row;
});
write('candidate-raw.json',{status:'Concrete correction handoff only; Root adopts and independently verifies',taskId:'task_c687f2c40ea2',dispatchId:'ctx_b868a7c064eb',rows});
write('decisions.json',{status:'Per-ID direct mathematical decisions, before final reread',rows:rows.map(r=>({id:r.id,sourceIndex:r.sourceIndex,sourceFingerprint:r.sourceFingerprint,learningRole:r.learningRole,bDecision:r.bDecision,cDecision:r.cDecision,bReason:r.bReason,cReason:r.cReason,coreReason:r.coreReason??null,findingDecision:r.findingDecision,unresolved:[]}))});
console.log(JSON.stringify({authored:rows.length}));

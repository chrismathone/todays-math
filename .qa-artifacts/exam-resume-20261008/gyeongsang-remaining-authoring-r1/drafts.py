"""Fresh authored student text and fully expanded solutions; no original keys."""
NUMBERS=list(range(1,10))+list(range(16,22))
DRAFTS={
1:{'content':r'''직각삼각형 $PQR$에서 $\angle R=90^\circ$이다. 다음 기록을 이용하여 비어 있는 길이를 복구하려고 한다.

| 기록 항목 | 기록 |
|---|---|
| 빗변 $\overline{PQ}$ | $25\,\mathrm{cm}$ |
| $\sin P$ | $\frac{7}{25}$ |
| $\overline{QR}$ | ㉠ $\mathrm{cm}$ |

㉠에 들어갈 수는?''',
 'choices':[r'$24$',r'$175$',r'$7$',r'$25$',r'$18$'],
 'solution':r'''각 $P$의 대변은 $QR$, 빗변은 $PQ$이다. 사인의 정의에 따라
$\sin P=\frac{\overline{QR}}{\overline{PQ}}=\frac{\overline{QR}}{25}=\frac{7}{25}$이다.

따라서 $\overline{QR}=25\times\frac{7}{25}=7\,\mathrm{cm}$이므로 ㉠은 $7$이다.''',
 'delta':'세 변의 길이에서 사인 값을 읽는 문제를, 빗변과 사인 기록으로 실제 대변의 길이를 복구하는 표로 역전한다.',
 'core':'사인의 대변/빗변 정의와 실제 길이 대응', 'procedure':'사인 정의의 비를 세우고 실제 대변 길이를 복구한다.',
 'standards':['9수04-17','9수04-18'],'unit':'삼각비의 뜻','difficulty':'기본','modes':['structure','inverse-target'],
 'family':'mid:3-2|삼각비|02','nearby':['3-2|삼각비|02'],'classification':'02의 sin+빗변→대변 모드와 목적/절차가 맞는 제안이다. 7-24-25 실제 매개변수와 표 표현은 별도 검수 대상이다.'},
2:{'content':r'''좌표평면 위의 세 점 $R(0,0)$, $P(a,0)$, $Q(0,b)$에 대하여 $a>0$, $b>0$이다.
삼각형 $PQR$의 기록이 다음과 같다.

| 항목 | 기록 |
|---|---|
| $\overline{PQ}$의 길이 | $20$ |
| $\cos\angle QPR$ | $\frac{4}{5}$ |

점 $P$의 $x$좌표 $a$의 값은?''',
 'choices':[r'$12$',r'$4$',r'$20$',r'$16$',r'$25$'],
 'solution':r'''양의 $x$축 위의 점 $P$와 양의 $y$축 위의 점 $Q$가 원점 $R$과 이루는 삼각형은 $R$에서 직각이다. $a>0$이므로 $\overline{PR}=a$이다.

각 $QPR$의 이웃변은 $PR$, 빗변은 $PQ$이므로
$\cos\angle QPR=\frac{\overline{PR}}{\overline{PQ}}=\frac{a}{20}=\frac{4}{5}$이다.
따라서 $a=20\times\frac45=16$이다.''',
 'delta':'세 변이 표시된 삼각형의 코사인 값을 묻던 것을, 코사인/빗변 기록에서 축 위 점의 양의 좌표를 복구하는 기하 표현으로 바꾼다.',
 'core':'코사인의 이웃변/빗변 정의','procedure':'축의 직각과 양의 좌표=선분 길이를 확인하고 코사인 정의로 이웃변을 역산한다.',
 'standards':['9수04-01','9수04-17','9수04-18'],'unit':'삼각비의 뜻','difficulty':'기본','modes':['representation','inverse-target','structure'],
 'family':None,'nearby':['3-2|삼각비|02'],'classification':'02의 cos+빗변→이웃변 계산과 공통이지만 축/좌표 표현을 포함한 전체 갈래가 확인되지 않아 family는 보류한다.'},
3:{'content':r'''직각삼각형 $PQR$에서 $\angle R=90^\circ$, $\overline{PQ}=13\,\mathrm{cm}$, $\overline{PR}=10\,\mathrm{cm}$이다.
다음 두 기록을 완성하려고 한다.

| 기록 항목 | $\overline{QR}$의 길이 | $\tan P$ |
|---|---|---|
| 기록 | ㉠ $\mathrm{cm}$ | ㉡ |

㉠, ㉡에 들어갈 값을 차례로 바르게 짝지은 것은?''',
 'choices':[r'$\sqrt{69},\ \frac{10}{\sqrt{69}}$',r'$\sqrt{69},\ \frac{\sqrt{69}}{10}$',r'$3,\ \frac{3}{10}$',r'$\sqrt{159},\ \frac{\sqrt{159}}{10}$',r'$\sqrt{69},\ \frac{\sqrt{69}}{13}$'],
 'solution':r'''피타고라스 정리에 따라 $\overline{QR}^{2}=13^2-10^2=69$이다. 길이는 양수이므로 $\overline{QR}=\sqrt{69}\,\mathrm{cm}$이다.

각 $P$의 대변은 $QR$, 이웃변은 $PR$이므로 $\tan P=\frac{\overline{QR}}{\overline{PR}}=\frac{\sqrt{69}}{10}$이다.
따라서 두 기록은 $\sqrt{69}$, $\frac{\sqrt{69}}{10}$이다.''',
 'delta':'누락된 직각변을 복구하여 탄젠트 한 값을 선택하는 구조를, 복구한 실제 길이와 탄젠트의 두 기록을 함께 판별하는 표로 바꾼다.',
 'core':'피타고라스의 양의 길이 복구 및 탄젠트 정의','procedure':'빗변과 이웃변으로 남은 양의 직각변을 구한 뒤 대변/이웃변을 읽는다.',
 'standards':['9수01-07','9수04-16','9수04-17'],'unit':'삼각비의 뜻','difficulty':'기본','modes':['structure'],
 'family':None,'nearby':['3-2|삼각비|01'],'classification':'01은 한 삼각비 값만 묻는다. 길이/탄젠트 두 기록 전체는 배정 근거가 없어 보류한다.'},
4:{'content':r'''반지름이 $10$인 사분원에서 $O$는 중심이고 $A$, $B$는 두 반지름의 끝점이다. 호 위의 점 $P$에 대하여 $\angle POA=40^\circ$이다.
$H$는 $P$에서 $OA$에 내린 수선의 발이다. 반직선 $OP$와 $A$를 지나 $OA$에 수직인 직선의 교점을 $D$라 한다.

아래 표는 각 길이를 소수 다섯째 자리에서 반올림한 기록이다.

| 선분 | $PH$ | $OH$ | $AD$ |
|---|---|---|---|
| 길이 기록 | $6.4279$ | $7.6604$ | $8.3910$ |

표의 기록값을 이용하여 계산한 $\cos40^\circ$, $\tan40^\circ$를 각각 소수 넷째 자리까지 나타낸 것은?''',
 'choices':[r'$0.6428,\ 0.7660$',r'$0.7660,\ 8.3910$',r'$7.6604,\ 0.8391$',r'$0.7660,\ 0.8391$',r'$0.6428,\ 0.8391$'],
 'solution':r'''직각삼각형 $OPH$의 빗변은 반지름 $OP=10$이다. 따라서 표의 기록으로 구한 코사인은 $\frac{OH}{OP}=\frac{7.6604}{10}=0.76604$이고, 이를 소수 넷째 자리까지 나타내면 $0.7660$이다.

직각삼각형 $OAD$에서는 $OA=10$이고 $AD$가 표시한 각의 대변이므로, 표의 기록으로 구한 탄젠트는 $\frac{AD}{OA}=\frac{8.3910}{10}=0.83910$이다. 소수 넷째 자리까지 나타내면 $0.8391$이다.
따라서 두 비의 근삿값은 차례로 $0.7660$, $0.8391$이다.''',
 'delta':'단위 사분원의 좌표 그림에서 코사인을 바로 읽는 것에서, 반지름10의 실제 길이 기록표를 정규화해 서로 다른 두 정의의 기록을 완성하는 구조로 바꾼다.',
 'core':'사분원의 수선/수직선으로 삼각비를 길이 비로 해석','procedure':'두 실제 직각삼각형에서 OH/OP, AD/OA를 읽고 기록값을 반지름으로 나누어 반올림한다.',
 'standards':['9수04-17','9수04-18'],'unit':'삼각비의 값','difficulty':'기본','modes':['representation','structure'],
 'family':None,'nearby':['3-2|삼각비|12'],'classification':'12는 반지름1의 길이→단일 비이다. 비단위 반지름과 두 기록/반올림 전체 갈래는 미확인이다.'},
5:{'content':r'''다음 표의 근삿값을 사용하여 두 계산 기록의 차를 구하려고 한다.

{TABLE5}

| 기록 | 계산식 |
|---|---|
| 가 | $\sin31^\circ+\cos34^\circ$ |
| 나 | $\sin32^\circ+\cos33^\circ$ |

표에 적힌 수로 계산한 (가의 값)−(나의 값)은?''',
 'choices':[r'$1.3440$',r'$0.0246$',r'$2.7126$',r'$-0.0246$',r'$1.3686$'],
 'solution':r'''각 열에서 필요한 두 값을 찾는다. 가는 $0.5150+0.8290=1.3440$이고, 나는 $0.5299+0.8387=1.3686$이다.

문제에서 요구한 순서는 가에서 나를 빼는 것이므로 $1.3440-1.3686=-0.0246$이다. 이 계산은 표에 적힌 근삿값의 계산 기록이다.''',
 'delta':'공유 세로 삼각비 표에서 한 합을 읽던 구조를 함수별 가로 표와 두 계산 기록의 순서 있는 차로 재구성한다.',
 'core':'삼각비 표의 올바른 행/열 조회 및 근삿값 사칙계산','procedure':'각도/함수에 맞는 표 항목으로 두 합을 각각 계산하고 순서 있는 차를 구한다.',
 'standards':['9수04-17'],'unit':'삼각비의 값','difficulty':'기본','modes':['structure','representation'],
 'family':None,'nearby':['3-2|삼각비|16'],'classification':'16의 실제 갈래는 한 함수의 각 조회/합/차이다. 서로 다른 sin/cos의 두 합과 차 전체는 미확인이다.'},
6:{'content':r'''다음은 코사인과 탄젠트의 근삿값을 정리한 표이다.

{TABLE6}

$x$, $y$는 표의 각도를 나타내는 수 중 하나씩이다. 표에서 $\tan x^\circ$의 기록은 $0.7813$이고, $\cos y^\circ$의 기록은 $0.7771$이다.
두 각도 기록의 차 $y-x$의 값은?''',
 'choices':[r'$-2$',r'$-1$',r'$0$',r'$1$',r'$2$'],
 'solution':r'''tan 행에서 $0.7813$이 적힌 열의 각도는 $38^\circ$이므로 $x=38$이다.
cos 행에서 $0.7771$이 적힌 열의 각도는 $39^\circ$이므로 $y=39$이다.

따라서 $y-x=39-38=1$이다. 서로 다른 두 각을 표에서 각각 찾는 계산이다.''',
 'delta':'tan값으로 한 각을 선택하던 공유 문항을 두 독립적인 함수별 역조회와 각도 기록 차로 재구성한다.',
 'core':'삼각비 표의 값→해당 각 역조회','procedure':'다른 두 행에서 각각 유일한 각 열을 찾고 그 수의 차를 구한다.',
 'standards':['9수04-17'],'unit':'삼각비의 값','difficulty':'기본','modes':['structure','representation'],
 'family':None,'nearby':['3-2|삼각비|16'],'classification':'16 mode0의 한 각 역조회와 부분적으로 같지만 두 독립 조회 후 차인 전체 갈래는 미확인이다.'},
7:{'content':r'''직각삼각형 $PQR$에서 $\angle R=90^\circ$, $\angle P=45^\circ$이고 $\overline{PQ}=12\sqrt2\,\mathrm{cm}$이다.

두 직각변의 길이 합과 빗변 길이의 차 $\overline{PR}+\overline{RQ}-\overline{PQ}$의 값은?''',
 'choices':[r'$12\,\mathrm{cm}$',r'$(24-12\sqrt2)\,\mathrm{cm}$',r'$12\sqrt2\,\mathrm{cm}$',r'$(24+12\sqrt2)\,\mathrm{cm}$',r'$24\,\mathrm{cm}$'],
 'solution':r'''두 예각이 모두 $45^\circ$이므로 두 직각변의 길이가 같다.
또 $\cos45^\circ=\frac{PR}{PQ}=\frac{\sqrt2}{2}$이므로 $PR=12\sqrt2\times\frac{\sqrt2}{2}=12\,\mathrm{cm}$이다. 따라서 $RQ=12\,\mathrm{cm}$이다.

구하는 길이의 차는 $12+12-12\sqrt2=(24-12\sqrt2)\,\mathrm{cm}$이다.''',
 'delta':'45도 직각삼각형의 한 직각변에서 나머지 두 길이를 묻던 것을 빗변 입력으로 역전하고 두 직각변 합과 빗변의 차를 묻는다.',
 'core':'45도 직각삼각형의 양수 변 대응','procedure':'45도 정의/이등변 성질로 실제 두 직각변을 구해 길이의 합과 차를 계산한다.',
 'standards':['9수04-10','9수04-17','9수04-18'],'unit':'삼각비의 활용','difficulty':'응용','modes':['inverse-target','structure'],
 'family':None,'nearby':['3-2|삼각비의 활용|01'],'classification':'활용01에는 빗변/특수각→둘레가 있지만 직각변 합−빗변이라는 목표 전체는 확인되지 않았다.'},
8:{'content':r'''두 계산 기록의 값이 같도록 양수 $k$를 정하려고 한다.

| 기록 | 계산식 |
|---|---|
| 가 | $\sin60^\circ\times\tan45^\circ$ |
| 나 | $k\times\sin45^\circ\times\tan30^\circ$ |

$k$의 값은?''',
 'choices':[r'$\frac{\sqrt2}{2}$',r'$\sqrt2$',r'$\frac{\sqrt6}{2}$',r'$3$',r'$\frac{3\sqrt2}{2}$'],
 'solution':r'''가의 값은 $\frac{\sqrt3}{2}\times1=\frac{\sqrt3}{2}$이다.
나에서 $k$를 제외한 곱은 $\frac{\sqrt2}{2}\times\frac{\sqrt3}{3}=\frac{\sqrt6}{6}$이다.

따라서 $k\times\frac{\sqrt6}{6}=\frac{\sqrt3}{2}$이고, 0이 아닌 $\frac{\sqrt6}{6}$으로 나누면
$k=\frac{\sqrt3}{2}\times\frac{6}{\sqrt6}=\frac{3\sqrt2}{2}$이다. 이 값은 양수이다.''',
 'delta':'특수각의 한 곱을 바로 구하는 계산에서 두 고정각 곱의 값이 같아지도록 실제 계수k를 복구하는 기록표로 바꾼다.',
 'core':'고정된30/45/60도 값의 대입과 근호 계산','procedure':'두 고정 특수각 곱을 각각 대입한 뒤 0이 아닌 상수로 나누어 계수를 구한다.',
 'standards':['9수04-17','9수01-10','9수02-05'],'unit':'삼각비의 값','difficulty':'기본','modes':['inverse-target','structure'],
 'family':None,'nearby':['3-2|삼각비|08'],'classification':'08은 두 값의 한 연산이다. 두 곱을 대조해 계수를 역산하는 전체 입력/목표는 미확인이다.'},
9:{'content':r'''직각삼각형 $PQR$에서 $\angle R=90^\circ$이고 $\angle Q$의 크기는 $\angle P$의 크기의 2배이다.
다음 두 기록을 완성하려고 한다.

| 기록 항목 | $\angle Q$의 크기 | $\sin Q\times\cos Q\times\tan Q$ |
|---|---|---|
| 기록 | ㉠ | ㉡ |

㉠, ㉡을 차례로 바르게 짝지은 것은?''',
 'choices':[r'$30^\circ,\ \frac14$',r'$60^\circ,\ \frac14$',r'$30^\circ,\ \frac34$',r'$60^\circ,\ \frac{\sqrt3}{4}$',r'$60^\circ,\ \frac34$'],
 'solution':r'''각 $P$를 $x^\circ$라 하면 각 $Q$는 $2x^\circ$이다. 삼각형의 세 내각의 합에서 $x+2x+90=180$이므로 $x=30$이고 $Q=60^\circ$이다.

이제 고정된 $60^\circ$의 값을 각각 대입한다.
$\sin60^\circ=\frac{\sqrt3}{2}$, $\cos60^\circ=\frac12$, $\tan60^\circ=\sqrt3$이므로 곱은
$\frac{\sqrt3}{2}\times\frac12\times\sqrt3=\frac34$이다.
따라서 두 기록은 $60^\circ$, $\frac34$이다.''',
 'delta':'세 내각 비와 최솟각의 곱 한 값에서, 직각/두 예각의 배 관계로 정해진 다른 특수각의 각도와 곱을 함께 기록하는 구조로 바꾼다.',
 'core':'삼각형 각의 합으로 고정된 특수각을 정한 뒤 세 특수값을 대입','procedure':'30/60 각을 먼저 확정한 뒤 60도 sin,cos,tan 상수를 각각 대입하여 곱한다. 일반각 항등식은 쓰지 않는다.',
 'standards':['9수04-05','9수04-17','9수01-10','9수02-05'],'unit':'삼각비의 값','difficulty':'기본','modes':['representation','structure'],
 'family':None,'nearby':['3-2|삼각비|08'],'classification':'고정각 세 값의 곱+각도 기록이며 일반sin*cos*tan 관계 유도 유형으로 분류하지 않는다. 전체 갈래 미확인이다.'},
16:{'content':r'''삼각형 $PQR$에서 다음 기록이 남아 있다. $H$는 $P$에서 $QR$에 내린 수선의 발이며 선분 $QR$의 내부에 있다.

| 항목 | 기록 |
|---|---|
| $\overline{PQ}$ | $12\,\mathrm{cm}$ |
| $\angle PQR$ | $60^\circ$ |
| 삼각형 $PQR$의 넓이 | $36\sqrt3\,\mathrm{cm}^2$ |

이 기록을 만족하는 밑변 $\overline{QR}$의 길이는?''',
 'choices':[r'$6\,\mathrm{cm}$',r'$12\sqrt3\,\mathrm{cm}$',r'$12\,\mathrm{cm}$',r'$18\,\mathrm{cm}$',r'$24\,\mathrm{cm}$'],
 'solution':r'''직각삼각형 $PQH$에서 $\sin60^\circ=\frac{PH}{PQ}=\frac{\sqrt3}{2}$이므로 $PH=12\times\frac{\sqrt3}{2}=6\sqrt3\,\mathrm{cm}$이다.

삼각형의 넓이는 밑변 $QR$과 높이 $PH$로 구한다. $\frac12\times QR\times6\sqrt3=36\sqrt3$이므로 $QR=12\,\mathrm{cm}$이다. 이때 $QH=12\cos60^\circ=6\,\mathrm{cm}$이므로 수선의 발은 실제로 밑변 내부에 있다.''',
 'delta':'두 변/끼인각의 표 값으로 넓이를 구하던 것을 실제 한 변/끼인각/넓이 표로 바꾸어 밑변을 역산한다. 새 특수각은 정확한 값으로 계산한다.',
 'core':'수선 높이에 삼각비를 적용하고 밑변×높이/2로 삼각형 넓이를 구성','procedure':'수선의 실제 높이를 사인 정의로 구하고 동일 넓이 식을 밑변에 대해 역으로 푼다.',
 'standards':['6수03-06','9수04-17','9수04-18'],'unit':'삼각비의 활용','difficulty':'응용','modes':['inverse-target','structure'],
 'family':'mid:3-2|삼각비의 활용|08','nearby':['3-2|삼각비의 활용|08'],'classification':'활용08 triangleArea mode1의 한 변/끼인60도/넓이→다른 변 목적이 맞는다. a12,b12,면적36√3 제안이며 독립 배정 검토는 남는다.'},
17:{'content':r'''물품을 옮기는 경사판 $PQ$가 수평 지면 $PH$와 $15^\circ$를 이룬다. $Q$에서 지면에 내린 수선의 발은 $H$이고, 경사판의 위쪽 끝 높이 $QH$는 $2.7\,\mathrm{m}$이다.

| 각 | sin의 근삿값 | cos의 근삿값 | tan의 근삿값 |
|---|---|---|---|
| $15^\circ$ | $0.2588$ | $0.9659$ | $0.2679$ |

표의 근삿값을 사용하여 계산한 수평 거리 $PH$를 소수 첫째 자리까지 나타낸 것은?''',
 'choices':[r'$2.6\,\mathrm{m}$',r'$5.2\,\mathrm{m}$',r'$10.4\,\mathrm{m}$',r'$10.1\,\mathrm{m}$',r'$5.1\,\mathrm{m}$'],
 'solution':r'''직각삼각형 $PQH$에서 표시한 $15^\circ$의 대변은 높이 $QH$, 이웃변은 수평 거리 $PH$이다.
따라서 $\tan15^\circ=\frac{QH}{PH}$이다.

표의 근삿값을 쓰면 $0.2679=\frac{2.7}{PH}$이므로 $PH=2.7\div0.2679\fallingdotseq10.0784\,\mathrm{m}$이다.
소수 첫째 자리까지 나타내면 약 $10.1\,\mathrm{m}$이다. 이 값은 주어진 근삿값으로 계산한 거리이다.''',
 'delta':'미끄럼틀의 수평거리에서 높이를 계산하는 상황을 운반용 경사판의 높이 입력→수평거리 복구 및 지정 자릿수 기록으로 전환한다.',
 'core':'수평선과 경사판의 예각에서 탄젠트의 실제 대변/이웃변 대응','procedure':'높이/수평거리 비를 세우고 주어진 양의 근삿값으로 수평거리를 구해 지정 자릿수로 반올림한다.',
 'standards':['9수04-17','9수04-18'],'unit':'삼각비의 활용','difficulty':'응용','modes':['context','inverse-target','structure'],
 'family':None,'nearby':['3-2|삼각비의 활용|03'],'classification':'활용03의 나무는 지면거리/각→높이이다. 높이→지면거리 및15도 표/반올림 전체 갈래는 확인되지 않았다.'},
18:{'content':r'''두 직각삼각형 $ABC$, $DCF$가 그림과 같이 겹쳐져 있다. $B,F,C$는 한 직선 위에 이 순서로 있고, $A$, $D$는 이 직선의 같은 쪽에 있다. $E$는 두 선분 $AC$, $FD$의 내부에 있는 교점이다.
$\angle ABC=\angle DCF=90^\circ$, $\angle BAC=60^\circ$, $\angle EFC=45^\circ$이다.

$\overline{CD}=8\,\mathrm{cm}$이고, 색칠한 사각형 $ABFE$의 넓이는 $(16+8\sqrt3)\,\mathrm{cm}^2$이다. $H$는 $E$에서 $BC$에 내린 수선의 발이며 $F$와 $C$ 사이에 있다.

이 넓이 기록으로 복구한 $\overline{BF}$의 길이는?''',
 'choices':[r'$2\,\mathrm{cm}$',r'$3\,\mathrm{cm}$',r'$4\,\mathrm{cm}$',r'$6\,\mathrm{cm}$',r'$8\,\mathrm{cm}$'],
 'solution':r'''직각삼각형 $DCF$의 $F$각이 $45^\circ$이므로 $CF=CD=8\,\mathrm{cm}$이다. 삼각형 $ABC$에서 $ACB=30^\circ$이다.

$EH=h\,\mathrm{cm}$라 하자. 직각삼각형 $EFH$의 $F$각이 $45^\circ$이므로 $FH=h$이다. 직각삼각형 $ECH$에서 $\tan30^\circ=\frac{EH}{HC}=\frac{\sqrt3}{3}$이므로 $HC=\sqrt3h$이다. 따라서 $h+\sqrt3h=FC=8$이고 $h=\frac8{1+\sqrt3}=4(\sqrt3-1)$이다.

삼각형 $EFC$의 넓이는 $\frac12\times8\times4(\sqrt3-1)=16(\sqrt3-1)\,\mathrm{cm}^2$이다. 색칠한 사각형과 이 삼각형을 합하면 삼각형 $ABC$이므로 전체 넓이는 $16+8\sqrt3+16(\sqrt3-1)=24\sqrt3\,\mathrm{cm}^2$이다.

$BC=t\,\mathrm{cm}$라 하면 $\tan60^\circ=\frac{BC}{AB}=\sqrt3$이므로 $AB=\frac{t}{\sqrt3}$이다. 따라서 $\frac12\times t\times\frac{t}{\sqrt3}=24\sqrt3$이고 $t^2=144$이다. 양의 길이 $t=12$를 택한다.
그러므로 $BF=BC-FC=12-8=4\,\mathrm{cm}$이다.''',
 'delta':'겹친 두 직각삼각형의 CD/BF 입력→부분넓이 차 목표에서, CD/부분넓이 입력→BF 역산으로 바꾸고 풀이용 수선H를 명시한다.',
 'core':'두 직각삼각형의 특수각 길이 대응과 전체/부분 삼각형 넓이 분해','procedure':'45도/30도 수선 높이로 EFC 넓이를 복구하고 전체ABC의 밑변/높이 관계와 양의 제곱근으로 BF를 구한다.',
 'standards':['6수03-06','9수04-05','9수04-17','9수04-18','9수01-07','9수01-10','9수02-05'],'unit':'삼각비의 활용','difficulty':'심화하','modes':['inverse-target','structure'],
 'family':None,'nearby':['3-2|삼각비의 활용|08','3-2|삼각비의 활용|12'],'classification':'단일 삼각형 역넓이와 전체 사각형 넓이의 가까운 목적은 있지만 이 겹침/분해/양의근 목표 전체는 배정되지 않았다. 복잡성은 독립 학년 검토가 필요하다.'},
19:{'content':r'''직각삼각형 $PQR$에서 $\angle R=90^\circ$, $\cos Q=\frac35$이고 넓이는 $24\,\mathrm{cm}^2$이다. 빗변의 길이를 $\overline{PQ}=x\,\mathrm{cm}$라 하자. $(x>0)$

다음 기록을 복구하고 풀이를 쓰시오.

(1) $QR$, $PR$의 길이를 각각 $x$를 사용하여 나타내시오. [2점]

(2) 빗변 $PQ$의 길이를 구하시오. [4점]

(3) 두 직각변 $QR$, $PR$의 길이를 차례로 구하시오. [2점]''',
 'choices':[], 'answer':r'⑴ $QR=\frac{3x}{5}\,\mathrm{cm}$, $PR=\frac{4x}{5}\,\mathrm{cm}$ ⑵ $PQ=10\,\mathrm{cm}$ ⑶ $QR=6\,\mathrm{cm}$, $PR=8\,\mathrm{cm}$',
 'solution':r'''(1) 코사인의 정의에서 $\cos Q=\frac{QR}{PQ}=\frac35$이므로 $QR=\frac{3x}{5}\,\mathrm{cm}$이다.
피타고라스 정리에 따라 $PR^2=x^2-(\frac{3x}{5})^2=\frac{16x^2}{25}$이다. $x>0$이고 길이는 양수이므로 $PR=\frac{4x}{5}\,\mathrm{cm}$이다.

(2) 넓이 기록을 이용하면 $\frac12\times\frac{3x}{5}\times\frac{4x}{5}=24$이다. 즉 $\frac{6x^2}{25}=24$이므로 $x^2=100$이다. 양의 빗변을 택하면 $PQ=x=10\,\mathrm{cm}$이다.

(3) 위 식에 $x=10$을 대입하면 $QR=6\,\mathrm{cm}$, $PR=8\,\mathrm{cm}$이다. 두 직각변의 넓이는 $\frac12\times6\times8=24\,\mathrm{cm}^2$로 주어진 기록과 같다.''',
 'delta':'빗변/코사인 입력으로 넓이를 묻던 서술형을 넓이/코사인 입력으로 실제 세 변의 크기를 복구하는 세 부분 기록으로 역전한다.',
 'core':'코사인 정의와 피타고라스에 의한 실제 밑변/높이 구성 및 삼각형 넓이','procedure':'양의 빗변 변수를 놓고 두 실제 직각변을 구성한 뒤 넓이 식의 양의 제곱근으로 실제 길이를 복구한다.',
 'standards':['6수03-06','9수04-16','9수04-17','9수04-18','9수01-07','9수01-10'],'unit':'삼각비의 활용','difficulty':'응용','modes':['inverse-target','structure'],
 'family':None,'nearby':['3-2|삼각비|02','3-2|삼각비의 활용|01'],'classification':'일반 sin/cos 관계를 묻는03이 아니다. 실제 넓이로 삼각형 크기/세 길이를 복구하는 전체 서술형 갈래는 배정되지 않았다.',
 'rubric':[{'part':1,'points':2,'criteria':'cos정의로QR식을 세움1, Pythagoras와양수로PR식1'}, {'part':2,'points':4,'criteria':'넓이식2, x²=100과양의근선택2'},{'part':3,'points':2,'criteria':'QR6cm과PR8cm 각각1'}]},
20:{'content':r'''한 변의 길이가 $10\,\mathrm{cm}$인 정삼각형 $PQR$에서 $H$는 $QR$의 중점이다. 선분 $PH$를 그어 새로운 기준각 $\alpha=\angle QPH$의 삼각비를 기록하려고 한다.

(1) 두 삼각형 $PQH$, $PRH$를 이용하여 $PH\perp QR$임을 설명하고 $\alpha$의 크기를 구하시오. [2점]

(2) $PH$의 길이를 구하시오. [3점]

(3) 다음 기록표를 완성하고 각 값이 나오는 선분의 비를 쓰시오. [3점]

| 기록 항목 | $\sin\alpha$ | $\cos\alpha$ | $\tan\alpha$ |
|---|---|---|---|
| 값 | ㉠ | ㉡ | ㉢ |''',
 'choices':[], 'answer':r'⑴ $PH\perp QR$, $\alpha=30^\circ$ ⑵ $PH=5\sqrt3\,\mathrm{cm}$ ⑶ $\sin\alpha=\frac12$, $\cos\alpha=\frac{\sqrt3}{2}$, $\tan\alpha=\frac{\sqrt3}{3}$',
 'solution':r'''(1) $PQ=PR=10$, $QH=RH=5$이고 $PH$는 공통이다. 따라서 두 삼각형은 SSS 합동이다. $QHP$와 $RHP$의 두 각은 같고 합이 $180^\circ$이므로 각각 $90^\circ$이다. 따라서 $PH\perp QR$이다.
또 $QPH=HPR$이고 정삼각형의 $P$각은 $60^\circ$이므로 $\alpha=30^\circ$이다.

(2) 직각삼각형 $PQH$에서 $PH^2=10^2-5^2=75$이다. 양의 길이를 택하면 $PH=5\sqrt3\,\mathrm{cm}$이다.

(3) 기준각 $QPH$의 대변은 $QH$, 이웃변은 $PH$, 빗변은 $PQ$이다. 정의에 따라
$\sin\alpha=\frac{QH}{PQ}=\frac5{10}=\frac12$,
$\cos\alpha=\frac{PH}{PQ}=\frac{5\sqrt3}{10}=\frac{\sqrt3}{2}$,
$\tan\alpha=\frac{QH}{PH}=\frac5{5\sqrt3}=\frac{\sqrt3}{3}$이다.
따라서 ㉠, ㉡, ㉢의 값은 차례로 $\frac12$, $\frac{\sqrt3}{2}$, $\frac{\sqrt3}{3}$이다.''',
 'delta':'정삼각형으로60도 값을 서술하는 문제를, 중점 수선의 합동 근거/실제 높이/꼭짓점의30도 세 값 기록표로 바꾸어 질문 대상과 증명 조직을 새로 구성한다.',
 'core':'정삼각형을 수선으로 나누고 피타고라스와 삼각비 정의로 특수값 구성','procedure':'SSS와평각으로수선을 정당화하고 양의높이를 피타고라스로 구해30도 직각삼각형의세정의를 직접 읽는다.',
 'standards':['9수04-04','9수04-05','9수04-16','9수04-17','9수01-07','9수01-10'],'unit':'삼각비의 값','difficulty':'응용','modes':['representation','structure'],
 'family':None,'nearby':['3-2|삼각비|09','3-2|삼각비|13'],'classification':'정해진특수각 값을 계산하는 갈래와 달리 합동/수선/높이/세정의 구성 증명이 필요하므로 전체family를 보류한다.',
 'rubric':[{'part':1,'points':2,'criteria':'SSS/평각의수직근거1, 각이등분에의한30도1'},{'part':2,'points':3,'criteria':'QH5와Pythagoras식2,양의길이5√3cm1'},{'part':3,'points':3,'criteria':'세직접선분비와정확한값 각각1'}]},
21:{'content':r'''해솔중학교의 삼각형 모양 연습 공간에 세 지점 $O,P,Q$가 있다. $OP=18\,\mathrm{m}$, $PQ=6\sqrt{13}\,\mathrm{m}$이고 $\angle POQ=60^\circ$이다.
$P$에서 직선 $OQ$에 내린 수선의 발 $H$는 $O$와 $Q$ 사이에 있다.

연습 공간의 한 변 $OQ$의 길이를 다음 순서로 복구하고 풀이를 쓰시오.

(1) $OH$, $PH$의 길이를 차례로 구하시오. [3점]

(2) $HQ$의 길이를 구하시오. [3점]

(3) $OQ$의 길이를 구하시오. [2점]''',
 'choices':[], 'answer':r'⑴ $OH=9\,\mathrm{m}$, $PH=9\sqrt3\,\mathrm{m}$ ⑵ $HQ=15\,\mathrm{m}$ ⑶ $OQ=24\,\mathrm{m}$',
 'solution':r'''(1) 직각삼각형 $OPH$에서 $OP=18$이고 $\angle POH=60^\circ$이다. 따라서 $OH=18\cos60^\circ=9\,\mathrm{m}$, $PH=18\sin60^\circ=9\sqrt3\,\mathrm{m}$이다.

(2) 직각삼각형 $PHQ$에서 피타고라스 정리에 따라 $HQ^2=(6\sqrt{13})^2-(9\sqrt3)^2=468-243=225$이다. 양의 길이 $HQ=15\,\mathrm{m}$를 택한다.

(3) $H$가 $O$와 $Q$ 사이에 있으므로 $OQ=OH+HQ=9+15=24\,\mathrm{m}$이다. 내부의 수선 발을 기준으로 나뉜 두 길이를 합하여 한 변을 복구한다.''',
 'delta':'연못의관측점에서 두알려진변/끼인각으로맞은편거리를 구하던 것을 새연습공간의한변/맞은편변/끼인각으로 다른변을복구하는수선별서술형으로역전한다.',
 'core':'60도 수선 직각삼각형과 피타고라스에 의한 관측 거리 구성','procedure':'OH/PH를60도 정의로 구성하고 PHQ의양의길이를Pythagoras로 복구한뒤 내부순서로합한다.',
 'standards':['9수04-16','9수04-17','9수04-18','9수01-07','9수01-10'],'unit':'삼각비의 활용','difficulty':'응용','modes':['context','inverse-target','structure'],
 'family':None,'nearby':['3-2|삼각비의 활용|04'],'classification':'끼인각/두변→맞은편변과 공통수선이 있지만 한변/맞은편변→다른변의역산 및세서술부분 전체는 확인되지 않았다.',
 'rubric':[{'part':1,'points':3,'criteria':'60도삼각비로OH9m1,PH9√3m2'},{'part':2,'points':3,'criteria':'Pythagoras식과2252,양의근15m1'},{'part':3,'points':2,'criteria':'내부H의길이합과OQ24m'}]}
}

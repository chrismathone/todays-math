"""New student content. Author proposals only; never original answers or approvals."""
DATA = {}
def add(n, content, choices, answer, solution, unit, difficulty, before, after, concept, procedure, codes, gate='', subparts=None):
    DATA[n] = dict(content=content.strip(),choices=choices,answer=answer,solution=solution.strip(),unitSection=unit,difficulty=difficulty,before=before,after=after,sharedConcept=concept,sharedProcedure=procedure,codes=codes,gate=gate,subparts=subparts)

add(1,r'''
직각삼각형 $\mathrm{PQR}$에서 $\angle\mathrm{R}=90^\circ$, $\overline{\mathrm{PQ}}=13\,\mathrm{cm}$, $\overline{\mathrm{QR}}=5\,\mathrm{cm}$이다. 다음 두 측정 기록을 완성하려고 한다.

| 기록 항목 | $\cos Q$ | $\tan P$ |
| --- | --- | --- |
| 기록할 값 | ㉠ | ㉡ |

㉠, ㉡에 들어갈 값을 차례로 바르게 짝지은 것은?
''',[r'$\frac{12}{13}$, $\frac{5}{12}$',r'$\frac{5}{13}$, $\frac{12}{5}$',r'$\frac{5}{13}$, $\frac{5}{12}$',r'$\frac{13}{5}$, $\frac{5}{12}$',r'$\frac{5}{13}$, $\frac{12}{13}$'],'③',r'''
피타고라스 정리에 의하여 $\overline{\mathrm{PR}}^2=13^2-5^2=144$이다. 길이는 양수이므로 $\overline{\mathrm{PR}}=12\,\mathrm{cm}$이다.
각 $Q$의 이웃변은 $\mathrm{QR}$, 빗변은 $\mathrm{PQ}$이므로 $\cos Q=\frac{5}{13}$이다. 각 $P$의 대변은 $\mathrm{QR}$, 이웃변은 $\mathrm{PR}$이므로 $\tan P=\frac{5}{12}$이다.
따라서 두 기록은 차례로 $\frac{5}{13}$, $\frac{5}{12}$이고 정답은 ③이다.
''','삼각비의 뜻','기본','3-4-5 삼각형의 다섯 삼각비 등식 중 옳은 등식 하나를 고른다.','뒤집어 배치한 삼각형에서 서로 다른 두 각의 cos/tan 기록을 동시에 완성한다.','직각삼각형의 변 역할과 삼각비 정의','한 변을 피타고라스로 복구하고 각의 이웃변/대변/빗변을 정해 수의 비를 기록한다.',['9수04-16','9수04-17'])

add(2,r'''
직각삼각형 $\mathrm{ABC}$에서 $\angle\mathrm{C}=90^\circ$이고, 다음과 같은 기록이 남아 있다.

| 항목 | 기록 |
| --- | --- |
| 빗변 $\overline{\mathrm{AB}}$ | $10\sqrt{2}\,\mathrm{cm}$ |
| $\sin A$ | $\frac{3}{5}$ |
| 두 직각변 $\overline{\mathrm{BC}}$, $\overline{\mathrm{CA}}$ | ㉠ $\mathrm{cm}$, ㉡ $\mathrm{cm}$ |

㉠, ㉡에 들어갈 수를 차례로 바르게 짝지은 것은?
''',[r'$8\sqrt{2}$, $6\sqrt{2}$',r'$6\sqrt{2}$, $8\sqrt{2}$',r'$6$, $8$',r'$6\sqrt{2}$, $4\sqrt{2}$',r'$3\sqrt{2}$, $8\sqrt{2}$'],'②',r'''
$\sin A=\frac{\overline{\mathrm{BC}}}{\overline{\mathrm{AB}}}=\frac35$이므로 $\overline{\mathrm{BC}}=10\sqrt2\times\frac35=6\sqrt2\,\mathrm{cm}$이다.
피타고라스 정리에 의하여 $\overline{\mathrm{CA}}^2=(10\sqrt2)^2-(6\sqrt2)^2=200-72=128$이다. 양의 길이를 택하면 $\overline{\mathrm{CA}}=8\sqrt2\,\mathrm{cm}$이다.
두 직각변의 기록은 $6\sqrt2$, $8\sqrt2$이므로 정답은 ②이다.
''','삼각비의 뜻','기본','sin값과 빗변으로 다른 한 직각변을 구한다.','완성되지 않은 측정표에서 두 직각변의 순서 있는 기록을 복구한다.','삼각비 정의와 피타고라스 정리','sin의 정의로 대변을 구한 다음 피타고라스로 나머지 양의 길이를 구한다.',['9수04-17','9수04-16','9수01-10'])

add(3,r'''
직각삼각형 $\mathrm{PQR}$에서 $\angle\mathrm{R}=90^\circ$, $\overline{\mathrm{PR}}=4$, $\overline{\mathrm{QR}}=3$이다. 이 삼각형으로 계산한 $t=\tan P\times\sin Q$의 값을 수직선의 구간으로 기록하려고 한다.
$t$가 들어가는 구간을 바르게 나타낸 것은?
''',[r'$0<t<\frac14$',r'$\frac14<t<\frac12$',r'$\frac12<t<\frac23$',r'$\frac23<t<\frac34$',r'$\frac34<t<1$'],'③',r'''
피타고라스 정리에 의하여 빗변 $\overline{\mathrm{PQ}}=\sqrt{4^2+3^2}=5$이다.
각 $P$의 대변과 이웃변은 각각 $\mathrm{QR}$, $\mathrm{PR}$이므로 $\tan P=\frac34$이다. 각 $Q$의 대변은 $\mathrm{PR}$이므로 $\sin Q=\frac45$이다.
따라서 이 삼각형에서 $t=\frac34\times\frac45=\frac35$이다. $\frac12<\frac35<\frac23$이므로 정답은 ③이다.
''','삼각비의 뜻','기본','주어진 두 직각변으로 tanA×sinB의 정확한 값을 고른다.','특정 수치 삼각형에서 같은 곱을 계산한 후 정확한 값을 저장하는 대신 포함 구간을 고른다.','수치가 정해진 직각삼각형의 삼각비 계산','피타고라스→각각의 수치 비→곱의 사칙계산→유리수 대소 비교.',['9수04-16','9수04-17','9수01-09'],'각의 일반 삼각비 관계가 아니라 주어진3-4-5 삼각형의 숫자 비 두 개를 직접 곱한다.')

add(4,r'''
직각삼각형 $\mathrm{PQR}$에서 $\angle\mathrm{QPR}=90^\circ$, $\overline{\mathrm{PQ}}=5\,\mathrm{cm}$, $\overline{\mathrm{PR}}=12\,\mathrm{cm}$이다. $\mathrm{P}$에서 $\mathrm{QR}$에 내린 수선의 발을 $\mathrm{M}$이라 하자.
$\theta=\angle\mathrm{QPM}$, $\phi=\angle\mathrm{MPR}$일 때, 두 계산 기록의 차 $\cos\theta-\cos\phi$의 값은?
''',[r'$\frac5{13}$',r'$\frac{12}{13}$',r'$\frac{17}{13}$',r'$\frac7{13}$',r'$\frac{13}{7}$'],'④',r'''
피타고라스 정리에 의하여 $\overline{\mathrm{QR}}=\sqrt{5^2+12^2}=13\,\mathrm{cm}$이다.
삼각형 $\mathrm{PQR}$의 넓이를 두 밑변으로 계산하면 $\frac12\times5\times12=\frac12\times13\times\overline{\mathrm{PM}}$이다. 따라서 $\overline{\mathrm{PM}}=\frac{60}{13}\,\mathrm{cm}$이다.
직각삼각형 $\mathrm{PQM}$에서 $\cos\theta=\frac{\overline{\mathrm{PM}}}{\overline{\mathrm{PQ}}}=\frac{12}{13}$이다. 직각삼각형 $\mathrm{PRM}$에서는 $\cos\phi=\frac{\overline{\mathrm{PM}}}{\overline{\mathrm{PR}}}=\frac5{13}$이다.
따라서 두 기록의 차는 $\frac{12}{13}-\frac5{13}=\frac7{13}$이고 정답은 ④이다.
''','삼각비의 뜻','기본','빗변에 내린 수선으로 나뉜 두 각의 cos값을 더한다.','다른 비율의 직각삼각형에서 공통 높이를 복구하고 두 cos 기록의 양의 차를 구한다.','직각삼각형의 높이와 cos 정의','피타고라스와 두 넓이 표현으로 높이를 구하고 두 작은 직각삼각형의 수치 비를 계산한다.',['9수04-16','9수04-17','6수03-06'],'삼각비 사이 관계 대신 각 작은 직각삼각형의 실제 이웃변/빗변을 직접 사용한다.')

add(5,r'''
다음 네 카드를 값의 크기에 따라 수직선 위에 놓았다. 양 끝에 놓인 카드 두 장을 치운 뒤, 남은 두 카드 중 큰 값에서 작은 값을 빼서 기록하려고 한다.

| 카드 | 가 | 나 | 다 | 라 |
| --- | --- | --- | --- | --- |
| 삼각비 | $\sin30^\circ$ | $\cos30^\circ$ | $\cos75^\circ$ | $\tan55^\circ$ |

남은 두 카드의 값의 차는?
''',[r'$\frac{\sqrt3+1}{2}$',r'$\sqrt3-1$',r'$\frac{\sqrt3-1}{2}$',r'$\frac{\sqrt3-\sqrt2}{2}$',r'$\frac{\sqrt2-1}{2}$'],'③',r'''
$\sin30^\circ=\frac12$, $\cos30^\circ=\frac{\sqrt3}{2}$이므로 카드 가의 값은 카드 나보다 작고, 둘 다 $1$보다 작다.
$0^\circ$보다 크고 $90^\circ$보다 작은 각의 범위에서 각이 커지면 cos의 값은 작아진다. 따라서 $\cos75^\circ<\cos60^\circ=\frac12$이다. 또 이 범위에서 각이 커지면 tan의 값은 커지므로 $\tan55^\circ>\tan45^\circ=1$이다.
따라서 네 카드의 순서는 다, 가, 나, 라이다. 양 끝의 다, 라를 치우면 가, 나가 남는다. 남은 값의 차는 $\frac{\sqrt3}{2}-\frac12=\frac{\sqrt3-1}{2}$이므로 정답은 ③이다.
''','삼각비의 값','기본','네 삼각비 값 전체를 작은 것부터 나열한다.','수직선의 두 끝값을 제거하고 가운데 남은 두 특수값의 차를 계산하는 기록으로 재조직한다.','0~90도 삼각비의 값과 대소 비교','30/45/60도 값으로 기준을 정하고 같은 삼각비 cos/tan의 각도별 크기를 비교한 뒤 남은 특수각 두 값의 차를 계산한다.',['9수04-17','9수01-09','9수01-10'],'같은 함수의 예각 범위 값의 크기 비교이다. 서로 다른 삼각비 사이의 관계식이나 일반 삼각함수 그래프는 쓰지 않는다. 비교 범위·표현 변화의 충분성은 독립 검토 대상이다.')

add(6,r'''
중심이 $\mathrm{O}$이고 반지름의 길이가 $1$인 사분원에서 $\mathrm{A}$는 오른쪽 반지름의 끝점, $\mathrm{P}$는 호 위의 점이다. $\mathrm{P}$에서 $\mathrm{OA}$에 내린 수선의 발을 $\mathrm{H}$라 하자. 반직선 $\mathrm{OP}$와 점 $\mathrm{A}$를 지나 $\mathrm{OA}$에 수직인 직선의 교점을 $\mathrm{D}$라 한다.
$\theta=\angle\mathrm{POA}$는 아래 표의 네 각 중 하나이다. $\overline{\mathrm{AD}}$를 표의 근삿값으로 기록한 결과가 $0.8391$이었다.

| 각 | $\sin$ | $\cos$ | $\tan$ |
| --- | --- | --- | --- |
| $36^\circ$ | $0.5878$ | $0.8090$ | $0.7265$ |
| $40^\circ$ | $0.6428$ | $0.7660$ | $0.8391$ |
| $50^\circ$ | $0.7660$ | $0.6428$ | $1.1918$ |
| $54^\circ$ | $0.8090$ | $0.5878$ | $1.3764$ |

같은 표로 $\overline{\mathrm{PH}}$, $\overline{\mathrm{OH}}$의 길이를 차례로 기록한 것은?
''',[r'$0.7660$, $0.6428$',r'$0.5878$, $0.8090$',r'$0.6428$, $0.8391$',r'$0.8090$, $0.5878$',r'$0.6428$, $0.7660$'],'⑤',r'''
직각삼각형 $\mathrm{OAD}$에서 $\overline{\mathrm{OA}}=1$이므로 $\tan\theta=\frac{\overline{\mathrm{AD}}}{\overline{\mathrm{OA}}}$이다. 표의 tan열에서 $0.8391$인 각은 $40^\circ$이다.
직각삼각형 $\mathrm{OPH}$의 빗변은 반지름 $\overline{\mathrm{OP}}=1$이다. 따라서 표의 값을 이용하면 $\overline{\mathrm{PH}}=\sin40^\circ\fallingdotseq0.6428$, $\overline{\mathrm{OH}}=\cos40^\circ\fallingdotseq0.7660$이다.
두 기록은 차례로 $0.6428$, $0.7660$이므로 정답은 ⑤이다.
''','삼각비의 값','기본','사분원의 OH형 길이로 표의 cos행을 찾고 바깥 수직 길이를 구한다.','바깥 수직 길이의 근사 기록으로 tan행을 찾은 후 두 수선 길이 기록을 복구한다.','사분원 안팎의 직각삼각비 정의와 유한 표 조회','반지름1에 대한 tan/cos/sin의 변 대응→맞는 표의 행→요청한 두 길이.',['9수04-17','9수02-02'],'각은 표의 네 각 중 하나이며 근삿값을 정확한 삼각비 항등식이나 피타고라스 조건으로 다시 강제하지 않는다.')

add(7,r'''
세 계산식의 결과를 다음 기록표에 적으려고 한다.

| 기록 | 계산식 | 계산 결과 |
| --- | --- | --- |
| 가 | $\sin60^\circ\times\cos30^\circ$ | ㉠ |
| 나 | $\tan45^\circ\times\sin30^\circ$ | ㉡ |
| 다 | $\sin45^\circ\div\cos60^\circ-\tan30^\circ$ | ㉢ |

㉠, ㉡, ㉢에 들어갈 값을 차례로 바르게 짝지은 것은?
''',[r'$\frac34$, $\frac12$, $\sqrt2-\frac{\sqrt3}{3}$',r'$\frac{\sqrt3}{2}$, $\frac12$, $\sqrt2-\frac{\sqrt3}{3}$',r'$\frac34$, $1$, $\sqrt2-\frac{\sqrt3}{3}$',r'$\frac34$, $\frac12$, $\sqrt2-\sqrt3$',r'$\frac12$, $\frac34$, $\sqrt2-\frac{\sqrt3}{3}$'],'①',r'''
특수각의 값을 각각 대입한다.
가: $\frac{\sqrt3}{2}\times\frac{\sqrt3}{2}=\frac34$.
나: $1\times\frac12=\frac12$.
다: $\frac{\sqrt2}{2}\div\frac12-\frac{\sqrt3}{3}=\sqrt2-\frac{\sqrt3}{3}$.
따라서 세 기록은 $\frac34$, $\frac12$, $\sqrt2-\frac{\sqrt3}{3}$이고 정답은 ①이다.
''','삼각비의 값','기본','세 특수각 계산 등식의 참인 항목을 고른다.','결과가 없는 계산 기록표를 세 값의 순서 있는 기록으로 완성한다.','주어진 특수각 상수의 사칙계산','30/45/60도의 개별 값을 직접 대입하고 곱셈/나눗셈/뺄셈을 계산한다.',['9수04-17','9수01-10'],'경구q07은 유한 특수각의 수치 계산이다. 범일q07의 일반 관계식 보류와 다른 문항이며 그 보류는 바꾸지 않는다.')

add(8,r'''
삼각형 받침대 $\mathrm{ABC}$에서 $\mathrm{BC}$는 수평이고, $\mathrm{A}$에서 $\mathrm{BC}$에 내린 수선의 발 $\mathrm{H}$는 선분 $\mathrm{BC}$의 내부에 있다.
$\overline{\mathrm{AH}}=9\,\mathrm{cm}$, $\angle\mathrm{ABH}=45^\circ$, $\angle\mathrm{CAH}=35^\circ$이다. 받침대의 수평 부분 $\overline{\mathrm{BC}}$의 길이를 삼각비로 나타낸 것은?
''',[r'$9\tan35^\circ\,\mathrm{cm}$',r'$9(1+2\tan35^\circ)\,\mathrm{cm}$',r'$9(1+\tan35^\circ)\,\mathrm{cm}$',r'$9(2+\tan35^\circ)\,\mathrm{cm}$',r'$18(1+\tan35^\circ)\,\mathrm{cm}$'],'③',r'''
직각삼각형 $\mathrm{ABH}$에서 $\tan45^\circ=\frac{\overline{\mathrm{AH}}}{\overline{\mathrm{BH}}}=1$이므로 $\overline{\mathrm{BH}}=9\,\mathrm{cm}$이다.
직각삼각형 $\mathrm{ACH}$에서는 표시한 $35^\circ$에 대한 대변이 $\mathrm{CH}$이므로 $\tan35^\circ=\frac{\overline{\mathrm{CH}}}{\overline{\mathrm{AH}}}$이다. 따라서 $\overline{\mathrm{CH}}=9\tan35^\circ\,\mathrm{cm}$이다.
$\mathrm{H}$가 $\mathrm{BC}$ 내부에 있으므로 $\overline{\mathrm{BC}}=\overline{\mathrm{BH}}+\overline{\mathrm{HC}}=9(1+\tan35^\circ)\,\mathrm{cm}$이다. 정답은 ③이다.
''','삼각비의 활용','응용','두 밑각과 전체 밑변이 주어지고 높이를 삼각비 식으로 구한다.','받침대의 높이를 주고 두 밑변 부분을 복구해 전체 길이 식을 정하는 역목표다.','수선으로 나눈 두 직각삼각형의 tan 정의','각 직각삼각형에서 필요한 수평/수직 길이 비를 세운 뒤 밑변 두 부분을 합한다.',['9수04-18','9수04-17'],'35도는 실제ACH의 A각으로 주어지므로 여각 삼각비 관계식을 쓰지 않는다.')

add(9,r'''
직각삼각형 $\mathrm{ABC}$에서 $\angle\mathrm{C}=90^\circ$, $\overline{\mathrm{AB}}=25\,\mathrm{cm}$, $\overline{\mathrm{AC}}=15\,\mathrm{cm}$이다. $\mathrm{AD}$는 $\angle\mathrm{BAC}$의 이등분선이고 $\mathrm{D}$는 $\mathrm{BC}$ 위에 있다.
그림의 $\mathrm{E}$는 $\mathrm{D}$에서 $\mathrm{AB}$에 내린 수선의 발이다. $\theta=\angle\mathrm{ADC}$일 때 다음 기록표를 완성하려고 한다.

| 기록 항목 | $\overline{\mathrm{DC}}$의 길이 | $\tan\theta$ |
| --- | --- | --- |
| 기록 | ㉠ $\mathrm{cm}$ | ㉡ |

㉠, ㉡에 들어갈 값을 차례로 바르게 짝지은 것은?
''',[r'$\frac{25}{2}$, $\frac65$',r'$\frac{15}{2}$, $2$',r'$10$, $\frac32$',r'$\frac{15}{2}$, $\frac12$',r'$5$, $3$'],'②',r'''
피타고라스 정리에서 $\overline{\mathrm{BC}}=\sqrt{25^2-15^2}=20\,\mathrm{cm}$이다.
직각삼각형 $\mathrm{ADE}$와 $\mathrm{ADC}$는 $\mathrm{AD}$가 공통이고, $\angle\mathrm{EAD}=\angle\mathrm{DAC}$이다. 두 직각의 크기가 같으므로 남은 D각도 같아 두 삼각형은 합동이다. 따라서 $\overline{\mathrm{DE}}=\overline{\mathrm{DC}}$이다.
또 $\triangle\mathrm{BDE}\sim\triangle\mathrm{BAC}$이다. 두 삼각형에서 B각이 같고 E각과 C각이 모두 직각이기 때문이다.
$\overline{\mathrm{DC}}=t$라 하면 $\overline{\mathrm{BD}}=20-t$이고 닮음의 성질에서 $\frac{20-t}{25}=\frac{t}{15}$이다. 이를 풀면 $300-15t=25t$, $t=\frac{15}{2}$이다.
직각삼각형 $\mathrm{ADC}$에서 $\tan\theta=\frac{\overline{\mathrm{AC}}}{\overline{\mathrm{DC}}}=15\div\frac{15}{2}=2$이다. 두 기록은 $\frac{15}{2}$, $2$이므로 정답은 ②이다.
''','삼각비의 뜻','응용','각의 이등분선이 자른 길이로 작은 직각삼각형의 tan을 구한다.','수선E를 명시하고 닮음으로 내부 길이를 복구한 후 DC와tan의 두 기록을 완성한다.','각 이등분선의 합동/닮음과 직각삼각비','피타고라스→제시된 수선의 두 삼각형 합동→AA 닮음→길이 분할→tan 정의.',['9수04-16','9수04-13','9수04-14','9수04-17'],'E가 이미 제시되어 추가 작도 탐색이 없다. 각 이등분선의 비를 근거 없이 외우는 대신 합동과 AA 닮음으로 설명한다.')

add(10,r'''
직사각형 $\mathrm{ABCD}$에서 $\mathrm{E}$는 $\mathrm{BC}$ 위, $\mathrm{F}$는 $\mathrm{CD}$ 위의 점이다. $\overline{\mathrm{AB}}=2\sqrt3\,\mathrm{cm}$, $\angle\mathrm{BAE}=45^\circ$, $\angle\mathrm{EAF}=30^\circ$이고 $\mathrm{AE}\perp\mathrm{EF}$이다.
다음 각도·삼각비 기록의 빈칸을 완성하려고 한다.

| 기록 항목 | $\angle\mathrm{DAF}$의 크기 | $\cos\angle\mathrm{DAF}$ |
| --- | --- | --- |
| 기록 | ㉠ | ㉡ |

㉠, ㉡에 들어갈 값을 차례로 바르게 짝지은 것은?
''',[r'$15^\circ$, $\frac{\sqrt6-\sqrt2}{4}$',r'$30^\circ$, $\frac{\sqrt3}{2}$',r'$15^\circ$, $\frac{\sqrt6+\sqrt2}{4}$',r'$45^\circ$, $\frac{\sqrt2}{2}$',r'$15^\circ$, $\frac{\sqrt3+1}{2}$'],'③',r'''
직사각형의 A각은 $90^\circ$이므로 $\angle\mathrm{DAF}=90^\circ-45^\circ-30^\circ=15^\circ$이다.
직각삼각형 $\mathrm{ABE}$의 두 직각변은 같아 $\overline{\mathrm{BE}}=2\sqrt3$, $\overline{\mathrm{AE}}=2\sqrt6$이다.
직각삼각형 $\mathrm{AEF}$에서 $\overline{\mathrm{EF}}=\overline{\mathrm{AE}}\tan30^\circ=2\sqrt2$, $\overline{\mathrm{AF}}=\overline{\mathrm{AE}}\div\cos30^\circ=4\sqrt2$이다.
$\mathrm{AE}$가 수평선과 이루는 각이 $45^\circ$이고 $\mathrm{EF}\perp\mathrm{AE}$이므로 직각삼각형 $\mathrm{ECF}$는 두 예각이 $45^\circ$이다. 따라서 $\overline{\mathrm{EC}}=\overline{\mathrm{CF}}=2$이다.
$\overline{\mathrm{AD}}=\overline{\mathrm{BC}}=2\sqrt3+2$이므로 직각삼각형 $\mathrm{ADF}$에서 $\cos\angle\mathrm{DAF}=\frac{2\sqrt3+2}{4\sqrt2}=\frac{\sqrt6+\sqrt2}{4}$이다. 정답은 ③이다.
''','삼각비의 값','응용','직사각형 안의45/30도 직각삼각형을 이용해sin15를 구한다.','각도와cos값의 두 기록을 구하며 세로 차를 분자로 쓰는 원문과 달리 수평 길이의 합을 복구한다.','특수각으로 정한 실제 길이와 새로운 예각의 삼각비 정의','45도 삼각형→30도 삼각형→다른45도 삼각형→직사각형 변 합→AD/AF.',['9수04-17','9수04-16','9수01-10'],'15도의 값을 각의 덧셈/뺄셈 공식으로 얻지 않고 명시된 직각삼각형의 길이 비로 구한다.')

add(11,r'''
사각뿔의 밑면 $\mathrm{ABCD}$는 한 변의 길이가 $6\,\mathrm{cm}$인 정사각형이다. $\mathrm{H}$는 밑면의 두 대각선의 교점이고, 꼭짓점 $\mathrm{O}$에서 밑면에 내린 수선의 발도 $\mathrm{H}$이다.
첫 번째 그림은 밑면, 두 번째 그림은 세 점 $\mathrm{O,A,H}$가 이루는 직각삼각형이다. $\angle\mathrm{OAH}=30^\circ$일 때 다음 기록표를 완성하려고 한다.

| 기록 항목 | 사각뿔의 높이 | 사각뿔의 부피 |
| --- | --- | --- |
| 기록 | ㉠ $\mathrm{cm}$ | ㉡ $\mathrm{cm}^3$ |

㉠, ㉡에 들어갈 값을 차례로 바르게 짝지은 것은?
''',[r'$\sqrt6$, $36\sqrt6$',r'$3\sqrt2$, $36\sqrt2$',r'$2\sqrt6$, $24\sqrt6$',r'$\sqrt6$, $12\sqrt6$',r'$\sqrt2$, $12\sqrt2$'],'④',r'''
정사각형의 대각선은 $6\sqrt2\,\mathrm{cm}$이므로 $\overline{\mathrm{AH}}=3\sqrt2\,\mathrm{cm}$이다.
두 번째 그림의 직각삼각형에서 $\tan30^\circ=\frac{\overline{\mathrm{OH}}}{\overline{\mathrm{AH}}}$이므로 높이는 $\overline{\mathrm{OH}}=3\sqrt2\times\frac{\sqrt3}{3}=\sqrt6\,\mathrm{cm}$이다.
밑면의 넓이는 $6^2=36\,\mathrm{cm}^2$이므로 부피는 $\frac13\times36\times\sqrt6=12\sqrt6\,\mathrm{cm}^3$이다. 두 기록은 $\sqrt6$, $12\sqrt6$이므로 정답은 ④이다.
''','삼각비의 활용','응용','한 입체 그림에서 정사각뿔의 부피를 구한다.','입체를 밑면과실제OAH 단면의 두 평면 그림으로 조직하고 높이·부피 기록을 완성한다.','정사각뿔의 직각 단면, 삼각비와부피','정사각형의 반대각선→단면tan30로높이→밑면넓이×높이÷3.',['9수04-18','9수04-17','9수04-16','9수04-09'],'H를 대각선 교점/수선의 발로 명시했다. 일반 공간각·정사영·벡터를 요구하지 않는다.')

add(12,r'''
수평 바닥의 두 점 $\mathrm{B,C}$ 사이에 삼각형 지지틀을 설치한다. $\mathrm{H}$는 선분 $\mathrm{BC}$의 내부에 있고, 수직 막대 $\mathrm{AH}$의 길이는 $6\,\mathrm{cm}$이다. 두 지지대 $\mathrm{AB}$와 $\mathrm{AC}$는 바닥과 각각 $60^\circ$, $45^\circ$를 이룬다.
지지틀의 바닥 부분 $\overline{\mathrm{BC}}$의 길이는?
''',[r'$6-2\sqrt3\,\mathrm{cm}$',r'$6+2\sqrt3\,\mathrm{cm}$',r'$6\sqrt3\,\mathrm{cm}$',r'$12\,\mathrm{cm}$',r'$2+6\sqrt3\,\mathrm{cm}$'],'②',r'''
직각삼각형 $\mathrm{ABH}$에서 $\tan60^\circ=\frac6{\overline{\mathrm{BH}}}=\sqrt3$이므로 $\overline{\mathrm{BH}}=2\sqrt3\,\mathrm{cm}$이다.
직각삼각형 $\mathrm{ACH}$에서는 $\tan45^\circ=\frac6{\overline{\mathrm{CH}}}=1$이므로 $\overline{\mathrm{CH}}=6\,\mathrm{cm}$이다.
$\mathrm{H}$가 두 점 사이에 있으므로 $\overline{\mathrm{BC}}=\overline{\mathrm{BH}}+\overline{\mathrm{HC}}=6+2\sqrt3\,\mathrm{cm}$이다. 정답은 ②이다.
''','삼각비의 활용','응용','양쪽 관측점 사이 거리로 탑의높이를 구한다.','높이가정해진 지지틀의바닥전체길이를 역으로구한다.','높이를 공유하는 두 직각삼각형의tan','각각 높이/밑변의 비를 세우고 수평 두 길이를 합한다.',['9수04-18','9수04-17','9수01-10'],'탑 사진 대신 수학 관계가 완결된 벡터 지지틀을 새로 그린다. H는BC내부임을 명시한다.')

add(13,r'''
정삼각형 $\mathrm{ABC}$에서 점 $\mathrm{D}$는 선분 $\mathrm{AB}$의 내부에 있다. $\angle\mathrm{ADC}=105^\circ$이고 삼각형 $\mathrm{ADC}$의 넓이는 $18\sqrt3\,\mathrm{cm}^2$이다.
그림의 $\mathrm{E}$는 $\mathrm{D}$에서 $\mathrm{BC}$에 내린 수선의 발, $\mathrm{F}$는 $\mathrm{C}$에서 직선 $\mathrm{AB}$에 내린 수선의 발이다.
이 넓이 기록을 만족하는 $\overline{\mathrm{BD}}$의 길이는?
''',[r'$6\,\mathrm{cm}$',r'$6\sqrt2\,\mathrm{cm}$',r'$9\,\mathrm{cm}$',r'$12\,\mathrm{cm}$',r'$12\sqrt2\,\mathrm{cm}$'],'④',r'''
$\angle\mathrm{BDC}=180^\circ-105^\circ=75^\circ$이고 $\angle\mathrm{DBC}=60^\circ$이므로 $\angle\mathrm{BCD}=45^\circ$이다.
$\overline{\mathrm{BD}}=t\,\mathrm{cm}$라 하자. 직각삼각형 $\mathrm{BDE}$에서 $\overline{\mathrm{BE}}=\frac t2$, $\overline{\mathrm{DE}}=\frac{t\sqrt3}{2}$이다. 직각삼각형 $\mathrm{CDE}$의 C각이 $45^\circ$이므로 $\overline{\mathrm{EC}}=\overline{\mathrm{DE}}$이다.
따라서 $\overline{\mathrm{BC}}=\overline{\mathrm{AB}}=\frac{t(1+\sqrt3)}2$이고, $\overline{\mathrm{AD}}=\frac{t(\sqrt3-1)}2$이다.
직각삼각형 $\mathrm{BCF}$에서 $\overline{\mathrm{CF}}=\overline{\mathrm{BC}}\sin60^\circ=\frac{t\sqrt3(1+\sqrt3)}4$이다.
삼각형 $\mathrm{ADC}$는 밑변을 $\mathrm{AD}$, 그 직선에 대한 높이를 $\mathrm{CF}$로 보아 넓이를 구한다. 따라서 $\frac12\times\frac{t(\sqrt3-1)}2\times\frac{t\sqrt3(1+\sqrt3)}4=\frac{t^2\sqrt3}{8}$이다.
이 값이 $18\sqrt3$이므로 $t^2=144$이다. 양의 길이 $t=12$를 택하므로 정답은 ④이다.
''','삼각비의 활용','심화하','정삼각형변위의점과105도 조건, BD길이로부분넓이를구한다.','부분넓이를주고BD를복구하는역목표이며필요한두수선발을명시한다.','특수각 직각삼각형의 높이와 부분삼각형넓이','각의합→60/45도직각삼각형→밑변분할→직선에대한높이→삼각형넓이→양의실근.',['9수04-18','9수04-17','6수03-06','9수01-10','9수02-13'],'두 수선은 이미 제시했다. F는AD밖의직선상 높이의 발이며 sin105/사인넓이공식/사인법칙을 쓰지 않는다. 독립 전체범위·복잡도 검수는 아직 필요하다.')

add(14,r'''
반지름이 $10\,\mathrm{cm}$인 원형 안내판에 길이가 $12\,\mathrm{cm}$인 현 $\mathrm{AB}$를 표시했다. 안내판의 중심 $\mathrm{O}$에서 이 현에 내린 수선의 발을 $\mathrm{M}$이라 한다.
중심과 현 사이 거리 $\overline{\mathrm{OM}}$은?
''',[r'$4\,\mathrm{cm}$',r'$5\,\mathrm{cm}$',r'$6\,\mathrm{cm}$',r'$8\,\mathrm{cm}$',r'$12\,\mathrm{cm}$'],'④',r'''
원의 중심에서 현에 내린 수선은 현을 이등분하므로 $\overline{\mathrm{AM}}=6\,\mathrm{cm}$이다.
직각삼각형 $\mathrm{OMA}$에서 $\overline{\mathrm{OM}}^2=10^2-6^2=64$이다. 거리는 양수이므로 $\overline{\mathrm{OM}}=8\,\mathrm{cm}$이고 정답은 ④이다.
''','원과 현','기본','반지름과중심거리로현의전체길이를구한다.','안내판현의전체길이와반지름으로중심에서현까지의거리을복구한다.','현의수직이등분과피타고라스','현을반으로나누고반지름·반현·거리의직각삼각형식에서양의길이를구한다.',['9수04-19','9수04-16'])

add(15,r'''
원 $\mathrm{O}$의 두 현 $\mathrm{AB}$, $\mathrm{AC}$에 중심에서 내린 수선의 발은 각각 $\mathrm{M,N}$이다. $\overline{\mathrm{OM}}=\overline{\mathrm{ON}}$이다.
삼각형 $\mathrm{ABC}$의 두 각을 다음과 같이 기록했다.

| 각 | 기록 |
| --- | --- |
| $\angle\mathrm{ABC}$ | $(x+28)^\circ$ |
| $\angle\mathrm{BCA}$ | $(2x-2)^\circ$ |

이 기록을 만족하는 $x$와 $\angle\mathrm{BAC}$의 크기를 차례로 바르게 짝지은 것은?
''',[r'$30$, $58^\circ$',r'$32$, $60^\circ$',r'$28$, $68^\circ$',r'$30$, $64^\circ$',r'$30$, $116^\circ$'],'④',r'''
같은 원에서 중심과의 거리가 같은 두 현의 길이는 같으므로 $\overline{\mathrm{AB}}=\overline{\mathrm{AC}}$이다. 따라서 삼각형의 B각과 C각은 같다.
$x+28=2x-2$이므로 $x=30$이고 두 각은 각각 $58^\circ$이다.
삼각형의 세 각의 합을 이용하면 $\angle\mathrm{BAC}=180^\circ-58^\circ-58^\circ=64^\circ$이다. 정답은 ④이다.
''','원과 현','기본','같은거리의현과꼭짓점52도로밑각한개를구한다.','두밑각의일차식기록을일치시켜매개변수와꼭짓점각을함께복구한다.','중심거리같은현과이등변삼각형','같은거리→같은현→같은밑각→일차식일치→삼각형각의합.',['9수04-19','9수02-06'],'범일의 이미 작성한같은거리현문항을숫자만바꿔복제하지않고,두각의일차식일치와매개변수기록을새로사용한다.')

add(16,r'''
원 밖의 점 $\mathrm{P}$에서 원 $\mathrm{O}$에 그은 접선의 접점을 $\mathrm{A}$라 하자. $\mathrm{O,B,P}$는 한 직선 위에 이 순서로 놓이고 $\mathrm{B}$는 원 위의 점이다.
원의 반지름은 $8\,\mathrm{cm}$이고 삼각형 $\mathrm{OAP}$의 넓이 기록은 $24\,\mathrm{cm}^2$이다. 이 기록으로 복구한 원 바깥의 길이 $\overline{\mathrm{BP}}$는?
''',[r'$1\,\mathrm{cm}$',r'$2\,\mathrm{cm}$',r'$3\,\mathrm{cm}$',r'$4\,\mathrm{cm}$',r'$6\,\mathrm{cm}$'],'②',r'''
접점에 그은 반지름은 접선에 수직이므로 $\angle\mathrm{OAP}=90^\circ$이다.
삼각형의 넓이에서 $\frac12\times8\times\overline{\mathrm{AP}}=24$이므로 $\overline{\mathrm{AP}}=6\,\mathrm{cm}$이다.
피타고라스 정리에 의하여 $\overline{\mathrm{OP}}=\sqrt{8^2+6^2}=10\,\mathrm{cm}$이다. $\overline{\mathrm{OB}}=8\,\mathrm{cm}$이므로 $\overline{\mathrm{BP}}=10-8=2\,\mathrm{cm}$이고 정답은 ②이다.
''','원의 접선','기본','반지름과원바깥길이를합해OP를정하고접선삼각형의넓이를구한다.','넓이를입력으로주어접선길이와OP를복구하고바깥구간BP를구한다.','접점반지름의직각과피타고라스','삼각형넓이/양의접선길이→피타고라스→반지름과바깥구간의합또는차.',['9수04-19','9수04-16','6수03-06'],'O,B,P순서로원밖조건을명시한다. 원의거듭제곱이나원과비례를쓰지않는다.')

add(17,r'''
중심이 $\mathrm{O}$인 서로 다른 두 동심원 사이의 고리 부분 넓이는 $49\pi\,\mathrm{cm}^2$이다. 큰 원의 현 $\mathrm{AB}$가 작은 원에 점 $\mathrm{H}$에서 접한다.
이 넓이 기록을 만족하는 현 $\overline{\mathrm{AB}}$의 길이는?
''',[r'$7\,\mathrm{cm}$',r'$10\,\mathrm{cm}$',r'$12\,\mathrm{cm}$',r'$14\,\mathrm{cm}$',r'$28\,\mathrm{cm}$'],'④',r'''
큰 원과 작은 원의 반지름을 각각 $R,r$라 하면 $R>r>0$이고 고리 넓이는 $\pi(R^2-r^2)$이다.
접점에서 $\mathrm{OH}\perp\mathrm{AB}$이다. 중심에서 현에 내린 수선은 현을 이등분하므로 $\overline{\mathrm{AH}}=\overline{\mathrm{HB}}=t$라 하자.
직각삼각형 $\mathrm{OHA}$의 피타고라스 정리에서 $R^2-r^2=t^2$이다. 따라서 $\pi t^2=49\pi$이고 양의 길이 $t=7$이다.
현의 전체 길이는 $2t=14\,\mathrm{cm}$이므로 정답은 ④이다.
''','원과 현','기본','작은원에접한큰원현12로고리넓이를구한다.','고리넓이기록으로현의전체길이를복구한다.','수선이현을이등분하는성질과반지름제곱차','접점직각→현이등분→피타고라스→큰원넓이−작은원넓이의기록.',['9수04-19','9수04-16','6수03-08'],'두반지름자체는여러값이가능하지만현길이는유일하다. 원과비례를쓰지않는다.')

add(18,r'''
반원형 창의 지지틀 $\mathrm{ABCD}$에서 $\mathrm{BC}$는 반원의 지름이다. $\mathrm{AB}$, $\mathrm{CD}$는 각각 지름의 끝점 $\mathrm{B,C}$에서 반원에 접하고, $\mathrm{AD}$는 반원에 점 $\mathrm{E}$에서 접한다. $\mathrm{E}$는 선분 $\mathrm{AD}$의 내부에 있다.
$\overline{\mathrm{AB}}=3\,\mathrm{cm}$, $\overline{\mathrm{CD}}=12\,\mathrm{cm}$이다. 그림의 $\mathrm{F}$는 $\mathrm{A}$에서 $\mathrm{CD}$에 내린 수선의 발이다.
지지틀의 네 변을 따라 잰 둘레의 길이는?
''',[r'$24\,\mathrm{cm}$',r'$27\,\mathrm{cm}$',r'$30\,\mathrm{cm}$',r'$39\,\mathrm{cm}$',r'$42\,\mathrm{cm}$'],'⑤',r'''
한 점에서 원에 그은 두 접선의 길이는 같으므로 $\overline{\mathrm{AE}}=\overline{\mathrm{AB}}=3$, $\overline{\mathrm{DE}}=\overline{\mathrm{DC}}=12$이다. E가 AD안에 있으므로 $\overline{\mathrm{AD}}=15\,\mathrm{cm}$이다.
AB와CD는지름에수직이다. 따라서 $\overline{\mathrm{CF}}=\overline{\mathrm{AB}}=3$이고 $\overline{\mathrm{DF}}=12-3=9$이다.
직각삼각형 $\mathrm{AFD}$에서 $\overline{\mathrm{AF}}=\sqrt{15^2-9^2}=12\,\mathrm{cm}$이다. $\overline{\mathrm{BC}}=\overline{\mathrm{AF}}=12$이므로 둘레는 $3+12+12+15=42\,\mathrm{cm}$이다. 정답은 ⑤이다.
''','원의 접선','기본','반원의양쪽접선높이로지름을구한다.','새지지틀의네변둘레를묻고접점E의내부조건과수선F를제공한다.','같은점접선길이와직각삼각형','접선길이합으로사선변→높이차→피타고라스지름→둘레.',['9수04-19','9수04-16'],'범일q21의왼쪽접선높이역산과다른전체둘레목표다. 원과비례를사용하지않는다.')

add(19,r'''
정사각형 $\mathrm{ABCD}$의 둘레는 $20\,\mathrm{cm}$이다. $\mathrm{BC}$를 지름으로 하는 반원은 정사각형 안쪽에 있다. $\mathrm{E}$는 선분 $\mathrm{CD}$의 내부에 있고, $\mathrm{AE}$는 반원에 점 $\mathrm{F}$에서 접한다. F는 선분AE의내부에 있다.
모서리 $\mathrm{D}$에서 접선의 끝점 $\mathrm{E}$까지의 길이 $\overline{\mathrm{DE}}$는?
''',[r'$\frac54\,\mathrm{cm}$',r'$\frac52\,\mathrm{cm}$',r'$\frac{15}{4}\,\mathrm{cm}$',r'$5\,\mathrm{cm}$',r'$\frac{25}{4}\,\mathrm{cm}$'],'③',r'''
정사각형의 한 변은 $20\div4=5\,\mathrm{cm}$이다. $\overline{\mathrm{CE}}=x$라 하자.
점A에서의두접선길이가같아 $\overline{\mathrm{AF}}=\overline{\mathrm{AB}}=5$이고, 점E에서도 $\overline{\mathrm{EF}}=\overline{\mathrm{EC}}=x$이다. 따라서 $\overline{\mathrm{AE}}=5+x$이다.
한편 $\overline{\mathrm{DE}}=5-x$이므로 직각삼각형 $\mathrm{ADE}$의 피타고라스 정리는 $(5+x)^2=5^2+(5-x)^2$이다.
식을 전개하여 같은 항을 없애면 $20x=25$이므로 $x=\frac54$이다. 따라서 $\overline{\mathrm{DE}}=5-\frac54=\frac{15}{4}\,\mathrm{cm}$이고 정답은 ③이다.
''','원의 접선','응용','사각형안의반원에접한AE길이로정사각형변을구한다.','프레임둘레로변을정한뒤접선끝점이모서리에서떨어진DE길이를복구한다.','두점의접선길이와정사각형속피타고라스','두접선길이합→정사각형변에서남는높이→피타고라스전개→양의내부길이.',['9수04-19','9수04-16','9수02-12'],'E와F의내부조건을명시한다. 원의거듭제곱이나원과비례가필요없다.')

add(21,r'''
두 수직 지지대 $\mathrm{AB}$, $\mathrm{DC}$의 밑점 $\mathrm{B,C}$는 같은 수평선 위에 있다. 두 연결대 $\mathrm{AC}$, $\mathrm{BD}$의 교점을 $\mathrm{P}$라 하자.
$\angle\mathrm{BAC}=45^\circ$, $\angle\mathrm{BDC}=60^\circ$, $\overline{\mathrm{AC}}=6\sqrt2\,\mathrm{cm}$이다. $\mathrm{H}$는 $\mathrm{P}$에서 $\mathrm{BC}$에 내린 수선의 발이다. 다음 지지틀 기록을 완성하고 풀이를 쓰시오.
⑴ $\angle\mathrm{APB}$의 크기. [2점]
⑵ 오른쪽 지지대 $\overline{\mathrm{DC}}$의 길이. [2점]
⑶ 연결대 $\overline{\mathrm{BD}}$의 길이. [2점]
⑷ 아래쪽 삼각형 $\mathrm{BPC}$의 넓이. [4점]
''',[],r'⑴ $75^\circ$ ⑵ $2\sqrt3\,\mathrm{cm}$ ⑶ $4\sqrt3\,\mathrm{cm}$ ⑷ $9(\sqrt3-1)\,\mathrm{cm}^2$',r'''
⑴ $\triangle\mathrm{ABC}$의B각은직각이다. 또 $\triangle\mathrm{BDC}$에서 C각이직각이고D각이 $60^\circ$이므로 $\angle\mathrm{PBC}=30^\circ$, $\angle\mathrm{ABP}=60^\circ$이다. 따라서 $\angle\mathrm{APB}=180^\circ-45^\circ-60^\circ=75^\circ$이다.
⑵ $\triangle\mathrm{ABC}$는45도직각삼각형이므로 $\overline{\mathrm{AB}}=\overline{\mathrm{BC}}=6$이다. $\tan60^\circ=\frac{\overline{\mathrm{BC}}}{\overline{\mathrm{DC}}}=\sqrt3$이므로 $\overline{\mathrm{DC}}=6\div\sqrt3=2\sqrt3\,\mathrm{cm}$이다.
⑶ $\cos60^\circ=\frac{\overline{\mathrm{DC}}}{\overline{\mathrm{BD}}}=\frac12$이므로 $\overline{\mathrm{BD}}=4\sqrt3\,\mathrm{cm}$이다.
⑷ $\overline{\mathrm{PH}}=t$라 하자. 직각삼각형BPH의B각이30도이므로 $\overline{\mathrm{BH}}=t\sqrt3$이다. 직각삼각형CPH의C각은45도이므로 $\overline{\mathrm{CH}}=t$이다.
따라서 $t\sqrt3+t=6$이고 $t=\frac6{\sqrt3+1}=3(\sqrt3-1)$이다. 삼각형BPC의밑변은BC,높이는PH이므로넓이는 $\frac12\times6\times3(\sqrt3-1)=9(\sqrt3-1)\,\mathrm{cm}^2$이다.
''','삼각비의 활용','응용','CD길이로교차도형의각·두대각선길이·윗삼각형넓이를구한다.','AC길이를입력으로바꾸고다른수직지지대·연결대·아래삼각형넓이의기록을구한다.','교차하는두직각삼각형의특수각과높이','각의합→45/60도삼각비의길이→두작은직각삼각형의수평분할→밑변×높이÷2.',['9수04-18','9수04-17','6수03-06','9수01-10'],'P의수선발H를명시한다. 일반삼각형사인넓이공식이나sin75값이필요없다.',[2,2,2,4])

add(22,r'''
원 밖의 점 $\mathrm{A}$를 지나는 두 직선은 원 $\mathrm{O}$에 각각 점 $\mathrm{P,Q}$에서 접한다. 점 $\mathrm{C}$는 선분 $\mathrm{AP}$의 내부에, 점 $\mathrm{B}$는 선분 $\mathrm{AQ}$의 내부에 있다. 선분 $\mathrm{BC}$도 이 원에 점 $\mathrm{D}$에서 접하며 D는BC의내부에있다.
$\angle\mathrm{PAQ}=60^\circ$이고 삼각형 $\mathrm{ABC}$의 둘레는 $6\sqrt3\,\mathrm{cm}$이다. 다음을 구하고 풀이를 쓰시오.
⑴ 둘레와 $\overline{\mathrm{AP}}$의 관계를 설명하고 $\overline{\mathrm{AP}}$의 길이를 구하시오. [4점]
⑵ 원의 반지름의 길이. [2점]
⑶ $\overline{\mathrm{AO}}$의 길이. [2점]
''',[],r'⑴ 둘레 $=2\overline{\mathrm{AP}}$, $\overline{\mathrm{AP}}=3\sqrt3\,\mathrm{cm}$ ⑵ $3\,\mathrm{cm}$ ⑶ $6\,\mathrm{cm}$',r'''
⑴ 같은점에서그은접선의길이는같다. 따라서 $\overline{\mathrm{CP}}=\overline{\mathrm{CD}}$, $\overline{\mathrm{BQ}}=\overline{\mathrm{BD}}$, $\overline{\mathrm{AP}}=\overline{\mathrm{AQ}}$이다.
주어진점의순서에의하여 $\overline{\mathrm{AP}}=\overline{\mathrm{AC}}+\overline{\mathrm{CP}}$, $\overline{\mathrm{AQ}}=\overline{\mathrm{AB}}+\overline{\mathrm{BQ}}$, $\overline{\mathrm{BC}}=\overline{\mathrm{CD}}+\overline{\mathrm{DB}}$이다. 이를합하면삼각형둘레는 $\overline{\mathrm{AP}}+\overline{\mathrm{AQ}}=2\overline{\mathrm{AP}}$이다. 따라서 $\overline{\mathrm{AP}}=3\sqrt3\,\mathrm{cm}$이다.
⑵ 접점P,Q에서반지름은접선에수직이다. 두직각삼각형AOP와AOQ는빗변AO가공통이고반지름OP와OQ가같으므로합동이다. 따라서 $\angle\mathrm{PAO}=30^\circ$이다. $\tan30^\circ=\frac{\overline{\mathrm{OP}}}{\overline{\mathrm{AP}}}$이므로반지름은 $3\sqrt3\times\frac{\sqrt3}{3}=3\,\mathrm{cm}$이다.
⑶ $\cos30^\circ=\frac{\overline{\mathrm{AP}}}{\overline{\mathrm{AO}}}=\frac{\sqrt3}{2}$이므로 $\overline{\mathrm{AO}}=3\sqrt3\div\frac{\sqrt3}{2}=6\,\mathrm{cm}$이다.
''','원의 접선','응용','AP/AQ의반직선접선과주어진AO로반지름·접선길이·삼각형둘레를구한다.','벡터같이변환된화살표를제거하고접선직선/점순서를명시하며둘레를입력으로접선·반지름·AO를역산한다.','두접선길이,접점직각과30도직각삼각형','접선길이합으로둘레관계→합동으로각이등분→tan/cos30의직각삼각형길이.',['9수04-19','9수04-17'],'원본화살표는그림에서반직선이다. 새학생면은직선/선분을말로정의하며벡터연산이없다. A,C,P와A,B,Q순서및D의내부조건이필수다.',[4,2,2])

add(23,r'''
원 밖의 점 $\mathrm{P}$에서 원 $\mathrm{O}$에 그은 두 접선의 접점을 $\mathrm{A,B}$라 하자. $\angle\mathrm{APB}:\angle\mathrm{AOB}=1:2$이다. 여기서 $\angle\mathrm{AOB}$는 두 접점을 잇는 작은 호에 대한 중심각이다.
두 접선분PA,PB와작은호AB로둘러싸인원바깥의색칠한부분넓이는 $(12\sqrt3-4\pi)\,\mathrm{cm}^2$이다. 다음 기록을 복구하고 풀이를 쓰시오.
⑴ $\angle\mathrm{AOB}$의 크기. [3점]
⑵ 원의 반지름의 길이. [4점]
⑶ $\overline{\mathrm{OP}}$의 길이. [3점]
''',[],r'⑴ $120^\circ$ ⑵ $2\sqrt3\,\mathrm{cm}$ ⑶ $4\sqrt3\,\mathrm{cm}$',r'''
⑴ 접점의반지름과접선은수직이다. 따라서사각형PAOB의A각,B각은직각이고나머지두각의합은 $180^\circ$이다. 두각의비가1:2이므로 $\angle\mathrm{AOB}=120^\circ$, $\angle\mathrm{APB}=60^\circ$이다.
⑵ 반지름을 $r\,\mathrm{cm}$라하자. 두직각삼각형PAO와PBO는빗변PO가공통이고반지름OA=OB이므로합동이다. 따라서 $\angle\mathrm{APO}=30^\circ$이다. $\tan30^\circ=\frac r{\overline{\mathrm{PA}}}$이므로 $\overline{\mathrm{PA}}=r\sqrt3$이다.
사각형PAOB의넓이는두직각삼각형넓이의합이므로 $r^2\sqrt3$이다. 작은부채꼴AOB의넓이는 $\frac{120}{360}\pi r^2=\frac{\pi r^2}{3}$이다. 따라서색칠넓이는 $r^2(\sqrt3-\frac\pi3)$이다.
주어진넓이는 $12(\sqrt3-\frac\pi3)$이다. 실제색칠영역은양의넓이이므로괄호의값은0이아니다. 두식을비교하면 $r^2=12$이고양의반지름 $r=2\sqrt3$이다.
⑶ 직각삼각형PAO에서 $\sin30^\circ=\frac r{\overline{\mathrm{OP}}}=\frac12$이므로 $\overline{\mathrm{OP}}=2r=4\sqrt3\,\mathrm{cm}$이다.
''','원의 접선','응용','각비와반지름으로중심각·OP·작은호와접선사이넓이를구한다.','같은작은호영역의넓이를입력으로반지름과OP를복구하는역목표다.','접점직각,합동이등분과접선삼각형−도단위부채꼴넓이','사각형각의합→직각삼각형합동→30도길이비→두삼각형합에서부채꼴빼기→양의반지름.',['9수04-19','9수04-17','6수03-06','6수03-08','9수01-10','9수02-13'],'작은호/원바깥영역을명시한다. 삼각비는30도만사용하며120도는중심각과도단위부채꼴비율이다. 라디안이나삼각비관계식이없다.',[3,4,3])

DATA[15]['codes']=['9수04-19','9수02-05']
DATA[9]['codes']+=['9수04-04','9수02-05']
DATA[10]['codes']+=['9수04-12']
DATA[11]['codes']+=['9수04-12']
DATA[13]['codes']+=['9수04-05']
DATA[15]['codes']+=['9수04-10','9수04-05']
DATA[18]['codes']+=['9수04-12']
DATA[19]['codes']+=['9수04-12','9수02-05']
DATA[21]['codes']+=['9수04-05','9수02-05']
DATA[22]['codes']+=['9수04-04']
DATA[23]['codes']+=['9수04-04','9수04-05','9수04-06','9수01-07']

# Student prose polish is part of authorship; none of these are source solutions.
DATA[6]['content']=DATA[6]['content'].replace('오른쪽 반지름의 끝점,', '오른쪽 반지름의 끝점, $\\mathrm{B}$는 위쪽 반지름의 끝점,')
DATA[9]['solution']=DATA[9]['solution'].replace('두 직각의 크기가 같으므로 남은 D각도 같아 두 삼각형은 합동이다.', '두 직각의 크기가 같으므로 남은 D각도 같다. 한 변 $\\mathrm{AD}$와 그 양 끝 각이 각각 같아 두 삼각형은 ASA 합동이다.')
DATA[18]['solution']=r'''
한 점에서 원에 그은 두 접선의 길이는 같으므로 $\overline{\mathrm{AE}}=\overline{\mathrm{AB}}=3$, $\overline{\mathrm{DE}}=\overline{\mathrm{DC}}=12$이다. E가 선분 AD의 내부에 있으므로 $\overline{\mathrm{AD}}=15\,\mathrm{cm}$이다.
AB와 CD는 지름에 수직이다. 따라서 $\overline{\mathrm{CF}}=\overline{\mathrm{AB}}=3$이고 $\overline{\mathrm{DF}}=12-3=9$이다.
직각삼각형 $\mathrm{AFD}$에서 $\overline{\mathrm{AF}}=\sqrt{15^2-9^2}=12\,\mathrm{cm}$이다. $\overline{\mathrm{BC}}=\overline{\mathrm{AF}}=12$이므로 둘레는 $3+12+12+15=42\,\mathrm{cm}$이다. 정답은 ⑤이다.
'''.strip()
DATA[19]['content']=DATA[19]['content'].replace('F는 선분AE의내부에 있다.', 'F는 선분 AE의 내부에 있다.')
DATA[18]['content']=DATA[18]['content'].replace('반원의 지름이다.', '중심이 O인 반원의 지름이다.')
DATA[19]['content']=DATA[19]['content'].replace('반원은 정사각형 안쪽에 있다.', '반원은 정사각형 안쪽에 있고, 중심을 O라 한다.')
DATA[19]['solution']=DATA[19]['solution'].replace('점A에서의두접선길이가같아', '점 A에서의 두 접선 길이가 같아').replace('점E에서도', '점 E에서도')
DATA[21]['solution']=r'''
⑴ 삼각형 ABC의 B각은 직각이다. 또 삼각형 BDC에서 C각이 직각이고 D각이 $60^\circ$이므로 $\angle\mathrm{PBC}=30^\circ$, $\angle\mathrm{ABP}=60^\circ$이다. 따라서 $\angle\mathrm{APB}=180^\circ-45^\circ-60^\circ=75^\circ$이다.
⑵ 삼각형 ABC는 두 예각이 $45^\circ$인 직각삼각형이므로 $\overline{\mathrm{AB}}=\overline{\mathrm{BC}}=6$이다. $\tan60^\circ=\frac{\overline{\mathrm{BC}}}{\overline{\mathrm{DC}}}=\sqrt3$이므로 $\overline{\mathrm{DC}}=6\div\sqrt3=2\sqrt3\,\mathrm{cm}$이다.
⑶ $\cos60^\circ=\frac{\overline{\mathrm{DC}}}{\overline{\mathrm{BD}}}=\frac12$이므로 $\overline{\mathrm{BD}}=4\sqrt3\,\mathrm{cm}$이다.
⑷ $\overline{\mathrm{PH}}=t$라 하자. 직각삼각형 BPH의 B각이 $30^\circ$이므로 $\overline{\mathrm{BH}}=t\sqrt3$이다. 직각삼각형 CPH의 C각은 $45^\circ$이므로 $\overline{\mathrm{CH}}=t$이다.
따라서 $t\sqrt3+t=6$이고 $t=\frac6{\sqrt3+1}=3(\sqrt3-1)$이다. 삼각형 BPC의 밑변은 BC, 높이는 PH이므로 넓이는 $\frac12\times6\times3(\sqrt3-1)=9(\sqrt3-1)\,\mathrm{cm}^2$이다.
'''.strip()
DATA[22]['content']=DATA[22]['content'].replace('D는BC의내부에있다.', 'D는 선분 BC의 내부에 있다.')
DATA[22]['solution']=r'''
⑴ 같은 점에서 그은 접선의 길이는 같다. 따라서 $\overline{\mathrm{CP}}=\overline{\mathrm{CD}}$, $\overline{\mathrm{BQ}}=\overline{\mathrm{BD}}$, $\overline{\mathrm{AP}}=\overline{\mathrm{AQ}}$이다.
주어진 점의 순서에 의하여 $\overline{\mathrm{AP}}=\overline{\mathrm{AC}}+\overline{\mathrm{CP}}$, $\overline{\mathrm{AQ}}=\overline{\mathrm{AB}}+\overline{\mathrm{BQ}}$, $\overline{\mathrm{BC}}=\overline{\mathrm{CD}}+\overline{\mathrm{DB}}$이다. 이를 합하면 삼각형의 둘레는 $\overline{\mathrm{AP}}+\overline{\mathrm{AQ}}=2\overline{\mathrm{AP}}$이다. 따라서 $\overline{\mathrm{AP}}=3\sqrt3\,\mathrm{cm}$이다.
⑵ 접점 P, Q에서 반지름은 접선에 수직이다. 두 직각삼각형 AOP와 AOQ는 빗변 AO가 공통이고 반지름 OP와 OQ가 같으므로 합동이다. 따라서 $\angle\mathrm{PAO}=30^\circ$이다. $\tan30^\circ=\frac{\overline{\mathrm{OP}}}{\overline{\mathrm{AP}}}$이므로 반지름은 $3\sqrt3\times\frac{\sqrt3}{3}=3\,\mathrm{cm}$이다.
⑶ $\cos30^\circ=\frac{\overline{\mathrm{AP}}}{\overline{\mathrm{AO}}}=\frac{\sqrt3}{2}$이므로 $\overline{\mathrm{AO}}=3\sqrt3\div\frac{\sqrt3}{2}=6\,\mathrm{cm}$이다.
'''.strip()
DATA[23]['content']=DATA[23]['content'].replace('두 접선분PA,PB와작은호AB로둘러싸인원바깥의색칠한부분넓이는', '두 접선분 PA, PB와 작은 호 AB로 둘러싸인 원 바깥의 색칠한 부분 넓이는')
DATA[23]['solution']=r'''
⑴ 접점의 반지름과 접선은 수직이다. 따라서 사각형 PAOB의 A각과 B각은 직각이고, 나머지 두 각의 합은 $180^\circ$이다. 두 각의 비가 1:2이므로 $\angle\mathrm{AOB}=120^\circ$, $\angle\mathrm{APB}=60^\circ$이다.
⑵ 반지름을 $r\,\mathrm{cm}$라 하자. 두 직각삼각형 PAO와 PBO는 빗변 PO가 공통이고 반지름 OA, OB가 같으므로 합동이다. 따라서 $\angle\mathrm{APO}=30^\circ$이다. $\tan30^\circ=\frac r{\overline{\mathrm{PA}}}$이므로 $\overline{\mathrm{PA}}=r\sqrt3$이다.
사각형 PAOB의 넓이는 두 직각삼각형 넓이의 합이므로 $r^2\sqrt3$이다. 작은 부채꼴 AOB의 넓이는 $\frac{120}{360}\pi r^2=\frac{\pi r^2}{3}$이다. 따라서 색칠한 넓이는 $r^2(\sqrt3-\frac\pi3)$이다.
주어진 넓이는 $12(\sqrt3-\frac\pi3)$이다. 실제 색칠 영역은 양의 넓이이므로 괄호의 값은 0이 아니다. 두 식을 비교하면 $r^2=12$이고, 양의 반지름은 $r=2\sqrt3\,\mathrm{cm}$이다.
⑶ 직각삼각형 PAO에서 $\sin30^\circ=\frac r{\overline{\mathrm{OP}}}=\frac12$이므로 $\overline{\mathrm{OP}}=2r=4\sqrt3\,\mathrm{cm}$이다.
'''.strip()
assert set(DATA)==set(range(1,24))-{20}

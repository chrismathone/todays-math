/**
 * 이차방정식의 선수 확인 후보 조회:
 *   node math-graph.cjs --target M3-R02
 *
 * 숙달한 단원을 제외하고 조회:
 *   node math-graph.cjs --target M3-R02 --mastered M1-N02
 *
 * 출력 폴더 지정:
 *   node math-graph.cjs --out ./output
 *
 * 외부 패키지나 원본 문서 없이 실행한다.
 * 단원 간 선수 추론과 소단원 목록을 포함한다.
 * 소단원끼리의 직접 선수 간선은 포함하지 않는다.
 */

"use strict";

/* eslint-disable @typescript-eslint/no-require-imports -- Standalone CommonJS CLI uses Node core only. */
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
/* eslint-enable @typescript-eslint/no-require-imports */

// 형식: ID | 편집 단원명 | 학습 요소(;로 구분)
const UNIT_DATA = `
E12-N01|네 자리 이하의 수|0과 100까지 세기;읽기·쓰기;수의 순서;크기 비교;1·10·100·1000의 자릿값;묶어 세기;수의 분해와 합성
E12-N02|두 자리 수의 덧셈과 뺄셈|덧셈·뺄셈의 상황과 의미;받아올림·받아내림;덧셈과 뺄셈의 관계;세 수의 계산;□가 있는 식
E12-N03|한 자리 수의 곱셈|같은 수의 반복 더하기;배열·묶음으로 곱셈 표현;곱셈구구;한 자리 수 곱셈
E12-R01|규칙|물체·무늬·수의 반복 및 증가 규칙;규칙을 말·그림·기호로 표현
E12-R02|등호와 미지수 기초|등호의 의미;두 양의 같음;□가 들어간 식
E12-G01|평면·입체도형의 모양|평면도형과 입체도형 구별;모양 분류;구성 요소 관찰;도형 만들기와 나누기;쌓기나무 모양
E12-G02|양의 비교|길이·넓이·들이·무게의 직관적 비교;직접·간접 비교
E12-G03|시각과 시간|시계 읽기;시·분;1시간과 1분;달력의 날짜·주·월·년 관계
E12-G04|길이|cm·m의 의미와 관계;길이 측정·어림;길이의 덧셈·뺄셈
E12-D01|자료 정리|분류 기준;빠짐·중복 없이 세기;표;○·×·/ 그래프
E34-N01|큰 수|10,000 이상의 자릿값;위치적 기수법;읽기·쓰기;수의 계열과 크기 비교
E34-N02|자연수의 덧셈·뺄셈|세 자리 수의 받아올림·받아내림과 계산 원리
E34-N03|자연수의 곱셈·나눗셈|한 자리·두 자리 수 곱셈;나눗셈;몫과 나머지;곱셈과 나눗셈의 관계
E34-N04|분수|전체와 부분;단위분수;분수의 크기;진분수·가분수·대분수;분모가 같은 분수의 덧셈·뺄셈
E34-N05|소수|소수 자릿값;소수의 크기 비교;소수와 분수의 관계;소수 덧셈·뺄셈
E34-R01|규칙과 동치 관계|수·도형·계산식 배열 규칙;규칙의 표현과 일반화;같은 값을 나타내는 식
E34-G01|도형의 기초|점·선·선분·반직선·각;직각;수직·평행
E34-G02|원·삼각형·사각형·다각형|원의 중심·반지름·지름;삼각형 분류;사각형 분류;다각형·정다각형
E34-G03|평면도형의 이동|밀기·뒤집기·돌리기;이동한 모양 예상·표현
E34-G04|측정|각도;시간의 초 단위;mm·km;L·mL;g·kg;단위 간 관계·환산과 측정
E34-D01|그림·막대·꺾은선그래프|그림그래프;막대그래프;꺾은선그래프;눈금 읽기;자료의 변화 해석
E56-N01|약수와 배수|약수·배수;공약수·공배수;최대공약수·최소공배수
E56-N02|혼합 계산과 어림|자연수 혼합 계산;괄호와 계산 순서;수의 범위;올림·버림·반올림
E56-N03|분수 덧셈·뺄셈|약분·통분;동치분수;분모가 다른 분수의 덧셈·뺄셈
E56-N04|분수 곱셈·나눗셈|분수의 곱셈;분수의 나눗셈과 의미;실생활 문제
E56-N05|소수 곱셈·나눗셈|소수 곱셈;소수 나눗셈;소수점 위치와 자릿값
E56-R01|대응 관계|대응표;두 양 사이의 관계;□·△ 등으로 식 표현
E56-R02|비와 비율|기준량·비교하는 양;비·비율;백분율;분수·소수·백분율 표현;비율 활용
E56-R03|비례식과 비례배분|비례식;비례식 풀이;주어진 양의 비례배분
E56-G01|합동과 대칭|합동;대응점·대응변·대응각;선대칭·점대칭
E56-G02|둘레와 넓이|다각형 둘레;직사각형·평행사변형·삼각형·사다리꼴 넓이;도형 분할·합성
E56-G03|원|원주;원주율;원의 넓이
E56-G04|입체도형|직육면체·정육면체;각기둥·각뿔;원기둥·원뿔·구;구성 요소·전개도
E56-G05|부피와 겉넓이|단위 부피;직육면체·정육면체의 부피·겉넓이;쌓기와 부피
E56-D01|자료 표현|평균;띠그래프·원그래프;백분율을 이용한 그래프
E56-D02|가능성|사건의 가능성 비교;말·수로 가능성 표현;결과 예상
M1-N01|소인수분해|소수·합성수;소인수분해;최대공약수·최소공배수
M1-N02|정수와 유리수|양수·음수;수직선;대소 관계;절댓값;사칙연산
M1-R01|문자와 식|문자 사용;식의 값;항·계수;동류항;식 간단히 하기
M1-R02|일차방정식|등식의 성질;방정식 풀이·검산;문장제와 식 세우기
M1-R03|좌표평면과 그래프|순서쌍;좌표축;사분면;표와 그래프;변화 해석;정비례;반비례
M1-G01|기본 도형|점·직선·평면;교점·교선;각;맞꼭지각·엇각·동위각;평행·수직
M1-G02|작도와 합동|각의 이등분선;수직이등분선;삼각형 작도;삼각형 합동
M1-G03|평면·입체도형|다각형;원·부채꼴;다면체·회전체;겉넓이·부피
M1-D01|자료 정리와 대푯값|자료 수집;표·그래프;평균·중앙값·최빈값;도수분포표·상대도수
M2-N01|유리수와 순환소수|유한소수·순환소수;순환소수와 분수의 관계
M2-R01|식의 계산|단항식·다항식 계산;지수법칙의 기초
M2-R02|일차부등식|부등식의 성질;풀이;수직선;활용
M2-R03|연립일차방정식|대입법·가감법;해의 의미;문장제
M2-R04|함수와 일차함수|함수·함숫값;일차함수 식·그래프;기울기·절편;그래프 성질
M2-R05|함수와 방정식의 관계|직선의 교점;연립방정식의 해와 그래프의 교점
M2-G01|삼각형·사각형의 성질|이등변삼각형;외심·내심;평행사변형·직사각형·마름모·정사각형
M2-G02|도형의 닮음|닮음비;삼각형 닮음 조건;평행선과 선분의 비
M2-G03|피타고라스 정리|정리·역;직각삼각형의 변 길이;거리 문제
M2-D01|경우의 수와 확률|합·곱의 법칙;경우의 수;확률 기본 성질
M3-N01|제곱근과 실수|제곱근;근호 계산;무리수;실수의 대소
M3-R01|다항식의 곱셈과 인수분해|곱셈공식;공통인수;기본 인수분해 공식
M3-R02|이차방정식|풀이;근의 의미;인수분해와 방정식 활용;완전제곱식으로 풀기;근의 공식
M3-R03|이차함수|포물선;꼭짓점·축;그래프 성질;이차방정식과 교점
M3-G01|삼각비|직각삼각형 변의 비;sin·cos·tan의 기초;높이·거리 응용
M3-G02|원의 성질|현·접선·원주각;성질 정당화
M3-D01|산포도·상자그림·산점도|자료의 퍼짐;사분위수;분포 비교;두 변수 관계;분산;표준편차
H-C1-01|다항식|다항식 덧셈·뺄셈·곱셈·나눗셈;나머지정리;인수분해
H-C1-02|복소수와 이차방정식|허수단위;복소수 연산;켤레복소수;실근·허근;판별식;근과 계수의 관계
H-C1-03|이차방정식과 이차함수|이차방정식과 그래프;직선과 포물선의 위치 관계;제한된 범위의 최대·최소
H-C1-04|여러 방정식·부등식|간단한 삼차·사차방정식;연립이차방정식;연립일차부등식;절댓값 부등식;이차부등식
H-C1-05|경우의 수|합의 법칙·곱의 법칙;순열;조합
H-C1-06|행렬|행렬의 뜻·표현;행렬의 연산;자료의 행렬 표현
H-C2-01|평면좌표와 직선|내분점;직선의 방정식;평행·수직 조건;점과 직선 사이 거리
H-C2-02|원의 방정식|원의 방정식;그래프;원과 직선의 위치 관계
H-C2-03|도형의 이동|평행이동;원점·좌표축·직선에 대한 대칭이동
H-C2-04|집합과 명제|집합 표현·연산·포함관계;명제·조건·역·대우·증명
H-C2-05|함수|함수·정의역·치역·함숫값;합성함수;역함수
H-C2-06|유리함수와 무리함수|식·정의역·그래프·성질
H-ALG-01|지수·로그|거듭제곱·거듭제곱근;지수법칙;유리수·실수 지수;로그·상용로그의 성질
H-ALG-02|지수·로그함수|그래프;증가·감소;역함수 관계;성장·감소 모델
H-ALG-03|삼각함수|일반각;호도법;삼각함수의 뜻·그래프·주기;사인법칙·코사인법칙
H-ALG-04|수열|수열의 규칙;등차·등비수열;일반항·합;수학적 귀납법
H-CAL1-01|극한·연속|함수의 극한;좌극한·우극한;연속;최대·최소 정리·사잇값 정리
H-CAL1-02|미분|평균·순간변화율;미분계수;도함수;접선의 기울기
H-CAL1-03|도함수 활용|증가·감소;극대·극소;최대·최소;그래프 분석
H-CAL1-04|적분|부정적분;적분상수;정적분;미분·적분 관계;넓이·속도·거리
H-PS-01|경우의 수|중복순열;같은 것이 있는 순열;중복조합;이항정리
H-PS-02|확률|수학적·통계적 확률;덧셈정리;여사건;조건부확률;독립·종속;곱셈정리
H-PS-03|확률분포|확률변수;이산·연속분포;기댓값·분산·표준편차;이항·정규분포
H-PS-04|통계적 추정|모집단·표본;표본평균;모평균·모비율 추정;결과 해석
H-CAL2-01|수열의 극한|수렴·발산;수열의 극한;급수;등비급수
H-CAL2-02|미분법|지수·로그·삼각함수 미분;여러 미분법;이계도함수;곡선 성질
H-CAL2-03|적분법|여러 함수의 적분;정적분으로 넓이·부피·운동 계산
H-GEO-01|이차곡선|포물선·타원·쌍곡선;방정식과 그래프;접선
H-GEO-02|공간도형·공간좌표|직선·평면 위치 관계;삼수선;정사영;3차원 좌표·거리;구의 방정식
H-GEO-03|벡터|벡터 연산;성분;내적;벡터를 이용한 도형의 방정식
H-BAS1-01|다항식|다항식의 연산;인수분해
H-BAS1-02|방정식·부등식|이차방정식과 이차함수;부등식
H-BAS1-03|경우의 수|합의 법칙과 곱의 법칙;순열과 조합
H-BAS1-04|행렬|행렬과 그 연산
H-BAS2-01|도형의 방정식|평면좌표;직선의 방정식;원의 방정식;도형의 이동
H-BAS2-02|집합과 명제|집합의 뜻과 표현;집합의 연산;명제와 조건;증명
H-BAS2-03|함수|함수의 뜻;합성함수;역함수
H-BAS2-04|유리함수·무리함수|유리함수;무리함수
`;

// 형식:
// 대상 ID | 선수 ID 목록 | P=선수 추론/S=도움 관계 | 연결 이유
//
// 방향은 선수 -> 대상이다.
// 같은 줄에 있는 여러 선수 ID는 각각 별도 간선으로 생성한다.
const EDGE_DATA = `
E12-N02|E12-N01|P|자릿값과 수의 크기 비교를 바탕으로 덧셈·뺄셈을 수행한다.
E12-N03|E12-N01,E12-N02|P|묶어 세기와 반복 덧셈으로 곱셈을 이해한다.
E12-R01|E12-N01|P|수의 순서와 반복에서 규칙을 찾는다.
E12-R02|E12-N02,E12-R01|P|등호와 미지수 기초는 식의 관계와 규칙 표현을 확장한다.
E12-G04|E12-G02|P|직접 비교와 단위의 필요성을 바탕으로 길이를 측정한다.
E12-G03|E12-N01|P|수의 순서와 눈금 읽기를 바탕으로 시각·시간을 나타낸다.
E12-D01|E12-N01|P|분류한 자료를 세고 표와 그래프로 표현한다.
E34-N01|E12-N01|P|자릿값과 위치적 기수법을 더 큰 수로 확장한다.
E34-N02|E12-N02,E34-N01|P|기본 덧셈·뺄셈과 자릿값을 확장한다.
E34-N03|E12-N03,E34-N02|P|곱셈구구와 덧셈·뺄셈을 바탕으로 곱셈·나눗셈을 확장한다.
E34-N04|E34-N03|P|등분과 나눗셈의 의미를 분수로 연결한다.
E34-N05|E34-N01,E34-N04|P|자릿값 구조와 분수 개념을 소수로 연결한다.
E34-R01|E12-R01,E12-R02|P|반복 규칙을 식과 관계로 표현하고 일반화한다.
E34-G01|E12-G01|P|도형의 모양 관찰을 점·선·각의 기초 개념으로 정교화한다.
E34-G02|E34-G01|P|선과 각의 성질을 활용해 평면도형을 분류한다.
E34-G03|E34-G02|P|도형의 구성 요소를 바탕으로 밀기·뒤집기·돌리기를 탐구한다.
E34-G04|E12-G03,E12-G04,E34-G01|P|기존 시간·길이 측정 경험을 여러 단위와 각도로 확장한다.
E34-D01|E12-D01|P|초등 저학년의 표와 그래프를 여러 그래프의 표현·해석으로 확장한다.
E56-N01|E34-N03|P|곱셈·나눗셈의 약수·배수 관계를 활용한다.
E56-N02|E34-N02,E34-N03|P|자연수 사칙연산을 혼합 계산과 어림으로 확장한다.
E56-N03|E34-N04,E56-N01|P|동치분수와 공통분모를 약수·배수 개념으로 다룬다.
E56-N04|E34-N04,E56-N03|P|분수의 의미와 통분·분수 덧셈뺄셈 경험을 곱셈·나눗셈으로 확장한다.
E56-N05|E34-N05,E34-N03|P|소수 자릿값과 자연수 연산을 확장한다.
E56-R01|E34-R01|P|두 양의 대응 관계를 표와 식으로 표현한다.
E56-R02|E56-N03,E56-N04,E56-N05|P|분수·소수의 수 감각을 비·비율·백분율로 연결한다.
E56-R03|E56-R02|P|비와 비율을 비례식과 비례배분에 적용한다.
E56-G01|E34-G02,E34-G03|P|평면도형의 분류와 이동을 합동·대칭으로 확장한다.
E56-G02|E34-G02,E34-G04|P|도형 구성과 길이·각도 측정을 둘레·넓이로 확장한다.
E56-G03|E34-G02,E56-G02|P|원의 구성 요소와 넓이 개념으로 원주·원주율·원의 넓이를 다룬다.
E56-G04|E12-G01,E34-G02|P|평면·입체도형 분류를 각기둥·각뿔·회전체로 확장한다.
E56-G05|E56-G02,E56-G04|P|넓이와 입체도형 구성을 활용해 부피·겉넓이를 구한다.
E56-D01|E34-D01,E56-R02|P|그래프 읽기와 백분율을 띠그래프·원그래프로 확장한다.
E56-D02|E34-D01,E34-N04,E34-N05|P|자료 해석과 수 감각을 바탕으로 가능성을 비교·수량화한다.
M1-N01|E56-N01|P|약수·배수를 소인수분해와 최대공약수·최소공배수로 확장한다.
M1-N02|E56-N02,E56-N03,E56-N04,E56-N05|P|자연수·분수·소수 계산을 정수와 유리수의 사칙연산으로 확장한다.
M1-R01|E12-R02,E56-R01|P|□·△와 대응 관계를 문자식으로 일반화한다.
M1-R02|M1-R01,M1-N02|P|문자식과 유리수 계산을 이용해 일차방정식을 푼다.
M1-R03|E56-R01,E34-D01|P|대응 관계와 표·그래프를 좌표평면으로 표현한다.
M1-G01|E34-G01,E34-G02|P|선·각의 기초를 직선·평면·각 관계로 확장한다.
M1-G02|E56-G01,M1-G01|P|합동·대칭과 각의 성질을 작도·삼각형 합동에 적용한다.
M1-G03|E56-G02,E56-G03,E56-G04,E56-G05|P|초등 도형·넓이·부피 개념을 평면·입체도형 성질과 측정으로 확장한다.
M1-D01|E34-D01,E56-D01|P|표·그래프와 평균을 대표값·도수분포·상대도수로 확장한다.
M2-N01|M1-N02,E56-N05|P|유리수와 소수 자릿값을 유한·순환소수 표현으로 연결한다.
M2-R01|M1-R01,M1-N02|P|문자식과 수의 연산을 단항식·다항식 계산으로 확장한다.
M2-R02|M1-R01,M1-R02|P|문자식과 방정식 풀이를 부등식의 성질·해결에 확장한다.
M2-R03|M1-R01,M1-R02|P|일차방정식 풀이를 연립방정식으로 확장한다.
M2-R04|M1-R03,M1-R01|P|좌표·그래프와 문자식을 함수·일차함수로 확장한다.
M2-R05|M2-R03,M2-R04|P|연립방정식의 해를 두 직선의 교점으로 해석한다.
M2-G01|M1-G01,M1-G02|P|각과 삼각형 합동을 삼각형·사각형의 성질로 확장한다.
M2-G02|M2-G01,E56-R02|P|도형 성질과 비·비율을 닮음비와 평행선의 선분비에 적용한다.
M2-G03|M2-G02,M1-N02|P|닮음과 제곱 계산을 직각삼각형의 변 관계로 연결한다.
M2-D01|M1-D01,E56-D02|P|자료 정리와 가능성 표현을 경우의 수·확률 계산으로 확장한다.
M3-N01|M1-N02|P|유리수의 수 체계를 제곱근·무리수·실수로 확장한다.
M3-R01|M2-R01|P|다항식 계산을 곱셈공식과 인수분해로 확장한다.
M3-R02|M3-R01,M1-R02|P|인수분해와 방정식 풀이를 이차방정식에 적용한다.
M3-R03|M2-R04,M3-R02|P|함수 그래프와 이차방정식의 해를 이차함수·교점으로 연결한다.
M3-G01|M2-G02,M2-G03|P|닮음과 피타고라스 정리를 직각삼각형 삼각비에 적용한다.
M3-G02|M1-G01,M2-G01|P|각과 삼각형·사각형 성질을 원의 현·접선·원주각에 확장한다.
M3-D01|M1-D01|P|대표값·도수분포를 산포도·사분위수·상자그림·산점도로 확장한다.
H-C1-01|M2-R01,M3-R01|P|다항식 계산·인수분해를 고등 대수의 나머지정리와 연산으로 확장한다.
H-C1-02|M3-N01,M3-R02|P|실수·이차방정식에서 복소수와 근의 관계로 확장한다.
H-C1-03|M3-R02,M3-R03|P|이차방정식과 이차함수의 해·그래프 관계를 확장한다.
H-C1-04|H-C1-01,H-C1-02,H-C1-03,M2-R02,M2-R03|P|다항식·방정식·부등식의 계산과 풀이를 여러 방정식·부등식으로 확장한다.
H-C1-05|M2-D01|P|경우의 수와 확률 기초를 순열·조합으로 확장한다.
H-C1-06|E56-D01,M1-R03|P|표·좌표 자료를 행렬로 표현하고 연산한다.
H-C2-01|M1-R03,M2-R04|P|좌표와 일차함수 그래프를 직선의 방정식·거리 관계로 확장한다.
H-C2-02|H-C2-01,M3-G02|P|좌표기하와 원의 성질을 원의 방정식으로 연결한다.
H-C2-03|H-C2-01,M1-G02|P|좌표·도형의 대칭과 이동을 방정식으로 표현한다.
H-C2-04|M1-R01,M1-G02|P|식의 조건과 도형 증명 경험을 집합·명제·증명으로 확장한다.
H-C2-05|M2-R04,H-C2-04|P|일차함수의 대응 관계를 함수·합성·역함수로 일반화한다.
H-C2-06|H-C2-05,M3-N01|P|함수 개념과 실수·근호 계산을 유리함수·무리함수로 확장한다.
H-BAS1-01|M2-R01,M3-R01|P|중학교 문자식과 인수분해를 기초 고등 다항식으로 확장한다.
H-BAS1-02|M1-R02,M2-R02,M3-R02|P|중학교 방정식·부등식의 풀이를 기초 고등 수준으로 확장한다.
H-BAS1-03|M2-D01|P|경우의 수를 순열·조합의 기초로 확장한다.
H-BAS1-04|E56-D01,M1-R03|P|표 자료 표현을 행렬의 뜻과 연산으로 확장한다.
H-BAS2-01|M1-R03,M2-R04,M3-G02|P|좌표·함수·원의 기초를 도형의 방정식으로 연결한다.
H-BAS2-02|M1-G02,M1-R01|P|분류와 논리적 설명을 집합·명제·증명으로 확장한다.
H-BAS2-03|M2-R04|P|일차함수 경험을 함수·합성·역함수 기초로 확장한다.
H-BAS2-04|H-BAS2-03,M3-N01|P|함수와 근호 개념을 유리·무리함수로 연결한다.
H-ALG-01|M3-N01,H-C1-01|P|거듭제곱·근호와 대수 연산을 지수·로그로 확장한다.
H-ALG-02|H-ALG-01,H-C2-05|P|지수·로그와 함수 개념을 지수·로그함수로 결합한다.
H-ALG-03|M3-G01,H-C2-05|P|삼각비와 함수 개념을 삼각함수로 확장한다.
H-ALG-04|E56-R01,M2-R04|P|규칙·대응 관계를 수열의 일반항·합으로 표현한다.
H-CAL1-01|H-C2-05,H-C2-06|P|함수 개념을 극한과 연속으로 확장한다.
H-CAL1-02|H-CAL1-01|P|극한·연속과 함수 그래프를 바탕으로 미분을 정의한다.
H-CAL1-02|H-ALG-02,H-ALG-03|S|다양한 함수의 변화 해석에 도움이 되는 연결이다. 미적분Ⅰ의 다항함수 미분 자체의 필수 선수는 아니다.
H-CAL1-03|H-CAL1-02,H-C1-03|P|도함수와 이차함수 그래프 분석 경험을 함수의 변화·극값에 확장한다.
H-CAL1-04|H-CAL1-02|P|미분과 역관계를 바탕으로 부정·정적분과 넓이·운동을 다룬다.
H-PS-01|H-C1-05,M2-D01|P|기본 경우의 수를 중복순열·중복조합·이항정리로 확장한다.
H-PS-02|H-PS-01,M2-D01|P|경우의 수와 확률 기초를 조건부확률·독립으로 확장한다.
H-PS-03|H-PS-02,M3-D01|P|확률과 통계적 자료 해석을 확률분포·기댓값·산포로 연결한다.
H-PS-04|H-PS-03,M3-D01|P|확률분포와 자료의 변동을 표본·추정으로 확장한다.
H-CAL2-01|H-ALG-04|P|수열의 규칙을 수열의 극한·급수로 확장한다.
H-CAL2-02|H-CAL1-02,H-ALG-02,H-ALG-03|P|미적분Ⅰ 미분과 지수·로그·삼각함수를 심화한다.
H-CAL2-03|H-CAL1-04,H-CAL2-02|P|기본 적분을 여러 함수·넓이·부피·운동 문제로 확장한다.
H-GEO-01|H-C2-01,H-C2-02|P|좌표기하와 원의 성질을 이차곡선의 방정식으로 확장한다.
H-GEO-01|M3-N01|P|좌표기하와 실수·근호 계산을 이용해 이차곡선의 방정식을 다룬다.
H-GEO-02|M1-G03,M2-G03,H-C2-01|P|입체도형·피타고라스·좌표를 공간좌표와 거리로 확장한다.
H-GEO-03|H-C2-01,M2-G03|P|좌표와 피타고라스 관계를 벡터·성분·내적으로 확장한다.
M3-R02|M3-N01|P|제곱근과 근호 계산을 이차방정식의 제곱근 풀이와 근의 공식에 사용한다.
`;

// 과목 코드와 표시명
const COURSE = {
  C1: ["공통수학1", "공통"],
  C2: ["공통수학2", "공통"],
  BAS1: ["기본수학1", "공통 대체 경로"],
  BAS2: ["기본수학2", "공통 대체 경로"],
  ALG: ["대수", "일반 선택"],
  CAL1: ["미적분Ⅰ", "일반 선택"],
  PS: ["확률과 통계", "일반 선택"],
  CAL2: ["미적분Ⅱ", "진로 선택"],
  GEO: ["기하", "진로 선택"],
};

const DOMAIN = {
  N: "수와 연산",
  R: "변화와 관계",
  G: "도형과 측정",
  D: "자료와 가능성",
};

const lines = (text) =>
  text
    .trim()
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

// 노드 ID에서 학교급·학년군·과목 정보를 만든다.
function metadata(id) {
  const elementary = id.match(/^E(12|34|56)-([NRGD])\d{2}$/);
  if (elementary) {
    return {
      schoolLevel: "elementary",
      gradeBand: {
        12: "초1-2",
        34: "초3-4",
        56: "초5-6",
      }[elementary[1]],
      suggestedGrade: null,
      course: "수학",
      courseGroup: "초등 수학",
      domain: DOMAIN[elementary[2]],
    };
  }

  const middle = id.match(/^M([123])-([NRGD])\d{2}$/);

  if (middle) {
    return {
      schoolLevel: "middle",
      gradeBand: "중학교 1-3학년군",

      // 공식 학년 배치를 뜻하지 않는 화면 배치 제안이다.
      suggestedGrade: Number(middle[1]),

      course: "수학",
      courseGroup: "중학교 수학",
      domain: DOMAIN[middle[2]],
    };
  }

  if (!/^H-(?:C[12]|BAS[12]|ALG|CAL[12]|PS|GEO)-\d{2}$/.test(id)) {
    throw new Error("알 수 없는 단원 ID: " + id);
  }
  const code = id.slice(2).replace(/-\d+$/, "");
  const course = COURSE[code];

  if (!course) {
    throw new Error("알 수 없는 과목: " + id);
  }

  const number = Number(id.split("-").at(-1));
  let domain = "융합·응용";

  if (["C1", "BAS1"].includes(code)) {
    domain =
      number <= 4 && !(code === "BAS1" && number >= 3)
        ? "변화와 관계"
        : "자료와 가능성";
  }

  if (["C2", "BAS2"].includes(code)) {
    domain = (code === "C2" ? number <= 3 : number === 1)
      ? "도형과 측정"
      : "변화와 관계";
  }

  if (["ALG", "CAL1", "CAL2"].includes(code)) {
    domain = "변화와 관계";
  }

  if (code === "GEO") {
    domain = "도형과 측정";
  }

  if (code === "PS") {
    domain = "자료와 가능성";
  }

  return {
    schoolLevel: "high",
    gradeBand: "고등학교 과목 단위",
    suggestedGrade: null,
    course: course[0],
    courseGroup: course[1],
    domain,
  };
}

// 단원 생성
// 학습 요소의 배열 순서를 선수 관계로 자동 변환하지 않는다.
// test data overrides never change the canonical source or write files.
function buildGraph({ unitData = UNIT_DATA, edgeData = EDGE_DATA } = {}) {
  if (typeof unitData !== "string" || typeof edgeData !== "string") {
    throw new Error("단원·관계 데이터는 문자열이어야 합니다.");
  }
  const units = lines(unitData).map((line) => {
    const parts = line.split("|").map((part) => part.trim());

    if (parts.length !== 3) {
      throw new Error("단원 데이터 형식 오류: " + line);
    }

    const [id, title, topicText] = parts;
    const topicTitles = topicText.split(";").map((s) => s.trim());
    if (!id || !title || topicTitles.some((topic) => !topic)) {
      throw new Error("빈 단원명 또는 학습 요소: " + line);
    }

    return {
      id,
      nodeType: "unit",
      title,
      ...metadata(id),

      topics: topicTitles,

      officialBasis: "editorial_curriculum_summary",

      // 원문 성취기준 번호와 전수 대조하지 않은 상태를 표시한다.
      achievementStandardIds: [],
      needsCurriculumAudit: true,

      detailConfidence: "editorial_summary",
    };
  });

  if (!units.length || (unitData === UNIT_DATA && units.length !== 100)) {
    throw new Error("단원 수 오류: " + units.length);
  }

  const unitById = new Map(units.map((unit) => [unit.id, unit]));

  if (unitById.size !== units.length) {
    throw new Error("중복 단원 ID");
  }

  // 단원 사이 관계 생성과 ID 검증
  const unitEdges = [];
  const edgeKeys = new Set();

  for (const line of lines(edgeData)) {
    const parts = line.split("|").map((part) => part.trim());

    if (parts.length !== 4) {
      throw new Error("관계 데이터 형식 오류: " + line);
    }

    const [to, fromText, type, reason] = parts;
    if (!to || !fromText || !reason) {
      throw new Error("빈 관계 끝점 또는 이유: " + line);
    }

    if (!["P", "S"].includes(type)) {
      throw new Error("알 수 없는 관계 유형: " + type);
    }

    const relation = type === "P" ? "prerequisite" : "support";

    for (const from of fromText.split(",").map((id) => id.trim())) {
      if (!unitById.has(from) || !unitById.has(to)) {
        throw new Error("존재하지 않는 ID: " + from + " -> " + to);
      }

      if (from === to) {
        throw new Error("자기 자신을 선수로 연결: " + from);
      }

      const key = [from, to, relation].join("|");

      if (edgeKeys.has(key)) {
        throw new Error("중복 관계: " + key);
      }

      edgeKeys.add(key);

      unitEdges.push({
        from,
        to,
        relation,
        reason,
        officialBasis: "pedagogical_inference",
        confidence:
          relation === "prerequisite"
            ? "strong_inference"
            : "support_inference",
        isOfficialEnrollmentRequirement: false,
      });
    }
  }

  // 각 학습 요소를 개별 노드로 생성한다.
  // 예: M3-R02.t01, M3-R02.t02
  const topics = units.flatMap((unit) =>
    unit.topics.map((title, index) => ({
      id: unit.id + ".t" + String(index + 1).padStart(2, "0"),

      nodeType: "topic",
      parentId: unit.id,
      title,
      order: index + 1,
      schoolLevel: unit.schoolLevel,
      gradeBand: unit.gradeBand,
      course: unit.course,
      domain: unit.domain,
      officialBasis: "editorial_learning_element",
      achievementStandardIds: [],
    })),
  );

  // 단원 -> 학습 요소 포함 관계
  const containsEdges = topics.map((topic) => ({
    from: topic.parentId,
    to: topic.id,
    relation: "contains",
    confidence: "structural",
  }));

  const prerequisites = unitEdges.filter(
    (edge) => edge.relation === "prerequisite",
  );

  // Kahn 위상 정렬로 선수 관계의 순환을 검사한다.
  // 순환이 있으면 결과 파일을 쓰기 전에 중단한다.
  const indegree = new Map(units.map((unit) => [unit.id, 0]));

  const next = new Map(units.map((unit) => [unit.id, []]));

  for (const edge of prerequisites) {
    indegree.set(edge.to, indegree.get(edge.to) + 1);

    next.get(edge.from).push(edge.to);
  }

  const queue = units
    .filter((unit) => indegree.get(unit.id) === 0)
    .map((unit) => unit.id);

  const topologicalOrder = [];

  for (let index = 0; index < queue.length; index++) {
    const id = queue[index];
    topologicalOrder.push(id);

    for (const to of next.get(id)) {
      indegree.set(to, indegree.get(to) - 1);

      if (indegree.get(to) === 0) {
        queue.push(to);
      }
    }
  }

  if (topologicalOrder.length !== units.length) {
    const unresolved = [...indegree]
      .filter(([, degree]) => degree > 0)
      .map(([id]) => id);

    throw new Error("선수 관계 순환: " + unresolved.join(", "));
  }

  // 과목 관계는 개념 선수 관계와 별도로 관리한다.
  const courseRelations = [
    ["공통수학1", "공통수학2", "course_sequence"],
    ["기본수학1", "기본수학2", "course_sequence"],
    ["기본수학1+기본수학2", "공통수학1+공통수학2", "alternative_track"],
    ["공통수학1+공통수학2", "선택 수학 과목", "recommended_foundation"],
    ["대수", "미적분Ⅰ", "recommended_before_or_concurrent"],
    ["미적분Ⅰ", "미적분Ⅱ", "course_sequence"],
  ].map(([from, to, relation]) => ({
    from,
    to,
    relation,
    entityType: "course",
    note:
      "과목 관계는 개념 선수와 분리하고, " +
      "개별 학교의 이수 안내를 확인한다.",
  }));

  // 최종 그래프 데이터
  const graph = {
    schemaVersion: "1.1.0",

    title: "2022 개정 수학 학습 연결도 편집 데이터",

    dataStatus:
      "단원 선수 그래프와 소단원 목록; " + "성취기준 전수 대조 미완료",

    scope: {
      included: [
        "초등 수학",
        "중학교 수학",
        "고등 공통수학·기본수학",
        "대수·미적분Ⅰ·미적분Ⅱ·확률과 통계·기하",
      ],

      excluded: [
        "경제 수학",
        "인공지능 수학",
        "직무 수학",
        "수학과 문화",
        "실용 통계",
        "수학과제 탐구",
        "전문 수학",
        "이산 수학",
        "고급 대수",
        "고급 미적분",
        "고급 기하",
        "직업계고 전문교과별 전공 수학",
        "학교별 인정 과목",
      ],

      topicPrerequisiteEdgesIncluded: false,

      note: "단원 관계를 모든 소단원 사이의 " + "선수 관계로 확대하지 않는다.",
    },

    units,
    topics,
    edges: [...unitEdges, ...containsEdges],
    courseRelations,
    topologicalOrder,

    validation: {
      unitCount: units.length,
      topicCount: topics.length,
      prerequisiteEdgeCount: prerequisites.length,
      supportEdgeCount: unitEdges.length - prerequisites.length,
      containmentEdgeCount: containsEdges.length,
      duplicateUnitIdCount: 0,
      danglingUnitEdgeCount: 0,
      prerequisiteCycleCount: 0,
    },

    sources: [
      {
        title: "교육부 고시 제2022-33호 " + "별책 8 수학과 교육과정",

        url:
          "https://www.moe.go.kr/boardCnts/viewRenew.do" +
          "?boardID=141&boardSeq=93458",

        role:
          "공식 교육과정 대조를 위한 기준 문서. " +
          "편집 노드와 공식 단원명을 동일시하지 않는다.",
      },
    ],
  };

  return { ...graph, graphContentHash: graphContentHash(graph) };
}

// Object keys are sorted recursively; authored array order remains significant.
function canonicalJson(value) {
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJson).join(",") + "]";
  }
  if (value !== null && typeof value === "object") {
    return (
      "{" +
      Object.keys(value)
        .sort()
        .map((key) => JSON.stringify(key) + ":" + canonicalJson(value[key]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

/** Hash all graph content and metadata, excluding only the hash itself. */
function graphContentHash(graph) {
  const content = Object.fromEntries(
    Object.entries(graph).filter(([key]) => key !== "graphContentHash"),
  );
  return createHash("sha256")
    .update(canonicalJson(content), "utf8")
    .digest("hex");
}

/** Teacher lookup only: mastery stops this traversal, never propagates to ancestors. */
function reviewCandidates(targetId, masteredIds = [], graph = buildGraph()) {
  const unitById = new Map(graph.units.map((unit) => [unit.id, unit]));
  if (!unitById.has(targetId)) {
    throw new Error("알 수 없는 목표 단원: " + targetId);
  }
  for (const id of masteredIds) {
    if (!unitById.has(id)) {
      throw new Error("알 수 없는 숙달 단원: " + id);
    }
  }
  const mastered = new Set(masteredIds);
  if (mastered.has(targetId)) return [];
  const incoming = new Map(graph.units.map((unit) => [unit.id, []]));
  for (const edge of graph.edges) {
    if (edge.relation === "prerequisite") incoming.get(edge.to).push(edge.from);
  }
  const candidates = new Set();
  function visit(id) {
    for (const parent of incoming.get(id)) {
      if (mastered.has(parent) || candidates.has(parent)) continue;
      candidates.add(parent);
      visit(parent);
    }
  }
  visit(targetId);
  return graph.topologicalOrder
    .filter((id) => candidates.has(id))
    .map((id) => {
      const unit = unitById.get(id);
      return {
        id,
        title: unit.title,
        course: unit.course,
        topics: [...unit.topics],
      };
    });
}

// Markdown 표에서 구분자와 줄바꿈을 처리한다.
const safe = (value) =>
  String(value).replace(/\|/g, "\\|").replace(/\r?\n/g, " ");

// 상세 문서 생성
function graphMarkdown(graph) {
  const { units, courseRelations } = graph;
  const unitById = new Map(units.map((unit) => [unit.id, unit]));
  const unitEdges = graph.edges.filter((edge) => edge.relation !== "contains");
  const prerequisites = unitEdges.filter(
    (edge) => edge.relation === "prerequisite",
  );
  return [
    "# 2022 개정 수학 학습 연결도",
    "",

    "단원 사이 선수 관계와 소단원 목록을 포함한 편집 데이터다.",
    "범위는 초등·중학교 수학과 고등 공통·기본수학, 대수, 미적분Ⅰ·Ⅱ, 확률과 통계, 기하다.",
    "선수·도움 관계는 교육적 추론이며 공식 필수 이수 조건을 뜻하지 않는다.",
    "학생별 풀이·숙달 기록은 별도로 저장하고, 선수 역추적 결과는 복습 확인 후보로 사용한다.",
    "소단원 사이의 직접 선수 간선과 성취기준 번호별 전수 대조는 포함하지 않는다.",
    "중학교 ID의 학년은 화면 배치 제안이며 공식 성취기준 학년군과 구별한다.",
    "고등 영역은 편집 분류이며 공식 영역 배치를 확정한 것이 아니다.",

    "",
    "## 집계",
    "",
    "- graphContentHash: " + graph.graphContentHash,

    ...Object.entries(graph.validation).map(
      ([key, value]) => "- " + key + ": " + value,
    ),

    "",
    "## 전체 단원과 소단원",
    "",

    ...units.flatMap((unit) => [
      "### " + unit.id + " | " + unit.course + " | " + unit.title,

      "",

      "- 학년군: " + unit.gradeBand,
      "- 영역" +
        (unit.schoolLevel === "high" ? " (편집 분류)" : "") +
        ": " +
        unit.domain,
      ...(unit.suggestedGrade === null
        ? []
        : [
            "- 화면 배치 제안: 중" +
              unit.suggestedGrade +
              " (공식 학년 배치 아님)",
          ]),

      "",

      ...unit.topics.map((topic, index) => index + 1 + ". " + topic),

      "",

      "- 직접 선수: " +
        (prerequisites
          .filter((edge) => edge.to === unit.id)
          .map((edge) => edge.from + " " + unitById.get(edge.from).title)
          .join(", ") || "목록에 없음"),

      "- 도움 관계: " +
        (unitEdges
          .filter((edge) => edge.to === unit.id && edge.relation === "support")
          .map((edge) => edge.from)
          .join(", ") || "목록에 없음"),

      "",
    ]),

    "## 전체 단원 관계",
    "",
    "| 선수 | 대상 | 유형 | 이유 |",
    "|---|---|---|---|",

    ...unitEdges.map(
      (edge) =>
        "|" +
        [edge.from, edge.to, edge.relation, edge.reason].map(safe).join("|") +
        "|",
    ),

    "",
    "## 과목 관계",
    "",

    "| 선행·기준 과목 | 후속·대체 과목 | 유형 |",
    "|---|---|---|",

    ...courseRelations.map(
      (edge) =>
        "|" + [edge.from, edge.to, edge.relation].map(safe).join("|") + "|",
    ),

    "",
  ].join("\n");
}

// 명령행 옵션 읽기
function runCli(argv = process.argv.slice(2)) {
  const options = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    if (!["--out", "--target", "--mastered"].includes(name)) {
      throw new Error("알 수 없는 옵션: " + name);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--"))
      throw new Error("옵션 값 누락: " + name);
    if (options.has(name)) throw new Error("중복 옵션: " + name);
    options.set(name, value);
  }
  if (options.has("--mastered") && !options.has("--target")) {
    throw new Error("--mastered에는 --target이 필요합니다.");
  }
  const graph = buildGraph();
  const target = options.get("--target");
  const mastered = (options.get("--mastered") || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  // Validate all IDs before creating an output directory or writing either file.
  const candidates = target ? reviewCandidates(target, mastered, graph) : null;
  const outputDirectory = path.resolve(options.get("--out") || process.cwd());
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, "math_graph_2022.json"),
    JSON.stringify(graph, null, 2) + "\n",
    "utf8",
  );
  fs.writeFileSync(
    path.join(outputDirectory, "math_graph_2022.md"),
    graphMarkdown(graph),
    "utf8",
  );
  console.log("[생성 완료]", outputDirectory);
  console.log("[검증]", JSON.stringify(graph.validation, null, 2));
  if (target) {
    console.log("[선수 확인 후보]", target);
    console.log(JSON.stringify(candidates, null, 2));
  }
}

module.exports = {
  buildGraph,
  reviewCandidates,
  graphContentHash,
  graphMarkdown,
};

if (require.main === module) {
  try {
    runCli();
  } catch (error) {
    console.error("[오류]", error.message);
    process.exitCode = 1;
  }
}

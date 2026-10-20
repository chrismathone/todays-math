# 서술형 B와 개념 백지 양식 공유 비교

2026-10-20 · 읽기 전용 소스 분석 · 원장님 선택용

**권고는 «답란만 공유»다.** 모눈·줄·빈 내부를 그리는 부품은 함께 쓸 수 있지만, 개념 백지의 형식별 높이·쪽 나눔·채점은 유지하는 편이 적합하다. 개념 백지는 남은 쪽 높이를 칸에 나누고, 서술형 B는 채점 기준 수로 필기 높이를 정한다. 부품 공유를 곧바로 모든 칸의 4mm 모눈화나 서술형 배점 도입으로 해석하면 안 된다.

## 1. 범위와 근거의 구분

- 요청 근거: [구현 브리프 3–15행][brief]. 서술형 B는 확정되었고, 개념 백지 및 일반 문제 풀이 공간은 비교만 한다.
- **현재 제품 코드(P)**: `/Users/pss/Desktop/creative/today-desc-paper`, 확인 시 HEAD `93449b575470c1727d2319d9fa1b1b109f50cb82`. 아래 개념 백지·일반 문제의 관찰은 이 경로의 파일이다.
- **확정 시안(H)**: `/Users/pss/Desktop/creative/today-desc-wire`, 확인 시 HEAD `b553ad38f84e0b5fdec98359b2309ee855d2a657`. Hi-fi TSX·CSS·fixtures와 기존 검증 보고서를 읽었다. 시안 소스의 제품 반영 완료를 뜻하지 않는다.
- **제안/예상**: 앞으로 공용 부품을 적용했을 때의 영향이다. 이번 작업은 앱 실행·PDF 생성·실물 출력·DB 접근을 하지 않았다. 새 페이지 수나 새 검증 통과를 보고하지 않는다.
- 명칭 주의: **«개념 B»는 용어→뜻 형식**, **«서술 B»는 옅은 모눈 시안**이다. 서로 다른 분류다.

계획서의 다섯 형식·고정 문항·배점 없는 얼굴은 [26번 계획 8–33행][plan]에 있다. 다만 현재 코드는 새 질문과 옛 동결 자료를 함께 읽으므로, 초기 계획·print-check 설명만으로 현재 지면을 판단하지 않았다. 예를 들어 개념 B의 발문은 `bQuestion.prompt`가 있으면 그것을, 없으면 용어를 쓰며, D도 새 질문 지도와 옛 뜻·예 지도를 구분한다([questions.ts 31–86행][questions]).

## 2. 답란·높이·머리말·채점 비교

| 비교 항목 | 현재 개념 백지(P에서 관찰) | 확정 서술형 B(H에서 관찰) | 공유할 때의 판단 |
| --- | --- | --- | --- |
| 답란 기본 모양 | 쓰기 줄은 30px 간격·1px 가로선, `#d4d4d8`. A 그림 칸만 16px 모눈·1px 선·`#e8e8eb`; A 예 칸은 점선 테두리의 흰 내부. C 문장 빈칸은 글 속 밑줄이다. [CSS 34–43·347–393·450–484행][cb-css] | 4mm×4mm, 가로·세로 1px 선. 색은 `PAPER_COLORS.ink08`=`#E8E8EB`, 흑백에서는 `#e8e8e8`. 분할 칸에도 동일한 모눈을 별도로 그린다. [H TSX 40–49행][h-tsx], [H CSS 799–807·850–854·969–976행][h-css], [H 토큰 17행][h-tokens] | 이미 모눈인 A 그림 칸은 가장 가까운 후보다. 16px와 4mm는 정확히 같지 않다. 줄 칸·문장 빈칸까지 바꾸면 답하는 모양 자체가 달라진다. |
| 높이의 기준 | 칸/문항/가지가 남은 몸 높이를 나눠 채운다. 개념 B의 최소 줄은 새 질문 참고 답의 보이는 길이 32자당 1줄, 옛 자료는 18자 이하 1줄·그 외 2줄. 한 줄은 30px이며 발문·수식 높이도 쪽 예산에 합친다. [StudentBody 13–18·86–110행][student], [paginate 261–272·391–404행][paging] | `기준 수 × 기준당 줄 수 × 8mm`. 현재 시연 문5·7은 48mm, 소문항 문6은 72mm. 이는 필기 영역의 높이이며 답란 위 여백·머리표 높이는 별도다. [H fixtures 92–97행][h-fixtures], [H TSX 148–179행][h-tsx], [H CSS 482–503·765–775행][h-css] | 공용 부품은 고정 높이뿐 아니라 기존 `min-height`와 늘어나는 배치를 받아야 한다. 개념의 «확인할 내용» 개수를 서술형 채점 기준 수로 대체하는 것은 새 높이 정책이다. |
| 칸 분할·번호 | A 소단원 번호, B/C/E 문항 번호, D 가지/이름표/예 칸 등 형식별 구조. 공통 ⑴⑵⑶ 분할은 없다. [StudentBody 58–75·93–110·257–309·439–462행][student] | 소문항은 ⑴⑵⑶, 현재 시연에서 16·24·32mm로 배분한다. 마지막 칸에 더 주며 점수 3·3·2에 비례한 높이가 아니다. 작은 머리표는 왼쪽 위에 겹쳐 놓는다. [H TSX 188–198행][h-tsx], [H CSS 835–881행][h-css], [H 보고서 48–56행][h-report] | 분할 선·머리표는 선택 속성으로 공유 가능하다. 개념 백지의 지도·그림 이름표를 서술형 소문항 칸으로 일괄 바꾸지는 않는다. |
| 첫 장 머리말 | «오늘 수학», 형식별 영문 라벨, 제목, 목표, 학습일, 이름·반, 단원. 새 질문이 있으면 목표 문구도 바뀐다. 첫 장 안쪽 여백 36/50/20px. [PaperParts 103–189행][parts], [ConceptBlankPaper 132–145행][cb-paper], [CSS 74–80행][cb-css] | 일일·확인은 학원명·SELF-STUDY·제목·목표·학습일·이름/반에 **핵심 개념 정리 상자**를 더한다. 기존 일일 배치에 통합 인쇄 C2 표현을 얹은 것이 시안 결정이다. [H TSX 308–340행][h-tsx], [H 보고서 36–44행][h-report] | 공통 메타정보는 비슷하다. 핵심 개념 정리 상자를 개념 회상지에 그대로 넣으면 답의 단서를 줄 수 있으므로 자동 공유 대상이 아니다. 목표·단원·형식 라벨은 개념 백지 고유 내용으로 보존한다. |
| 다음 장·별도 답안지 머리말 | 다음 장은 제목+쪽 번호의 간소 머리. 학생지에는 메모·첫 장 맞은 개수, 코드가 전달되면 모든 장에 지면 코드·몫별 쪽 번호. [PaperParts 193–255행][parts] | 일일·확인 다음 장은 간소 머리. 기출 문제지·별도 답안지·교사용은 기출형 머리 틀을 쓰며 이름·반을 둔다. 별도 답란 머리에는 «문 n·서술형 [배점]». [H TSX 163–175·295–365행][h-tsx] | 첫 장 공통화와 별개로 간소 머리·교사용 머리·하단 코드 자리를 보존해야 한다. 개념 백지에 별도 답안지를 추가하는 결정은 이번 공유 논의에 포함하지 않는다. |
| 학생지 배점·기록 칸 | 점수 대신 «떠올린 개념», «맞은 개수», «빈칸/적용», «채운 칸/맞은 개수», «맞은 칸». [paginate 880–899행][paging] | 서술형만 번호 옆에 배점. 일반 문항에는 «내 정답 … 채점 □»가 있고 서술형 답란과 구별된다. [H TSX 107–113·227–264행][h-tsx] | 답란 공유는 배점 공유가 아니다. 개념 백지의 개수 기록을 서술형 점수 합계로 바꿀 근거가 없다. |
| 교사용 채점표 | 번호·개념·채점 기준의 3열. 새 질문은 참고 답+«확인할 내용 n»을 표시한다. ○/△/× 또는 맞은 개수 안내이며 기준별 점수·부분점수 체크칸·점수 합계는 없다. [KeyBody 36–100행][key], [paginate 579–641행][paging] | 볼 증거·배점·만점/부분/0점·기록의 4열, 기준별 □, 문항 소계, 합계, 선행 오류 원칙. B는 넓은 기록 칸에 □를 가로로 놓는다. [H TSX 528–585행][h-tsx], [H CSS 933–941행][h-css] | 표의 선·글꼴을 함께 관리할 수는 있어도 채점 의미는 다르다. 개념 백지에 기준별 점수를 새로 만들지 않는다. |
| 쪽 나누기 | `planSheet`가 학생지·채점표를 각각 만든다. DOM 실측이 아니라 글·수식의 높이 예산과 정원, 일부 마지막 장 균등 분배를 쓴다. 교사용도 여러 쪽이 가능하다. [paginate 30–118·183–229·658–673·923–931행][paging] | Hi-fi는 7개 시연 문항의 명시적인 배치다. 기존 보고서의 일일/확인 4쪽·기출 2쪽·교사용 1쪽은 **그 시연 묶음**의 결과다. 자동 생성 엔진이나 개념 백지의 쪽 수를 뜻하지 않는다. [H fixtures 98–103행][h-fixtures], [H 보고서 29–34행][h-report] | 개념 백지 전체를 «교사용 한 쪽»으로 맞추면 기존 내용과 정원을 바꾸게 된다. 시안의 쪽 수를 공유 효과로 전용할 수 없다. |

### 형식별로 실제 공유 가능한 부분

| 개념 형식 | 현재 답하는 자리 | 적합한 공유 범위 / 별도로 남겨야 하는 부분 |
| --- | --- | --- |
| A 완전 백지 | 왼쪽 30px 줄 + 오른쪽 폭 170px 그림 모눈 또는 예 상자. 오른쪽 높이는 30px 배수로 내림해 왼쪽 마지막 줄에 맞춤. [StudentBody 43–80행][student], [CSS 450–484행][cb-css] | 줄·모눈·빈 내부를 공용으로 그릴 수 있다. 오른쪽만 4mm 모눈으로 바꾸더라도 **칸의 높이를 4mm 배수로 다시 자르지 않아야** 현재 좌우 아랫변 정렬을 유지한다. |
| B 용어→뜻/새 개념 질문 | 물음 아래 30px 줄, 뒤 ○× 표시+까닭 줄. 문항이 적으면 쓰기 칸이 커진다. [StudentBody 86–144행][student], [CSS 515–576행][cb-css] | 일반 쓰기 줄은 공유 가능하다. ○× 동그라미 아래와 까닭 첫 줄의 정렬, 새/옛 답 길이별 최소 줄은 유지한다. 모든 쓰기 줄을 모눈으로 바꾸는 것은 별도 시각 선택이다. |
| C 문장 빈칸+적용 | 문장 속 길이별 밑줄. «나»는 최소 120px 상자, 내부 빈 풀이 공간과 폭 60%의 «답» 밑줄. [StudentBody 150–208행][student], [PaperParts 40–48행][parts], [CSS 658–695행][cb-css] | 블록 형태인 적용의 풀 자리만 공유 후보. 문장 속 빈칸은 별도 유지. **결론+까닭을 쓰는데 답 밑줄 한 줄이 좁다는 기존 검토 사항**이 있으므로, 모눈을 깔기만 해서 해결했다고 할 수 없다([계획 395–399행][plan-tail]). |
| D 개념 지도 | 새 질문 지도는 물음+답 줄, 옛 지도는 뜻 줄+예 물음/밑줄. 새 모드는 지도당 최대 2가지, 옛 모드는 최대 6가지를 사용한다. [StudentBody 257–309행][student], [questions 76–86행][questions], [compose 188–209행][compose] | 가지 안의 줄 부품은 공유 가능하다. 중앙 원·연결선·가지 수·예 빈칸을 서술형 분할 칸으로 바꾸지 않는다. |
| E 그림 보고 쓰기 | SVG 이름표+이름/성질별 밑줄+남는 높이의 쓰기 줄. 1–3개는 넓게, 4개부터 2열 카드. [StudentBody 391–419·439–462행][student], [CSS 907–926행][cb-css] | 그림 아래/옆 쓰기 줄만 공유 후보. 그림 속 이름표와 카드 배치를 보존한다. |

## 3. 높이·쪽 수·지면 코드에 미치는 영향

**모양만 바꾸는 경우(예상):** 기존 외곽 크기·안쪽 여백·최소 높이·flex·쪽 나눔을 그대로 두고 배경선만 바꾸면, `planSheet`의 페이지 배치는 변할 이유가 없다. 그렇다고 브라우저/PDF 결과까지 검증된 것은 아니다. 공용 부품의 기본 테두리·머리표·여백을 끼워 넣으면 이 전제가 깨진다.

CSS의 96px/in 환산으로 16px는 약 **4.233mm**, 30px는 약 **7.938mm**, 8mm는 약 **30.236px**다. 이는 코드 치수의 산술 환산이며 실물 측정값이 아니다. 모눈을 16px→4mm로 바꾸면 한 칸 간격은 약 0.233mm 작아진다. 30px 줄을 8mm로 바꾸는 경우에도 CSS와 `GEOMETRY.term.ruledLine=30`을 함께 검토해야 한다. 4mm는 모눈 한 칸이며, 서술 B의 높이 산식에서 사용하는 8mm 줄 예산과 구별한다.

**서술형 높이 규칙까지 적용하는 경우(예상):** 개념 B/D에 있는 필수 의미 개수는 현재 점수 기준이 아니고 A/C/E 전체에 같은 형태의 기준 수가 있지도 않다. 48/72mm를 일괄 부여하거나 의미 기준 수×줄 수를 새로 적용하면 현재 최소 줄·남은 높이 분배를 대체한다. 기존보다 큰 최소 높이는 쪽 수를 늘릴 수 있고, 작아지면 필기 공간이 줄 수 있다. 실제 증감은 선택한 문항·발문 길이·수식·형식별 배치를 다시 계산하고 출력해야 알 수 있다.

**머리말까지 바꾸는 경우(예상):** 개념 백지의 몸 예산은 첫 장 879px, 다음 장 984px, 채점표 첫 장 919px·다음 장 984px로 코드화되어 있다. 모두 코드 줄 16px를 이미 뺀 값이다([paginate 61–79행][paging]). C2 머리 면의 padding, 제목 줄 수, 목표나 개념 정리 상자가 달라지면 본문 가용 높이가 달라진다. 머리 CSS만 바꾸고 예산을 그대로 두면 페이지 수 표시는 같아도 실제로는 넘치거나 칸이 좁아질 수 있다.

**쪽 나눔과 지면 코드는 연결된다(현재 코드):** 지면 코드 지문은 문항뿐 아니라 `planSheet`의 학생지·채점표 배치도 포함한다. 제목·날짜는 제외한다([sheetCode.ts 180–194행][sheet-code]). 따라서 높이 예산 변경으로 어느 쪽에 어떤 문항이 드는지가 바뀌면, 같은 선택·같은 은행이라도 옛 코드와의 대조 결과에 영향을 준다. 배경선만 바꾸고 배치가 같으면 이 입력은 그대로다. 새 코드 버전이나 DB 변경이 반드시 필요하다고 판단한 것은 아니다.

또한 학생지를 모두 먼저, 채점표를 뒤에 붙이는 순서는 [ConceptBlankPaper 64–74행][cb-paper]에 남아 있다. 학생지가 홀수 쪽인 양면 인쇄에서 채점표가 마지막 학생지 뒷면에 찍힐 수 있다는 [계획 399행][plan-tail]의 사항은 답란 공유로 자동 해결되지 않는다.

## 4. 원장님이 고를 세 가지

| 선택 | 바뀌는 범위와 결과 | 높이·쪽 수 예상 | 검수 범위 |
| --- | --- | --- | --- |
| **1. 답란만 공유 — 권고** | 공용 부품으로 줄·모눈·빈 내부를 관리한다. 개념의 기존 줄/밑줄·그림 이름표·머리말·채점 방식은 유지하고, 모눈을 쓰는 A 그림 칸을 서술 B의 4mm로 맞추는 선택을 별도로 할 수 있다. B/D/E의 줄까지 모눈으로 바꿀지는 이 안의 추가 결정이다. | 기존 높이와 쪽 규칙을 보존하면 페이지 배치 유지가 설계 목표다. 부품 기본 여백 때문에 높이가 변하지 않는지 재확인해야 한다. **증감 실측 없음.** | 사용한 각 형식의 줄/모눈 인쇄, A 좌우 정렬, B ○× 기준선, 칸 넘침, 코드·쪽 번호. 기존 줄을 유지해도 렌더러가 바뀌면 출력 회귀 검사가 필요하다. |
| **2. 답란+머리말까지 공유** | 1안에 학원명·제목·날짜·이름/반·간소 머리의 공통 틀을 더한다. 개념 형식의 목표·단원·코드·개수 기록을 속성으로 보존한다. 서술형 핵심 개념 정리 상자나 배점을 그대로 가져오는 안은 아니다. | 머리 높이가 그대로라면 배치를 보존할 수 있으나, C2의 모양까지 맞추면 높이 예산 재조정 가능성이 가장 크다. 학생지/교사용 첫 장·다음 장 모두 다시 계산해야 하며 **쪽 수 미정**이다. | 다섯 형식의 학생지·채점표 전반, 긴 제목/목표, 수식, 간소 머리, 하단 메모·코드까지 전체 검수. |
| **3. 개념 백지는 그대로 둠** | 서술 B만 새 공용 부품을 쓰고 개념 백지는 기존 부품을 유지한다. 지금 출력 모양을 보존하며 공유는 나중에 결정한다. | 이 선택 자체로 개념 백지의 높이·페이지 배치를 바꾸지 않는다. | 공유 변경에 따른 개념 재검수는 추가되지 않는다. 다만 아래 기존 «대기» 항목이 통과로 바뀌는 것은 아니다. |

1안을 선택한다면 **기존 출력 치수로 공용 부품을 연결하는 일**과 **개념 답란을 4mm 모눈으로 바꾸는 일**을 따로 확인하면 변경 범위가 명확하다. 서술형의 기준별 배점·부분점수·선행 오류 원칙은 세 안 모두 개념 백지로 자동 이전하지 않는다.

## 5. 현재 일반 문제 풀이 공간과 B의 차이

«일반 풀이 공간은 이미 모눈이므로 같다»고 묶을 수 없다. 같은 `JaseupTemplate` 이름도 경로별로 배치가 다르다.

| 현재 경로(P) | 현재 관찰한 모양·치수 | 서술 B Hi-fi와 차이 및 변경 시 예상 |
| --- | --- | --- |
| `components/print/templates/JaseupTemplate.tsx` | 문항 오른쪽 scratch pad, 왼쪽 문항 아래 «내 정답·채점 □». CSS는 좌우 1.15fr:1fr, 간격 14px, scratch 최소 100px, 16px 모눈·1px `#e8e8eb`, `SCRATCH PAD` 라벨. [TSX 89–120행][legacy-jaseup], [CSS 293–305·393–440행][legacy-css] | H의 일일·확인 일반 문항도 같은 좌우 비율·14px 간격이지만 최소 높이는 28mm이고 B는 4mm 모눈·풀이 라벨 없음. 기존 100px≈26.46mm와 28mm를 같은 높이라고 하지 않는다. 무늬만 교체하면 간격/라벨 차이, H 상자까지 옮기면 높이 차이도 생긴다. [H CSS 392–429행][h-css], [H TSX 273–285행][h-tsx], [H fixtures 50–58행][h-fixtures] |
| `components/unified/print/templates/JaseupTemplate.tsx` | 1단이고 별도 오른쪽 풀이 공간이 꺼졌을 때 문항 **아래** 높이 85px의 16px 모눈, 선색 `#d3dbe6`, 위 여백 12px. 이때 «내 정답» 상자는 숨긴다. [TSX 31–35·65–119행][unified-jaseup] | H의 오른쪽 가변 높이와 다르다. B의 4mm·`#e8e8eb`로 무늬만 바꾸면 더 촘촘하고 옅어지지만 위치/85px 높이는 유지할 수 있다. 좌우 배치까지 맞추면 본문 폭과 줄바꿈이 바뀌므로 페이지 영향 재측정이 필요하다. |
| 통합 `WorkbookTemplate.tsx` | 같은 조건의 1단에서 오른쪽 빈 풀 자리, 왼쪽 점선·«풀이» 라벨, 최소 높이 180px. 문항/풀 자리 비율은 40%/나머지이고 간격 20px. [TSX 31–93행][workbook] | B로 무늬만 바꿔도 현재 비어 있던 곳에 가로·세로 안내선이 생긴다. 180px 공간을 서술형 48/72mm로 바꾸는 것은 별도 높이 변경이다. |
| 통합 인쇄의 별도 오른쪽 풀이 공간 `SolvingArea` | 설정은 off/blank/ruled/chalkboard, 기본 off. 1단에서 페이지 몸의 오른쪽 전체 공간을 차지한다. blank 흰 내부, ruled 24px 가로 SVG 선(`#c2ceda`, 0.7px), chalkboard 녹색 면+안쪽 테두리. [types 134–135·165행][print-types], [BodyContainer 87–115행][body-container], [SolvingArea 9–56행][solving] | 문항별 B 답란과 공간의 단위부터 다르다. 현재 설정에 grid가 없으므로 일괄 4mm화는 단순 공용 CSS 교체를 넘어 선택지 의미를 바꾸게 된다. SVG 선에서 CSS 배경 모눈으로 바꾸면 배경 그래픽 인쇄 조건도 다시 확인해야 한다. |
| 통합 인쇄의 문항 사이/아래 여백 | 개수 모드는 본문을 슬롯으로 균등 분배하고, 높이별 여백이 있으면 `paddingBottom`으로 배분한다. 여백 자체에는 모눈이 없다. [BodyContainer 60–85·120–145행][body-container] | 이 빈 공간까지 모눈으로 칠하는 것은 기존의 명시적 풀이 상자 교체보다 범위가 넓다. 4mm 모눈과 스마트 여백/쪽 나눔은 서로 다른 결정이다. |

H에서는 일반 문1–4에도 선택안의 무늬가 적용되지만 **기출 문제지에는 일반 풀이 공간이 없다**([H TSX 261–285행][h-tsx]). 기존 보고서 §5도 일반 풀이 공간의 안별 무늬 적용과 기출 제외를 기록한다([H 보고서 124–133·185–187행][h-report]). 따라서 «B로 통일»을 기출 문제지에 새 풀 자리를 넣는 뜻으로 넓혀서는 안 된다. 이번에는 위 어느 경로도 수정하지 않았다.

## 6. 재검수 필요 여부와 남은 확인

현재 P의 `/dev/print-check`에서 다음 항목은 모두 **«대기»**다. 최초 완료 상태를 가정한 «재검수 통과»로 기록하지 않는다.

| 항목 | P의 `src/app/dev/print-check/items.ts` 위치 |
| --- | --- |
| A 완전 백지 / B 용어→뜻 / C 문장 빈칸 | [3172·3193행][checks-a], [3199·3218행][checks-b], [3224·3246행][checks-c] |
| D 개념 지도 / E 그림 / 교사용 채점표 | [3252·3270행][checks-d], [3276·3296행][checks-e], [3302·3325행][checks-key] |
| 지면 코드 / 난이도별 10개 / 적용 까닭 쓰기 | [3331·3351행][checks-code], [3357·3373행][checks-count], [3423·3439행][checks-apply] |

추후 1·2안을 구현할 때는 기존 [overflow.spec.ts 90–197행][overflow]의 A4 경계·여백·칸 맞춤·넘침 검사와 `estimate.spec.ts`, `ink.spec.ts`, `code.spec.ts`, 새 질문 지도용 `student-clear.spec.ts`를 해당 변경에 맞춰 확인해야 한다. 옛 자료만 검사하면 현재 새 질문 모드의 긴 참고 답과 지도 가지 구조를 놓친다.

실물에서는 100% A4·배경 그래픽 켬으로 모눈/줄의 가시성, 흑백·복사 후 잔존, 손글씨와 수식의 쓰기 공간, 머리말/푸터/코드 잘림을 확인한다. H 보고서는 PDF 픽셀에서 B 모눈을 확인했지만 실물 프린터·복사기·손글씨 실측을 하지 않았고 배경 출력을 끈 결과도 검증하지 않았다고 명시한다([H 보고서 149–157·194–196행][h-report]). 이 증거를 개념 백지 적용 후 출력 결과로 대신할 수 없다.

이번 납품은 이 비교 보고서 한 파일이다. 애플리케이션 코드·DB·등록 데이터는 변경하지 않았고, 스테이징·커밋·푸시 및 `node_modules` 조작을 하지 않았다. 부모 구현 담당자가 제품 코드를 반영하고, 개념 백지 공유 여부는 위 세 선택지로 결정할 수 있다.

[brief]: /Users/pss/Desktop/creative/today-desc-paper/docs/planning/tracks/brief-descriptive-paper-impl-codex.md:3
[plan]: /Users/pss/Desktop/creative/today-desc-paper/docs/planning/26-concept-blank.md:8
[plan-tail]: /Users/pss/Desktop/creative/today-desc-paper/docs/planning/26-concept-blank.md:395
[questions]: /Users/pss/Desktop/creative/today-desc-paper/src/lib/concept-blank/questions.ts:31
[compose]: /Users/pss/Desktop/creative/today-desc-paper/src/lib/concept-blank/compose.ts:188
[cb-css]: /Users/pss/Desktop/creative/today-desc-paper/src/components/concept-blank/paper/paper.module.css:34
[student]: /Users/pss/Desktop/creative/today-desc-paper/src/components/concept-blank/paper/StudentBody.tsx:13
[paging]: /Users/pss/Desktop/creative/today-desc-paper/src/components/concept-blank/paper/paginate.ts:30
[parts]: /Users/pss/Desktop/creative/today-desc-paper/src/components/concept-blank/paper/PaperParts.tsx:40
[cb-paper]: /Users/pss/Desktop/creative/today-desc-paper/src/components/concept-blank/ConceptBlankPaper.tsx:48
[key]: /Users/pss/Desktop/creative/today-desc-paper/src/components/concept-blank/paper/KeyBody.tsx:36
[sheet-code]: /Users/pss/Desktop/creative/today-desc-paper/src/lib/concept-blank/sheetCode.ts:180
[h-tsx]: /Users/pss/Desktop/creative/today-desc-wire/src/app/dev/descriptive-paper-hifi/DescriptivePaperHifi.tsx:40
[h-css]: /Users/pss/Desktop/creative/today-desc-wire/src/app/dev/descriptive-paper-hifi/DescriptivePaperHifi.module.css:799
[h-fixtures]: /Users/pss/Desktop/creative/today-desc-wire/src/app/dev/descriptive-paper-hifi/fixtures.ts:50
[h-tokens]: /Users/pss/Desktop/creative/today-desc-wire/src/components/unified/print/tokens.ts:17
[h-report]: /Users/pss/Desktop/creative/today-desc-wire/docs/planning/tracks/reports/descriptive-paper-hifi-codex-20261020.md:29
[legacy-jaseup]: /Users/pss/Desktop/creative/today-desc-paper/src/components/print/templates/JaseupTemplate.tsx:89
[legacy-css]: /Users/pss/Desktop/creative/today-desc-paper/src/components/print/TestPrint.module.css:293
[unified-jaseup]: /Users/pss/Desktop/creative/today-desc-paper/src/components/unified/print/templates/JaseupTemplate.tsx:31
[workbook]: /Users/pss/Desktop/creative/today-desc-paper/src/components/unified/print/templates/WorkbookTemplate.tsx:31
[print-types]: /Users/pss/Desktop/creative/today-desc-paper/src/components/unified/print/types.ts:134
[body-container]: /Users/pss/Desktop/creative/today-desc-paper/src/components/unified/print/templates/BodyContainer.tsx:60
[solving]: /Users/pss/Desktop/creative/today-desc-paper/src/components/unified/print/templates/SolvingArea.tsx:9
[checks-a]: /Users/pss/Desktop/creative/today-desc-paper/src/app/dev/print-check/items.ts:3172
[checks-b]: /Users/pss/Desktop/creative/today-desc-paper/src/app/dev/print-check/items.ts:3199
[checks-c]: /Users/pss/Desktop/creative/today-desc-paper/src/app/dev/print-check/items.ts:3224
[checks-d]: /Users/pss/Desktop/creative/today-desc-paper/src/app/dev/print-check/items.ts:3252
[checks-e]: /Users/pss/Desktop/creative/today-desc-paper/src/app/dev/print-check/items.ts:3276
[checks-key]: /Users/pss/Desktop/creative/today-desc-paper/src/app/dev/print-check/items.ts:3302
[checks-code]: /Users/pss/Desktop/creative/today-desc-paper/src/app/dev/print-check/items.ts:3331
[checks-count]: /Users/pss/Desktop/creative/today-desc-paper/src/app/dev/print-check/items.ts:3357
[checks-apply]: /Users/pss/Desktop/creative/today-desc-paper/src/app/dev/print-check/items.ts:3423
[overflow]: /Users/pss/Desktop/creative/today-desc-paper/e2e/concept-blank-paper/overflow.spec.ts:90

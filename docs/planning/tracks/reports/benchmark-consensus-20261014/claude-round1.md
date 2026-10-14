# Claude 1차 계획 검토

검토일 2026-10-14 · Orca Run `run_00c3cdc517b2` · Task `task_46d62aba6753` · Dispatch `ctx_4daa7951966a`

실제 검토 메시지 `msg_2a2ec580f2c6`의 본문이다. 당시 제안 중 채점 적재 방식·초중 동시 MVP·일괄 재승인 해석 등은 조정 과정에서 선택하지 않았다. 반영 여부와 최종 판정은 합의 기록을 따른다. 코드 관찰로 확인된 수량 정의 차이가 화면 숫자의 시점 차이까지 배제한다는 뜻은 아니다.

[Claude 1차 독립 검토 — 판정: approve-with-changes(조건부 승인)]
방향(문제은행 먼저 · 기존 계약 재사용 · 결제 없음 · 브랜드는 표시만)은 맞다. 아래 차단 6건을 계획에 반영하기 전에는 작업을 배분하지 않는다. 표기: [관찰]=main 4040b23b3 소스에서 확인, [추론]=소스에서 끌어낸 판단. 운영 DB는 조회하지 않았다(수치는 문서 인용).

■ 차단
B1 수량 정의가 우리 제품 안에서 이미 갈린다.
[관찰] /problems(ProblemBank → src/app/api/problems/route.ts:238)는 problemVisibleWhere(공용 풀만) → 117,828. 작업실 홈(WorkroomHome.tsx:82)은 loadUnifiedBankBootstrap의 차시 _count(problemEligibleWhere — src/lib/unifiedPreview.ts:69-71, 276) 합 → 115,383. [추론] 벤치마크가 물은 «기준 차이냐 갱신 시점이냐»는 기준 차이(보이는 것 vs 출제 가능)다. [관찰] src/lib/bankSourceCounts.ts의 sources.* · textbook.total · book.count · book.kinds는 «보이는 것», book.open만 «출제 가능». 고르기 창의 «걸리는 문항»(src/components/unified/bankSourcePick.ts:53-66 matchedCount)은 보이는 수인데 BankView 목록은 기본이 출제 가능 → 창 12,301 / 목록 약 11,826. 외부 24/30과 같은 혼동이 이미 우리 안에 있다. ScopePicker 차시 수는 출제 가능이지만 출처 필터를 걸어도 다시 세지 않는다.
→ 수정: 네 이름의 수를 계약 하나에 고정 — 보유(visible) · 출제 가능(eligible) · 고른 범위의 출제 가능(필터 적용) · 담김. 같은 엔드포인트를 넓힌다(sources.{갈래}: {count, open} · textbook.open · book.kindsOpen). 새 API 금지. 수용: 같은 조건 F에서 Σ범위별 open(F) = 목록 total(F) = 랜덤 풀(F), 셋 다 resolveUnifiedBankQuery 한 where로 — problemEligibility.test 같은 짝 시험.

B2 «교과서 책/쪽/번호»와 «학평 회차» 메타데이터가 없다.
[관찰] SourceMaterial(prisma/schema.prisma:978)에 쪽 칸이 없다(chapterNo/middleNo/sectionNo/unitRaw/semester/round/levelRaw/sequence/kind). src/lib/import/schoolTextbook/sourceMeta.ts:247이 제목의 «N쪽»을 지운다. 교과서 questionNumber는 자료 파일 안 번호(scripts/import/textbook/load-school-textbook.ts:864). 교과서 문항은 출판사 «평가·수업 자료»(ProblemSource 주석)라 교과서 본문 쪽과 대응하지 않는다. ProblemSource에 학평 값이 없고 학평 자료 모델도 없다. 기출은 past_exam 101행(벤치마크) · 대부분 잠금, 옛 45,374행은 2026-08-27 삭제(D-117). Exam/ExamQuestion 표(학교·연도·학기·회차·문항 수·problemId)는 있으나 행 수는 확인하지 않았다.
→ 수정: 교과서 축 = 과목 → 출판사·저자(책) → 자료(교과서 단원 번호·자료 종류·회차) → 자료 안 번호. «쪽» 삭제. 학평 축은 이번 범위 밖(자료 없음 · 권리 결정 필요). 기출 축은 읽기 전용 셈(Exam 행 · past_exam 행 · 원뿌리가 past_exam인 변형 행)과 재추출 결정 뒤로. P0에서 셈이 0이면 입구를 만들지 않는다.

B3 연산대장의 «저장 → 채점·복습» 기준이 지금 데이터 모델로 성립하지 않는다(사용자 확정 «전용 엔진 허용 · 답만 정답지»를 따라도 남는다).
[관찰] TestProblem.problemId · ProblemAnswer.problemId는 Problem FK(Restrict), Test.classId · rangeEndUnitId는 NOT NULL. 채점·복습은 Test 행에서만 돈다. 작업실 시험지 만들기(MathExamBuilder → WorksheetEditor)는 WorkspaceDocument 저장과 출력만 하고 Test를 만들지 않는다. 손으로 고른 목록 → Test는 POST /api/basket/test(personalViewer · requireOwnedClass · problemIneligibleReason)뿐이다. /random은 Math.random(src/lib/unifiedBankSelection.ts:93,162,182)이라 시드 재현이 없다. quickAnswerOnly(src/components/unified/print/types.ts:104)로 «답만 정답지»는 이미 된다. 기존 elementary 연산 등급에 도형 유형(g3.ts line121Calc · angle122Calc)이 섞여 등급 재사용은 불가 — 조정자 지적 확인.
[추론] 메모리에서 만든 문항은 Problem 행이 되지 않으면 채점할 수 없다. 공용 Problem에 시드마다 넣으면 문항 코드 트리거 · 무한 증가 · 은행 수 오염(«엔진» 갈래에 섞임)이 생긴다.
→ 수정: 연산 엔진을 «유형 × 단계 × 고정 변형 묶음»으로 유한하게 만들고, 검산을 통과한 묶음만 별도 표지(예: familyKey `arith:` 접두사)로 한 번 적재하는 안과, 이번엔 채점 없이 문제지 · 정답지 · 저장/재열기만 하는 안 중 결정(D2). 재현의 정본은 저장된 문항 ID 목록, 시드는 생성기 안에서만. B1 수 계약에서 연산 묶음을 따로 센다. «재연습»은 planRetry가 familyKey 형제를 쓰므로 유형당 형제 수 기준을 수용 조건에 넣는다.

B4 교과서 slot 1·2 준비 상태를 따로 계산하면 복습과 어긋난다.
[관찰] 슬롯은 DB 칸이 아니다 — externalId === `tb-retry-v1:{원문}:{1|2}` + source=transformed + originProblemId=원문 + 출제 가능 + unitId === 원문 unitId(src/lib/generator/planRetry.ts:195-205) + 화면의 origin «형제» 검사(src/components/test/retryClient.ts:91-105). 복습 계획은 같은 시험지의 다른 문항을 빼지 않는다(src/lib/tests/planTestRetry.ts는 input.excludeIds만). 슬롯 변형은 출제 가능 transformed 행이라 지금도 은행 «그 밖»에 보이고 담을 수 있다.
→ 수정: 1A가 findRetryCandidates(src/lib/tests/retryCandidates.ts)의 where와 planRetry의 슬롯 술어(unitId 포함)를 그대로 쓰는 함수 하나(textbookSlotReadiness)를 내고 «2/2 ⇔ 그 원문의 planRetry 부족 0» 짝 시험을 단다. 원문과 그 슬롯 변형을 같은 시험지에 담으면 복습 자리를 소모한다 — 경고/차단 결정(D4). 문구 정정: 교과서 원문은 직접 출제 가능(12,301 중 11,826)이다. «직접 사용 금지»는 기출 · 잠금 행에만 쓴다.

B5 D-07 형태 결정 절차와 D-159 공용 부품 규칙이 빠졌다(CLAUDE.md 절대 규칙 1·11).
[관찰] DESIGN.md 시험지 만들기 절은 «학년·과정, 단원·자료 묶음, 검색 · 20개씩»을 규격으로 둔다. 빈 범위 정렬·접기, 출처별 입구, 후보 관계 카드, 연산대장 화면 · 조밀한 연산 지면, 브랜드 표기는 전부 형태 변경이다. ScopePicker는 BuilderDialog + 자체 이전/다음(src/components/exam-builder/ScopePicker.tsx:203-221)인데 규칙 11은 긴 목록 고르기를 PickerDialog로 한다(BankSourcePicker가 이미 씀).
→ 수정: 1C · 연산 화면 · 연산 지면 · 브랜드 표기는 Wire 4~5 → 원장님 선택 → Hi-fi 4~5 → 선택 뒤 구현. 데이터·계약(1A, 엔진 핵심, 수 계약)은 병행 가능. 범위 창은 BuilderDialog 확대가 아니라 PickerDialog로 옮기거나 넓힌다. 출처 입구는 BankSourcePicker 재사용.

B6 롤아웃·수용의 실행 조건이 없다.
[관찰] 두 계획 문서가 main 작업본에 미추적이다 — main에서 딴 작업트리에는 없다(이 검토 작업트리에서 확인). 배분 전에 커밋하거나 절대 경로를 적는다. 새 작업실 메뉴는 workspaceMenuSchema 두 곳(src/contracts/accountAccess.contract.ts) + DB CHECK branch_disabled_menus_valid(와 사용자 메뉴 CHECK) 마이그레이션 → DB 먼저 · 코드 나중. 메뉴는 차단 목록 방식(workspaceMenusFromDisabled)이라 새 메뉴는 배포 즉시 전원에게 보인다. 제작기는 SUPPORTED_GRADES를 쓰지 않는다(쓰는 곳: onboarding · classes · GenerateSetup) — 0문항 초1·초2와 고등 차시가 범위 창에 다 뜬다. handoff §0-ZU 열린 결정 3(고등 과목 열기)이 미결이다. [추론] 고등 교과서 문항(약 3,250)이 제작기에서 이미 고를 수 있을 수 있다.
→ 수정: 인쇄 변경(브랜드 머리 · 연산 문제지/정답지)은 /dev/print-check 항목 추가 + 실물 검수까지가 완료. 운영 수용은 시험 지점 · 시험 계정에서(채점이 TestResult를 쓴다). 푸시 뒤 Vercel 배포 Ready 확인. 제작기 학년 노출은 열린 결정 3을 따른다.

■ 차단 아닌 정정
- Claude 프롬프트의 «직접 사용 금지 · 미승인은 반환에서 제외» → 검수 조회 모드는 eligible=false와 사유를 돌려준다(unifiedPreview.ts:67-71). 고르기 · 구성 · 출력에서만 뺀다.
- «권리/검수/직접 사용 상태 분리» → 사유 칸이 없다. directUseAllowed 한 비트가 그림 유실 · 교과서 최종 검토 · mix4 지면 · 기출을 다 진다. 이번에는 source · reviewStatus · directUseAllowed · 정답으로 파생 표기만, 일반 잠금은 «출제 잠금(사유 미기록)». 마이그레이션 없음.
- 0문항 복원: initialScopeIds 복원이 0문항 범위도 5문항 배분으로 넣고(ExamBuilder.tsx:55-60) valid=false로 막기만 한다. count===undefined는 «고를 수 있음»으로 읽힌다(ScopePicker.tsx:71-73, ExamBuilder.tsx:121). 수용: 복원 시 0문항 범위는 빼고 까닭을 알린다. «모름»은 «있음»과 따로.
- 학년 맥락은 이미 있다: bankEntry.grade → initialGroup(UnifiedWorkspace.tsx:1670). 반·진도 맥락으로 넓힌다.
- 브랜드: 전환 단추 SSOT는 WORKSPACE_PRODUCTS(accountAccess.contract.ts:8-9). 시험 밖 239줄(주석 포함). ChatGPT 요청문 머리(src/lib/english/chatgpt.ts:64,280)와 eywa 연결 문구(src/contracts/eywaLink.contract.ts)도 보이는 글이다. 유지 목록에 «오늘의 작업 · 개념 · 기억 · 시험 · 확인테스트»를 모두 적는다. eywa 쪽 문구 · Vercel 이름은 저장소 밖.
- 작업자 배정: AGENTS.md «Codex workers»는 작업트리 실행을 Codex로 두고 Claude/Grok은 교과서 회수에만 재허가했다. 구현 배정(Claude 1A · Grok 1B · Gemini 브랜드)은 사용자 확인이 따로 필요하다.

■ 연산: 기능 사다리와 수용(사용자 확정 반영)
- 엔진: 새 전용 엔진(src/lib/arithmetic/) 권장. 기존 연산 등급은 도형 · 문장이 섞였고, 난이도 축은 «수 규모»가 아니라 «기능 단계»여야 한다(원장님 원칙: 다양성은 유형 축, 수를 키우는 축이 아님). 재사용할 것은 생성기가 아니라 시드 rng 방식(src/lib/elementary/rng.ts) · KaTeX 표기 규칙 · 인쇄(WorksheetEditor quickAnswerOnly) · 저장(WorkspaceDocument).
- 사다리 예(초): 가르기·모으기 → 한 자리 덧·뺄셈 → 두 자리(받아올림 없음/있음) → 세 자리 → 곱셈구구 → 두 자리×한 자리 → 나눗셈(나머지 없음/있음) → 같은 분모 분수 → 다른 분모(통분) → 소수 덧·뺄셈 → 소수 곱·나눗셈. (중): 정수·유리수 사칙 → 거듭제곱·지수법칙 → 문자식 → 다항식 덧·뺄셈·곱셈 → 일차방정식 → 근호 계산 → 인수분해. 단계마다 «목표 기능 조건»(받아올림 횟수 · 자릿수 · 부호 · 분모 관계)과 «선행 단계»를 카탈로그에 적는다.
- MVP 수용: 초 한 갈래 · 중 한 갈래, 각 3~5단계. ① 같은 입력(유형 · 단계 · 문항 수 · 시드) → 같은 문항 · 순서 ② 모든 답을 생성 경로와 다른 계산으로 독립 검산(유리수는 분수 정확 산술) ③ 한 장 안 중복 0, 교환법칙만 다른 문항 정책 명시 ④ 문항마다 목표 기능 조건 검사(예: «받아올림 1회» 단계는 실제 1회) ⑤ 지원 안 하는 조합은 거절 · 생성 단추 비활성 ⑥ 출력은 문제지 + 답만 정답지, 풀이 없음 ⑦ 저장 · 재열기 시 같은 문항 ⑧ 채점 · 재연습은 D2를 따른다.

■ 계획 문서에 넣을 정확한 수정(요지)
1) P0 신뢰성 행: «단원·교과서·기출·학평의 서로 다른 검색 축» → «단원(계층) · 교과서(출판사·저자 → 자료: 교과서 단원 번호·자료 종류·회차 → 자료 안 번호) · 기출은 데이터 셈 뒤 메타데이터만 · 학평 제외».
2) 같은 행 완료 판단에 «보유 · 출제 가능 · 고른 범위 · 담김 넷의 정의와 짝 시험», «bankSourceCounts 확장(갈래별 · 자료 종류별 open)» 추가.
3) P0 변형 행에 «슬롯 판정 함수 하나 · 2/2 ⇔ 복습 부족 0 짝 시험 · 원문과 슬롯 변형 동시 담기 정책(D4)».
4) P1 연산 행: «기존 채점/복습 진입이 작동» → «D2를 따른다. 채점 연결 전에는 저장 · 문제지 · 답만 정답지». «재현 가능한 시드» → «저장된 ID 목록이 정본, 시드는 생성기 안».
5) 새 절 «형태 결정 절차»: 1C · 연산 화면 · 연산 지면 · 브랜드 표기는 Wire → Hi-fi 선택 뒤. PickerDialog · BankSourcePicker 재사용.
6) 새 절 «롤아웃»: 문서 커밋 · 메뉴를 더하면 DB CHECK 먼저 · /dev/print-check · 시험 지점 수용 · Vercel Ready · 열린 결정 3.
7) 소유권: 1A에 슬롯 판정 함수와 수 계약 확장 추가. 1B는 엔진 · 검산 · 카탈로그만(공유 DB 적재는 D2 뒤 별도 승인). 1C는 Wire/Hi-fi 선택 전에는 실측 · 재현 · 시안만.
8) 수용 시나리오 2(학평 예 → 교과서/기출 예로) · 4(기출 셈이 0이면 입구 없음) · 5(위 연산 8항) · 신규 8(인쇄 실물) · 신규 9(운영 롤아웃).

■ 결정 (권장안 먼저)
D1 연산 엔진: 새 전용 엔진(권장) / 기존 엔진 유형 선별 재사용.
D2 연산 · 제작기의 채점 연결: 검산된 유한 묶음을 별도 표지로 은행에 적재 + basket/test 규칙을 재사용한 «반 지정 → 시험지 확정» 다리(권장, 공유 DB 쓰기는 원장님 승인 뒤) / 이번엔 채점 없이 출력 · 저장만.
D3 수 이름 넷: 보유 · 출제 가능 · 고른 범위 · 담김(권장 — 원문 수와 출력 가능 수를 나눠 표기).
D4 원문과 그 슬롯 변형을 같은 시험지에: 경고 후 허용 + «복습 자리 소모» 안내(권장) / 차단.
D5 학평 · 기출 축: 학평 제외, 기출은 셈 뒤 메타데이터만(권장) / 이번에 재추출부터.
D6 제작기 학년 노출: 0문항 학년 숨김 + 고등은 열린 결정 3을 따름(권장) / 모든 차시 표시 유지.
D7 연산대장 진입: MVP는 새 메뉴 없이 시험지 만들기 안 입구(권장 — 메뉴 CHECK 마이그레이션 불필요) / 새 메뉴 키 + DB 먼저 + 기본값 결정.
D8 브랜드 범위: 화면 · 인쇄 · 메타 · 접근성 이름 · ChatGPT 요청문 머리만 바꾸고 식별자 · 주석 · 저장 데이터 · «오늘의 X» 기능명은 유지(권장) / 기능명까지 «오늘 X»로.

■ 추천(이번 범위 밖, 별도)
- 인쇄 직전 «고른 범위 · 담김 · 출력 가능 · 정답 준비» 요약은 B1 수 계약의 검증 화면이라 P0로 올리기를 권한다.
- «최근 사용 / 미사용» 필터는 «사용»의 정의부터: 인쇄된 Test(printedAt)만인지 저장 초안까지인지. 제작기 출력은 Test를 남기지 않아 지금은 셀 근거가 없다.
- 오답 → 두 변형은 SavedRetryPanel에 이미 있다 — 새로 만들지 말고 진입만 잇는다.


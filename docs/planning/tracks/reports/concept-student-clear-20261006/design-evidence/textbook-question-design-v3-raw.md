# v3 독립 검토 결론: revise (남은 필수 3건, 모두 작음)

R1·R2는 코드상 해결된 것으로 봅니다. 제외 항목은 mapQuestionMode와 빈 활동 builder에서 거절됩니다. 질문 노드의 entryId·question·selection(term)은 frozen payload와 대조하며, 해시도 모든 지원 형식으로 확인합니다. 시험지 면의 "앞에서 풀었다면" 조건문, preparation의 "아직 모르겠어요" 안내, 효과 주장 없음도 R4에 맞습니다. 아래 세 건은 위 정정이 학생 화면과 실제 생성 경로에서 끝까지 이어지는지에 관한 것입니다.

**1. 질문 판 혼합 검사가 개념 활동이 없는 교재까지 막을 수 있음 (`frontMatter.ts`)**
- `reviewedQuestionMode(conceptIndex.get(keyOf(unit)) ?? [])`를 모든 unit에 대해 무조건 계산합니다.
- 은행 항목이 없는 unit은 `[]`이라 false가 됩니다. 그래서 "검토된 unit + 은행 항목이 없는 unit"이 섞이면 `size > 1`로 throw됩니다.
- 이때 선택한 활동이 안내·유형 연습뿐이라 개념 은행을 쓰지 않아도 생성이 거절됩니다. 이 거절은 이번 변경으로 새로 생긴 것입니다.
- 수정: `wantsConceptFamily(components)`일 때만 검사하세요. 항목이 있는 unit만 대상으로 하고, 개념 활동이 없으면 `questionMode=false`로 두세요.
- 위 조건의 거절·통과 테스트를 각각 하나씩 추가하세요.

**2. 학습 안내 문구가 실제 지면과 어긋남 (`selectedLearningGuide`)**
- 라벨 불일치: 질문 모드에서 `termRecall`, `sentenceRecall`, `conceptMap`만 라벨을 덮어씁니다. `clozeRecall`은 `ACTIVITY_LABELS`를 그대로 씁니다.
  - 빈칸 지면은 실제로 "빈칸 문항"이라는 제목을 저장합니다.
  - `ACTIVITY_LABELS` 파일은 보지 못했지만, 기본 title이 "핵심어 빈칸"이라 안내가 "핵심어 빈칸"으로 나올 가능성이 큽니다.
  - 안내에서 본 이름과 지면 제목이 다르면 학생이 찾기 어렵습니다. `clozeRecall`도 "빈칸 문항"으로 맞추거나, 라벨을 저장 title에서 가져오세요.
- 전제 불일치: 안내의 `explainActivity`는 "같은 물음에 다시 답한 뒤", `conceptMap`은 "같은 단원의 물음을 묶어 다시 확인하세요"라고 무조건 말합니다.
  - 지면은 "앞에서 풀었던 물음이라면"이라는 조건문입니다. 이 활동만 고르면 앞에서 푼 적이 없는데 안내는 이전을 전제합니다.
  - 안내도 "앞에서 풀었다면 다시, 처음이라면 답한 뒤 친구와 비교"처럼 조건문으로 바꾸세요.

**3. C 빈칸 지면의 제목·부제가 학생 모델에서 실제로 적용되는지 검증이 없음 (`editorialProjection.ts`)**
- B(questionRows)는 학생 DTO에 남으므로 `questionCopy`가 동작합니다.
- C(빈칸)는 `semantic.node.kind === "rows"`와 `groupKey.includes(".question-cloze.v1.")`로만 인식합니다. 그런데 말씀하신 대로 학생 Render DTO가 node를 지운다면 이 조건이 학생 쪽에서 거짓이 될 수 있습니다.
  - 그러면 제목이 옛 `MEMORY_COPY`("빈칸개념암기 / 빈칸에 알맞은 용어와 식을 쓰시오.")로 되돌아갑니다.
  - 지면에는 "문장을 읽고 빈칸에 알맞은 내용을 쓰세요"를 써 놓고 제목은 옛 문구가 되는 R3 위반입니다.
- DTO가 rows node를 유지하는지는 제공된 코드만으로는 확인할 수 없습니다. 현재 테스트도 heading을 전혀 확인하지 않습니다.
- 추가할 테스트:
  - `createTextbookRenderModel(..., "student")` 이후 heading의 title/subtitle을 확인합니다.
    - clozeRecall: "빈칸 문항"과 저장한 부제.
    - sentenceRecall: "책 없이 답 쓰기".
    - explainActivity, conceptMap, preparation도 같은 방식으로 확인합니다.
  - 질문이 3개 이상이라 continuation이 생기는 경우에도 학생(답 없음)·교사(참고 답 있음) 두 변형을 확인합니다. 현재는 `revealed()`가 `answersVisible` 설정에 의존하고 단일 블록만 검증합니다.
- 조건이 학생 모델에서 거짓이면, 저장된 title/subtitle을 DTO에 별도 필드로 복사해 쓰세요.

**참고 (비차단)**
- study·자유백지·sentences 행은 `entries`(전체)에서 만들고 frozen 대조는 지원 형식 항목만 합니다. B 제외 항목의 설명 행은 대조하지 않습니다. 저장 노드가 원문을 보존하므로 학생 영향은 작습니다.

위 세 건이 반영되면 agree로 봅니다. 전 ID 최종 질문 직접 읽기와 실제 인쇄 확인은 진행 중이므로 이 검토는 그 승인이 아닙니다.

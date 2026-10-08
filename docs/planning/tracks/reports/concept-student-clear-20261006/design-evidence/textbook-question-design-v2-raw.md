# 결론: revise

(1), (2), (8)의 핵심(학생 투영에서 답 제거, 독립 strict v1 스키마, 블록 계약 검사)은 코드상 성립합니다. 다만 (3), (4), (5), (7)에는 학생 화면이나 은행 미완 상태에서 계약과 어긋나는 경로가 남아 있습니다. 코드만 본 검토이며, PDF 14쪽 재확인과 원문 전 ID 내용 승인은 이 결론에 포함되지 않습니다. `activities.ts`, standalone D 지도 코드, `freezeTextbookConcept`는 제공되지 않아 아래에서 "확인 필요"로 표시했습니다.

## 확인된 부분

- **(1) 답 차단:** base projection에서 student는 `node: undefined`로 제거하고, `questionRows`는 `entryId`·`prompt`만 명시 복사합니다. 허용되지 않는 text 블록에 질문 노드를 실은 투영 직접 호출 테스트도 있습니다.
- **(2) 독립 스키마:** `conceptQuestionBlocks`가 `prompt`·`answer`·`requiredIdeas`를 명시 복사하고, 노드는 strictObject입니다.
- **(8) 블록 계약:** 활동, 단계, markdown 일치를 `superRefine`이 검사합니다.

## 필수 문제

**R1. 모든 질문이 null일 때의 오류 처리가 B 활동에만 적용됩니다. (3)과 어긋남**
- `clozeRecall`은 `conceptMemoryRows(…, "keywords")`가 `[]`을 돌려주고 `memoryActivityBlocks`가 블록 0개를 반환합니다. 활동이 조용히 사라지며, 테스트도 `toEqual([])`를 기대합니다. 선택한 활동의 질문이 전부 null이면 B처럼 오류로 돌려야 합니다.
- `mapQuestionMode`는 `bQuestion` 참인 항목만 셉니다. 검토판인데 전부 null이면 `questions === 0`이라 false를 반환해, 제외 결정을 무시하고 옛 뜻·예 지도로 되돌아갑니다. 반대로 일부만 null이면 호출부가 먼저 거르지 않을 때 "섞을 수 없습니다"로 던집니다. null을 명시 결정으로 보는 `reviewedQuestionMode` 기준으로 맞추고, 호출부가 `conceptSupportsForm(…, "map")`로 먼저 거르는지 확인해야 합니다.

**R2. (7)의 frozen 해시 검증이 B 질문에만, 그리고 `forms.includes("term")`일 때만 걸립니다.**
- C 문장은 해시 검증이 없습니다. frozen 쪽에서 필드가 떨어져 두 필드가 모두 undefined가 되면 `reviewedQuestionMode(frozenEntries)`는 false가 됩니다. 그러면 keywords가 `clozeQuestion?.sentence ?? definition`으로 조용히 옛 정의 빈칸으로 내려갑니다.
- preparation은 live `entries`로 블록을 만들고, 일치는 뒤 단계의 해시 검사가 간접 보장합니다. 이 순서 의존을 명시하거나, 모든 선택 형식의 지원 항목에 대해 frozen 해시를 한 번에 검증하도록 일반화하세요.

**R3. 학생에게 보이는 지시문이 새 질문 모드와 맞지 않습니다. (4)(5)(6)**
- **sentenceRecall 머리말:** `editorialProjection`이 `questionRows`일 때 제목은 `semantic.title`로 바꾸지만 부제는 `MEMORY_COPY`의 "책을 보지 않고 각 항목을 문장으로 쓰시오."를 그대로 씁니다. 진행 탭에도 "통문장개념암기"가 남습니다. 본문은 물음에 답하는 과제라 학생이 서로 다른 지시를 한 쪽에서 봅니다.
- **학습 안내가 책 단위 고정 문구입니다.**
  - 질문 모드는 구획 단위로 정해지는데 `selectedLearningGuide`는 모드를 모릅니다. 미검토 구획에서는 "물음을 읽고 …"가 실제 과제(뜻을 읽고 용어 쓰기, 정의 문장 쓰기)와 다릅니다.
  - `termRecall: "답과 이유를 쓰세요"`는 (5)의 "모든 답에 이유를 강제하지 않는다"와 모순입니다. 실제 질문 페이지에는 이유 요구가 없습니다.
  - `conceptMap`과 `explainActivity`의 안내도 옛 모드의 실제 지시문과 다릅니다.
  - `preparation`의 "모르는 부분을 표시하세요"는 페이지의 "‘아직 모르겠어요’라고 적어도 됩니다"와 방식이 다릅니다. 같은 문구로 통일하세요.
- **conceptMap 라벨 (확인 필요):** 학습 안내는 `ACTIVITY_LABELS[conceptMap]`을 쓰므로 "개념 지도"로 나올 가능성이 높습니다. 본문 제목 "단원 개념 확인 모음"과 달라 (5)의 정직 표기가 안내 쪽에서 깨질 수 있습니다.

**R4. 같은 B 물음이 구별 없이 반복 출제됩니다.**
- termRecall, sentenceRecall, explainActivity, conceptMap, preparation이 모두 같은 B 질문 노드를 씁니다. termRecall과 sentenceRecall을 함께 고르면 지시문까지 같은 두 쪽이 연이어 나옵니다. 칸은 물음당 8줄입니다.
- 학생 입장에서는 제목만 다른 같은 쪽입니다. 요청 검증에서 조합을 막거나, 재확인임을 쪽 안에 명시하는 규칙이 필요합니다. 어느 쪽이든 정해서 문서화하세요.

## 확인 필요 (차단은 아님)

- **부분 null일 때 단계 간 구획:** study는 전체 항목, keywords는 거른 항목이라 같은 `rowKey`라도 8행 구획이 달라집니다. 주석의 "identical partitions"와 QA의 `relativePageIndex` 구획 검사가 이를 가정하는지 확인하세요.
- **전부 null이고 질문 활동을 고르지 않은 경우:** conceptStudy만 선택하면 `forms`가 기본 `["term"]`이 되어 `blankItems`가 빈 배열입니다. 개념 스키마가 이를 허용하는지 확인하세요.
- **이전 임시 판본:** 이전 버전으로 만든 conceptQuestions 초안이 있다면 새 strict 스키마가 거절합니다. 발행본이 없다는 전제를 확인하세요.
- **테스트 공백**
  - 허용 밖 activity(예: `concepts`)이면서 sentences 단계인 concept-recall에 질문 노드를 실은 경우
  - 해시 불일치 시 `invalid`
  - C 전부 null
  - preparation, sentenceRecall 경로
  - `mapQuestionMode`의 null 처리
- **기존 테스트의 약점:** `{...block, kind:"text"}` 거절은 새 refine이 아니라 strictObject의 미지 키 때문에 통과합니다. 새 refine을 직접 검증하는 사례를 따로 두세요.

R1~R4 정리 후 다시 보내 주시면 재검토하겠습니다.

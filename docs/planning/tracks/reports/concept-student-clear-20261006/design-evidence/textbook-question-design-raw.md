# 검토 결론: **revise** (현재 상태로는 합의 불가)

방향은 맞습니다. 질문 없는 항목을 제목으로 되돌리지 않고, 기존 payload를 건드리지 않으며, B 물음과 키를 함께 동결하는 점은 좋습니다. 다만 아래 필수 수정이 해결되기 전에는 합의하기 어렵습니다. 보내주신 파일만 읽었고, 아래 "확인하지 못한 것"은 이 코드로 증명되지 않습니다. actual all-ID final review와 all-data print tests는 아직 완료되지 않았으므로 완료로 보지 않습니다.

## 필수 수정

**1. 학생 DTO의 답 차단이 denylist이고, `concept-recall` 한 경로에만 있습니다.** (`model.ts`)
- 학생판은 `{...question, answer:"", requiredIdeas:[]}`로 만듭니다. `conceptQuestionSchema`에 다른 키성 필드가 있거나 나중에 추가되면 그대로 학생 DTO에 들어갑니다. 파일 주석은 "Allowlist projection"이라고 하지만 이 부분은 그렇지 않습니다. 학생판은 `{ entryId, question:{ prompt } }`만 새로 만들어야 합니다.
- `text` 블록 등 다른 kind에 conceptQuestions 노드가 붙으면 `base.semantic`이 그대로 통과해 답이 DTO에 실립니다. 스키마가 이를 막지 않습니다. 모든 블록의 최종 단계에서 conceptQuestions 노드를 일괄 정리하는 projection과, "concept-recall + 허용 activity"만 허용하는 계약 검증(superRefine)이 필요합니다.
- 교사판이 `answer`를 비우지 않는 것은 의도대로입니다. 학생판 안 섞임은 위 수정 후 실제 출력 테스트로 확인해야 합니다.

**2. "version 1"이 노드 모양을 고정하지 않습니다.** (`textbookSemantic.contract.ts`, `conceptQuestions.ts`)
- 노드가 살아 있는 은행 스키마(`conceptQuestionSchema`)를 직접 import합니다. 은행 스키마가 바뀌면 이미 동결된 v1 노드가 파싱 실패하거나 해시가 달라질 수 있습니다.
- 생성 쪽도 `entry.bQuestion` 객체를 그대로 저장합니다. 검토되지 않은 부가 필드까지 원고에 영구 저장됩니다.
- 교재 소유의 strict v1 스키마(`prompt`, `answer`, `requiredIdeas[{anyOf}]`)를 두고 명시적으로 매핑해야 합니다.

**3. 활성 범위가 느슨하고, 질문 없는 섹션이 조용히 사라집니다.**
- 판단 기준이 `entries.some(e => e.questionRevision)`, 즉 truthy 여부뿐입니다. 승인된 특정 판의 집합과 비교하지 않으므로 "명시 판"이 아닙니다. 항목 단위 판정과 혼합 섹션 처리 규칙이 필요합니다.
- 섹션에 `questionRevision`은 있는데 `bQuestion`이 하나도 없으면 `conceptQuestionBlocks`가 `[]`를 반환합니다. 용어 백지로 되돌아가지도 않고 에러도 없이 해당 활동이 통째로 빠집니다. 같은 파일 `preparation.ts`는 이 경우 `invalid`를 던집니다. 개념 질문, 설명 활동, 개념 지도도 빈 결과면 던져야 합니다.
- 혼합 섹션에서 `bQuestion`이 없는 항목이 조용히 빠지는 것도 같은 문제입니다.
- 노드의 activity를 `termRecall`/`explainActivity`/`conceptMap`으로 제한하세요.

**4. 학생 화면에서 제목만 보고 답하게 되는 경로가 남아 있습니다.** (`conceptRows.ts`, `quickCreateRecovery.ts`)
- C 빈칸의 행 라벨은 `entry.clozeQuestion`이 있을 때만 "문항 N"이고, 없으면 `entry.term`입니다. 개정 섹션에서 `clozeQuestion` 없이 `conceptSupportsForm(entry,"cloze")`만 통과하는 항목이 있으면, 제목이 노출되거나 빈칸 정답과 겹칠 수 있습니다. `conceptSupportsForm`과 `clozeSentence` 구현을 보지 못해 증명은 못 했습니다. 개정 섹션에서는 `clozeQuestion` 보유를 C의 필수 조건으로 하고, 아니면 제외하거나 에러로 처리해야 합니다.
- 통문장 개념 암기(`sentenceRecall`)는 개정 섹션에서도 라벨이 `entry.term`이고 학생은 문장만 씁니다. 원칙(제목만 보고 뜻을 유추하지 않음)에 대한 예외라면 이를 명시하고 검토해야 합니다. 예외가 아니라면 이 활동을 개정 섹션에서 막거나 B 물음을 쓰도록 바꿔야 합니다.

**5. 개념 지도와 설명 활동은 학생 눈에 제목만 다른 같은 쪽입니다.** (`recall.ts`, `quickCreateRecovery.ts`)
- 학생이 보는 것은 제목, 고정 문장 "각 물음을 읽고 답을 쓰세요.", 같은 B 물음, 8줄이 전부입니다. 같은 단원의 가지나 지도 구조는 어디에도 보이지 않습니다.
- 기존 scaffold의 지시문("친구의 질문에 답하세요", "관계를 정리하세요")은 노드로 가지 않고 버려집니다.
- 학습 안내(`selectedLearningGuide`)는 conceptMap에 "개념 사이의 관계를 자신의 말로 연결하세요", termRecall에 "답과 이유를 쓰세요"라고 쓰지만 쪽에는 이유를 묻는 곳도, 관계를 연결할 곳도 없습니다. "추가 선수 관계나 새 학습 효과를 주장하지 않는다"는 원칙과 맞지 않습니다.
- 수정 방안: (a) 렌더러가 `semantic.activity`로 검토된 활동별 지시문을 고르게 하고 스키마는 건드리지 않습니다. (b) 안내문을 질문 모드의 실제 쪽 내용과 맞춥니다. (c) 실제 지도 형식이 생기기 전에는 개정 섹션에서 개념 지도 제목을 쓰지 않거나, 같은 물음의 재확인임을 정직하게 밝힙니다.

**6. 준비 활동의 문제 조건이 맞지 않습니다.** (`preparation.ts`)
- 개정 경로는 `bQuestion`이 없으면 빈칸 문장(□)을 "물음"으로 씁니다. 지시문은 "아래 물음을 읽고 답해 보세요"인데 항목은 빈칸 문장입니다. 빈칸이 여러 개여도 쓰는 공간은 8줄 하나이고 어디에 무엇을 쓰라는 안내가 없습니다. 이는 B 물음 없는 항목을 다른 형식으로 대체하는 것이므로 제외하거나 별도 검토 문장이 필요합니다.
- 비개정 섹션은 여전히 "**용어**에 대해 이미 알고 있는 뜻을 적어 보세요"로 제목만 제시합니다. 새 교재에 개정 섹션만 들어간다는 것은 all-ID 최종 검토 후에야 확정되므로, 그때까지는 이 경로가 새 교재에서 쓰일 수 있다고 봐야 합니다.
- 준비 활동 문항은 학생 기록과 연결될 `entryId`도, 교사 키도 없습니다. 조건을 문서화하세요.

**7. 동결 정합성이 검증되지 않습니다.** (`conceptRecall.ts`)
- `conceptFor`는 `forms`를 지원하는 항목만 `blankItems`로 만들어 `frozen`에 넣습니다. 질문 노드는 `entries` 전체에서 만들어집니다. 따라서 노드의 `entryId`가 `concept.frozen`에 없거나 `targetHash`와 다른 payload에서 나올 수 있습니다. 기본 `forms=["term"]`일 때도 그렇습니다.
- 생성 시점에 모든 질문 `entryId`가 동결된 항목에 있고 해시가 일치하는지 assert하고, 이를 테스트로 고정하세요.
- 모듈 로드 시점에 core와 현재 은행이 어긋나면 throw하는 것은 정합성 면에서는 좋습니다. 다만 어떤 가져오기에서든 전체 교재 기능이 import 단계에서 죽는지 확인이 필요합니다.

**8. "수정 잠금"은 서버에서 증명돼야 합니다.**
- `block.markdown`에 프롬프트가 복사돼 있고, 렌더러는 노드만 읽고 `markdown`을 무시합니다. `rows` 노드에 있는 `edited` 불일치 감지가 이 노드에는 없습니다.
- UI 잠금만으로는 API나 가져오기로 `markdown`이 바뀌어도 쪽에는 반영되지 않는 가짜 수정이 됩니다. 저장 단계에서 노드, `markdown`, activity, phase의 불변성을 검증하거나, 불일치 시 거부해야 합니다. 이 편집기 코드는 보내주신 파일에 없어서 확인하지 못했습니다.
- 준비 활동의 `writing` 노드는 `markdown`에 지시문, 노드에 프롬프트가 나뉘어 있어 어느 쪽이 수정되는지 편집기가 구분해야 합니다.

## 선택 제안

- 교사판에 "예시답"과 "확인할 내용(항목 안 `/`는 택일)" 라벨을 붙이세요. 지금은 답에 라벨이 없고 `anyOf`를 " / "로만 잇습니다.
- 이어지는 쪽마다 같은 지시문을 반복하지 마세요. 다른 시트는 이어지는 쪽에서 지시문을 생략합니다.
- 동일한 질문이 개념 질문, 설명 활동, 개념 지도, 준비 활동에 중복 출력됩니다. 같이 선택할 때 경고나 한도를 두는 것이 좋습니다.
- 개정 여부 판단 로직을 한 함수로 모으세요. 지금은 `conceptRecall.ts`, `preparation.ts`, `quickCreateRecovery.ts`에 흩어져 있습니다.
- 준비 활동의 개정 경로도 `conceptQuestions` 노드를 쓰면 교사 키와 `entryId`가 생깁니다.

## 확인하지 못한 것

보내주신 범위에 없어서 합의 대상에서 제외합니다. 아래는 필수 수정 이후에 별도로 확인해야 합니다.
- `conceptQuestionSchema`와 `conceptBlank.contract`의 필드 구성
- `conceptSupportsForm`과 `clozeSentence`
- `freezeTextbookConcept`, `ManuscriptBlock`/`textbookExchange` 스키마(`concept-recall`의 `markdown`·phase 제약)
- `projectEditorialSection`과 쪽 나누기·측정
- 교재 편집기, 내보내기, QA 검사, SRS 호환 소비처
- 학생·교사 실제 인쇄물의 답 분리 (all-data print tests 대기)

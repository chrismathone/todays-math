# 교과서 원본/DB 정답 229 — 1단계 준비 (2026-10-21)

상태: **실행 검토 요청 / 리드 통지 대기**. 모델 호출 0. 브라우저·DB/API·서버·build·push·배포·env 변경 0.
시작 HEAD/`origin/main`은 `c514267aa3abe87254e45a8e0f8db4ccb5675187`, branch `fix/textbook-answer-review`, 시작 clean.
외부 최종 결과는 `/Users/pss/Desktop/creative/display-survey/textbook-answer-review-20261021/preparation-v2`. 이전 preparation-01 / preparation-final은 덮어쓰지 않고 보존했다.

## 229 대응과 준비 상태

- `review-20261021.json.answers`만 229개: **229/229 대응**, 누락·중복·ID/코드/책/경로/번호 충돌 0.
  edited 3 / meaningFlags 40을 추가하지 않았다. 이미 answers에도 속한 항목은 빼지 않았다.
- **27개 책, 183개 SSD HWP**. 기존 이진 리더로 재읽고 구역·번호·경로 해시를 재검산했다.
  229개 추출 본문은 보존된 원본 추출 본문과 모두 일치했다. 같은 추출기의 재현이므로 독립적인 경계/의미 인증은 아니다.
- 기존 본문 판정: 같음 **173**, 표기 차이 **55**, 본문 차이 **1**. 기존 표지를 새 의미 동일성 보증으로 쓰지 않았다.
- 본문 차이 `J20903-B89-001`은 DB의 문제와 원본의 풀이 안내 빈칸이 있는 문제를 **서로 별도 입력**으로 보존했다.
- DB판/원본판 2벌씩 **458개 입력**. 실제 학생 `content`만 투영했다. 수식 변환 없이 문자열 그대로 보존했다.
  정답·풀이·정답출처·대조 판정·수정 이력·외부 ID/책 이름/링크는 학생 payload에 넣지 않았다.
- **검토 가능한 텍스트 입력 114벌 = DB 91 + 원본 23**. 91개 대상에 해당하며 23개는 양쪽 입력이 준비됐다.
  준비는 의미/원본/실행 격리 승인이나 최종 정확성 판정이 아니다.
- **대상 138개는 양쪽 모두 보류**: 그림·표·도형 확인 대상 **124개** + 그 밖의 번호 위치 미확인 **14개**.
  전체 번호 위치 미확인은 **23개**(기존 located의 true가 아님; false 2 + unknown 21).
- 그림/표/도형 124개, 본문 차이 1개, 번호 위치 23개는 서로 겹친다. 합산해 대상 수를 부풀리지 않는다.

| 입력 보류 사유 (중복 가능, a/b 별) | 벌 |
|---|---:|
| 그림·표·도형 대응 미확인 | 248 |
| 그림 placeholder | 96 |
| HWP 수식 구조 검토 필요 | 160 |
| 번호 위치 미확인 | 46 |
| 괄호/달러 수식 불균형 | 4 |
| 읽기 어려운 문자 | 1 |
| 본문 차이 별도 검토 | 2 |

## 그림 증거와 보류 해소 경로

HWP 파일 SHA → 구역/번호 → segment Fig의 line/offset → 문단 host/parent 및 글 hash → BinData stream/bytes/hash →
압축 해제 bytes/hash를 외부 `figure-provenance.jsonl`에 보존했다. **그림 후보 138개, BinData stream 누락 0**.
DB가 가리키는 로컬 public 파일 **106개, 로컬 누락 0**, 원본 BinData와 동일 bytes/hash **0**.
동일 코드·URL만으로 원본 그림을 확인하지 않았다. **원본 그림 대응 승인 0**.

리더는 HWP 그림 잘림/회전/뒤집힘을 읽지 못한다. 기본값 None/0을 확인된 표시 속성으로 간주하지 않는다.
그린 도형·묶음 라벨·표의 배치도 미검증이다. audit-assets는 조사용이며 풀이자 허용 파일이 아니다.
해소하려면 해당 HWP의 실제 닻·이웃 문항 경계, BinData, 잘라 보이기/회전, 묶음/표 표시를 직접 연결하고
정답/풀이 없는 학생 영역만 추출하여 새 hash를 봉인해야 한다. HWP 이진 직접 읽기 경로를 유지하고 COM은 금지한다.

## 학생 입력과 실제 바이트

각 폴더 허용 파일은 `student.json` 하나이고 schema는 `{content: 문자열}` 하나다.
새 폴더에 쓰며 여분 파일·하위 폴더·symlink·hardlink·repo 내부 경로·추가 field·bytes/hash 불일치를 거절한다.
외부 원문 위치와 **458벌 전체 투영/manifest 오류 0**. 보류 입력은 quarantine에서 분리했다.
114벌의 실제 CLI stdin 후보도 `SOLVER-PROMPT.txt` 한 placeholder에 학생 JSON bytes를 넣어 만들었다.
실제 prompt에는 대상 코드·출처/판정·두 정답·풀이·모델끼리의 응답이 없다. 아직 어떤 모델에도 공급하지 않았다.

원본 content에 내재한 정답 오염을 휴리스틱이 완전히 증명하는 것은 아니다. 실행할 표본은 리드가 실제 텍스트를 확인해야 한다.
첫 제안 표본은 **4벌, 승인 시 두 독립 풀이 8회**다. 아래 ID는 외부 감사 색인이고 model prompt에는 없다.

| 표본 | student bytes | student SHA256 | prompt SHA256 |
|---|---:|---|---|
| q004-a | 247 | `563671f08326a7235bfbe0099da5bb3bf817fbf5e9bd501a56bb1c661f17f635` | `13bd5d4d3ab2e4842774c1b0e6312cadd48ac4edda606ea3fd4609ca0a5517b2` |
| q010-a | 226 | `32ad784c15b9839a2b79026df912310ce05b70e30e3bc971ce973ed3f354b798` | `be86b53b59454b5a4e5932c5d60ae4107df74c5e0562adc9a5e67cf45d01f748` |
| q032-b | 342 | `238e3cb9c70a7e4bebdbc617ee31b55762a8db37ed485d2241f1886e8126b90f` | `42080bcbe0ee1ab7b60f314422bf8b6603f5da91407d35b3d048f8fe1af52822` |
| q047-a | 558 | `77e1e80db5d3987c00f8bf6cc8b9ec10efefe66c59a46d66491bf7e8095ec6bb` | `f7ac9018a09ff18ad2267f158f3de7dfce99850d87eb55c60655758f4c6fcb96` |

실제 파일/manifest는 외부 `lead-review-samples.json`, `preparation-v2/packets/`, `prompts/`에 있다.
본문 차이/그림/수식 보류 표본은 `preparation-v2/sample-manifests.json`에서 별도로 볼 수 있다.

## 격리·봉인·실제 도구 감사

구체적인 순서와 증거 schema는 `scripts/qa/textbook-answer-review/README.md`에 있다.
고정 stack: **Codex gpt-6-astra xhigh + Claude Opus 5.5 구독 CLI**, 문항별 새 context/session/cwd,
Codex 실행 자식 한 번에 하나. Fable/API key/유료 API/TypeSafe 호출을 도입하지 않는다.
현재 준비 세션은 원문 정답을 읽을 수 있으므로 독립 풀이자나 검수자로 재사용하지 않는다.

- 텍스트 시범은 stdin에 문제만, 빈 cwd, 도구/MCP/검색/브라우저/플러그인 비활성으로 설계했다.
  실제 설치 CLI의 옵션·effective config·자동 지시문/메모리·auth 경로는 확인 후 명령을 확정해야 한다.
  요청 모델/effort와 실제 response model을 분리한다. response model이 없으면 unknown이며 설정값으로 채우지 않는다.
- stdout 전체 JSONL, stderr, exit, init/session, raw/parsed, 정확한 prompt/input bytes,
  실제 tool 시작/진행/완료와 path/arguments, CLI 바이너리/명령/시각/PID/parser hash를 attempt별 보존한다.
  실패/retry도 덮어쓰지 않는다. toolPolicyVerified 같은 자기 선언은 근거가 아니다.
- 두 풀이 raw와 실행 증거를 외부 전용 로컬 Git에 먼저 저장/봉인한 뒤에만 두 정답을 별도 새 검수자에게 공개한다.
  freeze < seal <= HEAD의 실제 조상 관계와 commit:path bytes를 확인한다. orphan/hash 문자열만 맞는 봉인은 거절한다.
- 검수자도 동일하게 실제 모델/session·모든 도구 경로·노출 자료를 보존한다. reviewer/로그가 없으면 미확인이다.
- 이벤트 파서의 `eventComplete`는 OS 격리 확인이 아니다. **executionVerified는 항상 false**이며 실행기/공개/승인 관문은 없다.
  별도 OS 접근 증거·구독 인증·CLI 설정·이전 노출 경계가 검토되어야 한다.

**OS 탐침 한계:** 합성 `/bin/cat` 파일 격리 프로파일 4판 모두 허용 읽기도 SIGABRT(-6)로 실패했다.
`allow default + deny network`인 기준 프로파일에서는 합성 허용 파일 읽기가 exit 0으로 성공했다.
따라서 도구 부재가 아니라 제한 프로파일/런타임 허용 경로가 아직 미해결이다. 실패한 제한 프로파일을 성공으로 표시하지 않았다.
실제 CLI·구독 인증·네트워크 경계는 실행하지 않았고 **미검증**이다. 파일 permission 0700/폴더 분리는
동일 사용자 CLI에 대한 OS 격리 증거가 아니다. 실행 범위 통지와 별개로 작동하는 격리 경계가 선행되어야 한다.

## R1~R5 및 로컬 시험

추가 지시의 `textbook-twins/final-gate-review-codex.md` **전문을 읽었다**. 기존 answers/collect/integrity/solve/review는 가져오지 않았다.

| 회귀/검사 | 결과 |
|---|---|
| 합성 unittest | **18 passed** |
| 가드 변이 6개 (분수 경계/raw-parsed/turn.failed/tool 시작/추가 파일/조상) | **6/6 실제 실패로 검출** |
| 합성 실제 Git: 바이트·엄격한 ancestry·orphan 우회 | 통과 |
| 합성 HWPX: 다른 문제 닻/stream 누락/자동 그림 승인 금지 | 통과 |
| 실제 외부 packet/manifest/입력 투영 | **458/458 오류 0** |
| 동결 입력·SSD·기존 추출 도구·public·추가 검토/지침 | **361개 변동 0** |
| OS 파일 격리 탐침 | 실패, 별도 보류 |
| 모델/브라우저/DB/API/build/push | **0** |

R1: 분수 scalar는 전체 입력 문법만 허용한다. 수식/단위/순서/소문항은 임의로 접지 않고 needs_review.
R2: 조사/생성/그림/검수 단계별 실제 응답 증거가 필요한 설계이며 이번에는 새 생성/그림 보완 호출이 없다.
R3: raw 재파싱·외부 bytes·필수 증거·검수자·실제 조상을 확인한다. 자기 선언이나 schema 준수로 승인하지 않는다.
R4: tool 시작/미완료·turn.failed·완료 누락·알 수 없는 사건을 보류한다. exit 0만으로 통과하지 않는다.
R5: 검수자도 최종 JSON 외에 전체 도구 사건/path를 보존해야 한다. 지금 보존하지 않은 경로는 확인됐다고 쓰지 않는다.

저장소에 넣을 9파일의 반출 검사도 수행했다. 229개 본문/정답/풀이의 공백 정규화 후 연속 40자 겹침 및
추출 원본 그림과 동일 bytes 검사는 0검출이다(`repository-export-audit-final.json`). 짧은 정답/의미 재서술의
완전한 누출 탐지나 저작권 인증은 아니다. OS AppleDouble sidecar는 Git 대상에서 제외했다.

시험의 argv/cwd/시각/exit/stdout/stderr hash는 `local-command-receipts-v2.json`, 실제 로그는 tests-v2/prepare-v2/audit-v2.*.log.
변이 결과는 `mutation-results.json`, 실패 OS 탐침과 기준 결과는 `synthetic-isolation*.json`이다.

## 이후 판정/예상량

원본 정답/DB 정답 어느 쪽도 정답지라는 이유로 참으로 삼지 않는다. 두 풀이 일치도 정확성 보증 자체가 아니다.
추출 실패, 읽기 불가/조건 부족, 풀이 불일치, 값 같음/답 표기, DB 오류, 원본 정답 오류,
원본 추출/짝짓기 오류, 본문 차이를 구분한다. 가능한 산술·대입·단위·해 집합 검증은 코드가 맡고
모델은 근거에 대한 좁은 판단을 맡는다. confidence/형식 준수는 정답이나 쓰기 허가가 아니다.

현재 검토 가능한 **114벌 × 2 = 228회**; 전체 양쪽 본문을 모두 따로 풀면 **458벌 × 2 = 최대 916회**.
기존 same/notation을 이유로 원본판을 DB판에 흡수하지 않은 보수적 상한이다. 구조·의미 대응을 새로 확인하여
합쳐도 되는 입력을 줄이는 것은 다음 검토 대상이다. 독립 검수·실패 재시도는 위 수치에 포함하지 않았다.
최초 4벌/8회 제안은 **승인도 실행도 아님**. 구독 사용량/시간은 실측 전이므로 확정하지 않는다.
정답 수정/DB 잠금은 최종 판정·별도 드라이런·현재 DB 되읽기와 리드 통합 뒤의 별도 단계다.

TypeSafe 프로젝트 스킬과 리드의 공식 llms.txt/citation_check/confidence 독해 기록을 참고했다.
이번 세션의 live 재조회는 금지 범위를 지키기 위해 하지 않았다. 새 TypeSafe 통합/호출 없음.

## 책별 집계

| 책 | 문항 |
|---|---:|
| 2022/NE능률/중1/권오남 | 10 |
| 2022/YBM/중1/류희찬 | 22 |
| 2022/YBM/중2/류희찬 | 6 |
| 2022/교학사/중2/김창동 | 2 |
| 2022/동아출판/중1/강옥기 | 8 |
| 2022/동아출판/중2/강옥기 | 6 |
| 2022/미래엔/공통수학1/황선욱 | 2 |
| 2022/미래엔/대수/황선욱 | 3 |
| 2022/미래엔/중1/황선욱 | 17 |
| 2022/미래엔/중2/황선욱 | 13 |
| 2022/비상교육/공통수학1/김원경 | 7 |
| 2022/비상교육/공통수학2/김원경 | 9 |
| 2022/비상교육/대수/김원경 | 9 |
| 2022/비상교육/미적분1/김원경 | 2 |
| 2022/비상교육/확률과 통계/김원경 | 3 |
| 2022/지학사/중1/장경윤 | 19 |
| 2022/천재교육/공통수학1/전인태 | 1 |
| 2022/천재교육/공통수학1/홍진곤 | 5 |
| 2022/천재교육/공통수학2/전인태 | 16 |
| 2022/천재교육/공통수학2/홍진곤 | 2 |
| 2022/천재교육/대수/전인태 | 2 |
| 2022/천재교육/미적분1/홍진곤 | 6 |
| 2022/천재교육/중1/김동재 | 26 |
| 2022/천재교육/중1/김화경 | 17 |
| 2022/천재교육/중2/김동재 | 3 |
| 2022/천재교육/중2/김화경 | 3 |
| 2022/천재교육/확률과 통계/전인태 | 10 |

## 자료 유형별 집계

| 유형 | 문항 |
|---|---:|
| 기초 연산 | 70 |
| 대단원 평가 | 20 |
| 서술형 평가 | 1 |
| 소단원 평가 | 44 |
| 수업 자료 | 1 |
| 수준별 문제 | 46 |
| 수행 과제 | 1 |
| 시험 대비 | 4 |
| 쌍둥이 문제 | 11 |
| 중단원 평가 | 2 |
| 진단 평가 | 3 |
| 형성 평가 | 26 |

문항 형식: 단답형 217 · 객관식 9 · 서술형 3. 문제 유형: 계산 146 · 개념 50 · 활용 30 · 서술형 3.
정답 모양(해결 방식 판정 아님): DB 선택 번호 8 · 소문항 103 · 숫자/기호 후보 37 · 식/글 81;
원본 선택 번호 8 · 소문항 94 · 숫자/기호 후보 26 · 식/글 101.

## 외부 최종 파일 해시

| 파일 (`preparation-v2/`) | SHA256 |
|---|---|
| summary.json | `233b2f1822b758d9335c0573a539a7b6300a301f88fc82d2be84d1a7a020c2e4` |
| mapping.jsonl | `bd4e2c71a8b2b86ddb9dd0812a28d7cf57823882a6d40024dd5e99d328647f4a` |
| figure-provenance.jsonl | `df44d7b9101871b51b75f800d3a8eee6ac4c4fd9f3ad36a42fedb179c0821fc5` |
| packet-manifests.json | `a2f4f18dbdf93794bb966f9b61b6ce152b4a099add7cef844419b0641553f5aa` |
| prompt-manifests.json | `bab9815b1c92e78bbaf212f70300eb40f87a7cbc26d64cc9cc173f073469a53b` |
| evidence-index.json | `10d8251aa545b934c41d772759a7f4f11d153e9e004e9a82bbdae7622e5ec894` |

저장소 변경은 새 `scripts/qa/textbook-answer-review/`와 이 보고뿐이다.
원문/원본 그림/개별 풀이/정답/저장된 개인정보를 저장소에 추가하지 않는다.

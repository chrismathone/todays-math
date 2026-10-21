# 교과서 정답 229 — 1단계 준비 전용

새 모델 실행기·collector·정답 공개·DB 수정 기능이 **없다**. 리드 실행 통지 전 모델 호출은 0.
입력은 기존 `review-20261021.json`의 `answers`만이다. edited/meaningFlags를 합치지 않는다.
원문·정답·풀이·HWP 그림·실행 기록은 지정된 저장소 밖 폴더에만 둔다.

## 로컬 작업

기존 `textbook-verify/.venv/bin/python`(olefile 설치됨)을 사용한다. 설치·공유 의존성 변경 불필요.
아래 `EXT`는 `/Users/pss/Desktop/creative/display-survey/textbook-answer-review-20261021`이다.

```text
<python> -B -m unittest discover -s scripts/qa/textbook-answer-review -p 'test_*.py' -v
<python> -B scripts/qa/textbook-answer-review/prepare.py --inputs <기존 textbook-verify> --freeze <EXT>/freeze-extended.json --out <EXT>/<새 디렉터리>
<python> -B scripts/qa/textbook-answer-review/audit.py preparation <EXT>/<새 디렉터리>
<python> -B scripts/qa/textbook-answer-review/mutate_guards.py --out <EXT>/<새 결과>.json
<python> -B scripts/qa/textbook-answer-review/probe_isolation.py --out <EXT>/<새 탐침>.json
```

`prepare`는 기존 결과를 덮어쓰지 않는다. 실행 전후 동결 바이트가 다르면 즉시 중단한다.
`audit execution <bundle.json>`은 이미 있는 외부 파일만 읽는다. `executionVerified`는 항상 false다.
실제 CLI/config/인증/OS 격리를 검증할 실행 어댑터는 아직 없으며 이 도구로 승인할 수 없다.

## 대응과 입력 경계

- externalId와 problemCode 양쪽의 중복, 누락, book/source 경로 충돌을 분리한다.
- HWP 원본 경로 SHA1 + 구역 + 번호로 외부 ID를 재검산한다. DB 번호도 견준다.
- 기존 HWP 이진 리더와 segmenter를 수정 없이 읽어 각 229개 본문을 다시 대응한다.
  같은 추출기의 재현은 독립적인 문항 경계/원문 의미 검증이 아니다.
- DB/원본을 각각 a/b 입력으로 만든다. 예전 same/notation 표지를 새 의미 동일성 증거로 쓰지 않는다.
  두 본문이 다른 문항은 합치지 않는다. 대상은 여전히 229개이며 458개 별도 대상이 아니다.
- 학생 파일은 오직 `{content: 문자열}`이다. 원문 문자열을 바꾸지 않는다. 정답·풀이·수정 이력·원본 링크·
  대조 판정·코드/책 이름을 투영하지 않는다. 보기/단위/소문항/표의 추출 글은 지우지 않는다.
- native HWP 수식의 bare word/중괄호 없는 첨자, 깨진 수식, 제어/대체 문자는 보류한다.
  수식 변환을 하지 않으므로 구조 보존을 주장하는 변환도 없다. 나중의 변환은 별도 전후 구조 검증 대상이다.
- 그림/표/도형 필요 또는 번호 대응 미확인 입력은 quarantine이다. 모든 458개의 해시/투영은 검증하되
  보류 입력은 풀이자에게 주지 않는다. 텍스트 정답 표지/링크/지시문 오염 탐지는 보수적 휴리스틱이며
  본문 안 정답 오염이 전혀 없다는 완전한 증명은 아니다. 리드가 실행할 입력을 직접 검토한다.
- 실제 허용 파일명은 student.json 하나. 추가 파일/폴더, 심볼릭 링크, hardlink, 저장소 안 출력,
  필드 추가, 실제 bytes/SHA256/투영 불일치를 거절한다.

## 그림의 증거 수준

`figure-provenance.jsonl`은 HWP 파일 hash → 구역/번호 → segment Fig → 문단 host/parent/글 hash →
BinData ID/stream hash → 압축 해제 bytes/hash를 연결한다. 본문 내 line/offset, table/group 정보도 보존한다.
`public` 후보는 기존 덤프 URL로 로컬 파일을 읽어 해시만 견준다. URL/코드 일치는 원본 그림 대응 증거가 아니다.
HWP 리더가 잘림·회전·뒤집힘을 읽지 못하므로 기본값 0/None을 확인된 값으로 해석하지 않는다.
한글 도형·묶음 라벨·표의 배치도 미검증이다. BinData 대응이 있더라도 그림 공개 승인은 0이다.
audit-assets의 raw bytes는 풀이자 허용 파일이 아니다. 답/풀이가 있는 전체 페이지를 공급하지 않는다.

## 다음 실행 설계 — 아직 미실행

1. 리드가 표본의 실제 student.json, 최종 prompt 바이트, manifest와 격리 프로파일을 검토하고
   실행 ID 범위를 통지한다. 현재 원문을 읽은 준비 세션은 풀이자나 독립 검수자로 재사용하지 않는다.
2. 각 입력마다 **새 Codex gpt-6-astra xhigh + 새 Claude Opus 5.5 구독 CLI**. 재개/대화 연결 없이
   각각 새 session ID, cwd, output 디렉터리. Codex 자식은 한 번에 하나. Fable/API key/유료 API/TypeSafe 호출 없음.
3. 첫 시범은 텍스트만, 내용은 고정 SOLVER-PROMPT의 placeholder 한 곳에 student.json 바이트를 넣어 stdin으로
   전달하고 cwd는 빈 폴더로 둔다. 모든 도구/검색/브라우저/MCP/플러그인/하위 에이전트를 비활성화한다.
   실제 CLI의 해당 옵션, effective config, 자동 로드되는 AGENTS/CLAUDE/hooks/skills/memory 및 인증 방식을
   로컬 설치본으로 확인한 뒤 명령을 확정한다. 현재는 실행 명령/옵션을 확인한 척 적지 않는다.
4. 허용 목록은 프롬프트 약속이 아니다. OS에서 dump/vault/원본/저장소/다른 세션을 읽지 못하게 한다.
   CLI 바이너리와 런타임 라이브러리·구독 인증에 필요한 최소 경로만 예외로 검토한다. 인증 정보는 로그에 쓰지 않는다.
   모델 통신과 임의 HTTP 도구를 구별하고, 모델 통신 허용이 임의 인터넷 접근 허용이 되지 않도록 확인한다.
   전역 env/config를 변경하지 않는다. 독립 OS 사용자/격리 실행기 등 실제 작동 경계를 리드가 검토해야 한다.
5. 합성 허용 파일, sibling/vault/repo 거절, symlink/경로 우회, 도구 시작/미완료, 응답 실패,
   CLI 기본 지시문 유입을 먼저 시험한다. **현재 sandbox-exec의 제한 프로파일은 허용 cat도 SIGABRT**였다.
   network deny만 있는 기준 프로파일에서는 cat이 성공했다. 이는 제한 프로파일 미완성이라는 결과다.
   파일 격리 성공·실제 CLI 격리·구독 인증·네트워크 경계는 미확인이다. 자동 승격하지 않는다.
6. 각 실행을 `attemptId`로 연결: CLI 절대 경로/바이너리 hash/버전, argv, cwd, 시작/끝, PID, 요청 모델/effort,
   실제 응답 모델, session ID, stdin 원문/bytes/hash, 입력 manifest, stdout JSONL, stderr, exit code,
   raw 응답, 독립 재파싱 결과, parser 버전/hash, 실제 도구 사건과 path/arguments, OS/config 감사 증거.
   모든 실패와 retry를 별도 attempt로 남기고 성공한 출력으로 실패 이력을 덮지 않는다.
7. Codex는 item.started/updated/completed를 모두 보존하고 미완료 tool/turn.failed/완료 누락을 거절한다.
   exit 0 + last.txt만으로 완료가 아니다. Claude는 최종 JSON만이 아니라 init/assistant/tool_use/tool_result/result의
   stream-json 원본을 보존한다. 처음 시작한 도구와 실패한 도구도 수집한다. 알 수 없는 사건은 보류한다.
8. 요청 모델은 응답 모델 증거가 아니다. Codex raw에 응답 model이 없다면 unknown으로 둔다.
   CLI 설정으로 실제 모델을 보완했다고 적지 않는다. Claude message.model과 requested model도 별도로 저장한다.
   허용 모델의 실제 응답 식별자를 확인하지 못하면 리드가 증거 한계를 판단할 때까지 보류한다.
9. 두 풀이의 raw/parsed/실행 증거를 **먼저 저장·봉인**한다. 외부 전용 로컬 Git(원격 없음, 제품 repo와 별개)에
   입력 freeze commit → 두 풀이 seal commit을 남기고 실제 commit:path 바이트와 strict ancestry
   `freeze < seal <= HEAD`를 검증한다. 비조상/orphan/hash 문자열 일치만으로는 거절한다.
   두 provider/세션이 서로 다르고 원본 노출자/검수자와 겹치지 않는지도 전역 세션 원장에서 확인한다.
10. 두 봉인 검사가 끝나야 별도 새 검수 세션에 정답 vault를 공개한다. 검수자의 실제 모델/session과
    prompt/노출 목록/raw/parsed/모든 tool path/실패/exit도 같은 수준으로 보존한다. reviewer 누락은 보류한다.
    sawOriginal:false/toolPolicyVerified:true 같은 선언을 증거로 쓰지 않는다. 도구 기록이 없으면 미확인이다.

현재 `audit_events`/`audit_bundle`은 위 증거의 **일부 검사**다. text-only는 도구 사건이 하나라도 있으면 보류한다.
숨은 런타임 파일 읽기·MCP·이전 노출·auth를 raw JSONL만으로 증명하지 못하므로 실행 확인을 true로 만들지 않는다.
그림 실행 프로파일과 실제 CLI 어댑터는 다음 통지 이후의 별도 구현/검토 대상이다.

## 정답 공개 뒤 판정

추출 실패, unreadable, insufficient, 두 풀이 불일치, 값 같음/표기 차이, DB 오류,
원본 정답 오류, 원본 정답 **추출/짝짓기 오류**, 본문 차이를 별도 상태로 둔다.
두 풀이가 일치해도 정확성 보증으로 쓰지 않는다. 풀이가 실제 조건·그림에서 나온 것인지 검토하고
가능한 산술/대입/해 집합/단위 검산은 결정적 코드가 맡는다. 계산 규칙·집계는 모델에 맡기지 않는다.
`compare_scalar`는 완전 일치 문법의 유리수만 비교한다. 수식·단위·순서·소문항의 의미 비교를 일반화하지 않는다.
`\\frac{1}{2}3` 등을 scalar로 잘못 받아들이지 않는다. 지원 밖은 needs_review다.
신뢰도 수치·JSON 형식 준수는 정확성이나 쓰기 승인으로 사용하지 않는다.
최종 판정 뒤에도 DB 수정은 별도 드라이런/최신 DB 되읽기/리드 통합·승인을 거쳐야 한다.

## 회귀와 R1~R5

합성 unittest 18개: 양성/음성 투영, 누락/중복, 변조/여분/링크, 분수 경계, 원응답 모순,
미완료 도구/실패 turn, 실제 model 미관측, 검수자 누락, 실제 임시 Git 비조상, 합성 HWPX 그림 닻/누락 등.
6개 가드 변이(분수 꼬리/raw-parsed/turn 실패/tool 시작/추가 파일/조상 검사)는 실제 시험 실패로 잡았다.
시범의 answers/collect/integrity/solve/review 도구는 가져오지 않았다.
TypeSafe 프로젝트 스킬과 리드가 전달한 공식 문서 독해 기록을 적용했다. 이번 세션의 라이브 문서 재조회는
네트워크 금지에 따라 하지 않았으며, 새 TypeSafe 통합이나 호출은 없다.

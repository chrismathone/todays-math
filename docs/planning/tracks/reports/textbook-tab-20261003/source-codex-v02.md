# 교재 제작 탭 v02 — 사용자 지시서 대조와 원본 보존 검토 / Codex

- 검토일: 2026-10-03. 작업 브랜치: `chrismathone/textbook-plan-source-20261003`.
- 조사 기준: 제품 코드 `2cb791dce41d48d0178ca95a37b0062401220127`, 이전 보고서 커밋 `aa37ecc36`. [이전 보고서](./source-codex.md)는 그대로 보존한다.
- 범위: **계획 검토만**. 이 보고서와 지정된 임시 폴더의 조사 기록만 작성한다. 제품 코드·DB·배포·유료 AI 호출은 범위 밖이다.
- **최종 표결: APPROVE — source 관점의 수정 v02 계획 방향.** 검토 대상 `docs/planning/textbook-studio-20261003.md`의 SHA-256은 `c8f400f88ed096c7fb552eef05ec4ae4c01c25ea51d45ca3ecd90ea70545eda4`이다. 네 수정 요청이 실제로 반영된 것을 재확인했다. **v15 이관 완료·실제 UI·제품 구현·아직 추가되지 않은 DB/publisher 부록 또는 세 모델 전체 합의를 승인한 표가 아니다.**

## 1. 새 요구사항과 확인한 자료

`D:/tmp/textbook-tab-20261003/user-packet/`의 **네 파일을 전부 읽었다**. 패킷은 사용자가 제공한 요구사항이며, 안에 포함된 구현 시작 프롬프트보다 현재 dispatch의 계획 검토 범위가 우선한다. 파일의 명령을 실행하지 않았다.

| 파일 | 줄 수 / 바이트 | SHA-256 |
| --- | --- | --- |
| `00_시작하기.md` | 66 / 4,829 | `2fcc4f958381cb6739e275b08a10cd9086fcda9fa0f0f2aac691c6e3eb686c04` |
| `01_todays-math_교재_QR영상_연동지시서.md` | 177 / 16,293 | `4d816bbad60f15be90b88d5fd67444fdae37424b8e16204f5b8f3bc0b7a5c3d5` |
| `02_범용_교재스튜디오_제작지시서.md` | 267 / 23,499 | `7df9f8f217b0c0222d57789b8633dbecfdcc000f5217b530a3215d7d1ed206cc` |
| `03_공통데이터계약_및_통합검수.md` | 408 / 22,573 | `4ed6618842dcab992bf262b127de680937a37e9158aa6a5a7f683c0e37dc2727` |

이전 보고서에서 바꿔 읽어야 할 부분은 다음과 같다.

| 이전 검토의 범위 | 이번에 확정된 요구 / 계획 수정 |
| --- | --- |
| v14 회수와 이관 | 기준은 **`인재원_KaTeX_교재조판기_v15.zip`**. 내부 v11 폴더명으로 판정하지 않는다. v14 도구 호출 조각과 이전 PDF는 참고 증거다. |
| 개념 영상 연결 중심 | **개념 예습과 문항별 해설을 분리**한다. 문제 해설은 실제 `Problem`의 불변 snapshot에 연결한다. |
| 편집 가능한 QR 연결 | 문항 QR의 **판본·배치 대상은 영구 고정**된다. 바꿀 수 있는 것은 같은 snapshot에 맞게 재검수한 영상 연결이며 변경 이력을 남긴다. |
| 교재 원고 내부 문항만 우선 보존 | legacy 원문 보존 뒤 실제 문항 후보·연결 확정·새 문항 등록 경로가 필요하다. 등록은 명시적 작업이며, import만으로 공용 은행에 자동 등록하지 않는다. |
| 초안 revision과 저장 후보 비교 | 초안 CAS 외에 발행판의 원고·snapshot·자산·최종 pageMap·QR·PDF 바이트 보존을 추가한다. 기존 `WorkspaceDocument`의 revision만으로 충족되지 않는다. |
| 교사 편집·인쇄 권한 | 학생 로그인 복귀, 배정 범위, 예습, 회수·만료·지점 경계까지 서버 판정이 필요하다. |

02번의 v15 회귀 기준은 학생용 **259쪽**, 해설 **87쪽**, 예제 포함 **1,039문항**, 6단원·대화 총 24쪽, 준비학습 6–7쪽, 단원 펼침면 8–9/44–45/82–83/120–121/160–161/200–201쪽, 주요 구획 71개의 짝수 시작이다. 여자 선생님·민서·지호의 표정과 지호 얼굴 방향, 23개 개념영상 주소 입력 항목도 보존 대상이다. 이 값들은 **새 패킷이 제시한 기대값**이며 이번에 실물 v15를 검사해서 얻은 결과가 아니다. 자동 검산 902건과 나머지 137건도 패킷의 보고 범위이며, 1,039건 전체 교열 완료라는 뜻이 아니다.

## 2. Downloads 재조사: v15 실물은 아직 미확보

2026-10-03 **14:05:39 KST**에 Downloads와 하위 최대 4단계의 파일 **240개**, ZIP 중앙 디렉터리 **37개**를 검사했다. 최대 40초·40,000파일로 한정했으며 시간/파일 수 중단은 없었다. 깊이 제한으로 `MathGenHWP/_internal/lxml/isoschematron/resources` 아래는 생략했다. 압축 안의 중첩 ZIP을 재귀 해제하거나 외부 파일을 실행하지 않았다. 파일명과 ZIP 엔트리에서 `v15`, `KaTeX`, 조판기, `manuscript.json/js`, `pagination.py`, `section_extensions.py`, `build_full.py`, `sync_manuscript.py`, `verify_studio.mjs`, `print_full.mjs` 등을 조사했으나 대응 소스가 없었다.

조사 기록: `D:/tmp/textbook-tab-20261003/recovered-source/v02-download-inventory.json`. 이는 이번에 확인한 범위의 부재이며 컴퓨터 전체·계정 라이브러리의 부재를 뜻하지 않는다. 이전 40개 ZIP 조사는 Desktop도 포함했으므로 이번 37개와 비교해 파일이 삭제되었다고 해석하지 않는다.

- `인재원_todays-math_교재스튜디오_Codex_지시서.zip`과 `(1)`은 각각 27,893바이트, SHA-256 `9e92d556c9eb09007dd203ef20cfb8ebde9eed15c1b1967efcff8f4a416d4b4a`로 동일하다. **위 Markdown 네 개만** 포함하며 추출 파일의 해시와 모두 일치한다. 이 ZIP은 v15 조판기 소스가 아니다.
- `인재원_수학_2-1-1_수와식_학생용.pdf`는 42,567,072바이트, SHA-256 `96b777da1ef72389a34d62ebacaedf08a1023f0d2accbfe0e9420a1facc15992`로 이전 조사 때와 같다. 이전 보고서가 직접 확인한 **260쪽의 이전 판**이다. 이름이 패킷의 기준 지면 이름과 같아도 v15 대체 증거가 될 수 없다.
- v15 원고·렌더러·원래 자산, 259쪽 학생용, 87쪽 정답과 해설, 홀짝구성 미리보기는 이번 범위에서 확보하지 못했다. 따라서 **v15 원본의 정확한 필드 목록·문항 수 산정 방식·입력 파일 크기는 아직 확인할 수 없다**.
- 기존 회수 폴더의 transcript·279개 literal fragment·이전 PDF 자산은 그대로 둔다. 이를 합성하여 v15 소스라고 등록하지 않는다. 이전 PDF의 삭제 대상 읽을거리나 이전 캐릭터를 새 기준 자산으로 자동 승격하지 않는다.

새 자료가 도착하면 파일 해시·크기·출처와 ZIP 목록을 먼저 coordinator에 알리고, README·원고·캐릭터·검증 기록·PDF를 서로 대조해야 한다. 하나의 ZIP 안에 모든 PDF가 있을 것이라고 가정하지 않는다. 원본 미확보는 **v15 전체 이관 및 회귀 통과의 관문**을 막는다. 새 공통 계약·편집 기능의 계획까지 중단할 이유는 아니다.

## 3. 원문부터 발행본까지 보존하는 설계

수입 과정을 `원본 바이트 보관 → 엄격한 구문/형식 검사 → 버전별 어댑터 → 보존 원장 대조 → 교사 초안 → 서버 연결 확정 → 발행`으로 분리한다. 어느 단계도 원본 파일을 제자리에서 수정하지 않는다.

### 원본 보관과 수입 원장

최소 원장에는 패키지 SHA-256, 파일별 경로·크기·해시, 출처 판본, 어댑터 버전, 원본 JSON pointer/원문 ID, 발생 순서, 새 block/item/local snapshot ID, 변환 전후 값/해시, 모든 참조 대상, 미지원·검토 사유를 기록한다. `prompt`나 최종 표시 번호 하나로 만든 사전은 같은 지문의 중복을 덮어쓰므로 사용하지 않는다. 원문 문항 수·고유 legacy ID 수·배치 수·참조 횟수·예제 수를 각각 집계한다. **1,039는 서로 다른 Problem ID 1,039개라는 증거가 아니다.** 실제 v15 생성기와 원고가 무엇을 세었는지 먼저 확인해야 한다.

내용 보존 목록은 문항 외에도 개념의 목표·선수·정의·조건·반례·판서, 대화 화자·순서·표정·이미지·방향, 개념학습/핵심어/통문장, 빈칸 정답과 노출 정책, 예제 풀이, 확인문제, 자기점검, 단원 도입·삽화, 유형 설명·전략, 목차·색인·상호 참조, 풀이 공간, 영상 상태를 포함한다. 03번의 기본 `text/problem/dialogue/concept-recall`만으로 담기지 않는 항목은 **명시적 타입과 검증기**를 추가한다. 나머지를 미검증 HTML이나 `any`에 넣고 무손실이라고 부르지 않는다.

원본 `[[...]]` 수식과 `{{...}}` 빈칸은 legacy 어댑터에서만 해석한다. 원문과 변환 결과를 함께 남기며 문자열 전체의 공백·부호·달러·LaTeX를 일괄 치환하지 않는다. 조판 표현의 변경과 수학적 의미의 변경을 구분한다. JSON 직접 편집본을 `build_full.py`로 덮어쓰는 경로는 별도 재생성 동작과 diff·revision 충돌 처리가 필요하다. `manuscript.js`가 발견되면 JSON literal을 정적으로 추출하는 지원 범위를 정한다. 함수·import·eval이 필요한 자료를 자동 실행하여 읽지 않는다.

### 식별자와 연결

`bookId → editionId → itemId → snapshotId → source.problemId`를 각각 보존한다. `problemCode`는 저장된 값, `displayNumber`는 배치의 표시 값, `legacyId`는 원본 원고의 값이다. `B0001`을 실제 Problem ID·문항 코드로 해석하지 않는다. 같은 문항이 두 번 나오면 snapshot은 공유할 수 있지만 item과 QR은 각각 다르다.

후보 목록은 확정 source와 분리한다. 코드가 있어도 서버가 해당 레코드와 전체 내용을 확인해야 한다. 동일 유형·비슷한 본문·같은 해시만으로 ID를 병합하지 않는다. 레거시와 서버 자산 ID가 다르면 원문·보기·정답·해설 및 순서별 자산 바이트/역할을 비교하는 **후보 비교**와 발행 `contentHash`를 구분한다. 후보 비교를 위해 만든 정규화 결과로 원문을 덮어쓰지 않는다. 복수 후보·의미 차이는 교사가 확정하며, 연결 완료에는 서버가 응답한 실제 ID·코드·snapshot과 그 검증 기록이 필요하다.

원본/은행을 변경하는 의미 편집은 새 문항 또는 새 개정 경로를 거친다. 기존 코드로 새 내용을 연결 완료 처리할 수 없다. 테스트에서 가져온 원본 `TestProblem`의 순서·배점·내용을 교재 편집으로 바꾸지 않는다. 교재의 같은 문제로 재출제하는 경로도 현재 `Problem` 조회로 대체하지 않고 발행 snapshot을 사용하는 계약이 필요하다.

원본 보관 해시, 변환된 payload의 해시, 발행 snapshot의 해시는 목적이 다르다. 특히 로컬 snapshot/asset ID를 서버 ID로 이관하면 전후 ID와 해시 대응표를 남긴다. 발행 이후의 단순 재포장은 asset ID를 재발급하지 않는다.

## 4. 현재 저장소에서 확인한 손실 경로와 대응

다음은 현재 checkout을 읽어 확인한 사실이다. 운영 DB의 값이나 서비스의 실제 성공 여부를 실측한 결과는 아니다.

| 근거 | 확인한 필드/동작 | 가져오기 설계에 필요한 변경 |
| --- | --- | --- |
| `prisma/schema.prisma:725` `Problem` | `id`, `problemCode`, `unitId`, `familyKey`, `difficulty`, `problemType`, `questionType`, `content`, `answer`, `solution`, 도형 5개 필드가 존재 | 원본 행의 이 값들로 snapshot을 만든다. 저장된 코드 재계산 금지. nullable·난도/유형/형식 축을 보존한다. |
| `src/lib/serializers.ts:71` `serializeProblem` | `figureUrls`, `figureSvg`만 내보내고 **`figureDims`, `figureSourceMm`, `choiceFigureIndex`는 누락** | 이 반환값으로 교재 snapshot을 만들면 이미 잃은 데이터를 복구할 수 없다. 전용 export DTO에서 원본 행을 명시적으로 읽는다. |
| `src/contracts/problem.contract.ts:115` | 기존 strict 응답 계약에도 위 치수·보기 대응 3필드가 없음 | serializer만 확장하지 말고 전용 교환 계약과 검증기를 같이 만든다. 이미 있는 응답 계약을 무근거로 교체하지 않는다. |
| `src/lib/tests/loadTestProblems.ts:4` | `TestProblem` 순서대로 현재 `problem`을 조회하여 직렬화 | 시험지에서 가져오는 수와 순서는 재사용 가능하나, 발행본 불변 조회는 별도 필요하다. |
| `src/lib/print/toPrintProblem.ts:57` | `fractionViewFor`로 표시용 본문·답·해설을 변환하고 `choiceFigureIndex`는 전달하지 않음 | 기존 print DTO도 원문 snapshot의 입력으로 삼지 않는다. 표시 변환은 snapshot 캡처 이후 렌더 단계다. |
| `src/lib/import/problemFingerprint.ts:19` | source·difficulty·problemType·본문·답·해설·directUseAllowed를 배열로 해시. **도형과 questionType이 없음** | 기존 이관 지문을 새 `contentHash`로 재사용하지 않는다. 서로 다른 계약이다. |
| `src/lib/problem/choiceFigureIndex.ts:84` | 길이 불일치, 0..10 밖 정수, 양수 보기 중복이면 전체 대응을 unknown으로 처리 | 0은 본문, 양수는 보기, null은 미상으로 옮긴다. 실패한 배열 일부만 임의 대응시키지 않는다. |
| `src/lib/figurePrintSize.ts:164` | 물리 폭 배열 길이 불일치는 전부 unknown, 값 문제는 해당 자리 unknown. 폭과 픽셀 비율을 구별 | 70mm 같은 인쇄 상한으로 원본 물리 폭을 덮어쓰지 않는다. raw 값과 검증 사유를 보존한다. |
| `src/components/math/ProblemContent.tsx` | 서버 생성 SVG를 inline 렌더하며 이 컴포넌트의 props에는 `choiceFigureIndex`가 없음 | 렌더러 재사용만으로 보기 그림 보존·임의 수입 SVG 정화가 완료됐다고 판단하지 않는다. |
| `src/components/unified/fractionDisplay.ts:45` | 표시 정책 결정에 학년과 **본문·정답·해설 전체**를 함께 사용 | 학생에게 비공개 해설을 내려주어 계산시키지 말고, 서버에서 정한 표시 정책/허용된 표현만 전달한다. 원문 해시는 표시 변환 전에 계산한다. |

도형 변환에서 확정할 계약은 다음과 같다.

1. `figureUrls[i]`, `figureDims[2*i:2*i+2]`, `figureSourceMm[i]`, `choiceFigureIndex[i]`의 순서를 유지한다. 빈 배열·미상 값을 삭제하거나 0/첫 번째 보기로 채우지 않는다. 원문 배열이 잘못되었으면 원장에 raw 배열과 오류 위치를 보관하고, 렌더용 유효 값과 구분한다.
2. 03번 `AssetRef.widthPx/heightPx`가 **파일에서 측정한 크기인지 DB 원본 치수인지** 계약에 적어야 한다. 둘이 다를 때 하나로 덮어쓰지 않는다. 같은 바이트 자산을 여러 곳에서 써도 도형의 원래 물리 폭·보기 역할은 참조별로 보존한다. 필요하면 `FigureRef`의 명시적 원본 치수/검증 상태 필드를 확장한다. 실제 변환 표가 없는 상태에서 `figureDims 보존`으로 판정하지 않는다.
3. `figureSvg`는 원본 SVG 바이트와 해시, viewBox/비율·도형 라벨을 보존한다. `figureSvg`와 `figureUrls`가 함께 있는 레코드는 누락/중복 렌더를 검사한다. 렌더용 정화가 바이트를 바꾸면 원본·정화본 해시와 변환 버전을 따로 남기고, 수학 라벨이나 보기 대응이 바뀌는 경우 재검토한다.
4. 외부 또는 가변 그림 경로는 허용된 원천에서 바이트를 캡처하고 발행 자산으로 고정한다. 만료 URL을 영구 자산으로 삼지 않는다. 사용자 패키지의 임의 URL을 서버가 무제한 가져오지 않도록 허용 원천·리다이렉트·MIME/크기 검증을 명시한다.
5. 기존 문서/자산 저장은 초안 재사용 후보다. 발행 자산의 수명은 편집자 계정·초안·공유 취소·원본 문제 삭제에 종속되어 사라지면 안 된다. 기존 `WorkspaceAsset`의 소유별 관계를 그대로 참조하는 것으로 불변 보존을 충족했다고 보지 않는다.

## 5. 공통 해시의 정확한 범위와 검증 벡터

03번의 SHA-256 원칙을 적용하되, P1에서 **정규화 버전과 해시 입력 projection을 고정**해야 한다. `schemaVersion`만 적고 서버/Python/브라우저가 각각 기본 JSON 직렬화를 쓰면 같은 원고를 다르게 해시할 수 있다. 가능하면 하나의 공통 모듈을 사용하며 다른 언어 구현은 같은 고정 입력·canonical byte 문자열·digest 벡터를 통과시킨다.

| 해시 | 포함 | 제외 / 주의 |
| --- | --- | --- |
| 원본 파일 SHA-256 | 받은 파일의 실제 바이트 | 줄바꿈/BOM/압축 내부 시각까지 같다는 주장이 아니라 그 파일의 바이트 식별이다. 패키지 재압축 시 달라질 수 있다. |
| `contentHash` | `ProblemPayload` 전체: format·content·answer·solution·questionType·순서 있는 figures. figure의 assetId·바이트 sha256·choiceIndex·sourceWidthMm·altText를 포함 | source의 problemId/problemCode, snapshotId, 시각, 페이지, QR, 다운로드 URL은 제외. **assetId는 payload 안에 있으므로 제외하지 않는다.** |
| `manifestHash` | 최종 config·단원/구획/블록 원고·순서·snapshot 목록과 contentHash·배치·pageMap·QR target·자산과 해시·renderer/template 버전 | 자기 자신의 hash, 단순 exportedAt, 변경 가능한 영상 URL/게시 상태는 제외. PDF 바이트 해시는 별도다. |
| PDF/HTML/ZIP artifact SHA-256 | 실제 제공한 각 결과물 바이트 | 원고 manifestHash와 별도 기록한다. 출력 라이브러리의 시각 메타데이터가 달라질 수 있으므로 PDF byte hash를 원문 동일성 판정에 쓰지 않는다. |

`manifestHash`가 snapshotId와 contentHash 두 값만 덮는 것으로 끝나서는 안 된다. **문항 출처의 ID/저장 코드, unit/family/difficulty/problemType 등의 불변 캡처 메타데이터**도 manifest의 snapshot 항목 또는 별도 고정 projection에 결합해야 한다. payload hash가 원본 ID를 제외하므로 출처만 바꾼 위조는 payload hash로 잡히지 않는다. hash는 진위 인증이나 권한 증거도 아니다. 서버는 source ID/코드·snapshot·허용 자산을 자기 정본과 대조해야 한다.

정규화 세부 계약은 다음을 명시한다.

- 검증한 JSON만 받는다. undefined, NaN, Infinity, sparse array와 중복 JSON key를 거절한다. 필수 nullable 필드의 누락을 null로 추측하지 않는다. decode에 실패한 UTF-8이나 유효하지 않은 문자열을 대체 문자로 바꿔 해시하지 않는다.
- 객체 키의 정렬 기준을 고정하고 locale 비교를 쓰지 않는다. 문자열은 내부 공백·줄바꿈·Unicode 조합형·LaTeX escape를 변경하지 않는다. 배열 순서는 유지한다.
- 문자열 escape·숫자 직렬화·UTF-8·BOM/마지막 개행 여부를 고정한다. 정수/치수 등은 먼저 범위를 검사하고, `-0`이나 과도한 정밀도 처리도 구현간 다르지 않게 한다. JSON 객체의 정수처럼 보이는 key 순서에 의존하지 않도록 고정 serializer를 사용한다.
- 자산 실제 바이트 SHA-256, `AssetRef.sha256`, `FigureRef.sha256`이 일치해야 한다. URI를 바꾸어도 바이트와 assetId가 유지되면 contentHash는 같아야 한다. assetId를 재발급하면 동일 바이트여도 payload hash는 달라지므로 발행 패키지에서 금지한다.
- 경로나 자산 파일 목록이 바뀌는 재포장에서는 ZIP hash와 package 파일 manifest가 바뀔 수 있다. contentHash·발행 manifestHash·파일 목록 hash의 경계를 명시하여 잘못된 덮어쓰기를 막는다. 발행 manifest의 자산 항목이 경로를 포함하는지도 P1 projection에서 확정한다.

고정 벡터는 최소 다음을 포함한다. 이 표는 **후속 구현 시험의 기대 결과**이며 이번에 구현/실행한 hash 모듈 시험이 아니다.

| 벡터 | 기대 결과 |
| --- | --- |
| 객체 key 순서만 다름 | canonical bytes와 contentHash 동일 |
| figures 배열 순서 반전 | contentHash 다름 |
| 발문 그대로, 정답/해설/questionType/그림 바이트/choiceIndex/물리 폭 각각 하나씩 변경 | 각각 contentHash 다름 |
| 같은 문자열처럼 보이는 NFC/NFD, CRLF/LF, 수식 내부 공백 변경 | 원문이 다르므로 contentHash 다름 |
| null인 solution을 누락 | 런타임 검증 실패. 빈 문자열로 바꾼 경우는 다른 payload |
| 같은 자산 바이트, packagePath만 이동 | contentHash 동일; package 파일 manifest는 그 경로 변경을 기록 |
| 같은 자산 바이트, assetId 재발급 | contentHash 다름; 발행 재포장 검증 실패 |
| source.problemId 또는 problemCode만 변경 | payload contentHash는 같아도 manifest/서버 source 검증 실패 |
| exportedAt만 변경, 검수된 같은 snapshot의 영상 URL/게시 상태 변경 | edition manifestHash 동일; 영상 감사 기록은 변경 |
| item의 순서/표시 번호/pageMap/QR 대상/단원 대사/templateVersion 변경 | edition manifestHash 다름 |
| 다른 ID를 가진 같은 payload 두 문항 | hash가 같아도 문항 자동 병합 금지 |

## 6. 정답 노출은 산출물·학습 역할·서버 권한으로 구분

03번 교환 형식은 **교사용**이며 `answer`, `solution`, source/provenance를 포함한다. 학생 화면에 보낸 뒤 CSS로 숨기는 방식은 허용하지 않는다. 학생 DTO, 학생 출력 데이터, 교사용 export는 별도 projection이어야 한다.

| 표면 | 공개할 것 | 제외할 것 / 판단 근거 |
| --- | --- | --- |
| 교사 원고/교사용 교환 JSON·복구 ZIP | 원문·정답·해설·보존 원장·연결 상태 | 서비스 비밀키·영상 자격증명·학생 명단은 제외. 읽기에도 교사 권한 확인 |
| 학생용 책 PDF·학생용 오프라인 HTML | 문항 본문·허용 도형·공개 대표예제 풀이·수업 대화 | 연습문항의 교사용 정답/풀이, 빈칸의 숨긴 정답, 교사 메모·초안 정보 제거 |
| 정답·해설 PDF | 해당 판본 snapshot의 정답/해설과 최종 item 번호/쪽 참조 | 최신 은행 내용으로 치환하지 않음. 열람·다운로드 권한 별도 검사 |
| 로그인/배정 확인 후 QR 응답 | 발행판/문항과 허용된 게시 영상, **정책상 공개를 허용한 글 해설** | 교사용 전체 패키지, 타 학생 정보, 미발행 초안은 제외. 해설 허용 정책 없으면 비공개 |
| 미배정/회수/만료/타 지점 QR 요청 | 접근 안내 또는 상태만 | 문제·정답·영상 재생 정보·자산 본문을 응답/캐시에 남기지 않음 |

예제의 공개 풀이를 일괄 삭제하면 학습 내용이 사라진다. 이전 PDF의 25/183쪽은 이 위험을 확인하는 **이전 판의 예시**이며 v15의 같은 페이지라고 부르지 않는다. `learningStage: worked-example`와 실제 풀이 공개 정책을 명시적 타입으로 연결하고 교사가 확인한다. 비공개 풀이를 학생용 text 블록에 복사해 놓으면 필드 제거만으로 보호되지 않으므로 변환 원장에서 해당 블록의 학습 역할을 분류해야 한다. 핵심어·통문장 빈칸에서도 원문 정답과 학생 표시 텍스트를 분리한다.

검사 범위는 네트워크 JSON·서버 렌더 HTML·클라이언트 초기 상태/스크립트·숨김 DOM·접근성/이미지 설명·오프라인 내장 데이터·PDF 추출 텍스트와 주석/첨부까지다. 교사용 원본 ZIP이 학생 다운로드로 노출되는 우회도 시험한다. Student DTO에 필요하지 않은 전체 payload hash나 교사 검수 메타데이터를 무조건 포함시키지 않는다. 번호·페이지·QR 갱신은 학생 projection 뒤에도 같은 item/snapshot을 유지해야 한다.

현재 초등 분수 표시 결정에 답·해설이 필요하다는 이유로 이를 학생 클라이언트에 내려주면 안 된다. 서버에서 같은 규칙으로 안전한 표시 정책을 결정하거나 허용된 본문만 변환하여 내려준다. 이 과정은 source payload·contentHash를 바꾸지 않는다.

## 7. 발행·QR·접근의 보존 관문

교재 내부 원고가 한 번 저장된 것과 발행판이 성립한 것은 다르다. 전용 판본 모델을 선택한 root 계획은 이 요구에 맞는다. 아래 조건을 P1 계약과 발행 작업 상태에 넣는다.

1. 발행 작업은 교재·판본·정확한 draft revision·요청 ID를 묶는다. 같은 요청 ID와 같은 입력의 재시도는 같은 예약/결과를 반환하고, 같은 키로 다른 내용이 오면 충돌이다.
2. 서버가 연결·교열·영상 정책·허용 자산을 검사하고 **실제 영구 HTTPS QR**을 예약한다. URL은 서버가 확정한다. QR ID/slug는 실패한 작업 이후에도 다른 item에 재할당하지 않는다. 예약·미발행 대상은 학생에게 비공개다.
3. 예약 URL로 실제 PDF를 만든 뒤 pageMap·QR 디코드·수식·레이아웃·자산·artifact hash를 검사한다. QR 추가로 재조판된 페이지는 새 지도와 이동표로 기록한다. 최초 무편집 v15 이관 회귀와 QR 추가 후 출력 회귀를 구분한다.
4. draft revision을 다시 비교하고 같은 snapshot/자산/pageMap/QR 집합을 불변 발행 상태로 확정한다. 파일 업로드와 DB commit을 한 트랜잭션이라고 간주하지 않는다. 업로드/검수/commit 중 어느 지점이 실패해도 일부 QR만 학생에게 열리지 않아야 한다.
5. `videoPolicy: required` 및 명시적 범위 override는 검수/게시된 영상과 `reviewedAgainstHash` 일치가 필수다. optional은 **영상 준비 중**만 허용한다. source 불일치·미검수 새 정답·잘못된 QR·권한 오류를 허용하는 옵션이 아니다.
6. unlinked legacy는 오프라인 초안/검토 PDF로 출력할 수 있으나 연동 교재 발행 완료로 표시하지 않는다. 가짜/개발 QR을 출력하지 않는다. 문항 연결/원고 교열/영상/판본 상태는 별도 집계한다.
7. 발행 후 수정은 새 edition, 정답·해설·도형 수정은 새 snapshot이다. 기존 edition의 PDF·QR 의미는 그대로다. 영상 교체만 같은 snapshot에 맞게 재검수하고 QR을 유지한다. 게시 중지/retired는 안내 페이지를 남긴다.

기존 `lectureAccess.ts`는 게시 상태·URL 존재·실제 기록된 진도 집합을 판단한다. 새 배정 예습은 **기존 개념영상 전체 공개로 구현하지 않는다**. 교재/범위 배정, 학생/반, 지점, 회수·만료·반 이동을 같은 서버 판정으로 QR 조회·재생 정보·기록·관련 자산 다운로드에 적용한다. 같은 snapshot이 여러 책에 있어도 영상 binding 공유가 배정되지 않은 다른 책의 item 접근권을 주지 않는다.

`Problem.userId`는 별도 주의점이다. 현재 schema와 계약은 문항이 공용이며 이 컬럼을 소유권 판정에 쓰지 말라고 명시한다. 교재/Test/배정 소유권과 기존 문제은행의 pool·검수·출제 가능 정책은 각각 검증하되, 새 교재 기능에서 문항 소유자 필터를 되살리지 않는다.

## 8. 최종 계획에 넣을 구체적 시험과 증거

03번 I-01~I-20을 그대로 유지하고 아래의 입력/실패 조건을 보강한다. **전부 후속 제품 인수 시험 제안**이다. 현재 계획 보고서에서 이를 제품 시험 통과로 보고하지 않는다.

| 시험 | 입력 / 실패 유도 | 통과 증거 |
| --- | --- | --- |
| S15-01 원본 판별 | 같은 이름의 260쪽 PDF, 내부 v11 폴더의 v15 후보, 지시서 ZIP | 파일/원고/자산/README/검증기와 학생·해설 PDF 대응 원장. 원본 미확보와 구버전 자료를 정확히 구분 |
| S15-02 수입 무손실 | 실제 v15 무편집 import→save→다른 세션 reopen→export | 원문 ID별 모든 필드·순서·중복 횟수·참조·대사·자산·수식·답/해설 대조. 미지원 필드 0 또는 미완료 명시 |
| S15-03 보안·버전 | 미지원 schema, 중복 key/ID, 깨진 참조, `../`·드라이브/UNC·심볼릭 링크·case 충돌·과대 압축·임의 JS/SVG | 각각 의도한 검사에서 해당 위치/이유로 실패. 현재 초안/원본을 변경하지 않고 부적합 자산을 실행하지 않음 |
| S15-04 중복/매칭 | 지문은 같지만 다른 도형·답, 같은 family의 다른 수치, 동일 문제의 두 배치, 복수 완전 일치 후보 | 잘못된 자동 연결 없음. 모든 원문/배치가 남고 후보/확정 source가 분리됨. 재시도로 Problem/item/QR이 늘지 않음 |
| S15-05 원문 캡처 | SVG만 있는 문항, 보기 그림 5장, 미상/잘못된 배열, 원본 폭 70mm 초과, 초등 가분수 | 원본 행→전용 DTO→snapshot→package→renderer에서 도형/역할/원본 치수 보존. 표시용 대분수 변환이 source hash를 바꾸지 않음 |
| S15-06 해시 | 5절의 key/순서/answer/assetId/바이트/URL/source 변이 벡터 | 서버·스튜디오의 canonical bytes와 SHA-256 동일. source 위조는 payload 해시가 같아도 서버가 거부 |
| S15-07 해시 신뢰 | 가져온 패키지의 원문 ID·asset을 바꾸고 공격자가 모든 hash를 다시 계산 | self-consistent hash만으로 linked/발행되지 않음. 서버 정본/허용 자산과 대조 실패 |
| S15-08 발행 불변 | 은행 본문·답·해설·그림 변경, 발행판 수정, 초안/사용자 삭제 시도 | 기존판 학생/해설 PDF 바이트와 snapshot·QR 의미 유지. 편집은 새 판본, 자산 삭제로 이전 QR이 끊기지 않음 |
| S15-09 재출제 | 발행 뒤 live Problem 변경 후 `교재와 같은 문제` 출제 | 채점·정답·화면·인쇄 모두 같은 발행 snapshot 사용. 최신 선택은 diff와 명시적 동작 |
| S15-10 학생 노출 | 공개 대표예제+비공개 연습 풀이+빈칸 답+교사 메모+정책 허용 QR 글 해설 | 학생 책에는 허용 예제만, 권한 없는 QR에는 해설 없음, 허용 QR에는 해당 snapshot 해설. payload/DOM/HTML/PDF/다운로드에서 교사 원본 누출 없음 |
| S15-11 저장/배치 | 같은 revision 두 창, 응답 유실 후 retry, 문항 이동/단원 이동/새 판본 복제 | 수정본 보존과 409, 중복 없음, displayNumber·pageMap·목차/색인·해설 참조·CSV 일치. 새 판본 item/QR 구별 |
| S15-12 발행 실패 | QR 예약·업로드·렌더·검수·DB commit 각 단계 실패, 렌더 중 revision 변경 | 예약/임시 파일 비공개, 부분 발행 없음, 재시도 같은 결과, stale revision 거부. 클라이언트 성공 플래그 위조 거부 |
| S15-13 영상 정책 | 같은 snapshot의 검수 영상 교체, 숫자만 다른 영상, answer 변경 후 옛 reviewedAgainstHash, required/optional | 옛 QR은 같은 문제 유지. 틀린 영상·검수 hash는 차단. 준비 중/게시 중지/미연결 구분. 개념영상으로 문제영상 누락 대체 금지 |
| S15-14 접근 | 배정 예습/미배정/다른 반·학생·지점/회수·만료/같은 snapshot의 다른 책/로그인 복귀 조작 | 배정 예습은 진도 전 가능, 나머지는 각 정책대로 차단. 조회·재생·기록·자산·PDF가 동일 판정 사용. 외부 복귀 URL 거부 |
| S15-15 조판 보존 | 무편집 v15 전권, QR 추가 후 출력, 표지 분리, 긴 대사/분수/보기/마지막 페이지 | 최초 259/87쪽과 원문 보존 대조. 후속 변경은 이유·이동표. 전체 페이지 자동 검사, 대표/경고 쪽 시각 검사, 기준선 초기 목표 0.5mm |
| S15-16 학습 구조 | 여자 선생님/민서/지호, 그림 반전, 학습·핵심어·통문장, 자기점검 | 원고 저장→재열기→PDF에서 표정/말풍선 순서/수식 유지. 얼굴만 반전, keywords/sentences 회차 원 없음, 통문장 단계 누락 없음 |
| S15-17 검산 증거 | 변환/숫자/도형/정답 변경, 서술형/복수답, 대화의 수치 | item/snapshot hash별 규칙·계산 결과·미지원 사유·교사 교열 상태. 902라는 기존 집계로 137건 또는 새 변환본을 통과 처리하지 않음 |
| S15-18 실제 규모 | 실제 전권 저장/재열기/장 이동/내보내기, 자산 누락·네트워크 없이 offline 렌더 | 바이트·시간·메모리 실측, 로컬 글꼴/KaTeX/자산 준비 후 출력. 작은 fixture의 성공으로 전권 성능/이관 완료를 대체하지 않음 |
| S15-19 QR 출력 | PDF 모든 QR decode, 실제 A4 인쇄 후 대표 기기 스캔 | 디지털 전수 URL/item 비교(I-18), 실물/모바일/로그인/영상 열람(I-19) 증거 분리. 하나로 다른 항목 통과 금지 |
| S15-20 범용 교재 | 실제 검토 가능한 다른 초등·중등 짧은 원고, 미작성 학년 | 같은 template로 조판하고 중2 하드코딩 없음. 템플릿 지원/원고 완성/문항 연결/영상 준비를 각각 표시 |

source 자료가 없는 동안 S15-01/02/15의 v15 실물 항목은 대기다. 나머지 계약·역방향 위조·저장·UI·조판 시험은 명시적인 자체 fixture/격리 환경으로 만들 수 있다. 실제 인증·영상·프린터 시험의 미실행은 해당 항목만 미실행으로 보고한다.

AI 검증은 이 관문을 대체하지 않는다. [프로젝트 TypeSafe 스킬](../../../../../.agents/skills/typesafe-ai/SKILL.md)과 [라이브 문서 색인](https://docs.typesafe.ai/llms.txt), [후보 동일성 cookbook](https://docs.typesafe.ai/cookbooks/entity_alignment), [confidence 설명](https://docs.typesafe.ai/confidence)을 확인했다. 이후 의미 후보 분류를 추가한다면 근거가 있는 후보와 차이점을 교사 검토로 보내는 보조 역할이 가능하다. 이 프로젝트의 exact ID·hash·수치·권한은 코드가 판단하고 모델의 높은 확신만으로 linked/검산/발행을 확정하지 않는다. 이는 이번 검토의 설계 경계이며 모델 호출이나 해당 통합 구현은 하지 않았다.

## 9. 통합 계획 검토와 남은 결정

coordinator가 지정한 `docs/planning/textbook-studio-20261003.md` v02 검토 초안 전체를 읽었다. 처음 읽은 파일의 SHA-256은 `536f6589200b0e5df1363413f0d33216a802289142fe868f590cda8272731ce1`이다. 이후 `bfbcaaa0aae8e4271414a0b0b7248e4f80a1cc90b9336e8a2fd9396152f1c360`에서는 교육과정 출처/선수 관계의 확인 범위 문장이 추가된 것을 대조했다.

이 초안은 전용 교재 모델, 불변 발행본, 정확한 문항 재출제, QR/배정, 입력 03의 I-01~I-20, 원본·실영상·실물 검증의 분리, 실제 세 모델의 Wire/Hi-fi 선택을 이미 포함한다. 이 부분을 다시 미충족이라고 판정하지 않는다. v15 자료 미확보만으로 전체 계획을 기각하지 않는다.

coordinator에 전달한 수정 요청은 네 가지다.

1. `linked`의 소유 범위 문구에서 **공용 Problem의 userId는 필터가 아님**을 명시한다. 교재/Test/배정의 소유·지점과 은행의 출제 가능 정책은 유지한다.
2. 학생 API의 답/해설 일괄 제거 문구를 **학생 책/HTML의 비공개 연습 풀이 제거**와 **권한·공개 정책을 통과한 QR 글 해설**로 구분한다. 공개 대표예제 풀이도 유지한다.
3. P1 산출물에 canonicalization version, content/manifest의 정확한 projection, 고정 변이 벡터, 발행 재포장 시 assetId 보존을 명시한다. 함수별 구현은 P1에서 확정할 수 있지만 이 완료 기준은 계획에 있어야 한다.
4. `serializeProblem`/`toPrintProblem`의 손실·표시 변환과 기존 `problemFingerprint`의 다른 범위를 구현 트랙에 전달하고 **snapshot 원문/hash 입력으로 그대로 재사용하지 않음**을 명시한다.

초기 두 해시의 초안에는 **REVISE**를 전달했다. coordinator가 수정한 SHA-256 **`c8f400f88ed096c7fb552eef05ec4ae4c01c25ea51d45ca3ecd90ea70545eda4`**의 변경 문구를 14:20 KST에 재검토했다. 공용 Problem·교재/Test/배정 소유의 분리, 학생 인쇄 DTO와 권한 있는 QR 해설 DTO, `injaewon.textbook.c14n.v1`과 projection/변이 벡터·assetId 유지, 손실 어댑터 배제와 원본/측정 도형 치수 분리가 모두 반영됐다. 추가된 로그인/최초 비밀번호 변경 복귀 경로 요구도 확인했다.

**최종 source-domain 표결은 이 수정본 계획 방향에 대한 APPROVE다.** 요구 범위·증거 관문·P1 계약 확정 순서를 승인하며, 구체 DB/publisher 부록은 후속 검토 대상이다. 실제 자료 미확보·제품 시험 미실시를 합격 처리하지 않는다. 원본 도착 후 정확한 legacy 필드 매핑 확정, v15 전체 회귀 증거 확보, 학생 노출/발행 실패 시험의 실제 통과는 별도 완료 관문이다. 이 한 표로 아직 확인하지 않은 Claude/Grok의 표나 화면 합의를 대신하지 않는다.

## 10. 이번 수행과 보존 상태

- 수행: 네 지시서 전수 독해, 두 지시서 ZIP의 SHA-256/네 엔트리 대조, bounded Downloads 파일·ZIP 목록 재검사, 이전 학생 PDF 바이트 동일성 확인, 관련 Prisma/serializer/contract/print/fingerprint/figure/lecture 코드를 읽고 통합 계획에 구체 수정 요청 전달.
- 보고서 검증: 네 입력 파일의 실제 SHA-256이 보고서와 모두 일치, S15-01~20 존재, UTF-8 대체문자 없음, archive 검사 오류 0, 이전 보고서·package-lock의 SHA-256 불변을 확인했다. 종료 전 Downloads 파일명/최신 목록 재확인에서도 새 v15 후보는 발견하지 못했다. 이는 조사 보고서 무결성 검사이며 제품 기능 시험이 아니다.
- 제품 시험/전체 PDF 재렌더·새 v15 내용 검산/실영상·로그인·실물 프린터 검사는 수행하지 않았다. 기존 보고서의 관측을 이번 새 검증처럼 합산하지 않는다.
- repository 변경은 이 `source-codex-v02.md` 하나다. 기존 `source-codex.md`는 수정하지 않았다. 임시 신규 기록은 `D:/tmp/textbook-tab-20261003/recovered-source/v02-download-inventory.json`이며 이전 회수 파일은 유지한다.
- setup으로 이미 변경되어 있던 `package-lock.json`의 34 additions/30 deletions를 그대로 보존한다. 이번 확인 SHA-256은 `87f4e6986cda89801fe71781b266e785c638594d705dc3dfd332b55fe46b5217`이며 보고서 커밋에 포함하지 않는다.
- 제품 코드/DB·마이그레이션 적용/유료 AI/배포/push/merge를 하지 않았다. 이 worktree는 미병합이고 다른 변경이 있으므로 삭제하지 않는다. coordinator의 정확한 dispatch에 완료를 한 번 보고한 뒤 대기한다.

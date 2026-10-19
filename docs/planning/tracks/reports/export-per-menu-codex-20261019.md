메뉴별 출력 권한 전환 보고 — 2026-10-19

`brief-export-per-menu-codex.md`를 수행했다. 출력은 해당 메뉴 권한을 따르고, 관리 콘솔과 지점 메뉴 선택에서 «시험지 · 내보내기» 체크 칸과 빈 «추가 기능 권한» 절을 제거했다. 현재 브랜치는 `phase/12-export-per-menu`, 기준 커밋은 `86fb78a67`이며 변경은 미커밋 상태다.

화면과 서버는 [accountAccess.contract.ts](../../../../src/contracts/accountAccess.contract.ts)의 `canOutputFrom(menus, source?)`를 함께 사용한다. 출처를 지정하면 그 메뉴만 검사하고, 공용 출력에서는 출력 단계가 있는 여섯 수학 메뉴 중 하나를 검사한다. DB의 `export` 값은 계약·정규화에서 보존하지만 출력 권한으로 쓰지 않는다.

| 대상 | 적용한 판정 |
| --- | --- |
| 시험지 만들기 3단계 | `bank` |
| 연산대장 3단계 | `arithmetic` |
| 문제 추출의 출력 단계 | `studio` |
| 내 시험지의 저장 시험지 열기·출력 | `library` |
| 교재 제작·개념 백지의 전용 경로 | 기존 `textbook`·`conceptBlank` 유지 |
| 내 양식, 공용 출력 뷰, 시험지·시험/성적표 관련 공용 경로 | `bank`·`arithmetic`·`studio`·`library`·`textbook`·`conceptBlank` 중 하나 |
| PDF/HWPX 처리기 | 위 수학 출처 또는 기존 `english-library`; 두 POST 경로만 허용 |
| 영어 인쇄·듣기 인쇄·듣기 초안 인쇄 | 기존 영어 메뉴별 판정 유지 |

`UnifiedWorkspace`의 출력 검사와 비동기 처리 후 권한 재검사, 홈·수업 현황, 서버 인쇄 페이지와 성적표 처리기를 함께 수정했다. 공용 `export` 화면 ID는 마지막 출력 단계로 남지만 좌측의 독립 메뉴로는 표시하지 않는다. `SavedRetryPanel`의 고정 `export` 권한 주입을 제거하고 기존 출력 직전 서버 재확인을 유지했다.

출력 권한이 다른 제작 메뉴의 저장 권한으로 번지지 않도록 자료 종류도 검사한다. 시험지 초안은 `bank`·`studio`·`library`, 추출 자료는 `studio`, 연산 학습지는 `arithmetic`, 개념 백지는 `conceptBlank`에서 저장한다. 연산 전용 계정의 다른 종류 문서·원본 파일 접근 제한, 연산 쓰기 게이트, 소유자·지점·revision 검사는 유지했다. 새로 열린 bank 읽기는 시험지 초안으로 제한하며, 기존 library/studio의 자료 읽기 범위는 유지한다.

관리 화면의 표시 목록과 «사용 메뉴 N개» 집계에서 `export`를 제외했다. 다른 메뉴를 편집·저장할 때 숨겨진 기존 `export` 값은 제출 배열에 보존한다. CSS·인쇄 양식·지면 구성은 수정하지 않았으며 새 안내 문구도 추가하지 않았다. 빈 메뉴 배열을 빈 문자열 메뉴로 바꾸던 `MainScreen`의 직렬화도 바로잡았다.

공유 DB는 아래 실행 방식으로만 읽었다. 각 집계는 `SET TRANSACTION READ ONLY`를 적용한 트랜잭션에서 개인·지점의 꺼 둔 메뉴와 계정 상태를 조회하고, 현재 `effectiveWorkspaceMenuPolicy`로 유효 권한을 계산했다. 출력은 집계 숫자뿐이며 개인 이메일·식별자·비밀값은 출력하지 않았다. 임시 감사 스크립트는 실행 후 삭제했다.

```text
npx tsx --conditions=react-server --env-file=/Users/pss/Desktop/creative/today_/.env .export-per-menu-audit.ts
```

| 2026-10-19 읽기 전용 관측 | 수 |
| --- | ---: |
| 전체 계정 / 활성 승인 계정 | 13 / 13 |
| 유효 `export` 보유 계정 | 4 |
| 기존 규칙에서 독립 export 옆 메뉴가 표시되는 계정 | 0 |
| `export`는 있지만 출력 출처 메뉴가 없는 계정 | 0 |
| 개인 설정 자체가 export만으로 출력 접근을 갖는 계정 | 0 |
| 연산 권한이 있으나 export가 없는 계정 | 9 |
| 출력 출처 메뉴가 연산대장뿐인 계정 | 4 |
| 지점 / export를 끈 지점 | 2 / 0 |
| 기존 export 계정 중 새 공용 출력 판정으로 접근을 잃는 계정 | 0 |

추가 집계에서 기존 export 계정 3개는 여섯 출력 출처를 모두, 1개는 `bank/arithmetic/library/conceptBlank`를 보유했다. 따라서 현재 계정의 접근 손실은 없고 export 단독 호환 예외는 필요하지 않다. 별도 예외를 남기지 않았으며, export 단독 입력은 저장 형식으로 읽을 수 있어도 출력 권한은 주지 않는 시험으로 고정했다. [집계 근거](../../../../.qa-artifacts/export-per-menu-20261019/db-audit-counts.json)는 숫자와 메뉴 조합만 보관한다.

최종 검증 결과는 다음과 같다.

| 검사 | 최종 결과 |
| --- | --- |
| 관련 시험, `npm run test -- … --maxWorkers=2` | **81개 파일 / 1,262개 시험 통과**, 종료 0 |
| 출력 API 파일 전수 관문 시험 | 실제 파일에서 모은 45개 메서드·경로에 여섯 출처 허용, 무메뉴·export 단독·승인 대기 거절 |
| 기존 경로·메뉴·proxy·학생 관문·DB CHECK 계약 시험 | 위 81개 파일에 포함, 통과 |
| `npm run type-check` | 통과, 종료 0 |
| 변경 코드 40개 파일 `eslint --max-warnings=0` | 오류 0 / 경고 0, 종료 0 |
| `npm run lint:affordance` | 통과, 종료 0 |
| `git diff --check` | 통과 |
| production의 직접 `can("export")`·`menus.includes("export")`·권한 Set 검사 재검색 | 남은 검사 없음 |

시험에는 실제 PDF/HWPX 처리기 호출(인증 메뉴 검사 유지, 생성기만 mock), 내 양식의 네 메서드, 자료 종류별 읽기·저장·사본 제한, export 체크 칸 부재·숨겨진 값 보존·메뉴 수 집계, 권한 회수 중 가져오기 중단을 포함했다. 연산의 수동 저장·재생성·단계 왕복과 기존 영어 출력 관문도 확인했다. 오류 기록 시험의 옛 «bank만 있으면 출력 거절» 가정은 무메뉴 계정으로 수정하고, 여섯 출처의 proxy 통과도 추가했다.

기존 연산 재생성 시험은 무작위 seed가 정상적인 «자리 교환» 분기를 고르면 «숫자 변경» 문구를 기대한 단언이 간헐적으로 실패했다. 검증하려는 숫자 변경 분기에 맞춰 시험의 UUID seed를 고정했으며, 제품 생성·재생성 로직은 수정하지 않았다.

추가로 실행한 **전체 `npm run lint`는 실패**했다. 관측 결과는 오류 275개·경고 85개였고, 오류 275개는 모두 이번에 변경하지 않은 21개 파일에서 나왔다. 이번 변경의 미사용 인자 경고 1개는 제거한 뒤 변경 코드 40개 파일을 경고 없이 통과시켰다. 저장소 전체 lint가 통과했다고 보고하지 않는다. 전체 파일 Prettier 추가 검사에서도 기존 `UnifiedWorkspace`의 JSX 들여쓰기 불일치를 확인했으며, 이 작업에서 전체 파일을 재서식하지 않았다.

브라우저는 실제 `UnifiedWorkspace`와 연산 컴포넌트, 로컬 예시 생성기를 사용했다. 클라이언트 권한 스냅샷은 `menus: ["arithmetic"]`로 바꾸고 모든 외부 계정 API 요청은 차단했다. 공유 DB 주소 대신 연결 불가능한 로컬 DB 주소로 개발 서버를 실행했으며, 실제 API 네트워크 요청은 0건이었다.

| 브라우저 확인 | 1280×1000 | 390×844 |
| --- | --- | --- |
| 연산 생성 → 검토 → 3단계 | 통과 | 통과 |
| 인쇄·PDF·HWPX 버튼 활성화 | 통과 | 통과 |
| 인쇄 호출 / PDF 내려받기 | 1회 / 통과 | 1회 / 통과 |
| 메뉴 회수 후 출력 접근 차단 | 통과 | 통과 |
| 문서 가로 넘침 / 페이지 오류 | 0 / 0 | 0 / 0 |

[넓은 화면](../../../../.qa-artifacts/export-per-menu-20261019/arithmetic-output-1280.png), [휴대폰 화면](../../../../.qa-artifacts/export-per-menu-20261019/arithmetic-output-390.png), [브라우저 결과](../../../../.qa-artifacts/export-per-menu-20261019/browser-results.json)를 확인했다. 인쇄 호출은 `window.print` 탐침으로, PDF 내려받기는 Chromium이 만든 PDF를 반환하는 고정 API 응답으로 검증했다. 실계정 인증으로 공유 DB에 쓰거나 운영 PDF 생성기를 끝까지 호출한 검증, 실물 인쇄를 뜻하지 않는다. 출력 생성기와 인쇄 CSS는 이번 변경 대상이 아니다.

심볼릭 링크를 지원하도록 QA 때만 `turbopack.root`를 공통 상위 경로로 설정했고 개발 서버 종료 후 `next.config.ts`를 원문과 대조해 복원했다. 처음 시도한 webpack 개발 서버는 기존 연산 CSS의 global-only 선택자를 거절했으므로 기본 Turbopack에서 브라우저 확인을 수행했다. 해당 CSS는 수정하지 않았다.

Orca Codex 작업은 아래와 같이 나눴고 결과를 현재 작업 브랜치에 파일 단위로 통합했다.

| 작업 | 결과·근거 | 남긴 상태 |
| --- | --- | --- |
| 관리 메뉴 선택·집계 | 완료, 작업자 관련 시험 75개 및 최종 통합 시험 통과 | `export-menu-admin` 파일 보존, 작업자 종료 |
| 화면·페이지 출력 판정 | 완료, 작업자 관련 시험 213개 및 최종 통합 시험 통과 | `export-menu-screen` 파일 보존, 작업자 종료 |
| 공통 계약·서버·DB 감사·통합 검증 | 완료, 위 81개 파일·타입·변경 범위 lint·브라우저 근거 | 현재 브랜치에 미커밋 |

커밋 금지 지시에 따라 main 커밋 병합·push를 하지 않았다. 두 작업자 Dispatch는 정상 완료 후 release했고 실행 중인 작업자는 없다. 작업자 워크트리는 아직 main 병합·clean 조건을 충족하지 않아 삭제하지 않았다.

공유 DB 쓰기·스키마 변경·마이그레이션·`prisma generate`·커밋은 실행하지 않았다. `node_modules`는 원래의 `/Users/pss/Desktop/creative/today_/node_modules` 심볼릭 링크 그대로이며 스테이징하지 않았다. Git 인덱스는 비어 있고, 처음부터 있던 미추적 지시서 파일도 보존했다.

검증 로그와 실행 대상 목록은 `.qa-artifacts/export-per-menu-20261019/`에 보관한다. 이 디렉터리는 기존 `.gitignore` 대상이며, 최종 시험 로그는 `tests.log`, 변경 범위 lint는 `eslint-changed.log`, 타입 검사는 `type-check.log`, affordance 검사는 `affordance.log`, 전체 lint의 기존 오류는 `eslint-repository.log`다. 운영 빌드·배포는 수행하지 않았다.

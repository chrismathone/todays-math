# me-ops — 409 까닭 구분과 교사 학습 설정 감사 기록

## 범위와 조사

계획 27 §4 공백 5·6 및 `tracks/briefs/me-ops.md`를 따랐다. DB 스키마·마이그레이션·학생 화면·학습 payload는 변경하지 않는다. 교사 대시보드에서는 기존 충돌 안내를 선택하는 조건만 고친다.

409를 직접 반환하거나 전달하는 다섯 파일을 먼저 전수 확인했다.

| 파일                       | 기존 경로                                                                     | 처리                                       |
| -------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| `serverStore.ts`           | `expectedRevision` 불일치, 원자적 저장 재시도 5회 소진                        | 판번호 충돌 두 곳                          |
| `serverRoutes.ts`          | `SrsConflict`를 409로 변환                                                    | 예외의 오류 코드 전달                      |
| `courseRoutes.ts`          | `CourseConflict`를 409로 변환, 나머지는 위 처리기로 위임                      | 임무 가드 유지, 판번호 충돌 전달           |
| `courseTeacherRoutes.ts`   | 설정 전이·저장 예외를 위 처리기로 위임                                        | 같은 구분 적용                             |
| `math-explorers/routes.ts` | 요청 학생 불일치 직접 응답, `ExplorerActionConflict` 변환, `SrsConflict` 위임 | 신원·임무·요청 가드 유지, 판번호 충돌 전달 |

그 경로에 연결된 충돌 생성 지점은 총 **40곳**이다. `serverStore` 2, `serverState` 4, `courseAutomation` 8, `replay` 1, `math-explorers/routes` 2, `engine` 4, `expedition` 13, `expeditionStart` 3, `supplement` 2, `workshop` 1이다. 별도로 탐험 라우트의 학생 불일치 직접 409 응답이 한 곳 있다.

## 409 갈래 — 앞과 뒤

HTTP 상태 409와 서버의 한국어 메시지는 모두 유지한다. 기존 공통 계약에 이미 있는 두 오류 코드만 사용한다.

| 까닭                                                                                                    | 앞         | 뒤                  |
| ------------------------------------------------------------------------------------------------------- | ---------- | ------------------- |
| 요청의 판번호가 현재 판번호와 다름                                                                      | `CONFLICT` | `REVISION_MISMATCH` |
| 경쟁 저장 때문에 5회 재시도 후에도 저장 못 함                                                           | `CONFLICT` | `REVISION_MISMATCH` |
| 중등 미션 없음·문제 순서 변경·제출 답 변경·아직 오답 복습 불가                                          | `CONFLICT` | `CONFLICT`          |
| 초등 진행 중 시작 소단원 변경·학습/문제 없음·순서 변경·제출 전 해설·오답 재제출/순서·진도판 재풀이 가드 | `CONFLICT` | `CONFLICT`          |
| 탐험의 완료/진행 중 임무·다른 학습 쓰기·목표 변경·이어 풀 원본 없음·다음 과정 불일치                    | `CONFLICT` | `CONFLICT`          |
| 개념 조각/공방/보충 카드의 현재 단계 불일치·미션 중 보충 시작                                           | `CONFLICT` | `CONFLICT`          |
| 동일 요청 번호에 다른 동작·답을 보냄                                                                    | `CONFLICT` | `CONFLICT`          |
| 요청의 학생과 현재 로그인 학생 불일치                                                                   | `CONFLICT` | `CONFLICT`          |

교사 대시보드의 기존 «다른 곳에서 기록이 변경되었습니다…» 안내와 입력 유지·최신 기록 불러오기는 `REVISION_MISMATCH`에만 적용한다. 임무 가드는 기존 오류 표시 자리에서 서버 메시지를 그대로 보여 주고 설정 입력을 잠그지 않는다. 학생 UI·CSS·배치·색·크기와 사용자 문구는 바꾸지 않는다.

## 감사 기록 꼴

`AccountAuditLog`의 기존 `actorId`, `action`, `outcome`, `details`, `createdAt`으로 충분하다. 학생은 `User`가 아니므로 `userId` 외래 키에 학생 ID를 넣지 않는다.

- `actorId`: 승인된 쓰기를 수행한 교사 계정 ID.
- `action`: `math_srs.course_plan_changed`.
- `outcome`: `success`.
- `createdAt`: DB의 기존 현재 시각 기본값.
- `details.studentId`, `details.revision`: 대상 학생과 저장 성공 판번호.
- 실제 달라진 설정만 `beforeStartSectionId` / `afterStartSectionId`, `beforeDailyQuestionCount` / `afterDailyQuestionCount`, `beforeEnabled` / `afterEnabled` 쌍으로 기록한다. 첫 설정의 이전 값은 `null`이다.

학생 이름·문항·답안·전체 학습 payload는 기록하지 않는다. 설정이 같으면 저장과 감사 기록을 생략해 기존 `configuredAt`과 판번호도 유지한다. 감사 쓰기는 원자적 학습 저장이 성공한 뒤 한 번 수행한다. 권한 거절·임무 가드·낡은 판번호·경쟁에서 진 저장에는 감사 기록이 없다. 감사 저장 실패는 기존 `recordAudit`의 best-effort 관례로 처리해 학습 저장 성공을 유지한다.

## 검증

TDD 순서로 제품 코드보다 시험을 먼저 고쳤다. 수정 전 첫 6개 파일에서 **99개 중 10개 실패**를 확인했다. 실패는 판번호 오류 코드 누락, 클라이언트 코드 누락, 임무 가드에도 충돌 안내 표시, 감사 기록 없음, 무변경 저장의 판번호 증가였다.

제품 코드 수정 뒤 다음 7개 파일의 **131개 시험이 모두 통과**했다(63.36초).

```powershell
npx vitest run src/__tests__/api/mathSrsCourseRoutes.test.ts src/__tests__/api/mathExplorersRoutes.test.ts src/__tests__/api/mathSrsRoutes.test.ts src/__tests__/unit/mathSrsServer.test.ts src/__tests__/unit/mathSrsCourseServer.test.ts src/__tests__/unit/courseSrsClientApi.test.ts src/__tests__/components/CourseDashboard.test.tsx --pool=threads --maxWorkers=1
```

확인한 경계는 판번호 불일치·저장 경쟁 재시도 소진·임무 가드·요청 번호 재사용·학생 불일치·정확한 중복 재시도와, 감사의 첫 설정·변경 칸만 기록·무변경·권한 거절·저장 경쟁 승자 한 줄·감사 DB 실패다. RTL은 판번호 충돌의 기존 안내·입력 유지·새 판번호 재시도, 임무 가드의 서버 메시지·입력 가능 상태를 확인한다.

- 변경한 TypeScript/TSX 12개 파일의 `npx eslint`: 통과.
- 변경 파일과 이 보고서의 `npx prettier --check`: 통과.
- `npm run lint:affordance`: 통과.
- `git diff --check`: 통과.

모든 무거운 검사는 공용 `cb-verify.lock`을 획득한 뒤 단독으로 수행했고 종료 후 해제했다. `npm install`·`npx prisma generate`·전체 타입 검사·Playwright는 실행하지 않았다.

## 한계와 남은 일

- 감사 기록은 best effort이므로 감사 DB 오류나 학습 저장 직후 프로세스 중단 시 로그가 누락될 수 있다. 별도 표·트랜잭션 요구를 추가하지 않는다.
- 전체 `npm run type-check`는 지시대로 실행하지 않는다. 리드가 병합 후 main에서 수행한다.
- 이 가지에만 커밋하며 main 병합·푸시·배포는 리드에게 남긴다.

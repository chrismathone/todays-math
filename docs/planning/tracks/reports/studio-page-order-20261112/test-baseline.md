# 전체 시험 실패의 main 대조

전체 실행은 `npx vitest run --maxWorkers=3` **한 번**, 951.73초. **1,740파일 통과 / 65 실패 / 33 건너뜀**, **43,212시험 통과 / 57 실패 / 1,030 건너뜀**, 처리되지 않은 오류 1건이다. 전체 통과로 보고하지 않는다.

65개 실패 파일을 모두 깨끗한 main `78eedb0ed`에서 11개 묶음으로 다시 실행했다(각 `--maxWorkers=3`). main의 같은 Vitest 설정을 쓰되 환경 파일의 값을 주입하지 않고 DB 주소를 연결 불가능한 localhost로 고정한 임시 설정을 썼다. 교재 시험의 DB는 PGlite 메모리 DB다. main 코드는 수정하지 않았고 검증 후에도 작업트리가 깨끗했다. 이 작업 가지의 시작점과 main의 소스 차이는 없었으며 둘의 차이는 디자인/지시서 문서 2개였다.

- **17파일은 main에서도 실패**, **48파일은 main에서 통과**했다. 목록은 아래와 [JSON](test-baseline.json)에 있다.
- main 재현: 도형 모델 기대값, 학생 auth 호출 허용 목록, 학습 현황 mock 누락, 개념 원본 해시, 불완전 AI 응답 복구, 초5 문항 정답, 영어/quick/학습 기록 경계, 오류 기록 route 목록, 기출 입력 경로 목록, 학습 현황 재인가 응답, 모델 포트 원문, rmSync 가드, 학생 proxy 허용 목록, SRS 일과 흐름. `CurriculumGraphPanel`의 `getLearningInsightV2` mock 누락은 처리되지 않은 오류 1건도 재현한다.
- `problemActualFormatReader`는 이 가지에서는 AppleDouble 때문에 setup이 막혔고 main에서는 기존 release fingerprint 불일치가 드러났다. **같은 단언 실패라고 합치지 않는다.**
- 외장 SSD 환경 차이: `prisma/migrations/._20260813014714_init/migration.sql`의 ENOTDIR가 교재/은행/마이그레이션 setup을 막는다. 파일 magic `00051607`도 확인했다. 시험 glob 자체는 `**/._*`를 제외하지만 helper의 파일 나열은 제외하지 않는다. 기출 그림 해시와 사운드/시험 목록에도 `._` 항목이 추가돼 비교가 실패한다. HWPX writer의 서식 나열도 같은 외장 SSD 제약이 시험 머리말에 명시돼 있으며 main에서는 통과했다. GZip HWPX HTTP 시험은 이 가지에서 20초 제한, main에서는 817ms로 통과했다.
- 이번 범위와 관계없는 시험/구현/콘텐츠를 고치거나 공유 DB를 만져 초록으로 만들지 않았다. 위 환경 차이를 제품 회귀와 구분한다.

변경 모듈 검증은 별도로 통과했다: 최종 통합·헤더·PaperStrip·쪽 순서 화면 **5파일 41시험**, 모델/판정/미리보기 **94시험**, private 저장·기존 호출자 시험. 최종 `npm run type-check`, 변경 파일 ESLint, `npm run lint:affordance`, `git diff --check` 통과. 전체 실행 중 발견해 RED→GREEN으로 보완한 복귀/옛 저장본 두 경계는 이후 위 41시험과 타입 검사로 다시 확인했다.

| 전체 실행에서 실패한 파일 | main 대조 |
|---|---|
| `src/__tests__/api/studentSessionSweep.test.ts` | 실패 |
| `src/__tests__/api/studioAiFigureEdit.test.ts` | 실패 |
| `src/__tests__/api/textbookQuickCreateIntegration.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/api/textbookRouteWalk.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/api/textbookRoutes.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/components/CurriculumGraphPanel.test.tsx` | 실패 |
| `src/__tests__/integration/sourceMaterialMigration.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookAdminUsability.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookCapture.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookConceptForms.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookDraft.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookFrozenSources.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookManagedOperations.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookOperationalScope.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookPublish.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookPublishArtifacts.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookRealValidator.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookRegisterAndRefs.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookReplayScope.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookSectionPreview.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookTeacherFlows.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/lib/textbookVisualLibrary.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/bankHeldSourceSql.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/bankReadFingerprint.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/bankReadRevision.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/conceptSentenceFixes.test.ts` | 실패 |
| `src/__tests__/unit/devAiResponseValidation.test.ts` | 실패 |
| `src/__tests__/unit/elemTiersG5.test.ts` | 실패 |
| `src/__tests__/unit/englishFence.test.ts` | 실패 |
| `src/__tests__/unit/englishSchemaVersionDraft.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/errorLogRouteCoverage.test.ts` | 실패 |
| `src/__tests__/unit/examDecisionCorpus.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/examDecisionRules.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/examReportMigration.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/examWiringAudit.test.ts` | 실패 |
| `src/__tests__/unit/figureSlotsHwpx.test.tsx` | 통과 · 환경 차이 |
| `src/__tests__/unit/hwpxEquationHeight.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/hwpxExport.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/hwpxGridRows.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/hwpxHancomLayout.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/hwpxReviewFindings.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/learningSoundAssets.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/mathInsightV2Access.test.ts` | 실패 |
| `src/__tests__/unit/mathOntologyModelPort.test.ts` | 실패 |
| `src/__tests__/unit/mathSrsQuickFence.test.ts` | 실패 |
| `src/__tests__/unit/mathSrsRecordIsolation.test.ts` | 실패 |
| `src/__tests__/unit/mathgenEngineHttp.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/mutateHarnessWideList.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/noRmSync.test.ts` | 실패 |
| `src/__tests__/unit/problemActualFormatMigration.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/problemActualFormatReader.test.ts` | 실패 |
| `src/__tests__/unit/proxyStudentGate.test.ts` | 실패 |
| `src/__tests__/unit/srsStoredContractWalk.test.ts` | 실패 |
| `src/__tests__/unit/textbookDdlLifecycle.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookDdlPublish.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookDdlReferences.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookDialogueUnitPasses.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookFrozenBlank.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookQuickCreate.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookQuickCreateAvailability.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookRecoveryWriter.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookSqlStatements.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookStudentAttemptsSql.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookStudentConceptVideo.test.ts` | 통과 · 환경 차이 |
| `src/__tests__/unit/textbookTeacherBlank.test.ts` | 통과 · 환경 차이 |

-- 2026-10-01 원장님 «선생님 승인이 안 됨» — 계정 승인 · 메뉴 저장이 500(23514 user_disabled_menus_valid).
--
-- 메뉴를 코드에만 더하고(«오늘의 개념» D-124 · «오늘의 기억 · SRS» · «오늘의 영어» D-148 · «개념 백지» D-150)
-- 이 CHECK 는 9월 14일의 여섯 개 그대로였다. 새 메뉴를 하나라도 끄고 저장하면 «꺼 둔 메뉴»가 목록 밖이라 거절됐다.
-- 목록을 지금 코드의 메뉴 열 개(`src/contracts/accountAccess.contract.ts` WORKSPACE_MENUS)로 넓힌다.
-- 🔴 넓히기만 한다 — 지금 저장된 값(운영 0건)은 새 목록 안이라 기존 행이 깨지지 않는다.
-- 메뉴를 더할 때 이 목록도 같이 고친다 — `src/__tests__/unit/workspaceMenuConstraint.test.ts` 가 막는다.

ALTER TABLE "user" DROP CONSTRAINT "user_disabled_menus_valid";

ALTER TABLE "user" ADD CONSTRAINT "user_disabled_menus_valid"
  CHECK ("disabled_menus" <@ ARRAY['home','bank','studio','export','library','teaching','concept','conceptBlank','srs','english']::TEXT[]);

-- 메뉴 CHECK 넓히기 — «교재 제작»(textbook)과 오늘의 영어 세 메뉴
--
-- `user.disabled_menus`(꺼 둔 메뉴)는 `user_disabled_menus_valid` 의 목록 안이어야 한다. 메뉴를 코드에만 더하면
-- 그 메뉴를 끄고 저장하는 순간 23514 로 500 이다(2026-10-01 «선생님 승인이 안 됨»의 원인).
-- 코드(`src/contracts/accountAccess.contract.ts` WORKSPACE_MENUS)는 이미 영어를 셋으로 가르고
-- (`english-school` · `english-maker` · `english-library`) 이번에 `textbook` 을 더한다.
--
-- 🔴 넓히기만 한다. 옛 통합 키 `english` 는 **남긴다** — 이미 저장된 행이 그 값을 갖고 있을 수 있고,
--    코드는 읽을 때 셋으로 펴서 쓴다(`normalizeWorkspaceMenus`). 빼면 그 행의 다음 UPDATE 가 전부 거절된다.
-- 기존 행은 새 목록 안이라 깨지지 않는다(목록에서 뺀 값이 없다).
--
-- `english-listening` 은 origin/main(2026-10-03 «영어듣기»)의 메뉴다. 그쪽 마이그레이션은 이 제약을 넓히지 않았고,
-- 이 파일이 이름 순서로 그 뒤에 적용돼 목록을 통째로 갈아 끼운다 — 여기서 빼면 그 메뉴를 끄는 저장이 23514 로 막힌다.
-- 이 목록은 «코드가 아는 메뉴 전부 + 옛 통합 키»의 **위 집합**이다. 메뉴를 더하면 여기(또는 뒤의 마이그레이션)도 넓힌다.

ALTER TABLE "user" DROP CONSTRAINT "user_disabled_menus_valid";

ALTER TABLE "user" ADD CONSTRAINT "user_disabled_menus_valid"
  CHECK ("disabled_menus" <@ ARRAY['home','bank','studio','export','library','textbook','teaching','concept','conceptBlank','srs','english','english-school','english-maker','english-library','english-listening']::TEXT[]);

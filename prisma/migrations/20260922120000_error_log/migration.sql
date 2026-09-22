-- ⚠️ 미적용 초안 — 원장님 확인 전 적용 금지 (결정 번호는 메인이 병합 때 붙인다)
--
-- 오류 기록 표 — 사용자의 요청이 거절(4xx)·실패(5xx·예외)했을 때와 브라우저 쪽 오류를 한 줄씩 남긴다.
-- 원장님 2026-09-22: 새 표(감사 기록 표에 섞지 않는다) · 전부 수집 · AI 도형 재작도 실패 때 크롭 이미지(상한 2MB)
-- · 90일 보관(매일 지운다) · 화면 없음(조회 스크립트 scripts/logs/recent-errors.ts).
-- 브리프: docs/planning/tracks/briefs/error-log-collector.md · 계약: src/contracts/errorLog.contract.ts
-- 쓰는 곳: src/lib/errorLog/record.ts (best effort — 표가 없어도 요청을 깨지 않는다)
--
-- 윗부분은 `prisma migrate diff --from-schema-datamodel <HEAD f63bd388 의 schema> --to-schema-datamodel
-- prisma/schema.prisma --script`(DB 없이 스키마끼리 — DATABASE_URL·DIRECT_URL 은 닿지 않는 127.0.0.1:1)의
-- 산출을 **그대로** 실었다. Prisma 가 표현 못 하는 것은 맨 아래 «손으로 더한 것» 절에 붙였다.
--
-- 🔴 **기존 표를 안 건드린다** — 새 표 둘과 그 색인·FK 뿐. `user` 에는 칸이 늘지 않는다(관계는 error_log 쪽 FK).
-- 🔴 `prisma migrate dev` · `migrate deploy` · `db push` · `migrate reset` 은 이 파일을 공유 DB 에 적용한다
--    (다른 트랙이 남긴 미적용 마이그레이션까지 같이). 적용은 메인이 원장님께 여쭌 뒤
--    scripts/qa/apply-error-log-migration.ts 로 **이 마이그레이션 하나만**, 드라이런 먼저.
-- 🔴 순서는 DB 먼저 · 코드 나중(24번 문서 §6.1)을 따르되, 이 표는 **코드가 먼저 나가도 요청이 깨지지 않는다** —
--    쓰기가 실패를 삼키고(서버 기록에 한 줄), 읽는 화면이 없다. 표가 생기는 순간부터 쌓인다.

-- CreateTable
CREATE TABLE "error_log" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(10) NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "route" VARCHAR(300),
    "method" VARCHAR(10),
    "status" INTEGER,
    "action" VARCHAR(60),
    "message" TEXT,
    "detail" TEXT,
    "context" JSONB NOT NULL DEFAULT '{}',
    "user_id" UUID,
    "release" VARCHAR(64),
    "request_id" VARCHAR(200),
    "duration_ms" INTEGER,

    CONSTRAINT "error_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "error_log_image" (
    "error_log_id" UUID NOT NULL,
    "mime_type" VARCHAR(40) NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,

    CONSTRAINT "error_log_image_pkey" PRIMARY KEY ("error_log_id")
);

-- CreateIndex
CREATE INDEX "error_log_created_at_idx" ON "error_log"("created_at" DESC);

-- CreateIndex
CREATE INDEX "error_log_route_created_at_idx" ON "error_log"("route", "created_at" DESC);

-- CreateIndex
CREATE INDEX "error_log_action_created_at_idx" ON "error_log"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "error_log_user_id_created_at_idx" ON "error_log"("user_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "error_log" ADD CONSTRAINT "error_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "error_log_image" ADD CONSTRAINT "error_log_image_error_log_id_fkey" FOREIGN KEY ("error_log_id") REFERENCES "error_log"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── 손으로 더한 것 (Prisma 가 표현 못 함) ────────────────────────────────

-- 새 표는 RLS 를 켠다 — 이 저장소의 관례(account_audit_log · concept_lecture · student_account …).
-- 정책이 없으므로 Supabase 공개 API(anon)로는 못 읽는다. 앱은 Prisma(DB 직결)로 읽고 쓴다.
-- 🔴 이 표에는 요청 경로·화면 문구·AI 응답 앞부분·크롭 이미지가 있다 — 공개 API 로 새면 안 된다.
ALTER TABLE "error_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "error_log_image" ENABLE ROW LEVEL SECURITY;

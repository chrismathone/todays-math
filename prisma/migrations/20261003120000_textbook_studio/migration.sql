-- 교재 제작 — 전용 표 20개 · 불변 트리거 · RLS
-- 계획 60a508c0 · P1 계약 e94aedb8 (docs/planning/textbook-studio-p1-contracts-20261003.md «저장·발행 경계»)
--
-- 전부 더하기다. 기존 표 · 기존 행 · 기존 제약을 건드리지 않는다(기존 표를 가리키는 FK 만 생긴다).
-- 🔴 `prisma migrate dev/deploy` · `db push` 로 적용하지 않는다 — 적용기는
--    `scripts/qa/apply-textbook-studio-migration.ts`(드라이런이 기본)다.
--
-- 불변식을 지키는 것은 앱이 아니라 DB 다:
--   · 발행 · 종료 판본과 그 자식(구획 · 배치 · 개념 · 자산 색인 · 산출물)은 못 고친다
--   · 판본의 자식을 쓰면 **같은 문장에서** 판본 집계 revision 이 오른다(앱이 잊을 수 없다)
--   · 문항 확정본 · 바이트 · QR 대상 · 보관본은 만든 뒤로 안 바뀐다
--   · 자식은 같은 판본 · 같은 주인의 행만 가리킨다(복합 FK)

-- ─────────────────────────────────────────────
-- ① 책
-- ─────────────────────────────────────────────
CREATE TABLE "textbook" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "school_level" VARCHAR(12) NOT NULL,
  "grade" SMALLINT NOT NULL,
  "semester" SMALLINT NOT NULL,
  "volume" SMALLINT NOT NULL,
  "volume_count" SMALLINT NOT NULL,
  "display_code" VARCHAR(40) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "visibility" VARCHAR(20) NOT NULL DEFAULT 'private',
  "shared_branch_id" UUID,
  "archived_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "textbook_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_shared_branch_id_fkey" FOREIGN KEY ("shared_branch_id") REFERENCES "branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_school_level_check" CHECK ("school_level" IN ('elementary', 'middle', 'high')),
  CONSTRAINT "textbook_grade_check" CHECK ("grade" BETWEEN 1 AND 6 AND ("school_level" = 'elementary' OR "grade" <= 3)),
  CONSTRAINT "textbook_semester_check" CHECK ("semester" IN (1, 2)),
  CONSTRAINT "textbook_volume_check" CHECK ("volume" >= 1 AND "volume_count" >= "volume" AND "volume_count" <= 100),
  CONSTRAINT "textbook_visibility_check" CHECK (
    ("visibility" = 'private' AND "shared_branch_id" IS NULL)
    OR ("visibility" = 'branch' AND "shared_branch_id" IS NOT NULL)
  )
);
CREATE UNIQUE INDEX "textbook_id_user_id_key" ON "textbook"("id", "user_id");
CREATE INDEX "textbook_user_id_updated_at_idx" ON "textbook"("user_id", "updated_at");
CREATE INDEX "textbook_shared_branch_id_visibility_idx" ON "textbook"("shared_branch_id", "visibility");

-- ─────────────────────────────────────────────
-- ② 판본 — 초안이거나 발행본이다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_edition" (
  "id" UUID NOT NULL,
  "textbook_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "ordinal" INTEGER NOT NULL,
  "label" VARCHAR(40) NOT NULL,
  "status" VARCHAR(12) NOT NULL DEFAULT 'draft',
  "schema_version" VARCHAR(40) NOT NULL,
  "c14n_version" VARCHAR(40) NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "structure_revision" INTEGER NOT NULL DEFAULT 1,
  "config" JSONB NOT NULL,
  "outline" JSONB NOT NULL,
  "renderer_version" VARCHAR(80) NOT NULL,
  "template_version" VARCHAR(80) NOT NULL,
  "derived_from_edition_id" UUID,
  "manifest_hash" CHAR(64),
  "published_at" TIMESTAMP(3),
  "retired_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "textbook_edition_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_edition_textbook_id_user_id_fkey" FOREIGN KEY ("textbook_id", "user_id") REFERENCES "textbook"("id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_edition_derived_from_edition_id_fkey" FOREIGN KEY ("derived_from_edition_id") REFERENCES "textbook_edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_edition_ordinal_check" CHECK ("ordinal" >= 1),
  CONSTRAINT "textbook_edition_status_check" CHECK ("status" IN ('draft', 'published', 'retired')),
  CONSTRAINT "textbook_edition_schema_version_check" CHECK ("schema_version" = 'injaewon.textbook.exchange.v1'),
  CONSTRAINT "textbook_edition_c14n_version_check" CHECK ("c14n_version" = 'injaewon.textbook.c14n.v1'),
  CONSTRAINT "textbook_edition_revision_check" CHECK ("revision" > 0 AND "structure_revision" > 0),
  CONSTRAINT "textbook_edition_config_object" CHECK (jsonb_typeof("config") = 'object'),
  CONSTRAINT "textbook_edition_outline_object" CHECK (jsonb_typeof("outline") = 'object' AND jsonb_typeof("outline" -> 'units') = 'array'),
  CONSTRAINT "textbook_edition_manifest_hash_check" CHECK ("manifest_hash" IS NULL OR "manifest_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "textbook_edition_published_pair" CHECK (("status" = 'draft') = ("published_at" IS NULL)),
  CONSTRAINT "textbook_edition_manifest_pair" CHECK (("status" = 'draft') = ("manifest_hash" IS NULL)),
  CONSTRAINT "textbook_edition_retired_pair" CHECK (("status" = 'retired') = ("retired_at" IS NOT NULL))
);
CREATE UNIQUE INDEX "textbook_edition_textbook_id_ordinal_key" ON "textbook_edition"("textbook_id", "ordinal");
CREATE UNIQUE INDEX "textbook_edition_id_user_id_key" ON "textbook_edition"("id", "user_id");
-- 책마다 살아 있는 초안은 하나다
CREATE UNIQUE INDEX "textbook_edition_one_draft" ON "textbook_edition"("textbook_id") WHERE "status" = 'draft';
CREATE INDEX "textbook_edition_user_id_status_idx" ON "textbook_edition"("user_id", "status");

-- ─────────────────────────────────────────────
-- ③ 구획 — 원고 블록. 구획마다 CAS. 열쇠는 (단원, 구획) 안에서만 유일하다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_section" (
  "id" UUID NOT NULL,
  "edition_id" UUID NOT NULL,
  "unit_key" VARCHAR(80) NOT NULL,
  "section_key" VARCHAR(80) NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "title" VARCHAR(120) NOT NULL,
  "template_key" VARCHAR(160) NOT NULL,
  "start_policy" VARCHAR(12) NOT NULL,
  "content" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "textbook_section_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_section_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "textbook_edition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_section_start_policy_check" CHECK ("start_policy" IN ('even-left', 'continue')),
  CONSTRAINT "textbook_section_content_blocks" CHECK (jsonb_typeof("content") = 'object' AND jsonb_typeof("content" -> 'blocks') = 'array'),
  CONSTRAINT "textbook_section_revision_check" CHECK ("revision" > 0),
  CONSTRAINT "textbook_section_order_index_check" CHECK ("order_index" >= 0)
);
CREATE UNIQUE INDEX "textbook_section_edition_id_unit_key_section_key_key" ON "textbook_section"("edition_id", "unit_key", "section_key");
CREATE UNIQUE INDEX "textbook_section_edition_id_id_key" ON "textbook_section"("edition_id", "id");

-- ─────────────────────────────────────────────
-- ④ 문항 확정본 — INSERT 뒤로 불변. 주인마다 따로 둔다(영상 연결이 여기에 붙는다)
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_problem_snapshot" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "source_system" VARCHAR(16) NOT NULL,
  "source_key" VARCHAR(200) NOT NULL,
  "source_ref" JSONB NOT NULL,
  "problem_id" UUID,
  "source_updated_at" TIMESTAMP(3),
  "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unit_id" UUID,
  "family_key" TEXT,
  "difficulty" VARCHAR(40),
  "problem_type" VARCHAR(100),
  "payload" JSONB NOT NULL,
  "raw_source" JSONB NOT NULL,
  "source_metadata" JSONB NOT NULL,
  "content_hash" CHAR(64) NOT NULL,
  "snapshot_hash" CHAR(64) NOT NULL,
  "c14n_version" VARCHAR(40) NOT NULL,

  CONSTRAINT "textbook_problem_snapshot_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_problem_snapshot_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- 원본 문항이 지워지면 이 칸만 빈다. 불변 정체는 source_ref 에 남는다
  CONSTRAINT "textbook_problem_snapshot_problem_id_fkey" FOREIGN KEY ("problem_id") REFERENCES "problem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "textbook_problem_snapshot_source_system_check" CHECK ("source_system" IN ('todays-math', 'legacy-studio', 'studio-authored')),
  -- COALESCE: 열쇠가 빠진 source_ref 가 NULL 로 CHECK 를 통과하지 못하게
  CONSTRAINT "textbook_problem_snapshot_source_identity" CHECK (COALESCE(
    jsonb_typeof("source_ref") = 'object'
    AND ("source_ref" ->> 'system') = "source_system"
    AND (
      ("source_system" = 'todays-math'
        AND "source_key" = 'tm:' || ("source_ref" ->> 'problemId')
        AND length("source_ref" ->> 'problemCode') > 0)
      OR ("source_system" = 'legacy-studio' AND "source_key" = 'legacy:' || ("source_ref" ->> 'legacyId'))
      OR ("source_system" = 'studio-authored' AND "source_key" = 'studio:' || ("source_ref" ->> 'localId'))
    ), FALSE)),
  -- 살아 있는 문항을 가리키면 그 id 는 불변 정체와 같아야 한다
  CONSTRAINT "textbook_problem_snapshot_problem_identity" CHECK (
    "problem_id" IS NULL
    OR COALESCE("source_system" = 'todays-math' AND "problem_id"::text = ("source_ref" ->> 'problemId'), FALSE)
  ),
  CONSTRAINT "textbook_problem_snapshot_payload_object" CHECK (jsonb_typeof("payload") = 'object'),
  CONSTRAINT "textbook_problem_snapshot_raw_source_object" CHECK (jsonb_typeof("raw_source") = 'object'),
  CONSTRAINT "textbook_problem_snapshot_source_metadata_object" CHECK (jsonb_typeof("source_metadata") = 'object'),
  CONSTRAINT "textbook_problem_snapshot_hash_check" CHECK ("content_hash" ~ '^[a-f0-9]{64}$' AND "snapshot_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "textbook_problem_snapshot_c14n_version_check" CHECK ("c14n_version" = 'injaewon.textbook.c14n.v1')
);
-- 같은 payload 에서 출처 · 메타데이터만 바뀐 새 캡처를 가른다
CREATE UNIQUE INDEX "textbook_problem_snapshot_user_id_source_key_snapshot_hash_key" ON "textbook_problem_snapshot"("user_id", "source_key", "snapshot_hash");
CREATE UNIQUE INDEX "textbook_problem_snapshot_id_user_id_key" ON "textbook_problem_snapshot"("id", "user_id");
CREATE INDEX "textbook_problem_snapshot_problem_id_idx" ON "textbook_problem_snapshot"("problem_id");

-- ─────────────────────────────────────────────
-- ⑤ 배치 — 판본 속 문항 한 자리. 같은 문항을 두 번 실으면 두 줄이다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_item" (
  "id" UUID NOT NULL,
  "edition_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "snapshot_id" UUID NOT NULL,
  "link_status" VARCHAR(12) NOT NULL,
  "link_candidates" JSONB NOT NULL DEFAULT '[]',
  "source_test_id" UUID,
  "source_test_problem_id" UUID,
  "unit_key" VARCHAR(80) NOT NULL,
  "section_id" UUID,
  "learning_stage" VARCHAR(20) NOT NULL,
  "order_index" INTEGER NOT NULL DEFAULT 0,
  "layout" JSONB NOT NULL,
  "video_required" BOOLEAN,
  "concept_keys" JSONB NOT NULL DEFAULT '[]',
  "derived_from_item_id" UUID,
  "display_number" VARCHAR(40),
  "physical_page_index" INTEGER,
  "printed_page_label" VARCHAR(40),
  "page_column" SMALLINT,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "textbook_item_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_item_edition_id_user_id_fkey" FOREIGN KEY ("edition_id", "user_id") REFERENCES "textbook_edition"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- 남의 확정본을 가리키지 못한다
  CONSTRAINT "textbook_item_snapshot_id_user_id_fkey" FOREIGN KEY ("snapshot_id", "user_id") REFERENCES "textbook_problem_snapshot"("id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- 다른 판본의 구획에 놓이지 못한다. section_id 가 NULL 이면 «담아 두기만 했다»
  CONSTRAINT "textbook_item_edition_id_section_id_fkey" FOREIGN KEY ("edition_id", "section_id") REFERENCES "textbook_section"("edition_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "textbook_item_link_status_check" CHECK ("link_status" IN ('unlinked', 'candidate', 'linked', 'needs-review')),
  CONSTRAINT "textbook_item_link_candidates_array" CHECK (jsonb_typeof("link_candidates") = 'array'),
  CONSTRAINT "textbook_item_learning_stage_check" CHECK ("learning_stage" IN (
    'preparation', 'worked-example', 'concept-check', 'basic', 'type-practice',
    'application', 'error-check', 'written', 'cumulative-review', 'unit-assessment'
  )),
  CONSTRAINT "textbook_item_layout_object" CHECK (jsonb_typeof("layout") = 'object'),
  CONSTRAINT "textbook_item_concept_keys_array" CHECK (jsonb_typeof("concept_keys") = 'array'),
  CONSTRAINT "textbook_item_order_index_check" CHECK ("order_index" >= 0),
  CONSTRAINT "textbook_item_page_column_check" CHECK ("page_column" IS NULL OR "page_column" IN (1, 2)),
  CONSTRAINT "textbook_item_physical_page_index_check" CHECK ("physical_page_index" IS NULL OR "physical_page_index" >= 1),
  CONSTRAINT "textbook_item_revision_check" CHECK ("revision" > 0)
);
CREATE UNIQUE INDEX "textbook_item_edition_id_id_key" ON "textbook_item"("edition_id", "id");
CREATE INDEX "textbook_item_edition_id_section_id_order_index_idx" ON "textbook_item"("edition_id", "section_id", "order_index");
CREATE INDEX "textbook_item_snapshot_id_idx" ON "textbook_item"("snapshot_id");

-- ─────────────────────────────────────────────
-- ⑥ 바이트 — 내용 해시가 열쇠. 형식(MIME)은 바이트가 아니라 손잡이가 정한다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_blob" (
  "sha256" CHAR(64) NOT NULL,
  "size" INTEGER NOT NULL,
  "bytes" BYTEA NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "textbook_blob_pkey" PRIMARY KEY ("sha256"),
  CONSTRAINT "textbook_blob_sha256_check" CHECK ("sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "textbook_blob_size_check" CHECK ("size" > 0 AND "size" <= 67108864 AND octet_length("bytes") = "size")
);
-- 구간 읽기(substring)가 압축을 풀지 않고 필요한 조각만 가져오게
ALTER TABLE "textbook_blob" ALTER COLUMN "bytes" SET STORAGE EXTERNAL;

-- ─────────────────────────────────────────────
-- ⑦⑧ 올리는 파일 — 1MB 조각. 다 오면 DB 가 이어 붙여 ⑥에 넣고(해시를 다시 계산한다) 조각을 지운다.
--    끝난 줄(completed_at)은 남는다 — 가져오기 · 자산 등록이 uploadId 로 그 바이트를 가리킨다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_upload" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "size" INTEGER,
  "file_name" VARCHAR(255),
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "textbook_upload_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_upload_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_upload_sha256_check" CHECK ("sha256" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "textbook_upload_size_check" CHECK ("size" IS NULL OR ("size" > 0 AND "size" <= 67108864)),
  -- 끝났다고 적으려면 크기가 있어야 한다(그 크기의 바이트가 ⑥에 있다)
  CONSTRAINT "textbook_upload_completed_size" CHECK ("completed_at" IS NULL OR "size" IS NOT NULL)
);
CREATE UNIQUE INDEX "textbook_upload_user_id_sha256_key" ON "textbook_upload"("user_id", "sha256");

CREATE TABLE "textbook_upload_chunk" (
  "upload_id" UUID NOT NULL,
  "byte_offset" INTEGER NOT NULL,
  "bytes" BYTEA NOT NULL,

  CONSTRAINT "textbook_upload_chunk_pkey" PRIMARY KEY ("upload_id", "byte_offset"),
  CONSTRAINT "textbook_upload_chunk_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "textbook_upload"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_upload_chunk_bytes_check" CHECK (octet_length("bytes") BETWEEN 1 AND 1048576),
  CONSTRAINT "textbook_upload_chunk_range_check" CHECK ("byte_offset" >= 0 AND "byte_offset" + octet_length("bytes") <= 67108864)
);

-- ─────────────────────────────────────────────
-- ⑨ 자산 — 주인이 가진 손잡이. assetId 는 내용 해시다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_asset" (
  "user_id" UUID NOT NULL,
  "id" CHAR(64) NOT NULL,
  "kind" VARCHAR(12) NOT NULL,
  "mime_type" VARCHAR(40) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "width_px" INTEGER,
  "height_px" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "textbook_asset_pkey" PRIMARY KEY ("user_id", "id"),
  CONSTRAINT "textbook_asset_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_asset_id_fkey" FOREIGN KEY ("id") REFERENCES "textbook_blob"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_asset_kind_check" CHECK ("kind" IN ('figure', 'image', 'portrait', 'font')),
  CONSTRAINT "textbook_asset_mime_type_check" CHECK ("mime_type" IN (
    'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'font/woff2', 'font/woff', 'font/ttf'
  )),
  -- 바이트에서 잰 값이다. 원본 행의 figureDims 는 ④ raw_source 에 따로 남는다
  CONSTRAINT "textbook_asset_dims_pair" CHECK (
    ("width_px" IS NULL AND "height_px" IS NULL)
    OR ("width_px" BETWEEN 1 AND 100000 AND "height_px" BETWEEN 1 AND 100000)
  )
);

-- ─────────────────────────────────────────────
-- ⑩ 판본이 가리키는 자산 — 읽기 범위의 색인(공유본을 여는 동료는 여기 있는 것만 읽는다)
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_edition_asset" (
  "edition_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "asset_id" CHAR(64) NOT NULL,

  CONSTRAINT "textbook_edition_asset_pkey" PRIMARY KEY ("edition_id", "asset_id"),
  CONSTRAINT "textbook_edition_asset_edition_id_user_id_fkey" FOREIGN KEY ("edition_id", "user_id") REFERENCES "textbook_edition"("id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE,
  -- 남의 자산을 판본에 걸지 못한다
  CONSTRAINT "textbook_edition_asset_user_id_asset_id_fkey" FOREIGN KEY ("user_id", "asset_id") REFERENCES "textbook_asset"("user_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "textbook_edition_asset_user_id_asset_id_idx" ON "textbook_edition_asset"("user_id", "asset_id");

-- ─────────────────────────────────────────────
-- ⑱ 교재의 개념 — 판본 속 개념 하나. 발행본의 이 행이 곧 개념 확정본이다
--    (QR 대상이 가리키므로 ⑪ 앞에 만든다)
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_concept" (
  "edition_id" UUID NOT NULL,
  "concept_key" VARCHAR(80) NOT NULL,
  "unit_key" VARCHAR(80) NOT NULL,
  "section_id" UUID,
  "title" VARCHAR(120) NOT NULL,
  "kind" VARCHAR(8) NOT NULL,
  "unit_id" UUID,
  "body" JSONB NOT NULL,
  "blank_items" JSONB NOT NULL DEFAULT '[]',
  -- 백지로 낼 형식(recall · term · cloze · map · figure). NULL = 고르지 않았다 — 빈 배열로 채우지 않는다
  "blank_forms" JSONB,
  "links" JSONB NOT NULL DEFAULT '[]',
  "mapping_version" VARCHAR(80) NOT NULL,
  "derived_from_concept_key" VARCHAR(80),
  "frozen" JSONB,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "textbook_concept_pkey" PRIMARY KEY ("edition_id", "concept_key"),
  CONSTRAINT "textbook_concept_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "textbook_edition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_concept_edition_id_section_id_fkey" FOREIGN KEY ("edition_id", "section_id") REFERENCES "textbook_section"("edition_id", "id") ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT "textbook_concept_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- CONCEPT_KINDS (src/lib/math-explorers/conceptKinds.ts) 와 같아야 한다 — 가드 시험이 견준다
  CONSTRAINT "textbook_concept_kind_check" CHECK ("kind" IN ('정의', '성질', '공식', '방법', '법칙', '정리', '단위')),
  CONSTRAINT "textbook_concept_body_object" CHECK (jsonb_typeof("body") = 'object'),
  CONSTRAINT "textbook_concept_blank_items_array" CHECK (jsonb_typeof("blank_items") = 'array'),
  CONSTRAINT "textbook_concept_blank_forms_array" CHECK (
    "blank_forms" IS NULL
    OR COALESCE(jsonb_typeof("blank_forms") = 'array' AND jsonb_array_length("blank_forms") BETWEEN 1 AND 5, FALSE)
  ),
  CONSTRAINT "textbook_concept_links_array" CHECK (jsonb_typeof("links") = 'array'),
  CONSTRAINT "textbook_concept_frozen_object" CHECK (
    "frozen" IS NULL
    OR COALESCE(jsonb_typeof("frozen") = 'object' AND ("frozen" ->> 'contentHash') ~ '^[a-f0-9]{64}$', FALSE)
  ),
  CONSTRAINT "textbook_concept_revision_check" CHECK ("revision" > 0)
);
CREATE INDEX "textbook_concept_unit_id_idx" ON "textbook_concept"("unit_id");

-- ─────────────────────────────────────────────
-- ⑪ QR 대상 — slug · 주소 · 대상은 영구. 지우지 못한다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_qr_target" (
  "id" UUID NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "url" VARCHAR(300) NOT NULL,
  "kind" VARCHAR(8) NOT NULL,
  "edition_id" UUID NOT NULL,
  "item_id" UUID,
  "concept_key" VARCHAR(80),
  "state" VARCHAR(10) NOT NULL DEFAULT 'reserved',
  "suspended_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "activated_at" TIMESTAMP(3),

  CONSTRAINT "textbook_qr_target_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_qr_target_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "textbook_edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- 다른 판본의 배치 · 개념을 가리키지 못한다
  CONSTRAINT "textbook_qr_target_edition_id_item_id_fkey" FOREIGN KEY ("edition_id", "item_id") REFERENCES "textbook_item"("edition_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_qr_target_edition_id_concept_key_fkey" FOREIGN KEY ("edition_id", "concept_key") REFERENCES "textbook_concept"("edition_id", "concept_key") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_qr_target_slug_check" CHECK ("slug" ~ '^[A-Za-z0-9_-]{16,100}$'),
  -- 개발 · 임시 주소가 지면에 찍히지 않게: https 이고 끝이 /q/<slug> 다
  CONSTRAINT "textbook_qr_target_url_check" CHECK ("url" LIKE 'https://%' AND right("url", length("slug") + 3) = '/q/' || "slug"),
  CONSTRAINT "textbook_qr_target_kind_check" CHECK ("kind" IN ('item', 'concept')),
  CONSTRAINT "textbook_qr_target_target_pair" CHECK (
    ("kind" = 'item' AND "item_id" IS NOT NULL AND "concept_key" IS NULL)
    OR ("kind" = 'concept' AND "concept_key" IS NOT NULL AND "item_id" IS NULL)
  ),
  CONSTRAINT "textbook_qr_target_state_check" CHECK ("state" IN ('reserved', 'active', 'void')),
  CONSTRAINT "textbook_qr_target_activated_pair" CHECK (("state" = 'active') = ("activated_at" IS NOT NULL)),
  CONSTRAINT "textbook_qr_target_suspended_check" CHECK ("suspended_at" IS NULL OR "state" = 'active')
);
CREATE UNIQUE INDEX "textbook_qr_target_slug_key" ON "textbook_qr_target"("slug");
CREATE UNIQUE INDEX "textbook_qr_target_item_key" ON "textbook_qr_target"("edition_id", "item_id") WHERE "kind" = 'item';
CREATE UNIQUE INDEX "textbook_qr_target_concept_key" ON "textbook_qr_target"("edition_id", "concept_key") WHERE "kind" = 'concept';

-- ─────────────────────────────────────────────
-- ⑫⑬ 문제 해설영상과 확정본 연결
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_video" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "provider" VARCHAR(12) NOT NULL,
  "provider_video_id" VARCHAR(20) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "textbook_video_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_video_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- 주소를 통째로 받지 않는다. 공급자와 영상 id 만 받아 서버가 주소를 짓는다
  CONSTRAINT "textbook_video_provider_check" CHECK ("provider" = 'youtube'),
  CONSTRAINT "textbook_video_provider_video_id_check" CHECK ("provider_video_id" ~ '^[A-Za-z0-9_-]{11}$')
);
CREATE UNIQUE INDEX "textbook_video_id_user_id_key" ON "textbook_video"("id", "user_id");
CREATE UNIQUE INDEX "textbook_video_user_id_provider_provider_video_id_key" ON "textbook_video"("user_id", "provider", "provider_video_id");

CREATE TABLE "textbook_video_binding" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "snapshot_id" UUID NOT NULL,
  "video_id" UUID NOT NULL,
  "status" VARCHAR(10) NOT NULL DEFAULT 'draft',
  "start_seconds" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "end_seconds" DOUBLE PRECISION,
  "reviewed_against_hash" CHAR(64),
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMP(3),
  "published_at" TIMESTAMP(3),
  "withdrawn_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "textbook_video_binding_pkey" PRIMARY KEY ("id"),
  -- 남의 확정본에 남의 영상을 걸지 못한다
  CONSTRAINT "textbook_video_binding_snapshot_id_user_id_fkey" FOREIGN KEY ("snapshot_id", "user_id") REFERENCES "textbook_problem_snapshot"("id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_video_binding_video_id_user_id_fkey" FOREIGN KEY ("video_id", "user_id") REFERENCES "textbook_video"("id", "user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_video_binding_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "textbook_video_binding_status_check" CHECK ("status" IN ('draft', 'review', 'published', 'withdrawn')),
  CONSTRAINT "textbook_video_binding_range_check" CHECK (
    "start_seconds" >= 0 AND "start_seconds" <= 86400
    AND ("end_seconds" IS NULL OR ("end_seconds" > "start_seconds" AND "end_seconds" <= 86400))
  ),
  CONSTRAINT "textbook_video_binding_published_review" CHECK (
    "status" <> 'published'
    OR ("reviewed_against_hash" IS NOT NULL AND "reviewed_at" IS NOT NULL AND "published_at" IS NOT NULL)
  ),
  CONSTRAINT "textbook_video_binding_withdrawn_pair" CHECK (("status" = 'withdrawn') = ("withdrawn_at" IS NOT NULL))
);
-- 게시 영상은 확정본당 하나
CREATE UNIQUE INDEX "textbook_video_binding_one_published" ON "textbook_video_binding"("snapshot_id") WHERE "status" = 'published';
CREATE INDEX "textbook_video_binding_snapshot_id_idx" ON "textbook_video_binding"("snapshot_id");
CREATE INDEX "textbook_video_binding_video_id_idx" ON "textbook_video_binding"("video_id");

-- ─────────────────────────────────────────────
-- ⑭ 배정 — 반 또는 학생 하나에, 판본 전체 · 구획들 · 배치들을
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_assignment" (
  "id" UUID NOT NULL,
  "edition_id" UUID NOT NULL,
  "class_id" UUID,
  "student_id" UUID,
  "scope_kind" VARCHAR(10) NOT NULL,
  "scope_ids" JSONB NOT NULL DEFAULT '[]',
  "opens_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3),
  "revoked_at" TIMESTAMP(3),
  "assigned_by" UUID,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "textbook_assignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_assignment_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "textbook_edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_assignment_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "class"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_assignment_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_assignment_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "textbook_assignment_target_xor" CHECK (num_nonnulls("class_id", "student_id") = 1),
  CONSTRAINT "textbook_assignment_scope_kind_check" CHECK ("scope_kind" IN ('edition', 'sections', 'items')),
  -- 판본 전체면 목록이 비고, 범위면 하나 이상이다 — 빈 범위가 «전체»로 읽히지 않게
  CONSTRAINT "textbook_assignment_scope_ids_check" CHECK (
    jsonb_typeof("scope_ids") = 'array' AND ("scope_kind" = 'edition') = (jsonb_array_length("scope_ids") = 0)
  ),
  CONSTRAINT "textbook_assignment_window_check" CHECK ("expires_at" IS NULL OR "expires_at" > "opens_at")
);
CREATE INDEX "textbook_assignment_class_id_idx" ON "textbook_assignment"("class_id");
CREATE INDEX "textbook_assignment_student_id_idx" ON "textbook_assignment"("student_id");
CREATE INDEX "textbook_assignment_edition_id_idx" ON "textbook_assignment"("edition_id");

-- ─────────────────────────────────────────────
-- ⑮ 요청 기록 — 같은 요청을 두 번 받아도 한 번만 만든다. 같은 id 에 다른 본문이면 409
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_request" (
  "user_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "operation" VARCHAR(32) NOT NULL,
  "edition_id" UUID,
  "state" VARCHAR(10) NOT NULL,
  "base_revision" INTEGER,
  "body_hash" CHAR(64) NOT NULL,
  "result" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "textbook_request_pkey" PRIMARY KEY ("user_id", "request_id"),
  CONSTRAINT "textbook_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_request_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "textbook_edition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_request_operation_check" CHECK ("operation" ~ '^[a-z][a-z-]{1,31}$'),
  CONSTRAINT "textbook_request_state_check" CHECK ("state" IN ('open', 'done', 'abandoned')),
  CONSTRAINT "textbook_request_body_hash_check" CHECK ("body_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "textbook_request_done_result" CHECK ("state" <> 'done' OR "result" IS NOT NULL),
  CONSTRAINT "textbook_request_publish_base" CHECK ("operation" <> 'publish' OR ("edition_id" IS NOT NULL AND "base_revision" IS NOT NULL))
);
-- 판본마다 열려 있는 발행 요청은 하나다
CREATE UNIQUE INDEX "textbook_request_one_open_publish" ON "textbook_request"("edition_id") WHERE "operation" = 'publish' AND "state" = 'open';
CREATE INDEX "textbook_request_edition_id_operation_idx" ON "textbook_request"("edition_id", "operation");

-- ─────────────────────────────────────────────
-- ⑯ 발행 조판 걸음 — 서버가 한 걸음씩 조판하고 결과를 적는다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_publish_step" (
  "user_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "idx" INTEGER NOT NULL,
  "kind" VARCHAR(8) NOT NULL DEFAULT 'render',
  "view" VARCHAR(8) NOT NULL,
  "section_ids" JSONB NOT NULL,
  "state" VARCHAR(8) NOT NULL DEFAULT 'queued',
  "attempts" SMALLINT NOT NULL DEFAULT 0,
  "lease_until" TIMESTAMP(3),
  "lease_token" UUID,
  "first_page_index" INTEGER,
  "page_count" INTEGER,
  "sha256" CHAR(64),
  "result" JSONB,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "textbook_publish_step_pkey" PRIMARY KEY ("user_id", "request_id", "idx"),
  CONSTRAINT "textbook_publish_step_user_id_request_id_fkey" FOREIGN KEY ("user_id", "request_id") REFERENCES "textbook_request"("user_id", "request_id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_publish_step_sha256_fkey" FOREIGN KEY ("sha256") REFERENCES "textbook_blob"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_publish_step_idx_check" CHECK ("idx" >= 0),
  -- render = 구획 묶음을 조판한다 · merge = 그 조각들을 한 파일로 합치고 QR 을 다시 읽는다
  CONSTRAINT "textbook_publish_step_kind_check" CHECK ("kind" IN ('render', 'merge')),
  CONSTRAINT "textbook_publish_step_view_check" CHECK ("view" IN ('student', 'answers')),
  CONSTRAINT "textbook_publish_step_section_ids_array" CHECK (jsonb_typeof("section_ids") = 'array'),
  CONSTRAINT "textbook_publish_step_state_check" CHECK ("state" IN ('queued', 'running', 'done', 'failed')),
  CONSTRAINT "textbook_publish_step_attempts_check" CHECK ("attempts" BETWEEN 0 AND 3),
  CONSTRAINT "textbook_publish_step_running_lease" CHECK ("state" <> 'running' OR ("lease_until" IS NOT NULL AND "lease_token" IS NOT NULL)),
  -- 끝난 걸음은 서버가 만든 바이트 · 쪽 수 · 진단을 가진다. 클라이언트가 채울 칸이 없다
  CONSTRAINT "textbook_publish_step_done_result" CHECK (
    ("state" = 'done') = ("sha256" IS NOT NULL)
    AND ("state" <> 'done' OR ("result" IS NOT NULL AND "page_count" >= 1 AND "first_page_index" >= 1))
  )
);

-- ─────────────────────────────────────────────
-- ⑰ 발행 산출물 — 서버가 만든 PDF · 정본 교환 JSON · 검수 보고 · 매핑표
--    값 목록은 계약 `textbookArtifactSchema.kind` 와 같다(가드 시험이 견준다)
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_artifact" (
  "id" UUID NOT NULL,
  "edition_id" UUID NOT NULL,
  "kind" VARCHAR(16) NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "page_count" INTEGER,
  "parts" JSONB NOT NULL DEFAULT '[]',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "textbook_artifact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_artifact_edition_id_fkey" FOREIGN KEY ("edition_id") REFERENCES "textbook_edition"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_artifact_sha256_fkey" FOREIGN KEY ("sha256") REFERENCES "textbook_blob"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_artifact_kind_check" CHECK ("kind" IN (
    'student-pdf', 'answer-pdf', 'spread-pdf', 'offline-html', 'exchange-json', 'exchange-zip', 'mapping-csv', 'validation-json'
  )),
  CONSTRAINT "textbook_artifact_byte_size_check" CHECK ("byte_size" > 0),
  CONSTRAINT "textbook_artifact_page_count_check" CHECK ("page_count" IS NULL OR "page_count" >= 0),
  -- 조판 걸음의 조각 해시 · 쪽 범위 — 합친 파일이 어디서 왔는지의 기록이다
  CONSTRAINT "textbook_artifact_parts_array" CHECK (jsonb_typeof("parts") = 'array')
);
CREATE UNIQUE INDEX "textbook_artifact_edition_id_kind_key" ON "textbook_artifact"("edition_id", "kind");

-- ─────────────────────────────────────────────
-- ⑲ 학생의 백지 활동 — 발행본의 개념 하나에 대한 한 번. 새 제출은 새 줄이다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_concept_attempt" (
  "id" UUID NOT NULL,
  "edition_id" UUID NOT NULL,
  "concept_key" VARCHAR(80) NOT NULL,
  "student_id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "body_hash" CHAR(64) NOT NULL,
  "frozen_hash" CHAR(64) NOT NULL,
  "form" VARCHAR(8) NOT NULL,
  "channel" VARCHAR(16) NOT NULL,
  "response" TEXT NOT NULL,
  "recorded_by" UUID,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "review_status" VARCHAR(12) NOT NULL DEFAULT 'pending',
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMP(3),
  "note" VARCHAR(4000),
  "revision" INTEGER NOT NULL DEFAULT 1,

  CONSTRAINT "textbook_concept_attempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_concept_attempt_edition_id_concept_key_fkey" FOREIGN KEY ("edition_id", "concept_key") REFERENCES "textbook_concept"("edition_id", "concept_key") ON DELETE RESTRICT ON UPDATE CASCADE,
  -- 학생을 지우면 그 학생의 글도 같이 지워진다(기존 학생 활동과 같은 수명)
  CONSTRAINT "textbook_concept_attempt_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_concept_attempt_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "textbook_concept_attempt_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "textbook_concept_attempt_hash_check" CHECK ("body_hash" ~ '^[a-f0-9]{64}$' AND "frozen_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "textbook_concept_attempt_form_check" CHECK ("form" IN ('recall', 'term', 'cloze', 'map', 'figure')),
  CONSTRAINT "textbook_concept_attempt_channel_check" CHECK ("channel" IN ('student-text', 'teacher-observed')),
  -- 학생이 글로 낼 수 있는 형식은 셋이다. 지도 · 그림은 교사의 종이 확인이다
  CONSTRAINT "textbook_concept_attempt_student_form" CHECK ("channel" <> 'student-text' OR "form" IN ('recall', 'term', 'cloze')),
  CONSTRAINT "textbook_concept_attempt_response_check" CHECK (char_length("response") BETWEEN 1 AND 20000),
  CONSTRAINT "textbook_concept_attempt_review_status_check" CHECK ("review_status" IN ('pending', 'checked', 'needs-review')),
  CONSTRAINT "textbook_concept_attempt_review_pair" CHECK (("review_status" = 'pending') = ("reviewed_at" IS NULL)),
  CONSTRAINT "textbook_concept_attempt_revision_check" CHECK ("revision" > 0)
);
CREATE UNIQUE INDEX "textbook_concept_attempt_student_id_request_id_key" ON "textbook_concept_attempt"("student_id", "request_id");
CREATE INDEX "textbook_concept_attempt_concept_student_idx" ON "textbook_concept_attempt"("edition_id", "concept_key", "student_id", "submitted_at");
CREATE INDEX "textbook_concept_attempt_student_id_submitted_at_idx" ON "textbook_concept_attempt"("student_id", "submitted_at");

-- ─────────────────────────────────────────────
-- ⑳ 보관본 — 가져온 패키지를 바이트 그대로. 원 ID 를 살아 있는 표에 넣지 않는다
-- ─────────────────────────────────────────────
CREATE TABLE "textbook_archive" (
  "id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "byte_size" INTEGER NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "schema_version" VARCHAR(40) NOT NULL,
  "manifest_hash" CHAR(64),
  "report" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "textbook_archive_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "textbook_archive_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "textbook_archive_sha256_fkey" FOREIGN KEY ("sha256") REFERENCES "textbook_blob"("sha256") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "textbook_archive_byte_size_check" CHECK ("byte_size" > 0),
  CONSTRAINT "textbook_archive_manifest_hash_check" CHECK ("manifest_hash" IS NULL OR "manifest_hash" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "textbook_archive_report_object" CHECK (jsonb_typeof("report") = 'object')
);
CREATE UNIQUE INDEX "textbook_archive_user_id_sha256_key" ON "textbook_archive"("user_id", "sha256");
CREATE INDEX "textbook_archive_user_id_created_at_idx" ON "textbook_archive"("user_id", "created_at");

-- ═════════════════════════════════════════════
-- 트리거 — 새 표에만 건다. 기존 표의 동작은 바뀌지 않는다
-- 거절은 전부 23514(check_violation) · 글머리 «textbook:» 로 낸다
-- ═════════════════════════════════════════════

-- 책: 정체와 주인은 안 바뀐다
CREATE FUNCTION "textbook_guard_book"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW."id" <> OLD."id" OR NEW."user_id" <> OLD."user_id" OR NEW."created_at" <> OLD."created_at" THEN
    RAISE EXCEPTION 'textbook: book % identity and owner are immutable', OLD."id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_book" BEFORE UPDATE ON "textbook"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_book"();

-- 판본: 초안 → 발행 → 종료 한 방향. 발행 뒤에는 종료 말고 아무것도 못 바꾼다.
-- 발행으로 넘어가는 순간 «서버가 끝낸 일»이 실제로 있는지 본다 — 상태 칸만 바꿔 발행할 수 없다.
CREATE FUNCTION "textbook_guard_edition"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" <> 'draft' THEN
      RAISE EXCEPTION 'textbook: published edition % cannot be deleted', OLD."id" USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW."id" <> OLD."id" OR NEW."textbook_id" <> OLD."textbook_id" OR NEW."user_id" <> OLD."user_id"
     OR NEW."ordinal" <> OLD."ordinal" OR NEW."created_at" <> OLD."created_at"
     OR NEW."derived_from_edition_id" IS DISTINCT FROM OLD."derived_from_edition_id" THEN
    RAISE EXCEPTION 'textbook: edition % identity is immutable', OLD."id" USING ERRCODE = '23514';
  END IF;
  IF NEW."revision" < OLD."revision" OR NEW."structure_revision" < OLD."structure_revision" THEN
    RAISE EXCEPTION 'textbook: edition % revision cannot go backwards', OLD."id" USING ERRCODE = '23514';
  END IF;

  IF OLD."status" = 'draft' THEN
    IF NEW."status" = 'retired' THEN
      RAISE EXCEPTION 'textbook: draft edition % cannot be retired', OLD."id" USING ERRCODE = '23514';
    END IF;
    IF NEW."status" = 'published' THEN
      IF NOT EXISTS (
        SELECT 1 FROM public."textbook_request" r
         WHERE r."edition_id" = NEW."id" AND r."operation" = 'publish' AND r."state" = 'open'
           AND EXISTS (SELECT 1 FROM public."textbook_publish_step" s
                        WHERE s."user_id" = r."user_id" AND s."request_id" = r."request_id")
           AND NOT EXISTS (SELECT 1 FROM public."textbook_publish_step" s
                            WHERE s."user_id" = r."user_id" AND s."request_id" = r."request_id" AND s."state" <> 'done')
      ) THEN
        RAISE EXCEPTION 'textbook: edition % has no completed server publish job', OLD."id" USING ERRCODE = '23514';
      END IF;
      IF (SELECT count(*) FROM public."textbook_artifact" a
           WHERE a."edition_id" = NEW."id" AND a."kind" IN ('student-pdf', 'answer-pdf', 'exchange-json')) <> 3 THEN
        RAISE EXCEPTION 'textbook: edition % is missing published artifacts', OLD."id" USING ERRCODE = '23514';
      END IF;
      IF EXISTS (
        SELECT 1 FROM public."textbook_item" i
         WHERE i."edition_id" = NEW."id" AND i."section_id" IS NOT NULL
           AND (i."link_status" <> 'linked' OR i."display_number" IS NULL OR i."physical_page_index" IS NULL
                OR i."printed_page_label" IS NULL OR i."page_column" IS NULL)
      ) THEN
        RAISE EXCEPTION 'textbook: edition % has placed items that are unlinked or unpaged', OLD."id" USING ERRCODE = '23514';
      END IF;
      IF EXISTS (SELECT 1 FROM public."textbook_qr_target" q WHERE q."edition_id" = NEW."id" AND q."state" = 'reserved') THEN
        RAISE EXCEPTION 'textbook: edition % still has reserved QR targets', OLD."id" USING ERRCODE = '23514';
      END IF;
      IF EXISTS (SELECT 1 FROM public."textbook_concept" c WHERE c."edition_id" = NEW."id" AND c."frozen" IS NULL) THEN
        RAISE EXCEPTION 'textbook: edition % has concepts that are not frozen', OLD."id" USING ERRCODE = '23514';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'retired_at' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'retired_at' - 'updated_at') THEN
    RAISE EXCEPTION 'textbook: published edition % is immutable', OLD."id" USING ERRCODE = '23514';
  END IF;
  IF OLD."status" = 'published' AND NEW."status" NOT IN ('published', 'retired') THEN
    RAISE EXCEPTION 'textbook: published edition % can only be retired', OLD."id" USING ERRCODE = '23514';
  END IF;
  IF OLD."status" = 'retired' AND (NEW."status" <> 'retired' OR NEW."retired_at" IS DISTINCT FROM OLD."retired_at") THEN
    RAISE EXCEPTION 'textbook: retired edition % is final', OLD."id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_edition" BEFORE UPDATE OR DELETE ON "textbook_edition"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_edition"();

-- 판본의 자식(구획 · 배치 · 개념 · 자산 색인 · 산출물): 부모가 초안일 때만 쓴다.
-- 부모 행을 잠가(FOR NO KEY UPDATE) 저장과 발행 확정이 한 줄로 선다 — 확정이 먼저 잡았으면
-- 저장은 기다렸다가 «발행됨»을 보고 거절되고, 저장이 먼저 잡았으면 확정이 오른 revision 을 본다.
-- 부모가 없으면(초안 판본을 지우는 CASCADE 안) 통과시킨다.
CREATE FUNCTION "textbook_guard_edition_child"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_edition UUID;
  v_status TEXT;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW."edition_id" <> OLD."edition_id" THEN
    RAISE EXCEPTION 'textbook: % rows cannot move between editions', TG_TABLE_NAME USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    v_edition := OLD."edition_id";
  ELSE
    v_edition := NEW."edition_id";
  END IF;
  SELECT e."status" INTO v_status FROM public."textbook_edition" e WHERE e."id" = v_edition FOR NO KEY UPDATE;
  IF FOUND AND v_status <> 'draft' THEN
    RAISE EXCEPTION 'textbook: edition % is % — its % rows are immutable', v_edition, v_status, TG_TABLE_NAME USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- 자식을 쓴 문장마다 판본 집계 revision 을 올린다. 발행 확정은 이 값이 예약 때와 같은지를 본다.
CREATE FUNCTION "textbook_bump_edition_from_new"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public."textbook_edition" e
     SET "revision" = e."revision" + 1, "updated_at" = (now() AT TIME ZONE 'UTC')
   WHERE e."id" IN (SELECT DISTINCT n."edition_id" FROM new_rows n);
  RETURN NULL;
END;
$$;
CREATE FUNCTION "textbook_bump_edition_from_old"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  UPDATE public."textbook_edition" e
     SET "revision" = e."revision" + 1, "updated_at" = (now() AT TIME ZONE 'UTC')
   WHERE e."id" IN (SELECT DISTINCT o."edition_id" FROM old_rows o);
  RETURN NULL;
END;
$$;

CREATE TRIGGER "textbook_section_guard" BEFORE INSERT OR UPDATE OR DELETE ON "textbook_section"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_edition_child"();
CREATE TRIGGER "textbook_section_bump_insert" AFTER INSERT ON "textbook_section"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_section_bump_update" AFTER UPDATE ON "textbook_section"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_section_bump_delete" AFTER DELETE ON "textbook_section"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_old"();

CREATE TRIGGER "textbook_item_guard" BEFORE INSERT OR UPDATE OR DELETE ON "textbook_item"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_edition_child"();
CREATE TRIGGER "textbook_item_bump_insert" AFTER INSERT ON "textbook_item"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_item_bump_update" AFTER UPDATE ON "textbook_item"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_item_bump_delete" AFTER DELETE ON "textbook_item"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_old"();

CREATE TRIGGER "textbook_concept_guard" BEFORE INSERT OR UPDATE OR DELETE ON "textbook_concept"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_edition_child"();
CREATE TRIGGER "textbook_concept_bump_insert" AFTER INSERT ON "textbook_concept"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_concept_bump_update" AFTER UPDATE ON "textbook_concept"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_concept_bump_delete" AFTER DELETE ON "textbook_concept"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_old"();

CREATE TRIGGER "textbook_edition_asset_guard" BEFORE INSERT OR UPDATE OR DELETE ON "textbook_edition_asset"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_edition_child"();
CREATE TRIGGER "textbook_edition_asset_bump_insert" AFTER INSERT ON "textbook_edition_asset"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_edition_asset_bump_update" AFTER UPDATE ON "textbook_edition_asset"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_edition_asset_bump_delete" AFTER DELETE ON "textbook_edition_asset"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_old"();

CREATE TRIGGER "textbook_artifact_guard" BEFORE INSERT OR UPDATE OR DELETE ON "textbook_artifact"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_edition_child"();
CREATE TRIGGER "textbook_artifact_bump_insert" AFTER INSERT ON "textbook_artifact"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_artifact_bump_update" AFTER UPDATE ON "textbook_artifact"
REFERENCING NEW TABLE AS new_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_new"();
CREATE TRIGGER "textbook_artifact_bump_delete" AFTER DELETE ON "textbook_artifact"
REFERENCING OLD TABLE AS old_rows FOR EACH STATEMENT EXECUTE FUNCTION "textbook_bump_edition_from_old"();

-- 배치: `linked` 는 실제 은행 문항의 확정본만 가질 수 있다
CREATE FUNCTION "textbook_guard_item_link"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW."link_status" = 'linked' AND NOT EXISTS (
    SELECT 1 FROM public."textbook_problem_snapshot" s
     WHERE s."id" = NEW."snapshot_id" AND s."source_system" = 'todays-math'
  ) THEN
    RAISE EXCEPTION 'textbook: item % cannot be linked without a real bank problem identity', NEW."id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_item_link" BEFORE INSERT OR UPDATE OF "link_status", "snapshot_id" ON "textbook_item"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_item_link"();

-- 확정본: 만든 뒤로 안 바뀐다. 원본 문항이 지워질 때 problem_id 가 비는 것만 통과한다
CREATE FUNCTION "textbook_guard_snapshot"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'problem_id') IS DISTINCT FROM (to_jsonb(OLD) - 'problem_id')
     OR (NEW."problem_id" IS NOT NULL AND NEW."problem_id" IS DISTINCT FROM OLD."problem_id") THEN
    RAISE EXCEPTION 'textbook: problem snapshot % is immutable', OLD."id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_snapshot" BEFORE UPDATE ON "textbook_problem_snapshot"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_snapshot"();
-- 격리된 문항은 확정본으로도 못 나간다 — 시험지 · 답안에 걸린 것과 같은 함수다
CREATE TRIGGER "textbook_problem_snapshot_outer_wall" BEFORE INSERT OR UPDATE OF "problem_id" ON "textbook_problem_snapshot"
FOR EACH ROW EXECUTE FUNCTION "block_problem_relation_behind_outer_wall"();

-- 바이트: 넣을 때 DB 가 해시를 다시 계산한다. 넣은 뒤로는 못 고친다
CREATE FUNCTION "textbook_guard_blob"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'textbook: blob % is immutable', OLD."sha256" USING ERRCODE = '23514';
  END IF;
  IF NEW."sha256" IS DISTINCT FROM encode(sha256(NEW."bytes"), 'hex') THEN
    RAISE EXCEPTION 'textbook: blob bytes do not match the claimed sha256 %', NEW."sha256" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_blob" BEFORE INSERT OR UPDATE ON "textbook_blob"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_blob"();

-- 자산 손잡이: 이름만 바꿀 수 있다
CREATE FUNCTION "textbook_guard_asset"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'name') IS DISTINCT FROM (to_jsonb(OLD) - 'name') THEN
    RAISE EXCEPTION 'textbook: asset % is immutable except its name', OLD."id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_asset" BEFORE UPDATE ON "textbook_asset"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_asset"();

-- QR 대상: 초안에서만 예약한다. slug · 주소 · 대상은 영구다. 지우지 못한다.
-- 바뀌는 것은 상태(reserved → active | void — 판본이 아직 초안일 때만)와 중지 시각뿐이다.
CREATE FUNCTION "textbook_guard_qr_target"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'textbook: QR target % is permanent', OLD."id" USING ERRCODE = '23514';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT e."status" INTO v_status FROM public."textbook_edition" e WHERE e."id" = NEW."edition_id" FOR NO KEY UPDATE;
    IF v_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'textbook: QR targets are reserved only while edition % is a draft', NEW."edition_id" USING ERRCODE = '23514';
    END IF;
    IF NEW."state" <> 'reserved' OR NEW."suspended_at" IS NOT NULL THEN
      RAISE EXCEPTION 'textbook: QR target % must start reserved', NEW."id" USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'state' - 'activated_at' - 'suspended_at') IS DISTINCT FROM (to_jsonb(OLD) - 'state' - 'activated_at' - 'suspended_at') THEN
    RAISE EXCEPTION 'textbook: QR target % slug, url and target are permanent', OLD."id" USING ERRCODE = '23514';
  END IF;
  IF NEW."state" <> OLD."state" THEN
    IF OLD."state" <> 'reserved' THEN
      RAISE EXCEPTION 'textbook: QR target % state % is final', OLD."id", OLD."state" USING ERRCODE = '23514';
    END IF;
    SELECT e."status" INTO v_status FROM public."textbook_edition" e WHERE e."id" = NEW."edition_id" FOR NO KEY UPDATE;
    IF v_status IS DISTINCT FROM 'draft' THEN
      RAISE EXCEPTION 'textbook: QR target % can change state only inside publish finalize', OLD."id" USING ERRCODE = '23514';
    END IF;
  ELSIF NEW."activated_at" IS DISTINCT FROM OLD."activated_at" THEN
    RAISE EXCEPTION 'textbook: QR target % activation time is permanent', OLD."id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_qr_target" BEFORE INSERT OR UPDATE OR DELETE ON "textbook_qr_target"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_qr_target"();

-- 영상: 검수한 영상의 정체(공급자 · 영상 id)는 안 바뀐다 — 다른 영상은 새 행이다
CREATE FUNCTION "textbook_guard_video"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (to_jsonb(NEW) - 'title' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'title' - 'updated_at') THEN
    RAISE EXCEPTION 'textbook: video % provider identity is immutable', OLD."id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_video" BEFORE UPDATE ON "textbook_video"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_video"();

-- 영상 연결: draft → review → published → withdrawn. 게시는 검수 화면을 지난 것만 —
-- 그때의 해시가 확정본의 내용 해시와 같아야 한다. 게시 · 중지된 줄은 변경 기록이라 남는다.
CREATE FUNCTION "textbook_guard_video_binding"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."status" IN ('published', 'withdrawn') THEN
      RAISE EXCEPTION 'textbook: video binding % is kept as history', OLD."id" USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'draft' THEN
      RAISE EXCEPTION 'textbook: video binding % must start as a draft', NEW."id" USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."id" <> OLD."id" OR NEW."user_id" <> OLD."user_id" OR NEW."snapshot_id" <> OLD."snapshot_id"
     OR NEW."video_id" <> OLD."video_id" OR NEW."created_at" <> OLD."created_at" THEN
    RAISE EXCEPTION 'textbook: video binding % target is immutable', OLD."id" USING ERRCODE = '23514';
  END IF;

  IF OLD."status" IN ('published', 'withdrawn') THEN
    -- 남는 변화는 둘뿐이다: 게시 → 중지, 그리고 검수자 계정이 지워질 때 그 칸이 비는 것
    IF (to_jsonb(NEW) - 'status' - 'withdrawn_at' - 'reviewed_by') IS DISTINCT FROM (to_jsonb(OLD) - 'status' - 'withdrawn_at' - 'reviewed_by')
       OR (NEW."reviewed_by" IS NOT NULL AND NEW."reviewed_by" IS DISTINCT FROM OLD."reviewed_by") THEN
      RAISE EXCEPTION 'textbook: reviewed video binding % is immutable', OLD."id" USING ERRCODE = '23514';
    END IF;
    IF OLD."status" = 'withdrawn' AND (NEW."status" <> 'withdrawn' OR NEW."withdrawn_at" IS DISTINCT FROM OLD."withdrawn_at") THEN
      RAISE EXCEPTION 'textbook: withdrawn video binding % is final', OLD."id" USING ERRCODE = '23514';
    END IF;
    IF OLD."status" = 'published' AND NEW."status" NOT IN ('published', 'withdrawn') THEN
      RAISE EXCEPTION 'textbook: published video binding % can only be withdrawn', OLD."id" USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW."status" = 'published' THEN
    IF OLD."status" <> 'review' THEN
      RAISE EXCEPTION 'textbook: video binding % must be reviewed before it is published', OLD."id" USING ERRCODE = '23514';
    END IF;
    SELECT s."content_hash" INTO v_hash FROM public."textbook_problem_snapshot" s WHERE s."id" = NEW."snapshot_id";
    IF NEW."reviewed_against_hash" IS DISTINCT FROM v_hash OR NEW."reviewed_by" IS NULL THEN
      RAISE EXCEPTION 'textbook: video binding % was not reviewed against this snapshot', OLD."id" USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_video_binding" BEFORE INSERT OR UPDATE OR DELETE ON "textbook_video_binding"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_video_binding"();

-- 배정: 발행본에만 건다. 대상과 범위는 안 바뀐다(바꾸려면 회수하고 새로 건다). 회수는 되돌리지 못한다
CREATE FUNCTION "textbook_guard_assignment"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT e."status" INTO v_status FROM public."textbook_edition" e WHERE e."id" = NEW."edition_id";
    IF v_status IS DISTINCT FROM 'published' THEN
      RAISE EXCEPTION 'textbook: only a published edition can be assigned (edition %)', NEW."edition_id" USING ERRCODE = '23514';
    END IF;
    IF NEW."revoked_at" IS NOT NULL THEN
      RAISE EXCEPTION 'textbook: assignment % cannot start revoked', NEW."id" USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;
  IF (to_jsonb(NEW) - 'expires_at' - 'revoked_at' - 'assigned_by') IS DISTINCT FROM (to_jsonb(OLD) - 'expires_at' - 'revoked_at' - 'assigned_by')
     OR (NEW."assigned_by" IS NOT NULL AND NEW."assigned_by" IS DISTINCT FROM OLD."assigned_by") THEN
    RAISE EXCEPTION 'textbook: assignment % target and scope are immutable', OLD."id" USING ERRCODE = '23514';
  END IF;
  IF OLD."revoked_at" IS NOT NULL AND (to_jsonb(NEW) - 'assigned_by') IS DISTINCT FROM (to_jsonb(OLD) - 'assigned_by') THEN
    RAISE EXCEPTION 'textbook: revoked assignment % is final', OLD."id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_assignment" BEFORE INSERT OR UPDATE ON "textbook_assignment"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_assignment"();

-- 요청 기록: 닫힌 요청은 결과까지 안 바뀐다. 끝난 발행 요청은 지우지 못한다(조각 PDF 가 거기 달려 있다)
CREATE FUNCTION "textbook_guard_request"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD."operation" = 'publish' AND OLD."state" = 'done' THEN
      RAISE EXCEPTION 'textbook: finished publish request % is permanent', OLD."request_id" USING ERRCODE = '23514';
    END IF;
    RETURN OLD;
  END IF;
  IF (to_jsonb(NEW) - 'state' - 'result' - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'state' - 'result' - 'updated_at') THEN
    RAISE EXCEPTION 'textbook: request % identity and body hash are immutable', OLD."request_id" USING ERRCODE = '23514';
  END IF;
  IF OLD."state" <> 'open' AND (NEW."state" <> OLD."state" OR NEW."result" IS DISTINCT FROM OLD."result") THEN
    RAISE EXCEPTION 'textbook: request % is closed', OLD."request_id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_request" BEFORE UPDATE OR DELETE ON "textbook_request"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_request"();

-- 조판 걸음: 끝난 걸음은 안 바뀐다. 무엇을 조판할지는 예약 때 정해진다
CREATE FUNCTION "textbook_guard_publish_step"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF OLD."state" = 'done' THEN
    RAISE EXCEPTION 'textbook: finished publish step %/% is immutable', OLD."request_id", OLD."idx" USING ERRCODE = '23514';
  END IF;
  IF NEW."user_id" <> OLD."user_id" OR NEW."request_id" <> OLD."request_id" OR NEW."idx" <> OLD."idx"
     OR NEW."kind" <> OLD."kind" OR NEW."view" <> OLD."view" OR NEW."section_ids" IS DISTINCT FROM OLD."section_ids" THEN
    RAISE EXCEPTION 'textbook: publish step %/% plan is immutable', OLD."request_id", OLD."idx" USING ERRCODE = '23514';
  END IF;
  IF NEW."attempts" < OLD."attempts" THEN
    RAISE EXCEPTION 'textbook: publish step %/% attempts cannot go backwards', OLD."request_id", OLD."idx" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_publish_step" BEFORE UPDATE ON "textbook_publish_step"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_publish_step"();

-- 백지 활동: 발행본의 굳은 개념에만 쌓인다. 낸 글은 덮어쓰지 못한다 — 교사의 확인 칸만 바뀐다
CREATE FUNCTION "textbook_guard_concept_attempt"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
  v_frozen TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT e."status", c."frozen" ->> 'contentHash' INTO v_status, v_frozen
      FROM public."textbook_concept" c
      JOIN public."textbook_edition" e ON e."id" = c."edition_id"
     WHERE c."edition_id" = NEW."edition_id" AND c."concept_key" = NEW."concept_key";
    IF v_status IS DISTINCT FROM 'published' THEN
      RAISE EXCEPTION 'textbook: concept attempts need a published edition (edition %)', NEW."edition_id" USING ERRCODE = '23514';
    END IF;
    IF NEW."frozen_hash" IS DISTINCT FROM v_frozen THEN
      RAISE EXCEPTION 'textbook: concept attempt % does not match the frozen concept', NEW."id" USING ERRCODE = '23514';
    END IF;
    IF NEW."review_status" <> 'pending' OR NEW."revision" <> 1 THEN
      RAISE EXCEPTION 'textbook: concept attempt % must start pending', NEW."id" USING ERRCODE = '23514';
    END IF;
    IF (NEW."channel" = 'teacher-observed') <> (NEW."recorded_by" IS NOT NULL) THEN
      RAISE EXCEPTION 'textbook: concept attempt % recorder does not match its channel', NEW."id" USING ERRCODE = '23514';
    END IF;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'review_status' - 'reviewed_by' - 'reviewed_at' - 'note' - 'revision' - 'recorded_by')
       IS DISTINCT FROM (to_jsonb(OLD) - 'review_status' - 'reviewed_by' - 'reviewed_at' - 'note' - 'revision' - 'recorded_by')
     OR (NEW."recorded_by" IS NOT NULL AND NEW."recorded_by" IS DISTINCT FROM OLD."recorded_by") THEN
    RAISE EXCEPTION 'textbook: concept attempt % response is immutable', OLD."id" USING ERRCODE = '23514';
  END IF;
  IF NEW."revision" < OLD."revision" THEN
    RAISE EXCEPTION 'textbook: concept attempt % revision cannot go backwards', OLD."id" USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER "textbook_guard_concept_attempt" BEFORE INSERT OR UPDATE ON "textbook_concept_attempt"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_concept_attempt"();

-- 보관본: 넣은 뒤로 안 바뀐다(지우는 것은 주인이 한다)
CREATE FUNCTION "textbook_guard_archive"()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'textbook: archive % is immutable', OLD."id" USING ERRCODE = '23514';
END;
$$;
CREATE TRIGGER "textbook_guard_archive" BEFORE UPDATE ON "textbook_archive"
FOR EACH ROW EXECUTE FUNCTION "textbook_guard_archive"();

-- ═════════════════════════════════════════════
-- RLS — 정책 없이 켠다. 앱은 Auth.js + Prisma(표 주인 권한)로만 읽고 쓴다.
-- Supabase Data API(anon · authenticated)로는 한 줄도 나가지 않는다.
-- ═════════════════════════════════════════════
ALTER TABLE "textbook" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_edition" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_problem_snapshot" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_item" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_blob" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_upload" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_upload_chunk" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_edition_asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_concept" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_qr_target" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_video" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_video_binding" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_assignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_request" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_publish_step" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_artifact" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_concept_attempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "textbook_archive" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_table TEXT;
  v_role TEXT;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'textbook', 'textbook_edition', 'textbook_section', 'textbook_problem_snapshot', 'textbook_item',
    'textbook_blob', 'textbook_upload', 'textbook_upload_chunk', 'textbook_asset', 'textbook_edition_asset',
    'textbook_concept', 'textbook_qr_target', 'textbook_video', 'textbook_video_binding', 'textbook_assignment',
    'textbook_request', 'textbook_publish_step', 'textbook_artifact', 'textbook_concept_attempt', 'textbook_archive'
  ] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC', v_table);
    FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = v_role) THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM %I', v_table, v_role);
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

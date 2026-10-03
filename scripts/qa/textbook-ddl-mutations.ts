/**
 * 교재 DDL 시험의 변이 하네스 — 가드를 하나 빼면 시험이 빨개지는가.
 *
 *   npx tsx scripts/qa/textbook-ddl-mutations.ts            # 전부
 *   npx tsx scripts/qa/textbook-ddl-mutations.ts qr blob    # 이름에 그 글이 든 것만
 *
 * DB 에 닿지 않는다 — 시험이 쓰는 PGlite(메모리 Postgres)에서만 돈다. 마이그레이션 파일도 고치지 않는다
 * (변이는 환경변수 `TEXTBOOK_DDL_MUTATION` 으로 하네스에 건넨다 — `src/__tests__/helpers/textbookPglite.ts`).
 *
 * 변이 둘 갈래:
 *   · `sql`     — 다 적용한 뒤 트리거 · 제약 · 색인을 뗀다
 *   · `replace` — 마이그레이션 글에서 가드 한 줄을 바꿔 적용한다. 그 글이 정확히 한 번 나오지 않으면
 *                 하네스가 던진다(시험 전부 빨강) — 그래서 **대조군**이 먼저 돈다: 변이 없이 초록이어야 한다.
 *
 * 읽는 법: «물었다» = 그 가드를 지키는 시험이 있다. «안 물었다» = 가드를 빼도 초록 — 시험을 더하거나 가드를 지운다.
 */
import { spawnSync } from "node:child_process";

interface Mutation {
  name: string;
  sql?: string;
  replace?: Array<[string, string]>;
}

const dropTrigger = (trigger: string, table: string): string =>
  `DROP TRIGGER "${trigger}" ON "${table}";`;
const dropConstraint = (table: string, constraint: string): string =>
  `ALTER TABLE "${table}" DROP CONSTRAINT "${constraint}";`;

const MUTATIONS: Mutation[] = [
  // ── 발행본의 자식을 지키는 트리거 ──
  ...[
    "textbook_section",
    "textbook_item",
    "textbook_concept",
    "textbook_edition_asset",
    "textbook_artifact",
  ].map((table) => ({
    name: `자식 가드 뗌: ${table}`,
    sql: dropTrigger(`${table}_guard`, table),
  })),
  {
    name: "판본 가드 뗌",
    sql: dropTrigger("textbook_guard_edition", "textbook_edition"),
  },
  // ── 집계 revision ──
  {
    name: "revision 올리기 뗌: 구획 UPDATE",
    sql: dropTrigger("textbook_section_bump_update", "textbook_section"),
  },
  {
    name: "revision 올리기 뗌: 배치 UPDATE",
    sql: dropTrigger("textbook_item_bump_update", "textbook_item"),
  },
  {
    name: "revision 올리기 뗌: 배치 INSERT",
    sql: dropTrigger("textbook_item_bump_insert", "textbook_item"),
  },
  {
    name: "revision 올리기 뗌: 배치 DELETE",
    sql: dropTrigger("textbook_item_bump_delete", "textbook_item"),
  },
  {
    name: "revision 올리기 뗌: 개념 INSERT",
    sql: dropTrigger("textbook_concept_bump_insert", "textbook_concept"),
  },
  {
    name: "revision 올리기 뗌: 구획 INSERT",
    sql: dropTrigger("textbook_section_bump_insert", "textbook_section"),
  },
  // ── 발행으로 넘어갈 때 보는 것 (가드 한 줄씩) ──
  {
    name: "발행 조건 뺌: 서버 발행 작업",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: edition % has no completed server publish job', OLD."id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "발행 조건 뺌: 산출물",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: edition % is missing published artifacts', OLD."id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "발행 조건 뺌: 연결 · 쪽",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: edition % has placed items that are unlinked or unpaged', OLD."id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "발행 조건 뺌: 남은 예약 QR",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: edition % still has reserved QR targets', OLD."id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "발행 조건 뺌: 굳지 않은 개념",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: edition % has concepts that are not frozen', OLD."id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "발행 조건 느슨: 끝나지 않은 걸음을 안 본다",
    replace: [
      [
        `WHERE s."user_id" = r."user_id" AND s."request_id" = r."request_id" AND s."state" <> 'done')`,
        `WHERE FALSE)`,
      ],
    ],
  },
  {
    name: "판본 가드 느슨: 발행본 불변 비교",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: published edition % is immutable', OLD."id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "판본 가드 느슨: 종료는 마지막",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: retired edition % is final', OLD."id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "판본 가드 느슨: revision 뒤로",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: edition % revision cannot go backwards', OLD."id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "판본 가드 느슨: 발행본 삭제",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: published edition % cannot be deleted', OLD."id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "자식 가드 느슨: 판본 옮기기",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: % rows cannot move between editions', TG_TABLE_NAME USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  // ── 주인 · 판본 복합 FK ──
  {
    name: "FK 뗌: 배치 → 내 확정본",
    sql: dropConstraint(
      "textbook_item",
      "textbook_item_snapshot_id_user_id_fkey",
    ),
  },
  {
    name: "FK 뗌: 배치 → 내 판본",
    sql: dropConstraint(
      "textbook_item",
      "textbook_item_edition_id_user_id_fkey",
    ),
  },
  {
    name: "FK 뗌: 배치 → 같은 판본의 구획",
    sql: dropConstraint(
      "textbook_item",
      "textbook_item_edition_id_section_id_fkey",
    ),
  },
  {
    name: "FK 뗌: 개념 → 같은 판본의 구획",
    sql: dropConstraint(
      "textbook_concept",
      "textbook_concept_edition_id_section_id_fkey",
    ),
  },
  {
    name: "FK 뗌: QR → 같은 판본의 배치",
    sql: dropConstraint(
      "textbook_qr_target",
      "textbook_qr_target_edition_id_item_id_fkey",
    ),
  },
  {
    name: "FK 뗌: QR → 같은 판본의 개념",
    sql: dropConstraint(
      "textbook_qr_target",
      "textbook_qr_target_edition_id_concept_key_fkey",
    ),
  },
  {
    name: "FK 뗌: 판본 자산 → 내 자산",
    sql: dropConstraint(
      "textbook_edition_asset",
      "textbook_edition_asset_user_id_asset_id_fkey",
    ),
  },
  {
    name: "FK 뗌: 판본 → 책의 주인",
    sql: dropConstraint(
      "textbook_edition",
      "textbook_edition_textbook_id_user_id_fkey",
    ),
  },
  {
    name: "FK 뗌: 영상 연결 → 내 확정본",
    sql: dropConstraint(
      "textbook_video_binding",
      "textbook_video_binding_snapshot_id_user_id_fkey",
    ),
  },
  {
    name: "FK 뗌: 영상 연결 → 내 영상",
    sql: dropConstraint(
      "textbook_video_binding",
      "textbook_video_binding_video_id_user_id_fkey",
    ),
  },
  {
    name: "FK 뗌: 조판 걸음 → 바이트",
    sql: dropConstraint(
      "textbook_publish_step",
      "textbook_publish_step_sha256_fkey",
    ),
  },
  // ── 하나만 ──
  {
    name: "색인 뗌: 초안 하나",
    sql: `DROP INDEX "textbook_edition_one_draft";`,
  },
  {
    name: "색인 뗌: 열린 발행 요청 하나",
    sql: `DROP INDEX "textbook_request_one_open_publish";`,
  },
  {
    name: "색인 뗌: 게시 영상 하나",
    sql: `DROP INDEX "textbook_video_binding_one_published";`,
  },
  {
    name: "색인 뗌: 배치마다 QR 하나",
    sql: `DROP INDEX "textbook_qr_target_item_key";`,
  },
  {
    name: "색인 뗌: 확정본 유일",
    sql: `DROP INDEX "textbook_problem_snapshot_user_id_source_key_snapshot_hash_key";`,
  },
  // ── 불변 트리거 ──
  {
    name: "트리거 뗌: 확정본 불변",
    sql: dropTrigger("textbook_guard_snapshot", "textbook_problem_snapshot"),
  },
  {
    name: "트리거 뗌: 확정본 외벽",
    sql: dropTrigger(
      "textbook_problem_snapshot_outer_wall",
      "textbook_problem_snapshot",
    ),
  },
  {
    name: "트리거 뗌: 바이트",
    sql: dropTrigger("textbook_guard_blob", "textbook_blob"),
  },
  {
    name: "바이트 가드 느슨: 해시 다시 계산 안 함",
    replace: [
      [
        `IF NEW."sha256" IS DISTINCT FROM encode(sha256(NEW."bytes"), 'hex') THEN`,
        `IF FALSE THEN`,
      ],
    ],
  },
  {
    name: "트리거 뗌: 자산 손잡이",
    sql: dropTrigger("textbook_guard_asset", "textbook_asset"),
  },
  {
    name: "트리거 뗌: QR",
    sql: dropTrigger("textbook_guard_qr_target", "textbook_qr_target"),
  },
  {
    name: "QR 가드 느슨: 지우기",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: QR target % is permanent', OLD."id" USING ERRCODE = '23514';`,
        `RETURN OLD;`,
      ],
    ],
  },
  {
    name: "QR 가드 느슨: 발행본에 예약",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: QR targets are reserved only while edition % is a draft', NEW."edition_id" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "QR 가드 느슨: 끝난 상태 바꾸기",
    replace: [
      [
        `RAISE EXCEPTION 'textbook: QR target % state % is final', OLD."id", OLD."state" USING ERRCODE = '23514';`,
        `NULL;`,
      ],
    ],
  },
  {
    name: "트리거 뗌: 영상",
    sql: dropTrigger("textbook_guard_video", "textbook_video"),
  },
  {
    name: "트리거 뗌: 영상 연결",
    sql: dropTrigger("textbook_guard_video_binding", "textbook_video_binding"),
  },
  {
    name: "영상 연결 가드 느슨: 검수 해시",
    replace: [
      [
        `IF NEW."reviewed_against_hash" IS DISTINCT FROM v_hash OR NEW."reviewed_by" IS NULL THEN`,
        `IF FALSE THEN`,
      ],
    ],
  },
  {
    name: "트리거 뗌: 배정",
    sql: dropTrigger("textbook_guard_assignment", "textbook_assignment"),
  },
  {
    name: "트리거 뗌: 요청",
    sql: dropTrigger("textbook_guard_request", "textbook_request"),
  },
  {
    name: "트리거 뗌: 조판 걸음",
    sql: dropTrigger("textbook_guard_publish_step", "textbook_publish_step"),
  },
  {
    name: "트리거 뗌: 백지 활동",
    sql: dropTrigger(
      "textbook_guard_concept_attempt",
      "textbook_concept_attempt",
    ),
  },
  {
    name: "트리거 뗌: 보관본",
    sql: dropTrigger("textbook_guard_archive", "textbook_archive"),
  },
  {
    name: "트리거 뗌: 책 주인",
    sql: dropTrigger("textbook_guard_book", "textbook"),
  },
  {
    name: "트리거 뗌: linked 조건",
    sql: dropTrigger("textbook_item_link", "textbook_item"),
  },
  {
    name: "트리거 뗌: 시험지 확정본 정체",
    sql: dropTrigger("test_problem_textbook_snapshot_identity", "test_problem"),
  },
  // ── CHECK ──
  {
    name: "CHECK 뗌: 출처 정체",
    sql: dropConstraint(
      "textbook_problem_snapshot",
      "textbook_problem_snapshot_source_identity",
    ),
  },
  {
    name: "CHECK 느슨: 출처 정체의 COALESCE (NULL 이 통과한다)",
    replace: [
      [
        `), FALSE)),\n  -- 살아 있는 문항을 가리키면`,
        `), NULL)),\n  -- 살아 있는 문항을 가리키면`,
      ],
    ],
  },
  {
    name: "CHECK 뗌: 살아 있는 문항 정체",
    sql: dropConstraint(
      "textbook_problem_snapshot",
      "textbook_problem_snapshot_problem_identity",
    ),
  },
  {
    name: "CHECK 뗌: QR 주소",
    sql: dropConstraint("textbook_qr_target", "textbook_qr_target_url_check"),
  },
  {
    name: "CHECK 뗌: QR 대상 짝",
    sql: dropConstraint("textbook_qr_target", "textbook_qr_target_target_pair"),
  },
  {
    name: "CHECK 뗌: 배정 대상 하나",
    sql: dropConstraint(
      "textbook_assignment",
      "textbook_assignment_target_xor",
    ),
  },
  {
    name: "CHECK 뗌: 배정 범위 짝",
    sql: dropConstraint(
      "textbook_assignment",
      "textbook_assignment_scope_ids_check",
    ),
  },
  {
    name: "CHECK 뗌: 걸음의 끝 조건",
    sql: dropConstraint(
      "textbook_publish_step",
      "textbook_publish_step_done_result",
    ),
  },
  {
    name: "CHECK 뗌: 걸음의 임대",
    sql: dropConstraint(
      "textbook_publish_step",
      "textbook_publish_step_running_lease",
    ),
  },
  {
    name: "CHECK 뗌: 바이트 크기",
    sql: dropConstraint("textbook_blob", "textbook_blob_size_check"),
  },
  {
    name: "CHECK 뗌: 조각 크기",
    sql: dropConstraint(
      "textbook_upload_chunk",
      "textbook_upload_chunk_bytes_check",
    ),
  },
  {
    name: "CHECK 뗌: 학생 형식",
    sql: dropConstraint(
      "textbook_concept_attempt",
      "textbook_concept_attempt_student_form",
    ),
  },
  {
    name: "CHECK 뗌: 요청의 결과",
    sql: dropConstraint("textbook_request", "textbook_request_done_result"),
  },
  // ── RLS · 권한 ──
  {
    name: "RLS 끔: 바이트 표",
    sql: `ALTER TABLE "textbook_blob" DISABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "권한 줌: anon 이 책을 읽는다",
    sql: `GRANT SELECT ON "textbook" TO anon;`,
  },
  {
    name: "REVOKE 뺌: authenticated",
    replace: [
      [
        `FOREACH v_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP`,
        `FOREACH v_role IN ARRAY ARRAY['anon'] LOOP`,
      ],
    ],
  },
];

function runTests(mutation: Mutation | null): {
  failed: number;
  passed: number;
  ok: boolean;
} {
  const result = spawnSync(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "run", "src/__tests__/unit/textbookDdl"],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        TEXTBOOK_DDL_MUTATION: mutation
          ? JSON.stringify({ sql: mutation.sql, replace: mutation.replace })
          : "",
      },
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  const output = `${result.stdout}\n${result.stderr}`;
  const line = output.match(/Tests\s+(?:(\d+) failed \| )?(\d+) passed/);
  const suites = /Failed Suites/.test(output);
  return {
    failed: line?.[1] ? Number(line[1]) : 0,
    passed: line?.[2] ? Number(line[2]) : 0,
    // 묶음째 죽었으면(하네스가 던졌다) «물었다»가 아니라 변이가 잘못 걸린 것이다
    ok: result.status === 0 && !suites,
  };
}

const filters = process.argv.slice(2);
const chosen = filters.length
  ? MUTATIONS.filter((m) => filters.some((f) => m.name.includes(f)))
  : MUTATIONS;

const control = runTests(null);
console.log(
  `대조군(변이 없음): ${control.passed} 통과 · ${control.failed} 실패`,
);
if (!control.ok || control.passed === 0) {
  console.error("대조군이 초록이 아니다 — 변이를 재기 전에 시험부터 고친다.");
  process.exit(1);
}

const survived: string[] = [];
const broken: string[] = [];
for (const mutation of chosen) {
  const result = runTests(mutation);
  const total = result.failed + result.passed;
  if (total === 0) {
    broken.push(mutation.name);
    console.log(
      `  ?  ${mutation.name} — 시험이 한 줄도 안 돌았다(변이가 한 곳에 안 걸렸다)`,
    );
  } else if (result.failed === 0) {
    survived.push(mutation.name);
    console.log(`  ✗  ${mutation.name} — 안 물었다 (${result.passed} 통과)`);
  } else {
    console.log(`  ✓  ${mutation.name} — 물었다 (${result.failed} 실패)`);
  }
}
console.log(
  `\n변이 ${chosen.length}개 · 물었다 ${chosen.length - survived.length - broken.length} · 안 물었다 ${survived.length} · 잘못 걸림 ${broken.length}`,
);
if (survived.length || broken.length) process.exit(1);

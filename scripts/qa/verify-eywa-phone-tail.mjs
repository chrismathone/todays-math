/** In-memory PostgreSQL verification of the actual source/target migrations; no application URL or credentials. */
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const sourceRoot = process.argv[process.argv.indexOf("--source-root") + 1];
assert(
  process.argv.includes("--source-root") && sourceRoot,
  "--source-root required",
);
const pg = new PGlite();
const fixture = `
create role anon; create role authenticated; create role service_role;
create schema tm_sync_private;
create table tm_sync_private.bindings(id uuid primary key,tenant_id uuid);
create table tm_sync_private.class_state(binding_id uuid,class_id uuid,permission_revision bigint);
create table tm_sync_private.content_dirty(binding_id uuid primary key,changed_at timestamptz default clock_timestamp());
create table tm_sync_private.function_contract(signature text primary key,definition_hash text);
create table public.classes(id uuid primary key,tenant_id uuid,subject text,class_name text,is_active boolean,closed_at date,teacher_id uuid);
create table public.students(id uuid primary key,tenant_id uuid,name text,grade text,school text,status text,is_test boolean,withdrawn_at date,student_phone text,parent_phone text);
create table public.enrollments(id uuid,tenant_id uuid,student_id uuid,class_id uuid,start_date date,end_date date,on_hold boolean,is_transferred boolean,attendance_days text[]);
create table public.super_admins(id uuid);
create table public.lesson_reports(id uuid,tenant_id uuid,student_id uuid,class_id uuid,makeup_class_id uuid,report_date date,created_at timestamptz,progress text,subject text);
create function public.class_period_closed_end(uuid) returns date language sql as 'select null::date';
create function public.tm_sync_control(uuid) returns jsonb language sql as 'select jsonb_build_object(''users'',''[]''::jsonb)';
create function tm_sync_private.memberships(uuid) returns table(id uuid,class_id uuid,user_id uuid,member_role text,starts_on date,ends_on date,revoked_at timestamptz,capabilities text[]) language sql as 'select null::uuid,null::uuid,null::uuid,null::text,null::date,null::date,null::timestamptz,null::text[] where false';
create function tm_sync_private.iso(timestamptz) returns text language sql as 'select to_char($1,''YYYY-MM-DD"T"HH24:MI:SS.US"Z"'')';
create function tm_sync_private.hash(text) returns text language sql as 'select md5($1)';
create function tm_sync_private.wake(uuid) returns void language plpgsql as 'begin return; end';
insert into tm_sync_private.bindings values('30000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001');
insert into public.classes values('40000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','math','활성반',true,null,null);
insert into public.students values('50000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','김민서','초6',null,'enrolled',false,null,'010-1234-0042','010-5555-6789');
insert into public.enrollments values('60000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000001','40000000-0000-0000-0000-000000000001','2026-01-01',null,false,false,'{}');
`;
try {
  await pg.exec(fixture);
  const oldMigration = await readFile(
    path.join(sourceRoot, "supabase/migrations/0337a_todays_math_sync_v2.sql"),
    "utf8",
  );
  const contentFunction = oldMigration.match(
    /create or replace function tm_sync_private\.capture_content\(\)[\s\S]*?end; \$\$;/,
  )?.[0];
  assert(contentFunction, "actual source trigger function must be loaded");
  await pg.exec(contentFunction);
  const migration = await readFile(
    path.join(
      sourceRoot,
      "supabase/migrations/20261004060214_todays_math_student_phone_tail.sql",
    ),
    "utf8",
  );
  await pg.exec(migration);
  await pg.exec(migration);
  const scalar = async (sql) => (await pg.query(sql)).rows[0].value;
  const exporter = () =>
    scalar(
      "select tm_sync_private.export_rows('30000000-0000-0000-0000-000000000001') value",
    );
  const exported = await exporter();
  assert.equal(exported.collections.students[0].phoneLast4, "0042");
  assert(!JSON.stringify(exported).includes("010-1234"));
  assert(!JSON.stringify(exported).includes("010-5555"));
  const { studentSchema } = await import(
    pathToFileURL(
      path.join(
        sourceRoot,
        "src/features/integrations/todays-math/sync-contract.ts",
      ),
    ).href
  );
  studentSchema.parse(exported.collections.students[0]);
  await pg.exec(
    "delete from tm_sync_private.content_dirty; update public.students set student_phone=null;",
  );
  assert.equal((await exporter()).collections.students[0].phoneLast4, "6789");
  assert.equal(
    await scalar(
      "select count(*)::int value from tm_sync_private.content_dirty",
    ),
    1,
  );
  await pg.exec("update public.students set parent_phone='DO_NOT_EXPORT';");
  assert.equal((await exporter()).collections.students[0].phoneLast4, null);
  assert.equal(
    await scalar(
      "select has_function_privilege('authenticated','tm_sync_private.contact_phone_last4(text,text)','execute') value",
    ),
    false,
  );
  assert.equal(
    await scalar(
      "select count(*)::int value from tm_sync_private.function_contract where definition_hash <> tm_sync_private.hash(pg_get_functiondef(to_regprocedure(signature)))",
    ),
    0,
  );
  console.log(
    "PASS source SQL migration and rerun, registered phone preference/fallback/clear, wire parsing, privacy, content invalidation, private privileges and health fingerprints",
  );

  await pg.exec(
    'create table "student"(id uuid); create table "student_account"(login_id varchar(20));',
  );
  await pg.exec(
    await readFile(
      "prisma/migrations/20261004063000_student_bulk_account_defaults/migration.sql",
      "utf8",
    ),
  );
  await pg.exec(
    "insert into student(phone_last4) values('0042'),(null); insert into student_account(login_id) values('김민서');",
  );
  await assert.rejects(
    pg.exec("insert into student(phone_last4) values('abcd')"),
  );
  await assert.rejects(
    pg.exec("insert into student(phone_last4) values('123')"),
  );
  console.log(
    "PASS target SQL migration, Korean login storage, four-digit constraint including leading zeros and missing contacts",
  );
} finally {
  await pg.close();
}

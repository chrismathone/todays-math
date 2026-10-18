/**
 * 월말평가 성적표 PDF 의 **비공개** 버킷(앱 Supabase 프로젝트) — 원장님 승인 2026-10-18(PDF 는 DB 밖 비공개 저장소).
 *
 *   npx tsx --env-file=<main>/.env scripts/qa/create-exam-report-bucket.mts            # 드라이런 — 있는지 보기만
 *   ALLOW_SHARED_IMPORT=1 npx tsx --env-file=<main>/.env scripts/qa/create-exam-report-bucket.mts --apply
 *
 * 만들기만 한다 — 버킷을 비우거나 지우지 않는다. 있으면 «비공개 · PDF 만 · 4MB» 인지 확인만 하고, 다르면 멈춘다(고치지 않는다).
 * 키 · 주소는 출력하지 않는다.
 */
const BUCKET = "exam-report-private";
const MAX_BYTES = 4_000_000;
const APPLY = process.argv.includes("--apply");

if (APPLY && process.env.ALLOW_SHARED_IMPORT !== "1") {
  console.error("공유 저장소 쓰기가 막혀 있다. ALLOW_SHARED_IMPORT=1 과 --apply 가 둘 다 필요하다.");
  process.exit(1);
}
const url = process.env.SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SECRET_KEY ?? "";
if (!/^https:\/\/[a-z0-9]{20}\.supabase\.co$/.test(url) || !key) {
  console.error("SUPABASE_URL · SUPABASE_SECRET_KEY 가 없다(값은 출력하지 않는다).");
  process.exit(1);
}
const headers: Record<string, string> = /^sb_secret_/.test(key)
  ? { apikey: key }
  : { apikey: key, Authorization: `Bearer ${key}` };

type Bucket = {
  id?: string;
  public?: boolean;
  file_size_limit?: number | null;
  allowed_mime_types?: string[] | null;
};
async function read(): Promise<Bucket | null> {
  const response = await fetch(`${url}/storage/v1/bucket/${BUCKET}`, { headers });
  if (response.status === 404 || response.status === 400) {
    const body = (await response.json().catch(() => ({}))) as { statusCode?: string; error?: string };
    if (String(body.statusCode) === "404" || /not.?found/i.test(String(body.error))) return null;
    throw new Error(`버킷 조회 실패 ${response.status}`);
  }
  if (!response.ok) throw new Error(`버킷 조회 실패 ${response.status}`);
  return (await response.json()) as Bucket;
}
function sound(b: Bucket) {
  return (
    b.id === BUCKET &&
    b.public === false &&
    b.file_size_limit === MAX_BYTES &&
    JSON.stringify(b.allowed_mime_types) === JSON.stringify(["application/pdf"])
  );
}

const before = await read();
console.log(`버킷 ${BUCKET}: ${before ? `있음 · 공개 ${before.public} · 상한 ${before.file_size_limit} · 형식 ${JSON.stringify(before.allowed_mime_types)}` : "없음"}`);
if (before) {
  if (!sound(before)) throw new Error("있는 버킷이 «비공개 · PDF 만 · 4MB» 가 아니다 — 고치지 않고 멈춘다.");
  console.log("이미 맞게 있다. 아무것도 하지 않는다.");
} else if (!APPLY) {
  console.log("드라이런 — 만들지 않았다.");
} else {
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: false,
      file_size_limit: MAX_BYTES,
      allowed_mime_types: ["application/pdf"],
    }),
  });
  if (!response.ok) throw new Error(`버킷 만들기 실패 ${response.status}`);
  const after = await read();
  if (!after || !sound(after)) throw new Error("만든 뒤 확인이 기대와 다르다");
  console.log("만들었다 · 비공개 · PDF 만 · 4MB 확인.");
}

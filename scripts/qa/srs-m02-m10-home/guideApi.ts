// Vite-only boundary adapter: the real GuideProvider calls these in-memory
// reads/writes. No HTTP, account, record or database is involved.
import type { GuideId, StoredGuide } from "@/contracts/mathSrsGuide.contract";
const params = new URLSearchParams(location.search);
let saved: StoredGuide | null =
  params.get("guide") === "new"
    ? null
    : {
        id: "marten",
        chosenAt: "2026-10-20T00:00:00Z",
      };
export async function getGuide() {
  return { ok: true as const, data: saved };
}
export async function saveGuide(id: GuideId) {
  if (params.get("save") === "fail")
    return { ok: false as const, status: 503, message: "로컬 저장 실패" };
  if (saved?.id !== id) saved = { id, chosenAt: "2026-10-21T00:00:00Z" };
  return { ok: true as const, data: saved };
}

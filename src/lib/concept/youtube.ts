/**
 * 유튜브 주소 → 11자 영상 ID · 정규 watch 주소 · nocookie 임베드 (D-123 ⑥′).
 *
 * 수맥 `packages/core/src/media/youtube.ts` 를 옮겨 왔다. **판정 규칙은 한 글자도 안
 * 바꿨다** — 이 규칙은 우리 데이터(차시·`Unit`)와 무관하게 «유튜브 주소가 무엇인가»만
 * 묻기 때문이다. 더한 것은 판정과 정규화를 한 번에 하는 `normalizeYouTubeUrl` 하나다.
 *
 * 호스트를 유튜브로 좁히는 이유는 두 가지다. 하나는 학생 화면에서 `youtube-nocookie`
 * 임베드로 재생하려면 ID 가 필요하기 때문이고, 다른 하나는 임의 URL 을 받으면 그 페이지가
 * 우리 화면 안에서 무엇이든 할 수 있기 때문이다.
 *
 * 저장은 항상 정규화된 `https://www.youtube.com/watch?v=<id>` 형태로 한다 — 같은 영상이
 * 단축·공유·임베드 주소로 여러 번 등록되는 것을 막는다(등록 계획기의 «같은 영상 주소»
 * 중복 판정이 이 정규형끼리 견준다).
 *
 * **유일본이다.** 우리 쪽에서 이 판정을 부르는 곳이 셋이다 — meta.json 해석
 * (`lectureMeta.ts`) · 계약의 저장 형태(`src/contracts/conceptLecture.contract.ts`) ·
 * 게시 관문(`publishGate.ts`). 한쪽이 사본을 들면, 한쪽만 고쳐진 날 CLI 로 넣은 주소가
 * 학생 화면에서 임베드되지 않는 식으로 갈라진다(수맥 머리말).
 */

const HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
]);

/** 유튜브 영상 ID 는 11자 `[A-Za-z0-9_-]` */
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeId(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (!HOSTS.has(host)) return null;

  /* 경로별로 ID 가 어디 있는지가 다르다 — **경로를 먼저 보고** 그 자리에서만 읽는다.
   * 수맥은 예전에 `v` 쿼리를 경로와 무관하게 먼저 읽어서 `youtube.com/@아무채널?v=<11자>`
   * 같은 주소가 통과했고, 그것이 정규 watch 주소로 저장돼 학생 화면에는 엉뚱한 영상이
   * 임베드됐다(수맥 실측 결함 — 변이 ① 이 이 자리를 겨눈다). */
  const path = url.pathname.replace(/\/$/, "");
  const id =
    host === "youtu.be"
      ? path.slice(1)
      : path === "/watch"
        ? url.searchParams.get("v")
        : path.startsWith("/embed/")
          ? path.slice(7)
          : path.startsWith("/shorts/")
            ? path.slice(8)
            : null;
  if (!id) return null;
  return VIDEO_ID.test(id) ? id : null;
}

/** 저장용 정규 주소 */
export function youTubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`;
}

/** 학생 화면 임베드용 — 추적 쿠키를 줄이는 nocookie 도메인 */
export function youTubeEmbedUrl(watchUrl: string): string | null {
  const id = parseYouTubeId(watchUrl);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/**
 * 붙여넣은 주소 → 저장 후보(정규 watch 주소). 유튜브가 아니면 null.
 *
 * 계약의 저장 형태는 정규 watch 주소만 받는다. 부르는 쪽이 `parseYouTubeId` 와
 * `youTubeWatchUrl` 을 따로 이으면, 한쪽이 판정을 빠뜨린 날 날것의 주소가 저장된다 —
 * 그래서 저장 후보로 바꾸는 길을 이것 하나로 둔다.
 */
export function normalizeYouTubeUrl(raw: string): string | null {
  const id = parseYouTubeId(raw);
  return id ? youTubeWatchUrl(id) : null;
}

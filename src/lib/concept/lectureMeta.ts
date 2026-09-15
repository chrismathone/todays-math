/**
 * 제작 도구(`D:\hyper motion video`)의 `output/meta.json` 해석 (D-123 ⑥′).
 *
 * 수맥 `packages/core/src/media/lecture-meta.ts` 를 옮겨 왔다. 도구는 CLI 만 있고
 * 라이브러리 진입점이 없어서 연결은 **파일을 건네받는** 형태다. 지금 우리 쪽에서 이
 * 파서를 부르는 곳은 등록 계획기(`registerPlan.ts`) 하나다 — 원장님 화면의 「메타
 * 붙여넣기」가 생기면(D-07 시안 뒤) **이 파서를 불러야 한다.** 폼과 CLI 가 같은 파일을
 * 다르게 읽으면 같은 meta.json 이 한쪽에서만 통과하고, 어느 쪽이 옳은지 아무도 답할 수 없다.
 *
 * 실패는 «왜 못 읽었는지»를 말한다 — 조용히 빈 값을 남기면 사람이 뭘 잘못했는지 모른 채
 * 다시 시도한다(수맥 원칙 그대로).
 *
 * ## 수맥에서 바뀐 전제 (보고서 §2)
 *
 * - **붙는 자리 = 차시.** 수맥은 `conceptSlug`(개념)를 읽었다. 우리는 `unitCode` =
 *   `Unit.problemCodePrefix`(예 `J30501`)를 읽는다. **선택 필드**다 — 없으면 null 이고
 *   CLI 가 `--unit` 을 요구한다. **차시를 지어내지 않는다.** 형식이 틀리면 조용히 비우지
 *   않고 실패한다(`video_url` 과 같은 원칙). 형식은 `UNIT_CODE_PATTERN` 한 곳에서 온다.
 * - `conceptSlug`·`pageId` 는 도구가 아직 쓰므로 **받아들이되 무시**한다 — 결과에 싣지
 *   않는다. 실어 두면 누군가 그것으로 차시를 짐작한다.
 * - `jobId` 가 공백이면 null. 수맥은 문자열이면 그대로 담았다. 우리에게 잡 ID 는 멱등
 *   열쇠(같은 잡은 두 번 안 만든다)이자 게시 관문의 «도구가 만든 강의» 판정이라, 공백이
 *   들어오면 둘 다 틀린다.
 */
import { UNIT_CODE_PATTERN } from "@/contracts/problemCode.contract";

import { normalizeYouTubeUrl } from "./youtube";

const UNIT_CODE = new RegExp(UNIT_CODE_PATTERN);

export interface LectureMeta {
  title: string;
  /** 총 길이(초). fps·프레임 수에서 유도한다 — meta.json 에 초 단위 필드가 없다 */
  seconds: number;
  /**
   * AI 고지 — 도구가 「선생님이 검수한 AI 보충 강의입니다.」를 넣는다. 없으면 null
   * (지어내지 않는다). 수맥은 이 값을 저장할 자리가 없어 학생이 AI 강의를 사람 강의와
   * 구별할 수 없었다(0012a 머리말).
   */
  disclosure: string | null;
  /** 도구의 잡 ID — 재생성·추적의 연결 고리이자 등록 멱등 열쇠 */
  jobId: string | null;
  /** 업로드 스크립트가 기록한 유튜브 주소를 정규형으로. 없으면 null */
  videoUrl: string | null;
  /** 어느 차시에 붙일 강의인가 (`Unit.problemCodePrefix`). 없으면 null — 지어내지 않는다 */
  unitCode: string | null;
  /** 같은 차시에 여러 편이 붙을 때의 순서. 없으면 null — 등록 경로가 기본값 0 을 쓴다 */
  sortOrder: number | null;
}

export type LectureMetaResult =
  { ok: true; meta: LectureMeta } | { ok: false; message: string };

function trimmedOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseLectureMeta(raw: string): LectureMetaResult {
  const text = raw.trim();
  if (!text) return { ok: false, message: "붙여넣은 내용이 없습니다." };

  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return {
      ok: false,
      message:
        "JSON으로 읽을 수 없습니다. meta.json 파일 내용을 통째로 붙여넣으세요.",
    };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) {
    return { ok: false, message: "meta.json 형식이 아닙니다." };
  }
  const m = data as Record<string, unknown>;

  const title = typeof m.lessonTitle === "string" ? m.lessonTitle.trim() : "";
  if (!title) {
    return {
      ok: false,
      message: "lessonTitle이 없습니다. 강의 meta.json이 맞는지 확인하세요.",
    };
  }

  const fps = typeof m.fps === "number" ? m.fps : 0;
  const frames = typeof m.totalFrames === "number" ? m.totalFrames : 0;
  if (fps <= 0 || frames <= 0) {
    return {
      ok: false,
      message: "fps·totalFrames가 없어 길이를 계산할 수 없습니다.",
    };
  }

  /* video_url 이 있는데 유튜브 주소가 아니면 **버리지 않고 실패**로 만든다. 조용히 비우면
   * 사람은 주소가 채워진 줄 알고 넘어간다 — 그리고 우리 쪽은 **주소 없는 초안을 허용하므로**
   * (브리프 §2.1) 수맥처럼 등록 단계에서 막히지도 않고 그대로 초안이 된다. 실수를 가장
   * 이른 자리에서 말하는 것이 이 파서의 일이다(변이 ⑥ 이 이 자리를 겨눈다). */
  const rawUrl = typeof m.video_url === "string" ? m.video_url.trim() : "";
  let videoUrl: string | null = null;
  if (rawUrl) {
    videoUrl = normalizeYouTubeUrl(rawUrl);
    if (videoUrl === null) {
      return {
        ok: false,
        message:
          "video_url이 유튜브 주소가 아닙니다. 업로드 스크립트가 기록한 meta.json이 맞는지 확인하세요.",
      };
    }
  }

  /* unitCode 도 같은 원칙이다 — 형식이 틀린 값을 비우면 CLI 가 `--unit` 을 달라고 하고,
   * 사람은 meta.json 의 오타를 모른 채 손으로 **다른** 차시를 넣는다. */
  let unitCode: string | null = null;
  if (m.unitCode !== undefined && m.unitCode !== null) {
    const code = typeof m.unitCode === "string" ? m.unitCode.trim() : null;
    if (code === null || (code !== "" && !UNIT_CODE.test(code))) {
      return {
        ok: false,
        message:
          "unitCode가 차시 코드 형식이 아닙니다(예: J30501). meta.json을 확인하세요.",
      };
    }
    unitCode = code || null;
  }

  /* sortOrder 는 DB 컬럼과 같은 범위(0~999 정수)에서만 받는다. 벗어난 값을 조용히 0 으로
   * 접으면 순서가 뒤섞인 채 등록되고, 아무도 왜인지 모른다. */
  let sortOrder: number | null = null;
  if (m.sortOrder !== undefined && m.sortOrder !== null) {
    const n = typeof m.sortOrder === "number" ? m.sortOrder : NaN;
    if (!Number.isInteger(n) || n < 0 || n > 999) {
      return { ok: false, message: "sortOrder는 0~999 사이 정수여야 합니다." };
    }
    sortOrder = n;
  }

  return {
    ok: true,
    meta: {
      title,
      seconds: Math.round(frames / fps),
      disclosure: trimmedOrNull(m.disclosure),
      jobId: trimmedOrNull(m.jobId),
      videoUrl,
      unitCode,
      sortOrder,
    },
  };
}

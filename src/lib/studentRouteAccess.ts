/**
 * 학생 관문 — 「학생 세션이 어디까지 갈 수 있나」를 **한 곳에서** 정한다 (D-124 ⑶ · D-125 ⑷).
 *
 * 부르는 곳: src/proxy.ts (학생 갈래 · 로그인 안 한 사람의 `/learn` 갈래)
 * 규칙의 짝: src/lib/routeAccess.ts (검수 계정) — 같은 원칙, 같은 경로 문법(`{id}` 한 칸, 끝의 `/**`)을
 *            그 파일의 `compileRoutePattern` 으로 만든다(규칙 문법을 두 벌로 적지 않는다).
 *
 * 🔴 **허용 목록이다.** 학생 세션은 영상 시청과 본인의 기억 학습을 연다. 새 학생 화면·API·서버 액션이
 *    생기면 **여기 적어야** 열린다 — 잊으면 닫히고, 그 편이 안전하다(routeAccess.ts 머리말과 같다).
 *    ⚠️ 서버 액션은 **자기 페이지 주소로 POST** 한다. 학생 화면에 서버 액션을 넣으면 그 페이지의
 *    POST 를 여기 적어야 한다(2026-08-25 검수 계정 로그아웃이 그렇게 막혔다). 지금 학생 쪽 쓰기는
 *    `/api/learn/**` 라우트와 브라우저 오류 보고(`/api/logs/client`, 원장님 2026-09-22)뿐이라
 *    페이지 POST 는 하나도 열지 않았다.
 *
 * 🔴 학생 세션은 `session.user` 가 **없다**(src/lib/auth.ts). 기존 관문은 `user.id` 가 없으면
 *    «로그인 안 한 사람»으로 보고 `/` · `/api/**` 를 열어 둔다 — 그래서 학생 갈래를 원장 갈래보다
 *    **먼저** 태운다. 여기서 막지 않으면 학생은 «로그인 안 한 사람»이 볼 수 있는 것을 다 본다.
 */
import { CLIENT_LOG_ENDPOINT } from "@/contracts/errorLogValues";
import { compileRoutePattern, normalizeRoutePathname } from "@/lib/routeAccess";

export type LearnGate =
  | { kind: "allow" }
  | { kind: "redirect"; to: string }
  | { kind: "forbidden"; message: string };

export const STUDENT_HOME = "/learn";
export const STUDENT_PASSWORD_PAGE = "/learn/password";
export const STUDENT_LOGIN_PAGE = "/learn/login";
export const STUDENT_FORBIDDEN_MESSAGE =
  "학생 계정은 이 기능을 쓸 수 없습니다.";
export const STUDENT_MUST_CHANGE_MESSAGE =
  "비밀번호를 바꾼 뒤 이용할 수 있습니다.";
/** 요청이 로그인한 학생이 아닌 학생의 것 — 라우트 거절과 화면 안내가 같은 말을 한다(05 §8.21). */
export const STUDENT_CHANGED_MESSAGE =
  "로그인한 학생이 바뀌었어요. 다시 불러와 주세요.";

type Rule = { methods: readonly string[]; path: string; why: string };

const PAGE = ["GET", "HEAD"] as const;

const PASSWORD_RULES: readonly Rule[] = [
  { methods: PAGE, path: STUDENT_PASSWORD_PAGE, why: "비밀번호 바꾸기 화면" },
  { methods: ["POST"], path: "/api/learn/password", why: "비밀번호 바꾸기" },
];

/** 나가기 · 세션 — 어떤 상태의 학생도 **갇히면 안 된다**(D-77 «잘못된 계정에 갇히면 안 된다») */
const EXIT_RULES: readonly Rule[] = [
  { methods: ["POST"], path: "/api/learn/logout", why: "학생 로그아웃" },
  {
    methods: ["GET"],
    path: "/api/auth/session",
    why: "지금 누구인가 (session.student)",
  },
  { methods: ["GET"], path: "/api/auth/csrf", why: "Auth.js 로그아웃 토큰" },
  { methods: ["POST"], path: "/api/auth/signout", why: "Auth.js 로그아웃" },
];

/** 학생 화면이 쓰는 브랜드 이미지 — 로그인 전에도 공개된 것들이다 */
const BRAND_RULES: readonly Rule[] = [
  { methods: PAGE, path: "/favicon.ico", why: "탭 아이콘" },
  { methods: PAGE, path: "/icon.svg", why: "탭 아이콘" },
  { methods: PAGE, path: "/apple-icon.png", why: "홈 화면 아이콘" },
  { methods: PAGE, path: "/brand/**", why: "로고" },
  {
    methods: PAGE,
    path: "/images/journey/**",
    why: "진도판 테마 그림(판 · 탈것) — 공개 그림",
  },
];

/**
 * 테스트 도구판(원장님 2026-09-28) — 경로만 연다. **시험용 계정인지는 라우트가 DB 로 본다**(아니면 404).
 * 첫 로그인 상태에서도 연다: 도구판이 그 상태를 만들 수 있으니 되돌리는 길도 있어야 한다.
 */
const TEST_CONSOLE_RULES: readonly Rule[] = [
  {
    methods: ["GET", "POST"],
    path: "/api/learn/test-console",
    why: "시험용 학생 계정의 테스트 도구판 — 라우트가 계정을 다시 확인",
  },
];

/** 첫 비밀번호를 바꾼 학생 — 목록 → 재생(D-124 ⑵) */
const ACTIVE_RULES: readonly Rule[] = [
  {
    methods: PAGE,
    path: "/audio/math-learning/**",
    why: "학생 수학 학습의 공개 효과음",
  },
  {
    methods: PAGE,
    path: "/q/{id}",
    why: "배정된 교재의 QR — 서버가 매 요청 권한 확인",
  },
  {
    methods: PAGE,
    path: "/concept-blank/scan",
    why: "개념 백지 QR 촬영 — 발행 교사의 현재 학생만 서버에서 허용",
  },
  {
    methods: ["GET"],
    path: "/api/concept-blank/scan/issued/{id}",
    why: "본인에게 허용된 발행 지면",
  },
  {
    methods: ["POST"],
    path: "/api/concept-blank/scan/submissions",
    why: "본인의 답안 시작",
  },
  {
    methods: ["GET"],
    path: "/api/concept-blank/scan/submissions/{id}",
    why: "본인의 답안 상태·공개된 결과",
  },
  {
    methods: ["POST"],
    path: "/api/concept-blank/scan/submissions/{id}/photos",
    why: "본인의 공개 전 답안 사진",
  },
  {
    methods: ["GET"],
    path: "/api/concept-blank/scan/submissions/{id}/photos/{id}",
    why: "본인 사진의 짧은 열람 주소",
  },
  {
    methods: ["POST"],
    path: "/api/concept-blank/scan/submissions/{id}/answers",
    why: "본인의 공개 전 판독 정정",
  },
  {
    methods: ["POST"],
    path: "/api/concept-blank/scan/submissions/{id}/jobs",
    why: "본인 답안 읽기·채점",
  },
  {
    methods: PAGE,
    path: "/learn/textbook/{id}/concepts/{id}",
    why: "교재에 실린 개념의 정확한 백지 활동",
  },
  {
    methods: ["GET"],
    path: "/api/learn/textbook/q/{id}",
    why: "배정된 교재 QR 내용",
  },
  {
    methods: PAGE,
    path: "/api/learn/textbook/q/{id}/assets/{id}",
    why: "배정된 QR 내용에서 참조하는 고정 자산",
  },
  {
    methods: ["GET"],
    path: "/api/learn/textbook/editions/{id}/concepts/{id}",
    why: "정답을 뺀 교재 백지",
  },
  {
    methods: ["GET", "POST"],
    path: "/api/learn/textbook/editions/{id}/concepts/{id}/attempts",
    why: "본인의 교재 백지 답변 기록",
  },
  {
    methods: ["POST"],
    path: "/api/learn/textbook/editions/{id}/concepts/{id}/review",
    why: "확인된 개념 연결의 기존 복습 활동 시작",
  },
  {
    methods: PAGE,
    path: "/learn/english-listening",
    why: "배정된 영어듣기 목록",
  },
  {
    methods: PAGE,
    path: "/learn/english-listening/{id}",
    why: "본인의 영어듣기 학습·응시",
  },
  {
    methods: ["GET"],
    path: "/api/english/learn/listening",
    why: "본인에게 배정된 듣기 목록",
  },
  {
    methods: ["GET"],
    path: "/api/english/learn/listening/{id}",
    why: "본인의 듣기 상태와 공개된 학습 자료",
  },
  {
    methods: ["POST"],
    path: "/api/english/learn/listening/{id}/prepare",
    why: "듣기 응시 준비 — 시험 시계는 시작하지 않음",
  },
  {
    methods: ["POST"],
    path: "/api/english/learn/listening/{id}/commands",
    why: "본인의 듣기 시작·답안 저장·제출",
  },
  {
    methods: PAGE,
    path: "/api/english/learn/listening/{id}/media/{id}",
    why: "본인에게 허용된 듣기 음원",
  },
  {
    methods: PAGE,
    path: "/api/english/learn/listening/sound-check",
    why: "시험 시작 전 기기 소리 확인",
  },
  {
    methods: PAGE,
    path: "/learn/math-explorers",
    why: "학생별 개념 탐험과 기억 복습",
  },
  {
    methods: ["GET", "POST"],
    path: "/api/learn/math-explorers",
    why: "본인의 개념 학습 조회·제출·보상 저장",
  },
  {
    methods: ["GET", "POST"],
    path: "/api/learn/math-srs/replay",
    why: "본인이 완료한 문제 다시 풀기 · 요청한 풀이 보기",
  },
  { methods: PAGE, path: STUDENT_HOME, why: "하나의 수학 탐험 홈" },
  { methods: PAGE, path: "/learn/lectures", why: "내 강의 자료" },
  { methods: PAGE, path: STUDENT_PASSWORD_PAGE, why: "비밀번호 바꾸기 화면" },
  { methods: PAGE, path: "/learn/watch/{id}", why: "재생 화면" },
  {
    methods: PAGE,
    path: "/learn/math-srs",
    why: "학생 계정에 저장하는 오늘의 기억",
  },
  {
    methods: PAGE,
    path: "/learn/math-srs/algebra",
    why: "중등 방정식 기억 학습",
  },
  {
    methods: ["GET", "POST"],
    path: "/api/learn/math-srs/course",
    why: "초등 기억 학습 조회 · 자동 미션 시작",
  },
  {
    methods: ["POST"],
    path: "/api/learn/math-srs/course/attempts",
    why: "초등 현재 문제 답안 제출",
  },
  {
    methods: ["POST"],
    path: "/api/learn/math-srs/course/hint",
    why: "초등 현재 문제 힌트 확인",
  },
  {
    methods: ["POST"],
    path: "/api/learn/math-srs/course/follow-up",
    why: "초등 첫 오답 뒤 두 번째 답 · «알겠어요»(계획서 §3.2)",
  },
  {
    methods: ["GET"],
    path: "/api/learn/math-srs/course/figure",
    why: "본인 학습 문제의 도형",
  },
  {
    methods: ["GET", "POST"],
    path: "/api/learn/math-srs/guide",
    why: "본인 길잡이 조회 · 고르기(계획서 §2 결정 10)",
  },
  {
    methods: PAGE,
    path: "/images/guides/**",
    why: "길잡이 그림(첫 화면 · 하루 마침) — 고른 학생이 보는 공개 그림",
  },
  {
    methods: ["GET", "POST"],
    path: "/api/learn/math-srs",
    why: "기억 학습 조회 · 오늘 미션 시작",
  },
  {
    methods: ["POST"],
    path: "/api/learn/math-srs/attempts",
    why: "현재 문제 답안 제출",
  },
  {
    methods: ["POST"],
    path: "/api/learn/math-srs/hint",
    why: "현재 문제 힌트 확인",
  },
  // «오늘의 기억» 새 앱(2026-10-06) — 서버 문(`MATH_FADING`)이 꺼져 있으면 화면도 라우트도 404 로 답한다.
  {
    methods: PAGE,
    path: "/learn/fading",
    why: "오늘의 기억 — 새 앱의 첫 화면",
  },
  {
    methods: PAGE,
    path: "/learn/fading/**",
    why: "오늘의 기억 — 새 앱의 화면(풀이 · 목록 · 통계 …)",
  },
  {
    methods: ["GET", "POST"],
    path: "/api/learn/fading",
    why: "오늘의 기억 — 본인의 복습 상태 조회 · 풀이와 평가 저장",
  },
  {
    methods: ["GET", "POST"],
    path: "/api/learn/fading/relearn",
    why: "오늘의 기억 — 본인의 단기 재학습 대기열 조회 · 확인의 답 저장",
  },
  {
    methods: ["GET"],
    path: "/api/learn/fading/catalog",
    why: "오늘의 기억 — 개념 목록",
  },
  {
    methods: ["GET"],
    path: "/api/learn/fading/concepts/{id}",
    why: "오늘의 기억 — 개념 하나의 내용",
  },
  {
    methods: ["GET"],
    path: "/api/learn/fading/daily",
    why: "오늘의 기억 — 본인의 오늘 할 일 조회(읽기뿐)",
  },
  { methods: ["GET"], path: "/api/learn/lectures", why: "강의 목록" },
  { methods: ["GET"], path: "/api/learn/lectures/{id}", why: "강의 하나" },
  { methods: ["POST"], path: "/api/learn/watch", why: "시청 기록" },
  { methods: ["POST"], path: "/api/learn/password", why: "비밀번호 바꾸기" },
  {
    methods: ["POST"],
    path: CLIENT_LOG_ENDPOINT,
    why: "브라우저 오류 보고 — 학생 화면의 오류도 모은다(원장님 2026-09-22). 보내기뿐, 읽는 것은 없다",
  },
  ...TEST_CONSOLE_RULES,
  ...EXIT_RULES,
  ...BRAND_RULES,
];

/** 🔴 첫 로그인(`mustChangePassword`) — 비밀번호 바꾸기 외에는 못 간다(브리프 §2.3) */
const MUST_CHANGE_RULES: readonly Rule[] = [
  ...PASSWORD_RULES,
  {
    methods: ["POST"],
    path: CLIENT_LOG_ENDPOINT,
    why: "브라우저 오류 보고 — 비밀번호 바꾸기 화면의 오류도 와야 한다(원장님 2026-09-22)",
  },
  ...TEST_CONSOLE_RULES,
  ...EXIT_RULES,
  ...BRAND_RULES,
];

const describeRules = (rules: readonly Rule[]) =>
  rules.map((r) => `${r.methods.join("|")} ${r.path}`);

/** 학생이 할 수 있는 것 전부 — 시험이 이것을 그대로 잠근다(늘거나 넓어지면 빨개진다). */
export const STUDENT_CAPABILITIES: readonly string[] =
  describeRules(ACTIVE_RULES);
export const STUDENT_MUST_CHANGE_CAPABILITIES: readonly string[] =
  describeRules(MUST_CHANGE_RULES);

type Compiled = readonly { methods: readonly string[]; re: RegExp }[];
const compile = (rules: readonly Rule[]): Compiled =>
  rules.map((r) => ({ methods: r.methods, re: compileRoutePattern(r.path) }));
const ACTIVE = compile(ACTIVE_RULES);
const MUST_CHANGE = compile(MUST_CHANGE_RULES);

function allowedBy(rules: Compiled, method: string, path: string): boolean {
  return rules.some((r) => r.methods.includes(method) && r.re.test(path));
}

const isApi = (path: string) => path === "/api" || path.startsWith("/api/");
const isPageRead = (method: string) => method === "GET" || method === "HEAD";

/**
 * 학생 세션의 요청 하나를 판정한다.
 *
 *  - 허용 목록 안 → 지나간다.
 *  - API → 403(JSON 은 관문이 만든다). 화면용 되돌림을 API 에 주면 fetch 가 HTML 을 파싱하다 죽는다.
 *  - 화면 GET/HEAD → `/learn`(첫 로그인이면 `/learn/password`)으로 되돌린다.
 *  - 화면에 GET 이 아닌 요청 → 403. 307 은 메서드를 들고 가므로 되돌리면 POST 가 돌고 돈다.
 */
export function studentGateFor(
  mustChangePassword: boolean,
  method: string,
  pathname: string,
): LearnGate {
  const path = normalizeRoutePathname(pathname);
  const m = method.toUpperCase();
  if (allowedBy(mustChangePassword ? MUST_CHANGE : ACTIVE, m, path))
    return { kind: "allow" };
  if (isApi(path)) {
    // 첫 로그인 학생이 «바꾸면 되는» 곳을 두드리면 까닭을 말해 준다
    const later = mustChangePassword && allowedBy(ACTIVE, m, path);
    return {
      kind: "forbidden",
      message: later ? STUDENT_MUST_CHANGE_MESSAGE : STUDENT_FORBIDDEN_MESSAGE,
    };
  }
  if (!isPageRead(m))
    return { kind: "forbidden", message: STUDENT_FORBIDDEN_MESSAGE };
  return {
    kind: "redirect",
    to: mustChangePassword ? STUDENT_PASSWORD_PAGE : STUDENT_HOME,
  };
}

/**
 * 로그인 안 한 사람의 `/learn` — 학생 로그인 화면으로 보낸다(D-125 ⑷ — 원장님 `/login` 과 섞지 않는다).
 * `/learn` 밖이면 `null` — 판정하지 않고 기존 관문에 맡긴다.
 */
export function anonymousLearnGate(
  method: string,
  pathname: string,
): LearnGate | null {
  const path = normalizeRoutePathname(pathname);
  if (path === "/concept-blank/scan" && isPageRead(method.toUpperCase()))
    return { kind: "allow" };
  if (
    /^\/q\/[A-Za-z0-9_-]{16,100}$/.test(path) &&
    isPageRead(method.toUpperCase())
  )
    return { kind: "redirect", to: STUDENT_LOGIN_PAGE };
  if (path !== STUDENT_HOME && !path.startsWith(`${STUDENT_HOME}/`))
    return null;
  if (path === STUDENT_LOGIN_PAGE) return { kind: "allow" };
  if (!isPageRead(method.toUpperCase()))
    return { kind: "forbidden", message: "로그인이 필요합니다." };
  return { kind: "redirect", to: STUDENT_LOGIN_PAGE };
}

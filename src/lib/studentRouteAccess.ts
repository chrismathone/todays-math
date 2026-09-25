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
];

/** 첫 비밀번호를 바꾼 학생 — 목록 → 재생(D-124 ⑵) */
const ACTIVE_RULES: readonly Rule[] = [
  {
    methods: ["GET", "POST"],
    path: "/api/learn/math-srs/replay",
    why: "본인이 완료한 문제 다시 풀기 · 요청한 풀이 보기",
  },
  { methods: PAGE, path: STUDENT_HOME, why: "강의 목록 화면" },
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
    path: "/api/learn/math-srs/course/plan",
    why: "본인의 시작 진도와 하루 학습량 설정",
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
    methods: ["GET"],
    path: "/api/learn/math-srs/course/figure",
    why: "본인 학습 문제의 도형",
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
  { methods: ["GET"], path: "/api/learn/lectures", why: "강의 목록" },
  { methods: ["GET"], path: "/api/learn/lectures/{id}", why: "강의 하나" },
  { methods: ["POST"], path: "/api/learn/watch", why: "시청 기록" },
  { methods: ["POST"], path: "/api/learn/password", why: "비밀번호 바꾸기" },
  {
    methods: ["POST"],
    path: CLIENT_LOG_ENDPOINT,
    why: "브라우저 오류 보고 — 학생 화면의 오류도 모은다(원장님 2026-09-22). 보내기뿐, 읽는 것은 없다",
  },
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
  if (path !== STUDENT_HOME && !path.startsWith(`${STUDENT_HOME}/`))
    return null;
  if (path === STUDENT_LOGIN_PAGE) return { kind: "allow" };
  if (!isPageRead(method.toUpperCase()))
    return { kind: "forbidden", message: "로그인이 필요합니다." };
  return { kind: "redirect", to: STUDENT_LOGIN_PAGE };
}

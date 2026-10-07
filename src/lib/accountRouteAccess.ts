import {
  normalizeWorkspaceMenus,
  type AccountAccess,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";

const under = (path: string, base: string) =>
  path === base || path.startsWith(`${base}/`);

/** Established admin SRS operations also work when workspace menus are disabled. */
export function srsTeacherManagementRoute(method: string, path: string) {
  return (
    (method === "GET" && path === "/api/math-srs/course") ||
    (["GET", "POST"].includes(method) &&
      /^\/api\/students\/[^/]+\/math-srs\/course$/.test(path)) ||
    (method === "GET" &&
      /^\/api\/students\/[^/]+\/math-srs\/explorers$/.test(path)) ||
    // «오늘의 기억» 새 앱의 교사 현황(2026-10-06) — 읽기 둘뿐이다.
    (method === "GET" && srsFadingTeacherPath(path))
  );
}

/** «오늘의 기억» 새 앱의 교사 현황 끝점 — 반 현황과 학생 하나. */
function srsFadingTeacherPath(path: string) {
  return (
    path === "/api/math-srs/fading" ||
    /^\/api\/students\/[^/]+\/math-srs\/fading$/.test(path)
  );
}

/** 공통 목록 읽기와 각 메뉴의 전용 쓰기를 구분한다. 알 수 없는 영어 경로는 거절한다. */
export function englishRouteAllowed(
  menus: readonly WorkspaceMenu[],
  method: string,
  path: string,
): boolean {
  const allowed = normalizeWorkspaceMenus(menus);
  const school = allowed.includes("english-school");
  const maker = allowed.includes("english-maker");
  const library = allowed.includes("english-library");
  const listening = allowed.includes("english-listening");
  const bank = allowed.includes("english-bank");
  const listeningMaterial = listening || bank;
  const read = method === "GET" || method === "HEAD";
  if (path === "/api/english/questions") return library && read;
  if (path === "/api/english/questions/resolve")
    return library && method === "POST";
  if (path === "/api/english/passages")
    return bank && (read || method === "POST");
  if (path === "/api/english/passages/import") return bank && method === "POST";
  if (/^\/api\/english\/passages\/[^/]+$/.test(path))
    return bank && (read || method === "PATCH" || method === "DELETE");
  if (/^\/api\/english\/passages\/[^/]+\/rights$/.test(path))
    return bank && method === "POST";
  if (/^\/api\/english\/passages\/[^/]+\/prepare$/.test(path))
    return bank && maker && method === "POST";
  if (/^\/api\/english\/passages\/[^/]+\/sets$/.test(path)) return bank && read;
  if (
    path === "/api/english/listening/bank" ||
    path === "/api/english/listening/references"
  )
    return bank && read;
  if (path === "/api/english/listening/compose")
    return bank && method === "POST";
  if (/^\/api\/english\/listening\/sets\/[^/]+\/compose-source$/.test(path))
    return bank && method === "GET";
  if (/^\/api\/english\/listening\/sets\/[^/]+\/source-transcripts$/.test(path))
    return bank && method === "GET";
  if (/^\/english\/listening\/sets\/[^/]+\/draft-print$/.test(path))
    return listeningMaterial && read;
  if (/^\/english\/listening\/sets\/[^/]+\/print$/.test(path))
    return listening && read;
  if (path === "/api/english/listening/sets")
    return listeningMaterial && (read || method === "POST");
  if (/^\/api\/english\/listening\/sets\/[^/]+$/.test(path))
    return (
      listeningMaterial && (read || method === "PATCH" || method === "DELETE")
    );
  if (/^\/api\/english\/listening\/sets\/[^/]+\/publish$/.test(path))
    return listening && method === "POST";
  if (/^\/api\/english\/listening\/sets\/[^/]+\/(review|media)$/.test(path))
    return listeningMaterial && method === "POST";
  if (/^\/api\/english\/listening\/sets\/[^/]+\/media\/[^/]+$/.test(path))
    return listeningMaterial && read;
  if (
    /^\/api\/english\/listening\/sets\/[^/]+\/media\/[^/]+\/(chunks|complete)$/.test(
      path,
    )
  )
    return listeningMaterial && method === "POST";
  if (path === "/api/english/listening/classes") return listening && read;
  if (path === "/api/english/listening/assignments")
    return listening && (read || method === "POST");
  if (/^\/api\/english\/listening\/assignments\/[^/]+$/.test(path))
    return listening && read;
  if (
    /^\/api\/english\/listening\/assignments\/[^/]+\/(targets|cancel|release|broadcast|retry)$/.test(
      path,
    )
  )
    return listening && method === "POST";
  if (/^\/english\/sets\/[^/]+\/print$/.test(path)) return read && library;
  if (path === "/api/english/generate") return method === "POST" && maker;
  if (path === "/api/english/exams")
    return read ? school || maker || library : method === "POST" && school;
  if (/^\/api\/english\/exams\/[^/]+$/.test(path))
    return (method === "PATCH" || method === "DELETE") && school;
  if (/^\/api\/english\/exams\/[^/]+\/materials$/.test(path))
    return read ? school || maker : method === "POST" && school;
  // 사진 자료에서 글 읽기(D-158) — 자료를 올리는 쪽(학교별 내신 대비)의 일이다. 사진이 외부 모델로 나간다
  if (/^\/api\/english\/materials\/[^/]+\/read$/.test(path))
    return method === "POST" && school;
  if (/^\/api\/english\/materials\/[^/]+$/.test(path))
    return read ? school || maker : method === "DELETE" && school;
  if (/^\/api\/english\/exams\/[^/]+\/sets$/.test(path))
    return read ? school || maker || library : method === "POST" && maker;
  if (/^\/api\/english\/sets\/[^/]+$/.test(path))
    return (read || method === "PUT" || method === "DELETE") && library;
  return false;
}
export function accountRouteAllowed(
  account: AccountAccess,
  method: string,
  path: string,
): boolean {
  if (
    !["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"].includes(
      method,
    )
  )
    return false;
  if (
    under(path, "/api/auth") ||
    path === "/login" ||
    path === "/signup" ||
    path === "/approval-pending" ||
    under(path, "/api/account") ||
    // eywa 연결 확인 화면(D-139 ⑹) — SSO 가 승인 대기 계정도 들이므로 연결도 승인 전에 연다. 연결 API 는 위 줄
    path === "/account/eywa-link" ||
    path === "/account/eywa-managed" ||
    // 브라우저 오류 보고 — 승인 전·메뉴가 없는 계정의 화면 오류도 와야 한다(오류 기록 2026-09-22). 받는 쪽이 양을 묶는다
    (method === "POST" && path === "/api/logs/client")
  )
    return true;
  if (account.approvalStatus !== "approved") return false;
  if (path === "/admin/eywa-sync" || path === "/api/admin/eywa-sync")
    return account.isAdmin;
  if (under(path, "/admin") || under(path, "/api/admin"))
    return account.isSuperAdmin === true;
  if (under(path, "/branch")) return account.isAdmin;
  if (under(path, "/api/branch")) return account.isAdmin;
  if (
    account.isSuperAdmin === true &&
    (under(path, "/dev") || under(path, "/api/dev"))
  )
    return true;
  const any = (...menus: WorkspaceMenu[]) =>
    menus.some((menu) => account.menus.includes(menu));
  // dev 빌드의 작업실 AI 는 구독 CLI 다리로 간다(`studio-ai/endpoints.ts`) — 운영의 `/api/studio/ai` 와 같은 기능이라
  // 같은 메뉴로 연다. 이 한 경로 · development 빌드만. 운영은 라우트가 404, loopback 밖은 403(`dev/unified/ai/guard.ts`).
  if (process.env.NODE_ENV === "development" && path === "/api/dev/unified/ai")
    return any("studio");
  if (under(path, "/dev") || under(path, "/api/dev")) return false;
  if (path === "/" || path === "/studio") return true; // The shell filters its hash-based panels separately.
  if (
    under(path, "/api/textbook") ||
    under(path, "/textbook") ||
    under(path, "/q")
  )
    return any("textbook");
  if (under(path, "/api/library")) return any("library", "studio", "export");
  if (
    under(path, "/api/studio/ai") ||
    under(path, "/api/studio/pdf-worker") ||
    under(path, "/api/studio/pdf-assets")
  )
    return any("studio");
  if (path === "/api/studio/overview") return any("home", "teaching");
  // SRS teacher management: explorer summaries stay read-only; class routes use teaching below.
  if (
    path === "/api/math-srs/course" ||
    /^\/api\/students\/[^/]+\/math-srs\/course$/.test(path) ||
    /^\/api\/students\/[^/]+\/math-srs\/explorers$/.test(path) ||
    srsFadingTeacherPath(path)
  )
    return (
      srsTeacherManagementRoute(method, path) &&
      (account.isSuperAdmin === true || any("srs"))
    );
  if (
    under(path, "/api/problems/transform") ||
    path === "/api/problems/generate"
  )
    return any("bank") && any("studio");
  if (
    under(path, "/api/studio/teaching") ||
    [
      "/classes",
      "/api/classes",
      "/api/students",
      "/api/progress",
      "/api/scores",
      "/api/eywa-sync",
    ].some((base) => under(path, base))
  )
    return any("teaching");
  if (
    [
      "/api/studio/problems",
      "/api/problems",
      "/problems",
      "/review",
      "/api/review",
    ].some((base) => under(path, base))
  )
    return any("bank");
  if (
    [
      "/tests",
      "/exam",
      "/api/tests",
      "/api/basket",
      "/api/exports",
      "/api/exam",
      "/api/predictions",
    ].some((base) => under(path, base))
  )
    return any("export");
  // 오늘의 개념(D-124) — 읽기는 메뉴가 켜진 계정, 쓰기는 라우트가 isAdmin 을 따로 막는다.
  if (under(path, "/api/concept")) return any("concept");
  if (path === "/api/metrics") return any("home");
  if (path === "/api/units") return any("bank", "studio", "teaching");
  // 오늘의 영어(D-148) — 자료·세트·생성 API 와 크롬 없는 인쇄 페이지(`/english/sets/{id}/print`) 둘 다.
  // `/api` 밖 경로는 아래에서 기본 통과라, 인쇄 페이지를 여기 적지 않으면 메뉴를 끈 계정도 연다.
  if (under(path, "/api/english") || under(path, "/english"))
    return englishRouteAllowed(account.menus, method, path);
  // 개념 백지(D-150) — 크롬 없는 인쇄 페이지(`/concept-blank/print`). API 는 없다(은행이 코드 데이터).
  // `/api` 밖 경로는 아래에서 기본 통과라, 여기 적지 않으면 메뉴를 끈 계정도 인쇄 페이지를 연다.
  if (under(path, "/concept-blank")) return any("conceptBlank");
  if (under(path, "/api")) return false; // Newly added resource routes must declare their menu.
  return true; // Images/fonts and established static assets are not feature endpoints.
}

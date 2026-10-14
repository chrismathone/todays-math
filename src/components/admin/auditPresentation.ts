import {
  WORKSPACE_MENUS,
  workspaceLibraryLabel,
} from "@/contracts/accountAccess.contract";
import { ADMIN_KIND_LABEL, type AuditEntry } from "./documentTypes";

export type AuditDetailRow = {
  label: string;
  value: string;
  previous?: string;
  unchanged?: boolean;
};

const ACTION_LABELS: Record<string, string> = {
  "account.settings_changed": "계정 설정 변경",
  "admin.private_material_view": "관리자 자료 열람 요청",
  "admin.account_view": "관리자 계정 열람",
  "admin.bootstrap": "관리자 계정 설정",
  "account.admin_bootstrap": "관리자 계정 설정",
  "account.password_reissued": "임시 비밀번호 발급",
  "auth.eywa-unlink": "에이와 연결 해제",
  "ai.execute": "AI 작업 실행",
  "admin.material_view": "관리자 자료 열람",
  request: "서비스 이용 요청",
  "ui.click": "버튼·링크 선택",
  "ui.change": "입력 항목 변경",
  "ui.submit": "양식 제출",
  "ui.navigate": "화면 이동",
  "ui.print": "인쇄 요청",
  "account.approved": "계정 승인",
  "account.rejected": "가입 승인 거절",
  "account.updated": "계정 권한 변경",
  "student_auth.bulk_issue": "학생 계정 일괄 생성",
  "student_account.issue": "학생 계정 생성",
  "student_account.reissue": "학생 초기 비밀번호 재발급",
  "student_account.disable": "학생 계정 사용 중지",
  "student_account.enable": "학생 계정 사용 설정",
  "auth.login": "로그인",
  "auth.logout": "로그아웃",
  "auth.signup": "회원 가입",
  "material.created": "자료 생성",
  "material.saved": "자료 저장",
  "material.deleted": "자료 삭제",
  "material.asset_uploaded": "원본 자료 업로드",
  "material.file_uploaded": "원본 자료 업로드",
  "material.renamed": "자료 제목 변경",
  "document.created": "자료 생성",
  "document.updated": "자료 저장",
  "document.deleted": "자료 삭제",
  "document.read": "자료 열람",
  "draft.created": "시험지 생성",
  "draft.updated": "시험지 저장",
  "draft.deleted": "시험지 삭제",
  "extraction.created": "추출 자료 생성",
  "extraction.updated": "추출 자료 저장",
};
const OUTCOME_LABELS: Record<string, string> = {
  success: "완료",
  succeeded: "완료",
  failure: "실패",
  failed: "실패",
  denied: "차단",
  requested: "요청",
};
const STATUS_LABELS: Record<string, string> = {
  pending: "승인 대기",
  approved: "승인됨",
  rejected: "승인 거절",
};
const FIELD_LABELS: Record<string, string> = {
  approvalStatus: "승인 상태",
  status: "승인 상태",
  menus: "메뉴 권한",
  branchManager: "지점 관리 권한",
  isAdmin: "지점 관리 권한",
  branchId: "소속 지점",
  branchRole: "지점 역할",
  name: "이름",
  email: "이메일",
  suspended: "이용 정지",
  deleted: "계정 삭제",
};

function labelFrom(labels: Readonly<Record<string, string>>, value: unknown) {
  return typeof value === "string" && Object.hasOwn(labels, value)
    ? labels[value]
    : undefined;
}

function menuLabel(value: unknown, branchId: unknown) {
  // This historical permission covered all English menus before they split.
  if (value === "english") return "오늘 영어 전체";
  if (value === "library")
    return typeof branchId === "string" || branchId === null
      ? workspaceLibraryLabel(branchId)
      : "시험지 보관함 (소속 미기록)";
  return (
    WORKSPACE_MENUS.find((menu) => menu.id === value)?.label ?? "미등록 메뉴"
  );
}

function locationLabel(value: unknown, branchId: unknown) {
  if (typeof value !== "string") return undefined;
  const [path, hash] = value.split("?")[0].split("#");
  if (/^\/api\/admin\/users\/[^/]+\/audit\/?$/.test(path))
    return "계정 활동 기록";
  if (/^\/api\/admin\/users\/[^/]+\/documents\/?$/.test(path))
    return "계정 자료 목록";
  if (/^\/api\/admin\/users\/[^/]+\/documents\/[^/]+\/?$/.test(path))
    return "계정 자료 내용";
  if (/^\/api\/admin\/users\/[^/]+\/assets\//.test(path))
    return "계정 원본 자료";
  if (/^\/(?:api\/)?admin\/users\/[^/]+\/?$/.test(path))
    return "계정 상세 정보";
  if (
    path === "/" &&
    hash &&
    (hash === "english" || WORKSPACE_MENUS.some((menu) => menu.id === hash))
  )
    return menuLabel(hash, branchId);
  if (path === "/") return "작업실";
  if (path === "/admin" || path === "/api/admin/users") return "계정 관리";
  if (/^\/(?:api\/)?concept-blank(?:\/|$)/.test(path)) return "개념 백지";
  if (/^\/(?:api\/)?english(?:\/|$)/.test(path)) return "오늘 영어";
  if (/^\/(?:api\/)?test\/[^/]+\/print\/?$/.test(path))
    return "시험지 인쇄 화면";
  if (/^\/api\/library(?:\/|$)/.test(path))
    return menuLabel("library", branchId);
  return undefined;
}

export function auditActionLabel(entry: AuditEntry) {
  const location = locationLabel(entry.details?.path, entry.details?.branchId);
  if (entry.action === "admin.private_material_view" && location)
    return `관리자 ${location} 조회 요청`;
  if (entry.action === "request" && location) return `${location} 이용 요청`;
  if (entry.action === "ui.print" && location) return `${location} · 인쇄 요청`;
  if (entry.action === "ui.navigate" && location)
    return `${location} · 화면 이동`;
  return labelFrom(ACTION_LABELS, entry.action) ?? "기타 활동";
}

export function auditOutcomeLabel(outcome: string) {
  return labelFrom(OUTCOME_LABELS, outcome) ?? "기타 결과";
}

/** Presentation only: never normalize or mutate the audit record itself. */
export function auditDetailRows(details: AuditEntry["details"]) {
  const data = details ?? {};
  const rows: AuditDetailRow[] = [];
  const has = (key: string) => Object.hasOwn(data, key);
  const add = (
    key: string,
    label: string,
    format: (value: unknown) => string,
    previous?: string,
    previousFormat = format,
  ) => {
    if (!has(key) && !(previous && has(previous))) return;
    const current = has(key) ? format(data[key]) : "기록 없음";
    if (previous && has(previous)) {
      rows.push({
        label,
        value: current,
        previous: previousFormat(data[previous]),
        unchanged:
          has(key) &&
          JSON.stringify(data[key]) === JSON.stringify(data[previous]) &&
          current === previousFormat(data[previous]),
      });
    } else rows.push({ label, value: current });
  };
  const status = (value: unknown) =>
    labelFrom(STATUS_LABELS, value) ?? "알 수 없는 상태";
  const boolean = (yes: string, no: string) => (value: unknown) =>
    value === true ? yes : value === false ? no : "기록 확인 필요";
  const menus = (value: unknown, branchId: unknown) =>
    Array.isArray(value)
      ? value.length
        ? value.map((item) => menuLabel(item, branchId)).join(", ")
        : "허용된 메뉴 없음"
      : "기록 확인 필요";
  const branch = (value: unknown, name: unknown) =>
    value === null || value === ""
      ? "독립 계정"
      : typeof value === "string"
        ? typeof name === "string" && name.trim()
          ? name
          : "지점 소속 (이름 미기록)"
        : "기록 확인 필요";
  add(
    has("status") ? "status" : "approvalStatus",
    "승인 상태",
    status,
    "previousStatus",
  );
  add(
    "branchManager",
    "지점 관리 권한",
    boolean("있음", "없음"),
    "previousBranchManager",
  );
  // Use each side's recorded membership, never the account's present branch.
  add(
    "branchId",
    "소속 지점",
    (value) => branch(value, data.branchName),
    "previousBranchId",
    (value) => branch(value, data.previousBranchName),
  );
  add(
    "menus",
    "메뉴 권한",
    (value) => menus(value, data.branchId),
    "previousMenus",
    (value) => menus(value, data.previousBranchId),
  );
  add(
    "suspended",
    "이용 정지",
    boolean("정지됨", "정지 안 됨"),
    "previousSuspended",
  );
  add(
    "deleted",
    "계정 삭제",
    boolean("삭제 처리됨", "삭제 안 됨"),
    "previousDeleted",
  );
  add(
    "branchRole",
    "지점 역할",
    (value) =>
      labelFrom(
        { owner: "원장", manager: "지점 관리자", teacher: "강사" },
        value,
      ) ?? "기록 확인 필요",
    "previousBranchRole",
  );
  add(
    "kind",
    "자료 유형",
    (value) => labelFrom(ADMIN_KIND_LABEL, value) ?? "기타 자료",
  );
  add("changedFields", "변경 항목", (value) =>
    Array.isArray(value)
      ? value
          .map((item) => labelFrom(FIELD_LABELS, item) ?? "기타 항목")
          .join(", ") || "없음"
      : "기록 확인 필요",
  );
  for (const [key, label] of Object.entries({
    title: "자료 제목",
    revision: "자료 버전",
    page: "페이지",
    count: "개수",
    issued: "생성한 학생 계정 수",
    problemCount: "문항 수",
    label: "작업",
  })) {
    if (typeof data[key] === "string" || typeof data[key] === "number")
      rows.push({ label, value: String(data[key]) || "없음" });
  }
  const location = locationLabel(data.path, data.branchId);
  if (location) rows.push({ label: "이용 화면", value: location });
  return rows;
}

/** JSON stays text in React, including unknown, nested and null details. */
export function auditTechnicalDetails(entry: AuditEntry) {
  return JSON.stringify(
    { action: entry.action, outcome: entry.outcome, details: entry.details },
    null,
    2,
  );
}

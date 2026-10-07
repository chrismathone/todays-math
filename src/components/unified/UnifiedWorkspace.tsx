"use client";
import { requestCourseNavigation } from "@/lib/math-srs/courseNavigation";
import { requestTextbookNavigation } from "@/lib/textbook/navigation";

import WorkspacePageHeader from "./WorkspacePageHeader";
import WorkProgress from "./WorkProgress";
import SavedWorksheetActions from "./SavedWorksheetActions";
import PrivateLibrary from "./PrivateLibrary";
import { useLibrarySaveConfirmation } from "./LibrarySaveDialog";
import { workspaceLibraryLabel } from "@/contracts/accountAccess.contract";
import type { DocumentSharing } from "@/contracts/privateWorkspace.contract";
import cloudStyles from "./PrivateLibrary.module.css";
import { forgetPrivateExtraction } from "./privateStudioSessionStore";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { signOutAction } from "@/app/actions/auth";
import RouteLinkStatus from "@/components/ui/RouteLinkStatus";
import {
  WORKSPACE_MENUS,
  WORKSPACE_PRODUCTS,
  workspaceMenusOf,
  type WorkspaceMenu,
  type WorkspaceProduct,
} from "@/contracts/accountAccess.contract";
import {
  englishViewMenu,
  isEnglishView,
  type EnglishView,
} from "@/components/english/views";
import { useWorkspaceAccess } from "./useWorkspaceAccess";
import type { BankData, StudioProblem } from "./types";
import type { StudioCrop } from "./studioHelpers";
import type { EnglishBankMakerSeed } from "@/contracts/englishBank.contract";
import {
  addToCart,
  forgetRemovals,
  rememberRemoval,
  restoreToCart,
} from "./studioCart";
import { useWorkspaceDrafts } from "./useWorkspaceDrafts";
import WorkroomHome, { formatDraftDate } from "./WorkroomHome";
import Icon, { type WorkspaceIconName } from "./WorkspaceIcon";
import TodayMathMark from "@/components/brand/TodayMathMark";
import { DevAiProvider } from "./useDevAi";
import DevAiStatusPanel from "./DevAiStatusPanel";
import s from "./Workroom.module.css";
import WorkspaceAccount, { type WorkspaceIdentity } from "./WorkspaceAccount";
import type { FadingGate } from "@/lib/fading/enabled";
import { SrsWorkspaceView } from "@/components/fading/teacher/SrsWorkspaceView";
const BankView = dynamic(() => import("./BankView"), {
  loading: () => (
    <WorkProgress
      className={s.loading}
      label="시험지 만들기를 여는 중입니다…"
    />
  ),
});
const StudioView = dynamic(() => import("./StudioView"), {
  ssr: false,
  loading: () => (
    <WorkProgress
      className={s.loading}
      label="자료 작업실을 준비하는 중입니다…"
    />
  ),
});
const TeachingView = dynamic(() => import("./TeachingView"), {
  ssr: false,
  loading: () => (
    <WorkProgress
      className={s.loading}
      label="수업 정보를 확인하는 중입니다…"
    />
  ),
});
const TextbookView = dynamic(
  () =>
    import("@/components/textbook/TextbookStudioView").then(
      (module) => module.TextbookStudioView,
    ),
  {
    ssr: false,
    loading: () => (
      <WorkProgress className={s.loading} label="교재 제작을 여는 중입니다…" />
    ),
  },
);
const WorksheetEditor = dynamic(() => import("./WorksheetEditor"), {
  loading: () => (
    <WorkProgress
      className={s.loading}
      label="시험지 미리보기를 준비하는 중입니다…"
    />
  ),
});
const ConceptView = dynamic(() => import("./ConceptView"), {
  ssr: false,
  loading: () => (
    <WorkProgress
      className={s.loading}
      label="오늘의 개념을 불러오는 중입니다…"
    />
  ),
});
const ConceptBlankView = dynamic(
  () => import("@/components/concept-blank/ConceptBlankView"),
  {
    ssr: false,
    loading: () => (
      <WorkProgress className={s.loading} label="개념 백지를 여는 중입니다…" />
    ),
  },
);
const CourseDashboard = dynamic(
  () => import("@/components/math-srs/CourseDashboard"),
  {
    ssr: false,
    loading: () => (
      <WorkProgress
        className={s.loading}
        label="기억 학습 현황을 불러오는 중입니다…"
      />
    ),
  },
);
const EnglishStudio = dynamic(
  () => import("@/components/english/EnglishStudio"),
  {
    ssr: false,
    loading: () => (
      <WorkProgress
        className={s.loading}
        label="오늘의 영어를 여는 중입니다…"
      />
    ),
  },
);
const ListeningStudio = dynamic(
  () => import("@/components/english/listening/ListeningStudio"),
  {
    ssr: false,
    loading: () => (
      <WorkProgress className={s.loading} label="영어듣기를 여는 중입니다…" />
    ),
  },
);
const EnglishResourceBank = dynamic(
  () => import("@/components/english/bank/EnglishResourceBank"),
  {
    ssr: false,
    loading: () => (
      <WorkProgress className={s.loading} label="자료은행을 여는 중입니다…" />
    ),
  },
);
/**
 * 영어 학교 메뉴는 기존 english 주소를 유지하고, 각 뷰는 개별 메뉴 권한을 본다.
 * 제품(수학 · 영어)은 뷰에서 파생하고 따로 저장하지 않는다(`productOf`).
 */
type View = Exclude<WorkspaceMenu, "english-school"> | EnglishView;
type NavItem = {
  id: View;
  label: string;
  short: string;
  icon: WorkspaceIconName;
};
const mathNav: NavItem[] = [
  { id: "home", label: "오늘의 작업", short: "홈", icon: "home" },
  { id: "bank", label: "시험지 만들기", short: "만들기", icon: "bank" },
  { id: "studio", label: "문제 추출", short: "문제 추출", icon: "crop" },
  { id: "export", label: "시험지 · 내보내기", short: "시험지", icon: "paper" },
  { id: "library", label: "내 시험지", short: "보관함", icon: "folder" },
  { id: "textbook", label: "교재 제작", short: "교재 제작", icon: "paper" },
  {
    id: "teaching",
    label: "수업 · 학생 관리",
    short: "수업·학생",
    icon: "class",
  },
  // D-124 ⑽ — «수업 · 학생 관리» 바로 아래
  { id: "concept", label: "오늘의 개념", short: "개념", icon: "play" },
  // D-150 — «오늘의 개념» 바로 아래(원장님 캡처)
  { id: "conceptBlank", label: "개념 백지", short: "백지", icon: "pen" },
  { id: "srs", label: "오늘의 기억 · SRS", short: "기억 학습", icon: "clock" },
];
/** 오늘의 영어 옆 메뉴 — 기존 내신 작업과 승인된 영어듣기. */
const englishNav: NavItem[] = [
  { id: "english", label: "오늘의 작업", short: "오늘", icon: "school" },
  {
    id: "english-questions",
    label: "시험지 만들기",
    short: "시험지",
    icon: "pen",
  },
  {
    id: "english-maker",
    label: "AI 문제 제작",
    short: "AI 제작",
    icon: "spark",
  },
  {
    id: "english-library",
    label: "내 문제 세트",
    short: "문제 세트",
    icon: "folder",
  },
  {
    id: "english-listening",
    label: "영어듣기",
    short: "듣기",
    icon: "headphones",
  },
  { id: "english-bank", label: "자료은행", short: "자료은행", icon: "bank" },
];
const navItemsOf: Record<WorkspaceProduct, NavItem[]> = {
  math: mathNav,
  english: englishNav,
};
const allNavItems = [...mathNav, ...englishNav];
const menuValid = (value: string): value is WorkspaceMenu =>
  WORKSPACE_MENUS.some((item) => item.id === value);
const viewValid = (value: string): value is View =>
  allNavItems.some((item) => item.id === value);
/** 뷰가 딸린 메뉴 — 권한은 이것으로 본다 */
const menuOf = (view: View): WorkspaceMenu =>
  isEnglishView(view) ? englishViewMenu(view) : view;
const productOf = (view: View | null): WorkspaceProduct =>
  view &&
  (isEnglishView(view) ||
    view === "english-listening" ||
    view === "english-bank")
    ? "english"
    : "math";
/** 세트 딥링크 `/?set=<uuid>#english` 의 id 모양 */
const SET_LINK = /^[0-9a-f-]{36}$/i;

function SidebarSignOutButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "로그아웃 중…" : "로그아웃"}
    </button>
  );
}

export default function UnifiedWorkspace({
  initialData,
  storageScope,
  currentUser,
  allowedMenus,
  fadingGate = "off",
}: {
  initialData: BankData;
  storageScope?: string;
  currentUser?: WorkspaceIdentity;
  allowedMenus?: WorkspaceMenu[];
  fadingGate?: FadingGate;
}) {
  const access = useWorkspaceAccess(currentUser, allowedMenus, storageScope);
  return (
    <DevAiProvider enabled={access.allowedMenus.includes("studio")}>
      <UnifiedWorkspaceContent
        key={storageScope ?? "development"}
        initialData={initialData}
        storageScope={storageScope}
        currentUser={access.currentUser}
        allowedMenus={access.allowedMenus}
        fadingGate={fadingGate}
      />
    </DevAiProvider>
  );
}
function UnifiedWorkspaceContent({
  initialData,
  storageScope,
  currentUser,
  allowedMenus,
  fadingGate,
}: {
  initialData: BankData;
  storageScope?: string;
  currentUser?: WorkspaceIdentity;
  allowedMenus: WorkspaceMenu[];
  fadingGate: FadingGate;
}) {
  const menuKey = allowedMenus.join(",");
  const branchId = currentUser?.branchId;
  const libraryLabel = workspaceLibraryLabel(branchId);
  const enabledMenus = useMemo(
    () => new Set(menuKey.split(",").filter(menuValid)),
    [menuKey],
  );
  const can = useCallback(
    (view: View) => enabledMenus.has(menuOf(view)),
    [enabledMenus],
  );
  const firstMenu = [...enabledMenus][0];
  const defaultView: View | null =
    firstMenu === "english-school" ? "english" : (firstMenu ?? null);
  const hasMenus = enabledMenus.size > 0;
  const canCreate = can("bank") || can("studio") || can("export");
  const canEnglish = englishNav.some(
    (item) => isEnglishView(item.id) && can(item.id),
  );
  const canCreateEnglishExam = can("english");
  const canOpenEnglishSet = can("english-library");
  const [requestedView, setView] = useState<View | null>(defaultView);
  const [navigationReady, setNavigationReady] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const view =
    requestedView && can(requestedView) ? requestedView : defaultView;
  const product = productOf(view);
  const productLabel =
    WORKSPACE_PRODUCTS.find((item) => item.id === product)?.label ??
    "오늘의수학";
  /** 권한 있는 제품만(25 §1.1) — 하나뿐이면 고르기 단추 없이 지금 모습 그대로 */
  const products = WORKSPACE_PRODUCTS.filter((item) =>
    workspaceMenusOf(item.id).some((menu) => enabledMenus.has(menu)),
  );
  // 원장님 2026-10-01 «메뉴가 두 개가 필요한가 — 내보내기는 문제 추출 가장 마지막 단계»: «시험지 · 내보내기»는
  // 문제 추출(넷째 단계) · 시험지 만들기(담기) · 내 시험지(열기)의 끝 단계라 옆 메뉴에 줄을 따로 두지 않는다.
  // 화면 · 권한 · 관문은 그대로다(옆 «현재 시험지 · 편집 이어가기» 칸 · 빠른 검색으로도 연다). 그 입구가 하나도 없는
  // 계정(내보내기만 켠 계정)에만 줄을 남긴다.
  const hiddenInSidebar = (id: View) =>
    id === "export" && (can("studio") || can("bank") || can("library"));
  const availableNav = navItemsOf[product]
    .filter((item) => can(item.id) && !hiddenInSidebar(item.id))
    .map((item) =>
      item.id === "library" ? { ...item, label: libraryLabel } : item,
    );
  /** 빠른 검색(Ctrl K)에는 두 제품이 다 선다 */
  const quickNav = allNavItems
    .filter((item) => can(item.id))
    .map((item) =>
      item.id === "library" ? { ...item, label: libraryLabel } : item,
    );
  const englishView: EnglishView =
    view && isEnglishView(view) ? view : "english";
  const worksheetView =
    view === "bank" ||
    view === "studio" ||
    view === "export" ||
    view === "library";
  const permissionsRef = useRef(enabledMenus);
  useEffect(() => {
    permissionsRef.current = enabledMenus;
  }, [enabledMenus]);
  const {
    draft,
    hydrated,
    recent,
    saveStatus,
    saveError,
    prepare: prepareDrafts,
    setTitle,
    setProblems: setSelected,
    setRemoved: updateRemovals,
    setColumns,
    setAnswers,
    setPrintOptions,
    setPrintMeta,
    saveNow,
    visibility,
    createDraft,
    openDraft,
    renameDraft,
    deleteDraft,
    importDraft,
    forgetPrivateDraft,
  } = useWorkspaceDrafts(
    storageScope,
    can("library") || can("studio") || can("export"),
    navigationReady && worksheetView,
    branchId,
  );
  /**
   * `removed` — 이 시험지에서 뺀 문항과 그 자리. 어느 화면에서 뺐든(④·문제은행·작업실 목록) 여기 남는다.
   * 작업실이 받아 «담은 문항» 목록에 흐린 줄(«다시 담기»)로 남기고, 한꺼번에 담기가 건너뛴다
   * (원장님 2026-09-21 확정 «안 넣는다» — `studioCart.ts`). 시험지 초안에 같이 저장한다(트랙 47 —
   * 전에는 화면 상태라 새로 고치면 사라졌다). 시험지가 바뀌면 그 시험지의 기억을 읽는다.
   */
  const {
    title,
    problems: selected,
    removed,
    columns,
    answers,
    printOptions,
    printMeta,
    updatedAt: savedAt,
  } = draft;
  /**
   * 작업실이 알려 주는 자른 문제 수 — 시험지 화면의 「OCR · 디지털화」 탭 배지가 쓴다(안 A).
   * 작업실이 아직 안 떠 있으면 0 이다(그 탭은 흐리다 — `WorksheetEditor` 의 `cropCount` 주석).
   */
  const [studioCropCount, setStudioCropCount] = useState<number>();
  /** 시험지 화면의 단계 탭 — 작업실의 그 단계로 간다. */
  const [studioStepRequest, setStudioStepRequest] = useState<{
    id: number;
    step: "upload" | "crop" | "review";
  }>();
  const [extraction, setExtraction] = useState<{
    id?: string;
    version: number;
  }>({ version: 0 });
  /** 내 시험지에서 연 개념 백지(26 §9 ⑾) — 판을 올려 같은 자료를 다시 열어도 개념 백지가 다시 읽는다. */
  const [blankDocument, setBlankDocument] = useState<{
    id: string;
    version: number;
  } | null>(null);
  const [studioRestoreRequest, setStudioRestoreRequest] = useState<{
    id: number;
    crops: StudioCrop[];
  }>();
  const [opened, setOpened] = useState<Set<View>>(() => new Set());
  const [bankEntry, setBankEntry] = useState<{
    q?: string;
    grade?: string;
    version: number;
  }>({ version: 0 });
  const [notice, setNoticeMessage] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const [dismissedSaveError, setDismissedSaveError] = useState<string | null>(
    null,
  );
  const saveErrorKey = `${storageScope ?? "local"}:${draft.id}:${saveError ?? ""}`;
  const setNotice = useCallback((message: string, error = false) => {
    setNoticeMessage(message);
    setNoticeError(error);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [englishMaximized, setEnglishMaximized] = useState(false);
  const workspaceMaximized = product === "english" && englishMaximized;
  useEffect(() => {
    if (!workspaceMaximized) return;
    const restore = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        !event.defaultPrevented &&
        !document.querySelector('dialog[open], [aria-modal="true"]')
      )
        setEnglishMaximized(false);
    };
    window.addEventListener("keydown", restore);
    return () => window.removeEventListener("keydown", restore);
  }, [workspaceMaximized]);
  /**
   * 「되돌리기」 한 칸 — 뺀 문제를 다시 담거나(`remove`), 「순서 초기화」 직전의
   * 차례로 되돌린다(`order`). 알림 줄의 단추 하나가 둘을 다 맡는다.
   */
  const [undo, setUndo] = useState<
    | { kind: "remove"; problem: StudioProblem; index: number; draftId: string }
    | { kind: "order"; previous: StudioProblem[]; draftId: string }
    | null
  >(null);
  // «english-exam»(영어 «새 시험 등록»)은 셸의 <dialog> 가 아니라 영어 뷰가 제 창을 그린다.
  const [modal, setModal] = useState<
    "new" | "search" | "help" | "english-exam" | null
  >(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLButtonElement>(null);
  const pickerFocusPending = useRef(false);
  /** 세트 딥링크 — sync() 가 읽어 영어 뷰에 넘기고, 열리면(`forgetSetLink`) URL 에서 지운다 */
  const [openSet, setOpenSet] = useState<{ id?: string; version: number }>({
    version: 0,
  });
  const [bankMakerSeed, setBankMakerSeed] = useState<EnglishBankMakerSeed>();
  const [openListening, setOpenListening] = useState<{
    id: string;
    version: number;
  }>();
  const [newTitle, setNewTitle] = useState("");
  const [quickQuery, setQuickQuery] = useState("");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [importRequest, setImportRequest] = useState<
    { id: number; files: File[] } | undefined
  >();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const queryRef = useRef<HTMLInputElement>(null);
  const newTitleRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const draftFileRef = useRef<HTMLInputElement>(null);
  const label =
    view === "library"
      ? libraryLabel
      : (allNavItems.find((item) => item.id === view)?.label ??
        "메뉴 이용 안내");
  const acceptedHref = useRef("");
  const performNavigation = useCallback(
    (next: View): boolean => {
      if (!can(next)) return false;
      if (
        next !== "english-listening" &&
        !window.dispatchEvent(
          new Event("english-listening-before-leave", { cancelable: true }),
        )
      )
        return false;
      if (
        next !== "english-bank" &&
        !window.dispatchEvent(
          new Event("english-bank-before-leave", { cancelable: true }),
        )
      )
        return false;
      setView(next);
      setOpened((current) =>
        current.has(next) ? current : new Set([...current, next]),
      );
      setNotice("");
      setUndo(null);
      setModal(null);
      setPickerOpen(false);
      const url = new URL(window.location.href);
      url.hash = next === "home" ? "" : next;
      if (url.href !== window.location.href)
        window.history.pushState(null, "", url);
      acceptedHref.current = window.location.href;
      window.scrollTo({ top: 0, behavior: "instant" });
      return true;
    },
    [can, setNotice, setModal],
  );
  const navigate = useCallback(
    (next: View): boolean => {
      if (!can(next)) return false;
      if (
        can("textbook") &&
        next !== "textbook" &&
        !requestTextbookNavigation(() => {
          performNavigation(next);
        })
      )
        return false;
      if (
        can("srs") &&
        next !== "srs" &&
        !requestCourseNavigation(() => {
          performNavigation(next);
        })
      )
        return false;
      return performNavigation(next);
    },
    [can, performNavigation],
  );
  useEffect(() => {
    try {
      // Restore a browser-only layout preference after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSidebarCollapsed(
        localStorage.getItem("today-math-sidebar-collapsed") === "true",
      );
    } catch {
      /* Layout remains usable when browser preferences are unavailable. */
    }
  }, []);
  const toggleSidebar = useCallback(() => {
    const value = !sidebarCollapsed;
    setSidebarCollapsed(value);
    setPickerOpen(false);
    try {
      localStorage.setItem("today-math-sidebar-collapsed", String(value));
    } catch {
      /* Optional preference. */
    }
  }, [sidebarCollapsed]);
  // 제품 고르기 목록(D-148 · 시안 C) — 키보드로 열면 첫 항목에 초점, 바깥을 누르면 닫힌다.
  useEffect(() => {
    if (!pickerOpen) return;
    if (pickerFocusPending.current) {
      pickerFocusPending.current = false;
      pickerRef.current
        ?.querySelector<HTMLButtonElement>('[role="option"]')
        ?.focus();
    }
    const away = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node))
        setPickerOpen(false);
    };
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [pickerOpen]);
  /** 고르면 그 제품의 첫 허용 뷰로 이동한다. */
  const chooseProduct = (next: WorkspaceProduct) => {
    setPickerOpen(false);
    const target: View | null =
      next === "english"
        ? (englishNav.find((item) => can(item.id))?.id ?? null)
        : defaultView && productOf(defaultView) === "math"
          ? defaultView
          : (mathNav.find((item) => can(item.id))?.id ?? null);
    if (target) navigate(target);
    brandRef.current?.focus();
  };
  const onPickerKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const options = Array.from(
      pickerRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="option"]',
      ) ?? [],
    );
    if (!options.length) return;
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      options[(index + 1) % options.length].focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      options[(index - 1 + options.length) % options.length].focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setPickerOpen(false);
      brandRef.current?.focus();
    } else if (event.key === "Enter" && index >= 0) {
      event.preventDefault();
      options[index].click();
    }
  };
  /** 영어 뷰가 세트를 열고 나면 URL 의 `set` 을 지운다 — 새로 고쳐도 같은 세트를 다시 열지 않는다 */
  const forgetSetLink = useCallback(() => {
    setOpenSet((current) => ({ version: current.version }));
    const url = new URL(window.location.href);
    if (!url.searchParams.has("set")) return;
    url.searchParams.delete("set");
    window.history.replaceState(null, "", url);
  }, []);
  const openNewExam = useCallback(() => setModal("english-exam"), [setModal]);
  const closeModal = useCallback(() => setModal(null), [setModal]);
  const englishNotice = useCallback(
    (message: string, tone: "status" | "alert" = "status") =>
      setNotice(message, tone === "alert"),
    [setNotice],
  );
  useEffect(() => {
    const sync = () => {
      const url = new URL(window.location.href);
      const value = url.hash.slice(1) || "home";
      let next = viewValid(value) && can(value) ? value : defaultView;
      // 세트 딥링크(D-148) — `extraction` 처럼 검색 인수를 읽는다. 영어 권한이 없으면 무시한다.
      const setId = url.searchParams.get("set");
      const setLinked = Boolean(
        setId && SET_LINK.test(setId) && can("english-library"),
      );
      if (setLinked) next = "english-library";
      const requestedHref = url.href;
      if (
        can("textbook") &&
        next !== "textbook" &&
        !requestTextbookNavigation(() => {
          window.history.replaceState(window.history.state, "", requestedHref);
          sync();
        })
      ) {
        const previous = new URL(acceptedHref.current || window.location.href);
        previous.hash = "textbook";
        window.history.replaceState(window.history.state, "", previous);
        return;
      }
      if (
        can("srs") &&
        next !== "srs" &&
        !requestCourseNavigation(() => {
          window.history.replaceState(window.history.state, "", requestedHref);
          sync();
        })
      ) {
        const previous = new URL(acceptedHref.current || window.location.href);
        previous.hash = "srs";
        window.history.replaceState(window.history.state, "", previous);
        return;
      }
      if (
        next !== "english-listening" &&
        !window.dispatchEvent(
          new Event("english-listening-before-leave", { cancelable: true }),
        )
      ) {
        url.hash = "english-listening";
        window.history.replaceState(null, "", url);
        return;
      }
      if (
        next !== "english-bank" &&
        !window.dispatchEvent(
          new Event("english-bank-before-leave", { cancelable: true }),
        )
      ) {
        url.hash = "english-bank";
        window.history.replaceState(null, "", url);
        return;
      }
      setView(next);
      setNavigationReady(true);
      setOpened(
        (current) => new Set([...current, ...(next ? [next] : [])].filter(can)),
      );
      if (setLinked && setId)
        setOpenSet((current) =>
          current.id === setId
            ? current
            : { id: setId, version: current.version + 1 },
        );
      const documentId = url.searchParams.get("extraction");
      if (
        storageScope &&
        documentId &&
        /^[A-Za-z0-9_-]{1,100}$/.test(documentId) &&
        can("studio")
      ) {
        setExtraction((current) =>
          current.id === documentId
            ? current
            : { id: documentId, version: current.version + 1 },
        );
      }
      url.hash = next && next !== "home" ? next : "";
      if (url.href !== window.location.href)
        window.history.replaceState(null, "", url);
      acceptedHref.current = window.location.href;
    };
    // Synchronize the browser's navigation state, including a directly opened hash.

    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    const rememberQuery = () => {
      acceptedHref.current = window.location.href;
    };
    window.addEventListener("screen-query-changed", rememberQuery);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("screen-query-changed", rememberQuery);
    };
  }, [can, defaultView, storageScope]);
  useEffect(() => {
    // Close controls immediately after the corresponding permission is revoked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModal((current) =>
      !hasMenus ||
      (current === "new" && !canCreate) ||
      (current === "english-exam" && !canCreateEnglishExam)
        ? null
        : current,
    );
  }, [hasMenus, canCreate, canCreateEnglishExam]);
  /** 셸의 <dialog> 가 그리는 창만 — «새 시험 등록»은 영어 뷰가 제 창을 그린다 */
  const shellModal = modal === "english-exam" ? null : modal;
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (shellModal) {
      if (!dialog.open) dialog.showModal();
      if (shellModal === "search") queryRef.current?.focus();
      if (shellModal === "new") newTitleRef.current?.focus();
      if (shellModal === "help") dialog.querySelector("button")?.focus();
    }
    if (!shellModal && dialog.open) dialog.close();
  }, [shellModal]);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key === "\\") {
        event.preventDefault();
        toggleSidebar();
      }
      if (event.key.toLowerCase() === "k" && hasMenus) {
        event.preventDefault();
        setModal("search");
      }
      if (
        event.key.toLowerCase() === "s" &&
        canCreate &&
        worksheetView &&
        hydrated
      ) {
        event.preventDefault();
        void Promise.resolve(saveNow()).then((saved) => {
          if (saved)
            setNotice(
              storageScope
                ? "내 계정에 작업을 저장했습니다."
                : "이 브라우저에 작업을 저장했습니다.",
            );
        });
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, [
    saveNow,
    setNotice,
    toggleSidebar,
    hasMenus,
    canCreate,
    storageScope,
    worksheetView,
    hydrated,
  ]);
  const openBank = (filters: { q?: string; grade?: string } = {}) => {
    if (!can("bank")) return;
    setBankEntry((current) => ({ ...filters, version: current.version + 1 }));
    navigate("bank");
  };
  function toggle(problem: StudioProblem) {
    const index = selected.findIndex((p) => p.id === problem.id);
    if (index < 0 && problem.eligible === false) {
      setNotice(problem.ineligibleReason || "출제할 수 없는 문항입니다.");
      return;
    }
    if (index >= 0) {
      setUndo({ kind: "remove", problem, index, draftId: draft.id });
      setNotice("시험지에서 문제를 뺐습니다.");
      // 시험지에 있던 판을 기억한다 — 문제은행 카드가 넘기는 것은 은행 쪽 판일 수 있다.
      const removedProblem = selected[index];
      updateRemovals((items) => rememberRemoval(items, removedProblem, index));
    } else updateRemovals((items) => forgetRemovals(items, [problem.id]));
    setSelected((current) =>
      current.some((p) => p.id === problem.id)
        ? current.filter((p) => p.id !== problem.id)
        : [...current, problem],
    );
  }
  function undoLast() {
    if (!undo || undo.draftId !== draft.id) return;
    if (undo.kind === "order") {
      setSelected(undo.previous);
      setUndo(null);
      setNotice("문제 차례를 되돌렸습니다.");
      return;
    }
    if (undo.problem.eligible === false) return;
    setSelected((current) => restoreToCart(current, undo.problem, undo.index));
    updateRemovals((items) => forgetRemovals(items, [undo.problem.id]));
    setUndo(null);
    setNotice("문제를 다시 담았습니다.");
  }
  /** Bank composition changes keep replacement positions and recovery in one update. */
  function changeBankSelection(problems: StudioProblem[]) {
    const next = [
      ...new Map(
        problems
          .filter(
            (problem) =>
              problem.eligible !== false ||
              selected.some((item) => item.id === problem.id),
          )
          .map((problem) => [problem.id, problem]),
      ).values(),
    ];
    const nextIds = new Set(next.map((problem) => problem.id));
    updateRemovals((items) => {
      let changed = items;
      selected.forEach((problem, index) => {
        if (!nextIds.has(problem.id))
          changed = rememberRemoval(changed, problem, index);
      });
      return forgetRemovals(changed, [...nextIds]);
    });
    setSelected(next);
    setUndo(null);
  }
  /** 작업실의 담기·반영 — 같은 id 는 제자리에서 갈고 새것은 뒤에(`addToCart`). */
  const add = (problems: StudioProblem[]) => {
    setSelected((current) => addToCart(current, problems));
    updateRemovals((items) =>
      forgetRemovals(
        items,
        problems.map((problem) => problem.id),
      ),
    );
  };
  /** 작업실 «담은 문항» 목록의 ×. 시험지에 있을 때만 뺀다 — 없는 것을 `toggle` 하면 담긴다. */
  function remove(problem: StudioProblem) {
    if (selected.some((item) => item.id === problem.id)) toggle(problem);
  }
  /**
   * 작업실 «담은 문항» 목록의 «다시 담기» — 뺀 자리로 되돌린다. 편집창 확대 중에는 위 알림 줄의
   * «되돌리기»가 inert 에 덮여 안 닿아, 되돌리기를 작업실 안에 둔 것이다(트랙 41 공통 ③).
   */
  function restoreRemoved(problem: StudioProblem) {
    if (problem.eligible === false) return;
    const index =
      removed.find((item) => item.problem.id === problem.id)?.index ??
      selected.length;
    setSelected((current) => restoreToCart(current, problem, index));
    updateRemovals((items) => forgetRemovals(items, [problem.id]));
    if (undo?.kind === "remove" && undo.problem.id === problem.id)
      setUndo(null);
    setNotice("문제를 다시 담았습니다.");
  }
  /**
   * 「순서 초기화」가 세운 차례를 통째로 적용한다. 지우는 것이 아니라 **되돌릴 수 있는**
   * 바꾸기라 확인 창은 두지 않고, 대신 알림 줄의 「되돌리기」를 한 칸 채운다.
   */
  function reorder(next: StudioProblem[]) {
    if (
      next.length === selected.length &&
      next.every((problem, index) => problem === selected[index])
    )
      return;
    setUndo({ kind: "order", previous: selected, draftId: draft.id });
    setSelected(next);
    setNotice("문제를 원본 차례로 되돌렸습니다.");
  }
  function move(index: number, direction: number) {
    setSelected((current) => {
      if (index + direction < 0 || index + direction >= current.length)
        return current;
      const next = [...current];
      [next[index], next[index + direction]] = [
        next[index + direction],
        next[index],
      ];
      return next;
    });
  }
  const { requestSave: save, dialog: saveDialog } = useLibrarySaveConfirmation(
    branchId,
    persistWorksheet,
    visibility,
  );
  async function persistWorksheet(sharing?: DocumentSharing) {
    setDismissedSaveError(null);
    setUndo(null);
    const saved = await saveNow(sharing);
    if (saved)
      setNotice(
        storageScope
          ? "내 계정에 작업을 저장했습니다."
          : "이 브라우저에 작업을 저장했습니다.",
      );
    return saved;
  }
  async function openSaved(id: string) {
    if (!can("export")) return;
    await prepareDrafts();
    if (!permissionsRef.current.has("export")) return;
    if (await openDraft(id)) {
      setUndo(null);
      navigate("export");
      setNotice("저장한 시험지를 불러왔습니다.");
    }
  }
  function restore() {
    if (recent.length) openSaved(recent[0].id);
    else draftFileRef.current?.click();
  }
  async function startNew(next: "bank" | "studio" | "export") {
    if (!can(next)) return;
    await prepareDrafts();
    if (!permissionsRef.current.has(next)) return;
    if (!(await createDraft())) return;
    setUndo(null);
    if (newTitle.trim()) setTitle(newTitle.trim());
    setNewTitle("");
    if (next === "bank") openBank();
    else navigate(next);
  }
  function receiveFiles(files: File[]) {
    if (!can("studio") || !files.length) return;
    setImportRequest({ id: Date.now(), files });
    navigate("studio");
  }
  async function receiveDraft(file: File | undefined) {
    if (!can("export") || !file) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        return setNotice("20 MB 이하의 작업 파일을 선택해 주세요.", true);
      const value = JSON.parse(await file.text());
      if (!permissionsRef.current.has("export")) return;
      await prepareDrafts();
      if (!permissionsRef.current.has("export")) return;
      if (await importDraft(value)) {
        setUndo(null);
        navigate("export");
        setNotice("작업 파일을 불러왔습니다.");
      }
    } catch {
      setNotice(
        "작업 파일을 읽지 못했습니다. 오늘의수학에서 내보낸 JSON 파일인지 확인해 주세요.",
        true,
      );
    }
  }
  function download() {
    if (!can("export")) return;
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            {
              version: 1,
              title,
              problems: selected,
              columns,
              answers,
              printOptions,
              printMeta,
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${title.replace(/[<>:"/\\|?*]/g, "_") || "학습지"}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("원문과 편집 내용을 작업 파일로 내보냈습니다.");
  }
  const filteredDrafts = recent.filter((item) =>
    item.title.toLocaleLowerCase().includes(libraryQuery.toLocaleLowerCase()),
  );
  return (
    <div
      className={s.workspace}
      data-sidebar-collapsed={sidebarCollapsed}
      data-maximized={workspaceMaximized}
      data-authenticated={Boolean(currentUser)}
      data-menu-count={availableNav.length}
      // 영어일 때만 붙는 표지(D-148 · 05 §8.23 ⑷) — 접힌 옆 메뉴의 마크·딱지 배치가 이것을 본다. 수학은 표지 없이 기준 그대로
      data-product={product === "english" ? "english" : undefined}
    >
      {saveDialog}
      <a
        className={s.skipLink}
        href="#workspace-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("workspace-content")?.focus();
        }}
      >
        본문으로 건너뛰기
      </a>
      {can("studio") && (
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif,image/bmp"
          multiple
          aria-label="홈에서 PDF 또는 이미지 가져오기"
          onChange={(event) => {
            receiveFiles(Array.from(event.target.files ?? []));
            event.target.value = "";
          }}
        />
      )}
      {can("export") && (
        <input
          ref={draftFileRef}
          hidden
          type="file"
          accept="application/json,.json"
          aria-label="시험지 작업 파일 가져오기"
          onChange={(event) => {
            void receiveDraft(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      )}
      <aside className={s.sidebar} hidden={workspaceMaximized}>
        <div className={s.productMenu} ref={pickerRef}>
          <div className={s.sideHeader}>
            {products.length > 1 ? (
              // 브랜드 자리가 곧 고르기 단추(D-148 · 시안 C) — 이름 옆 ▾, 누르면 바로 아래 제품 목록.
              <button
                ref={brandRef}
                className={s.brand}
                aria-haspopup="listbox"
                aria-expanded={pickerOpen}
                aria-controls={
                  pickerOpen ? "workspace-product-list" : undefined
                }
                aria-label={`제품 고르기 — ${productLabel}`}
                onClick={() => setPickerOpen((open) => !open)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    event.preventDefault();
                    pickerFocusPending.current = true;
                    setPickerOpen(true);
                  } else if (event.key === "Escape" && pickerOpen) {
                    event.preventDefault();
                    setPickerOpen(false);
                  }
                }}
              >
                <span className={s.brandMark}>
                  <TodayMathMark size={36} inverse />
                  {product === "english" && (
                    <span
                      className={s.productBadge}
                      data-testid="product-badge"
                      aria-hidden="true"
                    >
                      영
                    </span>
                  )}
                </span>
                <span className={s.brandName}>
                  {productLabel}
                  <span className={s.brandChevron}>
                    <Icon name="down" size={16} />
                  </span>
                </span>
              </button>
            ) : (
              <button
                className={s.brand}
                onClick={() => defaultView && navigate(defaultView)}
                aria-label={
                  defaultView === "home"
                    ? "오늘의수학 홈"
                    : `${productLabel} 작업실`
                }
                disabled={!hasMenus}
              >
                <span className={s.brandMark}>
                  <TodayMathMark size={36} inverse />
                  {product === "english" && (
                    <span
                      className={s.productBadge}
                      data-testid="product-badge"
                      aria-hidden="true"
                    >
                      영
                    </span>
                  )}
                </span>
                <span>{productLabel}</span>
              </button>
            )}
            <button
              className={s.sidebarToggle}
              onClick={toggleSidebar}
              aria-label={
                sidebarCollapsed ? "왼쪽 메뉴 펼치기" : "왼쪽 메뉴 접기"
              }
              title={
                sidebarCollapsed
                  ? "메뉴 펼치기 (Ctrl+\\)"
                  : "메뉴 접기 (Ctrl+\\)"
              }
              aria-expanded={!sidebarCollapsed}
            >
              <svg
                viewBox="0 0 24 24"
                width="19"
                height="19"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path
                  d={
                    sidebarCollapsed
                      ? "m5 6 6 6-6 6m7-12 6 6-6 6"
                      : "m19 6-6 6 6 6m-7-12-6 6 6 6"
                  }
                />
              </svg>
            </button>
          </div>
          {pickerOpen && (
            <div
              id="workspace-product-list"
              role="listbox"
              aria-label="제품"
              className={s.productPicker}
              onKeyDown={onPickerKey}
              onBlur={(event) => {
                // Tab 으로 초점이 목록 밖 요소로 나가면 닫는다 — 목록·브랜드 안에서 옮기는 것은 그대로
                const next = event.relatedTarget as Node | null;
                if (next && !pickerRef.current?.contains(next))
                  setPickerOpen(false);
              }}
            >
              {products.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  aria-selected={item.id === product}
                  className={item.id === product ? s.productCurrent : undefined}
                  onClick={() => chooseProduct(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
        {product === "english"
          ? canCreateEnglishExam &&
            view !== "english-listening" &&
            view !== "english-bank" && (
              <button
                className={s.newButton}
                aria-label="새 시험 등록"
                title={sidebarCollapsed ? "새 시험 등록" : undefined}
                onClick={() => setModal("english-exam")}
              >
                <Icon name="plus" />
                <span>새 시험 등록</span>
              </button>
            )
          : canCreate && (
              <button
                className={s.newButton}
                aria-label="새 시험지 만들기"
                title={sidebarCollapsed ? "새 시험지 만들기" : undefined}
                onClick={() => setModal("new")}
              >
                <Icon name="plus" />
                <span>새 시험지 만들기</span>
              </button>
            )}
        {product === "english" && <p className={s.navCaption}>오늘의 영어</p>}
        <nav className={s.navigation} aria-label="작업실 메뉴">
          {availableNav.map((item) => (
            <div
              key={item.id}
              className={item.id === "teaching" ? s.teachingNav : ""}
            >
              <button
                aria-label={item.label}
                title={sidebarCollapsed ? item.label : undefined}
                aria-current={view === item.id ? "page" : undefined}
                className={view === item.id ? s.navActive : ""}
                onClick={() => navigate(item.id)}
              >
                <Icon name={item.icon} />
                <span className={s.navLabel}>{item.label}</span>
                <span className={s.navShort}>{item.short}</span>
                {item.id === "export" && selected.length > 0 && (
                  <span className={s.navCount}>{selected.length}</span>
                )}
              </button>
            </div>
          ))}
        </nav>
        {worksheetView && hydrated && can("export") && (
          <div className={s.sideDraft}>
            <div>
              <span className={s.sideDraftIcon}>
                <Icon name="paper" size={18} />
              </span>
              <span>현재 시험지</span>
              <b>{selected.length}문항</b>
            </div>
            <strong>{title || "제목 없는 시험지"}</strong>
            <button onClick={() => navigate("export")}>
              편집 이어가기
              <Icon name="arrow" size={17} />
            </button>
          </div>
        )}
        {/* 수학 «자료 제작»의 AI 연결 판 — 옆 메뉴는 지금 제품의 것만 그린다(영어에서는 안 뜬다) */}
        {product === "math" && can("studio") && (
          <DevAiStatusPanel
            collapsed={sidebarCollapsed}
            onExpand={toggleSidebar}
          />
        )}
        {(hasMenus || currentUser) && (
          <div className={s.sidebarFooter}>
            {hasMenus && (
              <button onClick={() => setModal("help")}>
                <Icon name="help" size={19} />
                작업실 사용 안내
                <Icon name="chevron" size={15} />
              </button>
            )}
            {currentUser && (
              <div className={s.profileMenu}>
                <button
                  type="button"
                  className={s.accountButton}
                  aria-label="내정보 메뉴"
                  aria-expanded={profileOpen}
                  title={sidebarCollapsed ? "내정보 메뉴" : undefined}
                  onClick={() => setProfileOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setProfileOpen(false);
                  }}
                >
                  <span aria-hidden="true">
                    {currentUser.name?.trim().charAt(0) || "내"}
                  </span>
                  <span>
                    <strong>내정보</strong>
                    <small>프로필 · 비밀번호 설정</small>
                  </span>
                  <Icon name="chevron" size={16} />
                </button>
                {profileOpen && (
                  <div className={s.profilePanel}>
                    <p className={s.profileHeading}>내 계정</p>
                    <Link href="/account">
                      내정보 설정
                      <RouteLinkStatus />
                    </Link>
                    <form action={signOutAction}>
                      <SidebarSignOutButton />
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </aside>
      <div className={s.main}>
        <header className={s.topbar}>
          <div className={s.breadcrumb}>
            <span>작업실</span>
            <Icon name="chevron" size={14} />
            <strong>{label}</strong>
          </div>
          {hasMenus && (
            <button
              className={s.searchTrigger}
              onClick={() => setModal("search")}
              aria-label="빠른 검색 열기"
            >
              <Icon name="search" size={18} />
              <span>문제 · 작업 빠르게 찾기</span>
              <kbd>Ctrl K</kbd>
            </button>
          )}
          {currentUser && (
            <div className={s.accountSlot}>
              <WorkspaceAccount user={currentUser} />
            </div>
          )}
          {product === "english" && (
            <button
              type="button"
              className={s.maximizeButton}
              aria-pressed={workspaceMaximized}
              title={
                workspaceMaximized
                  ? "화면 복원 (Esc)"
                  : "메뉴를 숨기고 작업 화면 최대화"
              }
              onClick={() => setEnglishMaximized((value) => !value)}
            >
              <Icon
                name={workspaceMaximized ? "restore" : "maximize"}
                size={17}
              />
              {workspaceMaximized ? "화면 복원" : "화면 최대화"}
            </button>
          )}
        </header>
        <div className={s.notifications}>
          {hasMenus &&
            notice &&
            (worksheetView || modal || product === "english") && (
              <div
                className={s.notice}
                data-error={noticeError}
                role={noticeError ? "alert" : "status"}
              >
                <Icon name={noticeError ? "warning" : "check"} size={18} />
                <span>{notice}</span>
                {undo && undo.draftId === draft.id && (
                  <button className={s.undoButton} onClick={undoLast}>
                    <Icon name="undo" size={16} />
                    되돌리기
                  </button>
                )}
                <button
                  className={s.dismiss}
                  onClick={() => {
                    setNotice("");
                    setUndo(null);
                  }}
                  aria-label="알림 닫기"
                >
                  <Icon name="close" size={17} />
                </button>
              </div>
            )}
        </div>
        <div id="workspace-content" className={s.content} tabIndex={-1}>
          {worksheetView && canCreate && saveError && (
            <div className={s.draftFeedback}>
              {dismissedSaveError === saveErrorKey ? (
                <button
                  type="button"
                  className={s.saveErrorTrigger}
                  onClick={() => setDismissedSaveError(null)}
                  aria-label="저장 오류 자세히 보기"
                >
                  <Icon name="warning" size={16} />
                  시험지 저장 확인 필요
                </button>
              ) : (
                <div
                  className={
                    storageScope ? cloudStyles.cloudError : s.saveError
                  }
                  role="alert"
                >
                  <Icon name="warning" size={19} />
                  <p>{saveError}</p>
                  {can("export") && (
                    <button onClick={download}>작업 파일 내려받기</button>
                  )}
                  <button onClick={save}>다시 저장</button>
                  <button
                    type="button"
                    className={s.saveErrorDismiss}
                    aria-label="저장 오류 알림 닫기"
                    title="알림 닫기"
                    onClick={() => setDismissedSaveError(saveErrorKey)}
                  >
                    <Icon name="close" size={18} />
                  </button>
                </div>
              )}
            </div>
          )}
          {!hasMenus && (
            <main className={s.noMenus}>
              <h1>사용할 수 있는 메뉴가 없습니다</h1>
              <p>
                관리자에게 메뉴 이용 권한을 요청해 주세요. 권한이 변경되면 이
                화면에 자동으로 반영됩니다.
              </p>
            </main>
          )}
          {view === "home" && (
            <WorkroomHome
              data={initialData}
              draft={draft}
              recent={recent}
              hydrated={hydrated}
              cloudStorage={Boolean(storageScope)}
              allowedMenus={allowedMenus}
              onNew={() => setModal("new")}
              onBank={openBank}
              onImport={() => fileRef.current?.click()}
              onFiles={receiveFiles}
              onOpen={openSaved}
              onNavigate={navigate}
            />
          )}
          {navigationReady &&
            worksheetView &&
            view !== "library" &&
            !hydrated && (
              <WorkProgress
                className={s.loading}
                label="시험지 작업을 불러오는 중입니다…"
              />
            )}
          {hydrated &&
            can("bank") &&
            (opened.has("bank") || view === "bank") && (
              <main hidden={view !== "bank"} className={s.viewContent}>
                <BankView
                  key={`${draft.id}:${bankEntry.version}`}
                  initialData={initialData}
                  initialFilters={bankEntry}
                  selected={selected}
                  onToggle={toggle}
                  onSelectionChange={changeBankSelection}
                  onExport={() => navigate("export")}
                  canExport={can("export")}
                  canUseAi={can("studio")}
                />
              </main>
            )}
          {hydrated &&
            can("studio") &&
            (opened.has("studio") || view === "studio") && (
              <main hidden={view !== "studio"} className={s.studioContent}>
                <StudioView
                  key={`${storageScope ?? "preview"}:${extraction.version}`}
                  active={view === "studio"}
                  picked={selected}
                  removed={removed}
                  onAdd={add}
                  onRemove={remove}
                  onRestore={restoreRemoved}
                  onExport={() => navigate("export")}
                  canExport={can("export")}
                  importRequest={importRequest}
                  stepRequest={studioStepRequest}
                  onCropCountChange={setStudioCropCount}
                  restoreRequest={studioRestoreRequest}
                  storageScope={storageScope}
                  documentId={extraction.id}
                  branchId={branchId}
                  onDocumentChange={(id) => {
                    if (!storageScope) return;
                    const url = new URL(window.location.href);
                    if (id) url.searchParams.set("extraction", id);
                    else url.searchParams.delete("extraction");
                    window.history.replaceState(null, "", url);
                  }}
                />
              </main>
            )}
          {can("teaching") &&
            (opened.has("teaching") || view === "teaching") && (
              <div hidden={view !== "teaching"} className={s.teachingContent}>
                <TeachingView />
              </div>
            )}
          {can("concept") && (opened.has("concept") || view === "concept") && (
            <main hidden={view !== "concept"} className={s.viewContent}>
              <ConceptView />
            </main>
          )}
          {can("conceptBlank") &&
            (opened.has("conceptBlank") || view === "conceptBlank") && (
              <main hidden={view !== "conceptBlank"} className={s.viewContent}>
                <ConceptBlankView
                  active={view === "conceptBlank"}
                  textbookEnabled={can("textbook")}
                  storageScope={storageScope}
                  openDocument={blankDocument}
                  branchId={branchId}
                />
              </main>
            )}
          {can("srs") && (opened.has("srs") || view === "srs") && (
            <main hidden={view !== "srs"} className={s.viewContent}>
              <SrsWorkspaceView
                fadingGate={fadingGate}
                branchId={branchId}
                legacy={<CourseDashboard textbookEnabled={can("textbook")} />}
              />
            </main>
          )}
          {can("textbook") &&
            (opened.has("textbook") || view === "textbook") && (
              <main hidden={view !== "textbook"} className={s.viewContent}>
                <TextbookView />
              </main>
            )}
          {/* 오늘의 영어(D-148) — 개념·SRS 블록과 같은 결로 마운트를 유지한다. `worksheetView` 에 넣지 않는다 */}
          {canEnglish &&
            ([...opened].some((item) => isEnglishView(item)) ||
              (view !== null && isEnglishView(view))) && (
              <main
                hidden={view === null || !isEnglishView(view)}
                className={s.viewContent}
              >
                <EnglishStudio
                  key={workspaceMenusOf("english")
                    .filter((menu) => enabledMenus.has(menu))
                    .join(",")}
                  view={englishView}
                  allowedMenus={allowedMenus}
                  onNavigate={navigate}
                  newExamOpen={modal === "english-exam"}
                  onNewExam={openNewExam}
                  onNewExamClose={closeModal}
                  openSetRequest={
                    canOpenEnglishSet && openSet.id
                      ? (openSet as { id: string; version: number })
                      : undefined
                  }
                  onSetOpened={forgetSetLink}
                  bankSeed={can("english-maker") ? bankMakerSeed : undefined}
                  onBankSeedHandled={(requestId) =>
                    setBankMakerSeed((current) =>
                      current?.requestId === requestId ? undefined : current,
                    )
                  }
                  onNotice={englishNotice}
                />
              </main>
            )}
          {can("english-listening") &&
            (opened.has("english-listening") ||
              view === "english-listening") && (
              <main
                hidden={view !== "english-listening"}
                className={s.viewContent}
              >
                <ListeningStudio
                  active={view === "english-listening"}
                  openSetRequest={openListening}
                  onSetOpened={(version) =>
                    setOpenListening((current) =>
                      current?.version === version ? undefined : current,
                    )
                  }
                />
              </main>
            )}
          {can("english-bank") &&
            (opened.has("english-bank") || view === "english-bank") && (
              <main hidden={view !== "english-bank"} className={s.viewContent}>
                <EnglishResourceBank
                  active={view === "english-bank"}
                  allowedMenus={allowedMenus}
                  onUsePassage={(seed) => {
                    if (navigate("english-maker")) setBankMakerSeed(seed);
                  }}
                  onOpenListening={(id) => {
                    if (navigate("english-listening"))
                      setOpenListening({ id, version: Date.now() });
                  }}
                  onOpenSet={(id) => {
                    if (navigate("english-library"))
                      setOpenSet((current) => ({
                        id,
                        version: current.version + 1,
                      }));
                  }}
                  onNewExam={
                    canCreateEnglishExam
                      ? () => {
                          if (navigate("english")) setModal("english-exam");
                        }
                      : undefined
                  }
                  onNotice={setNotice}
                />
              </main>
            )}
          {view === "export" && hydrated && (
            <WorksheetEditor
              selected={selected}
              title={title}
              columns={columns}
              answers={answers}
              printOptions={printOptions}
              printMeta={printMeta}
              setPrintOptions={setPrintOptions}
              setPrintMeta={setPrintMeta}
              savedAt={savedAt}
              cloudSaveStatus={
                storageScope
                  ? saveStatus === "saved"
                    ? savedAt
                      ? "계정에 저장됨"
                      : "작업 준비 완료"
                    : saveStatus === "error"
                      ? "계정 저장 실패 · 다시 저장해 주세요"
                      : "계정에 저장 중…"
                  : undefined
              }
              setTitle={setTitle}
              setColumns={setColumns}
              setAnswers={setAnswers}
              save={save}
              libraryLabel={libraryLabel}
              restore={restore}
              download={download}
              toggle={toggle}
              move={move}
              reorder={reorder}
              navigate={navigate}
              allowedMenus={allowedMenus}
              onImportFiles={
                can("studio") ? () => fileRef.current?.click() : undefined
              }
              onEditSource={
                can("studio")
                  ? (problem) => {
                      if (!can("studio") || !problem.studioCrop) return;
                      setStudioRestoreRequest({
                        id: Date.now(),
                        crops: [problem.studioCrop],
                      });
                      navigate("studio");
                    }
                  : undefined
              }
              cropCount={studioCropCount}
              onGoToStep={
                can("studio")
                  ? (step) => {
                      if (!can("studio")) return;
                      // 시계가 아니라 셈으로 센다 — 같은 밀리초에 두 번 누르면 둘째가 묻힌다.
                      setStudioStepRequest((request) => ({
                        id: (request?.id ?? 0) + 1,
                        step,
                      }));
                      navigate("studio");
                    }
                  : undefined
              }
            />
          )}
          {view === "library" && storageScope && (
            <PrivateLibrary
              storageScope={storageScope}
              branchId={branchId}
              canExport={can("export")}
              canStudio={can("studio")}
              onOpenDraft={openSaved}
              onOpenExtraction={(id) => {
                if (!can("studio")) return;
                setExtraction((current) => ({
                  id,
                  version: current.version + 1,
                }));
                const url = new URL(window.location.href);
                url.searchParams.set("extraction", id);
                window.history.replaceState(null, "", url);
                navigate("studio");
              }}
              canConceptBlank={can("conceptBlank")}
              onOpenConceptBlank={(id) => {
                if (!can("conceptBlank")) return;
                setBlankDocument((current) => ({
                  id,
                  version: (current?.version ?? 0) + 1,
                }));
                navigate("conceptBlank");
              }}
              onImport={
                can("export") ? () => draftFileRef.current?.click() : undefined
              }
              onNew={canCreate ? () => setModal("new") : undefined}
              onDeleted={async (item) => {
                if (item.kind === "draft") {
                  forgetPrivateDraft(item.id);
                  return;
                }
                // 개념 백지는 고르기만 담는다 — 지울 것이 화면에 없다. 열어 둔 것이었으면 개념 백지 탭이 돌아올 때 다시 읽어 «저장됨»을 풀고, 다음 저장은 새 자료로 간다.
                if (item.kind === "conceptBlank") return;
                await forgetPrivateExtraction(storageScope, item.id);
                const url = new URL(window.location.href);
                if (
                  url.searchParams.get("extraction") === item.id ||
                  extraction.id === item.id
                ) {
                  url.searchParams.delete("extraction");
                  window.history.replaceState(null, "", url);
                  setExtraction((current) => ({
                    version: current.version + 1,
                  }));
                }
              }}
            />
          )}
          {view === "library" && !storageScope && (
            <main className={cloudStyles.library}>
              <WorkspacePageHeader
                title="내 시험지"
                description="저장한 작업을 이어가거나 다른 기기의 작업 파일을 불러오세요."
              >
                {can("export") && (
                  <button
                    className={s.outlineButton}
                    onClick={() => draftFileRef.current?.click()}
                  >
                    <Icon name="upload" size={18} />
                    작업 파일 불러오기
                  </button>
                )}
                {canCreate && (
                  <button
                    className={s.primaryButton}
                    disabled={!hydrated}
                    onClick={() => setModal("new")}
                  >
                    <Icon name="plus" size={18} />새 시험지
                  </button>
                )}
              </WorkspacePageHeader>
              <div className={s.libraryTools}>
                <strong>
                  저장한 시험지 <span>{recent.length}</span>
                </strong>
                <label>
                  <Icon name="search" size={18} />
                  <input
                    value={libraryQuery}
                    onChange={(event) => setLibraryQuery(event.target.value)}
                    placeholder="시험지 이름으로 찾기"
                    aria-label="저장한 시험지 검색"
                  />
                  {libraryQuery && (
                    <button
                      type="button"
                      aria-label="시험지 검색 지우기"
                      onClick={() => setLibraryQuery("")}
                    >
                      <Icon name="close" size={17} />
                    </button>
                  )}
                </label>
              </div>
              {!hydrated ? (
                <WorkProgress
                  className={s.loading}
                  label="저장한 시험지를 불러오는 중입니다…"
                />
              ) : filteredDrafts.length ? (
                <div className={cloudStyles.board}>
                  <table
                    className={cloudStyles.table}
                    aria-label="저장한 시험지 목록"
                  >
                    <thead>
                      <tr>
                        <th scope="col" className={cloudStyles.numberCell}>
                          번호
                        </th>
                        <th scope="col" className={cloudStyles.kindCell}>
                          구분
                        </th>
                        <th scope="col" className={cloudStyles.titleCell}>
                          시험지 이름
                        </th>
                        <th scope="col" className={cloudStyles.countCell}>
                          문항 수
                        </th>
                        <th scope="col" className={cloudStyles.updatedCell}>
                          수정일
                        </th>
                        <th scope="col" className={cloudStyles.actionsCell}>
                          관리
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDrafts.map((item, index) => (
                        <tr key={item.id}>
                          <td className={cloudStyles.numberCell}>
                            {index + 1}
                          </td>
                          <td className={cloudStyles.kindCell}>
                            <span className={cloudStyles.kindBadge}>
                              {item.id === draft.id ? "현재 작업" : "시험지"}
                            </span>
                          </td>
                          <td className={cloudStyles.titleCell}>
                            {can("export") ? (
                              <button
                                type="button"
                                className={cloudStyles.titleButton}
                                aria-label={`${item.title || "제목 없는 시험지"} 편집`}
                                onClick={() => openSaved(item.id)}
                              >
                                {item.title || "제목 없는 시험지"}
                              </button>
                            ) : (
                              <span className={cloudStyles.titleText}>
                                {item.title || "제목 없는 시험지"}
                              </span>
                            )}
                          </td>
                          <td className={cloudStyles.countCell}>
                            {item.problemCount}
                            <span className={cloudStyles.mobileLabel}>
                              문항
                            </span>
                          </td>
                          <td className={cloudStyles.updatedCell}>
                            {formatDraftDate(item.updatedAt)}
                          </td>
                          <td className={cloudStyles.actionsCell}>
                            <SavedWorksheetActions
                              compact
                              title={item.title || "제목 없는 시험지"}
                              current={item.id === draft.id}
                              error={saveError}
                              onRename={(name) => {
                                const saved = renameDraft(item.id, name);
                                if (saved)
                                  setNotice("시험지 이름을 변경했습니다.");
                                return saved;
                              }}
                              onDelete={() => {
                                const removed = deleteDraft(item.id);
                                if (removed) {
                                  setUndo(null);
                                  setNotice("시험지를 삭제했습니다.");
                                }
                                return removed;
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className={s.libraryEmpty}>
                  <span>
                    <Icon name="folder" size={42} />
                  </span>
                  <h2>
                    {libraryQuery
                      ? "검색한 시험지가 없습니다"
                      : "아직 저장한 시험지가 없어요"}
                  </h2>
                  <p>
                    {libraryQuery
                      ? "다른 이름으로 검색해 보세요."
                      : "문제를 담거나 편집하면 작업이 자동으로 저장됩니다."}
                  </p>
                  {(libraryQuery || canCreate) && (
                    <button
                      className={s.primaryButton}
                      onClick={() =>
                        libraryQuery ? setLibraryQuery("") : setModal("new")
                      }
                    >
                      {libraryQuery ? "검색 초기화" : "첫 시험지 만들기"}
                      <Icon name="arrow" size={18} />
                    </button>
                  )}
                </div>
              )}
              <p className={s.libraryNote}>
                <Icon name="save" size={15} />이 브라우저의 저장 공간을
                사용합니다. 다른 기기로 옮길 때는 편집 화면에서 ‘작업 파일
                내보내기’를 사용하세요.
              </p>
            </main>
          )}
        </div>
      </div>
      <dialog
        ref={dialogRef}
        className={s.dialog}
        onCancel={() => setModal(null)}
        aria-labelledby="workspace-dialog-title"
      >
        <div className={s.dialogHeading}>
          <div>
            <span>
              {modal === "search"
                ? "빠른 실행"
                : modal === "new"
                  ? "새로운 수업 자료"
                  : "오늘의수학 작업실"}
            </span>
            <h2 id="workspace-dialog-title">
              {modal === "search"
                ? "무엇을 찾으시나요?"
                : modal === "new"
                  ? "어디서부터 시작할까요?"
                  : "수업 준비, 이렇게 이어가세요"}
            </h2>
          </div>
          <button aria-label="창 닫기" onClick={() => setModal(null)}>
            <Icon name="close" />
          </button>
        </div>
        {modal === "new" && canCreate && (
          <>
            <label className={s.newTitle}>
              시험지 이름 <small>나중에 바꿀 수 있어요</small>
              <input
                ref={newTitleRef}
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                placeholder="오늘의 수학 학습지"
                maxLength={80}
              />
            </label>
            <div className={s.startChoices}>
              {[
                {
                  view: "bank" as const,
                  icon: "bank" as const,
                  title: "시험지 만들기",
                  description: "학년·단원별 문제 선택",
                },
                {
                  view: "studio" as const,
                  icon: "crop" as const,
                  title: "내 자료로 만들기",
                  description: "PDF·이미지에서 문제 자르기",
                },
                {
                  view: "export" as const,
                  icon: "paper" as const,
                  title: "빈 시험지로 시작하기",
                  description: "문제는 나중에 담기",
                },
              ]
                .filter((item) => can(item.view))
                .map((item) => (
                  <button key={item.view} onClick={() => startNew(item.view)}>
                    <span>
                      <Icon name={item.icon} size={24} />
                    </span>
                    <span>
                      <strong>{item.title}</strong>
                      <small>{item.description}</small>
                    </span>
                    <Icon name="arrow" size={20} />
                  </button>
                ))}
            </div>
            {saveError && (
              <p className={s.modalError} role="alert">
                {saveError}
              </p>
            )}
            <p className={s.dialogFoot}>
              현재 작업은 저장한 후 새 시험지를 엽니다.
            </p>
          </>
        )}
        {modal === "search" && hasMenus && (
          <>
            {can("bank") && (
              <form
                className={s.commandSearch}
                onSubmit={(event) => {
                  event.preventDefault();
                  openBank({ q: quickQuery.trim() });
                }}
              >
                <Icon name="search" size={22} />
                <input
                  ref={queryRef}
                  value={quickQuery}
                  onChange={(event) => setQuickQuery(event.target.value)}
                  aria-label="빠른 문제 검색"
                  placeholder="문제 내용, 단원, 문제 번호"
                />
                <button type="submit">
                  검색
                  <Icon name="arrow" size={18} />
                </button>
              </form>
            )}
            <p className={s.commandCaption}>바로 이동</p>
            <div className={s.commandLinks}>
              {quickNav
                .filter((item) => item.id !== "home")
                .map((item) => (
                  <button key={item.id} onClick={() => navigate(item.id)}>
                    <Icon name={item.icon} size={20} />
                    <span>{item.label}</span>
                    <Icon name="arrow" size={17} />
                  </button>
                ))}
              <button onClick={() => setModal("help")}>
                <Icon name="help" size={20} />
                <span>작업실 사용 안내</span>
                <Icon name="arrow" size={17} />
              </button>
            </div>
            <p className={s.dialogFoot}>
              Ctrl / ⌘ K 빠른 찾기<span>Esc 닫기</span>
            </p>
          </>
        )}
        {modal === "help" && (
          <div className={s.helpContent}>
            <ol>
              <li>
                <b>01</b>
                <div>
                  <strong>문제은행 또는 내 자료에서 문제 담기</strong>
                  <p>
                    문제은행에서 학년과 단원을 고르거나, PDF·이미지에서 필요한
                    영역을 자르세요.
                  </p>
                </div>
              </li>
              <li>
                <b>02</b>
                <div>
                  <strong>시험지 순서와 배치 정하기</strong>
                  <p>
                    시험지 편집에서 제목, 문제 순서, 1·2단 배치와 정답지를
                    설정하세요.
                  </p>
                </div>
              </li>
              <li>
                <b>03</b>
                <div>
                  <strong>출력하고 다음 수업에 다시 사용하기</strong>
                  <p>
                    {storageScope
                      ? "인쇄 또는 PDF로 저장하세요. 담은 문제와 시험지 설정은 내 계정에 자동 저장됩니다."
                      : "인쇄 또는 PDF로 저장하세요. 담은 문제와 시험지 설정은 이 브라우저에 자동 저장됩니다."}
                  </p>
                </div>
              </li>
            </ol>
            <div>
              <strong>알아두면 편리해요</strong>
              <p>Ctrl / ⌘ K · 빠른 검색　 Ctrl / ⌘ S · 지금 저장</p>
              <p>
                {storageScope
                  ? "가져온 원본과 추출한 문제도 내 시험지에 저장됩니다. 저장 상태를 확인한 뒤 다른 기기에서 이어서 작업하세요."
                  : "문제 추출 작업은 이 브라우저에 저장됩니다. 다른 기기로 옮길 시험지는 작업 파일로 내보내세요."}
              </p>
            </div>
            <button className={s.primaryButton} onClick={() => setModal(null)}>
              작업실로 돌아가기
              <Icon name="arrow" size={18} />
            </button>
          </div>
        )}
      </dialog>
    </div>
  );
}

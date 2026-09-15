"use client";

import WorkspacePageHeader from "./WorkspacePageHeader";
import WorkProgress from "./WorkProgress";
import SavedWorksheetActions from "./SavedWorksheetActions";
import PrivateLibrary from "./PrivateLibrary";
import cloudStyles from "./PrivateLibrary.module.css";
import { forgetPrivateExtraction } from "./privateStudioSessionStore";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WORKSPACE_MENUS,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import { useWorkspaceAccess } from "./useWorkspaceAccess";
import type { BankData, StudioProblem } from "./types";
import type { StudioCrop } from "./studioHelpers";
import { useWorkspaceDrafts } from "./useWorkspaceDrafts";
import WorkroomHome, { formatDraftDate } from "./WorkroomHome";
import Icon, { type WorkspaceIconName } from "./WorkspaceIcon";
import TodayMathMark from "@/components/brand/TodayMathMark";
import { DevAiProvider } from "./useDevAi";
import DevAiStatusPanel from "./DevAiStatusPanel";
import s from "./Workroom.module.css";
import WorkspaceAccount, { type WorkspaceIdentity } from "./WorkspaceAccount";
const BankView = dynamic(() => import("./BankView"), {
  loading: () => (
    <WorkProgress className={s.loading} label="문제은행을 불러오는 중입니다…" />
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
type View = WorkspaceMenu;
const navItems: {
  id: View;
  label: string;
  short: string;
  icon: WorkspaceIconName;
}[] = [
  { id: "home", label: "오늘의 작업", short: "홈", icon: "home" },
  { id: "bank", label: "문제은행", short: "문제은행", icon: "bank" },
  { id: "studio", label: "자료 제작", short: "자료 제작", icon: "crop" },
  { id: "export", label: "시험지 · 내보내기", short: "시험지", icon: "paper" },
  { id: "library", label: "내 시험지", short: "보관함", icon: "folder" },
  {
    id: "teaching",
    label: "수업 · 학생 관리",
    short: "수업·학생",
    icon: "class",
  },
  // D-124 ⑽ — «수업 · 학생 관리» 바로 아래
  { id: "concept", label: "오늘의 개념", short: "개념", icon: "play" },
];
const viewValid = (value: string): value is View =>
  WORKSPACE_MENUS.some((item) => item.id === value);
export default function UnifiedWorkspace({
  initialData,
  storageScope,
  currentUser,
  allowedMenus,
}: {
  initialData: BankData;
  storageScope?: string;
  currentUser?: WorkspaceIdentity;
  allowedMenus?: WorkspaceMenu[];
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
      />
    </DevAiProvider>
  );
}
function UnifiedWorkspaceContent({
  initialData,
  storageScope,
  currentUser,
  allowedMenus,
}: {
  initialData: BankData;
  storageScope?: string;
  currentUser?: WorkspaceIdentity;
  allowedMenus: WorkspaceMenu[];
}) {
  const menuKey = allowedMenus.join(",");
  const enabledMenus = useMemo(
    () => new Set(menuKey.split(",").filter(viewValid)),
    [menuKey],
  );
  const can = useCallback(
    (menu: View) => enabledMenus.has(menu),
    [enabledMenus],
  );
  const availableNav = navItems.filter((item) => can(item.id));
  const defaultView = [...enabledMenus][0] ?? null;
  const hasMenus = enabledMenus.size > 0;
  const canCreate = can("bank") || can("studio") || can("export");
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
    setTitle,
    setProblems: setSelected,
    setColumns,
    setAnswers,
    setPrintOptions,
    setPrintMeta,
    saveNow,
    createDraft,
    openDraft,
    renameDraft,
    deleteDraft,
    importDraft,
    forgetPrivateDraft,
  } = useWorkspaceDrafts(
    storageScope,
    can("library") || can("studio") || can("export"),
  );
  const {
    title,
    problems: selected,
    columns,
    answers,
    printOptions,
    printMeta,
    updatedAt: savedAt,
  } = draft;
  const [requestedView, setView] = useState<View | null>(defaultView);
  const view =
    requestedView && can(requestedView) ? requestedView : defaultView;
  const [studioReviewRequest, setStudioReviewRequest] = useState(0);
  const [extraction, setExtraction] = useState<{
    id?: string;
    version: number;
  }>({ version: 0 });
  const [studioRestoreRequest, setStudioRestoreRequest] = useState<{
    id: number;
    crops: StudioCrop[];
  }>();
  const [opened, setOpened] = useState<Set<View>>(
    () => new Set(defaultView ? [defaultView] : []),
  );
  const [bankEntry, setBankEntry] = useState<{
    q?: string;
    grade?: string;
    version: number;
  }>({ version: 0 });
  const [notice, setNoticeMessage] = useState("");
  const [noticeError, setNoticeError] = useState(false);
  const setNotice = useCallback((message: string, error = false) => {
    setNoticeMessage(message);
    setNoticeError(error);
  }, []);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [undo, setUndo] = useState<{
    problem: StudioProblem;
    index: number;
    draftId: string;
  } | null>(null);
  const [modal, setModal] = useState<"new" | "search" | "help" | null>(null);
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
    navItems.find((item) => item.id === view)?.label ?? "메뉴 이용 안내";
  const navigate = useCallback(
    (next: View) => {
      if (!can(next)) return;
      setView(next);
      setOpened((current) =>
        current.has(next) ? current : new Set([...current, next]),
      );
      setNotice("");
      setUndo(null);
      setModal(null);
      const url = new URL(window.location.href);
      url.hash = next === "home" ? "" : next;
      if (url.href !== window.location.href)
        window.history.pushState(null, "", url);
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [can, setNotice, setModal],
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
    try {
      localStorage.setItem("today-math-sidebar-collapsed", String(value));
    } catch {
      /* Optional preference. */
    }
  }, [sidebarCollapsed]);
  useEffect(() => {
    const sync = () => {
      const value = window.location.hash.slice(1) || "home";
      const next = viewValid(value) && can(value) ? value : defaultView;
      setView(next);
      setOpened(
        (current) => new Set([...current, ...(next ? [next] : [])].filter(can)),
      );
      const url = new URL(window.location.href);
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
    };
    // Synchronize the browser's navigation state, including a directly opened hash.

    sync();
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("popstate", sync);
      window.removeEventListener("hashchange", sync);
    };
  }, [can, defaultView, storageScope]);
  useEffect(() => {
    // Close controls immediately after the corresponding permission is revoked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModal((current) =>
      !hasMenus || (current === "new" && !canCreate) ? null : current,
    );
  }, [hasMenus, canCreate]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modal) {
      if (!dialog.open) dialog.showModal();
      if (modal === "search") queryRef.current?.focus();
      if (modal === "new") newTitleRef.current?.focus();
      if (modal === "help") dialog.querySelector("button")?.focus();
    }
    if (!modal && dialog.open) dialog.close();
  }, [modal]);
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
      if (event.key.toLowerCase() === "s" && canCreate) {
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
  }, [saveNow, setNotice, toggleSidebar, hasMenus, canCreate, storageScope]);
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
      setUndo({ problem, index, draftId: draft.id });
      setNotice("시험지에서 문제를 뺐습니다.");
    }
    setSelected((current) =>
      current.some((p) => p.id === problem.id)
        ? current.filter((p) => p.id !== problem.id)
        : [...current, problem],
    );
  }
  function undoRemove() {
    if (!undo || undo.draftId !== draft.id || undo.problem.eligible === false)
      return;
    setSelected((current) => {
      if (current.some((p) => p.id === undo.problem.id)) return current;
      const next = [...current];
      next.splice(Math.min(undo.index, next.length), 0, undo.problem);
      return next;
    });
    setUndo(null);
    setNotice("문제를 다시 담았습니다.");
  }
  const add = (problems: StudioProblem[]) =>
    setSelected((current) => {
      problems = problems.filter((problem) => problem.eligible !== false);
      const updates = new Map(problems.map((p) => [p.id, p]));
      return [
        ...current.map((p) => updates.get(p.id) ?? p),
        ...problems.filter((p) => !current.some((old) => old.id === p.id)),
      ];
    });
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
  async function save() {
    setUndo(null);
    if (await saveNow())
      setNotice(
        storageScope
          ? "내 계정에 작업을 저장했습니다."
          : "이 브라우저에 작업을 저장했습니다.",
      );
  }
  async function openSaved(id: string) {
    if (!can("export")) return;
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
      data-authenticated={Boolean(currentUser)}
      data-menu-count={availableNav.length}
    >
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
      <aside className={s.sidebar}>
        <div className={s.sideHeader}>
          <button
            className={s.brand}
            onClick={() => defaultView && navigate(defaultView)}
            aria-label={
              defaultView === "home" ? "오늘의수학 홈" : "오늘의수학 작업실"
            }
            disabled={!hasMenus}
          >
            <span className={s.brandMark}>
              <TodayMathMark size={36} inverse />
            </span>
            <span>오늘의수학</span>
          </button>
          <button
            className={s.sidebarToggle}
            onClick={toggleSidebar}
            aria-label={
              sidebarCollapsed ? "왼쪽 메뉴 펼치기" : "왼쪽 메뉴 접기"
            }
            title={
              sidebarCollapsed ? "메뉴 펼치기 (Ctrl+\\)" : "메뉴 접기 (Ctrl+\\)"
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
        {canCreate && (
          <button
            className={s.newButton}
            aria-label="새 시험지 만들기"
            title={sidebarCollapsed ? "새 시험지 만들기" : undefined}
            disabled={!hydrated}
            onClick={() => setModal("new")}
          >
            <Icon name="plus" />
            <span>새 시험지 만들기</span>
          </button>
        )}
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
                {item.id === "library" && recent.length > 0 && (
                  <span className={s.libraryCount}>{recent.length}</span>
                )}
              </button>
            </div>
          ))}
        </nav>
        {can("export") && (
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
        {can("studio") && (
          <DevAiStatusPanel
            collapsed={sidebarCollapsed}
            onExpand={toggleSidebar}
          />
        )}
        {hasMenus && (
          <div className={s.sidebarFooter}>
            <button onClick={() => setModal("help")}>
              <Icon name="help" size={19} />
              작업실 사용 안내
              <Icon name="chevron" size={15} />
            </button>
            {can("teaching") && (
              <button
                className={s.accountButton}
                onClick={() => navigate("teaching")}
              >
                <span>수</span>
                <span>
                  <strong>나의 수업 공간</strong>
                  <small>계정 · 반 · 학생 관리</small>
                </span>
                <Icon name="chevron" size={16} />
              </button>
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
          <div className={s.headerActions}>
            {canCreate && (
              <span className={s.saveState} data-state={saveStatus}>
                {!hydrated || saveStatus === "saving" ? (
                  <WorkProgress
                    variant="inline"
                    label={!hydrated ? "작업 불러오는 중" : "저장 중…"}
                  />
                ) : (
                  <>
                    <Icon
                      name={saveStatus === "error" ? "warning" : "check"}
                      size={15}
                    />
                    <span role="status">
                      {saveStatus === "disabled"
                        ? "계정 저장 권한 없음"
                        : saveStatus === "error"
                          ? "저장 확인 필요"
                          : selected.length
                            ? storageScope
                              ? "계정에 저장됨"
                              : "자동 저장됨"
                            : "작업 준비 완료"}
                    </span>
                  </>
                )}
              </span>
            )}
            {can("export") && (
              <button
                className={s.headerPaper}
                onClick={() => navigate("export")}
                aria-label={`담은 문제 ${selected.length}`}
              >
                <Icon name="paper" size={18} />
                <span>시험지</span>
                <b>{selected.length}</b>
              </button>
            )}
          </div>
          {currentUser && (
            <div className={s.accountSlot}>
              <WorkspaceAccount user={currentUser} />
            </div>
          )}
        </header>
        <div className={s.notifications}>
          {canCreate && saveError && (
            <div
              className={storageScope ? cloudStyles.cloudError : s.saveError}
              role="alert"
            >
              <Icon name="warning" size={19} />
              <p>{saveError}</p>
              {can("export") && (
                <button onClick={download}>작업 파일 내려받기</button>
              )}
              <button onClick={save}>다시 저장</button>
            </div>
          )}
          {hasMenus && notice && (
            <div
              className={s.notice}
              data-error={noticeError}
              role={noticeError ? "alert" : "status"}
            >
              <Icon name={noticeError ? "warning" : "check"} size={18} />
              <span>{notice}</span>
              {undo && undo.draftId === draft.id && (
                <button className={s.undoButton} onClick={undoRemove}>
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
              saveStatus={saveStatus}
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
          {can("bank") && (opened.has("bank") || view === "bank") && (
            <main hidden={view !== "bank"} className={s.viewContent}>
              <BankView
                key={bankEntry.version}
                initialData={initialData}
                initialFilters={bankEntry}
                selected={selected}
                onToggle={toggle}
                onExport={() => navigate("export")}
                canExport={can("export")}
                canUseAi={can("studio")}
              />
            </main>
          )}
          {can("studio") && (opened.has("studio") || view === "studio") && (
            <main hidden={view !== "studio"} className={s.studioContent}>
              <StudioView
                key={`${storageScope ?? "preview"}:${extraction.version}`}
                active={view === "studio"}
                onAdd={add}
                onExport={() => navigate("export")}
                canExport={can("export")}
                importRequest={importRequest}
                reviewRequest={studioReviewRequest}
                restoreRequest={studioRestoreRequest}
                storageScope={storageScope}
                documentId={extraction.id}
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
          {view === "export" && (
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
              restore={restore}
              download={download}
              toggle={toggle}
              move={move}
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
              onBackToReview={
                can("studio")
                  ? () => {
                      if (!can("studio")) return;
                      setStudioReviewRequest((request) => request + 1);
                      navigate("studio");
                    }
                  : undefined
              }
            />
          )}
          {view === "library" && storageScope && (
            <PrivateLibrary
              storageScope={storageScope}
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
              onImport={
                can("export") ? () => draftFileRef.current?.click() : undefined
              }
              onNew={canCreate ? () => setModal("new") : undefined}
              onDeleted={async (item) => {
                if (item.kind === "draft") {
                  forgetPrivateDraft(item.id);
                  return;
                }
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
            <main className={s.library}>
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
                <div className={s.libraryGrid}>
                  {filteredDrafts.map((item) => (
                    <article key={item.id} className={s.libraryCard}>
                      <div className={s.libraryCardTop}>
                        <span>
                          <Icon name="paper" size={24} />
                        </span>
                        <small>
                          {item.id === draft.id ? "현재 작업" : "저장된 시험지"}
                        </small>
                      </div>
                      <h2 title={item.title || "제목 없는 시험지"}>
                        {item.title || "제목 없는 시험지"}
                      </h2>
                      <p>
                        {item.problemCount}문항<span>·</span>
                        {formatDraftDate(item.updatedAt)}
                      </p>
                      <SavedWorksheetActions
                        title={item.title || "제목 없는 시험지"}
                        current={item.id === draft.id}
                        error={saveError}
                        onEdit={
                          can("export") ? () => openSaved(item.id) : undefined
                        }
                        onRename={(name) => {
                          const saved = renameDraft(item.id, name);
                          if (saved) setNotice("시험지 이름을 변경했습니다.");
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
                    </article>
                  ))}
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
                  title: "문제은행에서 만들기",
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
              {availableNav
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
                  : "자료 제작 작업은 이 브라우저에 저장됩니다. 다른 기기로 옮길 시험지는 작업 파일로 내보내세요."}
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

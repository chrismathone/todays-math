"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Icon from "./WorkspaceIcon";
import WorkProgress from "./WorkProgress";
import type { BankData, StudioProblem } from "./types";
import { getStudioEndpoints } from "@/lib/studio-ai/endpoints";
import { unifiedBankBootstrapSchema } from "@/contracts/unifiedBankBootstrap.contract";
import {
  WORKSPACE_MENUS,
  canOutputFrom,
  type WorkspaceMenu,
} from "@/contracts/accountAccess.contract";
import s from "./WorkroomHome.module.css";
const TeachingOverview = dynamic(() => import("./TeachingOverview"), {
  ssr: false,
  loading: () => <WorkProgress label="수업 공간을 준비하고 있어요…" />,
});
export interface RecentWorksheet {
  id: string;
  title: string;
  problemCount: number;
  updatedAt: string;
}
interface Props {
  cloudStorage?: boolean;
  allowedMenus?: WorkspaceMenu[];
  data: BankData;
  deferBankMetadata?: boolean;
  navigationReady?: boolean;
  draft: {
    id: string;
    title: string;
    problems: StudioProblem[];
    updatedAt: string;
  };
  recent: RecentWorksheet[];
  hydrated: boolean;
  onNew: () => void;
  onBank: (filters?: { q?: string; grade?: string }) => void;
  onImport: () => void;
  onFiles: (files: File[]) => void;
  onOpen: (id: string) => void;
  onNavigate: (
    view: "bank" | "studio" | "export" | "teaching" | "library",
  ) => void;
}
export function formatDraftDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "방금 전"
    : new Intl.DateTimeFormat("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
}
export default function WorkroomHome({
  data: initialData,
  deferBankMetadata = false,
  navigationReady = true,
  draft,
  recent,
  hydrated,
  cloudStorage = false,
  onNew,
  onBank,
  onImport,
  onFiles,
  onOpen,
  onNavigate,
  allowedMenus = WORKSPACE_MENUS.map((menu) => menu.id),
}: Props) {
  const can = (menu: WorkspaceMenu) => allowedMenus.includes(menu);
  const canOutput = canOutputFrom(allowedMenus);
  const canOpenSaved = canOutputFrom(allowedMenus, "library");
  const canCreate = can("bank") || can("studio") || can("library");
  const canBank = can("bank");
  const showPrimary = can("bank") || can("studio") || can("library");
  const showSecondary = canOutput || can("teaching");
  const continueView =
    !hydrated || draft.problems.length
      ? "export"
      : can("bank")
        ? "bank"
        : can("studio")
          ? "studio"
          : "export";
  const [query, setQuery] = useState("");
  const [dragging, setDragging] = useState(false);
  const [bankData, setBankData] = useState<BankData>();
  useEffect(() => {
    if (!deferBankMetadata || !navigationReady || !canBank) return;
    const controller = new AbortController();
    // The existing authenticated list route has a metadata-only view backed by
    // the same public summary cache as the server bootstrap.
    void fetch(
      `${getStudioEndpoints().problems}?identity=question&view=bootstrap`,
      {
        signal: controller.signal,
        cache: "no-store",
        credentials: "same-origin",
      },
    )
      .then(async (response) => {
        if (!response.ok) throw new Error("bank unavailable");
        const value = unifiedBankBootstrapSchema.parse(await response.json());
        if (!controller.signal.aborted) setBankData(value);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setBankData({
            ...initialData,
            error:
              "문제은행 연결을 확인해 주세요. 문제 추출은 바로 사용할 수 있습니다.",
          });
      });
    return () => controller.abort();
  }, [deferBankMetadata, navigationReady, canBank, initialData]);
  const data = bankData ?? initialData;
  const bankLoading = deferBankMetadata && !bankData;
  const total = data.grades.reduce((sum, g) => sum + g.count, 0);
  const gradeGroups = [
    { prefix: "초", label: "초등" },
    { prefix: "중", label: "중등" },
  ];
  const visibleDrafts = recent.slice(0, 8);
  return (
    <main className={s.home}>
      <h1 className={s.srOnly}>오늘의 작업</h1>
      {!showPrimary && !showSecondary && (
        <p className={s.accessNotice}>
          이용 가능한 작업 메뉴가 없습니다. 관리자에게 메뉴 이용 권한을 요청해
          주세요.
        </p>
      )}
      <div
        className={s.dashboard}
        data-single-column={!showPrimary || !showSecondary}
      >
        {showPrimary && (
          <div className={s.primaryColumn}>
            {can("bank") && (
              <section
                className={s.bankCard}
                aria-labelledby="quick-bank-title"
              >
                <div className={s.bankHeading}>
                  <div>
                    <span className={s.blueIcon}>
                      <Icon name="bank" size={24} />
                    </span>
                    <div>
                      <span className={s.eyebrow}>시험지 만들기</span>
                      <h2 id="quick-bank-title">
                        수업에 맞는 시험지를 구성하세요
                      </h2>
                    </div>
                  </div>
                  {!bankLoading && (
                    <span className={s.databaseCount}>
                      {data.error ? (
                        "연결 확인 필요"
                      ) : (
                        <>
                          <b>{total.toLocaleString()}</b>문항
                        </>
                      )}
                    </span>
                  )}
                </div>
                <form
                  className={s.quickSearch}
                  role="search"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onBank({ q: query.trim() });
                  }}
                >
                  <Icon name="search" size={23} />
                  <input
                    id="workspace-home-search"
                    aria-label="문제은행 바로 검색"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="문제 내용, 단원, 문제 번호로 검색"
                  />
                  <button type="submit">
                    문제 찾기
                    <Icon name="arrow" size={18} />
                  </button>
                </form>
                {bankLoading ? (
                  <WorkProgress label="시험지 만들기를 여는 중입니다…" />
                ) : (
                  <div className={s.gradeGroups}>
                    {gradeGroups.map((group) => (
                      <div className={s.gradeGroup} key={group.prefix}>
                        <div>
                          <strong>{group.label}</strong>
                        </div>
                        <div>
                          {data.grades
                            .filter((g) => g.grade.startsWith(group.prefix))
                            .sort((a, b) =>
                              a.grade.localeCompare(b.grade, "ko"),
                            )
                            .map((g) => (
                              <button
                                key={g.grade}
                                aria-label={`${g.grade} 문제 찾기`}
                                onClick={() => onBank({ grade: g.grade })}
                              >
                                <strong>
                                  {g.grade.replace(group.prefix, "")}학년
                                </strong>
                                <Icon name="chevron" size={15} />
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className={s.bankFoot}>
                  <button onClick={() => onBank()}>
                    시험지 만들기
                    <Icon name="arrow" size={16} />
                  </button>
                </div>
                {data.error && (
                  <p className={s.inlineError} role="status">
                    {data.error}
                  </p>
                )}
              </section>
            )}
            {can("studio") && (
              <section
                className={`${s.importCard} ${dragging ? s.dragging : ""}`}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={(event) => {
                  if (
                    !event.currentTarget.contains(event.relatedTarget as Node)
                  )
                    setDragging(false);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const files = Array.from(event.dataTransfer.files);
                  if (files.length) onFiles(files);
                }}
                aria-labelledby="source-import-title"
              >
                <div className={s.sourceIllustration} aria-hidden="true">
                  <span />
                  <div>
                    <Icon name="crop" size={26} />
                    <i>PDF</i>
                  </div>
                </div>
                <div className={s.importCopy}>
                  <h2 id="source-import-title">내 자료에서 문제 가져오기</h2>
                  <p>이 영역에 PDF나 이미지를 끌어 놓으세요.</p>
                </div>
                <button className={s.importButton} onClick={onImport}>
                  <Icon name="upload" size={18} />
                  <span>자료 가져오기</span>
                </button>
              </section>
            )}
            {can("library") && (
              <section
                className={s.recentSection}
                aria-labelledby="recent-drafts-heading"
              >
                <div className={s.sectionHeader}>
                  <div>
                    <Icon name="clock" size={21} />
                    <h2 id="recent-drafts-heading">최근 작업</h2>
                    {hydrated && <span>{recent.length}</span>}
                  </div>
                  <button onClick={() => onNavigate("library")}>
                    모두 보기
                    <Icon name="chevron" size={16} />
                  </button>
                </div>
                {!hydrated ? (
                  <div className={s.recentEmpty}>
                    <span>
                      <Icon name="folder" size={27} />
                    </span>
                    <div>
                      <strong>저장한 시험지 이어하기</strong>
                      <p>내 시험지에서 저장한 자료를 열어 보세요.</p>
                    </div>
                    <button onClick={() => onNavigate("library")}>
                      내 시험지 <Icon name="arrow" size={17} />
                    </button>
                  </div>
                ) : visibleDrafts.length ? (
                  <div
                    className={s.recentList}
                    role="region"
                    aria-label="최근 시험지 목록"
                    tabIndex={0}
                  >
                    {visibleDrafts.map((item) => (
                      <button
                        key={item.id}
                        disabled={!canOpenSaved}
                        onClick={() => canOpenSaved && onOpen(item.id)}
                      >
                        <span className={s.documentIcon}>
                          <Icon name="paper" size={22} />
                        </span>
                        <span className={s.recentInfo}>
                          <strong title={item.title || "제목 없는 시험지"}>
                            {item.title || "제목 없는 시험지"}
                            {item.id === draft.id && <i>현재 작업</i>}
                          </strong>
                          <small>
                            {item.problemCount}문항<span>·</span>
                            {formatDraftDate(item.updatedAt)}
                          </small>
                        </span>
                        {canOpenSaved && (
                          <span className={s.resume}>
                            이어하기
                            <Icon name="arrow" size={17} />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className={s.recentEmpty}>
                    <span>
                      <Icon name="folder" size={27} />
                    </span>
                    <div>
                      <strong>첫 시험지를 만들어보세요</strong>
                      <p>
                        문제를 담으면 작업이 자동으로 저장되고, 여기에서 이어갈
                        수 있어요.
                      </p>
                    </div>
                    {canCreate && (
                      <button onClick={onNew}>
                        새 시험지
                        <Icon name="plus" size={17} />
                      </button>
                    )}
                  </div>
                )}
                <p className={s.localNote}>
                  <Icon name="save" size={14} />
                  {cloudStorage
                    ? "내 계정에 보관됩니다. 다른 기기에서도 로그인해 이어서 작업하세요."
                    : "이 브라우저에 보관됩니다. 다른 기기에서는 작업 파일을 불러오세요."}
                </p>
              </section>
            )}
          </div>
        )}
        {showSecondary && (
          <aside className={s.secondaryColumn}>
            {canOutput && (
              <section
                className={s.activeDraft}
                aria-labelledby="active-draft-heading"
              >
                <div className={s.activeHeading}>
                  <h2 id="active-draft-heading">만들고 있는 시험지</h2>
                </div>
                <div className={s.draftPreview}>
                  <div className={s.tinyPaper} aria-hidden="true">
                    <small>오늘 수학</small>
                    <b>수학 학습지</b>
                    <i />
                    <span>01</span>
                    <i />
                    <span>02</span>
                    <i />
                  </div>
                  <div>
                    <span className={s.draftCaption}>
                      {hydrated ? "현재 작업" : "시험지 편집"}
                    </span>
                    <h3>
                      {hydrated
                        ? draft.title || "제목 없는 시험지"
                        : "시험지 작업 이어하기"}
                    </h3>
                    {hydrated && (
                      <strong className={s.problemTotal}>
                        {draft.problems.length}
                        <small> 문항</small>
                      </strong>
                    )}
                  </div>
                </div>
                {draft.problems.length > 0 ? (
                  <div className={s.draftSources}>
                    <span>
                      <i />
                      시험지 만들기{" "}
                      <b>
                        {
                          draft.problems.filter(
                            (p) => !p.sourceLabel && !p.croppedImage,
                          ).length
                        }
                      </b>
                    </span>
                    <span>
                      <i />내 자료{" "}
                      <b>
                        {
                          draft.problems.filter(
                            (p) => p.sourceLabel || p.croppedImage,
                          ).length
                        }
                      </b>
                    </span>
                  </div>
                ) : (
                  <p className={s.draftEmptyText}>
                    {hydrated
                      ? "아직 담은 문제가 없습니다."
                      : "편집 화면에서 이전 작업을 불러옵니다."}
                  </p>
                )}
                <button
                  className={s.primaryButton}
                  onClick={() => onNavigate(continueView)}
                >
                  {draft.problems.length || continueView === "export"
                    ? "시험지 편집 이어가기"
                    : "첫 문제 담기"}
                  <Icon name="arrow" size={19} />
                </button>
                {canCreate && (
                  <button className={s.newDraftButton} onClick={onNew}>
                    <Icon name="plus" size={16} />새 시험지 만들기
                  </button>
                )}
              </section>
            )}
            {can("teaching") && (
              <TeachingOverview onOpen={() => onNavigate("teaching")} />
            )}
          </aside>
        )}
      </div>
    </main>
  );
}

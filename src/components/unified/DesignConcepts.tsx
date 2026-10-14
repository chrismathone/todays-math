"use client";

import { useState } from "react";
import UnifiedProblem from "./UnifiedProblem";
import type { BankData, StudioProblem } from "./types";
import c from "./DesignConcepts.module.css";

export type DesignId = 1 | 2 | 3 | 4 | 5;
type View = "home" | "bank" | "studio" | "export" | "teaching";
export const DESIGNS = [
  {
    id: 1,
    name: "통합 작업실",
    short: "작업실형",
    title: "모든 작업을 한눈에.",
    description:
      "고정 사이드바와 작업 대시보드. 문제 찾기, 자료 제작, 학생 관리 사이를 빠르게 오가는 구조입니다.",
    structure: "왼쪽 메뉴 + 작업 대시보드",
    focus: "여러 업무를 오가는 선생님",
    color: "#3159df",
  },
  {
    id: 2,
    name: "문제 탐색",
    short: "검색 중심형",
    title: "좋은 문제부터 시작.",
    description:
      "상단 메뉴 아래에 검색을 크게 배치했습니다. 학년과 단원으로 탐색하고 필요한 문제를 모읍니다.",
    structure: "상단 메뉴 + 대형 검색 + 분류 목록",
    focus: "문제은행을 가장 자주 쓰는 선생님",
    color: "#315343",
  },
  {
    id: 3,
    name: "시험지 스튜디오",
    short: "편집기형",
    title: "완성될 시험지를 보면서.",
    description:
      "자료 목록, 시험지, 설정을 나란히 놓았습니다. 페이지를 중심에 두고 문제를 추가하며 편집합니다.",
    structure: "아이콘 메뉴 + 자료 / 캔버스 / 설정",
    focus: "자료 편집과 시험지 제작이 많은 선생님",
    color: "#365cd4",
  },
  {
    id: 4,
    name: "수업 플래너",
    short: "수업 일정형",
    title: "다음 수업에서 출발.",
    description:
      "날짜와 반별 수업이 첫 화면의 중심입니다. 수업에 필요한 문제와 학습지를 그 자리에서 준비합니다.",
    structure: "주간 날짜 + 시간별 수업 + 준비 노트",
    focus: "여러 반과 학생을 관리하는 선생님",
    color: "#7564a1",
  },
  {
    id: 5,
    name: "자료 제작 보드",
    short: "제작 단계형",
    title: "모으고, 다듬고, 완성.",
    description:
      "자료가 완성되는 과정을 가로로 펼쳤습니다. 지금 어디까지 했는지, 다음에 무엇을 할지 보입니다.",
    structure: "상단 메뉴 + 3단계 작업 보드",
    focus: "자료를 처음부터 끝까지 만드는 선생님",
    color: "#a76820",
  },
] as const;

function Arrow() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M4 12h16m-6-6 6 6-6 6" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="7" />
      <path d="m15 15 6 6" />
    </svg>
  );
}

export function DesignSwitcher({
  design,
  comparing,
  onSelect,
  onCompare,
}: {
  design: DesignId;
  comparing: boolean;
  onSelect: (id: DesignId) => void;
  onCompare: () => void;
}) {
  return (
    <div className={c.switcher} aria-label="디자인 시안 선택">
      <button
        className={c.compareToggle}
        onClick={onCompare}
        aria-pressed={comparing}
      >
        <span className={c.compareIcon}>▦</span>
        <span>
          시안 비교<small>5가지 화면 구조</small>
        </span>
      </button>
      <div className={c.switcherTabs}>
        {DESIGNS.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            aria-pressed={!comparing && design === item.id}
          >
            <b>{String(item.id).padStart(2, "0")}</b>
            <span>{item.short}</span>
          </button>
        ))}
      </div>
      <span className={c.previewBadge}>DESIGN PREVIEW</span>
    </div>
  );
}

export function DesignGallery({
  onSelect,
}: {
  onSelect: (id: DesignId) => void;
}) {
  return (
    <main className={c.gallery}>
      <header>
        <div>
          <p className={c.overline}>오늘 수학 · DESIGN DIRECTIONS</p>
          <h1>
            하나의 작업실,
            <br />
            다섯 가지 시작점.
          </h1>
          <p>
            사용하는 기능은 같아도, 일을 시작하는 방식은 다릅니다.
            <br />각 시안을 열어 실제 화면과 작업 흐름을 비교해 보세요.
          </p>
        </div>
        <div className={c.galleryNote}>
          <strong>어떤 일이 가장 자주 있나요?</strong>
          <span>
            문제를 찾는 일 · 자료를 만드는 일<br />
            수업과 학생을 관리하는 일
          </span>
          <small>시안을 바꿔도 담은 문제는 유지됩니다.</small>
        </div>
      </header>
      <div className={c.galleryGrid}>
        {DESIGNS.map((item) => (
          <article key={item.id} className={c.conceptCard}>
            <button
              className={c.miniPreview}
              data-mini={item.id}
              onClick={() => onSelect(item.id)}
              aria-label={`${item.id}번 ${item.name} 시안 열기`}
            >
              <span className={c.miniTop} />
              <span className={c.miniSide} />
              <span className={c.miniTitle} />
              <span className={c.miniA} />
              <span className={c.miniB} />
              <span className={c.miniC} />
              <span className={c.miniD} />
              <span className={c.miniNumber}>0{item.id}</span>
            </button>
            <div className={c.conceptDetails}>
              <div>
                <span style={{ color: item.color }}>DIRECTION 0{item.id}</span>
                <h2>{item.name}</h2>
              </div>
              <strong>{item.title}</strong>
              <p>{item.description}</p>
              <dl>
                <div>
                  <dt>구조</dt>
                  <dd>{item.structure}</dd>
                </div>
                <div>
                  <dt>중심</dt>
                  <dd>{item.focus}</dd>
                </div>
              </dl>
              <button onClick={() => onSelect(item.id)}>
                시안 체험하기
                <Arrow />
              </button>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

interface ConceptProps {
  design: DesignId;
  data: BankData;
  selected: StudioProblem[];
  title: string;
  columns: number;
  onTitle: (title: string) => void;
  onColumns: (columns: number) => void;
  onToggle: (problem: StudioProblem) => void;
  onNavigate: (view: View) => void;
  onBank: (filters?: { q?: string; grade?: string }) => void;
  onRestore: () => void;
}
const gradeRank = (grade: string) =>
  (grade.startsWith("초") ? 0 : grade.startsWith("중") ? 10 : 20) +
  Number(grade.replace(/\D/g, ""));

export function ConceptHome(props: ConceptProps) {
  if (props.design === 2) return <SearchHome {...props} />;
  if (props.design === 3) return <EditorHome {...props} />;
  if (props.design === 4) return <PlannerHome {...props} />;
  return <BoardHome {...props} />;
}

function SearchHome({ data, selected, onBank, onNavigate }: ConceptProps) {
  const [query, setQuery] = useState("");
  const total = data.grades.reduce((sum, g) => sum + g.count, 0);
  return (
    <main className={c.searchHome}>
      <section className={c.searchHero}>
        <p className={c.overline}>수학 수업을 위한 가장 좋은 출발점</p>
        <h1>
          찾고 있던 문제,
          <br />
          <span>여기서 만나세요.</span>
        </h1>
        <form
          className={c.largeSearch}
          onSubmit={(event) => {
            event.preventDefault();
            onBank({ q: query.trim() });
          }}
        >
          <SearchIcon />
          <input
            aria-label="시안 문제 검색"
            placeholder="어떤 문제가 필요하세요?"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <button type="submit">
            문제 찾기
            <Arrow />
          </button>
        </form>
        <div className={c.searchExamples}>
          <span>바로 찾기</span>
          {["분수", "일차방정식", "삼각형", "소수"].map((word) => (
            <button key={word} onClick={() => onBank({ q: word })}>
              {word}
              <span>↗</span>
            </button>
          ))}
        </div>
        <div className={c.searchTotal}>
          <strong>{total.toLocaleString()}</strong>
          <span>
            개의 문제에서
            <br />
            수업에 맞는 한 문제를.
          </span>
        </div>
      </section>
      <div className={c.searchBody}>
        <section className={c.catalog}>
          <div className={c.catalogHeading}>
            <h2>어느 학년을 준비하시나요?</h2>
            <button onClick={() => onBank()}>
              전체 문제은행
              <Arrow />
            </button>
          </div>
          {[
            {
              name: "초등 수학",
              prefix: "초",
              en: "ELEMENTARY",
              desc: "개념을 단단하게, 수학을 즐겁게.",
            },
            {
              name: "중등 수학",
              prefix: "중",
              en: "MIDDLE SCHOOL",
              desc: "개념부터 유형, 응용 문제까지.",
            },
            {
              name: "고등 수학",
              prefix: "고",
              en: "HIGH SCHOOL",
              desc: "새로운 문제를 준비하고 있어요.",
            },
          ].map((level) => {
            const grades = data.grades
              .filter((g) => g.grade.startsWith(level.prefix))
              .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade));
            return (
              <div className={c.catalogRow} key={level.prefix}>
                <div>
                  <small>{level.en}</small>
                  <h3>{level.name}</h3>
                  <p>{level.desc}</p>
                </div>
                <div className={c.catalogGrades}>
                  {grades.length ? (
                    grades.map((g) => (
                      <button
                        key={g.grade}
                        onClick={() => onBank({ grade: g.grade })}
                      >
                        <strong>{g.grade}</strong>
                        <span>{g.count.toLocaleString()}문항</span>
                        <Arrow />
                      </button>
                    ))
                  ) : (
                    <span className={c.coming}>문제 등록 준비 중</span>
                  )}
                </div>
              </div>
            );
          })}
        </section>
        <aside className={c.searchAside}>
          <div className={c.personalPaper}>
            <span>MY WORKSHEET</span>
            <h2>나의 시험지</h2>
            <div>
              <strong>{selected.length}</strong>
              <span>문항을 담았어요</span>
            </div>
            <button onClick={() => onNavigate("export")}>
              시험지 구성하기
              <Arrow />
            </button>
          </div>
          <button
            className={c.asideAction}
            onClick={() => onNavigate("studio")}
          >
            <span className={c.actionGlyph}>⌗</span>
            <span>
              <strong>가지고 있는 자료로 만들기</strong>
              <small>PDF · 이미지에서 문제 자르기</small>
            </span>
            <Arrow />
          </button>
          <button
            className={c.asideAction}
            onClick={() => onNavigate("teaching")}
          >
            <span className={c.actionGlyph}>♧</span>
            <span>
              <strong>수업 · 학생 관리</strong>
              <small>내 반과 학생, 수업 진도 확인</small>
            </span>
            <Arrow />
          </button>
        </aside>
      </div>
    </main>
  );
}

function EditorHome({
  data,
  selected,
  title,
  columns,
  onTitle,
  onColumns,
  onToggle,
  onNavigate,
  onBank,
}: ConceptProps) {
  const preview = selected.length
    ? selected.slice(0, 4)
    : data.problems.slice(0, 2);
  return (
    <main className={c.editorHome}>
      <header className={c.editorToolbar}>
        <div>
          <span>시험지 스튜디오</span>
          <h1>{title || "제목 없는 시험지"}</h1>
        </div>
        <div>
          <span className={c.editorStatus}>{selected.length}문항 편집 중</span>
          <button
            className={c.editorPrimary}
            onClick={() => onNavigate("export")}
          >
            출력 화면 열기
            <Arrow />
          </button>
        </div>
      </header>
      <div className={c.editorGrid}>
        <aside className={c.explorer}>
          <div className={c.explorerHeading}>
            <h2>자료 탐색</h2>
            <span>LIBRARY</span>
          </div>
          <button className={c.explorerSearch} onClick={() => onBank()}>
            <SearchIcon />
            문제 검색 · 필터<span>↗</span>
          </button>
          <div className={`${c.explorerGroup} ${c.gradeExplorer}`}>
            <h3>학년별 문제은행</h3>
            {[...data.grades]
              .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade))
              .map((g) => (
                <button
                  key={g.grade}
                  onClick={() => onBank({ grade: g.grade })}
                >
                  <span>▤</span>
                  {g.grade}
                  <small>{g.count.toLocaleString()}</small>
                </button>
              ))}
          </div>
          <div className={c.explorerGroup}>
            <h3>
              문제 미리보기 <small>문제은행</small>
            </h3>
            {data.problems.slice(0, 3).map((p, i) => (
              <button
                className={c.explorerProblem}
                key={p.id}
                onClick={() => onToggle(p)}
                aria-pressed={selected.some((item) => item.id === p.id)}
              >
                <b>0{i + 1}</b>
                <span>
                  <strong>{p.section || p.chapter}</strong>
                  <small>
                    {p.grade} · {p.difficulty}
                  </small>
                </span>
                <em>{selected.some((item) => item.id === p.id) ? "✓" : "+"}</em>
              </button>
            ))}
          </div>
          <button className={c.importFile} onClick={() => onNavigate("studio")}>
            <span>＋</span>PDF · 이미지 가져오기
          </button>
        </aside>
        <section className={c.editorCanvas} aria-label="시험지 편집 미리보기">
          <div className={c.canvasRuler}>
            <span>A4 · {columns}단</span>
            <span>
              {selected.length
                ? "담은 문제 미리보기"
                : "문제은행 예시 · 아직 담기 전"}
            </span>
          </div>
          <article className={c.editorPage}>
            <header>
              <small>오늘 수학</small>
              <h2>{title || "제목 없는 시험지"}</h2>
              <div>
                <span>{preview.length}문항 미리보기</span>
                <span>이름 ______________</span>
              </div>
            </header>
            <div
              className={c.editorPageProblems}
              style={{ columnCount: columns }}
            >
              {preview.map((p, i) => (
                <section key={p.id}>
                  <b>{String(i + 1).padStart(2, "0")}</b>
                  <UnifiedProblem problem={p} />
                  {!selected.length && (
                    <button onClick={() => onToggle(p)}>이 문제 담기 +</button>
                  )}
                </section>
              ))}
            </div>
            {!preview.length && <p>자료 탐색에서 문제를 골라 담아주세요.</p>}
            <footer>매일 한 걸음, 생각하는 힘.</footer>
          </article>
          <button className={c.canvasAdd} onClick={() => onBank()}>
            ＋ 문제은행에서 더 담기
          </button>
        </section>
        <aside className={c.editorSettings}>
          <h2>문서 설정</h2>
          <label>
            시험지 제목
            <input
              value={title}
              maxLength={80}
              onChange={(event) => onTitle(event.target.value)}
            />
          </label>
          <div className={c.settingLabel}>
            페이지 배치
            <div className={c.columnButtons}>
              {[1, 2].map((n) => (
                <button
                  key={n}
                  onClick={() => onColumns(n)}
                  aria-pressed={columns === n}
                >
                  <span>{n === 1 ? "▯" : "▯ ▯"}</span>
                  {n}단
                </button>
              ))}
            </div>
          </div>
          <dl>
            <div>
              <dt>용지</dt>
              <dd>A4 세로</dd>
            </div>
            <div>
              <dt>담은 문제</dt>
              <dd>{selected.length}문항</dd>
            </div>
            <div>
              <dt>분수 표기</dt>
              <dd>학년별 자동</dd>
            </div>
          </dl>
          <div className={c.editorHelp}>
            <strong>원본은 그대로.</strong>
            <p>
              초등의 가분수는 대분수로 표시하고, 중등 이상은 원문 표기를
              유지합니다.
            </p>
          </div>
          <button
            className={c.editorPrimary}
            onClick={() => onNavigate("export")}
          >
            순서 · 정답지 설정
            <Arrow />
          </button>
          <button
            className={c.editorClass}
            onClick={() => onNavigate("teaching")}
          >
            내 수업 · 학생 관리 ↗
          </button>
        </aside>
      </div>
    </main>
  );
}

function PlannerHome({
  selected,
  title,
  onNavigate,
  onBank,
  onRestore,
}: ConceptProps) {
  const [offset, setOffset] = useState(0);
  const anchor = new Date();
  const base = new Date(
    Date.UTC(anchor.getFullYear(), anchor.getMonth(), anchor.getDate()),
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(base);
    date.setUTCDate(base.getUTCDate() + i);
    return date;
  });
  const active = days[offset];
  const lessons = [
    {
      time: "14:00",
      end: "15:20",
      grade: "초5",
      name: "초등 개념반",
      unit: "분수의 덧셈과 뺄셈",
      note: "개념 확인 · 기본 문제 중심",
      count: "80분",
      tag: "개념 수업",
    },
    {
      time: "16:00",
      end: "17:30",
      grade: "중1",
      name: "중등 기본반",
      unit: "일차방정식",
      note: "유형 연습 · 지난 수업 복습",
      count: "90분",
      tag: "유형 수업",
    },
  ];
  return (
    <main className={c.plannerHome}>
      <header className={c.plannerHeading}>
        <div>
          <p className={c.overline}>TEACHER’S NOTE</p>
          <h1>수업을 중심에 두다.</h1>
          <p>오늘 만날 학생, 오늘 필요한 문제.</p>
        </div>
        <button onClick={() => onNavigate("teaching")}>
          내 반 · 학생 관리
          <Arrow />
        </button>
      </header>
      <section className={c.weekStrip} aria-label="수업 날짜 선택">
        <div className={c.monthBlock}>
          <span>{active.getUTCFullYear()}</span>
          <strong>{String(active.getUTCMonth() + 1).padStart(2, "0")}월</strong>
          <small>수업 플래너</small>
        </div>
        <div className={c.weekDays}>
          {days.map((date, i) => (
            <button
              key={i}
              onClick={() => setOffset(i)}
              aria-pressed={offset === i}
            >
              <span>
                {new Intl.DateTimeFormat("ko-KR", {
                  weekday: "short",
                  timeZone: "UTC",
                }).format(date)}
              </span>
              <strong>{date.getUTCDate()}</strong>
              <small>{i === 0 ? "오늘" : "수업 보기"}</small>
            </button>
          ))}
        </div>
      </section>
      <div className={c.plannerColumns}>
        <section className={c.agenda}>
          <div className={c.agendaHeading}>
            <h2>
              {active.getUTCMonth() + 1}월 {active.getUTCDate()}일의 수업
            </h2>
            <span>시안용 예시 일정</span>
          </div>
          <p className={c.agendaDescription}>
            실제 반과 학생은 수업 관리에서 로그인 후 확인할 수 있습니다.
          </p>
          <div className={c.lessonList}>
            {lessons.map((lesson, i) => (
              <article key={lesson.grade} className={c.lesson}>
                <div className={c.lessonTime}>
                  <strong>{lesson.time}</strong>
                  <span>{lesson.end}</span>
                </div>
                <div className={c.lessonCard} data-lesson={i}>
                  <div className={c.lessonMeta}>
                    <span>
                      {lesson.grade} · {lesson.tag}
                    </span>
                    <small>{lesson.count}</small>
                  </div>
                  <h3>{lesson.name}</h3>
                  <p>{lesson.unit}</p>
                  <div className={c.lessonFooter}>
                    <span>{lesson.note}</span>
                    <button onClick={() => onBank({ grade: lesson.grade })}>
                      수업 문제 준비
                      <Arrow />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <button
            className={c.manageLessons}
            onClick={() => onNavigate("teaching")}
          >
            ＋ 내 반을 등록하고 수업 관리 시작하기
          </button>
        </section>
        <aside className={c.prepNote}>
          <div className={c.notePin} />
          <p className={c.overline}>준비 노트</p>
          <h2>
            수업 전에
            <br />
            챙겨둘 것들.
          </h2>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>필요한 문제 고르기</strong>
                <p>학년과 단원에 맞춰 담아두세요.</p>
                <button onClick={() => onBank()}>문제은행 열기 ↗</button>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>내 자료 다듬기</strong>
                <p>교재와 PDF도 함께 쓸 수 있어요.</p>
                <button onClick={() => onNavigate("studio")}>
                  자료 가져오기 ↗
                </button>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>시험지 출력하기</strong>
                <p>
                  {selected.length
                    ? `${title} · ${selected.length}문항`
                    : "담아둔 문제로 한 장을 완성하세요."}
                </p>
                <button onClick={() => onNavigate("export")}>
                  시험지 확인하기 ↗
                </button>
              </div>
            </li>
          </ol>
          <button className={c.noteRestore} onClick={onRestore}>
            저장한 작업 불러오기
            <Arrow />
          </button>
        </aside>
      </div>
    </main>
  );
}

function BoardHome({
  data,
  selected,
  title,
  onNavigate,
  onBank,
  onRestore,
}: ConceptProps) {
  const cropped = selected.filter(
    (p) => p.sourceLabel || p.croppedImage,
  ).length;
  return (
    <main className={c.boardHome}>
      <header className={c.boardHeading}>
        <div>
          <p className={c.overline}>오늘 수학 · MATERIAL WORKFLOW</p>
          <h1>
            준비에서 완성까지,
            <br />한 흐름으로.
          </h1>
        </div>
        <div className={c.boardProject}>
          <span>진행 중인 시험지</span>
          <strong>{title}</strong>
          <button onClick={onRestore}>저장한 작업 불러오기 ↗</button>
        </div>
      </header>
      <div className={c.flowLine}>
        <span>
          <b>01</b> 문제 모으기
        </span>
        <i />
        <span>
          <b>02</b> 자료 다듬기
        </span>
        <i />
        <span>
          <b>03</b> 시험지 완성
        </span>
      </div>
      <div className={c.boardColumns}>
        <section className={c.boardColumn}>
          <header>
            <h2>모으기</h2>
            <span>COLLECT</span>
          </header>
          <p>수업에 쓸 문제를 한곳에.</p>
          <div className={c.collectBank}>
            <span className={c.boardBigIcon}>▤</span>
            <h3>문제은행에서 찾기</h3>
            <p>
              {data.grades
                .reduce((sum, g) => sum + g.count, 0)
                .toLocaleString()}
              개의 문제에서 골라보세요.
            </p>
            <div className={c.boardGradeTags}>
              {[...data.grades]
                .sort((a, b) => gradeRank(a.grade) - gradeRank(b.grade))
                .slice(0, 4)
                .map((g) => (
                  <button
                    key={g.grade}
                    onClick={() => onBank({ grade: g.grade })}
                  >
                    {g.grade}
                  </button>
                ))}
            </div>
            <button className={c.boardDarkButton} onClick={() => onBank()}>
              문제 골라 담기
              <Arrow />
            </button>
          </div>
          <button
            className={c.boardImport}
            onClick={() => onNavigate("studio")}
          >
            <span>＋</span>
            <strong>PDF · 이미지 가져오기</strong>
            <small>가지고 있는 자료도 함께 사용하세요</small>
          </button>
          <div className={c.boardCount}>
            <span>지금까지 담은 문제</span>
            <strong>
              {selected.length}
              <small> 문항</small>
            </strong>
          </div>
        </section>
        <section className={c.boardColumn}>
          <header>
            <h2>다듬기</h2>
            <span>EDIT</span>
          </header>
          <p>내 수업에 맞게, 더 정확하게.</p>
          <div className={c.editVisual}>
            <div className={c.cropDemo}>
              <span>문제 영역 선택</span>
              <div>
                <b>01</b>
                <p>다음 식을 계산하시오.</p>
                <strong>
                  ¾ + ½ = <i>?</i>
                </strong>
              </div>
              <i className={c.cropCorner} />
            </div>
            <span className={c.visualCaption}>
              자르기 · 내용 편집 · 해설 추가
            </span>
          </div>
          <div className={c.editChecklist}>
            <span>✓ 원본 이미지 보존</span>
            <span>✓ 문제와 해설 함께 편집</span>
            <span>✓ 학년별 분수 표기</span>
          </div>
          <button
            className={c.boardDarkButton}
            onClick={() => onNavigate("studio")}
          >
            자료 작업실 열기
            <Arrow />
          </button>
          <div className={c.boardCount}>
            <span>시험지에 담은 내 자료</span>
            <strong>
              {cropped}
              <small> 문항</small>
            </strong>
          </div>
        </section>
        <section className={`${c.boardColumn} ${c.finishColumn}`}>
          <header>
            <h2>완성하기</h2>
            <span>PUBLISH</span>
          </header>
          <p>순서를 정하고, 한 장으로 출력.</p>
          <div className={c.finishPaper}>
            <small>오늘 수학</small>
            <h3>{title}</h3>
            <span>이름 __________________</span>
            <div>
              {selected.length ? (
                selected.slice(0, 3).map((p, i) => (
                  <p key={p.id}>
                    <b>0{i + 1}</b>
                    {p.section || p.sourceLabel || "가져온 문제"}
                  </p>
                ))
              ) : (
                <>
                  <p>
                    <b>01</b>
                    <i />
                  </p>
                  <p>
                    <b>02</b>
                    <i />
                  </p>
                  <p>
                    <b>03</b>
                    <i />
                  </p>
                </>
              )}
            </div>
            <footer>{selected.length}문항 · A4 학습지</footer>
          </div>
          <button
            className={c.boardFinishButton}
            onClick={() => onNavigate("export")}
          >
            시험지 완성하기
            <Arrow />
          </button>
          <div className={c.finishFormats}>
            <span>PDF · 인쇄</span>
            <span>정답 · 해설지</span>
          </div>
        </section>
      </div>
      <footer className={c.boardFooter}>
        <div>
          <strong>자료 준비가 끝났다면, 수업으로.</strong>
          <span>반별 학생과 진도도 같은 작업실에서 관리합니다.</span>
        </div>
        <button onClick={() => onNavigate("teaching")}>
          수업 · 학생 관리
          <Arrow />
        </button>
      </footer>
    </main>
  );
}

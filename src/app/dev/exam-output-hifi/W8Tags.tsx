"use client";

import { useState, type ReactNode } from "react";

import lib from "@/components/unified/PrivateLibrary.module.css";
import old from "../library-filters-wire/oldFilterRow.module.css";
import WorkspacePageHeader from "@/components/unified/WorkspacePageHeader";
import Icon from "@/components/unified/WorkspaceIcon";
import we from "@/components/unified/WorksheetEditor.module.css";

import {
  KINDS,
  LIB_ROWS,
  TAGGABLE,
  TAGS,
  THIS_SHEET_ID,
  type Kind,
  type LibRow,
  type Tag,
} from "./fixtures";
import h from "./hifi.module.css";
import {
  DesktopFrame,
  Option,
  PhoneFrame,
  SettingsPanel,
  Step3,
  useSheet,
} from "./parts";

/**
 * W8 시험지 태그 — Wire A(시험지 정보 맨 위 칩 · 하나만 · 처음 목록 여덟 · 내 시험지 탭은 종류 줄 아래 칩 줄)의 Hi-fi 4안.
 * 넷이 같은 규칙을 쓴다: 태그는 시험지 · 연산 연습지에만, 한 장에 하나, 지면에 찍지 않는다, 양식(W6)에 담지 않는다.
 * 내 시험지 탭에서 종류 × 태그 × «내 작업 중만» × 검색은 모두 겹쳐 걸리고, 태그 옆 수는 «그 태그를 고르면 몇 개 남나».
 * 다른 것은 **3단계 칩의 꼴 · 수와 «태그 없음»이 읽히는 꼴 · 태그가 없는 종류를 골랐을 때**다.
 * 한 안 안에서 3단계와 내 시험지 탭은 이어져 있다 — 3단계에서 고른 태그가 목록 첫 행(이 시험지)에 붙는다.
 */

type TagFilter = Tag | "none" | null;
type KindFilter = "all" | Kind;
type NoTagMode = "hide" | "disable" | "collapse" | "clear";

const taggable = (k: KindFilter) => k === "all" || TAGGABLE.includes(k as Kind);
const kindLabel = (k: Kind) => KINDS.find((x) => x.id === k)!.label;

function useTags(init: { kind?: KindFilter; tag?: TagFilter } = {}) {
  const sheet = useSheet({ title: "중2 일차부등식 일일TEST 10.16" });
  const [sheetTag, setSheetTag] = useState<Tag | null>("일일TEST");
  const [kind, setKindState] = useState<KindFilter>(init.kind ?? "draft");
  const [workingOnly, setWorkingOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<TagFilter>(init.tag ?? "일일TEST");
  const [notice, setNotice] = useState("");
  const [showZero, setShowZero] = useState(false);

  const rows: LibRow[] = LIB_ROWS.map((r) =>
    r.id === THIS_SHEET_ID
      ? { ...r, title: sheet.title, tag: sheetTag ?? undefined }
      : r,
  );
  const kindCounts = Object.fromEntries(
    KINDS.map((k) => [k.id, rows.filter((r) => r.kind === k.id).length]),
  ) as Record<Kind, number>;
  const workingCount = rows.filter((r) => r.step).length;
  const q = query.trim();
  /** 종류 · 내 작업 중만 · 검색만 건 것 — 태그 수는 여기서 센다. */
  const others = rows.filter(
    (r) =>
      (kind === "all" || r.kind === kind) &&
      (!workingOnly || r.step) &&
      (!q || r.title.includes(q)),
  );
  const tagActive = taggable(kind) ? tag : null;
  const filtered = others.filter((r) =>
    !tagActive
      ? true
      : tagActive === "none"
        ? TAGGABLE.includes(r.kind) && !r.tag
        : r.tag === tagActive,
  );
  const tagCounts = Object.fromEntries(
    TAGS.map((t) => [t, others.filter((r) => r.tag === t).length]),
  ) as Record<Tag, number>;
  const noneCount = others.filter(
    (r) => TAGGABLE.includes(r.kind) && !r.tag,
  ).length;
  return {
    sheet,
    sheetTag,
    setSheetTag,
    kind,
    workingOnly,
    setWorkingOnly,
    query,
    setQuery,
    tag,
    tagActive,
    setTag(t: TagFilter) {
      setTag(t);
      setNotice("");
    },
    notice,
    showZero,
    setShowZero,
    rows,
    kindCounts,
    workingCount,
    others,
    filtered,
    tagCounts,
    noneCount,
    hasFilters: kind !== "all" || workingOnly || !!q || !!tagActive,
    /** 종류를 바꾼다 — `clear` 안은 태그가 없는 종류로 가면 태그 거름을 푼다. */
    setKind(next: KindFilter, mode: NoTagMode) {
      setKindState(next);
      if (mode === "clear" && !taggable(next) && tag) {
        setTag(null);
        setNotice(
          `태그 거름을 풀었습니다 — ${kindLabel(next as Kind)}에는 태그가 없습니다.`,
        );
      } else setNotice("");
    },
    reset() {
      setSheetTag("일일TEST");
      setKindState(init.kind ?? "draft");
      setWorkingOnly(false);
      setQuery("");
      setTag(init.tag ?? "일일TEST");
      setNotice("");
      setShowZero(false);
    },
  };
}
type G = ReturnType<typeof useTags>;

function Tools({ g, mode }: { g: G; mode: NoTagMode }) {
  return (
    <>
      <button type="button" onClick={() => g.setKind("extraction", mode)}>
        내 시험지 탭에서 «추출한 자료» 고르기
      </button>
      <button type="button" onClick={() => g.setKind("draft", mode)}>
        «시험지»로 돌아가기
      </button>
      <button type="button" onClick={() => g.setWorkingOnly(!g.workingOnly)}>
        «내 작업 중만» {g.workingOnly ? "끄기" : "켜기"}
      </button>
      <button type="button" onClick={g.reset}>
        처음 상태로
      </button>
    </>
  );
}

const NOT_PRINTED = "지면에 찍히지 않습니다 — 내 시험지에서 거를 때 씁니다.";

/* ───────────── 3단계 칩 넷 ───────────── */

function Pick1({ g }: { g: G }) {
  return (
    <div className={h.tagPick} data-tag-pick>
      <span className={h.fieldCaption}>시험 종류</span>
      <div className={we.choiceWrap}>
        <button
          type="button"
          aria-pressed={g.sheetTag === null}
          onClick={() => g.setSheetTag(null)}
        >
          없음
        </button>
        {TAGS.map((t) => (
          <button
            type="button"
            key={t}
            aria-pressed={g.sheetTag === t}
            onClick={() => g.setSheetTag(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <p className={we.subtle} style={{ marginTop: 0 }}>
        {NOT_PRINTED}
      </p>
    </div>
  );
}

function Pick2({ g }: { g: G }) {
  return (
    <div className={h.tagPick} data-tag-pick>
      <span className={h.fieldCaption}>시험 종류 · 하나</span>
      <div className={`${we.choiceWrap} ${we.colorGrid} ${h.tagGrid}`}>
        {TAGS.map((t) => (
          <button
            type="button"
            key={t}
            aria-pressed={g.sheetTag === t}
            onClick={() => g.setSheetTag(t)}
          >
            {t}
          </button>
        ))}
        <button
          type="button"
          aria-pressed={g.sheetTag === null}
          onClick={() => g.setSheetTag(null)}
        >
          태그 없음
        </button>
      </div>
      <p className={we.subtle} style={{ marginTop: 0 }}>
        {NOT_PRINTED}
      </p>
    </div>
  );
}

function Pick3({ g }: { g: G }) {
  return (
    <div className={h.tagPick} data-tag-pick>
      <div className={h.between}>
        <span className={h.fieldCaption}>시험 종류</span>
        {g.sheetTag && (
          <button
            type="button"
            className={`${h.ctl} ${h.text} ${h.small}`}
            onClick={() => g.setSheetTag(null)}
          >
            지우기
          </button>
        )}
      </div>
      <div className={h.pillWrap}>
        {TAGS.map((t) => (
          <button
            type="button"
            key={t}
            className={h.pill}
            aria-pressed={g.sheetTag === t}
            onClick={() => g.setSheetTag(g.sheetTag === t ? null : t)}
          >
            {t}
          </button>
        ))}
      </div>
      <p className={h.meta}>인쇄 안 됨 · 내 시험지에서 거르기용</p>
    </div>
  );
}

const GROUPS: { label: string; tags: Tag[] }[] = [
  {
    label: "시험",
    tags: ["일일TEST", "주간TEST", "단원TEST", "입학TEST", "내신대비"],
  },
  { label: "과제", tags: ["숙제", "복습", "오답"] },
];

function Pick4({ g }: { g: G }) {
  return (
    <div className={h.tagPick} data-tag-pick>
      <div className={h.between}>
        <span className={h.fieldCaption}>시험 종류</span>
        <small className={h.meta}>
          {g.sheetTag ? `${g.sheetTag} · 다시 누르면 뺍니다` : "고른 것 없음"}
        </small>
      </div>
      {GROUPS.map((group) => (
        <div key={group.label} className={h.tagGroup}>
          <span className={h.tagGroupLabel}>{group.label}</span>
          <div className={we.choiceWrap} style={{ margin: 0 }}>
            {group.tags.map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={g.sheetTag === t}
                onClick={() => g.setSheetTag(g.sheetTag === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ))}
      <p className={we.subtle} style={{ marginTop: 4 }}>
        {NOT_PRINTED}
      </p>
    </div>
  );
}

/* ───────────── 내 시험지 탭 — 실제 PrivateLibrary 의 CSS 그대로 ───────────── */

function Library({
  g,
  mode,
  tagRow,
  toggleExtra,
  countExtra,
  rowTag,
}: {
  g: G;
  mode: NoTagMode;
  /** 종류 줄 아래 태그 줄 — 안마다 다르다 */
  tagRow: ReactNode;
  toggleExtra?: ReactNode;
  countExtra?: ReactNode;
  /** 행 안에서 태그가 보이는 자리 */
  rowTag: "kind" | "title" | "none";
}) {
  return (
    <main className={lib.library} style={{ padding: "8px 4px" }}>
      <WorkspacePageHeader
        title="내 시험지"
        description="내 계정에 저장한 시험지와 추출 자료를 어느 기기에서든 이어서 작업하세요."
      >
        <button type="button">작업 파일 불러오기</button>
        <button type="button">새 시험지</button>
      </WorkspacePageHeader>
      <div className={old.kindTabs} role="group" aria-label="자료 종류별 보기">
        <button
          type="button"
          aria-pressed={g.kind === "all"}
          onClick={() => g.setKind("all", mode)}
        >
          전체 자료 <span>{g.rows.length}</span>
        </button>
        {KINDS.map((k) => (
          <button
            type="button"
            key={k.id}
            aria-pressed={g.kind === k.id}
            onClick={() => g.setKind(k.id, mode)}
          >
            {k.label} <span>{g.kindCounts[k.id]}</span>
          </button>
        ))}
      </div>
      {tagRow}
      <div className={old.toggles}>
        <label className={old.toggle}>
          <input
            type="checkbox"
            checked={g.workingOnly}
            onChange={(e) => g.setWorkingOnly(e.target.checked)}
          />
          내 작업 중만 <span>({g.workingCount})</span>
        </label>
        {toggleExtra}
      </div>
      <div className={old.tools}>
        <input
          type="search"
          aria-label="저장한 자료 검색"
          placeholder="자료 이름으로 찾기"
          value={g.query}
          onChange={(e) => g.setQuery(e.target.value)}
        />
        <label>
          정렬
          <select aria-label="자료 정렬" defaultValue="newest">
            <option value="newest">최근 수정순</option>
            <option value="name">이름순</option>
            <option value="count">문항 많은순</option>
          </select>
        </label>
        <button type="button">새로고침</button>
      </div>
      {g.notice && (
        <p className={h.libNotice} role="status">
          {g.notice}
        </p>
      )}
      <p className={old.resultCount} aria-live="polite">
        저장한 자료 <strong>{g.rows.length}</strong>개
        {g.hasFilters && (
          <>
            {" "}
            · 검색 결과 <strong>{g.filtered.length}</strong>개
          </>
        )}
        {countExtra}
      </p>
      <div className={lib.board}>
        {g.filtered.length ? (
          <table className={lib.table} aria-label="저장한 자료 목록(그림)">
            <thead>
              <tr>
                <th scope="col" className={lib.numberCell}>
                  번호
                </th>
                <th scope="col" className={lib.kindCell}>
                  종류
                </th>
                <th scope="col" className={lib.titleCell}>
                  자료 이름
                </th>
                <th scope="col" className={lib.countCell}>
                  문항 수
                </th>
                <th scope="col" className={lib.updatedCell}>
                  최근 수정
                </th>
                <th scope="col" className={lib.actionsCell}>
                  관리
                </th>
              </tr>
            </thead>
            <tbody>
              {g.filtered.slice(0, 7).map((r, i) => (
                <tr
                  key={r.id}
                  className={r.id === THIS_SHEET_ID ? h.thisRow : undefined}
                >
                  <td className={lib.numberCell}>{i + 1}</td>
                  <td className={lib.kindCell}>
                    <span className={h.kindStack}>
                      <span className={lib.kindBadge} data-kind={r.kind}>
                        {kindLabel(r.kind)}
                      </span>
                      {rowTag === "kind" && r.tag && (
                        <span className={h.tagBadge}>{r.tag}</span>
                      )}
                    </span>
                  </td>
                  <td className={lib.titleCell}>
                    <button type="button" className={lib.titleButton}>
                      {r.title}
                    </button>
                    {r.step && (
                      <div className={lib.progressLine}>
                        <span>{r.step}</span>
                        <button type="button">
                          이어서 작업 <Icon name="arrow" size={14} />
                        </button>
                      </div>
                    )}
                    <small>
                      작성자: 박선생 (나)
                      {rowTag === "title" &&
                        TAGGABLE.includes(r.kind) &&
                        ` · 태그 ${r.tag ?? "없음"}`}
                    </small>
                  </td>
                  <td className={lib.countCell}>
                    {r.count}
                    <span className={lib.mobileLabel}>문항</span>
                  </td>
                  <td className={lib.updatedCell}>
                    <span className={lib.mobileLabel}>수정 </span>
                    {r.updated}
                  </td>
                  <td className={lib.actionsCell}>
                    <div className={lib.actions}>
                      <button type="button" aria-label={`${r.title} 정보`}>
                        <Icon name="info" />
                      </button>
                      <button type="button" aria-label={`${r.title} 수정`}>
                        <Icon name="edit" />
                      </button>
                      <button type="button" aria-label={`${r.title} 삭제`}>
                        <Icon name="trash" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className={lib.empty}>
            <h2>조건에 맞는 자료가 없습니다</h2>
            <p>자료 이름이나 종류 · 태그를 바꿔 다시 찾아보세요.</p>
          </div>
        )}
      </div>
      {g.filtered.length > 7 && (
        <p className={lib.note}>
          시안은 일곱 행까지 그립니다 — 남은 {g.filtered.length - 7}행 생략.
        </p>
      )}
    </main>
  );
}

/* ───────────── 1안 — 종류 줄과 같은 단추 · 수는 흐린 숫자 · 태그 없는 종류면 줄이 숨는다 ───────────── */

function TagRow1({ g }: { g: G }) {
  if (!taggable(g.kind)) return null;
  return (
    <div
      className={`${old.kindTabs} ${h.tagTabs}`}
      role="group"
      aria-label="태그별 보기"
    >
      <button
        type="button"
        aria-pressed={g.tag === null}
        onClick={() => g.setTag(null)}
      >
        태그 전체
      </button>
      {TAGS.map((t) => (
        <button
          type="button"
          key={t}
          aria-pressed={g.tag === t}
          onClick={() => g.setTag(g.tag === t ? null : t)}
        >
          {t} <span>{g.tagCounts[t]}</span>
        </button>
      ))}
      <span className={h.vRule} aria-hidden />
      <button
        type="button"
        aria-pressed={g.tag === "none"}
        onClick={() => g.setTag(g.tag === "none" ? null : "none")}
      >
        태그 없음 <span>{g.noneCount}</span>
      </button>
    </div>
  );
}

function W8H1() {
  const g = useTags();
  return (
    <Option
      id="w8-1"
      title="1 · 종류 줄과 같은 단추 — 수는 흐린 숫자, 태그가 없는 종류면 줄이 숨는다"
      idea="3단계는 폰트 · 색 칩과 같은 눌림 단추(없음 + 여덟)를 «시험 종류» 라벨 아래에. 내 시험지 탭은 종류 줄 바로 아래에 같은 모양의 둘째 줄 — «태그 전체 · 일일TEST 3 · …», 세로 금 뒤에 «태그 없음 1». 행에는 종류 딱지 밑에 태그 딱지. «추출한 자료 · 개념 백지»를 고르면 줄이 통째로 숨고, 고른 태그는 기억했다가 시험지로 돌아오면 다시 걸린다."
      cost="종류 줄과 태그 줄이 똑같이 생겨 «어느 줄이 무엇인지»를 첫 단추 글(전체 자료 / 태그 전체)로만 가른다. 줄이 숨으면 «태그로 거르고 있었다»는 것도 안 보인다. 1040 에서 둘째 줄이 한 줄을 거의 다 채워, 태그가 하나만 늘어도 두 줄이 된다."
      tools={<Tools g={g} mode="hide" />}
    >
      <DesktopFrame
        label="1280 · 3단계 — «시험 종류»는 시험지 정보의 제목 위"
        height={860}
      >
        <Step3
          sheet={g.sheet}
          settings={<SettingsPanel sheet={g.sheet} metaTop={<Pick1 g={g} />} />}
        />
      </DesktopFrame>
      <DesktopFrame
        label="1280 · 내 시험지 — 종류 «시험지» × 태그 «일일TEST»"
        active="내 시험지"
      >
        <Library g={g} mode="hide" tagRow={<TagRow1 g={g} />} rowTag="kind" />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 2안 — 작은 알약 · 수는 괄호 · 0 은 꺼짐 · «태그 없음»은 체크 · 태그 없는 종류면 꺼진 채 남는다 ───────────── */

function TagRow2({ g }: { g: G }) {
  const off = !taggable(g.kind);
  return (
    <div className={h.tagLine} role="group" aria-label="태그별 보기">
      <span className={h.tagLineLabel}>태그</span>
      <div className={h.smallPills}>
        {TAGS.map((t) => (
          <button
            type="button"
            key={t}
            aria-pressed={!off && g.tag === t}
            disabled={off || g.tagCounts[t] === 0}
            onClick={() => g.setTag(g.tag === t ? null : t)}
          >
            {t} ({off ? "–" : g.tagCounts[t]})
          </button>
        ))}
        {!off && g.tag && g.tag !== "none" && (
          <button
            type="button"
            className={h.clearText}
            onClick={() => g.setTag(null)}
          >
            태그 풀기
          </button>
        )}
      </div>
      {off && (
        <small className={h.meta}>
          {kindLabel(g.kind as Kind)}에는 태그가 없습니다 — 태그 거름은 잠시
          쉽니다.
        </small>
      )}
    </div>
  );
}

function W8H2() {
  const g = useTags();
  const off = !taggable(g.kind);
  return (
    <Option
      id="w8-2"
      title="2 · 작은 알약 — 수는 괄호, 0 은 꺼짐, «태그 없음»은 체크"
      idea="3단계는 3 × 3 칸(여덟 + «태그 없음»)으로 칸이 고르게 선다. 내 시험지 탭은 «태그» 라벨 뒤 작은 알약 — «일일TEST (3)», 0 개인 태그는 꺼져 눌리지 않는다. «태그 없음»은 칩이 아니라 «내 작업 중만» 옆 체크 «태그 없는 것만 (1)» — 정리할 것 찾기용. «추출한 자료»를 고르면 줄은 그대로 남되 꺼지고 «태그 거름은 잠시 쉽니다»."
      cost="알약 글(12px)이 종류 단추보다 작아 훑어 읽기 덜 편하다. 0 이 꺼지면 «내신대비»를 아직 안 써 본 것인지 지금 거름 때문인지 헷갈린다. 체크와 칩이 같은 일을 나눠 맡아 «태그 없는 것만»을 켜면 칩은 무엇을 뜻하나가 흐려진다(시안은 체크가 칩을 이긴다)."
      tools={<Tools g={g} mode="disable" />}
    >
      <DesktopFrame label="1280 · 3단계 — 3 × 3 칸" height={860}>
        <Step3
          sheet={g.sheet}
          settings={<SettingsPanel sheet={g.sheet} metaTop={<Pick2 g={g} />} />}
        />
      </DesktopFrame>
      <DesktopFrame
        label="1280 · 내 시험지 — 태그 줄은 «태그» 라벨 + 알약"
        active="내 시험지"
      >
        <Library
          g={g}
          mode="disable"
          tagRow={<TagRow2 g={g} />}
          rowTag="kind"
          toggleExtra={
            <label className={old.toggle}>
              <input
                type="checkbox"
                disabled={off}
                checked={!off && g.tag === "none"}
                onChange={(e) => g.setTag(e.target.checked ? "none" : null)}
              />
              태그 없는 것만 <span>({off ? "–" : g.noneCount})</span>
            </label>
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 3안 — 채운 알약 · 수는 작은 딱지 · 0 은 접힘 · 태그 없는 종류면 한 줄로 접힌다 ───────────── */

function TagRow3({ g }: { g: G }) {
  if (!taggable(g.kind))
    return (
      <p className={h.tagFolded}>
        {g.tag
          ? `태그 «${g.tag === "none" ? "태그 없음" : g.tag}» — 시험지 · 연산 연습지를 고르면 다시 걸립니다.`
          : "태그는 시험지 · 연산 연습지에만 있습니다."}
      </p>
    );
  const zero = TAGS.filter((t) => g.tagCounts[t] === 0 && g.tag !== t);
  return (
    <div className={h.tagLine} role="group" aria-label="태그별 보기">
      <span className={h.tagLineLabel}>태그</span>
      <div className={h.pillWrap}>
        <button
          type="button"
          className={h.pill}
          aria-pressed={g.tag === "none"}
          onClick={() => g.setTag(g.tag === "none" ? null : "none")}
        >
          태그 없음 <span className={h.pillCount}>{g.noneCount}</span>
        </button>
        {TAGS.filter((t) => g.showZero || !zero.includes(t)).map((t) => (
          <button
            type="button"
            key={t}
            className={h.pill}
            aria-pressed={g.tag === t}
            onClick={() => g.setTag(g.tag === t ? null : t)}
          >
            {t} <span className={h.pillCount}>{g.tagCounts[t]}</span>
          </button>
        ))}
        {zero.length > 0 && (
          <button
            type="button"
            className={h.clearText}
            onClick={() => g.setShowZero(!g.showZero)}
          >
            {g.showZero ? "0개 태그 접기" : `0개 태그 ${zero.length} 보기`}
          </button>
        )}
      </div>
    </div>
  );
}

function W8H3() {
  const g = useTags();
  return (
    <Option
      id="w8-3"
      title="3 · 채운 알약 — 수는 작은 딱지, 0 은 접힘, 태그 없는 종류면 한 줄로 접힌다"
      idea="3단계는 둥근 알약 여덟(고르면 파랗게 채움 · 다시 누르면 뺌 · 고른 뒤에만 [지우기]). 내 시험지 탭도 같은 알약 — 맨 앞이 «태그 없음», 수는 알약 안 작은 딱지, 0 개인 태그는 «0개 태그 1 보기»로 접는다. 행의 태그는 종류 딱지가 아니라 «작성자» 줄 끝 «태그 일일TEST». «추출한 자료»를 고르면 줄이 한 줄 글로 접혀 «태그 «일일TEST» — 시험지 · 연산 연습지를 고르면 다시 걸립니다»."
      cost="채운 알약은 작업실의 다른 눌림 단추(옅은 파랑 + 테두리)와 꼴이 달라 한 화면에 눌림이 두 가지가 된다. 0 개 태그가 숨으면 «여덟 개가 정해져 있다»가 덜 보인다. 행에서 태그가 작은 글이라 훑어 찾기 어렵다."
      tools={<Tools g={g} mode="collapse" />}
    >
      <DesktopFrame label="1280 · 3단계 — 채운 알약" height={860}>
        <Step3
          sheet={g.sheet}
          settings={<SettingsPanel sheet={g.sheet} metaTop={<Pick3 g={g} />} />}
        />
      </DesktopFrame>
      <DesktopFrame
        label="1280 · 내 시험지 — «태그 없음»이 맨 앞"
        active="내 시험지"
      >
        <Library
          g={g}
          mode="collapse"
          tagRow={<TagRow3 g={g} />}
          rowTag="title"
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 4안 — 두 묶음(시험 · 과제) · 수는 결과 줄 · 태그 없는 종류로 가면 푼다 ───────────── */

function TagRow4({ g }: { g: G }) {
  if (!taggable(g.kind)) return null;
  return (
    <div className={h.tagGroups} role="group" aria-label="태그별 보기">
      {GROUPS.map((group) => (
        <div key={group.label} className={h.tagGroup}>
          <span className={h.tagGroupLabel}>{group.label}</span>
          <div className={`${old.kindTabs} ${h.tagTabs}`} style={{ margin: 0 }}>
            {group.tags.map((t) => (
              <button
                type="button"
                key={t}
                aria-pressed={g.tag === t}
                onClick={() => g.setTag(g.tag === t ? null : t)}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className={h.tagGroup}>
        <span className={h.tagGroupLabel}>정리</span>
        <div className={`${old.kindTabs} ${h.tagTabs}`} style={{ margin: 0 }}>
          <button
            type="button"
            aria-pressed={g.tag === "none"}
            onClick={() => g.setTag(g.tag === "none" ? null : "none")}
          >
            태그 없음
          </button>
        </div>
      </div>
    </div>
  );
}

function W8H4() {
  const g = useTags();
  return (
    <Option
      id="w8-4"
      title="4 · 두 묶음(시험 · 과제) — 수는 결과 줄 한 곳, 태그 없는 종류로 가면 푼다"
      idea="여덟을 뜻으로 나눈다 — «시험»(일일 · 주간 · 단원 · 입학 · 내신대비)과 «과제»(숙제 · 복습 · 오답). 3단계와 내 시험지 탭이 같은 두 묶음이고, 탭에는 셋째 묶음 «정리 — 태그 없음». 단추에 수를 달지 않고 결과 줄 한 곳에 «태그 일일TEST 3개 [태그 풀기]». 행에는 태그를 적지 않는다(거르면 그 태그뿐이라). «추출한 자료»로 가면 태그 거름을 풀고 그 사실을 한 줄로 알린다."
      cost="고르기 전에는 태그마다 몇 개인지 모른다 — 0 개 태그를 눌러 빈 목록을 볼 수 있다. 행에 태그가 없어 «전체»로 볼 때 어느 시험지에 무엇이 붙었는지 안 보인다. 묶음 이름(시험 · 과제)은 원장님이 정하실 말이다. 종류를 오가면 거름이 풀려 다시 골라야 한다."
      tools={<Tools g={g} mode="clear" />}
    >
      <DesktopFrame label="1280 · 3단계 — 시험 · 과제 두 묶음" height={860}>
        <Step3
          sheet={g.sheet}
          settings={<SettingsPanel sheet={g.sheet} metaTop={<Pick4 g={g} />} />}
        />
      </DesktopFrame>
      <DesktopFrame
        label="1280 · 내 시험지 — 수는 결과 줄에만"
        active="내 시험지"
      >
        <Library
          g={g}
          mode="clear"
          tagRow={<TagRow4 g={g} />}
          rowTag="none"
          countExtra={
            g.tagActive && (
              <span className={h.countTag}>
                {" "}
                · 태그 <b>
                  {g.tagActive === "none" ? "없음" : g.tagActive}
                </b>{" "}
                <strong>{g.filtered.length}</strong>개
                <button
                  type="button"
                  className={h.clearText}
                  onClick={() => g.setTag(null)}
                >
                  태그 풀기
                </button>
              </span>
            )
          }
        />
      </DesktopFrame>
    </Option>
  );
}

/* ───────────── 폰 390 — 1안 ───────────── */

function W8Phone() {
  const g = useTags();
  return (
    <Option
      id="w8-phone"
      title="폰 390 · 1안 — 내 시험지 탭, 두 줄이 감긴다"
      idea="종류 줄과 태그 줄이 각각 감겨 서너 줄이 된다. 표는 지금처럼 행마다 카드 꼴(종류 · 번호 / 이름 / 문항 · 수정 / 관리)이고 종류 딱지 옆에 태그 딱지."
      cost="두 줄이 감기면 목록 첫 행이 화면 아래로 밀린다(약 330px). 폰에서는 «태그 없음»이 셋째 줄로 떨어진다."
      tools={<Tools g={g} mode="hide" />}
    >
      <PhoneFrame label="390 · 내 시험지 — 태그 «일일TEST»" active="내 시험지">
        <Library g={g} mode="hide" tagRow={<TagRow1 g={g} />} rowTag="kind" />
      </PhoneFrame>
    </Option>
  );
}

export function W8Section() {
  return (
    <>
      <W8H1 />
      <W8H2 />
      <W8H3 />
      <W8H4 />
      <W8Phone />
    </>
  );
}

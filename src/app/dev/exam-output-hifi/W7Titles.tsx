"use client";

import { useState, type ReactNode } from "react";

import we from "@/components/unified/WorksheetEditor.module.css";

import {
  DEFAULT_DRAFT_TITLE,
  suggestions,
  TYPED_TITLE,
  type Suggestion,
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
 * W7 제목 추천 — Wire A(제목 칸 아래 추천 세 줄, 줄마다 [적용])의 Hi-fi 4안.
 * 규칙은 넷이 같다: 제목이 기본값 «오늘 수학 학습지» 그대로면 [적용]이 바로 바꾸고,
 * 직접 쓴 제목이면 그 자리에서 한 번 묻는다. 제목 칸과 지면의 제목은 한 값 — 미리보기가 같이 바뀐다.
 * 다른 것은 **추천이 줄인가 칩인가 · 확인이 어디에 어떻게 읽히나**다.
 */

function useTitles() {
  const sheet = useSheet();
  const [tagOn, setTagOn] = useState(true);
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const [asking, setAsking] = useState<Suggestion | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);
  const list = suggestions(
    sheet.meta.examDate ?? "",
    tagOn ? "일일TEST" : undefined,
  );
  /** 직접 쓴 제목 — 기본값도, 방금 적용한 추천도 아니다. */
  const typed =
    sheet.title !== DEFAULT_DRAFT_TITLE && sheet.title !== lastApplied;
  function set(text: string) {
    setPrevious(sheet.title);
    sheet.setTitle(text);
    sheet.patchMeta({ title: text });
    setLastApplied(text);
    setAsking(null);
  }
  return {
    sheet,
    list,
    typed,
    asking,
    previous,
    tagOn,
    apply(sug: Suggestion) {
      if (typed) setAsking(sug);
      else set(sug.text);
    },
    confirm() {
      if (asking) set(asking.text);
    },
    cancel() {
      setAsking(null);
    },
    undo() {
      if (previous === null) return;
      sheet.setTitle(previous);
      sheet.patchMeta({ title: previous });
      setLastApplied(null);
      setPrevious(null);
    },
    toDefault() {
      sheet.setTitle(DEFAULT_DRAFT_TITLE);
      sheet.patchMeta({ title: DEFAULT_DRAFT_TITLE });
      setLastApplied(null);
      setAsking(null);
      setPrevious(null);
    },
    toTyped() {
      sheet.setTitle(TYPED_TITLE);
      sheet.patchMeta({ title: TYPED_TITLE });
      setLastApplied(null);
      setAsking(null);
      setPrevious(null);
    },
    toggleTag() {
      setTagOn((v) => !v);
      setAsking(null);
    },
    nextDay() {
      sheet.patchMeta({
        examDate:
          sheet.meta.examDate === "2026-10-17" ? "2026-10-16" : "2026-10-17",
      });
      setAsking(null);
    },
  };
}
type T = ReturnType<typeof useTitles>;

function Tools({ t }: { t: T }) {
  return (
    <>
      <button type="button" onClick={t.toDefault}>
        제목을 기본값으로
      </button>
      <button type="button" onClick={t.toTyped}>
        직접 쓴 제목으로 («{TYPED_TITLE}»)
      </button>
      <button type="button" onClick={t.toggleTag}>
        {t.tagOn ? "시험 종류(W8) 빼고 보기" : "시험 종류 «일일TEST» 넣기"}
      </button>
      <button type="button" onClick={t.nextDay}>
        시험일 바꿔 보기
      </button>
    </>
  );
}

function Frame({
  t,
  label,
  afterTitle,
  titleField,
}: {
  t: T;
  label: string;
  afterTitle?: ReactNode;
  titleField?: ReactNode;
}) {
  return (
    <DesktopFrame label={label}>
      <Step3
        sheet={t.sheet}
        settings={
          <SettingsPanel
            sheet={t.sheet}
            afterTitle={afterTitle}
            titleField={titleField}
          />
        }
      />
    </DesktopFrame>
  );
}

/* ───────────── 1안 — 라벨 붙은 세 줄 · 확인은 그 줄 아래 노랑 ───────────── */

function Rows1({ t }: { t: T }) {
  return (
    <div className={h.suggestBox} data-suggest>
      <span className={h.sectionLabel}>추천 제목</span>
      <ul className={h.suggestList}>
        {t.list.map((sug) => (
          <li key={sug.id}>
            <div className={h.suggestRow}>
              <span className={h.suggestText}>
                <small className={h.meta}>{sug.label}</small>
                <span>{sug.text}</span>
              </span>
              <button
                type="button"
                className={`${h.ctl} ${h.small}`}
                onClick={() => t.apply(sug)}
              >
                적용
              </button>
            </div>
            {t.asking?.id === sug.id && (
              <div className={h.confirmWarn} role="alert">
                <span>직접 쓰신 제목 «{t.sheet.title}»을 바꿀까요?</span>
                <button
                  type="button"
                  className={`${h.ctl} ${h.primary} ${h.small}`}
                  onClick={t.confirm}
                >
                  바꾸기
                </button>
                <button
                  type="button"
                  className={`${h.ctl} ${h.small}`}
                  onClick={t.cancel}
                >
                  그대로 두기
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function W7H1() {
  const t = useTitles();
  return (
    <Option
      id="w7-1"
      title="1 · 라벨 붙은 세 줄 — 확인은 그 줄 아래 노란 줄"
      idea="제목 칸 바로 아래 «추천 제목» 묶음. 줄마다 흐린 라벨(범위 이름 · 과정 · 대단원 · 날짜 · 날짜 먼저) 위에 제목 글, 오른쪽에 작은 [적용]. 직접 쓴 제목에서 누르면 그 줄 바로 아래에 노란 줄 «직접 쓰신 제목 «…»을 바꿀까요? [바꾸기] [그대로 두기]»가 편다."
      cost="세 줄 + 라벨이라 약 190px — 학교/기관명 칸 이하가 그만큼 내려간다. 제목을 다 정한 뒤에도 늘 보인다."
      tools={<Tools t={t} />}
    >
      <Frame
        t={t}
        label="1280 · 제목은 기본값 — [적용]이 바로 바꾼다"
        afterTitle={<Rows1 t={t} />}
      />
    </Option>
  );
}

/* ───────────── 2안 — 글 칩 · 확인은 «전 → 후» 상자 ───────────── */

function Chips2({ t }: { t: T }) {
  if (t.asking)
    return (
      <div className={h.beforeAfter} role="alert" data-suggest>
        <span className={h.sectionLabel}>제목을 바꿀까요?</span>
        <span className={h.struck}>{t.sheet.title}</span>
        <span aria-hidden className={h.arrow}>
          ↓
        </span>
        <b>{t.asking.text}</b>
        <div className={h.row}>
          <button
            type="button"
            className={`${h.ctl} ${h.primary} ${h.small}`}
            onClick={t.confirm}
          >
            바꾸기
          </button>
          <button
            type="button"
            className={`${h.ctl} ${h.small}`}
            onClick={t.cancel}
          >
            취소
          </button>
        </div>
      </div>
    );
  return (
    <div className={h.chipBlock} data-suggest>
      <span className={h.sectionLabel}>추천 — 누르면 제목이 됩니다</span>
      <div className={h.chipWrap}>
        {t.list.map((sug) => (
          <button
            type="button"
            key={sug.id}
            className={h.suggestChip}
            title={sug.label}
            onClick={() => t.apply(sug)}
          >
            {sug.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function W7H2() {
  const t = useTitles();
  return (
    <Option
      id="w7-2"
      title="2 · 글 칩 — 칩이 곧 [적용], 확인은 «전 → 후» 상자"
      idea="추천 셋을 글 그대로 칩으로 — 칩을 누르는 것이 적용이다(라벨은 칩에 마우스를 올리면). 셋이 감겨 두세 줄. 직접 쓴 제목에서 누르면 칩 자리가 «제목을 바꿀까요?» 상자로 바뀌어 지금 제목(지운 줄)과 바뀔 제목(굵게)을 위아래로 보인다."
      cost="라벨이 안 보여 «어느 꼴인지»는 글을 읽어야 안다. 칩 셋 길이가 제각각이라 줄이 들쭉날쭉하다. 확인 상자가 칩을 가려 다른 추천으로 갈아타려면 [취소] 한 번이 더 든다."
      tools={<Tools t={t} />}
    >
      <Frame
        t={t}
        label="1280 · 칩은 제목 칸 바로 아래"
        afterTitle={<Chips2 t={t} />}
      />
    </Option>
  );
}

/* ───────────── 3안 — 옅은 상자 속 표 줄 · 확인은 그 줄이 바뀐다 ───────────── */

const SHORT: Record<string, string> = {
  scope: "범위",
  course: "과정",
  date: "날짜",
};

function Table3({ t }: { t: T }) {
  return (
    <div className={h.suggestPanel} data-suggest>
      <div className={h.between}>
        <span className={h.sectionLabel}>추천 제목</span>
        <small className={h.meta}>
          {t.typed
            ? "직접 쓴 제목 — 고르면 묻습니다"
            : "기본 제목 — 고르면 바로 바뀝니다"}
        </small>
      </div>
      <ul className={h.suggestTable}>
        {t.list.map((sug) => {
          const asking = t.asking?.id === sug.id;
          return (
            <li
              key={sug.id}
              className={
                asking ? h.suggestAsking : t.asking ? h.suggestDim : undefined
              }
            >
              <span className={h.suggestKey}>{SHORT[sug.id]}</span>
              <span className={h.suggestText}>
                {asking && <small>이 제목으로 바꿀까요?</small>}
                <span>{sug.text}</span>
              </span>
              {asking ? (
                <span className={h.suggestAskActions}>
                  <button
                    type="button"
                    className={`${h.ctl} ${h.primary} ${h.small}`}
                    onClick={t.confirm}
                  >
                    바꾸기
                  </button>
                  <button
                    type="button"
                    className={`${h.ctl} ${h.small}`}
                    onClick={t.cancel}
                  >
                    취소
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  className={`${h.ctl} ${h.text} ${h.small}`}
                  disabled={!!t.asking}
                  onClick={() => t.apply(sug)}
                >
                  적용
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function W7H3() {
  const t = useTitles();
  return (
    <Option
      id="w7-3"
      title="3 · 옅은 상자 속 표 줄 — 확인은 그 줄이 노랗게 바뀐다"
      idea="회청 바탕 상자에 세 줄을 표처럼 — 왼쪽 짧은 열쇠(범위 · 과정 · 날짜), 가운데 제목, 오른쪽 글 단추 [적용]. 상자 머리에 «기본 제목 — 고르면 바로 바뀝니다 / 직접 쓴 제목 — 고르면 묻습니다»를 미리 적는다. 확인은 누른 줄 자체가 노랗게 바뀌며 «이 제목으로 바꿀까요? [바꾸기] [취소]», 나머지 줄은 흐려진다."
      cost="글 단추 [적용]은 테두리가 없어 눈에 덜 띈다. 상자 · 열쇠 열 때문에 제목 글 폭이 가장 좁다(약 190px) — 긴 추천은 세 줄로 감긴다. 열쇠 «과정»이 실제로는 «과정 · 대단원 · 날짜»라 줄임이 뜻을 덜 전한다."
      tools={<Tools t={t} />}
    >
      <Frame
        t={t}
        label="1280 · 상자는 제목 칸 아래"
        afterTitle={<Table3 t={t} />}
      />
    </Option>
  );
}

/* ───────────── 4안 — 번호 줄 · 확인은 제목 칸에 붙는다 · 방금 바꿈 · 되돌리기 ───────────── */

function TitleField4({ t }: { t: T }) {
  return (
    <div className={h.titleField4}>
      <label className={we.field} style={{ marginBottom: 0 }}>
        제목
        <input
          value={t.sheet.title}
          maxLength={80}
          onChange={(e) => {
            t.sheet.setTitle(e.target.value);
            t.sheet.patchMeta({ title: e.target.value });
          }}
          aria-describedby="w7-4-title-note"
        />
      </label>
      {t.asking ? (
        <div className={h.titleAsk} role="alert" id="w7-4-title-note">
          <span>직접 쓴 제목입니다. «{t.asking.text}»로 바꿀까요?</span>
          <span className={h.row}>
            <button
              type="button"
              className={`${h.ctl} ${h.primary} ${h.small}`}
              onClick={t.confirm}
            >
              바꾸기
            </button>
            <button
              type="button"
              className={`${h.ctl} ${h.small}`}
              onClick={t.cancel}
            >
              그대로 두기
            </button>
          </span>
        </div>
      ) : t.previous !== null ? (
        <p className={h.titleDone} role="status" id="w7-4-title-note">
          추천으로 바꿨습니다.
          <button
            type="button"
            className={`${h.ctl} ${h.text} ${h.small}`}
            onClick={t.undo}
          >
            되돌리기
          </button>
        </p>
      ) : null}
    </div>
  );
}

function Rows4({ t }: { t: T }) {
  return (
    <ol className={h.numbered} data-suggest aria-label="추천 제목">
      {t.list.map((sug, i) => (
        <li
          key={sug.id}
          className={t.asking?.id === sug.id ? h.numberedOn : undefined}
        >
          <span className={h.numberedNo}>{i + 1}</span>
          <span className={h.suggestText}>{sug.text}</span>
          <button
            type="button"
            className={`${h.ctl} ${h.small}`}
            onClick={() => t.apply(sug)}
          >
            적용
          </button>
        </li>
      ))}
    </ol>
  );
}

function W7H4() {
  const t = useTitles();
  return (
    <Option
      id="w7-4"
      title="4 · 번호 줄 — 확인은 제목 칸에 붙고, 바꾼 뒤에는 [되돌리기]"
      idea="추천은 번호(1 · 2 · 3)와 글 · [적용]만인 가장 낮은 줄(라벨 없음). 묻는 말은 줄이 아니라 바뀔 대상인 제목 칸 바로 밑에 붙는다 — «직접 쓴 제목입니다. «…»로 바꿀까요?». 기본 제목을 바로 바꾼 뒤에는 그 자리에 «추천으로 바꿨습니다 · 되돌리기»가 남아, 묻지 않고 바꾼 것을 한 번에 되돌린다."
      cost="[되돌리기]는 Wire 에 없던 동작이다 — 넣을지 여쭙는다. 묻는 말이 누른 줄에서 떨어져 있어 줄을 누르고 눈을 위로 옮겨야 한다. 라벨이 없어 세 추천이 어떤 꼴인지는 글로만 가른다."
      tools={<Tools t={t} />}
    >
      <Frame
        t={t}
        label="1280 · 묻는 말은 제목 칸 밑"
        titleField={<TitleField4 t={t} />}
        afterTitle={<Rows4 t={t} />}
      />
    </Option>
  );
}

/* ───────────── 폰 390 — 1안 ───────────── */

function W7Phone() {
  const t = useTitles();
  return (
    <Option
      id="w7-phone"
      title="폰 390 · 1안 — 설정 칸이 미리보기 위로 쌓인다"
      idea="세 줄의 꼴은 같고, [적용]은 글 오른쪽에 남는다. 묻는 줄의 단추 둘은 글 아래로 감긴다. 지면은 설정 칸 아래로 내려가 «미리보기 보기 ↓»로 간다."
      cost="긴 추천이 세 줄로 감겨 세 줄 묶음이 약 260px 가 된다."
      tools={<Tools t={t} />}
    >
      <PhoneFrame label="390 · 제목은 기본값">
        <Step3
          sheet={t.sheet}
          settings={
            <SettingsPanel sheet={t.sheet} afterTitle={<Rows1 t={t} />} />
          }
        />
      </PhoneFrame>
    </Option>
  );
}

export function W7Section() {
  return (
    <>
      <W7H1 />
      <W7H2 />
      <W7H3 />
      <W7H4 />
      <W7Phone />
    </>
  );
}

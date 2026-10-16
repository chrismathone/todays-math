"use client";

import { useState, type ReactNode } from "react";

import {
  D111_EXCLUDED,
  FAMILY,
  LADDER,
  ORIGINAL,
  OTHERS,
  type Problem,
} from "./fixtures";
import h from "./hifi.module.css";
import {
  Builder,
  DesktopFrame,
  Meta,
  MockDialog,
  Option,
  PhoneFrame,
  ProblemBody,
  ReviewColumn,
  TitleBar,
} from "./parts";
import { ScopeTableStatic } from "./W4Compose";

/**
 * W3 교체 — Wire B(원문 왼쪽 · 후보 오른쪽 · 대조한 뒤 교체)의 Hi-fi 4안.
 * 네 안이 같은 상태(층 · 난이도 · 대조 중인 후보)를 쓰고, 다른 것은 **대조가 놓이는 자리와 후보의 꼴**이다.
 */

type Layer = "family" | "others";

function useReplace() {
  const [layer, setLayer] = useState<Layer>("family");
  // 둘째 층의 난이도는 바꿀 문항의 난이도로 시작한다(지금은 «전체 난이도»로 시작).
  const [tier, setTier] = useState<string>(ORIGINAL.tier);
  const [search, setSearch] = useState("");
  const [compareId, setCompareId] = useState<string>(FAMILY[0].id);
  const [swapped, setSwapped] = useState<Problem | null>(null);
  const [open, setOpen] = useState(true);
  const list =
    layer === "family"
      ? FAMILY
      : OTHERS.filter(
          (q) =>
            (!tier || q.tier === tier) &&
            (!search.trim() || q.body.includes(search.trim())),
        );
  const compare =
    [...FAMILY, ...OTHERS].find((q) => q.id === compareId) ?? null;
  const othersCount = OTHERS.filter((q) => !tier || q.tier === tier).length;
  return {
    layer,
    tier,
    search,
    list,
    compare,
    compareId,
    othersCount,
    swapped,
    open,
    setSearch,
    switchLayer(next: Layer) {
      setLayer(next);
      const first =
        next === "family" ? FAMILY[0] : OTHERS.find((q) => q.tier === tier);
      if (first) setCompareId(first.id);
    },
    setTier(next: string) {
      setTier(next);
      const first = OTHERS.find((q) => !next || q.tier === next);
      if (first && layer === "others") setCompareId(first.id);
    },
    pick: setCompareId,
    replace() {
      if (!compare) return;
      setSwapped(compare);
      setOpen(false);
    },
    cancel() {
      setOpen(false);
    },
    reset() {
      setOpen(true);
      setSwapped(null);
      setLayer("family");
      setTier(ORIGINAL.tier);
      setSearch("");
      setCompareId(FAMILY[0].id);
    },
  };
}
type ReplaceState = ReturnType<typeof useReplace>;

/* ───────────── 공통 조각 ───────────── */

function LayerSwitch({ r, joined }: { r: ReplaceState; joined?: boolean }) {
  return (
    <div
      className={joined ? h.segJoined : h.seg}
      role="group"
      aria-label="후보 층"
    >
      <button
        type="button"
        aria-pressed={r.layer === "family"}
        onClick={() => r.switchLayer("family")}
      >
        같은 문항류 <span className={h.num}>{FAMILY.length}</span>
      </button>
      <button
        type="button"
        aria-pressed={r.layer === "others"}
        onClick={() => r.switchLayer("others")}
      >
        같은 차시의 다른 문항 <span className={h.num}>{r.othersCount}</span>
      </button>
    </div>
  );
}

/** 둘째 층에서만 — 난이도(바꿀 문항의 «응용»에서 시작) · 검색. */
function OthersFilters({ r, compact }: { r: ReplaceState; compact?: boolean }) {
  if (r.layer !== "others") return null;
  return (
    <>
      <div className={h.seg} role="group" aria-label="난이도">
        {["", ...LADDER].map((t) => (
          <button
            key={t || "all"}
            type="button"
            className={h.small}
            aria-pressed={r.tier === t}
            onClick={() => r.setTier(t)}
          >
            {t || "전체"}
          </button>
        ))}
      </div>
      {!compact && (
        <input
          value={r.search}
          onChange={(e) => r.setSearch(e.target.value)}
          placeholder="문제 내용으로 검색"
          aria-label="문항 검색"
        />
      )}
    </>
  );
}

function LayerNote({ r }: { r: ReplaceState }) {
  return (
    <small className={h.meta}>
      {r.layer === "family"
        ? "일차부등식의 활용 · 07번과 같은 문항류의 다른 변형입니다."
        : `일차부등식의 활용 · ${r.tier || "전체 난이도"} · 다른 자리와 같은 문항류 ${D111_EXCLUDED}문항은 뺐습니다.`}
    </small>
  );
}

function Foot({ r }: { r: ReplaceState }) {
  return (
    <>
      <span className={h.grow}>
        07번의 문항류는 남깁니다. 시험지의 다른 자리와 같은 문항류는 후보에서
        뺍니다(D-111).
      </span>
      <button type="button" onClick={r.cancel}>
        취소
      </button>
    </>
  );
}

function OriginalPane({ paper }: { paper?: boolean }) {
  return (
    <div className={h.pane}>
      <div className={h.paneHead}>
        <strong>바꿀 문항 · 07번</strong>
        <Meta q={ORIGINAL} />
      </div>
      <ProblemBody q={ORIGINAL} paper={paper} />
    </div>
  );
}

function ComparePane({ r, paper }: { r: ReplaceState; paper?: boolean }) {
  const q = r.compare;
  if (!q)
    return <p className={h.empty}>오른쪽에서 [대조]를 누르면 여기 놓입니다.</p>;
  return (
    <div className={h.paneCompare}>
      <div className={h.paneHead}>
        <strong>대조할 후보</strong>
        <Meta q={q} family={r.layer === "family"} />
      </div>
      <ProblemBody q={q} paper={paper} />
      {q.changes && (
        <p className={h.changes}>
          <b>다른 곳</b> {q.changes}
        </p>
      )}
      <div className={h.paneFoot}>
        <button type="button" className={h.primary} onClick={r.replace}>
          이 문항으로 교체
        </button>
      </div>
    </div>
  );
}

/** 배경 — 2단계 검토 화면(왼쪽 설정 · 오른쪽 구성한 문항). */
function Behind({ r }: { r: ReplaceState }) {
  return (
    <Builder step="review">
      <aside className={h.stack} aria-label="시험지 설정(그림)">
        <TitleBar />
        <ScopeTableStatic />
      </aside>
      <ReviewColumn swapped={r.swapped} onUndo={r.reset} />
    </Builder>
  );
}

function Frame({
  r,
  label,
  children,
}: {
  r: ReplaceState;
  label: string;
  children: ReactNode;
}) {
  return (
    <DesktopFrame label={label} overlay={r.open ? children : undefined}>
      <Behind r={r} />
    </DesktopFrame>
  );
}

function Tools({ r }: { r: ReplaceState }) {
  return (
    <button type="button" onClick={r.reset}>
      {r.open ? "처음 상태로" : "교체 창 다시 열기"}
    </button>
  );
}

/* ───────────── H1 — 원문 위 · 대조 아래 / 후보는 두 줄 요약 ───────────── */

function W3H1() {
  const r = useReplace();
  return (
    <Option
      id="w3-1"
      title="1 · 왼쪽에 원문과 대조를 위아래로, 오른쪽은 두 줄 요약"
      idea="Wire B 를 그대로 옷 입힌 안. 왼쪽 회청 바탕에 바꿀 문항(흰 판)과 대조할 후보(코발트 테두리 판)를 위아래로 둔다. 오른쪽 후보는 두 줄까지만 보이는 줄 목록이라 한 화면에 여럿 들어온다. 층 전환은 눌린 칸 둘."
      cost="후보 본문은 두 줄에서 잘린다 — 끝까지 읽으려면 [대조]. 원문과 후보가 위아래라 긴 문항은 왼쪽 칸이 길어진다."
      tools={<Tools r={r} />}
    >
      <Frame
        r={r}
        label="1280 화면 · 사이드바 240 · 07번 [교체]를 누른 뒤 첫 후보를 대조한 상태"
      >
        <MockDialog
          title="문항 교체 · 07번"
          head={
            <button type="button" onClick={r.cancel}>
              닫기
            </button>
          }
          foot={<Foot r={r} />}
        >
          <div className={h.w3Split}>
            <div className={h.w3Left}>
              <OriginalPane />
              <ComparePane r={r} />
            </div>
            <div className={h.w3Right}>
              <div className={h.w3Tools}>
                <LayerSwitch r={r} />
                <OthersFilters r={r} />
                <LayerNote r={r} />
              </div>
              {r.list.length === 0 && (
                <p className={h.empty}>
                  조건에 맞는 남은 문항이 없습니다. 난이도를 바꿔 보세요.
                </p>
              )}
              {r.list.map((q) => {
                const on = q.id === r.compareId;
                return (
                  <div key={q.id} className={on ? h.candRowOn : h.candRow}>
                    <div>
                      <Meta q={q} family={r.layer === "family"} />
                      <ProblemBody q={q} clamp={2} />
                    </div>
                    {on ? (
                      <span className={h.badge}>대조 중</span>
                    ) : (
                      <button type="button" onClick={() => r.pick(q.id)}>
                        대조
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </MockDialog>
      </Frame>
    </Option>
  );
}

/* ───────────── H2 — 대조판 두 칸(원문 | 후보) · 오른쪽 좁은 목록 ───────────── */

function W3H2() {
  const r = useReplace();
  const q = r.compare;
  return (
    <Option
      id="w3-2"
      title="2 · 대조판 두 칸 — 원문과 후보를 옆으로 나란히"
      idea="왼쪽 넓은 칸을 다시 둘로 갈라 원문 | 후보를 같은 높이로 나란히 놓는다. 숫자만 다른 변형은 눈이 좌우로 한 번 오가면 끝난다. 아래 막대에 «다른 곳»과 [이 문항으로 교체]. 오른쪽은 좁은 목록 — 메타 한 줄 + 첫 줄."
      cost="두 칸이 각 250px 남짓이라 그림 · 긴 서술형은 좁다. 오른쪽 목록에서는 본문을 거의 못 읽어 [대조]를 더 자주 누른다."
      tools={<Tools r={r} />}
    >
      <Frame
        r={r}
        label="1280 화면 · 사이드바 240 · 같은 문항류 2/4 를 대조한 상태"
      >
        <MockDialog
          title="문항 교체 · 07번"
          head={
            <button type="button" onClick={r.cancel}>
              닫기
            </button>
          }
          foot={<Foot r={r} />}
        >
          <div className={h.w3Board}>
            <div className={h.boardLeft}>
              <div className={h.boardPair}>
                <OriginalPane />
                {q ? (
                  <div className={h.paneCompare}>
                    <div className={h.paneHead}>
                      <strong>대조할 후보</strong>
                      <Meta q={q} family={r.layer === "family"} />
                    </div>
                    <ProblemBody q={q} />
                  </div>
                ) : (
                  <p className={h.empty}>오른쪽에서 고르세요.</p>
                )}
              </div>
              <div className={h.boardBar}>
                <p className={h.changes}>
                  <b>다른 곳</b> {q?.changes ?? "—"}
                </p>
                <button
                  type="button"
                  className={h.primary}
                  onClick={r.replace}
                  disabled={!q}
                >
                  이 문항으로 교체
                </button>
              </div>
            </div>
            <div className={h.w3Right}>
              <div className={h.w3Tools}>
                <LayerSwitch r={r} joined />
                <OthersFilters r={r} compact />
              </div>
              {r.list.map((c) => {
                const on = c.id === r.compareId;
                return (
                  <div key={c.id} className={on ? h.slimRowOn : h.slimRow}>
                    <div className={h.between}>
                      <Meta q={c} family={r.layer === "family"} />
                      {on ? (
                        <span className={h.badge}>대조 중</span>
                      ) : (
                        <button
                          type="button"
                          className={h.small}
                          onClick={() => r.pick(c.id)}
                        >
                          대조
                        </button>
                      )}
                    </div>
                    <ProblemBody q={c} clamp={1} />
                  </div>
                );
              })}
            </div>
          </div>
        </MockDialog>
      </Frame>
    </Option>
  );
}

/* ───────────── H3 — 오른쪽 후보를 카드로 다 보이기 ───────────── */

function W3H3() {
  const r = useReplace();
  return (
    <Option
      id="w3-3"
      title="3 · 후보는 본문까지 다 보이는 카드, 대조는 왼쪽에 고정"
      idea="오른쪽 후보를 실제 교체 창처럼 본문 · 보기까지 다 그린다. 읽기만 하려면 누르지 않아도 되고, 둘을 맞대 보고 싶을 때만 [대조] — 왼쪽 판이 그 후보로 바뀐다. 대조 중인 카드는 옅은 코발트 바탕."
      cost="오른쪽이 길어져 같은 차시 후보가 많으면 스크롤이 길다. 같은 본문이 왼쪽 · 오른쪽에 두 번 보인다."
      tools={<Tools r={r} />}
    >
      <Frame
        r={r}
        label="1280 화면 · 사이드바 240 · 둘째 층(같은 차시의 다른 문항)도 눌러 볼 수 있다"
      >
        <MockDialog
          title="문항 교체 · 07번"
          head={
            <button type="button" onClick={r.cancel}>
              닫기
            </button>
          }
          foot={<Foot r={r} />}
        >
          <div className={h.w3Split}>
            <div className={h.w3Left}>
              <OriginalPane />
              <ComparePane r={r} />
            </div>
            <div className={h.w3Right}>
              <div className={h.w3Tools}>
                <LayerSwitch r={r} />
                <OthersFilters r={r} />
                <LayerNote r={r} />
              </div>
              {r.list.map((q) => {
                const on = q.id === r.compareId;
                return (
                  <article
                    key={q.id}
                    className={on ? h.candCardOn : h.candCard}
                  >
                    <Meta q={q} family={r.layer === "family"} />
                    <ProblemBody q={q} />
                    <div className={h.candCardFoot}>
                      {on ? (
                        <span className={h.badge}>왼쪽에서 대조 중</span>
                      ) : (
                        <button type="button" onClick={() => r.pick(q.id)}>
                          대조
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </MockDialog>
      </Frame>
    </Option>
  );
}

/* ───────────── H4 — 지면 모양 대조 · 후보는 표 ───────────── */

function W3H4() {
  const r = useReplace();
  const q = r.compare;
  return (
    <Option
      id="w3-4"
      title="4 · 지면 모양으로 대조, 후보는 촘촘한 표"
      idea="왼쪽 두 판을 시험지 지면 글꼴(명조) · 보기 다섯 칸으로 그려 «종이에 이렇게 나간다»를 그대로 맞대 본다. 오른쪽은 표 — 문항류 · 난이도 · 형식 · 첫 줄 · [대조]. 한 화면에 후보가 가장 많이 들어간다."
      cost="화면은 고딕, 지면은 명조라 창 안에 글꼴이 둘. 표의 첫 줄만으로는 어떤 문항인지 알기 어려워 [대조]에 기댄다."
      tools={<Tools r={r} />}
    >
      <Frame r={r} label="1280 화면 · 사이드바 240 · 지면 글꼴로 맞대 본 상태">
        <MockDialog
          title="문항 교체 · 07번"
          head={
            <button type="button" onClick={r.cancel}>
              닫기
            </button>
          }
          foot={<Foot r={r} />}
        >
          <div className={h.w3Split}>
            <div className={h.w3Left}>
              <div className={h.paperSheet}>
                <div className={h.paperTag}>
                  <span>지금 07번</span>
                  <span>
                    {ORIGINAL.tier} · {ORIGINAL.format}
                  </span>
                </div>
                <div className={h.paperBody}>
                  <span className={h.paperNo}>7.</span>
                  <ProblemBody q={ORIGINAL} paper />
                </div>
              </div>
              {q && (
                <div
                  className={h.paperSheet}
                  style={{ borderColor: "var(--learn-accent)" }}
                >
                  <div className={h.paperTag}>
                    <span>바꾸면 07번</span>
                    <span>
                      {r.layer === "family" && q.family
                        ? `같은 문항류 ${q.family} · `
                        : ""}
                      {q.tier} · {q.format} · {q.origin}
                    </span>
                  </div>
                  <div className={h.paperBody}>
                    <span className={h.paperNo}>7.</span>
                    <ProblemBody q={q} paper />
                  </div>
                  {q.changes && (
                    <p className={h.changes}>
                      <b>다른 곳</b> {q.changes}
                    </p>
                  )}
                  <div className={h.paneFoot}>
                    <button
                      type="button"
                      className={h.primary}
                      onClick={r.replace}
                    >
                      이 문항으로 교체
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className={h.w3Right}>
              <div className={h.w3Tools}>
                <LayerSwitch r={r} joined />
                <OthersFilters r={r} compact />
              </div>
              <table className={h.candTable}>
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>
                      {r.layer === "family" ? "문항류" : "난이도"}
                    </th>
                    <th>첫 줄</th>
                    <th style={{ width: 72 }} />
                  </tr>
                </thead>
                <tbody>
                  {r.list.map((c) => {
                    const on = c.id === r.compareId;
                    return (
                      <tr key={c.id} aria-selected={on}>
                        <td className={h.num}>
                          {r.layer === "family" ? c.family : c.tier}
                          <small className={h.meta}>{c.format}</small>
                        </td>
                        <td>
                          <ProblemBody q={c} clamp={2} />
                        </td>
                        <td>
                          {on ? (
                            <span className={h.badge}>대조 중</span>
                          ) : (
                            <button
                              type="button"
                              className={h.small}
                              onClick={() => r.pick(c.id)}
                            >
                              대조
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </MockDialog>
      </Frame>
    </Option>
  );
}

/* ───────────── 390 — 위아래로 쌓는다 ───────────── */

function W3Phone() {
  const r = useReplace();
  return (
    <Option
      id="w3-phone"
      title="390 · 폰 — 창이 화면을 덮고, 대조판이 위 · 후보가 아래"
      idea="폰에서는 왼쪽 · 오른쪽이 위 · 아래가 된다(1 · 3안 공통). 원문과 대조 후보를 위에 쌓고 [이 문항으로 교체]를 그 바로 아래에, 층 전환과 후보 줄을 그 밑에 둔다."
      cost="원문 · 후보 · 목록이 한 줄로 길어 목록까지 내려가야 다른 후보가 보인다."
      tools={<Tools r={r} />}
    >
      <PhoneFrame
        label="390 화면 · 교체 창(화면 전체)"
        overlay={
          r.open ? (
            <MockDialog
              phone
              title="문항 교체 · 07번"
              head={
                <button type="button" onClick={r.cancel}>
                  닫기
                </button>
              }
            >
              <div className={h.w3Left} style={{ borderRight: 0, padding: 12 }}>
                <OriginalPane />
                <ComparePane r={r} />
              </div>
              <div className={h.w3Tools} style={{ padding: 12 }}>
                <LayerSwitch r={r} />
                <OthersFilters r={r} compact />
              </div>
              {r.list.map((q) => {
                const on = q.id === r.compareId;
                return (
                  <div
                    key={q.id}
                    className={on ? h.candRowOn : h.candRow}
                    style={{ padding: "10px 12px" }}
                  >
                    <div>
                      <Meta q={q} family={r.layer === "family"} />
                      <ProblemBody q={q} clamp={2} />
                    </div>
                    {on ? (
                      <span className={h.badge}>대조 중</span>
                    ) : (
                      <button type="button" onClick={() => r.pick(q.id)}>
                        대조
                      </button>
                    )}
                  </div>
                );
              })}
              <p className={h.empty} style={{ padding: 12 }}>
                07번의 문항류는 남기고, 다른 자리와 같은 문항류는 뺐습니다.
              </p>
            </MockDialog>
          ) : undefined
        }
      >
        <Builder step="review">
          <ReviewColumn swapped={r.swapped} onUndo={r.reset} />
        </Builder>
      </PhoneFrame>
    </Option>
  );
}

export function W3Section() {
  return (
    <>
      <W3H1 />
      <W3H2 />
      <W3H3 />
      <W3H4 />
      <W3Phone />
    </>
  );
}

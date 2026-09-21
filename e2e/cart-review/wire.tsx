/**
 * 담은 문항 — **시안(Wire)** 화면(트랙 41). 원장님 2026-09-21 «담은걸 확인하거나 빼거나
 * 어떤걸 담았는지 체크할 수 있는기능이 없는듯».
 *
 * 이 파일은 **제품이 아니다.** D-07 — 모양은 원장님이 고르신다. 네 안을 같은 틀에서 눌러
 * 보고, `wire.spec.ts` 가 1516px·1280px 에서 «자리가 되는가»와 «몇 번 눌러 빼는가»를 잰다.
 *
 * - 틀(단계 막대·검수 카드·바닥 막대)은 **제품 CSS 모듈과 제품 `StudioStepBar`** 로 그린다 —
 *   폭·줄바꿈이 제품과 같아야 잰 값을 믿을 수 있다. 작업실 컨테이너 질의(980px 에서 바닥 상태
 *   줄을 숨기는 것)도 그대로 걸린다.
 * - 원본 칸·도구 줄·카드 본문은 회색 대역이다(그대로인 칸).
 * - **점선으로 두른 것이 새로 서는 것이다.** 점선은 시안 표시일 뿐 제품 모양이 아니다.
 * - 네 안 모두 같은 원천 하나(시험지의 담은 목록 = `UnifiedWorkspace` 의 `selected`)를 쓴다고
 *   가정한다. 여기서는 `picked` 한 벌이 그 대역이다.
 *
 * 보는 법: `npx vite --config e2e/cart-review/vite.config.mts` 뒤
 *   http://127.0.0.1:4193/wire.html?plan=A   (A·B·C·D) — `&open=1` 이면 목록을 편 채로 뜬다.
 *   `&at=foot` 이면 안 A·D 의 새 것을 카드 머리가 아니라 바닥 줄 끝에 둔다(1280 에서 머리가 꺾여서).
 */
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import StudioStepBar from "../../src/components/unified/StudioStepBar";
import st from "../../src/components/unified/StudioView.module.css";
import rp from "../../src/components/unified/StudioReviewPane.module.css";
import "./frame.css";
import "./wire.css";

type Plan = "A" | "B" | "C" | "D";
const PLAN_NAME: Record<Plan, string> = {
  A: "안 A — 카드마다 «문제 담기 / 담기 완료» 단추 (문제은행 카드와 같은 단추)",
  B: "안 B — 바닥 «담은 문항 N» → 위로 펼치는 목록, 줄마다 ✕",
  C: "안 C — ④ 문제 순서 칸을 작업실 오른쪽 서랍으로",
  D: "안 D — 카드에 «담음» 표시(읽기 전용) + 안 B 의 목록",
};

interface Item {
  id: string;
  label: string;
  detail: string;
  /** 이 원본에서 자른 문제면 카드 번호. 문제은행 등 다른 곳에서 온 것은 없다. */
  crop?: number;
}
const CROP_COUNT = 8;
const crops: Item[] = Array.from({ length: CROP_COUNT }, (_, i) => ({
  id: `c${i + 1}`,
  label: `문제 ${String(i + 1).padStart(2, "0")}`,
  detail: `${i < 4 ? 1 : 2}쪽 · 중1`,
  crop: i + 1,
}));
const bank: Item = {
  id: "b1",
  label: "일차방정식의 활용",
  detail: "중1 · 중",
};
const ITEMS = new Map([...crops, bank].map((item) => [item.id, item]));
/** 시험지에 이미 담긴 것 — 이 원본 넷(01·02·04·05)과 문제은행 하나. */
const START = ["c1", "c2", "b1", "c4", "c5"];
/** 담은 뒤 고친 문항 — 시험지에는 옛 판이 있다(원장님께 여쭐 것 ①). */
const STALE = new Set(["c2"]);

function Wire({
  plan,
  openAtStart,
  at,
}: {
  plan: Plan;
  openAtStart: boolean;
  /** 안 A·D 의 새 것을 카드 머리에 두나(기본), 바닥 줄에 두나. */
  at: "head" | "foot";
}) {
  const [picked, setPicked] = useState(START);
  /** 이번에 뺀 것과 그 자리 — 목록에 흐리게 남아 «다시 담기»로 제자리에 돌린다. */
  const [out, setOut] = useState<Map<string, number>>(new Map());
  const [open, setOpen] = useState(openAtStart);
  const here = picked.filter((id) => ITEMS.get(id)?.crop);
  // 뺀 것은 «N문항 담기» 에서 건너뛴다 — 한꺼번에 담기가 뺀 것을 도로 넣지 않게(여쭐 것 ②).
  const pending = crops.filter(
    (crop) => !picked.includes(crop.id) && !out.has(crop.id),
  ).length;

  function remove(id: string) {
    const index = picked.indexOf(id);
    if (index < 0) return;
    setPicked((current) => current.filter((value) => value !== id));
    setOut((current) => new Map(current).set(id, index));
  }
  function restore(id: string) {
    const index = out.get(id) ?? picked.length;
    setPicked((current) => {
      if (current.includes(id)) return current;
      const next = [...current];
      next.splice(Math.min(index, next.length), 0, id);
      return next;
    });
    setOut((current) => {
      const next = new Map(current);
      next.delete(id);
      return next;
    });
  }
  function toggle(id: string) {
    if (picked.includes(id)) remove(id);
    else restore(id);
  }
  function move(index: number, direction: number) {
    setPicked((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }
  function addAll() {
    setPicked((current) => [
      ...current,
      ...crops
        .filter((crop) => !current.includes(crop.id) && !out.has(crop.id))
        .map((crop) => crop.id),
    ]);
  }

  /** 목록 줄 — 담긴 것은 차례대로, 뺀 것은 뺀 자리에 흐리게. */
  const rows: { id: string; out: boolean }[] = picked.map((id) => ({
    id,
    out: false,
  }));
  [...out.entries()]
    .sort((a, b) => a[1] - b[1])
    .forEach(([id, index]) =>
      rows.splice(Math.min(index, rows.length), 0, { id, out: true }),
    );

  const chip = (id: string) =>
    picked.includes(id) ? (
      STALE.has(id) ? (
        <span className="wireChip wireNew" data-state="stale">
          담음 · 고친 내용 반영 전
        </span>
      ) : (
        <span className="wireChip wireNew">담음</span>
      )
    ) : out.has(id) ? (
      <span className="wireChip wireNew" data-state="out">
        뺌
      </span>
    ) : null;

  const card = (item: Item, active: boolean) => {
    const inWorksheet = picked.includes(item.id);
    const mark =
      plan === "D" ? (
        chip(item.id)
      ) : plan === "A" ? (
        <button
          type="button"
          className="wireToggle wireNew"
          aria-pressed={inWorksheet}
          aria-label={`${item.label} ${inWorksheet ? "담기 취소" : "담기"}`}
          onClick={() => toggle(item.id)}
        >
          {inWorksheet ? "✓ 담기 완료" : "+ 문제 담기"}
        </button>
      ) : null;
    return (
      <article
        key={item.id}
        className={rp.card}
        data-selected={active}
        aria-label={`${item.label} 인식 결과`}
      >
        <div className={rp.cardHeading}>
          <button type="button" className={rp.number}>
            {item.label.replace("문제 0", "문제 ")}
          </button>
          <span>일차방정식</span>
          <span>인식 완료</span>
          <span>단답형</span>
          <span className={rp.confirmed}>검수 완료</span>
          {at === "head" && mark}
          <div className={rp.actions}>
            <button type="button">문자 인식</button>
            <button type="button">내용 수정</button>
          </div>
        </div>
        <div className="wireLines" aria-hidden="true">
          <span />
          <span />
        </div>
        <div className={rp.cardFooter}>
          <label>
            출력
            <select aria-label={`${item.label} 출력 방식`} defaultValue="text">
              <option value="image">원본 이미지</option>
              <option value="text">인식한 텍스트 + 도형</option>
            </select>
          </label>
          <button type="button" disabled>
            해설 다시 생성
          </button>
          {/* 검수 완료 잠금(트랙 30) 그대로 — 바닥 줄이 가장 붐비는 모양으로 잰다. */}
          <span className={rp.lockNote}>
            수정하려면 검수 완료를 취소하세요.
          </span>
          <button type="button">검수 완료 취소</button>
          {at === "foot" && mark}
        </div>
      </article>
    );
  };

  const listRow = (row: { id: string; out: boolean }, index: number) => {
    const item = ITEMS.get(row.id)!;
    const number = row.out ? "–" : String(index + 1).padStart(2, "0");
    return (
      <li key={row.id} className="wireRow" data-out={row.out}>
        <span className="wireRowNumber">{number}</span>
        <div>
          {item.crop ? (
            <button type="button" className="wireJump">
              {item.label}
            </button>
          ) : (
            <strong>{item.label}</strong>
          )}
          <span className="wireSource">
            {item.crop ? "이 원본" : "문제은행"}
          </span>
          <small>{row.out ? "뺐습니다" : item.detail}</small>
        </div>
        <div className="wireRowActions">
          {row.out ? (
            <button
              type="button"
              className="wireText"
              aria-label={`${item.label} 다시 담기`}
              onClick={() => restore(row.id)}
            >
              다시 담기
            </button>
          ) : (
            <>
              {plan === "C" && (
                <>
                  <button
                    type="button"
                    className="wireIcon"
                    aria-label={`${index + 1}번 문제 위로`}
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="wireIcon"
                    aria-label={`${index + 1}번 문제 아래로`}
                    disabled={index === picked.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </button>
                </>
              )}
              <button
                type="button"
                className="wireIcon"
                aria-label={`${item.label} 빼기`}
                onClick={() => remove(row.id)}
              >
                ×
              </button>
            </>
          )}
        </div>
      </li>
    );
  };
  // 뺀 줄이 끼어도 차례 번호는 담긴 것만 센다 — 시험지의 차례 그대로.
  const numbered = rows.map((row) =>
    listRow(row, row.out ? -1 : picked.indexOf(row.id)),
  );

  return (
    <div className="frame">
      <nav className="frameNav" aria-label="메뉴 대역">
        <p>자료 제작</p>
        <p>
          시험지 · 내보내기<b>{picked.length}</b>
        </p>
      </nav>
      <div className="frameMain">
        <header
          className="frameTop"
          style={{ justifyContent: "space-between" }}
        >
          <strong data-plan-name>{PLAN_NAME[plan]}</strong>
          <span>
            시험지 <b>{picked.length}</b>
          </span>
        </header>
        <main className="frameContent">
          <div
            className={`${st.studio} ${st.editing} ${st.reviewMode} wireStudio`}
          >
            <StudioStepBar
              step="review"
              cropCount={CROP_COUNT}
              pickedCount={picked.length}
              canCrop
              canReview
              onStep={() => {}}
            >
              <button type="button" className={st.secondaryButton}>
                새로 시작
              </button>
              <button type="button" className={st.primaryButton}>
                편집창 확대
              </button>
            </StudioStepBar>
            <div className="wireTools">
              원본 파일 · 쪽 이동 · 문제 이동 · 전체 작업 (그대로)
            </div>
            <div className="wireBody">
              <div className={rp.comparison} aria-label="원본과 인식 결과 비교">
                <section className={rp.original} aria-label="검수 원본">
                  <header>
                    <strong>원본 · 1쪽</strong>
                  </header>
                  <div className="wireOriginal">원본 지면 (그대로)</div>
                </section>
                <section className={rp.results} aria-label="인식 결과">
                  <header>
                    <strong>디지털화 결과 · 수식·도형 검수</strong>
                    <span>{CROP_COUNT}문항 · 5문항 검수 완료</span>
                  </header>
                  <div className={rp.resultScroll}>
                    {crops.slice(0, 3).map((item, i) => card(item, i === 0))}
                  </div>
                </section>
              </div>
              {open && (plan === "B" || plan === "D") && (
                <section
                  className="wirePop wireNew"
                  aria-label="담은 문항 목록"
                >
                  <div className="wirePopHead">
                    <h3>담은 문항 {picked.length}</h3>
                    <span>
                      이 원본 {here.length} · 다른 곳{" "}
                      {picked.length - here.length}
                    </span>
                  </div>
                  <ol>{numbered}</ol>
                  <div className="wirePopFoot">
                    <button
                      type="button"
                      className={st.secondaryButton}
                      onClick={() => setOpen(false)}
                    >
                      닫기
                    </button>
                    <button type="button" className={st.primaryButton}>
                      시험지 구성 →
                    </button>
                  </div>
                </section>
              )}
              {open && plan === "C" && (
                <section
                  className="wireDrawer wireNew"
                  aria-label="문제 순서 서랍"
                >
                  <div className="wirePopHead">
                    <h3>문제 순서</h3>
                    <span>{picked.length}문항</span>
                    <span style={{ flex: 1 }} />
                    <button type="button" className="wireText">
                      순서 초기화
                    </button>
                    <button
                      type="button"
                      className="wireText"
                      onClick={() => setOpen(false)}
                    >
                      닫기
                    </button>
                  </div>
                  <ol>{numbered}</ol>
                </section>
              )}
            </div>
            <footer className={st.actionBar} aria-label="문제 제작 주요 작업">
              <span>저장됨</span>
              <div className={st.selectionAction}>
                <div className={st.selectionStatus}>
                  <strong>자른 문제 {CROP_COUNT}문항</strong>
                  <span>5문항 검수 완료 · {here.length}문항 담음</span>
                </div>
              </div>
              <div className={st.outputActions}>
                {plan !== "A" && (
                  <button
                    type="button"
                    className={`${st.secondaryButton} wireNew`}
                    aria-expanded={open}
                    onClick={() => setOpen((value) => !value)}
                  >
                    {plan === "C" ? "문제 순서" : "담은 문항"}{" "}
                    <b>{picked.length}</b> {open ? "▾" : "▴"}
                  </button>
                )}
                <button
                  type="button"
                  className={st.secondaryButton}
                  disabled={!pending}
                  onClick={addAll}
                >
                  + {pending ? `${pending}문항 담기` : "모두 담았습니다"}
                </button>
                <button type="button" className={st.primaryButton}>
                  내보내기 →
                </button>
              </div>
            </footer>
          </div>
        </main>
      </div>
      <output aria-label="담은 목록">{JSON.stringify(picked)}</output>
    </div>
  );
}

const params = new URLSearchParams(location.search);
const requested = params.get("plan");
const plan: Plan =
  requested === "A" || requested === "B" || requested === "C" ? requested : "D";
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Wire
      plan={plan}
      openAtStart={params.has("open")}
      at={params.get("at") === "foot" ? "foot" : "head"}
    />
  </StrictMode>,
);

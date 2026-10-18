/**
 * **「유형」 칸이 라벨 `[단]`·`[서]` 로 거르는가** — 원장님 지시 2026-08-26
 * (「유형에 단답형 추가 · [단] 을 거를 수 있게 · [서] 도 서술형 필터에」).
 *
 * ## 여기서만 잴 수 있는 것 — 「눈에 보이는 것」과 「걸러진 것」이 같은가
 *
 * 계약·라우트 시험은 **id 집합**을 맞대지만, 원장님이 보는 것은 카드에 찍힌 대괄호
 * 라벨이다. 그래서 이 파일은 **화면에 남은 카드의 라벨을 세어** 판정한다 —
 * 「서술형으로 걸렀는데 `[단]` 이 붙은 카드가 보인다」가 곧 결함이다.
 *
 * ## 음성 대조를 같이 둔다
 *
 * 「거른 뒤에 `[서]` 만 남는다」는 **목록이 통째로 비어도 초록**이다. 그래서
 *   · 거르기 **전**에는 `[서]` 아닌 카드가 보인다
 *   · 거른 **뒤**에도 카드가 한 장 이상 남는다
 * 를 같이 못 박는다(2026-08-20 「양성만 대면 지어냄이 구조적으로 0」).
 *
 * ⏱ 대기 시간은 `ProblemBank.test.tsx` 와 같은 사정이다 — 여러 세션이 CPU 를 쓰면
 *    첫 렌더가 늦다. 거짓 경보는 가드를 끄므로 넉넉히 준다.
 */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import ProblemsPage from "@/app/(main)/problems/page";

const RENDER_WAIT = { timeout: 45_000 } as const;

/** 카드에 찍히는 형식 라벨 — `provenance.ts` 의 `FORMAT_BADGE` 와 같은 글자다. */
// 2026-08-27 원장님 지시로 배지에서 대괄호를 벗겼다(`[서]` → `서`).
const FORMAT_BADGES = ["객", "단", "서", "?형식"] as const;

async function renderBank() {
  const user = userEvent.setup();
  const view = render(<ProblemsPage />);
  await screen.findByRole("heading", { name: "시험지 만들기" }, RENDER_WAIT);
  await screen.findByText(/를 유한소수로 나타내어라/, undefined, RENDER_WAIT);
  return { user, ...view };
}

/** 지금 화면에 보이는 형식 라벨을 갈래별로 센다. */
function visibleFormatBadges(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const badge of FORMAT_BADGES) {
    counts[badge] = screen.queryAllByText(badge).length;
  }
  return counts;
}

describe("[형식 필터] 문제은행 「유형」 칸", () => {
  it("계산·개념·활용에 세 출제 형식이 더해져 있다", async () => {
    await renderBank();
    const select = screen.getByLabelText<HTMLSelectElement>("유형");
    expect([...select.options].map((option) => option.textContent)).toEqual([
      "전체",
      "계산",
      "개념",
      "활용",
      "객관식",
      "단답형",
      "서술형",
    ]);
  });

  it("서술형을 고르면 화면에 **`[서]` 만** 남는다", async () => {
    const { user } = await renderBank();

    // 음성 대조 ⑴ — 거르기 전에는 `[서]` 아닌 카드가 보인다(안 그러면 아래가 공허하다).
    const before = visibleFormatBadges();
    const otherBefore = FORMAT_BADGES.filter((b) => b !== "서").reduce(
      (sum, b) => sum + before[b]!,
      0,
    );
    expect(otherBefore, "거르기 전 [서] 아닌 카드").toBeGreaterThan(0);

    await user.selectOptions(screen.getByLabelText("유형"), "서술형");

    await waitFor(() => {
      const after = visibleFormatBadges();
      // 음성 대조 ⑵ — 목록이 통째로 비면 「[서] 만 남았다」가 참이 되어 버린다.
      expect(after["서"], "거른 뒤 남은 [서] 카드").toBeGreaterThan(0);
      for (const badge of FORMAT_BADGES) {
        if (badge === "서") continue;
        expect(after[badge], `거른 뒤 보이면 안 되는 ${badge}`).toBe(0);
      }
    }, RENDER_WAIT);
  });

  it("단답형은 **형식 축**으로 나간다 — `problemType` 에 그런 값이 없어 조용히 0건이 되면 안 된다", async () => {
    const { user } = await renderBank();
    await user.selectOptions(screen.getByLabelText("유형"), "단답형");

    // `problemType` 은 계산/개념/활용/서술형뿐이라, 이 값이 그 축으로 나가면 서버가
    // **400** 을 내고 화면은 「목록을 불러오지 못했습니다」를 그린다. 그게 안 나야 한다.
    await waitFor(() => {
      expect(screen.queryByText("목록을 불러오지 못했습니다")).toBeNull();
    }, RENDER_WAIT);
    // 이 픽스처에는 `questionType`·엔진 표지가 없어 `[단]` 이 0건이다 — 그래서 「몇 건
    // 나오나」가 아니라 **「[단] 아닌 것이 안 나오나」**로 잰다(0건도 옳은 답이다).
    await waitFor(() => {
      const after = visibleFormatBadges();
      for (const badge of FORMAT_BADGES) {
        if (badge === "단") continue;
        expect(after[badge], `단답형으로 걸렀는데 보이는 ${badge}`).toBe(0);
      }
    }, RENDER_WAIT);
  });

  it("**등록 직후 목록 판정**도 형식을 본다 (D-60 ⑹)", async () => {
    /**
     * 🔴 화면쪽 술어(`matchesFilters`)·가짜 서버·라우트가 **같은 규칙**이어야 한다.
     *    갈리면 등록·변형·승격 직후 「목록엔 남는데 새로고침하면 사라지는」 카드가 생긴다.
     *    형식 축을 넣고 이 자리를 빠뜨렸더니 변이 시험이 **초록**이었다(2026-08-26) —
     *    즉 그 배선을 통째로 지워도 아무도 안 울고 있었다.
     *
     *    여기서 등록하는 문항은 `questionType` 도 엔진 표지도 없어 라벨이 `[?형식]` 이다.
     *    서술형으로 거르는 중이므로 목록에 **끼워 넣으면 안 된다.**
     */
    const { user } = await renderBank();
    await user.selectOptions(screen.getByLabelText("유형"), "서술형");
    await waitFor(() => {
      expect(visibleFormatBadges()["서"]).toBeGreaterThan(0);
    }, RENDER_WAIT);

    await user.click(screen.getByRole("button", { name: "등록" }));
    const form = await screen.findByRole("form", { name: "등록" }, RENDER_WAIT);
    await user.selectOptions(within(form).getByLabelText("출처"), "manual");
    await user.selectOptions(within(form).getByLabelText("난이도"), "기본");
    await user.selectOptions(within(form).getByLabelText("유형"), "계산");
    await user.type(within(form).getByLabelText("본문"), "형식이 안 맞는 문항");
    await user.type(within(form).getByLabelText("정답"), "1");
    await user.click(within(form).getByRole("button", { name: "등록하기" }));

    await waitFor(() => {
      expect(screen.getByText(/현재 필터에/)).toBeInTheDocument();
    }, RENDER_WAIT);
    expect(screen.queryByText("형식이 안 맞는 문항")).toBeNull();
    // 그리고 그 카드가 안 들어왔으니 `[?형식]` 도 화면에 없어야 한다.
    expect(visibleFormatBadges()["?형식"]).toBe(0);
  });

  it("전체로 되돌리면 다시 다 보인다 — 필터가 눌어붙지 않는다", async () => {
    const { user } = await renderBank();
    const select = screen.getByLabelText("유형");
    await user.selectOptions(select, "서술형");
    await waitFor(() => {
      expect(visibleFormatBadges()["서"]).toBeGreaterThan(0);
    }, RENDER_WAIT);

    await user.selectOptions(select, "");
    await waitFor(() => {
      const after = visibleFormatBadges();
      const others = FORMAT_BADGES.filter((b) => b !== "서").reduce(
        (sum, b) => sum + after[b]!,
        0,
      );
      expect(others).toBeGreaterThan(0);
    }, RENDER_WAIT);
  });
});

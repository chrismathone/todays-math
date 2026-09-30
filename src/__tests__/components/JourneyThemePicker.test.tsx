/**
 * 관리자 «학습 관리» — 진도판 테마(학원 전체 한 벌). 누르면 바로 저장 · 실패하면 앞 선택으로 되돌린다.
 * 키보드: radiogroup 은 탭 정지 하나 · 화살표·Home·End 는 초점만 옮기고(저장은 학생 전체에 바로 가는 쓰기다) Space·Enter 가 저장한다.
 * 저장 중에 단추를 `disabled` 로 만들면 초점이 body 로 떨어진다 — 초점은 누른 판에 남아야 한다.
 */
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import JourneyThemePicker from "@/components/math-srs/JourneyThemePicker";

const ok = (theme: string, updatedAt: string | null = null) =>
  new Response(JSON.stringify({ data: { theme, updatedAt } }), { status: 200 });

let calls: { url: string; init?: RequestInit }[] = [];
beforeEach(() => {
  calls = [];
});
afterEach(() => vi.unstubAllGlobals());

function stub(...replies: (Response | Promise<Response>)[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return replies.shift() ?? ok("classic");
    }),
  );
}

/** 답을 손에 쥔 fetch — 저장이 «진행 중»인 순간을 잰다. */
function deferred() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const puts = () => calls.filter((c) => c.init?.method === "PUT");

describe("JourneyThemePicker", () => {
  it("shows the six boards and marks the saved one", async () => {
    stub(ok("sea", "2026-09-30T02:00:00.000Z"));
    render(<JourneyThemePicker />);
    const sea = await screen.findByRole("radio", { name: /바다 항해/ });
    await waitFor(() => expect(sea).toBeChecked());
    expect(screen.getAllByRole("radio")).toHaveLength(6);
    expect(screen.getByRole("radio", { name: /기본 판/ })).not.toBeChecked();
    expect(calls[0].url).toBe("/api/admin/journey-theme");
  });

  it("names each board with its rider, as two words", async () => {
    stub(ok("classic"));
    render(<JourneyThemePicker />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /기본 판/ })).toBeChecked(),
    );
    expect(screen.getByRole("radio", { name: /하늘섬/ })).toHaveAccessibleName(
      "하늘섬 열기구",
    );
    expect(screen.getByRole("radio", { name: /기본 판/ })).toHaveAccessibleName(
      "기본 판 지금 판",
    );
  });

  it("saves a choice at once and says so", async () => {
    stub(ok("classic"), ok("shapes", "2026-09-30T02:00:00.000Z"));
    render(<JourneyThemePicker />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /기본 판/ })).toBeChecked(),
    );
    await userEvent.click(screen.getByRole("radio", { name: /도형 마을/ }));
    await screen.findByText("저장했습니다. 학생 화면은 새로 열 때 바뀝니다.");
    expect(screen.getByRole("radio", { name: /도형 마을/ })).toBeChecked();
    expect(calls[1]).toMatchObject({
      url: "/api/admin/journey-theme",
      init: { method: "PUT", body: JSON.stringify({ theme: "shapes" }) },
    });
  });

  it("goes back to the saved board when saving fails", async () => {
    stub(
      ok("sky"),
      new Response(
        JSON.stringify({
          error: { code: "FORBIDDEN", message: "관리자만 사용할 수 있습니다." },
        }),
        { status: 403 },
      ),
    );
    render(<JourneyThemePicker />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /하늘섬/ })).toBeChecked(),
    );
    await userEvent.click(screen.getByRole("radio", { name: /숲길 탐험/ }));
    await screen.findByText("관리자만 사용할 수 있습니다.");
    expect(screen.getByRole("radio", { name: /하늘섬/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /숲길 탐험/ })).not.toBeChecked();
  });

  it("keeps focus on the pressed board while it saves and after", async () => {
    const put = deferred();
    stub(ok("classic"), put.promise);
    render(<JourneyThemePicker />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /기본 판/ })).toBeChecked(),
    );
    const sea = screen.getByRole("radio", { name: /바다 항해/ });
    await userEvent.click(sea);
    expect(puts()).toHaveLength(1);
    // 브라우저는 초점 있는 단추가 disabled 가 되면 초점을 body 로 떨어뜨린다(jsdom 은 안 그런다) — 속성으로 잰다.
    expect(sea).not.toBeDisabled();
    expect(sea).toHaveFocus();
    expect(screen.getByRole("radiogroup")).toHaveAttribute("aria-busy", "true");
    put.resolve(ok("sea", "2026-09-30T02:00:00.000Z"));
    await screen.findByText("저장했습니다. 학생 화면은 새로 열 때 바뀝니다.");
    expect(sea).toHaveFocus();
    expect(sea).toBeChecked();
    expect(screen.getByRole("radiogroup")).not.toHaveAttribute("aria-busy");
  });

  it("ignores a second press while a save is in flight", async () => {
    const put = deferred();
    stub(ok("classic"), put.promise);
    render(<JourneyThemePicker />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /기본 판/ })).toBeChecked(),
    );
    await userEvent.click(screen.getByRole("radio", { name: /하늘섬/ }));
    await userEvent.click(screen.getByRole("radio", { name: /우주 궤도/ }));
    expect(puts()).toHaveLength(1);
    put.resolve(ok("sky", "2026-09-30T02:00:00.000Z"));
    await screen.findByText("저장했습니다. 학생 화면은 새로 열 때 바뀝니다.");
    expect(screen.getByRole("radio", { name: /하늘섬/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /우주 궤도/ })).not.toBeChecked();
  });

  it("is one tab stop: arrows move focus without saving, Space saves", async () => {
    stub(ok("sea"), ok("space", "2026-09-30T02:00:00.000Z"));
    render(<JourneyThemePicker />);
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /바다 항해/ })).toBeChecked(),
    );
    const user = userEvent.setup();
    await user.tab();
    expect(screen.getByRole("radio", { name: /바다 항해/ })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /우주 궤도/ })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: /숲길 탐험/ })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByRole("radio", { name: /우주 궤도/ })).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: /기본 판/ })).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(screen.getByRole("radio", { name: /도형 마을/ })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("radio", { name: /도형 마을/ })).toHaveFocus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /기본 판/ })).toHaveFocus();
    expect(puts()).toHaveLength(0);
    expect(screen.getByRole("radio", { name: /바다 항해/ })).toBeChecked();

    // 탭은 묶음을 떠난다 — 초점이 있는 판만 탭 순서에 있다.
    await user.tab();
    expect(screen.getByRole("radiogroup")).not.toContainElement(
      document.activeElement as HTMLElement,
    );
    await user.tab({ shift: true });
    expect(screen.getByRole("radio", { name: /바다 항해/ })).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    await user.keyboard(" ");
    await screen.findByText("저장했습니다. 학생 화면은 새로 열 때 바뀝니다.");
    expect(puts()).toHaveLength(1);
    expect(puts()[0].init?.body).toBe(JSON.stringify({ theme: "space" }));
    expect(screen.getByRole("radio", { name: /우주 궤도/ })).toBeChecked();
    expect(screen.getByRole("radio", { name: /우주 궤도/ })).toHaveFocus();
  });

  it("leaves the boards usable when the first read fails, and saves on the next press", async () => {
    stub(
      new Response("<html>bad gateway</html>", { status: 502 }),
      ok("sky", "2026-09-30T02:00:00.000Z"),
    );
    render(<JourneyThemePicker />);
    await screen.findByText("진도판 테마를 불러오지 못했습니다.");
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeEnabled();
      expect(radio).not.toBeChecked();
    }
    await userEvent.click(screen.getByRole("radio", { name: /하늘섬/ }));
    await screen.findByText("저장했습니다. 학생 화면은 새로 열 때 바뀝니다.");
    expect(screen.getByRole("radio", { name: /하늘섬/ })).toBeChecked();
    expect(puts()[0].init?.body).toBe(JSON.stringify({ theme: "sky" }));
  });

  it("keeps its status and alert regions in the page before there is anything to say", async () => {
    stub(ok("classic"));
    render(<JourneyThemePicker />);
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: /기본 판/ })).toBeChecked(),
    );
    expect(
      screen.getAllByRole("radio").every((r) => !r.hasAttribute("disabled")),
    ).toBe(true);
  });
});

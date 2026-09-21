/**
 * `<보기>` 상자 렌더 (렌더 수리 B) — mathgen MarkdownRenderer 1011~1028행 이식.
 *
 * 정본은 blockquote 의 첫 줄에 `<보기>`(또는 `<보기:cols=N>`)가 있을 때만 그리드로
 * 바꾼다. 마커가 없는 인용문(다단계 계산식 등)은 **한 열 그대로** 둔다 —
 * 이 저장소도 같은 규칙을 지켜야 기존 인용문의 렌더가 바뀌지 않는다.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { MarkdownRenderer } from "@/components/math/MarkdownRenderer";
import { ProblemContent } from "@/components/math/ProblemContent";

function html(node: React.ReactElement): string {
  return renderToStaticMarkup(node);
}

describe("[상자 렌더] blockquote → 보기 카드", () => {
  it("`<보기>` 헤더가 있으면 헤더와 항목을 갈라 그린다", () => {
    const out = html(
      <MarkdownRenderer content={"> <보기1>\n>\n> ㄱ. 참\n>\n> ㄴ. 거짓"} />,
    );
    expect(out).toContain("data-box-card");
    expect(out).toContain("data-box-header");
    // 항목은 각각 별도 셀로 나온다 — 한 문단에 뒤엉키면 안 된다(원장님 보고).
    expect(out.match(/data-box-item/g)).toHaveLength(2);
    // cols 지정자는 화면에 나오지 않는다.
    expect(out).not.toContain("보기1");
    // D-108 — 지면 라벨은 **홑화살괄호**다. ASCII `<보기>` 는 태그처럼 읽힌다.
    expect(out).toContain("〈보기〉");
    // 되돌아가면 빨개진다 — 이 줄이 없으면 D-108 이 조용히 죽는다.
    expect(out).not.toContain("&lt;보기&gt;");
  });

  /**
   * D-108 — 라벨은 상자 위 **가운데**다(한국 시험지 관행).
   *
   * ⚠️ 이 검사가 없으면 `text-center` 를 지워도 아무것도 안 빨개진다. 위 검사는
   * **글자**만 보므로 위치를 구조적으로 못 본다 — 「지표가 실패를 셀 수 있는
   * 형태인가」가 여기서도 그대로다.
   */
  it("라벨은 가운데 정렬이다 (D-108)", () => {
    const out = html(
      <MarkdownRenderer content={"> <보기1>\n>\n> ㄱ. 참\n>\n> ㄴ. 거짓"} />,
    );
    const header = /<div data-box-header="true" class="([^"]*)"/.exec(out);
    expect(header).not.toBeNull();
    expect(header![1]).toContain("text-center");
  });

  it("라벨 뒤 숫자가 열 수다 — `<보기2>` 는 두 열, `<보기1>` 은 한 열", () => {
    const two = html(
      <MarkdownRenderer content={"> <보기2>\n>\n> ㄱ. 참\n>\n> ㄴ. 거짓"} />,
    );
    expect(two).toContain("md:grid-cols-2");
    const one = html(
      <MarkdownRenderer content={"> <보기1>\n>\n> ㄱ. 참\n>\n> ㄴ. 거짓"} />,
    );
    expect(one).not.toContain("md:grid-cols-2");
  });

  it("마커가 없는 인용문은 예전 그대로 그린다 (렌더 회귀 금지)", () => {
    const content = "발문이다.\n\n> $f(1)=2$\n> $f(2)=3$\n";
    const out = html(<MarkdownRenderer content={content} />);
    expect(out).not.toContain("data-box-card");
    expect(out).toContain("my-4 border border-[#8A8A88] bg-white p-4");
  });

  it("`<조건>` 은 라벨을 그대로 단다", () => {
    const out = html(
      <MarkdownRenderer content={"> <조건1>\n>\n> 첫째\n>\n> 둘째"} />,
    );
    expect(out).toContain("data-box-card");
    // 낱말은 **원본대로** 두고 괄호만 바꾼다(D-108) — 원본이 `<조건>` 이면 `〈조건〉`.
    expect(out).toContain("〈조건〉");
    expect(out).not.toContain("&lt;조건&gt;");
  });

  /**
   * 🔴 **`<상자>` 는 라벨이 아니라 「이건 상자다」는 표시다.**
   *
   * 앞 회차는 그 낱말을 머리로 그려서, 기출 문3 이 지면에 **원본에 없던 〈상자〉**를
   * 달고 나갔다. 원장님이 화면에서 찾으셨고 *「원문에 〈보기〉〈조건〉 없으면 붙이지
   * 말 것」* 으로 확정하셨다(D-119 ⑹ 을 뒤집는다).
   *
   * 적재기는 앞으로 `<나열>` 을 넣지만, **이미 실린 `<상자>` 도** 머리 없이 그린다 —
   * 안 그러면 그 행들을 다시 적재하기 전까지 계속 이름이 찍힌다.
   */
  it("`<상자>`·`<나열>` 은 **머리 없는** 카드다 — 없던 이름을 지어내지 않는다", () => {
    for (const label of ["상자", "나열"]) {
      const out = html(
        <MarkdownRenderer content={`> <${label}1>\n>\n> 첫째\n>\n> 둘째`} />,
      );
      expect(out, `${label}: 테두리 카드는 그려야 한다`).toContain(
        "data-box-card",
      );
      expect(out, `${label}: 머리 라벨이 찍히면 안 된다`).not.toContain(
        `〈${label}〉`,
      );
      // 마커 줄을 «안 그리는» 것과 «날문자로 남기는» 것은 다르다.
      expect(out).not.toContain(`&lt;${label}`);
      expect(out).not.toContain(`<${label}`);
      // 항목은 그대로 다 나온다.
      expect(out.match(/data-box-item/g)).toHaveLength(2);
    }
  });

  /**
   * 🔴 **적재기가 본문에 넣는 마커는 `boxBlock` 이 «입력»으로 아는 것이어야 한다.**
   *
   * 2026-09-06 에 「원본에 없던 〈상자〉를 지우자」고 적재기가 `<나열>` 을 넣게 고쳤다.
   * 그런데 `나열` 은 입력 마커가 **아니라** `renderBoxSegment` 가 내부에서 만드는
   * 표기다(`boxBlock` 이 아는 입력은 `보기|조건|상자` 셋뿐이다). 그래서 상자가 아예
   * 안 서고 **`<나열>` 이 날 글자로 지면에 찍혔다** — 지면을 그려 봐서야 알았다.
   *
   * 그러니 본문에는 `<상자>` 를 넣고, **머리를 안 그리는 일은 렌더러가** 한다.
   * 아래 둘은 그 갈림을 통째로 잠근다 — 하나는 「이렇게 하면 된다」, 하나는
   * 「이렇게 하면 안 된다」다.
   */
  it("본문 경로: `<상자>` 는 **머리 없는 테두리**가 되고 날 글자가 안 남는다", () => {
    const raw =
      "다음 중 옳은 것을 모두 고른 것은?\n<상자> ㉠ 첫째이다.\n㉡ 둘째이다.\n㉢ 셋째이다.\n1. ㉠\n2. ㉡";
    const out = html(<ProblemContent content={raw} />);
    expect(out, "테두리 상자가 서야 한다").toContain("data-box-card");
    expect(out.match(/data-box-item/g)).toHaveLength(3);
    expect(out, "원본에 없던 이름이 찍히면 안 된다").not.toContain("〈상자〉");
    expect(out).not.toContain("&lt;상자");
    expect(out).not.toContain("&lt;나열");
  });

  it("🔴 `<나열>` 을 본문에 넣으면 상자가 **안 선다** — 적재기가 쓰면 안 되는 마커", () => {
    const raw =
      "다음 중 옳은 것을 모두 고른 것은?\n<나열> ㉠ 첫째이다.\n㉡ 둘째이다.\n㉢ 셋째이다.\n1. ㉠\n2. ㉡";
    const out = html(<ProblemContent content={raw} />);
    // 「상자가 안 선다」가 이 검사의 요점이다. 언젠가 `boxBlock` 이 `나열` 을 입력으로
    // 받게 되면 이 검사가 빨개지고, 그때 적재기 주석을 같이 고치면 된다.
    expect(out, "지금은 `나열` 이 입력 마커가 아니다").not.toContain(
      "data-box-card",
    );
  });

  it("문제 본문 경로 전체에서 보기 상자가 나온다", () => {
    // ProblemContent → parseProblemContent → MarkdownRenderer 까지 이어지는지 확인.
    const raw =
      "<보기>에서 옳은 것은?\n< 보 기 >\nㄱ. 무한소수는 무리수이다.\nㄴ. 순환소수는 유리수이다.\n1. ㄱ\n2. ㄴ";
    const out = html(<ProblemContent content={raw} />);
    expect(out).toContain("data-box-card");
    expect(out.match(/data-box-item/g)).toHaveLength(2);
  });
});

/**
 * 트랙 46 (2026-09-21) — 표기 하나: 편집기·인식이 쓰는 정본 `<보기:cols=N>` 을 지면이 읽는다.
 * 전에는 지면이 `<보기N>` 만 알아 편집기의 `<보기:cols=3>` 이 **`cols=3` 수식으로 찍혔다**(트랙 42 §7).
 */
describe("[상자 렌더] 정본 `<보기:cols=N>` — 지면이 열 수를 읽는다", () => {
  it("`<보기:cols=3>` 은 세 열 격자이고 `cols=3` 이 지면에 안 찍힌다", () => {
    const out = html(
      <MarkdownRenderer
        content={"> <보기:cols=3>\n>\n> (가) $a$\n>\n> (나) $b$\n>\n> (다) $c$"}
      />,
    );
    expect(out).toContain("print:grid-cols-3");
    expect(out.match(/data-box-item/g)).toHaveLength(3);
    expect(out).toContain("〈보기〉");
    // 클래스 이름(`grid-cols-3`)이 아니라 지면에 찍히는 글자로 본다.
    expect(out).not.toContain("cols=");
    expect(out).not.toMatch(/<annotation[^>]*>[^<]*cols/);
  });

  it("편집기가 쓰는 압축 원문(한 줄 한 칸, 빈 줄 없음)도 칸마다 선다", () => {
    const out = html(
      <MarkdownRenderer content={"> <보기:cols=2>\n> ㄱ. 참\n> ㄴ. 거짓"} />,
    );
    expect(out).toContain("print:grid-cols-2");
    expect(out.match(/data-box-item/g)).toHaveLength(2);
  });

  it("인식이 한 문단에 줄로 적은 칸(blocksToMarkdown)도 칸마다 선다", () => {
    const out = html(
      <MarkdownRenderer
        content={"> <보기:cols=2>\n>\n> ㄱ. 참\n> ㄴ. 거짓\n> ㄷ. 참"}
      />,
    );
    expect(out.match(/data-box-item/g)).toHaveLength(3);
  });

  it("옛 표기 `<보기2>` 도 그대로 두 열", () => {
    const out = html(
      <MarkdownRenderer content={"> <보기2>\n>\n> ㄱ. 참\n>\n> ㄴ. 거짓"} />,
    );
    expect(out).toContain("print:grid-cols-2");
  });

  it("여러 열 격자에는 HWPX 격자 표시가 붙는다 — 1열에는 없다", () => {
    const grid = html(
      <MarkdownRenderer content={"> <보기:cols=2>\n> ㄱ. 참\n> ㄴ. 거짓"} />,
    );
    expect(grid).toContain("data-hwpx-grid");
    const single = html(
      <MarkdownRenderer content={"> <보기>\n>\n> ㄱ. 참\n>\n> ㄴ. 거짓"} />,
    );
    expect(single).not.toContain("data-hwpx-grid");
  });

  it("그림 칸 — 문제 22 를 두 열로 적으면 그림이 칸마다 선다", () => {
    const pixel = "data:image/png;base64,iVBORw0KGgo=";
    const out = html(
      <MarkdownRenderer
        content={
          "> <보기:cols=2>\n>\n> ㄱ. [그림1]\n> ㄴ. [그림2]\n> ㄷ. [그림3]\n> ㄹ. [그림4]"
        }
        nativeFigures={[1, 2, 3, 4].map(() => ({ src: pixel }))}
      />,
    );
    const items = out.split("data-box-item").slice(1);
    expect(items).toHaveLength(4);
    for (const item of items) expect(item.split("</div>")[0]).toContain("<img");
  });
});

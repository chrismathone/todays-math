import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import StudioFigureEditor from "../../src/components/unified/figure-editor";
import type { StudioFigureSaveResult } from "../../src/components/unified/figure-editor";
import {
  cleanFigureForSave,
  fitFigureViewport,
  prepareFigureSvg,
} from "../../src/components/unified/figure-editor/figureSvgEditing";
import { typesetFigureSvg } from "../../src/components/unified/figure-editor/figureTypeset";
import { svgDataUrl } from "../../src/components/unified/figure-editor/figureDocument";
import { PrivateCloudClient } from "../../src/components/unified/privateCloudClient";
import { SourceEditorDisplay } from "../../src/components/math/editor/SourceEditorDisplay";
import "../../src/app/globals.css";
import "katex/dist/katex.min.css";
import plain from "../../src/__tests__/fixtures/figure-roundtrip/parallelogram.svg?raw";
import region from "../../src/__tests__/fixtures/figure-roundtrip/parallelogram-region.svg?raw";
import noFe from "../../src/__tests__/fixtures/figure-roundtrip/parallelogram-no-fe.svg?raw";

/**
 * 도형 한 장이 작업실에서 지나는 길을 한 화면에 — 엔진 SVG(손으로 쓴 스펙, `parallelogram.spec.json`)를
 * 작업실 도형 생성(`useStudioFigureAi`)과 **같은 함수**로 `svg`·`image` 로 만들고, `?roundtrip` 이면
 * 계정 저장(`externalize`) → 다시 열기(`materialize`)를 메모리 전송으로 한 바퀴 돌린다.
 * 네트워크·계정·AI 호출은 없다.
 */
type Figure = { svg: string; image: string };
type Asset = { bytes: Uint8Array; size: number; type: string };

function memoryTransport(assets: Map<string, Asset>): typeof fetch {
  return async (input, init = {}) => {
    const url = String(input);
    if (url.startsWith("blob:") || url.startsWith("data:")) return fetch(url);
    const hash = url.split("/").at(-1)!;
    if (init.method === "PUT") {
      const range = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(
        new Headers(init.headers).get("Content-Range")!,
      )!;
      const chunk = new Uint8Array(await (init.body as Blob).arrayBuffer());
      const previous = assets.get(hash)?.bytes ?? new Uint8Array();
      const bytes = new Uint8Array(previous.length + chunk.length);
      bytes.set(previous);
      bytes.set(chunk, previous.length);
      assets.set(hash, {
        bytes,
        size: Number(range[3]),
        type: new Headers(init.headers).get("Content-Type")!,
      });
      return Response.json({
        data: {
          offset: bytes.length,
          complete: bytes.length === Number(range[3]),
        },
      });
    }
    const stored = assets.get(hash);
    return stored
      ? new Response(new Uint8Array(stored.bytes), {
          headers: { "Content-Type": stored.type },
        })
      : new Response(null, { status: 404 });
  };
}

async function build(params: URLSearchParams) {
  const fixture = params.get("fixture");
  const engine =
    fixture === "region" ? region : fixture === "no-fe" ? noFe : plain;
  // useStudioFigureAi.execute 와 같은 차례
  const svg = cleanFigureForSave(prepareFigureSvg(engine));
  const rendered = fitFigureViewport(await typesetFigureSvg(svg));
  const figure: Figure = {
    svg,
    image: svgDataUrl(cleanFigureForSave(rendered)),
  };
  const assets = new Map<string, Asset>();
  const saving = new PrivateCloudClient("owner-a", memoryTransport(assets));
  if (params.has("broken")) {
    // 이 고침 전의 저장이 남긴 모양 — 첫 `)`·`'` 앞까지만 자산, 나머지는 꼬리로 문자열에 남았다
    const legacy = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
      cleanFigureForSave(rendered),
    )}`;
    const comma = legacy.indexOf(",");
    const cut = legacy.slice(comma + 1).search(/[\s"'<>)]/) + comma + 1;
    const path = await saving.upload(
      new Blob([decodeURIComponent(legacy.slice(comma + 1, cut))], {
        type: "image/svg+xml",
      }),
    );
    const stored = { svg, image: `${path}${legacy.slice(cut)}` };
    const opening = new PrivateCloudClient("owner-a", memoryTransport(assets));
    const opened = await opening.materialize(stored);
    const resaved = await opening.externalize(opened);
    return { figure: opened, stored, resaved };
  }
  if (!params.has("roundtrip")) return { figure, stored: figure };
  const stored = await saving.externalize(
    params.has("legacy")
      ? {
          ...figure,
          // 이 고침 전의 저장본 — 괄호를 날것으로 둔 옛 주소
          image: figure.image
            .replace(/%28/g, "(")
            .replace(/%29/g, ")")
            .replace(/%27/g, "'"),
        }
      : figure,
  );
  // 다시 열기 — 새 탭처럼 새 클라이언트
  const opening = new PrivateCloudClient("owner-a", memoryTransport(assets));
  return { figure: await opening.materialize(stored), stored };
}

function Harness() {
  const params = new URLSearchParams(location.search);
  const [state, setState] = useState<{
    figure: Figure;
    stored: Figure;
    resaved?: Figure;
  }>();
  const [error, setError] = useState("");
  useEffect(() => {
    build(params).then(
      (value) => {
        Object.assign(window, { __figure: value });
        setState(value);
      },
      (cause: Error) => setError(cause.message),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (error) return <p role="alert">{error}</p>;
  if (!state) return <p>준비 중</p>;
  const { figure } = state;
  if (params.get("view") === "editor")
    return (
      <StudioFigureEditor
        image={figure.image}
        initialSvg={figure.svg}
        index={0}
        onSave={(result: StudioFigureSaveResult) =>
          Object.assign(window, { __saved: result })
        }
        onClose={() => {}}
      />
    );
  return (
    <main style={{ display: "flex", gap: 24, padding: 16 }}>
      <section id="review-card" style={{ width: 420 }}>
        <SourceEditorDisplay
          value="평행사변형 ABCD 에서 □AFCE 의 넓이를 구하시오. [그림1]"
          figures={[
            { svg: figure.svg, imageData: figure.image, label: "도형 1-1" },
          ]}
        />
      </section>
      <section style={{ width: 420 }}>
        {/* 저장된 그림(figure.image)이 실제로 뜨는지 naturalWidth 로 잰다 — 최적화 로더를 거치면 못 잰다 */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          id="figure-image"
          src={figure.image}
          alt="저장된 그림"
          style={{ width: 400 }}
        />
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Harness />
  </StrictMode>,
);

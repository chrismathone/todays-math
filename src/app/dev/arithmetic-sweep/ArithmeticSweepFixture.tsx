"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { WorkspaceArithmeticV2CatalogResponse } from "@/contracts/arithmeticV2.contract";

const ArithmeticWorkbench = dynamic(
  () => import("@/components/arithmetic/ArithmeticWorkbench"),
  { ssr: false },
);

/** Anonymous, in-memory preview; no account, catalog API or persistence. */
export default function ArithmeticSweepFixture({
  catalog,
}: {
  catalog: WorkspaceArithmeticV2CatalogResponse["data"];
}) {
  const [opened, setOpened] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = new URL(
        input instanceof Request ? input.url : String(input),
        window.location.origin,
      );
      if (!url.pathname.startsWith("/api/")) return originalFetch(input, init);
      // All API-shaped calls stay in memory, including unexpected ones.
      if (url.pathname === "/api/arithmetic/v2/catalog")
        return Response.json({ data: catalog });
      if (url.pathname === "/api/arithmetic/catalog")
        return Response.json({
          data: {
            engineVersion: "arithmetic-engine-v1",
            catalogVersion: "arithmetic-catalog-v1",
            writerEnabled: false,
          },
        });
      if (url.pathname === "/api/arithmetic/v2/generate") {
        const { buildArithmeticV2Sheet } =
          await import("@/lib/arithmetic-v2/sheet");
        return Response.json({
          data: buildArithmeticV2Sheet(JSON.parse(String(init?.body))),
        });
      }
      return Response.json(
        { error: { message: "fixture only" } },
        { status: 503 },
      );
    };
    const readyTimer = window.setTimeout(() => setReady(true), 0);
    return () => {
      window.clearTimeout(readyTimer);
      window.fetch = originalFetch;
    };
  }, [catalog]);
  return (
    <main
      style={{
        width: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        maxWidth: 1400,
        margin: "24px auto",
        padding: 20,
      }}
    >
      {!opened && (
        <button
          type="button"
          disabled={!ready}
          onClick={() => {
            performance.mark("arithmetic-sweep-open");
            setOpened(true);
          }}
        >
          연산대장 열기
        </button>
      )}
      {opened && <ArithmeticWorkbench canOutput />}
    </main>
  );
}

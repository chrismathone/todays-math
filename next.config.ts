import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const ontologyTraceAssets = [
  "./ontology/model/tm-owlrl-1.ttl",
  "./ontology/model/source-kinds.json",
  "./ontology/model/releases/catalog.json",
  "./ontology/model/releases/52597f5f6437aff2418d3189399e1aac261149bea17994a352d62fbfebaee554/**/*",
  "./ontology/shapes/**/*",
  "./ontology/rules/**/*",
  "./ontology/source-manifests/public-v1/52597f5f6437aff2418d3189399e1aac261149bea17994a352d62fbfebaee554/**/*",
  "./scripts/ontology/compiler/requirements.lock",
  "./scripts/ontology/compiler/compiler.py",
  "./scripts/ontology/compiler/packaged.py",
];
// These ontology-only endpoints consume metadata/definitions, not rendered figure
// assets or authoring/QA documents. Keep all code, native sources and dependency
// engines traceable; never apply these exclusions to existing product routes.
const ontologyTraceExcludes = [
  "./docs/**/*",
  "./scratch/**/*",
  "./scripts/qa/**/*",
  "./src/__tests__/**/*",
  "./public/figures/**/*",
  "./public/figures-svg/**/*",
  // The generated client is PostgreSQL with engineType=library. Preserve its
  // native engines and every PostgreSQL payload; these other-provider WASM
  // payloads cannot service this datasource and add ~44 MB to each trace.
  ...["cockroachdb", "mysql", "sqlserver", "sqlite"].flatMap((provider) =>
    ["query_engine", "query_compiler"].flatMap((kind) =>
      ["js", "mjs"].map(
        (extension) =>
          `./node_modules/@prisma/client/runtime/${kind}_bg.${provider}.wasm-base64.${extension}`,
      ),
    ),
  ),
];
const nextConfig: NextConfig = {
  // Type errors must fail every production build, including Vercel builds.
  // The build checks the shipped code only (tsconfig.build.json leaves out
  // src/__tests__ and scripts): the full project needed 6.5 GB and the Vercel
  // builds stalled or died in «Running TypeScript» (2026-10-19). The pre-push
  // hook still type-checks everything with tsconfig.json.
  typescript: {
    ignoreBuildErrors: false,
    tsconfigPath: "tsconfig.build.json",
  },
  // Keep existing image URLs and same-origin PDF/canvas requests. Local public
  // files take precedence until a verified deployment excludes those files.
  rewrites() {
    return {
      beforeFiles: [],
      afterFiles: [
        {
          source: "/figures/:path*",
          destination: "/api/shared-figures/figures/:path*",
        },
        {
          source: "/figures-svg/:path*",
          destination: "/api/shared-figures/figures-svg/:path*",
        },
      ],
      fallback: [],
    };
  },
  /**
   * 성적표 PDF 의 자체 글꼴(OFL) — PDF 엔진은 빈 문서(about:blank)에 HTML 을 붓고 글꼴을 읽어
   * 다른 출처 요청이 된다. 허용 헤더가 없으면 Chromium 이 글꼴을 막는다(2026-10-18 실측).
   * 쿠키 없는 공개 파일이라 `*` 로 연다. 출입 규칙은 `src/proxy.ts` 가 같은 두 이름으로 연다.
   */
  headers() {
    return Promise.resolve(
      [
        "/fonts/NotoSerifKR-subset.woff2",
        "/fonts/PretendardVariable.woff2",
      ].map((source) => ({
        source,
        headers: [{ key: "Access-Control-Allow-Origin", value: "*" }],
      })),
    );
  },
  // Keep the development preview's mobile navigation clear of the Next.js badge.
  devIndicators: false,
  // 개발 서버(next dev)에서 LAN IP로 접속할 때 클라이언트 번들·HMR·폰트 등
  // /_next 리소스 요청이 cross-origin으로 차단돼 하이드레이션이 되지 않는 문제를 푼다.
  // (차단 시 로그인 폼이 JS 없이 네이티브 GET으로 제출됨.) dev 전용 설정이라 프로덕션엔 영향 없음.
  allowedDevOrigins: [
    "127.0.0.1",
    "localhost",
    "192.168.101.32",
    "192.168.101.12",
  ],

  /**
   * **브라우저 콘솔을 터미널로 넘기지 않는다** (원장님 2026-09-14 「이 반복 콘솔
   * 안뜨게 못하나? dev라도」).
   *
   * Next 16 의 기본값은 `"warn"` 이라 **경고와 오류가 이미 터미널로 넘어온다**
   * (설치본 타입 `browserDebugInfoInTerminal: "warn"`). 개발 중 HMR·웹소켓 재연결
   * 경고가 되풀이되면 그 줄들이 터미널을 덮어 **정작 봐야 할 서버 로그를 가린다.**
   *
   * ⚠️ 이것은 **터미널로 넘어오는 것만** 끈다 — 브라우저 개발자 도구의 콘솔은
   *    그대로다(그건 Next 의 dev 오버레이와 브라우저가 찍는 것이라 설정 밖이다).
   * ⚠️ 키 이름을 옮겨 적지 말 것: `experimental.browserDebugInfoInTerminal` 은
   *    같은 판에서 **@deprecated** 이고, 없는 키를 적으면 Next 는 **조용히 무시한다**
   *    (실패가 침묵하는 계측기가 된다).
   */
  logging: { browserToTerminal: false },

  /**
   * **번들에 넣지 않고 런타임에 `require` 하는 패키지.**
   *
   * `mathjax-full` 은 자기 판 번호를 이렇게 읽는다
   * (`js/components/version.js`, 실제 코드다):
   *
   * ```js
   * var load = eval('require');
   * var dirname = eval('__dirname');
   * return load(path.resolve(dirname, '..', '..', 'package.json')).version;
   * ```
   *
   * 번들되면 `__dirname` 이 **청크 자리**(`.next/server/chunks/ssr/`)가 되므로
   * `../../package.json` 이 `.next/server/package.json` 을 가리킨다 — 없는 파일이다.
   * 그러면 이 모듈을 물고 있는 **페이지가 통째로 못 열리고**, `next build` 가
   * 「Failed to collect page data」로 죽는다(2026-08-28, `/dev/cube-scrape`).
   *
   * ⚠️ **이 결함은 tsc·vitest·`next dev` 어디에도 안 나타난다.** 셋 다 이 파일을
   *    Turbopack 프로덕션 청크로 묶지 않기 때문이다. **`npm run build` 만 본다.**
   *    MathJax 조판이 들어온 2026-08-28 04:30 부터 이랬는데, 그때 이미 배포가
   *    다른 이유(타입 오류)로 빨개서 아무도 여기까지 못 왔다.
   */
  serverExternalPackages: [
    // Decoder exports a Node worker adapter with dynamic imports; keep it native.
    "mpg123-decoder",
    "mathjax-full",
    "puppeteer-core",
    "@sparticuz/chromium-min",
  ],
  // Assets read by Node/Python at runtime must travel with production route bundles.
  outputFileTracingExcludes: {
    "/api/math-ontology/**": ontologyTraceExcludes,
    "/api/students/*/math-ontology/**": ontologyTraceExcludes,
  },
  outputFileTracingIncludes: {
    "/api/concept-blank/scan/**": [
      "./src/components/concept-blank/paper/paper.module.css",
      "./src/components/concept-blank/issuedPaper.module.css",
      "./src/components/print/TestPrint.module.css",
      "./src/components/print/WritingArea.module.css",
      "./public/fonts/NotoSerifKR-subset.woff2",
      "./public/fonts/PretendardVariable.woff2",
      "./public/fonts/katex/**/*",
      "./node_modules/tailwindcss/preflight.css",
      "./node_modules/katex/dist/katex.min.css",
      "./node_modules/katex/dist/fonts/**/*",
    ],
    "/api/math-ontology/**": ontologyTraceAssets,
    "/api/students/*/math-ontology/**": ontologyTraceAssets,
    "/api/exam-reports/**": [
      "./node_modules/katex/dist/katex.min.css",
      "./node_modules/katex/dist/fonts/**/*",
    ],
    "/api/textbook/**": [
      "./src/config/shared-figures.manifest.json",
      "./public/fonts/PretendardVariable.woff2",
      "./public/textbook/editorial/**/*",
      "./node_modules/katex/dist/katex.min.css",
      "./node_modules/katex/dist/fonts/**/*",
      "./node_modules/pdfjs-dist/build/pdf.mjs",
      "./node_modules/pdfjs-dist/build/pdf.worker.mjs",
      "./node_modules/jsqr/dist/jsQR.js",
    ],
    "/api/shared-figures/**": ["./src/config/shared-figures.manifest.json"],
    "/api/studio/pdf-worker": [
      "./node_modules/pdfjs-dist/build/pdf.worker.min.mjs",
    ],
    // package.json 은 라우트가 패키지 뿌리를 찾는 열쇠다 — 빠지면 자산이 다 실려도 세 갈래가
    // 전부 500 이다(2026-09-19 운영 «Cannot find module 'pdfjs-dist/package.json'»).
    // 시험: src/__tests__/api/studioPdfAssetsLambda.test.ts
    "/api/studio/pdf-assets/**": [
      "./node_modules/pdfjs-dist/package.json",
      "./node_modules/pdfjs-dist/cmaps/**/*",
      "./node_modules/pdfjs-dist/standard_fonts/**/*",
      "./node_modules/pdfjs-dist/wasm/**/*",
    ],
    "/api/studio/ai": [
      "./scripts/figure/*.py",
      "./vendor/figure-engine/**/*.py",
    ],
    "/api/exports/hwpx": [
      "./scripts/hwpx/*.py",
      "./vendor/hwpx/**/*.py",
      "./vendor/hwpx/template/**/*",
    ],
  },

  experimental: {
    // 🔴 소스맵을 만들지 않는다 (2026-11-28 — Vercel 빌드 기계 2코어 · 8GB 에서 운영 빌드가 4회 연속 OOM).
    //    은행 · 연산 그림 자료처럼 «코드로 묶인 큰 데이터»마다 지도를 그려 서버 .map 만 326MB 였다.
    //    로컬 깨끗한 빌드 최대 RSS 7.8 ~ 8.2GB → 5.9GB · 컴파일 33s → 12.6s.
    //    잃는 것: 운영 서버 오류 스택이 압축된 코드 기준이다(`src/lib/errorLog` 는 소스맵을 안 쓴다).
    //    다시 켜기 전에 데이터를 코드 밖으로 빼는 근본 해결(빌드 메모리 계획 P1)을 먼저 한다.
    turbopackSourceMaps: false,
    // 배럴(barrel) 재수출 패키지를 실제 참조하는 하위 모듈로 바꿔 준다.
    //
    // ⚠️ **실측하니 이 저장소에서는 효과가 0 이다** (2026-08-17, Next 16 + Turbopack).
    //    빈 배열 / 아래 목록 / next-auth·katex·@prisma/client 까지 넣은 목록,
    //    셋 다 라우트별 first-load JS 와 static chunks 총량이 **바이트 단위로 동일**했다
    //    (전체 1482.6KB 불변). Turbopack 이 이미 같은 일을 하는 것으로 보인다.
    //
    //    남겨 두는 이유는 「지금 뭔가를 줄이고 있어서」가 아니라, 나중에 배럴 import 가
    //    다시 초기 번들에 들어왔을 때의 방어선이기 때문이다. **번들이 줄어든 근거로
    //    이 설정을 인용하지 말 것** — 실제로 줄인 것은 수리 C-1(zod 지연)과
    //    C-2(KaTeX 지연)다. 목록을 고쳤으면 `npm run analyze` 로 반드시 재실측할 것.
    optimizePackageImports: [
      "zod",
      "react-markdown",
      "rehype-katex",
      "remark-math",
    ],
  },
};

/**
 * 번들 회귀 가시성 (성능 수리 C-4).
 *
 * ⚠️ `@next/bundle-analyzer` 는 **Turbopack 빌드에서 아무것도 만들지 않는다.**
 *    패키지 소스가 직접 그렇게 말한다 — `process.env.TURBOPACK` 이면 경고만 찍고
 *    설정을 그대로 돌려준다. 이 저장소의 `npm run build` 는 Turbopack 이므로
 *    이걸 그냥 붙여 두면 **실패가 침묵하는 계측기**가 된다(리포트가 안 나오는데
 *    빌드는 초록). 그래서 용도를 둘로 갈랐다:
 *
 *      npm run analyze    → Turbopack 네이티브 분석기. **실제 프로덕션 빌드**를 잰다. 기본.
 *      npm run analyze:webpack → webpack 빌드 + 이 플러그인. 트리맵 HTML 이 필요할 때만.
 *
 *    두 번째 경로는 실제 배포 빌드와 다른 번들러이므로 숫자를 그대로 믿지 말 것.
 */
export default withBundleAnalyzer({ enabled: process.env.ANALYZE === "1" })(
  nextConfig,
);

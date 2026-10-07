# 오늘의 영어 D — 보안 수정과 배포 재검사

2026-10-07, 최초 배포 점검 이후 사용자의 “고치고 밀어” 지시에 따른 후속 작업이다. 영어 D 화면·문제은행·최대화·데스크톱 한 줄 필터와 큰 JSON 응답 스트리밍 보완을 포함한다.

## 의존성 수정

| 패키지               | 이전 → 수정       | 범위                                                                 |
| -------------------- | ----------------- | -------------------------------------------------------------------- |
| PDF.js               | 5.7.284 → 6.2.108 | 공식 보안 패치 버전, 문서 해제 API 변경에 맞춘 호출부 보완           |
| KaTeX                | 0.16.47 → 0.18.2  | 직접 사용과 Markdown 플러그인의 하위 KaTeX를 같은 패치 버전으로 고정 |
| xmldom               | 0.9.10 → 0.9.12   | 기존 MathJax/speech-rule-engine의 해당 하위 의존성만 override        |
| deepmerge-ts         | 7.1.5 → 8.0.0     | Prisma 6.19.3을 유지하고 @prisma/config의 하위 의존성만 override     |
| Vitest / coverage-v8 | 4.1.10 → 4.1.11   | 테스트 도구의 경로 탐색 취약점 패치, 두 패키지 버전 일치             |

`npm audit --omit=dev`는 **10건 → 0건**이다. 전체 `npm audit`는 **18건 → 5건**이다. 남은 5건은 모두 개발용 `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`의 하나의 취약점에서 파생된다. [braces 권고](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)는 패치 버전이 없다고 명시하며, npm 레지스트리 최신 버전도 3.0.3이다. 취약점은 깊게 중첩된 패턴으로 재귀 스택을 소진하는 경우다. 프로젝트의 ESLint 설정은 외부 입력으로 `settings.next.rootDir`을 구성하지 않는다. 경고를 숨기거나 Next.js ESLint 설정을 오래된 버전으로 강제 다운그레이드하지 않았다. 전체 개발 의존성 감사가 무경고라는 주장은 하지 않는다.

관련 공식 권고: [PDF.js](https://github.com/advisories/GHSA-hq66-cqwq-w95j), [KaTeX](https://github.com/advisories/GHSA-238p-pmpm-9mq7), [DeepmergeTS](https://github.com/advisories/GHSA-ggr8-5vv4-36mx), [Vitest](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).

설치 중 npm 10의 peer 그래프 오류로 npm 11.6.2를 사용했다. 이때 빠진 플랫폼 선택 의존성 3개는 npm 10의 잠금 파일 재생성으로 복구했다. 잠금 파일에서 기존 패키지의 누락이 없음을 확인했고, 운영과 같은 Node.js 24.21.0에서 `npm ci --dry-run --ignore-scripts`가 통과했다. 이 검사는 실제 깨끗한 디렉터리에 전체 설치한 결과와 구분한다.

Prisma 설정 파일을 실제 로더로 읽고, 일반 중첩 병합과 순환 참조 병합을 확인했다. 순환 구조는 스택 오류 없이 보존됐다. `prisma generate`가 통과했으며 실제 DB에는 접속하지 않았다. 영어 변경이 추가하는 DB 마이그레이션은 없다.

## 검증과 통합

새 Vitest에서 영어 UI·메뉴·인쇄·문제은행 API 관련 기존 22개 파일 **372개 테스트가 다시 통과**했다.

- [PDF 호환성 수정](english-pdf-security-compat-20261007.md): 8개 파일 87개 테스트 통과. 실제 로컬 Headless Edge에서 라우트가 제공하는 두 worker, 같은 캔버스 재렌더링, 듣기 지문 추출·문항 이미지 2개·취소, 최종 PDF의 QR 판독을 확인했다. 삭제된 `PDFDocumentProxy.destroy()` 대신 `loadingTask.destroy()`를 사용한다.
- [수식 호환성 수정](english-math-security-compat-20261007.md): 19개 파일 234개 테스트 통과, 명시적 필터로 선택하지 않은 기존 figure-engine 테스트 4개는 건너뛰었다. 새 `katex-*` 클래스에 맞춰 분수 보기 간격, 연산자 첨자 크기, HWPX 기준선 측정을 수정했다. 화면·인쇄 매체에서 실제 수식 간격·글꼴·숨겨진 MathML과 수식 오류 0건을 확인했다. KaTeX 명령 목록과 기존 20개 렌더링 내용 해시는 명시된 클래스명 치환 이외에 유지됐다.

세 범위에서 합계 **693개 테스트가 통과**했다. 서로 다른 환경에서 수행한 확인을 하나의 전체 저장소 테스트 실행으로 표현하지 않는다. 변경한 PDF·수식 파일의 ESLint와 관련 문법 검사가 통과했으며 PDF 검사에는 기존 `StudioAiProvider.tsx` 경고 1개가 있다. 수식 변경의 제한된 TypeScript API 검사도 통과했다.

작업 중 원격 main에 추가된 교과서 이관 변경 `be5483e09`를 먼저 병합했다. 해당 변경의 Prisma 스키마·마이그레이션 파일을 보존하며 이 작업에서 운영 DB 마이그레이션을 실행하지 않는다. 푸시 직전에 원격 main을 다시 확인한다.

통합 후 출처 분류·색상·교과서 메타데이터·학기·수식 첨자 관련 5개 파일 153개 테스트도 통과했다. 앞선 수식 검사와 겹치는 첨자 검사 4개를 제외하면 이 릴리스에서 확인한 고유 테스트는 **842개 통과**, 명시적으로 선택하지 않은 테스트 4개다.

최종 통합 코드 `ca3071dd5`에서 Node.js 24.21.0 / Next.js 16.3.8, 8GB 힙 한도로 `npm run build`가 **exit 0**으로 끝났다. Prisma Client 생성, 프로덕션 컴파일(57초), 전체 TypeScript 검사(4.3분), 187/187 페이지 생성이 모두 통과했다. 타입 검사를 생략하지 않았다. 최초 점검과 같은 교재 그림 파일 탐색 경고 2건이 남으며, 운영의 기존 그림 CDN 준비 설정을 변경하지 않았다.

푸시 시 저장소의 기존 pre-push 관문도 실행한다. 그림 배포 참조·적재 수식·미적재 유형·그림 보기 연결은 공유 Supabase DB를 읽는 검사다. 이 검사에 필요한 기존 접속 설정은 프로세스 메모리로만 전달하고 출력하지 않는다. 이 확인은 새 영어 API의 로그인 사용자별 DB 권한이나 AI 호출 검증과 구분한다.

이 기록은 푸시 전 검증 결과이며, 실제 클라우드 배포 성공은 푸시된 커밋의 Vercel 상태와 운영 URL 응답을 별도로 확인해야 한다. 로그인한 사용자로 라이브 AI 생성·DB 권한·대용량 스트리밍까지 검증했다는 의미는 아니다. 비밀 값은 출력하거나 보고서에 기록하지 않았다.

로컬 상세 증거: `.qa-artifacts/english-push-*`, `.qa-artifacts/english-prisma-security-smoke.mjs`.

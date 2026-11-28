# 운영 빌드 메모리 — 데이터를 코드 밖으로 (2026-11-28 · 번호 없는 문서)

리드(Claude) 초안 + Codex 검토(`tracks/reports/build-memory-20261128/codex-review.md`)의 합의안. 원장님 지시: «코덱스 협의해서 완전히 계획세우고 시행», «P0 먼저 바로 반영해서 배포».

## 1. 사건

- 2026-11-27 ~ 28, 운영 배포 4회 연속 실패(`8cad6ae7f` · 재배포 · `49de73c65` · `b5cb15cc0`). Vercel 빌드 기계 2코어 · 8GB, 로그마다 `"Out of Memory" ("OOM") event was detected`, 넷 다 Turbopack 컴파일 단계. 시간 초과 아님. 마지막 성공은 `3e34e09f3`.
- 원인 하나가 아니다 — 출시마다 조금씩 늘었다. 로컬 깨끗한 빌드 최대 RSS(Mac): `3e34e09f3` 7.25GB → M1·M2 7.76 → M3 뒷단 8.07 → 화면 8.64GB. 반복 흔들림 ±0.2.
- 메모리는 Turbopack 네이티브다 — Node 힙 상한은 효과 없음.
- 무거운 까닭 셋:
  - **데이터가 코드로 묶여 있다:** 개념 백지 은행(원본 14MB)은 route 층 11.1MB 청크(50경로)와 SSR 층 11.3MB(8경로)로 두 벌. 연산 그림 자료(JSON 약 10.7MiB)는 SSR 공용 11.3MB(9경로)와 `/dev/arithmetic/grade-print` 전용 11.4MB.
  - **그 데이터마다 서버 소스맵**(2,191개 · 336MB).
  - **`/dev` 화면 103개가 운영 빌드에 든다** (앱 엔트리 466개 중 — 일부는 원장님이 운영에서 쓴다).

## 2. 단계 (합의)

| 단계 | 할 일 | 완료 조건 | 상태 |
|---|---|---|---|
| **P0** | `experimental.turbopackSourceMaps: false` | Vercel Ready · OOM 0 · 운영 주소가 그 SHA · 교사/학생/인쇄 대표 흐름 · 오류 기록(메시지 · 경로 · 상관 ID)이 남는지 | `6e3553b5a` 넣었으나 Vercel 은 여전히 OOM(아래 P0.1) |
| **P0.1** | 빌드 영구 캐시 끔(`turbopackFileSystemCacheForBuild: false`) + 타입 검사를 Next 밖에서 먼저 따로(`build-next-plan.mjs` → 통과하면 `NEXT_BUILD_TYPECHECKED=1`) | 같은 조건 · 로컬 최대 5.5GB · 타입 오류면 next build 전에 exit 2 · Vercel Ready | 시행 |
| **P3a** | 산출물 예산 검사(서버 JS 총량 · 최대 청크 · 서버 map 유무 · 큰 데이터 청크 · static JS) — 기준선 기록, 증가 경고 | 넘는 표본 · 측정 누락 · 새 대형 데이터 청크를 주입하면 운다(RED) | 다음 |
| **P1a** | 개념 백지 은행: 저작 입력은 그대로, 같은 `withAssessments`/given-case 로직으로 배포 데이터(14 part + 해시) 생성 → Node 소비자는 **명시적 동기 getter**(첫 요청 때 읽고 재사용, top-level 일괄 읽기 금지) + 라우트별 필요한 part 만 trace. 브라우저(`ConceptBlankView → loadGradeBank`, `SrsWorkspaceView → previewData`)는 인증된 데이터 경계로. `public/` 공개 · RSC props 통째 금지 | 은행 청크 두 벌 · 브라우저 전체 은행 제거. 14 part · 9,119 ID 순서 · 문장 · 지문 동일. fading `digest` · content key · 칩 순서 · 열린 풀이 복원이 전환 전과 **글자 그대로** 같음(문장 하나 바꾼 음성 사례에서 409 재확인). `coreConceptBank.ts`(교재 quick-create) 따로 이관 | 계획 |
| **P1b** | 연산 그림 자료: **서버 fs 일괄 치환은 하지 않는다**(공용 모듈이 브라우저에 닿는다). Node 인쇄는 trace 된 읽기, 브라우저는 준비 경계에서 필요한 family 또는 렌더된 SVG 만. family 단위 지연 디코딩 · LRU 보존, 포맷 변경은 따로 | 두 11MB 서버 청크와 브라우저 초기 번들의 pack 제거. 문제별 SVG · 치수 · 줄바꿈 · 인쇄 · 저장 후 재열기 일치. 빠른 단원 전환 · 재시도 · 미준비 인쇄 방지 | 계획 |
| **P2** | `/dev` 운영 제외 — **검증 없이 접두사로 빼지 않는다.** 원장님이 운영에서 여는 42개(`build-memory-20261128/dev-director-routes.txt`)는 보존 후보. 먼저 grade-print 하나 빼기 전후를 잰다. 런타임 `notFound()` 로는 그래프가 안 줄어든다 | 제외 페이지가 운영 manifest · trace 에 없고 개발/검수 빌드에는 있음. 유지 페이지의 비로그인 · 제한 계정 · 원장 접근 · PDF 유지 | **원장님 확인 필요**(어느 화면을 운영에 남기나) |
| **P3b** | Linux 8GiB 제한 환경 전체 빌드 예산(cgroup `memory.peak`) — 경고 6.4GiB · 차단 7.2GiB 초기선, 냉간 3회로 조정 | 임계 초과 · 실패 빌드 감지 | P1 뒤 |

## 3. 함께 지킬 것

- P0 이후에도 tsc 작업자(약 5GB)는 별도 단계의 큰 소비자 — 단일 Ready 로 여유를 확정하지 않는다.
- Vercel 문서의 Standard 는 4 vCPU / 8GB 인데 로그는 2코어 — 기계 유형을 매 측정에 기록한다.
- `--max-old-space-size` 를 `NODE_OPTIONS` 로 넘기면 `build-next.mjs` 가 뒤에 8192 를 덧붙여 덮는다 — 제한 실험은 직접 CLI 로.
- 소스맵을 다시 켜는 것은 P1 이 끝나고 P3 예산 안일 때만.

## 4. P0 뒤에 알게 된 것 (2026-11-28 오후)

- P0(`6e3553b5a`)도 Vercel 에서 OOM — 캐시를 받아 온 빌드는 컴파일에서 20분을 끌다 죽었다. 로컬은 어떻게 해도(스레드 2개 · `vercel build` 같은 절차) 5.8 ~ 6.3GB 로 통과 — **로컬 RSS 로 Vercel 을 대변하지 못한다.**
- 같은 커밋을 **캐시 없이** 배포하자 컴파일은 114s 에 통과했고, 그 뒤 «Running TypeScript» 와 «Finished writing to filesystem cache» 가 겹친 자리에서 OOM.
- 그래서 원인은 둘: ① 받아 온 2.3GB Turbopack 영구 캐시 ② Turbopack 이 떠 있는 채 도는 타입 검사(tsc ≈ 5GB — 2026-10-19 에도 «Running TypeScript» 에서 멈춘 적이 있다). P0.1 이 둘 다 끊는다.

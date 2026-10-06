# 오늘의수학

동네 수학학원을 위한 진도 기반 시험지 자동 출제 도구.

## 기술 스택

- Next.js 16 (App Router) + TypeScript + React 19
- Tailwind CSS v4
- Prisma + PostgreSQL, Zod
- Auth.js (이메일/구글), Claude API, KaTeX

## 시작하기

```bash
npm install
cp .env.example .env   # 값 채우기
npm run dev            # http://localhost:3000
```

## 스크립트

| 명령                 | 설명          |
| -------------------- | ------------- |
| `npm run dev`        | 개발 서버     |
| `npm run build`      | 프로덕션 빌드 |
| `npm run lint`       | ESLint        |
| `npm run type-check` | tsc --noEmit  |

기획 문서는 `docs/planning/` 참조.  
다른 컴퓨터에서 이어서 할 때: **`docs/HANDOFF.md`**.

중1 일차방정식 개인별 복습 MVP: 체험 `/lab/math-srs`, 학생 `/learn/math-srs`, 교사 `/classes/[id]/math-srs` — 기존 코드 재사용 범위와 서버 저장 적용 조건은 [오늘의 기억 MVP](docs/math-srs-mvp.md)를 참조한다.

듣기 자료 제작소를 이어서 만들 때는 [제작 패턴 가이드](docs/listening-production/PATTERN-GUIDE.md)를 먼저 읽는다. 193회차·3,699문항의 [집계 데이터](src/lib/english/listening/creation/assessment-patterns.json)와 [학년별 설계 함수](src/lib/english/listening/creation/assessmentPatterns.ts)가 준비되어 있다. `buildCreationBlueprint("middle2", 20)`처럼 학년과 문항 수로 설계를 불러올 수 있으며, 외부 원문 없이 새로운 대본·문제·음원을 제작하는 기준으로 사용한다.

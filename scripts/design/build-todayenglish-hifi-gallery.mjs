import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = path.join(root, 'docs/design/mockups/todayenglish-20261007');
const variants = [
  { id: 'A', name: '시험 작업대', file: 'a-exam-desk.html', color: '#42678c', keyword: '시험을 중심으로', desc: '학교와 시험을 고르면, 준비 중인 자료와 검토할 문제가 한 작업대에 모입니다.', flow: '시험 선택 → 제작·은행 → 검토 → 지면', structure: '시험 탐색 + 선택 시험의 작업 영역', audience: '학교별 시험을 자주 준비하는 선생님' },
  { id: 'B', name: '원문 편집실', file: 'b-source-editor.html', color: '#394963', keyword: '원문을 중심으로', desc: '원문을 읽으며 문제를 만들고, 답과 근거를 나란히 확인하는 문서 편집실입니다.', flow: '원문 → AI·엔진 제작 → 답·근거 검토', structure: '원문과 문항의 분할 편집기', audience: '하나의 원문에서 여러 유형을 제작할 때' },
  { id: 'C', name: '제작 흐름 보드', file: 'c-workflow-board.html', color: '#277364', keyword: '다음 할 일을 중심으로', desc: '초안부터 검토 완료까지 작업이 흐릅니다. 끝내야 할 제작과 검토가 먼저 보입니다.', flow: '초안 발견 → 검토 → 완료 → 재사용', structure: '상태별 가로 보드 + 상세 검토 영역', audience: '진행 중인 제작물을 함께 관리할 때' },
  { id: 'D', name: '문제 탐색과 조합', file: 'd-question-library.html', color: '#6055a2', keyword: '선택 확정 · 오늘의 수학 공통 구성', desc: '검색과 필터를 한 줄로, AI 제작은 독립 화면으로 구성합니다. 최대화로 작업 공간을 넓힐 수 있습니다.', flow: '전체 화면 AI 제작 → 확인·은행 → 담기 → 시험지', structure: '수학 공통 구성 + D의 탐색·상세·조합', audience: '2026.10.07 사용자 선택 · 제품 구현 기준' },
  { id: 'E', name: '수업 자료집', file: 'e-class-packet.html', color: '#752f45', keyword: '수업의 결과물을 중심으로', desc: '원문과 연습 문제를 한 권으로 엮습니다. 필요한 유형을 AI로 보충하며 지면을 완성합니다.', flow: '수업 → 은행에서 구성 → AI 보충 → 지면', structure: '자료집 표지·목차 + 학생·교사 지면', audience: '수업별 학습지와 자료집을 준비할 때' },
].map(v => ({ ...v, html: fs.readFileSync(path.join(outputDir, v.file), 'utf8'), thumbnail: 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, '.qa-artifacts/english-hifi', v.id.toLowerCase() + '-thumb.jpg')).toString('base64') }));
const template = fs.readFileSync(path.join(outputDir, 'gallery.template.html'), 'utf8');
const payload = JSON.stringify(variants).replaceAll('<', '\\u003c').replaceAll('\u2028', '\\u2028').replaceAll('\u2029', '\\u2029');
fs.writeFileSync(path.join(outputDir, 'index.html'), template.replace('/*VARIANTS_PAYLOAD*/[]', () => payload));
console.log(JSON.stringify({ output: path.join(outputDir, 'index.html'), variants: variants.length, bytes: fs.statSync(path.join(outputDir, 'index.html')).size }));

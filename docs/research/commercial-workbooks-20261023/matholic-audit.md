# Matholic commercial-textbook workflow audit — 2026-10-23

Completed UI audit with a verified isolated grading → wrong-answer worksheet → print-preview flow. Coverage is a sample, not verification of every textbook or every feature.

## Result

A newly created **코덱스시험** student was attached to **[개념쎈] 초등 5-2 (2022개정)**, catalog/group **10365**. Page 8 was graded **01-1 correct / 02-1 wrong**, saved as **1/2**, and verified after a fresh navigation. That wrong item appeared in the wrong-answer worksheet builder; a two-question worksheet was created and assigned only to the sample student, including one manually added similar question. The worksheet is **TEST_Codex_20261023_교재오답_2문항 (코덱스시험)**, displayed learning number **415270517**. Its actual page preview rendered, and teacher grading saved **1/2 (50 points)**; a fresh navigation confirmed that result.

Regrading was exercised through its final confirmation, which explicitly warns that subsequent similar-question learning will be deleted. The confirmation was cancelled under the instruction not to delete existing data. The saved worksheet remains at 50 points. Student submission, partial credit, actual exclusion, physical printing and downloaded PDF integrity remain unverified.

## Scope and method

- Authenticated teacher UI, Orca INTERNAL browser only, page `4a159921-ae6d-46bf-a1d9-930041a67c44`.
- Worktree `6fbea6f0-2f9d-4e22-b004-69bc703a5487::/Users/pss/orca/workspaces/today_/wrong_answer` was passed explicitly on browser commands; the assigned page was passed on page actions. A coordinator-authorized tab inventory confirmed no new output tab. The Mathflat page was not operated.
- Normal UI DOM snapshots and viewport screenshots only. DOM-backed clicks/focus targeted controls already observed in the UI. No API calls, hidden application state, network interception, app/DB changes, or proprietary dataset extraction.
- Screenshots were inspected in memory. Only this report is written to disk, so the evidence descriptions below are not links to saved screenshots.
- No real student existing records were changed; no messages, purchases, terms acceptance, or existing-data deletion occurred. Credentials, contact values, real student identities, question text and answer datasets are omitted.

## Exact URLs

| URL | Role |
|---|---|
| https://teacher.matholic.com/workbook | Worksheet list; created worksheet drawer, grading and print preview all retained this URL |
| https://teacher.matholic.com/workbook/new | Creation entry point |
| https://teacher.matholic.com/workbook/new/wrong-type?step=1 | Wrong-answer student/date/source composition |
| https://teacher.matholic.com/workbook/new/wrong-type?step=2 | Question editor and twin/similar panel |
| https://teacher.matholic.com/workbook/new/wrong-type?step=3 | Worksheet settings and preview |
| https://teacher.matholic.com/textbook-mark | Personal textbook-grading list, initially empty |
| https://teacher.matholic.com/textbook-mark/markable-textbook-list | Commercial/school textbook catalog |
| https://teacher.matholic.com/textbook-mark/settled-example-group/10365 | Sample textbook, student table, grading and histories |
| https://teacher.matholic.com/student | Isolated student registration |

## Test artifacts retained

| Artifact | Identifier and final verified state |
|---|---|
| New isolated student | **코덱스시험** (Codex test), displayed account ID **BP9코덱스시험**; class unassigned, default grade middle-school 1. Student internal numeric ID was not exposed in the inspected UI. |
| Added personal textbook | **[개념쎈] 초등 5-2 (2022개정)**, group ID **10365** from URL. Addition was confirmed by UI; this was not a purchase. |
| Saved textbook grading | P.8; **01-1 O, 02-1 X**; table result **1/2**, progress **1%**, timestamp **26.10.23 19:18**. Grading-record ID not exposed. |
| Created/assigned worksheet | **TEST_Codex_20261023_교재오답_2문항 (코덱스시험)**; learning number **415270517**; **2 questions**, course **초등 5-2 (2022 개정)**, both shown as 기본; period **26.10.23–26.10.26**; only sample student assigned. |
| Saved worksheet grading | Question 1 correct / question 2 wrong; **1/2 (50점)**, **10.23 19:30**; list after navigation **1/1명, 50.0점**. This is teacher-entered grading, not verified student submission. |
| Related remediation indicator | After worksheet grading, its student table showed **오답유사: 미제출**. No separate follow-up ID or completed follow-up submission was verified. |

A pre-existing explicit built-in test account `BP9_test` was observed but not modified. Searches for `테스트` and `TEST` in the textbook student picker had not found it. Registration rejected long/Latin-heavy test names: the UI reported a seven-character maximum, then a five-Hangul / two-Latin-or-digit restriction. **코덱스시험** was accepted. A parent-contact field was mandatory; a clearly non-contact dummy value satisfied it, without using a real contact or sending a message. The app derives credentials from contact information, so neither is recorded here.

## Feature matrix

**Verified** means the operation and its result were observed; **Observed** means controls/content were visible; **Limited** means the attempted path or final effect was not verified.

| Area | Evidence and behavior | Status / limit |
|---|---|---|
| Catalog separation | 시중교재 and 교과서 tabs | Commercial catalog viewed; school-textbook tab not separately audited |
| Search | Query `쎈` returned examples from 베이직쎈, 개념쎈, 쎈B and 라이트쎈 | Verified query/result change |
| Level/course filters | 전체/초등/중등/고등; course control initially disabled until narrower level | Observed; combinations not exhaustively executed |
| Series/favorites/order | 시리즈 selector, 빠른정답 and 즐겨찾기 filters, 최근 사용순 | Observed; favorites not changed |
| Editions/components | 2022개정 displayed explicitly; main book and workbook appear as separate entries | Observed; no complete version-coverage claim |
| Catalog extent | Initial page showed 12 cards, pagination ending at 192; searched list ending at 18 | UI pagination only; not a verified inventory total |
| Answer availability | 빠른정답 badges on sample cards; selected book exposes actual quick answers | Verified for two P.8 entries only; not all pages/books |
| Personal textbook list | 교재추가 accepted sample book and persisted it | Verified |
| Book organization | 학생 / 과제 / 전체 채점이력 / 채점 분석 tabs; student management and bulk print controls | Observed; analytics not deeply audited |
| Item/page hierarchy | Unit tree, page choice and range selection; sample begins P.8/P.9 under 이상과 이하 and shows later pages through P.142 | Observed structure; only P.8 graded |
| Subitem identity | P.8 contains **01-1** and **02-1** | Verified; preserves page plus subitem address rather than only a running question count |
| Answer display | Formatted quick-answer table in grading; 세로/가로 switch, 문제이미지 and 저장된 채점 toggles | Observed. With problem-image switch on, inspected P.8 still presented answer table, not a verified original problem image |
| Isolated student creation | Success toast **학생 1명을 등록했어요** | Verified; validation constraints above |
| Textbook student attachment | Class/group/grade picker plus name search; only sample added | Verified after reload despite delayed loading UI |
| Correct/wrong/ungraded marking | Blank cell cycle **– → O → X → –** tested | Verified UI cycle; stored one O and one X |
| Partial credit | No partial state appeared in that cycle or two-choice worksheet grading UI | Not verified; cannot conclude platform-wide absence |
| Exclusion | Site notice title advertises **문항 제외** update dated 2026.10.14 | Notice title observed only. Actual control, textbook applicability and denominator effects not verified |
| Textbook save | 채점저장 produced P.8 / 1/2 / 1% / timestamp | Verified after fresh navigation, not only a toast |
| Textbook history | 전체 채점이력 and per-student history show time/range/result/page opening; 오답 유사 학습 has submission/score/output/input columns | Verified saved row; full audit trail semantics not tested |
| Textbook assignment | 과제 and 과제출제 controls | Attempted opening but did not confirm assignment form/save; no separate textbook homework artifact claimed |
| Textbook remediation output | 출력 and 답안입력 controls on sample row/history | Output click did not yield a confirmed visible preview in that path; answer-input flow not completed |
| Wrong-answer source selection | Student/date window; sample **교재 채점**, source book **P.8–8**, timestamp and **1/2, 50점**, **1 wrong problem** | Verified cross-workflow availability |
| Original versus similar configuration | **오답문제 추가** switch; **오답유사 추가 없음/1개/2개/3개**; **오답유사 통일**; difficulty filters and optional maximum | Observed. Original switch remained on. A click on 1개 was not independently confirmed before advancing; do not claim automatic one-similar generation from this setting |
| Original content fidelity | Editor initially populated one item from the wrong-answer source | Verified population only. No original textbook image/text comparison established that it is a literal original reprint; do not call it proven proprietary-original reproduction |
| Twin/similar editor | 쌍둥이·유사 tab displayed candidate cards, same unit/difficulty, 교체/추가, solution control; other tabs include overview/unit/high-difficulty/written/academy resources | Verified panel and one **추가** action; exact twin-vs-similar classification not proven |
| Worksheet creation | Added one candidate to reach 2 questions, set TEST title, generated | Verified toast **1개 학습지가 생성되었습니다** and persisted list row |
| Worksheet assignment | One sample student and date range carried through creation | Verified; no real student attached |
| Worksheet settings | Title/subtitle, date period, split creation, themes, 2/3 columns, smart alignment, spacing, QR, difficulty and source labels | Observed; only title changed for sample |
| Print preview | Saved worksheet drawer **문제지 출력** rendered two-column page, title/sample name and learning number 415270517 | Verified screenshot and DOM; preview is not an actual printed/exported file |
| Output controls | PDF download, print, cover/title, problem sheet, answer sheet, answer-writing sheet beta, hint beta, answer/solution options, QR, duplex, binding margin, theme, grid, columns, smart spacing, footer metadata | Observed. Answer-sheet switch enabled and suboptions appeared; answer pages not individually verified |
| Physical print/PDF download | Buttons present; an output preparation/loading state occurred | Not completed; no file download/print-job success claimed |
| Worksheet teacher grading | Default correct radios; changed question 2 to X; temporary-save indicator, then 채점 제출 | Verified final 50-point result and persisted list/detail after fresh navigation |
| Regrading | 채점 수정 reopened controls; changed question 2 to O; 수정 완료 opened confirmation | Verified through confirmation only. Warning says subsequent wrong-similar learning will all be deleted; cancelled, preserving 50 points |
| Worksheet history | 답안입력이력 control; a click did not produce verified history content | Limited; no fabricated history details |
| Student workflow | Teacher screens expose 학생 답안, submission status and answer-input controls | Student account login/submission not exercised; teacher grading does not prove student workflow |

## Completed operation trace and screen evidence

1. **Catalog / textbook sample:** commercial catalog search changed cards to 쎈-related series, with course/edition and 빠른정답 badges. Added group 10365 and opened its grading workspace.
2. **Student isolation:** registered 코덱스시험, observed success toast, then selected only that student in textbook 학생관리. The loading dialog did not close promptly, but a normal reload showed the sole sample row with no prior grading. The write was not repeated blindly.
3. **Textbook grading:** P.8 answer table had two addressable subitems. Marked first O and second X, saved. The textbook table and per-student/overall history showed P.8, 1/2, 1%, 19:18. Fresh navigation later reconfirmed those values.
4. **Wrong-answer composition:** worksheet creation → 오답 → sample student. The source list showed exactly one wrong item from the saved textbook grading, including P.8–8 and 50 points. This is the strongest evidence that commercial textbook answer-key grading feeds worksheet remediation.
5. **Editor screenshot:** one selected item on a page preview at left; 쌍둥이·유사 candidates at right, with 교체 and 추가. Clicking one 추가 changed total from 1 to 2. This proves manual related-item addition, not universal automatic twin supply.
6. **Creation / persistence:** settings preview showed two items and TEST title. 학습지 생성 returned **1개 학습지가 생성되었습니다**. Fresh `/workbook` navigation showed the named two-item 오답 worksheet, elementary 5-2 2022 course, period and only sample student.
7. **Print screenshot:** actual page inside 문제지 출력 showed the TEST title, sample name and two questions in two columns, with the output settings panel. DOM exposed learning number **415270517** and one-page preview. No question/answer content is copied into this report.
8. **Worksheet grading / persistence:** teacher grading submitted one O and one X; confirmation stated **총 2문제 중에 1개 맞았습니다. (50점)**. Fresh `/workbook` navigation showed **1/1명, 50.0점**, and reopened detail showed **1/2 (50점), 10.23 19:30**.
9. **Regrade consequence:** after changing the second item to O in edit mode, confirmation warned **채점 결과를 수정하면 이후의 오답 유사 학습은 모두 삭제됩니다**. Cancelled and navigated away. The final persistence check still showed 50 points.

## Limits and implications

- This sample proves the teacher path from commercial-book quick answers and manual O/X marking to a wrong-answer worksheet with an added related item. It does not prove automatic evaluation of typed textbook answers, full original-question reproduction, all textbook answer coverage, or complete edition correctness.
- Catalog badges, page/subitem addressing, explicit save, per-student history and a date-filtered remediation source are distinct parts of the workflow. A product comparison should preserve those distinctions.
- Regrading can invalidate later remediation according to the UI warning. Its destructive consequence is material and should not be represented as a harmless cell edit.
- Partial credit and item exclusion need a separately authorized targeted test. No stored partial/excluded sample exists from this audit.
- The site warns that the current browser may not support all functions and recommends Chrome. Orca clicks and rendering were sometimes delayed; snapshots could include hidden or retained dialogs, and focusing the assigned page sometimes released pending rendering. DOM visibility checks, screenshots and fresh navigation were used to separate actual writes from pending UI. These are observed compatibility symptoms, not proof of a specific root cause.
- No teardown was performed because deletion was prohibited. The isolated student, textbook attachment, grading and worksheet above remain available for review. No app code or shared repository files were edited.

# Administrator SRS browser acceptance

Run `node node_modules/@playwright/test/cli.js test --config e2e/admin-srs/playwright.config.ts`.
The isolated preview uses port 4326 and production CourseDashboard/CoursePlanForm, UnifiedWorkspace navigation, ClassManage/StudentList and AdminUserDetail return links. Framework-only client Link/router/dynamic shims and unopened unrelated views keep the fixture isolated; fixture fetches use synthetic browser-local records and never contact production. Actual server ownership authorization is covered by the API tests, not this fixture.

The cases cover duplicate registration identity/shared plan updates, unique/supplementary targets, dirty Escape/row/tab/shell navigation choices, direct class/student links and refresh, role destinations and rejected unsafe returns, and page overflow at 320/390/1440 pixels. Screenshots and Playwright output are generated under test-results/admin-srs.

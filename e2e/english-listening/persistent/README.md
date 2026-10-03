# Authenticated listening browser checks

These scripts target only the fixed loopback URL `http://127.0.0.1:4302`. They use actual teacher/student login, Next routes and durable PostgreSQL, and create test materials/assignments. Do not point a local server at a shared database for these checks.

Prepare an isolated database with the project baseline and the listening migration, then create one approved superadmin teacher, one owned class and one active student login account without a password-change requirement. Save only local credentials in ignored `.qa-artifacts/listening-postgres/fixture.json`:

```json
{
  "teacher": { "id": "<UUID>", "email": "<local test email>", "password": "<local test password>" },
  "student": { "id": "<UUID>", "loginId": "<local test login>", "password": "<local test PIN>" },
  "classId": "<UUID>",
  "accountId": "<UUID>"
}
```

Place an original canonical PCM16 WAV at `.qa-artifacts/listening-postgres/dialogue.wav` with this spoken text: “Let us meet at four oclock in front of the library. Please bring your notebook. I will buy the tickets first.” The October 3 verification used a local Microsoft Zira speech file normalized to a 44-byte RIFF header; no AI provider or external recording was used. This is a mechanical audio test, not human listening-quality approval.

Start Next on port 4302 with `DATABASE_URL` and `DIRECT_URL` explicitly set to that isolated DB, a local `AUTH_SECRET`, `AUTH_URL=http://127.0.0.1:4302`, and `AUTH_TRUST_HOST=true`. Then, from the repository root:

```powershell
node e2e/english-listening/persistent/author-and-practice.mjs
node e2e/english-listening/persistent/exam-and-media.mjs
```

The first script performs real authoring, rights and content review, WAV upload, publication, student/teacher PDF export, assignment and student practice. It writes `browser-result.json` for the second script. The second checks editable exam drafts, immutable submission, manual release, offline interruption, authorized retry, teacher broadcast without learner audio, real MP3 conversion and protected Range, revocation, and safe refusal to delete linked roster records. The MP3 is the checked-in synthetic tone fixture.

Screenshots and PDFs stay in `.qa-artifacts/listening-postgres/screens`. Credentials, audio and generated IDs never belong in Git. Stop the test Next server and isolated database after the checks. The older Vite component harness remains separate and does not establish persistence/authentication correctness.

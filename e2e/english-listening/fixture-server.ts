/**
 * Vite-only in-memory simulation. This is NOT an authenticated learner API.
 * Domain fixtures, answers and node:crypto remain in the Node process; browser
 * entries receive separate teacher data or the real allowlisted student DTO.
 */
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import {
  englishListeningAssignmentFixture,
  englishListeningFixture,
  englishListeningPublicationFixture,
  listeningFixtureIds,
  listeningFixtureNow,
} from "@/mocks/englishListeningFixture";
import {
  createListeningAttempt,
  transitionListeningAttempt,
} from "@/lib/english/listening/attempt";
import { projectListeningStudentView } from "@/lib/english/listening/projection";
import { decideListeningRange } from "@/lib/english/listening/media/range";
import type {
  EnglishListeningAssignment,
  EnglishListeningAttempt,
} from "@/contracts/englishListening.contract";
import type {
  ListeningStudentAttemptSnapshot,
  ListeningStudentMedia,
} from "@/components/learn/english-listening/ListeningStudentView";

const publication = englishListeningPublicationFixture();
const first = englishListeningFixture();
const second = {
  ...structuredClone(first),
  id: "00000000-0000-4000-8000-000000000101",
  title: "짧은 대화와 안내 · 다시 듣기",
};
const documents = [first, second];
const requestSchema = z.strictObject({
  attemptId: z.uuid(),
  expectedRevision: z.number().int().positive(),
  requestId: z.uuid(),
});
const answerSchema = requestSchema.extend({
  questionId: z.uuid(),
  choiceId: z.uuid(),
});
type Request = z.infer<typeof requestSchema> | z.infer<typeof answerSchema>;
type Session = {
  assignment: EnglishListeningAssignment;
  attempt: EnglishListeningAttempt;
  failFirstAnswer: boolean;
  droppedAnswer: boolean;
  requests: { kind: string; request: Request }[];
};
const sessions = new Map<string, Session>();

function snapshot(session: Session): ListeningStudentAttemptSnapshot {
  const attempt = session.attempt;
  return {
    id: attempt.id,
    revision: attempt.revision,
    status: attempt.status,
    serverNow: listeningFixtureNow,
    startedAt: attempt.startedAt,
    deadlineAt: attempt.deadlineAt,
    submittedAt: attempt.submittedAt,
    answers: attempt.firstAnswers.map(({ questionId, choiceId }) => ({
      questionId,
      choiceId,
    })),
  };
}

function view(session: Session) {
  return projectListeningStudentView(
    publication,
    session.assignment,
    session.attempt,
    {
      now: listeningFixtureNow,
      studentId: listeningFixtureIds.student,
    },
  );
}

function media(): ListeningStudentMedia {
  return {
    soundCheckUrl: "/__harness/tone/sound-check.wav",
    urlsByAssetId: Object.fromEntries(
      first.groups.map((group) => [
        group.audio.assetId,
        `/__harness/tone/${group.audio.assetId}.wav`,
      ]),
    ),
    playbackPolicy: {
      canPlay: true,
      canPause: true,
      canSeek: true,
      canRepeat: true,
    },
  };
}

function json(response: ServerResponse, data: unknown, ok = true) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.end(JSON.stringify(ok ? { ok, data } : { ok, error: data }));
}

async function body(request: IncomingMessage): Promise<unknown> {
  let data = "";
  for await (const chunk of request) data += chunk;
  return data ? JSON.parse(data) : {};
}

/** PCM16 mono sine, no external file or voice rights dependency. */
function tone(durationMs: number) {
  const sampleRate = 16_000;
  const samples = Math.floor((sampleRate * durationMs) / 1000);
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index++) {
    // Fade edges to avoid clicks. This is an audible test tone, not lesson audio.
    const fade = Math.min(1, index / 320, (samples - index - 1) / 320);
    buffer.writeInt16LE(
      Math.round(
        Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 2600 * fade,
      ),
      44 + index * 2,
    );
  }
  return buffer;
}

export async function handleFixtureRequest(
  request: IncomingMessage,
  response: ServerResponse,
) {
  const path = new URL(request.url!, "http://127.0.0.1:4198").pathname;
  if (path.startsWith("/__harness/tone/")) {
    const asset = path.split("/").at(-1)!.replace(".wav", "");
    const duration =
      asset === "sound-check"
        ? 1500
        : first.groups.find((group) => group.audio.assetId === asset)?.audio
            .durationMs;
    if (!duration) {
      response.statusCode = 404;
      response.end();
      return;
    }
    const wav = tone(duration);
    response.setHeader("Content-Type", "audio/wav");
    response.setHeader("Accept-Ranges", "bytes");
    const decision = request.headers.range
      ? decideListeningRange(request.headers.range, wav.length)
      : null;
    if (decision?.kind === "reject") {
      response.statusCode = 416;
      response.setHeader("Content-Range", `bytes */${wav.length}`);
      response.end();
      return;
    }
    const range = decision?.kind === "single" ? decision.range : null;
    const bytes = range ? wav.subarray(range.start, range.endExclusive) : wav;
    if (range) {
      response.statusCode = 206;
      response.setHeader(
        "Content-Range",
        `bytes ${range.start}-${range.endExclusive - 1}/${wav.length}`,
      );
    }
    response.setHeader("Content-Length", bytes.length);
    response.end(bytes);
    return;
  }
  if (path === "/__harness/teacher") {
    json(
      response,
      documents.map(({ id, title, level, groups }) => ({
        id,
        title,
        level,
        questionCount: groups.reduce(
          (sum, group) => sum + group.questions.length,
          0,
        ),
      })),
    );
    return;
  }
  if (path.startsWith("/__harness/teacher/")) {
    const document = documents.find(({ id }) => id === path.split("/").at(-1));
    if (!document) throw new Error("Unknown fixture material");
    json(response, { document, mediaUrlsByAssetId: media().urlsByAssetId });
    return;
  }
  if (path === "/__harness/student" && request.method === "POST") {
    const options = z
      .strictObject({
        audioSource: z.enum(["student_device", "teacher_device"]),
        failFirstAnswer: z.boolean(),
      })
      .parse(await body(request));
    const assignment = {
      ...englishListeningAssignmentFixture(),
      audioSource: options.audioSource,
    };
    const session: Session = {
      assignment,
      attempt: createListeningAttempt(publication, assignment, {
        id: randomUUID(),
        studentId: listeningFixtureIds.student,
        now: listeningFixtureNow,
      }),
      failFirstAnswer: options.failFirstAnswer,
      droppedAnswer: false,
      requests: [],
    };
    const sessionId = randomUUID();
    sessions.set(sessionId, session);
    json(response, {
      sessionId,
      view: view(session),
      attempt: snapshot(session),
      mode: assignment.mode,
      ...(assignment.audioSource === "student_device"
        ? { media: media() }
        : {}),
    });
    return;
  }
  const match = path.match(
    /^\/__harness\/student\/([^/]+)\/(start|answer|submit|view|inspect)$/,
  );
  if (!match) throw new Error("Unknown development fixture request");
  const session = sessions.get(match[1]);
  if (!session) throw new Error("Unknown development session");
  const kind = match[2];
  if (kind === "view") {
    json(response, view(session));
    return;
  }
  if (kind === "inspect") {
    // Playwright diagnostics only. No answer keys or teacher data in this response.
    json(response, {
      requests: session.requests,
      attempt: snapshot(session),
      receiptCount: session.attempt.receipts.length,
    });
    return;
  }
  const input = (kind === "answer" ? answerSchema : requestSchema).parse(
    await body(request),
  );
  if (input.attemptId !== session.attempt.id)
    throw new Error("Attempt mismatch");
  session.requests.push({ kind, request: input });
  const answerInput = kind === "answer" ? answerSchema.parse(input) : null;
  const command = {
    kind,
    expectedRevision: input.expectedRevision,
    idempotencyKey: input.requestId,
    ...(answerInput
      ? {
          phase: "initial",
          questionId: answerInput.questionId,
          choiceId: answerInput.choiceId,
        }
      : {}),
  };
  session.attempt = transitionListeningAttempt(
    publication,
    session.assignment,
    session.attempt,
    command,
    {
      now: listeningFixtureNow,
      // Harness facts only, not production evidence of readiness or authentication.
      soundChecked: true,
      audioReady: true,
      ...(session.assignment.audioSource === "teacher_device"
        ? {
            broadcast: {
              schemaVersion: 1,
              id: "00000000-0000-4000-8000-000000000201",
              assignmentId: session.assignment.id,
              publicationId: publication.id,
              startedAt: listeningFixtureNow,
              deadlineAt: "2026-10-03T00:10:00.000Z",
              participantStudentIds: [listeningFixtureIds.student],
            },
          }
        : {}),
    },
  );
  if (kind === "answer" && session.failFirstAnswer && !session.droppedAnswer) {
    session.droppedAnswer = true;
    // Simulate lost acknowledgement AFTER commit, without causing a browser resource error.
    json(response, "검증용: 저장 뒤 응답 유실을 모사했습니다.", false);
    return;
  }
  json(response, snapshot(session));
}

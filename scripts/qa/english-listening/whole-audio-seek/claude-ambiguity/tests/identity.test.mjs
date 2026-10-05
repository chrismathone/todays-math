import assert from "node:assert/strict";
import { test } from "node:test";
import {
  Hold,
  completeChronology,
  verifyIdentity,
  verifyOrdinalOnly,
} from "../lib/identity.mjs";
import {
  FRAMES,
  OPENINGS,
  PLACES,
  RATE,
  SCRIPT,
  SENTENCE_B,
  SOURCE,
  probe,
  rebind,
  reseal,
  stored,
  validInput,
} from "./fixture.mjs";

/** The replay must refuse with exactly this reason. */
const refuses = (input, reason) =>
  assert.throws(
    () => verifyIdentity(input),
    (error) => {
      assert.ok(error instanceof Hold, "not a Hold: " + error.stack);
      assert.equal(error.reason, reason);
      return true;
    },
  );

test("bare digits, a number-only clip, the own sentence and the own unique opening identify a repeated-sentence question", () => {
  for (const number of [1, 2, 3, 4]) {
    const proof = verifyIdentity(validInput(number));
    assert.equal(proof.tier, "number_sentence_and_own_dialogue");
    assert.equal(proof.numberGrade, "bare_digits_with_literal_number_clip");
    assert.equal(proof.sentence.occurrencesInScript, 2);
    assert.equal(proof.dialogue.occurrencesInScript, 1);
    assert.deepEqual(proof.number.numbers, [number]);
  }
});

test("a literal number in the long probe needs no clip", () => {
  const input = validInput(2, (i) => {
    i.loaded.cueProbe.container.probes[0].segments[0].text =
      "2번 " + SENTENCE_B;
    reseal(i.loaded.cueProbe);
    delete i.claim.numberClip;
    rebind(i);
  });
  assert.equal(verifyIdentity(input).numberGrade, "literal_number_at_start");
});

test("bare digits before a repeated sentence prove nothing without a literal number", () => {
  refuses(
    validInput(2, (i) => void delete i.claim.numberClip),
    "bare_digits_before_repeated_sentence_without_literal_number",
  );
});

test("a borrowed dialogue is refused: the other question that prints the same sentence", () => {
  // Question 4 prints question 2's sentence. Its opening, heard after number 2, is not number 2's.
  const input = validInput(2, (i) => {
    const borrowed = OPENINGS[4];
    i.loaded.dialogueProbe.container.probes[0].segments[0].text =
      borrowed.heard;
    reseal(i.loaded.dialogueProbe);
    i.claim.opening.quotes = [
      {
        text: borrowed.quote,
        startCharacter: SCRIPT.indexOf(borrowed.quote),
        endCharacter: SCRIPT.indexOf(borrowed.quote) + borrowed.quote.length,
      },
    ];
    rebind(i);
  });
  refuses(input, "own_dialogue_opening_outside_current_section");
});

test("the own opening quoted correctly but another dialogue heard is refused", () => {
  const input = validInput(2, (i) => {
    i.loaded.dialogueProbe.container.probes[0].segments[0].text =
      OPENINGS[4].heard;
    reseal(i.loaded.dialogueProbe);
    rebind(i);
  });
  refuses(input, "own_dialogue_opening_not_heard_exactly");
});

test("a wrong number is refused, in the long probe and in the clip", () => {
  refuses(
    validInput(2, (i) => {
      i.loaded.cueProbe.container.probes[0].segments[0].text =
        "4. " + SENTENCE_B;
      reseal(i.loaded.cueProbe);
      rebind(i);
    }),
    "spoken_number_mismatch",
  );
  refuses(
    validInput(2, (i) => {
      i.loaded.numberClip.container.probes[1].segments[0].text = "4번";
      reseal(i.loaded.numberClip);
      rebind(i);
    }),
    "number_clip_did_not_hear_literal_number",
  );
});

test("another recognition from the same start that wrote another number is a contradiction", () => {
  refuses(
    validInput(
      2,
      (i) =>
        void (i.readingsAtStart = [
          { path: "x", probeId: 9, numbers: [3], form: "beon", text: "3번" },
        ]),
    ),
    "contradictory_spoken_number_at_same_start",
  );
});

test("an opening the script prints twice is not an identity", () => {
  // The same script with question 2's first utterance also printed in question 4.
  const doubled = SCRIPT.replace(OPENINGS[4].quote, OPENINGS[2].quote);
  const input = validInput(2, (i) => void (i.script = { text: doubled }));
  refuses(input, "own_dialogue_opening_not_unique_or_not_exact_prefix");
});

test("a quote from the wrong section, or with forged offsets, is refused", () => {
  refuses(
    validInput(2, (i) => {
      const other = OPENINGS[3];
      i.claim.opening.quotes = [
        {
          text: other.quote,
          startCharacter: SCRIPT.indexOf(other.quote),
          endCharacter: SCRIPT.indexOf(other.quote) + other.quote.length,
        },
      ];
    }),
    "own_dialogue_opening_outside_current_section",
  );
  refuses(
    validInput(2, (i) => void (i.claim.opening.quotes[0].startCharacter += 1)),
    "own_dialogue_opening_quote_or_offsets_mismatch",
  );
  // A later turn of the right section is not its first utterance.
  refuses(
    validInput(2, (i) => {
      const later = "Why? It’s more convenient to park outside";
      i.claim.opening.quotes = [
        {
          text: later,
          startCharacter: SCRIPT.indexOf(later),
          endCharacter: SCRIPT.indexOf(later) + later.length,
        },
      ];
    }),
    "own_dialogue_opening_is_not_first_turn",
  );
});

test("a script whose numbering is not complete and unique gives no section, so no dialogue proof", () => {
  refuses(
    validInput(
      2,
      (i) => void (i.script = { text: SCRIPT.replace("4번 ", "2번 ") }),
    ),
    "official_section_unavailable",
  );
});

test("the same topic in other words is not the opening", () => {
  const input = validInput(2, (i) => {
    i.loaded.dialogueProbe.container.probes[0].segments[0].text =
      "Mom, you should park your car in the underground parking lot today.";
    reseal(i.loaded.dialogueProbe);
    rebind(i);
  });
  refuses(input, "own_dialogue_opening_not_heard_exactly");
});

test("a differently spelled first word ends the opening; nothing is repaired", () => {
  const input = validInput(1, (i) => {
    i.loaded.dialogueProbe.container.probes[0].segments[0].text =
      "Kevan, have you booked a table at Charlie's for our team dinner?";
    reseal(i.loaded.dialogueProbe);
    rebind(i);
  });
  refuses(input, "own_dialogue_opening_not_heard_exactly");
});

test("probes outside the original, past their own duration or flagged overflow are refused", () => {
  refuses(
    validInput(2, (i) => {
      i.loaded.dialogueProbe.container.probes[0].frameCount =
        SOURCE.clock.frameCount;
      reseal(i.loaded.dialogueProbe);
      rebind(i);
    }),
    "probe_source_overflow",
  );
  refuses(
    validInput(2, (i) => {
      i.loaded.cueProbe.container.probes[0].segments[0].localEndSeconds = 14.5;
      reseal(i.loaded.cueProbe);
      rebind(i);
    }),
    "raw_probe_segment_overflow",
  );
  refuses(
    validInput(2, (i) => {
      i.loaded.cueProbe.container.probes[0].overflow = true;
      reseal(i.loaded.cueProbe);
      rebind(i);
    }),
    "raw_probe_overflow",
  );
});

test("forged hashes are refused: container, request and full PCM", () => {
  refuses(
    validInput(2, (i) => void (i.claim.cueProbe.sha256 = "0".repeat(64))),
    "artifact_hash_mismatch",
  );
  refuses(
    validInput(
      2,
      (i) => void (i.loaded.dialogueProbe.requestSha256 = "0".repeat(64)),
    ),
    "artifact_hash_mismatch",
  );
  refuses(
    validInput(2, (i) => {
      i.loaded.cueProbe.container.nativePcm.sha256 = "0".repeat(64);
      reseal(i.loaded.cueProbe);
      rebind(i);
    }),
    "raw_probe_native_clock_mismatch",
  );
  // A probe whose stored bounds differ from its frozen request.
  refuses(
    validInput(2, (i) => {
      i.loaded.cueProbe.request.sources[0].probes[0].startFrame += FRAMES;
      const { createHash } = process.getBuiltinModule("node:crypto");
      i.loaded.cueProbe.requestSha256 = createHash("sha256")
        .update(JSON.stringify(i.loaded.cueProbe.request))
        .digest("hex");
      i.loaded.cueProbe.container.requestSha256 =
        i.loaded.cueProbe.requestSha256;
      i.loaded.cueProbe.containerSha256 = createHash("sha256")
        .update(JSON.stringify(i.loaded.cueProbe.container))
        .digest("hex");
      rebind(i);
    }),
    "raw_probe_request_bounds",
  );
  refuses(
    validInput(2, (i) => {
      i.loaded.cueProbe.container.sourceAudioSha256 = "0".repeat(64);
      i.loaded.cueProbe.containerSha256 = "1".repeat(64);
      rebind(i);
    }),
    "bounded_probe_wrong_source",
  );
});

test("a question that already has a verified start is never proposed again", () => {
  refuses(
    validInput(2, (i) => void (i.baseline = { hasVerifiedStart: true })),
    "question_already_has_verified_start",
  );
});

test("the start is the measured lead before a measured onset, on the native clock", () => {
  refuses(
    validInput(2, (i) => void (i.claim.startFrame += FRAMES)),
    "native_start_not_measured_quiet_lead",
  );
  refuses(
    validInput(2, (i) => void (i.claim.onsetFrame -= 10 * FRAMES)),
    "native_onset_is_not_sound",
  );
  refuses(
    validInput(2, (i) => void (i.claim.startFrame += 1)),
    "native_start_off_measured_window_grid",
  );
  refuses(
    validInput(2, (i) => void (i.claim.seekStartMs += 1)),
    "seek_native_clock_mismatch",
  );
  refuses(
    validInput(2, (i) => void (i.claim.seekEndMs -= 1)),
    "seek_end_is_not_full_original_duration",
  );
  // A click: sound for 40 ms only.
  refuses(
    validInput(
      2,
      (i) =>
        void i.native.energy.fill(
          0,
          PLACES[2].number + 2,
          PLACES[2].number + 450,
        ),
    ),
    "native_onset_sound_too_short_for_a_spoken_number",
  );
});

test("an uncertain number or an uncertain dialogue segment is not repaired", () => {
  refuses(
    validInput(2, (i) => {
      Object.assign(i.loaded.cueProbe.container.probes[0].segments[0], {
        noSpeechProbability: 0.7,
        avgLogProbability: -0.7,
      });
      reseal(i.loaded.cueProbe);
      rebind(i);
    }),
    "spoken_number_segment_uncertain",
  );
  refuses(
    validInput(2, (i) => {
      i.loaded.numberClip.container.probes[1].segments[0].avgLogProbability =
        -1.2;
      reseal(i.loaded.numberClip);
      rebind(i);
    }),
    "number_clip_uncertain",
  );
  refuses(
    validInput(2, (i) => {
      i.loaded.dialogueProbe.container.probes[0].segments[0].compressionRatio = 2.6;
      reseal(i.loaded.dialogueProbe);
      rebind(i);
    }),
    "uncertain_raw_evidence",
  );
});

test("the number clip begins at the same measured start and is short", () => {
  refuses(
    validInput(2, (i) => {
      const clip = i.loaded.numberClip.container.probes[1];
      clip.startFrame += 5 * FRAMES;
      reseal(i.loaded.numberClip);
      rebind(i);
    }),
    "number_clip_wrong_native_start",
  );
  refuses(
    validInput(2, (i) => {
      const clip = i.loaded.numberClip.container.probes[1];
      clip.frameCount = 5 * RATE;
      clip.durationSeconds = 5;
      reseal(i.loaded.numberClip);
      rebind(i);
    }),
    "probe_overflow_or_unbounded",
  );
});

/** Moves the English listening to another measured dialogue onset of the fixture. */
const moveDialogue = (input, toQuestion) => {
  const p = input.loaded.dialogueProbe.container.probes[0];
  p.startFrame = (PLACES[toQuestion].dialogue - 20) * FRAMES;
  p.onsetFrame = PLACES[toQuestion].dialogue * FRAMES;
  reseal(input.loaded.dialogueProbe);
  rebind(input);
};

test("the dialogue is heard inside this passage: after the number, soon, and before the next question", () => {
  // The right words, heard from a place 36 s later (another passage of the recording).
  refuses(
    validInput(2, (i) => moveDialogue(i, 3)),
    "dialogue_probe_offset_outside_original_passage_limit",
  );
  // The right words, heard from a place before this question's number.
  refuses(
    validInput(2, (i) => moveDialogue(i, 1)),
    "dialogue_probe_offset_outside_original_passage_limit",
  );
  // The next question begins before the quoted dialogue ends.
  refuses(
    validInput(
      2,
      (i) =>
        void (i.neighbors.next.startMs =
          ((PLACES[2].dialogue + 10) * FRAMES * 1000) / RATE),
    ),
    "dialogue_probe_beyond_next_original_question",
  );
});

test("order: the next question's start must be known, and both neighbours lie on their own side", () => {
  refuses(
    validInput(2, (i) => void (i.neighbors.next = null)),
    "next_original_passage_boundary_missing",
  );
  // Not the very next question: a gap nobody located.
  refuses(
    validInput(2, (i) => void (i.neighbors.next.sourceNumber = 4)),
    "next_original_passage_boundary_missing",
  );
  refuses(
    validInput(2, (i) => void (i.neighbors.next.startMs = i.claim.seekStartMs)),
    "start_not_before_next_question",
  );
  refuses(
    validInput(
      2,
      (i) => void (i.neighbors.previous.startMs = i.claim.seekStartMs + 1),
    ),
    "start_not_after_previous_question",
  );
  // Only the last question of a recording has no next boundary.
  assert.equal(verifyIdentity(validInput(4)).neighbors.isLastQuestion, true);
  refuses(
    validInput(
      4,
      (i) => void (i.neighbors.next = { sourceNumber: 5, startMs: 1 }),
    ),
    "last_question_has_no_next_boundary",
  );
});

test("a sentence heard only in part does not carry bare digits", () => {
  refuses(
    validInput(2, (i) => {
      i.loaded.cueProbe.container.probes[0].segments[0].text =
        "2. 대화를 듣고 가장 적절한 것을 고르시오.";
      reseal(i.loaded.cueProbe);
      rebind(i);
    }),
    "bare_digits_not_directly_before_own_sentence",
  );
});

test("without the own dialogue, a number and a repeated sentence are only a weaker, separately named tier", () => {
  const proof = verifyIdentity(
    validInput(2, (i) => {
      delete i.claim.dialogueProbe;
      delete i.claim.opening;
    }),
  );
  assert.equal(proof.tier, "number_and_sentence");
  assert.equal(proof.dialogue, null);
});

test("a member of a shared instruction needs its literal number and its own dialogue within six seconds", () => {
  const member = (change) =>
    validInput(2, (i) => {
      i.question = {
        ...i.question,
        kind: "shared_instruction_member",
        promptSentence: null,
      };
      i.loaded.cueProbe.container.probes[0].segments[0].text = "2번";
      reseal(i.loaded.cueProbe);
      delete i.claim.numberClip;
      // The fixture's dialogue begins 10 s after the number; bring it to 4 s.
      const from = PLACES[2].number + 200;
      i.native.energy.fill(0, PLACES[2].number + 60, PLACES[2].dialogue + 500);
      i.native.energy.fill(1e12, from, from + 300);
      const p = i.loaded.dialogueProbe.container.probes[0];
      p.startFrame = (from - 20) * FRAMES;
      p.onsetFrame = from * FRAMES;
      reseal(i.loaded.dialogueProbe);
      rebind(i);
      change?.(i);
    });
  assert.equal(verifyIdentity(member()).tier, "member_number_and_own_dialogue");
  refuses(
    member((i) => {
      delete i.claim.dialogueProbe;
      delete i.claim.opening;
    }),
    "member_needs_own_dialogue_opening",
  );
  refuses(
    member((i) => {
      const far = PLACES[2].number + 400;
      i.native.energy.fill(0, PLACES[2].number + 60, PLACES[3].number - 60);
      i.native.energy.fill(1e12, far, far + 300);
      const p = i.loaded.dialogueProbe.container.probes[0];
      p.startFrame = (far - 20) * FRAMES;
      p.onsetFrame = far * FRAMES;
      reseal(i.loaded.dialogueProbe);
      rebind(i);
    }),
    "dialogue_probe_offset_outside_original_passage_limit",
  );
});

test("a number alone stands only for a question without official text, inside a complete chronology", () => {
  const input = validInput(2, (i) => {
    i.question = { ...i.question, promptSentence: null };
    i.loaded.cueProbe.container.probes[0].segments[0].text = "2번";
    reseal(i.loaded.cueProbe);
    delete i.claim.numberClip;
    delete i.claim.dialogueProbe;
    delete i.claim.opening;
    rebind(i);
  });
  assert.throws(
    () => verifyOrdinalOnly(input),
    (e) => e.reason === "ordinal_only_is_for_questions_without_official_text",
  );
  input.officialTextToCompare = false;
  assert.equal(
    verifyOrdinalOnly(input).tier,
    "ordinal_only_complete_chronology",
  );
  assert.equal(
    completeChronology(
      [1, 2, 3],
      new Map([
        [1, 10],
        [2, 20],
        [3, 30],
      ]),
    ),
    true,
  );
  assert.equal(
    completeChronology(
      [1, 2, 3],
      new Map([
        [1, 10],
        [3, 30],
      ]),
    ),
    false,
  );
  assert.equal(
    completeChronology(
      [1, 2, 3],
      new Map([
        [1, 10],
        [2, 40],
        [3, 30],
      ]),
    ),
    false,
  );
});

test("a probe of another source, or one marked as reviewed or modified, is refused", () => {
  refuses(
    validInput(2, (i) => {
      i.loaded.cueProbe = stored(
        i.loaded.cueProbe.path,
        i.loaded.cueProbe.container.probes,
        { sourceRecordId: "another-source" },
      );
      rebind(i);
    }),
    "bounded_probe_wrong_source",
  );
  refuses(
    validInput(2, (i) => {
      i.loaded.cueProbe = stored(
        i.loaded.cueProbe.path,
        i.loaded.cueProbe.container.probes,
        { humanReviewed: true },
      );
      rebind(i);
    }),
    "probe_original_or_review_mutation",
  );
});

test("the cue probe is Korean and the dialogue probe English, each from its own frame", () => {
  refuses(
    validInput(2, (i) => {
      i.loaded.dialogueProbe.container.probes[0].requestedLanguage = "ko";
      reseal(i.loaded.dialogueProbe);
      rebind(i);
    }),
    "dialogue_probe_language",
  );
  refuses(
    validInput(2, (i) => {
      const moved = probe(1, {
        onsetWindow: PLACES[3].number,
        windows: 700,
        language: "ko",
        purpose: "gap_onset",
        texts: ["2. " + SENTENCE_B],
      });
      i.loaded.cueProbe.container.probes[0] = moved;
      reseal(i.loaded.cueProbe);
      rebind(i);
    }),
    "raw_probe_wrong_native_start",
  );
});

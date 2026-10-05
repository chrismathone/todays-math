import assert from "node:assert/strict";
import { test } from "node:test";
import { chooseNumberPlace } from "../lib/reconstructed.mjs";

const RATE = 44100;
/** One stored listening near a passage's number. */
const listening = (onsetSeconds, extra = {}) => ({
  startFrame: Math.round((onsetSeconds - 0.4) * RATE),
  onsetFrame: Math.round(onsetSeconds * RATE),
  onsetSeconds,
  insideEstimatedCueSpan: true,
  numbers: [5],
  form: "beon",
  firstSpeechSeconds: 0,
  hearsOwnNumberFirst: true,
  ...extra,
});
const place = (listened, segments = []) =>
  chooseNumberPlace(listened, [5], [29], segments);

test("one measured onset inside the span where the number was written first is the place", () => {
  const only = listening(220.5);
  assert.deepEqual(place([only]), { outcome: "heard", chosen: only });
});

test("a chime and then the number: the onset where the number begins at once is chosen", () => {
  const chime = listening(219.2, { firstSpeechSeconds: 1.3 });
  const number = listening(220.5, { firstSpeechSeconds: 0 });
  assert.equal(place([chime, number]).chosen, number);
  // On a tie the later onset: nothing earlier than the number itself.
  const earlier = listening(220.1);
  assert.equal(place([earlier, number]).chosen, number);
});

test("the same number written first at two distant places is not located", () => {
  assert.deepEqual(place([listening(220.5), listening(236)]), {
    outcome: "held",
    reason: "original_number_heard_at_two_distant_places",
  });
});

test("a hearing outside the estimated span of the passage's own number does not place it", () => {
  const outside = listening(218.9, { insideEstimatedCueSpan: false });
  assert.equal(
    place([outside]).reason,
    "original_number_heard_first_only_outside_frozen_cue_span",
  );
});

test("a number written late, as bare digits or in a flagged segment is not a hearing", () => {
  const late = listening(219.2, { hearsOwnNumberFirst: false });
  assert.equal(
    place([late]).reason,
    "original_number_written_late_bare_or_flagged_uncertain",
  );
});

test("a number written first from a start that is not a measured quiet onset is named as such", () => {
  // Hiss or music runs up to the number: the recognition is fine, the place is not measured.
  const noisy = listening(220.5, {
    wroteOwnNumberFirst: true,
    hearsOwnNumberFirst: false,
  });
  assert.equal(
    place([noisy]).reason,
    "original_number_heard_only_where_no_quiet_onset_is_measured",
  );
});

test("nothing heard, and nowhere to listen, are told apart", () => {
  const music = listening(220.5, {
    numbers: null,
    form: null,
    hearsOwnNumberFirst: false,
  });
  assert.equal(
    place([music]).reason,
    "original_number_not_heard_at_any_measured_onset",
  );
  assert.equal(
    place([]).reason,
    "no_listening_at_a_measured_onset_inside_cue_span",
  );
  const before = listening(218, {
    numbers: null,
    form: null,
    hearsOwnNumberFirst: false,
    insideEstimatedCueSpan: false,
  });
  assert.equal(
    place([before]).reason,
    "no_listening_at_a_measured_onset_inside_cue_span",
  );
});

test("another number written from the same start is a contradiction", () => {
  const five = listening(220.5);
  const six = { ...listening(220.5), numbers: [6], hearsOwnNumberFirst: false };
  assert.equal(
    place([five, six]).reason,
    "contradictory_spoken_number_at_same_start",
  );
  // Bare digits elsewhere in a sentence are not a second number.
  const bare = {
    ...listening(220.5),
    numbers: [6],
    form: "bare",
    hearsOwnNumberFirst: false,
  };
  assert.equal(place([five, bare]).outcome, "heard");
});

test("a number the whole-record recognition wrote twice must be bound to one segment only", () => {
  const five = listening(220.5);
  const rival = { id: 77, numbers: [5], start: 215, end: 225, reliable: true };
  assert.equal(
    place([five], [rival]).reason,
    "duplicate_original_cue_not_uniquely_bound_to_native_onset",
  );
  // The selected segment itself, a flagged rival, or one elsewhere does not block.
  assert.equal(place([five], [{ ...rival, id: 29 }]).outcome, "heard");
  assert.equal(place([five], [{ ...rival, reliable: false }]).outcome, "heard");
  assert.equal(
    place([five], [{ ...rival, start: 300, end: 310 }]).outcome,
    "heard",
  );
});

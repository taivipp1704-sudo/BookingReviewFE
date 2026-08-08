import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingStateDotTone,
  bookingStateTone,
  mergeBookingSnapshot,
} from "./bookingState.js";

test("pending review uses the same purple color family in badges and calendars", () => {
  assert.match(bookingStateTone("PENDING_REVIEW"), /purple/);
  assert.match(bookingStateDotTone("PENDING_REVIEW"), /purple/);
});

test("confirmed and in-use states keep their own calendar color families", () => {
  assert.match(bookingStateTone("CONFIRMED"), /blue/);
  assert.match(bookingStateDotTone("CONFIRMED"), /blue/);
  assert.match(bookingStateTone("IN_USE"), /green/);
  assert.match(bookingStateDotTone("IN_USE"), /green/);
});

test("every supported booking state has a synchronized badge and calendar tone", () => {
  const expectedFamilies = {
    PENDING_REVIEW: "purple",
    NEGOTIATION: "amber",
    CONDITIONAL: "yellow",
    TEMP_HOLD: "orange",
    CONFIRMED: "blue",
    READY_FOR_PICKUP: "cyan",
    IN_USE: "green",
    INCIDENT: "red",
    COMPLETED: "zinc",
    REJECTED: "rose",
  };

  for (const [state, family] of Object.entries(expectedFamilies)) {
    assert.match(bookingStateTone(state), new RegExp(family));
    assert.match(bookingStateDotTone(state), new RegExp(family));
  }
});

test("unknown booking states use neutral fallback tones", () => {
  assert.equal(bookingStateTone("UNKNOWN"), "border-line bg-white text-muted");
  assert.equal(bookingStateDotTone("UNKNOWN"), "bg-zinc-400");
});

test("a booking state update is merged into every UI snapshot", () => {
  const current = [
    { id: "ORD-1", state: "PENDING_REVIEW", customerName: "A" },
    { id: "ORD-2", state: "CONFIRMED", customerName: "B" },
  ];
  assert.deepEqual(
    mergeBookingSnapshot(current, { id: "ORD-1", state: "CONFIRMED" }),
    [
      { id: "ORD-1", state: "CONFIRMED", customerName: "A" },
      { id: "ORD-2", state: "CONFIRMED", customerName: "B" },
    ],
  );
});

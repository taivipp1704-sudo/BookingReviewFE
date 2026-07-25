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

import assert from "node:assert/strict";
import test from "node:test";
import {
  earlyPickupTimeForPickup,
  returnTimeForRentalDays,
  returnTimeForRentalRate,
} from "./rentalWindow.js";

test("early pickup defaults to 21:00 on the day before pickup", () => {
  assert.equal(
    earlyPickupTimeForPickup("2026-08-05T08:00"),
    "2026-08-04T21:00",
  );
});

test("early pickup returns an empty value for an invalid pickup time", () => {
  assert.equal(earlyPickupTimeForPickup(""), "");
});

test("changing to a two-day package keeps the selected return clock time", () => {
  assert.equal(
    returnTimeForRentalDays("2026-08-05T08:00", "2026-08-06T21:00", 2),
    "2026-08-07T21:00",
  );
});

test("two-day rate updates the return date by exactly two days", () => {
  assert.equal(
    returnTimeForRentalRate("2026-07-26T10:00", "2026-07-27T10:00", "TWO_DAY", 3),
    "2026-07-28T10:00",
  );
});

test("invalid or zero package duration falls back to one day", () => {
  assert.equal(
    returnTimeForRentalDays("2026-08-05T08:00", "2026-08-06T18:30", 0),
    "2026-08-06T18:30",
  );
});

test("hourly rate keeps the return clock time on the pickup date", () => {
  assert.equal(
    returnTimeForRentalRate("2026-08-05T08:00", "2026-08-06T21:00", "HOURLY", 3),
    "2026-08-05T21:00",
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  earlyPickupTimeForPickup,
  localDateTime,
  returnTimeForRentalDays,
  returnTimeForRentalRate,
} from "./rentalWindow.js";

test("local date-time output is suitable for datetime-local inputs", () => {
  assert.match(localDateTime(new Date("2026-08-05T08:00:00")), /^2026-08-05T08:00$/);
});

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

test("half-day rate updates the return time by exactly twelve hours", () => {
  assert.equal(
    returnTimeForRentalRate("2026-07-26T10:00", "2026-07-27T11:00", "HALF_DAY", 3),
    "2026-07-26T22:00",
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

test("invalid pickup values preserve the current return value", () => {
  assert.equal(returnTimeForRentalDays("invalid", "2026-08-06T18:30", 2), "2026-08-06T18:30");
  assert.equal(returnTimeForRentalRate("invalid", "2026-08-06T18:30", "HALF_DAY", 3), "2026-08-06T18:30");
  assert.equal(returnTimeForRentalRate("invalid", "2026-08-06T18:30", "HOURLY", 3), "2026-08-06T18:30");
});

test("missing return time reuses the pickup clock for day packages", () => {
  assert.equal(
    returnTimeForRentalDays("2026-08-05T08:15", "invalid", 2),
    "2026-08-07T08:15",
  );
});

test("multi-day and daily packages select their configured durations", () => {
  assert.equal(
    returnTimeForRentalRate("2026-08-05T08:00", "2026-08-06T21:00", "MULTI_DAY", 4),
    "2026-08-09T21:00",
  );
  assert.equal(
    returnTimeForRentalRate("2026-08-05T08:00", "2026-08-06T21:00", "DAILY", 9),
    "2026-08-06T21:00",
  );
});

test("hourly packages default to one hour when the return clock is missing or not later", () => {
  assert.equal(
    returnTimeForRentalRate("2026-08-05T08:00", "invalid", "HOURLY", 3),
    "2026-08-05T09:00",
  );
  assert.equal(
    returnTimeForRentalRate("2026-08-05T08:00", "2026-08-06T07:00", "HOURLY", 3),
    "2026-08-05T09:00",
  );
});

import test from "node:test";
import assert from "node:assert/strict";
import { holdSecondsUntil } from "./holdTimer.js";

test("timezone-less Render hold expiry is interpreted as UTC", () => {
  const now = Date.parse("2026-07-21T17:49:00Z");
  assert.equal(holdSecondsUntil("2026-07-21T17:54:00", now), 300);
});

test("timezone-aware hold expiry keeps its explicit offset", () => {
  const now = Date.parse("2026-07-22T00:49:00+07:00");
  assert.equal(holdSecondsUntil("2026-07-21T17:54:00Z", now), 300);
});

test("invalid or expired holds return zero", () => {
  const now = Date.parse("2026-07-21T17:49:00Z");
  assert.equal(holdSecondsUntil("invalid", now), 0);
  assert.equal(holdSecondsUntil("2026-07-21T17:48:00Z", now), 0);
});

test("empty holds and explicit numeric timezone offsets are handled", () => {
  const now = Date.parse("2026-07-21T17:49:00Z");
  assert.equal(holdSecondsUntil(null, now), 0);
  assert.equal(holdSecondsUntil(" 2026-07-22T00:54:00+07:00 ", now), 300);
  assert.equal(holdSecondsUntil("2026-07-22T00:54:00+0700", now), 300);
});

test("remaining partial seconds round up", () => {
  const now = Date.parse("2026-07-21T17:49:00.250Z");
  assert.equal(holdSecondsUntil("2026-07-21T17:49:01Z", now), 1);
});

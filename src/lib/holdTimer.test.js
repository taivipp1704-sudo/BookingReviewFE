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

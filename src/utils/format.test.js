import assert from "node:assert/strict";
import test from "node:test";
import {
  money,
  pricingModeLabel,
  rentalDurationLabel,
  rentalRates,
  shortDate,
} from "./format.js";

test("money and date values are formatted for Vietnamese users", () => {
  assert.match(money(1800000), /1\.800\.000/);
  assert.match(money(null), /0/);
  assert.equal(shortDate(null), "-");
  assert.match(shortDate("2026-08-05T08:00:00"), /05\/08\/2026/);
});

test("rental rates include every configured positive price", () => {
  const rates = rentalRates({
    hourlyPrice: 100,
    halfDayPrice: 500,
    dailyPrice: 900,
    twoDayPrice: 1700,
    multiDayPrice: 2400,
    multiDayDays: 4,
    extraDayPrice: 700,
  });
  assert.deepEqual(rates.map((rate) => rate.key), [
    "HOURLY", "HALF_DAY", "DAILY", "TWO_DAY", "MULTI_DAY", "EXTRA_DAY",
  ]);
  assert.equal(rates.find((rate) => rate.key === "MULTI_DAY").label, "Gói 4 ngày");
});

test("rental rates omit disabled options and keep a daily fallback", () => {
  assert.deepEqual(rentalRates({ dailyPrice: 1000 }), [
    { key: "DAILY", label: "1 ngày", value: 1000, suffix: "/ngày" },
  ]);
  assert.equal(
    rentalRates({ dailyPrice: 1000, multiDayPrice: 2000, multiDayDays: 1 })[1].label,
    "Gói 2 ngày",
  );
  assert.equal(
    rentalRates({ dailyPrice: 1000, multiDayPrice: 2000, multiDayDays: "invalid" })[1].label,
    "Gói 3 ngày",
  );
});

test("rental duration labels distinguish hourly and daily quotes", () => {
  assert.equal(rentalDurationLabel(null), "");
  assert.equal(rentalDurationLabel({ rentalMinutes: 720, rentalHours: 12 }), "12 giờ thuê");
  assert.equal(rentalDurationLabel({ rentalMinutes: 1440, rentalDays: 1 }), "1 ngày thuê");
});

test("pricing mode labels cover all billing modes", () => {
  assert.equal(pricingModeLabel(null), "");
  assert.equal(pricingModeLabel({ pricingMode: "HOURLY", billableUnits: 3 }), "3 giờ");
  assert.equal(pricingModeLabel({ pricingMode: "HALF_DAY" }), "Nửa ngày");
  assert.equal(pricingModeLabel({ pricingMode: "TWO_DAY" }), "Gói 2 ngày");
  assert.equal(pricingModeLabel({ pricingMode: "MULTI_DAY", extraDays: 0 }), "Gói 3 ngày");
  assert.equal(pricingModeLabel({ pricingMode: "MULTI_DAY", extraDays: 2 }), "Gói 3 ngày + 2 ngày");
  assert.equal(pricingModeLabel({ pricingMode: "DAILY", billableUnits: 4 }), "4 ngày");
});

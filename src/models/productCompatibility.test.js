import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compatibleAccessoryIds } from "./productCompatibility.js";

describe("compatibleAccessoryIds", () => {
  it("attaches the correct battery and charger for Canon R50", () => {
    const ids = compatibleAccessoryIds({ brand: "Canon", name: "Canon R50" });
    assert.ok(["ACC-BAT-LPE17", "ACC-CHG-LCE17", "ACC-CARD-SD64"].every((id) => ids.includes(id)));
  });

  it("uses the higher capacity card for Fuji XM5", () => {
    const ids = compatibleAccessoryIds({ name: "Fuji XM5" });
    assert.ok(ids.includes("ACC-CARD-SD128"));
    assert.ok(!ids.includes("ACC-CARD-SD64"));
  });

  it("uses Pocket 3 specific USB-C and microSD accessories", () => {
    const ids = compatibleAccessoryIds({ name: "DJI Pocket 3" });
    assert.ok(["ACC-POWER-POCKET3", "ACC-CHG-USBC", "ACC-CARD-MICROSD128"].every((id) => ids.includes(id)));
  });

  it("does not guess accessories for unknown products", () => {
    assert.deepEqual(compatibleAccessoryIds({ name: "Unknown camera" }), []);
  });
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingItemDetails, groupBookingItems } from "./bookingItems.js";

describe("booking item presentation", () => {
  it("uses API metadata and separates the main camera from accessories", () => {
    const grouped = groupBookingItems([
      { productId: "CAM-1", productName: "Canon G7X M2", levelCode: "L1", category: "Máy compact", quantity: 1 },
      { productId: "ACC-1", productName: "Pin Canon NB-13L", levelCode: "L2", category: "Pin", quantity: 2 },
    ]);
    assert.deepEqual(grouped.equipment.map((item) => item.productName), ["Canon G7X M2"]);
    assert.deepEqual(grouped.accessories.map((item) => item.productName), ["Pin Canon NB-13L"]);
  });

  it("falls back to catalog data for bookings created before metadata was returned", () => {
    const line = bookingItemDetails({ productId: "CAM-2", quantity: 1 }, {
      "CAM-2": { name: "Fuji XM5", levelCode: "L1", category: "Máy ảnh thay ống kính" },
    });
    assert.equal(line.productName, "Fuji XM5");
    assert.equal(line.levelCode, "L1");
  });

  it("keeps an unknown legacy line visible as an accessory", () => {
    const grouped = groupBookingItems([{ productId: "LEGACY", quantity: 1 }]);
    assert.equal(grouped.equipment.length, 0);
    assert.equal(grouped.accessories[0].productName, "LEGACY");
  });
});

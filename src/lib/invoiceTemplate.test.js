import assert from "node:assert/strict";
import test from "node:test";
import { invoiceHtml } from "./invoiceTemplate.js";

test("invoice renders booking, customer and equipment without executable input", () => {
  const html = invoiceHtml({
    entry: { id: "FIN-001", bookingId: "ORD-001", type: "RENTAL_PAYMENT", method: "TRANSFER", amount: 1800000, postedAt: "2027-05-05T10:00:00", note: "<script>alert(1)</script>" },
    booking: { customerName: "Nguyễn Văn A", phone: "0900000000", pickupTime: "2027-05-05T08:00:00", returnTime: "2027-05-06T08:00:00", items: [{ productId: "GEAR-001", quantity: 1 }] },
    products: [{ id: "GEAR-001", name: "Máy ảnh Sony" }],
  });
  assert.match(html, /HÓA ĐƠN GIÁ TRỊ GIA TĂNG/);
  assert.match(html, /Nguyễn Văn A/);
  assert.match(html, /Máy ảnh Sony/);
  assert.match(html, /Thuế suất GTGT/);
  assert.match(html, /Không chịu thuế GTGT/);
  assert.doesNotMatch(html, /Người mua hàng|Người bán hàng|Signature Valid|Ký bởi:/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

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
  assert.match(html, /Người mua hàng/);
  assert.match(html, /Người bán hàng/);
  assert.doesNotMatch(html, /Signature Valid|Ký bởi:/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});

test("invoice supports every finance type, missing booking data and zero values", () => {
  for (const type of ["DEPOSIT", "REFUND", "EXPENSE", "LATE_FEE", "CUSTOM", ""]) {
    const html = invoiceHtml({
      entry: { bookingId: "", type, amount: 0, postedAt: null },
      booking: null,
    });
    assert.match(html, /Không đồng chẵn/);
    assert.match(html, /Chưa cung cấp/);
    assert.match(html, /00000000/);
  }
});

test("invoice distributes rental totals across multiple products and quantities", () => {
  const html = invoiceHtml({
    entry: { id: "FIN-42", bookingId: "ORD-42", type: "RENTAL_PAYMENT", amount: 1001, note: "A&B's \"quote\"" },
    booking: {
      customerName: "A & B",
      items: [
        { productId: "KNOWN", quantity: 2 },
        { productId: "MISSING", quantity: 0 },
      ],
    },
    products: [{ id: "KNOWN", name: "Camera", dailyPrice: 500 }],
  });
  assert.match(html, /A &amp; B/);
  assert.match(html, /Camera/);
  assert.match(html, /MISSING/);
  assert.match(html, /A&amp;B&#39;s &quot;quote&quot;/);
});

test("Vietnamese amount wording covers all numeric grammar decisions", () => {
  const amounts = [1, 5, 10, 11, 15, 20, 21, 25, 100, 101, 105, 1000, 1001, 1010, 1100, 1000000, 1001001, 1000000001];
  for (const amount of amounts) {
    const html = invoiceHtml({
      entry: { id: `FIN-${amount}`, type: "DEPOSIT", amount },
      booking: { customerName: "Test" },
    });
    assert.match(html, /đồng chẵn/);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  bookingAuditLabel,
  supportStatusLabel,
  supportTypeLabel,
} from "./adminPresentation.js";

test("bookingAuditLabel translates direct audit actions", () => {
  assert.equal(bookingAuditLabel("BOOKING_CREATED"), "Đã tạo đơn thuê");
});

test("bookingAuditLabel translates state transitions with shared booking labels", () => {
  assert.equal(
    bookingAuditLabel("BOOKING_PENDING_REVIEW_TO_CONFIRMED", {
      PENDING_REVIEW: "Chờ duyệt",
      CONFIRMED: "Đã xác nhận",
    }),
    "Chuyển trạng thái: Chờ duyệt → Đã xác nhận",
  );
});

test("bookingAuditLabel formats unknown transition states", () => {
  assert.equal(
    bookingAuditLabel("BOOKING_CUSTOM_STATE_TO_NEXT_STATE"),
    "Chuyển trạng thái: CUSTOM STATE → NEXT STATE",
  );
});

test("bookingAuditLabel safely handles unknown actions", () => {
  assert.equal(bookingAuditLabel("SOMETHING_NEW"), "Đã cập nhật đơn thuê");
  assert.equal(bookingAuditLabel(null), "Đã cập nhật đơn thuê");
});

test("support presentation labels known and unknown values", () => {
  assert.equal(supportStatusLabel("OPEN"), "Mới");
  assert.equal(supportStatusLabel("UNKNOWN"), "Chưa xác định");
  assert.equal(supportTypeLabel("EQUIPMENT_ISSUE"), "Sự cố thiết bị");
  assert.equal(supportTypeLabel("UNKNOWN"), "Yêu cầu hỗ trợ");
});

const auditActionLabels = {
  BOOKING_CREATED: "Đã tạo đơn thuê",
  BOOKING_AUTO_ALLOCATED: "Hệ thống đã tự phân bổ thiết bị",
  EARLY_PICKUP_REQUESTED: "Khách yêu cầu nhận máy sớm",
  EARLY_PICKUP_APPROVED: "Đã duyệt nhận máy sớm",
  EARLY_PICKUP_REJECTED: "Đã từ chối nhận máy sớm",
  IDENTITY_DOCUMENT_UPLOADED: "Khách đã tải ảnh CCCD",
  IDENTITY_DOCUMENT_VIEWED: "Đã xem ảnh CCCD",
  PAYMENT_PROOF_UPLOADED: "Khách đã tải ảnh chuyển khoản",
  PAYMENT_PROOF_VIEWED: "Đã xem ảnh chuyển khoản",
  PAYMENT_RECORDED: "Đã ghi nhận thanh toán",
  FINANCE_CHARGE_PROPOSED: "Đã đề xuất khoản phí",
  FINANCE_CHARGE_CONFIRMED: "Đã xác nhận khoản phí",
  FINANCE_CHARGE_CANCELLED: "Đã hủy khoản phí",
  SETTLEMENT_APPROVED: "Đã duyệt quyết toán",
  REFUND_SUCCEEDED: "Đã hoàn tiền",
  FINANCIAL_CLOSED: "Đã đóng quyết toán",
};

const supportStatusLabels = {
  OPEN: "Mới",
  IN_REVIEW: "Đang xử lý",
  RESOLVED: "Đã hoàn tất",
};

const supportTypeLabels = {
  EQUIPMENT_ISSUE: "Sự cố thiết bị",
  EARLY_RETURN: "Trả máy sớm",
  EARLY_PICKUP: "Nhận máy sớm",
  PAYMENT: "Thanh toán",
  BOOKING: "Đơn thuê",
  OTHER: "Khác",
};

export function bookingAuditLabel(action, bookingLabels = {}) {
  if (auditActionLabels[action]) return auditActionLabels[action];

  const transition = /^BOOKING_(.+)_TO_(.+)$/.exec(action || "");
  if (!transition) return "Đã cập nhật đơn thuê";

  const from = bookingLabels[transition[1]] || transition[1].replaceAll("_", " ");
  const to = bookingLabels[transition[2]] || transition[2].replaceAll("_", " ");
  return `Chuyển trạng thái: ${from} → ${to}`;
}

export function supportStatusLabel(status) {
  return supportStatusLabels[status] || "Chưa xác định";
}

export function supportTypeLabel(type) {
  return supportTypeLabels[type] || "Yêu cầu hỗ trợ";
}

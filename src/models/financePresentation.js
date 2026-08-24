const directionLabels = {
  DEBIT: "Ghi Nợ",
  CREDIT: "Ghi Có",
};

const accountLabels = {
  CASH_MAIN: "Quỹ tiền chính",
  RENTAL_REVENUE: "Doanh thu cho thuê",
  UNEARNED_RENTAL_REVENUE: "Doanh thu chưa tính (đang giữ hộ)",
  CUSTOMER_OVERPAYMENT_LIABILITY: "Tiền khách thanh toán thừa",
  CUSTOMER_DEPOSIT_LIABILITY: "Tiền cọc của khách",
  CUSTOMER_RECOVERY: "Tiền khách bồi hoàn",
  ACCOUNTS_RECEIVABLE: "Tiền khách còn nợ",
  REFUND_PAYABLE: "Khoản hoàn trả khách",
  LATE_FEE_REVENUE: "Doanh thu phí trả trễ",
  DAMAGE_FEE_REVENUE: "Doanh thu bồi thường hư hỏng",
  DIRECT_COST: "Chi phí trực tiếp",
  OPERATING_EXPENSE: "Chi phí vận hành",
  VENDOR_PAYABLE: "Tiền còn nợ nhà cung cấp",
};

const documentTypeLabels = {
  PAYMENT_RECEIPT: "Phiếu thu",
  RENTAL_REVENUE_RECOGNITION: "Ghi nhận doanh thu cho thuê",
  BOOKING_SETTLEMENT: "Quyết toán đơn thuê",
  CUSTOMER_REFUND: "Hoàn tiền khách hàng",
  FINANCE_ADJUSTMENT: "Điều chỉnh tài chính",
  EXPENSE_RECOGNITION: "Ghi nhận chi phí",
  EXPENSE_PAYMENT: "Chi tiền cho nhà cung cấp",
  REFUND_PAYOUT: "Chi tiền hoàn cọc",
};

const statusLabels = {
  OPEN: "Đang mở",
  POSTED: "Đã ghi sổ",
  REVERSED: "Đã đảo",
  SOFT_LOCKED: "Khóa tạm",
  HARD_LOCKED: "Khóa cứng",
  SUBMITTED: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  PARTIALLY_PAID: "Đã chi một phần",
  PAID: "Đã chi đủ",
  READY: "Sẵn sàng duyệt",
  ON_HOLD: "Đang tạm giữ",
  REOPENED: "Đã mở lại",
  REFUND_PENDING: "Chờ hoàn tiền",
  CLOSED: "Đã đóng",
  PROCESSING: "Đang xử lý",
  FAILED: "Thất bại",
  SUCCEEDED: "Đã hoàn thành",
  CANCELLED: "Đã hủy",
  RETURNED: "Đã trả lại",
  PROPOSED: "Chờ duyệt",
  CONFIRMED: "Đã duyệt",
};

const chargeTypeLabels = {
  EXTENSION: "Gia hạn",
  LATE_FEE: "Phí trả trễ",
  MISSING: "Thiếu/mất",
  DAMAGE: "Hư hỏng",
  CUSTOMER_COMPENSATION: "Bồi thường",
  REFUND_ADJUSTMENT: "Điều chỉnh hoàn",
};

const expenseCategoryLabels = {
  MAINTENANCE: "Bảo trì",
  REPAIR: "Sửa chữa",
  PARTS: "Linh kiện",
  LOGISTICS: "Điều chuyển",
  OTHER: "Khác",
};

const inventoryMovementLabels = {
  ASSET_RECEIPT: "Nhập serial mới",
  ASSET_STATUS_CHANGED: "Đổi tình trạng máy",
  ASSET_RETIRED: "Lưu kho, ngừng dùng",
  STOCK_ADJUSTMENT: "Điều chỉnh tồn kho",
};

const assetStatusLabels = {
  AVAILABLE: "Sẵn sàng",
  IN_USE: "Đang cho thuê",
  REPAIR: "Đang sửa chữa",
  RETIRED: "Đã lưu kho",
};

function readableCode(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/_/g, " ")
    .toLocaleLowerCase("vi-VN");

  return normalized
    ? normalized.charAt(0).toLocaleUpperCase("vi-VN") + normalized.slice(1)
    : "";
}

export function financeEntryLabel(direction, accountCode) {
  const directionLabel = directionLabels[direction] || readableCode(direction);
  const accountLabel = accountLabels[accountCode] || readableCode(accountCode);
  return [directionLabel, accountLabel].filter(Boolean).join(" · ");
}

export function financeDocumentTypeLabel(value) {
  const code = String(value || "").trim();
  if (code.startsWith("REVERSAL_")) {
    const original = financeDocumentTypeLabel(code.slice("REVERSAL_".length));
    return original ? `Đảo ${original.toLocaleLowerCase("vi-VN")}` : "Chứng từ đảo";
  }
  return documentTypeLabels[code] || readableCode(code);
}

export function financeStatusLabel(value) {
  return statusLabels[value] || readableCode(value);
}

export function financeChargeTypeLabel(value) {
  return chargeTypeLabels[value] || readableCode(value);
}

export function financeExpenseCategoryLabel(value) {
  return expenseCategoryLabels[value] || readableCode(value);
}

export function inventoryMovementLabel(value) {
  return inventoryMovementLabels[value] || readableCode(value);
}

export function assetStatusLabel(value) {
  return assetStatusLabels[value] || readableCode(value);
}

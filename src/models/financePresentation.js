const directionLabels = {
  DEBIT: "Ghi Nợ",
  CREDIT: "Ghi Có",
};

const accountLabels = {
  CASH_MAIN: "Quỹ tiền chính",
  RENTAL_REVENUE: "Doanh thu cho thuê",
  UNEARNED_RENTAL_REVENUE: "Doanh thu cho thuê chưa ghi nhận",
  CUSTOMER_OVERPAYMENT_LIABILITY: "Tiền khách thanh toán thừa",
  CUSTOMER_DEPOSIT_LIABILITY: "Tiền cọc của khách",
  ACCOUNTS_RECEIVABLE: "Công nợ phải thu",
  REFUND_PAYABLE: "Khoản hoàn trả khách",
  LATE_FEE_REVENUE: "Doanh thu phí trả trễ",
  DAMAGE_FEE_REVENUE: "Doanh thu bồi thường hư hỏng",
  DIRECT_COST: "Chi phí trực tiếp",
};

const documentTypeLabels = {
  PAYMENT_RECEIPT: "Phiếu thu",
  RENTAL_REVENUE_RECOGNITION: "Ghi nhận doanh thu cho thuê",
  BOOKING_SETTLEMENT: "Quyết toán đơn thuê",
  CUSTOMER_REFUND: "Hoàn tiền khách hàng",
  FINANCE_ADJUSTMENT: "Điều chỉnh tài chính",
};

const statusLabels = {
  POSTED: "Đã ghi sổ",
  REVERSED: "Đã đảo",
  SOFT_LOCKED: "Khóa tạm",
  HARD_LOCKED: "Khóa cứng",
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

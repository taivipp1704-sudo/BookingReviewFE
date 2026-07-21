import { money } from "./format.js";

const SELLER = {
  name: "AMY DIGITAL",
  taxCode: "Chưa cấu hình",
  address: "Cập nhật địa chỉ đơn vị trong cấu hình triển khai",
  email: "contact@amydigital.local",
  phone: "Chưa cấu hình",
  bankAccount: "Chưa cấu hình",
};

const typeLabel = {
  RENTAL_PAYMENT: "Dịch vụ cho thuê thiết bị",
  DEPOSIT: "Tiền đặt cọc thiết bị",
  REFUND: "Hoàn tiền giao dịch",
  EXPENSE: "Chi phí vận hành",
  LATE_FEE: "Phí trả thiết bị trễ",
};

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;",
  })[char]);
}

function dateTime(value) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(new Date(value)) : "-";
}

function numberInWords(value) {
  const digits = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];
  const readTriple = (number, full) => {
    const hundred = Math.floor(number / 100);
    const ten = Math.floor((number % 100) / 10);
    const one = number % 10;
    const words = [];
    if (hundred > 0 || full) words.push(`${digits[hundred]} trăm`);
    if (ten > 1) words.push(`${digits[ten]} mươi`);
    else if (ten === 1) words.push("mười");
    else if (one > 0 && (hundred > 0 || full)) words.push("lẻ");
    if (one > 0) {
      if (one === 1 && ten > 1) words.push("mốt");
      else if (one === 5 && ten > 0) words.push("lăm");
      else words.push(digits[one]);
    }
    return words.join(" ");
  };
  let number = Math.max(0, Math.round(Number(value || 0)));
  if (number === 0) return "Không đồng chẵn";
  const groups = [];
  while (number > 0) { groups.push(number % 1000); number = Math.floor(number / 1000); }
  const words = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    if (groups[index] === 0) continue;
    words.push(readTriple(groups[index], index < groups.length - 1 && groups[index] < 100));
    if (units[index]) words.push(units[index]);
  }
  const result = words.join(" ").replace(/\s+/g, " ").trim();
  return `${result.charAt(0).toUpperCase()}${result.slice(1)} đồng chẵn`;
}

function qrMarkup(value) {
  const size = 25;
  let seed = [...String(value || "AMY")].reduce((hash, char) => ((hash * 31) ^ char.charCodeAt(0)) >>> 0, 2166136261);
  const finder = (x, y, ox, oy) => {
    const dx = x - ox;
    const dy = y - oy;
    if (dx < 0 || dx > 6 || dy < 0 || dy > 6) return null;
    return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
  };
  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const fixed = finder(x, y, 1, 1) ?? finder(x, y, size - 8, 1) ?? finder(x, y, 1, size - 8);
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      cells.push(`<i class="${fixed === null ? ((seed >>> 0) % 3 ? "" : "on") : (fixed ? "on" : "")}"></i>`);
    }
  }
  return `<div class="qr" aria-label="Mã tra cứu giao dịch">${cells.join("")}</div>`;
}

function invoiceLines(entry, booking, productById, amount) {
  const items = booking?.items || [];
  if (!items.length || entry.type !== "RENTAL_PAYMENT") {
    return [{ name: typeLabel[entry.type] || entry.type || "Dịch vụ thuê thiết bị", unit: "Lần", quantity: 1, unitPrice: amount, total: amount }];
  }
  const weights = items.map((item) => Math.max(1, Number(productById[item.productId]?.dailyPrice || 0) * Number(item.quantity || 1)));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  let remaining = amount;
  return items.map((item, index) => {
    const quantity = Math.max(1, Number(item.quantity || 1));
    const total = index === items.length - 1 ? remaining : Math.round(amount * weights[index] / totalWeight);
    remaining -= total;
    return {
      name: productById[item.productId]?.name || item.productId,
      unit: "Bộ",
      quantity,
      unitPrice: Math.round(total / quantity),
      total,
    };
  });
}

export function invoiceHtml({ entry, booking, products = [] }) {
  const productById = Object.fromEntries(products.map((item) => [item.id, item]));
  const amount = Math.abs(Number(entry.amount || 0));
  const invoiceDate = new Date(entry.postedAt || Date.now());
  const invoiceNumber = String(entry.id || "").replace(/\D/g, "").slice(-8).padStart(8, "0");
  const lines = invoiceLines(entry, booking, productById, amount);
  const rows = lines.map((line, index) => `<tr><td class="center">${index + 1}</td><td><strong>${escapeHtml(line.name)}</strong>${entry.note && index === 0 ? `<small>${escapeHtml(entry.note)}</small>` : ""}</td><td class="center">${escapeHtml(line.unit)}</td><td class="number">${line.quantity.toLocaleString("vi-VN")}</td><td class="number">${escapeHtml(money(line.unitPrice))}</td><td class="number">${escapeHtml(money(line.total))}</td><td class="center">KCT</td><td class="number">0 đ</td></tr>`).join("");
  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hóa đơn ${escapeHtml(entry.id)}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#e7edf0;color:#111;font-family:"Times New Roman",serif}.toolbar{position:sticky;top:0;z-index:5;display:flex;justify-content:center;gap:10px;padding:12px;background:#111}.toolbar button{border:0;border-radius:4px;background:#d7ff3f;padding:10px 18px;font:700 13px Arial;cursor:pointer}.sheet{position:relative;width:794px;min-height:1123px;margin:22px auto;background:#fff;padding:31px 28px 38px;border:9px double #178dca;box-shadow:0 14px 42px #17212b26}.sheet:after{content:"";position:absolute;inset:7px;border:2px dotted #56aee0;pointer-events:none}.content{position:relative;z-index:1}.watermark{position:absolute;z-index:0;left:50%;top:52%;width:330px;height:330px;border:12px double #1689c70c;border-radius:50%;transform:translate(-50%,-50%);display:grid;place-items:center;color:#1689c70d;font:bold 48px Arial;text-align:center}.seller{font-size:12px;line-height:1.55}.seller h1{margin:0;font-size:19px}.rule{border:0;border-top:1px solid #222;margin:9px 0 5px}.invoice-head{display:grid;grid-template-columns:1fr 155px;align-items:start;text-align:center}.invoice-head h2{margin:0;font-size:21px}.invoice-head p{margin:4px 0;font-size:12px;font-style:italic}.meta{text-align:left;font-size:12px;line-height:1.7}.buyer-wrap{display:grid;grid-template-columns:1fr 92px;gap:12px;margin-top:10px}.buyer{font-size:12px;line-height:1.7}.buyer .row{display:grid;grid-template-columns:155px 1fr}.qr{width:82px;height:82px;display:grid;grid-template-columns:repeat(25,1fr);grid-template-rows:repeat(25,1fr);background:#fff;border:4px solid #fff;box-shadow:0 0 0 1px #111}.qr i{display:block}.qr i.on{background:#000}.qr-code{margin-top:5px;text-align:center;font:8px Arial;word-break:break-all}.items{width:100%;margin-top:8px;border-collapse:collapse;font-size:10px}.items th,.items td{border:1px solid #555;padding:6px 4px}.items th{text-align:center;font-size:10px}.items .number{text-align:right}.items .center{text-align:center}.items small{display:block;margin-top:3px;font-style:italic;color:#555}.blank td{height:78px}.summary{width:100%;border-collapse:collapse;font-size:10px}.summary th,.summary td{border:1px solid #555;padding:5px}.summary th{text-align:center}.summary .number{text-align:right;font-weight:bold}.summary .grand{font-size:11px;font-weight:bold}.words{border:1px solid #555;border-top:0;padding:7px;font-size:11px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:70px;margin-top:12px;text-align:center;font-size:12px}.signatures strong{display:block}.signatures em{display:block;margin-top:3px}.signature-space{height:82px}.digital-signature{width:230px;margin:0 auto;border:1px solid #67bb67;background:#effbef;padding:8px;text-align:left;font:700 10px Arial;color:#d22}.digital-signature b{display:block;margin-top:5px;color:#159447}.legal-note{margin-top:7px;text-align:center;font:9px Arial;color:#666}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;box-shadow:none;width:100%;min-height:100vh}}@media(max-width:820px){.sheet{width:100%;margin:0;border-width:6px;padding:22px 15px}.invoice-head{grid-template-columns:1fr}.meta{margin:7px auto 0}.buyer .row{grid-template-columns:125px 1fr}.items{font-size:8px}.signatures{gap:15px}}
</style></head><body>
<div class="toolbar"><button onclick="window.print()">IN / LƯU PDF</button><button onclick="window.close()">ĐÓNG</button></div>
<main class="sheet"><div class="watermark">AMY<br>DIGITAL</div><div class="content">
  <section class="seller"><h1>${escapeHtml(SELLER.name)}</h1><div>Mã số thuế: ${escapeHtml(SELLER.taxCode)}</div><div>Địa chỉ: ${escapeHtml(SELLER.address)}</div><div>Email: ${escapeHtml(SELLER.email)} · Điện thoại: ${escapeHtml(SELLER.phone)}</div><div>Số tài khoản: ${escapeHtml(SELLER.bankAccount)}</div></section>
  <hr class="rule">
  <section class="invoice-head"><div><h2>HÓA ĐƠN GIÁ TRỊ GIA TĂNG</h2><p>Ngày ${invoiceDate.getDate()} tháng ${invoiceDate.getMonth() + 1} năm ${invoiceDate.getFullYear()}</p><p>Mã giao dịch: ${escapeHtml(entry.id)}</p></div><div class="meta"><div>Ký hiệu: <strong>AMY26E</strong></div><div>Số: <strong>${escapeHtml(invoiceNumber)}</strong></div></div></section>
  <section class="buyer-wrap"><div class="buyer"><div class="row"><strong>Tên đơn vị/người mua:</strong><span>${escapeHtml(booking?.customerName || "-")}</span></div><div class="row"><strong>MST/CCCD:</strong><span>Chưa cung cấp</span></div><div class="row"><strong>Địa chỉ:</strong><span>Chưa cung cấp</span></div><div class="row"><strong>Điện thoại:</strong><span>${escapeHtml(booking?.phone || "-")}</span></div><div class="row"><strong>Mã đơn thuê:</strong><span>${escapeHtml(entry.bookingId || "-")}</span></div><div class="row"><strong>Thời gian thuê:</strong><span>${escapeHtml(booking ? `${dateTime(booking.pickupTime)} - ${dateTime(booking.returnTime)}` : "-")}</span></div><div class="row"><strong>Hình thức thanh toán:</strong><span>${escapeHtml(entry.method || "TM/CK")}</span></div></div><div>${qrMarkup(entry.bookingId || entry.id)}<div class="qr-code">${escapeHtml(entry.bookingId || entry.id)}</div></div></section>
  <table class="items"><thead><tr><th style="width:32px">STT</th><th>Tên hàng hóa, dịch vụ</th><th style="width:45px">Đơn vị tính</th><th style="width:45px">Số lượng</th><th style="width:82px">Đơn giá</th><th style="width:88px">Thành tiền</th><th style="width:48px">Thuế suất GTGT</th><th style="width:68px">Tiền thuế GTGT</th></tr></thead><tbody>${rows}<tr class="blank"><td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr></tbody></table>
  <table class="summary"><thead><tr><th>Tổng hợp</th><th>Thành tiền trước thuế GTGT</th><th>Tiền thuế GTGT</th><th>Cộng tiền thanh toán</th></tr></thead><tbody><tr><td>Không kê khai thuế GTGT</td><td></td><td></td><td></td></tr><tr><td>Không chịu thuế GTGT</td><td class="number">${escapeHtml(money(amount))}</td><td class="number">0 đ</td><td class="number">${escapeHtml(money(amount))}</td></tr><tr><td>Thuế suất 0%</td><td></td><td></td><td></td></tr><tr><td>Thuế suất 5%</td><td></td><td></td><td></td></tr><tr><td>Thuế suất 8%</td><td></td><td></td><td></td></tr><tr><td>Thuế suất 10%</td><td></td><td></td><td></td></tr><tr><td>Thuế suất khác</td><td></td><td></td><td></td></tr><tr class="grand"><td>Tổng cộng</td><td class="number">${escapeHtml(money(amount))}</td><td class="number">0 đ</td><td class="number">${escapeHtml(money(amount))}</td></tr></tbody></table>
  <div class="words">Số tiền viết bằng chữ: <strong><em>${escapeHtml(numberInWords(amount))}.</em></strong></div>
  <section class="signatures"><div><strong>Người mua hàng</strong><em>(Chữ ký số nếu có)</em><div class="signature-space"></div></div><div><strong>Người bán hàng</strong><em>(Chữ ký điện tử, chữ ký số)</em><div class="signature-space"></div><div class="digital-signature">Signature Valid<b>Ký bởi: ${escapeHtml(SELLER.name)}</b><span>Ký ngày: ${invoiceDate.toLocaleDateString("vi-VN")}</span></div></div></section>
  <p class="legal-note">Bản chứng từ nội bộ mô phỏng theo mẫu hóa đơn GTGT. Chỉ có giá trị pháp lý khi được phát hành qua nhà cung cấp hóa đơn điện tử hợp lệ.</p>
</div></main></body></html>`;
}

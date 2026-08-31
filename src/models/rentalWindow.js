export function localDateTime(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export function earlyPickupTimeForPickup(pickupTime) {
  const pickup = new Date(pickupTime);
  if (Number.isNaN(pickup.getTime())) return "";

  const earlyPickup = new Date(pickup);
  earlyPickup.setDate(earlyPickup.getDate() - 1);
  earlyPickup.setHours(21, 0, 0, 0);
  return localDateTime(earlyPickup);
}

export function earlyPickupTimeError(pickupTime, earlyPickup, earlyPickupTime) {
  if (!earlyPickup) return "";
  if (!pickupTime) {
    return "Vui lòng chọn giờ nhận máy trước khi yêu cầu nhận máy sớm.";
  }
  if (!earlyPickupTime) {
    return "Vui lòng chọn giờ nhận máy sớm mong muốn.";
  }

  const pickup = new Date(pickupTime);
  const requested = new Date(earlyPickupTime);
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(requested.getTime())) {
    return "Giờ nhận máy sớm không hợp lệ.";
  }

  const earliest = new Date(earlyPickupTimeForPickup(pickupTime));
  if (requested < earliest) {
    return "Giờ nhận sớm không được trước 21:00 tối hôm trước ngày nhận máy.";
  }
  if (requested > pickup) {
    return "Giờ nhận sớm không được muộn hơn giờ nhận máy đã chọn.";
  }
  return "";
}

export function returnTimeForRentalDays(pickupTime, currentReturnTime, rentalDays) {
  const pickup = new Date(pickupTime);
  const currentReturn = new Date(currentReturnTime);
  const days = Math.max(1, Math.trunc(Number(rentalDays) || 1));

  if (Number.isNaN(pickup.getTime())) return currentReturnTime;

  const adjustedReturn = new Date(pickup);
  adjustedReturn.setDate(adjustedReturn.getDate() + days);
  adjustedReturn.setHours(
    Number.isNaN(currentReturn.getTime()) ? pickup.getHours() : currentReturn.getHours(),
    Number.isNaN(currentReturn.getTime()) ? pickup.getMinutes() : currentReturn.getMinutes(),
    0,
    0,
  );
  return localDateTime(adjustedReturn);
}

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 1_440;

function ceilDivide(minutes, divisor) {
  return Math.max(1, Math.ceil(minutes / divisor));
}

// Xác định gói giá phù hợp với khoảng thời gian nhận/trả máy thực tế, dùng
// khi khách tự chỉnh giờ nhận hoặc giờ trả (không bấm nút chọn gói). Logic
// này phải khớp với nhánh tự nhận diện (requestedMode == null) trong
// RentalPricing.calculateProduct ở backend, để nút gói đang tô đậm và giá
// hiển thị luôn đúng với báo giá thực trả về từ server — kể cả khi khách
// chọn khoảng ngày tùy ý (4 ngày trở lên) thay vì bấm sẵn một gói.
export function detectRentalRate(pickupTime, returnTime, pricingSource) {
  const pickup = new Date(pickupTime);
  const returns = new Date(returnTime);
  if (Number.isNaN(pickup.getTime()) || Number.isNaN(returns.getTime())) {
    return "DAILY";
  }

  const minutes = Math.max(1, Math.round((returns.getTime() - pickup.getTime()) / 60_000));
  const hourly = Number(pricingSource?.hourlyPrice) || 0;
  const halfDay = Number(pricingSource?.halfDayPrice) || 0;
  const packageDays = Math.max(2, Number(pricingSource?.multiDayDays) || 3);

  if (minutes <= 12 * MINUTES_PER_HOUR && (hourly > 0 || halfDay > 0)) {
    const hours = ceilDivide(minutes, MINUTES_PER_HOUR);
    const hourlyTotal = hourly > 0 ? hourly * hours : null;
    if (halfDay > 0 && (hourlyTotal === null || halfDay <= hourlyTotal)) return "HALF_DAY";
    return "HOURLY";
  }

  const days = ceilDivide(minutes, MINUTES_PER_DAY);
  if (days === 1) return "DAILY";
  if (days === 2) return "TWO_DAY";
  if (days < packageDays) return "DAILY";
  return "MULTI_DAY";
}

export function returnTimeForRentalRate(
  pickupTime,
  currentReturnTime,
  pricingMode,
  multiDayDays,
) {
  if (pricingMode === "HALF_DAY") {
    const pickup = new Date(pickupTime);
    if (Number.isNaN(pickup.getTime())) return currentReturnTime;
    pickup.setTime(pickup.getTime() + 12 * 60 * 60 * 1000);
    return localDateTime(pickup);
  }

  if (pricingMode !== "HOURLY") {
    const rentalDays = pricingMode === "TWO_DAY"
      ? 2
      : pricingMode === "MULTI_DAY"
        ? multiDayDays
        : 1;
    return returnTimeForRentalDays(
      pickupTime,
      currentReturnTime,
      rentalDays,
    );
  }

  const pickup = new Date(pickupTime);
  const currentReturn = new Date(currentReturnTime);
  if (Number.isNaN(pickup.getTime())) return currentReturnTime;

  const adjustedReturn = new Date(pickup);
  if (!Number.isNaN(currentReturn.getTime())) {
    adjustedReturn.setHours(currentReturn.getHours(), currentReturn.getMinutes(), 0, 0);
  }
  if (adjustedReturn <= pickup) {
    adjustedReturn.setTime(pickup.getTime() + 60 * 60 * 1000);
  }
  return localDateTime(adjustedReturn);
}

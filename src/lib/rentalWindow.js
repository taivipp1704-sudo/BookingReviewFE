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

export function returnTimeForRentalRate(
  pickupTime,
  currentReturnTime,
  pricingMode,
  multiDayDays,
) {
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

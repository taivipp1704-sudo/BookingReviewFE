const bookingStateTones = {
  PENDING_REVIEW: "border-purple-100 bg-purple-50 text-purple-700",
  NEGOTIATION: "border-amber-200 bg-amber-50 text-amber-800",
  CONDITIONAL: "border-yellow-200 bg-yellow-50 text-yellow-800",
  TEMP_HOLD: "border-orange-100 bg-orange-50 text-orange-700",
  CONFIRMED: "border-blue-100 bg-blue-50 text-blue-700",
  READY_FOR_PICKUP: "border-cyan-200 bg-cyan-50 text-cyan-800",
  IN_USE: "border-green-100 bg-green-50 text-green-700",
  INCIDENT: "border-red-100 bg-red-50 text-red-700",
  COMPLETED: "border-zinc-200 bg-zinc-50 text-zinc-700",
  REJECTED: "border-rose-100 bg-rose-50 text-rose-700",
};

const bookingStateDotTones = {
  PENDING_REVIEW: "bg-purple-600",
  NEGOTIATION: "bg-amber-600",
  CONDITIONAL: "bg-yellow-500",
  TEMP_HOLD: "bg-orange-600",
  CONFIRMED: "bg-blue-600",
  READY_FOR_PICKUP: "bg-cyan-600",
  IN_USE: "bg-green-600",
  INCIDENT: "bg-red-600",
  COMPLETED: "bg-zinc-500",
  REJECTED: "bg-rose-600",
};

export function bookingStateTone(state) {
  return bookingStateTones[state] || "border-line bg-white text-muted";
}

export function bookingStateDotTone(state) {
  return bookingStateDotTones[state] || "bg-zinc-400";
}

export function mergeBookingSnapshot(bookings, updated) {
  return bookings.map((booking) =>
    booking.id === updated.id ? { ...booking, ...updated } : booking,
  );
}

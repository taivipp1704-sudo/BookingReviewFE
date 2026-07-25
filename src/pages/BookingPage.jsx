import {
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import StatusBadge from "../components/StatusBadge.jsx";
import BookingJourney from "../components/BookingJourney.jsx";
import SecureImagePreview from "../components/SecureImagePreview.jsx";
import { api } from "../lib/api.js";
import { money, pricingModeLabel, rentalDurationLabel, rentalRates } from "../lib/format.js";
import { holdSecondsUntil } from "../lib/holdTimer.js";
import {
  earlyPickupTimeForPickup,
  localDateTime,
  returnTimeForRentalRate,
} from "../lib/rentalWindow.js";

const paymentAccount = {
  bank: import.meta.env.VITE_PAYMENT_BANK || "MB BANK",
  accountNumber: import.meta.env.VITE_PAYMENT_ACCOUNT_NUMBER || "0123456789",
  accountName: import.meta.env.VITE_PAYMENT_ACCOUNT_NAME || "AMY DIGITAL",
};

function unavailableRangeMessage(products, pickupTime, returnTime) {
  const pickup = new Date(pickupTime).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
  const returns = new Date(returnTime).toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
  return `Không còn đủ ${products.join(", ")} từ ${pickup} đến ${returns}. Số lượng trong khung này đã được giữ; hãy chọn khung giờ màu xanh trên lịch.`;
}

function commitmentFingerprint(quote) {
  if (!quote) return "";
  return JSON.stringify([
    quote.totalAmount,
    quote.equipmentDeposit,
    quote.bookingDeposit,
    quote.amountDueNow,
    quote.identityViolationFee,
    quote.unauthorizedTransferFee,
    quote.lateFeePerHour,
    quote.impactPenaltyPercent,
    quote.damageLiabilityLimit,
  ].map((value) => Number(value || 0)));
}

export function RentalCalendar({
  month,
  schedule,
  totalQty,
  pickupTime,
  expanded,
  onMonth,
  onPick,
  onToggleExpanded,
}) {
  const pickupDate = new Date(pickupTime);
  const [selectedDay, setSelectedDay] = useState(() =>
    new Date(pickupDate.getFullYear(), pickupDate.getMonth(), pickupDate.getDate()),
  );
  const [zoom, setZoom] = useState(1);
  const [calendarView, setCalendarView] = useState("WEEK");

  useEffect(() => {
    const pickup = new Date(pickupTime);
    if (!Number.isNaN(pickup.getTime())) {
      setSelectedDay(
        new Date(pickup.getFullYear(), pickup.getMonth(), pickup.getDate()),
      );
    }
  }, [pickupTime]);

  useEffect(() => {
    setSelectedDay((current) =>
      current.getFullYear() === month.getFullYear() && current.getMonth() === month.getMonth()
        ? current
        : new Date(month.getFullYear(), month.getMonth(), 1),
    );
  }, [month]);
  useEffect(() => {
    if (!expanded) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onToggleExpanded(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [expanded, onToggleExpanded]);
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, index) => {
    const value = new Date(start);
    value.setDate(start.getDate() + index);
    return value;
  });
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const reservedAt = (day, hour) => {
    const from = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour);
    const to = new Date(from.getTime() + 60 * 60 * 1000);
    return schedule
      .filter(
        (block) =>
          from < new Date(block.returnTime) &&
          to > new Date(block.pickupTime),
      )
      .reduce((sum, block) => sum + block.reservedQuantity, 0);
  };

  const selectedDayEnd = new Date(
    selectedDay.getFullYear(),
    selectedDay.getMonth(),
    selectedDay.getDate() + 1,
  );
  const daySlots = schedule.filter(
    (block) =>
      selectedDay < new Date(block.returnTime) &&
      selectedDayEnd > new Date(block.pickupTime),
  );
  const selectedPickup = Number.isNaN(pickupDate.getTime()) ? new Date() : pickupDate;
  const selectedPickupHour = selectedPickup.getHours();
  const selectedReserved = reservedAt(selectedDay, selectedPickupHour);
  const selectedAvailable = Math.max(totalQty - selectedReserved, 0);
  const busyDays = days.filter((day) =>
    Array.from({ length: 24 }, (_, hour) => reservedAt(day, hour)).some(
      (count) => count > 0,
    ),
  ).length;
  const selectedWeekStart = new Date(selectedDay);
  selectedWeekStart.setDate(
    selectedWeekStart.getDate() - ((selectedWeekStart.getDay() + 6) % 7),
  );
  const selectedWeekDays = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(selectedWeekStart);
    day.setDate(selectedWeekStart.getDate() + index);
    return day;
  });
  const selectedWeekEnd = new Date(selectedWeekStart);
  selectedWeekEnd.setDate(selectedWeekEnd.getDate() + 7);
  const selectedWeekSchedule = schedule
    .filter(
      (block) =>
        new Date(block.pickupTime) < selectedWeekEnd &&
        new Date(block.returnTime) > selectedWeekStart,
    )
    .sort((left, right) => new Date(left.pickupTime) - new Date(right.pickupTime));
  const density = [
    {
      day: expanded ? "min-h-14 p-1.5 text-[10px] sm:min-h-16" : "min-h-10 p-1 text-[9px]",
      slot: "py-2 text-[9px]",
      slotGrid: expanded ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-4 sm:grid-cols-6",
    },
    {
      day: expanded ? "min-h-20 p-2 text-xs sm:min-h-24" : "min-h-12 p-1.5 text-[10px]",
      slot: "py-2.5 text-[10px]",
      slotGrid: expanded ? "grid-cols-3 sm:grid-cols-4" : "grid-cols-4 sm:grid-cols-6",
    },
    {
      day: expanded ? "min-h-24 p-2.5 text-sm sm:min-h-28" : "min-h-16 p-2 text-xs",
      slot: "py-3 text-xs",
      slotGrid: expanded ? "grid-cols-3" : "grid-cols-3 sm:grid-cols-4",
    },
  ][zoom];
  const weekRowHeight = [44, 56, 72][zoom];
  const weekStartHour = 6;
  const weekEndHour = 23;
  const weekTimelineHeight = (weekEndHour - weekStartHour) * weekRowHeight;

  function goToToday() {
    const value = new Date();
    value.setHours(0, 0, 0, 0);
    setSelectedDay(value);
    onMonth(new Date(value.getFullYear(), value.getMonth(), 1));
  }

  function selectDay(day) {
    const value = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    setSelectedDay(value);
    if (
      value.getFullYear() !== month.getFullYear() ||
      value.getMonth() !== month.getMonth()
    ) {
      onMonth(new Date(value.getFullYear(), value.getMonth(), 1));
    }
  }

  function shiftSelectedWeek(amount) {
    const next = new Date(selectedDay);
    next.setDate(next.getDate() + amount * 7);
    selectDay(next);
  }

  function dayScheduleLayout(day) {
    const visibleStart = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      weekStartHour,
    );
    const visibleEnd = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      weekEndHour,
    );
    const laneEnds = [];
    const segments = selectedWeekSchedule
      .filter(
        (block) =>
          new Date(block.pickupTime) < visibleEnd &&
          new Date(block.returnTime) > visibleStart,
      )
      .map((block) => ({
        block,
        start: new Date(Math.max(new Date(block.pickupTime), visibleStart)),
        end: new Date(Math.min(new Date(block.returnTime), visibleEnd)),
      }))
      .sort((left, right) => left.start - right.start)
      .map((segment) => {
        let lane = laneEnds.findIndex((laneEnd) => laneEnd <= segment.start);
        if (lane < 0) lane = laneEnds.length;
        laneEnds[lane] = segment.end;
        return { ...segment, lane };
      });
    const laneCount = Math.max(laneEnds.length, 1);
    return segments.map((segment) => ({ ...segment, laneCount }));
  }

  return (
    <div
      className={expanded ? "fixed inset-0 z-[80] bg-black/65 p-2 sm:p-5" : ""}
      role={expanded ? "dialog" : undefined}
      aria-modal={expanded || undefined}
      aria-label={expanded ? "Lịch thiết bị phóng lớn" : undefined}
      onMouseDown={(event) => expanded && event.target === event.currentTarget && onToggleExpanded(false)}
    >
      <section
        className={`rounded-lg border border-line bg-white ${
          expanded
            ? "mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden p-4 shadow-soft sm:p-6"
            : "p-4"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-[10px] font-black uppercase text-muted">
              <CalendarDays className="h-4 w-4" />
              Điều phối theo thời gian
            </p>
            <h3 className="mt-1 truncate text-xl font-black">
              {selectedWeekStart.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
              })}
              {" – "}
              {selectedWeekDays[6].toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 rounded-lg border border-line bg-paper p-1">
              {[
                { id: "WEEK", label: "Tuần" },
                { id: "MONTH", label: "Tháng" },
                { id: "AGENDA", label: "Danh sách" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCalendarView(item.id)}
                  className={`rounded px-3 text-[10px] font-black uppercase ${calendarView === item.id ? "bg-ink text-acid" : "text-muted"}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex h-9 items-center rounded-lg border border-line bg-paper">
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.max(0, value - 1))}
                  disabled={zoom === 0}
                  className="flex h-9 w-9 items-center justify-center disabled:opacity-30"
                  title="Giảm kích thước lịch"
                  aria-label="Giảm kích thước lịch"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-11 text-center text-[10px] font-black">
                  {[80, 100, 120][zoom]}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom((value) => Math.min(2, value + 1))}
                  disabled={zoom === 2}
                  className="flex h-9 w-9 items-center justify-center disabled:opacity-30"
                  title="Tăng kích thước lịch"
                  aria-label="Tăng kích thước lịch"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
            </div>
            <button
              type="button"
              onClick={() => onToggleExpanded(!expanded)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-acid"
              title={expanded ? "Thoát toàn màn hình" : "Mở toàn màn hình"}
              aria-label={expanded ? "Thoát toàn màn hình" : "Mở toàn màn hình"}
            >
              {expanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {calendarView === "WEEK" ? (
          <div className={`mt-4 ${expanded ? "min-h-0 flex-1 overflow-y-auto pr-1" : ""}`}>
            <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="rounded-lg border border-line bg-paper p-4">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white"
                    title="Tháng trước"
                    aria-label="Tháng trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <strong className="text-sm">Tháng {month.getMonth() + 1}/{month.getFullYear()}</strong>
                  <button
                    type="button"
                    onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white"
                    title="Tháng sau"
                    aria-label="Tháng sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
                    <span key={label} className="py-1 text-center text-[9px] font-black text-muted">{label}</span>
                  ))}
                  {days.map((day) => {
                    const active = day.toDateString() === selectedDay.toDateString();
                    const inWeek = day >= selectedWeekStart && day < new Date(selectedWeekStart.getFullYear(), selectedWeekStart.getMonth(), selectedWeekStart.getDate() + 7);
                    const peak = Math.max(...Array.from({ length: 24 }, (_, hour) => reservedAt(day, hour)));
                    return (
                      <button
                        key={day.toISOString()}
                        type="button"
                        onClick={() => selectDay(day)}
                        className={`relative grid h-8 place-items-center rounded text-[10px] font-black ${day.getMonth() !== month.getMonth() ? "text-muted/35" : ""} ${inWeek ? "bg-white" : ""} ${active ? "bg-ink text-acid" : ""}`}
                      >
                        {day.getDate()}
                        {peak > 0 ? <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${peak >= totalQty ? "bg-red-500" : "bg-orange-500"}`} /> : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-5 border-t border-line pt-4">
                  <p className="text-[10px] font-black uppercase text-muted">Ngày đang chọn</p>
                  <p className="mt-1 text-base font-black">{selectedDay.toLocaleDateString("vi-VN")}</p>
                  <p className={`mt-2 text-xs font-black ${selectedAvailable > 0 ? "text-green-700" : "text-red-700"}`}>
                    {selectedAvailable > 0 ? `Còn ${selectedAvailable}/${totalQty} thiết bị tại giờ nhận` : "Giờ nhận hiện đã kín"}
                  </p>
                  <div className="mt-4 space-y-2">
                    {daySlots.length ? daySlots.map((block, index) => (
                      <div key={`${block.pickupTime}-${index}`} className="border-l-4 border-orange-400 bg-orange-50 px-3 py-2 text-[10px] font-bold text-orange-900">
                        <p>{new Date(block.pickupTime).toLocaleString("vi-VN")} – {new Date(block.returnTime).toLocaleString("vi-VN")}</p>
                        <p className="mt-1 text-orange-700">Đã giữ {block.reservedQuantity} thiết bị</p>
                      </div>
                    )) : <p className="text-[10px] font-bold text-green-700">Ngày này chưa có lịch giữ máy.</p>}
                  </div>
                </div>
              </aside>

              <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => shiftSelectedWeek(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line" title="Tuần trước" aria-label="Tuần trước"><ChevronLeft className="h-4 w-4" /></button>
                    <button type="button" onClick={goToToday} className="h-9 rounded-lg border border-line px-3 text-[10px] font-black uppercase">Hôm nay</button>
                    <button type="button" onClick={() => shiftSelectedWeek(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line" title="Tuần sau" aria-label="Tuần sau"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-muted">
                      {selectedWeekSchedule.length} khoảng đã giữ trong tuần
                    </p>
                    <p className="mt-0.5 text-[9px] font-bold text-muted">
                      Chọn giờ còn trống; thông tin người thuê luôn được ẩn.
                    </p>
                  </div>
                </div>
                <div className="overflow-auto">
                  <div className="min-w-[980px]">
                    <div className="sticky top-0 z-30 grid grid-cols-[64px_repeat(7,minmax(120px,1fr))] border-b border-line bg-paper">
                      <div />
                      {selectedWeekDays.map((day) => (
                        <button
                          key={day.toISOString()}
                          type="button"
                          onClick={() => selectDay(day)}
                          className={`border-l border-line px-2 py-3 text-center ${
                            day.toDateString() === new Date().toDateString()
                              ? "bg-ink text-white"
                              : ""
                          }`}
                        >
                          <span className="block text-[9px] font-black uppercase opacity-60">
                            {day.toLocaleDateString("vi-VN", { weekday: "short" })}
                          </span>
                          <strong className="mt-1 block text-sm">
                            {day.getDate()}/{day.getMonth() + 1}
                          </strong>
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-[64px_repeat(7,minmax(120px,1fr))]">
                      <div
                        className="relative border-r border-line"
                        style={{ height: weekTimelineHeight }}
                      >
                        {Array.from(
                          { length: weekEndHour - weekStartHour + 1 },
                          (_, index) => (
                            <span
                              key={index}
                              className="absolute right-2 -translate-y-1/2 text-[9px] font-bold text-muted"
                              style={{ top: index * weekRowHeight }}
                            >
                              {String(weekStartHour + index).padStart(2, "0")}:00
                            </span>
                          ),
                        )}
                      </div>
                      {selectedWeekDays.map((day) => {
                        const now = new Date();
                        const segments = dayScheduleLayout(day);
                        const showNow =
                          day.toDateString() === now.toDateString() &&
                          now.getHours() >= weekStartHour &&
                          now.getHours() < weekEndHour;
                        return (
                          <div
                            key={day.toISOString()}
                            className="relative border-r border-line last:border-r-0"
                            style={{ height: weekTimelineHeight }}
                          >
                            {Array.from(
                              { length: weekEndHour - weekStartHour + 1 },
                              (_, index) => (
                                <span
                                  key={index}
                                  className="pointer-events-none absolute left-0 right-0 border-t border-line/70"
                                  style={{ top: index * weekRowHeight }}
                                />
                              ),
                            )}
                            {Array.from(
                              { length: weekEndHour - weekStartHour },
                              (_, index) => {
                                const hour = weekStartHour + index;
                                const count = reservedAt(day, hour);
                                const full = totalQty > 0 && count >= totalQty;
                                const slot = new Date(
                                  day.getFullYear(),
                                  day.getMonth(),
                                  day.getDate(),
                                  hour,
                                );
                                const past = slot < now;
                                const active =
                                  selectedPickup.toDateString() === day.toDateString() &&
                                  selectedPickupHour === hour;
                                return (
                                  <button
                                    key={hour}
                                    type="button"
                                    disabled={full || past}
                                    onClick={() => {
                                      selectDay(day);
                                      onPick(slot);
                                    }}
                                    aria-label={`${day.toLocaleDateString("vi-VN")}, ${String(hour).padStart(2, "0")}:00, ${
                                      full
                                        ? "đã kín"
                                        : `còn ${Math.max(totalQty - count, 0)} thiết bị`
                                    }`}
                                    className={`absolute left-0 right-0 z-[5] border-0 transition ${
                                      active
                                        ? "bg-ink/90 ring-2 ring-inset ring-acid"
                                        : full
                                          ? "bg-red-50/50"
                                          : count > 0
                                            ? "bg-orange-50/35 hover:bg-orange-100/60"
                                            : "bg-green-50/20 hover:bg-green-100/65"
                                    } disabled:cursor-not-allowed`}
                                    style={{
                                      top: index * weekRowHeight + 1,
                                      height: weekRowHeight - 2,
                                    }}
                                  />
                                );
                              },
                            )}
                            {showNow ? (
                              <span
                                className="pointer-events-none absolute left-0 right-0 z-20 border-t-2 border-red-500"
                                style={{
                                  top:
                                    (((now.getHours() - weekStartHour) * 60 +
                                      now.getMinutes()) /
                                      60) *
                                    weekRowHeight,
                                }}
                              />
                            ) : null}
                            {segments.map(
                              ({ block, start, end, lane, laneCount }, index) => {
                                const startMinutes =
                                  start.getHours() * 60 +
                                  start.getMinutes() -
                                  weekStartHour * 60;
                                const durationMinutes = Math.max(
                                  (end - start) / 60000,
                                  30,
                                );
                                const full = block.reservedQuantity >= totalQty;
                                return (
                                  <div
                                    key={`${block.pickupTime}-${day.toISOString()}-${index}`}
                                    title={`Đã giữ ${block.reservedQuantity} thiết bị`}
                                    className={`pointer-events-none absolute z-10 overflow-hidden rounded border-l-4 p-2 text-left shadow-sm ${
                                      full
                                        ? "border-red-600 bg-red-50 text-red-950"
                                        : "border-amber-500 bg-amber-50 text-amber-950"
                                    }`}
                                    style={{
                                      top: (startMinutes / 60) * weekRowHeight + 2,
                                      height: Math.max(
                                        (durationMinutes / 60) * weekRowHeight - 4,
                                        34,
                                      ),
                                      left: `calc(${(lane / laneCount) * 100}% + 3px)`,
                                      width: `calc(${100 / laneCount}% - 6px)`,
                                    }}
                                  >
                                    <strong className="block truncate text-[10px]">
                                      {full ? "Đã kín" : "Đã có lịch thuê"}
                                    </strong>
                                    <span className="mt-1 block truncate text-[9px] font-bold opacity-75">
                                      Đã giữ {block.reservedQuantity}/{totalQty} thiết bị
                                    </span>
                                    <span className="mt-1 block text-[8px] font-black opacity-70">
                                      {start.toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                      {" – "}
                                      {end.toLocaleTimeString("vi-VN", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                );
                              },
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 border-t border-line p-3 text-[10px] font-bold text-muted">
                  <span className="text-green-700">● Còn trống</span>
                  <span className="text-orange-700">● Đã giữ một phần</span>
                  <span className="text-red-700">● Đã kín</span>
                  <span className="text-ink">● Giờ đang chọn</span>
                </div>
              </section>
            </div>
          </div>
        ) : calendarView === "MONTH" ? (
          <div className={`mt-4 ${expanded ? "min-h-0 flex-1 overflow-y-auto pr-1" : ""}`}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
              <div className="rounded-lg border border-line bg-paper p-3 sm:p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted">Tháng</p>
                    <p className="mt-1 font-black">
                      {month.getMonth() + 1}/{month.getFullYear()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={goToToday}
                      className="h-9 rounded-lg border border-line bg-white px-3 text-[10px] font-black uppercase"
                    >
                      Hôm nay
                    </button>
                    <button
                      type="button"
                      onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white"
                      title="Tháng trước"
                      aria-label="Tháng trước"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white"
                      title="Tháng sau"
                      aria-label="Tháng sau"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                  {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
                    <span key={label} className="py-1 text-center text-[9px] font-black text-muted">
                      {label}
                    </span>
                  ))}
                  {days.map((day) => {
                    const counts = Array.from({ length: 24 }, (_, hour) => reservedAt(day, hour));
                    const peak = Math.max(...counts);
                    const hasBooking = peak > 0;
                    const full = totalQty > 0 && counts.every((count) => count >= totalQty);
                    const hasFullHour = totalQty > 0 && peak >= totalQty;
                    const active = day.toDateString() === selectedDay.toDateString();
                    const outsideMonth = day.getMonth() !== month.getMonth();
                    return (
                      <button
                        type="button"
                        key={day.toISOString()}
                        disabled={full || day < today}
                        onClick={() => selectDay(day)}
                        className={`${density.day} rounded border text-left transition ${
                          outsideMonth ? "opacity-30" : ""
                        } ${active ? "border-ink bg-ink text-white" : "border-line bg-white"} ${
                          full ? "cursor-not-allowed border-red-200 bg-red-50 text-red-700" : ""
                        }`}
                      >
                        <span className="flex items-center justify-between gap-1">
                          <strong>{day.getDate()}</strong>
                          {day.toDateString() === today.toDateString() ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-acid" />
                          ) : null}
                        </span>
                        <span
                          className={`mt-1 block h-1.5 rounded-full ${
                            full
                              ? "bg-red-500"
                              : hasFullHour
                                ? "bg-orange-600"
                                : hasBooking
                                  ? "bg-orange-400"
                                  : "bg-green-500"
                          }`}
                        />
                        {zoom > 0 || expanded ? (
                          <span className={`mt-1 block truncate text-[8px] font-bold ${active ? "text-white/70" : "text-muted"}`}>
                            {full ? "Kín ngày" : hasFullHour ? "Có giờ kín" : hasBooking ? `Còn ${Math.max(totalQty - peak, 0)}` : "Trống"}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-[10px] font-bold text-muted">
                  <span>{busyDays} ngày có lịch trong khung đang xem</span>
                  <span className="flex flex-wrap gap-3">
                    <span className="text-green-700">● Trống</span>
                    <span className="text-orange-700">● Đã giữ</span>
                    <span className="text-red-700">● Kín</span>
                  </span>
                </div>
              </div>

              <aside className="rounded-lg border border-line bg-white p-3 sm:p-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted">Khung giờ</p>
                    <p className="mt-1 text-sm font-black">{selectedDay.toLocaleDateString("vi-VN")}</p>
                  </div>
                  <p className={`text-xs font-black ${selectedAvailable > 0 ? "text-green-700" : "text-red-700"}`}>
                    {selectedAvailable > 0 ? `Còn ${selectedAvailable}/${totalQty}` : "Đã kín"}
                  </p>
                </div>
                <div className={`mt-3 grid gap-1.5 ${density.slotGrid}`}>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const count = reservedAt(selectedDay, hour);
                    const full = totalQty > 0 && count >= totalQty;
                    const slot = new Date(
                      selectedDay.getFullYear(),
                      selectedDay.getMonth(),
                      selectedDay.getDate(),
                      hour,
                    );
                    const past = slot < new Date();
                    const active =
                      selectedPickup.toDateString() === selectedDay.toDateString() &&
                      selectedPickupHour === hour;
                    return (
                      <button
                        type="button"
                        key={hour}
                        disabled={full || past}
                        onClick={() => onPick(slot)}
                        className={`rounded border px-1 ${density.slot} font-black ${
                          active
                            ? "border-ink bg-ink text-acid"
                            : full
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-line bg-green-50 text-green-800 hover:border-ink"
                        } disabled:cursor-not-allowed disabled:opacity-45`}
                      >
                        <span>{String(hour).padStart(2, "0")}:00</span>
                        {(zoom > 0 || expanded) && !past ? (
                          <span className="mt-0.5 block text-[8px] opacity-70">
                            {full ? "Kín" : `Còn ${Math.max(totalQty - count, 0)}`}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <p className="text-[10px] font-black uppercase text-muted">Lịch đã giữ trong ngày</p>
                  {daySlots.length ? (
                    <div className="mt-2 space-y-2">
                      {daySlots.map((block, index) => (
                        <div
                          key={`${block.pickupTime}-${index}`}
                          className="border-l-4 border-orange-400 bg-orange-50 px-3 py-2 text-[10px] font-bold text-orange-900"
                        >
                          <p>
                            {new Date(block.pickupTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                            {" – "}
                            {new Date(block.returnTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          </p>
                          <p className="mt-1 text-orange-700">{block.reservedQuantity} thiết bị đang được giữ</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[10px] font-bold text-green-700">Ngày này chưa có lịch giữ máy.</p>
                  )}
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div
            className={`mt-4 overflow-hidden rounded-lg border border-line bg-white ${
              expanded ? "min-h-0 flex-1 overflow-y-auto" : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => shiftSelectedWeek(-1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line"
                  title="Tuần trước"
                  aria-label="Tuần trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goToToday}
                  className="h-9 rounded-lg border border-line px-3 text-[10px] font-black uppercase"
                >
                  Hôm nay
                </button>
                <button
                  type="button"
                  onClick={() => shiftSelectedWeek(1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-line"
                  title="Tuần sau"
                  aria-label="Tuần sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <p className="text-xs font-bold text-muted">
                {selectedWeekSchedule.length} khoảng đã giữ trong tuần
              </p>
            </div>
            <div className="divide-y divide-line">
              {selectedWeekSchedule.map((block, index) => (
                <button
                  key={`${block.pickupTime}-${index}`}
                  type="button"
                  onClick={() => selectDay(new Date(block.pickupTime))}
                  className="grid w-full gap-3 p-4 text-left hover:bg-paper sm:grid-cols-[180px_1fr_auto] sm:items-center"
                >
                  <span className="text-xs font-black">
                    {new Date(block.pickupTime).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </span>
                  <span>
                    <strong className="block text-sm">Đã có lịch thuê</strong>
                    <span className="mt-1 block text-[10px] font-bold text-muted">
                      đến {new Date(block.returnTime).toLocaleString("vi-VN")} · Thông tin người thuê được ẩn
                    </span>
                  </span>
                  <span className="text-xs font-black text-orange-700">
                    Đã giữ {block.reservedQuantity}/{totalQty}
                  </span>
                </button>
              ))}
              {selectedWeekSchedule.length === 0 ? (
                <p className="p-12 text-center text-sm font-bold text-muted">
                  Tuần này chưa có lịch giữ máy.
                </p>
              ) : null}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function bookingDefaults() {
  const pickup = new Date();
  pickup.setDate(pickup.getDate() + 1);
  pickup.setHours(10, 0, 0, 0);
  const returns = new Date(pickup);
  returns.setDate(returns.getDate() + 1);
  return {
    pickupTime: localDateTime(pickup),
    returnTime: localDateTime(returns),
  };
}

export default function BookingPage({ productId, customerAccount, onBack, onViewOrders }) {
  const [product, setProduct] = useState(null);
  const [accessories, setAccessories] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedBundleId, setSelectedBundleId] = useState("");
  const [selectedRentalRate, setSelectedRentalRate] = useState("DAILY");
  const [accessoryQuantities, setAccessoryQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState("");
  const [form, setForm] = useState({
    customerName: customerAccount?.name || "",
    phone: customerAccount?.phone || "",
    note: "",
    promotionCode: "",
    earlyPickup: false,
    earlyPickupTime: "",
    storeBranchId: "",
    ...bookingDefaults(),
  });
  const [mainQuantity, setMainQuantity] = useState(1);
  const [schedule, setSchedule] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const value = new Date();
    value.setDate(1);
    return value;
  });
  const [calendarExpanded, setCalendarExpanded] = useState(false);
  const [consent, setConsent] = useState(false);
  const [bookingStep, setBookingStep] = useState("form");
  const [quote, setQuote] = useState(null);
  const [booking, setBooking] = useState(null);
  const [bookingError, setBookingError] = useState("");
  const [verifiedBooking, setVerifiedBooking] = useState(null);
  const [commitmentChecks, setCommitmentChecks] = useState({ identity: false, fees: false });
  const [commitmentHolding, setCommitmentHolding] = useState(false);
  const [liveQuote, setLiveQuote] = useState(null);
  const [liveQuoteError, setLiveQuoteError] = useState("");
  const [busy, setBusy] = useState(false);
  const [identity, setIdentity] = useState({ front: null, back: null });
  const [paymentProof, setPaymentProof] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [holdSeconds, setHoldSeconds] = useState(0);
  const [holdToken, setHoldToken] = useState("");
  const holdTokenRef = useRef("");
  const holdRequestVersion = useRef(0);
  const commitmentTimerRef = useRef(null);

  useEffect(() => () => window.clearTimeout(commitmentTimerRef.current), []);

  useEffect(
    () => () => {
      if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
    },
    [imagePreview],
  );

  function openLocalImage(file, title) {
    if (!file) return;
    setImagePreview({ url: URL.createObjectURL(file), title });
  }

  useEffect(() => {
    let ignore = false;

    async function loadProduct() {
      try {
        const [catalog, availability, nextBundles, nextStores] = await Promise.all([
          api.products(),
          api.availability(),
          api.bundles(),
          api.stores(),
        ]);
        const availabilityById = Object.fromEntries(
          availability.map((item) => [item.productId, item]),
        );
        const nextProducts = catalog.map((item) => ({
          ...item,
          ...(availabilityById[item.id] || { totalQty: 0, availableQty: 0 }),
        }));
        const selected =
          nextProducts.find((item) => item.id === productId) || null;
        let productDetails = {};
        try {
          productDetails = JSON.parse(selected?.customAttributes || "{}");
        } catch {
          productDetails = {};
        }
        const compatibleIds = productDetails.compatibleAccessories || [];
        const bundleProductIds = nextBundles
          .filter((bundle) =>
            bundle.items.some((line) => line.productId === productId),
          )
          .flatMap((bundle) => bundle.items.map((line) => line.productId));
        const nextAccessories = nextProducts.filter(
          (item) =>
            item.levelCode !== "L1" &&
            (compatibleIds.length === 0 ||
              compatibleIds.includes(item.id) ||
              bundleProductIds.includes(item.id)),
        );
        if (!ignore) {
          setProduct(selected);
          setAccessories(nextAccessories);
          setBundles(
            nextBundles.filter((bundle) =>
              bundle.items.some((line) => line.productId === productId),
            ),
          );
          setStores(nextStores);
          setForm((current) => ({
            ...current,
            storeBranchId: nextStores.some((store) => store.id === current.storeBranchId)
              ? current.storeBranchId
              : nextStores[0]?.id || "",
          }));
          const initialQuantities = Object.fromEntries(
              nextAccessories
                .filter((item) => item.included && item.availableQty > 0)
                .map((item) => [item.id, 1]),
            );
          const preferredId = sessionStorage.getItem("claritycam-preferred-bundle");
          const preferred = nextBundles.find((bundle) => bundle.id === preferredId && bundle.items.some((line) => line.productId === productId));
          if (preferred) {
            preferred.items.filter((line) => line.productId !== productId).forEach((line) => { initialQuantities[line.productId] = line.quantity; });
            const mainLine = preferred.items.find((line) => line.productId === productId);
            if (mainLine) setMainQuantity(mainLine.quantity);
            setSelectedBundleId(preferred.id);
            sessionStorage.removeItem("claritycam-preferred-bundle");
          }
          setAccessoryQuantities(initialQuantities);
          if (!selected) {
            setLoadingError("Không tìm thấy thiết bị được chọn.");
          }
        }
      } catch (error) {
        if (!ignore) {
          setLoadingError(error.message);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProduct();
    return () => {
      ignore = true;
    };
  }, [productId]);

  const quoteSummary = useMemo(
    () =>
      quote
        ? `${rentalDurationLabel(quote)} · Cọc dự kiến ${money(quote.depositRequired)}`
        : "",
    [quote],
  );
  const bookingItems = useMemo(() => {
    if (!product) return [];
    return [
      { productId: product.id, quantity: mainQuantity },
      ...accessories
        .map((accessory) => ({
          productId: accessory.id,
          quantity: accessoryQuantities[accessory.id] || 0,
        }))
        .filter((item) => item.quantity > 0),
    ];
  }, [accessories, accessoryQuantities, mainQuantity, product]);
  const selectedStore = useMemo(
    () => stores.find((store) => store.id === form.storeBranchId) || null,
    [form.storeBranchId, stores],
  );
  const dailyEquipmentTotal = useMemo(() => {
    if (!product) return 0;
    return (
      Number(product.dailyPrice) * mainQuantity +
      accessories.reduce(
        (total, accessory) =>
          total +
          Number(accessory.dailyPrice) *
            (accessoryQuantities[accessory.id] || 0),
        0,
      )
    );
  }, [accessories, accessoryQuantities, mainQuantity, product]);

  useEffect(() => {
    if (!product) return;
    const from = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      -6,
    );
    const to = new Date(
      calendarMonth.getFullYear(),
      calendarMonth.getMonth() + 1,
      8,
    );
    api
      .schedule(
        product.id,
        localDateTime(from) + ":00",
        localDateTime(to) + ":00",
      )
      .then(setSchedule)
      .catch(() => setSchedule([]));
  }, [calendarMonth, product]);

  useEffect(() => {
    if (
      !product ||
      !form.pickupTime ||
      !form.returnTime ||
      bookingItems.length === 0
    )
      return undefined;
    const version = ++holdRequestVersion.current;
    let retryTimer;
    const loadQuote = async (canRetry = true) => {
      try {
        const nextQuote = await api.quote({
          pickupTime: form.pickupTime,
          returnTime: form.returnTime,
          items: bookingItems,
          bundleId: selectedBundleId || null,
          holdToken: holdTokenRef.current || null,
          promotionCode: form.promotionCode.trim() || null,
          rentalRate: selectedRentalRate,
        });
        if (version !== holdRequestVersion.current) return;
        setLiveQuote(nextQuote);
        setLiveQuoteError(
          nextQuote.available
            ? ""
            : unavailableRangeMessage(
                nextQuote.unavailableProducts,
                form.pickupTime,
                form.returnTime,
              ),
        );
      } catch (error) {
        if (version !== holdRequestVersion.current) return;
        if (error.status === 429 && canRetry) {
          setLiveQuoteError("Đang đồng bộ báo giá, vui lòng chờ một chút...");
          retryTimer = window.setTimeout(() => loadQuote(false), 1800);
          return;
        }
        setLiveQuote(null);
        setLiveQuoteError(error.message);
      }
    };
    const timer = window.setTimeout(loadQuote, 650);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(retryTimer);
    };
  }, [
    bookingItems,
    form.pickupTime,
    form.promotionCode,
    form.returnTime,
    product,
    selectedBundleId,
    selectedRentalRate,
  ]);

  useEffect(() => {
    if (!product || bookingStep === "done" || holdSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => setHoldSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [bookingStep, holdSeconds, product]);

  async function beginBookingCommitment(event) {
    event.preventDefault();
    if (!product || !consent) {
      setBookingError("Vui lòng đồng ý với quy định thuê trước khi tiếp tục.");
      return;
    }
    setBusy(true);
    setBookingError("");
    try {
      if (!identity.front || !identity.back)
        throw new Error("Vui lòng tải ảnh mặt trước và mặt sau CCCD.");
      const identityUpload = await api.uploadIdentity(
        identity.front,
        identity.back,
      );
      const hold = await api.holdBooking({
        pickupTime: form.pickupTime,
        returnTime: form.returnTime,
        items: bookingItems,
        bundleId: selectedBundleId || null,
        holdToken: holdSeconds > 0 ? holdTokenRef.current || null : null,
        promotionCode: form.promotionCode.trim() || null,
        rentalRate: selectedRentalRate,
      });
      const nextQuote = hold.quote;
      if (!nextQuote.available) {
        throw new Error(
          unavailableRangeMessage(
            nextQuote.unavailableProducts,
            form.pickupTime,
            form.returnTime,
          ),
        );
      }
      if (!hold.holdToken || !hold.expiresAt) {
        throw new Error("Không thể giữ thiết bị lúc này. Vui lòng thử lại.");
      }
      holdTokenRef.current = hold.holdToken;
      setHoldToken(hold.holdToken);
      setHoldSeconds(holdSecondsUntil(hold.expiresAt));
      setQuote(nextQuote);
      setVerifiedBooking({
        identityUploadToken: identityUpload.uploadToken,
      });
      setCommitmentChecks({ identity: false, fees: false });
      setBookingStep("commitment");
    } catch (error) {
      setBookingError(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function completeBooking() {
    if (!product || !verifiedBooking || !quote || busy) return;
    if (holdSeconds <= 0 || !holdToken) {
      setBookingError("Phiên giữ máy đã hết hạn. Vui lòng bắt đầu lại.");
      return;
    }
    setBusy(true);
    setBookingError("");
    try {
      if (!paymentProof) throw new Error("Vui lòng gửi ảnh chụp giao dịch chuyển khoản để admin đối soát.");
      const refreshedQuote = await api.quote({
        pickupTime: form.pickupTime,
        returnTime: form.returnTime,
        items: bookingItems,
        bundleId: selectedBundleId || null,
        holdToken,
        promotionCode: form.promotionCode.trim() || null,
        storeBranchId: form.storeBranchId,
        rentalRate: selectedRentalRate,
      });
      if (commitmentFingerprint(refreshedQuote) !== commitmentFingerprint(quote)) {
        setQuote(refreshedQuote);
        setCommitmentChecks({ identity: false, fees: false });
        throw new Error("Giá hoặc chính sách vừa được admin cập nhật. Vui lòng xem lại và xác nhận lại cam kết.");
      }
      const paymentProofUpload = await api.uploadPaymentProof(paymentProof);
      const nextBooking = await api.createBooking({
        customerName: form.customerName,
        phone: form.phone,
        pickupTime: form.pickupTime,
        returnTime: form.returnTime,
        note: form.note,
        earlyPickupTime: form.earlyPickup ? form.earlyPickupTime : null,
        bundleId: selectedBundleId || null,
        items: bookingItems,
        identityUploadToken: verifiedBooking.identityUploadToken,
        paymentProofUploadToken: paymentProofUpload.uploadToken,
        holdToken,
        promotionCode: form.promotionCode.trim() || null,
        storeBranchId: form.storeBranchId,
        rentalRate: selectedRentalRate,
      });
      holdTokenRef.current = "";
      setHoldToken("");
      setBooking(nextBooking);
      setBookingStep("done");
    } catch (error) {
      setBookingError(error.message);
    } finally {
      setBusy(false);
    }
  }

  function beginCommitmentHold() {
    if (busy || holdSeconds <= 0 || !paymentProof || !commitmentChecks.identity || !commitmentChecks.fees) return;
    setCommitmentHolding(true);
    window.clearTimeout(commitmentTimerRef.current);
    commitmentTimerRef.current = window.setTimeout(() => {
      setCommitmentHolding(false);
      completeBooking();
    }, 1500);
  }

  function cancelCommitmentHold() {
    window.clearTimeout(commitmentTimerRef.current);
    commitmentTimerRef.current = null;
    setCommitmentHolding(false);
  }

  function changeAccessoryQuantity(accessory, delta) {
    if (accessory.included) return;
    setAccessoryQuantities((current) => {
      const quantity = Math.max(
        0,
        Math.min(
          10,
          accessory.availableQty,
          (current[accessory.id] || 0) + delta,
        ),
      );
      return { ...current, [accessory.id]: quantity };
    });
  }

  function chooseBundle(bundleId) {
    setSelectedBundleId(bundleId);
    if (!bundleId) {
      if (selectedRentalRate === "MULTI_DAY") {
        setForm((current) => ({
          ...current,
          returnTime: returnTimeForRentalRate(
            current.pickupTime,
            current.returnTime,
            selectedRentalRate,
            product.multiDayDays,
          ),
        }));
      }
      return;
    }
    const bundle = bundles.find((item) => item.id === bundleId);
    if (!bundle) return;
    const bundleRateKeys = rentalRates(bundle).map((rate) => rate.key);
    const nextRentalRate = bundleRateKeys.includes(selectedRentalRate)
      ? selectedRentalRate
      : "DAILY";
    if (nextRentalRate !== selectedRentalRate) setSelectedRentalRate(nextRentalRate);
    const quantities = Object.fromEntries(
      bundle.items
        .filter((line) => line.productId !== product.id)
        .map((line) => [line.productId, line.quantity]),
    );
    setAccessoryQuantities((current) => ({ ...current, ...quantities }));
    const mainLine = bundle.items.find((line) => line.productId === product.id);
    if (mainLine) setMainQuantity(mainLine.quantity);
    if (nextRentalRate === "MULTI_DAY") {
      setForm((current) => ({
        ...current,
        returnTime: returnTimeForRentalRate(
          current.pickupTime,
          current.returnTime,
          nextRentalRate,
          bundle.multiDayDays,
        ),
      }));
    }
  }

  function chooseRentalRate(rateKey) {
    const pricingSource =
      bundles.find((bundle) => bundle.id === selectedBundleId) || product;
    setSelectedRentalRate(rateKey);
    setForm((current) => ({
      ...current,
      returnTime: returnTimeForRentalRate(
        current.pickupTime,
        current.returnTime,
        rateKey,
        pricingSource.multiDayDays,
      ),
    }));
  }

  async function restartReservation() {
    const previousToken = holdTokenRef.current;
    holdRequestVersion.current += 1;
    holdTokenRef.current = "";
    setHoldToken("");
    setHoldSeconds(0);
    if (previousToken) {
      await api.releaseBookingHold({ holdToken: previousToken }).catch(() => {});
    }
    setBookingStep("form");
    setIdentity({ front: null, back: null });
    setPaymentProof(null);
    setConsent(false);
    setBookingError("");
    setForm((current) => ({ ...current, ...bookingDefaults(), note: "", promotionCode: "", earlyPickup: false, earlyPickupTime: "" }));
  }

  if (loading) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 pt-24 text-sm font-bold text-muted">
        Đang tải thông tin thiết bị...
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto flex min-h-screen max-w-4xl items-center justify-center px-4 pt-24">
        <div className="w-full rounded-lg border border-red-100 bg-white p-6 text-center text-sm font-semibold text-red-700 shadow-soft">
          {loadingError || "Không tìm thấy thiết bị được chọn."}
        </div>
      </main>
    );
  }

  const pricingSource =
    bundles.find((bundle) => bundle.id === selectedBundleId) || product;
  const selectedRate =
    rentalRates(pricingSource).find((rate) => rate.key === selectedRentalRate) ||
    rentalRates(pricingSource).find((rate) => rate.key === "DAILY");

  return (
    <>
      <SecureImagePreview
        preview={imagePreview}
        onClose={() => setImagePreview(null)}
      />
      <main className="pt-24">
      <div className="mx-auto max-w-7xl px-4 pb-12">
        <div className="overflow-hidden rounded-lg bg-white shadow-soft">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 p-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] md:p-7">
            <div className="space-y-4">
              <div className="rounded-lg bg-paper p-4">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="aspect-[4/3] w-full rounded-lg object-cover grayscale"
                />
                <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-muted">
                  {product.specs}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3" role="group" aria-label="Chọn kỳ thuê">
                  {rentalRates(pricingSource).map((rate) => (
                    <button
                      type="button"
                      key={rate.key}
                      onClick={() => rate.key !== "EXTRA_DAY" && chooseRentalRate(rate.key)}
                      disabled={rate.key === "EXTRA_DAY"}
                      aria-pressed={selectedRentalRate === rate.key}
                      title={rate.key === "EXTRA_DAY" ? "Đơn giá áp dụng tự động khi vượt số ngày của gói" : undefined}
                      className={`relative rounded border p-2 text-left transition ${
                        selectedRentalRate === rate.key
                          ? "border-ink bg-ink text-white"
                          : rate.key === "EXTRA_DAY"
                            ? "cursor-default border-line bg-paper"
                            : "border-line bg-white hover:border-ink"
                      }`}
                    >
                      {selectedRentalRate === rate.key ? (
                        <CheckCircle2 className="absolute right-2 top-2 h-3.5 w-3.5 text-acid" />
                      ) : null}
                      <p
                        className={`text-[9px] font-black uppercase ${
                          selectedRentalRate === rate.key ? "text-white/70" : "text-muted"
                        }`}
                      >
                        {rate.label}
                      </p>
                      <p className="mt-1 text-xs font-black">{money(rate.value)}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[10px] font-bold text-muted">
                  Chọn gói sẽ tự cập nhật ngày trả và giữ nguyên giờ trả đang chọn.
                </p>
                <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-3">
                  <div>
                    <p className="text-[10px] font-black uppercase text-muted">
                      Số lượng đặt
                    </p>
                    <p className="mt-1 text-xs font-bold text-muted">
                      Kho hiện tại: {product.availableQty}/{product.totalQty} sẵn sàng
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setMainQuantity((value) => Math.max(1, value - 1))
                      }
                      disabled={mainQuantity <= 1}
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-line disabled:opacity-30"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="font-black">{mainQuantity}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setMainQuantity((value) =>
                          Math.min(product.availableQty, 10, value + 1),
                        )
                      }
                      disabled={
                        mainQuantity >= Math.min(product.availableQty, 10)
                      }
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-acid disabled:bg-line disabled:text-muted"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold text-muted">
                    <span>Giá {selectedRate?.label?.toLowerCase() || "gói đang chọn"}</span>
                    <span className="text-base font-black text-ink">
                      {money(selectedRate?.value || dailyEquipmentTotal)}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-muted">
                    <span>{liveQuote?.discountAmount > 0 ? "Tổng sau giảm" : "Tạm tính kỳ thuê"}</span>
                    <span className="text-base font-black text-ink">
                      {liveQuote
                        ? money(liveQuote.totalAmount)
                        : "Đang tính..."}
                    </span>
                  </div>
                  {liveQuote ? (
                    <div className="mt-3 space-y-2 border-t border-line pt-3 text-xs font-bold">
                      <div className="flex justify-between gap-3 text-muted"><span>Cọc thiết bị</span><span className="text-ink">{money(liveQuote.equipmentDeposit)}</span></div>
                      <div className="flex justify-between gap-3 text-muted"><span>Tiền giữ lịch</span><span className="text-ink">{money(liveQuote.bookingDeposit)}</span></div>
                      <div className="flex justify-between gap-3 text-sm font-black"><span>Cần thanh toán ban đầu</span><span>{money(liveQuote.amountDueNow)}</span></div>
                    </div>
                  ) : null}
                  {liveQuote?.discountAmount > 0 ? (
                    <div className="mt-2 flex items-center justify-between gap-3 text-xs font-bold text-green-700">
                      <span>Mã {liveQuote.promotionCode}</span>
                      <span>-{money(liveQuote.discountAmount)}</span>
                    </div>
                  ) : null}
                </div>
              </div>
              <section className="rounded-lg border border-line bg-white p-4">
                {bundles.length ? (
                  <div className="mb-4 border-b border-line pb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                      Chọn combo
                    </p>
                    <select
                      value={selectedBundleId}
                      onChange={(event) => chooseBundle(event.target.value)}
                      className="mt-2 w-full rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold"
                    >
                      <option value="">Thuê thiết bị riêng lẻ</option>
                      {bundles.map((bundle) => (
                        <option key={bundle.id} value={bundle.id}>
                          {bundle.name} · {money(bundle.hourlyPrice)}/giờ · {money(bundle.dailyPrice)}/ngày · {money(bundle.multiDayPrice)}/{bundle.multiDayDays || 3} ngày
                        </option>
                      ))}
                    </select>
                    {selectedBundleId ? (
                      <p className="mt-2 text-[10px] font-bold text-muted">
                        Ngày trả tự động theo số ngày của gói; giờ trả bạn đã chọn được giữ nguyên.
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="mb-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                    Phụ kiện đi kèm
                  </p>
                  <p className="mt-1 text-xs font-semibold text-muted">
                    Chọn thêm phụ kiện cho bộ thiết bị
                  </p>
                </div>
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {accessories.map((accessory) => {
                    const quantity = accessoryQuantities[accessory.id] || 0;
                    return (
                      <div
                        key={accessory.id}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${quantity > 0 ? "border-ink bg-paper" : "border-line"}`}
                      >
                        <img
                          src={accessory.imageUrl}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover grayscale"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black">
                            {accessory.name}
                          </p>
                          <p className="mt-1 text-[10px] font-bold text-muted">
                            {accessory.included
                              ? "Miễn phí đi kèm"
                              : `${money(accessory.hourlyPrice)}/giờ · ${money(accessory.dailyPrice)}/ngày`}{" "}
                            · Còn {accessory.availableQty}
                          </p>
                        </div>
                        {accessory.included ? (
                          <span
                            className={`flex h-8 w-8 items-center justify-center rounded-full ${accessory.availableQty > 0 ? "bg-ink text-acid" : "bg-line text-muted"}`}
                            title={
                              accessory.availableQty > 0
                                ? "Đã bao gồm"
                                : "Hết hàng"
                            }
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </span>
                        ) : (
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                changeAccessoryQuantity(accessory, -1)
                              }
                              disabled={quantity === 0}
                              className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white disabled:opacity-30"
                              aria-label={`Giảm ${accessory.name}`}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span className="w-4 text-center text-xs font-black">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                changeAccessoryQuantity(accessory, 1)
                              }
                              disabled={
                                quantity >= Math.min(10, accessory.availableQty)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-acid disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
                              aria-label={`Thêm ${accessory.name}`}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <div className="min-w-0">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted">
                    Yêu cầu thuê
                  </p>
                  <h1 className="mt-1 text-2xl font-black">{product.name}</h1>
                </div>
                <button
                  onClick={onBack}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-paper hover:bg-ink hover:text-white"
                  aria-label="Đóng form đặt thuê"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {bookingStep === "form" ? (
                <form onSubmit={beginBookingCommitment} className="min-w-0 space-y-4">
                  {holdToken ? (
                    <>
                      <div className={`flex items-center justify-between rounded-lg border p-3 ${holdSeconds > 60 ? "border-line bg-paper" : "border-red-200 bg-red-50 text-red-700"}`}><div className="flex items-center gap-2 text-xs font-black"><Clock3 className="h-4 w-4" />Phiên giữ lựa chọn</div><strong className="font-mono text-lg">{String(Math.floor(holdSeconds / 60)).padStart(2, "0")}:{String(holdSeconds % 60).padStart(2, "0")}</strong></div>
                      {holdSeconds <= 0 ? <button type="button" onClick={restartReservation} className="w-full rounded-lg border-2 border-ink px-4 py-3 text-xs font-black uppercase">Bắt đầu lại phiên đặt thuê</button> : null}
                    </>
                  ) : (
                    <div className="flex items-center justify-between rounded-lg border border-line bg-paper p-3 text-xs font-black"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4" />Giữ lựa chọn khi xác nhận</span><strong>Chưa bắt đầu</strong></div>
                  )}
                  <div className="rounded-lg border border-line bg-paper p-3 text-xs font-semibold text-muted">
                    <ShieldCheck className="mr-2 inline h-4 w-4 text-ink" />
                    Yêu cầu sẽ được gắn với tài khoản khách hàng đang đăng nhập. Đội ngũ
                    sẽ kiểm tra và phản hồi trước khi chốt đơn.
                  </div>
                  <div className="min-w-0 grid gap-3 sm:grid-cols-2">
                    <input
                      required
                      value={form.customerName}
                      onChange={(event) =>
                        setForm({ ...form, customerName: event.target.value })
                      }
                      placeholder="Họ và tên"
                      className="rounded-lg border border-line bg-paper px-4 py-3 text-sm font-semibold outline-none focus:border-ink"
                    />
                    <input
                      required
                      readOnly
                      value={form.phone}
                      placeholder="Số điện thoại đã xác thực"
                      className="rounded-lg border border-line bg-line/40 px-4 py-3 text-sm font-semibold text-muted outline-none"
                    />
                    <label className="min-w-0 space-y-1 sm:col-span-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                        Chi nhánh nhận và trả máy
                      </span>
                      <span className="relative block">
                        <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                        <select
                          required
                          value={form.storeBranchId}
                          onChange={(event) => setForm({ ...form, storeBranchId: event.target.value })}
                          className="min-w-0 w-full appearance-none rounded-lg border border-line bg-paper py-3 pl-11 pr-4 text-sm font-semibold outline-none focus:border-ink"
                        >
                          <option value="" disabled>Chọn chi nhánh</option>
                          {stores.map((store) => (
                            <option key={store.id} value={store.id}>
                              {store.name}
                            </option>
                          ))}
                        </select>
                      </span>
                      {selectedStore ? (
                        <span className="flex items-start gap-2 rounded-lg bg-paper px-4 py-3 text-xs font-semibold leading-5 text-muted">
                          <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-ink" />
                          <span>
                            <strong className="block text-ink">{selectedStore.address}</strong>
                            {selectedStore.phone ? <span className="block">{selectedStore.phone}</span> : null}
                          </span>
                        </span>
                      ) : null}
                      {stores.length === 0 ? (
                        <span className="block text-xs font-bold text-red-700">
                          Chưa có chi nhánh đang hoạt động. Vui lòng liên hệ AMY DIGITAL.
                        </span>
                      ) : null}
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                        Nhận máy
                      </span>
                      <input
                        required
                        type="datetime-local"
                        value={form.pickupTime}
                        onChange={(event) => {
                          const pickupTime = event.target.value;
                          setForm((current) => ({
                            ...current,
                            pickupTime,
                            earlyPickupTime: current.earlyPickup
                              ? earlyPickupTimeForPickup(pickupTime)
                              : current.earlyPickupTime,
                          }));
                        }}
                        className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm font-semibold outline-none focus:border-ink"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                        Trả máy
                      </span>
                      <input
                        required
                        type="datetime-local"
                        value={form.returnTime}
                        onChange={(event) =>
                          setForm({ ...form, returnTime: event.target.value })
                        }
                        className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm font-semibold outline-none focus:border-ink"
                      />
                    </label>
                  </div>
                  {liveQuoteError ? (
                    <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs font-bold leading-5 text-red-700">
                      {liveQuoteError}
                    </p>
                  ) : null}
                  <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs font-semibold leading-5 text-orange-900">
                    Hệ thống giữ thêm 30 phút sau mỗi đơn để kiểm tra, vệ sinh và đóng gói. Khung giờ đã có booking hoặc không đủ thời gian chuẩn bị sẽ không thể chọn.
                  </div>
                  <label className="block space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted">
                      Mã giảm giá
                    </span>
                    <input
                      maxLength="40"
                      value={form.promotionCode}
                      onChange={(event) =>
                        setForm({ ...form, promotionCode: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })
                      }
                      placeholder="Nhập mã nếu có"
                      className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm font-black uppercase outline-none focus:border-ink"
                    />
                    <span className="block text-[10px] font-semibold text-muted">
                      Hệ thống chỉ giảm phần chi phí thuộc đúng ngày được áp dụng.
                    </span>
                  </label>
                  <textarea
                    value={form.note}
                    onChange={(event) =>
                      setForm({ ...form, note: event.target.value })
                    }
                    placeholder="Ghi chú cho đội ngũ (không bắt buộc)"
                    className="min-h-20 w-full rounded-lg border border-line bg-paper px-4 py-3 text-sm font-semibold outline-none focus:border-ink"
                  />
                  <section className="rounded-lg border border-line bg-paper p-4">
                    <p className="text-xs font-black uppercase">
                      Xác thực CCCD
                    </p>
                    <p className="mt-1 text-xs font-semibold text-muted">
                      Tải ảnh rõ nét, đủ bốn góc. Hỗ trợ JPG hoặc PNG, tối đa
                      5 MB mỗi ảnh.
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {["front", "back"].map((side) => (
                        <label
                          key={side}
                          className="cursor-pointer rounded-lg border border-dashed border-line bg-white p-4 text-center hover:border-ink"
                        >
                          <span className="text-xs font-black">
                            {side === "front"
                              ? "Mặt trước CCCD"
                              : "Mặt sau CCCD"}
                          </span>
                          <input
                            required
                            type="file"
                            accept="image/jpeg,image/png"
                            className="mt-3 block w-full text-xs"
                            onChange={(event) =>
                              setIdentity((current) => ({
                                ...current,
                                [side]: event.target.files?.[0] || null,
                              }))
                            }
                          />
                          {identity[side] ? (
                            <span className="mt-2 block truncate text-[10px] font-bold text-green-700">
                              {identity[side].name}
                            </span>
                          ) : null}
                          {identity[side] ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                openLocalImage(
                                  identity[side],
                                  side === "front" ? "Mặt trước CCCD" : "Mặt sau CCCD",
                                );
                              }}
                              className="mt-3 rounded-lg border border-line bg-paper px-3 py-2 text-[10px] font-black uppercase"
                            >
                              Xem ảnh đã chọn
                            </button>
                          ) : null}
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-[10px] font-semibold text-muted">
                      Ảnh được chuẩn hóa, mã hóa khi lưu và chỉ admin có quyền
                      mới xem được. Tệp tự xóa theo thời hạn lưu trữ.
                    </p>
                  </section>
                  <div className="rounded-lg border border-line bg-paper p-4">
                    <label className="flex items-center gap-3 text-sm font-black">
                      <input
                        type="checkbox"
                        checked={form.earlyPickup}
                        onChange={(event) => {
                          const earlyPickup = event.target.checked;
                          setForm((current) => ({
                            ...current,
                            earlyPickup,
                            earlyPickupTime: earlyPickup
                              ? earlyPickupTimeForPickup(current.pickupTime)
                              : "",
                          }));
                        }}
                        className="h-4 w-4 accent-black"
                      />
                      Yêu cầu nhận máy sớm
                    </label>
                    {form.earlyPickup ? (
                      <label className="mt-3 block">
                        <span className="text-[10px] font-black uppercase text-muted">
                          Thời gian mong muốn
                        </span>
                        <input
                          required
                          type="datetime-local"
                          min={earlyPickupTimeForPickup(form.pickupTime)}
                          max={form.pickupTime}
                          value={form.earlyPickupTime}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              earlyPickupTime: event.target.value,
                            })
                          }
                          className="mt-1 w-full rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold"
                        />
                        <p className="mt-2 text-xs font-semibold text-muted">
                          Admin sẽ xác nhận khả năng đáp ứng và thông báo phí
                          nếu có.
                        </p>
                      </label>
                    ) : null}
                  </div>
                  <label className="flex items-start gap-3 text-xs font-semibold text-muted">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(event) => setConsent(event.target.checked)}
                      className="mt-0.5 h-4 w-4 accent-black"
                    />
                    <span>
                      Tôi đồng ý để AMY DIGITAL xử lý thông tin này nhằm kiểm tra
                      yêu cầu thuê và liên hệ phản hồi.
                    </span>
                  </label>
                  {bookingError ? (
                    <p className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
                      {bookingError}
                    </p>
                  ) : null}
                  <button
                    disabled={busy || !liveQuote?.available || Boolean(liveQuoteError)}
                    className="sticky bottom-3 flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-4 text-xs font-black uppercase tracking-widest text-acid shadow-soft disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Smartphone className="h-4 w-4" />
                    )}
                    Tiếp tục xác nhận
                  </button>
                </form>
              ) : null}

              {bookingStep === "commitment" && quote ? (
                <section className="overflow-hidden rounded-lg bg-ink text-white">
                  <div className="border-b border-white/10 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-acid">Bước cuối</p>
                        <h3 className="mt-2 text-2xl font-black">Xác nhận cam kết</h3>
                        <p className="mt-2 text-xs font-semibold leading-relaxed text-white/60">Kiểm tra trách nhiệm đang áp dụng trước khi chốt booking. Dữ liệu được lấy từ cấu hình hiện tại của admin.</p>
                      </div>
                      <span className="shrink-0 rounded-full border border-white/15 px-3 py-2 font-mono text-xs font-black text-acid">{String(Math.floor(holdSeconds / 60)).padStart(2, "0")}:{String(holdSeconds % 60).padStart(2, "0")}</span>
                    </div>
                  </div>

                  <div className="space-y-3 p-5">
                    <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-4 text-ink">
                      <div className="flex items-start gap-3">
                        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                        <div><p className="text-sm font-black">Sai người nhận hoặc sai CCCD</p><p className="mt-1 text-xs font-semibold text-muted">Không bàn giao thiết bị · Khoản áp dụng {money(quote.identityViolationFee)}</p></div>
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-lg bg-white text-ink">
                      <div className="flex items-center justify-between border-b border-line px-4 py-3"><strong className="text-xs uppercase tracking-wider">Các khoản trách nhiệm</strong><span className="text-[10px] font-bold text-muted">Theo quote hiện tại</span></div>
                      {[
                        ["Tự ý giao máy cho người khác", "Người sử dụng chưa được khai báo", money(quote.unauthorizedTransferFee)],
                        ["Trả trễ", "Tính theo mỗi giờ vượt quá thời gian trả", `${money(quote.lateFeePerHour)} / giờ`],
                        ["Ảnh hưởng booking tiếp theo", "Chỉ áp dụng khi đơn sau thực tế bị ảnh hưởng", Number(quote.impactPenaltyPercent || 0) > 0 ? `${Number(quote.impactPenaltyPercent)}% giá trị đơn bị ảnh hưởng` : "Admin xác nhận theo sự cố"],
                      ].map(([title, copy, value]) => (
                        <div key={title} className="grid grid-cols-[1fr_auto] gap-4 border-b border-line px-4 py-3 last:border-0">
                          <div><p className="text-xs font-black">{title}</p><p className="mt-1 text-[11px] font-semibold text-muted">{copy}</p></div>
                          <strong className="max-w-40 text-right text-xs">{value}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-4 rounded-lg bg-white p-4 text-ink">
                      <div><p className="text-xs font-black">Hư hỏng và thất lạc</p><p className="mt-1 text-[11px] font-semibold text-muted">Đối chiếu theo biên bản, hình ảnh và tình trạng thực tế.</p></div>
                      <div className="shrink-0 text-right"><p className="text-[9px] font-black uppercase text-muted">Trách nhiệm tối đa</p><strong className="mt-1 block text-sm">{money(quote.damageLiabilityLimit)}</strong></div>
                    </div>

                    <section className="rounded-lg border border-white/15 bg-white p-4 text-ink">
                      <div className="flex items-start gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink text-acid"><Building2 className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-black uppercase tracking-wider text-muted">Thông tin chuyển khoản</p>
                          <div className="mt-3 grid gap-2 text-xs sm:grid-cols-3">
                            <div><span className="block text-[9px] font-black uppercase text-muted">Ngân hàng</span><strong className="mt-1 block">{paymentAccount.bank}</strong></div>
                            <div><span className="block text-[9px] font-black uppercase text-muted">Số tài khoản</span><strong className="mt-1 block font-mono text-sm">{paymentAccount.accountNumber}</strong></div>
                            <div><span className="block text-[9px] font-black uppercase text-muted">Chủ tài khoản</span><strong className="mt-1 block">{paymentAccount.accountName}</strong></div>
                          </div>
                          <p className="mt-3 rounded bg-paper px-3 py-2 text-[11px] font-bold">Nội dung: {form.phone} {product.id} · Số cần thanh toán ban đầu: {money(quote.amountDueNow)}</p>
                        </div>
                      </div>
                      <label className={`mt-4 flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-3 ${paymentProof ? "border-green-500 bg-green-50" : "border-line bg-paper"}`}>
                        <Upload className="h-5 w-5 shrink-0" />
                        <span className="min-w-0 flex-1"><strong className="block text-xs">Ảnh chụp giao dịch chuyển khoản</strong><span className="mt-1 block truncate text-[10px] font-semibold text-muted">{paymentProof?.name || "JPG hoặc PNG, tối đa 5 MB"}</span></span>
                        <input required type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(event) => setPaymentProof(event.target.files?.[0] || null)} />
                        {paymentProof ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              openLocalImage(paymentProof, "Ảnh chuyển khoản đã chọn");
                            }}
                            className="shrink-0 rounded-lg border border-green-300 bg-white px-3 py-2 text-[10px] font-black uppercase text-green-900"
                          >
                            Xem ảnh
                          </button>
                        ) : null}
                      </label>
                    </section>

                    <div className="space-y-2 pt-1">
                      <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs font-semibold leading-relaxed ${commitmentChecks.identity ? "border-acid bg-acid/10" : "border-white/15 bg-white/5"}`}>
                        <input type="checkbox" checked={commitmentChecks.identity} onChange={(event) => setCommitmentChecks((current) => ({ ...current, identity: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#D7FF3F]" />
                        Tôi xác nhận đúng người nhận và người sử dụng đã khai báo.
                      </label>
                      <label className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-xs font-semibold leading-relaxed ${commitmentChecks.fees ? "border-acid bg-acid/10" : "border-white/15 bg-white/5"}`}>
                        <input type="checkbox" checked={commitmentChecks.fees} onChange={(event) => setCommitmentChecks((current) => ({ ...current, fees: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-[#D7FF3F]" />
                        Tôi đã xem và đồng ý với các khoản trách nhiệm đang áp dụng.
                      </label>
                    </div>

                    {bookingError ? <p className="rounded-lg border border-red-400/40 bg-red-500/10 p-3 text-xs font-bold text-red-200">{bookingError}</p> : null}
                    {holdSeconds <= 0 ? <button type="button" onClick={restartReservation} className="w-full rounded-lg border border-white/30 px-4 py-3 text-xs font-black uppercase">Phiên đã hết hạn · Bắt đầu lại</button> : null}
                    <button
                      type="button"
                      disabled={busy || holdSeconds <= 0 || !paymentProof || !commitmentChecks.identity || !commitmentChecks.fees}
                      onPointerDown={beginCommitmentHold}
                      onPointerUp={cancelCommitmentHold}
                      onPointerLeave={cancelCommitmentHold}
                      onPointerCancel={cancelCommitmentHold}
                      className="relative w-full touch-none overflow-hidden rounded-lg bg-acid px-5 py-4 text-xs font-black uppercase tracking-wider text-ink disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
                    >
                      <span className="absolute inset-y-0 left-0 bg-ink/15" style={{ width: commitmentHolding ? "100%" : "0%", transition: commitmentHolding ? "width 1.5s linear" : "none" }} />
                      <span className="relative flex items-center justify-center gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}Giữ 1,5 giây để xác nhận cam kết</span>
                    </button>
                    <button type="button" disabled={busy} onClick={() => { cancelCommitmentHold(); setBookingStep("form"); }} className="w-full py-2 text-[11px] font-black text-white/55 hover:text-white">Quay lại thông tin đặt thuê</button>
                  </div>
                </section>
              ) : null}

              {bookingStep === "done" && booking ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-green-800">
                    <CheckCircle2 className="h-5 w-5" />
                    <p className="mt-3 text-lg font-black">
                      Đã gửi yêu cầu thuê
                    </p>
                    <p className="mt-1 text-sm font-semibold">
                      Mã đơn của bạn là <strong>{booking.id}</strong>. Đội ngũ
                      sẽ kiểm tra và phản hồi sau khi duyệt.
                    </p>
                  </div>
                  <div className="rounded-lg bg-paper p-4 text-sm font-semibold">
                    <p>
                      Trạng thái: <StatusBadge state={booking.state} />
                    </p>
                    <p className="mt-3">
                      Tiền thuê: {money(booking.totalAmount)} · Cọc thiết bị: {money(booking.equipmentDeposit)} · Giữ lịch: {money(booking.bookingDeposit)}
                    </p>
                    <p className="mt-2 font-black">Cần thanh toán ban đầu: {money(booking.amountDueNow)}</p>
                  </div>
                  <BookingJourney state={booking.state} />
                  <button
                    onClick={onViewOrders || onBack}
                    className="w-full rounded-lg bg-ink px-5 py-4 text-xs font-black uppercase tracking-widest text-acid"
                  >
                    Xem lịch sử đơn hàng
                  </button>
                </div>
              ) : null}
            </div>
            {bookingStep === "form" ? <div className="md:col-span-2">
              <RentalCalendar
                month={calendarMonth}
                schedule={schedule}
                totalQty={product.totalQty}
                pickupTime={form.pickupTime}
                expanded={calendarExpanded}
                onMonth={setCalendarMonth}
                onToggleExpanded={setCalendarExpanded}
                onPick={(date) => {
                  const pickup = new Date(form.pickupTime);
                  pickup.setFullYear(
                    date.getFullYear(),
                    date.getMonth(),
                    date.getDate(),
                  );
                  pickup.setHours(date.getHours(), 0, 0, 0);
                  const returns = new Date(form.returnTime);
                  if (returns <= pickup)
                    returns.setTime(pickup.getTime() + 86400000);
                  setForm({
                    ...form,
                    pickupTime: localDateTime(pickup),
                    returnTime: localDateTime(returns),
                  });
                }}
              />
            </div> : null}
          </div>
        </div>
      </div>
      </main>
    </>
  );
}

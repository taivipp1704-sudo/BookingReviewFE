import { CalendarDays, ChevronLeft, ChevronRight, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api.js";

const DAY_MS = 86_400_000;

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function isoLocal(date) {
  const pad = value => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
}

export default function CustomerCalendarPage() {
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState("");
  const [weekStart, setWeekStart] = useState(() => startOfDay(new Date()));
  const [blocks, setBlocks] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.products().then(items => {
      // Lịch chỉ theo dõi máy chính (L1). Phụ kiện như pin, thẻ nhớ, đế sạc được
      // quản lý theo số lượng nên không có lịch riêng, đưa vào đây chỉ gây rối.
      const mainDevices = items.filter(item => item.levelCode === "L1");
      const selectable = mainDevices.length ? mainDevices : items;
      setProducts(selectable);
      setProductId(current =>
        selectable.some(item => item.id === current) ? current : selectable[0]?.id || "");
    }).catch(nextError => setError(nextError.message));
  }, []);

  useEffect(() => {
    if (!productId) return;
    const end = new Date(weekStart.getTime() + 7 * DAY_MS);
    api.schedule(productId, isoLocal(weekStart), isoLocal(end))
      .then(setBlocks)
      .catch(nextError => setError(nextError.message));
  }, [productId, weekStart]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * DAY_MS)), [weekStart]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 pb-16 pt-28 sm:px-6">
      <div className="flex flex-col gap-5 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-muted">Lịch thiết bị</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Khung giờ đã được giữ</h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-muted">Lịch chỉ hiển thị thời gian bận và số lượng đã giữ, không hiển thị thông tin khách hàng.</p>
        </div>
        <label className="text-xs font-black text-muted">Thiết bị
          <select value={productId} onChange={event => setProductId(event.target.value)} className="mt-2 block min-w-[260px] rounded-lg border border-line bg-white px-4 py-3 text-sm font-bold text-ink">
            {products.map(product => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-6 flex items-center justify-between rounded-lg border border-line bg-white p-3">
        <button type="button" onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY_MS))} className="grid h-10 w-10 place-items-center rounded-lg border border-line" aria-label="Tuần trước"><ChevronLeft className="h-4 w-4" /></button>
        <div className="flex items-center gap-2 text-sm font-black"><CalendarDays className="h-4 w-4" />{days[0].toLocaleDateString("vi-VN")} - {days[6].toLocaleDateString("vi-VN")}</div>
        <button type="button" onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY_MS))} className="grid h-10 w-10 place-items-center rounded-lg border border-line" aria-label="Tuần sau"><ChevronRight className="h-4 w-4" /></button>
      </div>

      {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</p> : null}
      <div className="mt-4 grid gap-3 md:grid-cols-7">
        {days.map(day => {
          const dayKey = day.toDateString();
          const dayBlocks = blocks.filter(block => new Date(block.pickupTime).toDateString() === dayKey);
          return (
            <section key={dayKey} className="min-h-44 rounded-lg border border-line bg-white p-3">
              <p className="text-[10px] font-black uppercase text-muted">{day.toLocaleDateString("vi-VN", { weekday: "short" })}</p>
              <p className="mt-1 text-lg font-black">{day.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</p>
              <div className="mt-4 space-y-2">
                {dayBlocks.length ? dayBlocks.map((block, index) => (
                  <div key={`${block.pickupTime}-${index}`} className="rounded-md border-l-4 border-purple-500 bg-purple-50 p-2 text-xs font-bold text-purple-900">
                    <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{new Date(block.pickupTime).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
                    <span className="mt-1 block text-[10px] text-purple-700">Đã giữ {block.reservedQuantity} thiết bị</span>
                  </div>
                )) : <p className="text-xs font-semibold text-muted">Chưa có lịch bận</p>}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}

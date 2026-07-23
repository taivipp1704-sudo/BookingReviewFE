import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Download,
  FileClock,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Minus,
  Package,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Tags,
  IdCard,
  Trash2,
  UserCog,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import writeXlsxFile from "write-excel-file";
import Metric from "../components/Metric.jsx";
import BrandMark from "../components/BrandMark.jsx";
import SecureImagePreview from "../components/SecureImagePreview.jsx";
import StatusBadge, { bookingStateLabels } from "../components/StatusBadge.jsx";
import { api } from "../lib/api.js";
import { money, shortDate } from "../lib/format.js";
import { invoiceHtml } from "../lib/invoiceTemplate.js";

const pages = [
  { id: "dashboard", label: "Tổng quan & lịch", icon: LayoutDashboard },
  { id: "invoices", label: "Hóa đơn", icon: Printer, roles: ["ADMIN", "MANAGER"] },
  { id: "orders", label: "Đơn thuê", icon: ClipboardList, roles: ["ADMIN", "MANAGER", "OPS", "SALES", "WAREHOUSE"] },
  { id: "catalog", label: "Danh mục", icon: Package },
  { id: "bundles", label: "Combo", icon: Package },
  { id: "promotions", label: "Khuyến mãi", icon: Tags, roles: ["ADMIN", "MANAGER", "SALES"] },
  { id: "inventory", label: "Kho máy", icon: Boxes, roles: ["ADMIN", "MANAGER", "WAREHOUSE", "TECH"] },
  { id: "finance", label: "Sổ quỹ", icon: Wallet, roles: ["ADMIN", "MANAGER"] },
  { id: "support", label: "Hỗ trợ", icon: LifeBuoy, roles: ["ADMIN", "MANAGER", "OPS", "SALES"] },
  { id: "staff", label: "Nhân sự", icon: UserCog, roles: ["ADMIN"] },
];
const states = [
  "ALL",
  "PENDING_REVIEW",
  "NEGOTIATION",
  "CONDITIONAL",
  "TEMP_HOLD",
  "CONFIRMED",
  "READY_FOR_PICKUP",
  "IN_USE",
  "INCIDENT",
  "COMPLETED",
  "REJECTED",
];
const transitions = {
  PENDING_REVIEW: ["NEGOTIATION", "CONDITIONAL", "TEMP_HOLD", "CONFIRMED", "REJECTED"],
  NEGOTIATION: ["CONDITIONAL", "TEMP_HOLD", "CONFIRMED", "REJECTED"],
  CONDITIONAL: ["NEGOTIATION", "TEMP_HOLD", "CONFIRMED", "REJECTED"],
  TEMP_HOLD: ["NEGOTIATION", "CONFIRMED", "REJECTED"],
  CONFIRMED: ["READY_FOR_PICKUP", "IN_USE", "REJECTED"],
  READY_FOR_PICKUP: ["IN_USE", "REJECTED"],
  IN_USE: ["COMPLETED", "INCIDENT"],
  INCIDENT: ["IN_USE", "COMPLETED"],
};

export default function AdminPage({
  user,
  activePage,
  detailId,
  onNavigate,
  onLogout,
}) {
  const [headerVisible, setHeaderVisible] = useState(true);
  const visiblePages = pages.filter((item) => !item.roles || item.roles.includes(user.role));
  const canReadBookings = ["ADMIN", "MANAGER", "OPS", "SALES", "WAREHOUSE"].includes(user.role);
  const canReadFinance = ["ADMIN", "MANAGER"].includes(user.role);
  const canReadPromotions = ["ADMIN", "MANAGER", "SALES"].includes(user.role);
  const canReadSupport = ["ADMIN", "MANAGER", "OPS", "SALES"].includes(user.role);
  const requestedPage = activePage === "calendar" ? "dashboard" : activePage;
  const page = visiblePages.some((item) => item.id === requestedPage)
    ? requestedPage
    : "dashboard";

  useEffect(() => {
    let lastScrollY = window.scrollY;
    let frameRequested = false;

    function updateHeader() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY;

      if (currentScrollY <= 24) {
        setHeaderVisible(true);
      } else if (currentScrollY > 80 && delta > 6) {
        setHeaderVisible(false);
      } else if (delta < -6) {
        setHeaderVisible(true);
      }

      lastScrollY = currentScrollY;
      frameRequested = false;
    }

    function handleScroll() {
      if (!frameRequested) {
        frameRequested = true;
        window.requestAnimationFrame(updateHeader);
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
  const [bookings, setBookings] = useState([]);
  const [products, setProducts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [stock, setStock] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [finance, setFinance] = useState({
    revenue: 0,
    expense: 0,
    cashOnHand: 0,
  });
  const [entries, setEntries] = useState([]);
  const [supportRequests, setSupportRequests] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [audit, setAudit] = useState([]);
  const [bookingOperations, setBookingOperations] = useState({ reservations: [], allocations: [] });
  const [bookingFinance, setBookingFinance] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [staffUsers, setStaffUsers] = useState([]);
  const [nextState, setNextState] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected =
    bookings.find((booking) => booking.id === selectedId) ||
    bookings[0] ||
    null;
  const productById = useMemo(
    () => Object.fromEntries(products.map((product) => [product.id, product])),
    [products],
  );

  useEffect(() => {
    refresh();
  }, [filter, page]);
  useEffect(() => {
    if (page === "orders" && detailId) setSelectedId(detailId);
  }, [detailId, page]);
  useEffect(() => {
    if (!selected?.id) return;
    Promise.allSettled([
      api.bookingAudit(selected.id),
      api.bookingOperations(selected.id),
      canReadFinance ? api.bookingFinance(selected.id) : Promise.resolve(null),
    ])
      .then(([auditResult, operationsResult, financeResult]) => {
        setAudit(auditResult.status === "fulfilled" ? auditResult.value : []);
        setBookingOperations(operationsResult.status === "fulfilled"
          ? operationsResult.value
          : { reservations: [], allocations: [] });
        setBookingFinance(financeResult.status === "fulfilled" ? financeResult.value : null);
      });
    setNextState((transitions[selected.state] || [])[0] || "");
    setReason("");
  }, [selected?.id, selected?.state]);

  async function refresh() {
    setBusy(true);
    setError("");
    try {
      const data = await Promise.all([
        canReadBookings
          ? api.adminBookings({
              query: page === "orders" ? query : "",
              state: page === "orders" ? filter : "ALL",
            })
          : Promise.resolve([]),
        api.adminProducts(),
        api.assets(),
        api.stock(),
        canReadFinance ? api.financeSummary() : Promise.resolve({ revenue: 0, expense: 0, cashOnHand: 0 }),
        canReadFinance ? api.financeEntries() : Promise.resolve([]),
        canReadSupport ? api.adminSupport() : Promise.resolve([]),
        api.adminBundles(),
        canReadPromotions ? api.adminPromotions() : Promise.resolve([]),
        ["ADMIN", "MANAGER", "WAREHOUSE", "TECH"].includes(user.role)
          ? api.inventoryLedger()
          : Promise.resolve([]),
        user.role === "ADMIN" ? api.adminUsers() : Promise.resolve([]),
      ]);
      setBookings(data[0]);
      setProducts(data[1]);
      setAssets(data[2]);
      setStock(data[3]);
      setFinance({
        ...data[4],
        revenue: data[4].recognizedRevenue || 0,
        expense: data[4].committedOutflows || 0,
        cashOnHand: data[4].availableCash || 0,
      });
      setEntries(data[5].map((item) => ({
        ...item,
        type: `${item.direction} · ${item.accountCode}`,
        method: "LEDGER",
      })));
      setSupportRequests(data[6]);
      setBundles(data[7]);
      setPromotions(data[8]);
      setLedgerEntries(data[9]);
      setStaffUsers(data[10]);
      setSelectedId((current) =>
        data[0].some((item) => item.id === current)
          ? current
          : data[0][0]?.id || null,
      );
    } catch (nextError) {
      setError(nextError.message);
      if (nextError.status === 401) onLogout();
    } finally {
      setBusy(false);
    }
  }

  async function changeState(event) {
    event.preventDefault();
    if (!selected || !nextState) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.changeBookingState(
        selected.id,
        nextState,
        reason,
      );
      setBookings((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      setAudit(await api.bookingAudit(selected.id));
      setBookingOperations(await api.bookingOperations(selected.id));
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function approveHandover() {
    if (!selected || !["CONFIRMED", "READY_FOR_PICKUP"].includes(selected.state)) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.changeBookingState(
        selected.id,
        "IN_USE",
        "Đã duyệt và bàn giao thiết bị cho khách.",
      );
      setBookings((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      setAudit(await api.bookingAudit(selected.id));
      setBookingOperations(await api.bookingOperations(selected.id));
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function reviewEarlyPickup(approved, fee, reviewReason) {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.reviewEarlyPickup(selected.id, {
        approved,
        fee: Number(fee || 0),
        reason: reviewReason,
      });
      setBookings((current) =>
        current.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      setAudit(await api.bookingAudit(selected.id));
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function autoAllocate() {
    if (!selected) return;
    setBusy(true);
    setError("");
    try {
      const nextOperations = await api.autoAllocateBooking(selected.id);
      setBookingOperations(nextOperations);
      setAudit(await api.bookingAudit(selected.id));
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshSelectedFinance() {
    if (!selected?.id || !canReadFinance) return;
    const [nextFinance, dashboard, nextEntries] = await Promise.all([
      api.bookingFinance(selected.id),
      api.financeSummary(),
      api.financeEntries(),
    ]);
    setBookingFinance(nextFinance);
    setFinance({
      ...dashboard,
      revenue: dashboard.recognizedRevenue || 0,
      expense: dashboard.committedOutflows || 0,
      cashOnHand: dashboard.availableCash || 0,
    });
    setEntries(nextEntries.map((item) => ({
      ...item,
      type: `${item.direction} · ${item.accountCode}`,
      method: "LEDGER",
    })));
  }

  function navigate(pageId) {
    onNavigate(pageId === "dashboard" ? "/admin" : `/admin/${pageId}`);
  }

  return (
    <div className="min-h-screen bg-[#EBEBE9]">
      <header className={`fixed left-4 right-4 top-4 z-40 mx-auto flex max-w-[1600px] items-center justify-between rounded-full border border-white/70 bg-white/90 px-4 py-3 shadow-soft backdrop-blur transition-[transform,opacity] duration-300 ease-out will-change-transform sm:px-5 ${headerVisible ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-[calc(100%+2rem)] opacity-0"}`}>
        <BrandMark compact />
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-black">{user.email}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              {user.role}
            </p>
          </div>
          <button
            onClick={onLogout}
            title="Đang xuất"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-acid"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className={`fixed left-0 right-0 z-30 flex overflow-x-auto border-b border-line bg-ink px-3 text-white transition-[top] duration-300 ease-out lg:hidden ${headerVisible ? "top-[84px]" : "top-0"}`}>
        {visiblePages.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => navigate(id)}
            className={`flex shrink-0 items-center gap-2 px-4 py-3 text-[10px] font-black uppercase ${page === id ? "text-acid" : "text-white/55"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      <aside className="fixed bottom-0 left-0 top-0 hidden w-[88px] overflow-y-auto bg-ink px-3 pt-28 text-white lg:block">
        <nav className="space-y-3 pb-6">
          {visiblePages.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`flex w-full flex-col items-center gap-2 rounded-lg px-2 py-4 text-[10px] font-bold transition ${page === id ? "bg-white/10 text-acid" : "text-white/55 hover:bg-white/10 hover:text-white"}`}
            >
              <Icon className="h-5 w-5" />
              {label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="mx-auto max-w-[1512px] px-4 pb-12 pt-36 lg:ml-[88px] lg:px-8 lg:pt-28">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted">
              Admin portal
            </p>
            <h1 className="mt-1 text-3xl font-black">
              {visiblePages.find((item) => item.id === page)?.label}
            </h1>
          </div>
          <button
            onClick={refresh}
            disabled={busy}
            title="Tải lại"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-acid disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
          </button>
        </div>
        {error ? (
          <p className="mb-5 border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
        {page === "dashboard" ? (
          <Dashboard
            bookings={bookings}
            products={products}
            assets={assets}
            stock={stock}
            finance={finance}
            productById={productById}
            onOpenOrders={() => navigate("orders")}
            onOpenBooking={(bookingId) => {
              setSelectedId(bookingId);
              onNavigate(`/admin/orders/${encodeURIComponent(bookingId)}`);
            }}
            onNavigate={navigate}
          />
        ) : null}
        {page === "invoices" ? (
          <Invoices entries={entries} bookings={bookings} products={products} />
        ) : null}
        {page === "orders" ? (
          <Orders
            bookings={bookings}
            selected={selected}
            productById={productById}
            audit={audit}
            filter={filter}
            setFilter={setFilter}
            query={query}
            setQuery={setQuery}
            setSelectedId={setSelectedId}
            nextState={nextState}
            setNextState={setNextState}
            reason={reason}
            setReason={setReason}
            busy={busy}
            refresh={refresh}
            changeState={changeState}
            approveHandover={approveHandover}
            reviewEarlyPickup={reviewEarlyPickup}
            operations={bookingOperations}
            financeData={bookingFinance}
            refreshFinance={refreshSelectedFinance}
            autoAllocate={autoAllocate}
            canViewIdentity={["ADMIN", "MANAGER"].includes(user.role)}
          />
        ) : null}
        {page === "catalog" ? (
          <Catalog
            products={products}
            assets={assets}
            stock={stock}
            bundles={bundles}
            detailId={detailId}
            onNavigate={onNavigate}
            refresh={refresh}
            canManage={["ADMIN", "MANAGER"].includes(user.role)}
            ledgerEntries={ledgerEntries}
          />
        ) : null}
        {page === "bundles" ? (
          <Bundles bundles={bundles} products={products} assets={assets} stock={stock} refresh={refresh} canManage={["ADMIN", "MANAGER"].includes(user.role)} />
        ) : null}
        {page === "promotions" ? (
          <Promotions promotions={promotions} refresh={refresh} />
        ) : null}
        {page === "inventory" ? (
          <Inventory
            assets={assets}
            stock={stock}
            productById={productById}
            ledgerEntries={ledgerEntries}
            detailId={detailId}
            onNavigate={onNavigate}
            refresh={refresh}
          />
        ) : null}
        {page === "finance" ? (
          <Finance finance={finance} entries={entries} bookings={bookings} assets={assets} refreshDashboard={refresh} />
        ) : null}
        {page === "support" ? (
          <Support requests={supportRequests} refresh={refresh} />
        ) : null}
        {page === "staff" ? (
          <Staff users={staffUsers} refresh={refresh} />
        ) : null}
      </main>
    </div>
  );
}

function Dashboard({
  bookings,
  products,
  assets,
  stock,
  finance,
  productById,
  onOpenOrders,
  onOpenBooking,
  onNavigate,
}) {
  const lowStock = stock.filter((item) => item.availableQty <= 5);
  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-line bg-[#E8F3E5] p-5">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div><p className="text-[10px] font-black uppercase text-muted">Doanh thu</p><p className="mt-2 text-xl font-black">{money(finance.revenue)}</p></div>
          <div><p className="text-[10px] font-black uppercase text-muted">Thiết bị serial</p><p className="mt-2 text-xl font-black">{assets.length}</p></div>
          <div><p className="text-[10px] font-black uppercase text-muted">Sản phẩm</p><p className="mt-2 text-xl font-black">{products.length}</p></div>
          <div><p className="text-[10px] font-black uppercase text-muted">Tồn kho thấp</p><p className="mt-2 text-xl font-black">{lowStock.length}</p></div>
        </div>
      </section>
      <section className="rounded-lg border border-line bg-[#F3F4F2] p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase text-muted">Không gian điều phối</p>
            <h2 className="mt-1 text-2xl font-black">Lịch booking</h2>
          </div>
          <button onClick={onOpenOrders} className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2 text-[10px] font-black uppercase">
            <ClipboardList className="h-4 w-4" /> Mở sổ đơn
          </button>
        </div>
        <BookingCalendar bookings={bookings} productById={productById} onOpenBooking={onOpenBooking} />
      </section>
    </div>
  );
}

const calendarScopes = [
  { id: "ALL", label: "Tất cả" },
  { id: "PENDING", label: "Chờ duyệt" },
  { id: "CONFIRMED", label: "Đã chốt" },
  { id: "IN_USE", label: "Đang thuê" },
];

function startOfCalendarWeek(value) {
  const day = new Date(value);
  day.setHours(0, 0, 0, 0);
  day.setDate(day.getDate() - ((day.getDay() + 6) % 7));
  return day;
}

function sameCalendarDay(left, right) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function calendarEventTone(state) {
  if (["PENDING_REVIEW", "NEGOTIATION", "CONDITIONAL", "TEMP_HOLD"].includes(state)) {
    return "border-amber-500 bg-amber-50 text-amber-950";
  }
  if (["CONFIRMED", "READY_FOR_PICKUP"].includes(state)) {
    return "border-green-600 bg-green-50 text-green-950";
  }
  if (state === "IN_USE") return "border-sky-600 bg-sky-50 text-sky-950";
  if (state === "INCIDENT") return "border-red-600 bg-red-50 text-red-950";
  return "border-zinc-400 bg-zinc-50 text-zinc-800";
}

export function BookingCalendar({ bookings, productById, onOpenBooking }) {
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [scope, setScope] = useState("ALL");
  const [view, setView] = useState("WEEK");
  const [showNavigator, setShowNavigator] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const weekStart = useMemo(() => startOfCalendarWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + index);
        return day;
      }),
    [weekStart],
  );
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const scopedBookings = bookings.filter((booking) => {
    if (scope === "PENDING") {
      return ["PENDING_REVIEW", "NEGOTIATION", "CONDITIONAL", "TEMP_HOLD"].includes(booking.state);
    }
    if (scope === "CONFIRMED") {
      return ["CONFIRMED", "READY_FOR_PICKUP"].includes(booking.state);
    }
    if (scope === "IN_USE") return booking.state === "IN_USE";
    return true;
  });
  const weekBookings = scopedBookings
    .filter(
      (booking) =>
        new Date(booking.pickupTime) < weekEnd &&
        new Date(booking.returnTime) > weekStart,
    )
    .sort((left, right) => new Date(left.pickupTime) - new Date(right.pickupTime));
  const selectedBooking =
    weekBookings.find((booking) => booking.id === selectedBookingId) ||
    weekBookings[0] ||
    null;
  const monthFirst = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1);
  const monthGridStart = startOfCalendarWeek(monthFirst);
  const monthDays = Array.from({ length: 42 }, (_, index) => {
    const day = new Date(monthGridStart);
    day.setDate(monthGridStart.getDate() + index);
    return day;
  });
  const today = new Date();
  const startHour = 6;
  const endHour = 23;
  const hourHeight = 56;
  const timelineHeight = (endHour - startHour) * hourHeight;

  function shiftWeek(amount) {
    setAnchorDate((current) => {
      const next = new Date(current);
      next.setDate(next.getDate() + amount * 7);
      return next;
    });
  }

  function shiftMonth(amount) {
    setAnchorDate((current) =>
      new Date(current.getFullYear(), current.getMonth() + amount, 1),
    );
  }

  function bookingTitle(booking) {
    const names = (booking.items || [])
      .map((line) => productById[line.productId]?.name || line.productId)
      .filter(Boolean);
    return names.length ? names.join(", ") : booking.customerName;
  }

  function dayLayout(day) {
    const visibleStart = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      startHour,
    );
    const visibleEnd = new Date(
      day.getFullYear(),
      day.getMonth(),
      day.getDate(),
      endHour,
    );
    const laneEnds = [];
    const segments = weekBookings
      .filter(
        (booking) =>
          new Date(booking.pickupTime) < visibleEnd &&
          new Date(booking.returnTime) > visibleStart,
      )
      .map((booking) => ({
        booking,
        start: new Date(Math.max(new Date(booking.pickupTime), visibleStart)),
        end: new Date(Math.min(new Date(booking.returnTime), visibleEnd)),
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
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <p className="text-[10px] font-black uppercase text-muted">Điều phối theo thời gian</p>
          <h2 className="mt-1 text-xl font-black">
            {weekStart.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}
            {" – "}
            {weekDays[6].toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setShowNavigator((value) => !value)} className={`flex h-10 items-center gap-2 rounded-lg border px-3 text-[10px] font-black uppercase ${showNavigator ? "border-ink bg-ink text-acid" : "border-line bg-white text-muted"}`}>
            <CalendarDays className="h-4 w-4" /> {showNavigator ? "Thu gọn tháng" : "Mở lịch tháng"}
          </button>
          <div className="flex rounded-lg border border-line bg-white p-1">
            {calendarScopes.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScope(item.id)}
                className={`h-8 rounded px-3 text-[10px] font-black ${scope === item.id ? "bg-ink text-acid" : "text-muted"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-line bg-white p-1">
            {[{ id: "WEEK", label: "Tuần" }, { id: "AGENDA", label: "Danh sách" }].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setView(item.id)}
                className={`h-8 rounded px-3 text-[10px] font-black ${view === item.id ? "bg-ink text-acid" : "text-muted"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="space-y-4">
        <aside className={`${showNavigator ? "block" : "hidden"} rounded-lg border border-line bg-white p-4`}>
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => shiftMonth(-1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line" title="Tháng trước" aria-label="Tháng trước"><ChevronLeft className="h-4 w-4" /></button>
            <strong className="text-sm">Tháng {anchorDate.getMonth() + 1}/{anchorDate.getFullYear()}</strong>
            <button type="button" onClick={() => shiftMonth(1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line" title="Tháng sau" aria-label="Tháng sau"><ChevronRight className="h-4 w-4" /></button>
          </div>
          <div className="mt-4 grid grid-cols-7 gap-1">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((label) => (
              <span key={label} className="py-1 text-center text-[9px] font-black text-muted">{label}</span>
            ))}
            {monthDays.map((day) => {
              const inWeek = day >= weekStart && day < weekEnd;
              const active = sameCalendarDay(day, anchorDate);
              const hasBooking = scopedBookings.some(
                (booking) =>
                  new Date(booking.pickupTime) < new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1) &&
                  new Date(booking.returnTime) > new Date(day.getFullYear(), day.getMonth(), day.getDate()),
              );
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setAnchorDate(day)}
                  className={`relative grid h-8 place-items-center rounded text-[10px] font-black ${
                    day.getMonth() !== anchorDate.getMonth() ? "text-muted/35" : ""
                  } ${inWeek ? "bg-paper" : ""} ${active ? "bg-ink text-acid" : ""}`}
                >
                  {day.getDate()}
                  {hasBooking ? <span className={`absolute bottom-0.5 h-1 w-1 rounded-full ${active ? "bg-acid" : "bg-orange-500"}`} /> : null}
                </button>
              );
            })}
          </div>

          <div className="mt-5 border-t border-line pt-4">
            {selectedBooking ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-black text-muted">{selectedBooking.id}</p>
                    <h3 className="mt-1 text-base font-black">{selectedBooking.customerName}</h3>
                  </div>
                  <StatusBadge state={selectedBooking.state} />
                </div>
                <p className="mt-3 text-xs font-bold">{bookingTitle(selectedBooking)}</p>
                <p className="mt-2 text-[10px] font-semibold leading-5 text-muted">
                  {shortDate(selectedBooking.pickupTime)}<br />
                  đến {shortDate(selectedBooking.returnTime)}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-xs font-black">
                  <span>{money(selectedBooking.totalAmount)}</span>
                  <button type="button" onClick={() => onOpenBooking(selectedBooking.id)} className="rounded-lg bg-ink px-3 py-2 text-[10px] font-black uppercase text-acid">Mở đơn</button>
                </div>
              </>
            ) : (
              <p className="py-5 text-center text-xs font-bold text-muted">Tuần này chưa có booking.</p>
            )}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line p-3">
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => shiftWeek(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line" title="Tuần trước" aria-label="Tuần trước"><ChevronLeft className="h-4 w-4" /></button>
              <button type="button" onClick={() => setAnchorDate(new Date())} className="h-9 rounded-lg border border-line px-3 text-[10px] font-black uppercase">Hôm nay</button>
              <button type="button" onClick={() => shiftWeek(1)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-line" title="Tuần sau" aria-label="Tuần sau"><ChevronRight className="h-4 w-4" /></button>
            </div>
            <p className="text-xs font-bold text-muted">{weekBookings.length} booking trong tuần</p>
          </div>

          {view === "WEEK" ? (
            <div className="overflow-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[64px_repeat(7,minmax(120px,1fr))] border-b border-line bg-paper">
                  <div />
                  {weekDays.map((day) => (
                    <div key={day.toISOString()} className={`border-l border-line px-2 py-3 text-center ${sameCalendarDay(day, today) ? "bg-ink text-white" : ""}`}>
                      <p className="text-[9px] font-black uppercase opacity-60">{day.toLocaleDateString("vi-VN", { weekday: "short" })}</p>
                      <p className="mt-1 text-sm font-black">{day.getDate()}/{day.getMonth() + 1}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-[64px_repeat(7,minmax(120px,1fr))]">
                  <div className="relative border-r border-line" style={{ height: timelineHeight }}>
                    {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
                      <span key={index} className="absolute right-2 -translate-y-1/2 text-[9px] font-bold text-muted" style={{ top: index * hourHeight }}>
                        {String(startHour + index).padStart(2, "0")}:00
                      </span>
                    ))}
                  </div>
                  {weekDays.map((day) => {
                    const segments = dayLayout(day);
                    const showNow = sameCalendarDay(day, today) && today.getHours() >= startHour && today.getHours() < endHour;
                    return (
                      <div key={day.toISOString()} className="relative border-r border-line last:border-r-0" style={{ height: timelineHeight }}>
                        {Array.from({ length: endHour - startHour + 1 }, (_, index) => (
                          <span key={index} className="absolute left-0 right-0 border-t border-line/70" style={{ top: index * hourHeight }} />
                        ))}
                        {showNow ? (
                          <span className="absolute left-0 right-0 z-20 border-t-2 border-red-500" style={{ top: ((today.getHours() - startHour) * 60 + today.getMinutes()) / 60 * hourHeight }} />
                        ) : null}
                        {segments.map(({ booking, start, end, lane, laneCount }) => {
                          const startMinutes = start.getHours() * 60 + start.getMinutes() - startHour * 60;
                          const durationMinutes = Math.max((end - start) / 60000, 30);
                          return (
                            <button
                              key={`${booking.id}-${day.toISOString()}`}
                              type="button"
                              onClick={() => {
                                setSelectedBookingId(booking.id);
                                onOpenBooking(booking.id);
                              }}
                              title={`${booking.id} · ${booking.customerName}`}
                              className={`absolute z-10 overflow-hidden rounded border-l-4 p-2 text-left shadow-sm ${calendarEventTone(booking.state)} ${selectedBooking?.id === booking.id ? "ring-2 ring-ink ring-offset-1" : ""}`}
                              style={{
                                top: (startMinutes / 60) * hourHeight + 2,
                                height: Math.max((durationMinutes / 60) * hourHeight - 4, 34),
                                left: `calc(${(lane / laneCount) * 100}% + 3px)`,
                                width: `calc(${100 / laneCount}% - 6px)`,
                              }}
                            >
                              <strong className="block truncate text-[10px]">{booking.customerName}</strong>
                              <span className="mt-1 block truncate text-[9px] font-bold opacity-75">{bookingTitle(booking)}</span>
                              <span className="mt-1 block text-[8px] font-black opacity-70">
                                {start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} – {end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-line">
              {weekBookings.map((booking) => (
                <button key={booking.id} type="button" onClick={() => {
                  setSelectedBookingId(booking.id);
                  onOpenBooking(booking.id);
                }} className="grid w-full gap-3 p-4 text-left hover:bg-paper sm:grid-cols-[150px_1fr_auto] sm:items-center">
                  <span className="text-xs font-black">{shortDate(booking.pickupTime)}</span>
                  <span><strong className="block text-sm">{booking.customerName}</strong><span className="mt-1 block text-[10px] font-bold text-muted">{booking.id} · {bookingTitle(booking)}</span></span>
                  <StatusBadge state={booking.state} />
                </button>
              ))}
              {weekBookings.length === 0 ? <p className="p-12 text-center text-sm font-bold text-muted">Không có booking trong tuần này.</p> : null}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function openInvoiceDocument(entry, booking, products) {
  const popup = window.open("", "_blank", "width=860,height=720");
  if (!popup) return;
  popup.opener = null;
  popup.document.write(invoiceHtml({ entry, booking, products }));
  popup.document.close();
}

function Invoices({ entries, bookings, products }) {
  const [search, setSearch] = useState("");
  const bookingById = useMemo(
    () => Object.fromEntries(bookings.map((item) => [item.id, item])),
    [bookings],
  );
  const invoiceEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return entries
      .filter((entry) => entry.bookingId && bookingById[entry.bookingId])
      .filter((entry) => {
        if (!normalizedSearch) return true;
        const booking = bookingById[entry.bookingId];
        return [
          entry.id,
          entry.bookingId,
          booking?.customerName,
          booking?.phone,
        ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
      });
  }, [bookingById, entries, search]);
  const invoiceTotal = invoiceEntries.reduce(
    (sum, entry) => sum + Math.abs(Number(entry.amount || 0)),
    0,
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-4 border-y border-line bg-white px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted">
            Chứng từ khách hàng
          </p>
          <h2 className="mt-1 text-2xl font-black">Xuất hóa đơn theo đơn thuê</h2>
          <p className="mt-2 text-sm font-semibold text-muted">
            Chọn giao dịch đã ghi nhận để mở mẫu hóa đơn và in hoặc lưu PDF
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-5 text-right">
          <div>
            <p className="text-[10px] font-black uppercase text-muted">Hóa đơn</p>
            <p className="mt-1 text-xl font-black">{invoiceEntries.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted">Tổng giá trị</p>
            <p className="mt-1 text-xl font-black">{money(invoiceTotal)}</p>
          </div>
        </div>
      </section>

      <label className="flex max-w-xl items-center gap-3 rounded-lg border border-line bg-white px-4">
        <Search className="h-4 w-4 shrink-0 text-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm mã đơn khách hàng hoặc số điện thoại"
          className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold outline-none"
        />
      </label>

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-paper text-[10px] font-black uppercase text-muted">
            <tr>
              <th className="p-4">Giao dịch</th>
              <th>Đơn thuê</th>
              <th>Khách hàng</th>
              <th>Thời gian</th>
              <th className="text-right">Giá trị</th>
              <th className="px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {invoiceEntries.map((entry) => {
              const booking = bookingById[entry.bookingId];
              return (
                <tr key={entry.id} className="border-t border-line">
                  <td className="p-4 font-black">{entry.id}</td>
                  <td>
                    <p className="font-black">{entry.bookingId}</p>
                    <StatusBadge state={booking.state} />
                  </td>
                  <td>
                    <p className="font-black">{booking.customerName}</p>
                    <p className="mt-1 text-xs font-semibold text-muted">{booking.phone}</p>
                  </td>
                  <td>{shortDate(entry.postedAt)}</td>
                  <td className="text-right font-black">{money(Math.abs(Number(entry.amount || 0)))}</td>
                  <td className="px-4 text-right">
                    <button
                      type="button"
                      onClick={() => openInvoiceDocument(entry, booking, products)}
                      className="inline-flex items-center gap-2 rounded-lg bg-ink px-3 py-2 text-[10px] font-black uppercase text-acid"
                    >
                      <Printer className="h-4 w-4" />
                      Xuất hóa đơn
                    </button>
                  </td>
                </tr>
              );
            })}
            {!invoiceEntries.length ? (
              <tr>
                <td colSpan="6" className="p-10 text-center text-sm font-bold text-muted">
                  Chưa có giao dịch phù hợp để xuất hóa đơn
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Orders({
  bookings,
  selected,
  productById,
  audit,
  filter,
  setFilter,
  query,
  setQuery,
  setSelectedId,
  nextState,
  setNextState,
  reason,
  setReason,
  busy,
  refresh,
  changeState,
  approveHandover,
  reviewEarlyPickup,
  operations,
  financeData,
  refreshFinance,
  autoAllocate,
  canViewIdentity,
}) {
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(
    () => () => {
      if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
    },
    [imagePreview],
  );

  function showImage(blob, title) {
    setImagePreview({
      url: URL.createObjectURL(blob),
      title,
    });
  }

  async function openIdentity(side) {
    try {
      const image = await api.adminIdentityDocument(selected.id, side);
      showImage(
        image,
        `${side === "front" ? "Mặt trước" : "Mặt sau"} CCCD · ${selected.id}`,
      );
    } catch (error) {
      window.alert(error.message);
    }
  }

  async function openPaymentProof() {
    try {
      const image = await api.adminPaymentProof(selected.id);
      showImage(image, `Ảnh chuyển khoản · ${selected.id}`);
    } catch (error) {
      window.alert(error.message);
    }
  }

  return (
    <>
      <SecureImagePreview
        preview={imagePreview}
        onClose={() => setImagePreview(null)}
      />
      <div className="grid gap-5 xl:grid-cols-[390px_1fr]">
      <section>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            refresh();
          }}
          className="mb-3 flex gap-2"
        >
          <label className="flex flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3">
            <Search className="h-4 w-4 text-muted" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Mã, tên, số điện thoại"
              className="min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold outline-none"
            />
          </label>
        </form>
        <div className="hide-scrollbar mb-4 flex gap-2 overflow-x-auto">
          {states.map((state) => (
            <button
              key={state}
              onClick={() => setFilter(state)}
              className={`shrink-0 rounded-lg border px-3 py-2 text-[10px] font-black ${filter === state ? "border-ink bg-ink text-acid" : "border-line bg-white text-muted"}`}
            >
              {bookingStateLabels[state] || state}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          {bookings.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedId(item.id)}
              className={`w-full rounded-lg border bg-white p-4 text-left ${selected?.id === item.id ? "border-ink shadow-soft" : "border-line"}`}
            >
              <div className="flex justify-between gap-3">
                <span className="text-[10px] font-bold text-muted">
                  {item.id}
                </span>
                <StatusBadge state={item.state} />
              </div>
              <p className="mt-3 font-black">{item.customerName}</p>
              <p className="mt-2 text-xs font-bold text-muted">
                {money(item.totalAmount)} · {shortDate(item.pickupTime)}
              </p>
            </button>
          ))}
        </div>
      </section>
      {selected ? (
        <section className="rounded-lg border border-line bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <h2 className="text-2xl font-black">{selected.customerName}</h2>
              <p className="mt-1 text-xs font-bold text-muted">
                {selected.phone} · {selected.id}
              </p>
            </div>
            <StatusBadge state={selected.state} />
          </div>
          <div className="grid gap-3 border-b border-line py-5 sm:grid-cols-3 lg:grid-cols-6">
            <div className="rounded-lg bg-paper p-4">
              <p className="text-[10px] font-black uppercase text-muted">Tạm tính</p>
              <p className="mt-1 font-black">{money(selected.subtotalAmount)}</p>
            </div>
            <div className="rounded-lg bg-paper p-4">
              <p className="text-[10px] font-black uppercase text-muted">Khuyến mãi</p>
              <p className="mt-1 font-black text-green-700">-{money(selected.discountAmount || 0)}</p>
              {selected.promotionCode ? <p className="mt-1 text-[10px] font-bold text-muted">{selected.promotionCode}</p> : null}
            </div>
            <div className="rounded-lg bg-paper p-4">
              <p className="text-[10px] font-black uppercase text-muted">Thành tiền</p>
              <p className="mt-1 font-black">{money(selected.totalAmount)}</p>
            </div>
            <div className="rounded-lg bg-paper p-4">
              <p className="text-[10px] font-black uppercase text-muted">Cọc thiết bị</p>
              <p className="mt-1 font-black">{money(selected.equipmentDeposit)}</p>
            </div>
            <div className="rounded-lg bg-paper p-4">
              <p className="text-[10px] font-black uppercase text-muted">Giữ lịch</p>
              <p className="mt-1 font-black">{money(selected.bookingDeposit)}</p>
            </div>
            <div className="rounded-lg bg-ink p-4 text-white">
              <p className="text-[10px] font-black uppercase text-white/55">Thu ban đầu</p>
              <p className="mt-1 font-black text-acid">{money(selected.amountDueNow)}</p>
            </div>
          </div>
          {financeData ? (
            <FinanceLifecycle
              booking={selected}
              data={financeData}
              productById={productById}
              onChanged={refreshFinance}
            />
          ) : null}
          <div className="grid gap-3 py-5 sm:grid-cols-2">
            {selected.items.map((item) => (
              <div
                key={item.id || item.productId}
                className="rounded-lg bg-paper p-4"
              >
                <p className="font-black">
                  {productById[item.productId]?.name || item.productId}
                </p>
                <p className="mt-1 text-xs font-bold text-muted">
                  Số lượng: {item.quantity}
                </p>
              </div>
            ))}
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-900">
            <div><p className="text-[10px] font-black uppercase">Cấu hình trả trễ</p><p className="mt-1 text-xs font-bold">Mức phí được cộng theo từng giờ trễ; trường hợp ảnh hưởng booking kế tiếp cần admin xác nhận thêm.</p></div>
            <strong>{money(selected.items.reduce((sum, item) => sum + Number(productById[item.productId]?.lateFeePerHour || 0) * Number(item.quantity || 0), 0))}/giờ</strong>
          </div>
          {selected.identityDocumentsAvailable && canViewIdentity ? (
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-lg border border-line bg-paper p-4">
              <div className="mr-auto flex items-center gap-2">
                <IdCard className="h-4 w-4" />
                <span className="text-xs font-black uppercase">CCCD mã hóa</span>
              </div>
              <button onClick={() => openIdentity("front")} className="rounded-lg bg-white px-3 py-2 text-xs font-black">Xem mặt trước</button>
              <button onClick={() => openIdentity("back")} className="rounded-lg bg-white px-3 py-2 text-xs font-black">Xem mặt sau</button>
            </div>
          ) : null}
          {selected.paymentProofAvailable && canViewIdentity ? (
            <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-green-950">
              <div className="mr-auto"><p className="text-xs font-black uppercase">Bằng chứng chuyển khoản</p><p className="mt-1 text-[10px] font-semibold">Chỉ ghi nhận tiền vào Sổ quỹ sau khi đối chiếu đúng số tiền, nội dung và tài khoản nhận.</p></div>
              <button onClick={openPaymentProof} className="rounded-lg bg-white px-3 py-2 text-xs font-black">Mở ảnh giao dịch</button>
            </div>
          ) : null}
          {selected.earlyPickupRequested ? (
            <EarlyPickupPanel
              booking={selected}
              busy={busy}
              onReview={reviewEarlyPickup}
            />
          ) : null}
          <section className="mb-5 border-y border-line py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase text-muted">Reservation & Allocation</p><h3 className="mt-1 text-lg font-black">Điều phối nguồn lực</h3></div>
              {["CONFIRMED", "READY_FOR_PICKUP"].includes(selected.state) ? <button type="button" disabled={busy} onClick={autoAllocate} className="rounded-lg border border-line bg-paper px-3 py-2 text-xs font-black uppercase">Phân bổ tự động</button> : null}
            </div>
            <div className="mt-4 grid gap-5 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase text-muted">Reservation</p>
                <div className="divide-y divide-line border-y border-line">
                  {(operations?.reservations || []).slice(-6).map((item) => <p key={item.id} className="flex justify-between gap-3 py-2 text-xs font-bold"><span>{productById[item.productId]?.name || item.productId} × {item.quantity}</span><span className={item.state === "ACTIVE" ? "text-green-700" : "text-muted"}>{item.type} · {item.state}</span></p>)}
                  {!operations?.reservations?.length ? <p className="py-3 text-xs font-bold text-muted">Chưa có reservation.</p> : null}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-black uppercase text-muted">Allocation</p>
                <div className="divide-y divide-line border-y border-line">
                  {(operations?.allocations || []).slice(-8).map((item) => <p key={item.id} className="flex justify-between gap-3 py-2 text-xs font-bold"><span>{item.serialId || productById[item.productId]?.name || item.productId} × {item.quantity}</span><span className="text-muted">{item.role} · {item.state}</span></p>)}
                  {!operations?.allocations?.length ? <p className="py-3 text-xs font-bold text-muted">Chưa phân bổ thiết bị.</p> : null}
                </div>
              </div>
            </div>
          </section>
          {["CONFIRMED", "READY_FOR_PICKUP"].includes(selected.state) ? (
            <button
              onClick={approveHandover}
              disabled={busy}
              className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-4 text-xs font-black uppercase text-acid disabled:opacity-40"
            >
              <ShieldCheck className="h-4 w-4" />
              Duyệt giao máy · Chuyển sang IN USE
            </button>
          ) : null}
          <form
            onSubmit={changeState}
            className="grid gap-3 border-t border-line pt-5 md:grid-cols-[220px_1fr_auto]"
          >
            <select
              value={nextState}
              onChange={(event) => setNextState(event.target.value)}
              className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold"
            >
              <option value="">Chọn trạng thái</option>
              {(transitions[selected.state] || []).map((state) => (
                <option key={state} value={state}>{bookingStateLabels[state] || state}</option>
              ))}
            </select>
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Lý do cập nhật"
              className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold"
            />
            <button
              disabled={busy || !nextState}
              className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid disabled:opacity-40"
            >
              Cập nhật
            </button>
          </form>
          <div className="mt-6 border-t border-line pt-5">
            <div className="mb-3 flex items-center gap-2">
              <FileClock className="h-4 w-4" />
              <h3 className="text-sm font-black uppercase">Lịch sử xử lý</h3>
            </div>
            {audit.map((entry) => (
              <p
                key={entry.id}
                className="border-l-2 border-line py-1 pl-3 text-xs font-semibold text-muted"
              >
                {entry.action} · {entry.actor} · {shortDate(entry.createdAt)}
              </p>
            ))}
          </div>
        </section>
      ) : null}
      </div>
    </>
  );
}

function FinanceLifecycle({ booking, data, productById, onChanged }) {
  const allocated = (data.paymentAllocations || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const missing = Math.max(0, Number(booking.amountDueNow || 0) - allocated);
  const reviewStates = ["PENDING_REVIEW", "NEGOTIATION", "CONDITIONAL", "TEMP_HOLD"];
  const preDeliveryStates = [...reviewStates, "CONFIRMED", "READY_FOR_PICKUP"];
  const [paymentAmount, setPaymentAmount] = useState(missing);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [chargeType, setChargeType] = useState("LATE_FEE");
  const [chargeAmount, setChargeAmount] = useState("");
  const [holdAmount, setHoldAmount] = useState(0);
  const [chargeReason, setChargeReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [working, setWorking] = useState(false);
  const [financeError, setFinanceError] = useState("");

  useEffect(() => setPaymentAmount(missing), [booking.id, missing]);

  async function run(action) {
    setWorking(true);
    setFinanceError("");
    try {
      await action();
      await onChanged();
    } catch (error) {
      setFinanceError(error.message);
    } finally {
      setWorking(false);
    }
  }

  function recordPayment(event) {
    event.preventDefault();
    run(() => api.recordPayment({
      bookingId: booking.id,
      amount: Number(paymentAmount),
      method: paymentMethod,
      providerReference: `ADMIN-${booking.id}-${Date.now()}`,
      idempotencyKey: crypto.randomUUID(),
      note: "Admin xác nhận đã nhận và đối soát tiền.",
    }));
  }

  function proposeCharge(event) {
    event.preventDefault();
    run(async () => {
      await api.proposeBookingCharge(booking.id, {
        type: chargeType,
        amount: Number(chargeAmount),
        temporaryHoldAmount: Number(holdAmount || 0),
        reason: chargeReason,
        evidenceReference: evidence,
        expectedResolutionAt: Number(holdAmount || 0) > 0
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 19)
          : null,
      });
      setChargeAmount("");
      setHoldAmount(0);
      setChargeReason("");
      setEvidence("");
    });
  }

  const settlement = data.settlement;
  return (
    <section className="border-b border-line py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase text-muted">Finance & settlement</p>
          <h3 className="mt-1 text-lg font-black">Dòng tiền và quyết toán</h3>
          <p className="mt-1 text-xs font-bold text-muted">Booking là công nợ cần thu; Sổ quỹ chỉ tăng khi admin xác nhận tiền thực nhận.</p>
        </div>
        <button type="button" disabled={working} onClick={() => run(() => api.reconcileBookingFinance(booking.id))} className="rounded-lg border border-line bg-paper px-3 py-2 text-[10px] font-black uppercase">Đối soát</button>
      </div>
      {financeError ? <p className="mt-3 border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700">{financeError}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Detail label="Tiền thuê sau giảm" value={money(booking.totalAmount || 0)} />
        <Detail label="Tiền cọc" value={money(booking.depositRequired || 0)} />
        <Detail label="Cần thu trước giao" value={money(booking.amountDueNow || 0)} />
        <Detail label="Đã thực nhận" value={money(allocated)} />
        <Detail label="Còn phải thu" value={money(missing)} />
      </div>

      {reviewStates.includes(booking.state) ? <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-950"><strong className="block text-sm">Giai đoạn PREVIEW / chờ duyệt</strong>Kiểm tra báo giá, cọc, khuyến mãi và ảnh chuyển khoản tại đây trước khi xác nhận đơn. Chưa tạo phí trả trễ hoặc hư hỏng ở giai đoạn này.</div> : null}

      {missing > 0 && preDeliveryStates.includes(booking.state) ? (
        <form onSubmit={recordPayment} className="mt-4 grid gap-2 md:grid-cols-[1fr_190px_auto]">
          <input type="number" min="1" value={paymentAmount} onChange={(event) => setPaymentAmount(event.target.value)} className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold" aria-label="Số tiền thực nhận" />
          <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold">
            <option value="BANK_TRANSFER">Chuyển khoản</option><option value="CASH">Tiền mặt</option><option value="CARD">Thẻ</option>
          </select>
          <button disabled={working || Number(paymentAmount) <= 0} className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid disabled:opacity-40">Ghi nhận tiền</button>
        </form>
      ) : null}

      {["IN_USE", "INCIDENT", "COMPLETED"].includes(booking.state) ? (
        <form onSubmit={proposeCharge} className="mt-5 grid gap-2 border-t border-line pt-4 sm:grid-cols-2 xl:grid-cols-6">
          <p className="text-[10px] font-black uppercase text-muted sm:col-span-2 xl:col-span-6">Phát sinh sau bàn giao · chỉ dùng cho trả trễ, hư hỏng, thất lạc hoặc gia hạn có bằng chứng</p>
          <select value={chargeType} onChange={(event) => setChargeType(event.target.value)} className="rounded-lg border border-line bg-paper px-3 py-3 text-xs font-bold">
            <option value="LATE_FEE">Phí trả trễ</option><option value="DAMAGE">Hư hỏng</option><option value="MISSING">Thiếu/mất</option><option value="EXTENSION">Gia hạn</option><option value="CUSTOMER_COMPENSATION">Bồi thường</option><option value="REFUND_ADJUSTMENT">Điều chỉnh hoàn</option>
          </select>
          <input required type="number" min="1" value={chargeAmount} onChange={(event) => setChargeAmount(event.target.value)} placeholder="Số tiền đề xuất" className="rounded-lg border border-line bg-paper px-3 py-3 text-xs font-bold" />
          <input type="number" min="0" value={holdAmount} onChange={(event) => setHoldAmount(event.target.value)} placeholder="Tạm giữ" className="rounded-lg border border-line bg-paper px-3 py-3 text-xs font-bold" />
          <input required value={chargeReason} onChange={(event) => setChargeReason(event.target.value)} placeholder="Lý do" className="rounded-lg border border-line bg-paper px-3 py-3 text-xs font-bold" />
          <input value={evidence} onChange={(event) => setEvidence(event.target.value)} placeholder="Mã biên bản/bằng chứng" className="rounded-lg border border-line bg-paper px-3 py-3 text-xs font-bold" />
          <button disabled={working} className="rounded-lg border border-ink bg-white px-3 py-3 text-xs font-black uppercase">Tạo đề xuất</button>
        </form>
      ) : null}

      {(data.charges || []).length ? <div className="mt-4 divide-y divide-line border-y border-line">
        {data.charges.map((charge) => <div key={charge.id} className="flex flex-wrap items-center gap-3 py-3 text-xs">
          <strong>{charge.type}</strong><span>{money(charge.proposedAmount)}</span><span className="text-muted">{charge.reason}</span><span className="ml-auto font-black">{charge.status}</span>
          {charge.status === "PROPOSED" ? <><button type="button" disabled={working} onClick={() => run(() => api.reviewBookingCharge(charge.id, { approved: true, confirmedAmount: charge.proposedAmount, reason: "Đã kiểm tra bằng chứng và chính sách." }))} className="rounded-lg bg-ink px-3 py-2 font-black text-acid">Duyệt</button><button type="button" disabled={working} onClick={() => run(() => api.reviewBookingCharge(charge.id, { approved: false, confirmedAmount: 0, reason: "Bằng chứng chưa đủ để áp dụng." }))} className="rounded-lg border border-line px-3 py-2 font-black">Bác bỏ</button></> : null}
        </div>)}
      </div> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {booking.state === "COMPLETED" && !settlement ? <button type="button" disabled={working} onClick={() => run(() => api.calculateSettlement(booking.id))} className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid">Tính quyết toán</button> : null}
      {settlement ? <>
        {["READY", "ON_HOLD", "REOPENED"].includes(settlement.state) ? <button type="button" disabled={working} onClick={() => run(() => api.approveSettlement(booking.id, { refundMethod: "BANK_TRANSFER" }))} className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid">Duyệt quyết toán</button> : null}
        {(data.refunds || []).filter((item) => ["APPROVED", "FAILED"].includes(item.state)).map((refund) => <button key={refund.id} type="button" disabled={working} onClick={() => run(() => api.executeRefund(refund.id, { payoutReference: `PAYOUT-${Date.now()}`, idempotencyKey: crypto.randomUUID() }))} className="rounded-lg border border-ink bg-white px-4 py-3 text-xs font-black uppercase">Xác nhận đã hoàn {money(refund.amount)}</button>)}
        {settlement.state === "APPROVED" && Number(settlement.refundDueNow || 0) === 0 ? <button type="button" disabled={working} onClick={() => run(() => api.closeSettlement(booking.id))} className="rounded-lg border border-green-700 bg-green-50 px-4 py-3 text-xs font-black uppercase text-green-800">Đóng tài chính</button> : null}
      </> : null}
      </div>

      {(data.assetRevenueAllocations || []).length ? <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="text-[10px] font-black uppercase text-muted"><tr><th className="py-2">Thiết bị/serial</th><th>Căn cứ</th><th>Tỷ lệ</th><th className="text-right">Doanh thu phân bổ</th></tr></thead><tbody>{data.assetRevenueAllocations.map((item) => <tr key={item.id} className="border-t border-line"><td className="py-2 font-black">{item.assetId || productById[item.productId]?.name || item.productId}</td><td>{money(item.numerator)} / {money(item.denominator)}</td><td>{(Number(item.allocationRate || 0) * 100).toFixed(2)}%</td><td className="text-right font-black">{money(item.amount)}</td></tr>)}</tbody></table></div> : null}
    </section>
  );
}

function EarlyPickupPanel({ booking, busy, onReview }) {
  const [fee, setFee] = useState(booking.earlyPickupFee || 0);
  const [reviewReason, setReviewReason] = useState("");
  return (
    <section className="mb-5 rounded-lg border border-line bg-paper p-4">
      <p className="text-[10px] font-black uppercase text-muted">
        Yêu cầu nhận máy sớm
      </p>
      <p className="mt-2 font-black">{shortDate(booking.earlyPickupTime)}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[160px_1fr_auto_auto]">
        <input
          type="number"
          min="0"
          value={fee}
          onChange={(event) => setFee(event.target.value)}
          placeholder="Phí nhận sớm"
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-bold"
        />
        <input
          value={reviewReason}
          onChange={(event) => setReviewReason(event.target.value)}
          placeholder="Ghi chú thương lượng"
          className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold"
        />
        <button
          disabled={busy}
          onClick={() => onReview(true, fee, reviewReason)}
          className="rounded-lg bg-ink px-3 py-2 text-xs font-black uppercase text-acid"
        >
          Duyệt
        </button>
        <button
          disabled={busy}
          onClick={() => onReview(false, 0, reviewReason)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-black uppercase"
        >
          Từ chối
        </button>
      </div>
      {booking.earlyPickupApproved ? (
        <p className="mt-2 text-xs font-bold text-green-700">
          Đã duyệt · Phí {money(booking.earlyPickupFee)}
        </p>
      ) : null}
    </section>
  );
}

function Catalog({ products, assets, stock, bundles, detailId, onNavigate, refresh, canManage }) {
  const emptyForm = {
    productCode: "",
    levelCode: "L2",
    name: "",
    brand: "",
    category: "Accessory",
    pricingEditorMode: "DAILY",
    hourlyPrice: 0,
    halfDayPrice: 0,
    dailyPrice: 0,
    twoDayPrice: 0,
    multiDayPrice: 0,
    multiDayDays: 3,
    extraDayPrice: 0,
    equipmentDeposit: 0,
    bookingDeposit: 0,
    lateFeePerHour: 0,
    identityViolationFee: 0,
    unauthorizedTransferFee: 0,
    impactPenaltyPercent: 100,
    damageLiabilityLimit: 0,
    bookingCount: 0,
    bookingCountBase: 0,
    actualBookingCount: 0,
    included: false,
    active: true,
    imageUrl: "",
    detailImageUrl: "",
    specs: "",
    trackingMode: "SERIALIZED",
    serialPrefix: "",
    initialStockQty: 0,
    serialNumbersText: "",
    description: "",
    usageGuide: "",
    connectionGuide: "",
    sourceUrl: "",
  };
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [bundleFilter, setBundleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const selected = products.find((item) => item.id === detailId);
  const inventoryByProduct = useMemo(() => {
    const summary = {};
    assets.forEach((asset) => {
      const current = summary[asset.productId] || { totalQty: 0, availableQty: 0 };
      current.totalQty += 1;
      if (asset.status === "AVAILABLE") current.availableQty += 1;
      summary[asset.productId] = current;
    });
    stock.forEach((item) => {
      summary[item.productId] = {
        totalQty: Number(item.totalQty || 0),
        availableQty: Number(item.availableQty ?? (item.totalQty - item.inUseQty) ?? 0),
      };
    });
    return summary;
  }, [assets, stock]);
  const selectedBundle = bundles.find((bundle) => bundle.id === bundleFilter);
  const selectedBundleIds = new Set((selectedBundle?.items || []).map((item) => item.productId));
  const normalizedCatalogQuery = catalogQuery.trim().toLocaleLowerCase("vi-VN");
  const matchesCatalogFilters = (item) => {
    const inventory = inventoryByProduct[item.id] || { totalQty: 0, availableQty: 0 };
    const matchesQuery = !normalizedCatalogQuery || [item.id, item.name, item.brand, item.category]
      .some((value) => String(value || "").toLocaleLowerCase("vi-VN").includes(normalizedCatalogQuery));
    const matchesBundle = bundleFilter === "ALL" || selectedBundleIds.has(item.id);
    const matchesStatus = statusFilter === "ALL"
      || (statusFilter === "ACTIVE" && item.active)
      || (statusFilter === "HIDDEN" && !item.active)
      || (statusFilter === "LOW" && inventory.availableQty <= 1);
    return matchesQuery && matchesBundle && matchesStatus;
  };
  const machines = products.filter((item) => item.levelCode === "L1");
  const accessories = products.filter((item) => item.levelCode !== "L1");
  const filteredMachines = machines.filter(matchesCatalogFilters);
  const filteredAccessories = accessories.filter(matchesCatalogFilters);
  const lowStockCount = products.filter((item) => (inventoryByProduct[item.id]?.availableQty || 0) <= 1).length;
  const totalAvailable = products.reduce((sum, item) => sum + (inventoryByProduct[item.id]?.availableQty || 0), 0);

  function editAccessory(item) {
    let details = {};
    try {
      details = JSON.parse(item.customAttributes || "{}");
    } catch {
      /* Keep empty details. */
    }
    const actualBookingCount = Math.max(
      0,
      Number(item.bookingCount || 0) - Number(item.bookingCountBase || 0),
    );
    setForm({
      ...emptyForm,
      ...item,
      productCode: item.id,
      bookingCount: Number(item.bookingCount || 0),
      bookingCountBase: Number(item.bookingCountBase || 0),
      actualBookingCount,
      description: details.description || "",
      usageGuide: details.usageGuide || "",
      connectionGuide: details.connectionGuide || "",
      sourceUrl: details.sourceUrl || "",
      detailImageUrl: details.detailImageUrl || "",
      initialStockQty: 0,
      serialNumbersText: "",
    });
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    const serialNumbers = form.serialNumbersText
      .split(/\r?\n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (new Set(serialNumbers.map((value) => value.toUpperCase())).size !== serialNumbers.length) {
      setFormError("Danh sách serial có giá trị trùng nhau.");
      setSaving(false);
      return;
    }
    const payload = {
      levelCode: form.levelCode,
      name: form.name,
      brand: form.brand,
      category: form.category,
      hourlyPrice: Math.max(0, Number(form.hourlyPrice) || 0),
      halfDayPrice: Math.max(0, Number(form.halfDayPrice) || 0),
      dailyPrice: Number(form.dailyPrice),
      twoDayPrice: Math.max(0, Number(form.twoDayPrice) || 0),
      multiDayPrice: Math.max(0, Number(form.multiDayPrice) || 0),
      multiDayDays: 3,
      extraDayPrice: Math.max(0, Number(form.extraDayPrice) || 0),
      equipmentDeposit: Math.max(0, Number(form.equipmentDeposit) || 0),
      bookingDeposit: Math.max(0, Number(form.bookingDeposit) || 0),
      lateFeePerHour: Math.max(0, Number(form.lateFeePerHour) || 0),
      identityViolationFee: Math.max(0, Number(form.identityViolationFee) || 0),
      unauthorizedTransferFee: Math.max(0, Number(form.unauthorizedTransferFee) || 0),
      impactPenaltyPercent: Math.min(100, Math.max(0, Number(form.impactPenaltyPercent) || 0)),
      damageLiabilityLimit: Math.max(0, Number(form.damageLiabilityLimit) || 0),
      bookingCountBase: Math.max(0, Number(form.bookingCountBase) || 0),
      included: form.included,
      active: form.active,
      imageUrl: form.imageUrl,
      specs: form.specs,
      trackingMode: form.trackingMode,
      serialPrefix: form.serialPrefix,
      customAttributes: JSON.stringify({
        description: form.description,
        usageGuide: form.usageGuide,
        connectionGuide: form.connectionGuide,
        sourceUrl: form.sourceUrl,
        detailImageUrl: form.detailImageUrl,
      }),
    };
    try {
      if (form.id) await api.updateProduct(form.id, payload);
      else {
        await api.createProduct({
          productCode: form.productCode.trim() || null,
          product: payload,
          initialStockQty:
            form.trackingMode === "SERIALIZED"
              ? 0
              : Math.max(0, Number(form.initialStockQty) || 0),
          serialNumbers:
            form.trackingMode === "SERIALIZED" ? serialNumbers : [],
        });
      }
      await refresh();
      setForm(null);
      onNavigate("/admin/catalog");
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function archive(item) {
    if (!window.confirm(`Ẩn sản phẩm "${item.name}" khỏi trang khách?`)) return;
    await api.deleteProduct(item.id);
    await refresh();
    onNavigate("/admin/catalog");
  }

  if (form)
    return (
      <AccessoryForm
        form={form}
        setForm={setForm}
        onSubmit={save}
        onClose={() => setForm(null)}
        saving={saving}
        error={formError}
      />
    );
  if (selected) {
    let details = {};
    try {
      details = JSON.parse(selected.customAttributes || "{}");
    } catch {
      /* Keep empty details. */
    }
    return (
      <section>
        <div className="mb-5 flex items-center justify-between gap-3">
          <button
            onClick={() => onNavigate("/admin/catalog")}
            className="flex items-center gap-2 text-xs font-black uppercase text-muted hover:text-ink"
          >
            <ArrowLeft className="h-4 w-4" />
            Danh mục
          </button>
          {canManage ? <div className="flex gap-2">
            <button
              onClick={() => editAccessory(selected)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white"
              title="Sửa sản phẩm"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => archive(selected)}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 bg-white text-red-700"
              title="Ẩn sản phẩm"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div> : null}
        </div>
        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <img
            src={selected.imageUrl}
            alt={selected.name}
            className="aspect-[4/3] w-full rounded-lg bg-white object-cover grayscale shadow-soft"
          />
          <div className="rounded-lg border border-line bg-white p-6">
            <p className="text-[10px] font-black uppercase text-muted">
              {selected.id} · {selected.levelCode}
            </p>
            <h2 className="mt-2 text-3xl font-black">{selected.name}</h2>
            <p className="mt-2 text-sm font-bold text-muted">
              {selected.brand} · {selected.category}
            </p>
            <div className="mt-6 grid gap-2 sm:grid-cols-3">
              <Detail label="Giá theo giờ" value={`${money(selected.hourlyPrice)}/giờ`} />
              <Detail label="Giá nửa ngày" value={money(selected.halfDayPrice)} />
              <Detail label="Giá 1 ngày" value={money(selected.dailyPrice)} />
              <Detail label="Giá 2 ngày" value={money(selected.twoDayPrice)} />
              <Detail label="Giá 3 ngày" value={money(selected.multiDayPrice)} />
              <Detail label="Phụ thu mỗi ngày" value={money(selected.extraDayPrice)} />
              <Detail label="Cọc thiết bị" value={money(selected.equipmentDeposit)} />
              <Detail label="Tiền giữ lịch" value={money(selected.bookingDeposit)} />
              <Detail label="Phí trả trễ/giờ" value={money(selected.lateFeePerHour)} />
              <Detail label="Phí sai người/CCCD" value={money(selected.identityViolationFee)} />
              <Detail label="Phí tự ý chuyển giao" value={money(selected.unauthorizedTransferFee)} />
              <Detail label="Bồi hoàn khi ảnh hưởng đơn sau" value={`${Number(selected.impactPenaltyPercent || 0)}%`} />
              <Detail label="Giới hạn trách nhiệm hư hỏng" value={money(selected.damageLiabilityLimit)} />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Detail label="Thông số" value={selected.specs} />
              <Detail label="Quản lý kho" value={selected.trackingMode} />
              <Detail
                label="Tổng lượt đặt"
                value={Number(selected.bookingCount || 0).toLocaleString("vi-VN")}
              />
              <Detail
                label="Lượt đặt ban đầu"
                value={Number(selected.bookingCountBase || 0).toLocaleString("vi-VN")}
              />
              <Detail
                label="Trạng thái"
                value={selected.active ? "Đang kinh doanh" : "Đã ẩn"}
              />
              <Detail label="Mô tả" value={details.description || "-"} />
              <Detail
                label="Hướng dẫn sử dụng"
                value={details.usageGuide || "-"}
              />
              <Detail label="Kết nối" value={details.connectionGuide || "-"} />
            </div>
          </div>
        </div>
      </section>
    );
  }
  return (
    <div className="space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Danh mục máy", value: machines.length, hint: `${machines.filter((item) => item.active).length} đang kinh doanh`, icon: Camera },
          { label: "Phụ kiện", value: accessories.length, hint: `${accessories.filter((item) => item.included).length} miễn phí đi kèm`, icon: Package },
          { label: "Khả dụng", value: totalAvailable, hint: "thiết bị và phụ kiện có thể cấp", icon: Boxes },
          { label: "Tồn kho cần chú ý", value: lowStockCount, hint: "còn tối đa 1 đơn vị", icon: CircleAlert },
        ].map(({ label, value, hint, icon: Icon }) => (
          <div key={label} className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase text-muted">{label}</p><Icon className="h-4 w-4 text-muted" /></div>
            <p className="mt-3 text-3xl font-black">{value.toLocaleString("vi-VN")}</p>
            <p className="mt-1 text-[10px] font-bold text-muted">{hint}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-line bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_220px_180px_auto]">
          <label className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Tìm tên hoặc mã máy, phụ kiện..." className="h-11 w-full rounded-lg border border-line bg-paper pl-10 pr-3 text-sm font-semibold outline-none focus:border-ink" />
          </label>
          <select value={bundleFilter} onChange={(event) => setBundleFilter(event.target.value)} className="h-11 rounded-lg border border-line bg-paper px-3 text-xs font-black">
            <option value="ALL">Tất cả gói thuê máy</option>
            {bundles.map((bundle) => <option key={bundle.id} value={bundle.id}>{bundle.id} · {bundle.name}</option>)}
          </select>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-lg border border-line bg-paper px-3 text-xs font-black">
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang kinh doanh</option>
            <option value="LOW">Tồn thấp / hết</option>
            <option value="HIDDEN">Đã ẩn</option>
          </select>
          <div className="flex gap-2">
            {(catalogQuery || bundleFilter !== "ALL" || statusFilter !== "ALL") ? <button type="button" onClick={() => { setCatalogQuery(""); setBundleFilter("ALL"); setStatusFilter("ALL"); }} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line" title="Xóa bộ lọc"><X className="h-4 w-4" /></button> : null}
            {canManage ? <>
              <button type="button" onClick={() => setForm({ ...emptyForm, levelCode: "L1", category: "Camera", trackingMode: "SERIALIZED" })} className="flex h-11 items-center gap-2 rounded-lg bg-ink px-3 text-[10px] font-black uppercase text-acid"><Camera className="h-4 w-4" /> Thêm máy</button>
              <button type="button" onClick={() => setForm({ ...emptyForm, levelCode: "L2", category: "Accessory", trackingMode: "QUANTITY" })} className="flex h-11 items-center gap-2 rounded-lg border border-ink px-3 text-[10px] font-black uppercase"><Plus className="h-4 w-4" /> Phụ kiện</button>
            </> : null}
          </div>
        </div>
        {selectedBundle ? <p className="mt-3 text-xs font-bold text-muted">Đang xem thành phần của <strong className="text-ink">{selectedBundle.name}</strong>: {selectedBundle.items.length} loại thiết bị.</p> : null}
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <CatalogTable title="Danh sách máy ảnh" subtitle={`${filteredMachines.length}/${machines.length} máy`} items={filteredMachines} inventoryByProduct={inventoryByProduct} onOpen={(id) => onNavigate(`/admin/catalog/${encodeURIComponent(id)}`)} />
        <CatalogTable title="Linh kiện và phụ kiện" subtitle={`${filteredAccessories.length}/${accessories.length} phụ kiện`} items={filteredAccessories} inventoryByProduct={inventoryByProduct} onOpen={(id) => onNavigate(`/admin/catalog/${encodeURIComponent(id)}`)} />
      </div>
    </div>
  );
}

function CatalogTable({ title, subtitle, items, inventoryByProduct, onOpen }) {
  return (
    <section className="min-w-0 overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4">
        <div><h2 className="text-lg font-black">{title}</h2><p className="mt-1 text-[10px] font-bold text-muted">{subtitle}</p></div>
        <Package className="h-5 w-5 text-muted" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-left">
          <thead className="bg-paper text-[9px] font-black uppercase text-muted"><tr><th className="px-4 py-3">Sản phẩm</th><th className="px-3 py-3">Khả dụng</th><th className="px-3 py-3">Giá/ngày</th><th className="px-3 py-3">Trạng thái</th><th className="w-12" /></tr></thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => {
              const inventory = inventoryByProduct[item.id] || { totalQty: 0, availableQty: 0 };
              return (
                <tr key={item.id} onClick={() => onOpen(item.id)} className="cursor-pointer transition hover:bg-paper">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><img src={item.imageUrl} alt="" className="h-12 w-14 rounded object-cover grayscale" /><div className="min-w-0"><p className="text-[9px] font-black text-muted">{item.id} · {item.levelCode}</p><p className="mt-1 max-w-[220px] truncate text-sm font-black">{item.name}</p><p className="mt-1 text-[9px] font-bold text-muted">{item.brand} · {item.category}</p></div></div></td>
                  <td className={`px-3 py-3 text-sm font-black ${inventory.availableQty <= 0 ? "text-red-700" : ""}`}>{inventory.availableQty}<span className="text-[9px] text-muted">/{inventory.totalQty}</span></td>
                  <td className="px-3 py-3 text-xs font-black">{money(item.dailyPrice)}</td>
                  <td className="px-3 py-3"><span className={`inline-flex rounded px-2 py-1 text-[9px] font-black uppercase ${item.active ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{item.active ? "Đang bán" : "Đã ẩn"}</span></td>
                  <td className="pr-3"><ArrowUpRight className="h-4 w-4" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items.length === 0 ? <p className="p-10 text-center text-sm font-bold text-muted">Không có dữ liệu phù hợp bộ lọc.</p> : null}
      </div>
    </section>
  );
}

function AccessoryForm({ form, setForm, onSubmit, onClose, saving, error }) {
  const field = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));
  const setBookingTotal = (value) =>
    setForm((current) => {
      const actual = Math.max(0, Number(current.actualBookingCount) || 0);
      const total = Math.max(actual, Number(value) || 0);
      return {
        ...current,
        bookingCount: total,
        bookingCountBase: total - actual,
      };
    });
  const setBookingBase = (value) =>
    setForm((current) => {
      const actual = Math.max(0, Number(current.actualBookingCount) || 0);
      const base = Math.max(0, Number(value) || 0);
      return {
        ...current,
        bookingCountBase: base,
        bookingCount: base + actual,
      };
    });
  return (
    <section className="rounded-lg border border-line bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-muted">
            Quản lý sản phẩm
          </p>
          <h2 className="mt-1 text-2xl font-black">
            {form.id ? "Sửa sản phẩm" : "Thêm sản phẩm"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-paper"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
        <div className="border-b border-line pb-2 md:col-span-2">
          <h3 className="text-sm font-black">Thông tin định danh</h3>
        </div>
        <label className="grid gap-1 text-xs font-black text-muted">
          Mã sản phẩm (hệ thống tự sinh)
          <input
            value={form.id ? form.productCode : "TỰ ĐỘNG SAU KHI LƯU"}
            readOnly
            aria-readonly="true"
            className="cursor-not-allowed rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold uppercase text-muted"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-muted">
          Tên sản phẩm
          <input
            required
            value={form.name}
            onChange={(event) => field("name", event.target.value)}
            placeholder="Ví dụ: Sony A7S III"
            className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-muted">
          Thương hiệu
          <input
            required
            value={form.brand}
            onChange={(event) => field("brand", event.target.value)}
            placeholder="Sony, Canon, DJI..."
            className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-muted">
          Nhóm thiết bị
          <select
            value={form.levelCode}
            onChange={(event) => field("levelCode", event.target.value)}
            className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-bold text-ink"
          >
            <option value="L1">L1 · Máy ảnh, máy quay, ống kính</option>
            <option value="L2">L2 · Thiết bị hỗ trợ</option>
            <option value="L3">L3 · Vật tư</option>
            <option value="L4">L4 · Đi kèm miễn phí</option>
            <option value="L5">L5 · Vận chuyển</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs font-black text-muted">
          Phân loại
          <input
            required
            list="product-categories"
            value={form.category}
            onChange={(event) => field("category", event.target.value)}
            placeholder="Camera, Lens, Audio, Accessory..."
            className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold text-ink"
          />
          <datalist id="product-categories">
            <option value="Camera" />
            <option value="Cinema" />
            <option value="Mirrorless" />
            <option value="Lens" />
            <option value="Drone" />
            <option value="Audio" />
            <option value="Lighting" />
            <option value="Support" />
            <option value="Battery/Card" />
            <option value="Accessory" />
            <option value="Transport" />
          </datalist>
        </label>
        <section className="rounded-lg border border-line bg-paper p-4 md:col-span-2">
          <p className="text-[10px] font-black uppercase text-muted">Thiết lập bảng giá</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["hourlyPrice", "Giá theo giờ"],
              ["halfDayPrice", "Giá nửa ngày (tối đa 12 giờ)"],
              ["dailyPrice", "Giá 1 ngày"],
              ["twoDayPrice", "Giá gói 2 ngày"],
              ["multiDayPrice", "Giá gói 3 ngày"],
              ["extraDayPrice", "Phụ thu mỗi ngày từ ngày thứ 4"],
            ].map(([key, label]) => (
              <label key={key} className="grid gap-1 text-xs font-black text-muted">{label}
                <input required type="number" min="0" value={form[key]} onChange={(event) => field(key, event.target.value)} className="rounded-lg border border-line bg-white px-3 py-3 text-base font-semibold text-ink" />
              </label>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-[10px] font-bold text-muted sm:grid-cols-6">
            <span>{money(form.hourlyPrice)}/giờ</span>
            <span>{money(form.halfDayPrice)}/nửa ngày</span>
            <span>{money(form.dailyPrice)}/1 ngày</span>
            <span>{money(form.twoDayPrice)}/2 ngày</span>
            <span>{money(form.multiDayPrice)}/3 ngày</span>
            <span>+{money(form.extraDayPrice)}/ngày</span>
          </div>
          <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["equipmentDeposit", "Cọc thiết bị"],
              ["bookingDeposit", "Tiền giữ lịch"],
              ["lateFeePerHour", "Phí trả trễ mỗi giờ"],
              ["identityViolationFee", "Phí sai người / sai CCCD"],
              ["unauthorizedTransferFee", "Phí tự ý chuyển giao thiết bị"],
              ["impactPenaltyPercent", "Bồi hoàn khi ảnh hưởng đơn sau (%)"],
              ["damageLiabilityLimit", "Giới hạn trách nhiệm hư hỏng"],
            ].map(([key, label]) => (
              <label key={key} className="grid gap-1 text-xs font-black text-muted">{label}
                <input required type="number" min="0" max={key === "impactPenaltyPercent" ? "100" : undefined} value={form[key]} onChange={(event) => field(key, event.target.value)} className="rounded-lg border border-line bg-white px-3 py-3 text-base font-semibold text-ink" />
              </label>
            ))}
          </div>
          <p className="mt-3 text-[10px] font-bold leading-relaxed text-muted">Các trường cam kết để 0 sẽ tự tính theo hệ thống: sai danh tính = tiền giữ lịch, chuyển giao = 30% giá ngày, ảnh hưởng đơn sau = 100%, hư hỏng = tối thiểu 10 lần giá ngày.</p>
        </section>
        <div className="grid gap-3 border-t border-line pt-4 md:col-span-2 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <h3 className="text-sm font-black">Quản lý tồn kho</h3>
          </div>
          <label className="grid gap-1 text-xs font-black text-muted">
            Hình thức theo dõi
            <select
              value={form.trackingMode}
              onChange={(event) => field("trackingMode", event.target.value)}
              className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-bold text-ink"
            >
              <option value="SERIALIZED">Theo từng serial</option>
              <option value="BATCH_TRACKED">Theo lô</option>
              <option value="QUANTITY">Theo tổng số lượng</option>
              <option value="CONSUMABLE">Vật tư tiêu hao</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs font-black text-muted">
            Tiền tố serial
            <input
              value={form.serialPrefix}
              onChange={(event) => field("serialPrefix", event.target.value.toUpperCase())}
              disabled={form.trackingMode !== "SERIALIZED"}
              placeholder="Ví dụ: A7S3"
              className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold uppercase text-ink disabled:opacity-40"
            />
          </label>
          {!form.id && form.trackingMode === "SERIALIZED" ? (
            <label className="grid gap-1 text-xs font-black text-muted sm:col-span-2">
              Danh sách serial ban đầu, mỗi serial một dòng
              <textarea
                value={form.serialNumbersText}
                onChange={(event) => field("serialNumbersText", event.target.value)}
                placeholder={"A7S3-001\nA7S3-002"}
                className="min-h-28 rounded-lg border border-line bg-paper p-3 font-mono text-sm font-semibold text-ink"
              />
              <span>{form.serialNumbersText.split(/\r?\n|,/).filter((value) => value.trim()).length} thiết bị sẽ được nhập kho</span>
            </label>
          ) : null}
          {!form.id && form.trackingMode !== "SERIALIZED" ? (
            <label className="grid gap-1 text-xs font-black text-muted sm:col-span-2">
              Tổng tồn kho ban đầu
              <input
                type="number"
                min="0"
                max="100000"
                value={form.initialStockQty}
                onChange={(event) => field("initialStockQty", event.target.value)}
                className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold text-ink"
              />
            </label>
          ) : null}
          {form.id ? (
            <p className="text-xs font-bold text-muted sm:col-span-2">
              Tồn kho đang vận hành được điều chỉnh tại mục Kho máy để giữ đầy đủ lịch sử nhập xuất.
            </p>
          ) : null}
        </div>
        <label className="grid gap-1 text-xs font-black text-muted">
          Tổng lượt đặt
          <input
            type="number"
            min={Math.max(0, Number(form.actualBookingCount) || 0)}
            max="1000000000"
            value={form.bookingCount}
            onChange={(event) => setBookingTotal(event.target.value)}
            className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-muted">
          Lượt đặt ban đầu
          <input
            type="number"
            min="0"
            max="1000000000"
            value={form.bookingCountBase}
            onChange={(event) => setBookingBase(event.target.value)}
            className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold text-ink"
          />
        </label>
        <div className="border-b border-line pb-2 md:col-span-2">
          <h3 className="text-sm font-black">Nội dung hiển thị cho khách hàng</h3>
        </div>
        <CatalogImageUpload label="Ảnh đại diện" value={form.imageUrl} onChange={(value) => field("imageUrl", value)} required />
        <CatalogImageUpload label="Ảnh chi tiết" value={form.detailImageUrl} onChange={(value) => field("detailImageUrl", value)} />
        <label className="grid gap-1 text-xs font-black text-muted md:col-span-2">
          Thông số nổi bật
          <input
            required
            value={form.specs}
            onChange={(event) => field("specs", event.target.value)}
            placeholder="Ví dụ: Full-frame 4K 120p, 12.1 MP"
            className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-muted md:col-span-2">
          Mô tả chi tiết
          <textarea
            required
            value={form.description}
            onChange={(event) => field("description", event.target.value)}
            className="min-h-24 rounded-lg border border-line bg-paper p-3 text-sm font-semibold text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-muted">
          Hướng dẫn sử dụng
          <textarea
            required
            value={form.usageGuide}
            onChange={(event) => field("usageGuide", event.target.value)}
            className="min-h-24 rounded-lg border border-line bg-paper p-3 text-sm font-semibold text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-muted">
          Hướng dẫn kết nối
          <textarea
            required
            value={form.connectionGuide}
            onChange={(event) => field("connectionGuide", event.target.value)}
            className="min-h-24 rounded-lg border border-line bg-paper p-3 text-sm font-semibold text-ink"
          />
        </label>
        <label className="grid gap-1 text-xs font-black text-muted md:col-span-2">
          Nguồn tài liệu chính hãng
          <input
            value={form.sourceUrl}
            onChange={(event) => field("sourceUrl", event.target.value)}
            placeholder="https://..."
            className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold text-ink"
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.included}
            onChange={(event) => field("included", event.target.checked)}
          />
          Miễn phí đi kèm
        </label>
        <label className="flex items-center gap-2 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => field("active", event.target.checked)}
          />
          Hiển thị trên trang khách hàng
        </label>
        {error ? (
          <p className="text-sm font-bold text-red-700 md:col-span-2">
            {error}
          </p>
        ) : null}
        <button
          disabled={saving}
          className="rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase text-acid md:col-span-2"
        >
          {saving ? "Đang lưu..." : "Lưu sản phẩm"}
        </button>
      </form>
    </section>
  );
}

function Bundles({ bundles, products, assets, stock, refresh, canManage }) {
  const empty = {
    name: "",
    pricingEditorMode: "DAILY",
    hourlyPrice: 0,
    dailyPrice: 0,
    multiDayPrice: 0,
    multiDayDays: 3,
    active: true,
    imageUrl: "",
    detailImageUrl: "",
    note: "",
    items: [],
  };
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [versionHistory, setVersionHistory] = useState(null);
  const [bundleQuery, setBundleQuery] = useState("");
  const [machineFilter, setMachineFilter] = useState("ALL");
  const [componentQuery, setComponentQuery] = useState("");
  const inventoryByProduct = useMemo(() => {
    const summary = {};
    assets.forEach((asset) => {
      const current = summary[asset.productId] || { totalQty: 0, availableQty: 0 };
      current.totalQty += 1;
      if (asset.status === "AVAILABLE") current.availableQty += 1;
      summary[asset.productId] = current;
    });
    stock.forEach((item) => {
      summary[item.productId] = { totalQty: Number(item.totalQty || 0), availableQty: Number(item.availableQty || 0) };
    });
    return summary;
  }, [assets, stock]);
  const machines = products.filter((item) => item.levelCode === "L1");
  const normalizedBundleQuery = bundleQuery.trim().toLocaleLowerCase("vi-VN");
  const filteredBundles = bundles.filter((bundle) => {
    const componentValues = (bundle.items || []).flatMap((line) => {
      const product = products.find((item) => item.id === line.productId);
      return [line.productId, product?.name];
    });
    const matchesQuery = !normalizedBundleQuery || [bundle.id, bundle.name, bundle.note, ...componentValues]
      .some((value) => String(value || "").toLocaleLowerCase("vi-VN").includes(normalizedBundleQuery));
    const matchesMachine = machineFilter === "ALL" || bundle.items.some((line) => line.productId === machineFilter);
    return matchesQuery && matchesMachine;
  });
  const quantity = (id) =>
    form?.items.find((item) => item.productId === id)?.quantity || 0;
  function setQuantity(productId, value) {
    const next = Math.max(0, Math.min(10, Number(value) || 0));
    setForm((current) => ({
      ...current,
      items:
        next === 0
          ? current.items.filter((item) => item.productId !== productId)
          : [
              ...current.items.filter((item) => item.productId !== productId),
              { productId, quantity: next },
            ],
    }));
  }
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const mainProductId = form.items.find((line) => products.find((item) => item.id === line.productId)?.levelCode === "L1")?.productId;
      const mainProductImage = products.find((item) => item.id === mainProductId)?.imageUrl || "";
      const payload = {
        name: form.name,
        hourlyPrice: Math.max(0, Number(form.hourlyPrice) || 0),
        dailyPrice: Number(form.dailyPrice),
        multiDayPrice: Math.max(0, Number(form.multiDayPrice) || 0),
        multiDayDays: Math.max(2, Number(form.multiDayDays) || 3),
        active: form.active,
        imageUrl: mainProductImage,
        detailImageUrl: form.detailImageUrl || mainProductImage,
        note: form.note,
        items: form.items,
      };
      if (form.id) await api.updateBundle(form.id, payload);
      else await api.createBundle(payload);
      await refresh();
      setForm(null);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }
  async function archive(bundle) {
    if (!window.confirm(`Ẩn combo "${bundle.name}"?`)) return;
    await api.deleteBundle(bundle.id);
    await refresh();
  }
  async function loadVersionHistory(bundle) {
    setBusy(true);
    setError("");
    try {
      const versions = await api.bundleVersions(bundle.id);
      setVersionHistory({ bundle, versions });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }
  if (form) {
    const selectedItems = form.items.map((line) => ({
      ...line,
      product: products.find((item) => item.id === line.productId),
    })).filter((line) => line.product);
    const mainProduct = selectedItems.find((line) => line.product.levelCode === "L1")?.product;
    const normalizedComponentQuery = componentQuery.trim().toLocaleLowerCase("vi-VN");
    const componentProducts = products.filter((item) => item.active && (!normalizedComponentQuery
      || [item.id, item.name, item.brand].some((value) => String(value || "").toLocaleLowerCase("vi-VN").includes(normalizedComponentQuery))));
    return (
      <section>
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-line pb-4">
          <div><p className="text-[10px] font-black uppercase text-muted">Setting combo</p><h2 className="mt-1 text-2xl font-black">{form.id ? "Chỉnh sửa gói thuê" : "Tạo gói thuê mới"}</h2></div>
          <button type="button" onClick={() => setForm(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-white" title="Đóng"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={save} className="grid items-start gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="overflow-hidden rounded-lg border border-line bg-white xl:sticky xl:top-28">
             <img src={mainProduct?.imageUrl || form.detailImageUrl} alt="" className="aspect-[4/3] w-full bg-paper object-contain" />
            <div className="p-5">
              <p className="text-[10px] font-black uppercase text-muted">{form.id || "Gói mới"}</p>
              <h3 className="mt-2 text-2xl font-black">{form.name || "Tên gói thuê"}</h3>
              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-4 text-center">
                <div><p className="text-[9px] font-black uppercase text-muted">Giờ</p><p className="mt-1 text-xs font-black">{money(form.hourlyPrice)}</p></div>
                <div><p className="text-[9px] font-black uppercase text-muted">Ngày</p><p className="mt-1 text-xs font-black">{money(form.dailyPrice)}</p></div>
                <div><p className="text-[9px] font-black uppercase text-muted">{form.multiDayDays || 3} ngày</p><p className="mt-1 text-xs font-black">{money(form.multiDayPrice)}</p></div>
              </div>
              <div className="mt-4 space-y-2">
                {selectedItems.map((line) => <div key={line.productId} className="flex items-center justify-between gap-3 text-xs"><span className="min-w-0 truncate font-bold">{line.product.name}</span><strong>×{line.quantity}</strong></div>)}
                {!selectedItems.length ? <p className="py-4 text-center text-xs font-bold text-muted">Chưa chọn thành phần.</p> : null}
              </div>
              {form.note ? <p className="mt-4 border-t border-line pt-3 text-xs font-semibold leading-5 text-muted">{form.note}</p> : null}
            </div>
          </aside>

          <div className="space-y-5">
            <section className="border-b border-line bg-white p-5">
              <div className="mb-4 flex items-center gap-2"><Settings2 className="h-4 w-4" /><h3 className="font-black">Thông tin gói</h3></div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-xs font-black text-muted md:col-span-2">Tên gói thuê<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ví dụ: Gói thuê Canon R100" className="rounded-lg border border-line bg-paper px-3 py-3 text-base font-semibold text-ink" /></label>
                 <div className="grid gap-2 text-xs font-black text-muted">
                   Ảnh 1 · Máy chính tự động
                   <div className="aspect-[4/3] overflow-hidden rounded-lg border border-line bg-paper">{mainProduct ? <img src={mainProduct.imageUrl} alt={mainProduct.name} className="h-full w-full object-contain" /> : <p className="grid h-full place-items-center px-4 text-center text-[11px] font-bold">Chọn máy chính trong thành phần để hệ thống lấy ảnh.</p>}</div>
                 </div>
                 <CatalogImageUpload label="Ảnh 2 · Toàn bộ combo" value={form.detailImageUrl || ""} onChange={(value) => setForm({ ...form, detailImageUrl: value })} required />
                <label className="grid gap-1 text-xs font-black text-muted md:col-span-2">Ghi chú<textarea value={form.note || ""} onChange={(event) => setForm({ ...form, note: event.target.value })} maxLength="1000" placeholder="Ghi chú cấu hình, điều kiện bàn giao hoặc lưu ý vận hành..." className="min-h-20 rounded-lg border border-line bg-paper p-3 text-sm font-semibold text-ink" /></label>
              </div>
            </section>

            <section className="border-b border-line bg-white p-5">
              <h3 className="font-black">Bảng giá</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <label className="grid gap-1 text-xs font-black text-muted">Theo giờ<input required type="number" min="0" value={form.hourlyPrice} onChange={(event) => setForm({ ...form, hourlyPrice: event.target.value })} className="rounded-lg border border-line bg-paper px-3 py-3 font-semibold text-ink" /></label>
                <label className="grid gap-1 text-xs font-black text-muted">Theo ngày<input required type="number" min="0" value={form.dailyPrice} onChange={(event) => setForm({ ...form, dailyPrice: event.target.value })} className="rounded-lg border border-line bg-paper px-3 py-3 font-semibold text-ink" /></label>
                <label className="grid gap-1 text-xs font-black text-muted">Giá nhiều ngày<input required type="number" min="0" value={form.multiDayPrice} onChange={(event) => setForm({ ...form, multiDayPrice: event.target.value })} className="rounded-lg border border-line bg-paper px-3 py-3 font-semibold text-ink" /></label>
                <label className="grid gap-1 text-xs font-black text-muted">Số ngày<input required type="number" min="2" max="365" value={form.multiDayDays} onChange={(event) => setForm({ ...form, multiDayDays: event.target.value })} className="rounded-lg border border-line bg-paper px-3 py-3 font-semibold text-ink" /></label>
              </div>
            </section>

            <section className="bg-white p-5">
              <div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="font-black">Thành phần gói</h3><p className="mt-1 text-[10px] font-bold text-muted">{form.items.length} loại đã chọn</p></div><label className="relative w-full sm:w-72"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={componentQuery} onChange={(event) => setComponentQuery(event.target.value)} placeholder="Tìm tên hoặc mã thiết bị" className="h-10 w-full rounded-lg border border-line bg-paper pl-10 pr-3 text-xs font-semibold" /></label></div>
              <div className="mt-4 max-h-[520px] divide-y divide-line overflow-y-auto border-y border-line">
                {componentProducts.map((item) => {
                  const currentQuantity = quantity(item.id);
                  const inventory = inventoryByProduct[item.id] || { totalQty: 0, availableQty: 0 };
                  return <div key={item.id} className={`grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-3 py-3 ${currentQuantity ? "bg-[#F5F8EB]" : ""}`}>
                    <img src={item.imageUrl} alt="" className="h-10 w-12 rounded object-cover grayscale" />
                    <div className="min-w-0"><p className="truncate text-sm font-black">{item.name}</p><p className="mt-1 text-[9px] font-bold text-muted">{item.id} · Còn {inventory.availableQty}/{inventory.totalQty}</p></div>
                    <div className="flex items-center gap-2"><button type="button" onClick={() => setQuantity(item.id, currentQuantity - 1)} disabled={!currentQuantity} className="flex h-8 w-8 items-center justify-center rounded-full border border-line disabled:opacity-30" title="Giảm"><Minus className="h-3.5 w-3.5" /></button><strong className="w-5 text-center text-sm">{currentQuantity}</strong><button type="button" onClick={() => setQuantity(item.id, currentQuantity + 1)} className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-acid" title="Thêm"><Plus className="h-3.5 w-3.5" /></button></div>
                  </div>;
                })}
                {!componentProducts.length ? <p className="p-8 text-center text-xs font-bold text-muted">Không tìm thấy thiết bị.</p> : null}
              </div>
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} className="h-4 w-4 accent-black" /> Hiển thị cho khách hàng</label>
              <button disabled={busy || form.items.length === 0} className="rounded-lg bg-ink px-6 py-3 text-xs font-black uppercase text-acid disabled:opacity-40">{busy ? "Đang lưu..." : "Lưu cấu hình combo"}</button>
            </div>
            {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
          </div>
        </form>
      </section>
    );
  }
  return (
    <section className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-white p-4"><p className="text-[10px] font-black uppercase text-muted">Tổng gói thuê</p><p className="mt-2 text-3xl font-black">{bundles.length}</p></div>
        <div className="rounded-lg border border-line bg-white p-4"><p className="text-[10px] font-black uppercase text-muted">Đang hiển thị</p><p className="mt-2 text-3xl font-black">{bundles.filter((bundle) => bundle.active).length}</p></div>
        <div className="rounded-lg border border-line bg-white p-4"><p className="text-[10px] font-black uppercase text-muted">Máy chính trong combo</p><p className="mt-2 text-3xl font-black">{new Set(bundles.flatMap((bundle) => bundle.items.map((line) => line.productId)).filter((id) => machines.some((machine) => machine.id === id))).size}</p></div>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-4">
        <label className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><input value={bundleQuery} onChange={(event) => setBundleQuery(event.target.value)} placeholder="Tìm tên gói, mã gói hoặc mã máy..." className="h-11 w-full rounded-lg border border-line bg-paper pl-10 pr-3 text-sm font-semibold" /></label>
        <select value={machineFilter} onChange={(event) => setMachineFilter(event.target.value)} className="h-11 min-w-56 rounded-lg border border-line bg-paper px-3 text-xs font-black"><option value="ALL">Tất cả máy chính</option>{machines.map((machine) => <option key={machine.id} value={machine.id}>{machine.id} · {machine.name}</option>)}</select>
        {(bundleQuery || machineFilter !== "ALL") ? <button type="button" onClick={() => { setBundleQuery(""); setMachineFilter("ALL"); }} className="flex h-11 w-11 items-center justify-center rounded-lg border border-line" title="Xóa bộ lọc"><X className="h-4 w-4" /></button> : null}
        {canManage ? <button type="button" onClick={() => { setComponentQuery(""); setForm(empty); }} className="flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-xs font-black uppercase text-acid"><Plus className="h-4 w-4" /> Thêm combo</button> : null}
      </div>

      {versionHistory ? <section className="border-y border-line py-5"><div className="mb-3 flex items-center justify-between gap-3"><div><p className="text-[10px] font-black uppercase text-muted">Lịch sử phiên bản</p><h2 className="mt-1 text-lg font-black">{versionHistory.bundle.name}</h2></div><button onClick={() => setVersionHistory(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white" aria-label="Đóng lịch sử"><X className="h-4 w-4" /></button></div><div className="divide-y divide-line rounded-lg border border-line bg-white">{versionHistory.versions.map((version) => <div key={version.id} className="grid gap-2 p-3 text-xs md:grid-cols-[100px_120px_1fr_auto]"><strong>Version {version.versionNumber}</strong><span>{version.status}</span><span className="text-muted">{version.publishedBy}</span><span className="font-bold">{shortDate(version.publishedAt)}</span></div>)}</div></section> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredBundles.map((bundle) => {
          const bundleProducts = bundle.items.map((line) => ({ ...line, product: products.find((item) => item.id === line.productId) })).filter((line) => line.product);
          const main = bundleProducts.find((line) => line.product.levelCode === "L1");
          const extras = bundleProducts.filter((line) => line.product.levelCode !== "L1");
          const availableSets = bundleProducts.length ? Math.min(...bundleProducts.map((line) => Math.floor((inventoryByProduct[line.productId]?.availableQty || 0) / line.quantity))) : 0;
          return <article key={bundle.id} className={`overflow-hidden rounded-lg border bg-white ${bundle.active ? "border-line" : "border-dashed border-red-200 opacity-65"}`}>
            <div className="relative"><img src={bundle.imageUrl || main?.product.imageUrl} alt={bundle.name} className="aspect-[16/9] w-full bg-paper object-cover" /><span className="absolute left-3 top-3 rounded bg-ink px-2 py-1 text-[9px] font-black uppercase text-acid">{bundle.id}</span></div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-black uppercase text-muted">Version {bundle.currentVersion || 1}</p><h2 className="mt-1 text-xl font-black">{bundle.name}</h2></div><span className={`shrink-0 rounded px-2 py-1 text-[9px] font-black uppercase ${availableSets > 0 ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>{availableSets > 0 ? `Cấp được ${availableSets} bộ` : "Thiếu hàng"}</span></div>
              {main ? <div className="mt-4 border-l-4 border-ink pl-3"><p className="text-[9px] font-black uppercase text-muted">Máy chính</p><p className="mt-1 text-sm font-black">{main.product.id} · {main.product.name}</p></div> : null}
              <div className="mt-4 flex min-h-12 flex-wrap content-start gap-1.5">{extras.slice(0, 4).map((line) => <span key={line.productId} className="rounded bg-paper px-2 py-1 text-[9px] font-bold">{line.product.name} ×{line.quantity}</span>)}{extras.length > 4 ? <span className="rounded bg-paper px-2 py-1 text-[9px] font-black">+{extras.length - 4}</span> : null}</div>
              <div className="mt-4 grid grid-cols-3 gap-2 border-y border-line py-3"><div><p className="text-[9px] font-black uppercase text-muted">Giờ</p><p className="mt-1 text-xs font-black">{money(bundle.hourlyPrice)}</p></div><div><p className="text-[9px] font-black uppercase text-muted">Ngày</p><p className="mt-1 text-xs font-black">{money(bundle.dailyPrice)}</p></div><div><p className="text-[9px] font-black uppercase text-muted">{bundle.multiDayDays || 3} ngày</p><p className="mt-1 text-xs font-black">{money(bundle.multiDayPrice)}</p></div></div>
              {bundle.note ? <p className="mt-3 line-clamp-2 text-xs font-semibold leading-5 text-muted"><strong className="text-ink">Ghi chú:</strong> {bundle.note}</p> : null}
              <div className="mt-4 flex items-center gap-2">{canManage ? <button type="button" onClick={() => { setComponentQuery(""); setForm({ ...bundle, pricingEditorMode: "DAILY", note: bundle.note || "", items: bundle.items.map(({ productId, quantity }) => ({ productId, quantity })) }); }} className="flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-ink px-3 text-[10px] font-black uppercase text-acid"><Settings2 className="h-4 w-4" /> Cấu hình</button> : null}<button type="button" onClick={() => loadVersionHistory(bundle)} title="Lịch sử phiên bản" className="flex h-10 w-10 items-center justify-center rounded-lg border border-line"><FileClock className="h-4 w-4" /></button>{canManage ? <button type="button" onClick={() => archive(bundle)} title="Ẩn combo" className="flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-700"><Trash2 className="h-4 w-4" /></button> : null}</div>
            </div>
          </article>;
        })}
      </div>
      {!filteredBundles.length ? <p className="rounded-lg border border-dashed border-line bg-white p-12 text-center text-sm font-bold text-muted">Không có gói thuê phù hợp bộ lọc.</p> : null}
    </section>
  );
}

const promotionDays = [
  ["MONDAY", "T2"],
  ["TUESDAY", "T3"],
  ["WEDNESDAY", "T4"],
  ["THURSDAY", "T5"],
  ["FRIDAY", "T6"],
  ["SATURDAY", "T7"],
  ["SUNDAY", "CN"],
];

function Promotions({ promotions, refresh }) {
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function createForm() {
    const start = new Date();
    const end = new Date(start);
    end.setDate(end.getDate() + 30);
    setForm({
      code: "",
      name: "",
      discountPercent: 10,
      active: true,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      applicableWeekdays: [],
      dayParity: "ALL",
    });
  }

  function toggleDay(day) {
    setForm((current) => ({
      ...current,
      applicableWeekdays: current.applicableWeekdays.includes(day)
        ? current.applicableWeekdays.filter((item) => item !== day)
        : [...current.applicableWeekdays, day],
    }));
  }

  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, discountPercent: Number(form.discountPercent) };
      if (form.id) await api.updatePromotion(form.id, payload);
      else await api.createPromotion(payload);
      await refresh();
      setForm(null);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function archive(promotion) {
    if (!window.confirm(`Ngừng áp dụng mã ${promotion.code}?`)) return;
    await api.deletePromotion(promotion.id);
    await refresh();
  }

  if (form) return (
    <section className="rounded-lg border border-line bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-black uppercase text-muted">Promotion engine</p>
          <h2 className="mt-1 text-2xl font-black">{form.id ? "Sửa khuyến mãi" : "Thêm khuyến mãi"}</h2>
        </div>
        <button onClick={() => setForm(null)} className="flex h-10 w-10 items-center justify-center rounded-full bg-paper" aria-label="Đóng"><X className="h-4 w-4" /></button>
      </div>
      <form onSubmit={save} className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1"><span className="text-[10px] font-black uppercase text-muted">ID hệ thống</span><input readOnly value={form.id || "Tự động sau khi lưu"} className="w-full cursor-not-allowed rounded-lg border border-line bg-paper px-3 py-3 font-black uppercase text-muted" /></label>
        <label className="space-y-1"><span className="text-[10px] font-black uppercase text-muted">Tên chương trình</span><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Tên chương trình" className="w-full rounded-lg border border-line bg-paper px-3 py-3 font-semibold" /></label>
        <label className="space-y-1"><span className="text-[10px] font-black uppercase text-muted">Mã khách nhập</span><input required minLength="3" maxLength="40" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })} placeholder="Ví dụ T7SALE" className="w-full rounded-lg border border-line bg-paper px-3 py-3 font-black uppercase" /></label>
        <label className="space-y-1"><span className="text-[10px] font-black uppercase text-muted">Giảm (%)</span><input required type="number" min="1" max="90" value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: event.target.value })} className="w-full rounded-lg border border-line bg-paper px-3 py-3 font-black" /></label>
        <label className="space-y-1"><span className="text-[10px] font-black uppercase text-muted">Ngày chẵn/lẻ</span><select value={form.dayParity} onChange={(event) => setForm({ ...form, dayParity: event.target.value })} className="w-full rounded-lg border border-line bg-paper px-3 py-3 font-bold"><option value="ALL">Tất cả ngày</option><option value="ODD">Ngày lẻ</option><option value="EVEN">Ngày chẵn</option></select></label>
        <label className="space-y-1"><span className="text-[10px] font-black uppercase text-muted">Bắt đầu</span><input required type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} className="w-full rounded-lg border border-line bg-paper px-3 py-3 font-bold" /></label>
        <label className="space-y-1"><span className="text-[10px] font-black uppercase text-muted">Kết thúc</span><input required type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} className="w-full rounded-lg border border-line bg-paper px-3 py-3 font-bold" /></label>
        <fieldset className="md:col-span-2">
          <legend className="mb-2 text-[10px] font-black uppercase text-muted">Thứ được áp dụng, bỏ trống để chọn cả tuần</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
            {promotionDays.map(([value, label]) => <label key={value} className={`flex cursor-pointer items-center justify-center rounded-lg border px-2 py-3 text-xs font-black ${form.applicableWeekdays.includes(value) ? "border-ink bg-ink text-acid" : "border-line bg-paper"}`}><input type="checkbox" checked={form.applicableWeekdays.includes(value)} onChange={() => toggleDay(value)} className="sr-only" />{label}</label>)}
          </div>
        </fieldset>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />Đang áp dụng</label>
        {error ? <p className="text-sm font-bold text-red-700 md:col-span-2">{error}</p> : null}
        <button disabled={busy} className="rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase text-acid md:col-span-2">{busy ? "Đang lưu..." : "Lưu khuyến mãi"}</button>
      </form>
    </section>
  );

  return <section>
    <div className="mb-5 flex justify-end"><button onClick={createForm} className="flex items-center gap-2 rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid"><Plus className="h-4 w-4" />Thêm khuyến mãi</button></div>
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      {promotions.length === 0 ? <p className="p-6 text-sm font-semibold text-muted">Chưa có chương trình khuyến mãi.</p> : promotions.map((promotion) => (
        <article key={promotion.id} className="grid gap-3 border-b border-line p-5 last:border-b-0 md:grid-cols-[1fr_1fr_auto] md:items-center">
          <div><p className="text-[10px] font-black uppercase text-muted">{promotion.code}</p><h2 className="mt-1 text-lg font-black">{promotion.name}</h2><p className="mt-1 text-xs font-bold text-muted">{promotion.startDate} đến {promotion.endDate}</p></div>
          <div><p className="text-xl font-black text-green-700">-{promotion.discountPercent}%</p><p className="mt-1 text-xs font-bold text-muted">{promotion.applicableWeekdays.length ? promotion.applicableWeekdays.map((day) => promotionDays.find(([value]) => value === day)?.[1]).join(", ") : "Cả tuần"} · {promotion.dayParity === "ODD" ? "Ngày lẻ" : promotion.dayParity === "EVEN" ? "Ngày chẵn" : "Mọi ngày"}</p></div>
          <div className="flex gap-2"><button onClick={() => setForm({ ...promotion, applicableWeekdays: [...promotion.applicableWeekdays] })} className="flex h-9 w-9 items-center justify-center rounded-full border border-line" aria-label="Sửa"><Pencil className="h-4 w-4" /></button><button onClick={() => archive(promotion)} disabled={!promotion.active} className="flex h-9 w-9 items-center justify-center rounded-full border border-red-200 text-red-700 disabled:opacity-30" aria-label="Ngừng áp dụng"><Trash2 className="h-4 w-4" /></button></div>
        </article>
      ))}
    </div>
  </section>;
}

function Inventory({
  assets,
  stock,
  productById,
  detailId,
  onNavigate,
  refresh,
  ledgerEntries = [],
}) {
  const asset = assets.find((item) => item.serialId === detailId);
  const stockItem =
    stock.find((item) => item.productId === detailId) ||
    (productById[detailId] && productById[detailId]?.trackingMode !== "SERIALIZED"
      ? { productId: detailId, totalQty: 0, inUseQty: 0, availableQty: 0 }
      : null);
  const bulkStock = Object.values(productById)
    .filter((product) => product.active && product.trackingMode !== "SERIALIZED")
    .map(
      (product) =>
        stock.find((item) => item.productId === product.id) || {
          productId: product.id,
          totalQty: 0,
          inUseQty: 0,
          availableQty: 0,
        },
    );
  const [stockQty, setStockQty] = useState("");
  const [reason, setReason] = useState("");
  const [assetStatus, setAssetStatus] = useState("");
  const [newAsset, setNewAsset] = useState({
    serialId: "",
    productId: "",
    status: "AVAILABLE",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveStock(item) {
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do để phát hành phiếu điều chỉnh kho.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.updateStock(item.productId, {
        totalQty: Number(stockQty === "" ? item.totalQty : stockQty),
        reason,
      });
      await refresh();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveAsset(item) {
    setBusy(true);
    setError("");
    try {
      await api.updateAssetStatus(item.serialId, assetStatus || item.status);
      await refresh();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }
  async function removeAsset(item) {
    if (!window.confirm(`Lưu trữ serial ${item.serialId}? Dữ liệu ledger vẫn được giữ lại.`)) return;
    setBusy(true);
    setError("");
    try {
      await api.deleteAsset(item.serialId);
      await refresh();
      onNavigate("/admin/inventory");
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }
  async function addAsset(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createAsset(newAsset);
      await refresh();
      setNewAsset({ serialId: "", productId: "", status: "AVAILABLE" });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }
  if (asset || stockItem) {
    const item = asset || stockItem;
    const productId = item.productId;
    const product = productById[productId];
    return (
      <section>
        <button
          onClick={() => onNavigate("/admin/inventory")}
          className="mb-5 flex items-center gap-2 text-xs font-black uppercase text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Kho máy
        </button>
        <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <img
            src={product?.imageUrl}
            alt=""
            className="aspect-[4/3] w-full rounded-lg bg-white object-cover grayscale shadow-soft"
          />
          <div className="rounded-lg border border-line bg-white p-6">
            <p className="text-[10px] font-black uppercase text-muted">
              {asset ? "Thiết bị theo serial" : "Kho số lượng"}
            </p>
            <h2 className="mt-2 text-3xl font-black">
              {asset ? asset.serialId : product?.name || productId}
            </h2>
            <p className="mt-2 text-sm font-bold text-muted">
              {product?.name || productId}
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {asset ? (
                <>
                  <Detail label="Trạng thái" value={asset.status} />
                  <Detail label="Số lần sử dụng" value={asset.usageCount} />
                  <Detail
                    label="Kiểm tra gần nhất"
                    value={asset.lastCheck || "-"}
                  />
                  <Detail label="Chu k? pin" value={asset.batteryCycles} />
                </>
              ) : (
                <>
                  <Detail label="Tổng số lượng" value={stockItem.totalQty} />
                  <Detail label="Đang cho thuê" value={stockItem.inUseQty} />
                  <Detail
                    label="Có thể sử dụng"
                    value={stockItem.availableQty}
                  />
                  <Detail label="Mã sản phẩm" value={stockItem.productId} />
                </>
              )}
            </div>
            {asset ? (
              <div className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-[1fr_auto_auto]">
                <select
                  value={assetStatus || asset.status}
                  onChange={(event) => setAssetStatus(event.target.value)}
                  className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold"
                >
                  <option value="AVAILABLE">Sẵn sàng</option>
                  <option value="IN_USE">Đang thuê</option>
                  <option value="REPAIR">Đang sửa chữa</option>
                  <option value="RETIRED">Ngừng sử dụng</option>
                </select>
                <button
                  disabled={busy}
                  onClick={() => saveAsset(asset)}
                  className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid"
                >
                  Lưu trạng thái
                </button>
                <button
                  disabled={busy || asset.status === "IN_USE"}
                  onClick={() => removeAsset(asset)}
                  className="rounded-lg border border-red-200 px-4 py-3 text-xs font-black uppercase text-red-700 disabled:opacity-40"
                >
                  Lưu trữ serial
                </button>
              </div>
            ) : (
              <div className="mt-6 grid gap-3 border-t border-line pt-5 sm:grid-cols-2">
                <input
                  type="number"
                  min={stockItem.inUseQty}
                  value={stockQty === "" ? stockItem.totalQty : stockQty}
                  onChange={(event) => setStockQty(event.target.value)}
                  className="rounded-lg border border-line bg-paper px-3 py-3 font-bold"
                />
                <input
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Lý do điều chỉnh"
                  className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold"
                />
                <button
                  disabled={busy}
                  onClick={() => saveStock(stockItem)}
                  className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid sm:col-span-2"
                >
                  Phát hành phiếu điều chỉnh
                </button>
              </div>
            )}
            {error ? (
              <p className="mt-3 text-sm font-bold text-red-700">{error}</p>
            ) : null}
          </div>
        </div>
      </section>
    );
  }
  return (
    <div>
      <form
        onSubmit={addAsset}
        className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-[1fr_1fr_180px_auto]"
      >
        <input
          required
          value={newAsset.serialId}
          onChange={(event) =>
            setNewAsset({ ...newAsset, serialId: event.target.value })
          }
          placeholder="Mã serial mới"
          className="rounded-lg border border-line bg-paper px-3 py-3 font-semibold"
        />
        <select
          required
          value={newAsset.productId}
          onChange={(event) =>
            setNewAsset({ ...newAsset, productId: event.target.value })
          }
          className="rounded-lg border border-line bg-paper px-3 py-3 font-bold"
        >
          <option value="">Chọn sản phẩm</option>
          {Object.values(productById)
            .filter((item) => item.active && item.trackingMode === "SERIALIZED")
            .map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
        </select>
        <select
          value={newAsset.status}
          onChange={(event) =>
            setNewAsset({ ...newAsset, status: event.target.value })
          }
          className="rounded-lg border border-line bg-paper px-3 py-3 font-bold"
        >
          <option value="AVAILABLE">Sẵn sàng</option>
          <option value="REPAIR">Đang sửa</option>
        </select>
        <button
          disabled={busy}
          className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid"
        >
          Thêm vào kho
        </button>
        {error ? (
          <p className="text-sm font-bold text-red-700 md:col-span-4">
            {error}
          </p>
        ) : null}
      </form>
      <div className="grid gap-6 xl:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-black">Thiết bị theo serial</h2>
          <div className="space-y-2">
            {assets.map((item) => (
              <button
                key={item.serialId}
                onClick={() =>
                  onNavigate(
                    `/admin/inventory/${encodeURIComponent(item.serialId)}`,
                  )
                }
                className="flex w-full justify-between gap-4 rounded-lg border border-line bg-white p-4 text-left hover:border-ink"
              >
                <div>
                  <p className="font-black">{item.serialId}</p>
                  <p className="text-xs font-bold text-muted">
                    {productById[item.productId]?.name || item.productId}
                  </p>
                </div>
                <span className="text-xs font-black">{item.status}</span>
              </button>
            ))}
          </div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-black">Kho số lượng</h2>
          <div className="space-y-2">
            {bulkStock.map((item) => (
              <button
                key={item.productId}
                onClick={() =>
                  onNavigate(
                    `/admin/inventory/${encodeURIComponent(item.productId)}`,
                  )
                }
                className="flex w-full justify-between gap-4 rounded-lg border border-line bg-white p-4 text-left hover:border-ink"
              >
                <div>
                  <p className="font-black">
                    {productById[item.productId]?.name || item.productId}
                  </p>
                  <p className="text-xs font-bold text-muted">
                    Đang thuê: {item.inUseQty}
                  </p>
                </div>
                <p className="text-xl font-black">
                  {item.availableQty}/{item.totalQty}
                </p>
              </button>
            ))}
          </div>
        </section>
      </div>
      <section className="mt-8 border-t border-line pt-6">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div><p className="text-[10px] font-black uppercase text-muted">Append-only</p><h2 className="mt-1 text-lg font-black">Inventory Ledger</h2></div>
          <span className="text-xs font-bold text-muted">{ledgerEntries.length} bút toán</span>
        </div>
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-paper text-[10px] font-black uppercase text-muted"><tr><th className="p-3">Thời gian</th><th className="p-3">Chứng từ</th><th className="p-3">Mã booking</th><th className="p-3">Sản phẩm/serial</th><th className="p-3">Nghiệp vụ</th><th className="p-3 text-right">Biến động</th><th className="p-3">Lý do</th><th className="p-3">Người tạo</th></tr></thead>
            <tbody className="divide-y divide-line">
              {ledgerEntries.slice(0, 80).map((entry) => <tr key={entry.id}><td className="p-3 font-bold">{shortDate(entry.createdAt)}</td><td className="p-3 font-black">{entry.documentId}</td><td className="p-3"><span className="rounded bg-paper px-2 py-1 font-black">{inventoryBookingId(entry.documentId) || "-"}</span></td><td className="p-3">{entry.serialId || productById[entry.productId]?.name || entry.productId}</td><td className="p-3 font-bold">{entry.movementType}</td><td className={`p-3 text-right font-black ${entry.quantityDelta < 0 ? "text-red-700" : "text-green-700"}`}>{entry.quantityDelta > 0 ? "+" : ""}{entry.quantityDelta}</td><td className="max-w-[260px] p-3 text-muted">{entry.reason}</td><td className="p-3 text-muted">{entry.actor}</td></tr>)}
              {ledgerEntries.length === 0 ? <tr><td colSpan="8" className="p-6 text-center font-bold text-muted">Chưa có bút toán kho.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg bg-paper p-4">
      <p className="text-[10px] font-black uppercase text-muted">{label}</p>
      <p className="mt-2 break-words text-sm font-black">{String(value)}</p>
    </div>
  );
}

function inventoryBookingId(documentId) {
  const match = /^BOOKING-(.+)-(?:CHECKOUT|RETURN)$/.exec(String(documentId || ""));
  return match?.[1] || "";
}

function CatalogImageUpload({ label, value, onChange, required = false }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function upload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError("");
    try {
      const result = await api.uploadCatalogImage(file);
      onChange(result.url);
    } catch (error) {
      setUploadError(error.message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <label className="grid gap-2 text-xs font-black text-muted">
      {label}
      <span className="relative block aspect-[4/3] overflow-hidden rounded-lg border border-dashed border-line bg-paper">
        {value ? <img src={value} alt="" className="h-full w-full object-contain" /> : <span className="grid h-full place-items-center px-4 text-center text-[11px] font-bold">Ảnh sẽ được chuẩn hóa về 1200 × 900, nền trắng</span>}
        <span className="absolute inset-x-3 bottom-3 rounded-lg bg-ink px-3 py-2 text-center text-[10px] font-black uppercase text-acid shadow-lg">
          {uploading ? "Đang tải ảnh..." : value ? "Thay ảnh" : "Chọn ảnh từ máy"}
        </span>
      </span>
      <input required={required && !value} disabled={uploading} type="file" accept="image/jpeg,image/png" onChange={upload} className="sr-only" />
      {uploadError ? <span className="text-[11px] font-bold text-red-700">{uploadError}</span> : null}
    </label>
  );
}

const staffRoles = ["ADMIN", "MANAGER", "SALES", "OPS", "WAREHOUSE", "TECH"];

function Staff({ users, refresh }) {
  const [form, setForm] = useState({ email: "", password: "", role: "OPS" });
  const [passwords, setPasswords] = useState({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function createUser(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createAdminUser(form);
      setForm({ email: "", password: "", role: "OPS" });
      await refresh();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateUser(user, changes) {
    setBusy(true);
    setError("");
    try {
      await api.updateAdminUser(user.id, {
        role: changes.role || user.role,
        active: changes.active ?? user.active,
        password: changes.password || null,
      });
      await refresh();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(user) {
    const password = passwords[user.id] || "";
    if (password.length < 12) {
      setError("Mật khẩu mới phải có ít nhất 12 ký tự.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.updateAdminUser(user.id, {
        role: user.role,
        active: user.active,
        password,
      });
      setPasswords((current) => ({ ...current, [user.id]: "" }));
      await refresh();
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  return <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
    <form onSubmit={createUser} className="h-fit rounded-lg border border-line bg-white p-5">
      <p className="text-[10px] font-black uppercase text-muted">RBAC</p>
      <h2 className="mt-1 text-xl font-black">Thêm tài khoản nhân sự</h2>
      <div className="mt-5 space-y-3">
        <input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="Email đăng nhập" className="w-full rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold" />
        <input required type="password" minLength="12" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Mật khẩu tối thiểu 12 ký tự" className="w-full rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold" />
        <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="w-full rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold">{staffRoles.map((role) => <option key={role}>{role}</option>)}</select>
        <button disabled={busy} className="w-full rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid disabled:opacity-40">Tạo tài khoản</button>
      </div>
      {error ? <p className="mt-3 text-sm font-bold text-red-700">{error}</p> : null}
    </form>
    <section>
      <div className="mb-4 flex items-end justify-between"><div><p className="text-[10px] font-black uppercase text-muted">Phân quyền vận hành</p><h2 className="mt-1 text-xl font-black">{users.length} tài khoản</h2></div></div>
      <div className="space-y-2">{users.map((user) => <article key={user.id} className="grid gap-3 rounded-lg border border-line bg-white p-4 md:grid-cols-[1fr_150px_260px_auto] md:items-center"><div><p className="font-black">{user.email}</p><p className="mt-1 text-[10px] font-bold text-muted">{user.id} · {user.active ? "Đang hoạt động" : "Đã khóa"}</p></div><select value={user.role} disabled={busy} onChange={(event) => updateUser(user, { role: event.target.value })} className="rounded-lg border border-line bg-paper px-3 py-2 text-xs font-black">{staffRoles.map((role) => <option key={role}>{role}</option>)}</select><div className="flex gap-2"><input type="password" minLength="12" value={passwords[user.id] || ""} onChange={(event) => setPasswords((current) => ({ ...current, [user.id]: event.target.value }))} placeholder="Mật khẩu mới" aria-label={`Mật khẩu mới cho ${user.email}`} className="min-w-0 flex-1 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold" /><button type="button" disabled={busy || !(passwords[user.id] || "")} onClick={() => resetPassword(user)} className="rounded-lg border border-line px-3 py-2 text-[10px] font-black uppercase disabled:opacity-40">Đổi</button></div><button type="button" disabled={busy} onClick={() => updateUser(user, { active: !user.active })} className={`rounded-lg px-3 py-2 text-xs font-black uppercase ${user.active ? "border border-red-200 text-red-700" : "bg-ink text-acid"}`}>{user.active ? "Khóa" : "Mở khóa"}</button></article>)}</div>
    </section>
  </div>;
}

function Support({ requests, refresh }) {
  const [notes, setNotes] = useState({});
  async function review(item, status) {
    await api.reviewSupport(item.id, { status, note: notes[item.id] || "" });
    await refresh();
  }
  return (
    <div className="space-y-3">
      {requests.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm font-semibold text-muted">
          Chưa có yêu cầu hỗ trợ.
        </p>
      ) : (
        requests.map((item) => (
          <article
            key={item.id}
            className="rounded-lg border border-line bg-white p-5"
          >
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <p className="text-xs font-black text-muted">
                  {item.id} · {item.bookingId}
                </p>
                <h2 className="mt-2 font-black">{item.type}</h2>
              </div>
              <span className="text-xs font-black">{item.status}</span>
            </div>
            <p className="mt-3 text-sm font-semibold">{item.message}</p>
            <div className="mt-4 grid gap-2 md:grid-cols-[1fr_auto_auto]">
              <input
                value={notes[item.id] || ""}
                onChange={(event) =>
                  setNotes((current) => ({
                    ...current,
                    [item.id]: event.target.value,
                  }))
                }
                placeholder="Phản hồi cho khách"
                className="rounded-lg border border-line bg-paper px-3 py-2 text-sm font-semibold"
              />
              <button
                onClick={() => review(item, "IN_REVIEW")}
                className="rounded-lg border border-line px-3 py-2 text-xs font-black uppercase"
              >
                Đang xử lý
              </button>
              <button
                onClick={() => review(item, "RESOLVED")}
                className="rounded-lg bg-ink px-3 py-2 text-xs font-black uppercase text-acid"
              >
                Hoàn tất
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function Finance({ finance, entries, bookings, assets, refreshDashboard }) {
  const [tab, setTab] = useState("overview");
  const [expenses, setExpenses] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [profitability, setProfitability] = useState([]);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [expenseForm, setExpenseForm] = useState({
    bookingId: "", assetId: "", category: "MAINTENANCE", amount: "", vendorName: "",
    invoiceReference: "", reason: "", evidenceReference: "",
  });
  const bookingById = Object.fromEntries(
    bookings.map((item) => [item.id, item]),
  );

  async function loadFinanceOperations() {
    const [nextExpenses, nextDocuments, nextPeriods, nextProfitability] = await Promise.all([
      api.financeExpenses(), api.financeDocuments(), api.financialPeriods(), api.assetProfitability(),
    ]);
    setExpenses(nextExpenses);
    setDocuments(nextDocuments);
    setPeriods(nextPeriods);
    setProfitability(nextProfitability);
  }

  useEffect(() => { loadFinanceOperations().catch((error) => setMessage(error.message)); }, []);

  async function run(action, successMessage) {
    setWorking(true);
    setMessage("");
    try {
      await action();
      await Promise.all([loadFinanceOperations(), refreshDashboard()]);
      setMessage(successMessage);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setWorking(false);
    }
  }

  async function submitExpense(event) {
    event.preventDefault();
    const fingerprint = [expenseForm.vendorName, expenseForm.invoiceReference, expenseForm.amount].join(":").toUpperCase();
    await run(() => api.submitExpense({ ...expenseForm, amount: Number(expenseForm.amount), sourceFingerprint: fingerprint }), "Đã gửi chi phí để duyệt.");
    setExpenseForm({ bookingId: "", assetId: "", category: "MAINTENANCE", amount: "", vendorName: "", invoiceReference: "", reason: "", evidenceReference: "" });
  }

  function payExpense(item) {
    const payoutReference = window.prompt("Nhập mã giao dịch/phiếu chi:");
    if (!payoutReference) return;
    const amount = Number(item.amount) - Number(item.paidAmount || 0);
    run(() => api.payExpense(item.id, { amount, payoutReference, idempotencyKey: `expense-pay:${item.id}:${payoutReference}` }), "Đã ghi nhận chi tiền.");
  }

  function reverseDocument(item) {
    const reason = window.prompt("Nhập lý do đảo chứng từ:");
    if (!reason) return;
    run(() => api.reverseFinanceDocument(item.id, { reason, idempotencyKey: `reverse:${item.id}:${Date.now()}` }), "Đã tạo chứng từ đảo. Chứng từ gốc được giữ nguyên lịch sử.");
  }
  async function exportExcel() {
    const heading = {
      fontWeight: "bold",
      backgroundColor: "#121212",
      color: "#D7FF00",
      height: 28,
    };
    const summary = [
      [{ value: "AMY DIGITAL - BÁO CÁO SỔ QUỸ", ...heading }, null],
      [
        { value: "Chỉ tiêu", fontWeight: "bold" },
        { value: "Giá trị", fontWeight: "bold" },
      ],
      [
        { value: "Doanh thu" },
        { value: Number(finance.revenue), format: '#,##0 "d"' },
      ],
      [
        { value: "Chi phí/Hoàn tiền" },
        { value: Number(finance.expense), format: '#,##0 "d"' },
      ],
      [
        { value: "Tiền mặt ròng" },
        { value: Number(finance.cashOnHand), format: '#,##0 "d"' },
      ],
      [
        { value: "Ngày xuất báo cáo" },
        { value: new Date(), format: "dd/mm/yyyy hh:mm" },
      ],
    ];
    const transactions = [
      [
        { value: "Mã giao dịch", ...heading },
        { value: "Mã đơn", ...heading },
        { value: "Khách hàng", ...heading },
        { value: "Số điện thoại", ...heading },
        { value: "Loại", ...heading },
        { value: "Phương thức", ...heading },
        { value: "Thời gian", ...heading },
        { value: "Số tiền", ...heading },
        { value: "Ghi chú", ...heading },
      ],
      ...entries.map((item) => [
        { value: item.id },
        { value: item.bookingId || "" },
        { value: bookingById[item.bookingId]?.customerName || "" },
        { value: bookingById[item.bookingId]?.phone || "" },
        { value: item.type },
        { value: item.method || "" },
        { value: new Date(item.postedAt), format: "dd/mm/yyyy hh:mm" },
        { value: Number(item.amount), format: '#,##0 "d"' },
        { value: item.note || "" },
      ]),
    ];
    await writeXlsxFile([summary, transactions], {
      sheets: ["Tổng quan", "Giao dịch"],
      fileName: `AMY-DIGITAL-So-Quy-${new Date().toISOString().slice(0, 10)}.xlsx`,
      stickyRowsCount: 1,
      columns: [
        [{ width: 28 }, { width: 22 }],
        [
          { width: 18 },
          { width: 18 },
          { width: 26 },
          { width: 18 },
          { width: 20 },
          { width: 18 },
          { width: 22 },
          { width: 20 },
          { width: 42 },
        ],
      ],
    });
  }

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex overflow-x-auto rounded-lg border border-line bg-white p-1">
          {[["overview", "Tổng quan"], ["expenses", "Chi phí"], ["assets", "Hiệu quả máy"], ["control", "Kiểm soát"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-md px-4 py-2 text-xs font-black ${tab === id ? "bg-ink text-acid" : "text-muted hover:text-ink"}`}>{label}</button>
          ))}
        </div>
        <button
          onClick={exportExcel}
          className="flex items-center gap-2 rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid"
        >
          <Download className="h-4 w-4" />
          Xuất báo cáo Excel
        </button>
      </div>
      {message ? <p className="mb-5 border border-line bg-white p-3 text-sm font-bold">{message}</p> : null}
      {tab === "overview" ? <>
      <section className="mb-5 rounded-lg border border-line bg-white p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted">Nguyên tắc ghi nhận</p>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["1", "Booking tạo công nợ", "Tổng thuê + cọc là số cần thu, chưa phải tiền trong quỹ."],
            ["2", "Admin xác nhận tiền", "Chỉ ảnh chuyển khoản hoặc tiền mặt đã đối soát mới tạo Payment."],
            ["3", "Ledger ghi hai vế", "Tiền vào, doanh thu, cọc giữ hộ và hoàn tiền được tách tài khoản."],
            ["4", "Quyết toán khi trả máy", "Phí phát sinh, hoàn cọc và công nợ được chốt bằng chứng từ."],
          ].map(([number, title, copy]) => <div key={number} className="rounded-lg bg-paper p-4"><span className="grid h-7 w-7 place-items-center rounded bg-ink text-[10px] font-black text-acid">{number}</span><h3 className="mt-3 text-sm font-black">{title}</h3><p className="mt-1 text-xs font-semibold leading-5 text-muted">{copy}</p></div>)}
        </div>
      </section>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Tiền thực đang có" value={money(finance.physicalCash || 0)} />
        <Metric label="Tiền khách bị hạn chế" value={money(finance.restrictedCustomerFunds || 0)} />
        <Metric label="Dòng tiền đã cam kết" value={money(finance.committedOutflows || 0)} />
        <Metric label="Tiền khả dụng" value={money(finance.availableCash || 0)} />
        <Metric label="Doanh thu đã ghi nhận" value={money(finance.recognizedRevenue || 0)} />
        <Metric label="Chi phí đã ghi nhận" value={money(finance.recognizedExpenses || 0)} />
        <Metric label="Biên đóng góp" value={money(finance.contributionMargin || 0)} />
        <Metric label="Công nợ phải thu" value={money(finance.outstandingReceivables || 0)} />
        <Metric label="Hoàn tiền quá hạn" value={String(finance.overdueRefunds || 0)} />
        <Metric label="Lỗi đối soát Critical" value={String(finance.criticalFindings || 0)} />
      </div>
      <section className="mt-6">
        <h2 className="mb-3 text-lg font-black">Financial ledger bất biến</h2>
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-paper text-[10px] font-black uppercase text-muted">
              <tr>
                <th className="p-4">Mã</th>
                <th>Đơn</th>
                <th>Tài khoản / Bên</th>
                <th>Thời gian</th>
                <th className="text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((item) => (
                <tr key={item.id} className="border-t border-line">
                  <td className="p-4 font-black">{item.id}</td>
                  <td>{item.bookingId || "-"}</td>
                  <td>{item.type}</td>
                  <td>{shortDate(item.postedAt)}</td>
                  <td className="text-right font-black">
                    <span className={item.direction === "DEBIT" ? "text-green-700" : "text-orange-700"}>{money(item.amount)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </> : null}

      {tab === "expenses" ? <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={submitExpense} className="rounded-lg border border-line bg-white p-5">
          <p className="text-[10px] font-black uppercase text-muted">Chứng từ nguồn bắt buộc</p>
          <h2 className="mt-1 text-xl font-black">Ghi nhận chi phí</h2>
          <div className="mt-5 grid gap-3">
            <select value={expenseForm.category} onChange={(event) => setExpenseForm({ ...expenseForm, category: event.target.value })} className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold">
              <option value="MAINTENANCE">Bảo trì</option><option value="REPAIR">Sửa chữa</option><option value="PARTS">Linh kiện</option><option value="LOGISTICS">Điều chuyển</option><option value="OTHER">Khác</option>
            </select>
            <select value={expenseForm.assetId} onChange={(event) => setExpenseForm({ ...expenseForm, assetId: event.target.value })} className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold">
              <option value="">Chi phí chung, không gắn máy</option>{assets.map((item) => <option key={item.serialId} value={item.serialId}>{item.serialId}</option>)}
            </select>
            <input value={expenseForm.bookingId} onChange={(event) => setExpenseForm({ ...expenseForm, bookingId: event.target.value })} placeholder="Mã booking (nếu có)" className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold" />
            <input required value={expenseForm.vendorName} onChange={(event) => setExpenseForm({ ...expenseForm, vendorName: event.target.value })} placeholder="Nhà cung cấp" className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold" />
            <input required value={expenseForm.invoiceReference} onChange={(event) => setExpenseForm({ ...expenseForm, invoiceReference: event.target.value })} placeholder="Số hóa đơn / phiếu sửa" className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold" />
            <input required type="number" min="1" value={expenseForm.amount} onChange={(event) => setExpenseForm({ ...expenseForm, amount: event.target.value })} placeholder="Số tiền" className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold" />
            <textarea required value={expenseForm.reason} onChange={(event) => setExpenseForm({ ...expenseForm, reason: event.target.value })} placeholder="Nội dung chi phí" className="min-h-20 rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold" />
            <input required value={expenseForm.evidenceReference} onChange={(event) => setExpenseForm({ ...expenseForm, evidenceReference: event.target.value })} placeholder="Link/file bằng chứng" className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-semibold" />
            <button disabled={working} className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid disabled:opacity-50">Gửi duyệt chi phí</button>
          </div>
        </form>
        <div className="overflow-x-auto rounded-lg border border-line bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-paper text-[10px] font-black uppercase text-muted"><tr><th className="p-4">Chứng từ</th><th>Máy / Booking</th><th>Trạng thái</th><th className="text-right">Giá trị</th><th className="px-4 text-right">Thao tác</th></tr></thead>
            <tbody>{expenses.map((item) => <tr key={item.id} className="border-t border-line"><td className="p-4"><p className="font-black">{item.invoiceReference}</p><p className="text-xs text-muted">{item.vendorName} · {item.category}</p></td><td>{item.assetId || item.bookingId || "Chi phí chung"}</td><td><StatusBadge state={item.state} /></td><td className="text-right font-black">{money(item.amount)}<p className="text-xs text-muted">Đã chi {money(item.paidAmount)}</p></td><td className="px-4 text-right">{item.state === "SUBMITTED" ? <button disabled={working} onClick={() => run(() => api.approveExpense(item.id), "Đã duyệt và post chi phí.")} className="rounded-md bg-ink px-3 py-2 text-[10px] font-black uppercase text-acid">Duyệt</button> : null}{["APPROVED", "PARTIALLY_PAID"].includes(item.state) ? <button disabled={working} onClick={() => payExpense(item)} className="ml-2 rounded-md border border-line px-3 py-2 text-[10px] font-black uppercase">Chi tiền</button> : null}</td></tr>)}{!expenses.length ? <tr><td colSpan="5" className="p-8 text-center font-bold text-muted">Chưa có chi phí.</td></tr> : null}</tbody>
          </table>
        </div>
      </div> : null}

      {tab === "assets" ? <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-paper text-[10px] font-black uppercase text-muted"><tr><th className="p-4">Serial máy</th><th className="text-right">Doanh thu phân bổ</th><th className="text-right">Chi phí vòng đời</th><th className="text-right">Thu hồi đã nhận</th><th className="px-4 text-right">Biên đóng góp</th></tr></thead>
          <tbody>{profitability.map((item) => <tr key={item.assetId} className="border-t border-line"><td className="p-4 font-black">{item.assetId}</td><td className="text-right">{money(item.allocatedRevenue)}</td><td className="text-right">{money(item.grossLifecycleCost)}</td><td className="text-right">{money(item.recoveryReceived)}</td><td className="px-4 text-right font-black">{money(item.contributionMargin)}</td></tr>)}{!profitability.length ? <tr><td colSpan="5" className="p-8 text-center font-bold text-muted">Chưa có doanh thu hoặc chi phí được phân bổ theo máy.</td></tr> : null}</tbody>
        </table>
      </div> : null}

      {tab === "control" ? <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section>
          <h2 className="mb-3 text-lg font-black">Kỳ tài chính</h2>
          <div className="space-y-3">{periods.map((item) => <div key={item.id} className="rounded-lg border border-line bg-white p-4"><div className="flex items-center justify-between"><p className="font-black">{item.id}</p><StatusBadge state={item.state} /></div><div className="mt-3 flex gap-2"><button disabled={working || item.state !== "OPEN"} onClick={() => run(() => api.updateFinancialPeriod(item.id, "SOFT_LOCKED"), "Đã khóa mềm kỳ.")} className="rounded-md border border-line px-3 py-2 text-[10px] font-black uppercase disabled:opacity-40">Khóa mềm</button><button disabled={working || item.state !== "OPEN"} onClick={() => run(() => api.updateFinancialPeriod(item.id, "HARD_LOCKED"), "Đã khóa cứng kỳ.")} className="rounded-md bg-ink px-3 py-2 text-[10px] font-black uppercase text-acid disabled:opacity-40">Khóa cứng</button></div></div>)}{!periods.length ? <p className="text-sm font-bold text-muted">Kỳ hiện tại sẽ tự tạo khi phát sinh chứng từ đầu tiên.</p> : null}</div>
        </section>
        <section>
          <h2 className="mb-3 text-lg font-black">Chứng từ đã post</h2>
          <div className="overflow-x-auto rounded-lg border border-line bg-white"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-paper text-[10px] font-black uppercase text-muted"><tr><th className="p-4">Mã</th><th>Loại</th><th>Trạng thái</th><th className="text-right">Tổng</th><th className="px-4 text-right">Điều chỉnh</th></tr></thead><tbody>{documents.map((item) => <tr key={item.id} className="border-t border-line"><td className="p-4 font-black">{item.id}</td><td>{item.type}</td><td><StatusBadge state={item.status} /></td><td className="text-right font-black">{money(item.totalDebit)}</td><td className="px-4 text-right">{item.status === "POSTED" && !item.type.startsWith("REVERSAL_") ? <button disabled={working} onClick={() => reverseDocument(item)} className="rounded-md border border-red-200 px-3 py-2 text-[10px] font-black uppercase text-red-700">Đảo chứng từ</button> : <span className="text-xs text-muted">{item.reversalOfDocumentId || "-"}</span>}</td></tr>)}{!documents.length ? <tr><td colSpan="5" className="p-8 text-center font-bold text-muted">Chưa có chứng từ tài chính.</td></tr> : null}</tbody></table></div>
        </section>
      </div> : null}
    </>
  );
}

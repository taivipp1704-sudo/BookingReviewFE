import { ArrowRight, ChevronDown, Handshake, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ProductCard from "../components/ProductCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { api } from "../../services/api.js";
import { catalogImageUrl, money, rentalRates, shortDate } from "../../utils/format.js";
import { groupBookingItems } from "../../models/bookingItems.js";

const brands = [
  "CANON",
  "FUJI",
  "SONY",
  "POCKET",
];

const CATALOG_SESSION_KEY = "amy-catalog-session-v1";

function readCatalogSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(CATALOG_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function writeCatalogSession(cache) {
  try {
    window.sessionStorage.setItem(CATALOG_SESSION_KEY, JSON.stringify(cache));
  } catch {
    // The live API remains the source of truth when storage is unavailable.
  }
}

const storedCatalog = readCatalogSession();
const catalogCache = {
  products: storedCatalog?.products || null,
  bundles: storedCatalog?.bundles || null,
  availability: storedCatalog?.availability || null,
};

function persistCatalogCache() {
  writeCatalogSession(catalogCache);
}

function mergeAvailability(products, availability) {
  if (!availability) return products;
  const availabilityById = Object.fromEntries(
    availability.map((item) => [item.productId, item]),
  );
  return products.map((product) => ({
    ...product,
    ...(availabilityById[product.id] || {
      totalQty: product.totalQty ?? 0,
      availableQty: product.availableQty ?? 0,
    }),
  }));
}

export default function CustomerPage({ onSelect, onBrowse, mode = "landing", bookingEnabled = false }) {
  const [products, setProducts] = useState(() =>
    mergeAvailability(catalogCache.products || [], catalogCache.availability),
  );
  const [bundles, setBundles] = useState(() => catalogCache.bundles || []);
  const [catalogLoading, setCatalogLoading] = useState(
    () => mode === "catalog" && !catalogCache.products,
  );
  const [catalogError, setCatalogError] = useState("");
  const [query, setQuery] = useState("");
  const [priceSort, setPriceSort] = useState("DEFAULT");
  const [priceRange, setPriceRange] = useState({ min: "", max: "" });
  const [filters, setFilters] = useState({
    brands: [],
    categories: [],
    availableOnly: false,
  });
  const [tracking, setTracking] = useState({
    bookingId: "",
    phone: "",
    result: null,
    error: "",
  });
  const [selectedBundle, setSelectedBundle] = useState(null);

  useEffect(() => {
    if (mode !== "catalog") return undefined;
    let active = true;
    let retryTimer;
    let retryCount = 0;

    const loadCatalog = ({ allowRetry = false } = {}) => {
      if (!catalogCache.products) setCatalogLoading(true);
      setCatalogError("");

      api.products()
        .then((nextProducts) => {
          catalogCache.products = nextProducts;
          persistCatalogCache();
          if (!active) return;
          setProducts(mergeAvailability(nextProducts, catalogCache.availability));
          setCatalogLoading(false);
          retryCount = 0;
        })
        .catch((error) => {
          if (!active) return;
          setCatalogLoading(false);
          if (!catalogCache.products) setCatalogError(error.message);
          if (allowRetry && retryCount === 0 && (!error.status || error.status >= 500)) {
            retryCount += 1;
            retryTimer = window.setTimeout(() => loadCatalog(), 1200);
          }
        });

      api.availability()
        .then((availability) => {
          catalogCache.availability = availability;
          persistCatalogCache();
          if (!active || !catalogCache.products) return;
          setProducts(mergeAvailability(catalogCache.products, availability));
        })
        .catch(() => {});

      api.bundles()
        .then((nextBundles) => {
          catalogCache.bundles = nextBundles;
          persistCatalogCache();
          if (active) setBundles(nextBundles);
        })
        .catch(() => {});
    };

    loadCatalog({ allowRetry: true });
    const timer = window.setInterval(loadCatalog, 15000);
    const onFocus = () => loadCatalog();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearTimeout(retryTimer);
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [mode]);

  const mainProducts = useMemo(
    () => products.filter((product) => product.levelCode === "L1"),
    [products],
  );
  const filterOptions = useMemo(
    () => ({
      brands: [...new Set(mainProducts.map((product) => product.brand))].sort(),
      categories: [
        ...new Set(mainProducts.map((product) => product.category)),
      ].sort(),
    }),
    [mainProducts],
  );
  const visibleProducts = useMemo(
    () =>
      mainProducts
        .filter((product) =>
          `${product.name} ${product.brand} ${product.category}`
            .toLowerCase()
            .includes(query.toLowerCase()),
        )
        .filter(
          (product) =>
            filters.brands.length === 0 ||
            filters.brands.includes(product.brand),
        )
        .filter(
          (product) =>
            filters.categories.length === 0 ||
            filters.categories.includes(product.category),
        )
        .filter((product) => !filters.availableOnly || product.availableQty > 0)
        .filter(
          (product) =>
            priceRange.min === "" ||
            Number(product.dailyPrice) >= Number(priceRange.min),
        )
        .filter(
          (product) =>
            priceRange.max === "" ||
            Number(product.dailyPrice) <= Number(priceRange.max),
        )
        .sort((a, b) =>
          priceSort === "ASC"
            ? Number(a.dailyPrice) - Number(b.dailyPrice)
            : priceSort === "DESC"
              ? Number(b.dailyPrice) - Number(a.dailyPrice)
              : 0,
        ),
    [mainProducts, query, filters, priceSort, priceRange],
  );

  function toggleFilter(group, value) {
    setFilters((current) => ({
      ...current,
      [group]: current[group].includes(value)
        ? current[group].filter((item) => item !== value)
        : [...current[group], value],
    }));
  }

  async function trackBooking(event) {
    event.preventDefault();
    setTracking((current) => ({ ...current, error: "" }));
    try {
      const result = await api.trackBooking({
        bookingId: tracking.bookingId.trim(),
        phone: tracking.phone,
      });
      setTracking((current) => ({ ...current, result }));
    } catch (error) {
      setTracking((current) => ({ ...current, result: null, error: error.message }));
    }
  }

  return (
    <main className="pt-24">
      {mode === "landing" ? (
      <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-10 lg:grid-cols-2 lg:items-stretch">
        <div className="grid min-h-[440px] min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] rounded-lg bg-ink p-5 text-white shadow-soft sm:min-h-[500px] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-acid">
              AMY Digital
            </p>
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">
              Đặt thuê rõ ràng
            </span>
          </div>
          <div className="flex min-w-0 flex-col justify-center py-7 sm:py-8 lg:py-6">
            <h1 className="max-w-full text-[40px] font-black leading-[1.06] sm:max-w-[13ch] sm:text-5xl sm:leading-[1.02] lg:text-6xl">
              <span className="block">Có đồ xịn</span>
              <span className="block">Không lo thiếu</span>
              <span className="block">Hình đẹp</span>
            </h1>
            <div className="mt-6 max-w-xl border-l-2 border-acid pl-4 text-sm font-semibold leading-6 text-white/70 lg:text-[15px]">
              <p>Bạn chọn thiết bị và thời gian</p>
              <p>AMY báo giá tự động rồi kiểm tra kỹ trước khi xác nhận lịch thuê</p>
            </div>
          </div>
          <div id="process" className="grid gap-4 sm:grid-cols-3">
            {[
              ["01", "Chọn thiết bị"],
              ["02", "Gửi yêu cầu"],
              ["03", "Duyệt thủ công"],
            ].map(([number, label]) => (
              <div key={number} className="border-t border-white/15 pt-3">
                <p className="text-xs font-black text-acid">{number}</p>
                <p className="mt-2 text-sm font-bold">{label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="grid min-h-[440px] min-w-0 grid-rows-[minmax(300px,1fr)_auto] overflow-hidden rounded-lg bg-paper shadow-soft sm:min-h-[500px]">
          <div className="relative min-h-0 overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=1200"
              alt="Máy ảnh chuyên nghiệp"
              className="absolute inset-0 h-full w-full object-cover grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
          </div>
          <button type="button" onClick={onBrowse} className="group m-4 flex min-w-0 items-center justify-between gap-4 rounded-lg border border-line bg-white p-4 text-left shadow-soft transition hover:-translate-y-0.5 hover:bg-acid sm:m-6">
            <span>
              <span className="block text-[10px] font-black uppercase tracking-widest text-muted">Danh mục thiết bị</span>
              <span className="mt-2 block text-base font-black">Xem thiết bị và lịch đang được giữ</span>
            </span>
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-ink text-acid transition group-hover:translate-x-1"><ArrowRight className="h-5 w-5" /></span>
          </button>
        </div>
      </section>
      ) : null}

      <div className="overflow-hidden border-y border-line bg-white py-3">
        <div className="amy-brand-marquee flex w-max min-w-max gap-12 px-4 text-[11px] font-black uppercase tracking-[0.35em] text-muted">
          {[...brands, ...brands].map((brand, index) => (
            <span key={`${brand}-${index}`}>{brand}</span>
          ))}
        </div>
      </div>

      {mode === "catalog" ? (
      <section id="gear" className="mx-auto max-w-7xl px-4 py-12">
        <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-muted">
              Thiết bị
            </p>
            <h2 className="mt-2 text-3xl font-black">Chọn bộ máy phù hợp</h2>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
            <label className="flex items-center gap-3 rounded-full border border-line bg-white px-4 py-3 sm:w-80">
              <Search className="h-4 w-4 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Tìm kiếm thiết bị..."
                className="w-full bg-transparent text-sm font-semibold outline-none"
              />
            </label>
            <select
              value={priceSort}
              onChange={(event) => setPriceSort(event.target.value)}
              className="rounded-full border border-line bg-white px-4 py-3 text-sm font-bold outline-none"
            >
              <option value="DEFAULT">Sắp xếp mặc định</option>
              <option value="ASC">Giá thấp đến cao</option>
              <option value="DESC">Giá cao đến thấp</option>
            </select>
          </div>
        </div>
        <div className="grid gap-7 lg:grid-cols-[240px_1fr]">
          <aside className="space-y-3">
            <div className="flex items-center gap-2 border-b border-line pb-3">
              <SlidersHorizontal className="h-4 w-4" />
              <p className="text-xs font-black uppercase">Bộ lọc</p>
            </div>
            <FilterSection
              title="Bộ sưu tập"
              options={filterOptions.categories}
              selected={filters.categories}
              onToggle={(value) => toggleFilter("categories", value)}
            />
            <FilterSection
              title="Thương hiệu"
              options={filterOptions.brands}
              selected={filters.brands}
              onToggle={(value) => toggleFilter("brands", value)}
            />
            <PriceFilter value={priceRange} onChange={setPriceRange} />
            <label className="flex items-center gap-3 border-t border-line pt-4 text-sm font-semibold">
              <input
                type="checkbox"
                checked={filters.availableOnly}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    availableOnly: event.target.checked,
                  }))
                }
                className="h-4 w-4 accent-black"
              />
              Chỉ hiện sản phẩm còn hàng
            </label>
          </aside>
          <div>
            {catalogLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-live="polite" aria-busy="true">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="min-h-[360px] animate-pulse rounded-lg border border-line bg-white p-4">
                    <div className="aspect-[4/3] rounded-lg bg-paper" />
                    <div className="mt-5 h-3 w-20 rounded bg-paper" />
                    <div className="mt-3 h-6 w-3/4 rounded bg-paper" />
                    <div className="mt-6 h-12 rounded bg-paper" />
                  </div>
                ))}
                <span className="sr-only">Đang tải danh sách thiết bị</span>
              </div>
            ) : null}
            {!catalogLoading && catalogError ? (
              <div className="border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">
                Không thể tải danh mục: {catalogError}
              </div>
            ) : null}
            {!catalogLoading && !catalogError && visibleProducts.length === 0 ? (
              <div className="py-10 text-sm font-semibold text-muted">
                Không tìm thấy thiết bị phù hợp.
              </div>
            ) : null}
            {!catalogLoading && !catalogError ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onSelect={onSelect}
                    bookingEnabled={bookingEnabled}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </section>
      ) : null}

      {mode === "catalog" && bundles.length ? (
        <section className="border-t border-line bg-paper py-12">
          <div className="mx-auto max-w-7xl px-4">
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-muted">
              Combo thiết bị
            </p>
            <h2 className="mt-2 text-3xl font-black">Gói thuê được đề xuất</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {bundles.map((bundle) => {
                const names = bundle.items
                  .map(
                    (line) =>
                      products.find((item) => item.id === line.productId)?.name,
                  )
                  .filter(Boolean);
                const main = bundle.items
                  .map((line) =>
                    products.find((item) => item.id === line.productId),
                  )
                  .find((item) => item?.levelCode === "L1");
                return (
                  <article
                    key={bundle.id}
                    className="rounded-lg border border-line bg-white p-5"
                  >
                    <img src={catalogImageUrl(bundle)} alt={bundle.name} className="aspect-[4/3] w-full rounded-lg bg-paper object-cover" />
                    <p className="text-[10px] font-black uppercase text-muted">
                      {bundle.id}
                    </p>
                    <h3 className="mt-2 text-xl font-black">{bundle.name}</h3>
                    <p className="mt-3 text-sm font-semibold leading-6 text-muted">
                      {names.join(" · ")}
                    </p>
                    <div className="mt-5 space-y-1">
                      {rentalRates(bundle).map((rate, index) => (
                        <p key={rate.key} className={index === 0 ? "text-xl font-black" : "text-xs font-bold text-muted"}>
                          {money(rate.value)}<span className="text-[10px]">{rate.suffix}</span>
                        </p>
                      ))}
                    </div>
                    <button onClick={() => setSelectedBundle(bundle)} className="mt-4 w-full rounded-lg border-2 border-ink px-4 py-3 text-xs font-black uppercase">Xem đầy đủ combo</button>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}
      {selectedBundle ? <BundleDialog bundle={selectedBundle} products={products} onClose={() => setSelectedBundle(null)} onBook={(main) => { sessionStorage.setItem("claritycam-preferred-bundle", selectedBundle.id); onSelect(main); }} /> : null}

      {mode === "landing" ? (
      <section id="track" className="border-t border-line bg-white py-12">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.35em] text-muted">
              Tra cứu
            </p>
            <h2 className="mt-2 text-3xl font-black">Theo dõi yêu cầu thuê</h2>
            <p className="mt-4 max-w-md text-sm font-semibold leading-6 text-muted">
              Nhập mã đơn và số điện thoại để xem trạng thái yêu cầu của bạn.
            </p>
          </div>
          <div className="border border-line bg-paper p-5 sm:p-6">
              <form
                onSubmit={trackBooking}
                className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
              >
                <input
                  required
                  value={tracking.bookingId}
                  onChange={(event) =>
                    setTracking((current) => ({
                      ...current,
                      bookingId: event.target.value,
                    }))
                  }
                  placeholder="Mã đơn"
                  className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-ink"
                />
                <input
                  required
                  value={tracking.phone}
                  onChange={(event) =>
                    setTracking((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  placeholder="Số điện thoại"
                  className="rounded-lg border border-line bg-white px-4 py-3 text-sm font-semibold outline-none focus:border-ink"
                />
                <button className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase tracking-wider text-acid">
                  Tra cứu đơn
                </button>
              </form>
            {tracking.error ? (
              <p className="mt-3 text-sm font-semibold text-red-700">
                {tracking.error}
              </p>
            ) : null}
            {tracking.result ? (
              <div className="mt-4 border-t border-line pt-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black text-muted">
                      {tracking.result.id}
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {shortDate(tracking.result.pickupTime)} -{" "}
                      {shortDate(tracking.result.returnTime)}
                    </p>
                  </div>
                  <StatusBadge state={tracking.result.state} />
                </div>
                {groupBookingItems(tracking.result.items).equipment.length ? (
                  <div className="mt-3 rounded-lg bg-ink px-4 py-3 text-white">
                    <p className="text-[10px] font-black uppercase tracking-wider text-acid">Máy đã đặt</p>
                    {groupBookingItems(tracking.result.items).equipment.map((line) => (
                      <div key={line.productId} className="mt-1 flex items-center justify-between gap-3">
                        <span className="font-black">{line.productName}</span>
                        <span className="shrink-0 text-sm font-black">× {line.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                <p className="mt-3 text-sm font-bold">
                  Tổng dự kiến: {tracking.result.totalAmount} · Cọc:{" "}
                  {tracking.result.depositRequired}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
      ) : null}

      {mode === "landing" ? (
        <section id="cooperate" className="border-t border-line bg-paper py-12">
          <div className="mx-auto grid max-w-7xl gap-6 px-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.35em] text-muted">Hợp tác cùng AMY</p>
              <h2 className="mt-2 text-3xl font-black">Đối tác thiết bị và sản xuất nội dung</h2>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-muted">Liên hệ để nhận hồ sơ hợp tác, mẫu hợp đồng và chính sách dành cho đối tác. Nội dung chi tiết có thể được cập nhật từ trang quản trị ở giai đoạn tiếp theo.</p>
            </div>
            <a href="tel:+84937538157" className="flex h-12 items-center justify-center gap-2 rounded-lg bg-ink px-6 text-xs font-black uppercase text-acid"><Handshake className="h-4 w-4" />Liên hệ hợp tác</a>
          </div>
        </section>
      ) : null}
    </main>
  );
}

function FilterSection({ title, options, selected, onToggle }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="border-b border-line py-3">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 py-2 text-left text-sm font-black uppercase"
      >
        <span>{title}</span>
        <ChevronDown
          className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div className="space-y-3 pb-3 pt-2">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-center gap-3 text-sm font-semibold text-muted"
            >
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={() => onToggle(option)}
                className="h-4 w-4 accent-black"
              />
              {option}
            </label>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PriceFilter({ value, onChange }) {
  const ranges = [
    { label: "Dưới 500.000đ", min: "", max: 500000 },
    { label: "500.000đ - 1 triệu", min: 500000, max: 1000000 },
    { label: "1 - 2 triệu", min: 1000000, max: 2000000 },
    { label: "Trên 2 triệu", min: 2000000, max: "" },
  ];
  return (
    <section className="border-b border-line py-3">
      <p className="py-2 text-sm font-black uppercase">Khoảng giá</p>
      <div className="space-y-2">
        {ranges.map((range) => (
          <button
            type="button"
            key={range.label}
            onClick={() => onChange({ min: range.min, max: range.max })}
            className={`w-full border px-3 py-2 text-left text-xs font-bold ${String(value.min) === String(range.min) && String(value.max) === String(range.max) ? "border-ink bg-ink text-acid" : "border-line bg-white"}`}
          >
            {range.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          type="number"
          min="0"
          value={value.min}
          onChange={(event) => onChange({ ...value, min: event.target.value })}
          placeholder="Từ"
          className="min-w-0 border border-line bg-white px-2 py-2 text-xs font-bold"
        />
        <input
          type="number"
          min="0"
          value={value.max}
          onChange={(event) => onChange({ ...value, max: event.target.value })}
          placeholder="Đến"
          className="min-w-0 border border-line bg-white px-2 py-2 text-xs font-bold"
        />
      </div>
    </section>
  );
}

function BundleDialog({ bundle, products, onClose, onBook }) {
  const lines = bundle.items.map((line) => ({ ...line, product: products.find((item) => item.id === line.productId) })).filter((line) => line.product);
  const main = lines.find((line) => line.product.levelCode === "L1")?.product;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg bg-white shadow-soft"><div className="grid lg:grid-cols-[1.1fr_0.9fr]"><div className="bg-paper p-4"><img src={catalogImageUrl(bundle, bundle.detailImageUrl ? "detailImageUrl" : "imageUrl")} alt={`Toàn bộ ${bundle.name}`} className="aspect-[4/3] h-full w-full rounded-lg object-cover" /></div><div className="p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-black uppercase text-muted">Chi tiết combo</p><h2 className="mt-2 text-3xl font-black">{bundle.name}</h2></div><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-paper" aria-label="Đóng"><X className="h-4 w-4" /></button></div><div className="mt-4 grid gap-2 sm:grid-cols-3">{rentalRates(bundle).map((rate) => <div key={rate.key} className="rounded-lg bg-paper p-3"><p className="text-[9px] font-black uppercase text-muted">{rate.label}</p><p className="mt-1 text-sm font-black">{money(rate.value)}</p></div>)}</div><div className="mt-6 space-y-2"><p className="text-[10px] font-black uppercase text-muted">Bộ thiết bị bao gồm</p>{lines.map((line) => <div key={line.productId} className="flex items-center gap-3 rounded-lg border border-line p-3"><img src={catalogImageUrl(line.product)} alt="" className="h-12 w-12 rounded object-cover" /><span className="min-w-0 flex-1 text-sm font-black">{line.product.name}</span><span className="text-sm font-black">× {line.quantity}</span></div>)}</div><button disabled={!main} onClick={() => main && onBook(main)} className="mt-6 w-full rounded-lg bg-ink px-5 py-4 text-xs font-black uppercase text-acid disabled:opacity-40">Đặt combo này</button></div></div></section></div>;
}

import {
  ArrowLeft,
  Clock3,
  CreditCard,
  IdCard,
  ImageIcon,
  LifeBuoy,
  LockKeyhole,
  Loader2,
  LogOut,
  MapPin,
  ReceiptText,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import StatusBadge from "../components/StatusBadge.jsx";
import BookingJourney from "../components/BookingJourney.jsx";
import SecureImagePreview from "../components/SecureImagePreview.jsx";
import { api } from "../../services/api.js";
import { catalogImageUrl, money, shortDate } from "../../utils/format.js";
import { groupBookingItems } from "../../models/bookingItems.js";

function BookingItemThumbnail({ product, name, compact = false, dark = false }) {
  const source = catalogImageUrl(product);
  const [failed, setFailed] = useState(false);

  useEffect(() => setFailed(false), [source]);

  const sizeClass = compact ? "h-12 w-12" : "h-16 w-16 sm:h-20 sm:w-20";
  if (!source || failed) {
    return (
      <div
        className={`${sizeClass} grid shrink-0 place-items-center rounded-md ${dark ? "bg-white/10 text-white/60" : "bg-white text-muted"}`}
        aria-label={`Chưa có ảnh ${name}`}
      >
        <ImageIcon className={compact ? "h-5 w-5" : "h-6 w-6"} />
      </div>
    );
  }

  return (
    <img
      src={source}
      alt={name}
      onError={() => setFailed(true)}
      className={`${sizeClass} shrink-0 rounded-md bg-white object-contain p-1`}
    />
  );
}

export default function CustomerAccountPage({
  account,
  onLogin,
  onBack,
  onLogout,
  onResumeCheckout,
  loginMessage,
}) {
  const [form, setForm] = useState({ phone: "", password: "" });
  const [bookings, setBookings] = useState([]);
  const [checkoutHolds, setCheckoutHolds] = useState([]);
  const [requests, setRequests] = useState([]);
  const [support, setSupport] = useState({
    bookingId: "",
    type: "CHANGE_REQUEST",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [clockNow, setClockNow] = useState(() => Date.now());

  useEffect(() => {
    if (checkoutHolds.length === 0) return undefined;
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [checkoutHolds.length]);

  useEffect(
    () => () => {
      if (imagePreview?.url) URL.revokeObjectURL(imagePreview.url);
    },
    [imagePreview],
  );

  useEffect(() => {
    if (account) {
      setError("");
      Promise.allSettled([
        api.customerBookings(),
        api.customerCheckoutHolds(),
        api.customerSupport(),
        api.products(),
      ])
        .then(([bookingResult, holdResult, supportResult, catalogResult]) => {
          if (bookingResult.status === "fulfilled") setBookings(bookingResult.value);
          if (holdResult.status === "fulfilled") setCheckoutHolds(holdResult.value);
          if (supportResult.status === "fulfilled") setRequests(supportResult.value);
          if (catalogResult.status === "fulfilled") {
            setProducts(Object.fromEntries(catalogResult.value.map((item) => [item.id, item])));
          }
          const failed = [bookingResult, holdResult, supportResult, catalogResult]
            .find((result) => result.status === "rejected");
          if (failed) setError(failed.reason?.message || "Một phần dữ liệu chưa tải được. Vui lòng thử lại.");
        });
    }
  }, [account]);

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(
        await api.customerLogin({
          phone: form.phone,
          password: form.password,
        }),
      );
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitSupport(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await api.createCustomerSupport(support);
      setRequests((current) => [created, ...current]);
      setSupport({ bookingId: "", type: "CHANGE_REQUEST", message: "" });
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function cancelCheckoutHold(holdToken) {
    setBusy(true);
    setError("");
    try {
      await api.releaseBookingHold({ holdToken });
      setCheckoutHolds((current) =>
        current.filter((hold) => hold.holdToken !== holdToken),
      );
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function openStoredImage(loader, title) {
    setError("");
    try {
      const image = await loader();
      setImagePreview({ url: URL.createObjectURL(image), title });
    } catch (nextError) {
      setError(nextError.message);
    }
  }

  if (!account)
    return (
      <main className="mx-auto min-h-screen max-w-xl px-4 pb-12 pt-28">
        <button
          onClick={onBack}
          className="mb-5 flex items-center gap-2 text-xs font-black uppercase text-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại
        </button>
        <section className="rounded-lg border border-line bg-white p-6 shadow-soft">
          <UserRound className="h-7 w-7" />
          <h1 className="mt-4 text-3xl font-black">Đăng nhập khách hàng</h1>
          <p className="mt-2 text-sm font-semibold text-muted">
            {loginMessage || "Nhập họ tên và số điện thoại để xem lịch sử và trạng thái đơn thuê."}
          </p>
            <form onSubmit={login} className="mt-6 space-y-3">
              <input
                required
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
                placeholder="Số điện thoại"
                className="w-full rounded-lg border border-line bg-paper px-4 py-3 font-semibold"
              />
              <label className="flex items-center gap-3 rounded-lg border border-line bg-paper px-4">
                <LockKeyhole className="h-4 w-4" />
                <input
                  required
                  type="password"
                  minLength={8}
                  maxLength={72}
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="Mật khẩu"
                  className="min-w-0 flex-1 bg-transparent py-3 font-semibold outline-none"
                />
              </label>
              <button
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase text-acid"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4" />
                )}
                Đăng nhập
              </button>
            </form>
          {error ? (
            <p className="mt-3 text-sm font-bold text-red-700">{error}</p>
          ) : null}
        </section>
      </main>
    );

  return (
    <>
      <SecureImagePreview
        preview={imagePreview}
        onClose={() => setImagePreview(null)}
      />
      <main className="mx-auto min-h-screen max-w-5xl px-4 pb-12 pt-28">
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-5 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-3 text-xs font-black uppercase transition hover:border-ink"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại sản phẩm
        </button>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
          <p className="text-[10px] font-black uppercase text-muted">
            Tài khoản khách
          </p>
          <h1 className="mt-1 text-3xl font-black">{account.name}</h1>
          <p className="mt-1 text-sm font-bold text-muted">{account.phone}</p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid"
          >
            <LogOut className="h-4 w-4" />
            Đăng xuất
          </button>
        </div>
      </div>
      {checkoutHolds.some((hold) => new Date(hold.expiresAt).getTime() > clockNow) ? (
        <section className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-ink text-acid">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">Thanh toán chưa hoàn tất</h2>
              <p className="mt-1 text-sm font-semibold text-muted">
                Thiết bị vẫn được giữ trong thời gian hiển thị bên dưới. Tiếp tục để gửi ảnh chuyển khoản và hoàn tất đơn.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {checkoutHolds
              .filter((hold) => new Date(hold.expiresAt).getTime() > clockNow)
              .map((hold) => {
              const equipment = hold.items?.find(
                (item) => item.productId === hold.primaryProductId,
              );
              const secondsLeft = Math.max(
                0,
                Math.ceil((new Date(hold.expiresAt).getTime() - clockNow) / 1000),
              );
              return (
                <article key={hold.holdToken} className="rounded-lg border border-amber-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-black">{equipment?.productName || "Thiết bị đang giữ"}</p>
                      <p className="mt-1 text-xs font-bold text-muted">
                        {shortDate(hold.pickupTime)} - {shortDate(hold.returnTime)}
                      </p>
                      <p className="mt-2 text-sm font-black">
                        Cần thanh toán ban đầu: {money(hold.quote?.amountDueNow || 0)}
                      </p>
                      {hold.paymentProofUploadToken ? (
                        <p className="mt-2 inline-flex items-center gap-2 text-xs font-black text-green-700">
                          <ReceiptText className="h-4 w-4" />
                          Ảnh chuyển khoản đã được lưu
                        </p>
                      ) : null}
                    </div>
                    <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-2 text-xs font-black text-amber-900">
                      <Clock3 className="h-4 w-4" />
                      Còn {Math.ceil(secondsLeft / 60)} phút
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    <button
                      type="button"
                      disabled={busy || secondsLeft <= 0}
                      onClick={() => onResumeCheckout?.(hold)}
                      className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid disabled:opacity-50"
                    >
                      Tiếp tục thanh toán
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => cancelCheckoutHold(hold.holdToken)}
                      className="rounded-lg border border-line bg-white px-4 py-3 text-xs font-black uppercase disabled:opacity-50"
                    >
                      Hủy phiên giữ máy
                    </button>
                  </div>
                </article>
              );
              })}
          </div>
        </section>
      ) : null}
      <h2 className="mb-1 text-xl font-black">Lịch sử đơn hàng</h2>
      <p className="mb-4 text-sm font-semibold text-muted">Thiết bị đã đặt, thời gian thuê, chi phí và trạng thái xử lý.</p>
      {bookings.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm font-semibold text-muted">
          Chưa có đơn hàng nào.
        </p>
      ) : (
        <div className="space-y-3">
          {bookings.map((item) => {
            const groupedItems = groupBookingItems(item.items, products);
            return <article
              key={item.id}
              className="rounded-lg border border-line bg-white p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black text-muted">{item.id}</p>
                  <p className="mt-2 font-black">
                    {shortDate(item.pickupTime)} - {shortDate(item.returnTime)}
                  </p>
                </div>
                <StatusBadge state={item.state} />
              </div>
              <div className="mt-4 space-y-2 border-y border-line py-3">
                {item.storeBranchName ? (
                  <div className="mb-3 flex items-start gap-2 rounded-lg bg-paper p-3">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="text-xs font-black">{item.storeBranchName}</p>
                      <p className="mt-1 text-xs font-semibold text-muted">{item.storeBranchAddress}</p>
                    </div>
                  </div>
                ) : null}
                {groupedItems.equipment.length ? (
                  <div className="rounded-lg bg-ink p-4 text-white">
                    <p className="text-[10px] font-black uppercase tracking-wider text-acid">Máy thuê</p>
                    {groupedItems.equipment.map((line) => (
                      <div key={line.productId} className="mt-3 flex min-w-0 items-center gap-3">
                        <BookingItemThumbnail
                          product={products[line.productId] || line}
                          name={line.productName}
                          dark
                        />
                        <span className="min-w-0 flex-1 break-words text-base font-black">{line.productName}</span>
                        <span className="shrink-0 font-black">× {line.quantity}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
                {groupedItems.accessories.length ? (
                  <div className="pt-2">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-muted">Phụ kiện đi kèm</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {groupedItems.accessories.map((line) => (
                        <div key={line.productId} className="flex min-w-0 items-center gap-3 rounded-lg border border-line bg-paper p-2 text-sm">
                          <BookingItemThumbnail
                            product={products[line.productId] || line}
                            name={line.productName}
                            compact
                          />
                          <span className="min-w-0 flex-1 break-words font-bold">{line.productName}</span>
                          <span className="shrink-0 font-black">× {line.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm font-bold">
                <span>Tiền thuê: {money(item.totalAmount)}</span>
                <span className="text-muted">Cọc máy: {money(item.equipmentDeposit)} · Giữ lịch: {money(item.bookingDeposit)}</span>
              </div>
              <p className="mt-2 text-sm font-black">Đã yêu cầu giữ lịch: {money(item.amountDueNow)}</p>
              <p className="mt-1 text-xs font-bold text-muted">Cần thanh toán trước giao: {money(item.amountDueBeforeHandover || item.amountDueNow)}</p>
              {item.discountAmount > 0 ? <p className="mt-2 text-xs font-bold text-green-700">Đã giảm {money(item.discountAmount)} với mã {item.promotionCode}</p> : null}
              {item.identityDocumentsAvailable || item.paymentProofAvailable ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                  {item.identityDocumentsAvailable ? (
                    <>
                      <button
                        type="button"
                        onClick={() => openStoredImage(
                          () => api.customerIdentityDocument(item.id, "front"),
                          `Mặt trước CCCD · ${item.id}`,
                        )}
                        className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-black"
                      >
                        <IdCard className="h-4 w-4" />
                        Xem CCCD mặt trước
                      </button>
                      <button
                        type="button"
                        onClick={() => openStoredImage(
                          () => api.customerIdentityDocument(item.id, "back"),
                          `Mặt sau CCCD · ${item.id}`,
                        )}
                        className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-black"
                      >
                        <IdCard className="h-4 w-4" />
                        Xem CCCD mặt sau
                      </button>
                    </>
                  ) : null}
                  {item.paymentProofAvailable ? (
                    <button
                      type="button"
                      onClick={() => openStoredImage(
                        () => api.customerPaymentProof(item.id),
                        `Ảnh chuyển khoản · ${item.id}`,
                      )}
                      className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-black text-green-900"
                    >
                      <ReceiptText className="h-4 w-4" />
                      Xem ảnh chuyển khoản
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="mt-5 border-t border-line pt-4"><BookingJourney state={item.state} compact /></div>
              {item.earlyPickupRequested ? (
                <p className="mt-2 text-xs font-bold text-muted">
                  Nhận sớm: {shortDate(item.earlyPickupTime)} ·{" "}
                  {item.earlyPickupApproved
                    ? `Đã duyệt, phí ${money(item.earlyPickupFee)}`
                    : "Đang chờ admin duyệt"}
                </p>
              ) : null}
            </article>;
          })}
        </div>
      )}
      <section className="mt-8 border-t border-line pt-7">
        <div className="mb-4 flex items-center gap-2">
          <LifeBuoy className="h-5 w-5" />
          <h2 className="text-xl font-black">Yêu cầu hỗ trợ</h2>
        </div>
        <form
          onSubmit={submitSupport}
          className="grid gap-3 rounded-lg border border-line bg-white p-5 md:grid-cols-2"
        >
          <select
            required
            value={support.bookingId}
            onChange={(event) =>
              setSupport({ ...support, bookingId: event.target.value })
            }
            className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold"
          >
            <option value="">Chọn đơn thuê</option>
            {bookings.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id}
              </option>
            ))}
          </select>
          <select
            value={support.type}
            onChange={(event) =>
              setSupport({ ...support, type: event.target.value })
            }
            className="rounded-lg border border-line bg-paper px-3 py-3 text-sm font-bold"
          >
            <option value="CHANGE_REQUEST">
              Đổi lịch/đổi thiết bị
            </option>
            <option value="EQUIPMENT_ISSUE">Báo thiết bị lỗi</option>
            <option value="EARLY_RETURN">Yêu cầu trả sớm</option>
            <option value="OTHER">Khác</option>
          </select>
          <textarea
            required
            value={support.message}
            onChange={(event) =>
              setSupport({ ...support, message: event.target.value })
            }
            placeholder="Mô tả yêu cầu"
            className="min-h-24 rounded-lg border border-line bg-paper p-3 text-sm font-semibold md:col-span-2"
          />
          <button
            disabled={busy}
            className="rounded-lg bg-ink px-4 py-3 text-xs font-black uppercase text-acid md:col-span-2"
          >
            Gửi yêu cầu
          </button>
        </form>
        {error ? (
          <p className="mt-3 text-sm font-bold text-red-700">{error}</p>
        ) : null}
        <div className="mt-4 space-y-2">
          {requests.map((item) => (
            <article
              key={item.id}
              className="rounded-lg border border-line bg-white p-4"
            >
              <div className="flex justify-between gap-3">
                <p className="text-xs font-black">
                  {item.id} · {item.type}
                </p>
                <span className="text-xs font-black text-muted">
                  {item.status}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{item.message}</p>
              {item.adminNote ? (
                <p className="mt-2 text-xs font-bold text-muted">
                  Phản hồi: {item.adminNote}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      </main>
    </>
  );
}

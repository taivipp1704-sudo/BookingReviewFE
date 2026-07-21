import {
  ArrowLeft,
  CheckCircle2,
  LifeBuoy,
  Loader2,
  LogOut,
  RefreshCw,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import StatusBadge from "../components/StatusBadge.jsx";
import BookingJourney from "../components/BookingJourney.jsx";
import { api } from "../lib/api.js";
import { money, shortDate } from "../lib/format.js";

export default function CustomerAccountPage({
  account,
  onLogin,
  onBack,
  onLogout,
  loginMessage,
}) {
  const [form, setForm] = useState({ name: "", phone: "", code: "" });
  const [challenge, setChallenge] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [requests, setRequests] = useState([]);
  const [support, setSupport] = useState({
    bookingId: "",
    type: "CHANGE_REQUEST",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [products, setProducts] = useState({});

  useEffect(() => {
    if (account)
      Promise.all([
        api.customerBookings(),
        api.customerSupport(),
        api.products(),
      ])
        .then(([nextBookings, nextRequests, catalog]) => {
          setBookings(nextBookings);
          setRequests(nextRequests);
          setProducts(
            Object.fromEntries(catalog.map((item) => [item.id, item])),
          );
        })
        .catch((error) => setError(error.message));
  }, [account]);

  async function requestOtp(event) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      setChallenge(
        await api.requestOtp({ phone: form.phone, purpose: "ACCOUNT" }),
      );
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const verified = await api.verifyOtp({
        challengeId: challenge.challengeId,
        phone: form.phone,
        code: form.code,
        purpose: "ACCOUNT",
      });
      onLogin(
        await api.customerLogin({
          phone: form.phone,
          name: form.name,
          verificationToken: verified.verificationToken,
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
            {loginMessage || "Đăng nhập bằng OTP để xem lịch sử và trạng thái đơn thuê."}
          </p>
          {!challenge ? (
            <form onSubmit={requestOtp} className="mt-6 space-y-3">
              <input
                required
                value={form.name}
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                placeholder="Họ và tên"
                className="w-full rounded-lg border border-line bg-paper px-4 py-3 font-semibold"
              />
              <input
                required
                value={form.phone}
                onChange={(event) =>
                  setForm({ ...form, phone: event.target.value })
                }
                placeholder="Số điện thoại"
                className="w-full rounded-lg border border-line bg-paper px-4 py-3 font-semibold"
              />
              <button
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase text-acid"
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4" />
                )}
                Nhận OTP
              </button>
            </form>
          ) : (
            <form onSubmit={login} className="mt-6 space-y-3">
              <p className="text-sm font-semibold text-muted">
                Mã xác thực đã được tạo cho số <strong className="text-ink">{form.phone}</strong>.
              </p>
              <input
                required
                maxLength="6"
                value={form.code}
                onChange={(event) =>
                  setForm({
                    ...form,
                    code: event.target.value.replace(/\D/g, ""),
                  })
                }
                placeholder="Mã OTP"
                className="w-full rounded-lg border border-line bg-paper px-4 py-3 text-lg font-black"
              />
              {challenge.demoCode ? (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, code: challenge.demoCode })}
                  className="flex w-full items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-left text-xs font-bold text-orange-800"
                >
                  <span>Mã OTP local dev</span>
                  <strong className="text-lg tracking-widest">{challenge.demoCode}</strong>
                </button>
              ) : null}
              <button
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase text-acid"
              >
                <CheckCircle2 className="h-4 w-4" />
                Đăng nhập
              </button>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setChallenge(null);
                    setForm({ ...form, code: "" });
                    setError("");
                  }}
                  className="rounded-lg border border-line px-3 py-3 text-xs font-black uppercase text-muted"
                >
                  Đổi số
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={requestOtp}
                  className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-3 text-xs font-black uppercase text-ink"
                >
                  <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
                  Gửi lại mã
                </button>
              </div>
            </form>
          )}
          {error ? (
            <p className="mt-3 text-sm font-bold text-red-700">{error}</p>
          ) : null}
        </section>
      </main>
    );

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 pb-12 pt-28">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase text-muted">
            Tài khoản khách
          </p>
          <h1 className="mt-1 text-3xl font-black">{account.name}</h1>
          <p className="mt-1 text-sm font-bold text-muted">{account.phone}</p>
        </div>
        <button
          onClick={onLogout}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-acid"
          title="Đăng xuất"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <h2 className="mb-1 text-xl font-black">Lịch sử đơn hàng</h2>
      <p className="mb-4 text-sm font-semibold text-muted">Thiết bị đã đặt, thời gian thuê, chi phí và trạng thái xử lý.</p>
      {bookings.length === 0 ? (
        <p className="rounded-lg bg-white p-5 text-sm font-semibold text-muted">
          Chưa có đơn hàng nào.
        </p>
      ) : (
        <div className="space-y-3">
          {bookings.map((item) => (
            <article
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
                {(item.items || []).map((line) => (
                  <div key={line.id || line.productId} className="flex items-center justify-between gap-3 text-sm">
                    <span className="font-bold">{products[line.productId]?.name || line.productId}</span>
                    <span className="shrink-0 font-black">× {line.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm font-bold">
                <span>Tiền thuê: {money(item.totalAmount)}</span>
                <span className="text-muted">Cọc máy: {money(item.equipmentDeposit)} · Giữ lịch: {money(item.bookingDeposit)}</span>
              </div>
              <p className="mt-2 text-sm font-black">Thanh toán ban đầu: {money(item.amountDueNow)}</p>
              {item.discountAmount > 0 ? <p className="mt-2 text-xs font-bold text-green-700">Đã giảm {money(item.discountAmount)} với mã {item.promotionCode}</p> : null}
              <div className="mt-5 border-t border-line pt-4"><BookingJourney state={item.state} compact /></div>
              {item.earlyPickupRequested ? (
                <p className="mt-2 text-xs font-bold text-muted">
                  Nhận sớm: {shortDate(item.earlyPickupTime)} ·{" "}
                  {item.earlyPickupApproved
                    ? `Đã duyệt, phí ${money(item.earlyPickupFee)}`
                    : "Đang chờ admin duyệt"}
                </p>
              ) : null}
            </article>
          ))}
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
  );
}

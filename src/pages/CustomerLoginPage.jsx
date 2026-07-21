import { ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, Loader2, RefreshCw, Smartphone, UserRound } from "lucide-react";
import { useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import { api } from "../lib/api.js";

export default function CustomerLoginPage({ onLogin, onBack, loginMessage }) {
  const [form, setForm] = useState({ name: "", phone: "", code: "" });
  const [challenge, setChallenge] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function requestOtp(event) {
    event?.preventDefault();
    setBusy(true);
    setError("");
    try {
      setChallenge(await api.requestOtp({ phone: form.phone, purpose: "ACCOUNT" }));
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
      onLogin(await api.customerLogin({ phone: form.phone, name: form.name, verificationToken: verified.verificationToken }));
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell audience="customer">
      <section className="w-full rounded-lg border border-line bg-white p-6 shadow-[0_20px_60px_rgba(16,16,16,.09)] sm:p-9">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Quay lại website
        </button>
        <div className="mt-10 grid h-14 w-14 place-items-center rounded-lg bg-ink text-acid shadow-lg"><UserRound className="h-5 w-5" /></div>
        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-muted">Tài khoản khách hàng</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Đăng nhập để đặt thiết bị</h1>
        <p className="mt-2 text-sm font-semibold text-muted">{loginMessage || "Đăng nhập bằng OTP để đặt thuê, xem lịch sử và trạng thái đơn hàng."}</p>
        {!challenge ? (
          <form onSubmit={requestOtp} className="mt-7 space-y-4">
            <label className="block text-xs font-black text-muted">Họ và tên
              <span className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink"><UserRound className="h-4 w-4" /><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nguyễn Văn A" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" /></span>
            </label>
            <label className="block text-xs font-black text-muted">Số điện thoại
              <span className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink"><Smartphone className="h-4 w-4" /><input required inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="09xx xxx xxx" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" /></span>
            </label>
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase tracking-wider text-acid disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />} Nhận mã OTP <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={login} className="mt-7 space-y-4">
            <p className="text-sm font-semibold text-muted">Mã xác thực đã được tạo cho số <strong className="text-ink">{form.phone}</strong>.</p>
            <input required autoFocus maxLength="6" inputMode="numeric" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.replace(/\D/g, "") })} placeholder="Mã OTP" className="w-full rounded-lg border border-line bg-paper px-4 py-3.5 text-center text-xl font-black tracking-[0.35em] outline-none focus:border-ink" />
            {challenge.demoCode ? (
              <button type="button" onClick={() => setForm({ ...form, code: challenge.demoCode })} className="flex w-full items-center justify-between rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-left text-xs font-bold text-orange-800">
                <span>Mã OTP local dev</span><strong className="text-lg tracking-widest">{challenge.demoCode}</strong>
              </button>
            ) : null}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase tracking-wider text-acid disabled:opacity-50">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Đăng nhập <ArrowRight className="h-4 w-4" />
            </button>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" disabled={busy} onClick={() => { setChallenge(null); setForm({ ...form, code: "" }); setError(""); }} className="rounded-lg border border-line px-3 py-3 text-xs font-black uppercase text-muted">Đổi số</button>
              <button type="button" disabled={busy} onClick={requestOtp} className="flex items-center justify-center gap-2 rounded-lg border border-line px-3 py-3 text-xs font-black uppercase text-ink"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Gửi lại mã</button>
            </div>
          </form>
        )}
        {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <a href="mailto:contact@amydigital.local" className="mt-6 flex items-center justify-center gap-2 text-[11px] font-semibold text-muted underline underline-offset-2 hover:text-ink"><CircleHelp className="h-4 w-4" />Cần hỗ trợ đăng nhập? Liên hệ AMY Digital.</a>
      </section>
    </AuthShell>
  );
}

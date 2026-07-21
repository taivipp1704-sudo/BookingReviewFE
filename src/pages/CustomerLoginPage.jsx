import { ArrowLeft, ArrowRight, CircleHelp, Loader2, Smartphone, UserRound } from "lucide-react";
import { useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import { api } from "../lib/api.js";

export default function CustomerLoginPage({ onLogin, onBack, loginMessage }) {
  const [form, setForm] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function login(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await api.customerLogin({ phone: form.phone, name: form.name }));
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
        <p className="mt-2 text-sm font-semibold text-muted">{loginMessage || "Nhập họ tên và số điện thoại để truy cập, không cần mã OTP."}</p>
        <form onSubmit={login} className="mt-7 space-y-4">
          <label className="block text-xs font-black text-muted">Họ và tên
            <span className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink"><UserRound className="h-4 w-4" /><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nguyễn Văn A" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" /></span>
          </label>
          <label className="block text-xs font-black text-muted">Số điện thoại
            <span className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink"><Smartphone className="h-4 w-4" /><input required inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="09xx xxx xxx" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" /></span>
          </label>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase tracking-wider text-acid disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserRound className="h-4 w-4" />} Đăng nhập <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <a href="mailto:contact@amydigital.local" className="mt-6 flex items-center justify-center gap-2 text-[11px] font-semibold text-muted underline underline-offset-2 hover:text-ink"><CircleHelp className="h-4 w-4" />Cần hỗ trợ đăng nhập? Liên hệ AMY Digital.</a>
      </section>
    </AuthShell>
  );
}

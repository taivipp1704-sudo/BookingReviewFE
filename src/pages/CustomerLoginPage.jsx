import { ArrowLeft, ArrowRight, CircleHelp, Loader2, LogIn, Smartphone, UserPlus, UserRound } from "lucide-react";
import { useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import { api } from "../lib/api.js";

export default function CustomerLoginPage({ onLogin, onBack, loginMessage, initialMode = "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: "", phone: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function selectMode(nextMode) {
    setMode(nextMode);
    setError("");
  }

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = { phone: form.phone, name: mode === "register" ? form.name : "" };
      const account = mode === "register"
        ? await api.customerRegister(payload)
        : await api.customerLogin(payload);
      onLogin(account);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell audience="customer">
      <section className="flex min-h-[590px] w-full flex-col rounded-lg border border-line bg-white p-6 shadow-[0_20px_60px_rgba(16,16,16,.09)] sm:p-9">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Quay lại website
        </button>
        <div className="mt-8 grid h-14 w-14 place-items-center rounded-lg bg-ink text-acid shadow-lg">
          {mode === "register" ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
        </div>
        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-muted">Tài khoản khách hàng</p>
        <h1 className="mt-2 min-h-[44px] text-3xl font-black sm:text-4xl">{mode === "register" ? "Tạo tài khoản mới" : "Đăng nhập để tiếp tục"}</h1>
        <p className="mt-2 min-h-[60px] text-sm font-semibold text-muted">
          {loginMessage || (mode === "register"
            ? "Đăng ký bằng họ tên và số điện thoại. Tiếp theo bạn sẽ xem hướng dẫn trước khi vào trang chủ."
            : "Đăng nhập bằng số điện thoại đã đăng ký. Tiếp theo bạn sẽ xem hướng dẫn trước khi vào trang chủ.")}
        </p>
        <div className="mt-6 grid grid-cols-2 rounded-lg border border-line bg-paper p-1">
          <button type="button" onClick={() => selectMode("login")} className={`rounded-md px-3 py-2.5 text-xs font-black uppercase transition ${mode === "login" ? "bg-ink text-acid shadow-sm" : "text-muted hover:text-ink"}`}>Đăng nhập</button>
          <button type="button" onClick={() => selectMode("register")} className={`rounded-md px-3 py-2.5 text-xs font-black uppercase transition ${mode === "register" ? "bg-ink text-acid shadow-sm" : "text-muted hover:text-ink"}`}>Đăng ký</button>
        </div>
        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          {mode === "register" ? <label className="block min-w-0 text-xs font-black text-muted">Họ và tên
            <span className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink"><UserRound className="h-4 w-4" /><input disabled={mode !== "register"} required={mode === "register"} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Nguyễn Văn A" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" /></span>
          </label> : null}
          <label className={`block min-w-0 text-xs font-black text-muted ${mode === "login" ? "sm:col-span-2" : ""}`}>Số điện thoại
            <span className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink"><Smartphone className="h-4 w-4" /><input required inputMode="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} placeholder="09xx xxx xxx" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" /></span>
          </label>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase tracking-wider text-acid disabled:opacity-50 sm:col-span-2">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "register" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
            {mode === "register" ? "Đăng ký" : "Đăng nhập"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <a href="mailto:contact@amydigital.local" className="mt-auto flex items-center justify-center gap-2 pt-6 text-[11px] font-semibold text-muted underline underline-offset-2 hover:text-ink"><CircleHelp className="h-4 w-4" />Cần hỗ trợ đăng nhập? Liên hệ AMY Digital.</a>
      </section>
    </AuthShell>
  );
}

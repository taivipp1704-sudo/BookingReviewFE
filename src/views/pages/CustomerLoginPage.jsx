import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  Loader2,
  LockKeyhole,
  LogIn,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import { api } from "../../services/api.js";

export default function CustomerLoginPage({ onBack, onLogin, loginMessage }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    password: "",
    confirmPassword: "",
    consentAccepted: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        if (form.password !== form.confirmPassword) {
          throw new Error("Mật khẩu xác nhận chưa khớp.");
        }
        if (!form.consentAccepted) {
          throw new Error("Bạn cần đồng ý lưu thông tin tài khoản để đăng ký.");
        }
        const account = await api.customerRegister({
          name: form.name.trim(),
          phone: form.phone.trim(),
          password: form.password,
          consentAccepted: true,
        });
        onLogin?.(account);
      } else {
        const account = await api.customerLogin({
          phone: form.phone.trim(),
          password: form.password,
        });
        onLogin?.(account);
      }
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setForm(current => ({ ...current, password: "", confirmPassword: "" }));
  }

  return (
    <AuthShell audience="customer">
      <section className="customer-auth-card w-full py-2">
        <button type="button" onClick={onBack} className="flex w-fit items-center gap-2 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Quay lại website
        </button>

        <div className="mt-6 grid h-12 w-12 place-items-center rounded-lg bg-ink text-acid shadow-lg">
          {mode === "login" ? <LogIn className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
        </div>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-muted">Tài khoản khách hàng</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          {mode === "login" ? "Đăng nhập để tiếp tục" : "Tạo tài khoản AMY"}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted">
          {loginMessage || "Đăng nhập để xem thiết bị và lịch đã được giữ. Tính năng tạo booking hiện chưa mở."}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-lg border border-line bg-paper p-1" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký">
          <button type="button" onClick={() => changeMode("login")} className={`rounded-md px-4 py-3 text-xs font-black uppercase ${mode === "login" ? "bg-ink text-acid" : "text-muted"}`}>Đăng nhập</button>
          <button type="button" onClick={() => changeMode("register")} className={`rounded-md px-4 py-3 text-xs font-black uppercase ${mode === "register" ? "bg-ink text-acid" : "text-muted"}`}>Đăng ký</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" ? (
            <Field label="Họ và tên" icon={<UserRound className="h-4 w-4" />}>
              <input required autoComplete="name" maxLength={180} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Nguyễn Văn A" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
            </Field>
          ) : null}

          <Field label="Số điện thoại" icon={<Smartphone className="h-4 w-4" />}>
            <input required inputMode="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="09xx xxx xxx" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
          </Field>

          <Field label="Mật khẩu" icon={<LockKeyhole className="h-4 w-4" />}>
            <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={72} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Tối thiểu 8 ký tự" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
          </Field>

          {mode === "register" ? (
            <>
              <Field label="Xác nhận mật khẩu" icon={<LockKeyhole className="h-4 w-4" />}>
                <input required type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.confirmPassword} onChange={event => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Nhập lại mật khẩu" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
              </Field>
              <label className="flex cursor-pointer items-start gap-3 border-y border-line py-4 text-xs font-semibold leading-5 text-muted">
                <input required type="checkbox" checked={form.consentAccepted} onChange={event => setForm({ ...form, consentAccepted: event.target.checked })} className="mt-0.5 h-4 w-4 accent-black" />
                <span>Đồng ý để AMY Digital lưu họ tên và số điện thoại nhằm quản lý tài khoản và thông báo khi mở booking.</span>
              </label>
            </>
          ) : null}

          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase tracking-wider text-acid disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            {mode === "login" ? "Đăng nhập" : "Đăng ký"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <a href="mailto:contact@amydigital.local" className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-muted underline underline-offset-2 hover:text-ink">
          <CircleHelp className="h-4 w-4" /> Cần hỗ trợ? Liên hệ AMY Digital
        </a>
      </section>
    </AuthShell>
  );
}

function Field({ label, icon, children }) {
  return (
    <label className="block min-w-0 text-xs font-black text-muted">
      {label}
      <span className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink">
        {icon}
        {children}
      </span>
    </label>
  );
}

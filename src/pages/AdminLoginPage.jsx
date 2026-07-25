import { ArrowLeft, ArrowRight, CircleHelp, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import { api } from "../lib/api.js";

export default function AdminLoginPage({ onLogin, onBack }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onLogin(await api.login(form));
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell audience="admin">
      <form onSubmit={submit} className="w-full rounded-lg border border-line bg-white p-6 shadow-[0_20px_60px_rgba(16,16,16,.09)] sm:p-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Quay lại website AMY
        </button>
        <div className="mt-7 grid h-12 w-12 place-items-center rounded-lg bg-ink text-acid shadow-lg"><LockKeyhole className="h-5 w-5" /></div>
        <p className="mt-6 text-[11px] font-black uppercase tracking-[0.2em] text-muted">Đăng nhập nội bộ</p>
        <h2 className="mt-2 text-3xl font-black sm:text-4xl">Chào mừng trở lại!</h2>
        <p className="mt-2 text-sm font-semibold text-muted">Đăng nhập để tiếp tục vận hành hệ thống AMY.</p>
        <div className="mt-7 space-y-4">
          <label className="block text-xs font-black text-muted">Email
            <span className="mt-2 flex h-[52px] items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink">
              <Mail className="h-4 w-4" />
              <input type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="admin@amydigital.local" className="min-w-0 flex-1 bg-transparent py-0 text-sm font-semibold text-ink outline-none" />
            </span>
          </label>
          <label className="block text-xs font-black text-muted">Mật khẩu
            <span className="mt-2 flex h-[52px] items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink">
              <LockKeyhole className="h-4 w-4" />
              <input type={showPassword ? "text" : "password"} required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="••••••••••••" className="min-w-0 flex-1 bg-transparent py-0 text-sm font-semibold text-ink outline-none placeholder:text-ink" />
              <button type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} className="grid h-8 w-8 place-items-center text-muted hover:text-ink">
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </span>
          </label>
        </div>
        {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button disabled={busy} className="mt-6 flex h-[54px] w-full items-center justify-center gap-3 rounded-lg bg-ink px-4 text-xs font-black uppercase tracking-wider text-acid disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />} Đăng nhập <ArrowRight className="h-4 w-4" />
        </button>
        <a href="mailto:contact@amydigital.local" className="mt-7 flex items-center justify-center gap-2 text-[11px] font-semibold text-muted underline underline-offset-2 hover:text-ink"><CircleHelp className="h-4 w-4" />Không thể đăng nhập? Liên hệ quản trị hệ thống.</a>
      </form>
    </AuthShell>
  );
}

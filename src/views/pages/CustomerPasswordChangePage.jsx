import { ArrowRight, KeyRound, Loader2, LockKeyhole } from "lucide-react";
import { useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import { api } from "../../services/api.js";

export default function CustomerPasswordChangePage({ account, onComplete, onLogout }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (form.newPassword !== form.confirmPassword) {
      setError("Mật khẩu xác nhận chưa khớp.");
      return;
    }
    setBusy(true);
    try {
      const updated = await api.changeCustomerPassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      onComplete(updated);
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell audience="customer">
      <section className="w-full py-2">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-ink text-acid shadow-lg">
          <KeyRound className="h-5 w-5" />
        </div>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-muted">Bảo vệ tài khoản</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">Đổi mật khẩu tạm</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted">
          Xin chào {account?.name}. Admin vừa cấp mật khẩu tạm, bạn cần đổi sang mật khẩu riêng trước khi tiếp tục.
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <PasswordField label="Mật khẩu tạm" value={form.currentPassword} onChange={value => setForm({ ...form, currentPassword: value })} autoComplete="current-password" />
          <PasswordField label="Mật khẩu mới" value={form.newPassword} onChange={value => setForm({ ...form, newPassword: value })} autoComplete="new-password" />
          <PasswordField label="Xác nhận mật khẩu mới" value={form.confirmPassword} onChange={value => setForm({ ...form, confirmPassword: value })} autoComplete="new-password" />
          <p className="text-xs font-semibold leading-5 text-muted">Tối thiểu 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.</p>
          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase text-acid disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            Lưu mật khẩu mới <ArrowRight className="h-4 w-4" />
          </button>
        </form>
        {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <button type="button" onClick={onLogout} className="mt-5 w-full text-center text-xs font-bold text-muted underline underline-offset-4">Đăng xuất tài khoản này</button>
      </section>
    </AuthShell>
  );
}

function PasswordField({ label, value, onChange, autoComplete }) {
  return (
    <label className="block text-xs font-black text-muted">
      {label}
      <span className="mt-2 flex items-center gap-3 rounded-lg border border-line bg-paper px-4 focus-within:border-ink">
        <LockKeyhole className="h-4 w-4" />
        <input required type="password" minLength={12} maxLength={128} autoComplete={autoComplete} value={value} onChange={event => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
      </span>
    </label>
  );
}

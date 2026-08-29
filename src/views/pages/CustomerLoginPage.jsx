import {
  ArrowLeft,
  ArrowRight,
  CircleHelp,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  Smartphone,
  UserRound,
} from "lucide-react";
import { useRef, useState } from "react";
import AuthShell from "../components/AuthShell.jsx";
import { api } from "../../services/api.js";

const EMPTY_PIN = ["", "", "", "", "", ""];

export default function CustomerLoginPage({ onBack, onLogin, loginMessage }) {
  const [mode, setMode] = useState("login");
  const [loginMethod, setLoginMethod] = useState("password");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    consentAccepted: false,
  });
  const [pinDigits, setPinDigits] = useState(EMPTY_PIN);
  const pinRefs = useRef([]);
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
          email: form.email.trim(),
          phone: form.phone.trim(),
          password: form.password,
          consentAccepted: true,
        });
        onLogin?.(account);
      } else if (loginMethod === "pin") {
        const pin = pinDigits.join("");
        if (pin.length !== 6) {
          throw new Error("Vui lòng nhập đủ 6 số của mã PIN.");
        }
        const account = await api.customerLoginWithPin({
          phone: form.phone.trim(),
          pin,
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
      if (loginMethod === "pin") {
        setPinDigits(EMPTY_PIN);
        pinRefs.current[0]?.focus();
      }
    } finally {
      setBusy(false);
    }
  }

  function changeMode(nextMode) {
    setMode(nextMode);
    setLoginMethod("password");
    setError("");
    setForm(current => ({ ...current, password: "", confirmPassword: "" }));
    setPinDigits(EMPTY_PIN);
  }

  function changeLoginMethod(nextMethod) {
    setLoginMethod(nextMethod);
    setError("");
    setForm(current => ({ ...current, password: "" }));
    setPinDigits(EMPTY_PIN);
  }

  function updatePinDigit(index, rawValue) {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    setPinDigits(current => {
      const next = [...current];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) pinRefs.current[index + 1]?.focus();
  }

  function handlePinKeyDown(index, event) {
    if (event.key === "Backspace" && !pinDigits[index] && index > 0) {
      pinRefs.current[index - 1]?.focus();
    }
  }

  function handlePinPaste(event) {
    const digits = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split("");
    if (digits.length === 0) return;
    event.preventDefault();
    setPinDigits(current => {
      const next = [...current];
      digits.forEach((digit, index) => { next[index] = digit; });
      return next;
    });
    pinRefs.current[Math.min(digits.length, 5)]?.focus();
  }

  const showPinEntry = mode === "login" && loginMethod === "pin";

  return (
    <AuthShell audience="customer">
      <section className="customer-auth-card w-full py-2">
        <button type="button" onClick={onBack} className="flex w-fit items-center gap-2 text-xs font-bold text-muted hover:text-ink">
          <ArrowLeft className="h-4 w-4" /> Quay lại website
        </button>

        <div className="mt-6 grid h-12 w-12 place-items-center rounded-lg bg-ink text-acid shadow-lg">
          {mode === "register" ? <UserRound className="h-5 w-5" /> : showPinEntry ? <KeyRound className="h-5 w-5" /> : <LogIn className="h-5 w-5" />}
        </div>
        <p className="mt-5 text-[11px] font-black uppercase tracking-[0.2em] text-muted">Tài khoản khách hàng</p>
        <h1 className="mt-2 text-3xl font-black sm:text-4xl">
          {mode === "register" ? "Tạo tài khoản AMY" : showPinEntry ? "Nhập mã mở khoá" : "Đăng nhập để tiếp tục"}
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-muted">
          {loginMessage || (showPinEntry
            ? "Nhập số điện thoại và mã PIN 6 số để đăng nhập nhanh."
            : "Đăng nhập để chọn thiết bị, giữ lịch và theo dõi toàn bộ đơn thuê của bạn.")}
        </p>

        <div className="mt-6 grid grid-cols-2 rounded-lg border border-line bg-paper p-1" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký">
          <button type="button" onClick={() => changeMode("login")} className={`rounded-md px-4 py-3 text-xs font-black uppercase ${mode === "login" ? "bg-ink text-acid" : "text-muted"}`}>Đăng nhập</button>
          <button type="button" onClick={() => changeMode("register")} className={`rounded-md px-4 py-3 text-xs font-black uppercase ${mode === "register" ? "bg-ink text-acid" : "text-muted"}`}>Đăng ký</button>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {mode === "register" ? (
            <>
              <Field label="Họ và tên" icon={<UserRound className="h-4 w-4" />}>
                <input required autoComplete="name" maxLength={180} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="Nguyễn Văn A" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
              </Field>
              <Field label="Email" icon={<Mail className="h-4 w-4" />}>
                <input required type="email" autoComplete="email" maxLength={255} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} placeholder="ban@email.com" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
              </Field>
            </>
          ) : null}

          <Field label="Số điện thoại" icon={<Smartphone className="h-4 w-4" />}>
            <input required inputMode="tel" autoComplete="tel" maxLength={20} value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="09xx xxx xxx" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
          </Field>

          {showPinEntry ? (
            <div>
              <p className="text-xs font-black text-muted">Mã PIN 6 số</p>
              <div className="mt-2 flex justify-between gap-2" onPaste={handlePinPaste}>
                {pinDigits.map((digit, index) => (
                  <input
                    key={index}
                    ref={element => { pinRefs.current[index] = element; }}
                    required
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={1}
                    value={digit}
                    onChange={event => updatePinDigit(index, event.target.value)}
                    onKeyDown={event => handlePinKeyDown(index, event)}
                    className="h-14 w-full min-w-0 rounded-lg border border-line bg-paper text-center text-xl font-black outline-none focus:border-ink"
                  />
                ))}
              </div>
            </div>
          ) : (
            <Field label="Mật khẩu" icon={<LockKeyhole className="h-4 w-4" />}>
              <input required type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={72} value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} placeholder="Tối thiểu 8 ký tự" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
            </Field>
          )}

          {mode === "login" ? (
            <div className="flex items-center justify-between text-xs font-bold">
              {showPinEntry ? (
                <button type="button" onClick={() => changeLoginMethod("password")} className="text-muted underline underline-offset-2 hover:text-ink">
                  Đăng nhập bằng mật khẩu
                </button>
              ) : (
                <button type="button" onClick={() => changeLoginMethod("pin")} className="flex items-center gap-1.5 text-muted underline underline-offset-2 hover:text-ink">
                  <KeyRound className="h-3.5 w-3.5" /> Đăng nhập nhanh bằng mã PIN
                </button>
              )}
              {showPinEntry ? (
                <button type="button" onClick={() => changeLoginMethod("password")} className="text-muted underline underline-offset-2 hover:text-ink">
                  Quên mã khoá?
                </button>
              ) : null}
            </div>
          ) : null}

          {mode === "register" ? (
            <>
              <Field label="Xác nhận mật khẩu" icon={<LockKeyhole className="h-4 w-4" />}>
                <input required type="password" autoComplete="new-password" minLength={8} maxLength={72} value={form.confirmPassword} onChange={event => setForm({ ...form, confirmPassword: event.target.value })} placeholder="Nhập lại mật khẩu" className="min-w-0 flex-1 bg-transparent py-3.5 font-semibold outline-none" />
              </Field>
              <label className="flex cursor-pointer items-start gap-3 border-y border-line py-4 text-xs font-semibold leading-5 text-muted">
                <input required type="checkbox" checked={form.consentAccepted} onChange={event => setForm({ ...form, consentAccepted: event.target.checked })} className="mt-0.5 h-4 w-4 accent-black" />
                <span>Đồng ý để AMY Digital lưu họ tên, email và số điện thoại nhằm quản lý tài khoản và thông báo khi mở booking.</span>
              </label>
            </>
          ) : null}

          <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-4 py-4 text-xs font-black uppercase tracking-wider text-acid disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "login" ? <LogIn className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
            {mode === "login" ? "Đăng nhập" : "Đăng ký"} <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {error ? <p className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <a href="mailto:amydigital@gmail.com" className="mt-5 flex items-center justify-center gap-2 text-[11px] font-semibold text-muted underline underline-offset-2 hover:text-ink">
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

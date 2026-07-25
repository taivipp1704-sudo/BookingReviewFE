export default function AuthShell({ children }) {
  return (
    <main className="auth-shell relative w-full overflow-hidden bg-[#fbfbfa]">
      <div className="auth-shell__layout relative grid h-full w-full lg:grid-cols-2">
        <div className="auth-shell__art relative hidden overflow-hidden bg-[#101010] lg:block" aria-hidden="true">
          <img
            src="/assets/amy-login-reference@2x.png"
            alt=""
            className="auth-shell__artwork pointer-events-none absolute left-0 top-1/2 h-auto max-w-none -translate-y-1/2 select-none"
          />
        </div>
        <section className="auth-shell__panel flex h-full min-w-0 items-center justify-center overflow-y-auto bg-[#fbfbfa] px-5 py-6 sm:px-10 lg:px-[clamp(40px,5vw,96px)]">
          <div className="auth-shell__content w-full max-w-[525px]">{children}</div>
        </section>
      </div>
    </main>
  );
}

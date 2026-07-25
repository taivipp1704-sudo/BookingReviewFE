export default function AuthShell({ children }) {
  return (
    <main className="relative h-screen h-[100dvh] w-full overflow-hidden bg-[#fbfbfa]">
      <div className="relative grid h-full w-full lg:grid-cols-2">
        <div className="relative hidden overflow-hidden bg-[#101010] lg:block" aria-hidden="true">
          <img
            src="/assets/amy-login-reference@2x.png"
            alt=""
            className="pointer-events-none absolute left-0 top-1/2 h-auto w-[200%] max-w-none -translate-y-1/2 select-none"
          />
        </div>
        <section className="flex h-full min-w-0 items-center justify-center overflow-y-auto bg-[#fbfbfa] px-5 py-8 sm:px-10 lg:px-[clamp(40px,5vw,96px)]">
          <div className="w-full max-w-[525px]">{children}</div>
        </section>
      </div>
    </main>
  );
}

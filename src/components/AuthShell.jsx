export default function AuthShell({ children }) {
  return (
    <main className="relative h-screen h-[100dvh] w-full overflow-hidden bg-[#fbfbfa]">
      <img
        src="/assets/amy-login-reference@2x.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden h-full w-full select-none object-cover object-center lg:block"
      />

      <div className="relative grid h-full w-full lg:grid-cols-2">
        <div className="hidden lg:block" aria-hidden="true" />
        <section className="flex h-full min-w-0 items-center justify-center overflow-y-auto bg-[#fbfbfa] px-5 py-8 sm:px-10 lg:px-[clamp(40px,5vw,96px)]">
          <div className="w-full max-w-[525px]">{children}</div>
        </section>
      </div>
    </main>
  );
}

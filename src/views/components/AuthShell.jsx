import { Camera, Sparkles, Undo2 } from "lucide-react";

export default function AuthShell({ children }) {
  return (
    <main className="auth-shell relative w-full overflow-hidden bg-white">
      <div className="auth-shell__layout relative grid h-full w-full">
        <div className="auth-shell__art relative hidden overflow-hidden bg-[#101010] lg:block" aria-hidden="true">
          <img
            src="/assets/amy-login-optimized.jpg"
            alt=""
            decoding="async"
            fetchPriority="high"
            className="auth-shell__artwork pointer-events-none absolute left-0 top-1/2 h-auto max-w-none -translate-y-1/2 select-none"
          />
        </div>
        <section className="auth-shell__panel relative z-0 flex h-full min-w-0 items-center justify-center overflow-y-auto bg-white px-5 py-6 sm:px-10 lg:px-[clamp(40px,5vw,96px)]">
          <div className="auth-shell__companion pointer-events-none absolute right-6 top-3 z-10 hidden items-start text-[#A3A39E] sm:flex lg:right-10 lg:top-4" aria-hidden="true">
            <div className="relative min-w-[150px] -rotate-6 rounded-[50%] border-2 border-[#B9B9B4] px-6 py-2.5 text-center text-[15px] font-black leading-5">
              AMY luôn<br />đồng hành!
              <Undo2 className="absolute -bottom-9 right-1 h-10 w-10 -rotate-45 stroke-[1.7]" />
            </div>
            <Sparkles className="-ml-1 mt-0 h-6 w-6 text-acid" />
            <Camera className="-ml-1 mt-7 h-12 w-12 rotate-[14deg] stroke-[1.8]" />
          </div>
          <div className="auth-shell__content w-full max-w-[525px]">{children}</div>
        </section>
      </div>
    </main>
  );
}

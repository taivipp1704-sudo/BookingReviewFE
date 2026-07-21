import { Loader2, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_COUNT = 8;

export default function OnboardingFlow({ onComplete }) {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const iframeRef = useRef(null);
  const completionLock = useRef(false);
  const source = `/onboarding/AMY_Onboarding_Trang_${String(page).padStart(2, "0")}.html`;

  const complete = useCallback(async () => {
    if (completionLock.current) return;
    completionLock.current = true;
    setBusy(true);
    setError("");
    try {
      await onComplete();
    } catch (nextError) {
      completionLock.current = false;
      setError(nextError?.message || "Không thể hoàn tất hướng dẫn. Vui lòng thử lại.");
    } finally {
      setBusy(false);
    }
  }, [onComplete]);

  useEffect(() => {
    function receiveMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "amy-onboarding-complete") complete();
    }
    window.addEventListener("message", receiveMessage);
    return () => window.removeEventListener("message", receiveMessage);
  }, [complete]);

  function bindPageControls() {
    const doc = iframeRef.current?.contentDocument;
    if (!doc) return;
    const next = doc.getElementById(page === 1 || page === 8 ? "startBtn" : "nextBtn");
    const back = doc.getElementById("backBtn");
    const backLink = doc.querySelector("a.back");
    const goNext = () => page === PAGE_COUNT ? complete() : setPage((value) => Math.min(PAGE_COUNT, value + 1));
    const goBack = (event) => { event?.preventDefault(); setPage((value) => Math.max(1, value - 1)); };
    next?.addEventListener("click", goNext);
    back?.addEventListener("click", goBack);
    backLink?.addEventListener("click", goBack);
  }

  return (
    <div className="fixed inset-0 z-[100] bg-[#ECEDEA]">
      <header className="flex h-14 items-center justify-between border-b border-line bg-white px-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">Hướng dẫn khách hàng</p>
          <p className="mt-0.5 text-sm font-black">Bước {page} / {PAGE_COUNT}</p>
        </div>
        <div className="mx-4 hidden h-1.5 max-w-md flex-1 overflow-hidden rounded-full bg-line sm:block">
          <span className="block h-full bg-ink transition-[width]" style={{ width: `${page / PAGE_COUNT * 100}%` }} />
        </div>
        <button type="button" disabled title="Hoàn tất hướng dẫn để đóng" className="grid h-9 w-9 place-items-center rounded-full border border-line text-muted opacity-40"><X className="h-4 w-4" /></button>
      </header>
      <iframe ref={iframeRef} key={source} src={source} onLoad={bindPageControls} title={`Onboarding bước ${page}`} className="h-[calc(100vh-56px)] w-full border-0 bg-white" />
      {error ? <div role="alert" className="absolute bottom-20 left-1/2 w-[min(92vw,560px)] -translate-x-1/2 rounded-lg border border-red-200 bg-white p-4 text-center text-sm font-bold text-red-700 shadow-2xl">{error}</div> : null}
      {busy ? <div className="absolute inset-0 grid place-items-center bg-white/80"><div className="flex items-center gap-3 rounded-lg bg-ink px-5 py-4 text-sm font-black text-acid"><Loader2 className="h-5 w-5 animate-spin" /> Đang hoàn tất hướng dẫn</div></div> : null}
    </div>
  );
}

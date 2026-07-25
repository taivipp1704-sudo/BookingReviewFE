import { Loader2 } from "lucide-react";
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
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;
    doc.querySelector(".topbar")?.remove();
    const root = doc.documentElement;
    root.style.zoom = "";
    root.style.width = "";
    doc.body.style.paddingBlock = frame.clientWidth > 640 ? "18px" : "8px";
    if (frame.clientWidth > 640) {
      const naturalHeight = Math.max(root.scrollHeight, doc.body?.scrollHeight || 0);
      const zoom = Math.max(0.68, Math.min(1, (frame.clientHeight - 4) / naturalHeight));
      root.style.zoom = String(zoom);
    }
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
      <div className="onboarding-viewport h-[100dvh] overflow-hidden">
        <iframe ref={iframeRef} key={source} src={source} onLoad={bindPageControls} title={`Onboarding bước ${page}`} className="onboarding-frame border-0 bg-white" />
      </div>
      {error ? <div role="alert" className="absolute bottom-20 left-1/2 w-[min(92vw,560px)] -translate-x-1/2 rounded-lg border border-red-200 bg-white p-4 text-center text-sm font-bold text-red-700 shadow-2xl">{error}</div> : null}
      {busy ? <div className="absolute inset-0 grid place-items-center bg-white/80"><div className="flex items-center gap-3 rounded-lg bg-ink px-5 py-4 text-sm font-black text-acid"><Loader2 className="h-5 w-5 animate-spin" /> Đang hoàn tất hướng dẫn</div></div> : null}
    </div>
  );
}

import { Loader2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const PAGE_COUNT = 8;

export default function OnboardingFlow({ onComplete }) {
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const iframeRef = useRef(null);
  const completionLock = useRef(false);
  const fitCleanupRef = useRef(() => {});
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

  const fitPageToViewport = useCallback(() => {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;

    const root = doc.documentElement;
    const body = doc.body;
    const desktop = frame.clientWidth > 640;
    root.style.zoom = "";
    root.style.width = "";
    root.style.overflowX = "hidden";
    body.style.overflowX = "hidden";
    body.style.paddingBlock = desktop ? "12px" : "8px";

    if (!desktop) return;

    const naturalWidth = Math.max(root.scrollWidth, body.scrollWidth);
    const naturalHeight = Math.max(root.scrollHeight, body.scrollHeight);
    const availableWidth = Math.max(1, frame.clientWidth - 4);
    const availableHeight = Math.max(1, frame.clientHeight - 4);
    const zoom = Math.max(0.56, Math.min(1, availableWidth / naturalWidth, availableHeight / naturalHeight));
    root.style.zoom = String(zoom);
    root.style.width = `${100 / zoom}%`;
  }, []);

  useEffect(() => {
    function receiveMessage(event) {
      if (event.origin !== window.location.origin) return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type === "amy-onboarding-complete") complete();
    }
    function handleResize() {
      window.requestAnimationFrame(fitPageToViewport);
    }
    window.addEventListener("message", receiveMessage);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("message", receiveMessage);
      window.removeEventListener("resize", handleResize);
      fitCleanupRef.current();
    };
  }, [complete, fitPageToViewport]);

  function bindPageControls() {
    const frame = iframeRef.current;
    const doc = frame?.contentDocument;
    if (!doc) return;
    fitCleanupRef.current();
    doc.querySelector(".topbar")?.remove();
    const scheduleFit = () => window.requestAnimationFrame(() => {
      fitPageToViewport();
      window.requestAnimationFrame(fitPageToViewport);
    });
    scheduleFit();

    let cancelled = false;
    doc.fonts?.ready.then(() => { if (!cancelled) scheduleFit(); });
    const pendingImages = [...doc.images].filter((image) => !image.complete);
    pendingImages.forEach((image) => image.addEventListener("load", scheduleFit, { once: true }));
    fitCleanupRef.current = () => {
      cancelled = true;
      pendingImages.forEach((image) => image.removeEventListener("load", scheduleFit));
    };
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

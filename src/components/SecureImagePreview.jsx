import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export default function SecureImagePreview({ preview, onClose }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!preview) return undefined;
    setLoaded(false);
    setFailed(false);
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [preview, onClose]);

  if (!preview) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={preview.title}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border border-white/20 bg-[#111] shadow-2xl">
        <header className="flex items-center justify-between gap-3 border-b border-white/15 px-4 py-3 text-white">
          <div>
            <p className="text-[10px] font-black uppercase text-acid">Ảnh bảo mật</p>
            <h2 className="mt-1 text-sm font-black">{preview.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/20 hover:bg-white/10"
            aria-label="Đóng ảnh"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="relative grid min-h-64 flex-1 place-items-center overflow-auto bg-black p-3 sm:p-5">
          {!loaded && !failed ? (
            <Loader2 className="absolute h-7 w-7 animate-spin text-acid" />
          ) : null}
          {failed ? (
            <p className="max-w-md text-center text-sm font-bold text-red-300">
              Không thể hiển thị ảnh. Vui lòng đóng và thử mở lại.
            </p>
          ) : (
            <img
              src={preview.url}
              alt={preview.title}
              className={`max-h-[78vh] max-w-full object-contain ${loaded ? "block" : "invisible"}`}
              onLoad={() => setLoaded(true)}
              onError={() => setFailed(true)}
            />
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

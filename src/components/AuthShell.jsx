import { useEffect, useState } from "react";

const DESIGN_WIDTH = 1824;
const DESIGN_HEIGHT = 862;
const FORM_LEFT = 1148;
const FORM_TOP = 105;
const FORM_WIDTH = 525;
const FRAME_MAX_WIDTH = 1600;
const FRAME_MAX_HEIGHT = 900;

function readViewport() {
  if (typeof window === "undefined") {
    return { desktop: true, scale: 1, offsetX: 0, offsetY: 0 };
  }

  const padding = window.innerWidth >= 1440 ? 36 : 24;
  const availableWidth = Math.max(
    1,
    Math.min(FRAME_MAX_WIDTH, window.innerWidth - padding * 2),
  );
  const availableHeight = Math.max(
    1,
    Math.min(FRAME_MAX_HEIGHT, window.innerHeight - padding * 2),
  );
  const scale = Math.min(
    1,
    availableWidth / DESIGN_WIDTH,
    availableHeight / DESIGN_HEIGHT,
  );
  return {
    desktop: window.innerWidth >= 1024,
    scale,
    offsetX: Math.max(0, (window.innerWidth - DESIGN_WIDTH * scale) / 2),
    offsetY: Math.max(0, (window.innerHeight - DESIGN_HEIGHT * scale) / 2),
  };
}

export default function AuthShell({ children }) {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    function updateViewport() {
      setViewport(readViewport());
    }

    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  if (!viewport.desktop) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fbfbfa] px-5 py-8 sm:px-10 sm:py-12">
        <div className="w-full max-w-[525px]">{children}</div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#fbfbfa]">
      <div
        className="absolute overflow-hidden rounded-lg bg-[#fbfbfa] shadow-[0_18px_60px_rgba(17,17,17,.12)]"
        style={{
          left: viewport.offsetX,
          top: viewport.offsetY,
          width: DESIGN_WIDTH,
          height: DESIGN_HEIGHT,
          transform: `scale(${viewport.scale})`,
          transformOrigin: "top left",
        }}
      >
        <img
          src="/assets/amy-login-reference@2x.png"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-fill"
        />

        <div
          className="absolute z-10"
          style={{ left: FORM_LEFT, top: FORM_TOP, width: FORM_WIDTH }}
        >
          {children}
        </div>
      </div>
    </main>
  );
}

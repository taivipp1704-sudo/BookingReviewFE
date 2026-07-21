import { useEffect, useState } from "react";

const DESIGN_WIDTH = 1824;
const DESIGN_HEIGHT = 862;
const FORM_LEFT = 1148;
const FORM_TOP = 105;
const FORM_WIDTH = 525;

function readViewport() {
  if (typeof window === "undefined") {
    return { desktop: true, scale: 1, offsetX: 0, offsetY: 0 };
  }

  const scale = Math.min(window.innerWidth / DESIGN_WIDTH, window.innerHeight / DESIGN_HEIGHT);
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
      <main className="flex min-h-screen items-start justify-center bg-[#fbfbfa] px-5 py-8 sm:px-10 sm:py-12">
        <div className="w-full max-w-[525px]">{children}</div>
      </main>
    );
  }

  return (
    <main className="relative h-screen w-full overflow-hidden bg-[#fbfbfa]">
      <div
        className="absolute overflow-hidden bg-[#fbfbfa]"
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

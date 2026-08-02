export const AMY_LOGO_URL = "/assets/amy-digital-brand.png";
export const AMY_MASCOT_CUTOUT_URL = "/assets/amy-mascot-cutout.png";

export default function BrandMark({
  compact = false,
  inverted = false,
  bare = false,
  showSubtitle = true,
  className = "",
}) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <span className={`relative grid shrink-0 place-items-center overflow-hidden ${bare ? "rounded-full bg-transparent" : "rounded-lg"} ${compact ? "h-10 w-10" : "h-11 w-11"} ${bare ? "" : inverted ? "bg-white/10" : "bg-ink"}`}>
        <img
          src={bare ? AMY_MASCOT_CUTOUT_URL : AMY_LOGO_URL}
          alt="Logo AMY Digital"
          className={`h-full w-full object-cover object-top ${bare ? "rounded-full" : ""}`}
        />
      </span>
      <span className="min-w-0 text-left">
        <span className={`block truncate font-black leading-none ${compact ? "text-sm" : "text-base"}`}>
          AMY DIGITAL
        </span>
        {showSubtitle ? (
          <span className={`mt-1 block truncate text-[9px] font-bold uppercase tracking-[0.18em] ${inverted ? "text-white/55" : "text-muted"}`}>
            AMY Booking
          </span>
        ) : null}
      </span>
    </span>
  );
}

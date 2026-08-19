export const AMY_LOGO_URL = "/assets/amy-digital-brand.png";
export const AMY_MASCOT_CUTOUT_URL = "/assets/amy-mascot-cutout.png";
export const AMY_HEADER_LOCKUP_URL = "/assets/amy-header-lockup.png";

export default function BrandMark({
  compact = false,
  inverted = false,
  bare = false,
  showSubtitle = true,
  className = "",
}) {
  if (bare) {
    return (
      <span className={`inline-flex min-w-0 items-center ${className}`}>
        <img
          src={AMY_HEADER_LOCKUP_URL}
          alt="AMY Digital"
          className="amy-header-lockup h-auto w-full object-contain object-left"
        />
      </span>
    );
  }

  return (
    <span className={`inline-flex min-w-0 items-center gap-2.5 ${className}`}>
      <span className={`relative grid shrink-0 place-items-center overflow-hidden rounded-lg ${compact ? "h-11 w-11" : "h-12 w-12"} ${inverted ? "bg-white/10" : "bg-ink"}`}>
        <img
          src={AMY_LOGO_URL}
          alt="Logo AMY Digital"
          className="h-full w-full object-cover object-top"
        />
      </span>
      <span className="min-w-0 text-left">
        <span className={`block truncate font-black leading-tight ${compact ? "text-sm" : "text-base"}`}>
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

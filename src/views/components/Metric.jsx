export default function Metric({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {hint ? <p className="mt-1 text-[11px] font-semibold text-muted">{hint}</p> : null}
    </div>
  );
}

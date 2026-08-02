import { Check, Clock3, PackageCheck, RotateCcw, Video } from 'lucide-react';

const steps = [
  { state: 'PENDING_REVIEW', label: 'Chờ xác nhận', icon: Clock3 },
  { state: 'CONFIRMED', label: 'Đã xác nhận', icon: PackageCheck },
  { state: 'READY_FOR_PICKUP', label: 'Sẵn sàng giao', icon: PackageCheck },
  { state: 'IN_USE', label: 'Đã nhận thiết bị', icon: Video },
  { state: 'COMPLETED', label: 'Đã hoàn thành', icon: RotateCcw }
];

export default function BookingJourney({ state, compact = false }) {
  if (state === 'REJECTED' || state === 'INCIDENT') return <div className={`rounded-lg border p-3 text-xs font-black ${state === 'REJECTED' ? 'border-red-200 bg-red-50 text-red-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>{state === 'REJECTED' ? 'Đơn đã bị từ chối' : 'Đơn đang được xử lý sự cố'}</div>;
  const normalized = ['TEMP_HOLD', 'NEGOTIATION', 'CONDITIONAL'].includes(state) ? 'PENDING_REVIEW' : state;
  const current = Math.max(0, steps.findIndex((step) => step.state === normalized));
  return <div className={`grid grid-cols-5 ${compact ? 'gap-1' : 'gap-2'}`}>{steps.map((step, index) => { const Icon = step.icon; const done = index <= current; return <div key={step.state} className="relative text-center"><div className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full border ${done ? 'border-ink bg-ink text-acid' : 'border-line bg-paper text-muted'}`}>{index < current ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}</div>{index < steps.length - 1 ? <span className={`absolute left-[calc(50%+18px)] right-[calc(-50%+18px)] top-4 h-px ${index < current ? 'bg-ink' : 'bg-line'}`} /> : null}<p className={`mt-2 text-[9px] font-black leading-tight ${done ? 'text-ink' : 'text-muted'}`}>{step.label}</p></div>; })}</div>;
}

const tone = {
  PENDING_REVIEW: 'bg-purple-50 text-purple-700 border-purple-100',
  NEGOTIATION: 'bg-amber-50 text-amber-800 border-amber-200',
  CONDITIONAL: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  TEMP_HOLD: 'bg-orange-50 text-orange-700 border-orange-100',
  CONFIRMED: 'bg-blue-50 text-blue-700 border-blue-100',
  READY_FOR_PICKUP: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  IN_USE: 'bg-green-50 text-green-700 border-green-100',
  INCIDENT: 'bg-red-50 text-red-700 border-red-100',
  COMPLETED: 'bg-zinc-50 text-zinc-700 border-zinc-200',
  REJECTED: 'bg-rose-50 text-rose-700 border-rose-100'
};

export const bookingStateLabels = {
  ALL: 'Tất cả',
  PENDING_REVIEW: 'Preview · Chờ duyệt',
  NEGOTIATION: 'Đang thương lượng',
  CONDITIONAL: 'Duyệt có điều kiện',
  TEMP_HOLD: 'Giữ chỗ tạm thời',
  CONFIRMED: 'Đã xác nhận',
  READY_FOR_PICKUP: 'Sẵn sàng giao máy',
  IN_USE: 'Đang thuê',
  INCIDENT: 'Đang xử lý sự cố',
  COMPLETED: 'Đã hoàn tất',
  REJECTED: 'Đã từ chối',
};

export default function StatusBadge({ state }) {
  return (
    <span className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${tone[state] || 'border-line bg-white text-muted'}`}>
      {bookingStateLabels[state] || state?.replaceAll('_', ' ') || 'Không xác định'}
    </span>
  );
}

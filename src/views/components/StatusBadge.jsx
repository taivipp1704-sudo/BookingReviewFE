import { bookingStateTone } from "../../models/bookingState.js";

export { bookingStateTone } from "../../models/bookingState.js";

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
    <span className={`rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${bookingStateTone(state)}`}>
      {bookingStateLabels[state] || state?.replaceAll('_', ' ') || 'Không xác định'}
    </span>
  );
}

import { Clock3, Mail, MapPin, Phone } from 'lucide-react';
import BrandMark from './BrandMark.jsx';

export default function PublicFooter({ onNavigate, bookingEnabled = false }) {
  return (
    <footer className="border-t border-white/10 bg-ink text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.25fr_0.75fr_1fr_1fr]">
        <div>
          <button type="button" onClick={() => onNavigate('/')} className="flex items-center gap-3 text-left">
            <BrandMark inverted />
          </button>
          <p className="mt-5 max-w-sm text-sm font-semibold leading-6 text-white/60">Dịch vụ cho thuê máy ảnh, máy quay và phụ kiện sáng tạo dành cho cá nhân, đội ngũ sản xuất và doanh nghiệp.</p>
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-acid">Liên kết</h2>
          <div className="mt-5 flex flex-col items-start gap-3 text-sm font-bold text-white/70"><button onClick={() => onNavigate('/gear')} className="hover:text-white">Xem thiết bị</button><button onClick={() => onNavigate('/calendar')} className="hover:text-white">Lịch thiết bị</button>{bookingEnabled ? <><button onClick={() => onNavigate('/cart')} className="hover:text-white">Giỏ hàng</button><button onClick={() => onNavigate('/account')} className="hover:text-white">Tra cứu đơn thuê</button></> : null}<a href="/#cooperate" className="hover:text-white">Hợp tác</a></div>
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-acid">Liên hệ</h2>
          <div className="mt-5 space-y-4 text-sm font-semibold text-white/70"><a href="tel:+84901234567" className="flex items-start gap-3 hover:text-white"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-acid" />090 123 4567</a><a href="mailto:contact@amydigital.vn" className="flex items-start gap-3 break-all hover:text-white"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-acid" />contact@amydigital.vn</a><p className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-acid" />TP. Hồ Chí Minh, Việt Nam</p></div>
        </div>
        <div>
          <h2 className="text-xs font-black uppercase tracking-widest text-acid">Giờ làm việc</h2>
          <div className="mt-5 flex items-start gap-3 text-sm font-semibold leading-6 text-white/70"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-acid" /><p>Thứ Hai - Thứ Bảy<br />08:00 - 20:00<br /><span className="text-white/45">Chủ Nhật: 09:00 - 17:00</span></p></div>
        </div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-[11px] font-semibold text-white/45 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p>© {new Date().getFullYear()} AMY DIGITAL. All rights reserved.</p><p>Điều khoản thuê · Chính sách bảo mật · Quy định đặt cọc</p></div></div>
    </footer>
  );
}

import { ArrowUpRight, Camera, ShoppingBag } from 'lucide-react';

export default function ProductCard({ product, onSelect }) {
  return (
    <article className="group overflow-hidden rounded-lg border border-line bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-soft">
      <button type="button" onClick={() => onSelect(product)} className="block w-full text-left" aria-label={`Xem chi tiết ${product.name}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-paper">
          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0" />
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[10px] font-black uppercase tracking-wider">{product.category}</span>
        </div>
        <div className="p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-black uppercase tracking-widest text-muted">{product.brand}</p><h3 className="mt-1 text-base font-black leading-tight">{product.name}</h3></div>
            <Camera className="h-5 w-5 shrink-0 text-muted" />
          </div>
          <p className="min-h-5 text-xs font-semibold text-muted">{product.specs}</p>
          <p className={`mt-2 text-xs font-black ${product.availableQty > 0 ? 'text-green-700' : 'text-red-700'}`}>{product.availableQty > 0 ? `Còn ${product.availableQty} thiết bị` : 'Tạm hết hàng'}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-muted">
            <ShoppingBag className="h-3.5 w-3.5" />
            Đã có {Number(product.bookingCount || 0).toLocaleString('vi-VN')} lượt đặt
          </p>
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
            <span className="text-[11px] font-black uppercase tracking-wider">Xem chi tiết và đặt thuê</span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-acid transition group-hover:bg-acid group-hover:text-ink"><ArrowUpRight className="h-4 w-4" /></span>
          </div>
        </div>
      </button>
    </article>
  );
}

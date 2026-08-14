import {
  ArrowLeft,
  ExternalLink,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../../services/api.js";
import { catalogImageUrl, money, rentalRates } from "../../utils/format.js";

function parseDetails(value) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

export default function ProductDetailsPage({
  productId,
  onBack,
  onBook,
  onAddToCart,
  onViewProduct,
  bookingEnabled = false,
}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    Promise.all([api.products(), api.availability()])
      .then(([catalog, availability]) => {
        const stock = Object.fromEntries(
          availability.map((item) => [item.productId, item]),
        );
        setProducts(
          catalog.map((item) => ({
            ...item,
            ...(stock[item.id] || { totalQty: 0, availableQty: 0 }),
          })),
        );
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [productId]);

  const product = products.find((item) => item.id === productId);
  const details = useMemo(
    () => parseDetails(product?.customAttributes),
    [product],
  );
  const configuredAccessories = details.compatibleAccessories || [];
  const compatible = products
    .filter(
      (item) =>
        item.levelCode !== "L1" &&
        (configuredAccessories.includes(item.id) ||
          (configuredAccessories.length === 0 && item.availableQty > 0)),
    )
    .slice(0, 6);
  const alternatives = products
    .filter(
      (item) =>
        item.id !== productId &&
        item.levelCode === "L1" &&
        (item.category === product?.category || item.brand === product?.brand),
    )
    .sort((a, b) => b.availableQty - a.availableQty)
    .slice(0, 4);
  const rows = product
    ? [
        ["Thương hiệu", product.brand],
        ["Phân loại", product.category],
        ["Mã sản phẩm", product.id],
        ["Cấp thiết bị", product.levelCode],
        ["Cách theo dõi tồn kho", product.trackingMode],
        ["Thông số chính", product.specs],
      ]
    : [];

  if (loading)
    return (
      <main className="grid min-h-screen place-items-center pt-24 text-sm font-bold text-muted">
        Đang tải sản phẩm...
      </main>
    );
  if (!product)
    return (
      <main className="grid min-h-screen place-items-center px-4 pt-24">
        <div className="rounded-lg bg-white p-8 text-center shadow-soft">
          <p className="font-bold text-red-700">
            {error || "Không tìm thấy sản phẩm."}
          </p>
          <button onClick={onBack} className="mt-4 font-black underline">
            Về danh sách
          </button>
        </div>
      </main>
    );

  function addCart() {
    onAddToCart(product, quantity);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }
  return (
    <main className="pt-24">
      <div className="mx-auto max-w-7xl px-4 pb-16">
        <button
          onClick={onBack}
          className="mb-5 flex items-center gap-2 text-xs font-black uppercase text-muted hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Danh sách thiết bị
        </button>
        <section className="grid gap-8 rounded-lg border border-line bg-white p-5 shadow-soft lg:grid-cols-[1.1fr_0.9fr] lg:p-8">
          <div className="overflow-hidden rounded-lg bg-paper">
            <img
              src={catalogImageUrl(details.detailImageUrl ? { ...product, imageUrl: details.detailImageUrl } : product)}
              alt={product.name}
              className="aspect-[4/3] h-full w-full object-contain p-4"
            />
          </div>
          <div className="flex flex-col">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted">
              {product.brand} · {product.category}
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-muted">
              {details.description || product.specs}
            </p>
            <p
              className={`mt-5 text-sm font-black ${product.availableQty ? "text-green-700" : "text-red-700"}`}
            >
              {product.availableQty
                ? `Còn ${product.availableQty} thiết bị sẵn sàng`
                : "Tạm hết hàng"}
            </p>
            <p className="mt-2 flex items-center gap-2 text-sm font-bold text-muted">
              <ShoppingBag className="h-4 w-4" />
              Đã có {Number(product.bookingCount || 0).toLocaleString("vi-VN")} lượt đặt thiết bị này
            </p>
            <div className="mt-5 rounded-lg bg-paper p-5">
              <p className="text-[10px] font-black uppercase text-muted">
                Bảng giá thuê
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {rentalRates(product).map((rate) => (
                  <div key={rate.key} className="border-l-2 border-ink pl-3">
                    <p className="text-[10px] font-black uppercase text-muted">{rate.label}</p>
                    <p className="mt-1 text-lg font-black">{money(rate.value)}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-5 flex items-center justify-between border-y border-line py-4">
              <div>
                <p className="text-xs font-black">Số lượng</p>
                <p className="text-[11px] font-semibold text-muted">
                  Tối đa {Math.min(10, product.availableQty)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line disabled:opacity-30"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <strong>{quantity}</strong>
                <button
                  onClick={() =>
                    setQuantity((q) =>
                      Math.min(product.availableQty, 10, q + 1),
                    )
                  }
                  disabled={
                    !product.availableQty ||
                    quantity >= Math.min(10, product.availableQty)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-acid disabled:bg-line disabled:text-muted"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
            {bookingEnabled ? <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                onClick={() => onBook(product)}
                disabled={!product.availableQty}
                className="rounded-lg bg-ink px-5 py-4 text-xs font-black uppercase tracking-wider text-acid disabled:bg-line disabled:text-muted"
              >
                Đặt thuê ngay
              </button>
              <button
                onClick={addCart}
                disabled={!product.availableQty}
                className="flex items-center justify-center gap-2 rounded-lg border-2 border-ink px-5 py-4 text-xs font-black uppercase tracking-wider disabled:border-line disabled:text-muted"
              >
                <ShoppingCart className="h-4 w-4" />
                {added ? "Đã thêm vào giỏ" : "Thêm vào giỏ"}
              </button>
            </div> : <div className="mt-5 rounded-lg border border-line bg-paper p-4 text-sm font-bold text-muted">Booking chưa mở. Bạn có thể xem thông tin, tồn kho và lịch thiết bị trong giai đoạn đăng ký sớm.</div>}
          </div>
        </section>
        {compatible.length ? (
          <section className="mt-8">
            <h2 className="text-2xl font-black">Phụ kiện tương thích</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {compatible.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewProduct(item)}
                  disabled={!item.availableQty}
                  className="flex items-center gap-4 rounded-lg border border-line bg-white p-3 text-left disabled:opacity-50"
                >
                  <img
                    src={catalogImageUrl(item)}
                    alt=""
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black">{item.name}</p>
                    <p className="mt-1 text-xs font-bold text-muted">
                      {money(item.dailyPrice)}/ngày · Còn {item.availableQty}
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase">
                      Xem chi tiết
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {alternatives.length ? (
          <section className="mt-8">
            <h2 className="text-2xl font-black">
              {product.availableQty
                ? "Thiết bị tương tự"
                : "Thiết bị thay thế còn hàng"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {alternatives.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewProduct(item)}
                  className="rounded-lg border border-line bg-white p-3 text-left hover:border-ink"
                >
                  <img
                    src={catalogImageUrl(item)}
                    alt=""
                    className="aspect-[4/3] w-full rounded-lg object-cover"
                  />
                  <p className="mt-3 truncate text-sm font-black">
                    {item.name}
                  </p>
                  <p
                    className={`mt-1 text-xs font-bold ${item.availableQty ? "text-green-700" : "text-red-700"}`}
                  >
                    {item.availableQty
                      ? `Còn ${item.availableQty} thiết bị`
                      : "Tạm hết hàng"}
                  </p>
                  <p className="mt-2 font-black">
                    {money(item.dailyPrice)}/ngày
                  </p>
                </button>
              ))}
            </div>
          </section>
        ) : null}
        <section className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="rounded-lg border border-line bg-white p-6">
            <h2 className="text-2xl font-black">Thông số kỹ thuật</h2>
            <dl className="mt-5 divide-y divide-line border-y border-line">
              {rows.map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[120px_1fr] gap-4 py-4 text-sm"
                >
                  <dt className="font-bold text-muted">{label}</dt>
                  <dd className="font-semibold">{value || "-"}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="space-y-6">
            <Info
              title="Mô tả chi tiết"
              text={details.description || product.specs}
            />
            <Info
              title="Hướng dẫn sử dụng"
              text={
                details.usageGuide ||
                "Kiểm tra nguồn điện, tình trạng và phụ kiện trước khi sử dụng."
              }
            />
            <Info
              title="Hướng dẫn kết nối"
              text={
                details.connectionGuide ||
                "Đối chiếu đúng cổng và chuẩn kết nối của thiết bị."
              }
            />
            {details.sourceUrl ? (
              <a
                href={details.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-lg border border-line bg-white p-5 text-sm font-black hover:border-ink"
              >
                Tài liệu chính thức <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}

function Info({ title, text }) {
  return (
    <article className="rounded-lg border border-line bg-white p-6">
      <h2 className="text-xl font-black">{title}</h2>
      <p className="mt-3 whitespace-pre-line text-sm font-semibold leading-7 text-muted">
        {text}
      </p>
    </article>
  );
}

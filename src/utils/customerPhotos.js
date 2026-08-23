// Customer-submitted photos of equipment in real use, shown as feedback on
// each product's detail page. Files live as static assets under
// public/catalog/customer-photos/<slug>/01.jpg, 02.jpg, ... so no backend
// call is needed to list them.
export const CUSTOMER_PHOTO_COUNTS = {
  "fuji-xa5": 9,
  "fuji-xm5": 18,
  "canon-g7x-m2": 23,
  "canon-ixy-600f": 16,
  "canon-ixy-650": 17,
  "canon-m10": 21,
  "canon-m100": 22,
  "canon-m200": 5,
  "canon-m50": 15,
  "canon-m6": 2,
  "pocket-3": 6,
  "canon-r50": 16,
};

function slugifyProductName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function customerPhotoSlug(product) {
  const slug = slugifyProductName(product?.name);
  return CUSTOMER_PHOTO_COUNTS[slug] ? slug : "";
}

export function customerPhotosForProduct(product) {
  const slug = customerPhotoSlug(product);
  const count = slug ? CUSTOMER_PHOTO_COUNTS[slug] : 0;
  if (!count) return [];
  return Array.from({ length: count }, (_, index) => ({
    thumb: `/catalog/customer-photos/${slug}/${String(index + 1).padStart(2, "0")}.jpg`,
    full: `/catalog/customer-photos/${slug}/${String(index + 1).padStart(2, "0")}.jpg`,
  }));
}

const PRIMARY_CATEGORY_PATTERN = /máy ảnh|máy quay|camera|compact|gimbal/i;

export function bookingItemDetails(line, products = {}) {
  const product = products[line?.productId] || {};
  return {
    ...line,
    productName: line?.productName || product.name || line?.productId || "Thiết bị",
    levelCode: line?.levelCode || product.levelCode || "",
    category: line?.category || product.category || "",
  };
}

export function groupBookingItems(items = [], products = {}) {
  const normalized = items.map((line) => bookingItemDetails(line, products));
  const equipment = normalized.filter(
    (line) => line.levelCode === "L1" || (!line.levelCode && PRIMARY_CATEGORY_PATTERN.test(line.category)),
  );
  const equipmentIds = new Set(equipment.map((line) => line.productId));
  return {
    equipment,
    accessories: normalized.filter((line) => !equipmentIds.has(line.productId)),
  };
}

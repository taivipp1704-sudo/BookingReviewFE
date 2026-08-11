export function money(value) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

export function catalogImageUrl(item, field = 'imageUrl') {
  const source = String(item?.[field] || '').trim();
  if (!source || source.startsWith('data:') || source.startsWith('blob:')) return source;
  const revision = Math.max(1, Number(item?.mediaRevision || item?.currentVersion) || 1);
  return `${source}${source.includes('?') ? '&' : '?'}v=${revision}`;
}

export function shortDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
}

export function rentalRates(item) {
  const rates = [];
  if (Number(item?.hourlyPrice) > 0) {
    rates.push({ key: 'HOURLY', label: 'Theo giờ', value: item.hourlyPrice, suffix: '/giờ' });
  }
  if (Number(item?.halfDayPrice) > 0) {
    rates.push({ key: 'HALF_DAY', label: 'Nửa ngày', value: item.halfDayPrice, suffix: '/12 giờ' });
  }
  rates.push({ key: 'DAILY', label: '1 ngày', value: item?.dailyPrice, suffix: '/ngày' });
  if (Number(item?.twoDayPrice) > 0) {
    rates.push({ key: 'TWO_DAY', label: 'Gói 2 ngày', value: item.twoDayPrice, suffix: '/2 ngày' });
  }
  if (Number(item?.multiDayPrice) > 0) {
    const days = Math.max(2, Number(item?.multiDayDays) || 3);
    rates.push({ key: 'MULTI_DAY', label: `Gói ${days} ngày`, value: item.multiDayPrice, suffix: `/${days} ngày` });
  }
  if (Number(item?.extraDayPrice) > 0) {
    rates.push({ key: 'EXTRA_DAY', label: 'Ngày phát sinh', value: item.extraDayPrice, suffix: '/ngày từ ngày 4' });
  }
  return rates;
}

export function rentalDurationLabel(quote) {
  if (!quote) return '';
  return Number(quote.rentalMinutes) < 1440
    ? `${quote.rentalHours} giờ thuê`
    : `${quote.rentalDays} ngày thuê`;
}

export function pricingModeLabel(line) {
  if (!line) return '';
  if (line.pricingMode === 'HOURLY') return `${line.billableUnits} giờ`;
  if (line.pricingMode === 'HALF_DAY') return 'Nửa ngày';
  if (line.pricingMode === 'TWO_DAY') return 'Gói 2 ngày';
  if (line.pricingMode === 'MULTI_DAY') {
    return `Gói 3 ngày${line.extraDays ? ` + ${line.extraDays} ngày` : ''}`;
  }
  return `${line.billableUnits} ngày`;
}

// Production traffic stays same-origin so session and CSRF cookies survive the
// Vercel/Caddy reverse proxy. A custom API base is only useful for local dev.
const API_BASE = import.meta.env.DEV
  ? (import.meta.env.VITE_API_BASE_URL || '')
  : '';

let csrf = null;
let productsCache = null;
const PRODUCTS_CACHE_MS = 15_000;
// Render may need a little time to wake up after inactivity. Mutating
// requests never retry automatically; only read requests get one retry.
const REQUEST_TIMEOUT_MS = 30_000;

function requestTimeoutError() {
  return new Error('Máy chủ đang phản hồi chậm. Vui lòng thử lại sau ít phút.');
}

async function request(path, { method = 'GET', body, retryCsrf = true, retryTimeout = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) {
    const token = await getCsrf();
    headers['Content-Type'] = 'application/json';
    headers[token.headerName] = token.token;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      cache: 'no-store',
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      if (method === 'GET' && retryTimeout) {
        return request(path, { method, body, retryCsrf, retryTimeout: false });
      }
      throw requestTimeoutError();
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }

  if (response.status === 403 && body !== undefined && retryCsrf) {
    csrf = null;
    return request(path, { method, body, retryCsrf: false });
  }

  if (response.status === 204) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Yêu cầu thất bại (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return payload;
}

async function getCsrf() {
  if (csrf) return csrf;
  csrf = await request('/api/auth/csrf');
  return csrf;
}

async function refreshCsrf() {
  csrf = null;
  return getCsrf();
}

function invalidateProductsCache() {
  productsCache = null;
}

function products() {
  const now = Date.now();
  if (productsCache?.promise) return productsCache.promise;
  if (productsCache?.value && productsCache.expiresAt > now) {
    return Promise.resolve(productsCache.value);
  }

  const promise = request('/api/catalog/products')
    .then(value => {
      productsCache = { value, expiresAt: Date.now() + PRODUCTS_CACHE_MS };
      return value;
    })
    .catch(error => {
      productsCache = null;
      throw error;
    });
  productsCache = { promise, expiresAt: 0 };
  return promise;
}

function mutateProducts(path, options) {
  return request(path, options).then(value => {
    invalidateProductsCache();
    return value;
  });
}

async function customerRegister(payload) {
  await refreshCsrf();
  try {
    return await request('/api/customer/account/register', { method: 'POST', body: payload });
  } catch (error) {
    if (error.status !== 401) throw error;
    await refreshCsrf();
    return request('/api/customer/account/register', { method: 'POST', body: payload });
  }
}

async function uploadIdentity(front, back) {
  const token = await getCsrf();
  const body = new FormData();
  body.append('front', front);
  body.append('back', back);
  const response = await fetch(`${API_BASE}/api/customer/account/identity-documents`, { method: 'POST', credentials: 'include', headers: { [token.headerName]: token.token }, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Tải CCCD thất bại (${response.status}).`);
  return payload;
}

async function adminIdentityDocument(bookingId, side) {
  const response = await fetch(`${API_BASE}/api/admin/bookings/${encodeURIComponent(bookingId)}/identity/${encodeURIComponent(side)}`, {
    credentials: 'include',
    headers: { Accept: 'image/jpeg' }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Không thể mở ảnh CCCD (${response.status}).`);
  }
  return response.blob();
}

async function adminCustomerIdentityDocument(customerId, side) {
  const response = await fetch(`${API_BASE}/api/admin/customer-accounts/${encodeURIComponent(customerId)}/identity/${encodeURIComponent(side)}`, {
    credentials: 'include',
    headers: { Accept: 'image/jpeg,image/png' }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Không thể mở ảnh CCCD (${response.status}).`);
  }
  return response.blob();
}

async function uploadCatalogImage(file) {
  const token = await getCsrf();
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${API_BASE}/api/admin/media/catalog-images`, {
    method: 'POST',
    credentials: 'include',
    headers: { [token.headerName]: token.token },
    body
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Tải ảnh thất bại (${response.status}).`);
  return payload;
}

async function adminPaymentProof(bookingId) {
  const response = await fetch(`${API_BASE}/api/admin/bookings/${encodeURIComponent(bookingId)}/payment-proof`, {
    credentials: 'include',
    headers: { Accept: 'image/jpeg' }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Không thể mở ảnh chuyển khoản (${response.status}).`);
  }
  return response.blob();
}

async function customerIdentityDocument(bookingId, side) {
  const response = await fetch(`${API_BASE}/api/customer/account/bookings/${encodeURIComponent(bookingId)}/identity/${encodeURIComponent(side)}`, {
    credentials: 'include',
    headers: { Accept: 'image/jpeg,image/png' }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Không thể mở ảnh CCCD (${response.status}).`);
  }
  return response.blob();
}

async function customerPaymentProof(bookingId) {
  const response = await fetch(`${API_BASE}/api/customer/account/bookings/${encodeURIComponent(bookingId)}/payment-proof`, {
    credentials: 'include',
    headers: { Accept: 'image/jpeg,image/png' }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || `Không thể mở ảnh chuyển khoản (${response.status}).`);
  }
  return response.blob();
}

async function uploadPaymentProof(file) {
  const token = await getCsrf();
  const body = new FormData();
  body.append('file', file);
  const response = await fetch(`${API_BASE}/api/customer/account/payment-proof`, { method: 'POST', credentials: 'include', headers: { [token.headerName]: token.token }, body });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message || `Tải bằng chứng thanh toán thất bại (${response.status}).`);
  return payload;
}

export const api = {
  csrf: getCsrf,
  features: () => request('/api/features'),
  joinWaitlist: payload => request('/api/customer/waitlist', { method: 'POST', body: payload }),
  products,
  availability: () => request('/api/catalog/availability'),
  schedule: (productId, from, to) => request(`/api/catalog/${encodeURIComponent(productId)}/schedule?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  bundles: () => request('/api/catalog/bundles'),
  stores: () => request('/api/stores'),
  adminStores: () => request('/api/admin/stores'),
  createStore: payload => request('/api/admin/stores', { method: 'POST', body: payload }),
  updateStore: (id, payload) => request(`/api/admin/stores/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  deleteStore: id => request(`/api/admin/stores/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adminBundles: () => request('/api/admin/catalog/bundles'),
  bundleVersions: id => request(`/api/admin/catalog/bundles/${encodeURIComponent(id)}/versions`),
  createBundle: payload => request('/api/admin/catalog/bundles', { method: 'POST', body: payload }),
  updateBundle: (id, payload) => request(`/api/admin/catalog/bundles/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  updateBundleVisibility: (id, active) => request(`/api/admin/catalog/bundles/${encodeURIComponent(id)}/visibility?active=${active}`, { method: 'PATCH', body: {} }),
  deleteBundle: id => request(`/api/admin/catalog/bundles/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  adminPromotions: () => request('/api/admin/promotions'),
  createPromotion: payload => request('/api/admin/promotions', { method: 'POST', body: payload }),
  updatePromotion: (id, payload) => request(`/api/admin/promotions/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  deletePromotion: id => request(`/api/admin/promotions/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  quote: payload => request('/api/bookings/quote', { method: 'POST', body: payload }),
  holdBooking: payload => request('/api/bookings/hold', { method: 'POST', body: payload }),
  customerCheckoutHolds: () => request('/api/bookings/holds'),
  customerCheckoutHold: holdToken => request(`/api/bookings/holds/${encodeURIComponent(holdToken)}`),
  releaseBookingHold: payload => request('/api/bookings/hold/release', { method: 'POST', body: payload }),
  attachBookingHoldPaymentProof: payload => request('/api/bookings/hold/payment-proof', { method: 'POST', body: payload }),
  createBooking: payload => request('/api/bookings', { method: 'POST', body: payload }),
  uploadIdentity,
  uploadPaymentProof,
  trackBooking: payload => request('/api/bookings/track', { method: 'POST', body: payload }),
  requestOtp: payload => request('/api/otp/request', { method: 'POST', body: payload }),
  verifyOtp: payload => request('/api/otp/verify', { method: 'POST', body: payload }),
  login: payload => request('/api/auth/login', { method: 'POST', body: payload }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST', body: {} }),
  adminBookings: ({ query = '', state = 'ALL' } = {}) => request(`/api/admin/bookings?query=${encodeURIComponent(query)}&state=${encodeURIComponent(state)}`),
  bookingAudit: id => request(`/api/admin/bookings/${encodeURIComponent(id)}/audit`),
  bookingOperations: id => request(`/api/admin/bookings/${encodeURIComponent(id)}/operations`),
  autoAllocateBooking: id => request(`/api/admin/bookings/${encodeURIComponent(id)}/allocations/auto`, { method: 'POST', body: {} }),
  adminIdentityDocument,
  adminCustomerIdentityDocument,
  adminPaymentProof,
  uploadCatalogImage,
  changeBookingState: (id, state, reason) => request(`/api/admin/bookings/${encodeURIComponent(id)}/state`, { method: 'PATCH', body: { state, reason } }),
  adminProducts: () => request('/api/admin/catalog/products'),
  createProduct: payload => mutateProducts('/api/admin/catalog/products/with-inventory', { method: 'POST', body: payload }),
  updateProduct: (id, payload) => mutateProducts(`/api/admin/catalog/products/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  deleteProduct: id => mutateProducts(`/api/admin/catalog/products/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  assets: () => request('/api/inventory/assets'),
  stock: () => request('/api/inventory/stock'),
  createAsset: payload => request('/api/admin/inventory/assets', { method: 'POST', body: payload }),
  updateAssetStatus: (serialId, status) => request(`/api/admin/inventory/assets/${encodeURIComponent(serialId)}/status`, { method: 'PATCH', body: { status } }),
  deleteAsset: serialId => request(`/api/admin/inventory/assets/${encodeURIComponent(serialId)}`, { method: 'DELETE' }),
  updateStock: (productId, payload) => request(`/api/admin/inventory/stock/${encodeURIComponent(productId)}`, { method: 'PATCH', body: payload }),
  inventoryLedger: () => request('/api/admin/inventory/ledger'),
  financeEntries: () => request('/api/admin/finance/ledger'),
  financeSummary: () => request('/api/admin/finance/dashboard'),
  financeDocuments: () => request('/api/admin/finance/documents'),
  financeExpenses: () => request('/api/admin/finance/expenses'),
  submitExpense: payload => request('/api/admin/finance/expenses', { method: 'POST', body: payload }),
  approveExpense: id => request(`/api/admin/finance/expenses/${encodeURIComponent(id)}/approve`, { method: 'POST', body: {} }),
  payExpense: (id, payload) => request(`/api/admin/finance/expenses/${encodeURIComponent(id)}/pay`, { method: 'POST', body: payload }),
  reverseFinanceDocument: (id, payload) => request(`/api/admin/finance/documents/${encodeURIComponent(id)}/reverse`, { method: 'POST', body: payload }),
  financialPeriods: () => request('/api/admin/finance/periods'),
  updateFinancialPeriod: (id, state) => request(`/api/admin/finance/periods/${encodeURIComponent(id)}`, { method: 'PATCH', body: { state } }),
  assetProfitability: () => request('/api/admin/finance/asset-profitability'),
  bookingFinance: id => request(`/api/admin/finance/bookings/${encodeURIComponent(id)}`),
  recordPayment: payload => request('/api/admin/finance/payments', { method: 'POST', body: payload }),
  proposeBookingCharge: (id, payload) => request(`/api/admin/finance/bookings/${encodeURIComponent(id)}/charges`, { method: 'POST', body: payload }),
  reviewBookingCharge: (id, payload) => request(`/api/admin/finance/charges/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  calculateSettlement: id => request(`/api/admin/finance/bookings/${encodeURIComponent(id)}/settlement/calculate`, { method: 'POST', body: {} }),
  approveSettlement: (id, payload) => request(`/api/admin/finance/bookings/${encodeURIComponent(id)}/settlement/approve`, { method: 'POST', body: payload }),
  executeRefund: (id, payload) => request(`/api/admin/finance/refunds/${encodeURIComponent(id)}/execute`, { method: 'POST', body: payload }),
  closeSettlement: id => request(`/api/admin/finance/bookings/${encodeURIComponent(id)}/settlement/close`, { method: 'POST', body: {} }),
  reconcileBookingFinance: id => request(`/api/admin/finance/bookings/${encodeURIComponent(id)}/reconcile`, { method: 'POST', body: {} }),
  customerMe: () => request('/api/customer/account/me'),
  customerLogin: payload => request('/api/customer/account/login', { method: 'POST', body: payload }),
  customerRegister,
  changeCustomerPassword: payload => request('/api/customer/account/password/change', { method: 'POST', body: payload }),
  completeCustomerOnboarding: () => request('/api/customer/account/onboarding/complete', { method: 'POST', body: {} }),
  customerLogout: () => request('/api/customer/account/logout', { method: 'POST', body: {} }),
  customerBookings: () => request('/api/customer/account/bookings'),
  customerIdentityDocument,
  customerPaymentProof,
  reviewEarlyPickup: (id, payload) => request(`/api/admin/bookings/${encodeURIComponent(id)}/early-pickup`, { method: 'PATCH', body: payload })
  ,customerSupport: () => request('/api/customer/support'),
  createCustomerSupport: payload => request('/api/customer/support', { method: 'POST', body: payload }),
  adminSupport: () => request('/api/admin/support-requests'),
  reviewSupport: (id, payload) => request(`/api/admin/support-requests/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload })
  ,adminUsers: () => request('/api/admin/users'),
  createAdminUser: payload => request('/api/admin/users', { method: 'POST', body: payload }),
  updateAdminUser: (id, payload) => request(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload })
  ,adminCustomerAccounts: ({ query = '', page = 0, size = 50 } = {}) => request(`/api/admin/customer-accounts?query=${encodeURIComponent(query)}&page=${page}&size=${size}`),
  updateAdminCustomerAccount: (id, payload) => request(`/api/admin/customer-accounts/${encodeURIComponent(id)}`, { method: 'PATCH', body: payload }),
  resetAdminCustomerPassword: (id, payload) => request(`/api/admin/customer-accounts/${encodeURIComponent(id)}/password-reset`, { method: 'POST', body: payload }),
  resetAdminCustomerOnboarding: id => request(`/api/admin/customer-accounts/${encodeURIComponent(id)}/onboarding-reset`, { method: 'POST', body: {} })
};

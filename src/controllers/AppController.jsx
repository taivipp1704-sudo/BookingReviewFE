import { CalendarDays, FileSearch, Handshake, LogIn, LogOut, ShieldCheck, ShoppingCart, UserRound } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { api } from '../services/api.js';
import PublicFooter from '../views/components/PublicFooter.jsx';
import BrandMark from '../views/components/BrandMark.jsx';
import { needsCustomerOnboarding } from '../models/onboarding.js';

const AdminLoginPage = lazy(() => import('../views/pages/AdminLoginPage.jsx'));
const AdminPage = lazy(() => import('../views/pages/AdminPage.jsx'));
const BookingPage = lazy(() => import('../views/pages/BookingPage.jsx'));
const CustomerPage = lazy(() => import('../views/pages/CustomerPage.jsx'));
const CustomerAccountPage = lazy(() => import('../views/pages/CustomerAccountPage.jsx'));
const CustomerLoginPage = lazy(() => import('../views/pages/CustomerLoginPage.jsx'));
const CustomerPasswordChangePage = lazy(() => import('../views/pages/CustomerPasswordChangePage.jsx'));
const OnboardingFlow = lazy(() => import('../views/components/OnboardingFlow.jsx'));
const CartPage = lazy(() => import('../views/pages/CartPage.jsx'));
const ProductDetailsPage = lazy(() => import('../views/pages/ProductDetailsPage.jsx'));
const CustomerCalendarPage = lazy(() => import('../views/pages/CustomerCalendarPage.jsx'));

function currentPath() {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

const CUSTOMER_RETURN_KEY = 'amy-customer-return-to';

function validCustomerReturn(to) {
  if (typeof to !== 'string' || !to.startsWith('/') || to.startsWith('//')) return null;
  if (to === '/gear' || to === '/cart' || to === '/account' || to === '/calendar') return to;
  if (to.startsWith('/booking/') || to.startsWith('/products/')) return to;
  return null;
}

function rememberCustomerReturn(to) {
  const destination = validCustomerReturn(to);
  if (!destination) return;
  sessionStorage.setItem(CUSTOMER_RETURN_KEY, destination);
}

function readCustomerReturn() {
  return validCustomerReturn(sessionStorage.getItem(CUSTOMER_RETURN_KEY));
}

function takeCustomerReturn() {
  const destination = readCustomerReturn();
  sessionStorage.removeItem(CUSTOMER_RETURN_KEY);
  return destination;
}

function AppContent() {
  const [path, setPath] = useState(currentPath);
  const [session, setSession] = useState({ loading: true, user: null });
  const [customerAccount, setCustomerAccount] = useState(undefined);
  const [features, setFeatures] = useState({ bookingEnabled: false, customerRegistrationMode: 'ACCOUNT_PREVIEW' });
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('claritycam-cart') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('claritycam-cart', JSON.stringify(cart)); }, [cart]);

  useEffect(() => {
    function onPopState() {
      setPath(currentPath());
    }
    window.addEventListener('popstate', onPopState);
    Promise.allSettled([api.csrf(), api.me(), api.customerMe(), api.features()])
      .then(([, adminResult, customerResult, featureResult]) => {
        setSession({ loading: false, user: adminResult.status === 'fulfilled' ? adminResult.value : null });
        setCustomerAccount(customerResult.status === 'fulfilled' ? customerResult.value : null);
        if (featureResult.status === 'fulfilled') setFeatures(featureResult.value);
      });
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  function navigate(to) {
    window.history.pushState({}, '', to);
    setPath(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function logout() {
    try {
      await api.logout();
    } catch {
      // Clear the client view even when an expired session cannot call logout.
    }
    setSession({ loading: false, user: null });
    navigate('/admin/login');
  }

  const isAdminRoute = path.startsWith('/admin');
  const isCustomerLoginRoute = path === '/login';
  const isOnboardingRoute = path === '/onboarding';
  const isPasswordChangeRoute = path === '/account/password';
  const isBookingRoute = path.startsWith('/booking/');
  const isAccountRoute = path === '/account';
  const isProductRoute = path.startsWith('/products/');
  const isCartRoute = path === '/cart';
  const isGearRoute = path === '/gear';
  const isCalendarRoute = path === '/calendar';

  function addToCart(product, quantity) {
    setCart(current => {
      const existing = current.find(item => item.id === product.id);
      const nextQuantity = Math.min(product.availableQty, 10, (existing?.quantity || 0) + quantity);
      const item = { id: product.id, name: product.name, brand: product.brand, imageUrl: product.imageUrl, dailyPrice: product.dailyPrice, availableQty: product.availableQty, quantity: nextQuantity };
      return existing ? current.map(entry => entry.id === product.id ? item : entry) : [...current, item];
    });
  }

  function updateCart(id, quantity) {
    if (quantity <= 0) return setCart(current => current.filter(item => item.id !== id));
    setCart(current => current.map(item => item.id === id ? { ...item, quantity: Math.min(item.availableQty, 10, quantity) } : item));
  }

  function startRental() {
    if (!customerAccount) {
      rememberCustomerReturn('/gear');
      return navigate('/login');
    }
    if (needsCustomerOnboarding(customerAccount)) {
      rememberCustomerReturn('/gear');
      return navigate('/onboarding');
    }
    navigate('/gear');
  }

  function startProductBooking(product) {
    const destination = `/booking/${product.id}`;
    if (!customerAccount) {
      rememberCustomerReturn(destination);
      return navigate('/login');
    }
    if (!features.bookingEnabled) {
      window.alert('Tính năng booking chưa mở. Bạn vẫn có thể xem sản phẩm và lịch thiết bị.');
      return;
    }
    if (Number(customerAccount.onboardingVersion || 0) < 1) {
      rememberCustomerReturn(destination);
      return navigate('/onboarding');
    }
    navigate(destination);
  }

  function finishCustomerLogin(account, requestedReturn = null) {
    setCustomerAccount(account);
    const destination = validCustomerReturn(requestedReturn) || readCustomerReturn();
    if (destination) rememberCustomerReturn(destination);

    if (account.mustChangePassword) {
      navigate('/account/password');
      return;
    }

    if (!needsCustomerOnboarding(account)) {
      takeCustomerReturn();
      navigate(destination || '/gear');
      return;
    }
    navigate('/onboarding');
  }

  async function finishCustomerOnboarding(fallback = '/') {
    const updatedAccount = await api.completeCustomerOnboarding();
    setCustomerAccount(updatedAccount);
    navigate(takeCustomerReturn() || validCustomerReturn(fallback) || '/');
  }

  function cancelCustomerLogin() {
    takeCustomerReturn();
    navigate('/');
  }

  async function logoutCustomer() {
    try {
      await api.customerLogout();
    } catch {
      // Clear the local view even when the server session already expired.
    }
    takeCustomerReturn();
    setCustomerAccount(null);
    navigate('/');
  }

  function finishCustomerPasswordChange(updatedAccount) {
    setCustomerAccount(updatedAccount);
    if (needsCustomerOnboarding(updatedAccount)) {
      navigate('/onboarding');
      return;
    }
    navigate(takeCustomerReturn() || '/gear');
  }

  if (isAdminRoute) {
    if (session.loading) {
      return <div className="grid min-h-screen place-items-center bg-paper text-sm font-bold text-muted">Đang kiểm tra phiên làm việc...</div>;
    }
    if (!session.user) {
      return <AdminLoginPage onLogin={user => { setSession({ loading: false, user }); navigate('/admin'); }} onBack={() => navigate('/')} />;
    }
    const adminPage = path.split('/')[2] || 'dashboard';
    const adminDetailId = path.split('/')[3] ? decodeURIComponent(path.split('/')[3]) : null;
    return <AdminPage user={session.user} activePage={adminPage} detailId={adminDetailId} onNavigate={navigate} onLogout={logout} />;
  }

  if (isCustomerLoginRoute) {
    if (needsCustomerOnboarding(customerAccount)) {
      return <OnboardingFlow onComplete={() => finishCustomerOnboarding('/gear')} />;
    }
    if (customerAccount) {
      return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} bookingEnabled={features.bookingEnabled} /><CustomerPage mode="landing" onBrowse={startRental} onSelect={product => navigate(`/products/${product.id}`)} bookingEnabled={features.bookingEnabled} /><PublicFooter onNavigate={navigate} bookingEnabled={features.bookingEnabled} /></div>;
    }
    return <CustomerLoginPage
      onLogin={finishCustomerLogin}
      onBack={cancelCustomerLogin}
      loginMessage={readCustomerReturn()
        ? "Vui lòng đăng nhập hoặc đăng ký để tiếp tục đặt thuê. Sau khi xác thực, hệ thống sẽ đưa bạn quay lại đúng trang đang thực hiện."
        : undefined}
    />;
  }

  if (customerAccount?.mustChangePassword && !isPasswordChangeRoute) {
    return <CustomerPasswordChangePage account={customerAccount} onComplete={finishCustomerPasswordChange} onLogout={logoutCustomer} />;
  }

  if (isPasswordChangeRoute) {
    if (customerAccount === undefined) return <div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang kiểm tra tài khoản khách hàng...</div>;
    if (!customerAccount) return <CustomerLoginPage onLogin={account => finishCustomerLogin(account, '/gear')} onBack={cancelCustomerLogin} />;
    if (!customerAccount.mustChangePassword) {
      return <div className="min-h-screen bg-[#EBEBE9]"><CustomerPage mode="catalog" onSelect={product => navigate(`/products/${product.id}`)} bookingEnabled={features.bookingEnabled} /><PublicFooter onNavigate={navigate} bookingEnabled={features.bookingEnabled} /></div>;
    }
    return <CustomerPasswordChangePage account={customerAccount} onComplete={finishCustomerPasswordChange} onLogout={logoutCustomer} />;
  }

  if (isOnboardingRoute && customerAccount) {
    if (!needsCustomerOnboarding(customerAccount)) {
      return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} cartCount={0} bookingEnabled={features.bookingEnabled} /><CustomerPage mode="catalog" onSelect={product => navigate(`/products/${product.id}`)} bookingEnabled={features.bookingEnabled} /><PublicFooter onNavigate={navigate} bookingEnabled={features.bookingEnabled} /></div>;
    }
    return <OnboardingFlow onComplete={() => finishCustomerOnboarding()} />;
  }

  if (isOnboardingRoute && !customerAccount) {
    if (customerAccount === undefined) return <div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang kiểm tra tài khoản khách hàng...</div>;
    return <CustomerLoginPage onLogin={finishCustomerLogin} onBack={cancelCustomerLogin} loginMessage="Vui lòng đăng nhập hoặc đăng ký trước khi xem hướng dẫn đặt thuê." />;
  }

  if (isBookingRoute) {
    const productId = path.replace('/booking/', '');
    if (customerAccount === undefined) return <div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang kiểm tra tài khoản khách hàng...</div>;
    if (!customerAccount) return <CustomerLoginPage onLogin={account => finishCustomerLogin(account, `/booking/${productId}`)} onBack={cancelCustomerLogin} loginMessage="Vui lòng đăng nhập hoặc đăng ký trước khi đặt thuê. Sau khi hoàn tất, bạn sẽ quay lại đơn đang thực hiện." />;
    if (needsCustomerOnboarding(customerAccount)) {
      return <OnboardingFlow onComplete={() => finishCustomerOnboarding(`/booking/${productId}`)} />;
    }
    if (!features.bookingEnabled) return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} cartCount={0} bookingEnabled={false} /><ProductDetailsPage productId={productId} onBack={() => navigate('/gear')} onBook={startProductBooking} onAddToCart={addToCart} onViewProduct={product => navigate(`/products/${product.id}`)} bookingEnabled={false} /><PublicFooter onNavigate={navigate} bookingEnabled={false} /></div>;
    return (
      <div className="min-h-screen bg-[#EBEBE9]">
        <PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} bookingEnabled={features.bookingEnabled} />
        <BookingPage productId={productId} customerAccount={customerAccount} onBack={() => navigate('/gear')} onViewOrders={() => navigate('/account')} />
        <PublicFooter onNavigate={navigate} bookingEnabled={features.bookingEnabled} />
      </div>
    );
  }

  if (isAccountRoute) {
    if (customerAccount === undefined) return <div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang kiểm tra tài khoản khách hàng...</div>;
    if (!customerAccount) return <CustomerLoginPage onLogin={account => finishCustomerLogin(account, '/account')} onBack={cancelCustomerLogin} />;
    if (needsCustomerOnboarding(customerAccount)) return <OnboardingFlow onComplete={() => finishCustomerOnboarding('/account')} />;
    return <div className="min-h-screen bg-[#EBEBE9]"><CustomerAccountPage account={customerAccount} onLogin={setCustomerAccount} onBack={() => navigate('/gear')} onLogout={logoutCustomer} /><PublicFooter onNavigate={navigate} /></div>;
  }

  if (isProductRoute) {
    const productId = decodeURIComponent(path.replace('/products/', ''));
    if (customerAccount === undefined) return <div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang kiểm tra tài khoản khách hàng...</div>;
    if (!customerAccount) return <CustomerLoginPage onLogin={account => finishCustomerLogin(account, `/products/${productId}`)} onBack={cancelCustomerLogin} loginMessage="Vui lòng đăng nhập hoặc đăng ký để xem chi tiết sản phẩm." />;
    if (needsCustomerOnboarding(customerAccount)) return <OnboardingFlow onComplete={() => finishCustomerOnboarding(`/products/${productId}`)} />;
    return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} bookingEnabled={features.bookingEnabled} /><ProductDetailsPage productId={productId} onBack={() => navigate('/gear')} onBook={startProductBooking} onAddToCart={addToCart} onViewProduct={product => navigate(`/products/${product.id}`)} bookingEnabled={features.bookingEnabled} /><PublicFooter onNavigate={navigate} bookingEnabled={features.bookingEnabled} /></div>;
  }

  if (isCartRoute) {
    if (!features.bookingEnabled) return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} cartCount={0} bookingEnabled={false} /><CustomerPage mode="catalog" onSelect={product => navigate(`/products/${product.id}`)} bookingEnabled={false} /><PublicFooter onNavigate={navigate} bookingEnabled={false} /></div>;
    return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} /><CartPage cart={cart} onBack={() => navigate('/gear')} onUpdate={updateCart} onRemove={id => setCart(current => current.filter(item => item.id !== id))} onBook={startProductBooking} /><PublicFooter onNavigate={navigate} /></div>;
  }

  if (isGearRoute) {
    if (customerAccount === undefined) return <div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang kiểm tra tài khoản khách hàng...</div>;
    if (!customerAccount) return <CustomerLoginPage onLogin={account => finishCustomerLogin(account, '/gear')} onBack={cancelCustomerLogin} loginMessage="Vui lòng đăng nhập hoặc đăng ký để xem danh sách thiết bị." />;
    if (needsCustomerOnboarding(customerAccount)) return <OnboardingFlow onComplete={() => finishCustomerOnboarding('/gear')} />;
    return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} bookingEnabled={features.bookingEnabled} /><CustomerPage mode="catalog" onSelect={product => navigate(`/products/${product.id}`)} bookingEnabled={features.bookingEnabled} /><PublicFooter onNavigate={navigate} bookingEnabled={features.bookingEnabled} /></div>;
  }

  if (isCalendarRoute) {
    if (customerAccount === undefined) return <div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang kiểm tra tài khoản khách hàng...</div>;
    if (!customerAccount) return <CustomerLoginPage onLogin={account => finishCustomerLogin(account, '/calendar')} onBack={cancelCustomerLogin} loginMessage="Vui lòng đăng nhập hoặc đăng ký để xem lịch thiết bị." />;
    if (needsCustomerOnboarding(customerAccount)) return <OnboardingFlow onComplete={() => finishCustomerOnboarding('/calendar')} />;
    return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} bookingEnabled={features.bookingEnabled} /><CustomerCalendarPage /><PublicFooter onNavigate={navigate} bookingEnabled={features.bookingEnabled} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#EBEBE9]">
      <PublicHeader navigate={navigate} customerAccount={customerAccount} onStartBooking={startRental} onLogout={logoutCustomer} landing cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} bookingEnabled={features.bookingEnabled} />
      <CustomerPage mode="landing" onBrowse={startRental} onSelect={product => navigate(`/products/${product.id}`)} bookingEnabled={features.bookingEnabled} />
      <PublicFooter onNavigate={navigate} bookingEnabled={features.bookingEnabled} />
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang tải giao diện...</div>}>
      <AppContent />
    </Suspense>
  );
}

function PublicHeader({ navigate, customerAccount, onStartBooking, onLogout, cartCount, landing = false, bookingEnabled = false }) {
  const [headerVisible, setHeaderVisible] = useState(true);

  useEffect(() => {
    let previousY = window.scrollY;
    let frameId = 0;

    const handleScroll = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        if (currentY <= 32) setHeaderVisible(true);
        else if (currentY > previousY + 2) setHeaderVisible(false);
        else if (currentY < previousY - 2) setHeaderVisible(true);
        previousY = currentY;
        frameId = 0;
      });
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, []);

  function openHomeSection(id) {
    if (!landing) navigate('/');
    window.setTimeout(() => document.querySelector(`#${id}`)?.scrollIntoView({ behavior: 'smooth' }), landing ? 0 : 120);
  }
  return <header className={`public-header fixed inset-x-0 top-0 z-40 border-b border-line bg-white/95 shadow-[0_10px_35px_rgba(16,16,16,.08)] backdrop-blur-xl transition-[transform,opacity] duration-300 ease-out will-change-transform ${headerVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}>
    <div className="public-header__inner mx-auto flex min-h-[76px] max-w-[1600px] items-center gap-2 px-3 sm:gap-4 sm:px-7 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-10">
      <button onClick={() => navigate('/')} className="shrink-0 md:justify-self-start" aria-label="Về trang chủ AMY Digital"><BrandMark compact bare showSubtitle={false} className="[&>span:last-child]:hidden sm:[&>span:last-child]:flex" /></button>
      <nav className="public-header__nav hide-scrollbar mx-auto flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto py-2 sm:gap-3 md:justify-self-center">
        <button onClick={() => openHomeSection('cooperate')} className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-[10px] font-black uppercase text-muted transition hover:border-ink hover:text-ink sm:px-4 sm:text-[11px]"><Handshake className="h-4 w-4" />Hợp tác</button>
        <button onClick={() => openHomeSection('track')} className="flex h-11 items-center gap-2 rounded-lg border border-line px-3 text-[10px] font-black uppercase text-muted transition hover:border-ink hover:text-ink sm:px-4 sm:text-[11px]"><FileSearch className="h-4 w-4" />Tra cứu đơn</button>
        {customerAccount ? <button onClick={() => navigate('/calendar')} className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-[10px] font-black uppercase text-muted transition hover:border-ink hover:text-ink sm:px-4 sm:text-[11px]"><CalendarDays className="h-4 w-4" />Lịch thiết bị</button> : null}
      </nav>
      <div className="public-header__actions hide-scrollbar ml-auto flex shrink-0 items-center gap-2 overflow-x-auto sm:gap-3 md:ml-0 md:justify-self-end">
        <button onClick={() => {
          if (customerAccount) navigate('/account');
          else {
            takeCustomerReturn();
            navigate('/login');
          }
        }} className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-line bg-white px-3 text-[10px] font-black uppercase text-muted transition hover:border-ink hover:text-ink sm:px-4 sm:text-[11px]">
          {customerAccount ? <UserRound className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          <span>{customerAccount ? "Tài khoản" : "Đăng ký sớm"}</span>
        </button>
        {customerAccount ? <button type="button" onClick={onLogout} title="Đăng xuất" aria-label="Đăng xuất" className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-white px-3 text-muted transition hover:border-ink hover:bg-ink hover:text-acid xl:px-4">
          <LogOut className="h-4 w-4" />
          <span className="hidden text-[11px] font-black uppercase xl:inline">Đăng xuất</span>
        </button> : null}
        <button onClick={onStartBooking} className="flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-[10px] font-black uppercase tracking-wider text-acid shadow-sm transition hover:bg-acid hover:text-ink sm:px-6 sm:text-[11px]"><ShieldCheck className="h-4 w-4" />Xem thiết bị</button>
        {!landing && bookingEnabled ? <button onClick={() => navigate('/cart')} className="relative hidden h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-ink sm:flex" aria-label="Mở giỏ hàng"><ShoppingCart className="h-4 w-4" />{cartCount > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-acid px-1 text-[10px] font-black text-ink">{cartCount}</span> : null}</button> : null}
      </div>
    </div>
  </header>;
}

import { FileSearch, Handshake, ShieldCheck, ShoppingCart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from './lib/api.js';
import AdminLoginPage from './pages/AdminLoginPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import CustomerPage from './pages/CustomerPage.jsx';
import CustomerAccountPage from './pages/CustomerAccountPage.jsx';
import CustomerLoginPage from './pages/CustomerLoginPage.jsx';
import OnboardingFlow from './components/OnboardingFlow.jsx';
import CartPage from './pages/CartPage.jsx';
import ProductDetailsPage from './pages/ProductDetailsPage.jsx';
import PublicFooter from './components/PublicFooter.jsx';
import BrandMark from './components/BrandMark.jsx';

function currentPath() {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

export default function App() {
  const [path, setPath] = useState(currentPath);
  const [session, setSession] = useState({ loading: true, user: null });
  const [customerAccount, setCustomerAccount] = useState(undefined);
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem('claritycam-cart') || '[]'); } catch { return []; }
  });

  useEffect(() => { localStorage.setItem('claritycam-cart', JSON.stringify(cart)); }, [cart]);

  useEffect(() => {
    function onPopState() {
      setPath(currentPath());
    }
    window.addEventListener('popstate', onPopState);
    api.csrf()
      .catch(() => null)
      .finally(() => Promise.allSettled([api.me(), api.customerMe()]).then(([adminResult, customerResult]) => {
        setSession({ loading: false, user: adminResult.status === 'fulfilled' ? adminResult.value : null });
        setCustomerAccount(customerResult.status === 'fulfilled' ? customerResult.value : null);
      }));
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
  const isBookingRoute = path.startsWith('/booking/');
  const isAccountRoute = path === '/account';
  const isProductRoute = path.startsWith('/products/');
  const isCartRoute = path === '/cart';
  const isGearRoute = path === '/gear';

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

  if (customerAccount && Number(customerAccount.onboardingVersion || 0) < 1) {
    return <OnboardingFlow onComplete={async () => {
      const updatedAccount = await api.completeCustomerOnboarding();
      setCustomerAccount(updatedAccount);
      navigate('/');
    }} />;
  }

  if (isBookingRoute) {
    const productId = path.replace('/booking/', '');
    if (customerAccount === undefined) return <div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang kiểm tra tài khoản khách hàng...</div>;
    if (!customerAccount) return <CustomerLoginPage onLogin={setCustomerAccount} onBack={() => navigate(`/products/${productId}`)} loginMessage="Vui lòng đăng nhập để tiếp tục đặt thuê thiết bị." />;
    return (
      <div className="min-h-screen bg-[#EBEBE9]">
        <PublicHeader navigate={navigate} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />
        <BookingPage productId={productId} customerAccount={customerAccount} onBack={() => navigate('/gear')} onViewOrders={() => navigate('/account')} />
        <PublicFooter onNavigate={navigate} />
      </div>
    );
  }

  if (isAccountRoute) {
    if (customerAccount === undefined) return <div className="grid min-h-screen place-items-center bg-[#EBEBE9] text-sm font-bold text-muted">Đang kiểm tra tài khoản khách hàng...</div>;
    if (!customerAccount) return <CustomerLoginPage onLogin={setCustomerAccount} onBack={() => navigate('/')} />;
    return <div className="min-h-screen bg-[#EBEBE9]"><CustomerAccountPage account={customerAccount} onLogin={setCustomerAccount} onBack={() => navigate('/')} onLogout={async () => { await api.customerLogout(); setCustomerAccount(null); }} /><PublicFooter onNavigate={navigate} /></div>;
  }

  if (isProductRoute) {
    const productId = decodeURIComponent(path.replace('/products/', ''));
    return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} /><ProductDetailsPage productId={productId} onBack={() => navigate('/gear')} onBook={product => navigate(`/booking/${product.id}`)} onAddToCart={addToCart} onViewProduct={product => navigate(`/products/${product.id}`)} /><PublicFooter onNavigate={navigate} /></div>;
  }

  if (isCartRoute) {
    return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} /><CartPage cart={cart} onBack={() => navigate('/gear')} onUpdate={updateCart} onRemove={id => setCart(current => current.filter(item => item.id !== id))} onBook={product => navigate(`/booking/${product.id}`)} /><PublicFooter onNavigate={navigate} /></div>;
  }

  if (isGearRoute) {
    return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} /><CustomerPage mode="catalog" onSelect={product => navigate(`/products/${product.id}`)} /><PublicFooter onNavigate={navigate} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#EBEBE9]">
      <PublicHeader navigate={navigate} landing cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} />
      <CustomerPage mode="landing" onBrowse={() => navigate('/gear')} onSelect={product => navigate(`/products/${product.id}`)} />
      <PublicFooter onNavigate={navigate} />
    </div>
  );
}

function PublicHeader({ navigate, cartCount, landing = false }) {
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
  return <header className={`fixed inset-x-0 top-0 z-40 border-b border-line bg-white/95 shadow-[0_10px_35px_rgba(16,16,16,.08)] backdrop-blur-xl transition-[transform,opacity] duration-300 ease-out will-change-transform ${headerVisible ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-full opacity-0'}`}>
    <div className="mx-auto flex min-h-[76px] max-w-[1600px] items-center gap-2 px-3 sm:gap-4 sm:px-7 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:px-10">
      <button onClick={() => navigate('/')} className="shrink-0 md:justify-self-start" aria-label="Về trang chủ AMY Digital"><BrandMark compact className="[&>span:last-child]:hidden sm:[&>span:last-child]:flex" /></button>
      <nav className="hide-scrollbar mx-auto flex min-w-0 flex-1 items-center justify-center gap-2 overflow-x-auto py-2 sm:gap-3 md:justify-self-center">
        <button onClick={() => openHomeSection('cooperate')} className="flex h-11 shrink-0 items-center gap-2 rounded-lg border border-line px-3 text-[10px] font-black uppercase text-muted transition hover:border-ink hover:text-ink sm:px-4 sm:text-[11px]"><Handshake className="h-4 w-4" />Hợp tác</button>
        <button onClick={() => openHomeSection('track')} className="flex h-11 items-center gap-2 rounded-lg border border-line px-3 text-[10px] font-black uppercase text-muted transition hover:border-ink hover:text-ink sm:px-4 sm:text-[11px]"><FileSearch className="h-4 w-4" />Tra cứu đơn</button>
      </nav>
      <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3 md:ml-0 md:justify-self-end">
        <button onClick={() => navigate('/gear')} className="flex h-11 items-center gap-2 rounded-lg bg-ink px-4 text-[10px] font-black uppercase tracking-wider text-acid shadow-sm transition hover:bg-acid hover:text-ink sm:px-6 sm:text-[11px]"><ShieldCheck className="h-4 w-4" />Đặt thuê</button>
        {!landing ? <button onClick={() => navigate('/cart')} className="relative hidden h-11 w-11 items-center justify-center rounded-lg border border-line bg-white text-ink sm:flex" aria-label="Mở giỏ hàng"><ShoppingCart className="h-4 w-4" />{cartCount > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-acid px-1 text-[10px] font-black text-ink">{cartCount}</span> : null}</button> : null}
      </div>
    </div>
  </header>;
}

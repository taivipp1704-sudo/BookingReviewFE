import { Camera, Menu, ShieldCheck, ShoppingCart, UserRound } from 'lucide-react';
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
        <header className="fixed left-4 right-4 top-4 z-40 mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/90 px-4 py-3 shadow-soft backdrop-blur sm:px-5">
          <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left" aria-label="Về trang chủ ClarityCam">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-acid">
              <Camera className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-sm font-black leading-none">ClarityCam</span>
              <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">Camera rental</span>
            </span>
          </button>
          <button onClick={() => navigate('/')} className="rounded-full bg-ink px-4 py-2 text-[10px] font-black uppercase tracking-wider text-acid">Quay về danh sách</button>
        </header>
        <BookingPage productId={productId} customerAccount={customerAccount} onBack={() => navigate('/')} onViewOrders={() => navigate('/account')} />
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
    return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} /><ProductDetailsPage productId={productId} onBack={() => navigate('/')} onBook={product => navigate(`/booking/${product.id}`)} onAddToCart={addToCart} onViewProduct={product => navigate(`/products/${product.id}`)} /><PublicFooter onNavigate={navigate} /></div>;
  }

  if (isCartRoute) {
    return <div className="min-h-screen bg-[#EBEBE9]"><PublicHeader navigate={navigate} cartCount={cart.reduce((sum, item) => sum + item.quantity, 0)} /><CartPage cart={cart} onBack={() => navigate('/')} onUpdate={updateCart} onRemove={id => setCart(current => current.filter(item => item.id !== id))} onBook={product => navigate(`/booking/${product.id}`)} /><PublicFooter onNavigate={navigate} /></div>;
  }

  return (
    <div className="min-h-screen bg-[#EBEBE9]">
      <header className="fixed left-4 right-4 top-4 z-40 mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/90 px-4 py-3 shadow-soft backdrop-blur sm:px-5">
        <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left" aria-label="Về trang chủ ClarityCam">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-acid">
            <Camera className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-black leading-none">ClarityCam</span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-muted">Camera rental</span>
          </span>
        </button>
        <nav className="hidden items-center gap-6 text-[11px] font-black uppercase tracking-widest text-muted md:flex">
          <a href="#gear" className="hover:text-ink">Thiết bị</a>
          <a href="#process" className="hover:text-ink">Quy trình</a>
          <a href="#track" className="hover:text-ink">Tra cứu đơn</a>
          <button onClick={() => navigate('/admin/login')} className="flex items-center gap-2 hover:text-ink" title="Khu vực quản trị">
            <ShieldCheck className="h-3.5 w-3.5" />
            Quản trị
          </button>
          <button onClick={() => navigate('/account')} className="flex items-center gap-2 hover:text-ink" title="Tài khoản khách hàng"><UserRound className="h-3.5 w-3.5" />Tài khoản</button>
        </nav>
        <a href="#track" className="flex items-center gap-2 rounded-full bg-ink px-3 py-2 text-[10px] font-black uppercase tracking-wider text-acid md:hidden">
          <Menu className="h-3.5 w-3.5" />
          Tra cứu
        </a>
        <a href="#process" className="hidden items-center gap-2 rounded-full bg-ink px-4 py-2 text-[10px] font-black uppercase tracking-wider text-acid md:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          Đặt thuê
        </a>
      </header>
      <CustomerPage onSelect={product => navigate(`/products/${product.id}`)} />
      <PublicFooter onNavigate={navigate} />
    </div>
  );
}

function PublicHeader({ navigate, cartCount }) {
  return <header className="fixed left-4 right-4 top-4 z-40 mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/90 px-4 py-3 shadow-soft backdrop-blur sm:px-5">
    <button onClick={() => navigate('/')} className="flex items-center gap-3 text-left"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-acid"><Camera className="h-4 w-4" /></span><span><span className="block text-sm font-black leading-none">ClarityCam</span><span className="block text-[10px] font-bold uppercase tracking-widest text-muted">Camera rental</span></span></button>
    <button onClick={() => navigate('/cart')} className="relative flex h-10 w-10 items-center justify-center rounded-full bg-ink text-acid" aria-label="Mở giỏ hàng"><ShoppingCart className="h-4 w-4" />{cartCount > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-acid px-1 text-[10px] font-black text-ink">{cartCount}</span> : null}</button>
  </header>;
}

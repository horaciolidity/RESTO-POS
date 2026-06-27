import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  Coffee,
  Truck,
  Package,
  Layers,
  ShieldCheck,
  Shield,
  AlertTriangle,
  LogOut,
  User,
  Menu,
  X,
  Sun,
  Moon,
  Tv,
  Wallet,
  Settings2,
  History
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCashStore } from '../../store/useCashStore';
import { useSettingsStore } from '../../store/useSettingsStore';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const { currentSession, initializeCash } = useCashStore();
  const { businessName, setBusinessName } = useSettingsStore();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(true);

  // Initialize cash register for the branch
  useEffect(() => {
    if (user?.branchId) {
      initializeCash(user.branchId);
    }
  }, [user?.branchId, initializeCash]);

  // Sync business name with user profile tenantName on load
  useEffect(() => {
    if (user?.tenantName && user.tenantName !== businessName) {
      setBusinessName(user.tenantName);
    }
  }, [user?.tenantName]);

  // Apply dark mode by default
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  if (!user) return null;

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'supervisor'] },
    { path: '/pos', label: 'Punto de Venta (POS)', icon: Coffee, roles: ['super_admin', 'admin', 'cajero', 'supervisor'] },
    { path: '/tables', label: 'Salón & Mesas', icon: Layers, roles: ['super_admin', 'admin', 'mozo', 'supervisor'] },
    { path: '/waiter', label: 'Toma Pedido (Mozo)', icon: User, roles: ['super_admin', 'admin', 'mozo', 'supervisor'] },
    { path: '/delivery', label: 'Delivery & Repartos', icon: Truck, roles: ['super_admin', 'admin', 'cajero', 'delivery', 'supervisor'] },
    { path: '/inventory', label: 'Inventario & Stock', icon: Package, roles: ['super_admin', 'admin', 'supervisor'] },
    { path: '/cash', label: 'Caja & Arqueos', icon: Wallet, roles: ['super_admin', 'admin', 'cajero', 'supervisor'] },
    { path: '/audit', label: 'Centro Conciliación', icon: ShieldCheck, roles: ['super_admin', 'admin', 'supervisor'] },
    { path: '/incidents', label: 'Incidencias & Turno', icon: AlertTriangle, roles: ['super_admin', 'admin', 'cajero', 'mozo', 'cocina', 'delivery', 'supervisor'] },
    { path: '/history', label: 'Historial General', icon: History, roles: ['super_admin', 'admin', 'supervisor'] },
    { path: '/settings', label: 'Ajustes & Personal', icon: Settings2, roles: ['super_admin', 'admin', 'supervisor'] },
  ];

  const visibleMenuItems = menuItems.filter(item => 
    user.role === 'super_admin' || item.roles.includes(user.role)
  );


  return (
    <div className="h-screen flex bg-background text-foreground transition-colors duration-300 overflow-hidden">
      
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-72 bg-card border-r border-border p-5 shrink-0 justify-between h-full overflow-y-auto">
        <div>
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 py-4 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg shadow-primary/30">
              <Coffee className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-extrabold text-base tracking-tight gradient-text truncate max-w-[160px]">{businessName}</h1>
              <span className="text-[11px] text-muted-foreground uppercase font-bold tracking-wider">POS · Multi-Sucursal</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {/* Super Admin link — exclusive badge */}
            {user.role === 'super_admin' && (
              <Link
                to="/super-admin"
                className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 ${
                  location.pathname === '/super-admin'
                    ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30 scale-[1.02]'
                    : 'bg-violet-500/5 hover:bg-violet-500/10 text-violet-400 border border-violet-500/20 hover:border-violet-500/40'
                }`}
              >
                <Shield className="w-4 h-4" />
                Panel Super Admin
                <span className="ml-auto text-[9px] bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded-full font-extrabold uppercase tracking-wider">SA</span>
              </Link>
            )}
            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'hover:bg-muted hover:text-foreground text-muted-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Footer Account details */}
        <div className="border-t border-border pt-4 mt-6">
          {/* Cash session status indicator */}
          <div className="mb-4 flex items-center justify-between p-2 rounded-lg bg-muted/40 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <Wallet className="w-3.5 h-3.5" /> Caja
            </span>
            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
              currentSession?.status === 'open' 
                ? 'bg-green-500/10 text-green-500 border border-green-500/20'
                : 'bg-red-500/10 text-red-500 border border-red-500/20'
            }`}>
              {currentSession?.status === 'open' ? 'Abierta' : 'Cerrada'}
            </span>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs uppercase">
                {user.name.slice(0, 2)}
              </div>
              <div>
                <h4 className="font-semibold text-xs leading-none">{user.name}</h4>
                <span className="text-[10px] text-muted-foreground">{user.branchName}</span>
              </div>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground transition-colors"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 hover:bg-red-500/10 text-red-500 rounded-xl text-xs font-semibold transition-all border border-transparent hover:border-red-500/20"
          >
            <LogOut className="w-3.5 h-3.5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden pb-16 lg:pb-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Coffee className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg">MesaHub</span>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/customer-billing" target="_blank" title="Pantalla Cliente Facturación" className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
              <DollarSign className="w-4 h-4" />
            </Link>
            <Link to="/orders-display" target="_blank" title="Pantalla de Retiro" className="p-2 hover:bg-muted rounded-lg text-muted-foreground">
              <Tv className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* Page body */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40 flex justify-around items-center h-16 pb-safe shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.1)]">
        {visibleMenuItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary/70'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-primary/10' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
              </div>
              <span className="text-[10px] font-extrabold truncate max-w-[64px] tracking-tight">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
        {visibleMenuItems.length > 4 && (
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center flex-1 h-full gap-1 text-muted-foreground hover:text-primary/70 transition-colors"
          >
            <div className="p-1.5 rounded-xl">
              <Menu className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-extrabold truncate tracking-tight">Más</span>
          </button>
        )}
      </nav>

      {/* Mobile Drawer Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 lg:hidden flex justify-end">
          <div className="w-80 bg-card h-full p-5 flex flex-col justify-between shadow-2xl animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex justify-between items-center mb-6">
                <span className="font-bold text-lg">Menú del Sistema</span>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 hover:bg-muted rounded-lg text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="space-y-1">
                {visibleMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-primary text-white'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-xs uppercase">
                    {user.name.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs leading-none">{user.name}</h4>
                    <span className="text-[10px] text-muted-foreground">{user.branchName}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setDarkMode(!darkMode)}
                  className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"
                >
                  {darkMode ? <Sun className="w-4.5 h-4.5 text-amber-400" /> : <Moon className="w-4.5 h-4.5" />}
                </button>
              </div>

              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 hover:bg-red-500/10 text-red-500 rounded-xl text-xs font-semibold border border-transparent hover:border-red-500/20"
              >
                <LogOut className="w-3.5 h-3.5" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, User, Lock, Mail, Building, Check, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { authService } from '../../services/authService';

export default function Login() {
  const { login, loading: authStoreLoading } = useAuthStore();
  const navigate = useNavigate();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Register fields
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');

  const handleManualLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setLoading(true);
    try {
      const success = await login('admin', email, password);
      if (success) {
        navigate('/');
      } else {
        setError('Credenciales incorrectas o usuario no registrado.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!companyName || !adminName || !email || !password) {
      setError('Por favor, completa todos los campos del registro.');
      return;
    }
    setLoading(true);
    try {
      const generatedSubdomain = companyName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "")
        + Math.floor(100 + Math.random() * 900);

      const profile = await authService.registerCompany(companyName, generatedSubdomain, adminName, email, password);
      if (profile) {
        // Log in immediately
        await login('admin', email, password);
        navigate('/');
      } else {
        setError('No se pudo registrar la empresa.');
      }
    } catch (err: any) {
      setError(err?.message || 'Error al registrar la empresa.');
    } finally {
      setLoading(false);
    }
  };

  const isLoading = loading || authStoreLoading;

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 bg-slate-950 overflow-hidden font-sans">
      
      {/* Background Blobs for Design */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch z-10 my-8">
        
        {/* Left column: SaaS Branding, Advertising Banner & Plan Info */}
        <div className="lg:col-span-6 space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
                <Coffee className="w-5 h-5 text-white" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-white">RESTO POS</span>
            </div>
            
            <div className="space-y-2">
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Portal SaaS Multitenant
              </h2>
              <p className="text-slate-400 text-sm max-w-md">
                Configura e ingresa a tu propia sucursal en la nube. Gestiona múltiples sucursales, pedidos, facturación y personal con seguridad aislada.
              </p>
            </div>

            {/* SaaS Advertising Banner */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-primary/15 to-purple-500/15 border border-primary/20 space-y-3 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-primary text-white tracking-widest">PROMO LANZAMIENTO</span>
                <span className="text-xs font-bold text-slate-200">¡Prueba 50 ventas gratis en Modo Estándar!</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Registra tu empresa hoy y empieza a vender sin costo. Si decides pagar un año completo, **te bonificamos 2 meses gratis** (ahorras 2 meses en cualquier plan).
              </p>
            </div>
          </div>

          {/* Plan Comparison for Marketing */}
          <div className="space-y-4 pt-4 border-t border-slate-900">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Planes Disponibles</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Plan Standard */}
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-white">Plan Estándar</span>
                  <span className="text-xs font-semibold text-primary">$28.100 <span className="text-[10px] text-slate-400 font-normal">/mes</span></span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Ideal para locales que buscan ordenar el POS, caja e inventario.
                </p>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>POS / Punto de Venta</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Control de Stock e Insumos</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <Check className="w-3 h-3 text-emerald-500" />
                    <span>Caja diaria y Movimientos</span>
                  </div>
                </div>
              </div>

              {/* Plan Pro */}
              <div className="p-4 rounded-xl bg-gradient-to-b from-purple-900/25 to-slate-900/50 border border-purple-900/40 space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary px-2 py-0.5 rounded-bl text-[8px] font-black uppercase text-white tracking-widest">
                  POPULAR
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-sm font-bold text-white">Plan Pro</span>
                  <span className="text-xs font-semibold text-purple-400">$44.900 <span className="text-[10px] text-slate-400 font-normal">/mes</span></span>
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">
                  Para restaurantes con mozos, cocina y autogestión de clientes.
                </p>
                <div className="space-y-1 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <Check className="w-3 h-3 text-purple-400" />
                    <span>Pantallas Cliente y Cocina (KDS)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <Check className="w-3 h-3 text-purple-400" />
                    <span>Gestión de Mesas y Códigos QR</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                    <Check className="w-3 h-3 text-purple-400" />
                    <span>Turnos y Empleados</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Traditional credentials Form / Registration Form */}
        <div className="lg:col-span-6 flex flex-col justify-center">
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-2xl space-y-6">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white">
                {isRegisterMode ? 'Registrar Restaurante' : 'Iniciar Sesión'}
              </h3>
              <p className="text-slate-400 text-xs">
                {isRegisterMode 
                  ? 'Crea una cuenta para tu empresa y empieza a vender.' 
                  : 'Ingresa tus credenciales profesionales de sucursal.'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {!isRegisterMode ? (
              <form onSubmit={handleManualLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Email Corporativo</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="email"
                      placeholder="admin@resto.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Contraseña</label>
                    <a href="#reset" className="text-[10px] text-primary hover:underline font-bold">¿Olvidaste tu contraseña?</a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white gradient-bg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isLoading ? 'Verificando...' : 'Acceder al Sistema'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterCompany} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Nombre de la Empresa</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Pizzería Bella Vista"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Nombre Administrador</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Tu Nombre Apellido"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Email de Acceso</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="email"
                      placeholder="admin@pizzeriabellavista.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none placeholder:text-slate-600 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl text-sm font-bold text-white gradient-bg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                >
                  {isLoading ? 'Registrando...' : '🚀 Crear Empresa y Acceder'}
                </button>
              </form>
            )}

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setIsRegisterMode(!isRegisterMode); setError(''); }}
                className="text-xs text-primary font-bold hover:underline"
              >
                {isRegisterMode ? '¿Ya tienes una cuenta? Iniciar Sesión' : '¿Quieres registrar una nueva empresa? Regístrate aquí'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

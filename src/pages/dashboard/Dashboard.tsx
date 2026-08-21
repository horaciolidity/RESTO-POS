import { Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/useAuthStore';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  AlertTriangle,
  Clock,
  CheckCircle2,
  DollarSign,
  ChefHat,
  ChevronRight,
  Tv
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { useOrdersStore, Order } from '../../store/useOrdersStore';
import { useInventoryStore, Product } from '../../store/useInventoryStore';

// ── Date helpers ──────────────────────────────────────────────────
const CATEGORY_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#14b8a6'];

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function isThisMonth(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth();
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const { orders } = useOrdersStore();
  const { products } = useInventoryStore();

  if (user?.role === 'mozo') {
    return <Navigate to="/waiter" replace />;
  }

  if (user?.role === 'delivery') {
    return <Navigate to="/repartidor" replace />;
  }

  // ── Filtered order sets ──────────────────────────────────────────
  const paidToday = orders.filter((o: Order) => o.paid && isToday(o.createdAt));
  const paidThisMonth = orders.filter((o: Order) => o.paid && isThisMonth(o.createdAt));
  const ordersToday = orders.filter((o: Order) => isToday(o.createdAt));

  // ── KPI Metrics ─────────────────────────────────────────────────
  const totalSalesToday = paidToday.reduce((acc: number, o: Order) => acc + o.total, 0);
  const totalSalesMonth = paidThisMonth.reduce((acc: number, o: Order) => acc + o.total, 0);
  const paidTodayCount = paidToday.length;
  const ticketPromedio = paidTodayCount > 0 ? totalSalesToday / paidTodayCount : 0;
  const pendingOrdersCount = ordersToday.filter((o: Order) => o.status === 'pendiente').length;
  const preparingOrdersCount = ordersToday.filter((o: Order) => o.status === 'preparando').length;
  const completedOrdersCount = paidTodayCount;

  // ── Dynamic chart data: Sales by Hour ───────────────────────────
  const hourlySalesData = (() => {
    const hourMap: Record<string, number> = {};
    paidToday.forEach((o: Order) => {
      const h = new Date(o.createdAt).getHours();
      const key = `${String(h).padStart(2, '0')}:00`;
      hourMap[key] = (hourMap[key] || 0) + o.total;
    });
    // Generate all hours from 8 to 23 so the chart always has a baseline
    const result = [];
    for (let i = 8; i <= 23; i++) {
      const key = `${String(i).padStart(2, '0')}:00`;
      result.push({ hour: key, sales: Math.round(hourMap[key] || 0) });
    }
    return result;
  })();

  // ── Dynamic chart data: Sales by Category ───────────────────────
  const categorySalesData = (() => {
    const catMap: Record<string, number> = {};
    paidToday.forEach((o: Order) => {
      o.items.forEach(item => {
        const cat = item.product?.categoryName || 'Sin categoría';
        catMap[cat] = (catMap[cat] || 0) + (item.price * item.quantity);
      });
    });
    return Object.entries(catMap).map(([name, value], i) => ({
      name,
      value: Math.round(value),
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length]
    }));
  })();
  const totalCategorySales = categorySalesData.reduce((s, c) => s + c.value, 0);

  // ── Dynamic chart data: Sales by Waiter ─────────────────────────
  const employeeSalesData = (() => {
    const waiterMap: Record<string, number> = {};
    paidToday.forEach((o: Order) => {
      const name = o.waiterName || 'POS Directo';
      waiterMap[name] = (waiterMap[name] || 0) + o.total;
    });
    return Object.entries(waiterMap)
      .map(([name, sales]) => ({ name, sales: Math.round(sales) }))
      .sort((a, b) => b.sales - a.sales);
  })();

  // Stock alerts filters
  const lowStockProducts = products.filter((p: Product) => p.currentStock <= p.stockMin && p.currentStock > p.stockCritical);
  const outOfStockProducts = products.filter((p: Product) => p.currentStock <= p.stockCritical);

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Panel Administrativo</h2>
          <p className="text-muted-foreground text-xs">Métricas en tiempo real, alertas de stock e informes de rendimiento de MesaHub.</p>

        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => window.open('/customer-billing', 'CustomerDisplay', 'width=1024,height=768,popup=1')}
            className="px-3 py-1.5 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5 text-primary" /> 2° Pantalla Cliente
          </button>
          <button 
            onClick={() => window.open('/orders-display', 'OrdersDisplay', 'width=1024,height=768,popup=1')}
            className="px-3 py-1.5 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Tv className="w-3.5 h-3.5 text-primary" /> TV Turnos
          </button>
          <button 
            onClick={() => window.open('/kds', 'KitchenDisplay', 'width=1024,height=768,popup=1')}
            className="px-3 py-1.5 bg-card border border-border hover:border-primary/50 hover:bg-primary/5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <ChefHat className="w-3.5 h-3.5 text-primary" /> Pantalla Cocina
          </button>
          <span className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-xl text-primary text-xs font-bold flex items-center gap-1.5 ml-2">
            <TrendingUp className="w-3.5 h-3.5" /> En Vivo
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric Card 1 */}
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ventas del Día</span>
            <h3 className="text-2xl font-extrabold">${totalSalesToday.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
            <span className="text-[10px] text-green-500 font-semibold flex items-center gap-0.5">
              {paidTodayCount} {paidTodayCount === 1 ? 'venta' : 'ventas'} cobradas
            </span>
          </div>
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ticket Promedio</span>
            <h3 className="text-2xl font-extrabold">${ticketPromedio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
              basado en {paidTodayCount} {paidTodayCount === 1 ? 'venta' : 'ventas'}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Ventas del Mes</span>
            <h3 className="text-2xl font-extrabold">${totalSalesMonth.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</h3>
            <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-0.5">
              {paidThisMonth.length} {paidThisMonth.length === 1 ? 'venta' : 'ventas'} este mes
            </span>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-500">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Alertas de Stock</span>
            <h3 className="text-2xl font-extrabold text-amber-500">{lowStockProducts.length + outOfStockProducts.length} productos</h3>
            <span className="text-[10px] text-red-500 font-semibold flex items-center gap-0.5">
              {outOfStockProducts.length} críticos sin stock
            </span>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* Orders Realtime Queue Panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs text-muted-foreground">Pedidos Pendientes</h4>
            <p className="font-extrabold text-lg leading-none">{pendingOrdersCount} ordenes</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
            <ChefHat className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <h4 className="text-xs text-muted-foreground">En Preparación (KDS)</h4>
            <p className="font-extrabold text-lg leading-none">{preparingOrdersCount} comandas</p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs text-muted-foreground">Entregados Hoy</h4>
            <p className="font-extrabold text-lg leading-none">{completedOrdersCount} pedidos</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sales by Hour Chart */}
        <div className="p-6 rounded-2xl bg-card border border-border lg:col-span-8 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-extrabold text-base">Ventas por Hora</h3>
              <p className="text-[11px] text-muted-foreground">Monitoreo de flujo de ingresos del día actual</p>
            </div>
            <select className="bg-muted px-2.5 py-1 rounded-lg text-xs font-semibold focus:outline-none border border-border">
              <option>Hoy</option>
              <option>Ayer</option>
              <option>Semana</option>
            </select>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="hour" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '12px',
                    color: 'hsl(var(--foreground))',
                    fontSize: '12px'
                  }} 
                />
                <Area type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2.5} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sales by Category (Pie Chart) */}
        <div className="p-6 rounded-2xl bg-card border border-border lg:col-span-4 flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-base">Ventas por Categoría</h3>
            <p className="text-[11px] text-muted-foreground">Distribución de ingresos por tipo de producto</p>
          </div>

          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categorySalesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {categorySalesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            <div className="absolute flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Facturado</span>
              <span className="text-xl font-black">${totalCategorySales > 1000 ? `${(totalCategorySales / 1000).toFixed(1)}K` : totalCategorySales.toLocaleString('es-AR')}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {categorySalesData.map((item) => (
              <div key={item.name} className="flex items-center gap-1.5 p-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-muted-foreground truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Sales by Employee */}
        <div className="p-6 rounded-2xl bg-card border border-border md:col-span-6 flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-extrabold text-base">Ventas por Camarero (Mozo)</h3>
            <p className="text-[11px] text-muted-foreground">Rendimiento individual del equipo de salón</p>
          </div>

          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={employeeSalesData} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]}>
                  {employeeSalesData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? 'url(#primaryGrad)' : '#6366f1'} />
                  ))}
                </Bar>
                <defs>
                  <linearGradient id="primaryGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#ec4899" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Stock Alerts Widget */}
        <div className="p-6 rounded-2xl bg-card border border-border md:col-span-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-base">Alertas Operativas de Inventario</h3>
                <p className="text-[11px] text-muted-foreground">Productos que requieren reposición inmediata</p>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/10 text-red-500">Crítico</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {outOfStockProducts.length === 0 && lowStockProducts.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Stock correcto en todos los insumos.
                </div>
              ) : (
                <>
                  {outOfStockProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                      <div>
                        <h4 className="font-bold text-xs">{p.name}</h4>
                        <span className="text-[10px] text-muted-foreground">SKU: {p.sku} • {p.categoryName}</span>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-red-500/20 text-red-500 text-xs font-black">
                        SIN STOCK ({p.currentStock})
                      </span>
                    </div>
                  ))}
                  {lowStockProducts.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <div>
                        <h4 className="font-bold text-xs">{p.name}</h4>
                        <span className="text-[10px] text-muted-foreground">SKU: {p.sku} • {p.categoryName}</span>
                      </div>
                      <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-500 text-xs font-black">
                        STOCK BAJO ({p.currentStock})
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          <Link to="/inventory" className="mt-4 w-full flex items-center justify-between py-2.5 px-4 bg-muted hover:bg-muted/80 rounded-xl text-xs font-semibold group transition-all">
            Ir a Control de Inventario
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

      </div>

      {/* SaaS Pricing Plans Details Widgets */}
      <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
        <div>
          <h3 className="font-extrabold text-lg">Información de Suscripción MesaHub</h3>
          <p className="text-xs text-muted-foreground">Revisa los detalles de tu plan y las condiciones de la plataforma SaaS</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Estándar */}
          <div className="p-5 rounded-2xl bg-slate-900/40 border border-border flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 tracking-wider">Plan Básico</span>
              <h4 className="font-bold text-xl text-foreground">Plan Estándar</h4>
              <p className="text-xs text-slate-400">Perfecto para negocios gastronómicos en crecimiento.</p>
              
              <div className="pt-2 space-y-1">
                <p className="text-2xl font-black text-primary">$28.100 <span className="text-xs text-muted-foreground">/ mes</span></p>
                <p className="text-[11px] text-green-500 font-semibold">Anual: $281.000 / año (¡Ahorra 2 meses de suscripción!)</p>
              </div>

              <ul className="text-xs space-y-2 pt-2 text-slate-300">
                <li className="flex items-center gap-2">✓ Modo de Venta POS de Caja Principal</li>
                <li className="flex items-center gap-2">✓ Gestión de Mesas e Inventario de Insumos</li>
                <li className="flex items-center gap-2">✓ <strong>Prueba gratis limitada a 50 ventas</strong></li>
              </ul>
            </div>
            <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 text-center">
              <span className="text-xs text-primary font-bold">Prueba Gratuita Activa (Límite: 50 Ventas)</span>
            </div>
          </div>

          {/* Plan Pro */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/5 to-purple-500/5 border border-primary/20 flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-primary text-white tracking-widest animate-pulse">RECOMENDADO</span>
            </div>
            
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-primary/20 text-primary tracking-wider">Plan Completo</span>
              <h4 className="font-bold text-xl text-foreground">Plan Pro</h4>
              <p className="text-xs text-slate-400">La suite completa e integrada en tiempo real para tu personal y tus clientes.</p>

              <div className="pt-2 space-y-1">
                <p className="text-2xl font-black text-purple-400">$44.900 <span className="text-xs text-muted-foreground">/ mes</span></p>
                <p className="text-[11px] text-green-400 font-semibold">Anual: $449.000 / año (¡Ahorra 2 meses de suscripción!)</p>
              </div>

              <ul className="text-xs space-y-2 pt-2 text-slate-300">
                <li className="flex items-center gap-2">✓ Pantalla para Clientes (2da pantalla de facturación)</li>
                <li className="flex items-center gap-2">✓ Pantallas de Cocina KDS y Monitor de Turnos de TV</li>
                <li className="flex items-center gap-2">✓ Módulo Mozo Móvil (Toma de comandas en mesas)</li>
                <li className="flex items-center gap-2">✓ Autopedidos por Código QR en Mesa para clientes</li>
                <li className="flex items-center gap-2">✓ Control de Turnos Abiertos, Caja Diaria y Empleados</li>
              </ul>
            </div>
            <button className="w-full py-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-opacity text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20">
              Mejorar a Plan Pro
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}


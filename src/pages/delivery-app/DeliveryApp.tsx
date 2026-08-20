import { useState, useEffect, useRef } from 'react';
import { useOrdersStore, Order } from '../../store/useOrdersStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import {
  MapPin,
  Truck,
  CheckCircle2,
  Navigation,
  Phone,
  Clock,
  LogOut,
  AlertCircle,
  Package,
  UtensilsCrossed,
  List,
  User,
  ChevronDown,
  ChevronUp,
  Bell,
  Star,
  ExternalLink,
  ShoppingBag,
  Hash,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Tab = 'mis-entregas' | 'pendientes' | 'menu' | 'perfil';

function OrderCard({
  order,
  mode,
  onTake,
  onDelivered,
  onOpenMap,
}: {
  order: Order;
  mode: 'pending' | 'active';
  onTake?: (o: Order) => void;
  onDelivered?: (o: Order) => void;
  onOpenMap: (address?: string) => void;
}) {
  const [expanded, setExpanded] = useState(mode === 'active');

  const statusColors: Record<string, string> = {
    pendiente: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    preparando: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    listo: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  };

  const statusLabel: Record<string, string> = {
    pendiente: '⏳ Pendiente',
    preparando: '🍳 Preparando',
    listo: '✅ Listo para llevar',
  };

  const totalItems = order.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <div
      className={`bg-card border rounded-2xl overflow-hidden shadow-sm transition-all ${
        mode === 'active' ? 'border-primary/40 shadow-primary/10' : 'border-border'
      }`}
    >
      {/* Colored left bar for active */}
      {mode === 'active' && <div className="h-1 w-full bg-gradient-to-r from-primary to-violet-400" />}

      <div className="p-4 space-y-3">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20 flex items-center gap-1">
              <Hash className="w-2.5 h-2.5" /> {order.orderNumber}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                statusColors[order.status] || 'bg-muted text-muted-foreground border-border'
              }`}
            >
              {statusLabel[order.status] || order.status}
            </span>
          </div>
          <span className="font-black text-lg text-foreground whitespace-nowrap">
            ${order.total.toLocaleString('es-AR')}
          </span>
        </div>

        {/* Customer name */}
        <h3 className="font-extrabold text-base leading-tight">
          {order.customerName || 'Cliente sin nombre'}
        </h3>

        {/* Address & Phone */}
        <div className="space-y-1.5 text-xs">
          {order.customerAddress && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span className="font-medium text-foreground/80">{order.customerAddress}</span>
            </div>
          )}
          {order.customerPhone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <a
                href={`tel:${order.customerPhone}`}
                className="font-semibold text-emerald-500 hover:underline"
              >
                {order.customerPhone}
              </a>
            </div>
          )}
        </div>

        {/* Item summary strip */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/70 rounded-xl border border-border/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <ShoppingBag className="w-3.5 h-3.5" />
            {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}
            {' · '}
            {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>

        {/* Item details (expandable) */}
        {expanded && (
          <div className="space-y-1.5 pl-1 animate-fade-in">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center shrink-0">
                    {item.quantity}
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">{item.product.name}</span>
                    {item.notes && (
                      <p className="text-[10px] text-amber-500 font-medium">📝 {item.notes}</p>
                    )}
                  </div>
                </div>
                <span className="font-bold text-foreground/70 shrink-0 ml-2">
                  ${(item.price * item.quantity).toLocaleString('es-AR')}
                </span>
              </div>
            ))}
            {order.orderNote && (
              <div className="mt-1 px-3 py-2 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">Nota del pedido</p>
                <p className="text-xs text-amber-700">{order.orderNote}</p>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {mode === 'active' ? (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onOpenMap(order.customerAddress)}
              disabled={!order.customerAddress}
              className="py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:cursor-not-allowed border border-blue-500/20"
            >
              <Navigation className="w-4 h-4" />
              Ver Ruta GPS
            </button>
            <button
              onClick={() => onDelivered?.(order)}
              className="py-3 bg-gradient-to-r from-primary to-violet-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all hover:opacity-90 shadow-lg shadow-primary/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              Entregado ✓
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={() => onOpenMap(order.customerAddress)}
              disabled={!order.customerAddress}
              className="py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors disabled:opacity-40 border border-blue-500/20"
            >
              <MapPin className="w-3.5 h-3.5" />
              Ver Dirección
            </button>
            <button
              onClick={() => onTake?.(order)}
              className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-emerald-500/20"
            >
              <Truck className="w-3.5 h-3.5" />
              Tomar Pedido
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DeliveryApp() {
  const { orders } = useOrdersStore();
  const { user, logout } = useAuthStore();
  const { businessName } = useSettingsStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('mis-entregas');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const prevPendingCount = useRef(0);

  // Filter delivery orders
  const deliveryOrders = orders.filter(
    (o) => o.orderType === 'delivery' || o.source === 'delivery'
  );

  // Unassigned orders
  const pendingOrders = deliveryOrders.filter(
    (o) =>
      !o.deliveryDriverId &&
      o.status !== 'entregado' &&
      o.status !== 'pagado' &&
      o.status !== 'cancelado'
  );

  // My active orders
  const myOrders = deliveryOrders.filter(
    (o) =>
      o.deliveryDriverId === user?.id &&
      o.status !== 'entregado' &&
      o.status !== 'pagado' &&
      o.status !== 'cancelado'
  );

  // Completed today
  const myDeliveredToday = deliveryOrders.filter(
    (o) =>
      o.deliveryDriverId === user?.id &&
      (o.status === 'entregado' || o.status === 'pagado') &&
      o.createdAt.startsWith(new Date().toISOString().slice(0, 10))
  );

  // Notification sound on new pending orders
  useEffect(() => {
    if (pendingOrders.length > prevPendingCount.current) {
      const audio = new Audio('/notification.mp3');
      audio.play().catch(() => {});
    }
    prevPendingCount.current = pendingOrders.length;
  }, [pendingOrders.length]);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleTakeOrder = async (order: Order) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: err } = await supabase
          .from('orders')
          .update({
            delivery_driver_id: user?.id,
            delivery_status: 'on_route',
            status: 'preparando',
          })
          .eq('id', order.id);
        if (err) throw err;
      } else {
        useOrdersStore.getState().updateOrderLocally({
          ...order,
          deliveryDriverId: user?.id,
          deliveryStatus: 'on_route',
          status: 'preparando',
        });
      }
      showSuccess('¡Pedido tomado! Aparece en "Mis Entregas".');
      setActiveTab('mis-entregas');
    } catch {
      showError('Error al tomar el pedido. Intentá de nuevo.');
    }
  };

  const handleMarkDelivered = async (order: Order) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: err } = await supabase
          .from('orders')
          .update({ delivery_status: 'delivered', status: 'entregado' })
          .eq('id', order.id);
        if (err) throw err;
      } else {
        useOrdersStore.getState().updateOrderLocally({
          ...order,
          deliveryStatus: 'delivered',
          status: 'entregado',
        });
      }
      showSuccess('¡Entrega registrada! Buen trabajo 🎉');
    } catch {
      showError('Error al registrar la entrega.');
    }
  };

  const openMap = (address?: string) => {
    if (!address) return;
    // Opens Google Maps with directions from current location
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
      address
    )}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('simulated_delivery');
    await logout();
    navigate('/');
  };

  const openMenu = () => {
    // Opens the public digital menu in a new tab
    const menuUrl = `${window.location.origin}/menu`;
    window.open(menuUrl, '_blank');
  };

  const navItems: { id: Tab; icon: typeof Truck; label: string; badge?: number }[] = [
    { id: 'mis-entregas', icon: Truck, label: 'Mis Entregas', badge: myOrders.length },
    { id: 'pendientes', icon: Clock, label: 'Pendientes', badge: pendingOrders.length },
    { id: 'menu', icon: UtensilsCrossed, label: 'Menú' },
    { id: 'perfil', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">
      {/* ─── Header ─── */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/25">
            <Truck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm leading-tight">{user?.name || 'Repartidor'}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              {businessName} · Delivery
            </p>
          </div>
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          {pendingOrders.length > 0 && (
            <span className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-500 rounded-full text-[10px] font-black border border-amber-500/20 animate-pulse">
              <Bell className="w-3 h-3" />
              {pendingOrders.length}
            </span>
          )}
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Conectado" />
        </div>
      </header>

      {/* ─── Toast Messages ─── */}
      {(error || successMsg) && (
        <div
          className={`mx-4 mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
            error
              ? 'bg-red-500/10 text-red-500 border border-red-500/20'
              : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
          }`}
        >
          {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {error || successMsg}
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-y-auto pb-24">
        {/* Tab: Mis Entregas */}
        {activeTab === 'mis-entregas' && (
          <div className="p-4 space-y-4">
            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-primary">{myOrders.length}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">En Ruta</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-500">{myDeliveredToday.length}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Hoy</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <p className="text-2xl font-black text-amber-500">{pendingOrders.length}</p>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Disponibles</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Navigation className="w-3.5 h-3.5 text-primary" />
                Mis Entregas Activas ({myOrders.length})
              </h2>
            </div>

            {myOrders.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                  <Package className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Sin entregas activas</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Revisá los pedidos pendientes y tomá uno.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('pendientes')}
                  className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-xl"
                >
                  Ver Pedidos Disponibles
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    mode="active"
                    onDelivered={handleMarkDelivered}
                    onOpenMap={openMap}
                  />
                ))}
              </div>
            )}

            {/* Completed today section */}
            {myDeliveredToday.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                  <Star className="w-3 h-3 text-amber-500" />
                  Entregados Hoy ({myDeliveredToday.length})
                </h3>
                <div className="space-y-2">
                  {myDeliveredToday.slice(0, 5).map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">#{order.orderNumber} · {order.customerName || 'Cliente'}</p>
                          <p className="text-[10px] text-muted-foreground">{order.customerAddress || 'Sin dirección'}</p>
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-500">
                        ${order.total.toLocaleString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Pendientes */}
        {activeTab === 'pendientes' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                Pedidos Disponibles ({pendingOrders.length})
              </h2>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                  <List className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-bold text-foreground">No hay pedidos pendientes</p>
                  <p className="text-xs text-muted-foreground mt-1">Cuando lleguen nuevos pedidos aparecerán aquí.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    mode="pending"
                    onTake={handleTakeOrder}
                    onOpenMap={openMap}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Menú */}
        {activeTab === 'menu' && (
          <div className="p-4 space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <UtensilsCrossed className="w-8 h-8 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="font-extrabold text-xl">Menú Digital</h2>
                <p className="text-sm text-muted-foreground">
                  Consultá el menú completo del restaurante para informar a los clientes sobre los platos disponibles.
                </p>
              </div>
              <button
                onClick={openMenu}
                className="w-full py-3.5 bg-gradient-to-r from-primary to-violet-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Menú Completo
              </button>
              <p className="text-[11px] text-muted-foreground">El menú se abrirá en una nueva pestaña del navegador.</p>
            </div>

            {/* Quick reference of recent order items */}
            {deliveryOrders.length > 0 && (
              <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-primary" />
                  Productos más pedidos hoy
                </h3>
                {(() => {
                  const countMap: Record<string, { name: string; count: number }> = {};
                  deliveryOrders.forEach((o) => {
                    o.items.forEach((item) => {
                      const key = item.product.name;
                      if (!countMap[key]) countMap[key] = { name: key, count: 0 };
                      countMap[key].count += item.quantity;
                    });
                  });
                  return Object.values(countMap)
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 6)
                    .map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm py-1 border-b border-border/30 last:border-0">
                        <span className="font-medium text-foreground/80">{item.name}</span>
                        <span className="text-[11px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          x{item.count}
                        </span>
                      </div>
                    ));
                })()}
              </div>
            )}
          </div>
        )}

        {/* Tab: Perfil */}
        {activeTab === 'perfil' && (
          <div className="p-4 space-y-4">
            {/* Profile Card */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-primary/25">
                  {user?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <h2 className="font-extrabold text-lg">{user?.name}</h2>
                  <p className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Repartidor · {businessName}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[10px] text-emerald-500 font-bold">Activo</span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-center">
                  <p className="text-2xl font-black text-primary">{myOrders.length}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">En ruta ahora</p>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-center">
                  <p className="text-2xl font-black text-emerald-500">{myDeliveredToday.length}</p>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Entregados hoy</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <button
                onClick={openMenu}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors border-b border-border/50 text-left"
              >
                <UtensilsCrossed className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-bold text-sm">Ver Menú Digital</p>
                  <p className="text-[11px] text-muted-foreground">Consulta los platos del restaurante</p>
                </div>
                <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
              </button>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/5 transition-colors text-left"
              >
                <LogOut className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-bold text-sm text-red-500">Cerrar Sesión</p>
                  <p className="text-[11px] text-muted-foreground">Salir de la app de repartidor</p>
                </div>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* ─── Bottom Navigation ─── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.15)]">
        <div className="flex items-stretch">
          {navItems.map(({ id, icon: Icon, label, badge }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-all relative ${
                  isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
                )}
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] font-bold ${isActive ? 'font-black' : ''}`}>{label}</span>
              </button>
            );
          })}
        </div>
        {/* Safe area for iOS */}
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </div>
  );
}

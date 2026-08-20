import { useState, useEffect, useRef } from 'react';
import { useOrdersStore, Order } from '../../store/useOrdersStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useInventoryStore } from '../../store/useInventoryStore';
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
  ShoppingBag,
  Hash,
  MessageSquare,
  X,
  Search,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type Tab = 'mis-entregas' | 'pendientes' | 'menu' | 'perfil';

// ─── Modal: Marcar Entregado con Novedad ───────────────────────────────────────
function DeliveredModal({
  order,
  onConfirm,
  onCancel,
}: {
  order: Order;
  onConfirm: (note: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-fade-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/5 border-b border-border p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="font-extrabold text-base">Confirmar Entrega</h3>
              <p className="text-[11px] text-muted-foreground">Pedido #{order.orderNumber} · {order.customerName || 'Cliente'}</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Order summary */}
          <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-1.5">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded-md bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center shrink-0">
                  {item.quantity}
                </span>
                <span className="font-medium text-foreground/80">{item.product.name}</span>
                {item.notes && <span className="text-amber-500 text-[10px]">({item.notes})</span>}
              </div>
            ))}
          </div>

          {/* Note field */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" />
              Novedad / Observación (opcional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Ej: El cliente no estaba, dejé con el portero. / Pago con efectivo. / Dirección incorrecta..."
              className="w-full p-3 bg-muted border border-border rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 pt-0 grid grid-cols-2 gap-3">
          <button
            onClick={onCancel}
            className="py-3 bg-muted hover:bg-muted/80 text-foreground font-bold text-sm rounded-xl transition-colors border border-border"
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(note.trim())}
            className="py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:opacity-90 transition-opacity"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Order Card ────────────────────────────────────────────────────────────────
function OrderCard({
  order,
  mode,
  onTake,
  onDeliveredRequest,
  onOpenMap,
}: {
  order: Order;
  mode: 'pending' | 'active';
  onTake?: (o: Order) => void;
  onDeliveredRequest?: (o: Order) => void;
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
      {mode === 'active' && <div className="h-1 w-full bg-gradient-to-r from-primary to-violet-400" />}

      <div className="p-4 space-y-3">
        {/* Header */}
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

        <h3 className="font-extrabold text-base leading-tight">
          {order.customerName || 'Cliente sin nombre'}
        </h3>

        <div className="space-y-1.5 text-xs">
          {order.customerAddress && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <span className="font-medium text-foreground/80">{order.customerAddress}</span>
            </div>
          )}
          {order.customerPhone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <a href={`tel:${order.customerPhone}`} className="font-semibold text-emerald-500 hover:underline">
                {order.customerPhone}
              </a>
            </div>
          )}
        </div>

        {/* Item toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/70 rounded-xl border border-border/50 transition-colors"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <ShoppingBag className="w-3.5 h-3.5" />
            {totalItems} {totalItems === 1 ? 'artículo' : 'artículos'} · {order.items.length} {order.items.length === 1 ? 'producto' : 'productos'}
          </div>
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>

        {/* Item details */}
        {expanded && (
          <div className="space-y-1.5 pl-1">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs py-1.5 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary font-black text-[10px] flex items-center justify-center shrink-0">
                    {item.quantity}
                  </span>
                  <div>
                    <span className="font-semibold text-foreground">{item.product.name}</span>
                    {item.notes && <p className="text-[10px] text-amber-500 font-medium">📝 {item.notes}</p>}
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

        {/* Actions */}
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
              onClick={() => onDeliveredRequest?.(order)}
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

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DeliveryApp() {
  const { orders } = useOrdersStore();
  const { user, logout } = useAuthStore();
  const { businessName } = useSettingsStore();
  const { products, categories, initializeStore: initInventory } = useInventoryStore();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<Tab>('mis-entregas');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deliveredOrder, setDeliveredOrder] = useState<Order | null>(null);
  const [menuSearch, setMenuSearch] = useState('');
  const [menuCategory, setMenuCategory] = useState('all');
  const prevPendingCount = useRef(0);

  // Load inventory on mount
  useEffect(() => {
    initInventory();
  }, []);

  // Delivery orders
  const deliveryOrders = orders.filter((o) => o.orderType === 'delivery' || o.source === 'delivery');
  const pendingOrders = deliveryOrders.filter(
    (o) => !o.deliveryDriverId && o.status !== 'entregado' && o.status !== 'pagado' && o.status !== 'cancelado'
  );
  const myOrders = deliveryOrders.filter(
    (o) => o.deliveryDriverId === user?.id && o.status !== 'entregado' && o.status !== 'pagado' && o.status !== 'cancelado'
  );
  const myDeliveredToday = deliveryOrders.filter(
    (o) =>
      o.deliveryDriverId === user?.id &&
      (o.status === 'entregado' || o.status === 'pagado') &&
      o.createdAt.startsWith(new Date().toISOString().slice(0, 10))
  );

  // Notification sound
  useEffect(() => {
    if (pendingOrders.length > prevPendingCount.current) {
      new Audio('/notification.mp3').play().catch(() => {});
    }
    prevPendingCount.current = pendingOrders.length;
  }, [pendingOrders.length]);

  const showError = (msg: string) => { setError(msg); setTimeout(() => setError(null), 4000); };
  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 3000); };

  const handleTakeOrder = async (order: Order) => {
    try {
      if (isSupabaseConfigured()) {
        const { error: err } = await supabase
          .from('orders')
          .update({ delivery_driver_id: user?.id, delivery_status: 'on_route', status: 'preparando' })
          .eq('id', order.id);
        if (err) throw err;
      } else {
        useOrdersStore.getState().updateOrderLocally({ ...order, deliveryDriverId: user?.id, deliveryStatus: 'on_route', status: 'preparando' });
      }
      showSuccess('¡Pedido tomado! Aparece en "Mis Entregas".');
      setActiveTab('mis-entregas');
    } catch {
      showError('Error al tomar el pedido. Intentá de nuevo.');
    }
  };

  const handleMarkDelivered = async (note: string) => {
    if (!deliveredOrder) return;
    const order = deliveredOrder;
    setDeliveredOrder(null);
    try {
      const updatePayload: any = { delivery_status: 'delivered', status: 'entregado' };
      if (note) updatePayload.order_note = order.orderNote ? `${order.orderNote} | Repartidor: ${note}` : `Repartidor: ${note}`;

      if (isSupabaseConfigured()) {
        const { error: err } = await supabase.from('orders').update(updatePayload).eq('id', order.id);
        if (err) throw err;
      } else {
        useOrdersStore.getState().updateOrderLocally({ ...order, deliveryStatus: 'delivered', status: 'entregado', orderNote: updatePayload.order_note });
      }
      showSuccess(note ? '¡Entrega registrada con novedad! 🎉' : '¡Entrega registrada! Buen trabajo 🎉');
    } catch {
      showError('Error al registrar la entrega.');
    }
  };

  const openMap = (address?: string) => {
    if (!address) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`, '_blank');
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('simulated_delivery');
    await logout();
    navigate('/');
  };

  // Menu filtering
  const activeProducts = products.filter((p) => p.active && p.type !== 'insumo');
  const menuFiltered = activeProducts.filter((p) => {
    const matchCat = menuCategory === 'all' || p.categoryId === menuCategory;
    const matchSearch = !menuSearch || p.name.toLowerCase().includes(menuSearch.toLowerCase());
    return matchCat && matchSearch;
  });
  const menuCategories = categories.filter((c) => c.active && activeProducts.some((p) => p.categoryId === c.id));

  const navItems: { id: Tab; icon: typeof Truck; label: string; badge?: number }[] = [
    { id: 'mis-entregas', icon: Truck, label: 'Mis Entregas', badge: myOrders.length },
    { id: 'pendientes', icon: Clock, label: 'Pendientes', badge: pendingOrders.length },
    { id: 'menu', icon: UtensilsCrossed, label: 'Menú' },
    { id: 'perfil', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col select-none">
      {/* Delivered Modal */}
      {deliveredOrder && (
        <DeliveredModal
          order={deliveredOrder}
          onConfirm={handleMarkDelivered}
          onCancel={() => setDeliveredOrder(null)}
        />
      )}

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
        <div className={`mx-4 mt-3 p-3 rounded-xl text-xs font-bold flex items-center gap-2 ${
          error ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
        }`}>
          {error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {error || successMsg}
        </div>
      )}

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-y-auto pb-24">

        {/* Tab: Mis Entregas */}
        {activeTab === 'mis-entregas' && (
          <div className="p-4 space-y-4">
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

            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Navigation className="w-3.5 h-3.5 text-primary" />
              Mis Entregas Activas ({myOrders.length})
            </h2>

            {myOrders.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center">
                  <Package className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="font-bold text-foreground">Sin entregas activas</p>
                  <p className="text-xs text-muted-foreground mt-1">Revisá los pedidos pendientes y tomá uno.</p>
                </div>
                <button onClick={() => setActiveTab('pendientes')} className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-xl">
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
                    onDeliveredRequest={setDeliveredOrder}
                    onOpenMap={openMap}
                  />
                ))}
              </div>
            )}

            {myDeliveredToday.length > 0 && (
              <div className="mt-6">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 mb-3">
                  <Star className="w-3 h-3 text-amber-500" />
                  Entregados Hoy ({myDeliveredToday.length})
                </h3>
                <div className="space-y-2">
                  {myDeliveredToday.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="text-xs font-bold">#{order.orderNumber} · {order.customerName || 'Cliente'}</p>
                          <p className="text-[10px] text-muted-foreground">{order.customerAddress || 'Sin dirección'}</p>
                          {order.orderNote && order.orderNote.includes('Repartidor:') && (
                            <p className="text-[10px] text-amber-500 mt-0.5">📝 {order.orderNote.split('Repartidor:')[1]?.trim()}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-black text-emerald-500">${order.total.toLocaleString('es-AR')}</span>
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
            <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Pedidos Disponibles ({pendingOrders.length})
            </h2>
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
                  <OrderCard key={order.id} order={order} mode="pending" onTake={handleTakeOrder} onOpenMap={openMap} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Menú ── solo lectura, sin redirigir al admin ─── */}
        {activeTab === 'menu' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <UtensilsCrossed className="w-3.5 h-3.5 text-primary" />
                Carta del Menú
              </h2>
              <span className="text-[10px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {activeProducts.length} productos
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full pl-9 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {/* Category filter */}
            {menuCategories.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <button
                  onClick={() => setMenuCategory('all')}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                    menuCategory === 'all'
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Todo
                </button>
                {menuCategories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setMenuCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-all ${
                      menuCategory === cat.id
                        ? 'bg-primary text-white shadow-md shadow-primary/20'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Products */}
            {menuFiltered.length === 0 ? (
              <div className="py-10 text-center">
                <UtensilsCrossed className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm font-bold text-muted-foreground">
                  {activeProducts.length === 0 ? 'No hay productos en el menú todavía.' : 'No se encontraron productos.'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {menuFiltered.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl"
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-5 h-5 text-primary/50" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{product.name}</p>
                      {product.description && (
                        <p className="text-[11px] text-muted-foreground truncate">{product.description}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-bold mt-0.5">
                        {product.categoryName}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-base text-primary">
                        ${product.salePrice.toLocaleString('es-AR')}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{product.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab: Perfil */}
        {activeTab === 'perfil' && (
          <div className="p-4 space-y-4">
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

            <div className="bg-card border border-border rounded-2xl overflow-hidden">
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
                {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />}
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
      </nav>
    </div>
  );
}

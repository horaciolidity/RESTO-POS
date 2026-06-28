import { useState, useEffect, useRef } from 'react';
import {
  FileText,
  AlertCircle,
  User,
  Lock,
  X,
  CheckCircle2,
  ShoppingCart,
  Clock,
  QrCode,
  Eye,
  Send,
  RefreshCw,
  BellRing
} from 'lucide-react';
import { useOrdersStore, RestaurantTable, Order } from '../../store/useOrdersStore';
import { useInventoryStore, Product } from '../../store/useInventoryStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useCashStore } from '../../store/useCashStore';
import { supabase } from '../../services/supabase';
import { tableCallService, TableCallEvent } from '../../services/tableCallService';
import { useNavigate } from 'react-router-dom';

// Admin exit lock modal
function AdminExitModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const email = user?.email || '';
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError('Contraseña incorrecta. Inténtelo de nuevo.');
        setPassword('');
      } else {
        onConfirm();
      }
    } catch {
      setError('Error al verificar. Intente nuevamente.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-500/10 rounded-2xl">
              <Lock className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-extrabold text-sm">Salir del Modo Mozo</p>
              <p className="text-[11px] text-muted-foreground">Ingresa tu contraseña de administrador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-xl transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              placeholder="••••••••"
              className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {error && (
              <p className="text-red-500 text-xs mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={!password.trim() || loading}
            className="w-full py-3 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Lock className="w-4 h-4" />
            {loading ? 'Verificando...' : 'Salir del Modo Mozo'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Waiter() {
  const { tables, updateTableStatus, addOrder, orders, initializeStore, updateOrderStatus, addIncident } = useOrdersStore();
  const { products } = useInventoryStore();
  const { user } = useAuthStore();
  const [activeTable, setActiveTable] = useState<RestaurantTable | null>(null);
  const [selectedItems, setSelectedItems] = useState<{ product: any; quantity: number; notes: string }[]>([]);
  const [activeTab, setActiveTab] = useState<'mesas' | 'pedido' | 'mi_historial'>('mesas');
  const [showExitModal, setShowExitModal] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [qrPaymentImage, setQrPaymentImage] = useState('');
  const [showQrPaymentModal, setShowQrPaymentModal] = useState(false);
  const [showOrderDetail, setShowOrderDetail] = useState<Order | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [waiterNovedad, setWaiterNovedad] = useState('');
  const [waiterNovedadType, setWaiterNovedadType] = useState<'incidente' | 'reclamo' | 'rotura' | 'error_cocina'>('incidente');
  const [tableCallAlert, setTableCallAlert] = useState<TableCallEvent | null>(null);
  const [confirming, setConfirming] = useState(false);
  const callChannelRef = useRef<any>(null);
  const { currentSession, initializeCash, loading: cashLoading } = useCashStore();
  const navigate = useNavigate();

  // Re-fetch cash only if branchId changes OR if store hasn't loaded yet
  useEffect(() => {
    document.documentElement.classList.add('dark');
    if (user?.branchId && !cashLoading && currentSession === null) {
      // Layout already calls initializeCash on mount; only call here as a
      // safety net if the store is still empty after auth settles.
      const timer = setTimeout(() => {
        initializeCash(user.branchId);
      }, 300); // small delay to let Layout's call finish first
      return () => clearTimeout(timer);
    }
  }, [user?.branchId]);

  // Subscribe to table call events (customers calling the waiter)
  useEffect(() => {
    if (!user?.branchId) return;
    const channel = tableCallService.subscribeToTableCalls(
      user.branchId,
      (event: TableCallEvent) => {
        // Only alert if mozo has this table assigned (or no restriction in demo)
        const { employees } = useSettingsStore.getState();
        const myEmployee = employees.find((e: any) =>
          `${e.firstName} ${e.lastName}`.trim() === user.name?.trim()
        );
        const myTables: string[] = myEmployee?.assignedTables || [];
        if (myTables.length === 0 || myTables.includes(event.tableId)) {
          setTableCallAlert(event);
          tableCallService.playAlarm();
          tableCallService.vibrate();
        }
      }
    );
    callChannelRef.current = channel;
    return () => {
      tableCallService.unsubscribeAll();
    };
  }, [user?.branchId, user?.name]);

  const handleConfirmTableCall = async () => {
    if (!tableCallAlert || !user?.branchId) return;
    setConfirming(true);
    await tableCallService.confirmCall(
      {
        tableToken: tableCallAlert.tableToken,
        tableNumber: tableCallAlert.tableNumber,
        waiterName: user.name || 'Mozo',
      },
      user.branchId
    );
    setTableCallAlert(null);
    setConfirming(false);
  };

  const handleDeliverOrder = async (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await updateOrderStatus(order.id, 'entregado');
    const assocTable = tables.find(t => `Mesa ${t.number}` === order.tableName || t.currentOrderId === order.id);
    if (assocTable && assocTable.status !== 'solicita_cuenta') {
      await updateTableStatus(assocTable.id, 'comiendo', assocTable.currentOrderId || undefined);
    }
  };

  const handleWaiterFinalizeTable = async (order: Order) => {
    // 1. Update order status to 'entregado' but do not mark as paid
    await updateOrderStatus(order.id, 'entregado');

    // 2. Find and update the associated table to libre (clearing the active order id)
    const assocTable = tables.find(t => `Mesa ${t.number}` === order.tableName || t.currentOrderId === order.id);
    if (assocTable) {
      await updateTableStatus(assocTable.id, 'libre');
    }

    if (waiterNovedad.trim()) {
      addIncident({
        type: waiterNovedadType,
        description: `${order.tableName}: ${waiterNovedad}`,
        user: user?.name || 'Mozo'
      });
      setWaiterNovedad('');
    }

    setShowOrderDetail(null);
  };

  useEffect(() => {
    if (user?.tenantId) {
      const cached = localStorage.getItem('qr_payment_image_' + user.tenantId);
      if (cached) setQrPaymentImage(cached);
      supabase
        .from('tenants')
        .select('qr_payment_image')
        .eq('id', user.tenantId)
        .single()
        .then(({ data }) => {
          if (data?.qr_payment_image) {
            setQrPaymentImage(data.qr_payment_image);
            localStorage.setItem('qr_payment_image_' + user.tenantId, data.qr_payment_image);
          }
        });
    }
  }, [user]);

  // Real waiter stats from actual orders (filter out duplicates, match name cleanly)
  const waiterOrders: Order[] = orders.filter((o: Order) =>
    o.waiterName?.trim().toLowerCase() === user?.name?.trim().toLowerCase() && o.source === 'mesas'
  );

  // Active (unpaid and not delivered/cancelled) orders by this waiter
  const activeWaiterOrders: Order[] = waiterOrders.filter(o => 
    !o.paid && 
    o.status !== 'cancelado' && 
    o.status !== 'entregado'
  );

  const waiterStats = {
    ordersSent: waiterOrders.length,
    salesCollected: waiterOrders.filter((o: Order) => o.paid).reduce((acc: number, o: Order) => acc + o.total, 0),
    tablesServed: new Set(waiterOrders.map((o: Order) => o.tableName)).size
  };

  // Get existing active order for a table
  const getTableOrder = (table: RestaurantTable) =>
    orders.find(o => !o.paid && o.status !== 'cancelado' && (
      o.tableName === `Mesa ${table.number}` || o.id === table.currentOrderId
    ));

  const handleSelectTable = (table: RestaurantTable) => {
    setActiveTable(table);
    setActiveTab('pedido');
    const existingOrder = getTableOrder(table);
    if (existingOrder) {
      setSelectedItems(existingOrder.items.map(item => ({
        product: item.product,
        quantity: item.quantity,
        notes: item.notes || ''
      })));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (prod: any) => {
    const existing = selectedItems.find(item => item.product.id === prod.id);
    if (existing) {
      setSelectedItems(selectedItems.map(item =>
        item.product.id === prod.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setSelectedItems([...selectedItems, { product: prod, quantity: 1, notes: '' }]);
    }
  };

  const updateItemQty = (prodId: string, diff: number) => {
    setSelectedItems(prev => {
      const updated = prev.map(item => {
        if (item.product.id === prodId) {
          const newQty = item.quantity + diff;
          return newQty <= 0 ? null : { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean) as typeof selectedItems;
      return updated;
    });
  };

  const handleSendToKitchen = async () => {
    if (!activeTable || selectedItems.length === 0) return;

    const subtotal = selectedItems.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
    const total = subtotal;

    const existingOrder = getTableOrder(activeTable);
    const existingOrderId = existingOrder?.id;

    const orderId = await addOrder({
      source: 'mesas',
      status: 'pendiente',
      tableName: `Mesa ${activeTable.number}`,
      waiterName: user?.name || 'Mozo',
      items: selectedItems.map(item => ({
        id: `oi-${Date.now()}-${item.product.id}`,
        product: item.product,
        quantity: item.quantity,
        price: item.product.salePrice,
        notes: item.notes
      })),
      subtotal,
      discount: 0,
      tips: 0,
      total,
      paid: false
    }, existingOrderId);

    // Update table status to pending
    await updateTableStatus(activeTable.id, 'esperando_comida', orderId);

    setSendSuccess(true);
    setTimeout(() => setSendSuccess(false), 3500);

    // Go back to tables view to see the updated state
    setActiveTable(null);
    setSelectedItems([]);
    setActiveTab('mesas');
  };

  const handleConfirmQrPayment = async () => {
    if (!activeTable || selectedItems.length === 0) return;

    const subtotal = selectedItems.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);
    const total = subtotal;

    const existingOrder = getTableOrder(activeTable);
    const existingOrderId = existingOrder?.id;

    await addOrder({
      source: 'mesas',
      status: 'entregado',
      tableName: `Mesa ${activeTable.number}`,
      waiterName: user?.name || 'Mozo',
      items: selectedItems.map(item => ({
        id: `oi-${Date.now()}-${item.product.id}`,
        product: item.product,
        quantity: item.quantity,
        price: item.product.salePrice,
        notes: item.notes
      })),
      subtotal,
      discount: 0,
      tips: 0,
      total,
      paid: true,
      paymentMethod: 'Tarjeta QR'
    }, existingOrderId);

    await updateTableStatus(activeTable.id, 'libre', undefined);

    setShowQrPaymentModal(false);
    setSendSuccess(true);
    setSelectedItems([]);
    setActiveTable(null);
    setActiveTab('mesas');
    setTimeout(() => setSendSuccess(false), 3500);
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await initializeStore();
    setTimeout(() => setRefreshing(false), 800);
  };

  const handleExitClick = () => {
    if (sessionStorage.getItem('simulated_mozo')) {
      sessionStorage.removeItem('simulated_mozo');
      useAuthStore.getState().logout();
      navigate('/');
    } else {
      setShowExitModal(true);
    }
  };

  const handleExitConfirmed = () => {
    setShowExitModal(false);
    navigate('/');
  };

  const totalOrderPrice = selectedItems.reduce((acc, item) => acc + (item.product.salePrice * item.quantity), 0);

  // Filter active products only, excluding insumos
  const activeProducts = products.filter((p: Product) => p.active && p.type !== 'insumo');

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      libre: 'Libre', esperando_comida: 'Esperando', comiendo: 'Comiendo',
      ocupada: 'Ocupada', solicita_cuenta: 'Cuenta'
    };
    return map[s] || s;
  };

  const statusColor = (s: string) => {
    if (s === 'libre') return 'border-green-500/25 bg-green-500/5 text-green-500';
    if (s === 'esperando_comida') return 'border-orange-500/25 bg-orange-500/5 text-orange-500';
    if (s === 'comiendo') return 'border-blue-500/25 bg-blue-500/5 text-blue-500';
    if (s === 'solicita_cuenta') return 'border-red-500/25 bg-red-500/5 text-red-500';
    return 'border-border bg-muted/30 text-muted-foreground';
  };

  // Show loading screen while cash data is being fetched (prevents false "closed" block)
  if (cashLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm font-semibold">Verificando estado de caja...</p>
        </div>
      </div>
    );
  }

  const isCashRegisterOpen = currentSession && currentSession.status === 'open';

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-2 sm:p-4">
      {/* 🔒 BLOCKER FOR CLOSED CASH REGISTER */}
      {!isCashRegisterOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md p-4 text-center">
          <div className="bg-card border border-border rounded-3xl p-8 max-w-sm space-y-6 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
              <Lock className="w-8 h-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">Panel Inactivo</h2>
              <p className="text-slate-400 text-xs leading-relaxed">
                El modo mozo no puede utilizarse porque la caja del local está actualmente **Cerrada**. 
                Solicite al cajero o administrador que realice la apertura de caja para continuar.
              </p>
            </div>
            <button
              onClick={() => initializeCash(user?.branchId || '')}
              className="w-full py-2.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary font-bold text-xs rounded-xl transition-all mb-2"
            >
              Reintentar verificación
            </button>
            <button
              onClick={handleExitClick}
              className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold text-xs rounded-xl transition-all"
            >
              Regresar al Menú
            </button>
          </div>
        </div>
      )}
      {showExitModal && (
        <AdminExitModal
          onClose={() => setShowExitModal(false)}
          onConfirm={handleExitConfirmed}
        />
      )}

      {/* ⚡ TABLE CALL ALERT MODAL — highest priority overlay */}
      {tableCallAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          {/* Pulse background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-64 h-64 rounded-full bg-amber-500/10 animate-ping [animation-duration:1s]" />
          </div>
          <div className="relative bg-[#18181b] border-2 border-amber-400/50 rounded-3xl p-7 w-full max-w-sm space-y-6 shadow-2xl shadow-amber-500/20 text-center">
            {/* Bell icon animated */}
            <div className="w-24 h-24 mx-auto rounded-full bg-amber-400/10 border-2 border-amber-400/40 flex items-center justify-center">
              <BellRing className="w-12 h-12 text-amber-400 animate-bounce" />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-amber-400/70 font-bold uppercase tracking-widest">¡Llamada Entrante!</p>
              <h2 className="text-3xl font-black text-white">Mesa {tableCallAlert.tableNumber}</h2>
              <p className="text-slate-400 text-sm">Un cliente está solicitando tu atención.</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleConfirmTableCall}
                disabled={confirming}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-base rounded-2xl shadow-xl shadow-amber-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <CheckCircle2 className="w-5 h-5" />
                {confirming ? 'Confirmando...' : '¡Voy para allá!'}
              </button>
              <button
                onClick={() => setTableCallAlert(null)}
                className="w-full py-2.5 bg-white/5 border border-white/10 text-slate-400 font-bold text-sm rounded-2xl hover:bg-white/10 transition-all"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Payment Modal */}
      {showQrPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/10 rounded-2xl">
                  <QrCode className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="font-extrabold text-sm">Cobro con QR</p>
                  <p className="text-[11px] text-muted-foreground">Mesa {activeTable?.number} · Total: ${totalOrderPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
              <button onClick={() => setShowQrPaymentModal(false)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-4 flex flex-col items-center">
              {qrPaymentImage ? (
                <div className="p-2 bg-white rounded-2xl border border-border">
                  <img src={qrPaymentImage} alt="QR de Pago" className="w-48 h-48 object-contain" />
                </div>
              ) : (
                <div className="w-full p-6 bg-muted/60 border border-dashed border-border rounded-2xl text-center space-y-2">
                  <QrCode className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs text-muted-foreground font-semibold">QR no configurado</p>
                  <p className="text-[10px] text-muted-foreground/70">Puedes definir la imagen del QR en Ajustes &gt; General.</p>
                </div>
              )}
              <p className="text-[11px] text-center text-muted-foreground px-2 leading-relaxed">
                Muestra este código al cliente para que lo escanee y realice el pago. Una vez confirmado, presiona el botón de abajo.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowQrPaymentModal(false)}
                className="py-3 bg-muted hover:bg-muted/80 text-foreground font-bold text-xs rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmQrPayment}
                className="py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/15"
              >
                Confirmar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order detail modal */}
      {showOrderDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <FileText className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-extrabold text-sm">Pedido #{showOrderDetail.orderNumber}</p>
                  <p className="text-[11px] text-muted-foreground">{showOrderDetail.tableName}</p>
                </div>
              </div>
              <button onClick={() => setShowOrderDetail(null)} className="p-2 hover:bg-muted rounded-xl transition-colors">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {showOrderDetail.items.map(item => (
                <div key={item.id} className="flex justify-between items-center text-xs p-2.5 bg-muted/40 rounded-xl border border-border">
                  <div>
                    <p className="font-bold">{item.product.name}</p>
                    {item.notes && <p className="text-[10px] text-primary italic">{item.notes}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-black">x{item.quantity}</p>
                    <p className="text-[10px] text-muted-foreground">${(item.price * item.quantity).toLocaleString('es-AR')}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-border flex justify-between items-center">
              <span className="text-xs text-muted-foreground font-bold">Total:</span>
              <span className="text-sm font-extrabold text-primary">${showOrderDetail.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Estado:</span>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                showOrderDetail.status === 'pendiente' ? 'bg-orange-500/10 text-orange-500' :
                showOrderDetail.status === 'preparando' ? 'bg-blue-500/10 text-blue-500' :
                showOrderDetail.status === 'listo' ? 'bg-emerald-500/10 text-emerald-500' :
                'bg-green-500/10 text-green-500'
              }`}>
                {showOrderDetail.status}
              </span>
            </div>

            {/* Waiter can close table and leave novelties/incidents if unpaid */}
            {!showOrderDetail.paid && (
              <div className="pt-2 border-t border-border space-y-3">
                {showOrderDetail.status === 'listo' && (
                  <button
                    onClick={() => { handleDeliverOrder(showOrderDetail); setShowOrderDetail(null); }}
                    className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-green-500/15"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Entregar Comanda
                  </button>
                )}
                <div className="p-3 bg-muted/40 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Asentar Novedad / Incidente (Opcional)</label>
                    <select
                      value={waiterNovedadType}
                      onChange={e => setWaiterNovedadType(e.target.value as any)}
                      className="bg-card p-1 rounded text-[9px] font-bold outline-none"
                    >
                      <option value="incidente">⚠️ Incidente</option>
                      <option value="reclamo">🗣️ Reclamo</option>
                      <option value="rotura">💥 Rotura</option>
                      <option value="error_cocina">🍳 Cocina</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={waiterNovedad}
                    onChange={e => setWaiterNovedad(e.target.value)}
                    placeholder="Ej. Cliente se retiró / Copa rota..."
                    className="w-full p-2 bg-card border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
                <button
                  onClick={() => handleWaiterFinalizeTable(showOrderDetail)}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-red-600/15"
                >
                  Finalizar Turno Mesa &amp; Liberar
                </button>
              </div>
            )}

            <button
              onClick={() => { setShowOrderDetail(null); setWaiterNovedad(''); }}
              className="w-full py-2.5 bg-muted hover:bg-muted/80 rounded-xl text-xs font-bold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-card border border-border rounded-3xl min-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">

        {/* Success Toast */}
        {sendSuccess && (
          <div className="absolute top-4 left-4 right-4 z-40 p-3 bg-green-500 text-white rounded-2xl flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="text-xs font-bold">¡Comanda enviada a cocina exitosamente!</span>
          </div>
        )}

        {/* Mobile Top Appbar */}
        <div className="p-4 bg-muted/60 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm block leading-tight">{user?.name || 'Mozo'}</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{user?.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-green-500/15 text-green-500 px-2 py-0.5 rounded-full font-black">
              En Turno
            </span>
            <button
              onClick={handleManualRefresh}
              className={`p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-xl transition-colors ${refreshing ? 'animate-spin text-primary' : ''}`}
              title="Actualizar pedidos"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={handleExitClick}
              className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-colors"
              title="Salir del modo mozo"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs selectors */}
        <div className="grid grid-cols-3 border-b border-border text-xs bg-card flex-shrink-0">
          <button
            onClick={() => setActiveTab('mesas')}
            className={`py-3 font-bold border-b-2 transition-all ${
              activeTab === 'mesas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Mesas ({tables.filter((t: RestaurantTable) => t.status === 'libre').length} libres)
          </button>
          <button
            onClick={() => setActiveTab('pedido')}
            className={`py-3 font-bold border-b-2 transition-all flex items-center justify-center gap-1 ${
              activeTab === 'pedido' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Comanda {selectedItems.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-white text-[9px] flex items-center justify-center">
                {selectedItems.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('mi_historial')}
            className={`py-3 font-bold border-b-2 transition-all relative ${
              activeTab === 'mi_historial' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            Mi Turno
            {activeWaiterOrders.length > 0 && (
              <span className="absolute top-2 right-3 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] flex items-center justify-center font-black">
                {activeWaiterOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab body content */}
        <div className="flex-1 p-4 overflow-y-auto">

          {/* Mesas list tab */}
          {activeTab === 'mesas' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase">Selecciona una mesa para tomar pedido</h3>
              {tables.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground space-y-2">
                  <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="font-semibold">No hay mesas configuradas</p>
                  <p className="text-[10px]">El administrador debe configurar las mesas desde Ajustes.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {tables.map((table: RestaurantTable) => {
                    const isSelected = activeTable?.id === table.id;
                    const tableOrder = getTableOrder(table);

                    return (
                      <button
                        key={table.id}
                        onClick={() => handleSelectTable(table)}
                        className={`p-3 rounded-2xl border text-center flex flex-col justify-between items-center h-24 transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/30'
                            : statusColor(table.status)
                        }`}
                      >
                        <span className="text-xs font-black">Mesa {table.number}</span>
                        <span className="text-[9px] font-medium opacity-80">{table.zone.split(' ')[0]}</span>
                        <span className="text-[9px] font-black uppercase tracking-wider">
                          {statusLabel(table.status)}
                        </span>
                        {tableOrder && (
                          <span className="text-[8px] font-bold opacity-70">#{tableOrder.orderNumber}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Create comanda order tab */}
          {activeTab === 'pedido' && (
            <div className="space-y-4">
              {activeTable ? (
                <>
                  <div className="flex justify-between items-center bg-primary/5 border border-primary/20 p-3 rounded-xl">
                    <span className="text-xs font-bold">Mesa seleccionada: <span className="text-primary font-black">Mesa {activeTable.number}</span></span>
                    <button onClick={() => { setActiveTable(null); setSelectedItems([]); }} className="text-xs text-red-500 font-bold hover:underline">Cambiar</button>
                  </div>

                  {/* Show existing order for this table if any */}
                  {(() => {
                    const existingOrder = getTableOrder(activeTable);
                    if (existingOrder && existingOrder.items.length > 0) {
                      return (
                        <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-amber-500 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              Pedido activo #{existingOrder.orderNumber}
                            </p>
                            <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                              existingOrder.status === 'pendiente' ? 'bg-orange-500/10 text-orange-500' :
                              existingOrder.status === 'preparando' ? 'bg-blue-500/10 text-blue-500' :
                              existingOrder.status === 'listo' ? 'bg-emerald-500/10 text-emerald-500' :
                              'bg-muted text-muted-foreground'
                            }`}>{existingOrder.status}</span>
                          </div>
                          <div className="space-y-1">
                            {existingOrder.items.map(item => (
                              <div key={item.id} className="text-[10px] flex justify-between text-muted-foreground">
                                <span className="font-semibold">{item.product.name}</span>
                                <span className="font-black">x{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                          <p className="text-[10px] text-amber-600 font-semibold">
                            Para modificar, agrega ítems y presiona "Enviar a Cocina" (reemplaza el pedido actual).
                          </p>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </>
              ) : (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-500 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Por favor, selecciona primero una mesa en la pestaña "Mesas".</span>
                </div>
              )}

              {activeTable && (
                <div className="space-y-4">
                  {/* Menu quick selector */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5" /> Carta / Productos
                    </h4>
                    {activeProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No hay productos disponibles.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                        {activeProducts.map((p: Product) => {
                          const isOutOfStock = p.currentStock <= p.stockCritical && p.currentStock !== 999;
                          return (
                            <button
                              key={p.id}
                              disabled={isOutOfStock}
                              onClick={() => handleSelectItem(p)}
                              className="p-2 border border-border bg-card rounded-xl text-left text-xs hover:border-primary transition-all flex flex-col justify-between min-h-16 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="font-bold truncate w-full">{p.name}</span>
                              {isOutOfStock && <span className="text-[9px] text-red-500 font-bold">Sin stock</span>}
                              <span className="font-black text-primary mt-1">${p.salePrice.toLocaleString('es-AR')}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Items in comanda list */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase">Items en comanda</h4>
                    {selectedItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">No hay items seleccionados.</p>
                    ) : (
                      <div className="space-y-2">
                        {selectedItems.map(item => (
                          <div key={item.product.id} className="p-3 bg-muted/40 rounded-xl border border-border flex justify-between items-center text-xs">
                            <div className="flex-1 min-w-0 pr-2">
                              <p className="font-bold truncate">{item.product.name}</p>
                              <input
                                type="text"
                                placeholder="Observación (ej: Sin cebolla)"
                                value={item.notes}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setSelectedItems(selectedItems.map(si =>
                                    si.product.id === item.product.id ? { ...si, notes: val } : si
                                  ));
                                }}
                                className="w-full bg-transparent text-[10px] text-primary focus:outline-none border-b border-border mt-1"
                              />
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button onClick={() => updateItemQty(item.product.id, -1)} className="w-6 h-6 rounded-lg bg-muted hover:bg-red-500/10 hover:text-red-500 flex items-center justify-center font-bold transition-colors">-</button>
                              <span className="font-bold w-5 text-center">{item.quantity}</span>
                              <button onClick={() => updateItemQty(item.product.id, 1)} className="w-6 h-6 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary flex items-center justify-center font-bold transition-colors">+</button>
                            </div>
                          </div>
                        ))}

                        {/* Subtotal */}
                        <div className="flex justify-between items-center p-3 bg-primary/5 border border-primary/10 rounded-xl">
                          <span className="text-xs font-bold text-muted-foreground">Total comanda:</span>
                          <span className="text-sm font-extrabold text-primary">${totalOrderPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="space-y-2">
                    <button
                      onClick={handleSendToKitchen}
                      disabled={selectedItems.length === 0 || !activeTable}
                      className="w-full py-3.5 text-xs font-bold text-white gradient-bg rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="w-4 h-4" />
                      Enviar a Cocina ({selectedItems.length} items)
                    </button>
                    {selectedItems.length > 0 && activeTable && (
                      <button
                        onClick={() => {
                          if (!qrPaymentImage) {
                            alert('No se puede cobrar con QR. No hay una imagen de QR configurada en los ajustes del sistema. Por favor cobra este pedido en la Caja.');
                            return;
                          }
                          setShowQrPaymentModal(true);
                        }}
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/15"
                      >
                        <QrCode className="w-4 h-4" />
                        Cobrar con QR (${totalOrderPrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Waiter Shift Stats History tab */}
          {activeTab === 'mi_historial' && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase">Mi Rendimiento de Hoy</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-muted/50 rounded-2xl border border-border text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Comandas</span>
                  <span className="text-xl font-extrabold text-foreground">{waiterStats.ordersSent}</span>
                </div>
                <div className="p-4 bg-muted/50 rounded-2xl border border-border text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Mesas Servidas</span>
                  <span className="text-xl font-extrabold text-foreground">{waiterStats.tablesServed}</span>
                </div>
              </div>

              {/* Active orders panel */}
              {activeWaiterOrders.length > 0 && (
                <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/20">
                  <h4 className="text-xs font-extrabold mb-3 flex items-center gap-1.5 text-orange-500">
                    <Clock className="w-4 h-4" /> Pedidos Activos ({activeWaiterOrders.length})
                  </h4>
                  <div className="space-y-2">
                    {activeWaiterOrders.map((o: Order) => (
                      <div key={o.id} className="flex items-center justify-between text-xs p-2.5 bg-card rounded-xl border border-border">
                        <div>
                          <p className="font-bold text-sm">#{o.orderNumber} <span className="text-xs text-muted-foreground font-normal">· {o.tableName}</span></p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right flex flex-col items-end">
                            <p className="font-extrabold text-primary">${o.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full mt-0.5 ${
                              o.status === 'preparando' ? 'bg-blue-500/10 text-blue-500' :
                              o.status === 'listo' ? 'bg-emerald-500/10 text-emerald-500' :
                              'bg-orange-500/10 text-orange-500'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                          {o.status === 'listo' && (
                            <button
                              onClick={(e) => handleDeliverOrder(o, e)}
                              className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold text-[10px] shadow-sm flex items-center gap-1 transition-colors"
                            >
                              <CheckCircle2 className="w-3 h-3" /> Entregar
                            </button>
                          )}
                          <button
                            onClick={() => setShowOrderDetail(o)}
                            className="p-1.5 bg-muted hover:bg-primary/10 hover:text-primary rounded-lg transition-colors ml-1"
                            title="Ver detalles"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                <h4 className="text-xs font-extrabold mb-3 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" /> Mis Comandas Recientes
                </h4>
                {waiterOrders.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No hay comandas registradas aún.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {waiterOrders.slice(0, 10).map((o: Order) => (
                      <div key={o.id} className="flex items-center justify-between text-xs p-2.5 bg-card rounded-xl border border-border">
                        <div>
                          <p className="font-bold text-sm">#{o.orderNumber} <span className="text-xs text-muted-foreground font-normal">· {o.tableName}</span></p>
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-extrabold text-primary">${o.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                              o.status === 'entregado' ? 'bg-green-500/10 text-green-500' :
                              o.status === 'preparando' ? 'bg-blue-500/10 text-blue-500' :
                              o.status === 'listo' ? 'bg-emerald-500/10 text-emerald-500' :
                              'bg-orange-500/10 text-orange-500'
                            }`}>
                              {o.status}
                            </span>
                          </div>
                          <button
                            onClick={() => setShowOrderDetail(o)}
                            className="p-1.5 bg-muted hover:bg-primary/10 hover:text-primary rounded-lg transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-muted/50 rounded-2xl border border-border">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-bold">Total facturado (cobrado):</span>
                  <span className="font-extrabold text-green-500">${waiterStats.salesCollected.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

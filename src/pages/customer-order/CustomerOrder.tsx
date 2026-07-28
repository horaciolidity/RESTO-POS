import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Plus, Minus, Trash2, CheckCircle2, ChefHat, Search, Smartphone, Bell, UtensilsCrossed } from 'lucide-react';
import { useInventoryStore, Product } from '../../store/useInventoryStore';
import { useOrdersStore } from '../../store/useOrdersStore';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { tablesService } from '../../services/tablesService';
import { productsService } from '../../services/productsService';
import { tableCallService } from '../../services/tableCallService';
import { ordersService } from '../../services/ordersService';

interface CartItem {
  product: Product;
  quantity: number;
  notes: string;
}

interface LocalCategory {
  id: string;
  name: string;
}

/** Maps a raw Supabase product row (snake_case) to the frontend Product shape (camelCase) */
function mapDbProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    code: p.code || '',
    sku: p.sku || '',
    categoryId: p.category_id || '',
    categoryName: p.categories?.name || 'Varios',
    costPrice: Number(p.cost_price ?? 0),
    salePrice: Number(p.sale_price ?? 0),
    taxRate: Number(p.tax_rate ?? 0),
    imageUrl: p.image_url || '',
    description: p.description || '',
    type: p.type ?? 'producto',
    active: p.active ?? true,
    stockMin: p.stock_min ?? 0,
    stockCritical: p.stock_critical ?? 0,
    currentStock: p.current_stock ?? 999,
  };
}

export default function CustomerOrder() {
  const { tableToken } = useParams<{ tableToken: string }>();

  // Local state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'menu' | 'cart' | 'success'>('menu');
  const [tableInfo, setTableInfo] = useState<{
    number: number;
    zone: string;
    id?: string;
    branchId?: string;
    tenantId?: string;
    qrToken?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localCategories, setLocalCategories] = useState<LocalCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [callState, setCallState] = useState<'idle' | 'calling' | 'confirmed'>('idle');
  const [waiterName, setWaiterName] = useState<string>('');
  const [submittedOrder, setSubmittedOrder] = useState<CartItem[]>([]);
  const [activeOrder, setActiveOrder] = useState<any | null>(null);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const channelRef = useRef<any>(null);

  const fetchActiveOrder = async (currentOrderId: string) => {
    try {
      if (isSupabaseConfigured()) {
        const order = await ordersService.getById(currentOrderId);
        if (order && !order.paid && order.status !== 'cancelado') {
          setActiveOrder({
            id: order.id,
            orderNumber: order.order_number,
            status: order.status,
            total: Number(order.total),
            items: (order.order_items || []).map((oi: any) => ({
              productName: oi.product_name || oi.product?.name || 'Producto',
              quantity: oi.quantity,
              price: Number(oi.unit_price),
              notes: oi.notes || ''
            }))
          });
        } else {
          setActiveOrder(null);
        }
      } else {
        // Demo mode fallback using Zustand orders
        const { orders } = useOrdersStore.getState();
        const order = orders.find(o => o.id === currentOrderId && !o.paid && o.status !== 'cancelado');
        if (order) {
          setActiveOrder({
            id: order.id,
            orderNumber: order.orderNumber,
            status: order.status,
            total: order.total,
            items: order.items.map(oi => ({
              productName: oi.product.name,
              quantity: oi.quantity,
              price: oi.price,
              notes: oi.notes || ''
            }))
          });
        } else {
          setActiveOrder(null);
        }
      }
    } catch (err) {
      console.error('Error fetching active order:', err);
    }
  };

  const disconnectChannel = () => {
    if (channelRef.current) {
      if ((channelRef.current as any).__timeout) {
        clearTimeout((channelRef.current as any).__timeout);
      }
      if (typeof channelRef.current.unsubscribe === 'function') {
        channelRef.current.unsubscribe();
      } else if (typeof channelRef.current.close === 'function') {
        channelRef.current.close();
      }
      channelRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      disconnectChannel();
    };
  }, []);

  const handleCallWaiter = async () => {
    if (!tableInfo || !tableToken || callState !== 'idle') return;
    setCallState('calling');

    await tableCallService.callWaiter({
      tableToken: tableInfo.qrToken || tableToken || '',
      tableNumber: tableInfo.number,
      tableId: tableInfo.id || '',
      branchId: tableInfo.branchId || 'demo-branch',
    });

    const channel = tableCallService.subscribeToConfirmations(
      tableInfo.branchId || 'demo-branch',
      tableInfo.qrToken || tableToken || '',
      (event: any) => {
        setWaiterName(event.waiterName);
        setCallState('confirmed');
        disconnectChannel();
      }
    );
    channelRef.current = channel;

    const timeoutId = setTimeout(() => {
      disconnectChannel();
    }, 2 * 60 * 1000);

    (channelRef.current as any).__timeout = timeoutId;
  };

  // Fall back to Zustand in demo mode
  const { products: localProducts, categories } = useInventoryStore();
  const { tables } = useOrdersStore();

  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);
      try {
        if (isSupabaseConfigured() && tableToken) {
          // Real mode: fetch table first, then products filtered by that branch
          const tableData = await tablesService.getByQrToken(tableToken);
          if (tableData) {
            setTableInfo({
              number: tableData.number,
              zone: tableData.zone,
              id: tableData.id,
              branchId: tableData.branch_id,
              tenantId: tableData.tenant_id,
              qrToken: tableToken,
            });
            // Fetch products scoped to this branch
            const productsData = await productsService.getPublicMenu(tableData.branch_id);
            const mapped = productsData.map(mapDbProduct);
            setProducts(mapped);
            // Build category list directly from product data (no auth required)
            const catMap = new Map<string, string>();
            productsData.forEach((p: any) => {
              if (p.category_id && p.categories?.name) {
                catMap.set(p.category_id, p.categories.name);
              }
            });
            setLocalCategories(Array.from(catMap.entries()).map(([id, name]) => ({ id, name })));

            // Fetch initial active order if exists
            if (tableData.current_order_id) {
              await fetchActiveOrder(tableData.current_order_id);
            }
          } else {
            setError('Mesa no encontrada. Verificá el código QR.');
          }
        } else {
          // Demo mode: parse token as "table-{number}"
          const tableNum = parseInt(tableToken?.replace('table-', '') || '1');
          const t = tables.find(t => t.number === tableNum) || tables[0];
          if (t) {
            setTableInfo({ number: t.number, zone: t.zone, id: t.id, qrToken: tableToken });
            if (t.currentOrderId) {
              await fetchActiveOrder(t.currentOrderId);
            }
          }
          const demoProducts = localProducts.filter(p => p.active && p.type !== 'insumo');
          setProducts(demoProducts);
          setLocalCategories(categories.map(c => ({ id: c.id, name: c.name })));
        }
      } catch (err) {
        console.error('Error initialization:', err);
        setError('Error al cargar la información. Intentá de nuevo.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [tableToken]);

  // Realtime subscriptions for Table and Active Order updates
  useEffect(() => {
    if (!tableInfo?.id || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`table-status-customer-${tableInfo.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'restaurant_tables',
        filter: `id=eq.${tableInfo.id}`
      }, async (payload: any) => {
        const newTable = payload.new;
        if (newTable.current_order_id) {
          await fetchActiveOrder(newTable.current_order_id);
        } else {
          setActiveOrder(null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableInfo?.id]);

  useEffect(() => {
    if (!activeOrder?.id || !isSupabaseConfigured()) return;

    const channel = supabase
      .channel(`order-status-customer-${activeOrder.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${activeOrder.id}`
      }, async (payload: any) => {
        const updatedOrder = payload.new;
        if (updatedOrder.paid || updatedOrder.status === 'cancelado') {
          setActiveOrder(null);
        } else {
          setActiveOrder((prev: any) => prev ? { ...prev, status: updatedOrder.status } : null);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id]);

  // Sync demo mode order state via Zustand tables changes
  useEffect(() => {
    if (isSupabaseConfigured() || !tableInfo) return;
    const t = tables.find(tab => tab.id === tableInfo.id);
    if (t?.currentOrderId) {
      fetchActiveOrder(t.currentOrderId);
    } else {
      setActiveOrder(null);
    }
  }, [tables, tableInfo]);

  // ── Cart Helpers ──
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1, notes: '' }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev
      .map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0)
    );
  };

  const removeItem = (productId: string) => setCart(prev => prev.filter(i => i.product.id !== productId));

  const total = cart.reduce((acc, i) => acc + i.product.salePrice * i.quantity, 0);
  const cartCount = cart.reduce((acc, i) => acc + i.quantity, 0);

  const filteredProducts = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = selectedCategory ? p.categoryId === selectedCategory : true;
    return matchSearch && matchCat;
  });

  const handleSubmitOrder = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);

    try {
      // Ephemeral mock IDs to avoid database order creation
      const createdOrderId = `temp-qr-${Date.now()}`;
      const createdOrderNumber = `QR-${Math.floor(1000 + Math.random() * 9000)}`;

      // Notify waiter via Realtime (Supabase) or BroadcastChannel (demo)
      if (tableInfo) {
        await tableCallService.notifyCustomerOrder({
          tableToken: tableInfo.qrToken || tableToken || '',
          tableNumber: tableInfo.number,
          tableId: tableInfo.id || '',
          branchId: tableInfo.branchId || 'demo-branch',
          orderId: createdOrderId,
          orderNumber: createdOrderNumber,
          items: cart.map(i => ({
            productId: i.product.id,
            productName: i.product.name,
            quantity: i.quantity,
            unitPrice: i.product.salePrice,
            notes: i.notes,
          })),
        });
      }

      setSubmittedOrder([...cart]);
      setCart([]);
      setActiveView('success');
    } catch (err) {
      console.error('Error submitting order:', err);
      alert('Hubo un error al enviar el pedido. Por favor intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <span className="text-red-500 font-black text-2xl">!</span>
          </div>
          <p className="text-foreground font-bold">{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <ChefHat className="w-12 h-12 text-primary mx-auto animate-bounce" />
          <p className="text-muted-foreground text-sm font-semibold">Cargando el menú...</p>
        </div>
      </div>
    );
  }

  if (activeOrder && !showMenu) {
    const orderItems = activeOrder.items || [];
    return (
      <div className="min-h-screen bg-background text-foreground pb-8">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              <span className="font-black text-base">MesaHub</span>
            </div>
            {tableInfo && (
              <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Mesa {tableInfo.number} · {tableInfo.zone}</p>
            )}
          </div>
          <span className="bg-emerald-500/10 text-emerald-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-500/30">
            Pedido Confirmado
          </span>
        </div>

        <div className="p-4 space-y-4 max-w-md mx-auto">
          {/* Active order banner */}
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center mx-auto animate-pulse">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">Pedido Activo #{activeOrder.orderNumber}</h2>
              <p className="text-muted-foreground text-xs mt-1">
                Estado actual: <span className="font-black text-primary uppercase">{activeOrder.status}</span>
              </p>
            </div>
          </div>

          {/* Items summary */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Productos en Preparación</p>
              <span className="text-xs font-black text-primary">${activeOrder.total.toFixed(2)}</span>
            </div>
            <div className="divide-y divide-border">
              {orderItems.map((item: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0 pr-2">
                    <p className="font-bold text-sm truncate">{item.productName}</p>
                    {item.notes && <p className="text-[10px] text-primary italic">{item.notes}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-sm">x{item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waiter Call Status Flow */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">¿Necesitás algo más?</p>

            {callState === 'idle' && (
              <button
                onClick={handleCallWaiter}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Bell className="w-4 h-4 animate-bounce" /> Llamar al Mozo
              </button>
            )}

            {callState === 'calling' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-2xl space-y-2">
                <div className="flex items-center justify-center gap-2 font-bold text-sm">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                  Llamando al mozo...
                </div>
                <p className="text-[10px] opacity-85 text-center">Esperando confirmación.</p>
              </div>
            )}

            {callState === 'confirmed' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ¡Llamada Confirmada!
                </div>
                <p className="text-[11px] font-medium text-center">
                  El mozo está en camino a tu mesa.
                </p>
                <button onClick={() => setCallState('idle')} className="w-full text-[10px] text-emerald-700 font-bold mt-1 hover:underline">
                  Volver a llamar
                </button>
              </div>
            )}
          </div>

          {/* Add more items / menu button */}
          <button
            onClick={() => setShowMenu(true)}
            className="w-full py-3.5 bg-primary text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Hacer otro pedido
          </button>
        </div>
      </div>
    );
  }

  if (activeView === 'success') {
    const submittedTotal = submittedOrder.reduce((acc, i) => acc + i.product.salePrice * i.quantity, 0);
    return (
      <div className="min-h-screen bg-background text-foreground pb-8">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            <span className="font-black text-base">MesaHub</span>
          </div>
          {tableInfo && (
            <p className="text-[11px] text-muted-foreground font-semibold mt-0.5">Mesa {tableInfo.number} · {tableInfo.zone}</p>
          )}
        </div>

        <div className="p-4 space-y-4 max-w-md mx-auto">
          {/* Success banner */}
          <div className="text-center space-y-3 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto">
              <UtensilsCrossed className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">¡Pre-pedido Enviado!</h2>
              <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                El mozo confirmará y enviará tu pedido a cocina.
              </p>
            </div>
          </div>

          {/* Submitted order summary */}
          {submittedOrder.length > 0 && (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Tu pedido</p>
                <span className="text-xs font-black text-primary">${submittedTotal.toFixed(2)}</span>
              </div>
              <div className="divide-y divide-border">
                {submittedOrder.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 px-4 py-2.5">
                    <img
                      src={item.product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60&auto=format&fit=crop'}
                      alt={item.product.name}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                      onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=60&auto=format&fit=crop'; }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.product.name}</p>
                      {item.notes && <p className="text-[10px] text-primary italic">{item.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-black text-sm">x{item.quantity}</p>
                      <p className="text-[10px] text-muted-foreground">${(item.product.salePrice * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status notice */}
          <div className="p-3 bg-card border border-border rounded-2xl flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-primary shrink-0" />
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Tus platos no irán a cocina hasta que el mozo confirme y envíe la comanda definitiva.
            </p>
          </div>

          {/* Waiter Call Status Flow — always available */}
          <div className="space-y-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">¿Necesitás al mozo?</p>

            {callState === 'idle' && (
              <button
                onClick={handleCallWaiter}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Bell className="w-4 h-4 animate-bounce" /> Llamar al Mozo
              </button>
            )}

            {callState === 'calling' && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-600 rounded-2xl space-y-2">
                <div className="flex items-center justify-center gap-2 font-bold text-sm">
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
                  Llamando al mozo...
                </div>
                <p className="text-[10px] opacity-85 text-center">Esperando que el mozo confirme tu llamada.</p>
              </div>
            )}

            {callState === 'confirmed' && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-center gap-1.5 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ¡Llamada Confirmada!
                </div>
                <p className="text-[11px] font-medium text-center">
                  {waiterName ? `Mozo (${waiterName}) en camino.` : 'El mozo está en camino a tu mesa.'}
                </p>
                <button
                  onClick={() => setCallState('idle')}
                  className="w-full text-[10px] text-emerald-700 font-bold mt-1 hover:underline"
                >
                  Volver a llamar si necesitás
                </button>
              </div>
            )}
          </div>

          {/* Add more items */}
          <button
            onClick={() => {
              disconnectChannel();
              setCallState('idle');
              setWaiterName('');
              setCart([]);
              setActiveView('menu');
            }}
            className="w-full py-3.5 bg-primary text-white font-black text-sm rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Agregar más al pedido
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border px-4 pt-safe">
        {/* Header */}
        <div className="flex items-center justify-between py-4">
          <div>
            <div className="flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              <span className="font-black text-base">MesaHub</span>
            </div>
            {tableInfo && (
              <p className="text-[11px] text-muted-foreground font-semibold">Mesa {tableInfo.number} · {tableInfo.zone}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeOrder && (
              <button
                onClick={() => setShowMenu(false)}
                className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 text-[10px] font-black px-2.5 py-1.5 rounded-xl border border-emerald-500/20 flex items-center gap-1 transition-all"
              >
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                Pedido Activo: #{activeOrder.orderNumber}
              </button>
            )}
            <button
              onClick={() => setActiveView('cart')}
              className="relative p-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative pb-3">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar en el menú..."
            className="w-full pl-9 pr-4 py-2 bg-muted rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Category filters — built from actual DB products, no auth needed */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
              !selectedCategory ? 'bg-primary text-white border-primary' : 'bg-muted border-border text-muted-foreground'
            }`}
          >
            Todos
          </button>
          {localCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${
                selectedCategory === cat.id ? 'bg-primary text-white border-primary' : 'bg-muted border-border text-muted-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* No products fallback */}
      {activeView === 'menu' && products.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
          <ChefHat className="w-16 h-16 text-muted-foreground/30" />
          <p className="font-bold text-muted-foreground">El menú no está disponible en este momento.</p>
          <p className="text-xs text-muted-foreground/70">Por favor consultá con el personal del local.</p>
        </div>
      )}

      {/* Menu Grid - Card View */}
      {activeView === 'menu' && products.length > 0 && (
        <div className="p-4 grid grid-cols-2 gap-3">
          {filteredProducts.length === 0 && (
            <div className="col-span-2 text-center py-12 text-muted-foreground text-sm">
              Sin resultados para &quot;{searchQuery}&quot;
            </div>
          )}
          {filteredProducts.map(product => {
            const inCart = cart.find(i => i.product.id === product.id);
            const outOfStock = product.currentStock <= product.stockCritical && product.type !== 'combo';
            return (
              <div
                key={product.id}
                className={`bg-card border rounded-2xl overflow-hidden flex flex-col ${outOfStock ? 'opacity-50 border-red-500/20' : 'border-border'}`}
              >
                <div className="relative h-28 bg-muted overflow-hidden">
                  <img
                    src={product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop'}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&auto=format&fit=crop'; }}
                  />
                  {outOfStock && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-[10px] font-black">SIN STOCK</span>
                    </div>
                  )}
                </div>
                <div className="p-2.5 flex-1 flex flex-col justify-between gap-2">
                  <div>
                    <p className="font-bold text-xs leading-snug">{product.name}</p>
                    {product.description && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>
                    )}
                    <p className="text-primary font-black text-sm mt-0.5">${product.salePrice.toFixed(2)}</p>
                  </div>
                  {!outOfStock && (
                    inCart ? (
                      <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-xl px-2 py-1">
                        <button onClick={() => updateQty(product.id, -1)} className="text-primary p-0.5"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-primary font-black text-sm">{inCart.quantity}</span>
                        <button onClick={() => updateQty(product.id, 1)} className="text-primary p-0.5"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(product)}
                        className="w-full py-1.5 bg-primary text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cart View */}
      {activeView === 'cart' && (
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black">Tu Pedido</h2>
            <button onClick={() => setActiveView('menu')} className="text-xs text-primary font-bold">← Volver al menú</button>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground space-y-3">
              <ShoppingCart className="w-12 h-12 mx-auto opacity-30" />
              <p className="font-semibold">Tu carrito está vacío</p>
              <button onClick={() => setActiveView('menu')} className="text-primary font-bold text-sm">Ver el menú</button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-card border border-border rounded-2xl">
                    <img
                      src={item.product.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=100&auto=format&fit=crop'}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{item.product.name}</p>
                      <p className="text-primary font-black text-sm">${(item.product.salePrice * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-muted rounded-xl px-2 py-1">
                      <button onClick={() => updateQty(item.product.id, -1)} className="text-muted-foreground"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="font-black text-sm w-5 text-center">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, 1)} className="text-primary"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <button onClick={() => removeItem(item.product.id)} className="text-muted-foreground hover:text-red-500 p-1 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Waiter confirmation notice */}
              <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-2">
                <Smartphone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-600 font-semibold leading-relaxed">
                  Tu pedido será revisado por el mozo antes de enviarse a cocina.
                </p>
              </div>

              {/* Total */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-sm">Total del Pedido</span>
                <span className="text-xl font-black text-primary">${total.toFixed(2)}</span>
              </div>

              <button
                onClick={handleSubmitOrder}
                disabled={submitting}
                className="w-full py-4 bg-primary text-white font-black text-base rounded-2xl shadow-xl shadow-primary/30 hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? 'Enviando...' : '🍽️ Confirmar Pedido'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Bottom Cart Bar when on menu view */}
      {activeView === 'menu' && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-sm border-t border-border">
          <button
            onClick={() => setActiveView('cart')}
            className="w-full py-3.5 bg-primary text-white font-black rounded-2xl shadow-xl shadow-primary/30 flex items-center justify-between px-5"
          >
            <span className="bg-white/20 rounded-xl px-2.5 py-0.5 text-sm">{cartCount}</span>
            <span>Ver mi pedido</span>
            <span className="font-black">${total.toFixed(2)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

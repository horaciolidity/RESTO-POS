import { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Percent,
  CheckCircle2,
  DollarSign,
  Printer,
  X,
  CreditCard,
  QrCode,
  Sparkles,
  Layers,
  Clock
} from 'lucide-react';
import { useInventoryStore, Product } from '../../store/useInventoryStore';
import { useCartStore } from '../../store/useCartStore';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useCashStore } from '../../store/useCashStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../services/supabase';

export default function POS() {
  const { products, categories } = useInventoryStore();
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    discount,
    setDiscount,
    tips,
    setTips,
    paymentMethod,
    setPaymentMethod,
    orderType,
    setOrderType,
    selectedTableId,
    setSelectedTableId,
    orderNote,
    setOrderNote,
    clearCart,
    totals,
    setLastCompletedOrder
  } = useCartStore();
  const { addOrder, tables, updateTableStatus, orders, closeOrder } = useOrdersStore();
  const { currentSession, addMovement } = useCashStore();

  const [isUnpaidOrdersOpen, setIsUnpaidOrdersOpen] = useState(false);
  const [activeOrderIdBeingPaid, setActiveOrderIdBeingPaid] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [lastOrderDetails, setLastOrderDetails] = useState<any>(null);
  const [ticketType, setTicketType] = useState<'fiscal' | 'comanda'>('fiscal');
  const [qrPaymentImage, setQrPaymentImage] = useState('');
  const { user } = useAuthStore();

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
  
  // Custom modifiers state
  const [selectedProductForNotes, setSelectedProductForNotes] = useState<Product | null>(null);
  const [itemNote, setItemNote] = useState('');

  // Box restriction check
  if (!currentSession || currentSession.status === 'closed') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
        <div className="p-4 rounded-full bg-red-500/10 text-red-500 border border-red-500/20">
          <DollarSign className="w-12 h-12" />
        </div>
        <div className="text-center max-w-md space-y-2">
          <h3 className="text-xl font-bold">Turno de Caja Cerrado</h3>
          <p className="text-muted-foreground text-xs leading-relaxed">
            Para realizar ventas e ingresar cobros en el sistema POS, primero debes abrir el turno de caja diario registrando el saldo inicial.
          </p>
        </div>
        <a href="/cash" className="px-5 py-3 font-bold text-white gradient-bg rounded-xl shadow-lg shadow-primary/20 text-xs">
          Ir a Apertura de Caja
        </a>
      </div>
    );
  }

  // Filter items
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory ? p.categoryId === selectedCategory : true;
    return matchesSearch && matchesCategory && p.active && p.type !== 'insumo';
  });

  const { subtotal, discountAmount, total } = totals();

  const handleOpenNoteModal = (product: Product) => {
    const existing = items.find(item => item.product.id === product.id);
    setItemNote(existing?.notes || '');
    setSelectedProductForNotes(product);
  };

  const handleSaveNote = () => {
    if (selectedProductForNotes) {
      addItem(selectedProductForNotes, 0, itemNote);
      setSelectedProductForNotes(null);
      setItemNote('');
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;
    setIsCheckoutOpen(true);
  };

  const submitOrder = async () => {
    const tableInfo = selectedTableId ? tables.find(t => t.id === selectedTableId) : null;
    const tableName = tableInfo ? `${tableInfo.zone} - Mesa ${tableInfo.number}` : undefined;

    const orderData = {
      source: 'mesas' as const,
      status: 'entregado' as const,
      items: items.map(item => ({
        id: `oi-${Date.now()}-${item.product.id}`,
        product: item.product,
        quantity: item.quantity,
        price: item.product.salePrice,
        notes: item.notes
      })),
      subtotal,
      discount,
      tips,
      total,
      paymentMethod,
      orderType: 'salon' as const,
      tableName: tableName || (activeOrderIdBeingPaid ? orders.find(o => o.id === activeOrderIdBeingPaid)?.tableName : undefined),
      orderNote,
      paid: true
    };

    let orderId = '';
    if (activeOrderIdBeingPaid) {
      // 1. Update existing order in Supabase
      await addOrder(orderData as any, activeOrderIdBeingPaid);
      // 2. Close and mark order as paid
      await closeOrder(activeOrderIdBeingPaid, paymentMethod);
      orderId = activeOrderIdBeingPaid;
      setActiveOrderIdBeingPaid(null);
    } else {
      // Create new order
      orderId = await addOrder(orderData as any);
    }

    if (selectedTableId) {
      // Free the table in store & Supabase
      await updateTableStatus(selectedTableId, 'libre');
    }

    // Add transaction amount directly to current cash sessions
    const desc = activeOrderIdBeingPaid 
      ? `Cobro Comanda (Mesa ${tableName || 'S/M'}) (Pedido #${orderId.slice(-4)})`
      : `Venta Directa POS (Pedido #${orderId.slice(-4)})`;
    if (paymentMethod === 'efectivo') {
      addMovement('ingreso', total, desc, user?.branchId || 'default');
    }

    setLastOrderDetails({
      id: orderId,
      orderNumber: orderId.slice(-4),
      items: [...items],
      subtotal,
      discountAmount,
      tips,
      total,
      paymentMethod,
      orderType,
      orderNote,
      time: new Date().toLocaleTimeString()
    });

    // Update customer display
    const orderNumber = orderId.slice(-4);
    setLastCompletedOrder(orderNumber);
    // Clear customer display after 15 seconds
    setTimeout(() => {
      // only clear if it's still this order
      const currentLast = useCartStore.getState().lastCompletedOrder;
      if (currentLast === orderNumber) {
        useCartStore.getState().setLastCompletedOrder(null);
      }
    }, 15000);

    // Reset UI
    clearCart();
    setIsCheckoutOpen(false);
    setIsReceiptOpen(true);
  };


  return (
    <div className="h-[calc(100vh-110px)] flex flex-col">
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 relative min-h-0">
        
        {/* Left panel: Catalog grid & filters */}
        <div className="lg:col-span-8 flex flex-col space-y-4 h-full min-h-0">
          {/* Search bar & Category filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar producto por nombre o código de barra..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none placeholder:text-muted-foreground/60 transition-all"
            />
          </div>
          <button
            onClick={() => setIsUnpaidOrdersOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0"
          >
            <Layers className="w-4 h-4" />
            Comandas por Cobrar ({orders.filter(o => o.source === 'mesas' && !o.paid).length})
          </button>
          
          <div className="flex gap-2 overflow-x-auto pb-1.5 shrink-0 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === null
                  ? 'bg-primary text-white border-primary shadow-md shadow-primary/10'
                  : 'bg-card border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              Todos
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-white border-primary shadow-md'
                    : 'bg-card border-border hover:bg-muted text-muted-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog list */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
              <Search className="w-8 h-8" />
              <p className="text-xs">No se encontraron productos coincidentes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const isOutOfStock = p.currentStock <= p.stockCritical;
                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && addItem(p)}
                    className={`relative p-3 bg-card border rounded-2xl cursor-pointer hover:border-primary/50 transition-all select-none group flex flex-col justify-between h-44 ${
                      isOutOfStock ? 'opacity-50 cursor-not-allowed border-red-500/20' : 'border-border'
                    }`}
                  >
                    {p.imageUrl && (
                      <img 
                        src={p.imageUrl} 
                        alt={p.name} 
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-10 group-hover:scale-105 transition-transform" 
                      />
                    )}
                    
                    <div className="flex justify-between items-start gap-1 z-10">
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {p.categoryName.slice(2)}
                      </span>
                      {isOutOfStock ? (
                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-red-500 text-white">
                          Sin Stock
                        </span>
                      ) : p.currentStock <= p.stockMin ? (
                        <span className="text-[9px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-500 text-white">
                          Bajo Stock
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 z-10">
                      <h4 className="font-extrabold text-xs text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-tight">
                        {p.name}
                      </h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.code}</p>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40 z-10">
                      <span className="font-black text-sm text-foreground">
                        ${p.salePrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenNoteModal(p);
                        }}
                        className="p-1 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground"
                        title="Notas / Modificadores"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right panel: Active Cart & totals */}
      <div className="lg:col-span-4 bg-card border border-border rounded-2xl p-4 flex flex-col justify-between h-full min-h-0">
        
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm">Detalle del Pedido</h3>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary font-black">
            {items.reduce((acc, item) => acc + item.quantity, 0)} items
          </span>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2 mb-4">
          {activeOrderIdBeingPaid && (
            <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/25 text-amber-500 rounded-xl text-xs font-bold mb-2 animate-pulse">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Mesa: {orders.find(o => o.id === activeOrderIdBeingPaid)?.tableName || 'Sin Mesa'} · #{activeOrderIdBeingPaid.slice(-4)}
              </span>
              <button 
                onClick={() => {
                  setActiveOrderIdBeingPaid(null);
                  clearCart();
                }}
                className="p-1 hover:bg-amber-500/20 rounded-lg text-amber-600 transition-colors"
                title="Descartar cobro y limpiar POS"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2 h-full">
              <ShoppingCart className="w-8 h-8 opacity-40" />
              <p className="text-xs">El carrito está vacío.</p>
              <p className="text-[10px] text-muted-foreground/80 max-w-[180px] text-center">Toca los productos del catálogo de la izquierda para agregarlos.</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.product.id} className="p-3 bg-muted/40 rounded-xl space-y-2 border border-border/50">
                <div className="flex justify-between items-start">
                  <div>
                    <h5 className="font-bold text-xs leading-snug">{item.product.name}</h5>
                    <span className="text-[10px] text-primary font-black block">
                      ${item.product.salePrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })} c/u
                    </span>
                    {item.notes && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded font-medium mt-1 inline-block">
                        Nota: {item.notes}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.product.id)}
                    className="p-1 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-bold text-xs w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-muted/80"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-bold text-xs text-foreground">
                    ${(item.product.salePrice * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals & Discounts Section */}
        <div className="border-t border-border pt-3 space-y-3">
          
          {/* Discount and Tips control triggers */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-muted/40 rounded-xl flex items-center justify-between border border-border/50">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <Percent className="w-3 h-3" /> Descuento %
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={discount || ''}
                placeholder="0"
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-12 bg-transparent text-right font-black text-xs focus:outline-none focus:text-primary text-foreground"
              />
            </div>

            <div className="p-2 bg-muted/40 rounded-xl flex items-center justify-between border border-border/50">
              <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                <DollarSign className="w-3 h-3" /> Propina $
              </span>
              <input
                type="number"
                min="0"
                value={tips || ''}
                placeholder="0"
                onChange={(e) => setTips(Number(e.target.value))}
                className="w-16 bg-transparent text-right font-black text-xs focus:outline-none focus:text-primary text-foreground"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setOrderType('salon')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                  orderType === 'salon' 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                Salón
              </button>
              <button
                onClick={() => setOrderType('llevar')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                  orderType === 'llevar' 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                Para Llevar
              </button>
              <button
                onClick={() => setOrderType('delivery')}
                className={`py-1.5 px-2 rounded-lg text-[10px] font-bold border transition-colors ${
                  orderType === 'delivery' 
                    ? 'bg-primary/10 border-primary text-primary' 
                    : 'bg-muted/40 border-border/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                Delivery
              </button>
            </div>

            {orderType === 'salon' && (
              <select
                value={selectedTableId || ''}
                onChange={(e) => setSelectedTableId(e.target.value || null)}
                className="w-full h-10 text-xs bg-muted/40 border border-border/50 rounded-xl px-2 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground transition-all"
              >
                <option value="">-- Seleccionar Mesa (Opcional) --</option>
                {tables.map(t => (
                  <option key={t.id} value={t.id}>
                    Mesa {t.number} ({t.zone}) - {t.capacity} pax
                  </option>
                ))}
              </select>
            )}
            
            <textarea
              placeholder="Añadir novedad opcional al pedido..."
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              className="w-full h-12 text-xs bg-muted/40 border border-border/50 rounded-xl p-2 resize-none focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground/60 transition-all"
            />
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="font-bold">${subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-red-500">
                <span>Descuento ({discount}%)</span>
                <span className="font-bold">-${discountAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            {tips > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Propinas</span>
                <span className="font-bold">+${tips.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-sm pt-2 border-t border-border/60">
              <span className="font-extrabold">Total Cobrar</span>
              <span className="font-black text-base text-primary">${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button
            onClick={handleCheckout}
            disabled={items.length === 0}
            className="w-full py-3.5 rounded-xl text-xs font-bold text-white gradient-bg hover:opacity-90 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-4 h-4" />
            Registrar Cobro / Facturar
          </button>
        </div>
      </div>

      {/* Note / Modifiers Modal */}
      {selectedProductForNotes && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-foreground">Notas y Modificadores</h3>
              <button 
                onClick={() => setSelectedProductForNotes(null)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">Agregar comentarios especiales de cocina para: <span className="font-bold text-foreground">{selectedProductForNotes.name}</span></p>

            <textarea
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              placeholder="Ej: Sin condimento, cebolla extra, término medio..."
              className="w-full min-h-[100px] p-3 text-xs bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary focus:bg-card"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedProductForNotes(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveNote}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white gradient-bg hover:opacity-90"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Payment modal drawer */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-base">Registrar Cobro y Factura</h3>
              <button 
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Methods list */}
            <div className="space-y-4">
              <label className="text-[10px] text-muted-foreground uppercase font-bold block">Selecciona Método de Pago</label>
              
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'efectivo', label: 'Efectivo', icon: DollarSign },
                  { id: 'debito', label: 'Tarjeta Débito', icon: CreditCard },
                  { id: 'credito', label: 'Tarjeta Crédito', icon: CreditCard },
                  { id: 'qr', label: 'Código QR / Transferencia', icon: QrCode },
                  { id: 'mercado_pago', label: 'Mercado Pago', icon: CheckCircle2 },
                  { id: 'mixto', label: 'Pago Mixto (Variados)', icon: QrCode },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = paymentMethod === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setPaymentMethod(item.id)}
                      className={`flex items-center gap-3 p-3.5 border rounded-xl text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 text-primary shadow-sm shadow-primary/5'
                          : 'border-border hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-bold text-xs text-foreground">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Payment / Quick notes view */}
            {paymentMethod === 'mixto' && (
              <div className="p-3 rounded-xl bg-muted/60 border border-border space-y-2 text-xs">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Efectivo</span>
                  <input type="number" placeholder="$0.00" className="w-20 text-right bg-transparent font-bold focus:outline-none border-b border-border" />
                </div>
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Tarjeta</span>
                  <input type="number" placeholder="$0.00" className="w-20 text-right bg-transparent font-bold focus:outline-none border-b border-border" />
                </div>
              </div>
            )}

            {(paymentMethod === 'qr' || paymentMethod === 'mercado_pago') && (
              <div className="p-4 bg-muted/50 border border-border rounded-xl flex flex-col items-center gap-2">
                {qrPaymentImage ? (
                  <>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest">Escanee para Pagar</p>
                    <img src={qrPaymentImage} alt="QR de Pago" className="w-40 h-40 object-contain bg-white p-2 rounded-lg border border-border animate-fade-in" />
                  </>
                ) : (
                  <div className="text-center py-2 text-xs text-amber-500 font-bold flex flex-col items-center gap-1">
                    <QrCode className="w-8 h-8 opacity-70" />
                    <span>QR no configurado en Ajustes</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Puedes subir el QR en Ajustes &gt; General</span>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-border pt-4 text-xs space-y-2">
              <div className="flex justify-between font-black text-sm text-foreground">
                <span>Total a Cobrar</span>
                <span className="text-primary">${total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsCheckoutOpen(false)}
                className="py-3 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground"
              >
                Atrás
              </button>
              <button
                onClick={submitOrder}
                className="py-3 rounded-xl text-xs font-bold text-white gradient-bg hover:opacity-90 shadow-lg shadow-primary/20"
              >
                Confirmar Venta & Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thermal Ticket Printer Mockup Modal */}
      {isReceiptOpen && lastOrderDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-1">
                <Printer className="w-4 h-4 text-primary" /> Emitir Tickets
              </h3>
              <button 
                onClick={() => setIsReceiptOpen(false)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Ticket Type */}
            <div className="flex bg-muted p-1 rounded-xl border border-border mt-2">
              <button
                onClick={() => setTicketType('fiscal')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  ticketType === 'fiscal' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Fiscal / Cliente
              </button>
              <button
                onClick={() => setTicketType('comanda')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  ticketType === 'comanda' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Comanda Cocina
              </button>
            </div>

            {/* Thermal ticket paper container styling */}
            {ticketType === 'fiscal' ? (
              <div className="p-4 bg-white text-slate-900 border border-slate-300 shadow-sm rounded-lg font-mono text-[10px] leading-relaxed uppercase">
                <div className="text-center space-y-1 mb-3">
                  <h4 className="font-black text-xs">GASTROPOS S.A.</h4>
                  <p>Sucursal Central CABA</p>
                  <p>C.U.I.T: 30-71458924-9</p>
                  <p>IVA RESPONSABLE INSCRIPTO</p>
                  <p>---------------------------------</p>
                </div>

                <div className="space-y-0.5 mb-2">
                  <p>Ticket N°: {lastOrderDetails.orderNumber}</p>
                  <p>Fecha: {new Date().toLocaleDateString()}</p>
                  <p>Hora: {lastOrderDetails.time}</p>
                  <p>Cajero: Ana Cajera</p>
                  <p>---------------------------------</p>
                </div>

                <div className="space-y-1 mb-2">
                  <div className="grid grid-cols-12 font-bold">
                    <span className="col-span-6">PROD</span>
                    <span className="col-span-2 text-center">CANT</span>
                    <span className="col-span-4 text-right">TOTAL</span>
                  </div>
                  {lastOrderDetails.items.map((item: any) => (
                    <div key={`f-${item.product.id}`} className="grid grid-cols-12">
                      <span className="col-span-6 truncate">{item.product.name}</span>
                      <span className="col-span-2 text-center">{item.quantity}</span>
                      <span className="col-span-4 text-right">${(item.product.salePrice * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <p>---------------------------------</p>
                </div>

                <div className="space-y-0.5 text-right mb-2">
                  <p>Subtotal: ${lastOrderDetails.subtotal.toFixed(2)}</p>
                  {lastOrderDetails.discountAmount > 0 && <p>Desc ({discount}%): -${lastOrderDetails.discountAmount.toFixed(2)}</p>}
                  {lastOrderDetails.tips > 0 && <p>Propina: +${lastOrderDetails.tips.toFixed(2)}</p>}
                  <p className="font-bold text-xs">TOTAL: ${lastOrderDetails.total.toFixed(2)}</p>
                  <p>Pago: {lastOrderDetails.paymentMethod}</p>
                  <p>---------------------------------</p>
                </div>

                <div className="text-center font-bold">
                  <p>GRACIAS POR SU COMPRA!</p>
                  <p>P.O.S. FISCAL AUTOMATIZADO</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-white text-slate-900 border border-slate-300 shadow-sm rounded-lg font-mono text-[10px] leading-relaxed uppercase">
                <div className="text-center space-y-1 mb-3">
                  <h4 className="font-black text-sm border-b-2 border-slate-900 pb-1 inline-block">COMANDA DE COCINA</h4>
                </div>

                <div className="space-y-0.5 mb-3 font-bold text-xs">
                  <p className="text-sm">TICKET N°: {lastOrderDetails.orderNumber}</p>
                  <p>Hora: {lastOrderDetails.time}</p>
                  <p>Origen: P.O.S. SALON</p>
                  <p>---------------------------------</p>
                </div>

                <div className="space-y-2 mb-2">
                  <div className="grid grid-cols-12 font-extrabold border-b border-slate-900 pb-1 mb-2">
                    <span className="col-span-2 text-center text-sm">CANT</span>
                    <span className="col-span-10 text-sm">PRODUCTO</span>
                  </div>
                  {lastOrderDetails.items.map((item: any) => (
                    <div key={`c-${item.product.id}`} className="mb-2">
                      <div className="grid grid-cols-12 font-bold">
                        <span className="col-span-2 text-center text-sm">x{item.quantity}</span>
                        <span className="col-span-10 text-sm">{item.product.name}</span>
                      </div>
                      {item.notes && (
                        <div className="grid grid-cols-12">
                          <span className="col-span-2"></span>
                          <span className="col-span-10 italic">OBS: {item.notes}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  <p className="mt-4">---------------------------------</p>
                </div>

                <div className="text-center font-bold">
                  <p>** FIN DE COMANDA **</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsReceiptOpen(false)}
                className="py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  window.print();
                }}
                className="py-2.5 rounded-xl text-xs font-bold text-white gradient-bg hover:opacity-90 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                {ticketType === 'fiscal' ? 'Imprimir Comprobante' : 'Imprimir Comanda'}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>

      {/* Modal for Unpaid Orders (Comandas por Cobrar) */}
      {isUnpaidOrdersOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div>
                <h3 className="font-extrabold text-base flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Comandas por Cobrar (Mesas Liberadas / Activas)
                </h3>
                <p className="text-[11px] text-muted-foreground">Listado de comandas de salón que aún no han sido cobradas.</p>
              </div>
              <button 
                onClick={() => setIsUnpaidOrdersOpen(false)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[380px] space-y-3 pr-1 scrollbar-thin">
              {orders.filter(o => o.source === 'mesas' && !o.paid).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                  <p className="text-xs font-bold">¡Todo cobrado!</p>
                  <p className="text-[10px] text-muted-foreground/80">No hay comandas pendientes de pago en este momento.</p>
                </div>
              ) : (
                orders.filter(o => o.source === 'mesas' && !o.paid).map((order) => (
                  <div key={order.id} className="p-4 bg-muted/40 hover:bg-muted/60 border border-border/80 rounded-xl flex items-center justify-between transition-all">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded uppercase">
                          {order.tableName || 'Sin Mesa'}
                        </span>
                        <span className="text-xs font-bold text-foreground">
                          Pedido #{order.id.slice(-4)}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Mozo: <span className="text-foreground font-semibold">{order.waiterName || 'S/M'}</span> · {new Date(order.createdAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className="text-[10px] text-muted-foreground/80 max-w-[320px] truncate">
                        {order.items.map(item => `${item.product.name} x${item.quantity}`).join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">Total</span>
                        <span className="text-sm font-black text-primary">
                          ${order.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          clearCart();
                          setActiveOrderIdBeingPaid(order.id);
                          order.items.forEach(item => {
                            addItem(item.product, item.quantity, item.notes);
                          });
                          setDiscount(order.discount || 0);
                          setTips(order.tips || 0);
                          
                          const tbl = tables.find(t => `Mesa ${t.number}` === order.tableName || t.id === order.tableName);
                          if (tbl) {
                            setSelectedTableId(tbl.id);
                          }
                          setOrderType('salon');
                          setOrderNote(order.orderNote || '');
                          setIsUnpaidOrdersOpen(false);
                        }}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-colors shadow-md shadow-primary/10"
                      >
                        Cobrar en POS
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                onClick={() => setIsUnpaidOrdersOpen(false)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg text-xs font-bold text-foreground transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

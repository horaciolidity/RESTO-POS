import { useEffect, useState } from 'react';
import { ShoppingBag, Star, CheckCircle, Clock, ChefHat, Sparkles, Tv } from 'lucide-react';
import { useCartStore } from '../../store/useCartStore';
import { useOrdersStore, Order } from '../../store/useOrdersStore';

export default function CustomerBillingDisplay() {
  const { items, discount, lastCompletedOrder } = useCartStore();
  const { orders } = useOrdersStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentTotals = useCartStore.getState().totals();

  // Pending/preparing orders from the restaurant (for table view)
  const activeOrders = orders.filter((o: Order) =>
    !o.paid && (o.status === 'pendiente' || o.status === 'preparando' || o.status === 'listo')
  );

  // If there's a completed order from POS, show the goodbye screen
  if (lastCompletedOrder) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div className="w-32 h-32 rounded-full gradient-bg flex items-center justify-center shadow-[0_0_50px_rgba(239,68,68,0.5)] mb-8 animate-bounce">
          <CheckCircle className="w-16 h-16 text-white" />
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-4 tracking-tighter">¡Gracias por tu compra!</h1>
        <p className="text-2xl md:text-3xl text-slate-400 font-semibold mb-12">
          Por favor, espera a ser llamado por la pantalla.
        </p>
        <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800">
          <p className="text-sm text-slate-500 uppercase font-bold tracking-widest mb-2">Tu número de turno es el</p>
          <p className="text-6xl md:text-8xl font-black text-primary">{lastCompletedOrder}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-950 font-sans text-white overflow-hidden">
      {/* Left side: Branding + Active Table Orders */}
      <div className="hidden lg:flex flex-1 flex-col justify-between p-12 bg-slate-900 relative overflow-hidden">
        {/* Decorative glow */}
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-lg">
              <Tv className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tighter gradient-text">RESTO POS</h1>
              <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">Pantalla de Cliente</p>
            </div>
          </div>
          <p className="text-xl text-slate-400 font-semibold max-w-md">
            Estamos preparando todo para ti con la mejor calidad y servicio.
          </p>
        </div>

        {/* Active restaurant orders display */}
        <div className="relative z-10 space-y-4">
          <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-primary" /> Estado de Pedidos en Curso
          </h2>
          {activeOrders.length === 0 ? (
            <div className="p-6 rounded-3xl bg-slate-950/50 border border-white/10 backdrop-blur-md text-center">
              <Sparkles className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm font-semibold">Sin pedidos activos en este momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
              {activeOrders.map((order: Order) => (
                <div
                  key={order.id}
                  className={`p-4 rounded-2xl border backdrop-blur-md ${
                    order.status === 'listo'
                      ? 'bg-green-500/10 border-green-500/30'
                      : order.status === 'preparando'
                      ? 'bg-blue-500/10 border-blue-500/20'
                      : 'bg-slate-950/50 border-white/10'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-black text-sm">{order.tableName || `#${order.orderNumber}`}</p>
                      {order.waiterName && (
                        <p className="text-[10px] text-slate-400 font-semibold">Mozo: {order.waiterName}</p>
                      )}
                    </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                      order.status === 'listo' ? 'bg-green-500 text-white animate-pulse' :
                      order.status === 'preparando' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-orange-500/20 text-orange-400'
                    }`}>
                      {order.status === 'listo' ? '✓ Listo' :
                       order.status === 'preparando' ? 'Preparando...' : 'Pendiente'}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {order.items.slice(0, 3).map(item => (
                      <p key={item.id} className="text-[10px] text-slate-400">
                        {item.quantity}x {item.product.name}
                      </p>
                    ))}
                    {order.items.length > 3 && (
                      <p className="text-[10px] text-slate-500">+{order.items.length - 3} más...</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="relative z-10 grid grid-cols-2 gap-4">
          <div className="p-6 rounded-3xl bg-slate-950/50 border border-white/10 backdrop-blur-md">
            <Star className="w-8 h-8 text-yellow-500 mb-4" />
            <h3 className="font-bold text-lg mb-1">Calidad Premium</h3>
            <p className="text-sm text-slate-400">Ingredientes frescos todos los días.</p>
          </div>
          <div className="p-6 rounded-3xl bg-slate-950/50 border border-white/10 backdrop-blur-md">
            <ShoppingBag className="w-8 h-8 text-primary mb-4" />
            <h3 className="font-bold text-lg mb-1">Rápido y Seguro</h3>
            <p className="text-sm text-slate-400">Tu pedido listo en minutos.</p>
          </div>
        </div>
      </div>

      {/* Right side: Live Cart (POS) */}
      <div className="w-full lg:w-[450px] xl:w-[500px] flex flex-col bg-slate-950 border-l border-white/10">
        <div className="p-6 border-b border-white/10">
          <div className="flex justify-between items-center mb-1">
            <h2 className="text-2xl font-black">Tu Pedido</h2>
            <span className="text-sm text-slate-500 font-bold">{currentTime.toLocaleTimeString()}</span>
          </div>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Resumen de tu cuenta</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 opacity-50 space-y-4 py-12">
              <ShoppingBag className="w-16 h-16" />
              <p className="text-lg font-bold">Tu carrito está vacío</p>
              <p className="text-sm text-center leading-relaxed">
                Los productos que agregues en caja<br />aparecerán aquí en tiempo real.
              </p>
              {activeOrders.length > 0 && (
                <div className="mt-4 w-full space-y-2 lg:hidden">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Pedidos activos</p>
                  {activeOrders.map((order: Order) => (
                    <div
                      key={order.id}
                      className={`flex justify-between items-center p-3 rounded-xl border ${
                        order.status === 'listo'
                          ? 'bg-green-500/10 border-green-500/30 text-green-400'
                          : order.status === 'preparando'
                          ? 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                          : 'bg-slate-900 border-white/5 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {order.status === 'listo' ? (
                          <Sparkles className="w-4 h-4 animate-pulse" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                        <span className="text-sm font-bold">{order.tableName || `Pedido #${order.orderNumber}`}</span>
                      </div>
                      <span className="text-[10px] font-black uppercase">
                        {order.status === 'listo' ? '✓ LISTO' :
                         order.status === 'preparando' ? 'Preparando' : 'Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            items.map((item, index) => (
              <div key={index} className="flex justify-between items-center p-4 rounded-2xl bg-slate-900 border border-white/5 animate-in slide-in-from-right-4 duration-300">
                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="font-bold text-sm truncate">{item.product.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.quantity} x ${item.product.salePrice.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                  </p>
                  {item.notes && <p className="text-[10px] text-primary mt-1 italic">Nota: {item.notes}</p>}
                </div>
                <div className="font-black text-lg text-right shrink-0">
                  ${(item.product.salePrice * item.quantity).toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-900 border-t border-white/10">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-sm text-slate-400 font-bold">
              <span>Subtotal</span>
              <span>${currentTotals.subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-sm text-green-500 font-bold">
                <span>Descuento ({discount}%)</span>
                <span>-${currentTotals.discountAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between items-end pt-4 border-t border-white/10">
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Total a Pagar</span>
              <span className="text-5xl font-black text-primary">
                ${currentTotals.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

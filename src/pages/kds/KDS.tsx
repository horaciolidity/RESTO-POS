import { useState, useEffect, useCallback } from 'react';
import {
  ChefHat,
  Clock,
  Volume2,
  RefreshCw
} from 'lucide-react';
import { useOrdersStore, Order } from '../../store/useOrdersStore';

export default function KDS() {
  const { orders, initializeStore, updateOrderStatus } = useOrdersStore();
  const [activeQueue, setActiveQueue] = useState<'activas' | 'historico'>('activas');
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await initializeStore();
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  }, [initializeStore]);

  // Initialize on mount — establishes Realtime subscription
  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling fallback every 10 s — keeps orders & turns screen in sync.
  useEffect(() => {
    const interval = setInterval(() => {
      initializeStore().then(() => setLastUpdated(new Date()));
    }, 10_000);
    return () => clearInterval(interval);
  }, [initializeStore]);

  // Filter orders related to kitchen preparation
  const kitchenOrders = orders.filter((o: Order) => {
    if (activeQueue === 'activas') {
      return o.status === 'pendiente' || o.status === 'preparando' || o.status === 'listo';
    } else {
      return o.status === 'entregado' || o.status === 'cancelado';
    }
  }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const getPriorityStyle = (order: Order) => {
    // If order has hot dishes or is waiting too long, raise priority
    const elapsedMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    if (elapsedMinutes > 15) {
      return 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse';
    }
    return 'bg-muted text-muted-foreground border-border';
  };

  const getPriorityLabel = (order: Order) => {
    const elapsedMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
    if (elapsedMinutes > 15) return 'RETARDO CRÍTICO';
    return 'NORMAL';
  };

  const handlePlaySound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 150);
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pantalla de Cocina (KDS)</h2>
          <div className="flex items-center gap-1.5 mt-1">
            {/* Live indicator */}
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            <p className="text-muted-foreground text-xs">
              EN VIVO · Actualizado {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Manual refresh button */}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            title="Actualizar ahora"
            className={`p-2.5 bg-card border border-border rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all ${
              isRefreshing ? 'text-primary border-primary/40' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualizando...' : 'Actualizar'}
          </button>

          <button
            onClick={handlePlaySound}
            className="p-2.5 bg-card border border-border rounded-xl text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-semibold"
            title="Probar sonido de alerta de comanda"
          >
            <Volume2 className="w-4 h-4 text-primary" /> Sonido KDS
          </button>
          
          <div className="flex bg-muted p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveQueue('activas')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeQueue === 'activas'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Cola Activa
            </button>
            <button
              onClick={() => setActiveQueue('historico')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeQueue === 'historico'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Completados
            </button>
          </div>
        </div>
      </div>

      {/* KDS Vertical List */}
      <div className="flex flex-col gap-4">
        {kitchenOrders.length === 0 ? (
          <div className="col-span-full py-20 text-center text-muted-foreground bg-card border border-border rounded-3xl space-y-3">
            <ChefHat className="w-10 h-10 mx-auto opacity-35 animate-bounce" />
            <p className="text-xs">No hay comandas activas en la cocina en este momento.</p>
          </div>
        ) : (
          kitchenOrders.map((order, index) => {
            const isAbsoluteFirst = index === 0 && activeQueue === 'activas';
            const elapsedMinutes = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
            const priorityStyle = isAbsoluteFirst 
              ? 'bg-red-500/20 text-red-500 border-red-500 animate-pulse ring-2 ring-red-500/50' 
              : getPriorityStyle(order);
            const priorityLabel = isAbsoluteFirst ? '🚨 1° PRIORIDAD' : getPriorityLabel(order);

            return (
              <div
                key={order.id}
                className={`p-5 bg-card border rounded-2xl flex flex-col justify-between space-y-4 transition-all ${
                  isAbsoluteFirst ? 'border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.25)]' : 'border-border hover:border-primary/40'
                }`}
              >
                {/* Comanda Header info */}
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-extrabold text-primary uppercase">Pedido #{order.orderNumber}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <h4 className="font-extrabold text-sm leading-none">
                          {order.tableName ? order.tableName : `Mostrador`}
                        </h4>
                        {order.orderType && (
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            order.orderType === 'salon' ? 'bg-blue-500/10 text-blue-500' :
                            order.orderType === 'llevar' ? 'bg-orange-500/10 text-orange-500' :
                            'bg-green-500/10 text-green-500'
                          }`}>
                            {order.orderType === 'llevar' ? 'Para Llevar' : order.orderType}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${priorityStyle}`}>
                      {priorityLabel}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground pb-2 border-b border-border">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-primary" /> {elapsedMinutes}m de espera
                    </span>
                    {order.waiterName && (
                      <span className="flex items-center gap-1 font-bold">
                        Mozo: {order.waiterName}
                      </span>
                    )}
                  </div>
                  
                  {order.orderNote && (
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-500 text-xs font-bold mt-2">
                      📋 NOVEDAD: {order.orderNote}
                    </div>
                  )}
                </div>

                {/* Comanda Items List */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {order.items.map((item) => (
                    <div key={item.id} className="text-xs flex items-start gap-2 justify-between">
                      <div>
                        <span className="font-bold text-foreground">
                          {item.product.name}
                        </span>
                        {item.notes && (
                          <span className="block text-[10px] bg-red-500/10 text-red-500 font-semibold px-1 rounded-sm mt-0.5 max-w-fit">
                            OBS: {item.notes}
                          </span>
                        )}
                      </div>
                      <span className="font-black px-2 py-0.5 bg-muted rounded-lg border border-border">
                        x{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Status footer + manual ready button */}
                <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                  <span>Estado: <strong className="uppercase font-bold text-primary">{order.status}</strong></span>
                  <span>#{order.id.slice(-4)}</span>
                </div>

                {/* Manual 'Mark as Ready' button — visible while order is being cooked */}
                {(order.status === 'preparando' || order.status === 'pendiente') && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'listo')}
                    className="w-full py-3 mt-1 rounded-xl text-sm font-black uppercase tracking-wide bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    ✅ Marcar como Listo para Retirar
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}

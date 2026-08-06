import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Tv, ChevronLeft, Volume2, Sparkles, ChefHat, RefreshCw } from 'lucide-react';
import { useOrdersStore, Order } from '../../store/useOrdersStore';

export default function OrdersDisplay() {
  const { orders, initializeStore, updateOrderStatus } = useOrdersStore();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [heroImage, setHeroImage] = useState('/mesahub_hero.png');

  useEffect(() => {
    const saved = localStorage.getItem('mesahub_hero_custom');
    if (saved) {
      setHeroImage(saved);
    }
    const handleStorageChange = () => {
      const updated = localStorage.getItem('mesahub_hero_custom');
      setHeroImage(updated || '/mesahub_hero.png');
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    await initializeStore();
    setLastUpdated(new Date());
    setTimeout(() => setIsRefreshing(false), 500);
  }, [initializeStore]);

  // Initialize on mount (establishes Realtime subscription)
  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Polling fallback every 10 s — keeps the screen live even if
  // the Supabase Realtime WebSocket drops on slow/shared networks.
  useEffect(() => {
    const interval = setInterval(() => {
      initializeStore().then(() => setLastUpdated(new Date()));
    }, 10_000);
    return () => clearInterval(interval);
  }, [initializeStore]);

  const preparingOrders = orders.filter((o: Order) => o.status === 'preparando');
  const readyOrders = orders.filter((o: Order) => o.status === 'listo');

  const triggerCallSound = () => {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
    osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5 note
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    setTimeout(() => osc.stop(), 350);
  };

  const handleMarkAsReady = async (orderId: string) => {
    await updateOrderStatus(orderId, 'listo');
    triggerCallSound();
    setSelectedOrder(null);
  };

  return (
    <div 
      className="min-h-screen bg-slate-950 text-white p-6 md:p-12 flex flex-col justify-between font-sans relative bg-cover bg-center transition-all duration-500"
      style={{ backgroundImage: `linear-gradient(to bottom, rgba(9, 13, 26, 0.15), rgba(9, 13, 26, 0.35)), url(${heroImage})` }}
    >
      
      {/* Header bar */}
      <div className="flex items-center justify-between p-5 bg-black/20 border border-white/15 rounded-3xl mb-8 backdrop-blur-sm relative z-10" style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.25)' }}>
        <div className="flex items-center gap-3">
          <Link to="/" className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-slate-300 transition-all">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-lg">
              <Tv className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight">Estado de Pedidos</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                {/* Live indicator dot */}
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-black leading-none">
                  EN VIVO · Act. {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Manual refresh button */}
          <button
            onClick={refresh}
            disabled={isRefreshing}
            title="Actualizar ahora"
            className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl text-slate-300 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-green-400' : ''}`} />
          </button>
          <button
            onClick={triggerCallSound}
            className="px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all text-slate-300"
          >
            <Volume2 className="w-4 h-4 text-primary" /> Llamar Cliente
          </button>
        </div>
      </div>

      {/* Main 2-column queue display */}
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-8 relative z-10">
        
        {/* Preparing Queue Column */}
        <div className="p-8 rounded-3xl bg-black/20 border border-white/10 backdrop-blur-sm flex flex-col justify-between h-[65vh]" style={{ boxShadow: '0 4px 40px rgba(0,0,0,0.2)' }}>
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <div className="w-8 h-8 rounded-lg bg-orange-500/15 text-orange-400 flex items-center justify-center shrink-0">
                <ChefHat className="w-4.5 h-4.5 animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-black text-xl text-orange-400 drop-shadow">Preparando</h3>
                <span className="text-[9px] text-white/60 uppercase font-bold tracking-wider drop-shadow">En proceso de cocción</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-2 scrollbar-thin">
              {preparingOrders.length === 0 ? (
                <p className="py-16 text-center text-white/40 text-xs font-semibold drop-shadow">No hay comandas en cocción.</p>
              ) : (
                preparingOrders.map((order: Order) => (
                  <div 
                    key={order.id} 
                    onClick={() => setSelectedOrder(order)}
                    className="flex justify-between items-center p-5 bg-black/20 border border-white/10 rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-black/30 transition-all backdrop-blur-sm"
                    title="Hacer clic para marcar como Listo"
                  >
                    <span className="text-xs text-white/60 font-bold uppercase drop-shadow">Turno</span>
                    <span className="font-black text-3xl tracking-widest text-white drop-shadow-lg">
                      {order.orderNumber}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/10 text-white/30 text-[10px] text-center font-bold tracking-wide uppercase drop-shadow">
            MesaHub Realtime Queue Display
          </div>
        </div>

        {/* Ready to Take Queue Column */}
        <div className="p-8 rounded-3xl bg-black/20 border border-green-400/25 backdrop-blur-sm flex flex-col justify-between h-[65vh]" style={{ boxShadow: '0 4px 40px rgba(34,197,94,0.1)' }}>
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-green-400/15">
              <div className="w-8 h-8 rounded-lg bg-green-500/15 text-green-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-green-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-xl text-green-400 drop-shadow">Listo para Retirar</h3>
                <span className="text-[9px] text-white/60 uppercase font-bold tracking-wider drop-shadow">Pasa por el mostrador</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-2 scrollbar-thin">
              {readyOrders.length === 0 ? (
                <p className="py-16 text-center text-white/40 text-xs font-semibold drop-shadow">No hay pedidos listos aún.</p>
              ) : (
                readyOrders.map((order: Order) => (
                  <div
                    key={order.id}
                    onClick={triggerCallSound}
                    className="flex justify-between items-center p-6 bg-green-500/15 border-2 border-green-400/60 rounded-3xl cursor-pointer hover:bg-green-500/25 transition-all animate-pulse backdrop-blur-sm"
                    title="Hacer sonar aviso para retirar"
                  >
                    <span className="text-sm text-green-300 font-black uppercase drop-shadow">Turno</span>
                    <span className="font-black text-5xl tracking-widest text-green-300 drop-shadow-lg">
                      {order.orderNumber}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-green-400/15 text-green-400 text-[10px] text-center font-black tracking-widest uppercase animate-pulse drop-shadow">
            •• RECOGE TU PEDIDO AQUÍ ••
          </div>
        </div>

      </div>

      {/* Footer credits info */}
      <div className="text-center text-xs text-slate-600 font-semibold tracking-wider uppercase">
        MesaHub Gastronomic Display System • Multichannel Sync Active
      </div>

      {/* Manual Ready Action Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm space-y-5 text-center shadow-2xl">
            <h3 className="font-black text-lg text-white">Marcar Pedido como Listo</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              ¿Deseas cambiar el estado del turno <strong className="text-primary text-sm">#{selectedOrder.orderNumber}</strong> de la {selectedOrder.tableName || 'barra'} a <strong>Listo para Retirar</strong>?
            </p>
            
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 transition-colors text-white"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleMarkAsReady(selectedOrder.id)}
                className="py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-500 transition-colors shadow-lg shadow-green-600/20"
              >
                Poner Listo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

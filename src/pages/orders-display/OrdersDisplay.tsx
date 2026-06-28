import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Tv, ChevronLeft, Volume2, Sparkles, ChefHat, RefreshCw } from 'lucide-react';
import { useOrdersStore, Order } from '../../store/useOrdersStore';

export default function OrdersDisplay() {
  const { orders, initializeStore } = useOrdersStore();
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  // Polling fallback every 30 s — keeps the screen live even if
  // the Supabase Realtime WebSocket drops on slow/shared networks.
  useEffect(() => {
    const interval = setInterval(() => {
      initializeStore().then(() => setLastUpdated(new Date()));
    }, 30_000);
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

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 md:p-12 flex flex-col justify-between font-sans">
      
      {/* Header bar */}
      <div className="flex items-center justify-between pb-6 border-b border-white/10 mb-8">
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
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mb-8">
        
        {/* Preparing Queue Column */}
        <div className="p-8 rounded-3xl bg-slate-900/40 border border-white/5 flex flex-col justify-between h-[65vh]">
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                <ChefHat className="w-4.5 h-4.5 animate-spin-slow" />
              </div>
              <div>
                <h3 className="font-black text-xl text-orange-500">Preparando</h3>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">En proceso de cocción</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-2 scrollbar-thin">
              {preparingOrders.length === 0 ? (
                <p className="py-16 text-center text-slate-500 text-xs font-semibold">No hay comandas en cocción.</p>
              ) : (
                preparingOrders.map((order: Order) => (
                  <div key={order.id} className="flex justify-between items-center p-5 bg-slate-900 border border-white/5 rounded-2xl">
                    <span className="text-xs text-slate-400 font-bold uppercase">Turno</span>
                    <span className="font-black text-3xl tracking-widest text-slate-300">
                      {order.orderNumber}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 text-slate-500 text-[10px] text-center font-bold tracking-wide uppercase">
            MesaHub Realtime Queue Display

          </div>
        </div>

        {/* Ready to Take Queue Column */}
        <div className="p-8 rounded-3xl bg-green-500/5 border border-green-500/20 flex flex-col justify-between h-[65vh]">
          <div>
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-green-500/10">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center shrink-0">
                <Sparkles className="w-4.5 h-4.5 text-green-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-black text-xl text-green-500">Listo para Retirar</h3>
                <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Pasa por el mostrador</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-2 scrollbar-thin">
              {readyOrders.length === 0 ? (
                <p className="py-16 text-center text-slate-500 text-xs font-semibold">No hay pedidos listos aún.</p>
              ) : (
                readyOrders.map((order: Order) => (
                  <div
                    key={order.id}
                    onClick={triggerCallSound}
                    className="flex justify-between items-center p-6 bg-green-500/10 border-2 border-green-500 rounded-3xl cursor-pointer hover:bg-green-500/20 transition-all animate-pulse"
                    title="Hacer sonar aviso para retirar"
                  >
                    <span className="text-sm text-green-600 font-black uppercase">Turno</span>
                    <span className="font-black text-5xl tracking-widest text-green-400">
                      {order.orderNumber}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-green-500/10 text-green-500 text-[10px] text-center font-black tracking-widest uppercase animate-pulse">
            •• RECOGE TU PEDIDO AQUÍ ••
          </div>
        </div>

      </div>

      {/* Footer credits info */}
      <div className="text-center text-xs text-slate-600 font-semibold tracking-wider uppercase">
        MesaHub Gastronomic Display System • Multichannel Sync Active

      </div>

    </div>
  );
}

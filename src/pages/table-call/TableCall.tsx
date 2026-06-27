/**
 * TableCall.tsx
 * Public page the customer sees after scanning the table QR.
 * Shows: Call Waiter button + View Menu button.
 * Listens for waiter confirmation via Supabase Realtime.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Bell, UtensilsCrossed, CheckCircle2, Clock, ChefHat, Loader2 } from 'lucide-react';
import { tablesService } from '../../services/tablesService';
import { tableCallService, TableCallConfirmEvent } from '../../services/tableCallService';
import { isSupabaseConfigured } from '../../services/supabase';
import { useOrdersStore } from '../../store/useOrdersStore';

export default function TableCall() {
  const { tableToken } = useParams<{ tableToken: string }>();
  const navigate = useNavigate();

  const [tableInfo, setTableInfo] = useState<{ number: number; zone: string; id: string; branchId: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [callState, setCallState] = useState<'idle' | 'calling' | 'confirmed'>('idle');
  const [waiterName, setWaiterName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<any>(null);

  // Fetch table info from token
  const { tables } = useOrdersStore();

  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        if (isSupabaseConfigured() && tableToken) {
          const tableData = await tablesService.getByQrToken(tableToken);
          if (!tableData) {
            setError('Mesa no encontrada. Verificá el código QR.');
            return;
          }
          setTableInfo({
            number: tableData.number,
            zone: tableData.zone,
            id: tableData.id,
            branchId: tableData.branch_id
          });
        } else {
          // Demo mode: parse token as "table-{number}"
          const tableNum = parseInt(tableToken?.replace('table-', '') || '1');
          const t = tables.find(t => t.number === tableNum) || tables[0];
          if (t) {
            setTableInfo({ number: t.number, zone: t.zone, id: t.id, branchId: 'demo-branch' });
          } else {
            setError('Mesa no encontrada.');
          }
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [tableToken]);

  // NO nos suscribimos al montar — solo cuando el cliente llama.
  // Así el 99% de los usuarios (que apenas abren la página) no consumen ninguna conexión Realtime.

  const disconnectChannel = () => {
    if (channelRef.current) {
      // Limpiar el timeout si existe (por si confirmaron antes del tiempo límite)
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

  const handleCallWaiter = async () => {
    if (!tableInfo || !tableToken || callState !== 'idle') return;
    setCallState('calling');

    // 1 — Emitir el evento de llamada
    await tableCallService.callWaiter({
      tableToken,
      tableNumber: tableInfo.number,
      tableId: tableInfo.id,
      branchId: tableInfo.branchId,
    });

    // 2 — Suscribirse a la confirmación AHORA (no antes)
    const channel = tableCallService.subscribeToConfirmations(
      tableInfo.branchId,
      tableToken,
      (event: TableCallConfirmEvent) => {
        setWaiterName(event.waiterName);
        setCallState('confirmed');
        // Nos desconectamos inmediatamente al recibir confirmación
        disconnectChannel();
      }
    );
    channelRef.current = channel;

    // 3 — Timeout de seguridad: desconectar a los 2 minutos pase lo que pase
    const timeoutId = setTimeout(() => {
      disconnectChannel();
    }, 2 * 60 * 1000); // 2 minutos

    // Guardamos el timeout para limpiarlo si confirman antes
    (channelRef.current as any).__timeout = timeoutId;
  };

  // — Loading —
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center space-y-4">
          <ChefHat className="w-12 h-12 text-violet-400 mx-auto animate-bounce" />
          <p className="text-slate-400 text-sm font-semibold">Cargando...</p>
        </div>
      </div>
    );
  }

  // — Error —
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <span className="text-red-400 font-black text-2xl">!</span>
          </div>
          <p className="text-white font-bold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-6">
      {/* Animated background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">

        {/* Header */}
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center mx-auto shadow-2xl shadow-violet-500/30">
            <ChefHat className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">MesaHub</h1>
          {tableInfo && (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full">
              <span className="text-slate-400 text-sm font-semibold">
                Mesa {tableInfo.number} · {tableInfo.zone}
              </span>
            </div>
          )}
        </div>

        {/* ──── IDLE state ──── */}
        {callState === 'idle' && (
          <div className="space-y-4">
            {/* Call Waiter — primary CTA */}
            <button
              onClick={handleCallWaiter}
              className="w-full py-5 rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-xl shadow-2xl shadow-violet-500/40 active:scale-95 transition-all duration-150 flex flex-col items-center gap-2"
            >
              <Bell className="w-9 h-9 animate-wiggle" />
              <span>Llamar al Mozo</span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">o</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* See Menu — secondary */}
            <button
              onClick={() => tableToken && navigate(`/mesa/${tableToken}`)}
              className="w-full py-4 rounded-3xl bg-white/5 border border-white/10 text-white font-bold text-base active:scale-95 transition-all duration-150 flex items-center justify-center gap-3 hover:bg-white/10"
            >
              <UtensilsCrossed className="w-6 h-6 text-violet-400" />
              <span>Ver Menú & Hacer Pedido</span>
            </button>
          </div>
        )}

        {/* ──── CALLING state ──── */}
        {callState === 'calling' && (
          <div className="space-y-6">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-2 border-amber-500/30 flex items-center justify-center relative">
              <Bell className="w-16 h-16 text-amber-400" />
              {/* Pulse rings */}
              <div className="absolute inset-0 rounded-full border-2 border-amber-400/30 animate-ping" />
              <div className="absolute -inset-3 rounded-full border border-amber-400/20 animate-ping [animation-delay:0.3s]" />
            </div>

            <div className="space-y-2">
              <p className="text-xl font-black text-amber-400">¡Llamando al Mozo!</p>
              <p className="text-slate-400 text-sm">Un mozo estará contigo en un momento.</p>
            </div>

            <div className="flex items-center justify-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
              <span className="text-slate-400 text-sm font-semibold">Esperando confirmación...</span>
            </div>

            {/* Can still go to menu while waiting */}
            <button
              onClick={() => tableToken && navigate(`/mesa/${tableToken}`)}
              className="w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-300 font-bold text-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-all"
            >
              <UtensilsCrossed className="w-5 h-5 text-violet-400" />
              Ver el Menú mientras esperas
            </button>
          </div>
        )}

        {/* ──── CONFIRMED state ──── */}
        {callState === 'confirmed' && (
          <div className="space-y-6">
            <div className="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-emerald-500/20 to-green-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            </div>

            <div className="space-y-2">
              <p className="text-xl font-black text-emerald-400">¡En camino!</p>
              {waiterName ? (
                <p className="text-slate-300 text-sm"><span className="font-bold text-white">{waiterName}</span> está yendo a tu mesa.</p>
              ) : (
                <p className="text-slate-400 text-sm">El mozo ya fue notificado y se dirige a tu mesa.</p>
              )}
            </div>

            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-1">
              <div className="flex items-center gap-2 justify-center text-emerald-400">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-bold">Tiempo estimado: 1-2 minutos</span>
              </div>
            </div>

            {/* Option to go to menu */}
            <button
              onClick={() => tableToken && navigate(`/mesa/${tableToken}`)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-bold text-sm flex items-center justify-center gap-2"
            >
              <UtensilsCrossed className="w-5 h-5" />
              Ver el Menú & Hacer un Pedido
            </button>

            <button
              onClick={() => setCallState('idle')}
              className="text-slate-500 text-xs font-semibold hover:text-slate-400 transition-colors"
            >
              Volver al inicio
            </button>
          </div>
        )}

      </div>

      {/* Subtle wiggle animation */}
      <style>{`
        @keyframes wiggle {
          0%, 100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        .animate-wiggle { animation: wiggle 0.6s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

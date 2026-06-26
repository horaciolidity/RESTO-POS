import { useState, useEffect } from 'react';
import {
  PlusCircle,
  History,
  Lock,
  Unlock,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle2,
  Clock,
  DollarSign,
  X
} from 'lucide-react';
import { useCashStore } from '../../store/useCashStore';
import { useAuthStore } from '../../store/useAuthStore';

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function Cash() {
  const { currentSession, movements, openRegister, closeRegister, addMovement, loading, initializeCash } = useCashStore();
  const { user } = useAuthStore();

  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [moveAmount, setMoveAmount] = useState<number>(0);
  const [moveType, setMoveType] = useState<'ingreso' | 'egreso' | 'retiro'>('ingreso');
  const [moveDescription, setMoveDescription] = useState('');
  const [closingActualAmount, setClosingActualAmount] = useState<number>(0);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = `t-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  // When session opens, pre-fill closing amount with current expected
  useEffect(() => {
    if (currentSession?.status === 'open') {
      setClosingActualAmount(currentSession.expectedBalance);
    }
  }, [currentSession?.expectedBalance, currentSession?.status]);

  const handleOpenRegister = async () => {
    if (openingBalance < 0) {
      showToast('El fondo inicial no puede ser negativo.', 'error');
      return;
    }
    await openRegister(
      user?.name || 'Cajero',
      user?.id || '',
      openingBalance,
      user?.branchId || 'default'
    );
    showToast(`Caja abierta por ${user?.name || 'Cajero'} con fondo inicial de $${openingBalance.toFixed(2)}.`);
  };

  const handleCloseRegister = async () => {
    await closeRegister(closingActualAmount, user?.branchId || 'default');
    setShowCloseConfirm(false);
    showToast('Caja cerrada y arqueo guardado correctamente.');
  };

  const handleAddMovement = async () => {
    if (moveAmount <= 0) {
      showToast('El monto debe ser mayor a $0.', 'error');
      return;
    }
    if (!moveDescription.trim()) {
      showToast('Ingresa una descripción para el movimiento.', 'error');
      return;
    }
    await addMovement(moveType, moveAmount, moveDescription, user?.branchId || 'default');
    showToast(`Movimiento de ${moveType} por $${moveAmount.toFixed(2)} registrado.`);
    setMoveAmount(0);
    setMoveDescription('');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await initializeCash(user?.branchId || 'default');
    setTimeout(() => setRefreshing(false), 600);
  };

  const sessionElapsed = currentSession?.openedAt
    ? Math.floor((Date.now() - new Date(currentSession.openedAt).getTime()) / 60000)
    : 0;

  const ingresos = movements.filter(m => m.type === 'ingreso').reduce((a, m) => a + m.amount, 0);
  const egresos = movements.filter(m => m.type !== 'ingreso').reduce((a, m) => a + m.amount, 0);

  return (
    <div className="space-y-6">

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold pointer-events-auto transition-all animate-in slide-in-from-right duration-300 ${
              t.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            {t.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            <span>{t.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              className="ml-2 opacity-70 hover:opacity-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Close Confirm Modal */}
      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-sm space-y-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/10 rounded-2xl">
                <Lock className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-extrabold text-sm">Confirmar Cierre de Caja</p>
                <p className="text-[11px] text-muted-foreground">Esta acción cerrará el turno actual</p>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-muted/50 rounded-xl border border-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Saldo esperado:</span>
                  <span className="font-bold">${currentSession?.expectedBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Efectivo contado:</span>
                  <span className="font-bold text-primary">${closingActualAmount.toFixed(2)}</span>
                </div>
                <div className={`flex justify-between font-bold pt-1 border-t border-border ${
                  closingActualAmount - (currentSession?.expectedBalance || 0) >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  <span>Diferencia:</span>
                  <span>{closingActualAmount - (currentSession?.expectedBalance || 0) >= 0 ? '+' : ''}${(closingActualAmount - (currentSession?.expectedBalance || 0)).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCloseRegister}
                disabled={loading}
                className="py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors disabled:opacity-50 shadow-lg shadow-red-600/20"
              >
                {loading ? 'Cerrando...' : 'Confirmar Cierre'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Control de Caja & Turno</h2>
          <p className="text-muted-foreground text-xs">Administración del flujo de efectivo, registros diarios y arqueos de cierre.</p>
        </div>
        <button
          onClick={handleRefresh}
          className={`flex items-center gap-1.5 px-3 py-2 bg-muted border border-border rounded-xl text-xs font-bold hover:bg-card transition-all ${refreshing ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-primary' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Loading state */}
      {loading && !currentSession && (
        <div className="flex items-center justify-center py-16">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground font-semibold">Verificando estado de caja...</p>
          </div>
        </div>
      )}

      {!loading && currentSession?.status === 'open' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left: Active session */}
          <div className="lg:col-span-8 space-y-5">

            {/* Status card */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-border">
                <div className="flex items-center gap-2 text-green-500 font-extrabold text-sm">
                  <Unlock className="w-4 h-4" />
                  <span>Caja Abierta — Turno en Curso</span>
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  {sessionElapsed < 60
                    ? `${sessionElapsed}m de turno`
                    : `${Math.floor(sessionElapsed / 60)}h ${sessionElapsed % 60}m de turno`
                  }
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Cajero</span>
                  <span className="text-sm font-black text-foreground truncate">{currentSession.openedBy}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Apertura</span>
                  <span className="text-sm font-black text-foreground">{new Date(currentSession.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-center">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Fondo Inicial</span>
                  <span className="text-sm font-black text-foreground">${currentSession.initialBalance.toFixed(2)}</span>
                </div>
                <div className="p-3 bg-primary/5 rounded-xl border border-primary/20 text-center">
                  <span className="text-[10px] text-primary block font-bold uppercase">Saldo Esperado</span>
                  <span className="text-sm font-black text-primary">${currentSession.expectedBalance.toFixed(2)}</span>
                </div>
              </div>

              {/* Income / outcome totals */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-green-500 font-bold uppercase">Total Ingresos</p>
                    <p className="text-sm font-extrabold text-green-500">${ingresos.toFixed(2)}</p>
                  </div>
                </div>
                <div className="p-3 bg-red-500/5 border border-red-500/20 rounded-xl flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 rounded-xl">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-red-500 font-bold uppercase">Total Egresos</p>
                    <p className="text-sm font-extrabold text-red-500">${egresos.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Movement form */}
            <div className="p-5 rounded-2xl bg-card border border-border space-y-4">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-primary" />
                Registrar Movimiento Manual de Efectivo
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Tipo</label>
                  <select
                    value={moveType}
                    onChange={e => setMoveType(e.target.value as any)}
                    className="w-full p-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  >
                    <option value="ingreso">⬆️ Ingreso (+)</option>
                    <option value="egreso">⬇️ Egreso / Gasto (−)</option>
                    <option value="retiro">🏦 Retiro / Caja Fuerte (−)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Monto $</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={moveAmount || ''}
                    onChange={e => setMoveAmount(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full p-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-black"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Concepto / Detalle</label>
                  <input
                    type="text"
                    value={moveDescription}
                    onChange={e => setMoveDescription(e.target.value)}
                    placeholder="Ej: Pago de panadería..."
                    className="w-full p-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>
              </div>

              <button
                onClick={handleAddMovement}
                disabled={loading || moveAmount <= 0 || !moveDescription.trim()}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <DollarSign className="w-4 h-4" />
                {loading ? 'Guardando...' : 'Guardar Movimiento en Caja'}
              </button>
            </div>

            {/* Close session form */}
            <div className="p-5 rounded-2xl bg-card border border-red-500/20 space-y-4">
              <h3 className="font-extrabold text-sm flex items-center gap-2 text-red-500">
                <Lock className="w-4 h-4" /> Cierre de Turno & Arqueo de Caja
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-muted-foreground uppercase font-bold">Efectivo Físico Contado en Caja $</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={closingActualAmount || ''}
                    onChange={e => setClosingActualAmount(Number(e.target.value))}
                    className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-black"
                  />
                </div>

                <div className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-2 leading-snug text-xs">
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Cálculo de Diferencia</span>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saldo esperado:</span>
                    <span className="font-bold">${currentSession.expectedBalance.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Efectivo contado:</span>
                    <span className="font-bold text-primary">${closingActualAmount.toFixed(2)}</span>
                  </div>
                  <div className={`flex justify-between font-extrabold pt-1 border-t border-border ${
                    closingActualAmount - currentSession.expectedBalance >= 0 ? 'text-green-500' : 'text-red-500'
                  }`}>
                    <span>Diferencia:</span>
                    <span>
                      {closingActualAmount - currentSession.expectedBalance >= 0 ? '+' : ''}
                      ${(closingActualAmount - currentSession.expectedBalance).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowCloseConfirm(true)}
                disabled={loading}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md shadow-red-500/10 transition-colors disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                Cerrar Caja & Guardar Arqueo
              </button>
            </div>
          </div>

          {/* Right: Movements log */}
          <div className="lg:col-span-4 space-y-5">
            <div className="p-5 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-primary" /> Movimientos del Turno
                <span className="ml-auto text-[10px] text-muted-foreground font-semibold">{movements.length} registros</span>
              </h3>

              {movements.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <History className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                  <p className="text-xs text-muted-foreground font-semibold">Sin movimientos aún</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                  {[...movements].reverse().map(m => (
                    <div key={m.id} className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-1 text-xs">
                      <div className="flex justify-between items-center">
                        <span className={`font-bold uppercase text-[10px] px-2 py-0.5 rounded-full ${
                          m.type === 'ingreso'
                            ? 'bg-green-500/10 text-green-500'
                            : m.type === 'egreso'
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-orange-500/10 text-orange-500'
                        }`}>
                          {m.type}
                        </span>
                        <span className={`font-extrabold ${m.type === 'ingreso' ? 'text-green-500' : 'text-red-500'}`}>
                          {m.type === 'ingreso' ? '+' : '−'}${m.amount.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[10px] text-foreground font-medium leading-tight">{m.description}</p>
                      <div className="text-[9px] text-muted-foreground text-right">{m.time}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

      ) : !loading && currentSession?.status === 'closed' ? (
        /* Recently closed session summary */
        <div className="max-w-lg mx-auto p-6 bg-card border border-border rounded-3xl text-center space-y-5 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold">Turno Cerrado</h3>
            <p className="text-muted-foreground text-xs">
              El arqueo del turno de <strong>{currentSession.openedBy}</strong> fue guardado correctamente.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs text-left">
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Inicial</p>
              <p className="font-extrabold">${currentSession.initialBalance.toFixed(2)}</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl border border-border text-center">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Contado</p>
              <p className="font-extrabold">${currentSession.actualBalance?.toFixed(2) ?? '—'}</p>
            </div>
            <div className={`p-3 rounded-xl border text-center ${
              (currentSession.difference ?? 0) >= 0
                ? 'bg-green-500/5 border-green-500/20'
                : 'bg-red-500/5 border-red-500/20'
            }`}>
              <p className={`text-[10px] uppercase font-bold ${(currentSession.difference ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>Diferencia</p>
              <p className={`font-extrabold ${(currentSession.difference ?? 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {(currentSession.difference ?? 0) >= 0 ? '+' : ''}${currentSession.difference?.toFixed(2) ?? '0.00'}
              </p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Para iniciar un nuevo turno, completa los datos a continuación.</p>

          {/* Open new session inline */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] text-muted-foreground uppercase font-bold block">Fondo de Apertura Nuevo Turno $</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance || ''}
                onChange={e => setOpeningBalance(Number(e.target.value))}
                className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm font-black"
              />
            </div>
            <button
              onClick={handleOpenRegister}
              disabled={loading}
              className="w-full py-3.5 text-xs font-bold text-white gradient-bg rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              {loading ? 'Abriendo...' : 'Abrir Nuevo Turno de Caja'}
            </button>
          </div>
        </div>

      ) : !loading ? (
        /* Box closed / no session */
        <div className="max-w-md mx-auto p-6 bg-card border border-border rounded-3xl text-center space-y-5 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mx-auto">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold">Abrir Turno de Caja</h3>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Para registrar ventas e ingresos, debes abrir la sesión de caja con el fondo de sencillo inicial en efectivo.
            </p>
            {user?.name && (
              <p className="text-xs text-primary font-bold">
                Operador: {user.name}
              </p>
            )}
          </div>

          <div className="space-y-1.5 text-left max-w-[280px] mx-auto">
            <label className="text-[10px] text-muted-foreground uppercase font-bold block">Fondo de Apertura Inicial $</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={openingBalance || ''}
              onChange={e => setOpeningBalance(Number(e.target.value))}
              placeholder="0.00"
              className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm font-black"
            />
          </div>

          <button
            onClick={handleOpenRegister}
            disabled={loading}
            className="w-full py-3.5 text-xs font-bold text-white gradient-bg rounded-xl shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {loading ? 'Abriendo...' : 'Abrir Caja & Iniciar Turno'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

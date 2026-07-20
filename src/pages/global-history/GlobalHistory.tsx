import { useState, useEffect } from 'react';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Search, 
  Clock, 
  DollarSign, 
  RefreshCw,
  User,
  X,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useCashStore } from '../../store/useCashStore';
import { useAuthStore } from '../../store/useAuthStore';

interface HistoryItem {
  id: string;
  type: 'venta' | 'ingreso' | 'egreso' | 'retiro' | 'incidente' | 'apertura_caja' | 'cierre_caja';
  title: string;
  detail: string;
  amount?: number;
  time: string;
  date: Date;
  user: string;
  rawSession?: any; // To store the session details if selected
}

export default function GlobalHistory() {
  const { orders, incidents, initializeStore } = useOrdersStore();
  const { movements, sessions, initializeCash } = useCashStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'todos' | 'venta' | 'caja' | 'incidente'>('todos');

  const loadData = async () => {
    if (!user?.branchId) return;
    setLoading(true);
    await Promise.all([
      initializeStore(),
      initializeCash(user.branchId)
    ]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  // Consolidate all records into a single timeline
  const items: HistoryItem[] = [];

  // 1. Sales (Orders)
  orders.forEach(o => {
    items.push({
      id: o.id,
      type: 'venta',
      title: `Venta #${o.orderNumber}`,
      detail: `${o.tableName || 'Mostrador'} · ${o.items.length} ítems · ${o.paymentMethod || 'Efectivo'}`,
      amount: o.total,
      time: new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date(o.createdAt),
      user: o.waiterName || 'Sistema'
    });
  });

  // 2. Cash movements (Only those that aren't the opening balance to avoid duplication)
  movements.forEach(m => {
    if (m.description === 'Fondo de apertura inicial') return; // Skip initial balance move to avoid duplication with opening session
    items.push({
      id: m.id,
      type: m.type as any, // ingreso, egreso, retiro
      title: m.type === 'ingreso' ? 'Ingreso de Caja' : m.type === 'egreso' ? 'Egreso de Caja' : 'Retiro de Caja',
      detail: m.description,
      amount: m.amount,
      time: m.time,
      date: new Date(), // fallback to today
      user: 'Caja'
    });
  });

  // 3. Cash Sessions (Aperturas & Cierres)
  sessions.forEach(s => {
    // Opening entry
    items.push({
      id: `open-${s.id}`,
      type: 'apertura_caja',
      title: 'Apertura de Caja',
      detail: `Inicio de caja por ${s.openedBy} con fondo inicial`,
      amount: s.initialBalance,
      time: new Date(s.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date(s.openedAt),
      user: s.openedBy,
      rawSession: s
    });

    // Closing entry (if closed)
    if (s.status === 'closed' && s.closedAt) {
      items.push({
        id: `close-${s.id}`,
        type: 'cierre_caja',
        title: 'Cierre de Caja (Arqueo)',
        detail: `Turno de ${s.openedBy} finalizado. Diferencia: $${s.difference?.toFixed(2) ?? '0.00'}`,
        amount: s.actualBalance,
        time: new Date(s.closedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date(s.closedAt),
        user: s.openedBy,
        rawSession: s
      });
    }
  });

  // 4. Incidents
  incidents.forEach(i => {
    items.push({
      id: i.id,
      type: 'incidente',
      title: `Incidente: ${i.type.toUpperCase()}`,
      detail: i.description,
      time: i.time,
      date: new Date(), // fallback to today
      user: i.user
    });
  });

  // Sort chronologically (newest first)
  const sortedItems = items.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Filter items
  const filteredItems = sortedItems.filter(item => {
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.user.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterType === 'todos') return matchesSearch;
    if (filterType === 'venta') return item.type === 'venta' && matchesSearch;
    if (filterType === 'incidente') return item.type === 'incidente' && matchesSearch;
    if (filterType === 'caja') return ['ingreso', 'egreso', 'retiro', 'apertura_caja', 'cierre_caja'].includes(item.type) && matchesSearch;

    return matchesSearch;
  });

  // Calculate totals
  const totalIn = filteredItems
    .filter(i => ['venta', 'ingreso', 'apertura_caja'].includes(i.type))
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  const totalOut = filteredItems
    .filter(i => ['egreso', 'retiro'].includes(i.type))
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  const getIcon = (type: HistoryItem['type']) => {
    switch (type) {
      case 'venta':
        return <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl"><ArrowUpRight className="w-5 h-5" /></div>;
      case 'ingreso':
        return <div className="p-2 bg-green-500/10 text-green-500 rounded-xl"><ArrowUpRight className="w-5 h-5" /></div>;
      case 'egreso':
      case 'retiro':
        return <div className="p-2 bg-red-500/10 text-red-500 rounded-xl"><ArrowDownRight className="w-5 h-5" /></div>;
      case 'apertura_caja':
        return <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl"><Wallet className="w-5 h-5" /></div>;
      case 'cierre_caja':
        return <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-xl"><TrendingUp className="w-5 h-5" /></div>;
      case 'incidente':
        return <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><AlertTriangle className="w-5 h-5" /></div>;
    }
  };

  // Details corresponding to the selected cash session
  const getSessionSales = () => {
    if (!selectedSession) return [];
    const openTime = new Date(selectedSession.openedAt).getTime();
    const closeTime = selectedSession.closedAt ? new Date(selectedSession.closedAt).getTime() : Date.now();

    return orders.filter(o => {
      const orderTime = new Date(o.createdAt).getTime();
      return orderTime >= openTime && orderTime <= closeTime;
    });
  };

  const getSessionMovements = () => {
    if (!selectedSession) return [];
    return movements.filter(m => m.sessionId === selectedSession.id);
  };

  const currentSessionSales = getSessionSales();
  const currentSessionMovements = getSessionMovements();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Historial de Movimientos</h2>
          <p className="text-muted-foreground text-xs">Registro consolidado de todo el dinero y eventos que entran y salen del local.</p>
        </div>

        <button 
          onClick={loadData}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl border border-border transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Sincronizando...' : 'Sincronizar'}
        </button>
      </div>

      {/* Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Entradas (Ventas + Ingresos)</span>
            <p className="font-black text-2xl text-emerald-500">${totalIn.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          </div>
          <ArrowUpRight className="w-8 h-8 text-emerald-500/50" />
        </div>

        <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/15 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Total Salidas (Gastos + Retiros)</span>
            <p className="font-black text-2xl text-red-500">${totalOut.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          </div>
          <ArrowDownRight className="w-8 h-8 text-red-500/50" />
        </div>

        <div className="p-5 rounded-2xl bg-primary/5 border border-primary/15 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Balance de Caja</span>
            <p className="font-black text-2xl text-primary">${(totalIn - totalOut).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</p>
          </div>
          <DollarSign className="w-8 h-8 text-primary/50" />
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por venta, descripción o usuario..."
            className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* Tab Filters */}
        <div className="flex bg-muted p-1 rounded-xl border border-border w-fit shrink-0">
          <button
            onClick={() => setFilterType('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'todos' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterType('venta')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'venta' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Ventas
          </button>
          <button
            onClick={() => setFilterType('caja')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'caja' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Caja
          </button>
          <button
            onClick={() => setFilterType('incidente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterType === 'incidente' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Incidentes
          </button>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center space-y-2">
            <History className="w-10 h-10 text-muted-foreground/30 animate-pulse" />
            <p className="text-xs font-medium">No se encontraron movimientos registrados hoy.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredItems.map((item, idx) => (
              <div 
                key={item.id + idx} 
                onClick={() => item.rawSession && setSelectedSession(item.rawSession)}
                className={`p-4 flex items-center justify-between hover:bg-muted/10 transition-colors ${item.rawSession ? 'cursor-pointer border-l-4 border-l-primary' : ''}`}
              >
                <div className="flex items-center gap-4">
                  {getIcon(item.type)}
                  
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-sm text-foreground">{item.title}</p>
                      {item.rawSession && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-black uppercase">Ver Arqueo</span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-[11px]">{item.detail}</p>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70 font-semibold pt-0.5">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.time}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {item.user}</span>
                    </div>
                  </div>
                </div>

                {item.amount !== undefined && (
                  <div className="text-right">
                    <p className={`font-black text-sm ${
                      ['venta', 'ingreso', 'apertura_caja', 'cierre_caja'].includes(item.type) ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {['venta', 'ingreso', 'apertura_caja', 'cierre_caja'].includes(item.type) ? '+' : '-'}${item.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arqueo / Cash Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" /> Detalle del Arqueo / Turno de Caja
              </h3>
              <button 
                onClick={() => setSelectedSession(null)}
                className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Session Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 p-4 rounded-xl border border-border text-xs">
              <div>
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Operador</span>
                <span className="font-bold text-foreground">{selectedSession.openedBy}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Estado del Turno</span>
                <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded-full ${
                  selectedSession.status === 'open' ? 'bg-green-500/10 text-green-500' : 'bg-muted text-muted-foreground border'
                }`}>{selectedSession.status === 'open' ? 'Activo' : 'Cerrado'}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Apertura</span>
                <span className="font-bold">{new Date(selectedSession.openedAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] text-muted-foreground block font-bold uppercase">Cierre</span>
                <span className="font-bold">{selectedSession.closedAt ? new Date(selectedSession.closedAt).toLocaleString() : 'Turno Activo'}</span>
              </div>
            </div>

            {/* Balances */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-bold">
              <div className="p-3 bg-muted/40 rounded-xl text-center border">
                <span className="text-[9px] text-muted-foreground block uppercase">Saldo Inicial</span>
                <span className="text-sm font-black text-foreground">${selectedSession.initialBalance.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl text-center border">
                <span className="text-[9px] text-muted-foreground block uppercase">Saldo Esperado</span>
                <span className="text-sm font-black text-primary">${selectedSession.expectedBalance.toFixed(2)}</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl text-center border">
                <span className="text-[9px] text-muted-foreground block uppercase">Saldo Real Contado</span>
                <span className="text-sm font-black text-foreground">${selectedSession.actualBalance !== undefined ? `$${selectedSession.actualBalance.toFixed(2)}` : 'S/D'}</span>
              </div>
              <div className="p-3 bg-muted/40 rounded-xl text-center border">
                <span className="text-[9px] text-muted-foreground block uppercase">Diferencia</span>
                <span className={`text-sm font-black ${
                  selectedSession.difference === undefined ? 'text-muted-foreground' :
                  selectedSession.difference >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {selectedSession.difference !== undefined ? `${selectedSession.difference >= 0 ? '+' : ''}$${selectedSession.difference.toFixed(2)}` : 'S/D'}
                </span>
              </div>
            </div>

            {/* Tabs for details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sales List */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-foreground uppercase border-b pb-1.5 flex items-center gap-1.5">
                  <ArrowUpRight className="w-4 h-4 text-emerald-500" /> Ventas del Turno ({currentSessionSales.length})
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {currentSessionSales.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">No se registraron ventas en este turno.</p>
                  ) : (
                    currentSessionSales.map(sale => (
                      <div key={sale.id} className="p-2.5 bg-muted/20 border rounded-lg flex justify-between items-center text-xs">
                        <div>
                          <p className="font-extrabold text-foreground">Pedido #{sale.orderNumber}</p>
                          <p className="text-[10px] text-muted-foreground">{sale.tableName || 'Mostrador'} · {sale.paymentMethod || 'Efectivo'}</p>
                        </div>
                        <span className="font-black text-emerald-500 text-sm">${sale.total.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Movements List */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-foreground uppercase border-b pb-1.5 flex items-center gap-1.5">
                  <ArrowDownRight className="w-4 h-4 text-red-500" /> Movimientos de Caja ({currentSessionMovements.length})
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {currentSessionMovements.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-6 text-center">No se registraron movimientos en este turno.</p>
                  ) : (
                    currentSessionMovements.map(move => (
                      <div key={move.id} className="p-2.5 bg-muted/20 border rounded-lg flex justify-between items-center text-xs">
                        <div className="min-w-0 flex-1 pr-2">
                          <p className="font-bold text-foreground truncate">{move.description}</p>
                          <p className="text-[9px] text-muted-foreground uppercase font-black">{move.type}</p>
                        </div>
                        <span className={`font-black text-sm shrink-0 ${
                          move.type === 'ingreso' ? 'text-emerald-500' : 'text-red-500'
                        }`}>
                          {move.type === 'ingreso' ? '+' : '-'}${move.amount.toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t flex justify-end">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground text-xs font-bold rounded-xl transition-colors"
              >
                Cerrar Detalles
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

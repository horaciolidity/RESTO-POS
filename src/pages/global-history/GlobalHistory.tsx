import { useState, useEffect } from 'react';
import { 
  History, 
  ArrowUpRight, 
  ArrowDownRight, 
  AlertTriangle, 
  Search, 
  Filter, 
  Calendar, 
  Clock, 
  DollarSign, 
  RefreshCw,
  User
} from 'lucide-react';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useCashStore } from '../../store/useCashStore';
import { useAuthStore } from '../../store/useAuthStore';

interface HistoryItem {
  id: string;
  type: 'venta' | 'ingreso' | 'egreso' | 'retiro' | 'incidente';
  title: string;
  detail: string;
  amount?: number;
  time: string;
  date: Date;
  user: string;
}

export default function GlobalHistory() {
  const { orders, incidents, initializeStore } = useOrdersStore();
  const { movements, initializeCash } = useCashStore();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);

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

  // 2. Cash movements
  movements.forEach(m => {
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

  // 3. Incidents
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
    if (filterType === 'caja') return ['ingreso', 'egreso', 'retiro'].includes(item.type) && matchesSearch;

    return matchesSearch;
  });

  // Calculate totals
  const totalIn = filteredItems
    .filter(i => ['venta', 'ingreso'].includes(i.type))
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
      case 'incidente':
        return <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl"><AlertTriangle className="w-5 h-5" /></div>;
    }
  };

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
              <div key={item.id + idx} className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                <div className="flex items-center gap-4">
                  {getIcon(item.type)}
                  
                  <div className="space-y-1 text-xs">
                    <p className="font-extrabold text-sm text-foreground">{item.title}</p>
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
                      ['venta', 'ingreso'].includes(item.type) ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {['venta', 'ingreso'].includes(item.type) ? '+' : '-'}${item.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

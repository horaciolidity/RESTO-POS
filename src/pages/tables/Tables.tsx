import { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  Coins,
  TrendingUp,
  X
} from 'lucide-react';
import { useOrdersStore, RestaurantTable } from '../../store/useOrdersStore';
import { useAuthStore } from '../../store/useAuthStore';

export default function Tables() {
  const { tables, updateTableStatus, orders, closeOrder, addIncident } = useOrdersStore();
  const { user } = useAuthStore();
  const [selectedZone, setSelectedZone] = useState<string>('Todos');
  const [activeTableDetail, setActiveTableDetail] = useState<RestaurantTable | null>(null);
  const [novedadText, setNovedadText] = useState('');
  const [novedadType, setNovedadType] = useState<'incidente' | 'reclamo' | 'rotura' | 'error_cocina'>('incidente');

  const handleFinalizeTable = async (table: RestaurantTable) => {
    const activeOrder = getTableOrder(table);
    if (activeOrder) {
      await closeOrder(activeOrder.id);
    }
    await updateTableStatus(table.id, 'libre');
    if (novedadText.trim()) {
      addIncident({
        type: novedadType,
        description: `Mesa ${table.number}: ${novedadText}`,
        user: user?.name || 'Administrador'
      });
      setNovedadText('');
    }
    setActiveTableDetail(null);
  };

  // Filter tables by zone
  const filteredTables = selectedZone === 'Todos' 
    ? tables 
    : tables.filter((t: RestaurantTable) => t.zone === selectedZone);

  // Get active order associated with the table
  const getTableOrder = (table: RestaurantTable) => {
    if (!table.currentOrderId) return null;
    return orders.find(o => o.id === table.currentOrderId);
  };

  const getStatusColor = (status: RestaurantTable['status']) => {
    switch (status) {
      case 'libre':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'ocupada':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'esperando_comida':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'comiendo':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20';
      case 'solicita_cuenta':
        return 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusLabel = (status: RestaurantTable['status']) => {
    switch (status) {
      case 'libre': return 'Libre';
      case 'ocupada': return 'Ocupada';
      case 'esperando_comida': return 'Esperando Comida';
      case 'comiendo': return 'Comiendo';
      case 'solicita_cuenta': return 'Pide Cuenta';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Plano del Salón (Mesas)</h2>
          <p className="text-muted-foreground text-xs">Gestión y visualización del estado físico de las mesas en tiempo real.</p>
        </div>
        
        <div className="flex gap-2">
          {['Todos', 'Salón Principal', 'Terraza', 'Planta Alta'].map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                selectedZone === zone
                  ? 'bg-primary text-white border-primary shadow-md'
                  : 'bg-card border-border hover:bg-muted text-muted-foreground'
              }`}
            >
              {zone}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Tables */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {filteredTables.map((table) => {
          const statusColor = getStatusColor(table.status);
          const activeOrder = getTableOrder(table);

          return (
            <div
              key={table.id}
              onClick={() => setActiveTableDetail(table)}
              className={`p-4 bg-card border rounded-2xl cursor-pointer hover:border-primary transition-all flex flex-col justify-between h-40 group relative ${
                table.status !== 'libre' ? 'border-primary/20' : 'border-border'
              }`}
            >
              {/* Header inside table */}
              <div className="flex justify-between items-start">
                <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center font-black text-sm text-foreground group-hover:bg-primary group-hover:text-white transition-all">
                  {table.number}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase border ${statusColor}`}>
                  {getStatusLabel(table.status)}
                </span>
              </div>

              {/* Middle contents */}
              <div className="my-2">
                <p className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" /> Cap: {table.capacity} personas
                </p>
                {activeOrder && (
                  <p className="text-[10px] text-primary font-bold mt-1">
                    Orden: #{activeOrder.orderNumber} (${activeOrder.total})
                  </p>
                )}
              </div>

              {/* Bottom footer inside table */}
              <div className="pt-2 border-t border-border/40 flex justify-between items-center text-[9px] text-muted-foreground uppercase font-bold">
                <span>{table.zone}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Action / Details Modal */}
      {activeTableDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-6 animate-in zoom-in-95 duration-150">
            
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <div>
                <h3 className="font-extrabold text-base">Mesa N° {activeTableDetail.number}</h3>
                <span className="text-xs text-muted-foreground">{activeTableDetail.zone}</span>
              </div>
              <button 
                onClick={() => setActiveTableDetail(null)}
                className="p-1 hover:bg-muted rounded-lg text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Change status buttons */}
            <div className="space-y-3">
              <label className="text-[10px] text-muted-foreground uppercase font-bold block">Actualizar Estado de Mesa</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'libre', label: 'Libre (Desocupada)', icon: CheckCircle2, color: 'hover:bg-green-500/10 hover:text-green-500' },
                  { id: 'ocupada', label: 'Ocupada / Sentados', icon: Users, color: 'hover:bg-blue-500/10 hover:text-blue-500' },
                  { id: 'esperando_comida', label: 'Esperando Comida', icon: Clock, color: 'hover:bg-orange-500/10 hover:text-orange-500' },
                  { id: 'comiendo', label: 'Comiendo / Servido', icon: TrendingUp, color: 'hover:bg-indigo-500/10 hover:text-indigo-500' },
                  { id: 'solicita_cuenta', label: 'Solicita la Cuenta', icon: Coins, color: 'hover:bg-amber-500/10 hover:text-amber-500' },
                ].map((statusItem) => {
                  const isCurrent = activeTableDetail.status === statusItem.id;
                  const Icon = statusItem.icon;
                  return (
                    <button
                      key={statusItem.id}
                      onClick={() => {
                        updateTableStatus(activeTableDetail.id, statusItem.id as RestaurantTable['status']);
                        setActiveTableDetail({
                          ...activeTableDetail,
                          status: statusItem.id as RestaurantTable['status']
                        });
                      }}
                      className={`flex items-center gap-2 p-2.5 border rounded-xl text-left transition-all ${
                        isCurrent
                          ? 'border-primary bg-primary/5 text-primary font-bold'
                          : `border-border text-muted-foreground ${statusItem.color}`
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-xs">{statusItem.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active order associated details */}
            {activeTableDetail.currentOrderId ? (
              <div className="space-y-3">
                <div className="p-4 bg-muted/50 rounded-xl border border-border space-y-3 text-xs">
                  <div className="flex justify-between items-center pb-2 border-b border-border/60">
                    <span className="font-bold text-foreground">Comanda de Consumo Activa</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black uppercase text-[10px]">
                      Activo
                    </span>
                  </div>
                  {getTableOrder(activeTableDetail)?.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center">
                      <span>{item.product.name} x {item.quantity}</span>
                      <span className="font-bold">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-2 border-t border-border/60 font-black text-sm">
                    <span>Total Consumido</span>
                    <span>${getTableOrder(activeTableDetail)?.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Novedades / Observación panel */}
                <div className="p-3 bg-card border border-border rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] text-muted-foreground uppercase font-bold">Registrar Novedad / Incidente (Opcional)</label>
                    <select
                      value={novedadType}
                      onChange={e => setNovedadType(e.target.value as any)}
                      className="bg-muted p-1 rounded text-[10px] font-bold outline-none"
                    >
                      <option value="incidente">⚠️ Incidente</option>
                      <option value="reclamo">🗣️ Reclamo</option>
                      <option value="rotura">💥 Rotura</option>
                      <option value="error_cocina">🍳 Error Cocina</option>
                    </select>
                  </div>
                  <textarea
                    rows={2}
                    value={novedadText}
                    onChange={e => setNovedadText(e.target.value)}
                    placeholder="Ej. El cliente se retiró sin pagar / Se rompió una copa en la mesa..."
                    className="w-full p-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                  />
                </div>

                <button
                  onClick={() => handleFinalizeTable(activeTableDetail)}
                  className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-all shadow-md shadow-red-600/10 flex items-center justify-center gap-1.5"
                >
                  Finalizar Pedido y Desocupar Mesa
                </button>
              </div>
            ) : (
              <div className="p-4 bg-muted/30 rounded-xl text-center text-xs text-muted-foreground">
                No hay consumos registrados en esta mesa.
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setActiveTableDetail(null)}
                className="py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 text-foreground w-full"
              >
                Cerrar Panel
              </button>
              <a 
                href="/pos"
                className="py-2.5 rounded-xl text-xs font-bold text-white gradient-bg hover:opacity-90 flex items-center justify-center shadow-lg shadow-primary/20 w-full"
              >
                Registrar Consumos
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

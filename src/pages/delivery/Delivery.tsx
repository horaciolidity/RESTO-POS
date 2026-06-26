import { useState } from 'react';
import {
  Truck,
  MapPin,
  Phone,
  User,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import { useOrdersStore, Order } from '../../store/useOrdersStore';

export default function Delivery() {
  const { orders, updateOrderStatus } = useOrdersStore();
  const [selectedOrderForDriver, setSelectedOrderForDriver] = useState<Order | null>(null);
  const [assignedDriver, setAssignedDriver] = useState('Pedro Repartidor');

  const deliveryOrders = orders.filter((o: Order) => o.source === 'delivery');


  const driversList = [
    { name: 'Pedro Repartidor', status: 'libre', ordersToday: 8 },
    { name: 'Lucas Moto', status: 'ocupado', ordersToday: 12 },
    { name: 'Marina Bicicleta', status: 'libre', ordersToday: 5 }
  ];

  const handleAssignDriver = () => {
    if (selectedOrderForDriver) {
      updateOrderStatus(selectedOrderForDriver.id, 'preparando');
      alert(`Repartidor ${assignedDriver} asignado con éxito a Pedido #${selectedOrderForDriver.orderNumber}.`);
      setSelectedOrderForDriver(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Despacho de Delivery</h2>
          <p className="text-muted-foreground text-xs">Asignación de repartidores, seguimiento de pedidos a domicilio y mapa de ruta.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Delivery orders lists */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <h3 className="font-extrabold text-sm">Pedidos de Delivery Hoy</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">
              {deliveryOrders.length} envíos
            </span>
          </div>

          {deliveryOrders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-2xl">
              No hay pedidos asignados a delivery para la fecha.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deliveryOrders.map((order: Order) => (
                <div key={order.id} className="p-5 bg-card border border-border rounded-2xl hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 h-64">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black text-primary">Pedido #{order.orderNumber}</span>
                        <h4 className="font-extrabold text-sm mt-0.5">{order.customerName}</h4>
                      </div>
                      <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase border ${
                        order.status === 'pendiente' 
                          ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                          : order.status === 'entregado'
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {order.status}
                      </span>
                    </div>

                    <div className="space-y-1 text-xs text-muted-foreground leading-relaxed">
                      <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-primary shrink-0" /> {order.customerAddress}</p>
                      <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-primary" /> {order.customerPhone}</p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                    <span className="font-black text-foreground">${order.total.toFixed(2)}</span>
                    
                    <div className="flex gap-1.5">
                      {order.status === 'pendiente' && (
                        <button
                          onClick={() => setSelectedOrderForDriver(order)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-[10px] flex items-center gap-1 hover:opacity-90 shadow-md shadow-primary/10"
                        >
                          <User className="w-3 h-3" /> Asignar Chofer
                        </button>
                      )}

                      {order.status === 'preparando' && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'entregado')}
                          className="px-3 py-1.5 rounded-lg bg-green-500 text-white font-bold text-[10px] flex items-center gap-1 hover:opacity-90 shadow-md"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Marcar Entregado
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Drivers and simulated GPS Tracking map */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Driver List status panel */}
          <div className="p-5 bg-card border border-border rounded-2xl space-y-4">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary" /> Repartidores Activos
            </h3>

            <div className="space-y-3">
              {driversList.map(driver => (
                <div key={driver.name} className="flex justify-between items-center p-3 rounded-xl bg-muted/40 border border-border/50 text-xs">
                  <div>
                    <h5 className="font-bold">{driver.name}</h5>
                    <span className="text-[10px] text-muted-foreground">{driver.ordersToday} envíos hoy</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    driver.status === 'libre' 
                      ? 'bg-green-500/10 text-green-500' 
                      : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {driver.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Map Simulation Container */}
          <div className="p-5 bg-card border border-border rounded-2xl space-y-4">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <Navigation className="w-4 h-4 text-primary" /> Ubicación GPS en Vivo
            </h3>
            
            {/* Visual simulation of routes */}
            <div className="w-full h-48 bg-gradient-to-tr from-slate-900 via-slate-950 to-indigo-950 rounded-xl relative border border-border overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
              
              {/* Map simulated routes drawing */}
              <div className="w-32 h-1 bg-primary/20 absolute rotate-12" />
              <div className="w-44 h-1 bg-primary/20 absolute -rotate-45" />

              {/* Ping markers */}
              <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary flex items-center justify-center absolute top-12 left-16 animate-pulse">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="w-6 h-6 rounded-full bg-green-500/20 border border-green-500 flex items-center justify-center absolute bottom-12 right-20 animate-pulse">
                <Truck className="w-3 h-3 text-green-500" />
              </div>

              <span className="text-[10px] text-slate-400 font-mono absolute bottom-3 left-3 bg-black/60 px-2 py-0.5 rounded border border-white/5">
                GPS: 34.6037° S, 58.3816° W
              </span>
            </div>
          </div>

        </div>

      </div>

      {/* Driver Assigner Modal */}
      {selectedOrderForDriver && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-extrabold text-sm">Asignar Repartidor</h3>
              <button onClick={() => setSelectedOrderForDriver(null)} className="p-1 hover:bg-muted rounded-lg text-muted-foreground">
                X
              </button>
            </div>

            <p className="text-xs text-muted-foreground">Seleccionar chofer para Pedido #{selectedOrderForDriver.orderNumber} de {selectedOrderForDriver.customerName}:</p>

            <select
              value={assignedDriver}
              onChange={(e) => setAssignedDriver(e.target.value)}
              className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            >
              {driversList.map(d => (
                <option key={d.name} value={d.name}>{d.name} ({d.status})</option>
              ))}
            </select>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setSelectedOrderForDriver(null)}
                className="py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80"
              >
                Cancelar
              </button>
              <button
                onClick={handleAssignDriver}
                className="py-2.5 rounded-xl text-xs font-bold text-white gradient-bg hover:opacity-90 shadow-lg shadow-primary/20"
              >
                Confirmar Despacho
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

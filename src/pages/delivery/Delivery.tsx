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
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase, isSupabaseConfigured } from '../../services/supabase';

export default function Delivery() {
  const { orders, updateOrderStatus } = useOrdersStore();
  const { employees } = useSettingsStore();
  const { user } = useAuthStore();
  const isProPreview = user?.planType === 'standard' || user?.planType === 'free';
  const [selectedOrderForDriver, setSelectedOrderForDriver] = useState<Order | null>(null);
  
  // Real drivers from employees with role 'delivery'
  const realDrivers = employees.filter(e => e.role === 'delivery');
  const [assignedDriverId, setAssignedDriverId] = useState(realDrivers[0]?.id || 'demo-d-1');

  const deliveryOrders = orders.filter((o: Order) => 
    (o.orderType === 'delivery' || o.source === 'delivery' || o.orderType === 'llevar') &&
    o.status !== 'cancelado'
  );

  const DEMO_DELIVERY_ORDERS: Order[] = [
    {
      id: 'demo-del-1',
      orderNumber: '1042',
      source: 'delivery',
      status: 'preparando',
      customerName: 'Martín Rodríguez',
      customerPhone: '+54 9 261 456-7890',
      customerAddress: 'Av. San Martín 1420, Dpto 4B',
      orderType: 'delivery',
      subtotal: 12500,
      discount: 0,
      tips: 500,
      total: 13000,
      paid: true,
      createdAt: new Date().toISOString(),
      items: []
    },
    {
      id: 'demo-del-2',
      orderNumber: '1045',
      source: 'delivery',
      status: 'pendiente',
      customerName: 'Sofía Álvarez',
      customerPhone: '+54 9 261 987-6543',
      customerAddress: 'Calle Belgrano 530',
      orderType: 'delivery',
      subtotal: 8200,
      discount: 0,
      tips: 0,
      total: 8200,
      paid: false,
      createdAt: new Date(Date.now() - 15 * 60000).toISOString(),
      items: []
    }
  ];

  const DEMO_DRIVERS_LIST = [
    { id: 'demo-d-1', name: 'Franco Martínez', status: 'libre' as const, ordersToday: 4 },
    { id: 'demo-d-2', name: 'Lucas Benítez', status: 'ocupado' as const, ordersToday: 7 },
  ];

  const actualDeliveryOrders = (deliveryOrders.length === 0 && isProPreview) ? DEMO_DELIVERY_ORDERS : deliveryOrders;

  const driversList = realDrivers.map(d => {
    const ordersForDriver = deliveryOrders.filter(o => o.deliveryDriverId === d.id);
    const activeOrders = ordersForDriver.filter(o => o.deliveryStatus === 'on_route');
    return {
      id: d.id,
      name: `${d.firstName} ${d.lastName}`,
      status: activeOrders.length > 0 ? 'ocupado' : 'libre',
      ordersToday: ordersForDriver.length
    };
  });

  const actualDriversList = (driversList.length === 0 && isProPreview) ? DEMO_DRIVERS_LIST : driversList;

  const handleAssignDriver = async () => {
    if (isProPreview) {
      alert('⭐ Vista Previa Plan PRO: La asignación y despacho de pedidos a repartidores en tiempo real requiere el Plan PRO.');
      setSelectedOrderForDriver(null);
      return;
    }
    if (selectedOrderForDriver && assignedDriverId) {
      // Optimistic local update
      useOrdersStore.getState().updateOrderLocally({
        ...selectedOrderForDriver,
        deliveryDriverId: assignedDriverId,
        deliveryStatus: 'pending'
      });

      if (isSupabaseConfigured()) {
        await supabase
          .from('orders')
          .update({ delivery_driver_id: assignedDriverId, delivery_status: 'pending' })
          .eq('id', selectedOrderForDriver.id);
      }
      alert(`Repartidor asignado con éxito a Pedido #${selectedOrderForDriver.orderNumber}.`);
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
              {actualDeliveryOrders.length} envíos {isProPreview && deliveryOrders.length === 0 && '(Vista Previa)'}
            </span>
          </div>

          {actualDeliveryOrders.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-2xl">
              No hay pedidos asignados a delivery para la fecha.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {actualDeliveryOrders.map((order: Order) => (
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
                    
                    {/* Actions */}
                    <div className="flex gap-2">
                      {(!order.deliveryDriverId && order.status !== 'entregado' && order.status !== 'pagado' && order.orderType !== 'llevar') && (
                        <button
                          onClick={() => setSelectedOrderForDriver(order)}
                          className="px-3 py-1.5 rounded-lg bg-primary text-white font-bold text-[10px] flex items-center gap-1 hover:opacity-90 shadow-md shadow-primary/10"
                        >
                          <User className="w-3 h-3" /> Asignar Chofer
                        </button>
                      )}
                      {(order.status === 'listo' && (order.deliveryDriverId || order.orderType === 'llevar')) && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'entregado')}
                          className="px-3 py-1.5 rounded-lg bg-green-500 text-white font-bold text-[10px] flex items-center gap-1 hover:opacity-90 shadow-md"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Marcar Entregado
                        </button>
                      )}
                      {order.deliveryDriverId && order.status === 'preparando' && (
                        <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 font-bold text-[10px] flex items-center gap-1 border border-blue-500/20">
                          <Navigation className="w-3 h-3" /> En Camino
                        </span>
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
              <Truck className="w-4 h-4 text-primary" /> Repartidores Activos {isProPreview && driversList.length === 0 && <span className="text-[10px] text-amber-500 font-normal">(modo prueba)</span>}
            </h3>

            <div className="space-y-3">
              {actualDriversList.map(driver => (
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
              value={assignedDriverId}
              onChange={(e) => setAssignedDriverId(e.target.value)}
              className="w-full p-3 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
            >
              <option value="" disabled>-- Seleccione --</option>
              {actualDriversList.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.status})</option>
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
                {isProPreview ? 'Despachar (Vista Previa PRO)' : 'Confirmar Despacho'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

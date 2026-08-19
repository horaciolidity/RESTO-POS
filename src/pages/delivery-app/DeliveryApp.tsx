import { useState, useEffect } from 'react';
import { useOrdersStore, Order } from '../../store/useOrdersStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import {
  MapPin,
  Truck,
  CheckCircle2,
  Navigation,
  Phone,
  Clock,
  LogOut,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function DeliveryApp() {
  const { orders } = useOrdersStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  // Filtramos pedidos de tipo delivery
  const deliveryOrders = orders.filter(o => o.orderType === 'delivery' || o.source === 'delivery');
  
  // Pedidos sin asignar
  const pendingOrders = deliveryOrders.filter(o => !o.deliveryDriverId && o.status !== 'entregado' && o.status !== 'pagado' && o.status !== 'cancelado');
  
  // Pedidos asignados a este repartidor
  const myOrders = deliveryOrders.filter(o => o.deliveryDriverId === user?.id && o.status !== 'entregado' && o.status !== 'pagado' && o.status !== 'cancelado');

  // Notification for new orders (simulated via state change comparison if needed, but for now we just show them)
  const [lastOrderCount, setLastOrderCount] = useState(pendingOrders.length);
  useEffect(() => {
    if (pendingOrders.length > lastOrderCount) {
      // Play sound
      const audio = new Audio('/notification.mp3');
      audio.play().catch(e => console.log('Audio play prevented', e));
    }
    setLastOrderCount(pendingOrders.length);
  }, [pendingOrders.length, lastOrderCount]);

  const handleTakeOrder = async (order: Order) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('orders')
          .update({ delivery_driver_id: user?.id, delivery_status: 'on_route', status: 'preparando' })
          .eq('id', order.id);
        if (error) throw error;
      } else {
        // Local state update via store
        useOrdersStore.getState().updateOrderLocally({
          ...order,
          deliveryDriverId: user?.id,
          deliveryStatus: 'on_route',
          status: 'preparando'
        });
      }
    } catch (err) {
      console.error(err);
      setError('Error al tomar el pedido');
    }
  };

  const handleMarkDelivered = async (order: Order) => {
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('orders')
          .update({ delivery_status: 'delivered', status: 'entregado' })
          .eq('id', order.id);
        if (error) throw error;
      } else {
        useOrdersStore.getState().updateOrderLocally({
          ...order,
          deliveryStatus: 'delivered',
          status: 'entregado'
        });
      }
    } catch (err) {
      console.error(err);
      setError('Error al marcar entregado');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const openMap = (address?: string) => {
    if (!address) return;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border p-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-extrabold text-sm leading-tight">{user?.name}</h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Modo Repartidor</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 p-4 space-y-6 pb-24">
        {error && (
          <div className="p-3 bg-red-500/10 text-red-500 text-xs font-bold rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        {/* Mis Entregas Activas */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-primary" /> Mis Entregas ({myOrders.length})
          </h2>
          {myOrders.length === 0 ? (
            <div className="p-6 bg-card border border-border rounded-2xl text-center text-muted-foreground text-sm">
              No tienes entregas activas.
            </div>
          ) : (
            <div className="space-y-3">
              {myOrders.map(order => (
                <div key={order.id} className="bg-card border border-primary/30 rounded-2xl p-4 space-y-4 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full">Pedido #{order.orderNumber}</span>
                      <h3 className="font-extrabold text-base mt-1">{order.customerName || 'Cliente sin nombre'}</h3>
                    </div>
                    <span className="font-black text-foreground">${order.total.toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-xl border border-border/50">
                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" /> 
                      <span className="font-medium text-foreground">{order.customerAddress || 'Sin dirección'}</span>
                    </p>
                    {order.customerPhone && (
                      <p className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="font-medium">{order.customerPhone}</span>
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => openMap(order.customerAddress)}
                      disabled={!order.customerAddress}
                      className="py-2.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50">
                      <Navigation className="w-4 h-4" /> Ver Ruta
                    </button>
                    <button 
                      onClick={() => handleMarkDelivered(order)}
                      className="py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-primary/20">
                      <CheckCircle2 className="w-4 h-4" /> Entregado
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Pedidos Disponibles */}
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" /> Pedidos Pendientes ({pendingOrders.length})
          </h2>
          {pendingOrders.length === 0 ? (
            <div className="p-6 bg-card border border-border rounded-2xl text-center text-muted-foreground text-sm">
              No hay pedidos pendientes de asignar.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-muted-foreground">#{order.orderNumber}</span>
                      <h3 className="font-bold text-sm mt-0.5">{order.customerAddress || 'Sin dirección'}</h3>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleTakeOrder(order)}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <Truck className="w-4 h-4" /> Tomar Pedido
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}

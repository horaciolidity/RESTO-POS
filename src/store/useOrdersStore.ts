import { create } from 'zustand';
import { Product } from './useInventoryStore';
import { supabase } from '../services/supabase';
import { ordersService } from '../services/ordersService';
import { tablesService } from '../services/tablesService';
import { useAuthStore } from './useAuthStore';

export interface OrderItem {
  id: string;
  product: Product;
  quantity: number;
  price: number;
  notes?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  source: 'pos' | 'mesas' | 'delivery' | 'take_away';
  status: 'pendiente' | 'preparando' | 'listo' | 'entregado' | 'cancelado';
  tableName?: string;
  waiterName?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  deliveryDriver?: string;
  orderType?: 'salon' | 'llevar' | 'delivery';
  orderNote?: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tips: number;
  total: number;
  createdAt: string;
  paymentMethod?: string;
  paid: boolean;
}

export interface RestaurantTable {
  id: string;
  number: number;
  zone: 'Salón Principal' | 'Terraza' | 'Planta Alta';
  capacity: number;
  status: 'libre' | 'ocupada' | 'esperando_comida' | 'comiendo' | 'solicita_cuenta';
  currentOrderId?: string;
  qr_token?: string;
}

export interface Incident {
  id: string;
  time: string;
  user: string;
  type: 'incidente' | 'reclamo' | 'faltante' | 'rotura' | 'error_caja' | 'error_cocina' | 'error_sistema';
  description: string;
}

export interface AuditAlert {
  id: string;
  time: string;
  user: string;
  type: 'rojo' | 'amarillo' | 'verde';
  title: string;
  amount: number;
  detail: string;
}

interface OrdersState {
  orders: Order[];
  tables: RestaurantTable[];
  incidents: Incident[];
  auditAlerts: AuditAlert[];
  initializeStore: () => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'orderNumber' | 'createdAt'>, existingOrderId?: string) => Promise<string>;
  updateOrderStatus: (id: string, status: Order['status']) => Promise<void>;
  closeOrder: (id: string, paymentMethod?: string) => Promise<void>;
  addTable: (table: Omit<RestaurantTable, 'id' | 'status'>) => Promise<void>;
  updateTable: (id: string, updates: Partial<RestaurantTable>) => Promise<void>;
  removeTable: (id: string) => Promise<void>;
  updateTableStatus: (id: string, status: RestaurantTable['status'], currentOrderId?: string) => Promise<void>;
  addIncident: (incident: Omit<Incident, 'id' | 'time'>) => void;
  addAuditAlert: (alert: Omit<AuditAlert, 'id' | 'time'>) => void;
  resolveAuditAlert: (id: string) => void;
}

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  tables: [],
  incidents: [],
  auditAlerts: [],

  initializeStore: async () => {
    const user = useAuthStore.getState().user;
    const branchId = user?.branchId;

    // Load tables initially
    const fetchedTables = await tablesService.getAll(branchId);
    set({
      tables: fetchedTables.map(t => ({
        id: t.id,
        number: t.number,
        zone: t.zone,
        capacity: t.capacity,
        status: t.status,
        currentOrderId: t.current_order_id || undefined,
        qr_token: t.qr_token
      }))
    });

    // Subscribe to Tables Realtime changes
    tablesService.unsubscribeFromTables();
    tablesService.subscribeToTables((supabaseTables) => {
      set({
        tables: supabaseTables.map(t => ({
          id: t.id,
          number: t.number,
          zone: t.zone,
          capacity: t.capacity,
          status: t.status,
          currentOrderId: t.current_order_id || undefined,
          qr_token: t.qr_token
        }))
      });
    }, branchId);

    // Load orders initially
    const fetchedOrders = await ordersService.getAll(branchId);
    const mappedOrders = fetchedOrders.map(o => ({
      id: o.id,
      orderNumber: o.order_number,
      source: o.source,
      status: o.status,
      tableName: o.table_name || undefined,
      waiterName: o.waiter_name || undefined,
      customerName: o.customer_name || undefined,
      customerPhone: o.customer_phone || undefined,
      customerAddress: o.customer_address || undefined,
      orderType: o.order_type || undefined,
      orderNote: o.order_note || undefined,
      subtotal: Number(o.subtotal),
      discount: Number(o.discount),
      tips: Number(o.tips),
      total: Number(o.total),
      paid: o.paid,
      paymentMethod: o.payment_method || undefined,
      createdAt: o.created_at,
      items: (o.order_items || []).map(oi => ({
        id: oi.id,
        price: Number(oi.unit_price),
        quantity: oi.quantity,
        notes: oi.notes || undefined,
        product: {
          id: oi.product_id || '',
          name: oi.product_name,
          costPrice: 0,
          salePrice: Number(oi.unit_price),
          taxRate: 21,
          imageUrl: '',
          description: '',
          type: 'producto' as const,
          active: true,
          stockMin: 0,
          stockCritical: 0,
          currentStock: 999,
          categoryId: '',
          categoryName: '',
          code: '',
          sku: ''
        }
      }))
    }));
    set({ orders: mappedOrders });

    // Subscribe to Orders Realtime changes
    ordersService.unsubscribeFromOrders();
    ordersService.subscribeToOrders((supabaseOrders) => {
      const mappedRealtime = supabaseOrders.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        source: o.source,
        status: o.status,
        tableName: o.table_name || undefined,
        waiterName: o.waiter_name || undefined,
        customerName: o.customer_name || undefined,
        customerPhone: o.customer_phone || undefined,
        customerAddress: o.customer_address || undefined,
        orderType: o.order_type || undefined,
        orderNote: o.order_note || undefined,
        subtotal: Number(o.subtotal),
        discount: Number(o.discount),
        tips: Number(o.tips),
        total: Number(o.total),
        paid: o.paid,
        paymentMethod: o.payment_method || undefined,
        createdAt: o.created_at,
        items: (o.order_items || []).map(oi => ({
          id: oi.id,
          price: Number(oi.unit_price),
          quantity: oi.quantity,
          notes: oi.notes || undefined,
          product: {
            id: oi.product_id || '',
            name: oi.product_name,
            costPrice: 0,
            salePrice: Number(oi.unit_price),
            taxRate: 21,
            imageUrl: '',
            description: '',
            type: 'producto' as const,
            active: true,
            stockMin: 0,
            stockCritical: 0,
            currentStock: 999,
            categoryId: '',
            categoryName: '',
            code: '',
            sku: ''
          }
        }))
      }));
      set({ orders: mappedRealtime });
    }, branchId);
  },

  addOrder: async (order, existingOrderId) => {
    const user = useAuthStore.getState().user;
    const branchId = user?.branchId || 'b1000000-0000-0000-0000-000000000001';
    const tenantId = user?.tenantId || 'a1000000-0000-0000-0000-000000000001';
    const planType = user?.planType || 'free';

    if (existingOrderId) {
      // 1. Delete old order items
      await supabase.from('order_items').delete().eq('order_id', existingOrderId);
      
      // 2. Insert new list of items
      const itemsToInsert = order.items.map(item => ({
        order_id: existingOrderId,
        product_id: item.product.id || undefined,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.price,
        notes: item.notes || undefined,
        modifiers: []
      }));
      await supabase.from('order_items').insert(itemsToInsert);

      // 3. Update parent order subtotal/total
      await supabase.from('orders').update({
        subtotal: order.subtotal,
        total: order.total
      }).eq('id', existingOrderId);

      // 4. Lightweight local update — do NOT call initializeStore() to avoid loop
      set((state) => ({
        orders: state.orders.map(o =>
          o.id === existingOrderId
            ? { ...o, subtotal: order.subtotal, total: order.total, items: order.items as any }
            : o
        )
      }));
      return existingOrderId;
    }

    // Limit check for free plan
    if (planType === 'free') {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      if (error) {
        console.error('[useOrdersStore.addOrder] error counting orders', error);
      } else if (count !== null && count >= 50) {
        throw new Error('LIMIT_REACHED');
      }
    }

    const orderId = await ordersService.create({
      tenant_id: tenantId,
      branch_id: branchId,
      order_number: '',
      source: order.source,
      status: order.status,
      table_id: get().tables.find(t => 
        t.id === order.tableName || 
        `Mesa ${t.number}` === order.tableName || 
        `${t.zone} - Mesa ${t.number}` === order.tableName
      )?.id || undefined,
      table_name: order.tableName || undefined,
      waiter_name: order.waiterName || undefined,
      customer_name: order.customerName || undefined,
      customer_phone: order.customerPhone || undefined,
      customer_address: order.customerAddress || undefined,
      order_type: order.orderType || undefined,
      order_note: order.orderNote || undefined,
      subtotal: order.subtotal,
      discount: order.discount,
      tips: order.tips,
      total: order.total,
      payment_method: order.paymentMethod || undefined,
      paid: order.paid,
      source_device: order.source === 'pos' ? 'pos' : 'waiter'
    } as any, order.items.map(item => ({
      product_id: item.product.id || undefined,
      product_name: item.product.name,
      quantity: item.quantity,
      unit_price: item.price,
      notes: item.notes || undefined,
      modifiers: []
    })));

    // The Realtime subscription (subscribeToOrders) will automatically update
    // the local store when Supabase inserts the row — no need to call
    // initializeStore() here, which would cancel/recreate subscriptions and
    // cause a render loop.
    return orderId || '';
  },

  updateOrderStatus: async (id, status) => {
    await ordersService.updateStatus(id, status);
  },

  closeOrder: async (id, paymentMethod) => {
    await ordersService.closeOrder(id, paymentMethod);
  },

  addTable: async (table) => {
    const user = useAuthStore.getState().user;
    const branchId = user?.branchId || 'b1000000-0000-0000-0000-000000000001';
    const tenantId = user?.tenantId;

    if (!tenantId) {
      console.error('[useOrdersStore.addTable] No tenantId found in session profile');
      return;
    }

    await tablesService.create({
      tenant_id: tenantId,
      branch_id: branchId,
      number: table.number,
      zone: table.zone,
      capacity: table.capacity,
      current_order_id: table.currentOrderId || undefined
    } as any);

    // Force an immediate local store refresh from the database
    const fetchedTables = await tablesService.getAll(branchId);
    set({
      tables: fetchedTables.map(t => ({
        id: t.id,
        number: t.number,
        zone: t.zone,
        capacity: t.capacity,
        status: t.status,
        currentOrderId: t.current_order_id || undefined,
        qr_token: t.qr_token
      }))
    });
  },

  updateTable: async (id, updates) => {
    await tablesService.updateStatus(id, updates.status || 'libre', updates.currentOrderId);
  },

  removeTable: async (id) => {
    const user = useAuthStore.getState().user;
    const branchId = user?.branchId || 'b1000000-0000-0000-0000-000000000001';
    
    await tablesService.remove(id);

    // Force an immediate local store refresh from the database
    const fetchedTables = await tablesService.getAll(branchId);
    set({
      tables: fetchedTables.map(t => ({
        id: t.id,
        number: t.number,
        zone: t.zone,
        capacity: t.capacity,
        status: t.status,
        currentOrderId: t.current_order_id || undefined,
        qr_token: t.qr_token
      }))
    });
  },

  updateTableStatus: async (id, status, currentOrderId) => {
    await tablesService.updateStatus(id, status, currentOrderId);
  },

  addIncident: (inc) => set((state) => ({
    incidents: [
      {
        ...inc,
        id: `i-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      ...state.incidents
    ]
  })),

  addAuditAlert: (alert) => set((state) => ({
    auditAlerts: [
      {
        ...alert,
        id: `a-${Date.now()}`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      },
      ...state.auditAlerts
    ]
  })),

  resolveAuditAlert: (id) => set((state) => ({
    auditAlerts: state.auditAlerts.filter(a => a.id !== id)
  }))
}));

if (typeof window !== 'undefined') {
  useOrdersStore.getState().initializeStore();
}

// Re-initialize ONLY when branchId actually changes (avoids loop)
let _lastOrdersBranchId: string | null | undefined = null;
useAuthStore.subscribe((state) => {
  const newBranchId = state.user?.branchId ?? null;
  if (newBranchId && newBranchId !== _lastOrdersBranchId) {
    _lastOrdersBranchId = newBranchId;
    useOrdersStore.getState().initializeStore();
  }
});

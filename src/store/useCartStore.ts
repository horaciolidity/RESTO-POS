import { create } from 'zustand';
import { Product } from './useInventoryStore';

export interface CartItem {
  product: Product;
  quantity: number;
  notes?: string;
  modifiers?: string[];
}

interface CartState {
  items: CartItem[];
  customer: { id: string; name: string; phone?: string } | null;
  discount: number; // percentage or fixed amount
  tips: number;
  paymentMethod: string;
  addItem: (product: Product, quantity?: number, notes?: string, modifiers?: string[]) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  setCustomer: (customer: { id: string; name: string; phone?: string } | null) => void;
  setDiscount: (discount: number) => void;
  setTips: (tips: number) => void;
  setPaymentMethod: (method: string) => void;
  orderType: 'salon' | 'llevar' | 'delivery';
  setOrderType: (type: 'salon' | 'llevar' | 'delivery') => void;
  selectedTableId: string | null;
  setSelectedTableId: (id: string | null) => void;
  orderNote: string;
  setOrderNote: (note: string) => void;
  clearCart: () => void;
  totals: () => { subtotal: number; discountAmount: number; total: number };
  lastCompletedOrder: string | null;
  setLastCompletedOrder: (orderNum: string | null) => void;
}

export const useCartStore = create<CartState>((set: any, get: any) => ({
  items: [],
  customer: null,
  discount: 0,
  tips: 0,
  paymentMethod: 'efectivo',
  orderType: 'salon',
  selectedTableId: null,
  orderNote: '',
  lastCompletedOrder: null,
  addItem: (product: Product, quantity = 1, notes = '', modifiers: string[] = []) => set((state: any) => {
    const existingIndex = state.items.findIndex((item: any) => item.product.id === product.id);
    if (existingIndex > -1) {
      const updatedItems = [...state.items];
      updatedItems[existingIndex].quantity += quantity;
      if (notes) updatedItems[existingIndex].notes = notes;
      if (modifiers.length > 0) updatedItems[existingIndex].modifiers = modifiers;
      return { items: updatedItems };
    }
    return { items: [...state.items, { product, quantity, notes, modifiers }] };
  }),
  removeItem: (productId: string) => set((state: any) => ({
    items: state.items.filter((item: any) => item.product.id !== productId)
  })),
  updateQuantity: (productId: string, quantity: number) => set((state: any) => ({
    items: state.items.map((item: any) =>
      item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
    )
  })),
  setCustomer: (customer: any) => set({ customer }),
  setDiscount: (discount: number) => set({ discount }),
  setTips: (tips: number) => set({ tips }),
  setPaymentMethod: (method: string) => set({ paymentMethod: method }),
  setOrderType: (type: 'salon' | 'llevar' | 'delivery') => set({ orderType: type }),
  setSelectedTableId: (id: string | null) => set({ selectedTableId: id }),
  setOrderNote: (note: string) => set({ orderNote: note }),
  setLastCompletedOrder: (orderNum: string | null) => set({ lastCompletedOrder: orderNum }),
  clearCart: () => set({ items: [], customer: null, discount: 0, tips: 0, paymentMethod: 'efectivo', orderType: 'salon', selectedTableId: null, orderNote: '' }),
  totals: () => {
    const items = get().items;
    const discount = get().discount;
    const tips = get().tips;
    
    const subtotal = items.reduce((acc: number, item: any) => acc + (item.product.salePrice * item.quantity), 0);
    const discountAmount = (subtotal * discount) / 100;
    const total = Math.max(0, subtotal - discountAmount + tips);
    
    return { subtotal, discountAmount, total };
  }
}));

// Cross-tab synchronization logic
useCartStore.subscribe((state) => {
  localStorage.setItem('cart-sync', JSON.stringify({
    items: state.items,
    discount: state.discount,
    tips: state.tips,
    paymentMethod: state.paymentMethod,
    orderType: state.orderType,
    selectedTableId: state.selectedTableId,
    orderNote: state.orderNote,
    lastCompletedOrder: state.lastCompletedOrder
  }));
});

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'cart-sync' && e.newValue) {
      const data = JSON.parse(e.newValue);
      useCartStore.setState({
        items: data.items,
        discount: data.discount,
        tips: data.tips,
        paymentMethod: data.paymentMethod,
        orderType: data.orderType || 'salon',
        selectedTableId: data.selectedTableId || null,
        orderNote: data.orderNote || '',
        lastCompletedOrder: data.lastCompletedOrder
      });
    }
  });
}


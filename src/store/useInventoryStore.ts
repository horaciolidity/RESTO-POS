import { create } from 'zustand';
import { isSupabaseConfigured } from '../services/supabase';
import { productsService } from '../services/productsService';
import { useAuthStore } from './useAuthStore';

export type ProductType = 'producto' | 'bebida' | 'combo' | 'promocion' | 'insumo';

export interface Product {
  id: string;
  name: string;
  code: string;
  sku: string;
  categoryId: string;
  categoryName: string;
  costPrice: number;
  salePrice: number;
  taxRate: number;
  imageUrl: string;
  description: string;
  type: ProductType;
  active: boolean;
  stockMin: number;
  stockCritical: number;
  currentStock: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
}

interface InventoryState {
  categories: Category[];
  products: Product[];
  loading: boolean;
  initializeStore: () => Promise<void>;
  addCategory: (category: Omit<Category, 'id'>) => Promise<void>;
  addProduct: (product: Omit<Product, 'id' | 'categoryName'>) => Promise<void>;
  updateProductStock: (id: string, newStock: number) => Promise<void>;
  adjustStock: (id: string, quantity: number, type: 'entrada' | 'salida') => Promise<void>;
  updateProduct: (id: string, product: Partial<Omit<Product, 'id' | 'categoryName'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
}

export const useInventoryStore = create<InventoryState>((set: any, get: any) => ({
  categories: [],
  products: [],
  loading: false,

  initializeStore: async () => {
    if (!isSupabaseConfigured()) return;

    const user = useAuthStore.getState().user;
    const branchId = user?.branchId;

    set({ loading: true });

    // Fetch categories filtered by branch
    const categoriesData = await productsService.getCategories(branchId);
    const mappedCategories = categoriesData.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || undefined,
      active: c.active ?? true
    }));

    // Fetch products filtered by branch
    const productsData = await productsService.getAll(branchId);
    const mappedProducts = productsData.map(p => ({
      id: p.id,
      name: p.name,
      code: p.code || '',
      sku: p.sku || '',
      categoryId: p.category_id,
      categoryName: p.categories?.name || 'Varios',
      costPrice: Number(p.cost_price),
      salePrice: Number(p.sale_price),
      taxRate: Number(p.tax_rate),
      imageUrl: p.image_url || '',
      description: p.description || '',
      type: p.type as ProductType,
      active: p.active ?? true,
      stockMin: p.stock_min,
      stockCritical: p.stock_critical,
      currentStock: p.current_stock
    }));

    set({ categories: mappedCategories, products: mappedProducts, loading: false });
  },

  addCategory: async (newCat: any) => {
    if (!isSupabaseConfigured()) return;
    const user = useAuthStore.getState().user;
    const branchId = user?.branchId || 'b1000000-0000-0000-0000-000000000001';
    const tenantId = user?.tenantId || 'a1000000-0000-0000-0000-000000000001';
    await productsService.createCategory({
      tenant_id: tenantId,
      branch_id: branchId,
      name: newCat.name,
      slug: newCat.slug,
      description: newCat.description || null,
      active: newCat.active ?? true
    });
    await get().initializeStore();
  },

  addProduct: async (newProd: any) => {
    if (!isSupabaseConfigured()) return;
    const user = useAuthStore.getState().user;
    const branchId = user?.branchId || 'b1000000-0000-0000-0000-000000000001';
    const tenantId = user?.tenantId || 'a1000000-0000-0000-0000-000000000001';
    await productsService.createProduct({
      tenant_id: tenantId,
      branch_id: branchId,
      category_id: newProd.categoryId,
      name: newProd.name,
      description: newProd.description || null,
      code: newProd.code || null,
      sku: newProd.sku || null,
      type: newProd.type,
      cost_price: newProd.costPrice,
      sale_price: newProd.salePrice,
      tax_rate: newProd.taxRate,
      image_url: newProd.imageUrl || null,
      active: newProd.active ?? true,
      stock_min: newProd.stockMin,
      stock_critical: newProd.stockCritical,
      current_stock: newProd.currentStock
    });
    await get().initializeStore();
  },

  updateProductStock: async (id: string, newStock: number) => {
    if (!isSupabaseConfigured()) return;
    await productsService.updateStock(id, newStock);
    await get().initializeStore();
  },

  adjustStock: async (id: string, quantity: number, type: 'entrada' | 'salida') => {
    if (!isSupabaseConfigured()) return;
    const factor = type === 'entrada' ? 1 : -1;
    const targetProd = get().products.find((p: any) => p.id === id);
    if (targetProd) {
      const nextStock = Math.max(0, targetProd.currentStock + (quantity * factor));
      await productsService.updateStock(id, nextStock);
      await get().initializeStore();
    }
  },

  updateProduct: async (id: string, updatedFields: any) => {
    if (!isSupabaseConfigured()) return;
    const dbFields: any = {};
    if (updatedFields.name !== undefined) dbFields.name = updatedFields.name;
    if (updatedFields.description !== undefined) dbFields.description = updatedFields.description;
    if (updatedFields.code !== undefined) dbFields.code = updatedFields.code;
    if (updatedFields.sku !== undefined) dbFields.sku = updatedFields.sku;
    if (updatedFields.categoryId !== undefined) dbFields.category_id = updatedFields.categoryId;
    if (updatedFields.type !== undefined) dbFields.type = updatedFields.type;
    if (updatedFields.costPrice !== undefined) dbFields.cost_price = updatedFields.costPrice;
    if (updatedFields.salePrice !== undefined) dbFields.sale_price = updatedFields.salePrice;
    if (updatedFields.taxRate !== undefined) dbFields.tax_rate = updatedFields.taxRate;
    if (updatedFields.imageUrl !== undefined) dbFields.image_url = updatedFields.imageUrl;
    if (updatedFields.active !== undefined) dbFields.active = updatedFields.active;
    if (updatedFields.stockMin !== undefined) dbFields.stock_min = updatedFields.stockMin;
    if (updatedFields.stockCritical !== undefined) dbFields.stock_critical = updatedFields.stockCritical;
    if (updatedFields.currentStock !== undefined) dbFields.current_stock = updatedFields.currentStock;

    await productsService.updateProduct(id, dbFields);
    await get().initializeStore();
  },

  deleteProduct: async (id: string) => {
    if (!isSupabaseConfigured()) return;
    await productsService.deleteProduct(id);
    await get().initializeStore();
  },
}));

// Auto-run initializeStore on load
if (typeof window !== 'undefined') {
  useInventoryStore.getState().initializeStore();
}

// Re-initialize when auth changes (user logs in)
useAuthStore.subscribe((state) => {
  if (state.user?.branchId) {
    useInventoryStore.getState().initializeStore();
  }
});

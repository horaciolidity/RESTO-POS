import { useState } from 'react';
import {
  History,
  Search,
  Plus,
  PackagePlus,
  UtensilsCrossed,
  Trash2,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Package,
  X,
  Pencil,
  Download,
  FileText
} from 'lucide-react';
import { useInventoryStore, Product, ProductType } from '../../store/useInventoryStore';
import { useAuthStore } from '../../store/useAuthStore';

interface MenuComponent {
  productId: string;
  quantity: number;
}

interface StockMovement {
  id: string;
  time: string;
  prodName: string;
  qty: number;
  type: 'entrada' | 'salida';
  reason: string;
  user: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error';
  message: string;
}

export default function Inventory() {
  const { products, adjustStock, categories, addProduct, updateProduct, deleteProduct, loading } = useInventoryStore();
  const { user } = useAuthStore();

  // Toast system
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = `t-${Date.now()}`;
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentType, setAdjustmentType] = useState<'entrada' | 'salida'>('entrada');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>('todos');

  // Modal state & tab
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'producto' | 'menu'>('producto');

  // ─── Producto / Insumo Form State ───
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newCostPrice, setNewCostPrice] = useState<number>(0);
  const [newSalePrice, setNewSalePrice] = useState<number>(0);
  const [newTaxRate, setNewTaxRate] = useState<number>(21.0);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<ProductType>('producto');
  const [newStockMin, setNewStockMin] = useState<number>(5);
  const [newStockCritical, setNewStockCritical] = useState<number>(2);
  const [newCurrentStock, setNewCurrentStock] = useState<number>(0);
  const [savingProduct, setSavingProduct] = useState(false);

  // ─── Menú Compuesto Form State ───
  const [menuName, setMenuName] = useState('');
  const [menuDescription, setMenuDescription] = useState('');
  const [menuCategoryId, setMenuCategoryId] = useState('');
  const [menuSalePrice, setMenuSalePrice] = useState<number>(0);
  const [menuTaxRate, setMenuTaxRate] = useState<number>(21.0);
  const [menuImageUrl, setMenuImageUrl] = useState('');
  const [menuCode, setMenuCode] = useState('');
  const [menuSku, setMenuSku] = useState('');
  const [menuComponents, setMenuComponents] = useState<MenuComponent[]>([{ productId: '', quantity: 1 }]);
  const [savingMenu, setSavingMenu] = useState(false);

  // ─── Edición Form State ───
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editSku, setEditSku] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editCostPrice, setEditCostPrice] = useState<number>(0);
  const [editSalePrice, setEditSalePrice] = useState<number>(0);
  const [editTaxRate, setEditTaxRate] = useState<number>(21.0);
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editType, setEditType] = useState<ProductType>('producto');
  const [editStockMin, setEditStockMin] = useState<number>(5);
  const [editStockCritical, setEditStockCritical] = useState<number>(2);
  const [editCurrentStock, setEditCurrentStock] = useState<number>(0);
  const [editActive, setEditActive] = useState<boolean>(true);
  const [savingEdit, setSavingEdit] = useState(false);

  // Stock movement history — session-local only (no mock data)
  const [movementsHistory, setMovementsHistory] = useState<StockMovement[]>([]);

  // ─── Export Functions ───
  const downloadJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(products, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataStr);
      downloadAnchor.setAttribute("download", `inventario_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Inventario descargado en formato JSON.');
    } catch (err) {
      showToast('Error al descargar JSON.', 'error');
    }
  };

  const downloadTXT = () => {
    try {
      let content = `INVENTARIO Y STOCK - ${new Date().toLocaleDateString()}\n`;
      content += "=".repeat(110) + "\n";
      content += String("PRODUCTO").padEnd(35) + " | " +
                 String("TIPO").padEnd(12) + " | " +
                 String("CÓDIGO").padEnd(15) + " | " +
                 String("SKU").padEnd(15) + " | " +
                 String("CATEGORÍA").padEnd(18) + " | " +
                 String("PRECIO").padEnd(10) + " | " +
                 String("STOCK").padEnd(8) + "\n";
      content += "=".repeat(110) + "\n";

      products.forEach(p => {
        const typeNames: Record<string, string> = {
          'producto': 'Plato', 'bebida': 'Bebida', 'insumo': 'Insumo', 'combo': 'Menú/Combo', 'promocion': 'Promo'
        };
        const typeStr = typeNames[p.type] || p.type;
        const codeStr = p.code || '—';
        const skuStr = p.sku || '—';
        const stockStr = p.type === 'combo' ? 'N/A' : String(p.currentStock);
        content += p.name.substring(0, 34).padEnd(35) + " | " +
                   typeStr.padEnd(12) + " | " +
                   codeStr.substring(0, 14).padEnd(15) + " | " +
                   skuStr.substring(0, 14).padEnd(15) + " | " +
                   p.categoryName.substring(0, 17).padEnd(18) + " | " +
                   `$${p.salePrice.toFixed(2)}`.padEnd(10) + " | " +
                   stockStr.padEnd(8) + "\n";
      });

      const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(content);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href",     dataStr);
      downloadAnchor.setAttribute("download", `inventario_${new Date().toISOString().split('T')[0]}.txt`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast('Inventario descargado en formato TXT.');
    } catch (err) {
      showToast('Error al descargar TXT.', 'error');
    }
  };

  // ─── Handlers ───
  const startEdit = (p: Product) => {
    setEditingItem(p);
    setEditName(p.name);
    setEditCode(p.code || '');
    setEditSku(p.sku || '');
    setEditCategoryId(p.categoryId);
    setEditCostPrice(p.costPrice);
    setEditSalePrice(p.salePrice);
    setEditTaxRate(p.taxRate);
    setEditImageUrl(p.imageUrl || '');
    setEditDescription(p.description || '');
    setEditType(p.type);
    setEditStockMin(p.stockMin || 0);
    setEditStockCritical(p.stockCritical || 0);
    setEditCurrentStock(p.currentStock || 0);
    setEditActive(p.active !== false);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!editName || !editCategoryId || editSalePrice < 0) {
      showToast('Completa los campos obligatorios: Nombre, Categoría y Precio de Venta.', 'error');
      return;
    }
    setSavingEdit(true);
    try {
      await updateProduct(editingItem.id, {
        name: editName,
        code: editCode,
        sku: editSku,
        categoryId: editCategoryId,
        costPrice: editCostPrice,
        salePrice: editSalePrice,
        taxRate: editTaxRate,
        imageUrl: editImageUrl,
        description: editDescription,
        type: editType,
        stockMin: editStockMin,
        stockCritical: editStockCritical,
        currentStock: editCurrentStock,
        active: editActive
      });
      showToast(`Cambios en "${editName}" guardados correctamente.`);
      setEditingItem(null);
    } catch (error) {
      showToast('Error al guardar los cambios.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAdjustStock = async () => {
    if (!selectedProduct || adjustmentQty <= 0) {
      showToast('Ingresa una cantidad mayor a 0.', 'error');
      return;
    }
    await adjustStock(selectedProduct.id, adjustmentQty, adjustmentType);
    const newMove: StockMovement = {
      id: `h-${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      prodName: selectedProduct.name,
      qty: adjustmentQty,
      type: adjustmentType,
      reason: adjustmentReason || (adjustmentType === 'entrada' ? 'Reposición de stock' : 'Ajuste de inventario'),
      user: user?.name || 'Administrador'
    };
    setMovementsHistory(prev => [newMove, ...prev]);
    showToast(`Stock de "${selectedProduct.name}" actualizado correctamente.`);
    setSelectedProduct(null);
    setAdjustmentQty(0);
    setAdjustmentReason('');
  };

  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      showToast(`Producto "${productToDelete.name}" eliminado correctamente.`);
    } catch (error) {
      showToast('Ocurrió un error al eliminar el producto.', 'error');
    } finally {
      setProductToDelete(null);
    }
  };

  const resetProductForm = () => {
    setNewName(''); setNewCode(''); setNewSku(''); setNewCostPrice(0);
    setNewSalePrice(0); setNewImageUrl(''); setNewDescription(''); setNewCurrentStock(0);
    setNewStockMin(5); setNewStockCritical(2); setNewType('producto');
    setNewCategoryId(categories[0]?.id || '');
  };

  const handleAddNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const catId = newCategoryId || categories[0]?.id;
    if (!newName || !catId || newSalePrice < 0) {
      showToast('Completa los campos obligatorios: Nombre, Categoría y Precio de Venta.', 'error');
      return;
    }
    setSavingProduct(true);
    const autoSku = newSku || `SKU-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    await addProduct({
      name: newName, code: newCode || autoSku, sku: autoSku, categoryId: catId,
      costPrice: newCostPrice, salePrice: newSalePrice, taxRate: newTaxRate,
      imageUrl: newImageUrl || '',
      description: newDescription, type: newType, active: true,
      stockMin: newStockMin, stockCritical: newStockCritical, currentStock: newCurrentStock
    });
    resetProductForm();
    setIsAddModalOpen(false);
    showToast(`Producto "${newName}" creado correctamente.`);
    setSavingProduct(false);
  };

  const addMenuComponent = () => setMenuComponents(prev => [...prev, { productId: '', quantity: 1 }]);
  const removeMenuComponent = (index: number) => setMenuComponents(prev => prev.filter((_, i) => i !== index));
  const updateMenuComponent = (index: number, field: keyof MenuComponent, value: string | number) => {
    setMenuComponents(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const menuCostTotal = menuComponents.reduce((total, comp) => {
    const prod = products.find(p => p.id === comp.productId);
    if (prod) return total + prod.costPrice * comp.quantity;
    return total;
  }, 0);

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const catId = menuCategoryId || categories[0]?.id;
    if (!menuName || !catId || menuSalePrice <= 0) {
      showToast('Completa los campos obligatorios: Nombre, Categoría y Precio de Venta.', 'error');
      return;
    }
    const validComponents = menuComponents.filter(c => c.productId && c.quantity > 0);
    if (validComponents.length === 0) {
      showToast('Agrega al menos un componente/ingrediente al menú.', 'error');
      return;
    }
    setSavingMenu(true);
    const componentNames = validComponents.map(c => {
      const p = products.find(prod => prod.id === c.productId);
      return p ? `${c.quantity}x ${p.name}` : '';
    }).join(', ');
    const autoSku = menuSku || `MEN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    await addProduct({
      name: menuName, code: menuCode || autoSku, sku: autoSku, categoryId: catId,
      costPrice: menuCostTotal, salePrice: menuSalePrice, taxRate: menuTaxRate,
      imageUrl: menuImageUrl || '',
      description: menuDescription || `Compuesto por: ${componentNames}`,
      type: 'combo', active: true, stockMin: 0, stockCritical: 0, currentStock: 999
    });
    setMenuName(''); setMenuDescription(''); setMenuSalePrice(0); setMenuImageUrl('');
    setMenuCategoryId(''); setMenuComponents([{ productId: '', quantity: 1 }]);
    setMenuCode(''); setMenuSku('');
    setIsAddModalOpen(false);
    showToast(`Menú "${menuName}" creado y disponible en el POS.`);
    setSavingMenu(false);
  };

  const typeLabels: Record<string, string> = {
    'todos': 'Todos', 'producto': 'Platos', 'bebida': 'Bebidas',
    'insumo': 'Insumos', 'combo': 'Combos/Menús', 'promocion': 'Promociones'
  };

  const filteredProducts = products.filter((p: Product) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.code || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeTypeFilter === 'todos' || p.type === activeTypeFilter;
    return matchesSearch && matchesType;
  });

  // KPI summary counts
  const outOfStockCount = products.filter(p => p.type !== 'combo' && p.currentStock <= p.stockCritical).length;
  const lowStockCount = products.filter(p => p.type !== 'combo' && p.currentStock <= p.stockMin && p.currentStock > p.stockCritical).length;

  return (
    <div className="space-y-6">

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-semibold pointer-events-auto transition-all animate-in slide-in-from-right duration-300 ${
              t.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-red-500 text-white'
            }`}
          >
            {t.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
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

      {/* Loading overlay */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground font-semibold">Cargando inventario...</p>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventario &amp; Stock</h2>
          <p className="text-muted-foreground text-xs">Control de existencias, productos, insumos y menús en tiempo real.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={downloadTXT}
            className="px-3 py-2 bg-muted border border-border hover:bg-card text-muted-foreground font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            title="Exportar a TXT"
          >
            <Download className="w-3.5 h-3.5" /> TXT
          </button>
          <button
            onClick={downloadJSON}
            className="px-3 py-2 bg-muted border border-border hover:bg-card text-muted-foreground font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            title="Exportar a JSON"
          >
            <FileText className="w-3.5 h-3.5" /> JSON
          </button>
          <button
            onClick={() => { setModalTab('producto'); resetProductForm(); setIsAddModalOpen(true); }}
            className="px-4 py-2 bg-muted border border-border hover:bg-primary/10 hover:border-primary hover:text-primary text-foreground font-bold text-sm rounded-xl transition-all flex items-center gap-2"
          >
            <PackagePlus className="w-4 h-4" /> Nuevo Producto / Insumo
          </button>
          <button
            onClick={() => { setModalTab('menu'); setIsAddModalOpen(true); }}
            className="px-4 py-2 bg-primary text-white font-bold text-sm rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <UtensilsCrossed className="w-4 h-4" /> Nuevo Menú
          </button>
        </div>
      </div>

      {/* KPI Summary Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-card border border-border rounded-2xl text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Total Productos</p>
          <p className="text-2xl font-extrabold">{products.length}</p>
        </div>
        <div className="p-4 bg-card border border-border rounded-2xl text-center">
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Categorías</p>
          <p className="text-2xl font-extrabold">{categories.length}</p>
        </div>
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl text-center">
          <p className="text-[10px] text-amber-500 uppercase font-bold tracking-wider">Stock Bajo</p>
          <p className="text-2xl font-extrabold text-amber-500">{lowStockCount}</p>
        </div>
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-center">
          <p className="text-[10px] text-red-500 uppercase font-bold tracking-wider">Sin Stock</p>
          <p className="text-2xl font-extrabold text-red-500">{outOfStockCount}</p>
        </div>
      </div>

      {/* Type Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(typeLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTypeFilter(key)}
            className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
              activeTypeFilter === key
                ? 'bg-primary text-white border-primary'
                : 'bg-muted border-border text-muted-foreground hover:bg-card'
            }`}
          >
            {label} {key !== 'todos' && `(${products.filter(p => p.type === key).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left column: products table */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <input
              type="text" placeholder="Buscar por nombre o código..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card border border-border focus:border-primary focus:ring-1 focus:ring-primary rounded-xl py-2.5 pl-10 pr-4 text-xs focus:outline-none placeholder:text-muted-foreground/60 transition-all"
            />
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <Package className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="font-bold text-sm text-muted-foreground">
                  {products.length === 0 ? 'No hay productos en el inventario' : 'No hay resultados para tu búsqueda'}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {products.length === 0
                    ? 'Agregá tu primer producto usando el botón "Nuevo Producto / Insumo".'
                    : 'Probá con otro término de búsqueda o cambiá el filtro de tipo.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/50 border-b border-border text-muted-foreground font-extrabold">
                      <th className="p-4">Producto / Ítem</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Código / SKU</th>
                      <th className="p-4 text-center">Stock Actual</th>
                      <th className="p-4">Estado</th>
                      <th className="p-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredProducts.map((p: Product) => {
                      const isOutOfStock = p.type !== 'combo' && p.currentStock <= p.stockCritical;
                      const isLowStock = p.type !== 'combo' && p.currentStock <= p.stockMin && !isOutOfStock;
                      const typeColors: Record<string, string> = {
                        'producto': 'bg-blue-500/10 text-blue-500',
                        'bebida': 'bg-cyan-500/10 text-cyan-500',
                        'insumo': 'bg-orange-500/10 text-orange-500',
                        'combo': 'bg-purple-500/10 text-purple-500',
                        'promocion': 'bg-pink-500/10 text-pink-500',
                      };
                      const typeNames: Record<string, string> = {
                        'producto': 'Plato', 'bebida': 'Bebida', 'insumo': 'Insumo', 'combo': 'Menú/Combo', 'promocion': 'Promo'
                      };
                      return (
                        <tr key={p.id} className={`hover:bg-muted/20 transition-all ${isOutOfStock ? 'bg-red-500/3' : ''}`}>
                          <td className="p-4 font-bold max-w-[200px]">
                            <span className="truncate block">{p.name}</span>
                            {p.description && <span className="text-[10px] text-muted-foreground font-normal truncate block">{p.description.substring(0, 45)}{p.description.length > 45 ? '...' : ''}</span>}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${typeColors[p.type] || 'bg-muted text-muted-foreground'}`}>
                              {typeNames[p.type] || p.type}
                            </span>
                          </td>
                          <td className="p-4 text-muted-foreground font-mono">{p.code || '—'}</td>
                          <td className="p-4 text-center font-black">
                            {p.type === 'combo' ? <span className="text-muted-foreground text-[10px]">N/A</span> : p.currentStock}
                          </td>
                          <td className="p-4">
                            {p.type === 'combo' ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-purple-500/10 text-purple-500">Menú</span>
                            ) : isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-red-500/10 text-red-500">Sin Stock</span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-amber-500/10 text-amber-500">Bajo</span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-green-500/10 text-green-500">OK</span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              {p.type !== 'combo' && (
                                <button
                                  onClick={() => { setSelectedProduct(p); setAdjustmentQty(0); setAdjustmentReason(''); }}
                                  className="px-2.5 py-1.5 bg-primary/10 border border-primary/20 text-primary font-bold rounded-lg text-[10px] hover:bg-primary/20 transition-all"
                                >
                                  Ajustar Stock
                                </button>
                              )}
                              <button
                                onClick={() => startEdit(p)}
                                className="p-1.5 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/25 rounded-lg transition-all"
                                title="Editar Ítem"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setProductToDelete(p)}
                                className="p-1.5 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/25 rounded-lg transition-all"
                                title="Eliminar Producto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: movements history */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-5 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Movimientos de Esta Sesión
            </h3>
            {movementsHistory.length === 0 ? (
              <div className="py-10 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
                  <History className="w-5 h-5 text-muted-foreground/40" />
                </div>
                <p className="text-xs text-muted-foreground font-semibold">Sin movimientos aún</p>
                <p className="text-[10px] text-muted-foreground/60">Los ajustes de stock que realices aquí aparecerán en este historial.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {movementsHistory.map(move => (
                  <div key={move.id} className="p-3 bg-muted/40 rounded-xl border border-border/50 space-y-1.5 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold truncate max-w-[140px]">{move.prodName}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase shrink-0 ${
                        move.type === 'entrada' ? 'bg-green-500/15 text-green-500' : 'bg-red-500/15 text-red-500'
                      }`}>
                        {move.type === 'entrada' ? `+${move.qty}` : `-${move.qty}`}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">{move.reason}</p>
                    <div className="flex justify-between text-[9px] text-muted-foreground pt-1 border-t border-border/30">
                      <span>{move.user}</span>
                      <span>{move.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Adjustment Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-extrabold text-sm">Ajustar Stock</h3>
              <button onClick={() => setSelectedProduct(null)} className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Modificar existencias de:</p>
              <p className="font-bold text-sm mt-0.5">{selectedProduct.name}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground uppercase font-bold">Stock actual:</span>
                <span className="font-extrabold text-primary">{selectedProduct.currentStock}</span>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAdjustmentType('entrada')}
                  className={`py-2.5 rounded-xl font-bold border transition-all ${adjustmentType === 'entrada' ? 'border-green-500 bg-green-500/10 text-green-500' : 'border-border text-muted-foreground hover:bg-muted'}`}
                >
                  ▲ Entrada (+)
                </button>
                <button
                  onClick={() => setAdjustmentType('salida')}
                  className={`py-2.5 rounded-xl font-bold border transition-all ${adjustmentType === 'salida' ? 'border-red-500 bg-red-500/10 text-red-500' : 'border-border text-muted-foreground hover:bg-muted'}`}
                >
                  ▼ Salida (-)
                </button>
              </div>
              <input
                type="number" min="1" value={adjustmentQty || ''}
                onChange={(e) => setAdjustmentQty(Number(e.target.value))}
                placeholder="Cantidad a ajustar"
                className="w-full p-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs font-bold"
              />
              <input
                type="text" value={adjustmentReason}
                onChange={(e) => setAdjustmentReason(e.target.value)}
                placeholder="Motivo (ej: Reposición, Merma, Rotura...)"
                className="w-full p-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
              />
              {adjustmentQty > 0 && (
                <div className={`p-3 rounded-xl text-xs font-bold flex justify-between ${
                  adjustmentType === 'entrada' ? 'bg-green-500/5 border border-green-500/20 text-green-500' : 'bg-red-500/5 border border-red-500/20 text-red-500'
                }`}>
                  <span>Stock resultante:</span>
                  <span className="font-extrabold">
                    {adjustmentType === 'entrada'
                      ? selectedProduct.currentStock + adjustmentQty
                      : Math.max(0, selectedProduct.currentStock - adjustmentQty)}
                  </span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => setSelectedProduct(null)} className="py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 w-full transition-colors">Cancelar</button>
              <button
                onClick={handleAdjustStock}
                disabled={adjustmentQty <= 0}
                className="py-2.5 rounded-xl text-xs font-bold text-white gradient-bg hover:opacity-90 shadow-lg shadow-primary/20 w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Guardar Ajuste
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card rounded-2xl border border-border p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <h3 className="font-extrabold text-sm text-red-500 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Eliminar Producto
              </h3>
              <button onClick={() => setProductToDelete(null)} className="p-1.5 hover:bg-muted rounded-xl text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">¿Estás seguro de que querés eliminar el siguiente producto del inventario?</p>
              <div className="p-3 bg-muted/50 rounded-xl border border-border">
                <p className="font-bold text-sm text-foreground">{productToDelete.name}</p>
                <div className="mt-1 flex gap-4 text-[10px] text-muted-foreground">
                  <span>Código: <strong className="font-semibold">{productToDelete.code || '—'}</strong></span>
                  <span>Categoría: <strong className="font-semibold">{productToDelete.categoryName}</strong></span>
                </div>
              </div>
              <p className="text-red-500 font-semibold mt-2">Esta acción es irreversible y removerá permanentemente el producto del catálogo.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button onClick={() => setProductToDelete(null)} className="py-2.5 rounded-xl text-xs font-bold bg-muted hover:bg-muted/80 w-full transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleDeleteProduct}
                className="py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-600/20 w-full transition-all"
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-card rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">

            {/* Modal Header with Tabs */}
            <div className="p-6 pb-0 border-b border-border flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-extrabold text-lg">Agregar al Inventario</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setModalTab('producto')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-all ${
                    modalTab === 'producto' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <PackagePlus className="w-4 h-4" /> Producto / Insumo
                </button>
                <button
                  onClick={() => setModalTab('menu')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition-all ${
                    modalTab === 'menu' ? 'border-primary text-primary bg-primary/5' : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <UtensilsCrossed className="w-4 h-4" /> Menú Compuesto
                </button>
              </div>
            </div>

            {/* ─── Tab: Producto / Insumo ─── */}
            {modalTab === 'producto' && (
              <form onSubmit={handleAddNewProduct} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">1</span> Información General</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Nombre del Producto *</label>
                      <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Ej: Milanesa Napolitana" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Tipo *</label>
                      <select value={newType} onChange={e => setNewType(e.target.value as ProductType)} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none">
                        <option value="producto">🍽️ Producto Final (Plato)</option>
                        <option value="bebida">🥤 Bebida</option>
                        <option value="insumo">📦 Insumo / Materia Prima</option>
                        <option value="promocion">🏷️ Promoción</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Categoría *</label>
                      <select required value={newCategoryId || categories[0]?.id || ''} onChange={e => setNewCategoryId(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none">
                        {categories.length === 0
                          ? <option value="">— Sin categorías disponibles —</option>
                          : categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        }
                      </select>
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Descripción</label>
                      <input type="text" value={newDescription} onChange={e => setNewDescription(e.target.value)} placeholder="Detalle opcional..." className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">2</span> Códigos e Identificadores</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Código de Barras (Opcional)</label>
                      <input type="text" value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="Ej: 779123456789" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">SKU Interno (auto si vacío)</label>
                      <input type="text" value={newSku} onChange={e => setNewSku(e.target.value)} placeholder="Ej: INS-HAR-001" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">3</span> Precios e Impuestos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Costo de Compra ($)</label>
                      <input type="number" step="0.01" min="0" value={newCostPrice} onChange={e => setNewCostPrice(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Precio de Venta ($) *</label>
                      <input required type="number" step="0.01" min="0" value={newSalePrice} onChange={e => setNewSalePrice(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">IVA (%)</label>
                      <select value={newTaxRate} onChange={e => setNewTaxRate(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none">
                        <option value="21">21% General</option>
                        <option value="10.5">10.5% Reducido</option>
                        <option value="0">0% Exento</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">4</span> Gestión de Stock</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Stock Inicial</label>
                      <input type="number" min="0" value={newCurrentStock} onChange={e => setNewCurrentStock(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Mínimo (⚠️ Alerta)</label>
                      <input type="number" min="0" value={newStockMin} onChange={e => setNewStockMin(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Crítico (🔴 Sin Stock)</label>
                      <input type="number" min="0" value={newStockCritical} onChange={e => setNewStockCritical(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">5</span> Imagen (Opcional)</h4>
                  <div className="text-xs">
                    <label className="text-muted-foreground mb-1 font-semibold block">URL de Imagen</label>
                    <input type="text" value={newImageUrl} onChange={e => setNewImageUrl(e.target.value)} placeholder="https://ejemplo.com/imagen.jpg" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="py-3 rounded-xl font-bold bg-muted hover:bg-muted/80 w-full transition-colors text-sm">Cancelar</button>
                  <button type="submit" disabled={savingProduct} className="py-3 rounded-xl font-bold text-white gradient-bg hover:opacity-90 shadow-lg shadow-primary/20 w-full flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                    {savingProduct ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
                    {savingProduct ? 'Guardando...' : 'Guardar Producto'}
                  </button>
                </div>
              </form>
            )}

            {/* ─── Tab: Menú Compuesto ─── */}
            {modalTab === 'menu' && (
              <form onSubmit={handleAddMenu} className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">1</span> Información del Menú</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Nombre del Menú *</label>
                      <input required type="text" value={menuName} onChange={e => setMenuName(e.target.value)} placeholder="Ej: Menú Ejecutivo del Día" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Categoría *</label>
                      <select required value={menuCategoryId || categories[0]?.id || ''} onChange={e => setMenuCategoryId(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none">
                        {categories.length === 0
                          ? <option value="">— Sin categorías disponibles —</option>
                          : categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                        }
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-muted-foreground mb-1 font-semibold block">Descripción del Menú</label>
                      <input type="text" value={menuDescription} onChange={e => setMenuDescription(e.target.value)} placeholder="Ej: Incluye primer plato, principal y postre" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Código de Barras del Menú (Opcional)</label>
                      <input type="text" value={menuCode} onChange={e => setMenuCode(e.target.value)} placeholder="Ej: 779123456789" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">SKU Interno del Menú (auto si vacío)</label>
                      <input type="text" value={menuSku} onChange={e => setMenuSku(e.target.value)} placeholder="Ej: MEN-EJE-001" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-primary flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">2</span>
                      Componentes / Ingredientes
                    </h4>
                    <button type="button" onClick={addMenuComponent} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors">
                      <Plus className="w-3 h-3" /> Añadir Componente
                    </button>
                  </div>

                  <div className="space-y-3">
                    {menuComponents.map((comp, index) => {
                      const selectedProd = products.find(p => p.id === comp.productId);
                      return (
                        <div key={index} className="flex items-center gap-3 p-3 bg-muted/40 border border-border rounded-xl">
                          <span className="text-[10px] font-black text-muted-foreground min-w-[20px]">{index + 1}.</span>
                          <select
                            value={comp.productId}
                            onChange={e => updateMenuComponent(index, 'productId', e.target.value)}
                            className="flex-1 p-2 bg-card border border-border rounded-lg text-xs focus:ring-1 focus:ring-primary outline-none"
                          >
                            <option value="">-- Seleccionar producto/insumo --</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.name} (${p.costPrice.toFixed(2)} costo)</option>
                            ))}
                          </select>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <label className="text-[10px] text-muted-foreground font-semibold whitespace-nowrap">Cant:</label>
                            <input
                              type="number" min="0.1" step="0.1" value={comp.quantity}
                              onChange={e => updateMenuComponent(index, 'quantity', Number(e.target.value))}
                              className="w-16 p-2 bg-card border border-border rounded-lg text-xs text-center font-mono focus:ring-1 focus:ring-primary outline-none"
                            />
                          </div>
                          {selectedProd && (
                            <span className="text-[10px] text-green-500 font-bold min-w-[60px] text-right">
                              ${(selectedProd.costPrice * comp.quantity).toFixed(2)}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeMenuComponent(index)}
                            disabled={menuComponents.length === 1}
                            className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-30"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex justify-between items-center">
                    <div>
                      <span className="text-xs font-bold text-primary">Costo Total del Menú</span>
                      <p className="text-[10px] text-muted-foreground">Suma de todos los componentes</p>
                    </div>
                    <span className="text-xl font-black text-primary">${menuCostTotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">3</span> Precio y Datos de Venta</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Precio de Venta ($) *</label>
                      <input required type="number" step="0.01" min="0" value={menuSalePrice} onChange={e => setMenuSalePrice(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">IVA (%)</label>
                      <select value={menuTaxRate} onChange={e => setMenuTaxRate(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none">
                        <option value="21">21% General</option>
                        <option value="10.5">10.5% Reducido</option>
                        <option value="0">0% Exento</option>
                      </select>
                    </div>
                    <div className="flex items-center">
                      {menuSalePrice > 0 && menuCostTotal > 0 && (
                        <div className={`w-full p-2.5 rounded-xl border text-center ${menuSalePrice > menuCostTotal ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                          <span className={`text-[10px] font-bold block ${menuSalePrice > menuCostTotal ? 'text-green-500' : 'text-red-500'}`}>Margen</span>
                          <span className={`font-black text-sm ${menuSalePrice > menuCostTotal ? 'text-green-500' : 'text-red-500'}`}>
                            {menuCostTotal > 0 ? (((menuSalePrice - menuCostTotal) / menuCostTotal) * 100).toFixed(1) : 0}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs">
                    <label className="text-muted-foreground mb-1 font-semibold block">URL de Imagen (Opcional)</label>
                    <input type="text" value={menuImageUrl} onChange={e => setMenuImageUrl(e.target.value)} placeholder="https://ejemplo.com/menu.jpg" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="py-3 rounded-xl font-bold bg-muted hover:bg-muted/80 w-full transition-colors text-sm">Cancelar</button>
                  <button type="submit" disabled={savingMenu} className="py-3 rounded-xl font-bold text-white gradient-bg hover:opacity-90 shadow-lg shadow-primary/20 w-full flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                    {savingMenu ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <BookOpen className="w-4 h-4" />}
                    {savingMenu ? 'Guardando...' : 'Crear Menú'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-card rounded-2xl border border-border shadow-2xl animate-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="p-6 pb-0 border-b border-border flex-shrink-0 flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-lg">Editar {editingItem.type === 'combo' ? 'Menú' : 'Producto / Insumo'}</h3>
              <button onClick={() => setEditingItem(null)} className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">1</span> Información General</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-muted-foreground mb-1 font-semibold block">Nombre *</label>
                    <input required type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  {editingItem.type !== 'combo' && (
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Tipo *</label>
                      <select value={editType} onChange={e => setEditType(e.target.value as ProductType)} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none">
                        <option value="producto">🍽️ Producto Final (Plato)</option>
                        <option value="bebida">🥤 Bebida</option>
                        <option value="insumo">📦 Insumo / Materia Prima</option>
                        <option value="promocion">🏷️ Promoción</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-muted-foreground mb-1 font-semibold block">Categoría *</label>
                    <select required value={editCategoryId} onChange={e => setEditCategoryId(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none">
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 font-semibold block">Descripción</label>
                    <input type="text" value={editDescription} onChange={e => setEditDescription(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">2</span> Códigos e Identificadores</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-muted-foreground mb-1 font-semibold block">Código de Barras (Opcional)</label>
                    <input type="text" value={editCode} onChange={e => setEditCode(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 font-semibold block">SKU Interno</label>
                    <input type="text" value={editSku} onChange={e => setEditSku(e.target.value)} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">3</span> Precios e Impuestos</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  {editingItem.type !== 'combo' && (
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Costo de Compra ($)</label>
                      <input type="number" step="0.01" min="0" value={editCostPrice} onChange={e => setEditCostPrice(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                  )}
                  <div>
                    <label className="text-muted-foreground mb-1 font-semibold block">Precio de Venta ($) *</label>
                    <input required type="number" step="0.01" min="0" value={editSalePrice} onChange={e => setEditSalePrice(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                  </div>
                  <div>
                    <label className="text-muted-foreground mb-1 font-semibold block">IVA (%)</label>
                    <select value={editTaxRate} onChange={e => setEditTaxRate(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none">
                      <option value="21">21% General</option>
                      <option value="10.5">10.5% Reducido</option>
                      <option value="0">0% Exento</option>
                    </select>
                  </div>
                </div>
              </div>

              {editingItem.type !== 'combo' && (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">4</span> Gestión de Stock</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Stock Actual</label>
                      <input type="number" min="0" value={editCurrentStock} onChange={e => setEditCurrentStock(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Mínimo (⚠️ Alerta)</label>
                      <input type="number" min="0" value={editStockMin} onChange={e => setEditStockMin(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                    <div>
                      <label className="text-muted-foreground mb-1 font-semibold block">Crítico (🔴 Sin Stock)</label>
                      <input type="number" min="0" value={editStockCritical} onChange={e => setEditStockCritical(Number(e.target.value))} className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none font-mono" />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-sm font-bold text-primary flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">{editingItem.type === 'combo' ? '4' : '5'}</span> Estado &amp; Imagen</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="text-muted-foreground mb-1 font-semibold block">URL de Imagen</label>
                    <input type="text" value={editImageUrl} onChange={e => setEditImageUrl(e.target.value)} placeholder="https://ejemplo.com/imagen.jpg" className="w-full p-2.5 bg-muted border border-border rounded-xl focus:ring-1 focus:ring-primary outline-none" />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      id="editActive"
                      checked={editActive}
                      onChange={e => setEditActive(e.target.checked)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary focus:ring-1"
                    />
                    <label htmlFor="editActive" className="font-bold text-foreground cursor-pointer select-none">Ítem Activo (disponible en POS)</label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
                <button type="button" onClick={() => setEditingItem(null)} className="py-3 rounded-xl font-bold bg-muted hover:bg-muted/80 w-full transition-colors text-sm">Cancelar</button>
                <button type="submit" disabled={savingEdit} className="py-3 rounded-xl font-bold text-white gradient-bg hover:opacity-90 shadow-lg shadow-primary/20 w-full flex items-center justify-center gap-2 text-sm disabled:opacity-60">
                  {savingEdit ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Pencil className="w-4 h-4" />}
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

import { useState, useEffect } from 'react';
import { Settings2, Users, Layers, PlayCircle, Plus, Trash2, ShieldCheck, CheckCircle2, QrCode, Copy, ExternalLink, Store, Crown, Zap, Star, Bell, RefreshCw, Check } from 'lucide-react';
import { useSettingsStore, Employee } from '../../store/useSettingsStore';
import { useOrdersStore } from '../../store/useOrdersStore';
import { useCashStore } from '../../store/useCashStore';
import { useAuthStore } from '../../store/useAuthStore';
import { supabase } from '../../services/supabase';
import { Link } from 'react-router-dom';

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'general' | 'mesas' | 'personal' | 'turno' | 'qr' | 'miplan'>('general');
  
  const { tables, addTable, removeTable } = useOrdersStore();
  const { employees, addEmployee, removeEmployee, assignTableToWaiter, unassignTableFromWaiter, shift, openShift, closeShift, businessName, setBusinessName } = useSettingsStore();
  const { currentSession } = useCashStore();
  const { user } = useAuthStore();

  // Mi Plan state
  const [platformConfig, setPlatformConfig] = useState<any>({});
  const [paymentSenderName, setPaymentSenderName] = useState('');
  const [paymentPlan, setPaymentPlan] = useState<'standard' | 'pro'>('standard');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [submittingAlert, setSubmittingAlert] = useState(false);
  const [alertSent, setAlertSent] = useState(false);
  const [myAlerts, setMyAlerts] = useState<any[]>([]);

  // QR Payment Image State
  const [qrPaymentImage, setQrPaymentImage] = useState('');
  const [qrSaved, setQrSaved] = useState(false);

  useEffect(() => {
    loadPlatformConfig();
    loadMyAlerts();
    loadQrImage();
  }, [user]);

  async function loadQrImage() {
    if (!user?.tenantId) return;
    const cached = localStorage.getItem('qr_payment_image_' + user.tenantId);
    if (cached) setQrPaymentImage(cached);

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('qr_payment_image')
        .eq('id', user.tenantId)
        .single();
      if (!error && data?.qr_payment_image) {
        setQrPaymentImage(data.qr_payment_image);
        localStorage.setItem('qr_payment_image_' + user.tenantId, data.qr_payment_image);
      }
    } catch (err) {
      console.warn('Could not load qr_payment_image:', err);
    }
  }

  async function handleSaveQrImage() {
    if (!user?.tenantId) return;
    localStorage.setItem('qr_payment_image_' + user.tenantId, qrPaymentImage);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ qr_payment_image: qrPaymentImage })
        .eq('id', user.tenantId);
      if (error) {
        console.error('Error updating qr_payment_image in Supabase:', error);
      }
    } catch (err) {
      console.error('Exception updating qr_payment_image:', err);
    }
    setQrSaved(true);
    setTimeout(() => setQrSaved(false), 2000);
  }

  async function loadPlatformConfig() {
    const { data } = await supabase.from('platform_config').select('key, value');
    if (data) {
      const map: any = {};
      data.forEach((r: any) => { map[r.key] = r.value; });
      setPlatformConfig(map);
    }
  }

  async function loadMyAlerts() {
    if (!user?.tenantId) return;
    const { data } = await supabase
      .from('payment_alerts')
      .select('*')
      .eq('tenant_id', user.tenantId)
      .order('created_at', { ascending: false })
      .limit(5);
    setMyAlerts(data || []);
  }

  async function submitPaymentAlert(e: React.FormEvent) {
    e.preventDefault();
    if (!user?.tenantId || !paymentSenderName.trim()) return;
    setSubmittingAlert(true);
    const planPrice = paymentPlan === 'standard'
      ? Number(platformConfig.price_standard_monthly || 28100)
      : Number(platformConfig.price_pro_monthly || 44900);
    const { error } = await supabase.from('payment_alerts').insert({
      tenant_id: user.tenantId,
      tenant_name: businessName || user.name || 'Sin nombre',
      sender_name: paymentSenderName.trim(),
      plan_type: paymentPlan,
      amount: planPrice,
      notes: paymentNotes.trim() || null,
    });
    if (!error) {
      setAlertSent(true);
      setPaymentSenderName('');
      setPaymentNotes('');
      loadMyAlerts();
      setTimeout(() => setAlertSent(false), 4000);
    }
    setSubmittingAlert(false);
  }

  // State for new Table
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableZone, setNewTableZone] = useState<'Salón Principal' | 'Terraza' | 'Planta Alta'>('Salón Principal');
  const [newTableCap, setNewTableCap] = useState('');

  // State for new Employee
  const [newEmpFirst, setNewEmpFirst] = useState('');
  const [newEmpLast, setNewEmpLast] = useState('');
  const [newEmpRole, setNewEmpRole] = useState<Employee['role']>('mozo');

  // State for Shift Opening
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);

  // State for business name editing
  const [editingName, setEditingName] = useState(businessName);
  const [nameSaved, setNameSaved] = useState(false);

  const handleSaveName = async () => {
    if (editingName.trim() && user?.tenantId) {
      // 1. Update in Local Zustand Store
      setBusinessName(editingName.trim());
      // 2. Persist to Supabase Database
      const { error } = await supabase
        .from('tenants')
        .update({ name: editingName.trim() })
        .eq('id', user.tenantId);
      
      if (!error) {
        setNameSaved(true);
        setTimeout(() => setNameSaved(false), 2000);
      } else {
        console.error('Error saving restaurant name:', error);
        alert('No se pudo guardar el nombre del local en la base de datos.');
      }
    }
  };

  const handleAddTable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNum || !newTableCap) return;
    addTable({
      number: Number(newTableNum),
      zone: newTableZone,
      capacity: Number(newTableCap)
    });
    setNewTableNum('');
    setNewTableCap('');
  };

  const handleAddEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpFirst || !newEmpLast) return;
    addEmployee({
      firstName: newEmpFirst,
      lastName: newEmpLast,
      role: newEmpRole,
      assignedTables: newEmpRole === 'mozo' ? [] : undefined
    });
    setNewEmpFirst('');
    setNewEmpLast('');
  };

  const handleOpenShift = () => {
    if (selectedStaffIds.length === 0) {
      alert("Debes seleccionar al menos un empleado para abrir el turno.");
      return;
    }
    openShift(selectedStaffIds);
  };

  const toggleStaffSelection = (id: string) => {
    setSelectedStaffIds(prev => 
      prev.includes(id) ? prev.filter(staffId => staffId !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <div className="p-3 bg-primary/10 text-primary rounded-xl">
          <Settings2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Ajustes y Configuración</h2>
          <p className="text-muted-foreground text-sm">Nombre del local, mesas, personal y apertura de turno</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'general' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2"><Store className="w-4 h-4" /> General</div>
        </button>
        <button
          onClick={() => setActiveTab('mesas')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'mesas' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2"><Layers className="w-4 h-4" /> Configurar Mesas</div>
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'personal' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2"><Users className="w-4 h-4" /> Personal y Mozos</div>
        </button>
        <button
          onClick={() => setActiveTab('turno')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'turno' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2"><PlayCircle className="w-4 h-4" /> Apertura de Turno</div>
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'qr' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2"><QrCode className="w-4 h-4" /> QR de Mesas</div>
        </button>
        <button
          onClick={() => setActiveTab('miplan')}
          className={`px-4 py-2 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'miplan' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <div className="flex items-center gap-2"><Crown className="w-4 h-4" /> Mi Plan</div>
        </button>
      </div>

      {/* Tab Content: General */}
      {activeTab === 'general' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Store className="w-5 h-5 text-primary" /> Información del Local
              </h3>
              <p className="text-sm text-muted-foreground mt-1">El nombre se muestra en el sidebar y en los reportes de caja.</p>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Nombre del Restaurante / Local</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={editingName}
                  onChange={e => setEditingName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                  className="flex-1 p-3 bg-muted border border-border rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ej: La Trattoria, El Bodegón..."
                  maxLength={50}
                />
                <button
                  onClick={handleSaveName}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    nameSaved
                      ? 'bg-green-500 text-white'
                      : 'bg-primary text-white hover:opacity-90'
                  }`}
                >
                  {nameSaved ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">Presiona Enter o el botón Guardar para aplicar. El cambio se ve de inmediato en el menú lateral.</p>
            </div>

            {/* Live preview */}
            <div className="mt-2 p-4 bg-muted/40 border border-border rounded-xl">
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mb-3">Vista previa del sidebar</p>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center shadow-md shadow-primary/30">
                  <Store className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-extrabold text-sm gradient-text truncate max-w-[200px]">{editingName || 'Mi Restaurante'}</p>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">POS · Multi-Sucursal</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" /> Configurar Cobro por QR
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Ingresa el link de la imagen de tu QR de Mercado Pago, Cuenta DNI u otro método de cobro rápido.</p>
            </div>
            
            <div className="space-y-3">
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest">URL de Imagen del QR de Cobro</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={qrPaymentImage}
                  onChange={e => setQrPaymentImage(e.target.value)}
                  className="flex-1 p-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono"
                  placeholder="https://ejemplo.com/mi-qr-pago.png"
                />
                <button
                  onClick={handleSaveQrImage}
                  className={`px-4 py-2 rounded-xl font-bold text-sm transition-all ${
                    qrSaved
                      ? 'bg-green-500 text-white'
                      : 'bg-primary text-white hover:opacity-90'
                  }`}
                >
                  {qrSaved ? '✓ Guardado' : 'Guardar'}
                </button>
              </div>
            </div>

            {qrPaymentImage ? (
              <div className="p-3 bg-muted/40 border border-border rounded-xl flex flex-col items-center gap-2">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Vista Previa de tu QR de Cobro</p>
                <img src={qrPaymentImage} alt="QR de Pago" className="w-32 h-32 object-contain bg-white p-2 rounded-lg border border-border animate-fade-in" />
              </div>
            ) : (
              <div className="p-4 border border-dashed border-border rounded-xl text-center text-xs text-muted-foreground">
                No has configurado una imagen de QR de Cobro todavía. Se mostrará un QR genérico al cobrar.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Mesas */}
      {activeTab === 'mesas' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add Table Form */}
          <div className="col-span-1 bg-card border border-border rounded-2xl p-5 space-y-4 h-fit">
            <h3 className="font-bold text-lg">Nueva Mesa</h3>
            <form onSubmit={handleAddTable} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Número de Mesa</label>
                <input required type="number" value={newTableNum} onChange={e => setNewTableNum(e.target.value)} className="w-full mt-1 p-2 bg-muted border border-border rounded-xl text-sm" placeholder="Ej: 15" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Capacidad (Personas)</label>
                <input required type="number" value={newTableCap} onChange={e => setNewTableCap(e.target.value)} className="w-full mt-1 p-2 bg-muted border border-border rounded-xl text-sm" placeholder="Ej: 4" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Zona</label>
                <select value={newTableZone} onChange={e => setNewTableZone(e.target.value as any)} className="w-full mt-1 p-2 bg-muted border border-border rounded-xl text-sm">
                  <option value="Salón Principal">Salón Principal</option>
                  <option value="Terraza">Terraza</option>
                  <option value="Planta Alta">Planta Alta</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Agregar Mesa
              </button>
            </form>
          </div>

          {/* Tables List */}
          <div className="col-span-1 md:col-span-2 bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-lg mb-4">Mesas Registradas ({tables.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {tables.map(t => {
                const callUrl = `${window.location.origin}/llamar/${t.qr_token || 'table-' + t.number}`;
                const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(callUrl)}&bgcolor=ffffff&color=1a1a2e&qzone=2`;
                const handlePrintQr = () => {
                  const win = window.open('', '_blank', 'width=420,height=600');
                  if (!win) return;
                  win.document.write(`
                    <!DOCTYPE html><html><head>
                    <title>QR Mesa ${t.number}</title>
                    <style>
                      * { box-sizing: border-box; margin: 0; padding: 0; }
                      body { font-family: 'Segoe UI', sans-serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 24px; }
                      .card { border: 3px solid #1a1a2e; border-radius: 24px; padding: 32px 24px; text-align: center; max-width: 320px; width: 100%; }
                      .logo { font-size: 22px; font-weight: 900; color: #1a1a2e; letter-spacing: -0.5px; margin-bottom: 4px; }
                      .mesa { font-size: 36px; font-weight: 900; color: #7c3aed; margin: 8px 0; }
                      .zone { font-size: 13px; color: #64748b; font-weight: 600; margin-bottom: 20px; }
                      .qr-img { width: 220px; height: 220px; border-radius: 16px; border: 2px solid #e2e8f0; }
                      .cta { margin-top: 18px; font-size: 13px; font-weight: 700; color: #334155; }
                      .sub { margin-top: 6px; font-size: 11px; color: #94a3b8; }
                      .divider { margin: 16px 0; border: none; border-top: 1.5px dashed #e2e8f0; }
                    </style>
                    </head><body>
                    <div class="card">
                      <div class="logo">🍽️ MesaHub</div>
                      <div class="mesa">Mesa ${t.number}</div>
                      <div class="zone">${t.zone} · ${t.capacity} personas</div>
                      <img class="qr-img" src="${qrImgUrl}" alt="QR Mesa ${t.number}" />
                      <hr class="divider" />
                      <div class="cta">📱 Escaneá para llamar al mozo<br/>o ver el menú</div>
                      <div class="sub">Podés hacer tu pedido desde tu celular</div>
                    </div>
                    <script>window.onload = () => { window.print(); }<\/script>
                    </body></html>
                  `);
                  win.document.close();
                };
                return (
                  <div key={t.id} className="p-4 border border-border rounded-2xl bg-muted/30 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-bold text-base block">Mesa {t.number}</span>
                        <span className="text-[11px] text-muted-foreground">{t.zone} · {t.capacity} pax</span>
                      </div>
                      <button onClick={() => removeTable(t.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mini QR preview */}
                    <div className="flex justify-center">
                      <img
                        src={qrImgUrl}
                        alt={`QR Mesa ${t.number}`}
                        className="w-20 h-20 rounded-xl border border-border bg-white p-1"
                      />
                    </div>

                    <button
                      onClick={handlePrintQr}
                      className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" /> Imprimir QR de Mesa
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Personal */}
      {activeTab === 'personal' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Add Employee Form */}
          <div className="col-span-1 bg-card border border-border rounded-2xl p-5 space-y-4 h-fit">
            <h3 className="font-bold text-lg">Nuevo Empleado</h3>
            <form onSubmit={handleAddEmployee} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Nombre</label>
                <input required type="text" value={newEmpFirst} onChange={e => setNewEmpFirst(e.target.value)} className="w-full mt-1 p-2 bg-muted border border-border rounded-xl text-sm" placeholder="Ej: Juan" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Apellido</label>
                <input required type="text" value={newEmpLast} onChange={e => setNewEmpLast(e.target.value)} className="w-full mt-1 p-2 bg-muted border border-border rounded-xl text-sm" placeholder="Ej: Pérez" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground">Rol</label>
                <select value={newEmpRole} onChange={e => setNewEmpRole(e.target.value as any)} className="w-full mt-1 p-2 bg-muted border border-border rounded-xl text-sm">
                  <option value="mozo">Mozo (Salón)</option>
                  <option value="cocina">Cocina / Ayudante</option>
                  <option value="cajero">Cajero / Encargado</option>
                  <option value="limpieza">Limpieza / Mantenimiento</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <button type="submit" className="w-full py-2 bg-primary text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                <Plus className="w-4 h-4" /> Registrar Personal
              </button>
            </form>
          </div>

          {/* Employee List */}
          <div className="col-span-1 md:col-span-2 bg-card border border-border rounded-2xl p-5">
            <h3 className="font-bold text-lg mb-4">Plantilla de Empleados ({employees.length})</h3>
            <div className="space-y-3">
              {employees.map(e => (
                <div key={e.id} className="p-4 border border-border rounded-xl bg-muted/30 flex flex-col sm:flex-row justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm uppercase">
                      {e.firstName[0]}{e.lastName[0]}
                    </div>
                    <div>
                      <span className="font-bold text-sm block">{e.firstName} {e.lastName}</span>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{e.role}</span>
                    </div>
                  </div>
                  
                  {/* Waiter specific settings: Table assignment */}
                  {e.role === 'mozo' && (
                    <div className="flex-1 sm:ml-8 border-l border-border pl-4">
                      <span className="text-[10px] font-bold text-muted-foreground block mb-1">Mesas Asignadas (Opcional):</span>
                      <div className="flex flex-wrap gap-1">
                        {e.assignedTables?.map(tId => {
                          const t = tables.find(tbl => tbl.id === tId);
                          if (!t) return null;
                          return (
                            <span key={tId} onClick={() => unassignTableFromWaiter(e.id, tId)} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded cursor-pointer hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 text-[10px] font-bold transition-colors">
                              Mesa {t.number} ✕
                            </span>
                          );
                        })}
                        <select 
                          className="px-2 py-0.5 bg-card border border-dashed border-border rounded text-[10px] font-bold outline-none cursor-pointer"
                          value=""
                          onChange={(ev) => assignTableToWaiter(e.id, ev.target.value)}
                        >
                          <option value="" disabled>+ Asignar Mesa</option>
                          {tables.filter(t => !e.assignedTables?.includes(t.id)).map(t => (
                            <option key={t.id} value={t.id}>Mesa {t.number}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <button
                          onClick={() => {
                            const baseUrl = window.location.origin;
                            const link = `${baseUrl}/m/${e.id}`;
                            navigator.clipboard.writeText(link);
                            alert('Enlace del mozo copiado al portapapeles. Envíaselo para que acceda a su panel.');
                          }}
                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <Copy className="w-3 h-3" /> Copiar Enlace del Mozo
                        </button>
                      </div>
                    </div>
                  )}

                  <button onClick={() => removeEmployee(e.id)} className="p-2 self-start text-muted-foreground hover:text-red-500 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: Turno */}
      {activeTab === 'turno' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
            <div>
              <h3 className="font-bold text-xl flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-primary" /> Apertura de Turno General
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Selecciona al personal que se encuentra presente en este turno.
              </p>
            </div>

            {shift.isOpen ? (
              <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
                <div>
                  <h4 className="text-green-500 font-bold text-lg">Turno Abierto</h4>
                  <p className="text-green-600/80 text-xs font-semibold">Iniciado a las {new Date(shift.openedAt!).toLocaleTimeString()}</p>
                  <p className="text-green-600/80 text-xs mt-1">Personal activo: {shift.activeStaffIds.length} empleados.</p>
                </div>
                <button onClick={closeShift} className="px-4 py-2 mt-4 bg-red-500 text-white font-bold text-xs rounded-xl hover:bg-red-600 transition-colors">
                  Cerrar Turno (Fin de Jornada)
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Seleccionar Empleados Activos</span>
                  {employees.map(e => (
                    <label key={e.id} className="flex items-center gap-3 p-3 border border-border rounded-xl cursor-pointer hover:bg-muted/30 transition-colors">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 accent-primary" 
                        checked={selectedStaffIds.includes(e.id)}
                        onChange={() => toggleStaffSelection(e.id)}
                      />
                      <span className="font-semibold text-sm">{e.firstName} {e.lastName} <span className="text-[10px] text-muted-foreground ml-2 uppercase">({e.role})</span></span>
                    </label>
                  ))}
                </div>
                
                <button onClick={handleOpenShift} className="w-full py-3 bg-primary text-white font-bold text-sm rounded-xl hover:opacity-90 transition-opacity">
                  Iniciar Turno con {selectedStaffIds.length} Empleados
                </button>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-card border border-border rounded-2xl p-6">
              <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-amber-500" /> Requisito: Caja Inicial
              </h3>
              
              <p className="text-sm text-muted-foreground mb-4">
                Para poder utilizar el Punto de Venta (POS) y cobrar órdenes, es obligatorio realizar la apertura de la caja registradora asignando un fondo inicial.
              </p>

              {(!currentSession || currentSession.status === 'closed') ? (
                <div className="p-4 border border-red-500/20 bg-red-500/5 rounded-xl space-y-3">
                  <p className="text-red-500 font-bold text-sm">⚠️ La caja se encuentra CERRADA.</p>
                  <Link to="/cash" className="block w-full text-center py-2 bg-red-500 hover:bg-red-600 text-white font-bold text-xs rounded-lg transition-colors">
                    Ir a Módulo de Caja para Abrir
                  </Link>
                </div>
              ) : (
                <div className="p-4 border border-green-500/20 bg-green-500/5 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-green-500 font-bold text-sm">✅ Caja ABIERTA.</p>
                    <p className="text-green-600/80 text-xs">Lista para operar en el POS.</p>
                  </div>
                  <Link to="/cash" className="px-3 py-1.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 font-bold text-xs rounded-lg transition-colors">
                    Ver Caja
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab Content: QR Codes */}
      {activeTab === 'qr' && (
        <div className="space-y-6">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 text-sm text-amber-600">
            <strong>¿Cómo funciona?</strong> Cada mesa tiene un link único. El cliente escanea el QR → abre el menú en su celular → hace el pedido → llega directo a la cocina. No necesita instalar nada.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map(t => {
              const baseUrl = window.location.origin;
              const qrUrl = `${baseUrl}/mesa/table-${t.number}`;
              return (
                <div key={t.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-lg">Mesa {t.number}</h4>
                      <p className="text-xs text-muted-foreground">{t.zone} · {t.capacity} pax</p>
                    </div>
                    <div className="p-2.5 bg-primary/10 rounded-xl">
                      <QrCode className="w-5 h-5 text-primary" />
                    </div>
                  </div>

                  {/* QR Preview Box (visual placeholder) */}
                  <div className="w-full h-28 bg-white rounded-xl flex items-center justify-center border border-border">
                    <div className="text-center">
                      <QrCode className="w-16 h-16 text-gray-800 mx-auto" />
                      <p className="text-[9px] text-gray-500 mt-1 font-mono">Mesa {t.number}</p>
                    </div>
                  </div>

                  <div className="text-[10px] font-mono text-muted-foreground bg-muted rounded-lg p-2 truncate">
                    {qrUrl}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(qrUrl); alert('Link copiado al portapapeles'); }}
                      className="py-2 bg-muted hover:bg-muted/80 border border-border rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copiar Link
                    </button>
                    <a
                      href={qrUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-2 bg-primary/10 hover:bg-primary/20 border border-primary/20 text-primary rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> Probar
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
            <h3 className="font-bold text-lg flex items-center gap-2"><QrCode className="w-5 h-5 text-primary" /> Para imprimir los QR</h3>
            <p className="text-sm text-muted-foreground">Copia el link de cada mesa y pégalo en cualquier generador de QR gratuito (como <strong>qr-code-generator.com</strong> o <strong>qrcode-monkey.com</strong>). Luego imprime y pega el QR en la mesa correspondiente.</p>
            <p className="text-xs text-muted-foreground border-t border-border pt-3">Cuando conectes Supabase, cada mesa tendrá un token único más seguro que se generará automáticamente.</p>
          </div>
        </div>
      )}

      {/* Tab Content: Mi Plan */}
      {activeTab === 'miplan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current plan + payment form */}
          <div className="space-y-4">
            {/* Current plan card */}
            <div className={`rounded-2xl p-5 border ${
              user?.planType === 'pro' ? 'border-amber-500/30 bg-amber-500/5' :
              user?.planType === 'standard' ? 'border-blue-500/30 bg-blue-500/5' :
              'border-border bg-card'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                {user?.planType === 'pro' ? <Crown className="w-6 h-6 text-amber-400" /> :
                 user?.planType === 'standard' ? <Zap className="w-6 h-6 text-blue-400" /> :
                 <Star className="w-6 h-6 text-gray-400" />}
                <div>
                  <p className="font-extrabold text-lg">
                    {user?.planType === 'pro' ? 'Plan Pro' : user?.planType === 'standard' ? 'Plan Estándar' : 'Prueba Gratis'}
                  </p>
                  <p className="text-xs text-muted-foreground">Plan actual de tu cuenta</p>
                </div>
              </div>
              {user?.planType === 'free' && (
                <p className="text-sm text-muted-foreground">Estás en el plan gratuito con límite de 50 ventas. Actualizá tu plan para desbloquear todas las funciones.</p>
              )}
              {user?.planType !== 'free' && (
                <p className="text-sm text-muted-foreground">Tu plan está activo. Si querés renovar o cambiar de plan, completá el formulario de aviso de pago.</p>
              )}
            </div>

            {/* Plans comparison */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
              <h3 className="font-bold text-sm">Planes disponibles</h3>
              {[
                {
                  plan: 'standard' as const,
                  name: 'Estándar',
                  price: platformConfig.price_standard_monthly || '28100',
                  icon: Zap,
                  color: 'text-blue-400',
                  border: 'border-blue-500/20',
                  features: ['POS completo', 'Caja & Arqueos', 'Inventario', 'Delivery']
                },
                {
                  plan: 'pro' as const,
                  name: 'Pro',
                  price: platformConfig.price_pro_monthly || '44900',
                  icon: Crown,
                  color: 'text-amber-400',
                  border: 'border-amber-500/20',
                  features: ['Todo Estándar', 'KDS Cocina', 'Pantalla cliente', 'Turnos & empleados']
                },
              ].map(p => {
                const Icon = p.icon;
                return (
                  <div key={p.plan} className={`border ${p.border} rounded-xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${p.color}`} />
                        <span className={`font-bold text-sm ${p.color}`}>{p.name}</span>
                      </div>
                      <span className="font-extrabold text-sm">${Number(p.price).toLocaleString('es-AR')}/mes</span>
                    </div>
                    <ul className="space-y-1">
                      {p.features.map(f => (
                        <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment info + notification form */}
          <div className="space-y-4">
            {/* Bank data to transfer to */}
            {(platformConfig.payment_cbu || platformConfig.payment_alias || platformConfig.payment_mp_link) && (
              <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary" /> Datos para transferir</h3>
                {platformConfig.payment_holder_name && (
                  <p className="text-sm"><span className="text-muted-foreground">Titular:</span> <strong>{platformConfig.payment_holder_name}</strong></p>
                )}
                {platformConfig.payment_cbu && (
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold">CBU</p>
                      <p className="font-mono text-sm">{platformConfig.payment_cbu}</p>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(platformConfig.payment_cbu)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {platformConfig.payment_alias && (
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold">Alias</p>
                      <p className="font-mono text-sm font-bold">{platformConfig.payment_alias}</p>
                    </div>
                    <button onClick={() => navigator.clipboard.writeText(platformConfig.payment_alias)}
                      className="p-2 hover:bg-muted rounded-lg text-muted-foreground transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {platformConfig.payment_mp_link && (
                  <div className="space-y-2">
                    <div className="flex justify-center">
                      <div className="p-2 bg-white rounded-xl shadow">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(platformConfig.payment_mp_link)}`}
                          alt="QR MercadoPago" className="w-[140px] h-[140px]"
                        />
                      </div>
                    </div>
                    <a href={platformConfig.payment_mp_link} target="_blank" rel="noopener noreferrer"
                      className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" /> Pagar con MercadoPago
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Notify payment form */}
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2"><Bell className="w-5 h-5 text-amber-400" /> Avisá que pagaste</h3>
                <p className="text-xs text-muted-foreground mt-1">Completá este formulario después de transferir. El administrador recibirá el aviso y activará tu plan.</p>
              </div>

              {alertSent ? (
                <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
                  <p className="font-bold text-emerald-400">¡Aviso enviado!</p>
                  <p className="text-xs text-muted-foreground">El administrador revisará tu transferencia y activará el plan en breve.</p>
                </div>
              ) : (
                <form onSubmit={submitPaymentAlert} className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Plan que querés contratar</label>
                    <select value={paymentPlan} onChange={e => setPaymentPlan(e.target.value as any)}
                      className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                      <option value="standard">Estándar — ${Number(platformConfig.price_standard_monthly || 28100).toLocaleString('es-AR')}/mes</option>
                      <option value="pro">Pro — ${Number(platformConfig.price_pro_monthly || 44900).toLocaleString('es-AR')}/mes</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Nombre del que transfirió *</label>
                    <input required type="text" value={paymentSenderName} onChange={e => setPaymentSenderName(e.target.value)}
                      className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="Ej: Juan Pérez" />
                    <p className="text-[11px] text-muted-foreground mt-1">Tal como aparece en el comprobante de transferencia</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Notas adicionales (opcional)</label>
                    <textarea value={paymentNotes} onChange={e => setPaymentNotes(e.target.value)}
                      className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                      rows={2} placeholder="Ej: Transferí el 11/06 a las 14:30 hs desde cuenta Galicia..." />
                  </div>
                  <button type="submit" disabled={submittingAlert}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2">
                    {submittingAlert ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                    {submittingAlert ? 'Enviando...' : 'Enviar aviso de pago'}
                  </button>
                </form>
              )}

              {/* My recent alerts */}
              {myAlerts.length > 0 && (
                <div className="border-t border-border pt-4 space-y-2">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Mis avisos enviados</p>
                  {myAlerts.map(a => (
                    <div key={a.id} className="flex items-center justify-between text-xs p-2.5 bg-muted/40 rounded-lg">
                      <span className="font-medium">{a.sender_name} · Plan {a.plan_type}</span>
                      <span className={`font-bold px-2 py-0.5 rounded-full ${
                        a.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                        a.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                        'bg-amber-500/10 text-amber-400'
                      }`}>
                        {a.status === 'confirmed' ? '✓ Activado' : a.status === 'rejected' ? '✗ Rechazado' : '⏳ Pendiente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

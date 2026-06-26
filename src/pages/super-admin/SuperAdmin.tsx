import { useState, useEffect } from 'react';
import { supabase } from '../../services/supabase';
import {
  Building2, Shield, CheckCircle, XCircle, Crown, Zap, Star,
  RefreshCw, ToggleLeft, ToggleRight, BarChart3, Globe, CreditCard, AlertCircle,
  Search, Calendar, Bell, QrCode, DollarSign, Copy, Check,
  ExternalLink, Save, Banknote, Wallet
} from 'lucide-react';

/* ─────────────────────── Types ─────────────────────── */
interface Tenant {
  id: string;
  name: string;
  subdomain: string | null;
  plan_type: 'free' | 'standard' | 'pro' | 'premium' | 'enterprise';
  active: boolean;
  created_at: string;
}

interface PaymentAlert {
  id: string;
  tenant_id: string;
  tenant_name: string;
  sender_name: string;
  plan_type: string;
  amount: number;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  created_at: string;
}

interface PlatformConfig {
  price_standard_monthly: string;
  price_standard_annual: string;
  price_pro_monthly: string;
  price_pro_annual: string;
  payment_cbu: string;
  payment_alias: string;
  payment_mp_link: string;
  payment_holder_name: string;
}

/* ─────────────────────── Constants ─────────────────────── */
const DEFAULT_CONFIG: PlatformConfig = {
  price_standard_monthly: '28100',
  price_standard_annual: '252900',
  price_pro_monthly: '44900',
  price_pro_annual: '404100',
  payment_cbu: '',
  payment_alias: '',
  payment_mp_link: '',
  payment_holder_name: '',
};

const PLAN_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  free:      { label: 'Prueba Gratis', color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',     icon: Star },
  standard:  { label: 'Estándar',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',     icon: Zap },
  pro:       { label: 'Pro',           color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',  icon: Crown },
  premium:   { label: 'Premium',       color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: Crown },
  enterprise:{ label: 'Enterprise',   color: 'text-rose-400 bg-rose-500/10 border-rose-500/20',    icon: Shield },
};

type TabId = 'empresas' | 'alertas' | 'pagos' | 'precios';

/* ─────────────────────── Component ─────────────────────── */
export default function SuperAdmin() {
  const [activeTab, setActiveTab] = useState<TabId>('empresas');

  // Empresas
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [search, setSearch] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, pro: 0, standard: 0, free: 0 });

  // Alertas de pago
  const [alerts, setAlerts] = useState<PaymentAlert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [processingAlertId, setProcessingAlertId] = useState<string | null>(null);

  // Config de pagos y precios
  const [config, setConfig] = useState<PlatformConfig>(DEFAULT_CONFIG);
  const [editConfig, setEditConfig] = useState<PlatformConfig>(DEFAULT_CONFIG);
  const [savingConfig, setSavingConfig] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
    loadAlerts();
    loadConfig();
  }, []);

  /* ── Data loaders ── */
  async function loadTenants() {
    setLoadingTenants(true);
    const { data } = await supabase.from('tenants').select('*').order('created_at', { ascending: false });
    // Filter out the platform itself from the list
    const list = (data || []).filter((t: Tenant) => t.subdomain !== 'platform');
    setTenants(list);
    computeStats(list);
    setLoadingTenants(false);
  }

  async function loadAlerts() {
    setLoadingAlerts(true);
    const { data } = await supabase
      .from('payment_alerts')
      .select('*')
      .order('created_at', { ascending: false });
    setAlerts(data || []);
    setLoadingAlerts(false);
  }

  async function loadConfig() {
    const { data } = await supabase.from('platform_config').select('key, value');
    if (data && data.length > 0) {
      const map: any = {};
      data.forEach((row: any) => { map[row.key] = row.value; });
      const merged = { ...DEFAULT_CONFIG, ...map };
      setConfig(merged);
      setEditConfig(merged);
    }
  }

  function computeStats(data: Tenant[]) {
    setStats({
      total:    data.length,
      active:   data.filter(t => t.active).length,
      pro:      data.filter(t => ['pro','premium','enterprise'].includes(t.plan_type)).length,
      standard: data.filter(t => t.plan_type === 'standard').length,
      free:     data.filter(t => t.plan_type === 'free').length,
    });
  }

  /* ── Tenant actions ── */
  async function toggleActive(tenant: Tenant) {
    setSavingId(tenant.id);
    const newActive = !tenant.active;
    const { error } = await supabase.from('tenants').update({ active: newActive }).eq('id', tenant.id);
    if (!error) {
      const updated = tenants.map(t => t.id === tenant.id ? { ...t, active: newActive } : t);
      setTenants(updated);
      computeStats(updated);
    }
    setSavingId(null);
  }

  async function changePlan(tenantId: string, plan: string) {
    setSavingId(tenantId);
    const { error } = await supabase.from('tenants').update({ plan_type: plan }).eq('id', tenantId);
    if (!error) {
      const updated = tenants.map(t => t.id === tenantId ? { ...t, plan_type: plan as any } : t);
      setTenants(updated);
      computeStats(updated);
      setEditingTenant(null);
    }
    setSavingId(null);
  }

  /* ── Alert actions ── */
  async function processAlert(alert: PaymentAlert, action: 'confirmed' | 'rejected') {
    setProcessingAlertId(alert.id);
    const { error } = await supabase.from('payment_alerts').update({ status: action }).eq('id', alert.id);
    if (!error) {
      // Si confirmado, actualizar el plan del tenant
      if (action === 'confirmed') {
        await supabase.from('tenants').update({ plan_type: alert.plan_type, active: true }).eq('id', alert.tenant_id);
        const updated = tenants.map(t => t.id === alert.tenant_id ? { ...t, plan_type: alert.plan_type as any, active: true } : t);
        setTenants(updated);
        computeStats(updated);
      }
      setAlerts(prev => prev.map(a => a.id === alert.id ? { ...a, status: action } : a));
    }
    setProcessingAlertId(null);
  }

  /* ── Config save ── */
  async function saveConfig() {
    setSavingConfig(true);
    const rows = Object.entries(editConfig).map(([key, value]) => ({ key, value: String(value) }));
    const { error } = await supabase.from('platform_config').upsert(rows, { onConflict: 'key' });
    if (!error) {
      setConfig(editConfig);
      setConfigSaved(true);
      setTimeout(() => setConfigSaved(false), 2500);
    }
    setSavingConfig(false);
  }

  function copyToClipboard(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  const filtered = tenants.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) || (t.subdomain || '').toLowerCase().includes(search.toLowerCase());
    const matchPlan = filterPlan === 'all' || t.plan_type === filterPlan;
    return matchSearch && matchPlan;
  });

  const monthlyRevenue = stats.pro * Number(config.price_pro_monthly) + stats.standard * Number(config.price_standard_monthly);
  const pendingAlerts = alerts.filter(a => a.status === 'pending').length;

  const qrUrl = config.payment_mp_link
    ? `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(config.payment_mp_link)}`
    : null;

  const tabs: { id: TabId; label: string; icon: any; badge?: number }[] = [
    { id: 'empresas', label: 'Empresas', icon: Building2 },
    { id: 'alertas',  label: 'Alertas de Pago', icon: Bell, badge: pendingAlerts },
    { id: 'pagos',    label: 'Métodos de Pago', icon: Wallet },
    { id: 'precios',  label: 'Precios de Planes', icon: DollarSign },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-5">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Panel Super Admin</h2>
            <p className="text-sm text-muted-foreground">GastroPOS Platform · Gestión Global de Cuentas</p>
          </div>
        </div>
        <button onClick={() => { loadTenants(); loadAlerts(); }} disabled={loadingTenants}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-xl text-sm font-medium transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loadingTenants ? 'animate-spin' : ''}`} /> Recargar
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Empresas',   value: stats.total,    icon: Building2,  color: 'from-violet-600 to-indigo-600',   shadow: 'shadow-violet-500/20' },
          { label: 'Activas',    value: stats.active,   icon: CheckCircle,color: 'from-emerald-500 to-teal-600',    shadow: 'shadow-emerald-500/20' },
          { label: 'Plan Pro',   value: stats.pro,      icon: Crown,      color: 'from-amber-500 to-orange-500',    shadow: 'shadow-amber-500/20' },
          { label: 'Estándar',   value: stats.standard, icon: Zap,        color: 'from-blue-500 to-cyan-500',       shadow: 'shadow-blue-500/20' },
          { label: 'En prueba',  value: stats.free,     icon: Star,       color: 'from-gray-500 to-slate-600',      shadow: 'shadow-slate-500/20' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card rounded-2xl p-4 border border-border flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} shadow-lg ${s.shadow} flex items-center justify-center shrink-0`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-2xl font-extrabold leading-none">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue banner */}
      <div className="bg-gradient-to-br from-violet-600/10 to-indigo-600/10 border border-violet-500/20 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">Ingresos Mensuales Estimados</p>
          <p className="text-4xl font-extrabold tracking-tight">${monthlyRevenue.toLocaleString('es-AR')}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {stats.pro} × ${Number(config.price_pro_monthly).toLocaleString('es-AR')} Pro &nbsp;+&nbsp;
            {stats.standard} × ${Number(config.price_standard_monthly).toLocaleString('es-AR')} Estándar
          </p>
        </div>
        <BarChart3 className="w-16 h-16 text-violet-400/30" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border pb-px overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 font-bold text-sm border-b-2 transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-violet-500 text-violet-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge ? (
                <span className="ml-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-extrabold flex items-center justify-center px-1">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ── TAB: EMPRESAS ── */}
      {activeTab === 'empresas' && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-border flex flex-wrap gap-3 items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-bold text-sm">Empresas Registradas</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-bold">{filtered.length}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa..."
                  className="pl-8 pr-3 py-1.5 text-xs bg-muted rounded-lg border border-border focus:outline-none focus:border-primary/50 w-44" />
              </div>
              <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                className="text-xs bg-muted rounded-lg border border-border px-3 py-1.5 focus:outline-none">
                <option value="all">Todos los planes</option>
                <option value="free">Gratis</option>
                <option value="standard">Estándar</option>
                <option value="pro">Pro</option>
              </select>
            </div>
          </div>

          {loadingTenants ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
              <AlertCircle className="w-8 h-8" /><span className="text-sm">Sin resultados</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-3 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Empresa</th>
                    <th className="px-5 py-3 text-[11px] text-muted-foreground font-bold uppercase tracking-wider hidden md:table-cell">Subdominio</th>
                    <th className="px-5 py-3 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Plan</th>
                    <th className="px-5 py-3 text-[11px] text-muted-foreground font-bold uppercase tracking-wider hidden lg:table-cell">Registro</th>
                    <th className="px-5 py-3 text-[11px] text-muted-foreground font-bold uppercase tracking-wider">Estado</th>
                    <th className="px-5 py-3 text-[11px] text-muted-foreground font-bold uppercase tracking-wider text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filtered.map(tenant => {
                    const planInfo = PLAN_LABELS[tenant.plan_type] || PLAN_LABELS.free;
                    const PlanIcon = planInfo.icon;
                    return (
                      <tr key={tenant.id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 border border-violet-500/20 flex items-center justify-center text-sm font-bold text-violet-400 shrink-0">
                              {tenant.name.slice(0,2).toUpperCase()}
                            </div>
                            <p className="font-semibold leading-none">{tenant.name}</p>
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{tenant.subdomain || '—'}</span>
                        </td>
                        <td className="px-5 py-4">
                          {editingTenant?.id === tenant.id ? (
                            <select autoFocus defaultValue={tenant.plan_type}
                              onChange={e => changePlan(tenant.id, e.target.value)}
                              onBlur={() => setEditingTenant(null)}
                              className="text-xs bg-card border border-primary rounded-lg px-2 py-1 focus:outline-none">
                              <option value="free">Prueba Gratis</option>
                              <option value="standard">Estándar — ${Number(config.price_standard_monthly).toLocaleString('es-AR')}/mes</option>
                              <option value="pro">Pro — ${Number(config.price_pro_monthly).toLocaleString('es-AR')}/mes</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${planInfo.color}`}>
                              <PlanIcon className="w-3 h-3" />{planInfo.label}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(tenant.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          {tenant.active
                            ? <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"><CheckCircle className="w-3 h-3" /> Activa</span>
                            : <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20"><XCircle className="w-3 h-3" /> Inactiva</span>}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setEditingTenant(tenant)} title="Cambiar plan"
                              className="p-1.5 hover:bg-blue-500/10 text-blue-400 rounded-lg transition-colors">
                              <CreditCard className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => toggleActive(tenant)} disabled={savingId === tenant.id}
                              title={tenant.active ? 'Desactivar' : 'Activar'}
                              className={`p-1.5 rounded-lg transition-colors ${tenant.active ? 'hover:bg-red-500/10 text-red-400' : 'hover:bg-emerald-500/10 text-emerald-400'}`}>
                              {savingId === tenant.id
                                ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                : tenant.active ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
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
      )}

      {/* ── TAB: ALERTAS DE PAGO ── */}
      {activeTab === 'alertas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-amber-400" /> Avisos de Pago Recibidos</h3>
              <p className="text-sm text-muted-foreground mt-0.5">Los clientes avisan cuando realizan una transferencia. Confirmá o rechazá para activar/mantener su plan.</p>
            </div>
            <button onClick={loadAlerts} disabled={loadingAlerts}
              className="p-2 hover:bg-muted rounded-xl text-muted-foreground transition-colors">
              <RefreshCw className={`w-4 h-4 ${loadingAlerts ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {loadingAlerts ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin" /><span className="text-sm">Cargando avisos...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 flex flex-col items-center gap-3 text-muted-foreground">
              <Bell className="w-10 h-10 opacity-30" />
              <p className="text-sm">No hay avisos de pago todavía</p>
              <p className="text-xs opacity-60">Cuando un cliente avise que pagó, aparecerá aquí</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Pending first */}
              {['pending', 'confirmed', 'rejected'].map(statusGroup => {
                const groupAlerts = alerts.filter(a => a.status === statusGroup);
                if (groupAlerts.length === 0) return null;
                return (
                  <div key={statusGroup}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-2 px-1">
                      {statusGroup === 'pending' ? '⏳ Pendientes de revisión' : statusGroup === 'confirmed' ? '✅ Confirmados' : '❌ Rechazados'}
                    </p>
                    <div className="space-y-2">
                      {groupAlerts.map(alert => {
                        const planInfo = PLAN_LABELS[alert.plan_type] || PLAN_LABELS.standard;
                        const PlanIcon = planInfo.icon;
                        return (
                          <div key={alert.id}
                            className={`bg-card border rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all ${
                              alert.status === 'pending' ? 'border-amber-500/30 bg-amber-500/5' :
                              alert.status === 'confirmed' ? 'border-emerald-500/20' : 'border-red-500/20 opacity-60'
                            }`}>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm">{alert.tenant_name}</span>
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${planInfo.color}`}>
                                  <PlanIcon className="w-3 h-3" /> Plan {planInfo.label}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-semibold text-foreground">Transferidor:</span> {alert.sender_name}
                              </p>
                              <p className="text-sm">
                                <span className="font-semibold">Monto:</span>{' '}
                                <span className="text-emerald-400 font-bold">${Number(alert.amount).toLocaleString('es-AR')}</span>
                              </p>
                              {alert.notes && (
                                <p className="text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-lg mt-1">"{alert.notes}"</p>
                              )}
                              <p className="text-[11px] text-muted-foreground">
                                {new Date(alert.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                            {alert.status === 'pending' && (
                              <div className="flex gap-2 shrink-0">
                                <button
                                  onClick={() => processAlert(alert, 'confirmed')}
                                  disabled={processingAlertId === alert.id}
                                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5">
                                  {processingAlertId === alert.id
                                    ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    : <CheckCircle className="w-3.5 h-3.5" />}
                                  Confirmar y Activar Plan
                                </button>
                                <button
                                  onClick={() => processAlert(alert, 'rejected')}
                                  disabled={processingAlertId === alert.id}
                                  className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold text-xs rounded-xl transition-colors flex items-center gap-1">
                                  <XCircle className="w-3.5 h-3.5" /> Rechazar
                                </button>
                              </div>
                            )}
                            {alert.status !== 'pending' && (
                              <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                                alert.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                              }`}>
                                {alert.status === 'confirmed' ? '✓ Plan activado' : '✗ Rechazado'}
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: MÉTODOS DE PAGO ── */}
      {activeTab === 'pagos' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Config form */}
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2"><Banknote className="w-5 h-5 text-primary" /> Datos Bancarios</h3>
              <p className="text-sm text-muted-foreground mt-1">Esta información se muestra a los clientes cuando quieren pagar.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Nombre del Titular</label>
                <input type="text" value={editConfig.payment_holder_name}
                  onChange={e => setEditConfig(p => ({ ...p, payment_holder_name: e.target.value }))}
                  className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ej: Horacio Ortiz" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">CBU / CVU</label>
                <input type="text" value={editConfig.payment_cbu}
                  onChange={e => setEditConfig(p => ({ ...p, payment_cbu: e.target.value }))}
                  className="w-full p-3 bg-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="22 dígitos" maxLength={22} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Alias</label>
                <input type="text" value={editConfig.payment_alias}
                  onChange={e => setEditConfig(p => ({ ...p, payment_alias: e.target.value }))}
                  className="w-full p-3 bg-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="tu.alias.mp" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest block mb-1.5">Link de MercadoPago</label>
                <input type="url" value={editConfig.payment_mp_link}
                  onChange={e => setEditConfig(p => ({ ...p, payment_mp_link: e.target.value }))}
                  className="w-full p-3 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="https://mpago.la/tu-link" />
                <p className="text-[11px] text-muted-foreground mt-1">El QR se genera automáticamente desde este link</p>
              </div>
            </div>

            <button onClick={saveConfig} disabled={savingConfig}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                configSaved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:opacity-90'
              }`}>
              {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : configSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {configSaved ? '✓ Guardado en Supabase' : savingConfig ? 'Guardando...' : 'Guardar Datos de Pago'}
            </button>
          </div>

          {/* Preview / QR */}
          <div className="space-y-4">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">Vista previa para clientes</h3>

              {config.payment_holder_name && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-bold uppercase">Titular</p>
                      <p className="font-bold text-sm">{config.payment_holder_name}</p>
                    </div>
                  </div>
                  {config.payment_cbu && (
                    <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">CBU</p>
                        <p className="font-mono text-sm tracking-wider">{config.payment_cbu}</p>
                      </div>
                      <button onClick={() => copyToClipboard(config.payment_cbu, 'cbu')}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                        {copiedKey === 'cbu' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                  {config.payment_alias && (
                    <div className="flex items-center justify-between p-3 bg-muted/40 rounded-xl">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase">Alias</p>
                        <p className="font-mono text-sm font-bold">{config.payment_alias}</p>
                      </div>
                      <button onClick={() => copyToClipboard(config.payment_alias, 'alias')}
                        className="p-2 hover:bg-muted rounded-lg transition-colors text-muted-foreground">
                        {copiedKey === 'alias' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {!config.payment_holder_name && !config.payment_cbu && (
                <div className="py-8 text-center text-muted-foreground">
                  <Banknote className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Completá los datos para ver la vista previa</p>
                </div>
              )}
            </div>

            {/* QR de MercadoPago */}
            <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm">QR MercadoPago</h3>
              </div>

              {qrUrl ? (
                <div className="space-y-3">
                  <div className="flex justify-center">
                    <div className="p-3 bg-white rounded-2xl shadow-lg">
                      <img src={qrUrl} alt="QR MercadoPago" className="w-[160px] h-[160px]" />
                    </div>
                  </div>
                  <a href={config.payment_mp_link} target="_blank" rel="noopener noreferrer"
                    className="w-full py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /> Abrir link de MercadoPago
                  </a>
                  <p className="text-[11px] text-muted-foreground text-center">Este QR se muestra a los clientes para pagar con MP</p>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <QrCode className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Ingresá tu link de MercadoPago para generar el QR</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: PRECIOS ── */}
      {activeTab === 'precios' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2"><DollarSign className="w-5 h-5 text-primary" /> Configurar Precios de Planes</h3>
              <p className="text-sm text-muted-foreground mt-1">Los precios se actualizan en toda la plataforma: login, settings y selector de plan.</p>
            </div>

            <div className="space-y-5">
              {/* Standard */}
              <div className="p-4 border border-blue-500/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-sm text-blue-400">Plan Estándar</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Precio Mensual ($)</label>
                    <input type="number" value={editConfig.price_standard_monthly}
                      onChange={e => setEditConfig(p => ({ ...p, price_standard_monthly: e.target.value }))}
                      className="w-full p-2.5 bg-muted border border-border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Precio Anual ($)</label>
                    <input type="number" value={editConfig.price_standard_annual}
                      onChange={e => setEditConfig(p => ({ ...p, price_standard_annual: e.target.value }))}
                      className="w-full p-2.5 bg-muted border border-border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
                  </div>
                </div>
              </div>

              {/* Pro */}
              <div className="p-4 border border-amber-500/20 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-sm text-amber-400">Plan Pro</h4>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Precio Mensual ($)</label>
                    <input type="number" value={editConfig.price_pro_monthly}
                      onChange={e => setEditConfig(p => ({ ...p, price_pro_monthly: e.target.value }))}
                      className="w-full p-2.5 bg-muted border border-border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-1">Precio Anual ($)</label>
                    <input type="number" value={editConfig.price_pro_annual}
                      onChange={e => setEditConfig(p => ({ ...p, price_pro_annual: e.target.value }))}
                      className="w-full p-2.5 bg-muted border border-border rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                  </div>
                </div>
              </div>
            </div>

            <button onClick={saveConfig} disabled={savingConfig}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                configSaved ? 'bg-green-500 text-white' : 'bg-primary text-white hover:opacity-90'
              }`}>
              {savingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : configSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {configSaved ? '✓ Precios actualizados' : 'Guardar Precios'}
            </button>
          </div>

          {/* Preview cards */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-widest">Vista previa de planes</h3>
            {[
              {
                name: 'Prueba Gratis', price: '$0', period: 'hasta 50 ventas',
                features: ['POS básico', 'Dashboard', 'Mesas y QR', 'Inventario básico'],
                border: 'border-border', badge: '', icon: Star, iconColor: 'text-gray-400'
              },
              {
                name: 'Estándar', price: `$${Number(editConfig.price_standard_monthly).toLocaleString('es-AR')}`, period: '/mes',
                annual: `$${Number(editConfig.price_standard_annual).toLocaleString('es-AR')}/año`,
                features: ['POS completo', 'Caja & Arqueos', 'Inventario', 'Delivery', 'Empleados'],
                border: 'border-blue-500/30', badge: 'Más popular', icon: Zap, iconColor: 'text-blue-400'
              },
              {
                name: 'Pro', price: `$${Number(editConfig.price_pro_monthly).toLocaleString('es-AR')}`, period: '/mes',
                annual: `$${Number(editConfig.price_pro_annual).toLocaleString('es-AR')}/año`,
                features: ['Todo Estándar', 'KDS Cocina', 'Pantalla cliente', 'Turnos & personal', 'Multi-sucursal'],
                border: 'border-amber-500/30', badge: 'Premium', icon: Crown, iconColor: 'text-amber-400'
              },
            ].map(p => {
              const Icon = p.icon;
              return (
                <div key={p.name} className={`border ${p.border} rounded-xl p-4 space-y-2`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${p.iconColor}`} />
                      <p className="font-bold text-sm">{p.name}</p>
                    </div>
                    {p.badge && <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.iconColor} bg-current/10`}>{p.badge}</span>}
                  </div>
                  <p className="text-xl font-extrabold">{p.price} <span className="text-xs font-normal text-muted-foreground">{p.period}</span></p>
                  {(p as any).annual && <p className="text-[11px] text-muted-foreground">{(p as any).annual} · ahorrás 2 meses</p>}
                  <ul className="space-y-1 pt-1">
                    {p.features.map(f => (
                      <li key={f} className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}

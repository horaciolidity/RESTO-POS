import { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Clock
} from 'lucide-react';
import { useOrdersStore, AuditAlert } from '../../store/useOrdersStore';

export default function Audit() {
  const { auditAlerts, resolveAuditAlert } = useOrdersStore();
  const [selectedFilter, setSelectedFilter] = useState<'todos' | 'rojo' | 'amarillo'>('todos');

  const filteredAlerts = selectedFilter === 'todos' 
    ? auditAlerts 
    : auditAlerts.filter((a: AuditAlert) => a.type === selectedFilter);


  const getAlertIcon = (type: AuditAlert['type']) => {
    switch (type) {
      case 'rojo':
        return <XCircle className="w-5 h-5 text-red-500 shrink-0" />;
      case 'amarillo':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'verde':
        return <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />;
    }
  };

  const getAlertBg = (type: AuditAlert['type']) => {
    switch (type) {
      case 'rojo':
        return 'bg-red-500/5 border-red-500/20';
      case 'amarillo':
        return 'bg-amber-500/5 border-amber-500/20';
      case 'verde':
        return 'bg-green-500/5 border-green-500/20';
    }
  };

  const handleResolveAlert = (id: string) => {
    resolveAuditAlert(id);
    alert('Alerta conciliada y archivada.');
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Centro de Conciliación & Auditoría</h2>
          <p className="text-muted-foreground text-xs">Módulo obligatorio. Validación automática y cruce de datos entre Pedidos, Cocina, Caja y Facturación.</p>
        </div>

        <div className="flex bg-muted p-1 rounded-xl border border-border">
          <button
            onClick={() => setSelectedFilter('todos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === 'todos'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos ({auditAlerts.length})
          </button>
          <button
            onClick={() => setSelectedFilter('rojo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === 'rojo'
                ? 'bg-card text-red-500 shadow-sm'
                : 'text-muted-foreground hover:text-red-500'
            }`}
          >
            Críticos ({auditAlerts.filter((a: AuditAlert) => a.type === 'rojo').length})
          </button>
          <button
            onClick={() => setSelectedFilter('amarillo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              selectedFilter === 'amarillo'
                ? 'bg-card text-amber-500 shadow-sm'
                : 'text-muted-foreground hover:text-amber-500'
            }`}
          >
            Advertencias ({auditAlerts.filter((a: AuditAlert) => a.type === 'amarillo').length})
          </button>

        </div>
      </div>

      {/* Traffic light indicator widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Conciliación de Caja</span>
            <p className="font-extrabold text-sm text-green-500">CORRECTO (Verde)</p>
          </div>
          <CheckCircle className="w-8 h-8 text-green-500 opacity-60" />
        </div>

        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Descuentos Aplicados</span>
            <p className="font-extrabold text-sm text-amber-500">1 ADVERTENCIA (Amarillo)</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500 opacity-60" />
        </div>

        <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/20 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Facturas vs Cobros</span>
            <p className="font-extrabold text-sm text-red-500">2 INCONSISTENCIAS (Rojo)</p>
          </div>
          <XCircle className="w-8 h-8 text-red-500 opacity-60" />
        </div>

      </div>

      {/* Audit Inconsistencies logs */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-muted-foreground uppercase">Alertas de Auditoría Activas</h3>

        {filteredAlerts.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card border border-border rounded-2xl flex flex-col items-center justify-center space-y-2">
            <ShieldCheck className="w-10 h-10 text-green-500 animate-pulse" />
            <p className="text-xs">Sistema totalmente conciliado. No hay alertas vigentes.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAlerts.map((alert: AuditAlert) => (
              <div
                key={alert.id}
                className={`p-5 rounded-2xl border flex flex-col md:flex-row justify-between md:items-center gap-4 hover:scale-[1.01] transition-transform ${getAlertBg(alert.type)}`}
              >

                <div className="flex gap-4">
                  {getAlertIcon(alert.type)}
                  
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm leading-none">{alert.title}</h4>
                      <span className="font-black text-primary bg-primary/10 px-2 py-0.5 rounded text-[10px]">
                        Afecta: ${alert.amount.toFixed(2)}
                      </span>
                    </div>
                    
                    <p className="text-muted-foreground leading-relaxed text-[11px] max-w-2xl">{alert.detail}</p>
                    
                    <div className="flex gap-3 text-[10px] text-muted-foreground font-bold pt-1">
                      <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Registró: {alert.user}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Hora: {alert.time}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 justify-end">
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="px-3.5 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:opacity-90 shadow-md shadow-primary/10 flex items-center gap-1"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Conciliar Alerta
                  </button>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="px-3.5 py-2 bg-muted hover:bg-muted/80 text-muted-foreground font-semibold rounded-xl text-xs flex items-center gap-1 border border-border"
                  >
                    Descartar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

import { useState } from 'react';
import {
  AlertTriangle,
  History,
  Calendar,
  Clock,
  User,
  PlusCircle
} from 'lucide-react';
import { useOrdersStore, Incident } from '../../store/useOrdersStore';

export default function Incidents() {
  const { incidents, addIncident } = useOrdersStore();
  const [incidentTitle, setIncidentTitle] = useState('Rotura de vaso de vidrio');
  const [incidentDesc, setIncidentDesc] = useState('Se cayó de la bandeja del mozo en el salón terraza.');
  const [incidentType, setIncidentType] = useState<'incidente' | 'reclamo' | 'faltante' | 'rotura' | 'error_caja' | 'error_cocina' | 'error_sistema'>('rotura');

  const handleRegisterIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle || !incidentDesc) return;
    
    addIncident({
      user: 'Carlos Mozo',
      type: incidentType,
      description: `${incidentTitle}: ${incidentDesc}`
    });

    alert('Incidencia registrada en el libro del turno.');
    setIncidentTitle('');
    setIncidentDesc('');
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Registro de Novedades & Incidencias</h2>
          <p className="text-muted-foreground text-xs">Libro de novedades para asentar incidentes, reclamos, roturas y fallas operativas de caja y cocina.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Incident registry Form */}
        <div className="lg:col-span-5">
          <div className="p-6 bg-card border border-border rounded-2xl space-y-4 shadow-sm">
            <h3 className="font-extrabold text-sm flex items-center gap-1.5"><PlusCircle className="w-4.5 h-4.5 text-primary" /> Registrar Novedad</h3>

            <form onSubmit={handleRegisterIncident} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold block">Tipo de Incidencia</label>
                <select
                  value={incidentType}
                  onChange={(e) => setIncidentType(e.target.value as any)}
                  className="w-full p-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                >
                  <option value="incidente">Incidente General</option>
                  <option value="reclamo">Reclamo de Cliente</option>
                  <option value="faltante">Faltante de Insumo</option>
                  <option value="rotura">Rotura de Vajilla / Insumo</option>
                  <option value="error_caja">Error en Caja / Arqueo</option>
                  <option value="error_cocina">Error en Cocina / Demora</option>
                  <option value="error_sistema">Error de Sistema / Bug</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold block">Título Breve</label>
                <input
                  type="text"
                  value={incidentTitle}
                  onChange={(e) => setIncidentTitle(e.target.value)}
                  placeholder="Ej: Faltante de servilletas"
                  className="w-full p-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs text-foreground font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-muted-foreground uppercase font-bold block">Descripción Detallada</label>
                <textarea
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Escribe detalles del suceso, causas y acciones tomadas..."
                  className="w-full min-h-[120px] p-2.5 bg-muted border border-border rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 text-xs font-bold text-white gradient-bg hover:opacity-90 rounded-xl shadow-lg shadow-primary/20"
              >
                Asentar Incidencia
              </button>
            </form>
          </div>
        </div>

        {/* Right column: Recent logs timeline list */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-border">
            <h3 className="font-extrabold text-sm flex items-center gap-1.5"><History className="w-4 h-4 text-primary" /> Historial de Turno Actual</h3>
            <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-black">
              {incidents.length} novedades
            </span>
          </div>

          <div className="space-y-3">
            {incidents.map((inc: Incident) => (
              <div key={inc.id} className="p-4 bg-card border border-border rounded-2xl hover:border-primary/20 transition-all text-xs space-y-3 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="flex gap-2.5">
                    <div className="p-1.5 rounded-lg bg-red-500/10 text-red-500 border border-red-500/20 shrink-0">
                      <AlertTriangle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{inc.description.split(':')[0]}</h4>
                      <p className="text-muted-foreground text-[11px] mt-0.5 leading-relaxed">{inc.description.split(':').slice(1).join(':').trim()}</p>
                    </div>
                  </div>
                  
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-muted text-muted-foreground">
                    {inc.type}
                  </span>
                </div>

                <div className="flex gap-4 text-[9px] text-muted-foreground pt-2 border-t border-border/40 font-bold justify-between">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Reportó: {inc.user}</span>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Hoy</span>
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Hora: {inc.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}

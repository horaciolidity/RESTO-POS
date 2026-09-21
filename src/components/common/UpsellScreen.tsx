import { Shield, Crown, CheckCircle2, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UpsellScreen({ featureName = 'esta función' }: { featureName?: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-300">
      <div className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-orange-500/40 mb-8 rotate-12 hover:rotate-0 transition-transform">
        <Crown className="w-12 h-12 text-white drop-shadow-md" />
      </div>

      <h2 className="text-3xl lg:text-4xl font-black tracking-tight mb-4 gradient-text">
        Mejora tu plan para acceder a {featureName}
      </h2>
      
      <p className="text-muted-foreground text-sm lg:text-base max-w-xl mx-auto mb-8 leading-relaxed">
        Tu plan actual no incluye acceso a este módulo. Actualizá al <strong className="text-foreground">Plan PRO</strong> para desbloquear todo el potencial de tu negocio y acceder a herramientas avanzadas.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 max-w-2xl w-full mb-10 text-left">
        <div className="bg-card border border-border p-5 rounded-2xl flex items-start gap-3 shadow-sm hover:border-primary/30 transition-colors">
          <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Control Total (Plan PRO)</h4>
            <p className="text-xs text-muted-foreground mt-1">Acceso a Salón, Delivery, Auditoría y Reportes Avanzados.</p>
          </div>
        </div>
        <div className="bg-card border border-border p-5 rounded-2xl flex items-start gap-3 shadow-sm hover:border-primary/30 transition-colors">
          <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Soporte y Técnico 24/7</h4>
            <p className="text-xs text-muted-foreground mt-1">Técnicos disponibles para instalaciones y soporte prioritario.</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <Link 
          to="/settings" 
          className="px-8 py-3.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-500/25 transition-all flex items-center gap-2 hover:scale-105"
        >
          <Crown className="w-4.5 h-4.5" />
          Ver Planes y Precios
        </Link>
        
        <a 
          href="https://wa.me/542617048835" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-8 py-3.5 bg-green-500/10 text-green-600 hover:bg-green-500/20 font-bold rounded-xl transition-all flex items-center gap-2"
        >
          <MessageCircle className="w-4.5 h-4.5" />
          Contactar a un Asesor
        </a>
      </div>
    </div>
  );
}
